// Caixa (abrir, sangria, suprimento, fechar) e vendas (finalizar, consultar, cancelar).
// O servidor recalcula o pedido inteiro com os preços do cadastro: o total que vem do navegador não vale.
import { Hono } from 'hono';
import { z } from 'zod';
import { baixaEstoque, calcularItem, conferirPagamentos, ErroPedido, pctDesconto, totais, type ItemCalculado, type ProdutoPreco } from '../regras/pedido';
import { pode } from '../regras/permissoes';
import { agora, aleatorio, auditar, corpo, erro, novoId, type C, type D1Prepared, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';

/** Dias do calendário local (AAAA-MM-DD) → intervalo em UTC. fuso = minutos do getTimezoneOffset (Brasília = 180). */
export function intervalo(de: string, ate: string, fuso: number): [string, string] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw erro(400, 'datas_invalidas', 'Datas inválidas.');
  const f = Number.isFinite(fuso) && Math.abs(fuso) <= 840 ? fuso : 180;
  return [new Date(Date.parse(`${de}T00:00:00.000Z`) + f * 6e4).toISOString(), new Date(Date.parse(`${ate}T00:00:00.000Z`) + 864e5 + f * 6e4).toISOString()];
}

export const vendas = new Hono<{ Bindings: Env; Variables: Vars }>();

// ---------- caixa ----------
async function caixaAberto(c: C) {
  return c.env.BANCO.prepare('SELECT * FROM caixas WHERE empresa_id = ? AND fechado_em IS NULL ORDER BY aberto_em DESC LIMIT 1').bind(c.get('empresa').id).first<{ id: string; aberto_em: string; fundo: number; aberto_por: string }>();
}
/** Quanto entrou no caixa por forma, e o dinheiro que tem que estar na gaveta. */
export async function resumoCaixa(c: C, caixaId: string, fundo: number) {
  const db = c.env.BANCO;
  const { results: formas } = await db.prepare(`SELECT p.forma, SUM(p.valor) AS valor FROM pagamentos p JOIN vendas v ON v.id = p.venda_id
    WHERE v.caixa_id = ? AND v.status = 'concluida' GROUP BY p.forma`).bind(caixaId).all<{ forma: string; valor: number }>();
  const v = await db.prepare(`SELECT COUNT(*) AS qtd, COALESCE(SUM(total),0) AS total, COALESCE(SUM(troco),0) AS troco FROM vendas WHERE caixa_id = ? AND status = 'concluida'`).bind(caixaId).first<{ qtd: number; total: number; troco: number }>();
  const { results: movs } = await db.prepare(`SELECT m.*, u.nome AS usuario FROM caixa_movimentos m LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE m.caixa_id = ? ORDER BY m.criado_em`).bind(caixaId).all<{ tipo: string; valor: number }>();
  const porForma: Record<string, number> = {};
  for (const f of formas) porForma[f.forma] = f.valor;
  const troco = v?.troco || 0;
  if (porForma.dinheiro) porForma.dinheiro -= troco; // o troco saiu da gaveta
  const sangrias = movs.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0);
  const suprimentos = movs.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0);
  return { qtdVendas: v?.qtd || 0, totalVendido: v?.total || 0, porForma, sangrias, suprimentos, movimentos: movs,
    dinheiroEsperado: fundo + (porForma.dinheiro || 0) + suprimentos - sangrias };
}

