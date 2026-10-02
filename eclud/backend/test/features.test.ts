import { env, SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashSecret } from '../src/crypto';
import { toLocalStatus } from '../src/google';

const BASE = 'https://api.test';

async function call(path: string, init: RequestInit & { token?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  const res = await SELF.fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function register(email = `u${crypto.randomUUID()}@test.es`) {
  const res = await call('/auth/register', {
    method: 'POST',
    json: { name: 'Lucía Pérez', email, password: 'contraseña-segura', acceptTerms: true },
  });
  return { email, token: res.body.token as string, id: res.body.user.id as string };
}

async function seedMerchant(ownerId: string | null = null) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO merchants (id, owner_user_id, name, category, price_level, discount_percent,
       address, city, country, lat, lng, pin_hash, status)
     VALUES (?, ?, 'Coffee Time', 'cafe', 1, 10, 'Calle Mayor 1', 'Madrid', 'España', 40.41, -3.70, ?, 'approved')`,
  )
    .bind(id, ownerId, await hashSecret('1234'))
    .run();
  return id;
}

afterEach(() => vi.restoreAllMocks());

/** Simula as respostas do Google (token OAuth e consulta da assinatura). */
function mockGoogle(subscription: object) {
  const realFetch = globalThis.fetch;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      return Response.json({ access_token: 'google-token', expires_in: 3600 });
    }
    if (url.startsWith('https://androidpublisher.googleapis.com/')) {
      return Response.json(subscription);
    }
    return realFetch(input as RequestInfo, init);
  });
}

describe('assinatura Google Play', () => {
  const future = () => new Date(Date.now() + 30 * 86_400_000).toISOString();

  it('traduz os estados da Play', () => {
    const now = Date.parse('2026-10-02T00:00:00Z');
    const line = (expiryTime: string) => [{ productId: 'eclud_mensual', expiryTime }];
    expect(toLocalStatus({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: line('2026-11-02T00:00:00Z') }, now).status).toBe('active');
    expect(toLocalStatus({ subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', lineItems: line('2026-10-20T00:00:00Z') }, now).status).toBe('active');
    expect(toLocalStatus({ subscriptionState: 'SUBSCRIPTION_STATE_CANCELED', lineItems: line('2026-09-20T00:00:00Z') }, now).status).toBe('canceled');
    expect(toLocalStatus({ subscriptionState: 'SUBSCRIPTION_STATE_ON_HOLD', lineItems: line('2026-11-02T00:00:00Z') }, now).status).toBe('past_due');
  });

  it('compra confirmada no Google libera o desconto', async () => {
    const user = await register();
    const merchantId = await seedMerchant();
    mockGoogle({
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      lineItems: [{ productId: 'eclud_mensual', expiryTime: future() }],
      externalAccountIdentifiers: { obfuscatedExternalAccountId: user.id },
    });

    expect((await call('/redemptions', { method: 'POST', token: user.token, json: { merchantId, pin: '1234' } })).status).toBe(402);
    const verify = await call('/billing/google/verify', {
      method: 'POST',
      token: user.token,
      json: { purchaseToken: 'token-compra-1', productId: 'eclud_mensual' },
    });
    expect(verify.status).toBe(200);
    expect(verify.body.status).toBe('active');
    expect((await call('/me', { token: user.token })).body.subscription.status).toBe('active');
    expect((await call('/redemptions', { method: 'POST', token: user.token, json: { merchantId, pin: '1234' } })).status).toBe(201);
  });

  it('a mesma compra não vale para outra conta', async () => {
    const a = await register();
    const b = await register();
    mockGoogle({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'eclud_mensual', expiryTime: future() }] });
    const json = { purchaseToken: 'token-compartilhado', productId: 'eclud_mensual' };
    expect((await call('/billing/google/verify', { method: 'POST', token: a.token, json })).status).toBe(200);
    expect((await call('/billing/google/verify', { method: 'POST', token: b.token, json })).status).toBe(409);
  });

  it('compra feita por outra conta é recusada', async () => {
    const user = await register();
    mockGoogle({
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      lineItems: [{ productId: 'eclud_mensual', expiryTime: future() }],
      externalAccountIdentifiers: { obfuscatedExternalAccountId: 'outra-conta' },
    });
    const res = await call('/billing/google/verify', {
      method: 'POST',
      token: user.token,
      json: { purchaseToken: 'token-de-outro', productId: 'eclud_mensual' },
    });
    expect(res.status).toBe(409);
  });

  it('notificação da Play atualiza o cancelamento', async () => {
    const user = await register();
    mockGoogle({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'eclud_mensual', expiryTime: future() }] });
    await call('/billing/google/verify', {
      method: 'POST',
      token: user.token,
      json: { purchaseToken: 'token-rtdn', productId: 'eclud_mensual' },
    });

    vi.restoreAllMocks();
    mockGoogle({
      subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED',
      lineItems: [{ productId: 'eclud_mensual', expiryTime: '2026-01-01T00:00:00Z' }],
    });
    const message = { message: { data: btoa(JSON.stringify({ subscriptionNotification: { purchaseToken: 'token-rtdn' } })) } };
    expect((await call('/billing/google/rtdn?token=errado', { method: 'POST', json: message })).status).toBe(401);
    expect((await call('/billing/google/rtdn?token=rtdn-secret', { method: 'POST', json: message })).status).toBe(204);
    expect((await call('/me', { token: user.token })).body.subscription.status).toBe('canceled');
  });
});

describe('recuperação de senha', () => {
  it('código por e-mail troca a senha e entra na conta', async () => {
    const { email } = await register();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await call('/auth/forgot', { method: 'POST', json: { email } })).status).toBe(204);
    const code = log.mock.calls.map((args) => String(args[0])).join('\n').match(/código[^:]*: (\d{6})/)?.[1];
    expect(code).toMatch(/^\d{6}$/);

    const wrong = await call('/auth/reset', { method: 'POST', json: { email, code: '000000', password: 'nueva-clave-1' } });
    expect(wrong.status).toBe(400);
    const ok = await call('/auth/reset', { method: 'POST', json: { email, code, password: 'nueva-clave-1' } });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect((await call('/auth/login', { method: 'POST', json: { email, password: 'nueva-clave-1' } })).status).toBe(200);
    // O código não serve duas vezes.
    expect((await call('/auth/reset', { method: 'POST', json: { email, code, password: 'otra-clave-2' } })).status).toBe(400);
  });

  it('não revela se o e-mail tem conta', async () => {
    expect((await call('/auth/forgot', { method: 'POST', json: { email: 'nadie@test.es' } })).status).toBe(204);
  });
});

describe('avaliações', () => {
  it('só quem usou o desconto avalia, e a nota média é atualizada', async () => {
    const user = await register();
    const merchantId = await seedMerchant();
    const review = { rating: 4, comment: 'Muy buen café' };
    expect((await call(`/partners/${merchantId}/review`, { method: 'PUT', token: user.token, json: review })).status).toBe(403);

    await env.DB.prepare(
      "INSERT INTO redemptions (id, code, user_id, merchant_id, discount_percent) VALUES (?, ?, ?, ?, 10)",
    )
      .bind(crypto.randomUUID(), `C${Date.now()}`, user.id, merchantId)
      .run();
    expect((await call(`/partners/${merchantId}/review`, { method: 'PUT', token: user.token, json: review })).status).toBe(204);

    const partner = await call(`/partners/${merchantId}`);
    expect(partner.body.rating).toBe(4);
    expect(partner.body.reviewCount).toBe(1);
    const list = await call(`/partners/${merchantId}/reviews`);
    expect(list.body[0]).toMatchObject({ rating: 4, comment: 'Muy buen café', author: 'Lucía' });
    expect(JSON.stringify(list.body)).not.toContain('@');
  });
});

describe('lojista: horário e foto', () => {
  async function owner() {
    const u = await register();
    await env.DB.prepare("UPDATE users SET role = 'merchant' WHERE id = ?").bind(u.id).run();
    const merchantId = await seedMerchant(u.id);
    return { ...u, merchantId };
  }

  it('salva horário válido e recusa inválido', async () => {
    const o = await owner();
    const base = { isActive: true, discountPercent: 10, discountRule: null, menuUrl: null, newPin: null };
    const bad = await call('/merchant/settings', {
      method: 'PUT',
      token: o.token,
      json: { ...base, openingHours: { '8': [['10:00', '14:00']] } },
    });
    expect(bad.status).toBe(400);
    const hours = { '1': [['08:00', '14:00'], ['17:00', '21:00']], '6': [['10:00', '14:00']] };
    expect((await call('/merchant/settings', { method: 'PUT', token: o.token, json: { ...base, openingHours: hours } })).status).toBe(204);
    expect((await call(`/partners/${o.merchantId}`)).body.openingHours).toEqual(hours);
  });

  it('envia foto e ela fica pública; recusa tipo errado', async () => {
    const o = await owner();
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const wrongType = await SELF.fetch(`${BASE}/merchant/photo`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${o.token}`, 'Content-Type': 'text/html' },
      body: '<script>',
    });
    expect(wrongType.status).toBe(415);

    const res = await SELF.fetch(`${BASE}/merchant/photo`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${o.token}`, 'Content-Type': 'image/png' },
      body: png,
    });
    expect(res.status).toBe(200);
    const { imageUrl } = (await res.json()) as { imageUrl: string };
    const file = await SELF.fetch(imageUrl);
    expect(file.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(png);
    expect((await call(`/partners/${o.merchantId}`)).body.imageUrl).toBe(imageUrl);
  });
});
