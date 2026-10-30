// Ligação do app LeunaPets com a loja Shopify (só o dono).
// Envia o produto escolhido como RASCUNHO (não aparece para os clientes) e lista o que já está na loja.
// A chave fica na tabela shopify_config (D1) e nunca volta para o navegador.
import { detalharCj } from './cj.js';

const VERSAO = '2025-07';
const COLECOES = { 'Cães': ['Cães', 'Caes', 'Cães e Gatos'], 'Gatos': ['Gatos'] };

export const lojaValida = (l) => typeof l === 'string' && /^[a-z0-9][a-z0-9-]{1,60}\.myshopify\.com$/.test(l.trim().toLowerCase());
export const chaveValida = (c) => typeof c === 'string' && /^[A-Za-z0-9_\-]{16,200}$/.test(c.trim());
export const nomeLoja = (dominio) => dominio.replace(/\.myshopify\.com$/, '');

async function graphql(loja, token, query, variaveis) {
  const r = await fetch(`https://${loja}/admin/api/${VERSAO}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables: variaveis || {} }),
  });
  let j = null; try { j = await r.json(); } catch {}
  return { http: r.status, j };
}

async function trocarPorToken(loja, clientId, clientSecret) {
  try {
    const r = await fetch(`https://${loja}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }) });
    const j = await r.json();
    if (!j?.access_token) return null;
    return { token: j.access_token, expira: new Date(Date.now() + (Number(j.expires_in) || 86400) * 1000).toISOString() };
  } catch { return null; }
}

const QUERY_LOJA = '{ shop { name myshopifyDomain primaryDomain { url } } }';

/** Testa e guarda. Dois jeitos: token direto (shpat_…) ou ID do cliente + segredo do app. */
export async function guardarLoja(env, { loja, token, clientId, clientSecret }) {
  const dominio = String(loja || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!lojaValida(dominio)) return { erro: 'loja_invalida', status: 400 };
  let tk = null, expira = null, cid = null, csec = null;
  if (clientId || clientSecret) {
    if (!chaveValida(clientId) || !chaveValida(clientSecret)) return { erro: 'chave_invalida', status: 400 };
    cid = clientId.trim(); csec = clientSecret.trim();
    const t = await trocarPorToken(dominio, cid, csec);
    if (!t) return { erro: 'shopify_recusou', status: 422 };
    tk = t.token; expira = t.expira;
  } else {
    if (!chaveValida(token)) return { erro: 'chave_invalida', status: 400 };
    tk = token.trim();
  }
  const t = await graphql(dominio, tk, QUERY_LOJA).catch(() => null);
  if (!t?.j?.data?.shop) return { erro: t?.http === 401 || t?.http === 403 ? 'shopify_recusou' : 'shopify_nao_respondeu', status: 422 };
  await env.DB.prepare('INSERT INTO shopify_config (id, loja, token, client_id, client_secret, token_expira, atualizado_em) VALUES (1, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET loja = excluded.loja, token = excluded.token, client_id = excluded.client_id, client_secret = excluded.client_secret, token_expira = excluded.token_expira, atualizado_em = excluded.atualizado_em')
    .bind(dominio, tk, cid, csec, expira, new Date().toISOString()).run();
  return { ok: true, nome: t.j.data.shop.name };
}

export async function removerLoja(env) {
  await env.DB.prepare('DELETE FROM shopify_config WHERE id = 1').run();
  return { ok: true };
}

export async function estadoShopify(env) {
  const l = await env.DB.prepare('SELECT loja FROM shopify_config WHERE id = 1').first();
  if (!l) return { ligada: false };
  const h = nomeLoja(l.loja);
  return { ligada: true, loja: l.loja, admin: `https://admin.shopify.com/store/${h}`, produtosAdmin: `https://admin.shopify.com/store/${h}/products`, vitrine: `https://${l.loja}` };
}

async function credenciais(env, forcar = false) {
  const l = await env.DB.prepare('SELECT loja, token, client_id, client_secret, token_expira FROM shopify_config WHERE id = 1').first();
  if (!l) return null;
  if (l.client_id && (forcar || !l.token || !l.token_expira || new Date(l.token_expira).getTime() < Date.now() + 120000)) {
    const t = await trocarPorToken(l.loja, l.client_id, l.client_secret);
    if (!t) return null;
    await env.DB.prepare('UPDATE shopify_config SET token = ?, token_expira = ?, atualizado_em = ? WHERE id = 1').bind(t.token, t.expira, new Date().toISOString()).run();
    return { loja: l.loja, token: t.token };
  }
  return { loja: l.loja, token: l.token };
}

