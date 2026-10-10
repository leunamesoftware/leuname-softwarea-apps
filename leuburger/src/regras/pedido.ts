// Regras do pedido: preço de cada item, totais, desconto e pagamento.
// Tudo em centavos (inteiros) para não ter erro de arredondamento. Usado pelo app e pelo servidor:
// o servidor recalcula tudo e nunca confia no total que veio do navegador.

export const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão Débito', credito: 'Cartão Crédito' } as const;
export type Forma = keyof typeof FORMAS;

export interface Opcoes {
  tamanhos?: { nome: string; preco: number }[]; // preço do tamanho substitui o preço base
  adicionais?: { nome: string; preco: number }[];
  retirar?: string[];
  /** Grupos de escolha (como no iFood): “Condimentos — escolha de 3 a 7”, “Cobertura — escolha 1”. */
  grupos?: GrupoOpcao[];
}
export interface GrupoOpcao {
  nome: string;
  min: number; // 0 = opcional
  max: number; // quantas escolhas no total (contando repetições)
  repetir?: boolean; // pode pedir 2x o mesmo item (mostra − 1 +)
  itens: { nome: string; preco: number }[];
}

export interface ProdutoPreco {
  id: string;
  nome: string;
  preco: number;
  custo?: number;
  opcoes?: Opcoes;
}

export interface EscolhaItem {
  produtoId: string;
  qtd: number;
  tamanho?: string | null;
  adicionais?: string[];
  retirar?: string[];
  observacao?: string;
  /** Escolhas dos grupos: [{ grupo, item, qtd }]. Ausente = venda do caixa (não confere mínimos). */
  escolhas?: { grupo: string; item: string; qtd: number }[];
}

export interface ItemCalculado {
  produtoId: string;
  nome: string;
  qtd: number;
  precoUnit: number;
  custoUnit: number;
  total: number;
  detalhes: { tamanho?: string; adicionais: { nome: string; preco: number }[]; retirar: string[]; observacao?: string };
}

export class ErroPedido extends Error {}

export const centavos = (reais: number) => Math.round(reais * 100);
export function brl(c: number): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
/** "12,50" ou "12.50" → 1250. Texto inválido → NaN. */
export function lerValor(texto: string): number {
  const t = String(texto ?? '').trim().replace(/\s|R\$/g, '');
  if (!t) return 0;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return NaN;
  return Math.round(Number(normal) * 100);
}

/** Preço de uma unidade do item com tamanho e adicionais escolhidos (confere se as opções existem). */
export function calcularItem(p: ProdutoPreco, e: EscolhaItem): ItemCalculado {
  const qtd = Number(e.qtd);
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > 999) throw new ErroPedido(`Quantidade inválida em ${p.nome}.`);
  const op = p.opcoes || {};
  let base = p.preco;
  let tamanho: string | undefined;
  if (e.tamanho) {
    const t = (op.tamanhos || []).find((x) => x.nome === e.tamanho);
    if (!t) throw new ErroPedido(`Tamanho "${e.tamanho}" não existe em ${p.nome}.`);
    base = t.preco; tamanho = t.nome;
  }
  const adicionais = (e.adicionais || []).map((nome) => {
    const a = (op.adicionais || []).find((x) => x.nome === nome);
    if (!a) throw new ErroPedido(`Adicional "${nome}" não existe em ${p.nome}.`);
    return { nome: a.nome, preco: a.preco };
  });
  // Grupos: confere se o item existe, o mínimo e o máximo de cada grupo. As escolhas entram como adicionais
  // (assim aparecem no pedido da loja, no comprovante e para o cliente sem mudar mais nada).
  if (e.escolhas !== undefined) {
    for (const g of op.grupos || []) {
      const doGrupo = e.escolhas.filter((x) => x.grupo === g.nome);
      let n = 0;
      for (const x of doGrupo) {
        const it = g.itens.find((i) => i.nome === x.item);
        const q = Number(x.qtd);
        if (!it) throw new ErroPedido(`"${x.item}" não existe em ${g.nome}.`);
        if (!Number.isInteger(q) || q < 1 || (!g.repetir && q > 1)) throw new ErroPedido(`Quantidade inválida em ${g.nome}.`);
        n += q;
        adicionais.push({ nome: q > 1 ? `${q}x ${it.nome}` : it.nome, preco: it.preco * q });
      }
      if (n < (g.min || 0)) throw new ErroPedido(g.min === 1 ? `Escolha 1 opção em ${g.nome}.` : `Escolha pelo menos ${g.min} em ${g.nome}.`);
      if (n > g.max) throw new ErroPedido(`Escolha no máximo ${g.max} em ${g.nome}.`);
    }
    for (const x of e.escolhas) if (!(op.grupos || []).some((g) => g.nome === x.grupo)) throw new ErroPedido(`Opção "${x.grupo}" não existe em ${p.nome}.`);
  }
  const retirar = (e.retirar || []).filter((r) => (op.retirar || []).includes(r));
  const precoUnit = base + adicionais.reduce((s, a) => s + a.preco, 0);
  if (precoUnit < 0) throw new ErroPedido(`Preço inválido em ${p.nome}.`);
  const observacao = (e.observacao || '').trim().slice(0, 150) || undefined;
  return {
    produtoId: p.id, nome: p.nome, qtd, precoUnit, custoUnit: p.custo || 0, total: precoUnit * qtd,
    detalhes: { tamanho, adicionais, retirar, observacao },
  };
}

