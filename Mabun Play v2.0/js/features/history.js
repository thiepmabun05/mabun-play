import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import { formatCurrency, formatShortDate } from '../utils/formatters.js';
import Chart from 'chart.js/auto';

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    periodTabs: document.querySelectorAll('.period-tab'),
    totalEarnings: document.getElementById('totalEarnings'),
    avgScore: document.getElementById('avgScore'),
    quizzesPlayed: document.getElementById('quizzesPlayed'),
    bestRank: document.getElementById('bestRank'),
    trendEarnings: document.getElementById('trendEarnings'),
    trendAvg: document.getElementById('trendAvg'),
    trendPlayed: document.getElementById('trendPlayed'),
    trendRank: document.getElementById('trendRank'),
    recentQuizzes: document.getElementById('recentQuizzes')
  };

  let chart;
  let currentPeriod = 'day';

  async function loadHistory(period) {
    try {
      const data = await apiClient(`/user/history?period=${period}`);
      updateMetrics(data.metrics);
      updateChart(data.chartData, period);
      updateRecent(data.recent);
    } catch (error) {
      showModal({ title: 'Error', message: error.message, confirmText: 'OK' });
    }
  }

  function updateMetrics(metrics) {
    elements.totalEarnings.textContent = formatCurrency(metrics.totalEarnings);
    elements.avgScore.textContent = metrics.avgScore.toFixed(1);
    elements.quizzesPlayed.textContent = metrics.quizzesPlayed;
    elements.bestRank.textContent = '#' + metrics.bestRank;

    elements.trendEarnings.innerHTML = metrics.trendEarnings ? `<iconify-icon icon="solar:arrow-${metrics.trendEarnings > 0 ? 'up' : 'down'}-bold"></iconify-icon> ${Math.abs(metrics.trendEarnings)}%` : '';
    elements.trendAvg.innerHTML = metrics.trendAvg ? `<iconify-icon icon="solar:arrow-${metrics.trendAvg > 0 ? 'up' : 'down'}-bold"></iconify-icon> ${Math.abs(metrics.trendAvg)}%` : '';
    elements.trendPlayed.innerHTML = metrics.trendPlayed ? `<iconify-icon icon="solar:arrow-${metrics.trendPlayed > 0 ? 'up' : 'down'}-bold"></iconify-icon> ${Math.abs(metrics.trendPlayed)}%` : '';
    elements.trendRank.innerHTML = metrics.trendRank ? `<iconify-icon icon="solar:arrow-${metrics.trendRank > 0 ? 'up' : 'down'}-bold"></iconify-icon> ${Math.abs(metrics.trendRank)}%` : '';
  }

  function updateChart(chartData, period) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (chart) chart.destroy();

    const labels = chartData.map(d => d.label);
    const earnings = chartData.map(d => d.earnings);

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Earnings (SSP)',
          data: earnings,
          borderColor: '#680080',
          backgroundColor: 'rgba(104,0,128,0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function updateRecent(recent) {
    if (!elements.recentQuizzes) return;
    if (recent.length === 0) {
      elements.recentQuizzes.innerHTML = '<tr><td colspan="4" class="empty">No recent quizzes</td></tr>';
      return;
    }
    elements.recentQuizzes.innerHTML = recent.map(q => `
      <tr>
        <td>${formatShortDate(q.date)}</td>
        <td>${q.quizName}</td>
        <td>${q.score}</td>
        <td>${q.earnings ? formatCurrency(q.earnings) : '-'}</td>
      </tr>
    `).join('');
  }

  elements.periodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.periodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      loadHistory(currentPeriod);
    });
  });

  loadHistory(currentPeriod);
});