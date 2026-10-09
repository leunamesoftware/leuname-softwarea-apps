// Ambiente de teste: banco SQLite em memória com a mesma interface do D1 e uma loja LeuApps falsa.
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { criarApp } from '../src/api/app';
import type { D1, D1Prepared, Env } from '../src/api/base';

function d1(db: DatabaseSync): D1 {
  const preparar = (sql: string, args: unknown[] = []): D1Prepared & { _exec: () => { changes: number; rows?: unknown[] } } => {
    const conv = (v: unknown) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
    const p = {
      bind: (...v: unknown[]) => preparar(sql, v),
      first: async <T,>() => (db.prepare(sql).get(...(args.map(conv) as never[])) as T) ?? null,
      all: async <T,>() => ({ results: db.prepare(sql).all(...(args.map(conv) as never[])) as T[] }),
      run: async () => ({ results: [], meta: { changes: Number(db.prepare(sql).run(...(args.map(conv) as never[])).changes) } }),
      _exec: () => ({ changes: Number(db.prepare(sql).run(...(args.map(conv) as never[])).changes) }),
    };
    return p;
  };
  return {
    prepare: (sql) => preparar(sql),
    batch: async (lista) => {
      db.exec('BEGIN');
      try {
        const r = lista.map((s) => ({ results: [], meta: { changes: (s as ReturnType<typeof preparar>)._exec().changes } }));
        db.exec('COMMIT');
        return r;
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}

/** Contas da loja: email → { senha, app }. app: 'vitalicio' | 'teste' | null. */
/** E-mails de código que o app mandou (para o teste ler o código). */
export const codigosEnviados: { para: string; codigo: string }[] = [];
export function lojaFalsa(contas: Record<string, { senha: string; nome: string; acesso: 'vitalicio' | 'teste' | null }>) {
  return {
    async fetch(req: Request) {
      const url = new URL(req.url);
      if (url.hostname === 'interno.pedee' && url.pathname === '/interno/codigo-pedee') { codigosEnviados.push((await req.json()) as { para: string; codigo: string }); return Response.json({ ok: true }); }
      const sessao = /ln_sessao=([^;]+)/.exec(req.headers.get('Cookie') || '')?.[1];
      if (url.pathname === '/api/conta/entrar' || url.pathname === '/api/dono/entrar') {
        const d = (await req.json()) as { email: string; senha: string };
        const c = contas[d.email];
        if (!c || c.senha !== d.senha || url.pathname === '/api/dono/entrar') return Response.json({ erro: 'login_invalido' }, { status: 401 });
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Set-Cookie': `ln_sessao=${encodeURIComponent(d.email)}; Domain=.leunamesoftware.com.br; Path=/; HttpOnly; Secure` } });
      }
      if (url.pathname === '/api/conta/apps') {
        const email = sessao && decodeURIComponent(sessao), c = email && contas[email];
        if (!c) return Response.json({ conta: null, apps: {} });
        const apps = c.acesso === 'vitalicio' ? { leuburger: { chave: 'X' } } : c.acesso === 'teste' ? { leuburger: { teste: true, expiraEm: new Date(Date.now() + 7 * 864e5).toISOString() } } : {};
        return Response.json({ conta: { nome: c.nome, email }, apps, testes: {} });
      }
      return Response.json({ erro: 'nao_encontrado' }, { status: 404 });
    },
  };
}

export function ambiente(contas: Parameters<typeof lojaFalsa>[0]) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const m of readdirSync(new URL('../migracoes/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL('../migracoes/' + m, import.meta.url), 'utf8'));
  const env: Env = { BANCO: d1(db), CONTAS: lojaFalsa(contas), DONO_EMAIL: 'dono@leuname.com', JANELA_CANCELAR_MIN: '0' };
  const app = criarApp();
  /** Um navegador: guarda os cookies entre os pedidos. */
  const navegador = () => {
    const potes = new Map<string, string>();
    const pedir = async (metodo: string, caminho: string, dados?: unknown) => {
      const headers: Record<string, string> = { 'User-Agent': 'teste' };
      if (potes.size) headers.Cookie = [...potes].map(([k, v]) => `${k}=${v}`).join('; ');
      if (dados !== undefined) headers['Content-Type'] = 'application/json';
      const r = await app.fetch(new Request(`https://leuburger.leunamesoftware.com.br/api${caminho}`, { method: metodo, headers, body: dados === undefined ? undefined : JSON.stringify(dados) }), env);
      for (const s of r.headers.getSetCookie()) {
        const [nv] = s.split(';'); const i = nv.indexOf('=');
        if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(s)) potes.delete(nv.slice(0, i)); else potes.set(nv.slice(0, i), nv.slice(i + 1));
      }
      const corpo = (r.headers.get('Content-Type') || '').includes('json') ? await r.json() : await r.text();
      return { status: r.status, corpo: corpo as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    return {
      get: (c: string) => pedir('GET', c), post: (c: string, d: unknown = {}) => pedir('POST', c, d),
      put: (c: string, d: unknown) => pedir('PUT', c, d), del: (c: string) => pedir('DELETE', c),
    };
  };
  return { db, env, navegador };
}
