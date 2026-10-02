import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { randomCode, verifySecret } from '../crypto';
import { currentMonth, fail, isPin, readJson } from '../http';
import { AttemptLimiter } from '../limits';
import type { AppEnv } from '../types';

export const redemptions = new Hono<AppEnv>();

const MAX_PIN_FAILURES = 5;
const PIN_LOCK_SECONDS = 15 * 60;
const MAX_AMOUNT_CENTS = 10_000_000; // 100 000 €

async function hasActiveSubscription(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status = 'active' AND current_period_end > ?")
    .bind(userId, new Date().toISOString())
    .first();
  return row !== null;
}

/** O funcionário digita o PIN no celular do cliente; validado só aqui. */
redemptions.post('/redemptions', requireAuth('member', 'merchant', 'admin'), async (c) => {
  const user = c.get('user');
  const body = await readJson<{ merchantId: string; pin: string }>(c);
  if (!body || typeof body.merchantId !== 'string' || !isPin(body.pin)) return fail(c, 400, 'invalid_input');

  if (c.env.REQUIRE_SUBSCRIPTION === 'true' && !(await hasActiveSubscription(c.env.DB, user.id))) {
    return fail(c, 402, 'subscription_required');
  }

  const merchant = await c.env.DB.prepare(
    "SELECT id, discount_percent, pin_hash FROM merchants WHERE id = ? AND status = 'approved' AND is_active = 1",
  )
    .bind(body.merchantId)
    .first<{ id: string; discount_percent: number; pin_hash: string }>();
  if (!merchant) return fail(c, 404, 'not_found');

  const limiter = new AttemptLimiter(c.env.DB, MAX_PIN_FAILURES, PIN_LOCK_SECONDS);
  const key = `pin:${user.id}:${merchant.id}`;
  const status = await limiter.check(key);
  if (status.locked) return fail(c, 429, 'pin_locked', { retryAfterSeconds: status.retryAfterSeconds });

  if (!(await verifySecret(body.pin, merchant.pin_hash))) {
    const remaining = await limiter.fail(key);
    return remaining === 0
      ? fail(c, 429, 'pin_locked', { retryAfterSeconds: PIN_LOCK_SECONDS })
      : fail(c, 403, 'wrong_pin', { remainingAttempts: remaining });
  }
  await limiter.reset(key);

  const redemption = {
    id: crypto.randomUUID(),
    code: randomCode(),
    createdAt: new Date().toISOString(),
  };
  await c.env.DB.prepare(
    `INSERT INTO redemptions (id, code, user_id, merchant_id, discount_percent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(redemption.id, redemption.code, user.id, merchant.id, merchant.discount_percent, redemption.createdAt)
    .run();

  return c.json(
    {
      code: redemption.code,
      merchantId: merchant.id,
      discountPercent: merchant.discount_percent,
      redeemedAt: redemption.createdAt,
    },
    201,
  );
});

/** Histórico do cliente num mês (padrão: o atual), para "Mi ahorro". */
redemptions.get('/me/redemptions', requireAuth(), async (c) => {
  const month = c.req.query('month') ?? currentMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) return fail(c, 400, 'invalid_input');

  const { results } = await c.env.DB.prepare(
    `SELECT r.code, r.merchant_id, r.discount_percent, r.amount_paid_cents, r.created_at
     FROM redemptions r
     WHERE r.user_id = ? AND substr(r.created_at, 1, 7) = ?
     ORDER BY r.created_at DESC`,
  )
    .bind(c.get('user').id, month)
    .all<{
      code: string;
      merchant_id: string;
      discount_percent: number;
      amount_paid_cents: number | null;
      created_at: string;
    }>();

  return c.json(
    results.map((r) => ({
      code: r.code,
      merchantId: r.merchant_id,
      discountPercent: r.discount_percent,
      amountPaid: r.amount_paid_cents === null ? null : r.amount_paid_cents / 100,
      redeemedAt: r.created_at,
    })),
  );
});

/** O cliente informa quanto pagou, para calcular a economia em euros. */
redemptions.patch('/me/redemptions/:code', requireAuth(), async (c) => {
  const body = await readJson<{ amountPaid: number }>(c);
  const cents = typeof body?.amountPaid === 'number' ? Math.round(body.amountPaid * 100) : NaN;
  if (!Number.isFinite(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return fail(c, 400, 'invalid_input');

  const result = await c.env.DB.prepare('UPDATE redemptions SET amount_paid_cents = ? WHERE code = ? AND user_id = ?')
    .bind(cents, c.req.param('code'), c.get('user').id)
    .run();
  return result.meta.changes === 0 ? fail(c, 404, 'not_found') : c.body(null, 204);
});
