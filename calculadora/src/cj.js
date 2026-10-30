// Ligação com a CJ Dropshipping (API 2.0) para o app LeunaPets, só para o dono.
// A chave de API fica na tabela cj_config (D1) e nunca volta para o navegador.
// Limite da CJ: 1 chamada por segundo. Preços da CJ vêm em dólar (USD).
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const primeiroNumero = (v) => { const m = String(v ?? '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
const r2 = (x) => Math.round(x * 100) / 100;

export function chaveValida(chave) {
  return typeof chave === 'string' && /^[A-Za-z0-9@_.\-]{10,200}$/.test(chave.trim());
}

async function chamar(url, { metodo = 'GET', token, corpo } = {}) {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'CJ-Access-Token': token } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { http: r.status, j };
}

async function pedirToken(chave) {
  const { j } = await chamar(`${BASE}/authentication/getAccessToken`, { metodo: 'POST', corpo: { apiKey: chave } });
  if (j?.code === 200 && j?.data?.accessToken) return { token: j.data.accessToken, expira: j.data.accessTokenExpiryDate || null };
  return null;
}

/** Guarda a chave depois de testar com a CJ. Devolve { ok } ou { erro, status }. */
export async function guardarChave(env, chave) {
  if (!chaveValida(chave)) return { erro: 'chave_invalida', status: 400 };
  const limpa = chave.trim();
  const t = await pedirToken(limpa).catch(() => null);
  if (!t) return { erro: 'cj_recusou', status: 422 };
  const agora = new Date().toISOString();
  await env.DB.prepare('INSERT INTO cj_config (id, api_key, access_token, token_expira, atualizado_em) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key, access_token = excluded.access_token, token_expira = excluded.token_expira, atualizado_em = excluded.atualizado_em')
    .bind(limpa, t.token, t.expira, agora).run();
  return { ok: true };
}

export async function removerChave(env) {
  await env.DB.prepare('DELETE FROM cj_config WHERE id = 1').run();
  return { ok: true };
}

export async function estadoCj(env) {
  const l = await env.DB.prepare('SELECT atualizado_em FROM cj_config WHERE id = 1').first();
  return { ligada: Boolean(l) };
}

async function tokenValido(env, forcar = false) {
  const l = await env.DB.prepare('SELECT api_key, access_token, token_expira FROM cj_config WHERE id = 1').first();
  if (!l) return null;
  const vivo = l.access_token && l.token_expira && new Date(l.token_expira).getTime() > Date.now() + 864e5;
  if (vivo && !forcar) return l.access_token;
  const t = await pedirToken(l.api_key).catch(() => null);
  if (!t) return null;
  await env.DB.prepare('UPDATE cj_config SET access_token = ?, token_expira = ?, atualizado_em = ? WHERE id = 1').bind(t.token, t.expira, new Date().toISOString()).run();
  return t.token;
}

/** Chama a CJ com o token; se o token foi recusado, renova uma vez e tenta de novo. */
async function comToken(env, url, opcoes = {}) {
  let token = await tokenValido(env);
  if (!token) return { erro: 'sem_chave', status: 409 };
  let r = await chamar(url, { ...opcoes, token });
  if (r.j?.code === 1600001 || r.http === 401) {
    await espera(1100);
    token = await tokenValido(env, true);
    if (!token) return { erro: 'cj_recusou', status: 422 };
    r = await chamar(url, { ...opcoes, token });
  }
  if (r.j?.code === 200) return { dados: r.j.data };
  if (r.http === 429 || r.j?.code === 1600200) return { erro: 'muitas_chamadas', status: 429 };
  return { erro: 'cj_erro', status: 502 };
}

/** Quantos euros vale 1 dólar hoje (taxa do Banco Central Europeu); null se não deu para ler. */
export async function cambioUsdEur() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR');
    const j = await r.json();
    return Number.isFinite(j?.rates?.EUR) ? j.rates.EUR : null;
  } catch { return null; }
}

export function normalizarBusca(dados) {
  const lista = [];
  for (const bloco of dados?.content || []) {
    for (const p of bloco?.productList || []) {
      const preco = primeiroNumero(p.nowPrice ?? p.sellPrice);
      lista.push({
        pid: String(p.id), nome: String(p.nameEn || '').slice(0, 160), sku: p.sku || '', foto: p.bigImage || null,
        precoUsd: preco, lojas: Number(p.listedNum) || 0, categoriaId: p.categoryId || null,
      });
    }
  }
  return { total: Number(dados?.totalRecords) || 0, produtos: lista };
}

export async function buscarCj(env, { q, pagina = 1 }) {
  const termo = String(q || '').trim().slice(0, 80);
  if (termo.length < 2) return { erro: 'busca_curta', status: 400 };
  const url = `${BASE}/product/listV2?keyWord=${encodeURIComponent(termo)}&page=${Math.min(50, Math.max(1, Number(pagina) || 1))}&size=24`;
  const r = await comToken(env, url);
  return r.erro ? r : { ...normalizarBusca(r.dados), cambio: await cambioUsdEur() };
}

