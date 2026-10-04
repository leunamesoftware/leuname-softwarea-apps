// LeuApps: serve a loja (arquivos em public/). O que não for da loja continua vindo do
// site antigo da LeuName (painel, licenças e páginas), pela ligação interna SITE_ANTIGO.
// /loja/ e /loja-api/ (comprar e entrar na conta) vão para o servidor de vendas (CONTAS).
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.hostname === 'leunamesoftware.com.br') {
      url.hostname = 'www.leunamesoftware.com.br';
      return Response.redirect(url.toString(), 301);
    }
    // Quanto Cobrar dentro da loja (mesmo endereço = abre sem barra de endereço no app instalado).
    if (env.CONTAS && (url.pathname === '/quantocobrar' || url.pathname === '/quantocobrar/')) return Response.redirect(url.origin + '/quantocobrar/app/', 302);
    if (env.CONTAS && url.pathname.startsWith('/quantocobrar/')) {
      url.pathname = url.pathname.slice('/quantocobrar'.length);
      if (url.pathname === '/api/mp/aviso') return new Response('Não encontrado.', { status: 404 });
      return env.CONTAS.fetch(new Request(url, req));
    }
    // Compra e conta (mesmo sistema de todos os apps): servidor de vendas, pela ligação interna CONTAS.
    // Fica no mesmo endereço da loja para o login valer aqui e nos apps servidos pela loja (Gestacell).
    if (env.CONTAS && (url.pathname.startsWith('/loja/') || url.pathname.startsWith('/loja-api/') || url.pathname.startsWith('/fonts/poppins-'))) {
      if (url.pathname === '/loja/compra.css') url.pathname = '/compra.css';
      if (url.pathname.startsWith('/loja-api/')) url.pathname = '/api/' + url.pathname.slice('/loja-api/'.length);
      if (url.pathname === '/api/mp/aviso') return new Response('Não encontrado.', { status: 404 });
      return env.CONTAS.fetch(new Request(url, req));
    }
    if (env.SITE_ANTIGO && url.hostname !== 'apps.leunamesoftware.com.br') {
      if (url.pathname === '/site-antigo') url.pathname = '/';
      return env.SITE_ANTIGO.fetch(new Request(url, req));
    }
    return new Response('Página não encontrada.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