vendas.get('/caixa', async (c) => {
  exigir(c, 'caixa');
  const cx = await caixaAberto(c);
  if (!cx) return c.json({ caixa: null });
  return c.json({ caixa: cx, resumo: await resumoCaixa(c, cx.id, cx.fundo) });
});
vendas.post('/caixa/abrir', async (c) => {
  exigir(c, 'caixa');
  const d = validar(z.object({ fundo: z.number().int().min(0, 'Não pode ser negativo.').max(10_000_000) }), await corpo(c));
  if (await caixaAberto(c)) throw erro(409, 'caixa_aberto', 'O caixa já está aberto.');
  const id = novoId();
  await c.env.BANCO.batch([
    c.env.BANCO.prepare('INSERT INTO caixas (id, empresa_id, aberto_por, aberto_em, fundo) VALUES (?,?,?,?,?)').bind(id, c.get('empresa').id, c.get('usuario').id, agora(), d.fundo),
    auditar(c, 'caixa_aberto', { id, fundo: d.fundo }),
  ]);
  return c.json({ ok: true, id }, 201);
});
vendas.post('/caixa/movimento', async (c) => {
  exigir(c, 'caixa');
  const d = validar(z.object({ tipo: z.enum(['sangria', 'suprimento']), valor: z.number().int().min(1, 'Digite o valor.').max(10_000_000), motivo: z.string().trim().max(120).optional() }), await corpo(c));
  const cx = await caixaAberto(c);
  if (!cx) throw erro(409, 'caixa_fechado', 'Abra o caixa primeiro.');
  await c.env.BANCO.batch([
    c.env.BANCO.prepare('INSERT INTO caixa_movimentos (id, caixa_id, empresa_id, tipo, valor, motivo, usuario_id, criado_em) VALUES (?,?,?,?,?,?,?,?)')
      .bind(novoId(), cx.id, c.get('empresa').id, d.tipo, d.valor, d.motivo || null, c.get('usuario').id, agora()),
    auditar(c, d.tipo, { caixa: cx.id, valor: d.valor, motivo: d.motivo }),
  ]);
  return c.json({ ok: true });
});
vendas.post('/caixa/fechar', async (c) => {
  exigir(c, 'caixa');
  const d = validar(z.object({ contado: z.number().int().min(0, 'Não pode ser negativo.').max(100_000_000) }), await corpo(c));
  const cx = await caixaAberto(c);
  if (!cx) throw erro(409, 'caixa_fechado', 'O caixa já está fechado.');
  const r = await resumoCaixa(c, cx.id, cx.fundo);
  await c.env.BANCO.batch([
    c.env.BANCO.prepare('UPDATE caixas SET fechado_por = ?, fechado_em = ?, contado = ?, esperado = ? WHERE id = ? AND fechado_em IS NULL').bind(c.get('usuario').id, agora(), d.contado, r.dinheiroEsperado, cx.id),
    auditar(c, 'caixa_fechado', { id: cx.id, contado: d.contado, esperado: r.dinheiroEsperado }),
  ]);
  return c.json({ ok: true, resumo: r, diferenca: d.contado - r.dinheiroEsperado });
});
vendas.get('/caixas', async (c) => {
  exigir(c, 'relatorios');
  const { results } = await c.env.BANCO.prepare(`SELECT cx.*, ua.nome AS aberto_por_nome, uf.nome AS fechado_por_nome FROM caixas cx
    LEFT JOIN usuarios ua ON ua.id = cx.aberto_por LEFT JOIN usuarios uf ON uf.id = cx.fechado_por
    WHERE cx.empresa_id = ? AND cx.fechado_em IS NOT NULL ORDER BY cx.fechado_em DESC LIMIT 60`).bind(c.get('empresa').id).all();
  return c.json({ caixas: results });
});

// ---------- vendas ----------
const esqVenda = z.object({
  chave: z.string().min(8).max(64),
  itens: z.array(z.object({
    produtoId: z.string().min(1), qtd: z.number(), tamanho: z.string().nullable().optional(),
    adicionais: z.array(z.string()).max(30).optional(), retirar: z.array(z.string()).max(20).optional(), observacao: z.string().max(150).optional(),
  })).min(1, 'O pedido está vazio.').max(100),
  desconto: z.object({ tipo: z.enum(['valor', 'pct']), valor: z.number().min(0) }).nullable().optional(),
  pagamentos: z.array(z.object({ forma: z.string(), valor: z.number() })).min(1, 'Escolha a forma de pagamento.').max(6),
  clienteId: z.string().nullable().optional(),
  observacao: z.string().max(200).optional(),
  entrega: z.object({ endereco: z.string().trim().max(200), taxa: z.number().int().min(0).max(100000) }).nullable().optional(),
});

