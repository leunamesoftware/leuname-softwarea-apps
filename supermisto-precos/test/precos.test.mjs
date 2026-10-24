import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_PADRAO as cfg, FORMATOS, acima90, abaixo90, custoPorGrama, custoFormato, precoMinimo, lucro, sugerir } from '../public/precos.js';
import { lerResposta } from '../src/leitura.js';

const insumos = [{ nome: 'Colorau', preco_kg: 20 }, { nome: 'Sal', preco_kg: 3 }];
const kit10 = FORMATOS.find((f) => f.id === 'kit10');

test('custo por grama segue a receita', () => {
  assert.equal(custoPorGrama({ receita: [{ insumo: 'Colorau', pct: 100 }] }, insumos), 0.02);
  assert.equal(custoPorGrama({ receita: [{ insumo: 'Colorau', pct: 50 }, { insumo: 'Sal', pct: 50 }] }, insumos), 0.0115);
});

test('custo do kit 10: 100 g + 10 sachês com etiqueta + saquinho do kit', () => {
  assert.equal(custoFormato(kit10, 0.02, cfg), 2 + 3.5 + 1 + 0.5);
});

test('preço mínimo paga taxa e lucro', () => {
  const m = precoMinimo(6, cfg);
  assert.ok(Math.abs(lucro(m, 6, cfg) - cfg.lucro_min) < 0.02);
});

test('arredonda em ,90', () => {
  assert.equal(acima90(18.3), 18.9); assert.equal(acima90(18.95), 19.9); assert.equal(acima90(18.9), 18.9);
  assert.equal(abaixo90(19.5), 18.9); assert.equal(abaixo90(19.9), 19.9);
});

test('fica 3% abaixo do mais barato quando dá lucro', () => {
  const s = sugerir(kit10, 0.02, cfg, [{ gramas: 100, preco: 30 }, { gramas: 100, preco: 40 }]);
  assert.equal(s.situacao, 'mais_barato'); assert.equal(s.preco, 28.9); assert.ok(s.lucro >= cfg.lucro_min);
});

test('não vende abaixo do mínimo', () => {
  const s = sugerir(kit10, 0.02, cfg, [{ gramas: 100, preco: 8 }]);
  assert.equal(s.situacao, 'acima'); assert.ok(s.lucro >= cfg.lucro_min);
});

test('sem concorrente: mínimo + 15%', () => {
  const s = sugerir(kit10, 0.02, cfg, []);
  assert.equal(s.situacao, 'sem_concorrente'); assert.ok(s.preco >= s.minimo * 1.15);
});

test('lê a resposta da IA com texto em volta e números brasileiros', () => {
  const r = lerResposta('Aqui está:\n```json\n{"loja":"Casa X","itens":[{"anuncio":"Colorau 10g kit 10","produto":"colorau","gramas_total":"100 g","preco":"R$ 12,90","vendidos":"1,2mil"}]}\n```', ['colorau']);
  assert.equal(r.loja, 'Casa X');
  assert.deepEqual(r.itens[0], { anuncio: 'Colorau 10g kit 10', produto_id: 'colorau', gramas: 100, preco: 12.9, vendidos: 1200, loja: 'Casa X' });
});

test('produto desconhecido vira nulo e item sem preço é descartado', () => {
  const r = lerResposta('{"itens":[{"anuncio":"Sal grosso","produto":"sal","gramas_total":1000,"preco":5},{"anuncio":"x","produto":"colorau","gramas_total":10}]}', ['colorau']);
  assert.equal(r.itens.length, 1); assert.equal(r.itens[0].produto_id, null);
});

test('junta vários objetos JSON que a IA manda separados', () => {
  const r = lerResposta('```json\n{"loja":"A","itens":[{"anuncio":"Kit 10 temperos 100g","produto":"sortido","gramas_total":1000,"preco":28.7}]}\n,\n{"loja":"B","itens":[{"anuncio":"Colorau","produto":"colorau","gramas_total":100,"preco":"9,90"}]}```', ['colorau', 'sortido']);
  assert.equal(r.itens.length, 2); assert.equal(r.itens[0].loja, 'A'); assert.equal(r.itens[1].loja, 'B'); assert.equal(r.itens[1].preco, 9.9);
});

test('perda na moagem: 2 kg por R$ 20 que rendem 1 kg = R$ 20 o kg', async () => {
  const { precoKgReal } = await import('../public/precos.js');
  assert.equal(precoKgReal(20, 2, 1), 20);
  assert.equal(precoKgReal(20, 2, null), 10);
  assert.equal(precoKgReal(20, null, null), null);
});

test('mercado: alerta quando o mais vendido é mais caro', async () => {
  const { analisarMercado } = await import('../public/precos.js');
  const conc = [
    { anuncio: 'A', gramas: 1000, preco: 33, vendidos: 5000 },
    { anuncio: 'B', gramas: 1000, preco: 20, vendidos: 2000 },
  ];
  const meus = [{ formato: 'kit10x100', nome: 'Kit 1 kg', gramas: 1000, minimo: 30 }];
  const kg = analisarMercado(conc, meus).find((f) => f.id === 'f1000');
  assert.equal(kg.maisVendido.anuncio, 'A'); assert.equal(kg.maisBarato.anuncio, 'B');
  assert.ok(kg.alertas.some((a) => a.tipo === 'info')); assert.ok(kg.alertas.some((a) => a.tipo === 'bom'));
});
