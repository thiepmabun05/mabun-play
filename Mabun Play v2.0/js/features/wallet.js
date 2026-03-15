import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import config from '../core/config.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

/**
 * Wallet page – manages balance, transactions, and quick actions.
 * @module Wallet
 */

// Constants
const LOW_BALANCE_THRESHOLD = 5000; // SSP
const MAX_WALLET_FALLBACK = 50_000_000; // if config.MAX_WALLET is missing

document.addEventListener('DOMContentLoaded', () => {
  // ==================== DOM Elements ====================
  const elements = {
    balance: document.getElementById('walletBalance'),
    progress: document.getElementById('balanceProgress'),
    warning: document.getElementById('balanceWarning'),
    transactionsList: document.getElementById('transactionsList'),
    topupReminder: document.getElementById('topupReminder'),
    quickTopupBtn: document.getElementById('quickTopupBtn'),
    filterContainer: document.querySelector('.transaction-filters'),
  };

  // ==================== State ====================
  let currentFilter = 'all';
  let isLoading = false;

  // ==================== Initialization ====================
  if (!elements.balance || !elements.transactionsList) {
    console.error('Required DOM elements missing – wallet cannot initialise.');
    return;
  }

  initEventListeners();
  loadWallet();

  // ==================== Event Handlers ====================
  function initEventListeners() {
    // Quick top-up (button only – deposit/withdraw are anchor links)
    elements.quickTopupBtn?.addEventListener('click', () => {
      window.location.href = 'deposit.html?amount=5000';
    });

    // Filter transactions (event delegation)
    elements.filterContainer?.addEventListener('click', (e) => {
      const filterBtn = e.target.closest('.filter-btn');
      if (!filterBtn || isLoading) return;

      const filter = filterBtn.dataset.filter;
      if (!filter) return;

      // Update active state
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      filterBtn.classList.add('active');

      // Load transactions with new filter
      currentFilter = filter;
      loadTransactions(currentFilter);
    });
  }

  // ==================== Core Functions ====================

  /**
   * Loads wallet balance and refreshes transaction list.
   */
  async function loadWallet() {
    try {
      const data = await apiClient('/wallet');
      renderBalance(data.balance);
      await loadTransactions(currentFilter);
    } catch (error) {
      showModal({
        title: 'Error',
        message: error.message || 'Failed to load wallet data. Please refresh the page.',
        confirmText: 'OK',
      });
    }
  }

  /**
   * Updates balance display, progress bar, and low-balance reminder.
   * @param {number} balance - Current wallet balance
   */
  function renderBalance(balance) {
    const max = config.MAX_WALLET || MAX_WALLET_FALLBACK;
    const percent = Math.min((balance / max) * 100, 100);

    elements.balance.textContent = formatCurrency(balance);
    elements.progress.style.width = `${percent}%`;

    // Show/hide low-balance reminder
    if (balance < LOW_BALANCE_THRESHOLD) {
      elements.topupReminder?.style.setProperty('display', 'flex', 'important');
    } else {
      elements.topupReminder?.style.setProperty('display', 'none', 'important');
    }
  }

  /**
   * Fetches transactions with current filter and renders them.
   * @param {string} filter - Filter value (all, deposit, withdrawal, quiz)
   */
  async function loadTransactions(filter) {
    if (isLoading) return;
    isLoading = true;
    setFiltersLoadingState(true);
    showTransactionLoading();

    try {
      const transactions = await apiClient(`/wallet/transactions?filter=${filter}`);
      renderTransactions(transactions);
    } catch (error) {
      console.error('Transaction load error:', error);
      showTransactionError('Unable to load transactions. Please try again.');
    } finally {
      isLoading = false;
      setFiltersLoadingState(false);
    }
  }

  /**
   * Renders transaction list or empty/error state.
   * @param {Array} transactions - Array of transaction objects
   */
  function renderTransactions(transactions) {
    const list = elements.transactionsList;
    if (!list) return;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      list.innerHTML = '<div class="empty-state">No transactions found</div>';
      return;
    }

    // Normalize and map each transaction for display
    const transactionItems = transactions.map(tx => {
      const type = tx.type || 'unknown';
      const amount = normalizeAmount(tx.amount, type);
      const icon = getTransactionIcon(type, tx.icon);
      const description = tx.description || `${type} transaction`;
      const date = tx.date || new Date().toISOString();

      return `
        <div class="transaction-item ${type}">
          <div class="tx-icon">
            <iconify-icon icon="${icon}"></iconify-icon>
          </div>
          <div class="tx-details">
            <div class="tx-title">${escapeHtml(description)}</div>
            <div class="tx-date">${formatDateTime(date)}</div>
          </div>
          <div class="tx-amount ${type}">${formatAmountWithSign(amount)}</div>
        </div>
      `;
    }).join('');

    list.innerHTML = transactionItems;
  }

  // ==================== Helpers ====================

  /**
   * Ensures correct sign for amount based on transaction type.
   * @param {number} amount - Raw amount from API
   * @param {string} type - Transaction type
   * @returns {number} Normalized amount (positive for deposit, negative otherwise)
   */
  function normalizeAmount(amount, type) {
    if (type === 'deposit') {
      return Math.abs(amount);
    }
    // withdrawal or quiz fees should be negative
    return -Math.abs(amount);
  }

  /**
   * Returns appropriate icon name for transaction type.
   * @param {string} type - Transaction type
   * @param {string} [providedIcon] - Icon from API (if any)
   * @returns {string} Iconify icon identifier
   */
  function getTransactionIcon(type, providedIcon) {
    if (providedIcon) return providedIcon;
    const iconMap = {
      deposit: 'solar:card-recive-bold',
      withdrawal: 'solar:card-send-bold',
      quiz: 'solar:clipboard-list-bold',
    };
    return iconMap[type] || 'solar:card-linear';
  }

  /**
   * Formats amount with + or - sign.
   * @param {number} amount - Normalized amount
   * @returns {string} Formatted amount with sign
   */
  function formatAmountWithSign(amount) {
    const sign = amount > 0 ? '+' : '';
    return `${sign}${formatCurrency(amount)}`;
  }

  /**
   * Simple HTML escape to prevent XSS.
   * @param {string} text - Raw text
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Shows loading spinner in transaction list.
   */
  function showTransactionLoading() {
    if (!elements.transactionsList) return;
    elements.transactionsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading transactions...</p>
      </div>
    `;
  }

  /**
   * Shows error message in transaction list.
   * @param {string} message - Error message
   */
  function showTransactionError(message) {
    if (!elements.transactionsList) return;
    elements.transactionsList.innerHTML = `
      <div class="error-state">
        <iconify-icon icon="solar:danger-triangle-linear"></iconify-icon>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-sm btn-outline" id="retryTransactionsBtn">Retry</button>
      </div>
    `;

    // Attach retry handler
    const retryBtn = document.getElementById('retryTransactionsBtn');
    retryBtn?.addEventListener('click', () => loadTransactions(currentFilter));
  }

  /**
   * Enables/disables filter buttons during loading.
   * @param {boolean} loading - Loading state
   */
  function setFiltersLoadingState(loading) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.disabled = loading;
      btn.style.opacity = loading ? '0.6' : '1';
      btn.style.cursor = loading ? 'not-allowed' : 'pointer';
    });
  }
});