export async function vendaCompleta(c: C, id: string) {
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const v = await db.prepare(`SELECT v.*, u.nome AS operador, cl.nome AS cliente, cl.telefone AS cliente_telefone, uc.nome AS cancelada_por_nome FROM vendas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN clientes cl ON cl.id = v.cliente_id LEFT JOIN usuarios uc ON uc.id = v.cancelada_por
    WHERE v.id = ? AND v.empresa_id = ?`).bind(id, emp).first<Record<string, unknown>>();
  if (!v) return null;
  const { results: itens } = await db.prepare('SELECT i.*, p.foto_id, cat.icone FROM venda_itens i LEFT JOIN produtos p ON p.id = i.produto_id LEFT JOIN categorias cat ON cat.id = p.categoria_id WHERE i.venda_id = ?').bind(id).all<Record<string, unknown>>();
  const { results: pagamentos } = await db.prepare('SELECT forma, valor FROM pagamentos WHERE venda_id = ?').bind(id).all();
  return { ...v, itens: itens.map((i) => ({ ...i, detalhes: JSON.parse(String(i.detalhes || '{}')) })), pagamentos };
}

vendas.post('/vendas', async (c) => {
  exigir(c, 'vender');
  const d = validar(esqVenda, await corpo(c));
  const r = await registrarVenda(c, d);
  return c.json({ ok: true, ...(r.repetida ? { repetida: true } : {}), venda: await vendaCompleta(c, r.id) }, r.repetida ? 200 : 201);
});

