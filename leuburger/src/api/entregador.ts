// Pedêê Entregador: conta própria do entregador (app dele), separada das contas das lojas.
// A loja vincula os entregadores dela pelo e-mail e escolhe quem leva cada entrega; o entregador vê só as entregas dele.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { mudarAndamento } from './andamento';
import { agora, aleatorio, corpo, erro, hashSenha, iguais, novoId, sha256, type C, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';

const COOKIE = 'pe_sessao';
const emailDe = (s: unknown) => String(s ?? '').trim().toLowerCase();
interface Entregador { id: string; nome: string; email: string; veiculo: string; cidade: string | null; disponivel: number; ativo: number }

async function abrirSessaoEntregador(c: C, id: string) {
  const token = aleatorio();
  await c.env.BANCO.prepare('INSERT INTO entregador_sessoes (token_hash, entregador_id, expira_em, criado_em) VALUES (?,?,?,?)')
    .bind(await sha256(token), id, new Date(Date.now() + 60 * 864e5).toISOString(), agora()).run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 86400 });
}
async function entregadorLogado(c: C): Promise<Entregador> {
  const t = getCookie(c, COOKIE);
  if (!t) throw erro(401, 'sem_sessao', 'Entre para continuar.');
  const e = await c.env.BANCO.prepare(`SELECT e.* FROM entregador_sessoes s JOIN entregadores e ON e.id = s.entregador_id WHERE s.token_hash = ? AND s.expira_em > ? AND e.ativo = 1`)
    .bind(await sha256(t), agora()).first<Entregador>();
  if (!e) throw erro(401, 'sem_sessao', 'Sua sessão terminou. Entre de novo.');
  return e;
}
const publico = (e: Entregador) => ({ id: e.id, nome: e.nome, email: e.email, veiculo: e.veiculo, cidade: e.cidade, disponivel: Boolean(e.disponivel) });

// ---------- app do entregador ----------
export const entregador = new Hono<{ Bindings: Env; Variables: Vars }>();

entregador.post('/entregador/cadastrar', async (c) => {
  const d = validar(z.object({
    nome: z.string().trim().min(2, 'Digite o seu nome.').max(60),
    email: z.string().trim().toLowerCase().email('Digite um e-mail válido.').max(120),
    senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100),
    veiculo: z.enum(['moto', 'bike']).default('moto'),
    cidade: z.string().trim().max(60).optional().nullable(),
  }), await corpo(c));
  const db = c.env.BANCO;
  if (await db.prepare('SELECT 1 FROM entregadores WHERE email = ?').bind(d.email).first()) throw erro(409, 'ja_cadastrado', 'Este e-mail já tem cadastro. Toque em "Já tenho cadastro".', { email: 'Já cadastrado.' });
  const id = novoId(), sal = aleatorio(16);
  await db.prepare('INSERT INTO entregadores (id, nome, email, senha_hash, senha_sal, veiculo, cidade, criado_em) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, d.nome, d.email, await hashSenha(d.senha, sal), sal, d.veiculo, d.cidade || null, agora()).run();
  await abrirSessaoEntregador(c, id);
  return c.json({ ok: true }, 201);
});

entregador.post('/entregador/entrar', async (c) => {
  const d = await corpo<{ email?: string; senha?: string }>(c);
  const mail = emailDe(d.email), db = c.env.BANCO;
  if (!mail || !d.senha) throw erro(400, 'dados_invalidos', 'Digite o e-mail e a senha.');
  // Limite de tentativas: 8 a cada 10 minutos por e-mail + rede.
  const chave = `ent|${mail}|${c.req.header('CF-Connecting-IP') || 'local'}`;
  const t = await db.prepare('SELECT qtd, desde FROM tentativas WHERE chave = ?').bind(chave).first<{ qtd: number; desde: string }>();
  const recente = t && Date.now() - new Date(t.desde).getTime() < 6e5;
  if (recente && t!.qtd >= 8) throw erro(429, 'muitas_tentativas', 'Muitas tentativas. Espere 10 minutos.');
  await db.prepare(recente ? 'UPDATE tentativas SET qtd = qtd + 1 WHERE chave = ?' : 'INSERT OR REPLACE INTO tentativas (chave, qtd, desde) VALUES (?, 1, ?)').bind(...(recente ? [chave] : [chave, agora()])).run();
  const e = await db.prepare('SELECT id, senha_hash, senha_sal FROM entregadores WHERE email = ? AND ativo = 1').bind(mail).first<{ id: string; senha_hash: string; senha_sal: string }>();
  if (!e || !iguais(await hashSenha(String(d.senha), e.senha_sal), e.senha_hash)) throw erro(401, 'login_invalido', 'E-mail ou senha não conferem.');
  await abrirSessaoEntregador(c, e.id);
  return c.json({ ok: true });
});

