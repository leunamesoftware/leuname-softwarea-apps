import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularReceita, converter, precoRedondo } from '../public/app/calculo.js';

test('converte medidas da mesma família e caseiras com densidade', () => {
  assert.equal(converter(500, 'ml', 'L'), 0.5);
  assert.equal(converter(2, 'kg', 'g'), 2000);
  assert.equal(converter(1, 'xícara', 'g', 'Açúcar'), 204);
  assert.equal(converter(10, 'un', 'g', 'Ovo'), null);
  assert.equal(converter(1, 'xícara', 'g', 'Ingrediente desconhecido'), null);
});

test('óleo: 50 ml de um litro de R$ 6 custa R$ 0,30 e sobram 950 ml', () => {
  const r = calcularReceita({ itens: [{ nome: 'Óleo', qtd: 50, unidade: 'ml', emb: { qtd: 1, unidade: 'L', preco: 6 } }], unidades: 10 });
  assert.equal(r.itens[0].custo, 0.3);
  assert.equal(Math.round(r.itens[0].sobra * 1000), 950);
  assert.equal(r.compras.totalPago, 6);
  assert.equal(r.compras.sobraValor, 5.7);
});

test('soma gás, embalagens, sugere preços e calcula lucro', () => {
  const r = calcularReceita({
    itens: [
      { nome: 'Açúcar', qtd: 400, unidade: 'g', emb: { qtd: 1, unidade: 'kg', preco: 5 } },
      { nome: 'Leite condensado', qtd: 197, unidade: 'g', emb: { qtd: 395, unidade: 'g', preco: 7.9 } },
    ],
    gas: { minutos: 60, chama: 'media', precoBotijao: 130 },
    unidades: 20, embalagemPorUnidade: 0.25, precoVenda: 2.5, metaMensal: 600,
  });
  assert.equal(r.custoIngredientes, 5.94);
  assert.equal(r.custoGas, 1.5);
  assert.equal(r.custoEmbalagens, 5);
  assert.equal(r.custoTotal, 12.44);
  assert.equal(r.custoUnidade, 0.62);
  assert.deepEqual(r.sugestoes.map((s) => s.preco), [1.5, 2, 2]);
  assert.equal(r.venda.lucroTotal, 37.56);
  assert.equal(r.venda.unidadesParaMeta, 320);
});

test('escala dobra ingredientes e acusa falta de estoque', () => {
  const r = calcularReceita({ escala: 2, itens: [{ nome: 'Coco ralado', qtd: 350, unidade: 'g', emb: { qtd: 500, unidade: 'g', preco: 20 }, restante: 500 }], unidades: 40 });
  assert.equal(r.itens[0].custo, 28);
  assert.equal(r.itens[0].falta, true);
});

test('item sem preço não quebra o cálculo', () => {
  const r = calcularReceita({ itens: [{ nome: 'Cravo', qtd: 2, unidade: 'g', emb: {} }], unidades: 5 });
  assert.equal(r.itens[0].erro, 'preco');
  assert.equal(r.custoTotal, 0);
});

test('preço redondo sobe de 50 em 50 centavos', () => {
  assert.equal(precoRedondo(1.01), 1.5);
  assert.equal(precoRedondo(2), 2);
});
