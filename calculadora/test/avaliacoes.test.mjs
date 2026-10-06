import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listarAvaliacoes, avaliar, votarUtil, excluirAvaliacao, denunciarAvaliacao, esconderAvaliacao, responderAvaliacao } from '../src/avaliacoes.js';

// D1 de mentira, só com o que as avaliações usam.
function banco() {
  const av = []; const util = []; const den = [];
  const prepare = (sql) => {
    const exec = (...a) => ({
      first: async () => sql.startsWith('SELECT conta_id FROM avaliacoes') ? av.find((x) => x.id === a[0]) || null
        : sql.startsWith('SELECT id FROM avaliacoes WHERE app') ? av.find((x) => x.app === a[0] && x.conta_id === a[1]) || null : null,
      all: async () => {
        if (sql.includes('FROM avaliacoes a WHERE a.app')) return { results: av.filter((x) => x.app === a[0] && !x.escondida)
          .map((x) => ({ ...x, uteis: util.filter((u) => u.avaliacao_id === x.id && u.util === 1).length })) };
        if (sql.startsWith('SELECT avaliacao_id, util')) return { results: util.filter((u) => u.conta_id === a[0]) };
        return { results: [] };
      },
      run: async () => {
        if (sql.startsWith('INSERT INTO avaliacoes (')) {
          const [id, app, conta_id, nome, nota, texto, criado_em, atualizado_em] = a;
          const ja = av.find((x) => x.app === app && x.conta_id === conta_id);
          if (ja) Object.assign(ja, { nota, texto, nome, atualizado_em }); else av.push({ id, app, conta_id, nome, nota, texto, criado_em, atualizado_em, escondida: 0, resposta: null, resposta_em: null });
        }
        if (sql.startsWith('INSERT INTO avaliacoes_util')) {
          const ja = util.find((u) => u.avaliacao_id === a[0] && u.conta_id === a[1]);
          if (ja) ja.util = a[2]; else util.push({ avaliacao_id: a[0], conta_id: a[1], util: a[2] });
        }
        if (sql.startsWith('DELETE FROM avaliacoes WHERE id')) { const i = av.findIndex((x) => x.id === a[0]); if (i >= 0) av.splice(i, 1); }
        if (sql.startsWith('INSERT INTO avaliacoes_denuncias')) den.push({ id: a[0], conta: a[1], motivo: a[2] });
        let changes = 0;
        if (sql.startsWith('UPDATE avaliacoes SET escondida')) { const x = av.find((v) => v.id === a[1]); if (x) { x.escondida = a[0]; changes = 1; } }
        if (sql.startsWith('UPDATE avaliacoes SET resposta')) { const x = av.find((v) => v.id === a[2]); if (x) { x.resposta = a[0]; changes = 1; } }
        return { meta: { changes } };
      },
    });
    return { bind: exec, ...exec() };
  };
  return { DB: { prepare }, av, den };
}
const ana = { id: 'c1', nome: 'Ana Souza', email: 'ana@x.com' };
const bia = { id: 'c2', nome: '', email: 'bia@x.com' };

test('sem avaliações: total 0 e sem média (nada inventado)', async () => {
  const r = await listarAvaliacoes(banco(), 'gestacell');
  assert.equal(r.total, 0); assert.equal(r.media, null); assert.deepEqual(r.itens, []);
});

test('média, barras, uma avaliação por conta (editar substitui) e primeiro nome', async () => {
  const env = banco();
  assert.deepEqual(await avaliar(env, ana, { app: 'gestacell', nota: 5, texto: 'Ótimo   app' }), { ok: true });
  await avaliar(env, bia, { app: 'gestacell', nota: 3 });
  await avaliar(env, ana, { app: 'gestacell', nota: 4, texto: 'Muito bom' });
  const r = await listarAvaliacoes(env, 'gestacell', 'c1');
  assert.equal(r.total, 2); assert.equal(r.media, 3.5);
  assert.deepEqual(r.barras, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 0 });
  assert.equal(r.itens.length, 1, 'nota sem texto não vira comentário');
  assert.equal(r.itens[0].nome, 'Ana'); assert.equal(r.itens[0].minha, true);
  assert.deepEqual(r.minha, { nota: 4, texto: 'Muito bom' });
  assert.equal((await listarAvaliacoes(env, 'gestacell', 'c2')).itens[0].nome, 'Ana');
  assert.equal(env.av.find((x) => x.conta_id === 'c2').nome, 'bia', 'sem nome usa o começo do e-mail');
});

test('valida nota e app', async () => {
  const env = banco();
  assert.equal((await avaliar(env, ana, { app: 'gestacell', nota: 6 })).erro, 'nota');
  assert.equal((await avaliar(env, ana, { app: 'Gesta Cell!', nota: 5 })).erro, 'app');
  assert.equal((await listarAvaliacoes(env, '../x')).erro, 'app');
});

test('útil: conta votos, não deixa votar no próprio comentário', async () => {
  const env = banco();
  await avaliar(env, ana, { app: 'radar', nota: 5, texto: 'Salvou meu alvará' });
  const id = env.av[0].id;
  assert.equal((await votarUtil(env, ana, { id, util: true })).erro, 'propria');
  await votarUtil(env, bia, { id, util: true });
  const r = await listarAvaliacoes(env, 'radar', 'c2');
  assert.equal(r.itens[0].uteis, 1); assert.equal(r.itens[0].voto, true);
});

test('dono: responder aparece no comentário; esconder tira da página', async () => {
  const env = banco();
  await avaliar(env, ana, { app: 'radar', nota: 1, texto: 'Comentário ruim' });
  const id = env.av[0].id;
  await responderAvaliacao(env, { id, resposta: 'Obrigado, vamos melhorar!' });
  assert.equal((await listarAvaliacoes(env, 'radar')).itens[0].resposta, 'Obrigado, vamos melhorar!');
  await esconderAvaliacao(env, { id });
  assert.equal((await listarAvaliacoes(env, 'radar')).total, 0);
  assert.equal((await esconderAvaliacao(env, { id: 'nada' })).erro, 'nao_encontrado');
});

test('a pessoa exclui a própria avaliação; denúncia só no comentário dos outros e com motivo', async () => {
  const env = banco();
  await avaliar(env, ana, { app: 'gestacell', nota: 2, texto: 'Comentário' });
  const id = env.av[0].id;
  assert.equal((await denunciarAvaliacao(env, ana, { id, motivo: 'spam' })).erro, 'propria');
  assert.equal((await denunciarAvaliacao(env, bia, { id, motivo: 'qualquer' })).erro, 'motivo');
  assert.deepEqual(await denunciarAvaliacao(env, bia, { id, motivo: 'ofensivo' }), { ok: true });
  assert.equal(env.den.length, 1);
  assert.equal((await excluirAvaliacao(env, bia, { app: 'gestacell' })).erro, 'nao_encontrado', 'não apaga a avaliação dos outros');
  assert.deepEqual(await excluirAvaliacao(env, ana, { app: 'gestacell' }), { ok: true });
  assert.equal((await listarAvaliacoes(env, 'gestacell')).total, 0);
});
