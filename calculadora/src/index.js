import RECEITAS from './receitas.json';
import { estatisticaRendimento, rendimentoPlausivel } from './rendimento.js';
import { licencaAtiva } from './licencas.js';
import { acessoDaChave, acessoDaConta, appsDaConta } from './planos.js';
import { criarPedido, receberAviso, recuperarConta, situacaoPedido } from './pagamento.js';
import { buscarConta, senhaConfere, abrirSessao, contaDaSessao, fecharSessao, contaParaCompra, senhaValida, EMAIL } from './contas.js';

const POR_ID = new Map(RECEITAS.map((r) => [r.id, r]));

function json(dados, status = 200, cookie = null) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(dados), { status, headers });
}

async function sha256(texto) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function corpo(req) {
  if (Number(req.headers.get('Content-Length') || 0) > 4096) return null;
  try { return await req.json(); } catch { return null; }
}

const chaveDoPedido = (req) => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');

async function limiteOk(env, req) {
  if (!env.LIMITE) return true;
  const { success } = await env.LIMITE.limit({ key: req.headers.get('CF-Connecting-IP') || 'x' });
  return success;
}

/** POSTs do navegador só podem vir do próprio site. */
function mesmaOrigem(req) {
  const o = req.headers.get('Origin');
  return !o || o === new URL(req.url).origin;
}

async function estatisticas(env) {
  const { results } = await env.DB.prepare('SELECT receita_id, unidades_base, peso_unidade_g FROM rendimentos').all();
  const porReceita = new Map();
  for (const r of results) {
    if (!porReceita.has(r.receita_id)) porReceita.set(r.receita_id, []);
    porReceita.get(r.receita_id).push({ unidadesBase: r.unidades_base, pesoUnidadeG: r.peso_unidade_g });
  }
  return (receita) => estatisticaRendimento(receita, porReceita.get(receita.id) || []);
}