export interface Desconto { tipo: 'valor' | 'pct'; valor: number } // valor em centavos ou % (0–100)

/** Subtotal, desconto e total. O desconto nunca passa do subtotal nem fica negativo. */
/** Total do pedido. O desconto vale só sobre os produtos; a taxa de entrega soma no fim. */
export function totais(itens: { total: number }[], desconto?: Desconto | null, taxaEntrega = 0) {
  const subtotal = itens.reduce((s, i) => s + i.total, 0);
  let d = 0;
  if (desconto && desconto.valor > 0) {
    if (desconto.tipo === 'pct') {
      if (desconto.valor > 100) throw new ErroPedido('Desconto acima de 100%.');
      d = Math.round((subtotal * desconto.valor) / 100);
    } else d = Math.round(desconto.valor);
  }
  if (d < 0) throw new ErroPedido('Desconto não pode ser negativo.');
  d = Math.min(d, subtotal);
  const taxa = Math.round(taxaEntrega || 0);
  if (taxa < 0 || taxa > 100000) throw new ErroPedido('Taxa de entrega inválida.');
  return { subtotal, desconto: d, taxaEntrega: taxa, total: subtotal - d + taxa };
}

/** Percentual do desconto sobre o subtotal (para conferir o limite do operador). */
export const pctDesconto = (subtotal: number, desconto: number) => (subtotal > 0 ? (desconto * 100) / subtotal : 0);

/**
 * Confere os pagamentos: só dinheiro pode passar do total (vira troco).
 * Retorna o troco ou explica o que está errado.
 */
export function conferirPagamentos(total: number, pagamentos: { forma: string; valor: number }[]) {
  if (!pagamentos.length) throw new ErroPedido('Escolha a forma de pagamento.');
  let soma = 0, dinheiro = 0;
  for (const p of pagamentos) {
    if (!(p.forma in FORMAS)) throw new ErroPedido('Forma de pagamento inválida.');
    if (!Number.isInteger(p.valor) || p.valor <= 0) throw new ErroPedido('Valor de pagamento inválido.');
    soma += p.valor;
    if (p.forma === 'dinheiro') dinheiro += p.valor;
  }
  if (soma < total) throw new ErroPedido(`Falta receber ${brl(total - soma)}.`);
  const troco = soma - total;
  if (troco > dinheiro) throw new ErroPedido('Pix e cartão não podem passar do total (troco só em dinheiro).');
  return { troco, recebido: soma };
}

/** Sugestões de notas para o valor recebido em dinheiro (ex.: total 66,70 → 66,70 · 70 · 80 · 100). */
export function sugestoesTroco(total: number): number[] {
  const s = new Set<number>([total]);
  for (const passo of [500, 1000, 2000, 5000, 10000]) s.add(Math.ceil(total / passo) * passo);
  return [...s].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 4);
}

/** Baixa de estoque de uma venda: soma por item de estoque (qtd vendida × receita do produto). */
export function baixaEstoque(itens: { produtoId: string; qtd: number }[], receitas: Record<string, { item_id: string; qtd: number }[]>) {
  const total: Record<string, number> = {};
  for (const i of itens) for (const r of receitas[i.produtoId] || []) {
    total[r.item_id] = Math.round(((total[r.item_id] || 0) + r.qtd * i.qtd) * 1000) / 1000;
  }
  return total;
}

/** Situação do estoque de um item. */
export function situacaoEstoque(qtd: number, minimo: number): 'ok' | 'baixo' | 'sem' {
  if (qtd <= 0) return 'sem';
  if (qtd <= minimo) return 'baixo';
  return 'ok';
}
