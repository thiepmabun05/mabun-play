import config from './config.js';
import { getAuthToken, setCurrentUser } from './storage.js';

/**
 * Core API client with authentication, timeout, and error handling
 * @param {string} endpoint - API endpoint (starting with /)
 * @param {Object} options - fetch options (method, body, headers)
 * @returns {Promise<any>} - parsed JSON response
 */
export async function apiClient(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(`${config.API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      error.code = data.code;
      // Handle 401 Unauthorized – clear session and redirect to login
      if (response.status === 401) {
        setCurrentUser(null);
        window.location.href = '/login.html';
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Retry wrapper for idempotent requests (e.g., GET)
 */
export async function apiWithRetry(endpoint, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await apiClient(endpoint, options);
    } catch (error) {
      if (i === retries || error.status < 500) throw error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}