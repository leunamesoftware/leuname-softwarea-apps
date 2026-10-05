// Área do Dono: sempre da rede (nada guardado no aparelho). Existe para o celular deixar instalar como app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
