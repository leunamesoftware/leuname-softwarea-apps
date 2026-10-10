// Cadastros: categorias, produtos (com fotos e personalização), estoque e clientes.
import { Hono } from 'hono';
import { z } from 'zod';
import { pode, type Acao } from '../regras/permissoes';
import { agora, auditar, corpo, erro, novoId, type C, type Env, type Vars } from './base';

export const cadastros = new Hono<{ Bindings: Env; Variables: Vars }>();

export function exigir(c: C, acao: Acao) {
  if (!pode(c.get('usuario').papel, acao)) throw erro(403, 'sem_permissao', 'Seu usuário não tem permissão para isso.');
}
/** Valida com zod e devolve erros por campo em português. */
export function validar<S extends z.ZodTypeAny>(esquema: S, dados: unknown): z.output<S> {
  const r = esquema.safeParse(dados);
  if (r.success) return r.data as z.output<S>;
  const campos: Record<string, string> = {};
  for (const i of r.error.issues) campos[i.path.join('.') || 'geral'] ||= i.message;
  throw erro(400, 'dados_invalidos', 'Confira os campos destacados.', campos);
}
const texto = (max: number, msg = 'Preencha este campo.') => z.string({ required_error: msg, invalid_type_error: msg }).trim().min(1, msg).max(max, `Use até ${max} letras.`);
const opcional = (max: number) => z.string().trim().max(max, `Use até ${max} letras.`).optional().nullable().transform((v) => v || null);
const centavos = (msg = 'Valor inválido.') => z.number({ invalid_type_error: msg }).int(msg).min(0, 'Não pode ser negativo.').max(10_000_000, 'Valor alto demais.');

// ---------- categorias ----------
const esqCategoria = z.object({ nome: texto(40, 'Digite o nome da categoria.'), icone: z.enum(['hamburguer', 'porcao', 'bebida', 'combo', 'sobremesa', 'acai', 'outro']).default('outro'), ordem: z.number().int().min(0).max(999).default(0) });

