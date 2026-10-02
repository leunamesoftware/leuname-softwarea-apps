import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { hashSecret, verifySecret } from '../crypto';
import { sendEmail } from '../email';
import { fail, isEmail, isString, readJson } from '../http';
import { signJwt, type Role } from '../jwt';
import { AttemptLimiter } from '../limits';
import type { AppEnv, Env } from '../types';
import { refreshExpiredSubscription } from './billing';

export const account = new Hono<AppEnv>();

const loginLimiter = (env: Env) => new AttemptLimiter(env.DB, 5, 15 * 60);

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
}

async function profile(db: D1Database, userId: string, env?: Env) {
  if (env) await refreshExpiredSubscription(env, userId);
  const user = await db
    .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; name: string; email: string; role: Role }>();
  if (!user) return null;
  const sub = await db
    .prepare('SELECT status, current_period_end FROM subscriptions WHERE user_id = ?')
    .bind(userId)
    .first<{ status: string; current_period_end: string }>();
  const merchant = await db
    .prepare('SELECT id FROM merchants WHERE owner_user_id = ? LIMIT 1')
    .bind(userId)
    .first<{ id: string }>();
  return {
    ...user,
    subscription: sub ? { status: sub.status, currentPeriodEnd: sub.current_period_end } : null,
    merchantId: merchant?.id ?? null,
  };
}

account.post('/auth/register', async (c) => {
  const body = await readJson<{ name: string; email: string; password: string; acceptTerms: boolean }>(c);
  if (
    !body ||
    !isString(body.name, 2, 80) ||
    !isEmail(body.email) ||
    !isString(body.password, 8, 128) ||
    body.acceptTerms !== true
  ) {
    return fail(c, 400, 'invalid_input');
  }

  const email = body.email.trim().toLowerCase();
  const exists = await c.env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first();
  if (exists) return fail(c, 409, 'email_taken');

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, terms_accepted_at)
     VALUES (?, ?, ?, ?, 'member', ?)`,
  )
    .bind(id, body.name.trim(), email, await hashSecret(body.password), new Date().toISOString())
    .run();

  return c.json({ token: await signJwt(id, 'member', c.env.JWT_SECRET), user: await profile(c.env.DB, id) }, 201);
});

account.post('/auth/login', async (c) => {
  const body = await readJson<{ email: string; password: string }>(c);
  if (!body || !isEmail(body.email) || typeof body.password !== 'string') return fail(c, 400, 'invalid_input');

  const email = body.email.trim().toLowerCase();
  const limiter = loginLimiter(c.env);
  const key = `login:${email}`;
  const status = await limiter.check(key);
  if (status.locked) return fail(c, 429, 'too_many_attempts', { retryAfterSeconds: status.retryAfterSeconds });

  const user = await c.env.DB.prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>();
  // Mesma resposta para e-mail inexistente e senha errada: não revela quem tem conta.
  if (!user || !(await verifySecret(body.password, user.password_hash))) {
    await limiter.fail(key);
    return fail(c, 401, 'invalid_credentials');
  }

  await limiter.reset(key);
  return c.json({ token: await signJwt(user.id, user.role, c.env.JWT_SECRET), user: await profile(c.env.DB, user.id) });
});

account.get('/me', requireAuth(), async (c) => {
  return c.json(await profile(c.env.DB, c.get('user').id, c.env));
});

// ---- Recuperação de senha: código de 6 dígitos por e-mail, válido 30 min ----

const RESET_MINUTES = 30;
const MAX_RESET_ATTEMPTS = 5;
const resetRequestLimiter = (env: Env) => new AttemptLimiter(env.DB, 3, 15 * 60);

account.post('/auth/forgot', async (c) => {
  const body = await readJson<{ email: string }>(c);
  if (!body || !isEmail(body.email)) return fail(c, 400, 'invalid_input');
  const email = body.email.trim().toLowerCase();

  // No máximo 3 pedidos a cada 15 min por e-mail (evita spam).
  const limiter = resetRequestLimiter(c.env);
  const key = `forgot:${email}`;
  if ((await limiter.check(key)).locked) return c.body(null, 204);
  await limiter.fail(key);

  const user = await c.env.DB.prepare('SELECT name FROM users WHERE email = ?').bind(email).first<{ name: string }>();
  // Mesma resposta exista ou não a conta: não revela quem é cliente.
  if (user) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const expires = new Date(Date.now() + RESET_MINUTES * 60_000).toISOString();
    await c.env.DB.prepare(
      `INSERT INTO password_resets (email, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
    )
      .bind(email, await hashSecret(code), expires)
      .run();
    await sendEmail(
      c.env,
      email,
      'Tu código de Eclud',
      `Hola, ${user.name}:\n\nTu código para crear una nueva contraseña es: ${code}\n\n` +
        `Caduca en ${RESET_MINUTES} minutos. Si no lo has pedido tú, ignora este correo.\n\nEquipo Eclud`,
    );
  }
  return c.body(null, 204);
});

account.post('/auth/reset', async (c) => {
  const body = await readJson<{ email: string; code: string; password: string }>(c);
  if (
    !body ||
    !isEmail(body.email) ||
    typeof body.code !== 'string' ||
    !/^\d{6}$/.test(body.code) ||
    !isString(body.password, 8, 128)
  ) {
    return fail(c, 400, 'invalid_input');
  }
  const email = body.email.trim().toLowerCase();
  const row = await c.env.DB.prepare('SELECT code_hash, expires_at, attempts FROM password_resets WHERE email = ?')
    .bind(email)
    .first<{ code_hash: string; expires_at: string; attempts: number }>();
  if (!row || Date.parse(row.expires_at) < Date.now() || row.attempts >= MAX_RESET_ATTEMPTS) {
    return fail(c, 400, 'invalid_code');
  }
  if (!(await verifySecret(body.code, row.code_hash))) {
    await c.env.DB.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
    return fail(c, 400, 'invalid_code');
  }

  const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; role: Role }>();
  if (!user) return fail(c, 400, 'invalid_code');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashSecret(body.password), user.id),
    c.env.DB.prepare('DELETE FROM password_resets WHERE email = ?').bind(email),
    c.env.DB.prepare('DELETE FROM attempt_limits WHERE key = ?').bind(`login:${email}`),
  ]);
  return c.json({ token: await signJwt(user.id, user.role, c.env.JWT_SECRET), user: await profile(c.env.DB, user.id) });
});

/** Direito ao apagamento (RGPD): remove a conta e os dados pessoais. */
account.delete('/me', requireAuth(), async (c) => {
  const { id } = c.get('user');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE redemptions SET user_id = NULL WHERE user_id = ?').bind(id),
    c.env.DB.prepare('UPDATE merchants SET owner_user_id = NULL, is_active = 0 WHERE owner_user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  return c.body(null, 204);
});
