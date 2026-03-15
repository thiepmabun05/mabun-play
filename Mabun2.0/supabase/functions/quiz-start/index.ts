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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/quiz-start' \
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
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const url = new URL(req.url)
  const quizId = url.searchParams.get('id')
  if (!quizId) {
    return new Response(JSON.stringify({ error: 'Missing quiz id' }), { status: 400, headers: corsHeaders })
  }

  let { data: session } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('quiz_id', quizId)
    .single()

  if (!session) {
    const { data: newSession, error: createError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        current_question_index: 0,
        score: 0,
        streak: 0,
      })
      .select()
      .single()

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 500, headers: corsHeaders })
    }
    session = newSession
  }

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true })
    .limit(1)

  if (qError || !questions || questions.length === 0) {
    return new Response(JSON.stringify({ error: 'No questions found' }), { status: 404, headers: corsHeaders })
  }
  const firstQuestion = questions[0]

  const questionForClient = {
    id: firstQuestion.id,
    text: firstQuestion.text,
    options: firstQuestion.options,
    difficulty: firstQuestion.difficulty,
    timeAllowed: firstQuestion.time_allowed,
  }

  const { data: quiz } = await supabase.from('quizzes').select('title').eq('id', quizId).single()
  const total = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quizId)

  const sessionForClient = {
    id: session.id,
    quizName: quiz?.title,
    totalQuestions: total.count,
    currentQuestionIndex: session.current_question_index,
    score: session.score,
    streak: session.streak,
  }

  return new Response(JSON.stringify({
    session: sessionForClient,
    question: questionForClient,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})