cadastros.get('/categorias', async (c) => {
  const { results } = await c.env.BANCO.prepare(`SELECT c.*, (SELECT COUNT(*) FROM produtos p WHERE p.categoria_id = c.id AND p.ativo = 1) AS qtd_produtos
    FROM categorias c WHERE c.empresa_id = ? AND c.ativo = 1 ORDER BY c.ordem, c.nome`).bind(c.get('empresa').id).all();
  return c.json({ categorias: results });
});
cadastros.post('/categorias', async (c) => {
  exigir(c, 'produtos');
  const d = validar(esqCategoria, await corpo(c));
  const id = novoId();
  await c.env.BANCO.prepare('INSERT INTO categorias (id, empresa_id, nome, icone, ordem) VALUES (?,?,?,?,?)').bind(id, c.get('empresa').id, d.nome, d.icone, d.ordem).run();
  return c.json({ ok: true, id }, 201);
});
cadastros.put('/categorias/:id', async (c) => {
  exigir(c, 'produtos');
  const d = validar(esqCategoria, await corpo(c));
  const r = await c.env.BANCO.prepare('UPDATE categorias SET nome = ?, icone = ?, ordem = ? WHERE id = ? AND empresa_id = ?').bind(d.nome, d.icone, d.ordem, c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(404, 'nao_encontrado', 'Categoria não encontrada.');
  return c.json({ ok: true });
});
cadastros.delete('/categorias/:id', async (c) => {
  exigir(c, 'produtos');
  const emp = c.get('empresa').id, id = c.req.param('id');
  const em = await c.env.BANCO.prepare('SELECT COUNT(*) AS n FROM produtos WHERE categoria_id = ? AND empresa_id = ? AND ativo = 1').bind(id, emp).first<{ n: number }>();
  if (em && em.n > 0) throw erro(409, 'categoria_em_uso', `Esta categoria tem ${em.n} produto(s). Mude os produtos de categoria antes.`);
  await c.env.BANCO.prepare('UPDATE categorias SET ativo = 0 WHERE id = ? AND empresa_id = ?').bind(id, emp).run();
  return c.json({ ok: true });
});

// ---------- fotos (guardadas no banco, separadas da lista de produtos) ----------
cadastros.post('/fotos', async (c) => {
  exigir(c, 'produtos');
  const d = await corpo<{ dados?: string }>(c);
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(d.dados || ''));
  if (!m) throw erro(400, 'foto_invalida', 'Envie uma foto JPG, PNG ou WEBP.');
  const bytes = Uint8Array.from(atob(m[3]), (x) => x.charCodeAt(0));
  if (bytes.length > 400_000) throw erro(413, 'foto_grande', 'Foto grande demais.');
  const id = novoId();
  await c.env.BANCO.prepare('INSERT INTO fotos (id, empresa_id, tipo, dados) VALUES (?,?,?,?)').bind(id, c.get('empresa').id, m[1], bytes).run();
  return c.json({ ok: true, id }, 201);
});
export async function servirFoto(c: C) {
  const f = await c.env.BANCO.prepare('SELECT tipo, dados FROM fotos WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), c.get('empresa').id).first<{ tipo: string; dados: ArrayBuffer | number[] }>();
  if (!f) throw erro(404, 'nao_encontrado', 'Foto não encontrada.');
  const corpoFoto = f.dados instanceof ArrayBuffer ? f.dados : new Uint8Array(f.dados as number[]);
  return new Response(corpoFoto, { headers: { 'Content-Type': f.tipo, 'Cache-Control': 'private, max-age=31536000, immutable' } });
}
cadastros.get('/fotos/:id', servirFoto);

// ---------- produtos ----------
const esqOpcoes = z.object({
  tamanhos: z.array(z.object({ nome: texto(30), preco: centavos() })).max(6).default([]),
  adicionais: z.array(z.object({ nome: texto(40), preco: centavos() })).max(30).default([]),
  grupos: z.array(z.object({
    nome: texto(40, 'Digite o nome do grupo.'), min: z.number().int().min(0).max(30).default(0), max: z.number().int().min(1).max(30).default(1), repetir: z.boolean().default(false),
    itens: z.array(z.object({ nome: texto(40), preco: centavos().default(0) })).min(1, 'Coloque pelo menos 1 opção no grupo.').max(40),
  }).refine((g) => g.max >= g.min, 'O máximo precisa ser maior ou igual ao mínimo.')).max(10).optional(),
  retirar: z.array(texto(40)).max(20).default([]),
}).default({});
const esqProduto = z.object({
  nome: texto(60, 'Digite o nome do produto.'),
  descricao: opcional(200),
  codigo: opcional(30),
  categoria_id: z.string().min(1, 'Escolha a categoria.'),
  preco: centavos('Digite o preço de venda.'),
  custo: centavos().default(0),
  foto_id: z.string().optional().nullable(),
  opcoes: esqOpcoes,
  receita: z.array(z.object({ item_id: z.string().min(1), qtd: z.number().positive('Quantidade inválida.').max(9999) })).max(30).default([]),
  ativo: z.boolean().default(true),
});

const lerProduto = (p: Record<string, unknown>) => ({ ...p, opcoes: JSON.parse(String(p.opcoes || '{}')), receita: JSON.parse(String(p.receita || '[]')), ativo: Boolean(p.ativo) });

cadastros.get('/produtos', async (c) => {
  const { results } = await c.env.BANCO.prepare(`SELECT p.*, c.nome AS categoria, c.icone AS categoria_icone FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.empresa_id = ? ORDER BY c.ordem, c.nome, p.nome`).bind(c.get('empresa').id).all();
  return c.json({ produtos: results.map(lerProduto) });
});

async function conferirReferencias(c: C, d: z.output<typeof esqProduto>) {
  const emp = c.get('empresa').id, db = c.env.BANCO;
  if (!(await db.prepare('SELECT 1 FROM categorias WHERE id = ? AND empresa_id = ? AND ativo = 1').bind(d.categoria_id, emp).first())) throw erro(400, 'dados_invalidos', 'Categoria inválida.', { categoria_id: 'Escolha a categoria.' });
  for (const r of d.receita) if (!(await db.prepare('SELECT 1 FROM estoque_itens WHERE id = ? AND empresa_id = ?').bind(r.item_id, emp).first())) throw erro(400, 'dados_invalidos', 'Item de estoque inválido na baixa.');
  if (d.foto_id && !(await db.prepare('SELECT 1 FROM fotos WHERE id = ? AND empresa_id = ?').bind(d.foto_id, emp).first())) throw erro(400, 'dados_invalidos', 'Foto inválida.');
  if (d.codigo && (await db.prepare('SELECT 1 FROM produtos WHERE codigo = ? AND empresa_id = ? AND ativo = 1').bind(d.codigo, emp).first())) return 'codigo';
  return '';
}

cadastros.post('/produtos', async (c) => {
  exigir(c, 'produtos');
  const d = validar(esqProduto, await corpo(c));
  if ((await conferirReferencias(c, d)) === 'codigo') throw erro(409, 'codigo_repetido', 'Já existe um produto com este código.', { codigo: 'Código já usado.' });
  const id = novoId();
  await c.env.BANCO.batch([
    c.env.BANCO.prepare(`INSERT INTO produtos (id, empresa_id, categoria_id, nome, descricao, codigo, preco, custo, foto_id, opcoes, receita, ativo, criado_em)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, c.get('empresa').id, d.categoria_id, d.nome, d.descricao, d.codigo, d.preco, d.custo, d.foto_id || null, JSON.stringify(d.opcoes), JSON.stringify(d.receita), d.ativo ? 1 : 0, agora()),
    auditar(c, 'produto_criado', { id, nome: d.nome, preco: d.preco }),
  ]);
  return c.json({ ok: true, id }, 201);
});
cadastros.put('/produtos/:id', async (c) => {
  exigir(c, 'produtos');
  const d = validar(esqProduto, await corpo(c));
  const emp = c.get('empresa').id, id = c.req.param('id');
  const antes = await c.env.BANCO.prepare('SELECT codigo, preco FROM produtos WHERE id = ? AND empresa_id = ?').bind(id, emp).first<{ codigo: string | null; preco: number }>();
  if (!antes) throw erro(404, 'nao_encontrado', 'Produto não encontrado.');
  if ((await conferirReferencias(c, d)) === 'codigo' && d.codigo !== antes.codigo) throw erro(409, 'codigo_repetido', 'Já existe um produto com este código.', { codigo: 'Código já usado.' });
  await c.env.BANCO.batch([
    c.env.BANCO.prepare(`UPDATE produtos SET categoria_id=?, nome=?, descricao=?, codigo=?, preco=?, custo=?, foto_id=?, opcoes=?, receita=?, ativo=? WHERE id=? AND empresa_id=?`)
      .bind(d.categoria_id, d.nome, d.descricao, d.codigo, d.preco, d.custo, d.foto_id || null, JSON.stringify(d.opcoes), JSON.stringify(d.receita), d.ativo ? 1 : 0, id, emp),
    auditar(c, 'produto_alterado', { id, nome: d.nome, preco_antes: antes.preco, preco: d.preco }),
  ]);
  return c.json({ ok: true });
});
cadastros.delete('/produtos/:id', async (c) => {
  exigir(c, 'produtos');
  // Produto sai do cardápio mas fica no histórico das vendas.
  const r = await c.env.BANCO.prepare('UPDATE produtos SET ativo = 0, codigo = NULL WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(404, 'nao_encontrado', 'Produto não encontrado.');
  return c.json({ ok: true });
});

// ---------- estoque ----------
const esqItem = z.object({
  nome: texto(60, 'Digite o nome do item.'), categoria: opcional(30),
  unidade: z.enum(['un', 'kg', 'l']), minimo: z.number().min(0).max(999999), custo: centavos().default(0),
});
cadastros.get('/estoque', async (c) => {
  exigir(c, 'estoque');
  const { results } = await c.env.BANCO.prepare('SELECT * FROM estoque_itens WHERE empresa_id = ? AND ativo = 1 ORDER BY nome').bind(c.get('empresa').id).all();
  return c.json({ itens: results });
});
cadastros.post('/estoque', async (c) => {
  exigir(c, 'estoque');
  const d = validar(esqItem.extend({ qtd: z.number().min(0).max(999999).default(0) }), await corpo(c));
  const id = novoId(), emp = c.get('empresa').id, db = c.env.BANCO;
  const lote = [db.prepare('INSERT INTO estoque_itens (id, empresa_id, nome, categoria, unidade, qtd, minimo, custo, ultima_entrada) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id, emp, d.nome, d.categoria, d.unidade, d.qtd, d.minimo, d.custo, d.qtd ? agora() : null)];
  if (d.qtd) lote.push(db.prepare("INSERT INTO estoque_movimentos (id, empresa_id, item_id, tipo, qtd, custo, motivo, usuario_id, criado_em) VALUES (?,?,?,'entrada',?,?,'Estoque inicial',?,?)").bind(novoId(), emp, id, d.qtd, d.custo, c.get('usuario').id, agora()));
  await db.batch(lote);
  return c.json({ ok: true, id }, 201);
});
cadastros.put('/estoque/:id', async (c) => {
  exigir(c, 'estoque');
  const d = validar(esqItem, await corpo(c));
  const r = await c.env.BANCO.prepare('UPDATE estoque_itens SET nome=?, categoria=?, unidade=?, minimo=?, custo=? WHERE id=? AND empresa_id=?').bind(d.nome, d.categoria, d.unidade, d.minimo, d.custo, c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(404, 'nao_encontrado', 'Item não encontrado.');
  return c.json({ ok: true });
});
cadastros.delete('/estoque/:id', async (c) => {
  exigir(c, 'estoque');
  await c.env.BANCO.prepare('UPDATE estoque_itens SET ativo = 0 WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), c.get('empresa').id).run();
  return c.json({ ok: true });
});
/** Entrada (compra), perda ou acerto de contagem. */
cadastros.post('/estoque/:id/movimento', async (c) => {
  exigir(c, 'estoque');
  const d = validar(z.object({
    tipo: z.enum(['entrada', 'perda', 'ajuste']),
    qtd: z.number({ invalid_type_error: 'Digite a quantidade.' }).min(0, 'Não pode ser negativo.').max(999999),
    custo: centavos().optional(),
    motivo: opcional(120),
  }), await corpo(c));
  const emp = c.get('empresa').id, db = c.env.BANCO, id = c.req.param('id');
  const item = await db.prepare('SELECT qtd FROM estoque_itens WHERE id = ? AND empresa_id = ? AND ativo = 1').bind(id, emp).first<{ qtd: number }>();
  if (!item) throw erro(404, 'nao_encontrado', 'Item não encontrado.');
  if (d.tipo !== 'ajuste' && d.qtd <= 0) throw erro(400, 'dados_invalidos', 'Digite a quantidade.', { qtd: 'Digite a quantidade.' });
  if (d.tipo === 'perda' && !d.motivo) throw erro(400, 'dados_invalidos', 'Diga o motivo da perda.', { motivo: 'Diga o motivo.' });
  const variacao = d.tipo === 'entrada' ? d.qtd : d.tipo === 'perda' ? -d.qtd : Math.round((d.qtd - item.qtd) * 1000) / 1000;
  if (d.tipo === 'ajuste' && variacao === 0) return c.json({ ok: true, semMudanca: true });
  const quando = agora();
  await db.batch([
    db.prepare(`UPDATE estoque_itens SET qtd = ROUND(qtd + ?, 3)${d.tipo === 'entrada' ? ', ultima_entrada = ?' : ', ultima_saida = ?'}${d.tipo === 'entrada' && d.custo ? ', custo = ?' : ''} WHERE id = ? AND empresa_id = ?`)
      .bind(...[variacao, quando, ...(d.tipo === 'entrada' && d.custo ? [d.custo] : []), id, emp]),
    db.prepare('INSERT INTO estoque_movimentos (id, empresa_id, item_id, tipo, qtd, custo, motivo, usuario_id, criado_em) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(novoId(), emp, id, d.tipo, variacao, d.custo ?? null, d.motivo, c.get('usuario').id, quando),
  ]);
  return c.json({ ok: true });
});
cadastros.get('/estoque/:id/movimentos', async (c) => {
  exigir(c, 'estoque');
  const { results } = await c.env.BANCO.prepare(`SELECT m.*, u.nome AS usuario FROM estoque_movimentos m LEFT JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.item_id = ? AND m.empresa_id = ? ORDER BY m.criado_em DESC LIMIT 100`).bind(c.req.param('id'), c.get('empresa').id).all();
  return c.json({ movimentos: results });
});

// ---------- clientes ----------
const esqCliente = z.object({ nome: texto(80, 'Digite o nome do cliente.'), telefone: opcional(20), cpf: opcional(14), endereco: opcional(150), observacao: opcional(200) });
cadastros.get('/clientes', async (c) => {
  exigir(c, 'clientes');
  const { results } = await c.env.BANCO.prepare(`SELECT cl.*, COUNT(v.id) AS pedidos, COALESCE(SUM(v.total),0) AS gasto, MAX(v.criado_em) AS ultimo_pedido
    FROM clientes cl LEFT JOIN vendas v ON v.cliente_id = cl.id AND v.status = 'concluida'
    WHERE cl.empresa_id = ? GROUP BY cl.id ORDER BY cl.nome`).bind(c.get('empresa').id).all();
  return c.json({ clientes: results });
});
cadastros.post('/clientes', async (c) => {
  exigir(c, 'clientes');
  const d = validar(esqCliente, await corpo(c));
  const id = novoId();
  await c.env.BANCO.prepare('INSERT INTO clientes (id, empresa_id, nome, telefone, cpf, endereco, observacao, criado_em) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, c.get('empresa').id, d.nome, d.telefone, d.cpf, d.endereco, d.observacao, agora()).run();
  return c.json({ ok: true, id }, 201);
});
cadastros.put('/clientes/:id', async (c) => {
  exigir(c, 'clientes');
  const d = validar(esqCliente, await corpo(c));
  const r = await c.env.BANCO.prepare('UPDATE clientes SET nome=?, telefone=?, cpf=?, endereco=?, observacao=? WHERE id=? AND empresa_id=?')
    .bind(d.nome, d.telefone, d.cpf, d.endereco, d.observacao, c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(404, 'nao_encontrado', 'Cliente não encontrado.');
  return c.json({ ok: true });
});
