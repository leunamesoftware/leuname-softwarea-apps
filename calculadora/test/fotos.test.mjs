import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const receitas = JSON.parse(readFileSync(new URL('../src/receitas.json', import.meta.url)));

test('toda receita tem foto e miniatura, com a versão da foto atual (python3 scripts/foto_receita.py)', () => {
  for (const r of receitas) {
    const [caminho, consulta] = r.foto.split('?');
    const arquivo = new URL('../public' + caminho, import.meta.url);
    assert.ok(existsSync(arquivo), `falta a foto de ${r.id}`);
    assert.ok(existsSync(new URL('../public' + caminho.replace('/receitas/', '/receitas/mini/'), import.meta.url)), `falta a miniatura de ${r.id}`);
    const v = createHash('md5').update(readFileSync(arquivo)).digest('hex').slice(0, 8);
    assert.equal(consulta, `v=${v}`, `versão da foto de ${r.id} desatualizada: rode python3 scripts/foto_receita.py`);
  }
});
