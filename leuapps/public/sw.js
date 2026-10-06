// Rede primeiro; sem internet, mostra a última vitrine guardada.
const VERSAO = 'leuapps-v35';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(['/', '/apps.json', '/img/leuapps-192.webp'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/loja') || url.pathname.startsWith('/quantocobrar')) return;
  // Imagens: do aparelho primeiro (abre rápido). Página e lista de apps: rede primeiro (sempre atualizadas).
  if (url.pathname.startsWith('/img/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { if (resp.ok) { const c = resp.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); } return resp; })));
    return;
  }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
