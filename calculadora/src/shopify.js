// Ligação do app LeunaPets com a loja Shopify (só o dono).
// Envia o produto escolhido como RASCUNHO (não aparece para os clientes) e lista o que já está na loja.
// A chave fica na tabela shopify_config (D1) e nunca volta para o navegador.
import { detalharCj, cambioUsdEur, analisarCj, improprio } from './cj.js';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const r = await consultar(env, '{ products(first: 100, sortKey: UPDATED_AT, reverse: true, query: "-status:archived") { nodes { id title status handle tags featuredMedia { preview { image { url } } } priceRangeV2 { minVariantPrice { amount } } } } }');
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
  if (improprio(t)) return { erro: 'improprio', status: 422 };
  const tp = tipo === 'Gatos' ? 'Gatos' : tipo === 'Ambos' ? 'Ambos' : 'Cães';
  const tipos = tp === 'Ambos' ? ['Cães', 'Gatos'] : [tp];
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
  { product: { title: t, status: 'DRAFT', vendor: 'LeunaPets', productType: tp === 'Ambos' ? 'Cães e Gatos' : tp, tags: [tag, ...tipos] }, media });
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
  for (const t1 of tipos) {
    const col = await acharColecao(env, t1);
    if (col) {
      const a = await consultar(env, 'mutation($id: ID!, $ids: [ID!]!) { collectionAddProducts(id: $id, productIds: $ids) { userErrors { message } } }', { id: col, ids: [prodId] });
      if (a.erro || a.dados?.collectionAddProducts?.userErrors?.length) avisos.push('colecao');
    } else avisos.push('colecao');
  }
  return { ok: true, admin: `https://admin.shopify.com/store/${h}/products/${gidNum(prodId)}`, fotos: escolhidas.length, avisos };
}


// ---- Cores e tamanhos (variantes) ----
const CORES = { pink: 'Rosa', red: 'Vermelho', green: 'Verde', blue: 'Azul', 'light blue': 'Azul claro', grey: 'Cinzento', gray: 'Cinzento', black: 'Preto', white: 'Branco',
  brown: 'Castanho', coffee: 'Café', beige: 'Bege', yellow: 'Amarelo', purple: 'Roxo', orange: 'Laranja', khaki: 'Caqui', cream: 'Creme', camel: 'Camelo', apricot: 'Alperce',
  navy: 'Azul-marinho', rose: 'Rosa', silver: 'Prateado', gold: 'Dourado', 'dark grey': 'Cinzento escuro', 'light grey': 'Cinzento claro',
  'cherry blossom powder': 'Rosa claro', 'cherry blossom': 'Rosa claro', 'starry sky grey': 'Cinzento', 'starry sky gray': 'Cinzento', 'starry sky': 'Cinzento', 'smog green': 'Verde', smog: 'Verde', 'cream yellow': 'Creme', 'cream': 'Creme' };
const RE_CORES = new RegExp('\\b(' + Object.keys(CORES).sort((a, b) => b.length - a.length).join('|') + ')\\b', 'gi');

/** Tira o nome do produto da frente do nome da variante da CJ e põe as cores em português. */
export function nomeOpcao(nomeVar, nomeProd) {
  let n = String(nomeVar || '').trim();
  const base = String(nomeProd || '').trim();
  if (base && n.toLowerCase().startsWith(base.toLowerCase())) n = n.slice(base.length);
  else if (base) { // a CJ às vezes corta o nome: tira o maior começo em comum
    let i = 0; const a = n.toLowerCase(), b = base.toLowerCase();
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (i >= 15) n = n.slice(i);
  }
  n = n.replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '').replace(/\s+/g, ' ');
  if (!n || n.length < 1) return '';
  n = n.replace(RE_CORES, (w) => CORES[w.toLowerCase()] || w);
  return n.slice(0, 60);
}

/**
 * Plano das variantes: nome único, preço (o do produto + a diferença de custo ×2,5, no máximo 44,90) e foto da CJ.
 * `base` = preço do produto (variante mais barata). Devolve [] se não houver o que escolher.
 */
