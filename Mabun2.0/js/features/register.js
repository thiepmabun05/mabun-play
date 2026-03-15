import { showModal } from '../utils/modal.js';
import { validatePhone, validatePassword, validateUsername, validateEmail, detectProvider } from '../utils/validation.js';
import { apiClient } from '../core/api.js';
import { initPasswordToggles } from '../utils/password-toggle.js';

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();

  const form = document.getElementById('registerForm');
  const phoneInput = document.getElementById('phone');
  const providerBadge = document.getElementById('providerBadge');
  const submitBtn = document.getElementById('submitBtn');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');

  if (!form || !phoneInput || !providerBadge || !submitBtn || !usernameInput) return;

  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    const provider = detectProvider(digits);
    if (provider === 'mtn') {
      providerBadge.textContent = 'MTN';
      providerBadge.className = 'provider-badge mtn';
    } else if (provider === 'digitel') {
      providerBadge.textContent = 'Digitel';
      providerBadge.className = 'provider-badge digitel';
    } else {
      providerBadge.textContent = '';
      providerBadge.className = 'provider-badge';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawPhone = phoneInput.value.replace(/\D/g, '');
    if (!validatePhone(rawPhone)) {
      await showModal({ title: 'Invalid Phone', message: 'Please enter a valid South Sudan number (92X or 98X).', confirmText: 'OK' });
      return;
    }

    const password = document.getElementById('password')?.value;
    const confirm = document.getElementById('confirm')?.value;

    if (!password || !validatePassword(password)) {
      await showModal({ title: 'Weak Password', message: 'Password must be at least 6 characters.', confirmText: 'OK' });
      return;
    }
    if (password !== confirm) {
      await showModal({ title: 'Password Mismatch', message: 'Passwords do not match.', confirmText: 'OK' });
      return;
    }

    const username = usernameInput.value.trim();
    if (!validateUsername(username)) {
      await showModal({ title: 'Invalid Username', message: 'Username must be at least 3 characters.', confirmText: 'OK' });
      return;
    }

    const email = emailInput ? emailInput.value.trim() : '';
    if (email && !validateEmail(email)) {
      await showModal({ title: 'Invalid Email', message: 'Please enter a valid email address or leave it blank.', confirmText: 'OK' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader"></span> Creating account...';

    try {
      await apiClient('/register', {
        method: 'POST',
        body: JSON.stringify({
          phone: rawPhone,
          password,
          provider: detectProvider(rawPhone) || 'mtn',
          username,
          email: email || null,
        }),
      });

      await showModal({
        title: 'Success',
        message: 'Account created. Please log in.',
        confirmText: 'OK'
      });
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Registration error:', error);
      await showModal({
        title: 'Registration Failed',
        message: error.message || 'Could not create account. Please try again.',
        confirmText: 'OK',
      });
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Register <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>';
    }
  });
});
