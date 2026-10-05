import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { postagens, textoDoCanal } from '../src/canal.js';

const receitas = JSON.parse(readFileSync(new URL('../src/receitas.json', import.meta.url)));
const dicas = JSON.parse(readFileSync(new URL('../src/dicas.json', import.meta.url)));

test('canal: só receitas liberadas e com foto de verdade, e uma dica depois de cada 10', () => {
  const p = postagens(receitas, dicas, Date.parse('2026-10-05T12:00:00Z'));
  const ids = p.filter((x) => x.tipo === 'receita').map((x) => x.id.slice(2));
  for (const id of ids) {
    const r = receitas.find((x) => x.id === id);
    assert.ok(!r.fotoProvisoria, `${id} com foto provisória no canal`);
    assert.ok(!r.liberarEm || Date.parse(r.liberarEm) <= Date.parse('2026-10-05T12:00:00Z'));
  }
  assert.equal(p[10].id, 'd:1');
  assert.equal(p[21].id, 'd:2');
});

test('texto do canal: sem quantidades, com o link', () => {
  for (const r of receitas) {
    const t = textoDoCanal(r);
    assert.ok(t.includes('https://www.leunamesoftware.com.br/quantocobrar'));
    const modo = t.split('👩‍🍳 *Modo de fazer*')[1].split('💡')[0];
    assert.doesNotMatch(modo, /\d+\s*(ml|g|kg|litros?|cm|xícaras?)\b/, `${r.id}: quantidade no modo de fazer`);
    assert.doesNotMatch(t.split('👩‍🍳')[0].replace(/\d+%/g, ''), /\d/, `${r.id}: número nos ingredientes ("50%" do chocolate é o tipo, pode)`);
  }
});
