// Painel do administrador do Pedêê: só o dono (DONO_EMAIL), com a senha da Área do Dono.
// Vê todas as lojas, entregadores, clientes e pedidos; pode tirar uma loja do app, dar mais dias e desativar entregador.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { agora, aleatorio, corpo, erro, sha256, type C, type Env, type Usuario, type Vars } from './base';
import { validar } from './cadastros';
import { abrirSessao } from './auth';
import { abrirSessaoEntregador, enviarFoto } from './entregador';

const COOKIE = 'adm_sessao', LOJA = 'https://www.leunamesoftware.com.br';
const dias = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

async function exigirAdmin(c: C) {
  const t = getCookie(c, COOKIE);
  const s = t && await c.env.BANCO.prepare('SELECT email FROM admin_sessoes WHERE token_hash = ? AND expira_em > ?').bind(await sha256(t), agora()).first<{ email: string }>();
  if (!s || s.email !== String(c.env.DONO_EMAIL || '').toLowerCase()) throw erro(401, 'sem_sessao', 'Entre como administrador.');
  return s.email;
}

export const admin = new Hono<{ Bindings: Env; Variables: Vars }>();

admin.post('/admin/entrar', async (c) => {
  const d = await corpo<{ email?: string; senha?: string }>(c);
  const email = String(d.email || '').trim().toLowerCase();
  if (!c.env.DONO_EMAIL || !c.env.CONTAS) throw erro(503, 'sem_contas', 'Login indisponível agora. Tente de novo.');
  if (email !== c.env.DONO_EMAIL.toLowerCase()) throw erro(401, 'login_invalido', 'Este e-mail não é o do administrador.');
  if (!d.senha) throw erro(400, 'dados_invalidos', 'Digite a senha.');
  // Vale a senha da Área do Dono ou a senha da conta LeuApps do dono (as duas são conferidas no servidor de contas).
  const cab = { 'Content-Type': 'application/json', 'User-Agent': c.req.header('User-Agent') || '', 'CF-Connecting-IP': c.req.header('CF-Connecting-IP') || '' };
  const tentar = (rota: string) => c.env.CONTAS!.fetch(new Request(`${LOJA}${rota}`, { method: 'POST', headers: cab, body: JSON.stringify({ email, senha: d.senha }) }));
  let r = await tentar('/api/dono/entrar');
  if (!r.ok && r.status !== 429) r = await tentar('/api/conta/entrar');
  if (r.status === 429) throw erro(429, 'muitas_tentativas', 'Muitas tentativas. Espere um minuto e tente de novo.');
  if (!r.ok) throw erro(401, 'login_invalido', 'Senha não confere. Use a senha da Área do Dono ou a da sua conta LeuApps.');
  const token = aleatorio();
  await c.env.BANCO.prepare('INSERT INTO admin_sessoes (token_hash, email, expira_em, criado_em) VALUES (?,?,?,?)').bind(await sha256(token), email, new Date(Date.now() + 30 * 864e5).toISOString(), agora()).run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: 30 * 86400 });
  return c.json({ ok: true });
});
admin.post('/admin/sair', async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await c.env.BANCO.prepare('DELETE FROM admin_sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});
admin.get('/admin/eu', async (c) => c.json({ email: await exigirAdmin(c) }));

/** Números gerais: hoje, 7 e 30 dias. */
admin.get('/admin/resumo', async (c) => {
  await exigirAdmin(c);
  const db = c.env.BANCO, hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const periodo = async (desde: string) => db.prepare(`SELECT COUNT(*) AS pedidos, COALESCE(SUM(CASE WHEN status = 'aceito' AND cancelado_em IS NULL THEN total END), 0) AS valor,
      SUM(CASE WHEN status = 'recusado' OR cancelado_em IS NOT NULL THEN 1 ELSE 0 END) AS perdidos FROM pedidos_online WHERE criado_em >= ? AND chave NOT LIKE 'demo-%'`).bind(desde).first();
  const [h, s, m, lojas, ent, cli] = await Promise.all([
    periodo(hoje.toISOString()), periodo(dias(7)), periodo(dias(30)),
    db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN no_app = 1 THEN 1 ELSE 0 END) AS no_app, SUM(CASE WHEN no_app = 1 AND aceitando = 1 THEN 1 ELSE 0 END) AS abertas,
      SUM(CASE WHEN acesso_ate IS NOT NULL AND acesso_ate < ? THEN 1 ELSE 0 END) AS vencidas FROM empresas WHERE slug IS NOT NULL`).bind(agora()).first(),
    db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN disponivel = 1 AND ativo = 1 THEN 1 ELSE 0 END) AS disponiveis FROM entregadores').first(),
    db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN criado_em >= ? THEN 1 ELSE 0 END) AS novos FROM contas_cliente').bind(dias(7)).first(),
  ]);
  return c.json({ hoje: h, semana: s, mes: m, lojas, entregadores: ent, clientes: cli });
});

admin.get('/admin/lojas', async (c) => {
  await exigirAdmin(c);
  const { results } = await c.env.BANCO.prepare(`SELECT e.id, e.nome, e.slug, e.cidade, e.uf, e.tipo_loja, e.telefone, e.no_app, e.aceitando, e.acesso_ate, e.criado_em, e.conta_email,
      (SELECT COUNT(*) FROM pedidos_online o WHERE o.empresa_id = e.id AND o.criado_em >= ? AND o.chave NOT LIKE 'demo-%') AS pedidos_30d,
      (SELECT COALESCE(SUM(o.total), 0) FROM pedidos_online o WHERE o.empresa_id = e.id AND o.status = 'aceito' AND o.cancelado_em IS NULL AND o.criado_em >= ? AND o.chave NOT LIKE 'demo-%') AS valor_30d,
      (SELECT ROUND(AVG(a.nota), 1) FROM avaliacoes a WHERE a.empresa_id = e.id) AS nota,
      (SELECT COUNT(*) FROM loja_entregadores le WHERE le.empresa_id = e.id) AS entregadores
    FROM empresas e WHERE e.slug IS NOT NULL ORDER BY e.criado_em DESC LIMIT 500`).bind(dias(30), dias(30)).all();
  return c.json({ lojas: results.map((l) => ({ ...l, demo: /^demo-.*@leupede\.demo$/.test(String(l.conta_email)), conta_email: undefined })) });
});

/** Tirar/colocar a loja no app e dar mais dias de acesso (ex.: pagou por fora, cortesia). */
admin.post('/admin/lojas/:id', async (c) => {
  await exigirAdmin(c);
  const d = validar(z.object({ no_app: z.boolean().optional(), mais_dias: z.number().int().min(1).max(400).optional() }), await corpo(c));
  const db = c.env.BANCO, id = c.req.param('id');
  const e = await db.prepare('SELECT acesso_ate FROM empresas WHERE id = ? AND slug IS NOT NULL').bind(id).first<{ acesso_ate: string | null }>();
  if (!e) throw erro(404, 'nao_encontrado', 'Loja não encontrada.');
  if (d.no_app !== undefined) await db.prepare('UPDATE empresas SET no_app = ? WHERE id = ?').bind(d.no_app ? 1 : 0, id).run();
  if (d.mais_dias) {
    const base = Math.max(Date.now(), e.acesso_ate ? new Date(e.acesso_ate).getTime() : Date.now());
    await db.prepare('UPDATE empresas SET acesso_ate = ? WHERE id = ?').bind(new Date(base + d.mais_dias * 864e5).toISOString(), id).run();
  }
  return c.json({ ok: true });
});

admin.get('/admin/entregadores', async (c) => {
  await exigirAdmin(c);
  const { results } = await c.env.BANCO.prepare(`SELECT e.id, e.nome, e.email, e.veiculo, e.cidade, e.disponivel, e.ativo, e.criado_em, (e.foto IS NOT NULL) AS tem_foto,
      (SELECT GROUP_CONCAT(em.nome, ', ') FROM loja_entregadores le JOIN empresas em ON em.id = le.empresa_id WHERE le.entregador_id = e.id) AS lojas,
      (SELECT COUNT(*) FROM vendas v WHERE v.entregador_id = e.id AND v.andamento = 'entregue' AND v.finalizado_em >= ?) AS entregas_30d
    FROM entregadores e ORDER BY e.criado_em DESC LIMIT 500`).bind(dias(30)).all();
  return c.json({ entregadores: results });
});
admin.get('/admin/entregadores/:id/foto', async (c) => {
  await exigirAdmin(c);
  const f = await c.env.BANCO.prepare('SELECT foto FROM entregadores WHERE id = ?').bind(c.req.param('id')).first<{ foto: string | null }>();
  if (!f?.foto) throw erro(404, 'sem_foto', 'Sem foto.');
  return enviarFoto(f.foto);
});
/** Desativar entregador (sai das lojas e não entra mais) ou reativar. */
admin.post('/admin/entregadores/:id', async (c) => {
  await exigirAdmin(c);
  const d = validar(z.object({ ativo: z.boolean() }), await corpo(c));
  const db = c.env.BANCO, id = c.req.param('id');
  await db.batch([
    db.prepare('UPDATE entregadores SET ativo = ? WHERE id = ?').bind(d.ativo ? 1 : 0, id),
    ...(d.ativo ? [] : [db.prepare('DELETE FROM entregador_sessoes WHERE entregador_id = ?').bind(id)]),
  ]);
  return c.json({ ok: true });
});

admin.get('/admin/pedidos', async (c) => {
  await exigirAdmin(c);
  const { results } = await c.env.BANCO.prepare(`SELECT o.id, o.nome, o.tipo, o.forma, o.total, o.status, o.cancelado_em, o.criado_em, e.nome AS loja, e.cidade, v.numero, v.andamento, v.entregador
    FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id LEFT JOIN vendas v ON v.id = o.venda_id
    WHERE o.chave NOT LIKE 'demo-%' ORDER BY o.criado_em DESC LIMIT 150`).all();
  return c.json({ pedidos: results });
});

admin.get('/admin/clientes', async (c) => {
  await exigirAdmin(c);
  const { results } = await c.env.BANCO.prepare(`SELECT a.nome, a.email, a.telefone, a.criado_em,
      (SELECT COUNT(*) FROM pedidos_online o WHERE o.conta_id = a.id) AS pedidos FROM contas_cliente a ORDER BY a.criado_em DESC LIMIT 300`).all();
  return c.json({ clientes: results });
});

/** Central de testes: o dono entra, com um toque, na loja de teste e no entregador de teste (contas de demonstração). */
export const LOGIN_LOJA_TESTE = '21900000001', EMAIL_ENTREGADOR_TESTE = 'motoboy@teste.pedee';
admin.post('/admin/teste/:papel', async (c) => {
  await exigirAdmin(c);
  const db = c.env.BANCO, papel = c.req.param('papel');
  if (papel === 'loja') {
    const u = await db.prepare("SELECT u.* FROM usuarios u JOIN empresas e ON e.id = u.empresa_id WHERE u.login = ? AND u.ativo = 1 AND e.conta_email LIKE 'demo-%@leupede.demo'").bind(LOGIN_LOJA_TESTE).first<Usuario>();
    if (!u) throw erro(404, 'sem_teste', 'A loja de teste não está carregada. Rode a publicação com as lojas de demonstração.');
    await abrirSessao(c, u);
    return c.json({ ok: true, url: '/parceiro/' });
  }
  if (papel === 'entregador') {
    const e = await db.prepare('SELECT id FROM entregadores WHERE email = ? AND ativo = 1').bind(EMAIL_ENTREGADOR_TESTE).first<{ id: string }>();
    if (!e) throw erro(404, 'sem_teste', 'O entregador de teste não está carregado.');
    await abrirSessaoEntregador(c, e.id);
    return c.json({ ok: true, url: '/entregador/' });
  }
  throw erro(400, 'papel_invalido', 'Escolha loja ou entregador.');
});
