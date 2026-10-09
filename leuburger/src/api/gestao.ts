// Painel, relatórios, configurações da lanchonete, usuários e cardápio de exemplo.
import { Hono } from 'hono';
import { z } from 'zod';
import { FORMAS } from '../regras/pedido';
import { PAPEIS, type Papel } from '../regras/permissoes';
import { agora, auditar, corpo, erro, hashSenha, aleatorio, novoId, type C, type D1Prepared, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';
import { intervalo } from './vendas';

export const gestao = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Quem está logado e os dados da lanchonete (o app usa para montar o menu e as permissões). */
gestao.get('/eu', (c) => {
  const u = c.get('usuario'), e = c.get('empresa');
  return c.json({
    usuario: { id: u.id, nome: u.nome, login: u.login, papel: u.papel, dono: Boolean(u.dono) },
    empresa: { id: e.id, nome: e.nome, cnpj: e.cnpj, telefone: e.telefone, endereco: e.endereco, cidade: e.cidade, uf: e.uf, mensagem_cupom: e.mensagem_cupom,
      formas_pagamento: JSON.parse(e.formas_pagamento), desconto_max_caixa: e.desconto_max_caixa, largura_cupom: e.largura_cupom, acesso_ate: e.acesso_ate, criado_em: e.criado_em },
  });
});

// ---------- painel e relatórios ----------
async function resumo(c: C, ini: string, fim: string) {
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const v = await db.prepare(`SELECT COUNT(*) AS pedidos, COALESCE(SUM(total),0) AS faturamento, COALESCE(SUM(desconto),0) AS descontos FROM vendas
    WHERE empresa_id = ? AND status = 'concluida' AND criado_em >= ? AND criado_em < ?`).bind(emp, ini, fim).first<{ pedidos: number; faturamento: number; descontos: number }>();
  const it = await db.prepare(`SELECT COALESCE(SUM(i.qtd),0) AS itens, COALESCE(SUM(i.custo_unit * i.qtd),0) AS custo FROM venda_itens i JOIN vendas v ON v.id = i.venda_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.criado_em < ?`).bind(emp, ini, fim).first<{ itens: number; custo: number }>();
  const pedidos = v?.pedidos || 0, faturamento = v?.faturamento || 0;
  return { pedidos, faturamento, itens: it?.itens || 0, custo: it?.custo || 0, lucro: faturamento - (it?.custo || 0), ticketMedio: pedidos ? Math.round(faturamento / pedidos) : 0, descontos: v?.descontos || 0 };
}
const pctVar = (agora: number, antes: number) => (antes ? Math.round(((agora - antes) / antes) * 1000) / 10 : null);

gestao.get('/inicio', async (c) => {
  const fuso = Number(c.req.query('fuso') || 180), hoje = String(c.req.query('hoje') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje)) throw erro(400, 'datas_invalidas', 'Data inválida.');
  const ontem = new Date(Date.parse(hoje) - 864e5).toISOString().slice(0, 10);
  const [iniH, fimH] = intervalo(hoje, hoje, fuso), [iniO, fimO] = intervalo(ontem, ontem, fuso);
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const h = await resumo(c, iniH, fimH), o = await resumo(c, iniO, fimO);
  // Vendas por hora de hoje (horário local).
  const { results: horas } = await db.prepare(`SELECT CAST(strftime('%H', datetime(criado_em, ?)) AS INTEGER) AS hora, SUM(total) AS total, COUNT(*) AS pedidos FROM vendas
    WHERE empresa_id = ? AND status = 'concluida' AND criado_em >= ? AND criado_em < ? GROUP BY hora ORDER BY hora`).bind(`${-fuso} minutes`, emp, iniH, fimH).all();
  const { results: maisVendidos } = await db.prepare(`SELECT i.produto_id, i.nome, p.foto_id, cat.icone, SUM(i.qtd) AS qtd, SUM(i.total) AS total FROM venda_itens i JOIN vendas v ON v.id = i.venda_id
    LEFT JOIN produtos p ON p.id = i.produto_id LEFT JOIN categorias cat ON cat.id = p.categoria_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.criado_em < ? GROUP BY i.produto_id, i.nome ORDER BY qtd DESC LIMIT 5`).bind(emp, iniH, fimH).all();
  const { results: categorias } = await db.prepare(`SELECT c.id, c.nome, c.icone, (SELECT COUNT(*) FROM produtos p WHERE p.categoria_id = c.id AND p.ativo = 1) AS qtd FROM categorias c
    WHERE c.empresa_id = ? AND c.ativo = 1 ORDER BY c.ordem, c.nome`).bind(emp).all();
  const est = await db.prepare(`SELECT SUM(CASE WHEN qtd <= 0 THEN 1 ELSE 0 END) AS sem, SUM(CASE WHEN qtd > 0 AND qtd <= minimo THEN 1 ELSE 0 END) AS baixo FROM estoque_itens WHERE empresa_id = ? AND ativo = 1`).bind(emp).first<{ sem: number; baixo: number }>();
  return c.json({
    hoje: h, variacao: { faturamento: pctVar(h.faturamento, o.faturamento), pedidos: pctVar(h.pedidos, o.pedidos), ticketMedio: pctVar(h.ticketMedio, o.ticketMedio), lucro: pctVar(h.lucro, o.lucro) },
    horas, maisVendidos, categorias, estoque: { sem: est?.sem || 0, baixo: est?.baixo || 0 },
  });
});

