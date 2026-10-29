// Brindes: o dono libera o Quanto Cobrar Pro de graça para um e-mail (presente, sem compra).
import { EMAIL, normalizarEmail } from './contas.js';
import { emitirLicenca, revogarLicenca } from './licencas.js';

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

// ---- Presente vitalício dos outros apps (Gestacell, Radar...): licença própria, presa ao e-mail da pessoa ----
// app = id do app na loja (ex.: 'gestacell'); appId = id da licença no servidor de licenças (ex.: 'leuname-gestao').
export async function brindesAppsDoEmail(env, email) {
  const { results } = await env.DB.prepare('SELECT app, chave FROM brindes_apps WHERE email = ?').bind(normalizarEmail(email)).all();
  const apps = {};
  for (const r of results || []) apps[r.app] = { chave: r.chave, plano: 'brinde', expiraEm: null };
  return apps;
}

export async function listarBrindesApps(env) {
  const { results } = await env.DB.prepare('SELECT email, app, obs, criado_em FROM brindes_apps ORDER BY criado_em DESC').all();
  return results;
}

/** appIds: { gestacell: 'leuname-gestao', ... } vem dos PLANOS (só apps com licença). */
export async function darBrindeApp(env, d, appIds) {
  const email = normalizarEmail(d?.email);
  if (!EMAIL.test(email)) return { erro: 'email', status: 400 };
  const app = String(d?.app || '');
  if (!appIds[app]) return { erro: 'app', status: 400 };
  const ja = await env.DB.prepare('SELECT chave FROM brindes_apps WHERE email = ? AND app = ?').bind(email, app).first();
  if (ja) return { ok: true, ja: true };
  const chave = await emitirLicenca(env, 'Presente (dono)', email, appIds[app], 'brinde');
  await env.DB.prepare('INSERT INTO brindes_apps (email, app, chave, obs, criado_em) VALUES (?, ?, ?, ?, ?)')
    .bind(email, app, chave, String(d?.obs || '').slice(0, 120), new Date().toISOString()).run();
  return { ok: true };
}

export async function tirarBrindeApp(env, d) {
  const email = normalizarEmail(d?.email), app = String(d?.app || '');
  const r = await env.DB.prepare('SELECT chave FROM brindes_apps WHERE email = ? AND app = ?').bind(email, app).first();
  if (r) await revogarLicenca(env, r.chave, 'presente retirado pelo dono');
  await env.DB.prepare('DELETE FROM brindes_apps WHERE email = ? AND app = ?').bind(email, app).run();
  return { ok: true };
}
