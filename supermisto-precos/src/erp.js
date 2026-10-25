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

/** Situação do envio a partir do status da Shopee. */
export const envioDoStatus = (st) => ({ READY_TO_SHIP: 'a_preparar', PROCESSED: 'pronto', RETRY_SHIP: 'pronto' }[st]
  || (['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'TO_RETURN'].includes(st) ? 'enviado' : null));

/** Endereço de entrega do pedido da Shopee no formato do ERP. */
export function destinatarioShopee(p) {
  const a = p.recipient_address || {};
  return { nome: a.name || '', telefone: a.phone || '', endereco: a.full_address || [a.address, a.district].filter(Boolean).join(', '), cidade: a.city || '', uf: a.state || '', cep: a.zipcode || '' };
}

/** Quanto de cada matéria-prima (kg) sai para produzir `qtd` unidades do SKU, pela receita de cada sabor. */
export function consumoInsumos(sku, qtd, produtos) {
  const sabores = JSON.parse(sku.sabores);
  const gramasPorSabor = (sku.unidades * sku.gramas * qtd) / sabores.length;
  const kg = {};
  for (const id of sabores) {
    const p = produtos.find((x) => x.id === id);
    if (!p) continue;
    for (const r of (typeof p.receita === 'string' ? JSON.parse(p.receita) : p.receita)) kg[r.insumo] = (kg[r.insumo] || 0) + gramasPorSabor * (r.pct / 100) / 1000;
  }
  return kg;
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
    const dest = destinatarioShopee(p), envio = envioDoStatus(p.order_status);
    const prazo = p.ship_by_date ? new Date(p.ship_by_date * 1000).toISOString() : null;
    if (!antes) {
      novos++;
      await env.BANCO.prepare('INSERT INTO pedidos (id, origem, status, cliente, total, itens, criado_em, atualizado_em, destinatario, transportadora, envio, prazo_envio, frete, obs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, 'shopee', p.order_status, p.buyer_username || null, p.total_amount || 0, JSON.stringify(itens), criado, agora(),
          JSON.stringify(dest), p.shipping_carrier || null, envio, prazo, p.actual_shipping_fee ?? p.estimated_shipping_fee ?? null, p.note || null).run();
    } else {
      await env.BANCO.prepare("UPDATE pedidos SET status = ?, destinatario = ?, transportadora = COALESCE(?, transportadora), envio = CASE WHEN envio = 'etiqueta_impressa' AND ? = 'pronto' THEN envio ELSE ? END, prazo_envio = ?, atualizado_em = ? WHERE id = ?")
        .bind(p.order_status, JSON.stringify(dest), p.shipping_carrier || null, envio, envio, prazo, agora(), id).run();
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
  // quanto a Shopee pagou de verdade (concluídos sem repasse ainda): vira entrada no financeiro
  const semRepasse = (await env.BANCO.prepare("SELECT id, criado_em FROM pedidos WHERE origem = 'shopee' AND status = 'COMPLETED' AND liquido IS NULL LIMIT 20").all()).results;
  for (const p of semRepasse) {
    try {
      const r = await S.repasse(env, p.id);
      if (r.liquido == null) continue;
      await env.BANCO.batch([
        env.BANCO.prepare('UPDATE pedidos SET liquido = ?, frete = COALESCE(?, frete) WHERE id = ?').bind(r.liquido, r.frete, p.id),
        env.BANCO.prepare("INSERT OR IGNORE INTO lancamentos (tipo, categoria, descricao, valor, vencimento, pago, pedido_id, criado_em) VALUES ('entrada','Vendas Shopee',?,?,?,1,?,?)")
          .bind(`Pedido Shopee ${p.id}`, r.liquido, p.criado_em.slice(0, 10), p.id, agora()),
      ]);
    } catch (e) { await anotar(env, 'shopee', `Repasse ${p.id}: ${e.message}`, 0); }
  }
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
    const [skus, pedidos, registro, mov, lanc, compras, insumos, emp] = await Promise.all([
      todosSkus(env),
      env.BANCO.prepare('SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 1000').all(),
      env.BANCO.prepare('SELECT * FROM registro ORDER BY id DESC LIMIT 60').all(),
      env.BANCO.prepare('SELECT * FROM movimentos ORDER BY id DESC LIMIT 150').all(),
      env.BANCO.prepare('SELECT * FROM lancamentos ORDER BY vencimento DESC, id DESC LIMIT 1500').all(),
      env.BANCO.prepare('SELECT * FROM compras ORDER BY data DESC, id DESC LIMIT 300').all(),
      env.BANCO.prepare('SELECT nome, preco_kg, estoque_kg, minimo_kg FROM insumos ORDER BY nome').all(),
      env.BANCO.prepare("SELECT chave, valor FROM shopee WHERE chave LIKE 'empresa_%'").all(),
    ]);
    return json({
      skus, pedidos: pedidos.results.map((p) => ({ ...p, itens: JSON.parse(p.itens), destinatario: p.destinatario ? JSON.parse(p.destinatario) : null })),
      registro: registro.results, movimentos: mov.results, lancamentos: lanc.results, compras: compras.results, insumos: insumos.results,
      empresa: Object.fromEntries(emp.results.map((e) => [e.chave.slice(8), e.valor])),
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
    const produtos = (await env.BANCO.prepare('SELECT id, receita FROM produtos').all()).results;
    const gasto = {};
    for (const i of itens) {
      await mexerEstoque(env, i.sku, Math.round(num(i.qtd)), 'producao', null, corpo.obs || null);
      const s = await umSku(env, i.sku);
      for (const [ins, kg] of Object.entries(consumoInsumos(s, Math.round(num(i.qtd)), produtos))) gasto[ins] = (gasto[ins] || 0) + kg;
    }
    if (corpo.baixarMateria !== false && Object.keys(gasto).length)
      await env.BANCO.batch(Object.entries(gasto).map(([n, kg]) => env.BANCO.prepare('UPDATE insumos SET estoque_kg = MAX(0, estoque_kg - ?) WHERE nome = ?').bind(Math.round(kg * 1000) / 1000, n)));
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
    const frete = num(corpo.frete) || 0, total = itens.reduce((t, i) => t + i.qtd * i.preco, 0) + frete;
    const d = corpo.destinatario || {};
    const dest = ['nome', 'telefone', 'endereco', 'cidade', 'uf', 'cep'].reduce((o, k) => ({ ...o, [k]: String(d[k] || '').slice(0, 160) }), {});
    const entrega = !!(dest.endereco && dest.cidade);
    await env.BANCO.batch([
      env.BANCO.prepare('INSERT INTO pedidos (id, origem, status, cliente, total, itens, baixado, criado_em, atualizado_em, destinatario, envio, frete, pagamento, obs) VALUES (?,?,?,?,?,?,1,?,?,?,?,?,?,?)')
        .bind(id, 'manual', entrega ? 'READY_TO_SHIP' : 'COMPLETED', String(corpo.cliente || dest.nome || '').slice(0, 80) || null, total, JSON.stringify(itens), agora(), agora(),
          JSON.stringify(dest), entrega ? 'a_preparar' : null, frete, String(corpo.pagamento || '').slice(0, 30) || null, String(corpo.obs || '').slice(0, 300) || null),
      env.BANCO.prepare("INSERT INTO lancamentos (tipo, categoria, descricao, valor, vencimento, pago, pedido_id, criado_em) VALUES ('entrada','Vendas diretas',?,?,?,?,?,?)")
        .bind(`Venda ${id}${corpo.cliente || dest.nome ? ' · ' + (corpo.cliente || dest.nome) : ''}`, total, agora().slice(0, 10), corpo.recebido === false ? 0 : 1, id, agora()),
    ]);
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

  const r2 = await apiCompleta(env, req, path, corpo, depois);
  if (r2) return r2;

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

/* ---------- envio, financeiro, compras, empresa ---------- */

const hoje = () => new Date().toISOString().slice(0, 10);
const CATEGORIAS = ['Vendas Shopee', 'Vendas diretas', 'Matéria-prima', 'Embalagem', 'Frete', 'Impostos', 'Contas fixas', 'Funcionários', 'Marketing', 'Outros'];

async function apiCompleta(env, req, path, corpo, depois) {
  const m = req.method;

  // Pedido: mudar situação (vendas fora da Shopee: enviado, entregue, cancelado)
  const mp = path.match(/^\/api\/erp\/pedido\/([A-Za-z0-9-]+)$/);
  if (mp && m === 'POST') {
    const p = await env.BANCO.prepare('SELECT * FROM pedidos WHERE id = ?').bind(mp[1]).first();
    if (!p) return json({ erro: 'Pedido não encontrado.' }, 404);
    if (corpo.rastreio !== undefined) await env.BANCO.prepare('UPDATE pedidos SET rastreio = ? WHERE id = ?').bind(String(corpo.rastreio).slice(0, 60), p.id).run();
    if (corpo.envio) await env.BANCO.prepare('UPDATE pedidos SET envio = ?, atualizado_em = ? WHERE id = ?').bind(corpo.envio, agora(), p.id).run();
    if (p.origem === 'manual' && corpo.status && corpo.status !== p.status) {
      if (corpo.status === 'CANCELLED' && p.baixado) {
        for (const i of JSON.parse(p.itens)) await mexerEstoque(env, i.sku, i.qtd, 'cancelamento', p.id);
        await env.BANCO.prepare('DELETE FROM lancamentos WHERE pedido_id = ?').bind(p.id).run();
        await env.BANCO.prepare('UPDATE pedidos SET baixado = 0 WHERE id = ?').bind(p.id).run();
        await depois(JSON.parse(p.itens).map((i) => i.sku));
      }
      const envio = corpo.status === 'COMPLETED' || corpo.status === 'SHIPPED' ? 'enviado' : p.envio;
      await env.BANCO.prepare('UPDATE pedidos SET status = ?, envio = ?, atualizado_em = ? WHERE id = ?').bind(corpo.status, envio, agora(), p.id).run();
    }
    return json({ ok: true });
  }

  // Shopee: preparar envio de vários pedidos
  if (path === '/api/erp/preparar' && m === 'POST') {
    const feitos = [], erros = [];
    for (const sn of (corpo.pedidos || []).slice(0, 50)) {
      try {
        const como = await S.prepararEnvio(env, sn);
        await env.BANCO.prepare("UPDATE pedidos SET envio = 'pronto', atualizado_em = ? WHERE id = ?").bind(agora(), sn).run();
        feitos.push(sn); await anotar(env, 'pedido', `Pedido ${sn}: envio preparado (${como})`);
      } catch (e) { erros.push(`${sn}: ${e.message}`); await anotar(env, 'pedido', `Pedido ${sn}: ${e.message}`, 0); }
    }
    return json({ feitos, erros });
  }

  // Shopee: etiqueta oficial em PDF (um ou vários pedidos)
  if (path === '/api/erp/etiqueta' && m === 'GET') {
    const sns = (new URL(req.url).searchParams.get('pedidos') || '').split(',').filter(Boolean).slice(0, 50);
    if (!sns.length) return json({ erro: 'Escolha os pedidos.' }, 400);
    try {
      const pdf = await S.etiquetas(env, sns);
      await env.BANCO.batch(sns.map((sn) => env.BANCO.prepare("UPDATE pedidos SET envio = 'etiqueta_impressa' WHERE id = ? AND envio IN ('pronto','a_preparar')").bind(sn)));
      return new Response(pdf.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="etiquetas-${hoje()}.pdf"`, 'Cache-Control': 'no-store' } });
    } catch (e) {
      return new Response(`<meta charset="utf-8"><body style="font-family:sans-serif;padding:24px"><h2>Não deu para gerar a etiqueta</h2><p>${String(e.message).replace(/</g, '&lt;')}</p><p>Toque em <b>Preparar envio</b> no pedido e tente de novo em alguns segundos.</p></body>`, { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }

  // Financeiro
  if (path === '/api/erp/lancamento' && m === 'POST') {
    const valor = num(corpo.valor);
    if (!['entrada', 'saida'].includes(corpo.tipo) || !(valor > 0) || !corpo.descricao) return json({ erro: 'Preencha tipo, descrição e valor.' }, 400);
    const r = await env.BANCO.prepare('INSERT INTO lancamentos (tipo, categoria, descricao, valor, vencimento, pago, criado_em) VALUES (?,?,?,?,?,?,?) RETURNING *')
      .bind(corpo.tipo, CATEGORIAS.includes(corpo.categoria) ? corpo.categoria : 'Outros', String(corpo.descricao).slice(0, 160), valor, /^\d{4}-\d{2}-\d{2}$/.test(corpo.vencimento || '') ? corpo.vencimento : hoje(), corpo.pago ? 1 : 0, agora()).first();
    return json(r);
  }
  const ml = path.match(/^\/api\/erp\/lancamento\/(\d+)$/);
  if (ml && m === 'POST') {
    if (corpo.apagar) await env.BANCO.prepare('DELETE FROM lancamentos WHERE id = ? AND pedido_id IS NULL').bind(Number(ml[1])).run();
    else await env.BANCO.prepare('UPDATE lancamentos SET pago = ? WHERE id = ?').bind(corpo.pago ? 1 : 0, Number(ml[1])).run();
    return json({ ok: true });
  }

  // Compras (matéria-prima ou outras) → estoque de matéria-prima, custo e financeiro
  if (path === '/api/erp/compra' && m === 'POST') {
    const valor = num(corpo.valor), comprado = num(corpo.comprado_kg), rendeu = num(corpo.rendeu_kg) ?? comprado;
    if (!(valor > 0) || !corpo.descricao) return json({ erro: 'Preencha o que comprou e o valor.' }, 400);
    const data = /^\d{4}-\d{2}-\d{2}$/.test(corpo.data || '') ? corpo.data : hoje();
    const ins = corpo.insumo ? await env.BANCO.prepare('SELECT nome FROM insumos WHERE nome = ?').bind(corpo.insumo).first() : null;
    const c = await env.BANCO.prepare('INSERT INTO compras (insumo, descricao, fornecedor, valor, comprado_kg, rendeu_kg, data, criado_em) VALUES (?,?,?,?,?,?,?,?) RETURNING id')
      .bind(ins?.nome || null, String(corpo.descricao).slice(0, 160), String(corpo.fornecedor || '').slice(0, 80) || null, valor, comprado, rendeu, data, agora()).first();
    const st = [env.BANCO.prepare("INSERT INTO lancamentos (tipo, categoria, descricao, valor, vencimento, pago, compra_id, criado_em) VALUES ('saida',?,?,?,?,?,?,?)")
      .bind(ins ? 'Matéria-prima' : (CATEGORIAS.includes(corpo.categoria) ? corpo.categoria : 'Embalagem'), `Compra: ${corpo.descricao}${corpo.fornecedor ? ' · ' + corpo.fornecedor : ''}`, valor, corpo.vencimento || data, corpo.pago === false ? 0 : 1, c.id, agora())];
    if (ins && rendeu > 0) {
      const precoKg = Math.round((valor / rendeu) * 100) / 100;
      st.push(env.BANCO.prepare('UPDATE insumos SET estoque_kg = estoque_kg + ?, preco_kg = ?, pago = ?, comprado_kg = ?, rendeu_kg = ?, atualizado_em = ? WHERE nome = ?').bind(rendeu, precoKg, valor, comprado, rendeu, agora(), ins.nome));
    }
    await env.BANCO.batch(st);
    await anotar(env, 'estoque', `Compra: ${corpo.descricao} (${valor.toFixed(2)})`);
    return json({ ok: true });
  }
  if (path === '/api/erp/insumo' && m === 'POST') {
    await env.BANCO.prepare('UPDATE insumos SET estoque_kg = ?, minimo_kg = ? WHERE nome = ?').bind(Math.max(0, num(corpo.estoque_kg) ?? 0), Math.max(0, num(corpo.minimo_kg) ?? 1), String(corpo.nome)).run();
    return json({ ok: true });
  }

  // Dados da empresa (remetente)
  if (path === '/api/erp/empresa' && m === 'POST') {
    const campos = ['nome', 'cnpj', 'endereco', 'cidade', 'uf', 'cep', 'telefone'];
    await env.BANCO.batch(campos.filter((k) => k in corpo).map((k) => env.BANCO.prepare('INSERT INTO shopee (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(`empresa_${k}`, String(corpo[k]).slice(0, 160))));
    return json({ ok: true });
  }
  return null;
}
