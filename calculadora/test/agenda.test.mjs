import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const receitas = JSON.parse(readFileSync(new URL('../src/receitas.json', import.meta.url)));

test('receita escondida: liberarEm é "aguardando-foto" ou uma data válida; com foto provisória nunca tem data agendada', () => {
  for (const r of receitas) {
    if (r.liberarEm === undefined) continue; // liberada (pode estar com foto provisória até a foto chegar)
    if (r.liberarEm === 'aguardando-foto') continue;
    assert.ok(!Number.isNaN(Date.parse(r.liberarEm)), `${r.id}: liberarEm inválido`);
    assert.ok(!r.fotoProvisoria, `${r.id} agendada com foto provisória`);
  }
});

test('ids únicos e nomes sem repetir', () => {
  const ids = receitas.map((r) => r.id), nomes = receitas.map((r) => r.nome.toLowerCase());
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(nomes).size, nomes.length);
});