export function planoVariantes(variantes, nomeProd, base, cambio, teto = 44.9) {
  const lista = (variantes || []).filter((v) => v && v.vid && Number.isFinite(v.precoUsd)).slice(0, 30);
  if (lista.length < 2) return [];
  const minimo = Math.min(...lista.map((v) => v.precoUsd));
  const usados = new Map(); const plano = [];
  for (const v of lista) {
    let nome = nomeOpcao(v.nome, nomeProd) || 'Padrão';
    const k = nome.toLowerCase(); const n = (usados.get(k) || 0) + 1; usados.set(k, n);
    if (n > 1) nome = `${nome} (${n})`;
    const extra = cambio ? Math.max(0, (v.precoUsd - minimo) * cambio * 2.5) : 0;
    const preco = Math.min(teto, Math.round((base + Math.ceil(extra)) * 100) / 100);
    plano.push({ vid: v.vid, nome, preco: Math.max(preco, base).toFixed(2), foto: v.foto || null });
  }
  if (new Set(plano.map((x) => x.nome.toLowerCase())).size < 2) return [];
  return plano;
}

const baseFoto = (u) => String(u || '').split('?')[0].split('/').pop().toLowerCase().replace(/_\d+x\d*(?=\.)/, '').replace(/\.[a-z0-9]+$/, '');

/**
 * Cria as opções (cor/tamanho) num produto que só tem 1 variante e põe a foto de cada cor.
 * Pode ser chamado de novo: se o produto já tem opções, só tenta pôr as fotos que faltam.
 */
export async function ativarVariantes(env, { pid }) {
  const tag = `cj-${String(pid || '').trim()}`;
  if (!/^cj-[A-Za-z0-9-]{6,60}$/.test(tag)) return { erro: 'pid', status: 400 };
  const q = await consultar(env, `query($q: String!) { products(first: 1, query: $q) { nodes { id title media(first: 40) { nodes { ... on MediaImage { id image { url } } } }
    variants(first: 60) { nodes { id title price selectedOptions { name value } media(first: 1) { nodes { id } } } } } } }`, { q: `tag:'${tag}'` });
  if (q.erro) return q;
  const prod = q.dados?.products?.nodes?.[0];
  if (!prod) return { erro: 'nao_achei', status: 404 };
  const vs = prod.variants?.nodes || [];
  const det = await detalharCj(env, pid);
  if (det.erro) return det;
  const cambio = await cambioUsdEur();
  const base = Number(vs[0]?.price) || 0;
  let criadas = 0, avisos = [];
  if (vs.length === 1) {
    const plano = planoVariantes(det.variantes, det.nome, base, cambio);
    if (!plano.length) return { ok: true, criadas: 0, fotos: 0, sem_opcoes: true, avisos };
    const o = await consultar(env, `mutation($id: ID!, $opts: [OptionCreateInput!]!) { productOptionsCreate(productId: $id, options: $opts) { userErrors { message } product { variants(first: 5) { nodes { id } } } } }`,
      { id: prod.id, opts: [{ name: 'Opção', values: [{ name: plano[0].nome }] }] });
    const oe = o.dados?.productOptionsCreate;
    if (o.erro || oe?.userErrors?.length) return { erro: 'shopify_erro', status: 422, detalhe: JSON.stringify(oe?.userErrors || o).slice(0, 300) };
    const resto = plano.slice(1).map((x) => ({ optionValues: [{ optionName: 'Opção', name: x.nome }], price: x.preco, inventoryItem: { tracked: false, requiresShipping: true } }));
    const b = await consultar(env, `mutation($id: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $id, variants: $v, strategy: DEFAULT) { userErrors { message } } }`, { id: prod.id, v: resto });
    const be = b.dados?.productVariantsBulkCreate;
    if (b.erro || be?.userErrors?.length) return { erro: 'shopify_erro', status: 422, detalhe: JSON.stringify(be?.userErrors || b).slice(0, 300) };
    criadas = plano.length;
    avisos.push('opcoes_criadas');
    // O preço da primeira não muda; confere o que ficou.
  }
  // Fotos: acha a foto de cada cor entre as fotos que o produto já tem (pelo nome do arquivo).
  const r2 = await consultar(env, `query($id: ID!) { product(id: $id) { media(first: 40) { nodes { ... on MediaImage { id image { url } } } }
    variants(first: 60) { nodes { id title media(first: 1) { nodes { id } } } } } }`, { id: prod.id });
  const midias = (r2.dados?.product?.media?.nodes || []).filter((m) => m?.id && m.image?.url).map((m) => ({ id: m.id, b: baseFoto(m.image.url) }));
  const variantesNow = r2.dados?.product?.variants?.nodes || [];
  const plano2 = planoVariantes(det.variantes, det.nome, base || 1, null);
  const porNome = new Map(plano2.map((x) => [x.nome.toLowerCase(), x]));
  let fotos = 0, semFoto = 0;
  for (const v of variantesNow) {
    if (v.media?.nodes?.length) continue;
    const x = porNome.get(String(v.title).toLowerCase());
    const alvo = x?.foto ? baseFoto(x.foto) : '';
    const m = alvo && midias.find((mm) => mm.b && (mm.b === alvo || mm.b.includes(alvo) || alvo.includes(mm.b)));
    if (!m) { semFoto++; continue; }
    const a = await consultar(env, `mutation($pid: ID!, $v: [ProductVariantAppendMediaInput!]!) { productVariantAppendMedia(productId: $pid, variantMedia: $v) { userErrors { message } } }`,
      { pid: prod.id, v: [{ variantId: v.id, mediaIds: [m.id] }] });
    if (a.erro || a.dados?.productVariantAppendMedia?.userErrors?.length) semFoto++; else fotos++;
  }
  return { ok: true, criadas, fotos, semFoto, avisos, titulo: prod.title };
}


