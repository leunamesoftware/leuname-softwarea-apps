import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dominioDaLoja, normalizarProdutos, calcularLucro, lerLoja } from '../src/radar.js';

test('dominio: aceita endereço de loja e recusa o que é perigoso', () => {
  assert.equal(dominioDaLoja('https://www.Loja-Pet.com/products/x?y=1'), 'www.loja-pet.com');
  assert.equal(dominioDaLoja('loja.pt'), 'loja.pt');
  for (const ruim of ['', 'localhost', '127.0.0.1', '10.0.0.5', 'http://192.168.0.1/x', 'servidor.internal', 'sem ponto', 'a'.repeat(300) + '.com']) {
    assert.equal(dominioDaLoja(ruim), null, ruim);
  }
});

test('produtos: pega menor preço, foto, link e a posição', () => {
  const json = { products: [
    { id: 1, title: 'Coleira', handle: 'coleira', product_type: 'Cães', created_at: '2026-01-01', variants: [{ price: '12.90', compare_at_price: '19.90' }, { price: '9.90' }], images: [{ src: 'https://cdn/x.jpg' }] },
    { id: 2, title: 'Sem preço', handle: 'sem', variants: [] },
  ] };
  const p = normalizarProdutos(json, 'loja.pt');
  assert.equal(p.length, 2);
  assert.equal(p[0].preco, 9.9);
  assert.equal(p[0].precoAntes, 19.9);
  assert.equal(p[0].posicao, 1);
  assert.equal(p[0].link, 'https://loja.pt/products/coleira');
  assert.equal(p[1].preco, null);
  assert.deepEqual(normalizarProdutos({}, 'loja.pt'), []);
});

test('lucro: contas conferidas à mão', () => {
  // Venda 29,90; custo 6 + frete 2; IVA 23%; IOSS 3%; Stripe 1,5% + 0,25.
  const r = calcularLucro({ preco: 29.9, custo: 6, frete: 2 });
  assert.equal(r.iva, 5.59);        // 29,90 - 29,90/1,23
  assert.equal(r.ioss, 0.9);        // 3% de 29,90
  assert.equal(r.pagamento, 0.7);   // 0,4485 + 0,25
  assert.equal(r.custoTotal, 15.19);
  assert.equal(r.lucro, 14.71);
  assert.equal(r.margem, 49.21);
  assert.equal(r.anuncioMaximo, 14.71);
});

test('lucro: com anúncio, prejuízo e preço de equilíbrio', () => {
  const r = calcularLucro({ preco: 20, custo: 8, frete: 3, anuncio: 10 });
  assert.ok(r.lucro < 0);
  const eq = calcularLucro({ preco: r.precoEquilibrio, custo: 8, frete: 3, anuncio: 10 });
  assert.ok(Math.abs(eq.lucro) < 0.05, `equilíbrio deveria dar ~0, deu ${eq.lucro}`);
  assert.deepEqual(calcularLucro({ preco: 0 }), { erro: 'preco' });
});

test('lerLoja: usa a ordem mais vendidos e cai no catálogo normal', async () => {
  const original = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url) => {
    pedidos.push(String(url));
    const ok = String(url).includes('/products.json?limit') && !String(url).includes('collections');
    const corpo = JSON.stringify({ products: [{ id: 9, title: 'Fonte', handle: 'fonte', variants: [{ price: '25' }] }] });
    return ok ? new Response(corpo, { headers: { 'Content-Type': 'application/json' } }) : new Response('nao', { status: 404 });
  };
  try {
    const r = await lerLoja('https://loja.pt');
    assert.equal(r.ordem, 'catalogo');
    assert.equal(r.produtos[0].titulo, 'Fonte');
    assert.equal(pedidos.length, 2);
    assert.deepEqual(await lerLoja('localhost'), { erro: 'endereco', status: 400 });
  } finally { globalThis.fetch = original; }
});
