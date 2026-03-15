import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import { getCurrentUser } from '../core/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    editProfile: document.getElementById('editProfile'),
    changePassword: document.getElementById('changePassword'),
    linkedAccounts: document.getElementById('linkedAccounts'),
    linkedPhone: document.getElementById('linkedPhone'),
    pushNotifications: document.getElementById('pushNotifications'),
    quizReminders: document.getElementById('quizReminders'),
    promotions: document.getElementById('promotions'),
    helpCenter: document.getElementById('helpCenter'),
    contactSupport: document.getElementById('contactSupport'),
    terms: document.getElementById('terms')
  };

  // Load user settings
  try {
    const user = getCurrentUser();
    if (user && elements.linkedPhone) {
      elements.linkedPhone.textContent = user.phone || '—';
    }

    const settings = await apiClient('/user/settings');
    if (elements.pushNotifications) elements.pushNotifications.checked = settings.pushNotifications;
    if (elements.quizReminders) elements.quizReminders.checked = settings.quizReminders;
    if (elements.promotions) elements.promotions.checked = settings.promotions;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  // Save toggles when changed
  async function saveSetting(key, value) {
    try {
      await apiClient('/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value })
      });
    } catch (error) {
      showModal({ title: 'Error', message: error.message, confirmText: 'OK' });
    }
  }

  elements.pushNotifications?.addEventListener('change', (e) => {
    saveSetting('pushNotifications', e.target.checked);
  });
  elements.quizReminders?.addEventListener('change', (e) => {
    saveSetting('quizReminders', e.target.checked);
  });
  elements.promotions?.addEventListener('change', (e) => {
    saveSetting('promotions', e.target.checked);
  });

  // Navigation
  elements.editProfile?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'profile.html?edit=true';
  });

  elements.changePassword?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'change-password.html';
  });

  elements.linkedAccounts?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'linked-accounts.html';
  });

  elements.helpCenter?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'support.html';
  });

  elements.contactSupport?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'support.html#contact';
  });

  elements.terms?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'terms.html';
  });
});