gestao.get('/relatorios', async (c) => {
  exigir(c, 'relatorios');
  const q = c.req.query(), fuso = Number(q.fuso || 180);
  const [ini, fim] = intervalo(String(q.de), String(q.ate), fuso);
  const dias = Math.round((Date.parse(fim) - Date.parse(ini)) / 864e5);
  if (dias > 400) throw erro(400, 'periodo_grande', 'Escolha um período de até 1 ano.');
  const [iniA, fimA] = [new Date(Date.parse(ini) - dias * 864e5).toISOString(), ini];
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const atual = await resumo(c, ini, fim), anterior = await resumo(c, iniA, fimA);
  const { results: porDia } = await db.prepare(`SELECT date(datetime(criado_em, ?)) AS dia, SUM(total) AS total, COUNT(*) AS pedidos FROM vendas
    WHERE empresa_id = ? AND status = 'concluida' AND criado_em >= ? AND criado_em < ? GROUP BY dia ORDER BY dia`).bind(`${-fuso} minutes`, emp, ini, fim).all();
  const { results: porForma } = await db.prepare(`SELECT p.forma, SUM(p.valor) AS valor FROM pagamentos p JOIN vendas v ON v.id = p.venda_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.criado_em < ? GROUP BY p.forma`).bind(emp, ini, fim).all<{ forma: string; valor: number }>();
  const troco = await db.prepare(`SELECT COALESCE(SUM(troco),0) AS t FROM vendas WHERE empresa_id = ? AND status = 'concluida' AND criado_em >= ? AND criado_em < ?`).bind(emp, ini, fim).first<{ t: number }>();
  const formas = porForma.map((f) => ({ ...f, valor: f.forma === 'dinheiro' ? f.valor - (troco?.t || 0) : f.valor })).filter((f) => f.valor > 0);
  const { results: porCategoria } = await db.prepare(`SELECT COALESCE(i.categoria, 'Sem categoria') AS categoria, SUM(i.total) AS total, SUM(i.qtd) AS qtd FROM venda_itens i JOIN vendas v ON v.id = i.venda_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.criado_em < ? GROUP BY categoria ORDER BY total DESC`).bind(emp, ini, fim).all();
  const { results: produtos } = await db.prepare(`SELECT i.nome, p.foto_id, cat.icone, SUM(i.qtd) AS qtd, SUM(i.total) AS total FROM venda_itens i JOIN vendas v ON v.id = i.venda_id
    LEFT JOIN produtos p ON p.id = i.produto_id LEFT JOIN categorias cat ON cat.id = p.categoria_id
    WHERE v.empresa_id = ? AND v.status = 'concluida' AND v.criado_em >= ? AND v.criado_em < ? GROUP BY i.produto_id, i.nome ORDER BY total DESC LIMIT 20`).bind(emp, ini, fim).all();
  const canceladas = await db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM vendas WHERE empresa_id = ? AND status = 'cancelada' AND criado_em >= ? AND criado_em < ?`).bind(emp, ini, fim).first();
  return c.json({ atual, variacao: { faturamento: pctVar(atual.faturamento, anterior.faturamento), pedidos: pctVar(atual.pedidos, anterior.pedidos), ticketMedio: pctVar(atual.ticketMedio, anterior.ticketMedio), itens: pctVar(atual.itens, anterior.itens) },
    porDia, porForma: formas, porCategoria, produtos, canceladas });
});

// ---------- configurações da lanchonete ----------
const esqEmpresa = z.object({
  nome: z.string().trim().min(2, 'Digite o nome da lanchonete.').max(60),
  cnpj: z.string().trim().max(20).optional().nullable(), telefone: z.string().trim().max(20).optional().nullable(),
  endereco: z.string().trim().max(150).optional().nullable(), cidade: z.string().trim().max(60).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(), mensagem_cupom: z.string().trim().max(120).optional().nullable(),
  formas_pagamento: z.array(z.enum(Object.keys(FORMAS) as [keyof typeof FORMAS, ...(keyof typeof FORMAS)[]])).min(1, 'Deixe pelo menos uma forma de pagamento ligada.'),
  desconto_max_caixa: z.number().int().min(0).max(100),
  largura_cupom: z.enum(['58', '80']),
});
gestao.put('/empresa', async (c) => {
  exigir(c, 'configuracoes');
  const d = validar(esqEmpresa, await corpo(c));
  const n = (x?: string | null) => (x && x.trim()) || null;
  await c.env.BANCO.batch([
    c.env.BANCO.prepare('UPDATE empresas SET nome=?, cnpj=?, telefone=?, endereco=?, cidade=?, uf=?, mensagem_cupom=?, formas_pagamento=?, desconto_max_caixa=?, largura_cupom=? WHERE id=?')
      .bind(d.nome, n(d.cnpj), n(d.telefone), n(d.endereco), n(d.cidade), n(d.uf)?.toUpperCase() ?? null, n(d.mensagem_cupom), JSON.stringify(d.formas_pagamento), d.desconto_max_caixa, d.largura_cupom, c.get('empresa').id),
    auditar(c, 'configuracoes', { nome: d.nome }),
  ]);
  return c.json({ ok: true });
});

// ---------- usuários ----------
gestao.get('/usuarios', async (c) => {
  exigir(c, 'usuarios');
  const { results } = await c.env.BANCO.prepare('SELECT id, nome, login, papel, dono, ativo, criado_em FROM usuarios WHERE empresa_id = ? ORDER BY dono DESC, nome').bind(c.get('empresa').id).all();
  return c.json({ usuarios: results, papeis: PAPEIS });
});
const esqLogin = z.string().trim().toLowerCase().min(3, 'Use pelo menos 3 letras.').max(80).regex(/^[a-z0-9._@-]+$/, 'Use só letras, números, ponto, traço e @ (sem espaço).');
const esqSenha = z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100);
gestao.post('/usuarios', async (c) => {
  exigir(c, 'usuarios');
  const d = validar(z.object({ nome: z.string().trim().min(2, 'Digite o nome.').max(60), login: esqLogin, senha: esqSenha, papel: z.enum(['admin', 'gerente', 'caixa']) }), await corpo(c));
  if (await c.env.BANCO.prepare('SELECT 1 FROM usuarios WHERE login = ?').bind(d.login).first()) throw erro(409, 'login_em_uso', 'Este login já está em uso. Escolha outro.', { login: 'Já está em uso.' });
  const sal = aleatorio(16), id = novoId();
  await c.env.BANCO.batch([
    c.env.BANCO.prepare('INSERT INTO usuarios (id, empresa_id, nome, login, senha_hash, senha_sal, papel, criado_em) VALUES (?,?,?,?,?,?,?,?)').bind(id, c.get('empresa').id, d.nome, d.login, await hashSenha(d.senha, sal), sal, d.papel, agora()),
    auditar(c, 'usuario_criado', { id, login: d.login, papel: d.papel }),
  ]);
  return c.json({ ok: true, id }, 201);
});
gestao.put('/usuarios/:id', async (c) => {
  exigir(c, 'usuarios');
  const d = validar(z.object({ nome: z.string().trim().min(2, 'Digite o nome.').max(60), papel: z.enum(['admin', 'gerente', 'caixa']), ativo: z.boolean(), senha: esqSenha.optional().or(z.literal('')) }), await corpo(c));
  const db = c.env.BANCO, emp = c.get('empresa').id, id = c.req.param('id');
  const u = await db.prepare('SELECT dono FROM usuarios WHERE id = ? AND empresa_id = ?').bind(id, emp).first<{ dono: number }>();
  if (!u) throw erro(404, 'nao_encontrado', 'Usuário não encontrado.');
  if (u.dono && (d.papel !== 'admin' || !d.ativo)) throw erro(400, 'dono', 'O dono da conta é sempre administrador e não pode ser desativado.');
  if (u.dono && d.senha) throw erro(400, 'dono', 'O dono entra com a senha da conta LeuApps (troque na loja).');
  const lote: D1Prepared[] = [db.prepare('UPDATE usuarios SET nome = ?, papel = ?, ativo = ? WHERE id = ? AND empresa_id = ?').bind(d.nome, d.papel as Papel, d.ativo ? 1 : 0, id, emp)];
  if (d.senha) { const sal = aleatorio(16); lote.push(db.prepare('UPDATE usuarios SET senha_hash = ?, senha_sal = ? WHERE id = ? AND empresa_id = ?').bind(await hashSenha(d.senha, sal), sal, id, emp)); }
  if (!d.ativo || d.senha) lote.push(db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(id)); // desativado ou senha nova: sai de todos os aparelhos
  lote.push(auditar(c, 'usuario_alterado', { id, papel: d.papel, ativo: d.ativo, trocouSenha: Boolean(d.senha) }));
  await db.batch(lote);
  return c.json({ ok: true });
});

gestao.get('/auditoria', async (c) => {
  exigir(c, 'usuarios');
  const { results } = await c.env.BANCO.prepare(`SELECT a.acao, a.detalhe, a.criado_em, u.nome AS usuario FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.empresa_id = ? ORDER BY a.criado_em DESC LIMIT 200`).bind(c.get('empresa').id).all();
  return c.json({ registros: results });
});

/** Cópia de segurança: tudo da lanchonete num arquivo (sem senhas). */
gestao.get('/backup', async (c) => {
  exigir(c, 'configuracoes');
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const pegar = async (sql: string) => (await db.prepare(sql).bind(emp).all()).results;
  const dados = {
    app: 'leuburger', versao: 1, gerado_em: agora(), empresa: c.get('empresa'),
    usuarios: await pegar('SELECT id, nome, login, papel, dono, ativo FROM usuarios WHERE empresa_id = ?'),
    categorias: await pegar('SELECT * FROM categorias WHERE empresa_id = ?'),
    produtos: await pegar('SELECT * FROM produtos WHERE empresa_id = ?'),
    estoque: await pegar('SELECT * FROM estoque_itens WHERE empresa_id = ?'),
    clientes: await pegar('SELECT * FROM clientes WHERE empresa_id = ?'),
    vendas: await pegar('SELECT * FROM vendas WHERE empresa_id = ?'),
    venda_itens: await pegar('SELECT i.* FROM venda_itens i JOIN vendas v ON v.id = i.venda_id WHERE v.empresa_id = ?'),
    pagamentos: await pegar('SELECT p.* FROM pagamentos p JOIN vendas v ON v.id = p.venda_id WHERE v.empresa_id = ?'),
    caixas: await pegar('SELECT * FROM caixas WHERE empresa_id = ?'),
  };
  return new Response(JSON.stringify(dados), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="leuburger-backup-${agora().slice(0, 10)}.json"` } });
});

