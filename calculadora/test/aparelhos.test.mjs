import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { abrirSessao, contaDaSessao, sessaoSubstituida, pedirNovaSenha, usarNovaSenha, trocarEmailDaConta, buscarConta, senhaConfere } from '../src/contas.js';
import { montarAvisoAparelho } from '../src/email.js';

// D1 de verdade em memória (SQLite), com as tabelas de contas e a trava de aparelhos.
function banco() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE contas (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, nome TEXT, senha_hash TEXT NOT NULL, senha_sal TEXT NOT NULL, criado_em TEXT NOT NULL);
    CREATE TABLE sessoes (token_hash TEXT PRIMARY KEY, conta_id TEXT NOT NULL, criado_em TEXT NOT NULL, expira_em TEXT NOT NULL);`);
  db.exec(readFileSync(new URL('../migrations/0014_aparelhos.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/0015_nova_senha.sql', import.meta.url), 'utf8'));
  db.exec("CREATE TABLE pedidos (id TEXT, email TEXT, conta_id TEXT)"); db.exec("INSERT INTO pedidos VALUES ('p1','maria@x.com','c1')");
  db.prepare("INSERT INTO contas VALUES ('c1','maria@x.com','Maria Souza','h','s','2026-10-01')").run();
  db.prepare("INSERT INTO contas VALUES ('d1','dono@x.com','Dono','h','s','2026-10-01')").run();
  const prepare = (sql) => ({ bind: (...a) => {
    const st = db.prepare(sql);
    return { first: async () => st.get(...a) ?? null, all: async () => ({ results: st.all(...a) }), run: async () => ({ meta: { changes: Number(st.run(...a).changes) } }) };
  } });
  return { DONO_EMAIL: 'dono@x.com', DB: { prepare } };
}
const CELULAR = 'Mozilla/5.0 (Linux; Android 14; SM-A155M) Mobile', PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
const pedido = (ua, aparelho, sessao) => new Request('https://www.leunamesoftware.com.br/api/conta/entrar', { headers: {
  'User-Agent': ua, Cookie: [aparelho && `ln_aparelho=${aparelho}`, sessao && `ln_sessao=${sessao}`].filter(Boolean).join('; ') } });
const token = (cookies) => cookies[0].match(/ln_sessao=([0-9a-f]{64})/)[1];

test('1 celular + 1 computador: celular novo desconecta o antigo e avisa por e-mail', async () => {
  const env = banco(), avisos = [];
  const avisar = async (conta, tipo) => { avisos.push([conta.email, tipo]); };
  const A = 'a'.repeat(32), B = 'b'.repeat(32), PCX = 'c'.repeat(32);
  const cel1 = token(await abrirSessao(env, 'c1', pedido(CELULAR, A), { avisar }));
  const pc = token(await abrirSessao(env, 'c1', pedido(PC, PCX), { avisar }));
  assert.equal(avisos.length, 0, 'celular + computador convivem');
  const cel2 = token(await abrirSessao(env, 'c1', pedido(CELULAR, B), { avisar }));
  assert.deepEqual(avisos, [['maria@x.com', 'celular']]);
  assert.equal(await contaDaSessao(env, pedido(CELULAR, A, cel1)), null, 'celular antigo desconectado');
  assert.equal(await sessaoSubstituida(env, pedido(CELULAR, A, cel1)), true);
  assert.equal((await contaDaSessao(env, pedido(CELULAR, B, cel2))).email, 'maria@x.com');
  assert.equal((await contaDaSessao(env, pedido(PC, PCX, pc))).email, 'maria@x.com', 'o computador continua');
  // O mesmo celular entrando de novo: troca a sessão, mas não manda e-mail.
  await abrirSessao(env, 'c1', pedido(CELULAR, B), { avisar });
  assert.equal(avisos.length, 1);
});

test('aparelho sem identificação ganha uma (cookie) e a conta do dono não tem limite', async () => {
  const env = banco(), avisos = [];
  const cookies = await abrirSessao(env, 'c1', pedido(CELULAR), { avisar: async () => avisos.push(1) });
  assert.ok(cookies.some((c) => c.startsWith('ln_aparelho=')));
  const d1 = token(await abrirSessao(env, 'd1', pedido(CELULAR, 'e'.repeat(32)), { avisar: async () => avisos.push(1) }));
  await abrirSessao(env, 'd1', pedido(CELULAR, 'f'.repeat(32)), { avisar: async () => avisos.push(1) });
  assert.equal((await contaDaSessao(env, pedido(CELULAR, 'e'.repeat(32), d1))).email, 'dono@x.com');
  assert.equal(avisos.length, 0);
});

test('e-mail de aviso explica a regra', () => {
  const m = montarAvisoAparelho({ nome: 'Maria Souza' }, 'celular', new Date('2026-10-08T15:20:00Z'));
  assert.match(m.titulo, /celular novo/);
  assert.match(m.texto, /1 celular e 1 computador/);
  assert.match(m.texto, /Maria/);
});

test('esqueci a senha: o link troca a senha uma vez só e desconecta os aparelhos', async () => {
  const env = banco();
  assert.equal(await pedirNovaSenha(env, 'ninguem@x.com'), null);
  const cel = token(await abrirSessao(env, 'c1', pedido(CELULAR, 'a'.repeat(32))));
  const { token: t } = await pedirNovaSenha(env, 'MARIA@x.com ');
  assert.equal(await usarNovaSenha(env, t, '123'), null, 'senha curta');
  assert.equal(await usarNovaSenha(env, t, 'novaSenha1'), 'c1');
  assert.equal(await usarNovaSenha(env, t, 'outraSenha'), null, 'o link vale uma vez só');
  assert.ok(await senhaConfere(await buscarConta(env, 'maria@x.com'), 'novaSenha1'));
  assert.equal(await contaDaSessao(env, pedido(CELULAR, 'a'.repeat(32), cel)), null);
});

test('dono troca o e-mail da conta de quem perdeu o e-mail', async () => {
  const env = banco();
  assert.equal((await trocarEmailDaConta(env, 'maria@x.com', 'dono@x.com')).erro, 'email_em_uso');
  assert.equal((await trocarEmailDaConta(env, 'nao@x.com', 'novo@x.com')).erro, 'conta_nao_encontrada');
  assert.equal((await trocarEmailDaConta(env, 'maria@x.com', 'Maria.Nova@x.com')).ok, true);
  assert.equal((await buscarConta(env, 'maria.nova@x.com')).id, 'c1');
});
