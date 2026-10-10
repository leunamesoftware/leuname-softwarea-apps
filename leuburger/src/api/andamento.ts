// Andamento dos pedidos: painel da loja, link do entregador e página de acompanhamento do cliente.
// Os links do cliente e do entregador não pedem login: valem pelo código longo e secreto de cada pedido
// (o do cliente só mostra; o do entregador só marca "saí" e "entreguei").
import { Hono } from 'hono';
import { z } from 'zod';
import { agora, corpo, erro, janelaCancelarMs, novoId, type C, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';

export const ANDAMENTOS = ['preparando', 'pronto', 'a_caminho', 'entregue', 'retirado'] as const;
type Andamento = (typeof ANDAMENTOS)[number];
const FINAIS = ['entregue', 'retirado'];
/** Passos que valem para cada tipo de pedido. */
const PASSOS: Record<string, Andamento[]> = { entrega: ['preparando', 'pronto', 'a_caminho', 'entregue'], balcao: ['preparando', 'pronto', 'retirado'] };

/** Grava o novo passo com o horário (o painel e o cliente mostram quando aconteceu). */
export async function mudarAndamento(c: C, v: { id: string; tipo: string; andamento: string }, novo: Andamento, entregador?: string | null, codigo?: string | null) {
  if (novo === 'entregue') {
    // Pedido do app: só fecha com o código de entrega que o cliente passa (protege a loja, o entregador e o cliente).
    const r = await c.env.BANCO.prepare('SELECT codigo_entrega FROM vendas WHERE id = ?').bind(v.id).first<{ codigo_entrega: string | null }>();
    if (r?.codigo_entrega) {
      const chave = `cod|${v.id}`, db = c.env.BANCO;
      const t = await db.prepare('SELECT qtd FROM tentativas WHERE chave = ?').bind(chave).first<{ qtd: number }>();
      if ((t?.qtd ?? 0) >= 8) throw erro(429, 'muitas_tentativas', 'Código errado muitas vezes. Fale com a loja.');
      if (String(codigo || '').replace(/\D/g, '') !== r.codigo_entrega) {
        await db.prepare('INSERT INTO tentativas (chave, qtd, desde) VALUES (?, 1, ?) ON CONFLICT(chave) DO UPDATE SET qtd = qtd + 1').bind(chave, agora()).run();
        throw erro(400, 'codigo_errado', codigo ? 'Código errado. Peça de novo ao cliente (está no app dele, na tela do pedido).' : 'Peça ao cliente o código de entrega (4 números) e digite aqui.', { codigo: 'Código errado.' });
      }
    }
  }
  if (!PASSOS[v.tipo]?.includes(novo)) throw erro(400, 'andamento_invalido', 'Este passo não vale para este pedido.');
  if (novo === 'pronto') {
    // Pedido do app: a loja só marca "pronto" depois do prazo de cancelamento do cliente (a loja de demonstração não espera).
    const o = await c.env.BANCO.prepare("SELECT o.criado_em, e.conta_email FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id WHERE o.venda_id = ?").bind(v.id).first<{ criado_em: string; conta_email: string }>();
    const falta = o && !/^demo-.*@leupede\.demo$/.test(o.conta_email) ? new Date(o.criado_em).getTime() + janelaCancelarMs(c.env) - Date.now() : 0;
    if (falta > 0) throw erro(409, 'aguarde_cancelamento', `O cliente ainda pode cancelar (faltam ${Math.floor(falta / 60e3)}:${String(Math.ceil((falta % 60e3) / 1e3) % 60).padStart(2, '0')}). Espere para marcar como pronto.`);
  }
  const q = agora();
  const campo = novo === 'pronto' ? 'pronto_em' : novo === 'a_caminho' ? 'saiu_em' : FINAIS.includes(novo) ? 'finalizado_em' : null;
  await c.env.BANCO.prepare(`UPDATE vendas SET andamento = ?${campo ? `, ${campo} = COALESCE(${campo}, ?)` : ''}${entregador !== undefined ? ', entregador = ?' : ''} WHERE id = ? AND status = 'concluida'`)
    .bind(...[novo, ...(campo ? [q] : []), ...(entregador !== undefined ? [entregador] : []), v.id]).run();
}

export const andamento = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Pedidos abertos e os finalizados nas últimas 3 horas. */
andamento.get('/andamento', async (c) => {
  exigir(c, 'vender');
  const desde = new Date(Date.now() - 864e5).toISOString(), recentes = new Date(Date.now() - 3 * 3600e3).toISOString();
  const { results } = await c.env.BANCO.prepare(`SELECT v.id, v.numero, v.tipo, v.andamento, v.total, v.troco, v.criado_em, v.pronto_em, v.saiu_em, v.finalizado_em, v.entregador, v.entregador_id,
      v.endereco_entrega, v.observacao, v.token_cliente, v.token_entregador, cl.nome AS cliente, cl.telefone AS cliente_telefone,
      (SELECT GROUP_CONCAT(i.qtd || 'x ' || i.nome, ' · ') FROM venda_itens i WHERE i.venda_id = v.id) AS resumo,
      (SELECT GROUP_CONCAT(forma) FROM pagamentos WHERE venda_id = v.id) AS formas,
      (SELECT po.criado_em FROM pedidos_online po WHERE po.venda_id = v.id) AS app_criado_em, (v.codigo_entrega IS NOT NULL) AS pede_codigo
    FROM vendas v LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.token_cliente IS NOT NULL
      AND (v.andamento NOT IN ('entregue','retirado') OR v.finalizado_em >= ?)
    ORDER BY v.criado_em`).bind(c.get('empresa').id, desde, recentes).all();
  const prazo = janelaCancelarMs(c.env);
  const comEntregador = results.filter((r) => r.entregador_id).map((r) => String(r.id));
  const { results: msgs } = comEntregador.length ? await c.env.BANCO.prepare(`SELECT venda_id, de, texto, criado_em FROM mensagens_loja WHERE venda_id IN (${comEntregador.map(() => '?').join(',')}) ORDER BY criado_em`).bind(...comEntregador).all<{ venda_id: string; de: string; texto: string; criado_em: string }>() : { results: [] as { venda_id: string; de: string; texto: string; criado_em: string }[] };
  return c.json({ pedidos: results.map((r) => {
    const ate = r.app_criado_em ? new Date(String(r.app_criado_em)).getTime() + prazo : 0;
    return { ...r, app_cancelar_ate: ate > Date.now() && r.andamento === 'preparando' ? new Date(ate).toISOString() : null, conversa_entregador: msgs.filter((m) => m.venda_id === r.id).slice(-40) };
  }) });
});

/** Loja conversa com o entregador da entrega (livre, sem telefone). */
andamento.post('/vendas/:id/mensagem-entregador', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ texto: z.string().trim().min(1, 'Escreva a mensagem.').max(300) }), await corpo(c));
  const db = c.env.BANCO;
  const v = await db.prepare("SELECT id FROM vendas WHERE id = ? AND empresa_id = ? AND status = 'concluida' AND entregador_id IS NOT NULL").bind(c.req.param('id'), c.get('empresa').id).first<{ id: string }>();
  if (!v) throw erro(404, 'nao_encontrado', 'Este pedido não tem entregador do app.');
  const n = await db.prepare("SELECT COUNT(*) AS n FROM mensagens_loja WHERE venda_id = ? AND de = 'loja'").bind(v.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= 150) throw erro(429, 'muitas_mensagens', 'Muitas mensagens neste pedido.');
  await db.prepare("INSERT INTO mensagens_loja (id, venda_id, de, texto, criado_em) VALUES (?,?,'loja',?,?)").bind(novoId(), v.id, d.texto, agora()).run();
  return c.json({ ok: true });
});

