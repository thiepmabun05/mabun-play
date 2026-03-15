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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/leaderboard-info' \
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

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const now = new Date().toISOString()
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('type', type)
    .lte('start_time', now)
    .gte('end_time', now)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (!quiz) {
    return new Response(JSON.stringify({ error: 'No active quiz' }), { status: 404, headers: corsHeaders })
  }

  const qualifier = type === 'hourly' ? 'Top 10 win prizes' :
                    type === 'daily' ? 'Top 10 daily points' :
                    'Top 15 weekly points'

  return new Response(JSON.stringify({
    name: quiz.title,
    qualifier,
    endTime: quiz.end_time,
    prizePool: quiz.prize_pool,
    entryFee: quiz.entry_fee,
    prizePercentages: type === 'hourly' ? [30,20,15,5,5,5,5,5,5,5] :
                       type === 'daily' ? [30,20,15,5,5,5,5,5,5,5] :
                       [30,20,15,5,5,5,5,5,5,5,2,2,2,2,2],
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})