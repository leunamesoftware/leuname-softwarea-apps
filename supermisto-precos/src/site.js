// Meu site: o dono edita e cria produtos do site www.supermistotemperos.com.br pelo app, sem depender de programador.
// O site lê GET /api/site/catalogo (público) e aplica por cima do catálogo fixo; se o app cair, o site segue com o fixo.
const json = (d, status = 200, cab = {}) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cab } });
const agora = () => new Date().toISOString();
const ORIGENS = ['https://www.supermistotemperos.com.br', 'https://supermistotemperos.com.br'];
const TEXTO = { nome: 80, linha: 30, descricao: 400, usos: 300, ingredientes: 600, conservacao: 200, validade: 80, alergicos: 200 };

export const slugDe = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

/** Limpa o que veio do app: só campos conhecidos, tamanhos curtos. */
export function limpar(corpo) {
  const d = {};
  for (const [k, max] of Object.entries(TEXTO)) if (k in corpo) d[k] = String(corpo[k] ?? '').trim().slice(0, max);
  if ('tamanhos' in corpo) d.tamanhos = JSON.stringify((Array.isArray(corpo.tamanhos) ? corpo.tamanhos : []).map((t) => String(t).trim().slice(0, 12)).filter(Boolean).slice(0, 8));
  if ('oculto' in corpo) d.oculto = corpo.oculto ? 1 : 0;
  return d;
}

const linha = (r, base) => ({
  slug: r.slug, nome: r.nome || '', linha: r.linha || '', descricao: r.descricao || '', usos: r.usos || '',
  tamanhos: JSON.parse(r.tamanhos || '[]'), foto: r.foto ? `${base}/fotos/${r.foto}` : '',
  fotos_peso: Object.fromEntries(Object.entries(JSON.parse(r.fotos_peso || '{}')).map(([k, v]) => [k, `${base}/fotos/${v}`])),
  ingredientes: r.ingredientes || '', conservacao: r.conservacao || '', validade: r.validade || '', alergicos: r.alergicos || '', oculto: !!r.oculto,
});

async function linhasDoApp(env, base) {
  const { results } = await env.BANCO.prepare('SELECT * FROM site_linhas').all();
  return Object.fromEntries(results.map((r) => [r.id, { foto: r.foto ? `${base}/fotos/${r.foto}` : '', capa: r.capa ? `${base}/fotos/${r.capa}` : '' }]));
}

