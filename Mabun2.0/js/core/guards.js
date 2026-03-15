import { getCurrentUser } from './storage.js';

const PUBLIC_PAGES = [
  'index.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'reset-password.html',
  'otp.html',
  'complete-profile.html',
  'privacy.html',
  'terms.html',
  'support.html'
];

export function setupAuthGuard() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const user = getCurrentUser();

  if (!user && !PUBLIC_PAGES.includes(currentPath)) {
    // Redirect to login, preserving the intended destination
    window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
  }

  // If user is logged in, prevent access to auth pages (except landing)
  if (user && PUBLIC_PAGES.includes(currentPath) && currentPath !== 'index.html') {
    window.location.href = 'dashboard.html';
  }
}