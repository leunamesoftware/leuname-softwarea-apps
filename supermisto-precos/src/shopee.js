// Ligação com a Shopee Open Platform (API v2).
// Credenciais do app (partner_id e partner_key) ficam só nos segredos do Worker: SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY.
// Os tokens da loja (depois que o dono autoriza) ficam na tabela `shopee`.

export const HOST = 'https://partner.shopeemobile.com';
const agora = () => Math.floor(Date.now() / 1000);

async function hmac(chave, texto) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(texto));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Assinatura da Shopee: HMAC-SHA256(partner_key, partner_id + caminho + timestamp [+ access_token + shop_id]). */
export const assinar = (partnerId, partnerKey, caminho, ts, token = '', shopId = '') =>
  hmac(partnerKey, `${partnerId}${caminho}${ts}${token}${shopId}`);

export const configurada = (env) => !!(env.SHOPEE_PARTNER_ID && env.SHOPEE_PARTNER_KEY);

async function ler(env, chave) {
  const r = await env.BANCO.prepare('SELECT valor FROM shopee WHERE chave = ?').bind(chave).first();
  return r ? r.valor : null;
}
const gravar = (env, pares) => env.BANCO.batch(Object.entries(pares).map(([k, v]) =>
  env.BANCO.prepare('INSERT INTO shopee (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(k, v == null ? null : String(v))));

/** Link para o dono autorizar a loja dele (abre a Shopee, ele entra e confirma). */
export async function linkAutorizar(env, retorno) {
  const caminho = '/api/v2/shop/auth_partner', ts = agora();
  const sign = await assinar(env.SHOPEE_PARTNER_ID, env.SHOPEE_PARTNER_KEY, caminho, ts);
  return `${HOST}${caminho}?partner_id=${env.SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}&redirect=${encodeURIComponent(retorno)}`;
}

async function pedirToken(env, caminho, corpo) {
  const ts = agora(), sign = await assinar(env.SHOPEE_PARTNER_ID, env.SHOPEE_PARTNER_KEY, caminho, ts);
  const r = await fetch(`${HOST}${caminho}?partner_id=${env.SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, partner_id: Number(env.SHOPEE_PARTNER_ID) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error(`Shopee recusou o acesso: ${d.message || d.error || r.status}`);
  await gravar(env, { shop_id: corpo.shop_id, access_token: d.access_token, refresh_token: d.refresh_token, expira: agora() + (d.expire_in || 14400) - 300 });
  return d.access_token;
}

/** Volta da autorização: troca o código pelos tokens da loja. */
export const trocarCodigo = (env, code, shopId) => pedirToken(env, '/api/v2/auth/token/get', { code, shop_id: Number(shopId) });

async function token(env) {
  const [t, exp, shop, ref] = await Promise.all(['access_token', 'expira', 'shop_id', 'refresh_token'].map((k) => ler(env, k)));
  if (!t || !shop) throw new Error('A loja da Shopee ainda não foi conectada.');
  if (Number(exp) > agora()) return { token: t, shop };
  return { token: await pedirToken(env, '/api/v2/auth/access_token/get', { refresh_token: ref, shop_id: Number(shop) }), shop };
}

export async function conectada(env) {
  return !!(await ler(env, 'access_token'));
}

async function chamarBruto(env, caminho, corpo, query = {}, metodo) {
  const { token: t, shop } = await token(env);
  const ts = agora(), sign = await assinar(env.SHOPEE_PARTNER_ID, env.SHOPEE_PARTNER_KEY, caminho, ts, t, shop);
  const q = new URLSearchParams({ partner_id: env.SHOPEE_PARTNER_ID, timestamp: ts, sign, access_token: t, shop_id: shop });
  for (const [k, v] of Object.entries(query)) q.set(k, Array.isArray(v) ? v.join(',') : v);
  const ehForm = typeof FormData !== 'undefined' && corpo instanceof FormData;
  return fetch(`${HOST}${caminho}?${q}`, {
    method: metodo || (corpo ? 'POST' : 'GET'),
    headers: corpo && !ehForm ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? (ehForm ? corpo : JSON.stringify(corpo)) : undefined,
  });
}

/** Chamada da API da loja. GET com query; POST com corpo JSON ou FormData. */
export async function chamar(env, caminho, { query = {}, corpo, metodo } = {}) {
  const r = await chamarBruto(env, caminho, corpo, query, metodo);
  const d = await r.json().catch(() => ({}));
  if (d.error) throw new Error(`${d.error}: ${d.message || ''}`.trim());
  return d.response || d;
}

/* ---------- produtos ---------- */

/** Todos os anúncios da loja com as variações (para ligar cada um ao SKU do ERP). */
export async function listarAnuncios(env) {
  const ids = [];
  for (let offset = 0; offset < 2000;) {
    const r = await chamar(env, '/api/v2/product/get_item_list', { query: { offset, page_size: 100, item_status: 'NORMAL' } });
    ids.push(...(r.item || []).map((i) => i.item_id));
    if (!r.has_next_page) break;
    offset = r.next_offset;
  }
  const lista = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await chamar(env, '/api/v2/product/get_item_base_info', { query: { item_id_list: ids.slice(i, i + 50) } });
    for (const it of r.item_list || []) {
      const base = { item_id: it.item_id, nome: it.item_name, sku: it.item_sku || '', imagem: it.image?.image_url_list?.[0] || null };
      if (it.has_model) {
        const m = await chamar(env, '/api/v2/product/get_model_list', { query: { item_id: it.item_id } });
        for (const mo of m.model || []) {
          const nomeVar = (mo.tier_index || []).map((x, k) => m.tier_variation?.[k]?.option_list?.[x]?.option).filter(Boolean).join(' / ');
          lista.push({ ...base, model_id: mo.model_id, variacao: nomeVar, sku: mo.model_sku || base.sku,
            preco: mo.price_info?.[0]?.original_price ?? null, estoque: mo.stock_info_v2?.summary_info?.total_available_stock ?? null });
        }
      } else {
        lista.push({ ...base, model_id: 0, variacao: '', preco: it.price_info?.[0]?.original_price ?? null,
          estoque: it.stock_info_v2?.summary_info?.total_available_stock ?? null });
      }
    }
  }
  return lista;
}

export const mudarPreco = (env, itemId, modelId, preco) =>
  chamar(env, '/api/v2/product/update_price', { corpo: { item_id: itemId, price_list: [{ model_id: modelId || 0, original_price: preco }] } });

export const mudarEstoque = (env, itemId, modelId, qtd) =>
  chamar(env, '/api/v2/product/update_stock', { corpo: { item_id: itemId, stock_list: [{ model_id: modelId || 0, seller_stock: [{ stock: Math.max(0, qtd) }] }] } });

/** Sobe uma imagem para a Shopee e devolve o image_id. */
export async function subirImagem(env, bytes, tipo = 'image/jpeg') {
  const f = new FormData();
  f.append('image', new Blob([bytes], { type: tipo }), 'foto.jpg');
  const r = await chamar(env, '/api/v2/media_space/upload_image', { corpo: f });
  const id = r.image_info?.image_id || r.image_info_list?.[0]?.image_info?.image_id;
  if (!id) throw new Error('A Shopee não aceitou a imagem.');
  return id;
}

export const trocarFotos = (env, itemId, imageIds) =>
  chamar(env, '/api/v2/product/update_item', { corpo: { item_id: itemId, image: { image_id_list: imageIds.slice(0, 9) } } });

/* ---------- pedidos ---------- */

/** Pedidos dos últimos `dias` dias (no máximo 15, limite da Shopee por consulta). */
export async function listarPedidos(env, dias = 15) {
  const fim = agora(), inicio = fim - Math.min(dias, 15) * 86400;
  const sns = [];
  let cursor = '';
  for (let i = 0; i < 20; i++) {
    const r = await chamar(env, '/api/v2/order/get_order_list', { query: { time_range_field: 'create_time', time_from: inicio, time_to: fim, page_size: 100, cursor } });
    sns.push(...(r.order_list || []).map((o) => o.order_sn));
    if (!r.more) break;
    cursor = r.next_cursor;
  }
  const pedidos = [];
  for (let i = 0; i < sns.length; i += 50) {
    const r = await chamar(env, '/api/v2/order/get_order_detail', { query: { order_sn_list: sns.slice(i, i + 50), response_optional_fields: 'buyer_username,item_list,total_amount,recipient_address,shipping_carrier,package_list,ship_by_date,actual_shipping_fee,estimated_shipping_fee,note' } });
    pedidos.push(...(r.order_list || []));
  }
  return pedidos;
}

/* ---------- envio e etiqueta ---------- */

/** Como esse pedido pode ser enviado (levar na agência = dropoff, ou coleta = pickup). */
export const parametrosEnvio = (env, orderSn) => chamar(env, '/api/v2/logistics/get_shipping_parameter', { query: { order_sn: orderSn } });

/** "Preparar envio": avisa a Shopee que vai enviar. Prefere levar na agência; se só tiver coleta, usa o 1º horário. */
export async function prepararEnvio(env, orderSn) {
  const p = await parametrosEnvio(env, orderSn);
  const precisa = p.info_needed || {};
  const corpo = { order_sn: orderSn };
  if (precisa.dropoff) corpo.dropoff = {};
  else if (precisa.pickup) {
    const end = (p.pickup?.address_list || []).find((a) => (a.address_flag || []).includes('default_address')) || p.pickup?.address_list?.[0];
    const hora = end?.time_slot_list?.[0];
    if (!end || !hora) throw new Error('A Shopee não deu horário de coleta para esse pedido.');
    corpo.pickup = { address_id: end.address_id, pickup_time_id: hora.pickup_time_id };
  } else corpo.dropoff = {};
  await chamar(env, '/api/v2/logistics/ship_order', { corpo });
  return corpo.pickup ? 'coleta' : 'agência';
}

export async function rastreio(env, orderSn) {
  const r = await chamar(env, '/api/v2/logistics/get_tracking_number', { query: { order_sn: orderSn } });
  return r.tracking_number || '';
}

/** Gera e baixa a etiqueta oficial da Shopee (PDF) de um ou vários pedidos. */
export async function etiquetas(env, pedidos) {
  const lista = [];
  for (const sn of pedidos) lista.push({ order_sn: sn, tracking_number: await rastreio(env, sn).catch(() => '') });
  await chamar(env, '/api/v2/logistics/create_shipping_document', { corpo: { order_list: lista } });
  for (let i = 0; i < 10; i++) {
    const r = await chamar(env, '/api/v2/logistics/get_shipping_document_result', { corpo: { order_list: lista.map((o) => ({ order_sn: o.order_sn })) } });
    const st = (r.result_list || []).map((x) => x.status);
    if (st.length && st.every((x) => x === 'READY')) break;
    if (st.includes('FAILED')) throw new Error('A Shopee não conseguiu gerar a etiqueta. Prepare o envio primeiro.');
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  return baixarDocumento(env, lista.map((o) => ({ order_sn: o.order_sn })));
}

/** O download da etiqueta vem em PDF (não JSON): chamada própria. */
async function baixarDocumento(env, orderList) {
  const caminho = '/api/v2/logistics/download_shipping_document';
  const res = await chamarBruto(env, caminho, { order_list: orderList });
  const tipo = res.headers.get('Content-Type') || '';
  if (tipo.includes('json')) { const d = await res.json(); throw new Error(`${d.error || ''}: ${d.message || 'etiqueta indisponível'}`); }
  return res;
}

/* ---------- financeiro ---------- */

/** Quanto a Shopee repassa do pedido (depois da comissão, taxas e frete). */
export async function repasse(env, orderSn) {
  const r = await chamar(env, '/api/v2/payment/get_escrow_detail', { query: { order_sn: orderSn } });
  const i = r.order_income || {};
  return { liquido: i.escrow_amount ?? null, frete: i.actual_shipping_fee ?? null };
}
