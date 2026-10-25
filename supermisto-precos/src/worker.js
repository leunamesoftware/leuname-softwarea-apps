// Precificador Supermisto: o dono joga prints da Shopee, a IA lê os preços e a página monta a tabela de preços.
// Login: e-mail do dono (DONO_EMAIL) + senha da Área do Dono (conferida no servidor de contas, como no painel do Pedêê).
import { lerPrint } from './leitura.js';
import { precoKgReal } from '../public/precos.js';
import * as ERP from './erp.js';
import * as PUSH from './push.js';

const COOKIE = 'sp_sessao', LOJA = 'https://www.leunamesoftware.com.br', DIAS = 30;

const json = (d, status = 200, cab = {}) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cab } });
const agora = () => new Date().toISOString();

async function sha256(t) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function aleatorio() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, '');
}
const cookie = (req) => (req.headers.get('Cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === COOKIE)?.[1];

async function logado(env, req) {
  const t = cookie(req);
  if (!t) return false;
  return !!(await env.BANCO.prepare('SELECT 1 FROM sessoes WHERE token_hash = ? AND expira_em > ?').bind(await sha256(t), agora()).first());
}

async function entrar(env, req) {
  const d = await req.json().catch(() => ({}));
  const email = String(d.email || env.DONO_EMAIL).trim().toLowerCase();
  if (email !== env.DONO_EMAIL.toLowerCase()) return json({ erro: 'Este e-mail não é o do dono.' }, 401);
  if (!d.senha) return json({ erro: 'Digite a senha.' }, 400);
  const cab = { 'Content-Type': 'application/json', 'User-Agent': req.headers.get('User-Agent') || '', 'CF-Connecting-IP': req.headers.get('CF-Connecting-IP') || '' };
  const tentar = (rota) => env.CONTAS.fetch(new Request(`${LOJA}${rota}`, { method: 'POST', headers: cab, body: JSON.stringify({ email, senha: d.senha }) }));
  let r = await tentar('/api/dono/entrar');
  if (!r.ok && r.status !== 429) r = await tentar('/api/conta/entrar');
  if (r.status === 429) return json({ erro: 'Muitas tentativas. Espere um minuto.' }, 429);
  if (!r.ok) return json({ erro: 'Senha não confere. Use a senha da Área do Dono.' }, 401);
  const token = aleatorio();
  await env.BANCO.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(agora()).run();
  await env.BANCO.prepare('INSERT INTO sessoes (token_hash, expira_em) VALUES (?, ?)').bind(await sha256(token), new Date(Date.now() + DIAS * 864e5).toISOString()).run();
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS * 86400}` });
}

async function produtos(env) {
  const { results } = await env.BANCO.prepare('SELECT id, nome, receita FROM produtos ORDER BY ordem').all();
  return results.map((p) => ({ ...p, receita: JSON.parse(p.receita) }));
}

async function dados(env) {
  const [cfg, ins, prods, conc] = await Promise.all([
    env.BANCO.prepare('SELECT chave, valor FROM config').all(),
    env.BANCO.prepare('SELECT nome, preco_kg, pago, comprado_kg, rendeu_kg, atualizado_em FROM insumos ORDER BY nome').all(),
    produtos(env),
    env.BANCO.prepare('SELECT * FROM concorrentes ORDER BY id DESC LIMIT 2000').all(),
  ]);
  return { config: Object.fromEntries(cfg.results.map((c) => [c.chave, c.valor])), insumos: ins.results, produtos: prods, concorrentes: conc.results };
}

async function api(env, req, path, ctx) {
  const m = req.method;
  if (path === '/api/saude') return json({ ok: true });
  if (path === '/api/entrar' && m === 'POST') return entrar(env, req);
  // Teste da leitura pelo workflow de publicação (segredo TESTE_IA criado e apagado no próprio workflow).
  if (path === '/api/teste-ia' && m === 'POST' && env.TESTE_IA && req.headers.get('X-Teste') === env.TESTE_IA) {
    const d = await req.json().catch(() => ({}));
    try { return json(await lerPrint(env, d.imagem, await produtos(env))); } catch (e) { return json({ erro: String(e) }, 502); }
  }
  if (path === '/api/shopee/retorno' && m === 'GET') return ERP.retornoShopee(env, req);
  if (path === '/api/shopee/webhook' && m === 'POST') return ERP.webhookShopee(env, req, ctx);
  { const r = await PUSH.publico(env, req, path); if (r) return r; }
  // Pedido de teste (só pelo workflow, com segredo temporário): toca o aviso no celular e depois é apagado.
  if (path === '/api/erp/teste-pedido' && env.TESTE_PEDIDO && req.headers.get('X-Teste') === env.TESTE_PEDIDO) return ERP.pedidoTeste(env, req);
  if (!(await logado(env, req))) {
    if (path === '/api/shopee/conectar') return Response.redirect(new URL('/', req.url).toString(), 302);
    return json({ erro: 'Entre de novo.' }, 401);
  }
  if (m !== 'GET' && req.headers.get('Origin') && req.headers.get('Origin') !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);

  if (path === '/api/sair' && m === 'POST') {
    await env.BANCO.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(cookie(req))).run();
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0` });
  }
  if (path === '/api/dados' && m === 'GET') return json(await dados(env));
  if (path.startsWith('/api/push/')) { const r = await PUSH.logado(env, req, path, ctx); if (r) return r; }
  if (path.startsWith('/api/erp/') || path.startsWith('/api/shopee/')) {
    const r = await ERP.api(env, req, path, ctx);
    if (r) return r;
  }

  if (path === '/api/ler-print' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(d.imagem || '') || d.imagem.length > 4_000_000) return json({ erro: 'Imagem inválida ou grande demais.' }, 400);
    let lido;
    try { lido = await lerPrint(env, d.imagem, await produtos(env)); }
    catch (e) { console.error('ia', e); return json({ erro: 'A leitura falhou agora. Tente esse print de novo.' }, 502); }
    const loja = String(d.loja || '').trim().slice(0, 80) || lido.loja || null;
    const quando = agora();
    const ins = env.BANCO.prepare('INSERT INTO concorrentes (produto_id, anuncio, loja, gramas, unidades, gramas_unidade, preco, vendidos, criado_em) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id');
    const salvos = lido.itens.length ? (await env.BANCO.batch(lido.itens.map((i) => ins.bind(i.produto_id, i.anuncio, String(d.loja || '').trim().slice(0, 80) || i.loja || loja, i.gramas, i.unidades, i.gramas_unidade, i.preco, i.vendidos, quando)))).map((r) => r.results[0].id) : [];
    return json({ loja, itens: lido.itens.map((i, k) => ({ ...i, id: salvos[k], loja: String(d.loja || '').trim() || i.loja || loja, criado_em: quando })) });
  }

  if (path === '/api/concorrentes' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ids = (await produtos(env)).map((p) => p.id);
    const num = (v) => (v === '' || v == null || !(Number(v) >= 0) ? null : Number(v));
    const un = num(d.unidades) || 1, gu = num(d.gramas_unidade), preco = num(d.preco);
    if (!(preco > 0) || !(gu > 0)) return json({ erro: 'Preencha os gramas de cada pacotinho e o preço.' }, 400);
    const r = await env.BANCO.prepare('INSERT INTO concorrentes (produto_id, anuncio, loja, gramas, unidades, gramas_unidade, preco, vendidos, criado_em) VALUES (?,?,?,?,?,?,?,?,?) RETURNING *')
      .bind(ids.includes(d.produto_id) ? d.produto_id : null, String(d.anuncio || 'Anúncio digitado').slice(0, 200), String(d.loja || '').slice(0, 80) || null, un * gu, un, gu, preco, num(d.vendidos), agora()).first();
    return json(r);
  }
  const mc = path.match(/^\/api\/concorrentes\/(\d+)$/);
  if (mc && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ids = (await produtos(env)).map((p) => p.id);
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const un = num(d.unidades), gu = num(d.gramas_unidade);
    const total = un > 0 && gu > 0 ? un * gu : num(d.gramas);
    await env.BANCO.prepare('UPDATE concorrentes SET produto_id = ?, gramas = ?, unidades = ?, gramas_unidade = ?, preco = ?, loja = ? WHERE id = ?')
      .bind(ids.includes(d.produto_id) ? d.produto_id : null, total, un, gu, num(d.preco) || 0, String(d.loja || '').slice(0, 80) || null, Number(mc[1])).run();
    return json({ ok: true });
  }
  if (mc && m === 'DELETE') {
    await env.BANCO.prepare('DELETE FROM concorrentes WHERE id = ?').bind(Number(mc[1])).run();
    return json({ ok: true });
  }
  if (path === '/api/concorrentes/limpar' && m === 'POST') {
    await env.BANCO.prepare('DELETE FROM concorrentes').run();
    return json({ ok: true });
  }
  if (path === '/api/insumo' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const n = (v) => (v === '' || v == null || !(Number(v) >= 0) ? null : Number(v));
    const pago = n(d.pago), comprado = n(d.comprado_kg), rendeu = n(d.rendeu_kg);
    const preco = precoKgReal(pago, comprado, rendeu) ?? n(d.preco_kg);
    if (!d.nome || preco == null) return json({ erro: 'Preencha quanto pagou e quantos kg.' }, 400);
    await env.BANCO.prepare('UPDATE insumos SET preco_kg = ?, pago = ?, comprado_kg = ?, rendeu_kg = ?, atualizado_em = ? WHERE nome = ?')
      .bind(preco, pago, comprado, rendeu, agora(), String(d.nome)).run();
    return json({ ok: true, preco_kg: preco });
  }
  if (path === '/api/config' && m === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ok = ['taxa_pct', 'imposto_pct', 'taxa_fixa', 'lucro_min', 'emb_sache', 'emb_kit', 'emb_50', 'emb_100', 'etiqueta'];
    const st = env.BANCO.prepare('UPDATE config SET valor = ? WHERE chave = ?');
    const lista = Object.entries(d).filter(([k, v]) => ok.includes(k) && Number(v) >= 0).map(([k, v]) => st.bind(Number(v), k));
    if (lista.length) await env.BANCO.batch(lista);
    return json({ ok: true });
  }
  return json({ erro: 'nao_encontrado' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/fotos/')) return ERP.foto(env, decodeURIComponent(path.slice(7)));
    if (path.startsWith('/api/')) {
      try { return await api(env, req, path, ctx); }
      catch (e) { console.error(e); return json({ erro: 'Erro no servidor. Tente de novo.' }, 500); }
    }
    return env.ASSETS.fetch(req);
  },
  // A cada minuto (reserva: o normal é o aviso instantâneo da Shopee em /api/shopee/webhook): pedidos novos da Shopee e o que ficou para mandar.
  async scheduled(_ev, env, ctx) { ctx.waitUntil(ERP.rotina(env)); },
};
