// Lê um print da Shopee com a IA da Cloudflare (Workers AI) e devolve os anúncios em números.

// Modelos de visão da Cloudflare, na ordem de tentativa (se um falhar, tenta o próximo).
const MODELOS = ['@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/meta/llama-4-scout-17b-16e-instruct'];

function instrucao(produtos) {
  return `Você recebe um print da Shopee (busca ou página de produto) com anúncios de temperos.
Extraia CADA anúncio visível no print. Responda SOMENTE com JSON, sem texto antes ou depois, neste formato:
{"loja": "nome da loja se aparecer no print, senão null",
 "itens": [{"anuncio": "título do anúncio",
            "produto": "um destes ids: ${produtos.map((p) => `${p.id} (${p.nome})`).join(', ')}; ou null se não for nenhum deles",
            "gramas_total": peso TOTAL do anúncio em gramas (kit 10 sachês de 10 g = 100; 1 kg = 1000),
            "preco": preço em reais mostrado (se for faixa, o menor),
            "vendidos": quantidade vendida mostrada ou null}]}
Não invente anúncios. Se o peso não aparecer, use null.`;
}

function numero(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).toLowerCase().replace(/r\$|\s|vendidos?|g\b/g, '');
  const mil = /mil|k$/.test(s);
  s = s.replace(/mil|k$/, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? (mil ? Math.round(n * 1000) : n) : null;
}

/** Transforma o texto da IA em itens limpos (exportada para os testes). */
export function lerResposta(texto, ids) {
  const t = typeof texto === 'string' ? texto : JSON.stringify(texto);
  const ini = t.indexOf('{'), fim = t.lastIndexOf('}');
  if (ini < 0 || fim < ini) return { loja: null, itens: [] };
  let d;
  try { d = JSON.parse(t.slice(ini, fim + 1)); } catch { return { loja: null, itens: [] }; }
  const itens = (Array.isArray(d.itens) ? d.itens : [])
    .map((i) => ({
      anuncio: String(i.anuncio || '').slice(0, 200),
      produto_id: ids.includes(i.produto) ? i.produto : null,
      gramas: numero(i.gramas_total),
      preco: numero(i.preco),
      vendidos: numero(i.vendidos),
    }))
    .filter((i) => i.preco > 0 && i.preco < 10000);
  return { loja: d.loja ? String(d.loja).slice(0, 80) : null, itens };
}

function perguntar(env, modelo, texto, imagem) {
  return env.AI.run(modelo, {
    messages: [{ role: 'user', content: [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url: imagem } }] }],
    max_tokens: 2500, temperature: 0,
  });
}

export async function lerPrint(env, imagemDataUrl, produtos) {
  const erros = [];
  for (const modelo of MODELOS) {
    try {
      const r = await perguntar(env, modelo, instrucao(produtos), imagemDataUrl);
      const lido = lerResposta(r?.response ?? r, produtos.map((p) => p.id));
      if (lido.itens.length || modelo === MODELOS[MODELOS.length - 1]) return { ...lido, modelo };
      erros.push(`${modelo}: sem itens: ${JSON.stringify(r?.response ?? r).slice(0, 400)}`);
    } catch (e) { erros.push(`${modelo}: ${String(e).slice(0, 150)}`); }
  }
  throw new Error(erros.join(' | '));
}
