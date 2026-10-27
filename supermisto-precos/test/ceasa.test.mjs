import { test } from 'node:test';
import assert from 'node:assert/strict';
import { custoKgPronto, caixaAtual, lerLinha, lerCotacao, analisarProduto, analisarKit, faltando, somaUso, norm, avaliarCompra, semaforo } from '../public/ceasa.js';

const cfg = { taxa_pct: 20, taxa_fixa: 4.5, imposto_pct: 6, lucro_min: 2 };
const tomate = { id: 'tomate-seco-desidratado', nome: 'Tomate seco', palavras: 'tomate', exclui: 'cereja', perda_pct: 5, rendimento_pct: 10, secagem_kg: 0, caixa_kg: 20, preco_caixa: 80, gramas_venda: 200 };
const emb = [
  { id: 'saquinho', nome: 'Saquinho', uso: 'pacote', preco: 80, quantidade: 1000 },
  { id: 'solapa', nome: 'Solapa', uso: 'pacote', preco: 60, quantidade: 1000 },
  { id: 'envio', nome: 'Envio', uso: 'envio', preco: 50, quantidade: 100 },
  { id: 'caixa', nome: 'Caixa kit', uso: 'kit', preco: 100, quantidade: 100 },
];

test('caixa de 20 kg a R$ 80 vira R$ 4/kg fresco e R$ 42,11/kg pronto (5% de perda, 10% de rendimento)', () => {
  const k = custoKgPronto(tomate);
  assert.equal(k.frescoKg, 4);
  assert.equal(k.prontoKg, 42.11);
  assert.equal(k.kgProntoPorCaixa, 1.9);
});

test('o que o dono pagou passa na frente da cotação', () => {
  const p = { ...tomate, pago_caixa: 60, pago_caixa_kg: 20, pago_em: '2026-10-27' };
  assert.equal(caixaAtual(p).origem, 'pago');
  assert.equal(custoKgPronto(p).frescoKg, 3);
  assert.equal(caixaAtual({ ...tomate, preco_caixa: null }), null);
});

test('secagem entra no custo do quilo pronto', () => {
  assert.equal(custoKgPronto({ ...tomate, secagem_kg: 5 }).prontoKg, 47.11);
});

test('embalagens: custo de cada unidade e o que ainda falta preencher', () => {
  assert.equal(somaUso(emb, 'pacote'), 0.14);
  assert.equal(somaUso(emb, 'envio'), 0.5);
  assert.deepEqual(faltando([...emb, { nome: 'Etiqueta', uso: 'pacote', preco: null, quantidade: null }]), ['Etiqueta']);
});

test('lê linhas da cotação: caixa de 20 kg, preço mínimo/comum/máximo', () => {
  const l = lerLinha('TOMATE ITALIANO  CX 20 KG  58,00  65,00  72,00');
  assert.equal(l.unidade, 'cx'); assert.equal(l.kg_unidade, 20); assert.equal(l.preco, 65);
  const k = lerLinha('BANANA PRATA  KG  3,50');
  assert.equal(k.kg_unidade, 1); assert.equal(k.preco, 3.5);
  assert.equal(lerLinha('CEBOLA  sem preço'), null);
  assert.equal(lerLinha('ALHO  1.250,00')?.preco, 1250);
});

test('cotação: acha só os nossos produtos e respeita as palavras que excluem', () => {
  const prods = [tomate, { id: 'alho', nome: 'Alho', palavras: 'alho', exclui: 'poro,porro', perda_pct: 20, rendimento_pct: 35 }];
  const t = 'CEAGESP 27/10/2026\nTOMATE SALADA CX 20KG 60,00 70,00 80,00\nTOMATE CEREJA BD 2,00 3,00\nALHO-PORO MC 4,00\nALHO NACIONAL KG 22,50\nMELANCIA KG 2,00';
  const r = lerCotacao(t, prods);
  assert.equal(r.data, '2026-10-27');
  assert.equal(r.achados[tomate.id].length, 1);
  assert.equal(r.achados[tomate.id][0].preco, 70);
  assert.equal(r.achados.alho.length, 1);
  assert.equal(r.achados.alho[0].preco, 22.5);
  assert.equal(norm('Pimentão'), 'pimentao');
});

