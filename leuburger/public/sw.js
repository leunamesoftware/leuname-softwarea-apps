// LeuBurger PDV instalado: rede primeiro (sempre a versão nova); sem internet abre a última tela guardada.
// A API nunca é guardada aqui (vendas e estoque precisam do servidor).
const VERSAO = 'leuburger-v43';
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

// Avisos com o app fechado: o servidor só "toca"; aqui busca o texto e mostra a notificação com som e vibração.
const ICONE = (url) => (url.startsWith('/parceiro') ? '/parceiro-icone-192.png' : url.startsWith('/entregador') ? '/entregador-icone-192.png' : '/pedir-icone-192.png');
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let avisos = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch('/api/publico/push/fila', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub ? sub.endpoint : '' }) });
      avisos = (await r.json()).avisos || [];
    } catch { /* sem internet: mostra o aviso genérico */ }
    if (!avisos.length) avisos = [{ id: 'pedee', titulo: 'Pedêê', texto: 'Tem novidade no seu pedido. Toque para ver.', url: '/pedir/pedidos' }];
    await Promise.all(avisos.map((a) => self.registration.showNotification(a.titulo, {
      body: a.texto, icon: ICONE(a.url), badge: '/icone-64.png', tag: a.id, renotify: true, requireInteraction: true,
      vibrate: [300, 120, 300, 120, 500], data: { url: a.url },
    })));
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/pedir/';
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const mesma = janelas.find((j) => new URL(j.url).pathname.startsWith(url.split('/').slice(0, 2).join('/')));
    if (mesma) { await mesma.focus(); if ('navigate' in mesma) try { await mesma.navigate(url); } catch { /* outra origem */ } return; }
    await self.clients.openWindow(url);
  })());
});
