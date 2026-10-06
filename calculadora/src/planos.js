import { emitirLicenca } from './licencas.js';
import { brindeDoEmail } from './brindes.js';

// Planos à venda e o que cada um libera.
export const RECEITAS_GRATIS = 2;

// app: de qual aplicativo é a compra. licenca: app_id da chave no servidor de licenças.
export const PLANOS = {
  basico: { preco: 9.99, receitas: 30, titulo: 'Quanto Cobrar Básico — 30 receitas + calculadora (vitalício)' },
  anual: { preco: 29.9, receitas: Infinity, dias: 366, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (1 ano)' },
  // Só para o dono testar a compra de verdade (link direto /comprar?plano=teste); não aparece para clientes.
  teste: { preco: 1, receitas: Infinity, dias: 1, titulo: 'Quanto Cobrar — teste de compra (1 dia)' },
  mensal: { preco: 2.99, receitas: Infinity, dias: 33, assinatura: true, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (mensal)' },
  // Outros apps da LeuApps: mensal (cartão, renova sozinho), anual ou pagamento único (é seu para sempre).
  // O acesso fica na conta do cliente (e-mail + senha); a chave é só controle interno.
  gestacell: { app: 'gestacell', licenca: 'leuname-gestao', preco: 49.9, parcelas: 3, titulo: 'Gestacell — pagamento único (para sempre)' },
  gestacell_anual: { app: 'gestacell', licenca: 'leuname-gestao', preco: 39.9, dias: 366, parcelas: 3, titulo: 'Gestacell — plano anual' },
  gestacell_mensal: { app: 'gestacell', licenca: 'leuname-gestao', preco: 19.9, dias: 33, assinatura: true, titulo: 'Gestacell — plano mensal' },
  radar: { app: 'radar', licenca: 'radar-preventivo', preco: 39.9, parcelas: 3, titulo: 'Radar Preventivo — pagamento único (para sempre)' },
  radar_anual: { app: 'radar', licenca: 'radar-preventivo', preco: 29.9, dias: 366, parcelas: 3, titulo: 'Radar Preventivo — plano anual' },
  radar_mensal: { app: 'radar', licenca: 'radar-preventivo', preco: 9.9, dias: 33, assinatura: true, titulo: 'Radar Preventivo — plano mensal' },
};
for (const p of Object.values(PLANOS)) p.app ||= 'quantocobrar';
const PLANOS_RECEITAS = Object.keys(PLANOS).filter((k) => PLANOS[k].app === 'quantocobrar');

// Tolerância depois do vencimento: o cliente tem até o dia seguinte para pagar.
const TOLERANCIA_MS = 864e5;

function avaliar(a) {
  const venceu = Boolean(a.expira_em && new Date(a.expira_em).getTime() + TOLERANCIA_MS < Date.now());
  return { plano: a.plano, expiraEm: a.expira_em, venceu, receitas: venceu ? 0 : PLANOS[a.plano]?.receitas ?? Infinity };
}

/** O que a chave libera agora. Sem linha em "acessos" (chave manual) = tudo. */
export async function acessoDaChave(env, chave) {
  const a = await env.DB.prepare('SELECT plano, expira_em FROM acessos WHERE chave = ?').bind(chave).first();
  return a ? avaliar(a) : { plano: 'completo', receitas: Infinity };
}

// Teste grátis único: 2 dias com 2 receitas e a calculadora, contados da criação da conta. Depois, só com compra.
export const DIAS_TESTE = 2;
export const RECEITAS_POR_PACOTE = 30;

/**
 * O que a conta libera agora:
 * - Pro (anual/mensal) em dia → todas as receitas;
 * - pacotes Básico (pagamento único, vitalício) → 30 receitas por pacote comprado (somam);
 * - sem compra → teste grátis de 2 dias (2 receitas); depois, bloqueado até comprar.
 */
export async function acessoDaConta(env, contaId) {
  const conta = await env.DB.prepare('SELECT email, criado_em, sem_teste FROM contas WHERE id = ?').bind(contaId).first();
  // O dono tem tudo liberado, sempre, sem comprar nem vencer.
  if (eDono(env, conta?.email)) return { plano: 'dono', receitas: Infinity };
  // Presente do dono para este e-mail: Pro completo sem comprar.
  const brinde = conta?.email ? await brindeDoEmail(env, conta.email) : null;
  if (brinde) return brinde;
  const { results: todasCompras } = await env.DB.prepare("SELECT a.plano, a.expira_em FROM pedidos p JOIN acessos a ON a.chave = p.chave WHERE p.conta_id = ? AND p.status = 'pago'")
    .bind(contaId).all();
  const compras = todasCompras.filter((x) => PLANOS_RECEITAS.includes(x.plano)).map(avaliar);
  const pro = compras.filter((x) => x.receitas === Infinity).sort((x, y) => String(y.expiraEm || '9999').localeCompare(String(x.expiraEm || '9999')));
  const proAtivo = pro.find((x) => !x.venceu);
  if (proAtivo) return proAtivo;
  const pacotes = compras.filter((x) => x.plano === 'basico').length;
  if (pacotes) return { plano: 'basico', pacotes, receitas: pacotes * RECEITAS_POR_PACOTE };
  if (pro.length) return { ...pro[0], receitas: 0, bloqueado: true };
  // Aparelho ou rede que já usou o teste: sem teste grátis.
  if (conta?.sem_teste) return { plano: 'gratis', receitas: 0, bloqueado: true, semTeste: true };
  const testeAte = new Date(new Date(conta?.criado_em || Date.now()).getTime() + DIAS_TESTE * 864e5).toISOString();
  return new Date(testeAte) > new Date()
    ? { plano: 'gratis', receitas: RECEITAS_GRATIS, testeAte }
    : { plano: 'gratis', receitas: 0, testeAte, bloqueado: true };
}

/** Grava o plano da chave; planos com prazo somam dias a partir do maior entre hoje e o vencimento atual. */
export async function aplicarPlano(env, chave, plano) {
  const p = PLANOS[plano];
  const agora = new Date();
  let expira = null;
  if (p.dias) {
    const atual = await env.DB.prepare('SELECT expira_em FROM acessos WHERE chave = ?').bind(chave).first();
    const base = atual?.expira_em && new Date(atual.expira_em) > agora ? new Date(atual.expira_em) : agora;
    expira = new Date(base.getTime() + p.dias * 864e5).toISOString();
  }
  await env.DB.prepare(`INSERT INTO acessos (chave, plano, expira_em, atualizado_em) VALUES (?, ?, ?, ?)
    ON CONFLICT(chave) DO UPDATE SET plano = excluded.plano, expira_em = excluded.expira_em, atualizado_em = excluded.atualizado_em`)
    .bind(chave, plano, expira, agora.toISOString()).run();
}

export const eDono = (env, email) => Boolean(email && env.DONO_EMAIL && String(email).toLowerCase() === env.DONO_EMAIL.toLowerCase());

/** Licença vitalícia do dono para um app (criada uma vez, reaproveitada depois). */
async function licencaDoDono(env, appId) {
  const l = await env.LICDB.prepare("SELECT chave FROM licencas WHERE app_id = ? AND cliente_contato = ? AND origem = 'dono' AND status = 'ativa' LIMIT 1")
    .bind(appId, env.DONO_EMAIL).first();
  return l?.chave || emitirLicenca(env, 'Dono (LeuName Softwares)', env.DONO_EMAIL, appId, 'dono');
}

// Teste grátis dos outros apps (um por conta em cada app). O Quanto Cobrar tem o teste dele (2 dias).
export const TESTE_DIAS = { gestacell: 7, radar: 7 };
const fimDoTeste = (inicio, app) => new Date(new Date(inicio).getTime() + TESTE_DIAS[app] * 864e5).toISOString();

/** Testes que a conta já começou: { gestacell: { inicio, expiraEm, acabou } }. */
export async function testesDaConta(env, contaId) {
  if (!contaId) return {};
  const { results } = await env.DB.prepare('SELECT app, inicio FROM testes_apps WHERE conta_id = ?').bind(contaId).all();
  const testes = {};
  for (const r of results) {
    if (!TESTE_DIAS[r.app]) continue;
    const expiraEm = fimDoTeste(r.inicio, r.app);
    testes[r.app] = { inicio: r.inicio, expiraEm, acabou: new Date(expiraEm).getTime() < Date.now() };
  }
  return testes;
}

/** Começa o teste grátis do app (só na primeira vez; depois devolve o mesmo teste, mesmo que já tenha acabado). */
export async function comecarTeste(env, contaId, app) {
  if (!TESTE_DIAS[app]) return null;
  await env.DB.prepare('INSERT OR IGNORE INTO testes_apps (conta_id, app, inicio) VALUES (?, ?, ?)').bind(contaId, app, new Date().toISOString()).run();
  return (await testesDaConta(env, contaId))[app] || null;
}

/** Licenças vitalícias dos outros apps que a conta comprou: { gestacell: { chave }, radar: { chave } }. O dono tem todas. */
export async function appsDaConta(env, contaId, email) {
  if (eDono(env, email)) {
    const apps = {};
    // Um app com problema na licença não pode tirar os outros do dono.
    for (const p of Object.values(PLANOS)) {
      if (!p.licenca || apps[p.app]) continue;
      try { apps[p.app] = { chave: await licencaDoDono(env, p.licenca) }; } catch (e) { console.error('licença do dono', p.licenca, e?.message); }
    }
    return apps;
  }
  // Mensal e anual valem até vencer (com 1 dia de tolerância); pagamento único vale para sempre.
  const { results } = await env.DB.prepare(`SELECT p.plano, p.chave, a.expira_em FROM pedidos p LEFT JOIN acessos a ON a.chave = p.chave
    WHERE p.conta_id = ? AND p.status = 'pago' AND p.chave IS NOT NULL ORDER BY p.criado_em`).bind(contaId).all();
  const apps = {};
  for (const r of results) {
    const app = PLANOS[r.plano]?.app;
    if (!app || app === 'quantocobrar') continue;
    if (r.expira_em && avaliar({ plano: r.plano, expira_em: r.expira_em }).venceu) continue;
    // O plano sem vencimento (único) ganha de um plano com prazo.
    if (apps[app] && !apps[app].expiraEm) continue;
    apps[app] = { chave: r.chave, plano: r.plano, expiraEm: r.expira_em || null };
  }
  // Sem compra valendo: o teste grátis (enquanto não acabar) também libera o app.
  const testes = await testesDaConta(env, contaId);
  for (const [app, t] of Object.entries(testes)) if (!apps[app] && !t.acabou) apps[app] = { teste: true, expiraEm: t.expiraEm };
  return apps;
}