entregador.post('/entregador/sair', async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await c.env.BANCO.prepare('DELETE FROM entregador_sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

entregador.get('/entregador/eu', async (c) => {
  const e = await entregadorLogado(c);
  const { results: lojas } = await c.env.BANCO.prepare('SELECT em.nome, em.cidade FROM loja_entregadores le JOIN empresas em ON em.id = le.empresa_id WHERE le.entregador_id = ? ORDER BY em.nome').bind(e.id).all();
  return c.json({ entregador: publico(e), lojas });
});

entregador.post('/entregador/disponivel', async (c) => {
  const e = await entregadorLogado(c);
  const d = validar(z.object({ disponivel: z.boolean() }), await corpo(c));
  await c.env.BANCO.prepare('UPDATE entregadores SET disponivel = ? WHERE id = ?').bind(d.disponivel ? 1 : 0, e.id).run();
  return c.json({ ok: true });
});

/** Entregas do entregador: as que estão com ele agora e as entregues nas últimas 12 horas. */
entregador.get('/entregador/entregas', async (c) => {
  const e = await entregadorLogado(c);
  const { results } = await c.env.BANCO.prepare(`SELECT v.id, v.numero, v.andamento, v.total, v.troco, v.criado_em, v.saiu_em, v.finalizado_em, v.endereco_entrega, v.observacao,
      em.nome AS loja, em.lat AS loja_lat, em.lng AS loja_lng, em.endereco AS loja_endereco, em.telefone AS loja_telefone, cl.nome AS cliente, cl.telefone AS cliente_telefone,
      (SELECT GROUP_CONCAT(i.qtd || 'x ' || i.nome, ' · ') FROM venda_itens i WHERE i.venda_id = v.id) AS resumo,
      (SELECT GROUP_CONCAT(forma) FROM pagamentos WHERE venda_id = v.id) AS formas,
      (SELECT dest_lat FROM pedidos_online po WHERE po.venda_id = v.id) AS dest_lat, (SELECT dest_lng FROM pedidos_online po WHERE po.venda_id = v.id) AS dest_lng
    FROM vendas v JOIN empresas em ON em.id = v.empresa_id LEFT JOIN clientes cl ON cl.id = v.cliente_id
    WHERE v.entregador_id = ? AND v.status = 'concluida' AND (v.andamento NOT IN ('entregue','retirado') OR v.finalizado_em > ?)
    ORDER BY v.criado_em DESC LIMIT 50`).bind(e.id, new Date(Date.now() - 12 * 3600e3).toISOString()).all();
  return c.json({ entregas: results });
});

/** O app do entregador manda a posição dele; vale para as entregas dele que estão a caminho. */
entregador.post('/entregador/posicao', async (c) => {
  const e = await entregadorLogado(c);
  const d = validar(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }), await corpo(c));
  await c.env.BANCO.prepare("UPDATE vendas SET pos_lat = ?, pos_lng = ?, pos_em = ? WHERE entregador_id = ? AND andamento = 'a_caminho' AND status = 'concluida'")
    .bind(d.lat, d.lng, agora(), e.id).run();
  return c.json({ ok: true });
});

