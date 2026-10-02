import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { fail, isString, readJson } from '../http';
import type { AppEnv } from '../types';

export const partners = new Hono<AppEnv>();

export interface MerchantRow {
  id: string;
  name: string;
  category: string;
  price_level: number;
  discount_percent: number;
  discount_rule: string | null;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  menu_url: string | null;
  image_url: string | null;
  rating: number | null;
  review_count: number;
  is_active: number;
  opening_hours: string | null;
}

export const MERCHANT_COLUMNS = `id, name, category, price_level, discount_percent, discount_rule,
  address, city, country, lat, lng, menu_url, image_url, rating, review_count, is_active, opening_hours`;

export const toPartner = (m: MerchantRow) => ({
  id: m.id,
  name: m.name,
  category: m.category,
  priceLevel: m.price_level,
  discountPercent: m.discount_percent,
  discountRule: m.discount_rule,
  address: m.address,
  city: m.city,
  country: m.country,
  lat: m.lat,
  lng: m.lng,
  menuUrl: m.menu_url,
  imageUrl: m.image_url,
  rating: m.rating,
  reviewCount: m.review_count,
  openingHours: m.opening_hours ? JSON.parse(m.opening_hours) : null,
});

const VISIBLE = "status = 'approved' AND is_active = 1";

partners.get('/partners', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${MERCHANT_COLUMNS} FROM merchants WHERE ${VISIBLE}`).all<MerchantRow>();
  return c.json(results.map(toPartner));
});

partners.get('/partners/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT ${MERCHANT_COLUMNS} FROM merchants WHERE id = ? AND ${VISIBLE}`)
    .bind(c.req.param('id'))
    .first<MerchantRow>();
  return row ? c.json(toPartner(row)) : fail(c, 404, 'not_found');
});

// ---- Avaliações: só quem já usou o desconto no estabelecimento ----

partners.get('/partners/:id/reviews', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT r.rating, r.comment, r.created_at, u.name FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.merchant_id = ? ORDER BY r.created_at DESC LIMIT 20`,
  )
    .bind(c.req.param('id'))
    .all<{ rating: number; comment: string | null; created_at: string; name: string }>();
  // Só o primeiro nome do autor (dado mínimo, RGPD).
  return c.json(
    results.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      author: r.name.trim().split(/\s+/)[0],
    })),
  );
});

partners.put('/partners/:id/review', requireAuth(), async (c) => {
  const merchantId = c.req.param('id');
  const userId = c.get('user').id;
  const body = await readJson<{ rating: number; comment: string | null }>(c);
  const comment = body?.comment ?? null;
  if (
    !body ||
    !Number.isInteger(body.rating) ||
    body.rating! < 1 ||
    body.rating! > 5 ||
    (comment !== null && comment !== '' && !isString(comment, 1, 500))
  ) {
    return fail(c, 400, 'invalid_input');
  }
  const used = await c.env.DB.prepare('SELECT 1 FROM redemptions WHERE user_id = ? AND merchant_id = ? LIMIT 1')
    .bind(userId, merchantId)
    .first();
  if (!used) return fail(c, 403, 'review_not_allowed');

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO reviews (user_id, merchant_id, rating, comment) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, merchant_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment,
         created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    ).bind(userId, merchantId, body.rating, comment?.trim() || null),
    c.env.DB.prepare(
      `UPDATE merchants SET
         rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE merchant_id = ?),
         review_count = (SELECT COUNT(*) FROM reviews WHERE merchant_id = ?)
       WHERE id = ?`,
    ).bind(merchantId, merchantId, merchantId),
  ]);
  return c.body(null, 204);
});

/** Fotos enviadas pelos lojistas (guardadas no R2). */
partners.get('/files/:key', async (c) => {
  const object = await c.env.FILES.get(`photos/${c.req.param('key')}`);
  if (!object) return fail(c, 404, 'not_found');
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
