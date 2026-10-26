import test from 'node:test';
import assert from 'node:assert/strict';
import { slugDe, limpar } from '../src/site.js';

test('slug igual ao do site (acentos, espaços e símbolos)', () => {
  assert.equal(slugDe('Açafrão-da-terra (cúrcuma)'), 'acafrao-da-terra-curcuma');
  assert.equal(slugDe('Pimenta-do-reino moída'), 'pimenta-do-reino-moida');
  assert.equal(slugDe(''), '');
});

test('limpar: só campos conhecidos, tamanhos e textos com limite', () => {
  const d = limpar({ nome: '  Colorau  ', hack: 'x', tamanhos: ['10 g', '', 'x'.repeat(40)], oculto: 'sim', descricao: 'a'.repeat(900) });
  assert.equal(d.nome, 'Colorau');
  assert.equal(d.hack, undefined);
  assert.deepEqual(JSON.parse(d.tamanhos), ['10 g', 'x'.repeat(12)]);
  assert.equal(d.oculto, 1);
  assert.equal(d.descricao.length, 400);
});
