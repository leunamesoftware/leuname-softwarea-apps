import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../src/index.ts';
import type { Env } from '../src/env.ts';

const allow = { limit: async () => ({ success: true }) };
const env = {
  ENVIRONMENT: 'test', CLAUDE_MODEL: 'x', ANDROID_PACKAGE: 'com.leuname.lerguie',
  ANTHROPIC_API_KEY: 'x', SESSION_SECRET: 'segredo-de-teste', SESSION_LIMITER: allow, DESCRIBE_LIMITER: allow,
} as unknown as Env;

const call = (method: string, path: string, body?: unknown, token?: string) =>
  worker.fetch(new Request(`https://api.test${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env, {} as ExecutionContext);

test('fluxo de sessão e proteção das rotas', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  const plans = await (await call('GET', '/v1/plans')).json() as { plans: unknown[] };
  assert.ok(plans.plans.length > 0);

  assert.equal((await call('POST', '/v1/session', { installId: 'nao-uuid' })).status, 400);
  const s = await (await call('POST', '/v1/session', { installId: crypto.randomUUID() })).json() as { token: string; plan: string };
  assert.equal(s.plan, 'free');

  assert.equal((await call('POST', '/v1/describe', { image: '/9j/abc' })).status, 401);
  assert.equal((await call('POST', '/v1/describe', { image: 'nao-jpeg' }, s.token)).status, 400);
  assert.equal((await call('POST', '/v1/billing/verify', { productId: 'x', purchaseToken: 'y' }, s.token)).status, 501);
  assert.equal((await call('GET', '/nada')).status, 404);
});
