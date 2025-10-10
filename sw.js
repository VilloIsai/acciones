const CACHE = 'acciones-cache-v1';
const urls = [
  'index.html','app.js','manifest.json','icon-192.png','icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(urls)));
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
