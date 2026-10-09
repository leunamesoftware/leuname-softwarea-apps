// Quem pode fazer o quê. Usado pelo servidor (que é quem decide) e pelo app (para esconder o que não pode).
export type Papel = 'admin' | 'gerente' | 'caixa';

export const PAPEIS: Record<Papel, { nome: string; resumo: string }> = {
  admin: { nome: 'Administrador', resumo: 'Acesso total' },
  gerente: { nome: 'Gerente', resumo: 'Relatórios, produtos, estoque e cancelamentos' },
  caixa: { nome: 'Caixa', resumo: 'Frente de caixa e pedidos' },
};

const REGRAS = {
  vender: ['admin', 'gerente', 'caixa'],
  caixa: ['admin', 'gerente', 'caixa'],          // abrir, sangria, suprimento, fechar
  verPedidos: ['admin', 'gerente', 'caixa'],
  clientes: ['admin', 'gerente', 'caixa'],
  cancelarVenda: ['admin', 'gerente'],
  descontoLivre: ['admin', 'gerente'],           // caixa só até o limite da configuração
  produtos: ['admin', 'gerente'],
  estoque: ['admin', 'gerente'],
  relatorios: ['admin', 'gerente'],
  painel: ['admin', 'gerente'],
  usuarios: ['admin'],
  configuracoes: ['admin'],
} as const satisfies Record<string, readonly Papel[]>;

export type Acao = keyof typeof REGRAS;
export const pode = (papel: Papel | undefined | null, acao: Acao) => Boolean(papel && (REGRAS[acao] as readonly string[]).includes(papel));
