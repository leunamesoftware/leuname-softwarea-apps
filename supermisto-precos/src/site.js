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

/** Público: catálogo para o site (com CORS só para o domínio do site). */
export async function catalogo(env, req) {
  const base = new URL(req.url).origin, origem = req.headers.get('Origin');
  const cors = ORIGENS.includes(origem) ? { 'Access-Control-Allow-Origin': origem, Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
  const { results } = await env.BANCO.prepare('SELECT * FROM site_produtos ORDER BY atualizado_em').all();
  return json({ produtos: results.map((r) => linha(r, base)) }, 200, { ...cors, 'Cache-Control': 'public, max-age=60' });
}

/** Com login: listar, salvar e mandar foto. */
export async function api(env, req, path) {
  const m = req.method, base = new URL(req.url).origin;
  if (path === '/api/erp/site' && m === 'GET') {
    const { results } = await env.BANCO.prepare('SELECT * FROM site_produtos').all();
    return json({ produtos: results.map((r) => linha(r, base)) });
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
