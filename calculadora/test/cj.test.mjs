import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveValida, normalizarBusca, normalizarVariantes, normalizarFrete, guardarChave, estadoCj, buscarCj, analisarCj } from '../src/cj.js';

// Banco de mentira com uma linha só (cj_config).
function banco() {
  let linha = null;
  const stmt = (sql) => ({ bind: (...a) => ({
    first: async () => (sql.includes('FROM cj_config') ? linha : null),
    run: async () => {
      if (sql.startsWith('INSERT INTO cj_config')) linha = { api_key: a[0], access_token: a[1], token_expira: a[2], atualizado_em: a[3] };
      else if (sql.startsWith('UPDATE cj_config')) linha = { ...linha, access_token: a[0], token_expira: a[1] };
      else if (sql.startsWith('DELETE FROM cj_config')) linha = null;
    },
  }), first: async () => (sql.includes('FROM cj_config') ? linha : null), run: async () => { if (sql.startsWith('DELETE FROM cj_config')) linha = null; } });
  return { DB: { prepare: stmt }, ler: () => linha };
}
const ok = (data) => new Response(JSON.stringify({ code: 200, result: true, data }), { headers: { 'Content-Type': 'application/json' } });
const futuro = new Date(Date.now() + 90 * 864e5).toISOString();

test('chave: aceita o formato da CJ e recusa lixo', () => {
  assert.ok(chaveValida('CJ1234567@api@abcdef0123456789'));
  for (const ruim of ['', 'curta', 'tem espaço dentro de tudo', '<script>alert(1)</script>', 'a'.repeat(201), null]) assert.ok(!chaveValida(ruim), String(ruim));
});

test('busca: lê produtos, preço em texto ou intervalo e foto', () => {
  const r = normalizarBusca({ totalRecords: 2, content: [{ productList: [
    { id: 'P1', nameEn: 'Dog Leash', sku: 'CJ-1', bigImage: 'https://x/a.jpg', sellPrice: '11.85', nowPrice: '9.50', listedNum: 120 },
    { id: 'P2', nameEn: 'Cat Toy', sellPrice: '1.2 -- 3.4' },
  ] }] });
  assert.equal(r.produtos.length, 2);
  assert.equal(r.produtos[0].precoUsd, 9.5);
  assert.equal(r.produtos[0].lojas, 120);
  assert.equal(r.produtos[1].precoUsd, 1.2);
  assert.deepEqual(normalizarBusca({}), { total: 0, produtos: [] });
});

test('variantes e frete: ordena do mais barato e separa o IVA da CJ', () => {
  const v = normalizarVariantes({ variants: [{ vid: 'b', variantSellPrice: 5, variantNameEn: 'Azul' }, { vid: 'a', variantSellPrice: 3.5 }, { vid: 'c' }] });
  assert.equal(v.length, 2);
  const f = normalizarFrete([{ logisticName: 'CJPacket', logisticPrice: 4.2, logisticAging: '10-15', taxesFee: 0.8 }, { logisticName: 'YunExpress', logisticPrice: 3.1, logisticAging: '12-20' }, { logisticPrice: 1 }]);
  assert.equal(f[0].nome, 'YunExpress');
  assert.equal(f[1].ivaCjUsd, 0.8);
  assert.equal(f.length, 2);
});

test('fluxo: guarda a chave, busca e analisa um produto para Portugal', async () => {
  const original = globalThis.fetch, pedidos = [];
  globalThis.fetch = async (url, op) => {
    url = String(url); pedidos.push(url);
    if (url.includes('getAccessToken')) return ok({ accessToken: 'TOK', accessTokenExpiryDate: futuro });
    if (url.includes('frankfurter')) return new Response(JSON.stringify({ rates: { EUR: 0.9 } }));
    if (url.includes('listV2')) return ok({ totalRecords: 1, content: [{ productList: [{ id: 'PID-123456', nameEn: 'Dog Bed', nowPrice: '8.00', bigImage: 'https://x/b.jpg' }] }] });
    if (url.includes('product/query')) return ok({ pid: 'PID-123456', productNameEn: 'Dog Bed', bigImage: 'https://x/b.jpg', productWeight: 400, variants: [{ vid: 'V1', variantSellPrice: 8, variantNameEn: 'M' }] });
    if (url.includes('freightCalculate')) { assert.equal(JSON.parse(op.body).endCountryCode, 'PT'); assert.equal(op.headers['CJ-Access-Token'], 'TOK'); return ok([{ logisticName: 'CJPacket', logisticPrice: 3.9, logisticAging: '9-15' }]); }
    return new Response('{}', { status: 404 });
  };
  const env = banco();
  try {
    assert.deepEqual(await estadoCj(env), { ligada: false });
    assert.equal((await buscarCj(env, { q: 'dog' })).erro, 'sem_chave');
    assert.equal((await guardarChave(env, 'curta')).erro, 'chave_invalida');
    assert.deepEqual(await guardarChave(env, 'CJ1234567@api@abcdef0123456789'), { ok: true });
    assert.deepEqual(await estadoCj(env), { ligada: true });
    const b = await buscarCj(env, { q: 'dog bed' });
    assert.equal(b.produtos[0].pid, 'PID-123456'); assert.equal(b.cambio, 0.9);
    assert.equal((await buscarCj(env, { q: 'a' })).erro, 'busca_curta');
    const a = await analisarCj(env, 'PID-123456');
    assert.equal(a.variantes[0].vid, 'V1'); assert.equal(a.envio[0].precoUsd, 3.9);
    assert.equal((await analisarCj(env, '../x')).erro, 'pid');
  } finally { globalThis.fetch = original; }
}, { timeout: 15000 });

test('chave recusada pela CJ não é guardada', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 1600001, result: false }));
  const env = banco();
  try { assert.equal((await guardarChave(env, 'CJ1234567@api@abcdef0123456789')).erro, 'cj_recusou'); assert.equal(env.ler(), null); }
  finally { globalThis.fetch = original; }
});

import { improprio, normalizarBusca as nb } from '../src/cj.js';
test('produtos adultos misturados na busca de "dog" são bloqueados', () => {
  assert.ok(improprio('Dog Harness For Men With Realistic Dog Hanging Harness'));
  assert.ok(improprio('Hollow Penis Sheath'));
  assert.ok(!improprio('Reflective Dog Harness'));
  assert.ok(!improprio('Dog Collar Waterproof'));
  const r = nb({ content: [{ productList: [{ id: '1', nameEn: 'Hollow Penis Sheath', nowPrice: 2 }, { id: '2', nameEn: 'Reflective Dog Harness', nowPrice: 1 }] }] });
  assert.deepEqual(r.produtos.map((x) => x.pid), ['2']);
});