/** Chama o Shopify; se recusar o token (cliente+segredo), renova uma vez. Erros do GraphQL viram { erro }. */
async function consultar(env, query, variaveis) {
  let c = await credenciais(env);
  if (!c) return { erro: 'sem_loja', status: 409 };
  let r = await graphql(c.loja, c.token, query, variaveis).catch(() => null);
  if (r && r.http === 401) { c = await credenciais(env, true); if (!c) return { erro: 'shopify_recusou', status: 422 }; r = await graphql(c.loja, c.token, query, variaveis).catch(() => null); }
  if (!r) return { erro: 'shopify_nao_respondeu', status: 502 };
  if (r.http === 401 || r.http === 403) return { erro: 'shopify_recusou', status: 422 };
  if (r.http === 429) return { erro: 'muitas_chamadas', status: 429 };
  if (r.j?.errors?.length) {
    const msg = JSON.stringify(r.j.errors);
    return { erro: /access denied|scope|permission/i.test(msg) ? 'sem_permissao' : 'shopify_erro', status: 422, detalhe: msg.slice(0, 300) };
  }
  return { dados: r.j?.data, loja: c.loja };
}

const gidNum = (gid) => String(gid || '').split('/').pop();

/** Produtos que já estão na loja (para o app mostrar "Na minha loja"). */
export async function listarProdutos(env) {
  const r = await consultar(env, '{ products(first: 30, sortKey: UPDATED_AT, reverse: true) { nodes { id title status handle tags featuredMedia { preview { image { url } } } priceRangeV2 { minVariantPrice { amount } } } } }');
  if (r.erro) return r;
  const h = nomeLoja(r.loja);
  return { produtos: (r.dados?.products?.nodes || []).map((p) => ({
    id: gidNum(p.id), titulo: p.title, status: p.status, foto: p.featuredMedia?.preview?.image?.url || null,
    preco: Number(p.priceRangeV2?.minVariantPrice?.amount) || null, admin: `https://admin.shopify.com/store/${h}/products/${gidNum(p.id)}`,
    cj: (p.tags || []).find((t) => t.startsWith('cj-'))?.slice(3) || null,
  })) };
}

async function acharColecao(env, tipo) {
  const r = await consultar(env, '{ collections(first: 50) { nodes { id title } } }');
  if (r.erro) return null;
  const lista = r.dados?.collections?.nodes || [];
  const nomes = (COLECOES[tipo] || []).map((n) => n.toLowerCase());
  return lista.find((c) => nomes.includes(String(c.title).toLowerCase()))?.id || null;
}

/**
 * Cria o produto como rascunho. Dados: pid da CJ, titulo, preco (€ com IVA), tipo ('Cães' | 'Gatos').
 * Fotos vêm da CJ. O texto fica em branco de propósito: é ajustado depois, em português de Portugal.
 */
export async function enviarProduto(env, { pid, titulo, preco, tipo, fotos }) {
  const t = String(titulo || '').trim().slice(0, 150);
  const p = Math.round(Number(preco) * 100) / 100;
  if (!t || !(p > 0 && p < 1000)) return { erro: 'dados', status: 400 };
  const tp = tipo === 'Gatos' ? 'Gatos' : 'Cães';
  const tag = `cj-${String(pid || '').trim()}`;
  if (!/^cj-[A-Za-z0-9-]{6,60}$/.test(tag)) return { erro: 'pid', status: 400 };
  // Não duplicar: se já existe um produto com esta etiqueta, devolve o link dele.
  const ja = await consultar(env, 'query($q: String!) { products(first: 1, query: $q) { nodes { id title status } } }', { q: `tag:'${tag}'` });
  if (ja.erro) return ja;
  const h = nomeLoja(ja.loja);
  const existente = ja.dados?.products?.nodes?.[0];
  if (existente) return { erro: 'ja_enviado', status: 409, admin: `https://admin.shopify.com/store/${h}/products/${gidNum(existente.id)}` };
  const det = await detalharCj(env, pid);
  if (det.erro) return det;
  // `fotos` (opcional): só estas, e só se forem mesmo da CJ (o app descarta as que têm letras antes de enviar).
  const escolhidas = Array.isArray(fotos) ? det.fotos.filter((u) => fotos.includes(u)) : det.fotos;
  const media = escolhidas.map((u) => ({ originalSource: u, mediaContentType: 'IMAGE', alt: t }));
  const cri = await consultar(env, `mutation($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) { product { id variants(first: 1) { nodes { id } } } userErrors { field message } } }`,
  { product: { title: t, status: 'DRAFT', vendor: 'LeunaPets', productType: tp === 'Gatos' ? 'Gatos' : 'Cães', tags: [tag, tp] }, media });
  if (cri.erro) return cri;
  const pc = cri.dados?.productCreate;
  if (pc?.userErrors?.length || !pc?.product) return { erro: 'shopify_erro', status: 422, detalhe: JSON.stringify(pc?.userErrors || []).slice(0, 300) };
  const prodId = pc.product.id, varId = pc.product.variants?.nodes?.[0]?.id;
  let avisos = [];
  if (varId) {
    const v = await consultar(env, `mutation($pid: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $pid, variants: $variants) { userErrors { message } } }`,
      { pid: prodId, variants: [{ id: varId, price: p.toFixed(2), inventoryItem: { tracked: false, requiresShipping: true } }] });
    if (v.erro || v.dados?.productVariantsBulkUpdate?.userErrors?.length) avisos.push('preco');
  } else avisos.push('preco');
  const col = await acharColecao(env, tp);
  if (col) {
    const a = await consultar(env, 'mutation($id: ID!, $ids: [ID!]!) { collectionAddProducts(id: $id, productIds: $ids) { userErrors { message } } }', { id: col, ids: [prodId] });
    if (a.erro || a.dados?.collectionAddProducts?.userErrors?.length) avisos.push('colecao');
  } else avisos.push('colecao');
  return { ok: true, admin: `https://admin.shopify.com/store/${h}/products/${gidNum(prodId)}`, fotos: escolhidas.length, avisos };
}

