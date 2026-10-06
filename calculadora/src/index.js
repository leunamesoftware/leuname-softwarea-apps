import { listarAvaliacoes, avaliar, votarUtil, avaliacoesDoDono, esconderAvaliacao, responderAvaliacao } from './avaliacoes.js';
import RECEITAS from './receitas.json';
import DICAS from './dicas.json';
import { listarCanal, marcarEnvio } from './canal.js';
import { brindeDoEmail, listarBrindes, darBrinde, tirarBrinde } from './brindes.js';
import { donoLogado, estadoDono, criarSenhaDono, entrarDono, trocarSenhaDono, sairDono } from './dono.js';
import { estatisticaRendimento, rendimentoPlausivel } from './rendimento.js';
import { licencaAtiva } from './licencas.js';
import { acessoDaChave, acessoDaConta, appsDaConta, eDono } from './planos.js';
import { criarPedido, receberAviso, recuperarConta, situacaoPedido } from './pagamento.js';
import { buscarConta, senhaConfere, abrirSessao, contaDaSessao, fecharSessao, contaParaCompra, senhaValida, trocarSenha, EMAIL, aparelhoDoPedido, cookieAparelho, marcarTeste } from './contas.js';

const POR_ID = new Map(RECEITAS.map((r) => [r.id, r]));