andamento.post('/vendas/:id/andamento', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ andamento: z.enum(ANDAMENTOS), entregador: z.string().trim().max(40).nullable().optional(), codigo: z.string().max(10).nullable().optional() }), await corpo(c));
  const v = await c.env.BANCO.prepare("SELECT id, tipo, andamento FROM vendas WHERE id = ? AND empresa_id = ? AND status = 'concluida'").bind(c.req.param('id'), c.get('empresa').id).first<{ id: string; tipo: string; andamento: string }>();
  if (!v) throw erro(404, 'nao_encontrado', 'Pedido não encontrado ou cancelado.');
  await mudarAndamento(c, v, d.andamento, d.entregador === undefined ? undefined : d.entregador || null, d.codigo);
  return c.json({ ok: true });
});

// ---------- links sem login ----------
export const publico = new Hono<{ Bindings: Env; Variables: Vars }>();
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

async function pedidoDoToken(c: C, campo: 'token_cliente' | 'token_entregador', token: string) {
  if (!TOKEN.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const v = await c.env.BANCO.prepare(`SELECT v.*, e.nome AS loja, e.telefone AS loja_telefone, cl.nome AS cliente, cl.telefone AS cliente_telefone
    FROM vendas v JOIN empresas e ON e.id = v.empresa_id LEFT JOIN clientes cl ON cl.id = v.cliente_id WHERE v.${campo} = ?`).bind(token).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!v) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const { results: itens } = await c.env.BANCO.prepare('SELECT nome, qtd, detalhes FROM venda_itens WHERE venda_id = ?').bind(v.id).all<{ nome: string; qtd: number; detalhes: string }>();
  return { v, itens: itens.map((i) => ({ nome: i.nome, qtd: i.qtd, detalhes: JSON.parse(i.detalhes || '{}') })) };
}
const comum = (v: Record<string, any>, itens: unknown[]) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  loja: v.loja, loja_telefone: v.loja_telefone, numero: v.numero, tipo: v.tipo, andamento: v.status === 'cancelada' ? 'cancelado' : v.andamento,
  criado_em: v.criado_em, pronto_em: v.pronto_em, saiu_em: v.saiu_em, finalizado_em: v.finalizado_em, entregador: v.entregador, total: v.total, taxa_entrega: v.taxa_entrega, itens,
});

