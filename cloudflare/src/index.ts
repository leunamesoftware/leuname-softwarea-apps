import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { hashPassword, verifyPassword } from './password';
import { signJwt, verifyJwt } from './jwt';

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }));

// ---- Categorias (público) ----
app.get('/categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, icon, order_index, active FROM categories WHERE active = 1 ORDER BY order_index',
  ).all();
  return c.json(results);
});

// ---- Autenticação ----
app.post('/auth/register', async (c) => {
  const body = await c.req.json<{ name: string; email: string; password: string; phone?: string }>();

  if (!body.name || !body.email || !body.password || body.password.length < 6) {
    return c.json({ error: 'Dados inválidos.' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) return c.json({ error: 'Este e-mail já está cadastrado.' }, 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, password_hash, phone, role, ad_credits) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, body.name, body.email, passwordHash, body.phone ?? null, 'user', 1)
    .run();

  const token = await signJwt(
    { sub: id, email: body.email, role: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    c.env.JWT_SECRET,
  );
  return c.json({ token, user: { id, name: body.name, email: body.email, role: 'user', adCredits: 1 } });
});

app.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, password_hash, role, ad_credits FROM users WHERE email = ?',
  )
    .bind(body.email)
    .first<{ id: string; name: string; email: string; password_hash: string; role: string; ad_credits: number }>();

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: 'E-mail ou senha incorretos.' }, 401);
  }

  const token = await signJwt(
    { sub: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    c.env.JWT_SECRET,
  );
  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, adCredits: user.ad_credits },
  });
});

app.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return c.json({ error: 'Não autenticado.' }, 401);

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Sessão expirada ou inválida.' }, 401);

  const user = await c.env.DB.prepare('SELECT id, name, email, role, ad_credits FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();
  if (!user) return c.json({ error: 'Usuário não encontrado.' }, 404);

  return c.json(user);
});

// TODO (próxima leva): /products, /chats, /messages, /favorites, /reports —
// mesmo padrão de autenticação por Bearer token já estabelecido acima.

export default app;
