import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const transactionsList = document.getElementById('transactionsList');
  const filterContainer = document.querySelector('.transactions-filters');
  const modalOverlay = document.getElementById('receiptModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const printBtn = document.getElementById('printReceiptBtn');
  const downloadBtn = document.getElementById('downloadReceiptBtn');
  const receiptContent = document.getElementById('receiptContent');

  // State
  let currentFilter = 'all';
  let isLoading = false;
  let allTransactions = []; // store all transactions for client-side filtering

  // Initialise
  initEventListeners();
  loadTransactions();

  function initEventListeners() {
    // Filter clicks
    filterContainer?.addEventListener('click', (e) => {
      const filterBtn = e.target.closest('.filter-btn');
      if (!filterBtn || isLoading) return;

      const filter = filterBtn.dataset.filter;
      if (!filter) return;

      // Update active state
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      filterBtn.classList.add('active');

      currentFilter = filter;
      filterTransactions(currentFilter);
    });

    // Modal close
    closeModalBtn?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Print receipt
    printBtn?.addEventListener('click', () => {
      window.print();
    });

    // Download receipt (simulated PDF download)
    downloadBtn?.addEventListener('click', downloadReceipt);
  }

  async function loadTransactions() {
    isLoading = true;
    setFiltersLoadingState(true);
    showLoading();

    try {
      // Fetch all transactions (no filter)
      allTransactions = await apiClient('/wallet/transactions?filter=all');
      renderTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      showError('Unable to load transactions. Please try again.');
    } finally {
      isLoading = false;
      setFiltersLoadingState(false);
    }
  }

  function filterTransactions(filter) {
    if (!allTransactions.length) {
      renderTransactions([]);
      return;
    }

    let filtered;
    if (filter === 'all') {
      filtered = allTransactions;
    } else {
      filtered = allTransactions.filter(tx => tx.type === filter);
    }
    renderTransactions(filtered);
  }

  function renderTransactions(transactions) {
    if (!transactionsList) return;

    if (!transactions.length) {
      transactionsList.innerHTML = '<div class="empty-state">No transactions found</div>';
      return;
    }

    const items = transactions.map(tx => {
      const type = tx.type || 'unknown';
      const amount = normalizeAmount(tx.amount, type);
      const icon = getTransactionIcon(type);
      const description = tx.description || `${type} transaction`;
      const date = tx.date || new Date().toISOString();
      const amountClass = type === 'deposit' ? 'deposit' : (type === 'withdrawal' ? 'withdrawal' : 'quiz');

      return `
        <div class="transaction-item" data-id="${tx.id || ''}">
          <div class="tx-icon">
            <iconify-icon icon="${icon}"></iconify-icon>
          </div>
          <div class="tx-details">
            <div class="tx-title">${escapeHtml(description)}</div>
            <div class="tx-date">${formatDateTime(date)}</div>
          </div>
          <div class="tx-amount ${amountClass}">${formatAmountWithSign(amount)}</div>
          <button class="receipt-btn" data-transaction='${JSON.stringify(tx).replace(/'/g, "&apos;")}'>
            <iconify-icon icon="solar:receipt-linear"></iconify-icon>
          </button>
        </div>
      `;
    }).join('');

    transactionsList.innerHTML = items;

    // Attach receipt button listeners
    document.querySelectorAll('.receipt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const txData = JSON.parse(btn.dataset.transaction);
          showReceipt(txData);
        } catch (err) {
          console.error('Invalid receipt data', err);
        }
      });
    });
  }

  function showReceipt(transaction) {
    if (!receiptContent || !modalOverlay) return;

    const type = transaction.type || 'transaction';
    const amount = normalizeAmount(transaction.amount, type);
    const amountClass = amount > 0 ? 'positive' : 'negative';
    const date = transaction.date ? formatDateTime(transaction.date) : 'N/A';
    const description = transaction.description || `${type} transaction`;
    const id = transaction.id || 'N/A';

    receiptContent.innerHTML = `
      <div class="receipt-detail">
        <span class="receipt-label">Transaction ID:</span>
        <span class="receipt-value">${escapeHtml(id)}</span>
      </div>
      <div class="receipt-detail">
        <span class="receipt-label">Description:</span>
        <span class="receipt-value">${escapeHtml(description)}</span>
      </div>
      <div class="receipt-detail">
        <span class="receipt-label">Type:</span>
        <span class="receipt-value">${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</span>
      </div>
      <div class="receipt-detail">
        <span class="receipt-label">Date & Time:</span>
        <span class="receipt-value">${escapeHtml(date)}</span>
      </div>
      <div class="receipt-detail">
        <span class="receipt-label">Amount:</span>
        <span class="receipt-value ${amountClass}">${formatAmountWithSign(amount)}</span>
      </div>
    `;

    modalOverlay.classList.add('active');
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  function downloadReceipt() {
    // Simulate PDF download – in production you would generate a real PDF
    const receiptHTML = document.getElementById('receiptContent')?.innerHTML;
    if (!receiptHTML) return;

    const style = `
      <style>
        body { font-family: 'Inter', sans-serif; padding: 20px; }
        .receipt-detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc; }
        .receipt-label { font-weight: 500; color: #666; }
        .receipt-value { font-weight: 600; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
      </style>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Transaction Receipt</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            ${style}
          </head>
          <body>
            <h2>Transaction Receipt</h2>
            <div id="receiptContent">${receiptHTML}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      showModal({
        title: 'Print',
        message: 'Please allow pop-ups to print the receipt.',
        confirmText: 'OK',
      });
    }
  }

  // ==================== Helpers ====================

  function normalizeAmount(amount, type) {
    if (type === 'deposit') {
      return Math.abs(amount);
    }
    return -Math.abs(amount);
  }

  function getTransactionIcon(type) {
    const icons = {
      deposit: 'solar:card-recive-bold',
      withdrawal: 'solar:card-send-bold',
      quiz: 'solar:clipboard-list-bold',
    };
    return icons[type] || 'solar:card-linear';
  }

  function formatAmountWithSign(amount) {
    const sign = amount > 0 ? '+' : '';
    return `${sign}${formatCurrency(amount)}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showLoading() {
    if (!transactionsList) return;
    transactionsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading transactions...</p>
      </div>
    `;
  }

  function showError(message) {
    if (!transactionsList) return;
    transactionsList.innerHTML = `
      <div class="error-state">
        <iconify-icon icon="solar:danger-triangle-linear"></iconify-icon>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-sm btn-outline" id="retryBtn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retryBtn');
    retryBtn?.addEventListener('click', loadTransactions);
  }

  function setFiltersLoadingState(loading) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.disabled = loading;
      btn.style.opacity = loading ? '0.6' : '1';
      btn.style.cursor = loading ? 'not-allowed' : 'pointer';
    });
  }
});