import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { fail } from './http';
import { account } from './routes/account';
import { admin } from './routes/admin';
import { merchant } from './routes/merchant';
import { partners } from './routes/partners';
import { redemptions } from './routes/redemptions';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('*', secureHeaders());

// O app de celular não precisa de CORS; a versão de PC (navegador) só é
// aceita nas origens configuradas. Em desenvolvimento, libera localhost.
app.use('*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return cors({
    origin: (origin) => {
      if (allowed.includes(origin)) return origin;
      const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      return c.env.ENVIRONMENT !== 'production' && isLocal ? origin : null;
    },
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    maxAge: 86_400,
  })(c, next);
});

app.get('/health', (c) => c.json({ ok: true }));
app.route('/', account);
app.route('/', partners);
app.route('/', redemptions);
app.route('/', merchant);
app.route('/', admin);

app.notFound((c) => fail(c, 404, 'not_found'));
app.onError((err, c) => {
  console.error(err);
  return fail(c, 500, 'server_error');
});

export default app;
