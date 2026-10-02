import { createMiddleware } from 'hono/factory';
import { fail } from './http';
import { verifyJwt, type Role } from './jwt';
import type { AppEnv } from './types';

/** Exige `Authorization: Bearer <token>` válido; opcionalmente um papel. */
export const requireAuth = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token ? await verifyJwt(token, c.env.JWT_SECRET) : null;
    if (!payload) return fail(c, 401, 'unauthorized');

    // Confere no banco: o papel pode ter mudado e a conta pode ter sido apagada.
    const user = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<{ id: string; role: Role }>();
    if (!user) return fail(c, 401, 'unauthorized');
    if (roles.length > 0 && !roles.includes(user.role)) return fail(c, 403, 'forbidden');

    c.set('user', user);
    await next();
  });
