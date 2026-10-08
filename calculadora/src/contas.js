// Conta do cliente: e-mail + senha. A sessão vale para todos os apps em *.leunamesoftware.com.br.
// Trava de aparelhos: 1 celular + 1 computador por conta. Entrar num aparelho novo do mesmo tipo
// desconecta o anterior e avisa o cliente por e-mail (a conta do dono não tem limite).
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

export const tipoDeAparelho = (req) => (/Android|iPhone|iPad|iPod|Mobile/i.test(req.headers.get('User-Agent') || '') ? 'celular' : 'computador');

/**
 * Abre a sessão e devolve os cabeçalhos Set-Cookie (valem para *.leunamesoftware.com.br).
 * Desconecta a sessão anterior da conta no mesmo tipo de aparelho e, se era outro aparelho, avisa por e-mail.
 */
export async function abrirSessao(env, contaId, req, { avisar, aparelho } = {}) {
  const token = aleatorio(32), tokenHash = await sha256(token);
  const agora = new Date();
  const tipo = tipoDeAparelho(req);
  const ap = aparelho || aparelhoDoPedido(req);
  await env.DB.prepare('INSERT INTO sessoes (token_hash, conta_id, criado_em, expira_em, tipo, aparelho) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(tokenHash, contaId, agora.toISOString(), new Date(agora.getTime() + DIAS_SESSAO * 864e5).toISOString(), tipo, ap.valor).run();
  const conta = await env.DB.prepare('SELECT email, nome FROM contas WHERE id = ?').bind(contaId).first();
  const dono = conta && env.DONO_EMAIL && conta.email.toLowerCase() === String(env.DONO_EMAIL).toLowerCase();
  if (!dono) {
    // Sessões antigas sem tipo (de antes da trava) contam como do mesmo tipo só se o navegador for igual: ficam em paz.
    const { results: antigas = [] } = await env.DB.prepare('SELECT token_hash, aparelho FROM sessoes WHERE conta_id = ? AND tipo = ? AND substituida_em IS NULL AND token_hash != ? AND expira_em > ?')
      .bind(contaId, tipo, tokenHash, agora.toISOString()).all();
    if (antigas.length) {
      await env.DB.prepare('UPDATE sessoes SET substituida_em = ? WHERE conta_id = ? AND tipo = ? AND substituida_em IS NULL AND token_hash != ?')
        .bind(agora.toISOString(), contaId, tipo, tokenHash).run();
      // Mesmo aparelho entrando de novo: não precisa avisar.
      if (antigas.some((a) => a.aparelho !== ap.valor) && avisar) await avisar(conta, tipo).catch(() => {});
    }
  }
  return [cookie(req, token, DIAS_SESSAO * 86400), ...(ap.cookie ? [] : [cookieAparelho(req, ap.valor)])];
}

/** O cookie desta sessão era de um aparelho que foi desconectado porque a conta entrou em outro do mesmo tipo? */
export async function sessaoSubstituida(env, req) {
  const t = tokenDoPedido(req);
  if (!t) return false;
  const s = await env.DB.prepare('SELECT substituida_em FROM sessoes WHERE token_hash = ?').bind(await sha256(t)).first();
  return Boolean(s?.substituida_em);
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
  const s = await env.DB.prepare('SELECT c.id, c.email, c.nome FROM sessoes s JOIN contas c ON c.id = s.conta_id WHERE s.token_hash = ? AND s.expira_em > ? AND s.substituida_em IS NULL')
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

// ---- esqueci a senha: link por e-mail ----
const MINUTOS_NOVA_SENHA = 60;

/** Cria o código do link "criar senha nova" (só se a conta existe). Devolve { conta, token } ou null. */
export async function pedirNovaSenha(env, email) {
  const conta = await buscarConta(env, email);
  if (!conta) return null;
  const token = aleatorio(32);
  await env.DB.prepare('INSERT INTO novas_senhas (token_hash, conta_id, expira_em) VALUES (?, ?, ?)')
    .bind(await sha256(token), conta.id, new Date(Date.now() + MINUTOS_NOVA_SENHA * 6e4).toISOString()).run();
  return { conta, token };
}

/** Usa o código do link: troca a senha (as outras sessões caem). Devolve o id da conta ou null. */
export async function usarNovaSenha(env, token, senha) {
  if (!/^[0-9a-f]{64}$/.test(String(token || '')) || !senhaValida(senha)) return null;
  const agora = new Date().toISOString();
  const r = await env.DB.prepare('UPDATE novas_senhas SET usado_em = ? WHERE token_hash = ? AND usado_em IS NULL AND expira_em > ?')
    .bind(agora, await sha256(token), agora).run();
  if (!r.meta.changes) return null;
  const n = await env.DB.prepare('SELECT conta_id FROM novas_senhas WHERE token_hash = ?').bind(await sha256(token)).first();
  await trocarSenha(env, n.conta_id, senha);
  return n.conta_id;
}

/** Dono: troca o e-mail da conta de um cliente que perdeu o e-mail antigo (as sessões caem). */
export async function trocarEmailDaConta(env, de, para) {
  const conta = await buscarConta(env, de), novo = normalizarEmail(para);
  if (!conta) return { erro: 'conta_nao_encontrada', status: 404 };
  if (!EMAIL.test(novo)) return { erro: 'email', status: 400 };
  if (await buscarConta(env, novo)) return { erro: 'email_em_uso', status: 409 };
  await env.DB.prepare('UPDATE contas SET email = ? WHERE id = ?').bind(novo, conta.id).run();
  await env.DB.prepare('UPDATE pedidos SET email = ? WHERE conta_id = ?').bind(novo, conta.id).run();
  await env.DB.prepare('DELETE FROM sessoes WHERE conta_id = ?').bind(conta.id).run();
  return { ok: true, nome: conta.nome };
}