test('pacote de 200 g: custo, sobra e até quanto pode custar a caixa', () => {
  // caixa a R$ 80 (R$ 4/kg fresco): o tomate seco de 200 g custa R$ 8,42 e a R$ 17,90 dá prejuízo
  const caro = analisarProduto({ ...tomate, preco_venda: 17.9 }, 200, emb, cfg, 0, []);
  assert.equal(caro.custo.materia, 8.42);
  assert.equal(caro.custo.embalagem, 0.64);
  assert.equal(caro.sobra, -0.31); // 17,90 − 26% (Shopee+imposto) − 4,50 − 9,06
  assert.equal(caro.ok, false); assert.equal(caro.caixaOk, false);
  assert.ok(caro.tetoCaixa < 80);
  // caixa a R$ 40 (R$ 2/kg): sobra lucro e a compra compensa
  const bom = analisarProduto({ ...tomate, preco_caixa: 40, preco_venda: 17.9 }, 200, emb, cfg, 0, []);
  assert.equal(bom.custo.materia, 4.21);
  assert.equal(bom.sobra, 3.9);
  assert.equal(bom.ok, true); assert.equal(bom.caixaOk, true);
  assert.ok(bom.tetoCaixa > 40);
});

test('sem concorrente o sistema sugere; com concorrente fica abaixo dele se o mínimo deixar', () => {
  const semConc = analisarProduto(tomate, 200, emb, cfg, 0, []);
  assert.equal(semConc.situacao, 'sem_concorrente');
  const conc = [{ produto_id: tomate.id, gramas: 200, preco: 25, loja: 'X' }];
  const com = analisarProduto(tomate, 200, emb, cfg, 0, conc);
  assert.ok(com.preco < 25);
  assert.equal(com.concorrentes, 1);
});

test('extra do frete grátis diminui a sobra', () => {
  const a0 = analisarProduto({ ...tomate, preco_venda: 17.9 }, 200, emb, cfg, 0, []);
  const a6 = analisarProduto({ ...tomate, preco_venda: 17.9 }, 200, emb, cfg, 6, []);
  assert.ok(a6.sobra < a0.sobra);
});

test('kit: conta completa e lucro do mês', () => {
  const cebola = { ...tomate, id: 'cebola', nome: 'Cebola', caixa_kg: 20, preco_caixa: 40, perda_pct: 15, rendimento_pct: 10 };
  const kit = { itens: [{ produto_id: tomate.id, gramas: 100 }, { produto_id: 'cebola', gramas: 100 }], preco: 39.9, vendas_mes: 10 };
  const r = analisarKit(kit, [tomate, cebola], emb, cfg, 0, { [tomate.id]: 17.9, cebola: 14.9 });
  assert.equal(r.itens.length, 2);
  assert.equal(r.embPacotes, 0.28);
  assert.equal(r.embKit, 1);
  assert.equal(r.shopee, 12.48);
  assert.equal(r.imposto, 2.39);
  assert.ok(Math.abs(r.sobra - (r.preco - r.shopee - r.imposto - r.custo)) < 0.011);
  assert.equal(r.sobraMes, Math.round(r.sobra * 10 * 100) / 100);
  assert.ok(r.economia >= 0);
  const sem = analisarKit({ itens: [{ produto_id: 'x', gramas: 100 }], preco: 20 }, [tomate], emb, cfg, 0);
  assert.deepEqual(sem.semPreco, ['x']);
});

test('boletim da Ceasa-RJ: usa o preço modal, tira a variação % e acha só os nossos produtos', () => {
  const t = [
    'Dia Semana:   terça-feira   27/10/2026',
    'TOMATE ITALIANO              Cx 20 kg      81,48%    200,00    210,00    220,00',
    'TOMATE CEREJA                Cx 2 kg / 4 unid   12,90%  20,00  25,00  30,00',
    'CEBOLA NACIONAL   Branca     Sc 20 kg     145,85%    110,00    120,00    130,00',
    'BANANA MAÇÃ       Extra      Cx 20 kg       0,00%    110,00    120,00    130,00',
    'MAÇÃ NACIONAL     Gala       Cx 18 kg     -22,02%    130,00    140,00    150,00',
    'BANANA PRATA      Extra      Cx 20 kg     -11,98%     60,00     70,00     75,00',
    'ABACAXI ANANÁS    Grande     Unid 2,5 kg    S/C',
    'LISCHIA                      Cx 4 kg          2,82   140,00    150,00    160,00',
  ].join('\n');
  const prods = [
    { id: 't', palavras: 'tomate', exclui: 'cereja' }, { id: 'c', palavras: 'cebola', exclui: 'cebolinha' },
    { id: 'm', palavras: 'maca', exclui: 'banana' }, { id: 'b', palavras: 'banana', exclui: '' },
  ];
  const r = lerCotacao(t, prods);
  assert.equal(r.achados.t.length, 1);
  assert.deepEqual([r.achados.t[0].preco, r.achados.t[0].min, r.achados.t[0].max, r.achados.t[0].kg_unidade, r.achados.t[0].var12], [210, 200, 220, 20, 81.48]);
  assert.equal(r.achados.c[0].preco, 120);
  assert.equal(r.achados.m.length, 1); assert.equal(r.achados.m[0].preco, 140); // "BANANA MAÇÃ" não vira maçã
  assert.equal(r.achados.b.length, 2); // BANANA MAÇÃ (variedade de banana) e BANANA PRATA
  assert.equal(lerLinha('LISCHIA  Cx 4 kg  2,82  140,00  150,00  160,00').preco, 150);
  assert.equal(lerLinha('ABACAXI ANANÁS  Unid 2,5 kg  S/C'), null);
});