/** Página do cliente: só leitura. */
publico.get('/publico/pedido/:token', async (c) => {
  const { v, itens } = await pedidoDoToken(c, 'token_cliente', c.req.param('token'));
  return c.json({ pedido: comum(v, itens) });
});

/** Página do entregador: endereço, contato e quanto receber. */
publico.get('/publico/entrega/:token', async (c) => {
  const { v, itens } = await pedidoDoToken(c, 'token_entregador', c.req.param('token'));
  const { results: pag } = await c.env.BANCO.prepare('SELECT forma, valor FROM pagamentos WHERE venda_id = ?').bind(v.id).all();
  return c.json({ pedido: { ...comum(v, itens), cliente: v.cliente, cliente_telefone: v.cliente_telefone, endereco: v.endereco_entrega, observacao: v.observacao, troco: v.troco, pagamentos: pag, token_cliente: v.token_cliente } });
});
publico.post('/publico/entrega/:token', async (c) => {
  const d = validar(z.object({ andamento: z.enum(['a_caminho', 'entregue']), entregador: z.string().trim().max(40).optional(), codigo: z.string().max(10).nullable().optional() }), await corpo(c));
  const { v } = await pedidoDoToken(c, 'token_entregador', c.req.param('token'));
  if (v.status !== 'concluida') throw erro(409, 'cancelado', 'Este pedido foi cancelado pela loja.');
  if (v.tipo !== 'entrega') throw erro(400, 'andamento_invalido', 'Este pedido não é de entrega.');
  await mudarAndamento(c, { id: v.id, tipo: v.tipo, andamento: v.andamento }, d.andamento, d.entregador ? d.entregador : undefined, d.codigo);
  return c.json({ ok: true });
});
