// Entrar, sair e quem está logado.
// - Dono: entra com a conta LeuApps (a mesma de todos os apps). O acesso (teste, mensal, vitalício) vem da loja.
// - Operadores (caixa, gerente): login e senha próprios, criados pelo dono em Configurações → Usuários.
// A sessão do LeuBurger fica num cookie só dele (HttpOnly); o servidor guarda só o hash do token.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { agora, aleatorio, corpo, erro, hashSenha, iguais, novoId, sha256, type C, type Empresa, type Env, type Usuario, type Vars } from './base';

export const APP = 'leuburger';
const COOKIE = 'lb_sessao';
const DIAS_SESSAO = 30;
const LOJA = 'https://www.leunamesoftware.com.br';

type AcessoLoja = { ok: true; expiraEm: string | null; teste: boolean } | { ok: false; testeAcabou: boolean };

/** Pergunta à loja (servidor de contas) se a conta logada lá tem o LeuBurger. */
async function acessoNaLoja(env: Env, cookie: string): Promise<{ email: string; nome: string; acesso: AcessoLoja } | null> {
  if (!env.CONTAS || !cookie) return null;
  const r = await env.CONTAS.fetch(new Request(`${LOJA}/api/conta/apps`, { headers: { Cookie: cookie } }));
  if (!r.ok) return null;
  const d = (await r.json().catch(() => null)) as { conta?: { nome?: string; email?: string } | null; apps?: Record<string, { chave?: string; teste?: boolean; expiraEm?: string | null }>; testes?: Record<string, { acabou?: boolean }> } | null;
  if (!d?.conta?.email) return null;
  const a = d.apps?.[APP];
  const acesso: AcessoLoja = a ? { ok: true, expiraEm: a.expiraEm || null, teste: Boolean(a.teste) } : { ok: false, testeAcabou: Boolean(d.testes?.[APP]?.acabou) };
  return { email: d.conta.email.toLowerCase(), nome: d.conta.nome || d.conta.email.split('@')[0], acesso };
}

/** Cookies "nome=valor" a partir dos Set-Cookie da loja (para usar na hora, antes de voltarem ao navegador). */
function cookiesDe(r: Response): string {
  const lista = (r.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() || [r.headers.get('Set-Cookie') || ''];
  return lista.filter(Boolean).map((c) => c.split(';')[0]).join('; ');
}

export async function abrirSessao(c: C, u: Usuario) {
  const token = aleatorio();
  const expira = new Date(Date.now() + DIAS_SESSAO * 864e5).toISOString();
  await c.env.BANCO.prepare('INSERT INTO sessoes (token_hash, usuario_id, empresa_id, expira_em, criado_em) VALUES (?,?,?,?,?)')
    .bind(await sha256(token), u.id, u.empresa_id, expira, agora()).run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: DIAS_SESSAO * 86400 });
}

/** Garante a lanchonete e o usuário administrador do dono da conta LeuApps (primeira entrada). */
async function empresaDoDono(c: C, email: string, nome: string, acessoAte: string | null) {
  const db = c.env.BANCO;
  let emp = await db.prepare('SELECT * FROM empresas WHERE conta_email = ?').bind(email).first<Empresa>();
  if (!emp) {
    const id = novoId();
    await db.batch([
      db.prepare('INSERT INTO empresas (id, conta_email, nome, acesso_ate, criado_em) VALUES (?,?,?,?,?)').bind(id, email, 'Minha lanchonete', acessoAte, agora()),
      db.prepare("INSERT INTO usuarios (id, empresa_id, nome, login, papel, dono, criado_em) VALUES (?,?,?,?,'admin',1,?)").bind(novoId(), id, nome, email, agora()),
    ]);
    emp = await db.prepare('SELECT * FROM empresas WHERE id = ?').bind(id).first<Empresa>();
  } else {
    await db.prepare('UPDATE empresas SET acesso_ate = ? WHERE id = ?').bind(acessoAte, emp.id).run();
  }
  const u = await db.prepare('SELECT * FROM usuarios WHERE empresa_id = ? AND dono = 1').bind(emp!.id).first<Usuario>();
  return u!;
}

