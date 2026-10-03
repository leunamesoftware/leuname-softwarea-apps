import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estatisticaRendimento, rendimentoPlausivel } from '../src/rendimento.js';

const receita = { rendimento: { unidades: 25, faixa: [20, 30] } };

test('com menos de 5 resultados mostra a estimativa inicial', () => {
  const s = estatisticaRendimento(receita, [{ unidadesBase: 40 }]);
  assert.deepEqual(s, { tipo: 'inicial', registros: 1, min: 20, max: 30, tipico: 25 });
});

test('com 5 ou mais usa a faixa real (percentis 10 a 90) e o peso médio', () => {
  const regs = [20, 30, 25, 50, 22, 28].map((u) => ({ unidadesBase: u, pesoUnidadeG: 35 }));
  const s = estatisticaRendimento(receita, regs);
  assert.equal(s.tipo, 'comunidade');
  assert.equal(s.registros, 6);
  assert.equal(s.min, 20);
  assert.equal(s.max, 50);
  assert.equal(s.tipico, 25);
  assert.equal(s.pesoMedioG, 35);
});

test('descarta resultados absurdos', () => {
  assert.equal(rendimentoPlausivel(25, receita), true);
  assert.equal(rendimentoPlausivel(500, receita), false);
  assert.equal(rendimentoPlausivel(2, receita), false);
});
