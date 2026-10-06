import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acessoDaConta } from '../src/planos.js';
import { darBrinde, tirarBrinde } from '../src/brindes.js';

// D1 de mentira: uma conta sem compras e a tabela de brindes.
function banco(email) {
  const brindes = new Map();
  const prepare = (sql) => {
    const exec = (...a) => ({
      first: async () => sql.includes('FROM contas') ? { email, criado_em: '2020-01-01T00:00:00Z', sem_teste: 1 }
        : sql.includes('FROM brindes') ? brindes.get(a[0]) || null : null,
      all: async () => ({ results: [] }),
      run: async () => {
        if (sql.startsWith('INSERT INTO brindes')) brindes.set(a[0], { expira_em: a[1] });
        if (sql.startsWith('DELETE FROM brindes')) brindes.delete(a[0]);
        return { meta: {} };
      },
    });
    return { bind: exec, ...exec() };
  };
  return { DONO_EMAIL: 'leunamesoftware@gmail.com', DB: { prepare } };
}

test('brinde: o e-mail ganha o Pro completo sem comprar, e perde quando o dono tira', async () => {
  const env = banco('Cliente@Exemplo.com');
  assert.equal((await acessoDaConta(env, 'c1')).bloqueado, true);
  assert.deepEqual(await darBrinde(env, { email: ' cliente@exemplo.COM ' }), { ok: true });
  const a = await acessoDaConta(env, 'c1');
  assert.equal(a.plano, 'brinde'); assert.equal(a.receitas, Infinity); assert.equal(a.expiraEm, null);
  await tirarBrinde(env, { email: 'cliente@exemplo.com' });
  assert.equal((await acessoDaConta(env, 'c1')).bloqueado, true);
});

test('brinde com prazo vence; e-mail inválido é recusado', async () => {
  const env = banco('cliente@exemplo.com');
  await darBrinde(env, { email: 'cliente@exemplo.com', dias: 30 });
  assert.ok(new Date((await acessoDaConta(env, 'c1')).expiraEm) > new Date());
  assert.equal((await darBrinde(env, { email: 'sem-arroba' })).erro, 'email');
});
