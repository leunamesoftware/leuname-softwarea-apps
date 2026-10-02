import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { hashSecret } from '../crypto';
import { currentMonth, fail, isHttpsUrl, isPin, isString, readJson } from '../http';
import type { AppEnv } from '../types';
import { MERCHANT_COLUMNS, toPartner, type MerchantRow } from './partners';

export const merchant = new Hono<AppEnv>();

merchant.use('/merchant/*', requireAuth('merchant', 'admin'));

async function ownMerchant(db: D1Database, userId: string) {
  return db
    .prepare(`SELECT ${MERCHANT_COLUMNS}, status FROM merchants WHERE owner_user_id = ? LIMIT 1`)
    .bind(userId)
    .first<MerchantRow & { status: string }>();
}

// Economia do cliente em centavos: pagou P com d% → P·d/(100−d).
const SAVED_CENTS = 'ROUND(amount_paid_cents * discount_percent * 1.0 / (100 - discount_percent))';

merchant.get('/merchant/dashboard', async (c) => {
  const row = await ownMerchant(c.env.DB, c.get('user').id);
  if (!row) return fail(c, 404, 'not_found');
  const db = c.env.DB;
  const month = currentMonth();

  const totals = await db
    .prepare(
      `SELECT COUNT(*) AS coupons, COALESCE(SUM(${SAVED_CENTS}), 0) AS discount_cents
       FROM redemptions WHERE merchant_id = ? AND substr(created_at, 1, 7) = ?`,
    )
    .bind(row.id, month)
    .first<{ coupons: number; discount_cents: number }>();

  // Cliente novo = primeira visita a esta loja aconteceu neste mês.
  const newCustomers = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT user_id, MIN(created_at) AS first_visit FROM redemptions
         WHERE merchant_id = ? AND user_id IS NOT NULL GROUP BY user_id
       ) WHERE substr(first_visit, 1, 7) = ?`,
    )
    .bind(row.id, month)
    .first<{ n: number }>();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const { results: daily } = await db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM redemptions
       WHERE merchant_id = ? AND created_at >= ? GROUP BY day`,
    )
    .bind(row.id, start.toISOString())
    .all<{ day: string; n: number }>();
  const byDay = new Map(daily.map((d) => [d.day, d.n]));
  const dailyValidations = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return byDay.get(day) ?? 0;
  });

  const { results: recent } = await db
    .prepare(
      `SELECT code, created_at, discount_percent, amount_paid_cents, ${SAVED_CENTS} AS saved_cents
       FROM redemptions WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
    .bind(row.id)
    .all<{
      code: string;
      created_at: string;
      discount_percent: number;
      amount_paid_cents: number | null;
      saved_cents: number | null;
    }>();

  return c.json({
    partner: toPartner(row),
    status: row.status,
    isActive: row.is_active === 1,
    validatedCoupons: totals?.coupons ?? 0,
    discountGranted: (totals?.discount_cents ?? 0) / 100,
    newCustomers: newCustomers?.n ?? 0,
    chartStart: start.toISOString().slice(0, 10),
    dailyValidations,
    recentCoupons: recent.map((r) => ({
      code: r.code,
      validatedAt: r.created_at,
      discountPercent: r.discount_percent,
      discountAmount: r.saved_cents === null ? null : r.saved_cents / 100,
    })),
  });
});

merchant.put('/merchant/settings', async (c) => {
  const row = await ownMerchant(c.env.DB, c.get('user').id);
  if (!row) return fail(c, 404, 'not_found');

  const body = await readJson<{
    isActive: boolean;
    discountPercent: number;
    discountRule: string | null;
    menuUrl: string | null;
    newPin: string | null;
  }>(c);
  const percent = body?.discountPercent;
  const rule = body?.discountRule ?? null;
  const menuUrl = body?.menuUrl ?? null;
  const newPin = body?.newPin ?? null;
  if (
    !body ||
    typeof body.isActive !== 'boolean' ||
    typeof percent !== 'number' ||
    !Number.isInteger(percent) ||
    percent < 5 ||
    percent > 50 ||
    (rule !== null && rule !== '' && !isString(rule, 1, 200)) ||
    (menuUrl !== null && !isHttpsUrl(menuUrl)) ||
    (newPin !== null && !isPin(newPin))
  ) {
    return fail(c, 400, 'invalid_input');
  }

  const statements = [
    c.env.DB.prepare(
      'UPDATE merchants SET is_active = ?, discount_percent = ?, discount_rule = ?, menu_url = ? WHERE id = ?',
    ).bind(body.isActive ? 1 : 0, percent, rule || null, menuUrl, row.id),
  ];
  if (newPin !== null) {
    statements.push(
      c.env.DB.prepare('UPDATE merchants SET pin_hash = ? WHERE id = ?').bind(await hashSecret(newPin), row.id),
    );
  }
  await c.env.DB.batch(statements);
  return c.body(null, 204);
});
