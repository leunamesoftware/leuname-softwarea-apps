import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appsDaConta, comecarTeste, testesDaConta } from '../src/planos.js';

// D1 de mentira: pedidos pagos (com o vencimento do acesso) e os testes grátis.
function banco(pedidos = []) {
  const testes = new Map();
  const prepare = (sql) => ({ bind: (...a) => ({
    all: async () => {
      if (sql.includes('FROM testes_apps')) return { results: [...testes.entries()].filter(([k]) => k.startsWith(a[0] + '|')).map(([k, inicio]) => ({ app: k.split('|')[1], inicio })) };
      if (sql.includes('FROM pedidos')) return { results: pedidos };
      return { results: [] };
    },
    run: async () => {
      const k = a[0] + '|' + a[1];
      if (sql.startsWith('INSERT OR IGNORE INTO testes_apps') && !testes.has(k)) { testes.set(k, a[2]); return { meta: { changes: 1 } }; }
      return { meta: { changes: 0 } };
    } }) });
  return { env: { DONO_EMAIL: 'dono@x.com', DB: { prepare } }, testes };
}
const diasAtras = (d) => new Date(Date.now() - d * 864e5).toISOString();

test('teste grátis de 7 dias: um por conta, libera o app até acabar', async () => {
  const { env, testes } = banco();
  assert.equal(await comecarTeste(env, 'c1', 'quantocobrar'), null);
  const t = await comecarTeste(env, 'c1', 'gestacell');
  assert.equal(t.acabou, false);
  assert.equal(Math.round((new Date(t.expiraEm) - new Date(t.inicio)) / 864e5), 7);
  assert.deepEqual((await appsDaConta(env, 'c1', 'c@x.com')).gestacell, { teste: true, expiraEm: t.expiraEm });
  // Começar de novo não renova o teste.
  testes.set('c1|gestacell', diasAtras(8));
  assert.equal((await comecarTeste(env, 'c1', 'gestacell')).acabou, true);
  assert.equal((await appsDaConta(env, 'c1', 'c@x.com')).gestacell, undefined);
  assert.equal((await testesDaConta(env, 'c1')).gestacell.acabou, true);
});

test('mensal vencido some; pagamento único vale para sempre e ganha do teste', async () => {
  const { env } = banco([
    { plano: 'radar_mensal', chave: 'LEU-AAAA-BBBB-CCCC', expira_em: diasAtras(3) },
    { plano: 'gestacell_anual', chave: 'LEU-DDDD-EEEE-FFFF', expira_em: new Date(Date.now() + 9 * 864e5).toISOString() },
    { plano: 'gestacell', chave: 'LEU-GGGG-HHHH-JJJJ', expira_em: null },
  ]);
  await comecarTeste(env, 'c2', 'gestacell');
  const apps = await appsDaConta(env, 'c2', 'c@x.com');
  assert.equal(apps.radar, undefined);
  assert.deepEqual(apps.gestacell, { chave: 'LEU-GGGG-HHHH-JJJJ', plano: 'gestacell', expiraEm: null });
});
