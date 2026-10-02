import { Hono } from 'hono';
import { requireAuth } from '../auth';
import { hashSecret } from '../crypto';
import { fail, isEmail, isHttpsUrl, isPin, isString, readJson } from '../http';
import type { AppEnv } from '../types';
import { MERCHANT_COLUMNS, toPartner, type MerchantRow } from './partners';

/** Administração: cadastrar, aprovar e pausar estabelecimentos. */
export const admin = new Hono<AppEnv>();

admin.use('/admin/*', requireAuth('admin'));

const CATEGORIES = ['food', 'cafe', 'beauty', 'leisure'];
const STATUSES = ['pending', 'approved', 'rejected'];
const PREFIXED_COLUMNS = MERCHANT_COLUMNS.split(',')
  .map((col) => `m.${col.trim()}`)
  .join(', ');

admin.get('/admin/merchants', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${PREFIXED_COLUMNS}, m.status, u.email AS owner_email
     FROM merchants m LEFT JOIN users u ON u.id = m.owner_user_id
     ORDER BY CASE m.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, m.created_at DESC`,
  ).all<MerchantRow & { status: string; owner_email: string | null }>();
  return c.json(
    results.map((m) => ({ ...toPartner(m), status: m.status, isActive: m.is_active === 1, ownerEmail: m.owner_email })),
  );
});

/**
 * Cadastra um estabelecimento já ligado à conta do lojista (que precisa
 * ter se cadastrado no app antes) e dá a ela o papel de lojista.
 */
admin.post('/admin/merchants', async (c) => {
  const b = await readJson<{
    name: string;
    category: string;
    priceLevel: number;
    discountPercent: number;
    discountRule: string | null;
    address: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    menuUrl: string | null;
    imageUrl: string | null;
    ownerEmail: string;
    pin: string;
  }>(c);
  const valid =
    b &&
    isString(b.name, 2, 80) &&
    typeof b.category === 'string' &&
    CATEGORIES.includes(b.category) &&
    Number.isInteger(b.priceLevel) &&
    b.priceLevel! >= 1 &&
    b.priceLevel! <= 3 &&
    Number.isInteger(b.discountPercent) &&
    b.discountPercent! >= 5 &&
    b.discountPercent! <= 50 &&
    (b.discountRule == null || b.discountRule === '' || isString(b.discountRule, 1, 200)) &&
    isString(b.address, 3, 200) &&
    isString(b.city, 2, 80) &&
    isString(b.country, 2, 80) &&
    typeof b.lat === 'number' &&
    Math.abs(b.lat) <= 90 &&
    typeof b.lng === 'number' &&
    Math.abs(b.lng) <= 180 &&
    (b.menuUrl == null || isHttpsUrl(b.menuUrl)) &&
    (b.imageUrl == null || isHttpsUrl(b.imageUrl)) &&
    isEmail(b.ownerEmail) &&
    isPin(b.pin);
  if (!valid) return fail(c, 400, 'invalid_input');

  const owner = await c.env.DB.prepare('SELECT id, role FROM users WHERE email = ?')
    .bind(b.ownerEmail!.trim().toLowerCase())
    .first<{ id: string; role: string }>();
  if (!owner) return fail(c, 404, 'owner_not_found');
  const taken = await c.env.DB.prepare('SELECT 1 FROM merchants WHERE owner_user_id = ?').bind(owner.id).first();
  if (taken) return fail(c, 409, 'owner_has_merchant');

  const id = crypto.randomUUID();
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO merchants (id, owner_user_id, name, category, price_level, discount_percent, discount_rule,
         address, city, country, lat, lng, menu_url, image_url, pin_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
    ).bind(
      id,
      owner.id,
      b.name!.trim(),
      b.category,
      b.priceLevel,
      b.discountPercent,
      b.discountRule || null,
      b.address!.trim(),
      b.city!.trim(),
      b.country!.trim(),
      b.lat,
      b.lng,
      b.menuUrl ?? null,
      b.imageUrl ?? null,
      await hashSecret(b.pin!),
    ),
  ];
  // Um administrador continua administrador; os demais viram lojistas.
  if (owner.role !== 'admin') {
    statements.push(c.env.DB.prepare("UPDATE users SET role = 'merchant' WHERE id = ?").bind(owner.id));
  }
  await c.env.DB.batch(statements);
  return c.json({ id }, 201);
});

admin.patch('/admin/merchants/:id', async (c) => {
  const b = await readJson<{ status: string }>(c);
  if (!b || typeof b.status !== 'string' || !STATUSES.includes(b.status)) return fail(c, 400, 'invalid_input');
  const result = await c.env.DB.prepare('UPDATE merchants SET status = ? WHERE id = ?')
    .bind(b.status, c.req.param('id'))
    .run();
  return result.meta.changes === 0 ? fail(c, 404, 'not_found') : c.body(null, 204);
});