export function normalizarVariantes(dados) {
  return (dados?.variants || []).slice(0, 60).map((v) => ({
    vid: String(v.vid), nome: String(v.variantNameEn || v.variantKey || '').slice(0, 120), sku: v.variantSku || '',
    precoUsd: primeiroNumero(v.variantSellPrice), peso: Number(v.variantWeight) || null, foto: v.variantImage || null,
  })).filter((v) => v.vid && v.precoUsd !== null);
}

export function normalizarFrete(lista) {
  return (Array.isArray(lista) ? lista : []).map((o) => ({
    nome: String(o.logisticName || ''), precoUsd: primeiroNumero(o.logisticPrice), prazo: String(o.logisticAging || ''),
    // O IVA que a CJ cobra à parte (IOSS), quando ela informa. A calculadora já conta o IVA sobre o preço de venda.
    ivaCjUsd: primeiroNumero(o.taxesFee) || 0,
  })).filter((o) => o.nome && o.precoUsd !== null).sort((a, b) => a.precoUsd - b.precoUsd);
}

/** Detalhes de um produto da CJ + opções de envio da China para Portugal (para a variante mais barata). */
export async function analisarCj(env, pid) {
  if (!/^[A-Za-z0-9-]{6,60}$/.test(String(pid || ''))) return { erro: 'pid', status: 400 };
  const det = await comToken(env, `${BASE}/product/query?pid=${encodeURIComponent(pid)}`);
  if (det.erro) return det;
  const variantes = normalizarVariantes(det.dados).sort((a, b) => a.precoUsd - b.precoUsd);
  if (!variantes.length) return { erro: 'sem_variantes', status: 422 };
  await espera(1100); // a CJ aceita 1 chamada por segundo
  const fr = await comToken(env, `${BASE}/logistic/freightCalculate`, { metodo: 'POST', corpo: { startCountryCode: 'CN', endCountryCode: 'PT', products: [{ quantity: 1, vid: variantes[0].vid }] } });
  return {
    pid: String(det.dados.pid || pid), nome: String(det.dados.productNameEn || '').slice(0, 160), foto: det.dados.bigImage || null,
    pesoG: Number(det.dados.productWeight) || null, variantes, envio: fr.erro ? [] : normalizarFrete(fr.dados), envioErro: fr.erro || null,
    cambio: await cambioUsdEur(),
  };
}

/** Fotos e dados de um produto da CJ, para criar o produto na loja. */
export async function detalharCj(env, pid) {
  if (!/^[A-Za-z0-9-]{6,60}$/.test(String(pid || ''))) return { erro: 'pid', status: 400 };
  const det = await comToken(env, `${BASE}/product/query?pid=${encodeURIComponent(pid)}`);
  if (det.erro) return det;
  const d = det.dados || {};
  let fotos = [];
  try { const x = typeof d.productImage === 'string' ? JSON.parse(d.productImage) : d.productImage; if (Array.isArray(x)) fotos = x; } catch {}
  if (d.bigImage) fotos.unshift(d.bigImage);
  fotos = [...new Set(fotos.filter((u) => typeof u === 'string' && /^https:\/\//.test(u)))].slice(0, 8);
  return { pid: String(d.pid || pid), nome: String(d.productNameEn || '').slice(0, 160), fotos, pesoG: Number(d.productWeight) || null, variantes: normalizarVariantes(d).sort((a, b) => a.precoUsd - b.precoUsd) };
}

const semHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<img[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Guarda no servidor o texto técnico da CJ (material, medidas, descrição) dos produtos já enviados, para o Claude ler sem print. */
export async function guardarDetalhes(env, pids) {
  const lista = (Array.isArray(pids) ? pids : []).filter((p) => /^[A-Za-z0-9-]{6,60}$/.test(String(p))).slice(0, 6);
  let guardados = 0;
  for (const pid of lista) {
    const det = await comToken(env, `${BASE}/product/query?pid=${encodeURIComponent(pid)}`);
    if (det.erro) continue;
    const d = det.dados || {};
    const vars = (Array.isArray(d.variants) ? d.variants : []).slice(0, 12).map((v) => ({ nome: String(v.variantNameEn || v.variantKey || '').slice(0, 80), compr: v.variantLength, larg: v.variantWidth, alt: v.variantHeight, peso: v.variantWeight, preco: v.variantSellPrice }));
    const json = JSON.stringify({ nome: d.productNameEn, categoria: d.categoryName, material: d.materialNameEn || d.materialKey, embalagem: d.packingNameEn, propriedades: d.productKeyEn, peso: d.productWeight, descricao: semHtml(d.description).slice(0, 3000), variantes: vars });
    await env.DB.prepare('INSERT INTO cj_detalhes (pid, json, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(pid) DO UPDATE SET json=excluded.json, atualizado_em=excluded.atualizado_em').bind(String(pid), json, new Date().toISOString()).run();
    guardados++;
    await new Promise((r) => setTimeout(r, 1100));
  }
  return { ok: true, guardados };
}
