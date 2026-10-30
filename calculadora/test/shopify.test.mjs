import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lojaValida, chaveValida, guardarLoja, estadoShopify, enviarProduto, listarProdutos } from '../src/shopify.js';

function banco() {
  let linha = null;
  const stmt = (sql) => ({ bind: (...a) => ({
    first: async () => (sql.includes('FROM shopify_config') ? linha : null),
    run: async () => {
      if (sql.startsWith('INSERT INTO shopify_config')) linha = { loja: a[0], token: a[1], client_id: a[2], client_secret: a[3], token_expira: a[4] };
      else if (sql.startsWith('UPDATE shopify_config')) linha = { ...linha, token: a[0], token_expira: a[1] };
    },
  }), first: async () => (sql.includes('FROM shopify_config') ? linha : (sql.includes('cj_config') ? { api_key: 'k', access_token: 'cjtok', token_expira: new Date(Date.now() + 90 * 864e5).toISOString() } : null)) });
  return { DB: { prepare: stmt } };
}
const res = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });

test('validações de loja e chave', () => {
  assert.ok(lojaValida('bfstxp-0s.myshopify.com'));
  for (const r of ['', 'loja.com', 'x.myshopify.com.evil.com', 'http://a.myshopify.com', 'a b.myshopify.com']) assert.ok(!lojaValida(r), r);
  assert.ok(chaveValida('shpat_0123456789abcdef0123'));
  assert.ok(!chaveValida('curta'));
  assert.ok(!chaveValida('<script>alert(1)</script>'));
});

test('ligar loja com token testa o Shopify e guarda; recusa loja falsa', async () => {
  const original = globalThis.fetch; const env = banco();
  globalThis.fetch = async (u, o) => { assert.ok(String(u).startsWith('https://bfstxp-0s.myshopify.com/admin/api/')); assert.equal(o.headers['X-Shopify-Access-Token'], 'shpat_0123456789abcdef0123'); return res({ data: { shop: { name: 'LeunaPets' } } }); };
  try {
    assert.deepEqual(await guardarLoja(env, { loja: 'https://bfstxp-0s.myshopify.com/admin', token: 'shpat_0123456789abcdef0123' }), { ok: true, nome: 'LeunaPets' });
    const e = await estadoShopify(env);
    assert.equal(e.ligada, true);
    assert.equal(e.produtosAdmin, 'https://admin.shopify.com/store/bfstxp-0s/products');
    assert.equal((await guardarLoja(env, { loja: 'evil.com', token: 'shpat_0123456789abcdef0123' })).erro, 'loja_invalida');
    globalThis.fetch = async () => res({}, 401);
    assert.equal((await guardarLoja(env, { loja: 'bfstxp-0s.myshopify.com', token: 'shpat_0123456789abcdef0123' })).erro, 'shopify_recusou');
  } finally { globalThis.fetch = original; }
});

test('ligar com ID do cliente e segredo troca por token', async () => {
  const original = globalThis.fetch; const env = banco(); const chamadas = [];
  globalThis.fetch = async (u, o) => { chamadas.push(String(u)); return String(u).includes('oauth/access_token') ? res({ access_token: 'shpat_novo_token_123456', expires_in: 86399 }) : res({ data: { shop: { name: 'L' } } }); };
  try {
    const r = await guardarLoja(env, { loja: 'bfstxp-0s.myshopify.com', clientId: 'a'.repeat(32), clientSecret: 'b'.repeat(32) });
    assert.equal(r.ok, true);
    assert.ok(chamadas[0].includes('oauth/access_token'));
  } finally { globalThis.fetch = original; }
});