test('vários candidatos: o mais barato por kg vem primeiro', () => {
  const r = lerCotacao('CEBOLA IMPORTADA Roxa Sc 20 kg 170,00 180,00 185,00\nCEBOLA NACIONAL Branca Sc 20 kg 110,00 120,00 130,00', [{ id: 'c', palavras: 'cebola', exclui: '' }]);
  assert.equal(r.achados.c[0].preco, 120);
});

const hist = (id, dias) => dias.map(([data, preco_kg]) => ({ produto_id: id, tipo: 'tabela', data, preco_kg, var12: null }));
test('vou comprar hoje: compara com os últimos dias', () => {
  const p = { ...tomate, preco_caixa: 40, caixa_kg: 20 }; // R$ 2/kg
  const ok = { semPreco: false, caixaOk: true, tetoCaixa: 100 };
  const h = hist(p.id, [['2026-10-24', 2.2], ['2026-10-25', 2.3], ['2026-10-26', 2.4]]);
  assert.equal(avaliarCompra(p, h, ok, 7, '2026-10-27').nivel, 'bom');
  assert.equal(avaliarCompra({ ...p, preco_caixa: 46 }, h, ok, 7, '2026-10-27').nivel, 'normal');
  assert.equal(avaliarCompra({ ...p, preco_caixa: 60 }, h, ok, 7, '2026-10-27').nivel, 'caro');
  // barato, mas a caixa não cabe no preço de venda: continua "caro"
  assert.equal(avaliarCompra(p, h, { semPreco: false, caixaOk: false, tetoCaixa: 30 }, 7, '2026-10-27').nivel, 'caro');
  // sem dias para comparar usa a variação de 12 meses do boletim
  assert.equal(avaliarCompra(p, [{ produto_id: p.id, tipo: 'tabela', data: '2026-10-27', preco_kg: 2, var12: 81 }], ok, 7, '2026-10-27').nivel, 'caro');
  assert.equal(avaliarCompra(p, [{ produto_id: p.id, tipo: 'tabela', data: '2026-10-27', preco_kg: 2, var12: -20 }], ok, 7, '2026-10-27').nivel, 'bom');
  assert.equal(avaliarCompra({ ...p, preco_caixa: null }, [], ok).nivel, 'sem_dados');
});

test('semáforo: 1 caro é amarelo, 2 ou mais caros é vermelho, nenhum é verde', () => {
  const mk = (id, preco) => ({ ...tomate, id, nome: id, preco_caixa: preco, caixa_kg: 20 });
  const P = [mk('a', 40), mk('b', 40), mk('c', 40), mk('d', 40), mk('e', 40)];
  const H = P.flatMap((p) => hist(p.id, [['2026-10-25', 2], ['2026-10-26', 2]]));
  const ok = P.map(() => ({ semPreco: false, caixaOk: true, tetoCaixa: 999 }));
  assert.equal(semaforo(P, H, ok, 10, '2026-10-27').nivel, 'verde');
  const um = P.map((p) => (p.id === 'a' ? { ...p, preco_caixa: 80 } : p));
  const s1 = semaforo(um, H, ok, 10, '2026-10-27');
  assert.equal(s1.nivel, 'amarelo'); assert.deepEqual(s1.esperar, ['a']);
  const dois = P.map((p) => (['a', 'b'].includes(p.id) ? { ...p, preco_caixa: 80 } : p));
  const s2 = semaforo(dois, H, ok, 10, '2026-10-27');
  assert.equal(s2.nivel, 'vermelho'); assert.equal(s2.caros, 2); assert.deepEqual(s2.comprar, ['c', 'd', 'e']);
  assert.equal(semaforo([{ ...tomate, preco_caixa: null }], [], [{ semPreco: true }], 10).nivel, 'sem_dados');
});
