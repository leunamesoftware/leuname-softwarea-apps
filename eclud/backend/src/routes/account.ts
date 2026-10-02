import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { hashSecret, verifySecret } from '../crypto';
import { fail, isEmail, isString, readJson } from '../http';
import { signJwt, type Role } from '../jwt';
import { AttemptLimiter } from '../limits';
import type { AppEnv, Env } from '../types';

export const account = new Hono<AppEnv>();

const loginLimiter = (env: Env) => new AttemptLimiter(env.DB, 5, 15 * 60);

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
}

async function profile(db: D1Database, userId: string) {
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
  return c.json(await profile(c.env.DB, c.get('user').id));
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
