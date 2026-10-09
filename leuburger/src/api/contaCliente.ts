// Conta do cliente do Pedêê: entra com o e-mail e um código de 6 números que chega no e-mail (como o iFood, sem senha).
// Separada das contas das lojas e dos entregadores.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { agora, aleatorio, corpo, erro, iguais, novoId, sha256, type C, type Env, type Vars } from './base';
import { validar } from './cadastros';

const COOKIE = 'pc_sessao';
interface Conta { id: string; nome: string; email: string; telefone: string; endereco: string | null }
const publica = (c: Conta) => ({ nome: c.nome, email: c.email, telefone: c.telefone, endereco: c.endereco });

async function abrirSessao(c: C, id: string) {
  const token = aleatorio();
  await c.env.BANCO.prepare('INSERT INTO conta_cliente_sessoes (token_hash, conta_id, expira_em, criado_em) VALUES (?,?,?,?)')
    .bind(await sha256(token), id, new Date(Date.now() + 180 * 864e5).toISOString(), agora()).run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 180 * 86400 });
}
/** Conta logada (ou null): usada também para ligar o pedido à conta. */
export async function contaLogada(c: C): Promise<Conta | null> {
  const t = getCookie(c, COOKIE);
  if (!t) return null;
  return (await c.env.BANCO.prepare('SELECT a.id, a.nome, a.email, a.telefone, a.endereco FROM conta_cliente_sessoes s JOIN contas_cliente a ON a.id = s.conta_id WHERE s.token_hash = ? AND s.expira_em > ?')
    .bind(await sha256(t), agora()).first<Conta>()) || null;
}
async function exigirConta(c: C) { const a = await contaLogada(c); if (!a) throw erro(401, 'sem_sessao', 'Entre na sua conta.'); return a; }

const telefone = z.string().trim().refine((t) => t.replace(/\D/g, '').length >= 10 && t.replace(/\D/g, '').length <= 13, 'Digite o celular com DDD.');
export const contaCliente = new Hono<{ Bindings: Env; Variables: Vars }>();

const email = z.string().trim().toLowerCase().email('Digite um e-mail válido.').max(120);
const MIN = 60e3;

