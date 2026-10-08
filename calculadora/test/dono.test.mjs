import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acessoDaConta, appsDaConta } from '../src/planos.js';

// Banco de mentira: responde só o que estes testes perguntam.
function bancos({ email, licencas = [] }) {
  const inseridas = [];
  const stmt = (sql) => ({
    bind: (...a) => ({
      first: async () => {
        if (sql.includes('FROM contas')) return { email, criado_em: '2020-01-01T00:00:00Z', sem_teste: 0 };
        if (sql.includes('FROM licencas')) return licencas.concat(inseridas).find((l) => l.app_id === a[0]) || null;
        return null;
      },
      all: async () => ({ results: [] }),
      run: async () => { if (sql.startsWith('INSERT INTO licencas')) inseridas.push({ app_id: a[1], chave: a[2] }); },
    }),
  });
  return { DONO_EMAIL: 'leunamesoftware@gmail.com', DB: { prepare: stmt }, LICDB: { prepare: stmt }, inseridas };
}

test('dono: todas as receitas, sem vencer, sem comprar', async () => {
  const a = await acessoDaConta(bancos({ email: 'leunamesoftware@gmail.com' }), 'c1');
  assert.equal(a.plano, 'dono');
  assert.equal(a.receitas, Infinity);
  assert.ok(!a.bloqueado);
});

test('cliente sem compra continua bloqueado depois do teste grátis', async () => {
  const a = await acessoDaConta(bancos({ email: 'cliente@exemplo.com' }), 'c2');
  assert.equal(a.plano, 'gratis');
  assert.equal(a.bloqueado, true);
});

test('dono: licença de cada app criada uma vez e reaproveitada', async () => {
  const env = bancos({ email: 'leunamesoftware@gmail.com' });
  const a1 = await appsDaConta(env, 'c1', 'LeunameSoftware@gmail.com');
  assert.deepEqual(Object.keys(a1).sort(), ['construgestao', 'gestacell', 'mercagestao', 'radar']);
  assert.match(a1.gestacell.chave, /^LEU-/);
  const a2 = await appsDaConta(env, 'c1', 'leunamesoftware@gmail.com');
  assert.equal(a2.gestacell.chave, a1.gestacell.chave);
  assert.equal(env.inseridas.length, 4);
});