/** Público: catálogo para o site (com CORS só para o domínio do site). */
export async function catalogo(env, req) {
  const base = new URL(req.url).origin, origem = req.headers.get('Origin');
  const cors = ORIGENS.includes(origem) ? { 'Access-Control-Allow-Origin': origem, Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
  const { results } = await env.BANCO.prepare('SELECT * FROM site_produtos ORDER BY atualizado_em').all();
  return json({ produtos: results.map((r) => linha(r, base)), linhas: await linhasDoApp(env, base) }, 200, { ...cors, 'Cache-Control': 'public, max-age=60' });
}

/** Com login: listar, salvar e mandar foto. */
export async function api(env, req, path) {
  const m = req.method, base = new URL(req.url).origin;
  if (path === '/api/erp/site' && m === 'GET') {
    const [{ results }, cad] = await Promise.all([env.BANCO.prepare('SELECT * FROM site_produtos').all(),
      env.BANCO.prepare("SELECT chave, valor FROM shopee WHERE chave LIKE 'cad_%'").all()]);
    return json({ produtos: results.map((r) => linha(r, base)), cadastrados: Object.fromEntries(cad.results.map((c) => [c.chave.slice(4), c.valor])), linhas: await linhasDoApp(env, base) });
  }
  // Shopee: marcar produto já cadastrado à mão (some da lista de pendentes)
  if (path === '/api/erp/site/cadastrado' && m === 'POST') {
    const corpo = await req.json().catch(() => ({}));
    const slug = slugDe(corpo.slug);
    if (!slug) return json({ erro: 'Produto inválido.' }, 400);
    if (corpo.feito) await env.BANCO.prepare('INSERT INTO shopee (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(`cad_${slug}`, agora().slice(0, 10)).run();
    else await env.BANCO.prepare('DELETE FROM shopee WHERE chave = ?').bind(`cad_${slug}`).run();
    return json({ ok: true });
  }
  if (path === '/api/erp/site' && m === 'POST') {
    const corpo = await req.json().catch(() => ({}));
    const slug = slugDe(corpo.slug || corpo.nome);
    if (!slug) return json({ erro: 'Dê um nome ao produto.' }, 400);
    const d = limpar(corpo);
    if (corpo.novo && !d.nome) return json({ erro: 'Dê um nome ao produto.' }, 400);
    const cols = Object.keys(d);
    await env.BANCO.prepare(`INSERT INTO site_produtos (slug, ${[...cols, 'atualizado_em'].join(', ')}) VALUES (?${', ?'.repeat(cols.length + 1)})
      ON CONFLICT(slug) DO UPDATE SET ${[...cols, 'atualizado_em'].map((c) => `${c} = excluded.${c}`).join(', ')}`)
      .bind(slug, ...cols.map((c) => d[c]), agora()).run();
    return json(linha(await env.BANCO.prepare('SELECT * FROM site_produtos WHERE slug = ?').bind(slug).first(), base));
  }
  // Foto da linha: tipo 'foto' (quadradinho 4:3) ou 'capa' (banner largo); a imagem já chega ajustada pelo app
  if (path === '/api/erp/site/linha' && m === 'POST') {
    if (!env.FOTOS) return json({ erro: 'O armazenamento de fotos ainda não foi criado.' }, 500);
    const corpo = await req.json().catch(() => ({}));
    const id = slugDe(corpo.linha), tipo = corpo.tipo === 'capa' ? 'capa' : 'foto';
    if (!id) return json({ erro: 'Linha inválida.' }, 400);
    if (corpo.apagar) {
      await env.BANCO.prepare(`UPDATE site_linhas SET ${tipo} = NULL, atualizado_em = ? WHERE id = ?`).bind(agora(), id).run();
      return json({ linhas: await linhasDoApp(env, base) });
    }
    const mt = String(corpo.imagem || '').match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!mt || mt[3].length > 8_000_000) return json({ erro: 'Imagem inválida ou grande demais.' }, 400);
    const chave = `site/linha-${id}-${tipo}-${Date.now()}.${mt[2] === 'jpeg' ? 'jpg' : mt[2]}`;
    await env.FOTOS.put(chave, Uint8Array.from(atob(mt[3]), (c) => c.charCodeAt(0)), { httpMetadata: { contentType: mt[1] } });
    await env.BANCO.prepare(`INSERT INTO site_linhas (id, ${tipo}, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET ${tipo} = excluded.${tipo}, atualizado_em = excluded.atualizado_em`)
      .bind(id, chave, agora()).run();
    return json({ linhas: await linhasDoApp(env, base) });
  }
  if (path === '/api/erp/site/foto' && m === 'POST') {
    if (!env.FOTOS) return json({ erro: 'O armazenamento de fotos ainda não foi criado.' }, 500);
    const corpo = await req.json().catch(() => ({}));
    const slug = slugDe(corpo.slug), peso = String(corpo.peso || '').trim().slice(0, 12);
    const mt = String(corpo.imagem || '').match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!slug || !mt || mt[3].length > 6_000_000) return json({ erro: 'Foto inválida ou grande demais.' }, 400);
    const chave = `site/${slug}${peso ? '-' + slugDe(peso) : ''}-${Date.now()}.${mt[2] === 'jpeg' ? 'jpg' : mt[2]}`;
    await env.FOTOS.put(chave, Uint8Array.from(atob(mt[3]), (c) => c.charCodeAt(0)), { httpMetadata: { contentType: mt[1] } });
    const atual = await env.BANCO.prepare('SELECT * FROM site_produtos WHERE slug = ?').bind(slug).first();
    const pesos = JSON.parse(atual?.fotos_peso || '{}');
    if (peso) pesos[peso] = chave;
    await env.BANCO.prepare(`INSERT INTO site_produtos (slug, foto, fotos_peso, atualizado_em) VALUES (?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET foto = COALESCE(?, foto), fotos_peso = excluded.fotos_peso, atualizado_em = excluded.atualizado_em`)
      .bind(slug, peso ? atual?.foto || chave : chave, JSON.stringify(pesos), agora(), peso ? null : chave).run();
    return json(linha(await env.BANCO.prepare('SELECT * FROM site_produtos WHERE slug = ?').bind(slug).first(), base));
  }
  return null;
}
