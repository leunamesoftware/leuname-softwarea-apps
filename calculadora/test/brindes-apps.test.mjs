import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appsDaConta } from '../src/planos.js';
import { darBrindeApp, tirarBrindeApp } from '../src/brindes.js';

// Bancos de mentira: brindes_apps (DB) e licenças (LICDB).
function env() {
  const brindes = new Map(), lic = [];
  const mk = (tabela) => (sql) => {
    const exec = (...a) => ({
      first: async () => sql.includes('FROM brindes_apps') ? brindes.get(a[0] + '|' + a[1]) || null : null,
      all: async () => ({ results: sql.includes('FROM brindes_apps') ? [...brindes.values()].filter((b) => b.email === a[0]) : [] }),
      run: async () => {
        if (sql.startsWith('INSERT INTO brindes_apps')) brindes.set(a[0] + '|' + a[1], { email: a[0], app: a[1], chave: a[2] });
        if (sql.startsWith('DELETE FROM brindes_apps')) brindes.delete(a[0] + '|' + a[1]);
        if (sql.includes('INTO licencas')) lic.push({ app_id: a[1], chave: a[2], email: a[4], origem: a[5] });
        if (sql.startsWith('UPDATE licencas')) lic.forEach((l) => { if (l.chave === a[1]) l.revogada = true; });
        return { meta: {} };
      },
    });
    return { bind: exec, ...exec() };
  };
  return { DONO_EMAIL: 'leunamesoftware@gmail.com', DB: { prepare: mk('DB') }, LICDB: { prepare: mk('LIC') }, _lic: lic };
}
const IDS = { gestacell: 'leuname-gestao', radar: 'radar-preventivo' };

test('presente do Gestacell: licença vitalícia presa ao e-mail, uma só, e some quando o dono tira', async () => {
  const e = env();
  assert.deepEqual(await darBrindeApp(e, { email: ' Amigo@Exemplo.com ', app: 'gestacell' }, IDS), { ok: true });
  assert.equal(e._lic.length, 1);
  assert.equal(e._lic[0].app_id, 'leuname-gestao'); assert.equal(e._lic[0].email, 'amigo@exemplo.com');
  const apps = await appsDaConta(e, 'c1', 'amigo@exemplo.com');
  assert.equal(apps.gestacell.plano, 'brinde'); assert.equal(apps.gestacell.expiraEm, null); assert.ok(apps.gestacell.chave);
  assert.equal(apps.radar, undefined);
  assert.equal((await darBrindeApp(e, { email: 'amigo@exemplo.com', app: 'gestacell' }, IDS)).ja, true);
  assert.equal(e._lic.length, 1, 'não emite uma segunda licença');
  assert.equal((await appsDaConta(e, 'c2', 'outro@exemplo.com')).gestacell, undefined);
  await tirarBrindeApp(e, { email: 'amigo@exemplo.com', app: 'gestacell' });
  assert.equal((await appsDaConta(e, 'c1', 'amigo@exemplo.com')).gestacell, undefined);
  assert.equal(e._lic[0].revogada, true);
});

test('presente: app desconhecido e e-mail inválido são recusados', async () => {
  const e = env();
  assert.equal((await darBrindeApp(e, { email: 'a@b.com', app: 'nada' }, IDS)).erro, 'app');
  assert.equal((await darBrindeApp(e, { email: 'sem-arroba', app: 'gestacell' }, IDS)).erro, 'email');
});
