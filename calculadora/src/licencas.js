// Licenças no banco do servidor de licenças da LeuName (leuname_licencas), no mesmo formato dos outros apps.

// Mesmo segredo de checksum usado pelo worker leuname-licencas (as chaves precisam passar no chaveValida de lá).
const SEGREDO_CHECKSUM = 'LeuName-Ativacao-Local-PrimeiroCliente-2026-v1';
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const FORMATO_CHAVE = /^LEU-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

function grupo() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('');
}

async function checksum(g1, g2) {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey('raw', enc.encode(SEGREDO_CHECKSUM), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(`LEU-${g1}-${g2}`)));
  return [...sig.slice(0, 2)].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('');
}

export async function gerarChave() {
  const g1 = grupo(), g2 = grupo();
  return `LEU-${g1}-${g2}-${await checksum(g1, g2)}`;
}

export async function licencaAtiva(env, bruta) {
  const chave = String(bruta || '').trim().toUpperCase();
  if (!FORMATO_CHAVE.test(chave)) return null;
  const l = await env.LICDB.prepare('SELECT app_id, status FROM licencas WHERE chave = ?').bind(chave).first();
  return l && l.status === 'ativa' && l.app_id === env.APP_ID ? chave : null;
}

export async function emitirLicenca(env, nome, email, appId = env.APP_ID, origem = 'mercadopago') {
  const chave = await gerarChave();
  // licencas.app_id aponta para apps(id): app novo sem cadastro faria a licença (do dono e das vendas) falhar.
  await env.LICDB.prepare("INSERT OR IGNORE INTO apps (id, nome, criado_em) VALUES (?, ?, datetime('now'))").bind(appId, appId).run();
  await env.LICDB.prepare(`INSERT INTO licencas (id, app_id, chave, cliente_nome, cliente_contato, origem, status, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, 'ativa', datetime('now'))`)
    .bind(crypto.randomUUID(), appId, chave, nome, email, origem).run();
  return chave;
}

export async function revogarLicenca(env, chave, motivo) {
  await env.LICDB.prepare("UPDATE licencas SET status = 'revogada', revogado_em = datetime('now'), motivo_revogacao = ? WHERE chave = ? AND status = 'ativa'")
    .bind(motivo, chave).run();
}