entregador.post('/entregador/entregas/:id', async (c) => {
  const e = await entregadorLogado(c);
  const d = validar(z.object({ andamento: z.enum(['a_caminho', 'entregue']) }), await corpo(c));
  const v = await c.env.BANCO.prepare("SELECT id, tipo, andamento FROM vendas WHERE id = ? AND entregador_id = ? AND status = 'concluida'").bind(c.req.param('id'), e.id).first<{ id: string; tipo: string; andamento: string }>();
  if (!v) throw erro(404, 'nao_encontrado', 'Esta entrega não está com você (ou foi cancelada pela loja).');
  await mudarAndamento(c, v, d.andamento);
  return c.json({ ok: true });
});

// ---------- loja: entregadores da loja ----------
export const entregadoresDaLoja = new Hono<{ Bindings: Env; Variables: Vars }>();

entregadoresDaLoja.get('/entregadores', async (c) => {
  exigir(c, 'vender');
  const { results } = await c.env.BANCO.prepare(`SELECT e.id, e.nome, e.email, e.veiculo, e.disponivel,
      (SELECT COUNT(*) FROM vendas v WHERE v.entregador_id = e.id AND v.empresa_id = le.empresa_id AND v.status = 'concluida' AND v.andamento IN ('preparando','pronto','a_caminho')) AS em_rota
    FROM loja_entregadores le JOIN entregadores e ON e.id = le.entregador_id WHERE le.empresa_id = ? AND e.ativo = 1 ORDER BY e.nome`).bind(c.get('empresa').id).all();
  return c.json({ entregadores: results.map((e) => ({ ...e, disponivel: Boolean(e.disponivel) })) });
});

entregadoresDaLoja.post('/entregadores', async (c) => {
  exigir(c, 'configuracoes');
  const mail = emailDe((await corpo<{ email?: string }>(c)).email);
  if (!mail.includes('@')) throw erro(400, 'dados_invalidos', 'Digite o e-mail do entregador.');
  const e = await c.env.BANCO.prepare('SELECT id, nome FROM entregadores WHERE email = ? AND ativo = 1').bind(mail).first<{ id: string; nome: string }>();
  if (!e) throw erro(404, 'entregador_sem_app', 'Este entregador ainda não tem o app. Peça para ele baixar o Pedêê Entregador e se cadastrar com este e-mail.');
  await c.env.BANCO.prepare('INSERT OR IGNORE INTO loja_entregadores (empresa_id, entregador_id, criado_em) VALUES (?,?,?)').bind(c.get('empresa').id, e.id, agora()).run();
  return c.json({ ok: true, nome: e.nome });
});

entregadoresDaLoja.delete('/entregadores/:id', async (c) => {
  exigir(c, 'configuracoes');
  await c.env.BANCO.prepare('DELETE FROM loja_entregadores WHERE empresa_id = ? AND entregador_id = ?').bind(c.get('empresa').id, c.req.param('id')).run();
  return c.json({ ok: true });
});

/** A loja escolhe quem leva a entrega (só entregadores vinculados a ela). */
entregadoresDaLoja.post('/vendas/:id/entregador', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ entregador_id: z.string().nullable() }), await corpo(c));
  const db = c.env.BANCO, emp = c.get('empresa').id;
  const v = await db.prepare("SELECT id, tipo FROM vendas WHERE id = ? AND empresa_id = ? AND status = 'concluida'").bind(c.req.param('id'), emp).first<{ id: string; tipo: string }>();
  if (!v) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  if (v.tipo !== 'entrega') throw erro(400, 'nao_e_entrega', 'Este pedido é para retirar na loja.');
  let nome: string | null = null;
  if (d.entregador_id) {
    const e = await db.prepare('SELECT e.nome FROM loja_entregadores le JOIN entregadores e ON e.id = le.entregador_id WHERE le.empresa_id = ? AND e.id = ? AND e.ativo = 1').bind(emp, d.entregador_id).first<{ nome: string }>();
    if (!e) throw erro(400, 'entregador_invalido', 'Este entregador não está na sua lista.');
    nome = e.nome;
  }
  await db.prepare('UPDATE vendas SET entregador_id = ?, entregador = ? WHERE id = ?').bind(d.entregador_id, nome, v.id).run();
  return c.json({ ok: true });
});