test('enviar: cria rascunho com fotos, preço e coleção; não duplica', async () => {
  const original = globalThis.fetch; const env = banco(); const gq = []; let jaExiste = false;
  globalThis.fetch = async (u, o) => {
    u = String(u);
    if (u.includes('cjdropshipping')) return res({ code: 200, data: { pid: 'PID123456', productNameEn: 'Bed', bigImage: 'https://cj/a.jpg', productImage: JSON.stringify(['https://cj/a.jpg', 'https://cj/b.jpg', 'http://inseguro/c.jpg']) } });
    const { query, variables } = JSON.parse(o.body); gq.push({ query, variables });
    if (query.includes('shop {')) return res({ data: { shop: { name: 'L' } } });
    if (query.includes('products(first: 1')) return res({ data: { products: { nodes: jaExiste ? [{ id: 'gid://shopify/Product/9', title: 'x' }] : [] } } });
    if (query.includes('productCreate')) return res({ data: { productCreate: { product: { id: 'gid://shopify/Product/55', variants: { nodes: [{ id: 'gid://shopify/ProductVariant/77' }] } }, userErrors: [] } } });
    if (query.includes('productVariantsBulkUpdate')) return res({ data: { productVariantsBulkUpdate: { userErrors: [] } } });
    if (query.includes('collections(')) return res({ data: { collections: { nodes: [{ id: 'gid://shopify/Collection/1', title: 'Cães' }, { id: 'gid://shopify/Collection/2', title: 'Gatos' }] } } });
    if (query.includes('collectionAddProducts')) return res({ data: { collectionAddProducts: { userErrors: [] } } });
    throw new Error('consulta inesperada ' + query);
  };
  try {
    await guardarLoja(env, { loja: 'bfstxp-0s.myshopify.com', token: 'shpat_0123456789abcdef0123' });
    const r = await enviarProduto(env, { pid: 'PID123456', titulo: 'Cama Quente', preco: 35.9, tipo: 'Cães' });
    assert.equal(r.ok, true);
    assert.equal(r.fotos, 2);
    assert.deepEqual(r.avisos, []);
    assert.equal(r.admin, 'https://admin.shopify.com/store/bfstxp-0s/products/55');
    const cri = gq.find((x) => x.query.includes('productCreate'));
    assert.equal(cri.variables.product.status, 'DRAFT');
    assert.deepEqual(cri.variables.product.tags, ['cj-PID123456', 'Cães']);
    assert.equal(cri.variables.media.length, 2);
    assert.equal(gq.find((x) => x.query.includes('productVariantsBulkUpdate')).variables.variants[0].price, '35.90');
    assert.equal(gq.find((x) => x.query.includes('collectionAddProducts')).variables.id, 'gid://shopify/Collection/1');
    jaExiste = true;
    const d = await enviarProduto(env, { pid: 'PID123456', titulo: 'Cama', preco: 30, tipo: 'Gatos' });
    assert.equal(d.erro, 'ja_enviado');
    assert.equal((await enviarProduto(env, { pid: 'PID123456', titulo: '', preco: 30 })).erro, 'dados');
    assert.equal((await enviarProduto(env, { pid: '../x', titulo: 'a', preco: 30 })).erro, 'pid');
  } finally { globalThis.fetch = original; }
});

test('listar produtos e erro de permissão', async () => {
  const original = globalThis.fetch; const env = banco(); let negar = false;
  globalThis.fetch = async (u, o) => {
    const { query } = JSON.parse(o.body);
    if (query.includes('shop {')) return res({ data: { shop: { name: 'L' } } });
    if (negar) return res({ errors: [{ message: 'Access denied for products field. Required access: read_products' }] });
    return res({ data: { products: { nodes: [{ id: 'gid://shopify/Product/5', title: 'Cama', status: 'DRAFT', tags: ['cj-P1', 'Cães'], featuredMedia: { preview: { image: { url: 'https://x/f.jpg' } } }, priceRangeV2: { minVariantPrice: { amount: '35.9' } } }] } } });
  };
  try {
    await guardarLoja(env, { loja: 'bfstxp-0s.myshopify.com', token: 'shpat_0123456789abcdef0123' });
    const r = await listarProdutos(env);
    assert.equal(r.produtos[0].status, 'DRAFT');
    assert.equal(r.produtos[0].cj, 'P1');
    assert.equal(r.produtos[0].preco, 35.9);
    negar = true;
    assert.equal((await listarProdutos(env)).erro, 'sem_permissao');
  } finally { globalThis.fetch = original; }
});

test('fotos: lista de todos os produtos e apaga em lote só ids válidos', async () => {
  const { listarFotos, apagarFotos } = await import('../src/shopify.js');
  const original = globalThis.fetch; const env = banco(); const apagados = [];
  globalThis.fetch = async (u, o) => {
    const { query, variables } = JSON.parse(o.body);
    if (query.includes('shop {')) return res({ data: { shop: { name: 'L' } } });
    if (query.includes('media(first: 30)')) return res({ data: { products: { nodes: [{ id: 'gid://shopify/Product/1', title: 'Cama', status: 'DRAFT', media: { nodes: [{ id: 'gid://shopify/MediaImage/10', image: { url: 'https://cdn/a.jpg' } }, {}] } }] } } });
    if (query.includes('productDeleteMedia')) { apagados.push(...variables.m); return res({ data: { productDeleteMedia: { deletedMediaIds: variables.m, mediaUserErrors: [] } } }); }
    throw new Error('inesperada');
  };
  try {
    await guardarLoja(env, { loja: 'bfstxp-0s.myshopify.com', token: 'shpat_0123456789abcdef0123' });
    const f = await listarFotos(env);
    assert.deepEqual(f.fotos, [{ produto: 'gid://shopify/Product/1', titulo: 'Cama', status: 'DRAFT', media: 'gid://shopify/MediaImage/10', url: 'https://cdn/a.jpg' }]);
    const r = await apagarFotos(env, [{ produto: 'gid://shopify/Product/1', media: 'gid://shopify/MediaImage/10' }, { produto: 'gid://shopify/Product/1', media: 'gid://shopify/MediaImage/11' }]);
    assert.deepEqual(r, { ok: true, apagadas: 2, falhas: 0 });
    assert.deepEqual(apagados, ['gid://shopify/MediaImage/10', 'gid://shopify/MediaImage/11']);
    assert.equal((await apagarFotos(env, [{ produto: 'x', media: 'y' }])).erro, 'dados');
    assert.equal((await apagarFotos(env, [])).erro, 'dados');
  } finally { globalThis.fetch = original; }
});