/** Limite de tentativas de senha: 8 a cada 10 minutos por login + IP. */
async function limiteOk(c: C, chave: string) {
  const db = c.env.BANCO;
  const t = await db.prepare('SELECT qtd, desde FROM tentativas WHERE chave = ?').bind(chave).first<{ qtd: number; desde: string }>();
  if (t && Date.now() - new Date(t.desde).getTime() < 600000 && t.qtd >= 8) return false;
  if (!t || Date.now() - new Date(t.desde).getTime() >= 600000) await db.prepare('INSERT OR REPLACE INTO tentativas (chave, qtd, desde) VALUES (?, 1, ?)').bind(chave, agora()).run();
  else await db.prepare('UPDATE tentativas SET qtd = qtd + 1 WHERE chave = ?').bind(chave).run();
  return true;
}

export const auth = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Já logado na loja LeuApps neste navegador: entra sem digitar nada. */
auth.post('/leuapps', async (c) => {
  const loja = await acessoNaLoja(c.env, c.req.header('Cookie') || '');
  if (!loja) throw erro(401, 'sem_conta_loja', 'Entre com o e-mail e a senha da sua conta.');
  if (!loja.acesso.ok) throw erro(402, loja.acesso.testeAcabou ? 'teste_acabou' : 'sem_acesso', loja.acesso.testeAcabou ? 'O teste grátis desta conta terminou.' : 'Esta conta ainda não tem o LeuBurger PDV.');
  const u = await empresaDoDono(c, loja.email, loja.nome, loja.acesso.expiraEm);
  await abrirSessao(c, u);
  return c.json({ ok: true });
});

auth.post('/entrar', async (c) => {
  const d = await corpo<{ login?: string; senha?: string }>(c);
  const login = String(d.login || '').trim().toLowerCase(), senha = String(d.senha || '');
  if (!login || !senha) throw erro(400, 'dados_invalidos', 'Digite o e-mail (ou usuário) e a senha.');
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  if (!(await limiteOk(c, `${login}|${ip}`))) throw erro(429, 'muitas_tentativas', 'Muitas tentativas. Espere 10 minutos e tente de novo.');
  const db = c.env.BANCO;
  // 1) Operador com senha própria.
  const u = await db.prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1').bind(login).first<Usuario & { senha_hash: string | null; senha_sal: string | null }>();
  if (u?.senha_hash && u.senha_sal && iguais(await hashSenha(senha, u.senha_sal), u.senha_hash)) {
    await abrirSessao(c, u);
    return c.json({ ok: true });
  }
  // 2) Dono: conta da loja LeuApps (e-mail + senha da conta, ou a senha da Área do Dono).
  if (!c.env.CONTAS || !login.includes('@')) throw erro(401, 'login_invalido', 'E-mail/usuário ou senha não conferem.');
  const cab = { 'Content-Type': 'application/json', 'User-Agent': c.req.header('User-Agent') || '' };
  let r = await c.env.CONTAS.fetch(new Request(`${LOJA}/api/conta/entrar`, { method: 'POST', headers: cab, body: JSON.stringify({ email: login, senha }) }));
  if (!r.ok && r.status !== 429) r = await c.env.CONTAS.fetch(new Request(`${LOJA}/api/dono/entrar`, { method: 'POST', headers: cab, body: JSON.stringify({ email: login, senha }) }));
  if (r.status === 429) throw erro(429, 'muitas_tentativas', 'Muitas tentativas. Espere um minuto.');
  if (!r.ok) throw erro(401, 'login_invalido', 'E-mail/usuário ou senha não conferem.');
  // A sessão da loja também volta para o navegador (o dono fica logado na loja e nos outros apps).
  const lista = (r.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() || [];
  for (const s of lista) c.header('Set-Cookie', s, { append: true });
  const loja = await acessoNaLoja(c.env, cookiesDe(r));
  if (!loja) throw erro(502, 'loja_indisponivel', 'Não deu para conferir a sua conta agora. Tente de novo.');
  if (!loja.acesso.ok) {
    return c.json({ ok: false, erro: loja.acesso.testeAcabou ? 'teste_acabou' : 'sem_acesso', mensagem: loja.acesso.testeAcabou ? 'O teste grátis desta conta terminou.' : 'Esta conta ainda não tem o LeuBurger PDV.' }, 402);
  }
  const dono = await empresaDoDono(c, loja.email, loja.nome, loja.acesso.expiraEm);
  await abrirSessao(c, dono);
  return c.json({ ok: true });
});

/** Começa o teste grátis de 7 dias (conta LeuApps logada neste navegador). */
auth.post('/teste', async (c) => {
  if (!c.env.CONTAS) throw erro(503, 'loja_indisponivel', 'Serviço indisponível.');
  const cookie = c.req.header('Cookie') || '';
  const r = await c.env.CONTAS.fetch(new Request(`${LOJA}/api/conta/teste`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ app: APP }) }));
  if (r.status === 401) throw erro(401, 'sem_conta_loja', 'Entre na sua conta para começar o teste.');
  if (r.status === 409) throw erro(402, 'teste_acabou', 'O teste grátis desta conta já terminou.');
  if (!r.ok) throw erro(502, 'loja_indisponivel', 'Não deu para começar o teste agora.');
  const loja = await acessoNaLoja(c.env, cookie);
  if (!loja?.acesso.ok) throw erro(502, 'loja_indisponivel', 'Não deu para liberar o teste agora.');
  await abrirSessao(c, await empresaDoDono(c, loja.email, loja.nome, loja.acesso.expiraEm));
  return c.json({ ok: true });
});

