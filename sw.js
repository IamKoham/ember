const CACHE = 'ember-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/app.js',
  './js/home.js',
  './js/settings.js',
  './js/trackers/mood.js',
  './js/trackers/weather.js',
  './js/trackers/reading.js',
  './js/trackers/period.js',
  './js/trackers/water.js',
  './js/trackers/sleep.js',
  './js/trackers/wheel.js',
  './js/trackers/grid-tracker.js',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Nunito:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
