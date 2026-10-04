// Teste grátis: token "TESTE-..." que vale 7 dias, guardado no banco da calculadora.
export const DIAS_TESTE = 7;
export const RECEITAS_NO_TESTE = 2; // no teste, só as primeiras receitas vêm completas; as outras aparecem com cadeado
const MAX_POR_IP_30_DIAS = 3; // operadoras compartilham IP; folga para clientes diferentes na mesma rede
const FORMATO_APARELHO = /^[0-9a-f-]{36}$/;
export const ehTeste = (chave) => /^TESTE-[0-9a-f]{32}$/.test(chave);

async function sha256(texto) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Começa (ou devolve) o teste deste aparelho. */
export async function iniciarTeste(env, aparelho, ipBruto) {
  if (!FORMATO_APARELHO.test(String(aparelho || ''))) return { erro: 'dados_invalidos', status: 400 };
  const existente = await env.DB.prepare('SELECT token, expira_em FROM testes WHERE aparelho = ?').bind(aparelho).first();
  if (existente) return { token: existente.token, expiraEm: existente.expira_em };
  const ip = await sha256('teste:' + ipBruto);
  const desde = new Date(Date.now() - 30 * 864e5).toISOString();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM testes WHERE ip = ? AND criado_em > ?').bind(ip, desde).first();
  if (n >= MAX_POR_IP_30_DIAS) return { erro: 'teste_usado', status: 429 };
  const token = 'TESTE-' + crypto.randomUUID().replace(/-/g, '');
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + DIAS_TESTE * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO testes (token, aparelho, ip, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)')
    .bind(token, aparelho, ip, agora.toISOString(), expiraEm).run();
  return { token, expiraEm };
}

/** Situação do token de teste: null (não existe), { ativo, expiraEm }. */
export async function situacaoTeste(env, token) {
  const t = await env.DB.prepare('SELECT expira_em FROM testes WHERE token = ?').bind(token).first();
  return t ? { ativo: t.expira_em > new Date().toISOString(), expiraEm: t.expira_em } : null;
}
