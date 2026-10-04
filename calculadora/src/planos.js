// Planos à venda e o que cada um libera.
export const RECEITAS_GRATIS = 2;

export const PLANOS = {
  basico: { preco: 9.99, receitas: 30, titulo: 'Quanto Cobrar Básico — 30 receitas + calculadora (vitalício)' },
  anual: { preco: 29.9, receitas: Infinity, dias: 366, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (1 ano)' },
  // Só para o dono testar a compra de verdade (link direto /comprar?plano=teste); não aparece para clientes.
  teste: { preco: 1, receitas: Infinity, dias: 1, titulo: 'Quanto Cobrar — teste de compra (1 dia)' },
  mensal: { preco: 2.99, receitas: Infinity, dias: 33, assinatura: true, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (mensal)' },
};

// Tolerância depois do vencimento: o cliente tem até o dia seguinte para pagar.
const TOLERANCIA_MS = 864e5;

function avaliar(a) {
  const venceu = Boolean(a.expira_em && new Date(a.expira_em).getTime() + TOLERANCIA_MS < Date.now());
  return { plano: a.plano, expiraEm: a.expira_em, venceu, receitas: venceu ? RECEITAS_GRATIS : PLANOS[a.plano]?.receitas ?? Infinity };
}

/** O que a chave libera agora. Sem linha em "acessos" (chave manual) = tudo. */
export async function acessoDaChave(env, chave) {
  const a = await env.DB.prepare('SELECT plano, expira_em FROM acessos WHERE chave = ?').bind(chave).first();
  return a ? avaliar(a) : { plano: 'completo', receitas: Infinity };
}

/** O melhor acesso entre as compras pagas da conta (ou null se ela ainda não comprou nada). */
export async function acessoDaConta(env, contaId) {
  const { results } = await env.DB.prepare("SELECT a.plano, a.expira_em FROM pedidos p JOIN acessos a ON a.chave = p.chave WHERE p.conta_id = ? AND p.status = 'pago'")
    .bind(contaId).all();
  if (!results.length) return null;
  const todos = results.map(avaliar);
  const ativos = todos.filter((x) => !x.venceu);
  const lista = ativos.length ? ativos : todos;
  lista.sort((x, y) => (y.receitas - x.receitas) || String(y.expiraEm || '9999').localeCompare(String(x.expiraEm || '9999')));
  return lista[0];
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
