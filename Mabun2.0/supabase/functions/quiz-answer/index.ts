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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/quiz-answer' \
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

  const { sessionId, questionId, optionId, timeRemaining } = await req.json()
  if (!sessionId || !questionId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
  }

  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
  }

  const { data: question, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (qError || !question) {
    return new Response(JSON.stringify({ error: 'Question not found' }), { status: 404, headers: corsHeaders })
  }

  const isCorrect = optionId ? optionId === question.correct_option : false

  let pointsEarned = 0
  let newStreak = session.streak

  if (isCorrect) {
    pointsEarned = question.points || 1
    const speedBonus = Math.min(5, Math.max(0, timeRemaining || 0))
    pointsEarned += speedBonus
    newStreak = session.streak + 1
    if (newStreak >= 5) {
      pointsEarned += Math.floor(newStreak / 5) * 2
    }
  } else {
    newStreak = 0
  }

  const newScore = session.score + pointsEarned

  await supabase
    .from('answers')
    .insert({
      session_id: sessionId,
      question_id: questionId,
      selected_option: optionId || null,
      is_correct: isCorrect,
      time_taken: (question.time_allowed - (timeRemaining || 0)),
    })

  const { data: updatedSession, error: updateError } = await supabase
    .from('quiz_sessions')
    .update({
      current_question_index: session.current_question_index + 1,
      score: newScore,
      streak: newStreak,
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({
    newScore,
    newStreak,
    correct: isCorrect,
    correctOptionId: question.correct_option,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})