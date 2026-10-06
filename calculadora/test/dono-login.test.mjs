import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDono, criarSenhaDono, entrarDono, trocarSenhaDono, senhaDonoConfere } from '../src/dono.js';

// D1 de mentira, só com as duas tabelas da Área do Dono.
function banco() {
  let acesso = null; const sessoes = new Map();
  const prepare = (sql) => ({ bind: (...a) => ({
    first: async () => (sql.includes('FROM dono_acesso') ? acesso : sql.includes('FROM dono_sessoes') ? (sessoes.get(a[0]) > a[1] ? { 1: 1 } : null) : null),
    run: async () => {
      if (sql.startsWith('INSERT OR IGNORE INTO dono_acesso')) { if (acesso) return { meta: { changes: 0 } }; acesso = { email: a[0], senha_hash: a[1], senha_sal: a[2] }; return { meta: { changes: 1 } }; }
      if (sql.startsWith('UPDATE dono_acesso')) acesso = { ...acesso, senha_hash: a[0], senha_sal: a[1] };
      if (sql.startsWith('INSERT INTO dono_sessoes')) sessoes.set(a[0], a[1]);
      if (sql.startsWith('DELETE FROM dono_sessoes WHERE')) sessoes.delete(a[0]);
      return { meta: { changes: 1 } };
    } }), });
  const db = { prepare: (sql) => { const p = prepare(sql); return Object.assign(p, { first: () => p.bind().first(), run: () => { if (sql === 'DELETE FROM dono_sessoes') sessoes.clear(); return { meta: {} }; } }); } };
  return { DONO_EMAIL: 'leunamesoftware@gmail.com', DB: db };
}
const pedido = (cookie = '') => new Request('https://dono.leunamesoftware.com.br/', { headers: { Cookie: cookie } });
const valor = (setCookie) => setCookie.split(';')[0];

test('primeiro acesso cria a senha uma vez só, e só com o e-mail do dono', async () => {
  const env = banco();
  assert.deepEqual(await estadoDono(env, pedido()), { temSenha: false, logado: false });
  assert.equal((await criarSenhaDono(env, pedido(), { email: 'outro@x.com', senha: 'segredo1' })).erro, 'email');
  const r = await criarSenhaDono(env, pedido(), { email: 'LeunameSoftware@gmail.com', senha: 'segredo1' });
  assert.ok(r.cookie);
  assert.deepEqual(await estadoDono(env, pedido(valor(r.cookie))), { temSenha: true, logado: true });
  assert.equal((await criarSenhaDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'outrasenha' })).erro, 'ja_existe');
});

test('entrar confere a senha; trocar exige a atual e derruba as outras sessões', async () => {
  const env = banco();
  await criarSenhaDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'segredo1' });
  assert.equal((await entrarDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'errada1' })).erro, 'login_invalido');
  const a = await entrarDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'segredo1' });
  const b = await entrarDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'segredo1' });
  assert.equal((await trocarSenhaDono(env, pedido(valor(a.cookie)), { atual: 'errada1', nova: 'nova123' })).erro, 'senha_atual');
  const t = await trocarSenhaDono(env, pedido(valor(a.cookie)), { atual: 'segredo1', nova: 'nova123' });
  assert.ok(t.cookie);
  assert.equal((await estadoDono(env, pedido(valor(b.cookie)))).logado, false);
  assert.ok((await entrarDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'nova123' })).cookie);
});

test('a senha de dono confere sem abrir sessão (vale no login comum da conta do dono)', async () => {
  const env = banco();
  assert.equal(await senhaDonoConfere(env, { email: 'leunamesoftware@gmail.com', senha: 'segredo1' }), false);
  await criarSenhaDono(env, pedido(), { email: 'leunamesoftware@gmail.com', senha: 'segredo1' });
  assert.equal(await senhaDonoConfere(env, { email: 'LeunameSoftware@gmail.com', senha: 'segredo1' }), true);
  assert.equal(await senhaDonoConfere(env, { email: 'leunamesoftware@gmail.com', senha: 'errada1' }), false);
  assert.equal(await senhaDonoConfere(env, { email: 'outro@x.com', senha: 'segredo1' }), false);
});