export type DadosVenda = z.infer<typeof esqVenda>;
/** Registra a venda (caixa, pedido aceito do app): recalcula tudo com os preços do cadastro, baixa estoque e numera. */
export async function registrarVenda(c: C, d: DadosVenda): Promise<{ id: string; repetida: boolean }> {
  const db = c.env.BANCO, emp = c.get('empresa'), u = c.get('usuario');
  // Mesmo pedido enviado de novo (clique duplo, internet que caiu e voltou): devolve a venda que já existe.
  const ja = await db.prepare('SELECT id FROM vendas WHERE empresa_id = ? AND chave = ?').bind(emp.id, d.chave).first<{ id: string }>();
  if (ja) return { id: ja.id, repetida: true };
  const cx = await caixaAberto(c);
  if (!cx) throw erro(409, 'caixa_fechado', 'Abra o caixa antes de vender.');
  if (d.clienteId && !(await db.prepare('SELECT 1 FROM clientes WHERE id = ? AND empresa_id = ?').bind(d.clienteId, emp.id).first())) throw erro(400, 'dados_invalidos', 'Cliente inválido.');

  // Preços e opções do cadastro (nunca do navegador).
  const ids = [...new Set(d.itens.map((i) => i.produtoId))];
  const { results: prods } = await db.prepare(`SELECT p.id, p.nome, p.preco, p.custo, p.opcoes, p.receita, p.ativo, c.nome AS categoria FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.empresa_id = ? AND p.id IN (${ids.map(() => '?').join(',')})`).bind(emp.id, ...ids).all<{ id: string; nome: string; preco: number; custo: number; opcoes: string; receita: string; ativo: number; categoria: string | null }>();
  const porId = new Map(prods.map((p) => [p.id, p]));
  let itens: (ItemCalculado & { categoria: string | null })[], t: ReturnType<typeof totais>, troco: number;
  try {
    itens = d.itens.map((e) => {
      const p = porId.get(e.produtoId);
      if (!p || !p.ativo) throw new ErroPedido('Um produto do pedido não está mais no cardápio. Tire ele e tente de novo.');
      const pp: ProdutoPreco = { id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, opcoes: JSON.parse(p.opcoes || '{}') };
      return { ...calcularItem(pp, { ...e, tamanho: e.tamanho ?? null }), categoria: p.categoria };
    });
    if (d.entrega && d.entrega.endereco.length < 5) throw new ErroPedido('Digite o endereço da entrega.');
    t = totais(itens, d.desconto ?? null, d.entrega?.taxa || 0);
    troco = conferirPagamentos(t.total, d.pagamentos.map((p) => ({ forma: p.forma, valor: Math.round(p.valor) }))).troco;
  } catch (e) {
    if (e instanceof ErroPedido) throw erro(400, 'pedido_invalido', e.message);
    throw e;
  }
  const formasAtivas: string[] = JSON.parse(emp.formas_pagamento);
  if (d.pagamentos.some((p) => !formasAtivas.includes(p.forma))) throw erro(400, 'pedido_invalido', 'Esta forma de pagamento está desligada nas configurações.');
  if (t.desconto > 0 && !pode(u.papel, 'descontoLivre') && pctDesconto(t.subtotal, t.desconto) > emp.desconto_max_caixa + 1e-9) {
    throw erro(403, 'desconto_alto', `O caixa pode dar até ${emp.desconto_max_caixa}% de desconto. Peça a um gerente.`);
  }

  const id = novoId(), quando = agora();
  const receitas: Record<string, { item_id: string; qtd: number }[]> = {};
  for (const p of prods) receitas[p.id] = JSON.parse(p.receita || '[]');
  const baixa = baixaEstoque(itens, receitas);
  const lote: D1Prepared[] = [
    // Número sequencial da lanchonete, tirado e somado na mesma transação.
    db.prepare(`INSERT INTO vendas (id, empresa_id, numero, chave, caixa_id, usuario_id, cliente_id, observacao, subtotal, desconto, total, troco, tipo, endereco_entrega, taxa_entrega, andamento, token_cliente, token_entregador, criado_em)
      VALUES (?, ?, (SELECT proximo_numero FROM empresas WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparando', ?, ?, ?)`)
      .bind(id, emp.id, emp.id, d.chave, cx.id, u.id, d.clienteId || null, (d.observacao || '').trim() || null, t.subtotal, t.desconto, t.total, troco,
        d.entrega ? 'entrega' : 'balcao', d.entrega?.endereco || null, t.taxaEntrega, aleatorio(18), aleatorio(18), quando),
    db.prepare('UPDATE empresas SET proximo_numero = proximo_numero + 1 WHERE id = ?').bind(emp.id),
    ...itens.map((i) => db.prepare('INSERT INTO venda_itens (id, venda_id, produto_id, nome, categoria, qtd, preco_unit, custo_unit, detalhes, total) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(novoId(), id, i.produtoId, i.nome, i.categoria, i.qtd, i.precoUnit, i.custoUnit, JSON.stringify(i.detalhes), i.total)),
    ...d.pagamentos.map((p) => db.prepare('INSERT INTO pagamentos (id, venda_id, forma, valor) VALUES (?,?,?,?)').bind(novoId(), id, p.forma, Math.round(p.valor))),
    ...Object.entries(baixa).flatMap(([item, q]) => [
      db.prepare('UPDATE estoque_itens SET qtd = ROUND(qtd - ?, 3), ultima_saida = ? WHERE id = ? AND empresa_id = ?').bind(q, quando, item, emp.id),
      db.prepare("INSERT INTO estoque_movimentos (id, empresa_id, item_id, tipo, qtd, ref, usuario_id, criado_em) VALUES (?,?,?,'venda',?,?,?,?)").bind(novoId(), emp.id, item, -q, id, u.id, quando),
    ]),
  ];
  try {
    await db.batch(lote);
  } catch (e) {
    // Dois envios iguais ao mesmo tempo: o segundo bate na chave única e devolve a venda do primeiro.
    const outra = await db.prepare('SELECT id FROM vendas WHERE empresa_id = ? AND chave = ?').bind(emp.id, d.chave).first<{ id: string }>();
    if (outra) return { id: outra.id, repetida: true };
    throw e;
  }
  return { id, repetida: false };
}

vendas.get('/vendas', async (c) => {
  exigir(c, 'verPedidos');
  const q = c.req.query();
  const de = q.de || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const ate = q.ate || new Date().toISOString().slice(0, 10);
  const [ini, fim] = intervalo(de, ate, Number(q.fuso || 180));
  const filtros = ['v.empresa_id = ?', 'v.criado_em >= ?', 'v.criado_em < ?'];
  const vals: unknown[] = [c.get('empresa').id, ini, fim];
  if (q.status === 'concluida' || q.status === 'cancelada') { filtros.push('v.status = ?'); vals.push(q.status); }
  if (q.busca) { filtros.push("(CAST(v.numero AS TEXT) LIKE ? OR cl.nome LIKE ?)"); vals.push(`%${q.busca}%`, `%${q.busca}%`); }
  const { results } = await c.env.BANCO.prepare(`SELECT v.id, v.numero, v.total, v.status, v.tipo, v.criado_em, u.nome AS operador, cl.nome AS cliente,
      (SELECT SUM(qtd) FROM venda_itens WHERE venda_id = v.id) AS itens,
      (SELECT GROUP_CONCAT(forma) FROM pagamentos WHERE venda_id = v.id) AS formas
    FROM vendas v LEFT JOIN usuarios u ON u.id = v.usuario_id LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE ${filtros.join(' AND ')} ORDER BY v.criado_em DESC LIMIT 300`).bind(...vals).all();
  return c.json({ vendas: results });
});
vendas.get('/vendas/:id', async (c) => {
  exigir(c, 'verPedidos');
  const v = await vendaCompleta(c, c.req.param('id'));
  if (!v) throw erro(404, 'nao_encontrado', 'Venda não encontrada.');
  return c.json({ venda: v });
});
vendas.post('/vendas/:id/cancelar', async (c) => {
  exigir(c, 'cancelarVenda');
  const d = validar(z.object({ motivo: z.string().trim().min(5, 'Escreva o motivo (pelo menos 5 letras).').max(200) }), await corpo(c));
  const db = c.env.BANCO, emp = c.get('empresa').id, id = c.req.param('id'), quando = agora();
  const v = await db.prepare('SELECT status, numero FROM vendas WHERE id = ? AND empresa_id = ?').bind(id, emp).first<{ status: string; numero: number }>();
  if (!v) throw erro(404, 'nao_encontrado', 'Venda não encontrada.');
  if (v.status === 'cancelada') throw erro(409, 'ja_cancelada', 'Esta venda já foi cancelada.');
  // Devolve ao estoque o que a venda tirou.
  const { results: movs } = await db.prepare("SELECT item_id, qtd FROM estoque_movimentos WHERE ref = ? AND tipo = 'venda' AND empresa_id = ?").bind(id, emp).all<{ item_id: string; qtd: number }>();
  await db.batch([
    db.prepare("UPDATE vendas SET status = 'cancelada', cancelada_em = ?, cancelada_por = ?, motivo_cancelamento = ? WHERE id = ? AND empresa_id = ? AND status = 'concluida'").bind(quando, c.get('usuario').id, d.motivo, id, emp),
    ...movs.flatMap((m) => [
      db.prepare('UPDATE estoque_itens SET qtd = ROUND(qtd + ?, 3) WHERE id = ? AND empresa_id = ?').bind(-m.qtd, m.item_id, emp),
      db.prepare("INSERT INTO estoque_movimentos (id, empresa_id, item_id, tipo, qtd, ref, motivo, usuario_id, criado_em) VALUES (?,?,?,'cancelamento',?,?,?,?,?)").bind(novoId(), emp, m.item_id, -m.qtd, id, d.motivo, c.get('usuario').id, quando),
    ]),
    auditar(c, 'venda_cancelada', { id, numero: v.numero, motivo: d.motivo }),
  ]);
  return c.json({ ok: true, venda: await vendaCompleta(c, id) });
});
