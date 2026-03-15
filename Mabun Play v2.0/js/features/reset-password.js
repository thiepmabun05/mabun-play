// js/features/reset-password.js
import { showModal } from '../utils/modal.js';
import { validatePassword } from '../utils/validation.js';
import { apiClient } from '../core/api.js';
import { initPasswordToggles } from '../utils/password-toggle.js';

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();

  const urlParams = new URLSearchParams(window.location.search);
  const phoneRaw = urlParams.get('phone');
  const resetToken = urlParams.get('token'); // Token from OTP verification

  if (!phoneRaw || !resetToken) {
    window.location.href = 'login.html';
    return;
  }

  const hiddenPhone = document.getElementById('hiddenPhone');
  const hiddenToken = document.getElementById('hiddenToken'); // You may need to add this hidden input
  const form = document.getElementById('resetForm');
  const submitBtn = document.getElementById('submitBtn');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');

  if (!hiddenPhone || !hiddenToken || !form || !submitBtn || !newPassword || !confirmPassword) return;

  hiddenPhone.value = phoneRaw;
  hiddenToken.value = resetToken;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = newPassword.value;
    const confirm = confirmPassword.value;

    if (!validatePassword(password)) {
      await showModal({ title: 'Weak Password', message: 'Password must be at least 6 characters.', confirmText: 'OK' });
      return;
    }
    if (password !== confirm) {
      await showModal({ title: 'Password Mismatch', message: 'Passwords do not match.', confirmText: 'OK' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader"></span> Resetting...';

    try {
      await apiClient('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          phone: '+211' + phoneRaw,
          token: resetToken,
          newPassword: password,
        }),
      });

      await showModal({
        title: 'Success',
        message: 'Password reset successfully. Please log in.',
        confirmText: 'OK',
      });
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Reset password error:', error);
      await showModal({
        title: 'Error',
        message: error.message || 'Could not reset password. Please try again.',
        confirmText: 'OK',
      });
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Reset Password <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>';
    }
  });
});