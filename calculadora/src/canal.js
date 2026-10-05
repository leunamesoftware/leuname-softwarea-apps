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

// TikTok: link no texto não é clicável (fica na bio) e o texto vai separado da foto.
const TAG_CATEGORIA = { Doces: 'docescaseiros', Salgados: 'salgados', Bolos: 'bolocaseiro', Sobremesas: 'sobremesa', Sorvetes: 'geladinho',
  Lanches: 'lanches', Marmitas: 'marmitas', Caldos: 'caldos', 'Pães': 'paocaseiro' };
const tag = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function textoTikTok(r) {
  const c = r.canal || {};
  return [
    `${c.emoji || '🍽️'} ${r.nome}: receita que vende!`, '',
    'A receita completa, com ingredientes e modo de fazer, está no nosso canal do WhatsApp "Quanto Devo Cobrar?" 👉 link na bio.', '',
    'Quer saber quanto rende e por quanto vender? A calculadora Quanto Cobrar faz a conta pra você. 💰', '',
    ['#receitas', '#receitasfaceis', '#rendaextra', '#empreendedorismo', '#' + (TAG_CATEGORIA[r.categoria] || 'receitacaseira'), '#' + tag(r.nome)].join(' '),
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
    posts.push({ id: 'r:' + r.id, tipo: 'receita', numero: n, titulo: r.nome, foto: r.foto, texto: textoDoCanal(r), tiktok: textoTikTok(r) });
    const d = DICAS[n / 10 - 1];
    if (n % 10 === 0 && d) posts.push({ id: 'd:' + n / 10, tipo: 'dica', numero: n / 10, titulo: d.titulo, foto: null, texto: d.texto });
  }
  return posts;
}

export async function listarCanal(env, receitas, dicas) {
  const { results } = await env.DB.prepare('SELECT post_id, enviado_em FROM canal_envios').all();
  const enviados = new Map(results.map((x) => [x.post_id, x.enviado_em]));
  return postagens(receitas, dicas).map((p) => ({ ...p, enviadoEm: enviados.get(p.id) || null, enviadoTikTok: enviados.get('tt:' + p.id) || null }));
}

export async function marcarEnvio(env, receitas, dicas, d) {
  const id = String(d?.id || '');
  // "tt:" na frente = envio para o TikTok (só receitas).
  const base = id.replace(/^tt:/, '');
  if (!postagens(receitas, dicas).some((p) => p.id === base && (base === id || p.tipo === 'receita'))) return false;
  if (d.enviado) {
    await env.DB.prepare('INSERT INTO canal_envios (post_id, enviado_em) VALUES (?, ?) ON CONFLICT(post_id) DO UPDATE SET enviado_em = excluded.enviado_em')
      .bind(id, new Date().toISOString()).run();
  } else {
    await env.DB.prepare('DELETE FROM canal_envios WHERE post_id = ?').bind(id).run();
  }
  return true;
}
