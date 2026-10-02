import { Hono } from 'hono';
import { fail } from '../http';
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
}

export const MERCHANT_COLUMNS = `id, name, category, price_level, discount_percent, discount_rule,
  address, city, country, lat, lng, menu_url, image_url, rating, review_count, is_active`;

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
