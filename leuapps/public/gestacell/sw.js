// Gestacell instalado (gestacell.leunamesoftware.com.br): rede primeiro, sem internet abre o que ficou guardado.
// Os dados da loja ficam no próprio aparelho (IndexedDB) e na nuvem; aqui só a tela do app.
const VERSAO = 'gestacell-v3';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(['/', '/img/gestacell-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/loja')) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