// ---- Lucro de cada produto ----
const IVA = 0.23, IOSS = 0.03, TAXA_PAG = 0.025, TAXA_FIXA = 0.25;
/** Lucro em € de uma venda a `preco` (com IVA) quando o produto + envio custam `custo` €. */
export const lucroDe = (preco, custo) => Math.round((preco / (1 + IVA) - preco * IOSS - preco * TAXA_PAG - TAXA_FIXA - custo) * 100) / 100;
/** Menor preço (terminando em ,90) que deixa pelo menos `alvo` € de lucro. */
export function precoMinimo(custo, alvo = 3) {
  const p = (custo + TAXA_FIXA + alvo) / (1 / (1 + IVA) - IOSS - TAXA_PAG);
  return Math.ceil(p) - 0.1;
}

/** Confere custo, frete e lucro de um produto da loja e guarda o resultado (o Claude lê no servidor). */
export async function conferirLucro(env, { pid }) {
  const tag = `cj-${String(pid || '').trim()}`;
  if (!/^cj-[A-Za-z0-9-]{6,60}$/.test(tag)) return { erro: 'pid', status: 400 };
  const q = await consultar(env, `query($q: String!) { products(first: 1, query: $q) { nodes { id title status variants(first: 60) { nodes { title price } } } } }`, { q: `tag:'${tag}'` });
  if (q.erro) return q;
  const prod = q.dados?.products?.nodes?.[0];
  if (!prod) return { erro: 'nao_achei', status: 404 };
  const a = await analisarCj(env, pid);
  if (a.erro) return a;
  if (!a.cambio || !a.envio?.length) return { erro: 'sem_frete', status: 422 };
  const frete = a.envio[0].precoUsd * a.cambio;
  const vs = prod.variants.nodes, cj = a.variantes;
  const linhas = vs.map((v, i) => {
    const c = cj.length === vs.length ? cj[i] : cj[0];
    const custo = Math.round((c.precoUsd * a.cambio + frete) * 100) / 100;
    const preco = Number(v.price);
    return { opcao: v.title, preco, custo, lucro: lucroDe(preco, custo), minimo: precoMinimo(custo), prazo: a.envio[0].prazo };
  });
  const r = { pid: String(pid), titulo: prod.title, status: prod.status, freteEur: Math.round(frete * 100) / 100, envio: a.envio[0].nome, linhas };
  await env.DB.prepare('INSERT INTO precos_analise (pid, json, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(pid) DO UPDATE SET json=excluded.json, atualizado_em=excluded.atualizado_em')
    .bind(String(pid), JSON.stringify(r), new Date().toISOString()).run();
  return { ok: true, ...r };
}

