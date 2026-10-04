// Planos à venda e o que cada um libera.
export const RECEITAS_GRATIS = 2;

export const PLANOS = {
  basico: { preco: 9.99, receitas: 30, titulo: 'Quanto Cobrar Básico — 30 receitas + calculadora (vitalício)' },
  anual: { preco: 29.9, receitas: Infinity, dias: 366, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (1 ano)' },
  // Só para o dono testar a compra de verdade (link direto /comprar?plano=teste); não aparece para clientes.
  teste: { preco: 1, receitas: Infinity, dias: 1, titulo: 'Quanto Cobrar — teste de compra (1 dia)' },
  mensal: { preco: 2.99, receitas: Infinity, dias: 33, assinatura: true, titulo: 'Quanto Cobrar Pro — todas as receitas + calculadora (mensal)' },
};

/** O que a chave libera agora. Sem linha em "acessos" (chave manual) = tudo. */
export async function acessoDaChave(env, chave) {
  const a = await env.DB.prepare('SELECT plano, expira_em FROM acessos WHERE chave = ?').bind(chave).first();
  if (!a) return { plano: 'completo', receitas: Infinity };
  const venceu = Boolean(a.expira_em && a.expira_em < new Date().toISOString());
  return { plano: a.plano, expiraEm: a.expira_em, venceu, receitas: venceu ? RECEITAS_GRATIS : PLANOS[a.plano]?.receitas ?? Infinity };
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
