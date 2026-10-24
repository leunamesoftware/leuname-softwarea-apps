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
  assert.equal(custoFormato(kit10, 0.02, cfg), 2 + 10 * (cfg.emb_sache + cfg.etiqueta) + cfg.emb_kit);
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
  assert.deepEqual(r.itens[0], { anuncio: 'Colorau 10g kit 10', produto_id: 'colorau', unidades: null, gramas_unidade: null, gramas: 100, preco: 12.9, vendidos: 1200, loja: 'Casa X' });
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

test('ranking e estratégia: iguala o mais vendido e calcula o brinde', async () => {
  const { ranking, estrategia } = await import('../public/precos.js');
  const r = ranking([{ preco: 33, gramas: 1000, vendidos: 8000 }, { preco: 20, gramas: 1000, vendidos: 2000 }]);
  assert.equal(r.vendas[0].preco, 33); assert.equal(r.precos[0].preco, 20);
  const e = estrategia(r.vendas[0], { gramas: 1000, custo: 15, minimo: 26 }, 0.8, cfg);
  assert.equal(e.preco, 32.9); assert.ok(e.pode); assert.ok(e.brinde && e.brinde.sobra > 2);
});

test('lado a lado: kit de 30 sachês de 30 g a R$ 33 vira 31,99 com o mesmo kit', async () => {
  const { espelho, abaixo99 } = await import('../public/precos.js');
  assert.equal(abaixo99(33), 31.99); assert.equal(abaixo99(28.7), 26.99);
  const e = espelho({ preco: 33, unidades: 30, gramas_unidade: 30, gramas: 900 }, 0.01, { ...cfg, emb_50: 0.1, etiqueta: 0 });
  assert.equal(e.un, 30); assert.equal(e.g, 30); assert.equal(e.preco, 31.99);
  assert.equal(e.custo, 30 * (0.3 + 0.1) + cfg.emb_kit);
  assert.equal(e.unidadeDele, 1.1);
});

test('leitura calcula o total pelas unidades', () => {
  const r = lerResposta('{"itens":[{"anuncio":"Kit 30 sachês 30g","produto":"colorau","unidades":30,"gramas_unidade":30,"preco":33}]}', ['colorau']);
  assert.equal(r.itens[0].gramas, 900); assert.equal(r.itens[0].unidades, 30); assert.equal(r.itens[0].gramas_unidade, 30);
});

test('mesmo 1 kg em montagens diferentes: compara preço por kg e escolhe a que mais sobra', async () => {
  const { montagensPorPeso, pesoRedondo } = await import('../public/precos.js');
  assert.equal(pesoRedondo(900), 1000); assert.equal(pesoRedondo(1000), 1000); assert.equal(pesoRedondo(700), null);
  const lista = [
    { preco: 28.7, unidades: 10, gramas_unidade: 100, vendidos: 7000 },
    { preco: 33, unidades: 20, gramas_unidade: 50, vendidos: 9000 },
  ];
  const [g] = montagensPorPeso(lista, 0.008, cfg);
  assert.equal(g.peso, 1000); assert.equal(g.linhas.length, 2);
  assert.equal(g.linhas[0].un, 20); assert.equal(g.linhas[0].porKg, 33);
  assert.ok(g.melhor);
});

test('alerta de peso a menos e jogada com o quilo completo', async () => {
  const { montagensPorPeso } = await import('../public/precos.js');
  const [g] = montagensPorPeso([
    { preco: 28.7, unidades: 10, gramas_unidade: 100, vendidos: 7000 },
    { preco: 33.98, unidades: 30, gramas_unidade: 30, vendidos: 5000 },
  ], 0.008, cfg);
  assert.equal(g.faltando.length, 1); assert.equal(g.faltando[0].falta, 100);
  assert.equal(g.ideia.un, 30); assert.equal(g.ideia.g, 34); assert.equal(g.ideia.preco, 31.99);
});

test('anúncio pronto: título até 120, kit de 1 kg completo e frete', async () => {
  const { gerarAnuncio, frete } = await import('../public/anuncios.js');
  const a = gerarAnuncio({ produto: { id: 'sortido', nome: 'Kit Sortido' }, un: 30, g: 34, preco: 31.99, brinde: true });
  assert.ok(a.titulo.length <= 120); assert.match(a.titulo, /30 Sachês de 34g = 1,02 kg Completo/); assert.match(a.titulo, /Brinde/);
  assert.match(a.descricao, /30 sachês de 34 g/); assert.doesNotMatch(a.descricao, /CNPJ/); assert.ok(a.descricao.split('\n').length <= 7);
  assert.equal(a.foto[0], '30 SACHÊS = 1,02 KG COMPLETO');
  assert.deepEqual(frete(30, 34).caixa, [25, 20, 8]);
  const c = gerarAnuncio({ produto: { id: 'colorau', nome: 'Colorau' }, un: 10, g: 10, preco: 19.99 });
  assert.match(c.titulo, /^Colorau 10 Sachês de 10g = 100 g 100% Natural Sem Conservantes Supermisto$/);
});

test('conta do kit: Shopee, imposto, tempero, saquinhos e sobra', async () => {
  const { contaKit } = await import('../public/precos.js');
  const k = contaKit(26.99, 10, 100, 0.01, cfg);
  assert.equal(k.shopee, Math.round((26.99 * 0.2 + 4.5) * 100) / 100);
  assert.equal(k.imposto, Math.round(26.99 * 0.06 * 100) / 100);
  assert.equal(k.tempero, 10); assert.equal(k.saquinhos, 10 * (cfg.emb_100 + cfg.etiqueta));
  assert.ok(Math.abs(k.sobra - (26.99 - k.shopee - k.imposto - 10 - k.saquinhos - cfg.emb_kit)) < 0.02);
});
