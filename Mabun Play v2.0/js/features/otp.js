// js/features/otp.js
import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const phoneRaw = urlParams.get('phone');
  const purpose = urlParams.get('purpose') || 'register';

  if (!phoneRaw) {
    window.location.href = 'login.html';
    return;
  }

  const phoneDisplay = document.getElementById('phoneDisplay');
  const hiddenPhone = document.getElementById('hiddenPhone');
  const hiddenPurpose = document.getElementById('hiddenPurpose');
  const inputs = document.querySelectorAll('.otp-input');
  const form = document.getElementById('otpForm');
  const verifyBtn = document.getElementById('verifyBtn');
  const timerSpan = document.getElementById('timer');
  const resendBtn = document.getElementById('resendBtn');

  if (!phoneDisplay || !hiddenPhone || !hiddenPurpose || !form || !verifyBtn || !timerSpan || !resendBtn) return;

  phoneDisplay.textContent = '+211 ' + phoneRaw.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  hiddenPhone.value = phoneRaw;
  hiddenPurpose.value = purpose;

  // OTP input logic (auto-advance, paste, etc.) – unchanged
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\D/g, '');
      e.target.value = value.slice(0, 1);
      if (value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && index > 0 && e.target.value === '') {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
  });

  inputs[0].addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < pasteData.length; i++) {
      if (inputs[i]) inputs[i].value = pasteData[i];
    }
    const nextEmpty = Array.from(inputs).find(inp => inp.value === '');
    if (nextEmpty) nextEmpty.focus(); else inputs[inputs.length - 1].focus();
  });

  // Timer (120 seconds)
  let timeLeft = 120;
  const timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerSpan.textContent = '00:00';
      resendBtn.disabled = false;
      return;
    }
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);

  // Resend OTP
  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    try {
      await apiClient('/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: phoneRaw, purpose }),
      });
      // Reset timer
      timeLeft = 120;
      resendBtn.disabled = true;
      // Optionally show success message
    } catch (error) {
      console.error('Resend error:', error);
      await showModal({
        title: 'Error',
        message: error.message || 'Could not resend code. Please try again.',
        confirmText: 'OK',
      });
      resendBtn.disabled = false;
    }
  });

  // Verify OTP
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otpCode = Array.from(inputs).map(i => i.value).join('');
    if (otpCode.length !== 6) {
      await showModal({ title: 'Incomplete OTP', message: 'Please enter the 6‑digit code.', confirmText: 'OK' });
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="loader"></span> Verifying...';

    try {
      const response = await apiClient('/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: phoneRaw,
          code: otpCode,
          purpose,
        }),
      });

      // On success, server may return a token for password reset or registration
      if (purpose === 'register') {
        // Registration: go to complete profile
        window.location.href = `complete-profile.html?phone=${encodeURIComponent(phoneRaw)}`;
      } else if (purpose === 'reset') {
        // Password reset: go to reset password page with token
        const resetToken = response.token; // Assume server returns a reset token
        window.location.href = `reset-password.html?phone=${encodeURIComponent(phoneRaw)}&token=${encodeURIComponent(resetToken)}`;
      } else {
        // Fallback
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      await showModal({
        title: 'Verification Failed',
        message: error.message || 'Invalid or expired code. Please try again.',
        confirmText: 'OK',
      });
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = 'Verify <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>';
    }
  });
});