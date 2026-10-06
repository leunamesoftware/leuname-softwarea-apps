// Notas e avaliações da LeuApps: só quem tem conta avalia (uma por app, pode editar).
// A página mostra a média, as barras de 1 a 5 e os comentários; o dono pode responder ou esconder.
import { aleatorio } from './contas.js';

export const APP_VALIDO = /^[a-z0-9-]{2,40}$/;
const limpar = (t, n) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
const primeiroNome = (nome, email) => limpar(nome, 40).split(' ')[0] || String(email || '').split('@')[0] || 'Cliente';

/** Resumo e comentários de um app. contaId: marca a avaliação da própria pessoa e os votos dela. */
export async function listarAvaliacoes(env, app, contaId = null) {
  if (!APP_VALIDO.test(app || '')) return { erro: 'app', status: 400 };
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.conta_id, a.nome, a.nota, a.texto, a.atualizado_em, a.resposta, a.resposta_em,
       (SELECT COUNT(*) FROM avaliacoes_util u WHERE u.avaliacao_id = a.id AND u.util = 1) AS uteis
     FROM avaliacoes a WHERE a.app = ? AND a.escondida = 0 ORDER BY a.atualizado_em DESC`).bind(app).all();
  const barras = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let soma = 0;
  for (const r of results) { barras[r.nota] += 1; soma += r.nota; }
  const total = results.length;
  let votos = new Map();
  if (contaId && total) {
    const v = await env.DB.prepare('SELECT avaliacao_id, util FROM avaliacoes_util WHERE conta_id = ?').bind(contaId).all();
    votos = new Map(v.results.map((x) => [x.avaliacao_id, x.util]));
  }
  // Comentários com texto primeiro (os mais úteis no topo); notas sem texto só contam na média.
  const itens = results.filter((r) => r.texto).sort((a, b) => b.uteis - a.uteis || b.atualizado_em.localeCompare(a.atualizado_em))
    .map((r) => ({ id: r.id, nome: r.nome, nota: r.nota, texto: r.texto, data: r.atualizado_em, uteis: r.uteis,
      resposta: r.resposta || null, respostaEm: r.resposta_em || null, minha: r.conta_id === contaId, voto: votos.has(r.id) ? votos.get(r.id) === 1 : null }));
  const minha = contaId ? results.find((r) => r.conta_id === contaId) : null;
  return { app, total, media: total ? Math.round((soma / total) * 10) / 10 : null, barras, itens,
    minha: minha ? { nota: minha.nota, texto: minha.texto || '' } : null };
}

/** Cria ou atualiza a avaliação da conta para o app. */
export async function avaliar(env, conta, d) {
  const app = String(d?.app || '');
  const nota = Number(d?.nota);
  if (!APP_VALIDO.test(app)) return { erro: 'app', status: 400 };
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { erro: 'nota', status: 400 };
  const texto = limpar(d?.texto, 500);
  const agora = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO avaliacoes (id, app, conta_id, nome, nota, texto, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(app, conta_id) DO UPDATE SET nota = excluded.nota, texto = excluded.texto, nome = excluded.nome, atualizado_em = excluded.atualizado_em`)
    .bind(aleatorio(12), app, conta.id, primeiroNome(conta.nome, conta.email), nota, texto || null, agora, agora).run();
  return { ok: true };
}

/** "Você achou este comentário útil?" Sim (true) ou Não (false). Não vota no próprio comentário. */
export async function votarUtil(env, conta, d) {
  const id = String(d?.id || '');
  const a = await env.DB.prepare('SELECT conta_id FROM avaliacoes WHERE id = ?').bind(id).first();
  if (!a) return { erro: 'nao_encontrado', status: 404 };
  if (a.conta_id === conta.id) return { erro: 'propria', status: 400 };
  await env.DB.prepare(`INSERT INTO avaliacoes_util (avaliacao_id, conta_id, util) VALUES (?, ?, ?)
    ON CONFLICT(avaliacao_id, conta_id) DO UPDATE SET util = excluded.util`).bind(id, conta.id, d?.util ? 1 : 0).run();
  return { ok: true };
}

// ---- Área do Dono ----
export async function avaliacoesDoDono(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, app, nome, nota, texto, atualizado_em, escondida, resposta FROM avaliacoes ORDER BY atualizado_em DESC LIMIT 200').all();
  return results;
}
export async function esconderAvaliacao(env, d) {
  const r = await env.DB.prepare('UPDATE avaliacoes SET escondida = ? WHERE id = ?').bind(d?.esconder === false ? 0 : 1, String(d?.id || '')).run();
  return r.meta?.changes === 0 ? { erro: 'nao_encontrado', status: 404 } : { ok: true };
}
export async function responderAvaliacao(env, d) {
  const resposta = limpar(d?.resposta, 500);
  const r = await env.DB.prepare('UPDATE avaliacoes SET resposta = ?, resposta_em = ? WHERE id = ?')
    .bind(resposta || null, resposta ? new Date().toISOString() : null, String(d?.id || '')).run();
  return r.meta?.changes === 0 ? { erro: 'nao_encontrado', status: 404 } : { ok: true };
}
