// LeuApps: serve a loja (arquivos em public/). O que não for da loja continua vindo do
// site antigo da LeuName (painel, licenças e páginas), pela ligação interna SITE_ANTIGO.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.hostname === 'leunamesoftware.com.br') {
      url.hostname = 'www.leunamesoftware.com.br';
      return Response.redirect(url.toString(), 301);
    }
    if (env.SITE_ANTIGO && url.hostname !== 'apps.leunamesoftware.com.br') {
      if (url.pathname === '/site-antigo') url.pathname = '/index.html';
      return env.SITE_ANTIGO.fetch(new Request(url, req));
    }
    return new Response('Página não encontrada.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
