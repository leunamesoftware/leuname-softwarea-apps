import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashSecret } from '../src/crypto';

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
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function register(email = `u${crypto.randomUUID()}@test.es`) {
  const res = await call('/auth/register', {
    method: 'POST',
    json: { name: 'Lucía', email, password: 'contraseña-segura', acceptTerms: true },
  });
  return { email, token: res.body.token as string, id: res.body.user.id as string };
}

async function seedMerchant(ownerId: string | null = null) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO merchants (id, owner_user_id, name, category, price_level, discount_percent,
       address, city, country, lat, lng, pin_hash, status)
     VALUES (?, ?, 'La Bella Cucina', 'food', 2, 15, 'Calle del Arenal, 12', 'Madrid', 'España',
       40.4189, -3.7065, ?, 'approved')`,
  )
    .bind(id, ownerId, await hashSecret('1234'))
    .run();
  return id;
}

async function subscribe(userId: string) {
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await env.DB.prepare(
    "INSERT INTO subscriptions (user_id, provider, status, current_period_end) VALUES (?, 'manual', 'active', ?)",
  )
    .bind(userId, end)
    .run();
}

describe('conta', () => {
  it('cadastra, entra e lê o perfil', async () => {
    const { email, token } = await register();
    expect(token).toBeTruthy();

    const login = await call('/auth/login', { method: 'POST', json: { email, password: 'contraseña-segura' } });
    expect(login.status).toBe(200);

    const me = await call('/me', { token: login.body.token });
    expect(me.body.email).toBe(email);
    expect(me.body.role).toBe('member');
  });

  it('exige aceite dos termos e senha de 8+ caracteres', async () => {
    const noTerms = await call('/auth/register', {
      method: 'POST',
      json: { name: 'Ana', email: 'ana@test.es', password: 'contraseña', acceptTerms: false },
    });
    expect(noTerms.status).toBe(400);
    const shortPassword = await call('/auth/register', {
      method: 'POST',
      json: { name: 'Ana', email: 'ana@test.es', password: '123', acceptTerms: true },
    });
    expect(shortPassword.status).toBe(400);
  });

  it('não deixa repetir e-mail (sem diferenciar maiúsculas)', async () => {
    const { email } = await register();
    const again = await call('/auth/register', {
      method: 'POST',
      json: { name: 'Otra', email: email.toUpperCase(), password: 'contraseña-segura', acceptTerms: true },
    });
    expect(again.status).toBe(409);
  });

  it('bloqueia o login após 5 senhas erradas', async () => {
    const { email } = await register();
    for (let i = 0; i < 5; i++) {
      const res = await call('/auth/login', { method: 'POST', json: { email, password: 'errada-123' } });
      expect(res.status).toBe(401);
    }
    const locked = await call('/auth/login', { method: 'POST', json: { email, password: 'contraseña-segura' } });
    expect(locked.status).toBe(429);
  });

  it('recusa token adulterado', async () => {
    const { token } = await register();
    const [h, b] = token.split('.');
    const res = await call('/me', { token: `${h}.${b}.assinatura-falsa` });
    expect(res.status).toBe(401);
  });

  it('apaga a conta (RGPD)', async () => {
    const { token } = await register();
    expect((await call('/me', { method: 'DELETE', token })).status).toBe(204);
    expect((await call('/me', { token })).status).toBe(401);
  });
});

describe('resgate', () => {
  let merchantId: string;
  beforeEach(async () => {
    merchantId = await seedMerchant();
  });

  it('exige assinatura ativa', async () => {
    const { token } = await register();
    const res = await call('/redemptions', { method: 'POST', token, json: { merchantId, pin: '1234' } });
    expect(res.status).toBe(402);
  });

  it('PIN certo gera cupom e entra no histórico', async () => {
    const { token, id } = await register();
    await subscribe(id);
    const res = await call('/redemptions', { method: 'POST', token, json: { merchantId, pin: '1234' } });
    expect(res.status).toBe(201);
    expect(res.body.discountPercent).toBe(15);

    const patch = await call(`/me/redemptions/${res.body.code}`, { method: 'PATCH', token, json: { amountPaid: 85 } });
    expect(patch.status).toBe(204);

    const history = await call('/me/redemptions', { token });
    expect(history.body).toHaveLength(1);
    expect(history.body[0].amountPaid).toBe(85);
    expect(history.body[0].merchantName).toBe('La Bella Cucina');
  });

  it('PIN errado conta tentativas e bloqueia na quinta', async () => {
    const { token, id } = await register();
    await subscribe(id);
    const first = await call('/redemptions', { method: 'POST', token, json: { merchantId, pin: '0000' } });
    expect(first.status).toBe(403);
    expect(first.body.remainingAttempts).toBe(4);
    for (let i = 0; i < 4; i++) await call('/redemptions', { method: 'POST', token, json: { merchantId, pin: '0000' } });

    const blocked = await call('/redemptions', { method: 'POST', token, json: { merchantId, pin: '1234' } });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('pin_locked');
  });

  it('cliente não altera resgate de outra pessoa', async () => {
    const a = await register();
    const b = await register();
    await subscribe(a.id);
    const res = await call('/redemptions', { method: 'POST', token: a.token, json: { merchantId, pin: '1234' } });
    const patch = await call(`/me/redemptions/${res.body.code}`, {
      method: 'PATCH',
      token: b.token,
      json: { amountPaid: 10 },
    });
    expect(patch.status).toBe(404);
  });
});

describe('painel do lojista', () => {
  it('só lojista acessa e vê os números do mês', async () => {
    const owner = await register();
    const member = await register();
    await env.DB.prepare("UPDATE users SET role = 'merchant' WHERE id = ?").bind(owner.id).run();
    const merchantId = await seedMerchant(owner.id);

    await subscribe(member.id);
    const r = await call('/redemptions', { method: 'POST', token: member.token, json: { merchantId, pin: '1234' } });
    await call(`/me/redemptions/${r.body.code}`, { method: 'PATCH', token: member.token, json: { amountPaid: 85 } });

    expect((await call('/merchant/dashboard', { token: member.token })).status).toBe(403);

    const dash = await call('/merchant/dashboard', { token: owner.token });
    expect(dash.status).toBe(200);
    expect(dash.body.validatedCoupons).toBe(1);
    expect(dash.body.discountGranted).toBe(15);
    expect(dash.body.newCustomers).toBe(1);
    expect(dash.body.dailyValidations).toHaveLength(30);
    expect(dash.body.dailyValidations[29]).toBe(1);
  });

  it('valida e salva ajustes, inclusive novo PIN', async () => {
    const owner = await register();
    await env.DB.prepare("UPDATE users SET role = 'merchant' WHERE id = ?").bind(owner.id).run();
    const merchantId = await seedMerchant(owner.id);

    const bad = await call('/merchant/settings', {
      method: 'PUT',
      token: owner.token,
      json: { isActive: true, discountPercent: 90, discountRule: null, menuUrl: 'http://x.com', newPin: '12' },
    });
    expect(bad.status).toBe(400);

    const ok = await call('/merchant/settings', {
      method: 'PUT',
      token: owner.token,
      json: { isActive: true, discountPercent: 20, discountRule: 'Solo de lunes a jueves.', menuUrl: null, newPin: '9876' },
    });
    expect(ok.status).toBe(204);

    const member = await register();
    await subscribe(member.id);
    const oldPin = await call('/redemptions', { method: 'POST', token: member.token, json: { merchantId, pin: '1234' } });
    expect(oldPin.status).toBe(403);
    const newPin = await call('/redemptions', { method: 'POST', token: member.token, json: { merchantId, pin: '9876' } });
    expect(newPin.body.discountPercent).toBe(20);
  });
});

describe('parceiros', () => {
  it('lista só aprovados e ativos, sem expor o PIN', async () => {
    await seedMerchant();
    await env.DB.prepare(
      `INSERT INTO merchants (id, name, category, price_level, discount_percent, address, city, country, lat, lng, pin_hash)
       VALUES ('pendiente', 'Pendiente', 'cafe', 1, 10, 'x', 'Madrid', 'España', 0, 0, 'x:y')`,
    ).run();
    const res = await call('/partners');
    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: string }) => p.id === 'pendiente')).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('pin');
  });
});
