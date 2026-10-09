// API do LeuBurger PDV (Hono). Rotas públicas: saúde e login. O resto exige sessão.
import { Hono } from 'hono';
import { andamento, publico } from './andamento';
import { auth, exigirSessao } from './auth';
import { ErroApi, type Env, type Vars } from './base';
import { cadastros } from './cadastros';
import { gestao } from './gestao';
import { vendas } from './vendas';

export function criarApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api');

  app.onError((e, c) => {
    if (e instanceof ErroApi) return c.json({ ok: false, erro: e.codigo, mensagem: e.message, campos: e.campos }, e.status as 400);
    console.error('[api]', e);
    return c.json({ ok: false, erro: 'erro_interno', mensagem: 'Algo deu errado do nosso lado. Nada foi salvo; tente de novo.' }, 500);
  });
  app.notFound((c) => c.json({ ok: false, erro: 'nao_encontrado', mensagem: 'Endereço não encontrado.' }, 404));

  // Pedidos que mudam dados só valem vindos do próprio app (proteção contra outro site enviando em nome do usuário).
  app.use('*', async (c, proximo) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      const origem = c.req.header('Origin');
      if (origem && origem !== new URL(c.req.url).origin) return c.json({ ok: false, erro: 'origem', mensagem: 'Pedido de outro site recusado.' }, 403);
    }
    await proximo();
    c.header('Cache-Control', c.res.headers.get('Cache-Control') || 'no-store');
  });

  app.get('/saude', (c) => c.json({ ok: true }));
  app.route('/auth', auth);
  app.route('/', publico); // links do cliente e do motoboy (sem login)
  app.use('*', exigirSessao);
  app.route('/', gestao);
  app.route('/', cadastros);
  app.route('/', vendas);
  app.route('/', andamento);
  return app;
}