// ---- Texto em português (por regras, só com o que a CJ confirma) ----
const TIPOS = [
  [/\b(raincoat|rain coat)\b/i, 'Capa de Chuva'], [/\b(sweater|knitted)\b/i, 'Camisola'], [/\b(coat|jacket|hoodie|clothes|clothing|apparel|vest)\b(?![^.]*harness)/i, 'Casaco'],
  [/\bharness\b/i, 'Peitoral'], [/\b(leash|lead)\b/i, 'Trela'], [/\bcollar\b/i, 'Coleira'], [/\b(fountain|waterer)\b/i, 'Fonte de Água'],
  [/\b(bowl|feeder)\b/i, 'Comedouro'], [/\b(scratch\w*|scratcher)\b/i, 'Arranhador'], [/\b(backpack)\b/i, 'Mochila de Transporte'], [/\b(carrier|travel bag|pet bag|cage)\b/i, 'Mala de Transporte'],
  [/\b(bed|mat|sofa|nest|cushion|kennel)\b/i, 'Cama'], [/\btoy\b/i, 'Brinquedo'], [/\b(brush|comb|glove)\b/i, 'Escova'],
];
const QUALIF = [
  [/\bwinter\b/i, 'de Inverno'], [/\b(padded|cotton)\b/i, 'Acolchoado'], [/\bfleece\b/i, 'Forrado a Pelo'], [/\bwaterproof\b/i, 'Impermeável'], [/\breflective\b/i, 'Refletor'],
  [/\badjustable\b/i, 'Ajustável'], [/\b(foldable|folding|collapsible)\b/i, 'Dobrável'], [/\b(led|luminous|flashing)\b/i, 'com Luz LED'], [/\bretractable\b/i, 'Retrátil'], [/\bwarm\b/i, 'Quentinho'],
];
const MATERIAIS = { polyester: 'Poliéster', cotton: 'Algodão', nylon: 'Nylon', cloth: 'Tecido', plush: 'Pelúcia', oxford: 'Tecido Oxford', silicone: 'Silicone', eva: 'EVA', wood: 'Madeira', sisal: 'Sisal', 'stainless steel': 'Aço inoxidável', fleece: 'Pelo sintético', leather: 'Couro sintético', pu: 'Couro sintético', rubber: 'Borracha', tpr: 'Borracha TPR', plastic: 'Plástico', velvet: 'Veludo', wool: 'Lã', mesh: 'Malha respirável' };

/** Título em português a partir do nome da CJ. Devolve null se não souber o que é o produto. */
export function ptTitulo(nome, tipos) {
  const n = String(nome || '');
  const t = TIPOS.find(([re]) => re.test(n)); if (!t) return null;
  const q = QUALIF.filter(([re]) => re.test(n)).map(([, p]) => p);
  const quals = [...new Set(q)].filter((x) => !(t[1] === 'Casaco' && x === 'Quentinho' && q.includes('de Inverno'))).slice(0, 2);
  const alvo = tipos.includes('Cães') && tipos.includes('Gatos') ? 'Cães e Gatos' : tipos.includes('Gatos') ? 'Gatos' : 'Cães';
  const de = quals.filter((x) => x.startsWith('de ')), resto = quals.filter((x) => !x.startsWith('de '));
  return [t[1], ...resto, ...de, 'para', alvo].join(' ').replace(/\s+/g, ' ').slice(0, 90);
}

