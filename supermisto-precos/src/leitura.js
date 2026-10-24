// Lê um print da Shopee com a IA da Cloudflare (Workers AI) e devolve os anúncios em números.

// Modelos de visão da Cloudflare, na ordem de tentativa (se um falhar, tenta o próximo).
const MODELOS = ['@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/meta/llama-4-scout-17b-16e-instruct'];

function instrucao(produtos) {
  return `Você recebe um print da Shopee (busca ou página de produto) com anúncios de temperos.
Extraia CADA anúncio visível no print. Responda SOMENTE com JSON, sem texto antes ou depois, neste formato:
{"loja": "nome da loja se aparecer no print, senão null",
 "itens": [{"anuncio": "título do anúncio",
            "produto": "um destes ids: ${produtos.map((p) => `${p.id} (${p.nome})`).join(', ')}; use sortido para kit com vários sabores diferentes; ou null se não for nenhum deles",
            "unidades": quantos pacotinhos/sachês vêm no anúncio (1 se for um pacote só),
            "gramas_unidade": gramas de CADA pacotinho/sachê,
            "gramas_total": peso TOTAL do anúncio em gramas (unidades × gramas_unidade; kit 30 sachês de 30 g = 900),
            "preco": preço em reais mostrado (se for faixa, o menor),
            "vendidos": quantidade vendida mostrada, em número (7mil+ = 7000; 100mil+ = 100000) ou null}]}
Exemplos: "Kit 10 temperos 100 g cada" = unidades 10, gramas_unidade 100, gramas_total 1000. "Kit 30 sachês 30g" = 30, 30, 900. "Kit 20 unidades" sem peso = unidades 20, gramas null.
Coloque TODOS os anúncios num único JSON (um só objeto com a lista "itens"); se houver lojas diferentes, use o campo "loja" dentro de cada item.
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

/** Pega todos os objetos JSON do texto (a IA às vezes manda vários, separados por vírgula). */
function objetosJson(t) {
  const lista = [];
  let nivel = 0, ini = -1, aspas = false, escape = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') aspas = false; continue; }
    if (c === '"') aspas = true;
    else if (c === '{') { if (nivel++ === 0) ini = i; }
    else if (c === '}' && nivel > 0 && --nivel === 0) { try { lista.push(JSON.parse(t.slice(ini, i + 1))); } catch { /* ignora pedaço quebrado */ } }
  }
  return lista;
}

/** Transforma o texto da IA em itens limpos (exportada para os testes). */
export function lerResposta(texto, ids) {
  const t = typeof texto === 'string' ? texto : JSON.stringify(texto);
  const objs = objetosJson(t).filter((o) => Array.isArray(o.itens));
  const loja = objs.find((o) => o.loja)?.loja;
  const itens = objs.flatMap((o) => o.itens.map((i) => ({ ...i, loja: i.loja || o.loja })))
    .map((i) => ({
      anuncio: String(i.anuncio || '').slice(0, 200),
      produto_id: ids.includes(i.produto) ? i.produto : null,
      ...(() => {
        const un = numero(i.unidades), gu = numero(i.gramas_unidade);
        let total = numero(i.gramas_total);
        if (!(total > 0) && un > 0 && gu > 0) total = un * gu;
        return { unidades: un > 0 ? un : null, gramas_unidade: gu > 0 ? gu : (total > 0 && un > 0 ? Math.round(total / un) : null), gramas: total > 0 ? total : null };
      })(),
      preco: numero(i.preco),
      vendidos: (() => { const v = numero(i.vendidos); return v > 2e6 ? Math.round(v / 1000) : v; })(),
      ...(i.loja ? { loja: String(i.loja).slice(0, 80) } : {}),
    }))
    .filter((i) => i.preco > 0 && i.preco < 10000);
  return { loja: loja ? String(loja).slice(0, 80) : null, itens };
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
      erros.push(`${modelo}: sem itens`);
    } catch (e) { erros.push(`${modelo}: ${String(e).slice(0, 150)}`); }
  }
  throw new Error(erros.join(' | '));
}
