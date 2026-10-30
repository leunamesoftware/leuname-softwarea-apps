// Radar de Produtos (só o dono): lê o catálogo público de lojas Shopify concorrentes
// (/products.json, o mesmo que qualquer visitante pode abrir) e calcula o lucro de um produto.
// Nada é guardado aqui; a lista de lojas e produtos fica no navegador do dono.

const MAX_PRODUTOS = 250;
const MAX_BYTES = 6 * 1024 * 1024;

/** Aceita "https://loja.com/algo", "loja.com" ou "www.loja.com" e devolve só o domínio, ou null se não servir. */
export function dominioDaLoja(entrada) {
  let t = String(entrada || '').trim().toLowerCase();
  if (!t || t.length > 200) return null;
  t = t.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(t)) return null;
  // Nunca endereços internos nem IPs (evita usar este servidor para olhar a rede interna).
  if (/^\d+(\.\d+){3}$/.test(t) || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(t)) return null;
  return t;
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** Transforma o JSON da Shopify numa lista simples. `posicao` 1 = primeiro da lista (mais vendido, se veio nessa ordem). */
export function normalizarProdutos(json, dominio) {
  const lista = Array.isArray(json?.products) ? json.products : [];
  return lista.slice(0, MAX_PRODUTOS).map((p, i) => {
    const precos = (p.variants || []).map((v) => num(v.price)).filter((x) => x !== null && x > 0);
    const comparar = (p.variants || []).map((v) => num(v.compare_at_price)).filter((x) => x !== null && x > 0);
    return {
      id: `${dominio}:${p.id}`,
      loja: dominio,
      titulo: String(p.title || '').slice(0, 160),
      preco: precos.length ? Math.min(...precos) : null,
      precoAntes: comparar.length ? Math.max(...comparar) : null,
      foto: p.images?.[0]?.src || null,
      tipo: String(p.product_type || '').slice(0, 60),
      criado: p.created_at || null,
      publicado: p.published_at || null,
      variantes: (p.variants || []).length,
      link: `https://${dominio}/products/${encodeURIComponent(p.handle || '')}`,
      posicao: i + 1,
    };
  });
}

async function buscar(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeuRadar/1.0)', Accept: 'application/json' }, redirect: 'follow' });
  if (!r.ok) return { ok: false, status: r.status };
  const tipo = r.headers.get('Content-Type') || '';
  if (!tipo.includes('json')) return { ok: false, status: 415 };
  const texto = await r.text();
  if (texto.length > MAX_BYTES) return { ok: false, status: 413 };
  try { return { ok: true, json: JSON.parse(texto) }; } catch { return { ok: false, status: 422 }; }
}

/**
 * Lê uma loja. Tenta primeiro a ordem "mais vendidos" da loja; se ela não aceitar, usa o catálogo normal.
 * `ordem` diz qual das duas deu certo ("mais-vendidos" ou "catalogo"), para o app avisar o dono.
 */
export async function lerLoja(entrada) {
  const dominio = dominioDaLoja(entrada);
  if (!dominio) return { erro: 'endereco', status: 400 };
  try {
    const tentativas = [
      [`https://${dominio}/collections/all/products.json?sort_by=best-selling&limit=${MAX_PRODUTOS}`, 'mais-vendidos'],
      [`https://${dominio}/products.json?limit=${MAX_PRODUTOS}`, 'catalogo'],
    ];
    for (const [url, ordem] of tentativas) {
      const r = await buscar(url);
      if (r.ok && Array.isArray(r.json?.products) && r.json.products.length) {
        return { loja: dominio, ordem, produtos: normalizarProdutos(r.json, dominio) };
      }
    }
    return { erro: 'sem_catalogo', status: 422 };
  } catch {
    return { erro: 'loja_nao_respondeu', status: 502 };
  }
}

/**
 * Lucro de um produto vendido em Portugal. Todos os valores em euros.
 * - preco: o que o cliente paga (já com IVA).
 * - custo e frete: o que a CJ cobra.
 * - iva (%): IVA português, pago por nós no regime IOSS.
 * - ioss (%): taxa extra da CJ pelo IOSS, calculada de forma prudente sobre o preço de venda.
 * - stripe (%) e stripeFixo: taxa do meio de pagamento.
 * - anuncio: custo de anúncio por venda (0 se ainda não sabe).
 */
export function calcularLucro({ preco, custo, frete = 0, iva = 23, ioss = 3, stripe = 1.5, stripeFixo = 0.25, anuncio = 0 }) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const P = n(preco);
  if (P <= 0) return { erro: 'preco' };
  const valorIva = P - P / (1 + n(iva) / 100);
  const taxaIoss = P * (n(ioss) / 100);
  const taxaPagamento = P * (n(stripe) / 100) + n(stripeFixo);
  const custos = n(custo) + n(frete) + valorIva + taxaIoss + taxaPagamento;
  const lucroAntesAnuncio = P - custos;
  const lucro = lucroAntesAnuncio - n(anuncio);
  const r2 = (x) => Math.round(x * 100) / 100;
  // Preço mínimo para não ter prejuízo gastando `anuncio` por venda.
  const fixos = n(custo) + n(frete) + n(stripeFixo) + n(anuncio);
  const parteVariavel = 1 / (1 + n(iva) / 100) - n(ioss) / 100 - n(stripe) / 100;
  const precoEquilibrio = parteVariavel > 0 ? fixos / parteVariavel : null;
  return {
    iva: r2(valorIva), ioss: r2(taxaIoss), pagamento: r2(taxaPagamento), custoTotal: r2(custos),
    lucroAntesAnuncio: r2(lucroAntesAnuncio), lucro: r2(lucro), margem: r2((lucro / P) * 100),
    precoEquilibrio: precoEquilibrio === null ? null : r2(precoEquilibrio),
    // Quanto pode gastar em anúncio por venda sem ficar no prejuízo.
    anuncioMaximo: r2(Math.max(0, lucroAntesAnuncio)),
  };
}