/** Descrição em HTML só com fatos da CJ (material, tamanhos, estação). Devolve { html, fatos }. */
export function ptDescricao(det, tipos, titulo) {
  const txt = `${det.descricao || ''} ${det.material || ''}`.toLowerCase(), bul = [];
  const mats = Object.entries(MATERIAIS).filter(([k]) => new RegExp(`\\b${k}\\b`, 'i').test(txt)).map(([, v]) => v);
  if (mats.length) bul.push(`Material: ${[...new Set(mats)].slice(0, 3).join(', ')}`);
  const tam = [...new Set((det.variantes || []).map((v) => (String(v.nome).match(/\b(XXXL|XXL|XL|XS|S|M|L)\b/) || [])[1]).filter(Boolean))];
  if (tam.length > 1) bul.push(`Tamanhos disponíveis: ${tam.join(', ')}`);
  if (/all seasons?/.test(txt)) bul.push('Para todas as estações do ano');
  if (/adjustable/.test(txt)) bul.push('Ajustável');
  if (/(waterproof)/.test(txt)) bul.push('Resistente à água');
  if (/(reflective)/.test(txt)) bul.push('Com faixas refletoras para passear à noite');
  const kg = [...String(det.descricao || '').matchAll(/\b([SMLX]{1,3})\b[^()\d]{0,12}\(?[^()]*?(\d+\s*-\s*\d+\s*kg)\)?/gi)].slice(0, 5).map((m) => `${m[1].toUpperCase()} (${m[2].replace(/\s+/g, ' ')})`);
  if (kg.length >= 2) bul.push(`Peso recomendado: ${kg.join(', ')}`);
  const alvo = tipos.includes('Cães') && tipos.includes('Gatos') ? 'cães e gatos' : tipos.includes('Gatos') ? 'gatos' : 'cães';
  const intro = `${titulo || 'Este produto'}: pensado para o dia a dia do seu ${alvo === 'gatos' ? 'gato' : alvo === 'cães' ? 'cão' : 'animal de estimação'}, com preço justo e entrega em Portugal.`;
  const html = `<p>${intro}</p>${bul.length ? `<ul>${bul.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}<p>Entrega em Portugal em 8 a 18 dias úteis.</p>`;
  return { html, fatos: bul.length };
}

/** Deixa um rascunho pronto: título e texto em português, cores/tamanhos, lucro conferido. */
export async function prepararProduto(env, { pid }) {
  const tag = `cj-${String(pid || '').trim()}`;
  if (!/^cj-[A-Za-z0-9-]{6,60}$/.test(tag)) return { erro: 'pid', status: 400 };
  const q = await consultar(env, `query($q: String!) { products(first: 1, query: $q) { nodes { id title status tags } } }`, { q: `tag:'${tag}'` });
  if (q.erro) return q;
  const prod = q.dados?.products?.nodes?.[0];
  if (!prod) return { erro: 'nao_achei', status: 404 };
  const tipos = (prod.tags || []).filter((t) => t === 'Cães' || t === 'Gatos');
  const det = await detalharCj(env, pid);
  if (det.erro) return det;
  const avisos = [];
  const ingles = /[a-z]{3,}/i.test(prod.title) && /\b(the|and|for|dog|cat|pet|winter|with|coat|harness)\b/i.test(prod.title);
  if (ingles && prod.status === 'DRAFT') {
    const titulo = ptTitulo(det.nome, tipos);
    if (titulo) {
      const d = ptDescricao(det, tipos, titulo);
      const u = await consultar(env, `mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { message } } }`, { p: { id: prod.id, title: titulo, descriptionHtml: d.html } });
      if (u.erro || u.dados?.productUpdate?.userErrors?.length) avisos.push('texto_falhou'); else if (d.fatos < 2) avisos.push('texto_curto');
    } else avisos.push('titulo_revisar');
  }
  await esperar(1100);
  const v = await ativarVariantes(env, { pid });
  if (v.erro) avisos.push('variantes_falhou'); else if (v.criadas) avisos.push('opcoes_criadas');
  await esperar(1100);
  const l = await conferirLucro(env, { pid });
  let lucroMin = null;
  if (l.ok) lucroMin = Math.min(...l.linhas.map((x) => x.lucro)); else avisos.push('lucro_nao_conferido');
  if (lucroMin !== null && lucroMin < 5) avisos.push('lucro_baixo');
  return { ok: true, avisos, lucroMin, variantes: v.criadas || 0, fotosCores: v.fotos || 0 };
}

/** Publica um rascunho só se estiver realmente pronto (texto em português, fotos, opções, lucro). */
export async function publicarPronto(env, { pid }) {
  const tag = `cj-${String(pid || '').trim()}`;
  if (!/^cj-[A-Za-z0-9-]{6,60}$/.test(tag)) return { erro: 'pid', status: 400 };
  const q = await consultar(env, `query($q: String!) { products(first: 1, query: $q) { nodes { id title status mediaCount { count } descriptionHtml } } }`, { q: `tag:'${tag}'` });
  if (q.erro) return q;
  const prod = q.dados?.products?.nodes?.[0];
  if (!prod) return { erro: 'nao_achei', status: 404 };
  if (prod.status !== 'DRAFT') return { ok: true, publicado: false, motivo: 'ja_publicado' };
  const motivos = [];
  if (/\b(the|and|for|dog|cat|pet|winter|with)\b/i.test(prod.title)) motivos.push('titulo_em_ingles');
  if ((prod.mediaCount?.count || 0) < 3) motivos.push('poucas_fotos');
  if (!/Entrega em Portugal/.test(prod.descriptionHtml || '')) motivos.push('sem_descricao');
  const r = await env.DB.prepare('SELECT json FROM precos_analise WHERE pid = ?').bind(String(pid)).first();
  let lucroMin = null; try { lucroMin = Math.min(...JSON.parse(r.json).linhas.map((x) => x.lucro)); } catch {}
  if (lucroMin === null) motivos.push('lucro_nao_conferido'); else if (lucroMin < 5) motivos.push('lucro_baixo');
  if (motivos.length) return { ok: true, publicado: false, motivos };
  const pub = await consultar(env, '{ publications(first: 10) { nodes { id name } } }');
  const loja = pub.dados?.publications?.nodes?.find((x) => /online store/i.test(x.name));
  const a = await consultar(env, `mutation($p: ProductUpdateInput!) { productUpdate(product: $p) { userErrors { message } } }`, { p: { id: prod.id, status: 'ACTIVE' } });
  if (a.erro || a.dados?.productUpdate?.userErrors?.length) return { erro: 'shopify_erro', status: 422 };
  if (loja) await consultar(env, `mutation($id: ID!, $i: [PublicationInput!]!) { publishablePublish(id: $id, input: $i) { userErrors { message } } }`, { id: prod.id, i: [{ publicationId: loja.id }] });
  return { ok: true, publicado: true, lucroMin };
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
