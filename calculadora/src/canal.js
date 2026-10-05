// Página do canal do WhatsApp (só o dono): as postagens prontas, na ordem do canal,
// com uma dica depois de cada 10 receitas, e a data em que cada uma foi enviada.
const LINK = 'https://www.leunamesoftware.com.br/quantocobrar';

export function textoDoCanal(r) {
  const c = r.canal || {};
  const dicas = r.dicas?.length ? r.dicas : (r.dicaVenda ? [r.dicaVenda] : []);
  return [
    `${c.emoji || '🍽️'} *${r.nome.toUpperCase()}*`, '',
    '🛒 *Ingredientes*', ...(c.ingredientes || []), '',
    '👩‍🍳 *Modo de fazer*', ...(c.preparo || []).map((p, i) => `${i + 1}. ${p}`), '',
    ...(dicas.length ? ['💡 *Dicas*', ...dicas.map((d) => `• ${d}`), ''] : []),
    '🧮 Quer as *quantidades certas*, quanto rende e *quanto cobrar* por unidade? Está tudo no app Quanto Cobrar:',
    `👉 ${LINK}`,
  ].join('\n');
}

/** Postagens liberadas e com foto de verdade, na ordem, com a dica k depois da receita 10·k. */
export function postagens(RECEITAS, DICAS, agora = Date.now()) {
  const posts = [];
  let n = 0;
  for (const r of RECEITAS) {
    const liberada = !r.liberarEm || Date.parse(r.liberarEm) <= agora;
    if (!liberada || r.fotoProvisoria) continue;
    n++;
    posts.push({ id: 'r:' + r.id, tipo: 'receita', numero: n, titulo: r.nome, foto: r.foto, texto: textoDoCanal(r) });
    const d = DICAS[n / 10 - 1];
    if (n % 10 === 0 && d) posts.push({ id: 'd:' + n / 10, tipo: 'dica', numero: n / 10, titulo: d.titulo, foto: null, texto: d.texto });
  }
  return posts;
}

export async function listarCanal(env, receitas, dicas) {
  const { results } = await env.DB.prepare('SELECT post_id, enviado_em FROM canal_envios').all();
  const enviados = new Map(results.map((x) => [x.post_id, x.enviado_em]));
  return postagens(receitas, dicas).map((p) => ({ ...p, enviadoEm: enviados.get(p.id) || null }));
}

export async function marcarEnvio(env, receitas, dicas, d) {
  const id = String(d?.id || '');
  if (!postagens(receitas, dicas).some((p) => p.id === id)) return false;
  if (d.enviado) {
    await env.DB.prepare('INSERT INTO canal_envios (post_id, enviado_em) VALUES (?, ?) ON CONFLICT(post_id) DO UPDATE SET enviado_em = excluded.enviado_em')
      .bind(id, new Date().toISOString()).run();
  } else {
    await env.DB.prepare('DELETE FROM canal_envios WHERE post_id = ?').bind(id).run();
  }
  return true;
}