/** Todas as fotos dos produtos da loja (até 50 produtos, 30 fotos cada), para a galeria do app. */
export async function listarFotos(env) {
  const r = await consultar(env, '{ products(first: 50, sortKey: UPDATED_AT, reverse: true) { nodes { id title status media(first: 30) { nodes { ... on MediaImage { id image { url } } } } } } }');
  if (r.erro) return r;
  const fotos = [];
  for (const p of r.dados?.products?.nodes || []) {
    for (const m of p.media?.nodes || []) {
      if (m?.id && m.image?.url) fotos.push({ produto: p.id, titulo: p.title, status: p.status, media: m.id, url: m.image.url });
    }
  }
  return { fotos };
}

const GID_PRODUTO = /^gid:\/\/shopify\/Product\/\d+$/;
const GID_MEDIA = /^gid:\/\/shopify\/MediaImage\/\d+$/;

/** Apaga fotos de produtos. itens = [{ produto, media }]. Devolve quantas foram apagadas e quantas falharam. */
export async function apagarFotos(env, itens) {
  if (!Array.isArray(itens) || !itens.length || itens.length > 200) return { erro: 'dados', status: 400 };
  const porProduto = new Map();
  for (const i of itens) {
    if (!GID_PRODUTO.test(i?.produto) || !GID_MEDIA.test(i?.media)) return { erro: 'dados', status: 400 };
    if (!porProduto.has(i.produto)) porProduto.set(i.produto, []);
    porProduto.get(i.produto).push(i.media);
  }
  let apagadas = 0, falhas = 0;
  for (const [produto, ids] of porProduto) {
    for (let k = 0; k < ids.length; k += 20) {
      const lote = ids.slice(k, k + 20);
      const r = await consultar(env, 'mutation($p: ID!, $m: [ID!]!) { productDeleteMedia(productId: $p, mediaIds: $m) { deletedMediaIds mediaUserErrors { message } } }', { p: produto, m: lote });
      if (r.erro) { if (r.erro === 'sem_permissao' || r.erro === 'shopify_recusou' || r.erro === 'sem_loja') return r; falhas += lote.length; continue; }
      const feitas = r.dados?.productDeleteMedia?.deletedMediaIds?.length || 0;
      apagadas += feitas; falhas += lote.length - feitas;
    }
  }
  return { ok: true, apagadas, falhas };
}

const HOSTS_FOTO = /(^|\.)(cjdropshipping\.com|cjdropshipping\.cn|cjcdn\.com|cdn\.shopify\.com)$/;

/** Baixa uma foto da CJ ou da Shopify para o app ler as letras (o navegador sozinho não consegue por causa de CORS). */
export async function baixarFoto(url) {
  let u;
  try { u = new URL(String(url || '')); } catch { return { erro: 'url', status: 400 }; }
  if (u.protocol !== 'https:' || !HOSTS_FOTO.test(u.hostname)) return { erro: 'url', status: 400 };
  try {
    const r = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeunaPets/1.0)' }, redirect: 'follow' });
    if (!r.ok) return { erro: 'foto_indisponivel', status: 502 };
    const tipo = r.headers.get('Content-Type') || '';
    if (!/^image\/(jpeg|png|webp|gif)/.test(tipo)) return { erro: 'foto_indisponivel', status: 415 };
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) return { erro: 'foto_grande', status: 413 };
    return { corpo: buf, tipo };
  } catch { return { erro: 'foto_indisponivel', status: 502 }; }
}
