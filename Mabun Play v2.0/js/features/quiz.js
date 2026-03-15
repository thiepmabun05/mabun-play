// js/features/quiz.js
// Production‑ready quiz controller – fetches questions one by one from the API,
// handles answer submission, timer, score, streak, and navigation.

import { apiClient } from '../core/api.js';
import { showModal } from '../utils/modal.js';

(function() {
  'use strict';

  // ---------- DOM elements ----------
  const elements = {
    quitBtn: document.getElementById('quitQuiz'),
    quizTitle: document.getElementById('quizTitle'),
    questionCounter: document.getElementById('questionCounter'),
    timerCircle: document.getElementById('timerCircle'),
    timerText: document.getElementById('timerText'),
    timerProgress: document.querySelector('.timer-progress'),
    difficultyStars: document.getElementById('difficultyStars'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('optionsGrid'),
    optionBtns: document.querySelectorAll('.option-btn'),
    streakCount: document.getElementById('streakCount'),
    scoreValue: document.getElementById('scoreValue'),
    quitModal: document.getElementById('quitModal'),
    cancelQuit: document.getElementById('cancelQuit'),
  };

  // ---------- State ----------
  let quizId = null;                // from URL
  let session = null;               // quiz session data (total questions, current index, etc.)
  let currentQuestion = null;       // question object from server
  let timeLeft = 0;                 // seconds remaining for current question
  let timerInterval = null;
  let answerSubmitted = false;      // prevent double submission
  let loading = false;              // disable UI while loading

  // ---------- Helper: parse URL ----------
  function getQuizId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  // ---------- Helper: show/hide loading state ----------
  function setLoading(isLoading) {
    loading = isLoading;
    elements.optionBtns.forEach(btn => {
      btn.disabled = isLoading;
    });
    // Optionally show a spinner overlay – skipped for brevity
  }

  // ---------- Helper: stop timer ----------
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ---------- Helper: update timer display (circle and text) ----------
  function updateTimerDisplay() {
    if (!elements.timerText) return;
    elements.timerText.textContent = timeLeft;

    // Update circular progress
    if (elements.timerProgress && currentQuestion?.timeAllowed) {
      const totalTime = currentQuestion.timeAllowed; // e.g., 10 seconds
      const circumference = 2 * Math.PI * 18; // r=18 -> circumference ~113.1
      const offset = circumference * (1 - timeLeft / totalTime);
      elements.timerProgress.style.strokeDashoffset = offset;
    }

    // Change color based on time left (optional)
    if (elements.timerProgress) {
      if (timeLeft <= 3) {
        elements.timerProgress.style.stroke = 'var(--error)';
      } else if (timeLeft <= 5) {
        elements.timerProgress.style.stroke = 'var(--warning)';
      } else {
        elements.timerProgress.style.stroke = 'var(--success)';
      }
    }
  }

  // ---------- Helper: start countdown timer ----------
  function startTimer(seconds) {
    stopTimer();
    timeLeft = seconds;
    answerSubmitted = false;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      timeLeft -= 1;
      updateTimerDisplay();

      if (timeLeft <= 0) {
        stopTimer();
        // Auto‑submit only if answer not yet submitted
        if (!answerSubmitted && !loading) {
          submitAnswer(null); // timeout – no option selected
        }
      }
    }, 1000);
  }

  // ---------- Helper: render question (text, options, difficulty) ----------
  function renderQuestion(question) {
    if (!question) return;

    // Quiz title (from session, fallback)
    if (elements.quizTitle) {
      elements.quizTitle.textContent = session?.quizName || 'Quiz';
    }

    // Question counter
    if (elements.questionCounter && session) {
      elements.questionCounter.textContent = `${session.currentQuestionIndex + 1}/${session.totalQuestions}`;
    }

    // Difficulty stars
    if (elements.difficultyStars) {
      const difficulty = question.difficulty || 'medium'; // 'easy', 'medium', 'hard'
      let starCount = 1;
      if (difficulty === 'medium') starCount = 2;
      else if (difficulty === 'hard') starCount = 3;

      // Clear and add stars
      elements.difficultyStars.innerHTML = '';
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('iconify-icon');
        star.setAttribute('icon', 'solar:star-bold');
        star.classList.add('star');
        elements.difficultyStars.appendChild(star);
      }
      // Add remaining grey stars (optional – if you want empty stars)
      // Not needed – we only show actual difficulty level.
    }

    // Question text
    if (elements.questionText) {
      elements.questionText.textContent = question.text || '—';
    }

    // Options
    if (elements.optionsGrid && question.options && Array.isArray(question.options)) {
      const optionLetters = ['A', 'B', 'C', 'D'];
      elements.optionBtns.forEach((btn, index) => {
        const option = question.options[index];
        const letterSpan = btn.querySelector('.option-letter');
        const textSpan = btn.querySelector('.option-text');
        if (option) {
          btn.style.display = 'flex'; // ensure visible
          if (letterSpan) letterSpan.textContent = optionLetters[index];
          if (textSpan) textSpan.textContent = option.text || '';
          btn.dataset.optionId = option.id || optionLetters[index]; // store identifier
          btn.disabled = false;
          btn.classList.remove('correct', 'incorrect', 'selected');
        } else {
          btn.style.display = 'none'; // hide unused option slots
        }
      });
    }

    // Start timer with server‑provided timeAllowed
    const timeAllowed = question.timeAllowed || 10; // fallback 10s
    startTimer(timeAllowed);
  }

  // ---------- Helper: load next question (or finish quiz) ----------
  async function loadNextQuestion() {
    stopTimer();
    setLoading(true);

    try {
      // If we have a session and know we're at the end, finish
      if (session && session.currentQuestionIndex + 1 >= session.totalQuestions) {
        // Quiz finished – redirect to results
        window.location.href = `results.html?id=${quizId}`;
        return;
      }

      // Otherwise fetch the next question from server
      // Endpoint could be /quiz/next?sessionId=...
      const data = await apiClient(`/quiz/next?sessionId=${session.id}`, { method: 'POST' });
      // Response should contain: question, updated session (new index, score, streak)
      if (data.finished) {
        window.location.href = `results.html?id=${quizId}`;
        return;
      }

      // Update session and current question
      session = data.session;
      currentQuestion = data.question;

      // Update persistent stats (score, streak) from session
      if (elements.scoreValue) elements.scoreValue.textContent = session.score || 0;
      if (elements.streakCount) elements.streakCount.textContent = session.streak || 0;

      renderQuestion(currentQuestion);
    } catch (err) {
      console.error('Failed to load next question:', err);
      await showModal({
        title: 'Error',
        message: err.message || 'Could not load next question. Please refresh.',
        confirmText: 'OK',
      });
      // Optionally redirect to dashboard
      window.location.href = 'dashboard.html';
    } finally {
      setLoading(false);
    }
  }

  // ---------- Helper: submit answer (optionId or null for timeout) ----------
  async function submitAnswer(optionId) {
    if (answerSubmitted || loading) return;
    answerSubmitted = true;
    stopTimer();

    // Disable all options immediately
    elements.optionBtns.forEach(btn => { btn.disabled = true; });

    try {
      const payload = {
        sessionId: session.id,
        questionId: currentQuestion.id,
        optionId: optionId, // null if timeout
        timeRemaining: timeLeft, // send remaining time for server‑side speed bonus calculation
      };

      const result = await apiClient('/quiz/answer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Update score and streak from server response
      if (elements.scoreValue) elements.scoreValue.textContent = result.newScore || session.score;
      if (elements.streakCount) elements.streakCount.textContent = result.newStreak || session.streak;

      // Highlight correct/incorrect on options (optional)
      if (result.correctOptionId) {
        elements.optionBtns.forEach(btn => {
          if (btn.dataset.optionId === result.correctOptionId) {
            btn.classList.add('correct');
          }
          if (optionId && btn.dataset.optionId === optionId && !result.correct) {
            btn.classList.add('incorrect');
          }
        });
      }

      // Brief pause to show feedback, then load next question
      setTimeout(() => {
        loadNextQuestion();
      }, 800); // 0.8s feedback
    } catch (err) {
      console.error('Answer submission failed:', err);
      await showModal({
        title: 'Submission Error',
        message: err.message || 'Your answer could not be recorded. Please refresh.',
        confirmText: 'OK',
      });
      // Re‑enable options? Probably not – we'll try to reload next question anyway
      setLoading(false);
      // Attempt to recover by loading next question after a delay
      setTimeout(() => loadNextQuestion(), 1000);
    }
  }

  // ---------- Event: option click ----------
  function onOptionClick(e) {
    const btn = e.currentTarget;
    if (btn.disabled || answerSubmitted || loading) return;

    const optionId = btn.dataset.optionId;
    if (!optionId) return;

    // Visual feedback: mark as selected
    elements.optionBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    submitAnswer(optionId);
  }

  // ---------- Event: quit quiz ----------
  function openQuitModal() {
    if (elements.quitModal) {
      elements.quitModal.classList.add('active');
    }
  }

  function closeQuitModal() {
    if (elements.quitModal) {
      elements.quitModal.classList.remove('active');
    }
  }

  // ---------- Initialisation: start quiz ----------
  async function initQuiz() {
    quizId = getQuizId();
    if (!quizId) {
      await showModal({
        title: 'No Quiz',
        message: 'No quiz specified. Redirecting to dashboard.',
        confirmText: 'OK',
      });
      window.location.href = 'dashboard.html';
      return;
    }

    setLoading(true);

    try {
      // Start quiz session – get first question and session data
      const data = await apiClient(`/quiz/start?id=${quizId}`, { method: 'POST' });
      // Expected response: { session: { id, quizName, totalQuestions, currentQuestionIndex, score, streak }, question }
      session = data.session;
      currentQuestion = data.question;

      // Set initial score/streak display
      if (elements.scoreValue) elements.scoreValue.textContent = session.score || 0;
      if (elements.streakCount) elements.streakCount.textContent = session.streak || 0;

      renderQuestion(currentQuestion);
    } catch (err) {
      console.error('Failed to start quiz:', err);
      await showModal({
        title: 'Error',
        message: err.message || 'Could not start the quiz. Please try again.',
        confirmText: 'OK',
      });
      window.location.href = 'dashboard.html';
    } finally {
      setLoading(false);
    }
  }

  // ---------- Attach event listeners ----------
  function attachEvents() {
    elements.optionBtns.forEach(btn => {
      btn.addEventListener('click', onOptionClick);
    });

    if (elements.quitBtn) {
      elements.quitBtn.addEventListener('click', openQuitModal);
    }

    if (elements.cancelQuit) {
      elements.cancelQuit.addEventListener('click', closeQuitModal);
    }

    // Close modal if overlay clicked
    if (elements.quitModal) {
      elements.quitModal.addEventListener('click', (e) => {
        if (e.target === elements.quitModal) closeQuitModal();
      });
    }
  }

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', () => {
    attachEvents();
    initQuiz();
  });

  // Cleanup on page unload (optional, but good practice)
  window.addEventListener('beforeunload', () => {
    stopTimer();
  });
})();