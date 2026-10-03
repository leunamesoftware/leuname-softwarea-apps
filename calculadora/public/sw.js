// Guarda as telas do app para funcionar sem internet. A API nunca é guardada aqui.
const VERSAO = 'calc-v21';
const ARQUIVOS = ['/app/', '/app/app.js', '/app/app.css', '/app/calculo.js', '/img/logo.webp', '/img/icone-192-v2.png', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Rede primeiro (sempre a versão mais nova); sem internet, usa o que está guardado.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/app/'))),
  );
});
