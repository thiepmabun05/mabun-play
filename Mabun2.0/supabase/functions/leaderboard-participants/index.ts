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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/leaderboard-participants' \
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

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'hourly'
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = parseInt(url.searchParams.get('pageSize') || '100')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const now = new Date().toISOString()
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('type', type)
    .lte('start_time', now)
    .gte('end_time', now)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (!quiz) {
    return new Response(JSON.stringify({ participants: [], hasMore: false }), { status: 200, headers: corsHeaders })
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: entries, error, count } = await supabase
    .from('leaderboard_entries')
    .select('*', { count: 'exact' })
    .eq('quiz_id', quiz.id)
    .order('rank', { ascending: true })
    .range(from, to)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }

  const hasMore = (from + pageSize) < (count || 0)

  const participants = entries.map(e => ({
    id: e.user_id,
    name: e.username,
    initials: e.username.substring(0,2).toUpperCase(),
    score: e.score,
    streak: e.streak > 0 ? `${e.streak}🔥` : '',
    rank: e.rank,
    isCurrentUser: false, // frontend will set this if matches logged-in user
    trend: 0,
    trendDir: '',
  }))

  return new Response(JSON.stringify({
    participants,
    hasMore,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})