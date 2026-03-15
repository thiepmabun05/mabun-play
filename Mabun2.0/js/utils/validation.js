// validation.js – Shared validation utilities

export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return /^(9[28]\d{7})$/.test(digits);
}

export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return '+211' + digits;
}

export function detectProvider(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) return 'mtn';
  if (digits.startsWith('98')) return 'digitel';
  return null;
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validateEmail(email) {
  if (!email) return true;
  return /^\S+@\S+\.\S+$/.test(email);
}

export function validateUsername(username) {
  return username.length >= 3;
}