// ---------- cardápio de exemplo (só numa lanchonete sem produtos) ----------
gestao.post('/exemplo', async (c) => {
  exigir(c, 'produtos');
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const tem = await db.prepare('SELECT COUNT(*) AS n FROM produtos WHERE empresa_id = ?').bind(emp).first<{ n: number }>();
  if (tem && tem.n > 0) throw erro(409, 'ja_tem_produtos', 'O cardápio de exemplo só entra numa lanchonete sem produtos.');
  const cat = (nome: string, icone: string, ordem: number) => ({ id: novoId(), nome, icone, ordem });
  const C = { h: cat('Hambúrgueres', 'hamburguer', 1), p: cat('Porções', 'porcao', 2), b: cat('Bebidas', 'bebida', 3), c: cat('Combos', 'combo', 4) };
  const item = (nome: string, categoria: string, unidade: string, qtd: number, minimo: number, custo: number) => ({ id: novoId(), nome, categoria, unidade, qtd, minimo, custo });
  const E = {
    pao: item('Pão de hambúrguer', 'Pães', 'un', 120, 50, 90), carne: item('Carne de hambúrguer', 'Carnes', 'kg', 8, 5, 3800),
    queijo: item('Queijo cheddar', 'Laticínios', 'kg', 4, 2, 4500), bacon: item('Bacon', 'Carnes', 'kg', 3, 2, 4200),
    batata: item('Batata pré-frita', 'Porções', 'kg', 10, 5, 1400), refri: item('Refrigerante lata', 'Bebidas', 'un', 48, 24, 250),
  };
  const adicionais = [{ nome: 'Queijo extra', preco: 300 }, { nome: 'Bacon extra', preco: 400 }, { nome: 'Ovo', preco: 250 }, { nome: 'Cheddar', preco: 300 }];
  const retirar = ['Cebola', 'Tomate', 'Alface', 'Picles'];
  const burger = (nome: string, descricao: string, preco: number, custo: number, extra: { item_id: string; qtd: number }[] = []) => ({
    id: novoId(), cat: C.h.id, nome, descricao, preco, custo,
    opcoes: { tamanhos: [{ nome: 'Padrão', preco }, { nome: 'Duplo', preco: preco + 600 }], adicionais, retirar },
    receita: [{ item_id: E.pao.id, qtd: 1 }, { item_id: E.carne.id, qtd: 0.12 }, ...extra],
  });
  const simples = (cat: string, nome: string, descricao: string, preco: number, custo: number, receita: { item_id: string; qtd: number }[] = []) => ({ id: novoId(), cat, nome, descricao, preco, custo, opcoes: {}, receita });
  const P = [
    burger('X-Burger', 'Pão, hambúrguer, queijo e molho especial.', 1890, 700, [{ item_id: E.queijo.id, qtd: 0.03 }]),
    burger('X-Salada', 'Pão, hambúrguer, queijo, alface, tomate e molho especial.', 1990, 790, [{ item_id: E.queijo.id, qtd: 0.03 }]),
    burger('X-Bacon', 'Pão, hambúrguer, queijo, bacon, alface, tomate e molho especial.', 2290, 850, [{ item_id: E.queijo.id, qtd: 0.03 }, { item_id: E.bacon.id, qtd: 0.04 }]),
    burger('X-Tudo', 'Pão, hambúrguer, queijo, bacon, ovo, presunto, alface, tomate e molho especial.', 2590, 950, [{ item_id: E.queijo.id, qtd: 0.04 }, { item_id: E.bacon.id, qtd: 0.04 }]),
    simples(C.p.id, 'Batata Frita', 'Porção de batata frita crocante.', 1490, 420, [{ item_id: E.batata.id, qtd: 0.25 }]),
    simples(C.p.id, 'Batata com Cheddar', 'Batata frita com cheddar e bacon.', 1890, 620, [{ item_id: E.batata.id, qtd: 0.25 }, { item_id: E.queijo.id, qtd: 0.05 }]),
    simples(C.p.id, 'Onion Rings', 'Anéis de cebola empanados.', 1690, 530),
    simples(C.b.id, 'Refrigerante Lata', 'Lata 350 ml.', 700, 250, [{ item_id: E.refri.id, qtd: 1 }]),
    simples(C.b.id, 'Suco de Laranja', 'Natural, 400 ml.', 800, 300),
    simples(C.b.id, 'Milk-shake', 'Chocolate, morango ou baunilha, 400 ml.', 1690, 500),
    simples(C.c.id, 'Combo X-Bacon', 'X-Bacon + batata frita + refrigerante lata.', 3290, 1400,
      [{ item_id: E.pao.id, qtd: 1 }, { item_id: E.carne.id, qtd: 0.12 }, { item_id: E.bacon.id, qtd: 0.04 }, { item_id: E.batata.id, qtd: 0.2 }, { item_id: E.refri.id, qtd: 1 }]),
  ];
  const q = agora();
  await db.batch([
    ...Object.values(C).map((x) => db.prepare('INSERT INTO categorias (id, empresa_id, nome, icone, ordem) VALUES (?,?,?,?,?)').bind(x.id, emp, x.nome, x.icone, x.ordem)),
    ...Object.values(E).map((x) => db.prepare('INSERT INTO estoque_itens (id, empresa_id, nome, categoria, unidade, qtd, minimo, custo, ultima_entrada) VALUES (?,?,?,?,?,?,?,?,?)').bind(x.id, emp, x.nome, x.categoria, x.unidade, x.qtd, x.minimo, x.custo, q)),
    ...P.map((x) => db.prepare('INSERT INTO produtos (id, empresa_id, categoria_id, nome, descricao, preco, custo, opcoes, receita, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(x.id, emp, x.cat, x.nome, x.descricao, x.preco, x.custo, JSON.stringify(x.opcoes), JSON.stringify(x.receita), q)),
    auditar(c, 'cardapio_exemplo', { produtos: P.length }),
  ]);
  return c.json({ ok: true, produtos: P.length }, 201);
});
