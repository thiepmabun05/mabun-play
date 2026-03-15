// service-worker.js – Offline caching for Mabun Quiz PWA

const CACHE_NAME = 'mabun-quiz-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/quiz.html',
  '/leaderboard.html',
  '/wallet.html',
  '/profile.html',
  '/community.html',
  '/notifications.html',
  '/settings.html',
  '/history.html',
  '/results.html',
  '/login.html',
  '/register.html',
  '/otp.html',
  '/complete-profile.html',
  '/forgot-password.html',
  '/reset-password.html',
  '/terms.html',
  '/privacy.html',
  '/support.html',
  '/css/main.css',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/community.css',
  '/css/history.css',
  '/css/leaderboard.css',
  '/css/notifications.css',
  '/css/profile.css',
  '/css/quiz.css',
  '/css/results.css',
  '/css/settings.css',
  '/css/wallet.css',
  '/js/core/app.js',
  '/js/core/config.js',
  '/js/core/api.js',
  '/js/core/storage.js',
  '/js/core/guards.js',
  '/js/features/',
  '/js/utils/',
  '/assets/images/logo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.json'
];

// Install event – cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event – caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API requests – Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets – Cache First
  if (event.request.destination === 'style' ||
      event.request.destination === 'script' ||
      event.request.destination === 'image' ||
      event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // HTML pages – Stale‑While‑Revalidate
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          });
        return cached || fetchPromise;
      })
  );
});