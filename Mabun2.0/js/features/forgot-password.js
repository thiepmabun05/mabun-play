import { showModal } from '../utils/modal.js';
import { validatePhone } from '../utils/validation.js';
import { apiClient } from '../core/api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const phoneInput = document.getElementById('phone');
  const submitBtn = document.getElementById('submitBtn');

  if (!form || !phoneInput || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawPhone = phoneInput.value.replace(/\D/g, '');
    if (!validatePhone(rawPhone)) {
      await showModal({ title: 'Invalid Phone', message: 'Please enter a valid South Sudan number (92X or 98X).', confirmText: 'OK' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader"></span> Sending...';

    try {
      await apiClient('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ phone: rawPhone }),
      });

      window.location.href = `otp.html?phone=${encodeURIComponent(rawPhone)}&purpose=reset`;
    } catch (error) {
      console.error('Forgot password error:', error);
      await showModal({
        title: 'Error',
        message: error.message || 'Could not send reset code. Please try again.',
        confirmText: 'OK',
      });
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send Reset Code <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>';
    }
  });
});
