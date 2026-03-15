const USER_KEY = 'mabun_user';
const TOKEN_KEY = 'mabun_token';

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.token) localStorage.setItem(TOKEN_KEY, user.token);
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}
