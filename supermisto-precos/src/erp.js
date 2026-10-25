// ERP Supermisto: produtos à venda (SKUs), estoque, pedidos e envio automático para a Shopee.
import * as S from './shopee.js';

const agora = () => new Date().toISOString();
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/* ---------- regras (funções puras, testadas) ---------- */

/** Pedido que já tira do estoque: pago e não cancelado. */
export const pedidoValido = (status) => !['UNPAID', 'CANCELLED', 'IN_CANCEL', 'INVALID'].includes(status);

/** Itens de um pedido da Shopee com o SKU do ERP (pelo código do SKU ou pelo anúncio ligado). */
export function itensDoPedido(pedido, skus) {
  const porCodigo = new Map(skus.map((s) => [s.id.toUpperCase(), s]));
  const porAnuncio = new Map(skus.filter((s) => s.shopee_item_id).map((s) => [`${s.shopee_item_id}:${s.shopee_model_id || 0}`, s]));
  return (pedido.item_list || []).map((i) => {
    const s = porCodigo.get(String(i.model_sku || i.item_sku || '').trim().toUpperCase()) || porAnuncio.get(`${i.item_id}:${i.model_id || 0}`);
    return { sku: s ? s.id : null, nome: i.item_name + (i.model_name ? ` (${i.model_name})` : ''), qtd: i.model_quantity_purchased || 1, preco: i.model_discounted_price ?? i.model_original_price ?? 0 };
  });
}

/** Sugere a ligação anúncio → SKU: pelo código do SKU escrito na Shopee. */
export function sugerirLigacao(anuncio, skus) {
  const cod = String(anuncio.sku || '').trim().toUpperCase();
  return cod ? (skus.find((s) => s.id.toUpperCase() === cod) || null) : null;
}

/** Junta o que falta mandar para a Shopee. */
export const marcar = (sync, ...coisas) => JSON.stringify({ ...(sync ? JSON.parse(sync) : {}), ...Object.fromEntries(coisas.map((c) => [c, 1])) });

/* ---------- banco ---------- */

