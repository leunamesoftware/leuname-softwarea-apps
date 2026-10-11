import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appsDaConta, comecarTeste, testesDaConta } from '../src/planos.js';

// D1 de mentira: pedidos pagos (com o vencimento do acesso) e os testes grátis.
function banco(pedidos = []) {
  const testes = new Map();
  const prepare = (sql) => ({ bind: (...a) => ({
    all: async () => {
      if (sql.includes('FROM testes_apps')) return { results: [...testes.entries()].filter(([k]) => k.startsWith(a[0] + '|')).map(([k, v]) => ({ app: k.split('|')[1], inicio: typeof v === 'string' ? v : v.inicio })) };
      if (sql.includes('FROM pedidos')) return { results: pedidos };
      return { results: [] };
    },
    first: async () => {
      // Trava do teste: [app, conta, ...aparelhos, app, conta, rede, desde]
      const [app, conta] = a, n = a.length, aparelhos = a.slice(2, n - 4), [rede, desde] = a.slice(n - 2);
      const outros = [...testes.entries()].filter(([k]) => k.split('|')[1] === app && k.split('|')[0] !== conta).map(([, v]) => v);
      return { mesmo_aparelho: outros.filter((v) => aparelhos.includes(v.aparelho)).length,
        mesma_rede: outros.filter((v) => v.rede === rede && v.inicio > desde).length };
    },
    run: async () => {
      const k = a[0] + '|' + a[1];
      if (sql.startsWith('INSERT OR IGNORE INTO testes_apps') && !testes.has(k)) { testes.set(k, { inicio: a[2], aparelho: a[3], rede: a[4] }); return { meta: { changes: 1 } }; }
      return { meta: { changes: 0 } };
    } }) });
  return { env: { DONO_EMAIL: 'dono@x.com', DB: { prepare } }, testes };
}
const diasAtras = (d) => new Date(Date.now() - d * 864e5).toISOString();

test('teste grátis de 3 dias: um por conta, libera o app até acabar', async () => {
  const { env, testes } = banco();
  assert.equal(await comecarTeste(env, 'c1', 'quantocobrar'), null);
  const t = await comecarTeste(env, 'c1', 'gestacell');
  assert.equal(t.acabou, false);
  assert.equal(Math.round((new Date(t.expiraEm) - new Date(t.inicio)) / 864e5), 3);
  assert.deepEqual((await appsDaConta(env, 'c1', 'c@x.com')).gestacell, { teste: true, expiraEm: t.expiraEm });
  // Começar de novo não renova o teste.
  testes.set('c1|gestacell', diasAtras(4));
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

test('ConstruGestão: teste grátis de 3 dias; só assinatura mensal ou pagamento vitalício', async () => {
  const { env } = banco();
  const t = await comecarTeste(env, 'c3', 'construgestao');
  assert.equal(t.acabou, false);
  assert.equal(Math.round((new Date(t.expiraEm) - new Date(t.inicio)) / 864e5), 3);
  assert.deepEqual((await appsDaConta(env, 'c3', 'c@x.com')).construgestao, { teste: true, expiraEm: t.expiraEm });
  const { PLANOS } = await import('../src/planos.js');
  assert.deepEqual([PLANOS.construgestao_mensal.preco, PLANOS.construgestao.preco], [19.9, 49.9]);
  assert.equal(PLANOS.construgestao_anual, undefined);
  assert.equal(PLANOS.construgestao.licenca, 'construgestao');
});

test('MercaGestão: R$ 200 vitalício em até 6x ou R$ 39,90/mês, 3 dias grátis e e-mail com o link de instalar', async () => {
  const { PLANOS: P, TESTE_DIAS: T } = await import('../src/planos.js');
  const { LINKS } = await import('../src/email.js');
  assert.deepEqual([P.mercagestao.preco, P.mercagestao.parcelas, P.mercagestao.licenca, P.mercagestao.app], [200, 6, 'mercagestao', 'mercagestao']);
  assert.equal(P.mercagestao.dias, undefined, 'vitalício');
  assert.deepEqual([P.mercagestao_mensal.preco, P.mercagestao_mensal.assinatura, P.mercagestao_mensal.app], [39.9, true, 'mercagestao'], 'mensal no cartão');
  assert.equal(T.mercagestao, 3);
  assert.equal(LINKS.mercagestao.url, 'https://mercagestao.leunamesoftware.com.br/?instalar=1');
});

test('trocar de e-mail no mesmo aparelho não dá outro teste do mesmo app; a rede tem limite por mês', async () => {
  const { env } = banco();
  const ap = (aparelho, rede = 'r1') => ({ aparelhos: [aparelho], aparelho, rede });
  assert.equal((await comecarTeste(env, 'conta-a', 'gestacell', ap('cel-1'))).acabou, false);
  // Outra conta (outro e-mail) no mesmo celular: negado, o app mostra os planos.
  assert.deepEqual(await comecarTeste(env, 'conta-b', 'gestacell', ap('cel-1')), { negado: 'aparelho', acabou: true });
  // No mesmo celular, outro app ainda pode ser testado.
  assert.equal((await comecarTeste(env, 'conta-b', 'radar', ap('cel-1'))).acabou, false);
  // A conta que já testou continua vendo o próprio teste (não é bloqueada por ela mesma).
  assert.equal((await comecarTeste(env, 'conta-a', 'gestacell', ap('cel-1'))).acabou, false);
  // Mesma rede (ex.: Wi-Fi da loja) com aparelhos diferentes: até 3 testes no mês, o 4º é negado.
  assert.equal((await comecarTeste(env, 'conta-c', 'gestacell', ap('cel-2'))).acabou, false);
  assert.equal((await comecarTeste(env, 'conta-d', 'gestacell', ap('cel-3'))).acabou, false);
  assert.deepEqual(await comecarTeste(env, 'conta-e', 'gestacell', ap('cel-4')), { negado: 'rede', acabou: true });
  assert.equal((await comecarTeste(env, 'conta-f', 'gestacell', ap('cel-5', 'r2'))).acabou, false);
});
