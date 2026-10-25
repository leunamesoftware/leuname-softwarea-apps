// Service worker do ERP: permite instalar como app e recebe o aviso de pedido novo com o ERP fechado.
// O aviso chega sem texto (só o "toque"); aqui buscamos o texto no servidor e mostramos a notificação.
self.addEventListener('fetch', () => {});

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let avisos = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch('/api/push/fila', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub && sub.endpoint }) });
      avisos = (await r.json()).avisos || [];
    } catch {}
    if (!avisos.length) avisos = [{ titulo: '🛒 Novidade na Supermisto', texto: 'Abra o ERP para ver.', url: '/#pedidos' }];
    for (const a of avisos) {
      await self.registration.showNotification(a.titulo, {
        body: a.texto, icon: a.icone || '/icone-192.png', badge: '/icone-192.png', tag: 'pedido-' + (a.id || Date.now()),
        vibrate: [200, 100, 200, 100, 400], renotify: true, requireInteraction: true, data: { url: a.url || '/#pedidos' },
      });
    }
    // se o ERP estiver aberto, avisa a tela para tocar o som e atualizar
    const telas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    telas.forEach((c) => c.postMessage({ tipo: 'pedido' }));
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const telas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of telas) { if ('focus' in c) { c.postMessage({ tipo: 'abrir', url }); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
