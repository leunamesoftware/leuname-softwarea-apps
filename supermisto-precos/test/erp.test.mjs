import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { pedidoValido, itensDoPedido, sugerirLigacao, marcar } from '../src/erp.js';
import { assinar } from '../src/shopee.js';

const skus = [
  { id: 'KIT15-10G', nome: 'Kit 15 Temperos', shopee_item_id: 111, shopee_model_id: 0 },
  { id: 'COLORAU-50G', nome: 'Colorau 50 g', shopee_item_id: 222, shopee_model_id: 7 },
];

test('assinatura da Shopee igual ao HMAC-SHA256 da documentação', async () => {
  const esperado = createHmac('sha256', 'chave').update('123/api/v2/product/update_price1700000000tokenABC999').digest('hex');
  assert.equal(await assinar('123', 'chave', '/api/v2/product/update_price', 1700000000, 'tokenABC', '999'), esperado);
});

test('só tira do estoque pedido pago e não cancelado', () => {
  assert.equal(pedidoValido('READY_TO_SHIP'), true);
  assert.equal(pedidoValido('COMPLETED'), true);
  assert.equal(pedidoValido('UNPAID'), false);
  assert.equal(pedidoValido('CANCELLED'), false);
});

test('itens do pedido acham o SKU pelo código ou pelo anúncio ligado', () => {
  const r = itensDoPedido({ item_list: [
    { item_id: 111, model_id: 0, item_name: 'Kit 15', model_quantity_purchased: 2, model_discounted_price: 29.9 },
    { item_id: 999, model_id: 1, item_name: 'Outro', model_sku: 'colorau-50g', model_quantity_purchased: 1 },
    { item_id: 555, model_id: 0, item_name: 'Sem ligação', model_quantity_purchased: 1 },
  ] }, skus);
  assert.deepEqual(r.map((i) => [i.sku, i.qtd]), [['KIT15-10G', 2], ['COLORAU-50G', 1], [null, 1]]);
});

test('sugere a ligação pelo SKU escrito no anúncio', () => {
  assert.equal(sugerirLigacao({ sku: ' kit15-10g ' }, skus).id, 'KIT15-10G');
  assert.equal(sugerirLigacao({ sku: '' }, skus), null);
});

test('marca o que falta mandar sem perder o que já estava', () => {
  assert.deepEqual(JSON.parse(marcar('{"preco":1}', 'estoque')), { preco: 1, estoque: 1 });
  assert.deepEqual(JSON.parse(marcar(null, 'fotos')), { fotos: 1 });
});