function json(dados, status = 200, cookie = null) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const h = new Headers(headers);
  for (const c of [].concat(cookie || [])) h.append('Set-Cookie', c);
  return new Response(JSON.stringify(dados), { status, headers: h });
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
        // Dentro da loja (www/quantocobrar) a volta do Mercado Pago precisa do começo /quantocobrar.
        const base = req.headers.get('X-Loja-Base') === '/quantocobrar' ? '/quantocobrar' : '';
        const r = await criarPedido(env, url.origin + base, await corpo(req), req);
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
        let conta = await buscarConta(env, d?.email);
        // Ganhou presente (brinde) e ainda não tem conta: o primeiro "Entrar" cria a conta com a senha que a pessoa escolheu.
        if (!conta && EMAIL.test(String(d?.email || '').trim().toLowerCase()) && senhaValida(d?.senha) && (await brindeDoEmail(env, d.email))) {
          const email = String(d.email).trim().toLowerCase();
          conta = (await contaParaCompra(env, email, email.split('@')[0], d.senha)).conta;
          return json({ ok: true, nome: conta.nome, novaConta: true }, 200, await abrirSessao(env, conta.id, req));
        }
        if (!conta || !(await senhaConfere(conta, d?.senha))) return json({ erro: 'login_invalido' }, 401);
        return json({ ok: true, nome: conta.nome }, 200, await abrirSessao(env, conta.id, req));
      }
      // Conta grátis (sem compra): começa o teste de 2 dias (um por conta).
      if (pathname === '/api/conta/criar' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const d = await corpo(req);
        const nome = String(d?.nome || '').trim().slice(0, 80), email = String(d?.email || '').trim().toLowerCase();
        if (nome.length < 2 || !EMAIL.test(email)) return json({ erro: 'dados_invalidos' }, 400);
        if (!senhaValida(d?.senha)) return json({ erro: 'senha_curta' }, 400);
        const nova = !(await buscarConta(env, email));
        const c = await contaParaCompra(env, email, nome, d.senha);
        if (c.erro) return json({ erro: c.erro }, 409);
        const ap = aparelhoDoPedido(req, d?.aparelho);
        const semTeste = nova ? await marcarTeste(env, c.conta.id, req, ap) : 0;
        return json({ ok: true, nome: c.conta.nome, semTeste: Boolean(semTeste) }, 200, [await abrirSessao(env, c.conta.id, req), cookieAparelho(req, ap.valor)]);
      }
      // Trocar a senha (precisa estar logado e saber a senha atual). As outras sessões caem; esta continua.
      if (pathname === '/api/conta/senha' && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const sessao = await contaDaSessao(env, req);
        if (!sessao) return json({ erro: 'sem_sessao' }, 401);
        const d = await corpo(req);
        const conta = await buscarConta(env, sessao.email);
        if (!conta || !(await senhaConfere(conta, d?.atual))) return json({ erro: 'senha_atual' }, 401);
        if (!senhaValida(d?.nova)) return json({ erro: 'senha_curta' }, 400);
        await trocarSenha(env, conta.id, d.nova);
        return json({ ok: true }, 200, await abrirSessao(env, conta.id, req));
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
        if (conta) return json({ conta: { nome: conta.nome, email: conta.email }, apps: await appsDaConta(env, conta.id, conta.email) });
        // Entrou com a senha da Área do Dono: tem todos os apps, sem precisar de conta da loja.
        if (await donoLogado(env, req)) return json({ conta: { nome: 'Dono', email: env.DONO_EMAIL }, apps: await appsDaConta(env, null, env.DONO_EMAIL) });
        return json({ conta: null, apps: {} });
      }

      // ---- Notas e avaliações da LeuApps (ver: qualquer um; avaliar: só com conta) ----
      if (pathname === '/api/avaliacoes' && m === 'GET') {
        const conta = await contaDaSessao(env, req);
        const r = await listarAvaliacoes(env, url.searchParams.get('app'), conta?.id || null);
        return r.erro ? json({ erro: r.erro }, r.status) : json(r);
      }
      if ((pathname === '/api/avaliacoes' || pathname === '/api/avaliacoes/util') && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        const conta = await contaDaSessao(env, req);
        if (!conta) return json({ erro: 'sem_sessao' }, 401);
        const r = await (pathname === '/api/avaliacoes' ? avaliar : votarUtil)(env, conta, await corpo(req));
        return r.erro ? json({ erro: r.erro }, r.status) : json({ ok: true });
      }
      if (pathname.startsWith('/api/dono/avaliacoes')) {
        const conta = await contaDaSessao(env, req);
        if (!(await donoLogado(env, req)) && !(conta && eDono(env, conta.email))) return json({ erro: 'so_o_dono' }, 403);
        if (pathname === '/api/dono/avaliacoes' && m === 'GET') return json({ avaliacoes: await avaliacoesDoDono(env) });
        if (m !== 'POST') return json({ erro: 'nao_encontrado' }, 404);
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        const acao = { '/api/dono/avaliacoes/esconder': esconderAvaliacao, '/api/dono/avaliacoes/responder': responderAvaliacao }[pathname];
        if (!acao) return json({ erro: 'nao_encontrado' }, 404);
        const r = await acao(env, await corpo(req));
        return r.erro ? json({ erro: r.erro }, r.status) : json({ ok: true });
      }

      // ---- Área do Dono: login próprio, separado das contas dos apps ----
      if (pathname === '/api/dono/estado' && m === 'GET') {
        const e = await estadoDono(env, req);
        // Logado com a conta do dono (mesmo e-mail) também conta como dono (a loja mostra o que falta colocar).
        if (!e.logado) { const c = await contaDaSessao(env, req); if (c && eDono(env, c.email)) e.logado = true; }
        return json(e);
      }
      // Brindes (só o dono): dar o Quanto Cobrar Pro de graça para um e-mail.
      if (pathname === '/api/dono/brindes' || pathname === '/api/dono/brindes/remover') {
        const conta = await contaDaSessao(env, req);
        if (!(await donoLogado(env, req)) && !(conta && eDono(env, conta.email))) return json({ erro: 'so_o_dono' }, 403);
        if (m === 'GET' && pathname === '/api/dono/brindes') return json({ brindes: await listarBrindes(env) });
        if (m !== 'POST') return json({ erro: 'nao_encontrado' }, 404);
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        const r = await (pathname === '/api/dono/brindes' ? darBrinde : tirarBrinde)(env, await corpo(req));
        return r.erro ? json({ erro: r.erro }, r.status) : json({ ok: true });
      }
      if (pathname.startsWith('/api/dono/') && m === 'POST') {
        if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
        if (!(await limiteOk(env, req))) return json({ erro: 'muitas_tentativas' }, 429);
        if (pathname === '/api/dono/sair') return json({ ok: true }, 200, await sairDono(env, req));
        const acao = { '/api/dono/criar': criarSenhaDono, '/api/dono/entrar': entrarDono, '/api/dono/senha': trocarSenhaDono }[pathname];
        if (!acao) return json({ erro: 'nao_encontrado' }, 404);
        const r = await acao(env, req, await corpo(req));
        return r.erro ? json({ erro: r.erro }, r.status) : json({ ok: true }, 200, r.cookie);
      }

      // ---- página do canal do WhatsApp (só o dono) ----
      if (pathname === '/api/canal' || pathname === '/api/canal/enviado') {
        const conta = await contaDaSessao(env, req);
        if (!(await donoLogado(env, req)) && !(conta && eDono(env, conta.email))) return json({ erro: 'so_o_dono' }, 403);
        if (pathname === '/api/canal' && m === 'GET') return json({ posts: await listarCanal(env, RECEITAS, DICAS) });
        if (pathname === '/api/canal/enviado' && m === 'POST') {
          if (!mesmaOrigem(req)) return json({ erro: 'origem' }, 403);
          return (await marcarEnvio(env, RECEITAS, DICAS, await corpo(req))) ? json({ ok: true }) : json({ erro: 'nao_encontrado' }, 404);
        }
        return json({ erro: 'nao_encontrado' }, 404);
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
          // Receitas agendadas (liberarEm no futuro ou "aguardando-foto") ficam escondidas; só o dono vê, marcadas.
          const dono = Boolean(conta && eDono(env, conta.email));
          const agora = Date.now();
          const liberada = (r) => !r.liberarEm || Date.parse(r.liberarEm) <= agora;
          // Quem ganhou presente (brinde) tem acesso total: já vê também as receitas agendadas que têm foto (sem a marca).
          const presente = acesso.plano === 'brinde';
          const comFoto = (r) => !r.fotoProvisoria && r.liberarEm !== 'aguardando-foto';
          const visiveis = RECEITAS.filter((r) => dono || liberada(r) || (presente && comFoto(r)))
            .map((r) => (liberada(r) || !dono ? r : { ...r, agendada: r.liberarEm }));
          const receitas = visiveis.map((r, i) => (i >= acesso.receitas
            ? { id: r.id, nome: r.nome, categoria: r.categoria, foto: r.foto, bloqueada: true }
            : { ...r, rendimentoObservado: stats(r) }));
          return json({ receitas, plano: acesso.plano, expiraEm: acesso.expiraEm || null, venceu: Boolean(acesso.venceu),
            bloqueado: Boolean(acesso.bloqueado || acesso.semConta || acesso.receitas === 0), semTeste: Boolean(acesso.semTeste), testeAte: acesso.testeAte || null, pacotes: acesso.pacotes || 0 });
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
