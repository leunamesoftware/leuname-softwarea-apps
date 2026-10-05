// Conta do cliente: e-mail + senha. A sessão vale para todos os apps em *.leunamesoftware.com.br.
const ITERACOES = 100000; // limite do PBKDF2 nos Workers
const DIAS_SESSAO = 180;
const COOKIE = 'ln_sessao';
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const aleatorio = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function sha256(t) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); }

export async function derivar(senha, sal) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sal), iterations: ITERACOES }, k, 256);
  return hex(bits);
}

export function igual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const senhaValida = (s) => typeof s === 'string' && s.length >= 6 && s.length <= 100;
export const normalizarEmail = (e) => String(e || '').trim().toLowerCase().slice(0, 120);

export async function buscarConta(env, email) {
  return env.DB.prepare('SELECT * FROM contas WHERE email = ?').bind(normalizarEmail(email)).first();
}

/** Cria a conta ou confere a senha da conta existente. Devolve { conta } ou { erro }. */
export async function contaParaCompra(env, email, nome, senha) {
  const existente = await buscarConta(env, email);
  if (existente) return (await senhaConfere(existente, senha)) ? { conta: existente } : { erro: 'senha_incorreta' };
  const sal = aleatorio(16);
  const conta = { id: crypto.randomUUID(), email: normalizarEmail(email), nome: String(nome || '').slice(0, 80), senha_hash: await derivar(senha, sal), senha_sal: sal };
  await env.DB.prepare('INSERT INTO contas (id, email, nome, senha_hash, senha_sal, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(conta.id, conta.email, conta.nome, conta.senha_hash, conta.senha_sal, new Date().toISOString()).run();
  // Compras antigas feitas com este e-mail (antes de existir a conta) passam a ser desta conta.
  await env.DB.prepare('UPDATE pedidos SET conta_id = ? WHERE email = ? AND conta_id IS NULL').bind(conta.id, conta.email).run();
  return { conta };
}

export async function senhaConfere(conta, senha) {
  return senhaValida(senha) && igual(await derivar(senha, conta.senha_sal), conta.senha_hash);
}

export async function trocarSenha(env, contaId, senha) {
  const sal = aleatorio(16);
  await env.DB.prepare('UPDATE contas SET senha_hash = ?, senha_sal = ? WHERE id = ?').bind(await derivar(senha, sal), sal, contaId).run();
  await env.DB.prepare('DELETE FROM sessoes WHERE conta_id = ?').bind(contaId).run();
}

/** Abre a sessão e devolve o cabeçalho Set-Cookie (vale para *.leunamesoftware.com.br). */
export async function abrirSessao(env, contaId, req) {
  const token = aleatorio(32);
  const agora = new Date();
  await env.DB.prepare('INSERT INTO sessoes (token_hash, conta_id, criado_em, expira_em) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), contaId, agora.toISOString(), new Date(agora.getTime() + DIAS_SESSAO * 864e5).toISOString()).run();
  return cookie(req, token, DIAS_SESSAO * 86400);
}

function cookie(req, valor, maxAge) {
  const host = new URL(req.url).hostname;
  const dominio = host.endsWith('leunamesoftware.com.br') ? '; Domain=leunamesoftware.com.br' : '';
  const seguro = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${dominio}${seguro}`;
}

function tokenDoPedido(req) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`));
  return m ? m[1] : null;
}

/** Conta da sessão atual (ou null). */
export async function contaDaSessao(env, req) {
  const t = tokenDoPedido(req);
  if (!t) return null;
  const s = await env.DB.prepare('SELECT c.id, c.email, c.nome FROM sessoes s JOIN contas c ON c.id = s.conta_id WHERE s.token_hash = ? AND s.expira_em > ?')
    .bind(await sha256(t), new Date().toISOString()).first();
  return s || null;
}

export async function fecharSessao(env, req) {
  const t = tokenDoPedido(req);
  if (t) await env.DB.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  return cookie(req, '', 0);
}

// ---- teste grátis único (por aparelho e por rede) ----
const APARELHO = 'ln_aparelho';
const MAX_TESTES_POR_REDE = 3; // folgado: no 4G muitas pessoas saem pelo mesmo IP da operadora
const DIAS_REDE = 30;

/** Identificador do aparelho: cookie próprio ou o que o app guardou (se o cookie foi apagado). */
export function aparelhoDoPedido(req, doApp) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${APARELHO}=([0-9a-f]{32})`));
  const app = /^[0-9a-f]{32}$/.test(String(doApp || '')) ? String(doApp) : null;
  return { cookie: m ? m[1] : null, app, valor: (m && m[1]) || app || aleatorio(16) };
}

export function cookieAparelho(req, valor) {
  const host = new URL(req.url).hostname;
  const dominio = host.endsWith('leunamesoftware.com.br') ? '; Domain=leunamesoftware.com.br' : '';
  const seguro = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${APARELHO}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${2 * 365 * 86400}${dominio}${seguro}`;
}

/**
 * Conta nova: anota aparelho e rede (em hash). Se o aparelho já fez teste, ou a rede já teve
 * muitos testes no último mês, a conta nasce sem teste grátis (só abre comprando).
 */
export async function marcarTeste(env, contaId, req, ap) {
  const rede = await sha256('rede:' + (req.headers.get('CF-Connecting-IP') || 'local'));
  const ids = [ap.cookie, ap.app, ap.valor].filter(Boolean);
  const desde = new Date(Date.now() - DIAS_REDE * 864e5).toISOString();
  const marcas = ids.map(() => '?').join(',');
  const r = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM contas WHERE id != ? AND teste_aparelho IN (${marcas})) AS mesmo_aparelho,
      (SELECT COUNT(*) FROM contas WHERE id != ? AND teste_rede = ? AND criado_em > ?) AS mesma_rede`)
    .bind(contaId, ...ids, contaId, rede, desde).first();
  const semTeste = r.mesmo_aparelho > 0 || r.mesma_rede >= MAX_TESTES_POR_REDE ? 1 : 0;
  await env.DB.prepare('UPDATE contas SET teste_aparelho = ?, teste_rede = ?, sem_teste = ? WHERE id = ?').bind(ap.valor, rede, semTeste, contaId).run();
  return semTeste;
}
