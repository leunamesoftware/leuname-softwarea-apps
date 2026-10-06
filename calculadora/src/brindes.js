// Brindes: o dono libera o Quanto Cobrar Pro de graça para um e-mail (presente, sem compra).
import { EMAIL, normalizarEmail } from './contas.js';

/** Brinde em vigor para o e-mail, ou null. */
export async function brindeDoEmail(env, email) {
  const b = await env.DB.prepare('SELECT expira_em FROM brindes WHERE email = ?').bind(normalizarEmail(email)).first();
  if (!b || (b.expira_em && new Date(b.expira_em) < new Date())) return null;
  return { plano: 'brinde', receitas: Infinity, expiraEm: b.expira_em || null };
}

export async function listarBrindes(env) {
  const { results } = await env.DB.prepare('SELECT email, expira_em, obs, criado_em FROM brindes ORDER BY criado_em DESC').all();
  return results;
}

/** dias: número de dias de presente, ou vazio para sem prazo. */
export async function darBrinde(env, d) {
  const email = normalizarEmail(d?.email);
  if (!EMAIL.test(email)) return { erro: 'email', status: 400 };
  const dias = Number(d?.dias) || 0;
  if (dias < 0 || dias > 3660) return { erro: 'dias', status: 400 };
  const agora = new Date();
  const expira = dias ? new Date(agora.getTime() + dias * 864e5).toISOString() : null;
  await env.DB.prepare(`INSERT INTO brindes (email, expira_em, obs, criado_em) VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET expira_em = excluded.expira_em, obs = excluded.obs`)
    .bind(email, expira, String(d?.obs || '').slice(0, 120), agora.toISOString()).run();
  return { ok: true };
}

export async function tirarBrinde(env, d) {
  await env.DB.prepare('DELETE FROM brindes WHERE email = ?').bind(normalizarEmail(d?.email)).run();
  return { ok: true };
}
