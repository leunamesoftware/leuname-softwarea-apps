import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CATALOG, findPlan, loadCatalog } from '../src/plans.ts';
import { signJwt, verifyJwt } from '../src/jwt.ts';

test('catálogo padrão quando PLANS_JSON está ausente ou inválido', () => {
  assert.equal(loadCatalog(undefined), DEFAULT_CATALOG);
  assert.equal(loadCatalog('{quebrado'), DEFAULT_CATALOG);
  assert.equal(loadCatalog('{"plans":[]}'), DEFAULT_CATALOG);
});

test('plano desconhecido cai para o padrão (gratuito)', () => {
  assert.equal(findPlan(DEFAULT_CATALOG, 'nao-existe').id, 'free');
  assert.equal(findPlan(DEFAULT_CATALOG, undefined).id, 'free');
});

test('monetização vem desligada por padrão', () => {
  assert.equal(DEFAULT_CATALOG.monetizationEnabled, false);
});

test('token assinado é validado e adulteração é rejeitada', async () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = await signJwt({ sub: 'a', plan: 'free', exp }, 'segredo');
  assert.deepEqual(await verifyJwt(token, 'segredo'), { sub: 'a', plan: 'free', exp });
  assert.equal(await verifyJwt(token, 'outro'), null);
  const [h, , s] = token.split('.');
  const forged = btoa(JSON.stringify({ sub: 'a', plan: 'plus', exp })).replace(/=+$/, '');
  assert.equal(await verifyJwt(`${h}.${forged}.${s}`, 'segredo'), null);
});

test('token expirado é rejeitado', async () => {
  const token = await signJwt({ sub: 'a', plan: 'free', exp: 1 }, 'segredo');
  assert.equal(await verifyJwt(token, 'segredo'), null);
});
