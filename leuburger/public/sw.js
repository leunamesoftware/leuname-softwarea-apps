// LeuBurger PDV instalado: rede primeiro (sempre a versão nova); sem internet abre a última tela guardada.
// A API nunca é guardada aqui (vendas e estoque precisam do servidor).
const VERSAO = 'leuburger-v3';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(['/', '/icone-192.png'])).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