/** 1º passo: manda o código para o e-mail (vale 10 minutos; reenviar só depois de 1 minuto; até 6 por hora). */
contaCliente.post('/publico/conta/codigo', async (c) => {
  const d = validar(z.object({ email }), await corpo(c));
  const db = c.env.BANCO, agoraMs = Date.now();
  const ip = c.req.header('CF-Connecting-IP') || 'local', chaveIp = `cod-ip|${ip}`;
  const porIp = await db.prepare('SELECT qtd, desde FROM tentativas WHERE chave = ?').bind(chaveIp).first<{ qtd: number; desde: string }>();
  const ipRecente = porIp && agoraMs - new Date(porIp.desde).getTime() < 3600e3;
  if (ipRecente && porIp!.qtd >= 15) throw erro(429, 'muitas_tentativas', 'Muitos códigos pedidos. Tente de novo mais tarde.');
  const ant = await db.prepare('SELECT envios, envios_desde, ultimo_envio FROM conta_cliente_codigos WHERE email = ?').bind(d.email).first<{ envios: number; envios_desde: string; ultimo_envio: string }>();
  if (ant && agoraMs - new Date(ant.ultimo_envio).getTime() < MIN) throw erro(429, 'espere', 'Espere 1 minuto para pedir outro código.');
  const mesmaHora = ant && agoraMs - new Date(ant.envios_desde).getTime() < 3600e3;
  if (mesmaHora && ant!.envios >= 6) throw erro(429, 'muitas_tentativas', 'Muitos códigos para este e-mail. Tente de novo mais tarde.');
  const codigo = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  if (!c.env.CONTAS) throw erro(503, 'sem_email', 'Não deu para mandar o e-mail agora. Tente de novo.');
  const r = await c.env.CONTAS.fetch(new Request('https://interno.pedee/interno/codigo-pedee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ para: d.email, codigo }) }));
  if (!r.ok) throw erro(502, 'email_nao_saiu', 'Não deu para mandar o e-mail agora. Confira o endereço e tente de novo.');
  const q = agora();
  await db.batch([
    db.prepare(`INSERT INTO conta_cliente_codigos (email, codigo_hash, expira_em, erros, envios, envios_desde, ultimo_envio) VALUES (?,?,?,0,1,?,?)
      ON CONFLICT(email) DO UPDATE SET codigo_hash = excluded.codigo_hash, expira_em = excluded.expira_em, erros = 0, ultimo_envio = excluded.ultimo_envio,
        envios = CASE WHEN ? THEN envios + 1 ELSE 1 END, envios_desde = CASE WHEN ? THEN envios_desde ELSE excluded.envios_desde END`)
      .bind(d.email, await sha256(`${d.email}|${codigo}`), new Date(agoraMs + 10 * MIN).toISOString(), q, q, mesmaHora ? 1 : 0, mesmaHora ? 1 : 0),
    db.prepare(ipRecente ? 'UPDATE tentativas SET qtd = qtd + 1 WHERE chave = ?' : 'INSERT OR REPLACE INTO tentativas (chave, qtd, desde) VALUES (?, 1, ?)').bind(...(ipRecente ? [chaveIp] : [chaveIp, q])),
  ]);
  const existe = await db.prepare('SELECT 1 FROM contas_cliente WHERE email = ?').bind(d.email).first();
  return c.json({ ok: true, novo: !existe });
});

/** 2º passo: confere o código. Conta nova: precisa do nome e do celular (o app pede depois do código). */
contaCliente.post('/publico/conta/confirmar', async (c) => {
  const d = validar(z.object({
    email, codigo: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do código.'),
    nome: z.string().trim().min(2, 'Digite o seu nome.').max(60).optional(), telefone: telefone.optional(),
  }), await corpo(c));
  const db = c.env.BANCO;
  const cod = await db.prepare('SELECT codigo_hash, expira_em, erros FROM conta_cliente_codigos WHERE email = ?').bind(d.email).first<{ codigo_hash: string; expira_em: string; erros: number }>();
  if (!cod || new Date(cod.expira_em).getTime() < Date.now()) throw erro(400, 'codigo_vencido', 'O código venceu. Peça outro.');
  if (cod.erros >= 5) throw erro(429, 'muitas_tentativas', 'Código errado muitas vezes. Peça outro.');
  if (!iguais(await sha256(`${d.email}|${d.codigo}`), cod.codigo_hash)) {
    await db.prepare('UPDATE conta_cliente_codigos SET erros = erros + 1 WHERE email = ?').bind(d.email).run();
    throw erro(400, 'codigo_errado', 'Código errado. Confira no seu e-mail.', { codigo: 'Código errado.' });
  }
  let a = await db.prepare('SELECT id, nome, email, telefone, endereco FROM contas_cliente WHERE email = ?').bind(d.email).first<Conta>();
  if (!a) {
    if (!d.nome || !d.telefone) return c.json({ ok: true, falta: 'dados' });
    a = { id: novoId(), nome: d.nome, email: d.email, telefone: d.telefone, endereco: null };
    await db.prepare('INSERT INTO contas_cliente (id, nome, email, telefone, criado_em) VALUES (?,?,?,?,?)').bind(a.id, a.nome, a.email, a.telefone, agora()).run();
  }
  await db.prepare('DELETE FROM conta_cliente_codigos WHERE email = ?').bind(d.email).run();
  await abrirSessao(c, a.id);
  return c.json({ ok: true, conta: publica(a) });
});

contaCliente.post('/publico/conta/sair', async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await c.env.BANCO.prepare('DELETE FROM conta_cliente_sessoes WHERE token_hash = ?').bind(await sha256(t)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

contaCliente.get('/publico/conta/eu', async (c) => c.json({ conta: publica(await exigirConta(c)) }));

contaCliente.put('/publico/conta/eu', async (c) => {
  const a = await exigirConta(c);
  const d = validar(z.object({ nome: z.string().trim().min(2, 'Digite o seu nome.').max(60), telefone, endereco: z.string().trim().max(200).nullable().optional() }), await corpo(c));
  await c.env.BANCO.prepare('UPDATE contas_cliente SET nome = ?, telefone = ?, endereco = ? WHERE id = ?').bind(d.nome, d.telefone, d.endereco || null, a.id).run();
  return c.json({ ok: true });
});

/** Pedidos da conta (para aparecerem em qualquer celular em que a pessoa entrar). */
contaCliente.get('/publico/conta/pedidos', async (c) => {
  const a = await exigirConta(c);
  const { results } = await c.env.BANCO.prepare(`SELECT o.token, o.criado_em, e.nome AS loja, e.slug FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id
    WHERE o.conta_id = ? ORDER BY o.criado_em DESC LIMIT 30`).bind(a.id).all();
  return c.json({ pedidos: results });
});
