// Aba Ceasa do ERP: cotação (PDF/texto), preço pago, perda e rendimento, embalagens, concorrentes e kits.
const agora = () => new Date().toISOString();
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const pos = (v) => { const n = num(v); return n != null && n >= 0 ? n : null; };
const dia = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : agora().slice(0, 10));

async function dados(env) {
  const [prods, emb, kits, conc, hist, cfg, base] = await Promise.all([
    env.BANCO.prepare('SELECT * FROM ceasa_produtos ORDER BY ordem').all(),
    env.BANCO.prepare('SELECT * FROM ceasa_embalagens ORDER BY ordem').all(),
    env.BANCO.prepare('SELECT * FROM ceasa_kits ORDER BY ordem').all(),
    env.BANCO.prepare('SELECT * FROM ceasa_concorrentes ORDER BY id DESC LIMIT 1000').all(),
    env.BANCO.prepare('SELECT * FROM ceasa_historico ORDER BY data DESC, id DESC LIMIT 400').all(),
    env.BANCO.prepare('SELECT chave, valor FROM ceasa_config').all(),
    env.BANCO.prepare('SELECT chave, valor FROM config').all(),
  ]);
  return {
    produtos: prods.results, embalagens: emb.results, kits: kits.results.map((k) => ({ ...k, itens: JSON.parse(k.itens) })),
    concorrentes: conc.results, historico: hist.results,
    config: Object.fromEntries(cfg.results.map((c) => [c.chave, c.valor])),
    base: Object.fromEntries(base.results.map((c) => [c.chave, c.valor])),
  };
}

