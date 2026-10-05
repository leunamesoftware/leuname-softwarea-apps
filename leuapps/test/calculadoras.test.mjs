import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// As contas das calculadoras do Gestacell ficam entre CALC-INICIO e CALC-FIM no index.html.
const html = readFileSync(new URL('../public/gestacell/index.html', import.meta.url), 'utf8');
const bloco = html.slice(html.indexOf('/* CALC-INICIO'), html.indexOf('/* CALC-FIM */'));
const C = new Function(bloco + '; return { CALC_TAXAS_PADRAO, calcNoCartao, calcArredondar, calcConserto, calcParcelas, calcVenda };')();
const T = C.CALC_TAXAS_PADRAO;

test('no cartão: cobrando o valor da tabela, sobra exatamente o que se queria', () => {
  const total = C.calcNoCartao(200, 4.99);
  assert.ok(Math.abs(total * (1 - 0.0499) - 200) < 0.01);
  for (const l of C.calcParcelas(150, 'receber', T)) assert.ok(Math.abs(l.total * (1 - l.taxa / 100) - 150) < 0.01, l.nome);
  assert.equal(C.calcParcelas(150, 'receber', T).length, 13);
});

test('conserto: peça + lucro + mão de obra + reserva, arredondado para cima', () => {
  const r = C.calcConserto({ peca: '100', outros: '10', maoObra: '80', lucroPecaPct: '30', reservaPct: '5', impostoPct: '0', arredondar: false }, T);
  assert.equal(r.vista, 231); // (100+10+30+80) * 1,05
  assert.equal(r.ganho, 110); // lucro na peça + mão de obra
  const a = C.calcConserto({ peca: '100', outros: '10', maoObra: '80', lucroPecaPct: '30', reservaPct: '5', arredondar: true }, T);
  assert.equal(a.vista, 235);
  assert.ok(a.credito[11].total > a.debito && a.debito > a.vista);
  assert.equal(C.calcArredondar(47.2), 48);
  assert.equal(C.calcArredondar(50), 50);
});

test('conserto com imposto: o imposto sai do preço e o ganho continua o mesmo', () => {
  const r = C.calcConserto({ peca: '100', maoObra: '100', lucroPecaPct: '0', reservaPct: '0', impostoPct: '6' }, T);
  assert.ok(Math.abs(r.vista * 0.94 - 200) < 0.01);
  assert.ok(Math.abs(r.ganho - 100) < 0.02);
});

test('venda: lucro real, preço mínimo e preço sugerido', () => {
  const r = C.calcVenda({ custo: '1000', outros: '20', preco: '1200', forma: '10', impostoPct: '0', lucroDesejadoPct: '20' }, T);
  assert.equal(r.taxaPct, T.credito[9]);
  assert.ok(Math.abs(r.lucro - (1200 - 1020 - 1200 * T.credito[9] / 100)) < 0.01);
  assert.ok(Math.abs(r.minimo * (1 - T.credito[9] / 100) - 1020) < 0.01);
  const s = C.calcVenda({ custo: '1000', outros: '20', preco: String(r.sugerido), forma: '10', lucroDesejadoPct: '20' }, T);
  assert.ok(Math.abs(s.margem - 20) < 0.01);
  assert.equal(C.calcVenda({ custo: '', preco: '' }, T).lucro, 0);
});

test('taxas de exemplo: 12 parcelas e nenhum número com 13', () => {
  assert.equal(T.credito.length, 12);
  assert.ok(![T.debito, ...T.credito].some((t) => String(t).includes('13')));
});
