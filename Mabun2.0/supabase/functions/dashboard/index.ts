// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/dashboard' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers: corsHeaders })
  }
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const now = new Date().toISOString()

  // Live hourly quiz
  const { data: liveQuiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('type', 'hourly')
    .lte('start_time', now)
    .gte('end_time', now)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  // Today's daily challenge
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
  const { data: daily } = await supabase
    .from('quizzes')
    .select('*')
    .eq('type', 'daily')
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .single()

  // Current weekly challenge
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0,0,0,0)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23,59,59,999)
  const { data: weekly } = await supabase
    .from('quizzes')
    .select('*')
    .eq('type', 'weekly')
    .gte('start_time', weekStart.toISOString())
    .lte('start_time', weekEnd.toISOString())
    .single()

  const { data: userSessions } = await supabase
    .from('quiz_sessions')
    .select('quiz_id')
    .eq('user_id', user.id)

  const enteredQuizIds = new Set(userSessions?.map(s => s.quiz_id) || [])

  const nextHour = new Date(); nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)

  const response = {
    user: {
      name: profile.username,
      wallet: profile.wallet_balance,
      played: profile.played,
      winnings: profile.winnings,
      rank: profile.rank,
    },
    liveQuiz: {
      id: liveQuiz?.id,
      title: liveQuiz?.title || 'General Knowledge',
      prizePool: liveQuiz?.prize_pool || 0,
      currentQuizEndsAt: liveQuiz?.end_time || null,
      nextQuizStartsAt: nextHour.toISOString(),
      hasPaid: enteredQuizIds.has(liveQuiz?.id),
      canJoin: true,
      canPay: true,
    },
    dailyChallenge: {
      prizePool: daily?.prize_pool || 0,
      payoutTime: daily?.end_time || null,
      hasEntered: enteredQuizIds.has(daily?.id),
    },
    weeklyChallenge: {
      prizePool: weekly?.prize_pool || 0,
      endsAt: weekly?.end_time || null,
      payoutTime: weekly?.end_time || null,
      hasEntered: enteredQuizIds.has(weekly?.id),
    },
    autoSubscribe: false,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})