// Planos à venda e o que cada um libera.
export const RECEITAS_GRATIS = 2;

// app: de qual aplicativo é a compra. licenca: app_id da chave no servidor de licenças.
export const PLANOS = {
  basico: { preco: 9.99, receitas: 30, titulo: 'Quanto Cobrar Básico — 30 receitas + calculadora (vitalício)' },
  anual: { preco: 29.9, receitas: Infinity, dias: 366, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (1 ano)' },
  // Só para o dono testar a compra de verdade (link direto /comprar?plano=teste); não aparece para clientes.
  teste: { preco: 1, receitas: Infinity, dias: 1, titulo: 'Quanto Cobrar — teste de compra (1 dia)' },
  mensal: { preco: 2.99, receitas: Infinity, dias: 33, assinatura: true, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (mensal)' },
  // Outros apps da LeuApps: pagamento único, licença vitalícia (atualizações futuras são vendidas à parte).
  gestacell: { app: 'gestacell', licenca: 'leuname-gestao', preco: 30, parcelas: 3, titulo: 'Gestacell — licença vitalícia (pagamento único)' },
  radar: { app: 'radar', licenca: 'radar-preventivo', preco: 20, parcelas: 2, titulo: 'Radar Preventivo — licença vitalícia (pagamento único)' },
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
  const conta = await env.DB.prepare('SELECT criado_em FROM contas WHERE id = ?').bind(contaId).first();
  const { results: todasCompras } = await env.DB.prepare("SELECT a.plano, a.expira_em FROM pedidos p JOIN acessos a ON a.chave = p.chave WHERE p.conta_id = ? AND p.status = 'pago'")
    .bind(contaId).all();
  const compras = todasCompras.filter((x) => PLANOS_RECEITAS.includes(x.plano)).map(avaliar);
  const pro = compras.filter((x) => x.receitas === Infinity).sort((x, y) => String(y.expiraEm || '9999').localeCompare(String(x.expiraEm || '9999')));
  const proAtivo = pro.find((x) => !x.venceu);
  if (proAtivo) return proAtivo;
  const pacotes = compras.filter((x) => x.plano === 'basico').length;
  if (pacotes) return { plano: 'basico', pacotes, receitas: pacotes * RECEITAS_POR_PACOTE };
  if (pro.length) return { ...pro[0], receitas: 0, bloqueado: true };
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

/** Licenças vitalícias dos outros apps que a conta comprou: { gestacell: { chave }, radar: { chave } }. */
export async function appsDaConta(env, contaId) {
  const { results } = await env.DB.prepare("SELECT plano, chave FROM pedidos WHERE conta_id = ? AND status = 'pago' AND chave IS NOT NULL ORDER BY criado_em")
    .bind(contaId).all();
  const apps = {};
  for (const r of results) {
    const app = PLANOS[r.plano]?.app;
    if (app && app !== 'quantocobrar') apps[app] = { chave: r.chave };
  }
  return apps;
}
