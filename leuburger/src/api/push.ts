// Avisos com o app fechado (Web Push): o celular toca e mostra a notificação; ao tocar, abre o app no lugar certo.
// O aviso vai sem conteúdo (só o "toque"); o próprio app busca o texto em /publico/push/fila. Assim não precisa
// criptografar a mensagem, só assinar com a chave VAPID do servidor (gerada uma vez e guardada no banco).
import { Hono } from 'hono';
import { z } from 'zod';
import { agora, corpo, erro, novoId, type C, type Env, type Vars } from './base';
import { validar } from './cadastros';

export type Papel = 'cliente' | 'loja' | 'entregador';
export interface Aviso { titulo: string; texto: string; url: string }

const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const utf8 = (s: string) => new TextEncoder().encode(s);

async function chaves(c: C): Promise<{ publica: string; privada: JsonWebKey }> {
  const db = c.env.BANCO;
  let k = await db.prepare("SELECT publica, privada FROM push_chaves WHERE id = 'vapid'").first<{ publica: string; privada: string }>();
  if (!k) {
    const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const publica = b64u(await crypto.subtle.exportKey('raw', par.publicKey) as ArrayBuffer);
    const privada = JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey));
    await db.prepare("INSERT OR IGNORE INTO push_chaves (id, publica, privada, criado_em) VALUES ('vapid', ?, ?, ?)").bind(publica, privada, agora()).run();
    k = await db.prepare("SELECT publica, privada FROM push_chaves WHERE id = 'vapid'").first<{ publica: string; privada: string }>();
  }
  return { publica: k!.publica, privada: JSON.parse(k!.privada) };
}

async function tocar(endpoint: string, k: { publica: string; privada: JsonWebKey }) {
  const cab = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpoJwt = b64u(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:leunamesoftware@gmail.com' })));
  const chave = await crypto.subtle.importKey('jwk', k.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const assinatura = b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, utf8(`${cab}.${corpoJwt}`)));
  return fetch(endpoint, { method: 'POST', headers: { TTL: '3600', Urgency: 'high', Authorization: `vapid t=${cab}.${corpoJwt}.${assinatura}, k=${k.publica}`, 'Content-Length': '0' } });
}

/** Roda depois da resposta (no Worker) sem atrasar quem chamou. */
function depois(c: C, p: Promise<unknown>) {
  try { c.executionCtx.waitUntil(p); } catch { p.catch(() => {}); }
}

/** Avisa todos os aparelhos inscritos daquele papel (cliente pelo token do pedido, loja pela empresa, entregador pelo id). */
export function avisar(c: C, papel: Papel, ref: string | null | undefined, a: Aviso) {
  if (!ref) return;
  depois(c, (async () => {
    const db = c.env.BANCO;
    const { results } = await db.prepare('SELECT DISTINCT endpoint FROM push_inscricoes WHERE papel = ? AND ref = ?').bind(papel, ref).all<{ endpoint: string }>();
    if (!results.length) return;
    const k = await chaves(c), quando = agora();
    for (const { endpoint } of results) {
      await db.prepare('INSERT INTO push_fila (id, endpoint, titulo, texto, url, criado_em) VALUES (?,?,?,?,?,?)').bind(novoId(), endpoint, a.titulo.slice(0, 80), a.texto.slice(0, 200), a.url, quando).run();
      try {
        const r = await tocar(endpoint, k);
        if (r.status === 404 || r.status === 410) await db.prepare('DELETE FROM push_inscricoes WHERE endpoint = ?').bind(endpoint).run();
      } catch { /* sem conexão com o serviço de avisos agora */ }
    }
  })());
}

/** Inscreve o aparelho (endpoint) para um papel e uma ou mais referências. */
export async function inscrever(c: C, endpoint: string, papel: Papel, refs: string[]) {
  if (!/^https:\/\/[^\s]{10,900}$/.test(endpoint)) throw erro(400, 'endpoint', 'Aparelho inválido para avisos.');
  const db = c.env.BANCO, quando = agora();
  await db.batch(refs.slice(0, 20).map((ref) => db.prepare('INSERT OR IGNORE INTO push_inscricoes (endpoint, papel, ref, criado_em) VALUES (?,?,?,?)').bind(endpoint, papel, ref, quando)));
}

export const push = new Hono<{ Bindings: Env; Variables: Vars }>();

push.get('/publico/push/chave', async (c) => c.json({ chave: (await chaves(c)).publica }));

/** O app (service worker) busca o texto dos avisos que chegaram para este aparelho. */
push.post('/publico/push/fila', async (c) => {
  const d = validar(z.object({ endpoint: z.string().max(1000) }), await corpo(c));
  const db = c.env.BANCO;
  const { results } = await db.prepare('SELECT id, titulo, texto, url FROM push_fila WHERE endpoint = ? AND criado_em > ? ORDER BY criado_em LIMIT 10')
    .bind(d.endpoint, new Date(Date.now() - 3600e3).toISOString()).all();
  await db.prepare('DELETE FROM push_fila WHERE endpoint = ? OR criado_em < ?').bind(d.endpoint, new Date(Date.now() - 864e5).toISOString()).run();
  return c.json({ avisos: results });
});

/** Cliente: avisos dos seus pedidos (pelos códigos dos pedidos que o app guardou). */
push.post('/publico/push/cliente', async (c) => {
  const d = validar(z.object({ endpoint: z.string().max(1000), tokens: z.array(z.string().regex(/^[A-Za-z0-9_-]{20,64}$/)).max(20) }), await corpo(c));
  if (!d.tokens.length) return c.json({ ok: true });
  const { results } = await c.env.BANCO.prepare(`SELECT token FROM pedidos_online WHERE token IN (${d.tokens.map(() => '?').join(',')})`).bind(...d.tokens).all<{ token: string }>();
  await inscrever(c, d.endpoint, 'cliente', results.map((r) => r.token));
  return c.json({ ok: true });
});