auth.post('/sair', async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await c.env.BANCO.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

/** Confere a sessão e o acesso da lanchonete; coloca usuário e empresa no contexto. */
export async function exigirSessao(c: C, proximo: () => Promise<void>) {
  const t = getCookie(c, COOKIE);
  if (!t) throw erro(401, 'sem_sessao', 'Entre para continuar.');
  const db = c.env.BANCO;
  const s = await db.prepare('SELECT s.expira_em, u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?').bind(await sha256(t)).first<Usuario & { expira_em: string; ativo: number }>();
  if (!s || new Date(s.expira_em).getTime() < Date.now() || !s.ativo) throw erro(401, 'sem_sessao', 'Sua sessão terminou. Entre de novo.');
  let emp = await db.prepare('SELECT * FROM empresas WHERE id = ?').bind(s.empresa_id).first<Empresa>();
  if (!emp) throw erro(401, 'sem_sessao', 'Entre de novo.');
  // Prazo do acesso (teste ou mensal) vencido: o dono confere de novo na loja (pode ter renovado).
  if (emp.acesso_ate && Date.now() > new Date(emp.acesso_ate).getTime() + 864e5) {
    const loja = s.dono ? await acessoNaLoja(c.env, c.req.header('Cookie') || '') : null;
    if (loja?.acesso.ok && loja.email === emp.conta_email) {
      await db.prepare('UPDATE empresas SET acesso_ate = ? WHERE id = ?').bind(loja.acesso.expiraEm, emp.id).run();
      emp = { ...emp, acesso_ate: loja.acesso.expiraEm };
    } else {
      throw erro(402, 'acesso_vencido', s.dono ? 'O acesso do LeuBurger PDV venceu. Renove na loja para continuar.' : 'O acesso desta lanchonete venceu. Peça ao dono para renovar.');
    }
  }
  const { expira_em: _e, ativo: _a, ...usuario } = s;
  c.set('usuario', usuario as Usuario);
  c.set('empresa', emp);
  await proximo();
}