export async function api(env, req, path) {
  const m = req.method;
  if (!path.startsWith('/api/ceasa')) return null;
  const corpo = m === 'GET' || m === 'DELETE' ? {} : await req.json().catch(() => ({}));
  const db = env.BANCO;

  if (path === '/api/ceasa/dados' && m === 'GET') return json(await dados(env));

  // Conta do produto: perda, rendimento, secagem, caixa, preço de venda
  const mp = path.match(/^\/api\/ceasa\/produto\/([a-z0-9-]+)$/);
  if (mp && m === 'POST') {
    const campos = { perda_pct: pos, rendimento_pct: pos, secagem_kg: pos, caixa_kg: pos, preco_caixa: pos, preco_venda: pos, gramas_venda: pos };
    const sets = [], vals = [];
    for (const [k, f] of Object.entries(campos)) if (k in corpo) { const v = f(corpo[k]); if (v == null && !['preco_venda', 'caixa_kg', 'preco_caixa'].includes(k)) continue; sets.push(`${k} = ?`); vals.push(v); }
    if (typeof corpo.palavras === 'string') { sets.push('palavras = ?'); vals.push(corpo.palavras.slice(0, 120)); }
    if (typeof corpo.exclui === 'string') { sets.push('exclui = ?'); vals.push(corpo.exclui.slice(0, 120)); }
    if (!sets.length) return json({ erro: 'Nada para salvar.' }, 400);
    await db.prepare(`UPDATE ceasa_produtos SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, mp[1]).run();
    return json({ ok: true });
  }

  // Aplicar a cotação lida: [{produto_id, preco, kg_unidade, linha}]
  if (path === '/api/ceasa/tabela' && m === 'POST') {
    const dt = dia(corpo.data), itens = (Array.isArray(corpo.itens) ? corpo.itens : []).filter((i) => i.produto_id && pos(i.preco) > 0 && pos(i.kg_unidade) > 0);
    if (!itens.length) return json({ erro: 'Escolha pelo menos um produto com preço e peso da caixa.' }, 400);
    const lote = [];
    for (const i of itens) {
      const preco = pos(i.preco), kg = pos(i.kg_unidade);
      lote.push(db.prepare('UPDATE ceasa_produtos SET preco_caixa = ?, caixa_kg = ?, tabela_em = ? WHERE id = ?').bind(preco, kg, dt, i.produto_id));
      lote.push(db.prepare("DELETE FROM ceasa_historico WHERE produto_id = ? AND data = ? AND tipo = 'tabela'").bind(i.produto_id, dt));
      lote.push(db.prepare("INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, preco_min, preco_max, var12, linha, criado_em) VALUES (?,?,'tabela',?,?,?,?,?,?,?,?)")
        .bind(i.produto_id, dt, preco, kg, Math.round((preco / kg) * 100) / 100, pos(i.min), pos(i.max), num(i.var12), String(i.linha || '').slice(0, 160), agora()));
    }
    await db.batch(lote);
    return json({ ok: true, atualizados: itens.length });
  }

  // "Comprei hoje por tanto": passa a valer no lugar da cotação
  if (path === '/api/ceasa/comprei' && m === 'POST') {
    const preco = pos(corpo.preco), kg = pos(corpo.kg_unidade), dt = dia(corpo.data);
    if (!(preco > 0) || !(kg > 0) || !corpo.produto_id) return json({ erro: 'Coloque o preço pago e o peso da caixa em kg.' }, 400);
    await db.batch([
      db.prepare('UPDATE ceasa_produtos SET pago_caixa = ?, pago_caixa_kg = ?, pago_em = ? WHERE id = ?').bind(preco, kg, dt, String(corpo.produto_id)),
      db.prepare("INSERT INTO ceasa_historico (produto_id, data, tipo, preco, kg_unidade, preco_kg, linha, criado_em) VALUES (?,?,'compra',?,?,?,?,?)")
        .bind(String(corpo.produto_id), dt, preco, kg, Math.round((preco / kg) * 100) / 100, null, agora()),
    ]);
    return json({ ok: true });
  }
  if (path === '/api/ceasa/comprei/limpar' && m === 'POST') {
    await db.prepare('UPDATE ceasa_produtos SET pago_caixa = NULL, pago_caixa_kg = NULL, pago_em = NULL WHERE id = ?').bind(String(corpo.produto_id)).run();
    return json({ ok: true });
  }

  // Embalagens: quanto custou e quantas vieram
  const me = path.match(/^\/api\/ceasa\/embalagem\/([a-z0-9-]+)$/);
  if (me && m === 'POST') {
    await db.prepare('UPDATE ceasa_embalagens SET preco = ?, quantidade = ? WHERE id = ?').bind(pos(corpo.preco), pos(corpo.quantidade), me[1]).run();
    return json({ ok: true });
  }

  // Concorrentes da Ceasa × Shopee (200 g, 100 g, 500 g…)
  if (path === '/api/ceasa/concorrente' && m === 'POST') {
    const ok = await db.prepare('SELECT 1 FROM ceasa_produtos WHERE id = ?').bind(String(corpo.produto_id)).first();
    const g = pos(corpo.gramas), preco = pos(corpo.preco);
    if (!ok || !(g > 0) || !(preco > 0)) return json({ erro: 'Escolha o produto e coloque os gramas e o preço.' }, 400);
    const r = await db.prepare('INSERT INTO ceasa_concorrentes (produto_id, loja, gramas, preco, vendidos, criado_em) VALUES (?,?,?,?,?,?) RETURNING *')
      .bind(String(corpo.produto_id), String(corpo.loja || '').slice(0, 80) || null, g, preco, pos(corpo.vendidos), agora()).first();
    return json(r);
  }
  const mc = path.match(/^\/api\/ceasa\/concorrente\/(\d+)$/);
  if (mc && m === 'DELETE') { await db.prepare('DELETE FROM ceasa_concorrentes WHERE id = ?').bind(Number(mc[1])).run(); return json({ ok: true }); }

  // Kits
  if (path === '/api/ceasa/kit' && m === 'POST') {
    const id = /^[a-z0-9-]{2,40}$/.test(corpo.id || '') ? corpo.id : `kit-${Date.now().toString(36)}`;
    const itens = (Array.isArray(corpo.itens) ? corpo.itens : []).map((i) => ({ produto_id: String(i.produto_id), gramas: pos(i.gramas) })).filter((i) => i.produto_id && i.gramas > 0).slice(0, 40);
    if (!itens.length) return json({ erro: 'O kit precisa de pelo menos um produto.' }, 400);
    const ordem = (await db.prepare('SELECT COALESCE(MAX(ordem), 0) + 1 AS o FROM ceasa_kits').first()).o;
    await db.prepare(`INSERT INTO ceasa_kits (id, nome, itens, preco, vendas_mes, ordem) VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, itens = excluded.itens, preco = excluded.preco, vendas_mes = excluded.vendas_mes`)
      .bind(id, String(corpo.nome || 'Kit').slice(0, 80), JSON.stringify(itens), pos(corpo.preco), Math.floor(pos(corpo.vendas_mes) || 0), ordem).run();
    return json({ ok: true, id });
  }
  const mk = path.match(/^\/api\/ceasa\/kit\/([a-z0-9-]+)$/);
  if (mk && m === 'DELETE') { await db.prepare('DELETE FROM ceasa_kits WHERE id = ?').bind(mk[1]).run(); return json({ ok: true }); }

  // Regras de venda: taxa extra do frete grátis e unidades avulsas por mês
  if (path === '/api/ceasa/config' && m === 'POST') {
    const lote = [];
    for (const k of ['extra_pct', 'unidades_mes', 'limite_caro_pct']) if (k in corpo && pos(corpo[k]) != null) lote.push(db.prepare('INSERT INTO ceasa_config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(k, pos(corpo[k])));
    if (lote.length) await db.batch(lote);
    return json({ ok: true });
  }
  return json({ erro: 'nao_encontrado' }, 404);
}
