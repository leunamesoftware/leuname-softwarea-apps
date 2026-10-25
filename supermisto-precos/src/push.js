// Avisos no celular com o ERP fechado (Web Push). O aviso vai sem conteúdo (só o "toque"); o service worker
// busca o texto em /api/push/fila. Assim não precisa criptografar, só assinar com a chave VAPID (gerada uma vez).
const agora = () => new Date().toISOString();
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const utf8 = (s) => new TextEncoder().encode(s);

export async function chaves(env) {
  let k = await env.BANCO.prepare("SELECT publica, privada FROM push_chaves WHERE id = 'vapid'").first();
  if (!k) {
    const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const publica = b64u(await crypto.subtle.exportKey('raw', par.publicKey));
    const privada = JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey));
    await env.BANCO.prepare("INSERT OR IGNORE INTO push_chaves (id, publica, privada, criado_em) VALUES ('vapid', ?, ?, ?)").bind(publica, privada, agora()).run();
    k = await env.BANCO.prepare("SELECT publica, privada FROM push_chaves WHERE id = 'vapid'").first();
  }
  return { publica: k.publica, privada: JSON.parse(k.privada) };
}

async function tocar(endpoint, k) {
  const cab = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = b64u(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:leunamesoftware@gmail.com' })));
  const chave = await crypto.subtle.importKey('jwk', k.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const ass = b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, utf8(`${cab}.${corpo}`)));
  return fetch(endpoint, { method: 'POST', headers: { TTL: '3600', Urgency: 'high', Authorization: `vapid t=${cab}.${corpo}.${ass}, k=${k.publica}`, 'Content-Length': '0' } });
}

/** Avisa todos os aparelhos do dono. */
export async function avisar(env, titulo, texto, url = '/#pedidos') {
  const { results } = await env.BANCO.prepare('SELECT endpoint FROM push_inscricoes').all();
  if (!results.length) return 0;
  const k = await chaves(env);
  let ok = 0;
  for (const { endpoint } of results) {
    await env.BANCO.prepare('INSERT INTO push_fila (endpoint, titulo, texto, url, criado_em) VALUES (?,?,?,?,?)').bind(endpoint, titulo.slice(0, 80), texto.slice(0, 200), url, agora()).run();
    try {
      const r = await tocar(endpoint, k);
      if (r.status === 404 || r.status === 410) await env.BANCO.prepare('DELETE FROM push_inscricoes WHERE endpoint = ?').bind(endpoint).run();
      else if (r.ok) ok++;
    } catch { /* serviço de avisos fora do ar agora */ }
  }
  return ok;
}

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/** Rotas públicas (o service worker não manda cookie de forma garantida): só a fila, pelo endpoint do aparelho. */
export async function publico(env, req, path) {
  if (path === '/api/push/fila' && req.method === 'POST') {
    const d = await req.json().catch(() => ({}));
    const ep = String(d.endpoint || '');
    if (!/^https:\/\/\S{10,900}$/.test(ep)) return json({ avisos: [] });
    const { results } = await env.BANCO.prepare('SELECT id, titulo, texto, url FROM push_fila WHERE endpoint = ? AND criado_em > ? ORDER BY id LIMIT 10')
      .bind(ep, new Date(Date.now() - 3600e3).toISOString()).all();
    await env.BANCO.prepare('DELETE FROM push_fila WHERE endpoint = ? OR criado_em < ?').bind(ep, new Date(Date.now() - 864e5).toISOString()).run();
    return json({ avisos: results });
  }
  return null;
}

/** Rotas do dono logado: chave pública e inscrição do aparelho. */
export async function logado(env, req, path) {
  if (path === '/api/push/chave' && req.method === 'GET') return json({ chave: (await chaves(env)).publica });
  if (path === '/api/push/inscrever' && req.method === 'POST') {
    const d = await req.json().catch(() => ({}));
    if (!/^https:\/\/\S{10,900}$/.test(String(d.endpoint || ''))) return json({ erro: 'Aparelho inválido para avisos.' }, 400);
    await env.BANCO.prepare('INSERT OR IGNORE INTO push_inscricoes (endpoint, criado_em) VALUES (?, ?)').bind(d.endpoint, agora()).run();
    return json({ ok: true });
  }
  if (path === '/api/push/testar' && req.method === 'POST') return json({ enviados: await avisar(env, '🔔 Avisos ligados', 'Assim vai chegar o aviso de pedido novo da Supermisto.') });
  return null;
}