const todosSkus = async (env) => (await env.BANCO.prepare('SELECT * FROM skus ORDER BY ordem').all()).results;
const umSku = (env, id) => env.BANCO.prepare('SELECT * FROM skus WHERE id = ?').bind(id).first();
const anotar = (env, tipo, texto, ok = 1) => env.BANCO.prepare('INSERT INTO registro (tipo, texto, ok, criado_em) VALUES (?,?,?,?)').bind(tipo, String(texto).slice(0, 500), ok ? 1 : 0, agora()).run();
const opcao = async (env, k) => (await env.BANCO.prepare('SELECT valor FROM shopee WHERE chave = ?').bind(k).first())?.valor ?? null;
const setOpcao = (env, k, v) => env.BANCO.prepare('INSERT INTO shopee (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(k, v).run();

/** Muda o estoque (entrada ou saída) e deixa marcado para ir à Shopee. */
async function mexerEstoque(env, skuId, qtd, motivo, pedidoId = null, obs = null) {
  const s = await umSku(env, skuId);
  if (!s) return;
  await env.BANCO.batch([
    env.BANCO.prepare('UPDATE skus SET estoque = estoque + ?, sync = ?, atualizado_em = ? WHERE id = ?').bind(qtd, s.shopee_item_id ? marcar(s.sync, 'estoque') : s.sync, agora(), skuId),
    env.BANCO.prepare('INSERT INTO movimentos (sku_id, qtd, motivo, pedido_id, obs, criado_em) VALUES (?,?,?,?,?,?)').bind(skuId, qtd, motivo, pedidoId, obs, agora()),
  ]);
}

/* ---------- envio para a Shopee ---------- */

/** Manda para a Shopee tudo o que mudou (preço, estoque, fotos). Devolve quantos foram e os erros. */
export async function sincronizar(env, so = null) {
  if (!S.configurada(env) || !(await S.conectada(env))) return { enviados: 0, erros: ['A loja da Shopee ainda não está conectada.'] };
  const lista = (await todosSkus(env)).filter((s) => s.shopee_item_id && s.sync && (!so || so.includes(s.id)));
  let enviados = 0;
  const erros = [];
  for (const s of lista) {
    const f = JSON.parse(s.sync);
    const set = {};
    try {
      if (f.preco && s.preco > 0) { await S.mudarPreco(env, s.shopee_item_id, s.shopee_model_id, s.preco); set.shopee_preco = s.preco; await anotar(env, 'preco', `${s.nome}: preço ${s.preco.toFixed(2)} na Shopee`); }
      if (f.estoque) { await S.mudarEstoque(env, s.shopee_item_id, s.shopee_model_id, s.estoque); set.shopee_estoque = s.estoque; await anotar(env, 'estoque', `${s.nome}: estoque ${s.estoque} na Shopee`); }
      if (f.fotos && s.foto && env.FOTOS) {
        const chaves = [s.foto, ...JSON.parse(s.fotos || '[]')];
        const ids = [];
        for (const k of chaves) {
          const o = await env.FOTOS.get(k);
          if (o) ids.push(await S.subirImagem(env, await o.arrayBuffer(), o.httpMetadata?.contentType));
        }
        if (ids.length) { await S.trocarFotos(env, s.shopee_item_id, ids); await anotar(env, 'foto', `${s.nome}: ${ids.length} foto(s) na Shopee`); }
      }
      await env.BANCO.prepare(`UPDATE skus SET sync = NULL, sync_erro = NULL${Object.keys(set).map((k) => `, ${k} = ?`).join('')} WHERE id = ?`).bind(...Object.values(set), s.id).run();
      enviados++;
    } catch (e) {
      erros.push(`${s.nome}: ${e.message}`);
      await env.BANCO.prepare('UPDATE skus SET sync_erro = ? WHERE id = ?').bind(String(e.message).slice(0, 300), s.id).run();
      await anotar(env, 'shopee', `${s.nome}: ${e.message}`, 0);
    }
  }
  return { enviados, erros };
}

/** Traz os pedidos da Shopee, tira do estoque os pagos e devolve os cancelados. */
export async function importarPedidos(env) {
  if (!S.configurada(env) || !(await S.conectada(env))) return { novos: 0 };
  const [pedidos, skus] = await Promise.all([S.listarPedidos(env, 15), todosSkus(env)]);
  let novos = 0;
  for (const p of pedidos) {
    const id = p.order_sn, itens = itensDoPedido(p, skus);
    const antes = await env.BANCO.prepare('SELECT status, baixado FROM pedidos WHERE id = ?').bind(id).first();
    const criado = new Date((p.create_time || 0) * 1000).toISOString();
    if (!antes) {
      novos++;
      await env.BANCO.prepare('INSERT INTO pedidos (id, origem, status, cliente, total, itens, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?,?)')
        .bind(id, 'shopee', p.order_status, p.buyer_username || null, p.total_amount || 0, JSON.stringify(itens), criado, agora()).run();
    } else if (antes.status !== p.order_status) {
      await env.BANCO.prepare('UPDATE pedidos SET status = ?, atualizado_em = ? WHERE id = ?').bind(p.order_status, agora(), id).run();
    }
    const baixado = antes ? antes.baixado : 0;
    if (!baixado && pedidoValido(p.order_status)) {
      for (const i of itens) if (i.sku) await mexerEstoque(env, i.sku, -i.qtd, 'venda', id);
      await env.BANCO.prepare('UPDATE pedidos SET baixado = 1 WHERE id = ?').bind(id).run();
      await anotar(env, 'pedido', `Pedido ${id}: ${itens.map((i) => `${i.qtd}× ${i.sku || i.nome}`).join(', ')}`);
    } else if (baixado && ['CANCELLED', 'IN_CANCEL'].includes(p.order_status)) {
      for (const i of itens) if (i.sku) await mexerEstoque(env, i.sku, i.qtd, 'cancelamento', id);
      await env.BANCO.prepare('UPDATE pedidos SET baixado = 0 WHERE id = ?').bind(id).run();
      await anotar(env, 'pedido', `Pedido ${id} cancelado: estoque devolvido`);
    }
  }
  if (novos) await anotar(env, 'pedido', `${novos} pedido(s) novo(s) da Shopee`);
  return { novos };
}

/** Rotina a cada 30 minutos: pedidos novos e o que ficou para mandar. */
export async function rotina(env) {
  try {
    await importarPedidos(env);
    if ((await opcao(env, 'automatico')) !== '0') await sincronizar(env);
  } catch (e) { await anotar(env, 'shopee', `Rotina: ${e.message}`, 0); }
}

/* ---------- API do ERP (só com o dono logado) ---------- */

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

export async function api(env, req, path, ctx) {
  const m = req.method;
  const corpo = m === 'GET' ? {} : await req.json().catch(() => ({}));
  const depois = async (ids) => { if ((await opcao(env, 'automatico')) !== '0') ctx.waitUntil(sincronizar(env, ids)); };

  if (path === '/api/erp/dados' && m === 'GET') {
    const [skus, pedidos, registro, mov] = await Promise.all([
      todosSkus(env),
      env.BANCO.prepare('SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 200').all(),
      env.BANCO.prepare('SELECT * FROM registro ORDER BY id DESC LIMIT 60').all(),
      env.BANCO.prepare('SELECT * FROM movimentos ORDER BY id DESC LIMIT 100').all(),
    ]);
    return json({
      skus, pedidos: pedidos.results.map((p) => ({ ...p, itens: JSON.parse(p.itens) })), registro: registro.results, movimentos: mov.results,
      shopee: { configurada: S.configurada(env), conectada: S.configurada(env) && (await S.conectada(env)), automatico: (await opcao(env, 'automatico')) !== '0', loja: await opcao(env, 'shop_id') },
    });
  }

  const ms = path.match(/^\/api\/erp\/sku\/([A-Z0-9-]+)$/);
  if (ms && m === 'POST') {
    const s = await umSku(env, ms[1]);
    if (!s) return json({ erro: 'SKU não encontrado.' }, 404);
    const preco = 'preco' in corpo ? num(corpo.preco) : s.preco;
    const estoque = 'estoque' in corpo ? Math.round(num(corpo.estoque) ?? s.estoque) : s.estoque;
    if (preco != null && !(preco > 0 && preco < 10000)) return json({ erro: 'Preço inválido.' }, 400);
    let sync = s.sync;
    if (s.shopee_item_id && preco !== s.preco) sync = marcar(sync, 'preco');
    if (s.shopee_item_id && estoque !== s.estoque) sync = marcar(sync, 'estoque');
    const st = [env.BANCO.prepare('UPDATE skus SET nome = ?, preco = ?, estoque = ?, estoque_min = ?, ativo = ?, sync = ?, atualizado_em = ? WHERE id = ?')
      .bind(String(corpo.nome ?? s.nome).slice(0, 120), preco, estoque, Math.max(0, Math.round(num(corpo.estoque_min) ?? s.estoque_min)), corpo.ativo === undefined ? s.ativo : (corpo.ativo ? 1 : 0), sync, agora(), s.id)];
    if (estoque !== s.estoque) st.push(env.BANCO.prepare('INSERT INTO movimentos (sku_id, qtd, motivo, obs, criado_em) VALUES (?,?,?,?,?)').bind(s.id, estoque - s.estoque, 'ajuste', 'acerto manual', agora()));
    await env.BANCO.batch(st);
    if (preco !== s.preco) await anotar(env, 'preco', `${s.nome}: preço ${s.preco ?? '–'} → ${preco}`);
    await depois([s.id]);
    return json(await umSku(env, s.id));
  }

  if (path === '/api/erp/producao' && m === 'POST') {
    // Entrada de produção: lista [{sku, qtd}]
    const itens = (corpo.itens || []).filter((i) => i.sku && Math.round(num(i.qtd)) > 0);
    for (const i of itens) await mexerEstoque(env, i.sku, Math.round(num(i.qtd)), 'producao', null, corpo.obs || null);
    if (itens.length) await anotar(env, 'estoque', `Produção: ${itens.map((i) => `${i.qtd}× ${i.sku}`).join(', ')}`);
    await depois(itens.map((i) => i.sku));
    return json({ ok: true });
  }

  if (path === '/api/erp/pedido' && m === 'POST') {
    // Venda fora da Shopee (WhatsApp, balcão, atacado)
    const itens = (corpo.itens || []).map((i) => ({ sku: i.sku, qtd: Math.round(num(i.qtd)) || 0, preco: num(i.preco) || 0 })).filter((i) => i.sku && i.qtd > 0);
    if (!itens.length) return json({ erro: 'Coloque ao menos um produto.' }, 400);
    const skus = await todosSkus(env);
    itens.forEach((i) => { i.nome = skus.find((s) => s.id === i.sku)?.nome || i.sku; });
    const n = (await env.BANCO.prepare("SELECT COUNT(*) AS n FROM pedidos WHERE origem = 'manual'").first()).n + 1;
    const id = `M-${String(n).padStart(4, '0')}`;
    await env.BANCO.prepare('INSERT INTO pedidos (id, origem, status, cliente, total, itens, baixado, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,1,?,?)')
      .bind(id, 'manual', 'COMPLETED', String(corpo.cliente || '').slice(0, 80) || null, itens.reduce((t, i) => t + i.qtd * i.preco, 0), JSON.stringify(itens), agora(), agora()).run();
    for (const i of itens) await mexerEstoque(env, i.sku, -i.qtd, 'venda', id);
    await depois(itens.map((i) => i.sku));
    return json({ ok: true, id });
  }

  if (path === '/api/erp/foto' && m === 'POST') {
    if (!env.FOTOS) return json({ erro: 'O armazenamento de fotos ainda não foi criado.' }, 500);
    const s = await umSku(env, corpo.sku);
    const mt = String(corpo.imagem || '').match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!s || !mt || mt[3].length > 6_000_000) return json({ erro: 'Foto inválida ou grande demais.' }, 400);
    const bytes = Uint8Array.from(atob(mt[3]), (c) => c.charCodeAt(0));
    const chave = `sku/${s.id}-${Date.now()}.${mt[2] === 'png' ? 'png' : 'jpg'}`;
    await env.FOTOS.put(chave, bytes, { httpMetadata: { contentType: mt[1] } });
    let foto = s.foto, extras = JSON.parse(s.fotos || '[]');
    if (corpo.principal || !foto) foto = chave; else extras = [...extras, chave].slice(0, 8);
    await env.BANCO.prepare('UPDATE skus SET foto = ?, fotos = ?, sync = ?, atualizado_em = ? WHERE id = ?')
      .bind(foto, JSON.stringify(extras), s.shopee_item_id ? marcar(s.sync, 'fotos') : s.sync, agora(), s.id).run();
    await anotar(env, 'foto', `${s.nome}: foto nova`);
    await depois([s.id]);
    return json(await umSku(env, s.id));
  }
  if (path === '/api/erp/foto/remover' && m === 'POST') {
    const s = await umSku(env, corpo.sku);
    if (!s) return json({ erro: 'SKU não encontrado.' }, 404);
    const extras = JSON.parse(s.fotos || '[]').filter((k) => k !== corpo.chave);
    const foto = s.foto === corpo.chave ? (extras.shift() || null) : s.foto;
    await env.BANCO.prepare('UPDATE skus SET foto = ?, fotos = ?, sync = ? WHERE id = ?').bind(foto, JSON.stringify(extras), s.shopee_item_id ? marcar(s.sync, 'fotos') : s.sync, s.id).run();
    await depois([s.id]);
    return json(await umSku(env, s.id));
  }

  /* --- Shopee --- */
  if (path === '/api/shopee/conectar' && m === 'GET') {
    if (!S.configurada(env)) return json({ erro: 'Falta o cadastro na Shopee Open Platform (Partner ID e Partner Key).' }, 400);
    const nonce = crypto.randomUUID();
    await setOpcao(env, 'nonce', nonce);
    const retorno = `${new URL(req.url).origin}/api/shopee/retorno?s=${nonce}`;
    return Response.redirect(await S.linkAutorizar(env, retorno), 302);
  }
  if (path === '/api/shopee/automatico' && m === 'POST') {
    await setOpcao(env, 'automatico', corpo.ligado ? '1' : '0');
    return json({ ok: true });
  }
  if (path === '/api/shopee/enviar' && m === 'POST') return json(await sincronizar(env, corpo.skus || null));
  if (path === '/api/shopee/pedidos' && m === 'POST') return json(await importarPedidos(env));
  if (path === '/api/shopee/anuncios' && m === 'GET') {
    const [lista, skus] = await Promise.all([S.listarAnuncios(env), todosSkus(env)]);
    return json(lista.map((a) => {
      const ligado = skus.find((s) => s.shopee_item_id === a.item_id && (s.shopee_model_id || 0) === (a.model_id || 0));
      return { ...a, ligado: ligado?.id || null, sugestao: ligado ? null : sugerirLigacao(a, skus)?.id || null };
    }));
  }
  if (path === '/api/shopee/ligar' && m === 'POST') {
    const s = await umSku(env, corpo.sku);
    if (!s) return json({ erro: 'SKU não encontrado.' }, 404);
    // um anúncio/variação só pode estar ligado a um SKU
    await env.BANCO.prepare('UPDATE skus SET shopee_item_id = NULL, shopee_model_id = NULL WHERE shopee_item_id = ? AND COALESCE(shopee_model_id,0) = ?').bind(corpo.item_id, corpo.model_id || 0).run();
    const preco = s.preco ?? num(corpo.preco);
    await env.BANCO.prepare('UPDATE skus SET shopee_item_id = ?, shopee_model_id = ?, shopee_preco = ?, shopee_estoque = ?, preco = ?, sync = NULL, sync_erro = NULL WHERE id = ?')
      .bind(corpo.item_id, corpo.model_id || 0, num(corpo.preco), num(corpo.estoque), preco, s.id).run();
    await anotar(env, 'shopee', `${s.nome} ligado ao anúncio ${corpo.item_id}${corpo.model_id ? '/' + corpo.model_id : ''}`);
    return json(await umSku(env, s.id));
  }
  if (path === '/api/shopee/desligar' && m === 'POST') {
    await env.BANCO.prepare('UPDATE skus SET shopee_item_id = NULL, shopee_model_id = NULL, sync = NULL, sync_erro = NULL WHERE id = ?').bind(corpo.sku).run();
    return json({ ok: true });
  }
  return null;
}

/** Volta da Shopee depois que o dono autoriza (vem sem o cookie: confere o código de segurança). */
export async function retornoShopee(env, req) {
  const u = new URL(req.url), nonce = await opcao(env, 'nonce');
  if (!nonce || u.searchParams.get('s') !== nonce) return new Response('Link vencido. Volte ao ERP e toque em Conectar de novo.', { status: 400 });
  try {
    await S.trocarCodigo(env, u.searchParams.get('code'), u.searchParams.get('shop_id'));
    await setOpcao(env, 'nonce', null);
    await anotar(env, 'shopee', `Loja ${u.searchParams.get('shop_id')} conectada`);
    return Response.redirect(`${u.origin}/?shopee=ok#loja`, 302);
  } catch (e) {
    await anotar(env, 'shopee', e.message, 0);
    return Response.redirect(`${u.origin}/?shopee=erro#loja`, 302);
  }
}

/** Fotos dos produtos (públicas: são as mesmas que vão na Shopee). */
export async function foto(env, chave) {
  const o = env.FOTOS && await env.FOTOS.get(chave);
  if (!o) return new Response('Foto não encontrada', { status: 404 });
  return new Response(o.body, { headers: { 'Content-Type': o.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
