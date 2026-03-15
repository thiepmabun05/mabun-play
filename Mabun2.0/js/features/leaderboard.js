// leaderboard.js – Live leaderboard with real-time updates via WebSocket
// All data fetched from edge functions using apiClient.

import { apiClient } from '../core/api.js';

let currentType = 'hourly'; // 'hourly', 'daily', 'weekly'
let quizData = {};           // metadata: name, qualifier, endTime, prizePool, entryFee, prizePercentages
let participants = [];       // full list of participants (from API)
let displayedCount = 0;      // how many are currently rendered (for pagination)
let pageSize = 100;          // number to load per batch
let isLoading = false;
let hasMore = true;
let ws = null;               // WebSocket connection
let timerInterval = null;

// DOM elements
const elements = {
  typeBtns: document.querySelectorAll('.type-btn'),
  quizName: document.getElementById('quizName'),
  qualifierText: document.getElementById('qualifierText'),
  timeLeft: document.getElementById('timeLeft'),
  prizePool: document.getElementById('prizePool'),
  leaderboardList: document.getElementById('leaderboardList'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  loadMoreContainer: document.getElementById('loadMoreContainer'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
};

// ---------- Helper: format number as currency ----------
function formatCurrency(amount) {
  return amount.toLocaleString() + ' SSP';
}

// ---------- Fetch initial data for the selected quiz type ----------
async function fetchQuizData(type) {
  try {
    const data = await apiClient(`/leaderboard/info?type=${type}`);
    quizData = data;
    elements.quizName.textContent = data.name;
    elements.qualifierText.textContent = data.qualifier;
    elements.prizePool.textContent = formatCurrency(data.prizePool);
    startTimer(data.endTime);
  } catch (err) {
    console.error(err);
  }
}

// ---------- Fetch first batch of participants ----------
async function fetchParticipants(type, page = 1) {
  try {
    isLoading = true;
    elements.loadingSpinner.style.display = 'flex';
    const data = await apiClient(`/leaderboard/participants?type=${type}&page=${page}&pageSize=${pageSize}`);
    const newParticipants = data.participants;
    participants = page === 1 ? newParticipants : [...participants, ...newParticipants];
    displayedCount = participants.length;
    hasMore = data.hasMore;
    renderLeaderboard(participants);
    elements.loadMoreContainer.style.display = hasMore ? 'flex' : 'none';
  } catch (err) {
    console.error(err);
  } finally {
    isLoading = false;
    elements.loadingSpinner.style.display = 'none';
  }
}

// ---------- Render the leaderboard with currently loaded participants ----------
function renderLeaderboard(participantsToRender) {
  const listEl = elements.leaderboardList;
  listEl.innerHTML = '';
  participantsToRender.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `leaderboard-item ${item.isCurrentUser ? 'current-user' : ''}`;

    const rankDiv = document.createElement('div');
    rankDiv.className = `rank rank-${item.rank}`;
    if (item.rank === 1) {
      rankDiv.innerHTML = `<iconify-icon icon="solar:medal-star-bold" class="rank-icon"></iconify-icon>`;
    } else if (item.rank === 2 || item.rank === 3) {
      rankDiv.innerHTML = `<iconify-icon icon="solar:medal-ribbon-bold" class="rank-icon"></iconify-icon>`;
    } else {
      rankDiv.textContent = item.rank;
    }

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.textContent = item.initials;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'player-info';
    infoDiv.innerHTML = `
      <div class="player-name">${item.name}</div>
      <div class="player-streak">${item.streak || ''}</div>
    `;

    const scoreTrendDiv = document.createElement('div');
    scoreTrendDiv.className = 'score-trend-prize';
    const prize = item.prize ? formatCurrency(item.prize) : '';
    const trendIcon = item.trendDir === 'up' ? 'arrow-up-bold' : 'arrow-down-bold';
    scoreTrendDiv.innerHTML = `
      <span class="score">${item.score} pts</span>
      ${item.trend ? `
        <span class="trend trend-${item.trendDir}">
          <iconify-icon icon="solar:${trendIcon}"></iconify-icon>
          ${item.trend}
        </span>
      ` : ''}
      ${prize ? `<span class="prize-amount">${prize}</span>` : ''}
    `;

    itemDiv.appendChild(rankDiv);
    itemDiv.appendChild(avatarDiv);
    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(scoreTrendDiv);

    if (item.isCurrentUser) {
      const badge = document.createElement('div');
      badge.className = 'you-badge';
      badge.textContent = 'You';
      itemDiv.appendChild(badge);
    }

    listEl.appendChild(itemDiv);
  });
}

// ---------- Update a single participant (from WebSocket) ----------
function updateParticipant(updated) {
  const index = participants.findIndex(p => p.id === updated.id);
  if (index === -1) {
    participants.push(updated);
  } else {
    participants[index] = { ...participants[index], ...updated };
  }
  participants.sort((a, b) => b.score - a.score);
  participants.forEach((p, idx) => {
    const oldRank = p.rank;
    p.rank = idx + 1;
    if (oldRank && oldRank !== p.rank) {
      p.trend = Math.abs(oldRank - p.rank);
      p.trendDir = oldRank > p.rank ? 'up' : 'down';
    } else {
      p.trend = 0;
    }
  });
  renderLeaderboard(participants.slice(0, displayedCount));
}

// ---------- WebSocket connection ----------
function connectWebSocket() {
  if (ws) ws.close();
  ws = new WebSocket(`wss://${window.location.host}/ws/leaderboard?type=${currentType}`);
  ws.onopen = () => console.log('WebSocket connected');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      updateParticipant(data.participant);
    } else if (data.type === 'new') {
      updateParticipant(data.participant);
    } else if (data.type === 'prize_pool') {
      quizData.prizePool = data.prizePool;
      elements.prizePool.textContent = formatCurrency(data.prizePool);
    }
  };
  ws.onerror = (err) => console.error('WebSocket error', err);
  ws.onclose = () => {
    setTimeout(connectWebSocket, 5000);
  };
}

// ---------- Timer based on server end time ----------
function startTimer(endTimeISO) {
  if (timerInterval) clearInterval(timerInterval);
  const endTime = new Date(endTimeISO).getTime();
  timerInterval = setInterval(() => {
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) {
      elements.timeLeft.textContent = '00:00';
      clearInterval(timerInterval);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    elements.timeLeft.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

// ---------- Load more (pagination) ----------
async function loadMore() {
  if (isLoading || !hasMore) return;
  const nextPage = Math.floor(displayedCount / pageSize) + 1;
  await fetchParticipants(currentType, nextPage);
}

// ---------- Switch quiz type ----------
async function switchType(type) {
  currentType = type;
  elements.typeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  participants = [];
  displayedCount = 0;
  hasMore = true;
  renderLeaderboard([]);
  await fetchQuizData(type);
  await fetchParticipants(type, 1);
  connectWebSocket();
}

// ---------- Event listeners ----------
elements.typeBtns.forEach(btn => {
  btn.addEventListener('click', () => switchType(btn.dataset.type));
});

elements.loadMoreBtn.addEventListener('click', loadMore);

// ---------- Initial load ----------
(async function init() {
  await fetchQuizData(currentType);
  await fetchParticipants(currentType, 1);
  connectWebSocket();
})();

window.addEventListener('beforeunload', () => {
  if (timerInterval) clearInterval(timerInterval);
  if (ws) ws.close();
});
