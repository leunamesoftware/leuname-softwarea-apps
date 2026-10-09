// Entrada do LeuBurger PDV na Cloudflare: /api/* vai para a API; o resto é o app (arquivos de dist/).
import { criarApp } from './app';
import type { Env } from './base';

const app = criarApp();

export default {
  async fetch(req: Request, env: Env, ctx: unknown): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return app.fetch(req, env, ctx as never);
    // Apps Pedêê (cliente, lojista e entregador): qualquer endereço dentro deles abre a página do app.
    const appPedee = /^\/(pedir|parceiro|entregador)(\/|$)/.exec(url.pathname)?.[1];
    const ehPaginaDoApp = Boolean(appPedee) && !/\.[a-z0-9]+$/i.test(url.pathname);
    const r = await env.ASSETS!.fetch(ehPaginaDoApp ? new Request(new URL(`/${appPedee}/`, url), req) : req);
    // Página do app nunca fica velha no aparelho (os arquivos com hash no nome ficam guardados).
    if ((r.headers.get('Content-Type') || '').includes('text/html')) {
      const h = new Response(r.body, r);
      h.headers.set('Cache-Control', 'no-cache');
      h.headers.set('X-Content-Type-Options', 'nosniff');
      h.headers.set('Referrer-Policy', 'same-origin');
      return h;
    }
    return r;
  },
};
