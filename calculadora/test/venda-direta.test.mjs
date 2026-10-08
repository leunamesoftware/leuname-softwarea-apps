import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { liberarVendaDireta } from '../src/pagamento.js';
import { contaParaCompra } from '../src/contas.js';
import { appsDaConta } from '../src/planos.js';

function d1(db) {
  return { prepare: (sql) => ({ bind: (...a) => { const st = db.prepare(sql); return {
    first: async () => st.get(...a) ?? null, all: async () => ({ results: st.all(...a) }), run: async () => ({ meta: { changes: Number(st.run(...a).changes) } }) }; } }) };
}
function ambiente() {
  const db = new DatabaseSync(':memory:'), lic = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE contas (id TEXT PRIMARY KEY, email TEXT UNIQUE, nome TEXT, senha_hash TEXT, senha_sal TEXT, criado_em TEXT, teste_aparelho TEXT, teste_rede TEXT, sem_teste INTEGER);
    CREATE TABLE pedidos (id TEXT PRIMARY KEY, nome TEXT, email TEXT, status TEXT, pagamento_id TEXT, chave TEXT, criado_em TEXT, atualizado_em TEXT, plano TEXT, assinatura_id TEXT, conta_id TEXT, email_enviado TEXT);
    CREATE TABLE acessos (chave TEXT PRIMARY KEY, plano TEXT, expira_em TEXT, atualizado_em TEXT);
    CREATE TABLE testes_apps (conta_id TEXT, app TEXT, inicio TEXT);`);
  lic.exec(`CREATE TABLE apps (id TEXT PRIMARY KEY, nome TEXT, criado_em TEXT);
    CREATE TABLE licencas (id TEXT, app_id TEXT REFERENCES apps(id), chave TEXT, cliente_nome TEXT, cliente_contato TEXT, origem TEXT, status TEXT, criado_em TEXT);`);
  return { env: { DB: d1(db), LICDB: d1(lic), DONO_EMAIL: 'dono@x.com', APP_ID: 'calculadora-receitas' }, db };
}

test('venda direta: libera o app para o e-mail, mesmo antes de o cliente ter conta', async () => {
  const { env, db } = ambiente();
  assert.equal((await liberarVendaDireta(env, { email: 'x', plano: 'construgestao' })).erro, 'email');
  assert.equal((await liberarVendaDireta(env, { email: 'joao@x.com', plano: 'nada' })).erro, 'plano');
  const r = await liberarVendaDireta(env, { email: 'Joao@x.com', nome: 'João Lima', plano: 'construgestao' });
  assert.equal(r.ok, true); assert.equal(r.contaExiste, false); assert.equal(r.emailEnviado, false, 'sem serviço de e-mail no teste');
  const p = db.prepare('SELECT * FROM pedidos').get();
  assert.equal(p.status, 'pago'); assert.equal(p.email, 'joao@x.com'); assert.equal(p.conta_id, null); assert.ok(p.chave);
  // O cliente cria a conta com o mesmo e-mail: a compra entra na conta e o app libera.
  const { conta } = await contaParaCompra(env, 'joao@x.com', 'João', 'senha123');
  const apps = await appsDaConta(env, conta.id, conta.email);
  assert.equal(apps.construgestao.chave, p.chave);
  assert.equal(apps.construgestao.expiraEm, null, 'vitalício');
});
