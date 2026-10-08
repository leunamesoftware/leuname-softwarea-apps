// MercaGestão instalado (mercagestao.leunamesoftware.com.br): rede primeiro; sem internet abre o que ficou guardado.
// Os dados do mercado ficam no próprio aparelho (IndexedDB); aqui só os arquivos do app.
const VERSAO = 'mercagestao-v7';
const BASE = ['/', '/app.css?v=4', '/app.js?v=7', '/nucleo.js', '/icones.js', '/instalar.js', '/app.webmanifest', '/img/mercagestao-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/loja') || url.pathname.startsWith('/fiscal') || url.pathname.startsWith('/produto')) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
