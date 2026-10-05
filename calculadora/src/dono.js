// Área do Dono: login próprio (e-mail do dono + senha só dela), separado das contas dos apps.
// No primeiro acesso o dono cria a senha; depois só troca sabendo a atual.
import { aleatorio, sha256, derivar, igual, senhaValida } from './contas.js';

const COOKIE = 'ln_dono';
const DIAS = 365;

function cookie(req, valor, maxAge) {
  const u = new URL(req.url);
  const dominio = u.hostname.endsWith('leunamesoftware.com.br') ? '; Domain=leunamesoftware.com.br' : '';
  const seguro = u.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${dominio}${seguro}`;
}
const token = (req) => (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})`))?.[1] || null;
const acesso = (env) => env.DB.prepare('SELECT email, senha_hash, senha_sal FROM dono_acesso WHERE id = 1').first();
const mesmoEmail = (env, email) => String(email || '').trim().toLowerCase() === String(env.DONO_EMAIL || '').toLowerCase();

async function abrir(env, req) {
  const t = aleatorio(32);
  const expira = new Date(Date.now() + DIAS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO dono_sessoes (token_hash, expira_em) VALUES (?, ?)').bind(await sha256(t), expira).run();
  return cookie(req, t, DIAS * 86400);
}

export async function donoLogado(env, req) {
  const t = token(req);
  if (!t) return false;
  const s = await env.DB.prepare('SELECT 1 FROM dono_sessoes WHERE token_hash = ? AND expira_em > ?').bind(await sha256(t), new Date().toISOString()).first();
  return Boolean(s);
}

export async function estadoDono(env, req) {
  return { temSenha: Boolean(await acesso(env)), logado: await donoLogado(env, req) };
}

/** Primeiro acesso: cria a senha (só se ainda não existe e só com o e-mail do dono). */
export async function criarSenhaDono(env, req, d) {
  if (await acesso(env)) return { erro: 'ja_existe', status: 409 };
  if (!mesmoEmail(env, d?.email)) return { erro: 'email', status: 403 };
  if (!senhaValida(d?.senha)) return { erro: 'senha_curta', status: 400 };
  const sal = aleatorio(16), agora = new Date().toISOString();
  const r = await env.DB.prepare('INSERT OR IGNORE INTO dono_acesso (id, email, senha_hash, senha_sal, criado_em, atualizado_em) VALUES (1, ?, ?, ?, ?, ?)')
    .bind(env.DONO_EMAIL.toLowerCase(), await derivar(d.senha, sal), sal, agora, agora).run();
  if (!r.meta?.changes) return { erro: 'ja_existe', status: 409 };
  return { cookie: await abrir(env, req) };
}

export async function entrarDono(env, req, d) {
  const a = await acesso(env);
  if (!a || !mesmoEmail(env, d?.email) || !senhaValida(d?.senha) || !igual(await derivar(d.senha, a.senha_sal), a.senha_hash)) return { erro: 'login_invalido', status: 401 };
  return { cookie: await abrir(env, req) };
}

/** Troca a senha (logado e sabendo a atual). As outras sessões do dono caem; esta continua. */
export async function trocarSenhaDono(env, req, d) {
  if (!(await donoLogado(env, req))) return { erro: 'sem_sessao', status: 401 };
  const a = await acesso(env);
  if (!a || !igual(await derivar(String(d?.atual || ''), a.senha_sal), a.senha_hash)) return { erro: 'senha_atual', status: 401 };
  if (!senhaValida(d?.nova)) return { erro: 'senha_curta', status: 400 };
  const sal = aleatorio(16);
  await env.DB.prepare('UPDATE dono_acesso SET senha_hash = ?, senha_sal = ?, atualizado_em = ? WHERE id = 1').bind(await derivar(d.nova, sal), sal, new Date().toISOString()).run();
  await env.DB.prepare('DELETE FROM dono_sessoes').run();
  return { cookie: await abrir(env, req) };
}

export async function sairDono(env, req) {
  const t = token(req);
  if (t) await env.DB.prepare('DELETE FROM dono_sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  return cookie(req, '', 0);
}
