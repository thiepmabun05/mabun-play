/**
 * Formatters – consistent formatting for dates, currency, numbers, etc.
 */

/**
 * Format a number as South Sudanese Pound (SSP)
 * @param {number} amount - The amount to format
 * @param {boolean} compact - If true, format as "X.XK" for thousands
 * @returns {string} Formatted amount with SSP suffix
 */
export function formatCurrency(amount, compact = false) {
  if (typeof amount !== 'number') amount = Number(amount) || 0;
  if (compact && amount >= 1000) {
    const thousands = (amount / 1000).toFixed(1);
    return `${thousands}K SSP`;
  }
  return amount.toLocaleString() + ' SSP';
}

/**
 * Format a number with compact notation (K for thousands)
 * @param {number} num
 * @returns {string}
 */
export function compactNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Format a date to a relative time string (e.g., "2h ago", "Just now")
 * @param {string|Date} dateInput - ISO string or Date object
 * @returns {string}
 */
export function timeAgo(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a date to a short date string (e.g., "Mar 5, 2026")
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatShortDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to include time (e.g., "Mar 5, 2026, 14:30")
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Pad a number with leading zero
 * @param {number} num
 * @param {number} length
 * @returns {string}
 */
export function padZero(num, length = 2) {
  return num.toString().padStart(length, '0');
}