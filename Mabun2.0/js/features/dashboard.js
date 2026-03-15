// js/features/dashboard.js – Production‑ready UI controller
// All business logic (wallet, eligibility, payment status) is delegated to the backend.
// Dashboard only renders and sends user actions.

import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import { formatCurrency } from '../utils/formatters.js';

(function() {
  'use strict';

  // DOM elements
  const elements = {
    walletAmount: document.getElementById('wallet-amount'),
    userName: document.getElementById('user-name'),
    liveTimer: document.getElementById('live-timer'),
    nextQuizTimer: document.getElementById('next-quiz-timer'),
    liveQuizTitle: document.getElementById('live-quiz-title'),
    hourlyPrize: document.getElementById('hourly-prize'),
    dailyPrize: document.getElementById('daily-prize'),
    weeklyPrize: document.getElementById('weekly-prize'),
    todayDate: document.getElementById('today-date'),
    weeklyCountdown: document.getElementById('weekly-countdown'),
    weeklyPayoutCountdown: document.getElementById('weekly-payout-countdown'),
    dailyPayoutCountdown: document.getElementById('daily-payout-countdown'),
    statPlayed: document.getElementById('stat-played-value'),
    statWinnings: document.getElementById('stat-winnings-value'),
    statRank: document.getElementById('stat-rank-value'),
    payBtn: document.getElementById('pay-entry-fee'),
    joinBtn: document.getElementById('join-hourly-quiz'),
    dailyChallengeBtn: document.querySelector('.js-challenge-entry[data-challenge="daily"]'),
    weeklyChallengeBtn: document.querySelector('.js-challenge-entry[data-challenge="weekly"]'),
    subscribeBtn: document.getElementById('subscribe-btn'), // ensure this button exists in HTML
  };

  // Application state (populated from server)
  let state = {
    user: {
      name: 'User',
      wallet: 0,
      played: 0,
      winnings: 0,
      rank: 0
    },
    liveQuiz: {
      id: null,
      title: 'General Knowledge',
      prizePool: 0,
      currentQuizEndsAt: null,
      nextQuizStartsAt: null,
      hasPaid: false,
      canJoin: false,
      canPay: false
    },
    dailyChallenge: {
      prizePool: 0,
      payoutTime: null,
      hasEntered: false
    },
    weeklyChallenge: {
      prizePool: 0,
      endsAt: null,
      payoutTime: null,
      hasEntered: false
    },
    autoSubscribe: false,          // daily auto‑subscription flag
  };

  // ==================== Fetch Dashboard Data ====================
  async function fetchDashboard() {
    try {
      const data = await apiClient('/dashboard');
      state = data;
      renderAll();
    } catch (err) {
      console.error(err);
      showModal({
        title: 'Error',
        message: 'Could not load dashboard. Please refresh.',
        confirmText: 'OK'
      });
    }
  }

  // ==================== Render UI ====================
  function renderAll() {
    renderUser();
    renderLiveQuiz();
    renderDaily();
    renderWeekly();
    renderSubscribeButton();
    renderTimers();
    updateButtonStates();
  }

  function renderUser() {
    if (elements.walletAmount) elements.walletAmount.textContent = state.user.wallet.toFixed(2);
    if (elements.userName) elements.userName.textContent = state.user.name;
    if (elements.statPlayed) elements.statPlayed.textContent = state.user.played;
    if (elements.statWinnings) {
      elements.statWinnings.textContent = formatCurrency(state.user.winnings, true);
    }
    if (elements.statRank) elements.statRank.textContent = '#' + state.user.rank;
  }

  function renderLiveQuiz() {
    if (elements.liveQuizTitle) elements.liveQuizTitle.textContent = state.liveQuiz.title;
    if (elements.hourlyPrize) {
      elements.hourlyPrize.textContent = formatCurrency(state.liveQuiz.prizePool);
    }
    if (elements.payBtn) {
      elements.payBtn.textContent = state.liveQuiz.hasPaid ? 'Paid' : 'Pay Entry Fee';
    }
  }

  function renderDaily() {
    if (elements.dailyPrize) {
      elements.dailyPrize.textContent = formatCurrency(state.dailyChallenge.prizePool);
    }
    if (elements.todayDate) {
      elements.todayDate.textContent = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.textContent = state.dailyChallenge.hasEntered ? 'Entered' : 'Enter Challenge';
    }
  }

  function renderWeekly() {
    if (elements.weeklyPrize) {
      elements.weeklyPrize.textContent = formatCurrency(state.weeklyChallenge.prizePool);
    }
    if (elements.weeklyChallengeBtn) {
      elements.weeklyChallengeBtn.textContent = state.weeklyChallenge.hasEntered ? 'Entered' : 'Enter Challenge';
    }
  }

  function renderSubscribeButton() {
    if (!elements.subscribeBtn) return;
    elements.subscribeBtn.textContent = state.autoSubscribe ? 'Subscribed (Daily)' : 'Auto-Subscribe (15,000 SSP)';
    elements.subscribeBtn.disabled = state.autoSubscribe;
  }

  // ==================== Visual Timers ====================
  function updateTimers() {
    const now = Date.now();

    if (elements.liveTimer && state.liveQuiz.currentQuizEndsAt) {
      const diff = Math.max(0, state.liveQuiz.currentQuizEndsAt - now);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      elements.liveTimer.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    } else if (elements.liveTimer) {
      elements.liveTimer.textContent = '00:00';
    }

    if (elements.nextQuizTimer && state.liveQuiz.nextQuizStartsAt) {
      const diff = Math.max(0, state.liveQuiz.nextQuizStartsAt - now);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      elements.nextQuizTimer.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }

    if (elements.dailyPayoutCountdown && state.dailyChallenge.payoutTime) {
      const diff = Math.max(0, state.dailyChallenge.payoutTime - now);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      elements.dailyPayoutCountdown.textContent = `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }

    if (elements.weeklyCountdown && state.weeklyChallenge.endsAt) {
      const diff = Math.max(0, state.weeklyChallenge.endsAt - now);
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      elements.weeklyCountdown.textContent = `${days}d ${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }

    if (elements.weeklyPayoutCountdown && state.weeklyChallenge.payoutTime) {
      const diff = Math.max(0, state.weeklyChallenge.payoutTime - now);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      elements.weeklyPayoutCountdown.textContent = `${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }
  }

  // ==================== Button States ====================
  function updateButtonStates() {
    if (elements.payBtn) {
      elements.payBtn.disabled = !state.liveQuiz.canPay;
    }
    if (elements.joinBtn) {
      elements.joinBtn.disabled = !state.liveQuiz.canJoin;
    }
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.disabled = state.dailyChallenge.hasEntered;
    }
    if (elements.weeklyChallengeBtn) {
      elements.weeklyChallengeBtn.disabled = state.weeklyChallenge.hasEntered;
    }
  }

  // ==================== Action Handlers ====================
  async function handlePayEntry() {
    try {
      elements.payBtn.disabled = true;

      const result = await apiClient('/quiz/pay', {
        method: 'POST',
        body: JSON.stringify({ quizId: state.liveQuiz.id })
      });

      if (result.dashboard) {
        state = result.dashboard;
      } else {
        await fetchDashboard();
        return;
      }
      renderAll();
    } catch (err) {
      console.error(err);
      if (err.code === 'INSUFFICIENT_BALANCE') {
        const action = await showModal({
          title: 'Insufficient Balance',
          message: `You need ${formatCurrency(err.requiredAmount)} to join. Would you like to deposit?`,
          confirmText: 'OK',
          showDeposit: true,
          cancelText: 'Cancel'
        });
        if (action === 'deposit') {
          window.location.href = `wallet.html?topup=${err.requiredAmount}&return=dashboard`;
        }
      } else {
        await showModal({
          title: 'Payment Failed',
          message: err.message || 'Could not process payment.',
          confirmText: 'OK'
        });
      }
    } finally {
      updateButtonStates();
    }
  }

  async function handleJoinQuiz() {
    if (!state.liveQuiz.canJoin) {
      await showModal({
        title: 'Cannot Join',
        message: 'Joining is not available at this time.',
        confirmText: 'OK'
      });
      return;
    }

    try {
      const result = await apiClient('/quiz/join', {
        method: 'POST',
        body: JSON.stringify({ quizId: state.liveQuiz.id })
      });

      window.location.href = `quiz.html?id=${state.liveQuiz.id}`;
    } catch (err) {
      console.error(err);
      await showModal({
        title: 'Join Failed',
        message: err.message || 'Could not join quiz.',
        confirmText: 'OK'
      });
    }
  }

  async function handleChallengeEntry(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const challenge = btn.dataset.challenge;
    const fee = parseInt(btn.dataset.fee, 10);

    if ((challenge === 'daily' && state.dailyChallenge.hasEntered) ||
        (challenge === 'weekly' && state.weeklyChallenge.hasEntered)) {
      return;
    }

    try {
      btn.disabled = true;

      const result = await apiClient('/challenge/enter', {
        method: 'POST',
        body: JSON.stringify({ challenge, fee })
      });

      if (result.dashboard) {
        state = result.dashboard;
      } else {
        await fetchDashboard();
        return;
      }
      renderAll();
    } catch (err) {
      console.error(err);
      if (err.code === 'INSUFFICIENT_BALANCE') {
        const action = await showModal({
          title: 'Insufficient Balance',
          message: `You need ${formatCurrency(fee)} to enter. Would you like to deposit?`,
          confirmText: 'OK',
          showDeposit: true,
          cancelText: 'Cancel'
        });
        if (action === 'deposit') {
          window.location.href = `wallet.html?topup=${fee - state.user.wallet}&return=dashboard`;
        }
      } else {
        await showModal({
          title: 'Entry Failed',
          message: err.message || 'Could not enter challenge.',
          confirmText: 'OK'
        });
      }
    } finally {
      btn.disabled = false;
    }
  }

  async function handleSubscribe() {
    if (state.autoSubscribe) return;
    try {
      elements.subscribeBtn.disabled = true;
      const result = await apiClient('/subscribe/daily', { method: 'POST' });
      if (result.dashboard) {
        state = result.dashboard;
      } else {
        await fetchDashboard();
        return;
      }
      renderAll();
    } catch (err) {
      console.error(err);
      if (err.code === 'INSUFFICIENT_BALANCE') {
        const action = await showModal({
          title: 'Insufficient Balance',
          message: `You need 15,000 SSP to subscribe. Would you like to deposit?`,
          confirmText: 'OK',
          showDeposit: true,
          cancelText: 'Cancel'
        });
        if (action === 'deposit') {
          window.location.href = `wallet.html?topup=15000&return=dashboard`;
        }
      } else {
        await showModal({
          title: 'Subscription Failed',
          message: err.message || 'Could not process subscription.',
          confirmText: 'OK'
        });
      }
    } finally {
      if (!state.autoSubscribe) elements.subscribeBtn.disabled = false;
    }
  }

  // ==================== Initialization ====================
  function init() {
    fetchDashboard();
    setInterval(updateTimers, 1000);

    if (elements.payBtn) elements.payBtn.addEventListener('click', handlePayEntry);
    if (elements.joinBtn) elements.joinBtn.addEventListener('click', handleJoinQuiz);
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.addEventListener('click', handleChallengeEntry);
    }
    if (elements.weeklyChallengeBtn) {
      elements.weeklyChallengeBtn.addEventListener('click', handleChallengeEntry);
    }
    if (elements.subscribeBtn) {
      elements.subscribeBtn.addEventListener('click', handleSubscribe);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();