async function registrarRendimento(env, chave, d) {
  const receita = POR_ID.get(String(d?.receitaId || ''));
  const unidades = Number(d?.unidades), escala = Number(d?.escala) || 1, peso = Number(d?.pesoUnidadeG) || null;
  if (!receita || !Number.isInteger(unidades) || unidades < 1 || unidades > 100000 || escala < 0.1 || escala > 100) {
    return json({ erro: 'dados_invalidos' }, 400);
  }
  const unidadesBase = unidades / escala;
  if (rendimentoPlausivel(unidadesBase, receita) && (!peso || (peso >= 1 && peso <= 5000))) {
    // Autor = hash irreversível (chave + receita): 1 resultado por comprador, sem identificar ninguém.
    const autor = await sha256('rendimento:' + chave + ':' + receita.id);
    await env.DB.prepare(`INSERT INTO rendimentos (receita_id, autor, unidades_base, peso_unidade_g, criado_em) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(receita_id, autor) DO UPDATE SET unidades_base = excluded.unidades_base, peso_unidade_g = excluded.peso_unidade_g, criado_em = excluded.criado_em`)
      .bind(receita.id, autor, unidadesBase, peso, new Date().toISOString().slice(0, 10)).run();
  }
  const stats = await estatisticas(env);
  return json({ ok: true, rendimento: stats(receita) });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.hostname === 'calculadora.leunamesoftware.com.br' && url.pathname !== '/api/mp/aviso') {
      url.hostname = 'quantocobrar.leunamesoftware.com.br';
      return Response.redirect(url.toString(), 301);
    }
    const { pathname } = url;
    const m = req.method;
    // App da Play Store: a regra do Google não permite vender dentro do app, então a página de vendas não abre nele.
    if (/QuantoCobrarApp/.test(req.headers.get('User-Agent') || '') && ['/', '/index.html', '/comprar', '/comprar.html'].includes(pathname)) {
      return Response.redirect(url.origin + '/app/', 302);
    }
    try {
      if ((pathname === '/baixar' || pathname === '/baixar/') && (m === 'GET' || m === 'HEAD')) {
        const apk = env.DOWNLOADS && (m === 'HEAD' ? await env.DOWNLOADS.head('quantocobrar.apk') : await env.DOWNLOADS.get('quantocobrar.apk'));
        if (!apk) return new Response('Download indisponível no momento.', { status: 404 });
        return new Response(m === 'HEAD' ? null : apk.body, {
          headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': 'attachment; filename="QuantoCobrar.apk"',
            'Content-Length': String(apk.size),
            'Cache-Control': 'no-store',
          },
        });
      }
      if (pathname === '/api/saude') return json({ ok: true, pagamento: Boolean(env.MP_ACCESS_TOKEN) });

      // ---- compra ----
      if (pathname === '/api/comprar' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const r = await criarPedido(env, url.origin, await corpo(req), req);
        return r.erro ? json({ erro: r.erro }, r.status) : json({ url: r.url, pedido: r.pedido }, 200, r.sessao);
      }
      if (pathname === '/api/recuperar' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const sessao = await recuperarConta(env, await corpo(req), req);
        return sessao ? json({ ok: true }, 200, sessao) : json({ erro: 'nao_encontrado' }, 404);
      }
      if (pathname === '/api/mp/aviso' && m === 'POST') {
        await receberAviso(env, req);
        return json({ ok: true });
      }
      const pedido = pathname.match(/^\/api\/pedido\/([0-9a-f]{36})$/);
      if (pedido && m === 'GET') {
        const s = await situacaoPedido(env, pedido[1], url.searchParams.get('pagamento'));
        return s ? json(s) : json({ erro: 'nao_encontrado' }, 404);
      }

      // ---- conta (e-mail + senha) ----
      if (pathname === '/api/conta/entrar' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const d = await corpo(req);
        const conta = await buscarConta(env, d?.email);
        if (!conta || !(await senhaConfere(conta, d?.senha))) return json({ erro: 'login_invalido' }, 401);
        return json({ ok: true, nome: conta.nome }, 200, await abrirSessao(env, conta.id, req));
      }
      // Conta grátis (sem compra): começa o teste de 7 dias.
      if (pathname === '/api/conta/criar' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const d = await corpo(req);
        const nome = String(d?.nome || '').trim().slice(0, 80), email = String(d?.email || '').trim().toLowerCase();
        if (nome.length < 2 || !EMAIL.test(email)) return json({ erro: 'dados_invalidos' }, 400);
        if (!senhaValida(d?.senha)) return json({ erro: 'senha_curta' }, 400);
        const c = await contaParaCompra(env, email, nome, d.senha);
        if (c.erro) return json({ erro: c.erro }, 409);
        return json({ ok: true, nome: c.conta.nome }, 200, await abrirSessao(env, c.conta.id, req));
      }
      if (pathname === '/api/conta/sair' && m === 'POST') return json({ ok: true }, 200, await fecharSessao(env, req));
      if (pathname === '/api/conta' && m === 'GET') {
        const conta = await contaDaSessao(env, req);
        if (!conta) return json({ conta: null });
        return json({ conta: { nome: conta.nome, email: conta.email }, acesso: await acessoDaConta(env, conta.id) });
      }
      // Apps comprados pela conta (Gestacell, Radar...): a chave vai só para o dono logado.
      if (pathname === '/api/conta/apps' && m === 'GET') {
        const conta = await contaDaSessao(env, req);
        return conta ? json({ conta: { nome: conta.nome, email: conta.email }, apps: await appsDaConta(env, conta.id) }) : json({ conta: null, apps: {} });
      }

      // ---- app (conta ou chave antiga: o plano dela; sem nada: degustação) ----
      if (pathname === '/api/ativar' && m === 'POST') {
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const d = await corpo(req);
        return (await licencaAtiva(env, d?.chave)) ? json({ ok: true }) : json({ erro: 'chave_invalida' }, 401);
      }
      if (pathname.startsWith('/api/')) {
        const conta = await contaDaSessao(env, req);
        const bruta = conta ? '' : chaveDoPedido(req);
        // Conta: o melhor plano pago dela. Chave antiga: o plano da chave. Sem nada: grátis (2 receitas).
        const chave = bruta ? await licencaAtiva(env, bruta) : null;
        if (bruta && !chave) return json({ erro: 'chave_invalida' }, 401);
        const acessoConta = conta ? await acessoDaConta(env, conta.id) : null;
        if (pathname === '/api/receitas' && m === 'GET') {
          // Sem conta e sem chave: nada liberado (o teste grátis começa ao criar a conta).
          const acesso = acessoConta || (chave ? await acessoDaChave(env, chave) : { plano: 'gratis', receitas: 0, semConta: true });
          const stats = await estatisticas(env);
          const receitas = RECEITAS.map((r, i) => (i >= acesso.receitas
            ? { id: r.id, nome: r.nome, categoria: r.categoria, foto: r.foto, bloqueada: true }
            : { ...r, rendimentoObservado: stats(r) }));
          return json({ receitas, plano: acesso.plano, expiraEm: acesso.expiraEm || null, venceu: Boolean(acesso.venceu),
            bloqueado: Boolean(acesso.bloqueado || acesso.semConta || acesso.receitas === 0), testeAte: acesso.testeAte || null, pacotes: acesso.pacotes || 0 });
        }
        if (pathname === '/api/rendimento' && m === 'POST') {
          // Rendimento só entra na média quando vem de quem comprou.
          const autor = chave || (acessoConta && acessoConta.plano !== 'gratis' && !acessoConta.bloqueado ? 'conta:' + conta.id : null);
          if (!autor) return json({ erro: 'chave_invalida' }, 401);
          return await registrarRendimento(env, autor, await corpo(req));
        }
        return json({ erro: 'nao_encontrado' }, 404);
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error('erro', pathname, e);
      return json({ erro: 'interno' }, 500);
    }
  },
};
