// Cardápio (produtos e categorias) e cálculo do pedido no aparelho (o servidor confere tudo de novo).
import { calcularItem, totais, type ItemCalculado, type Opcoes } from '../regras/pedido';
import { get } from './api';
import type { ItemCarrinho, Pedido } from './sessao';

export interface Categoria { id: string; nome: string; icone: string; ordem: number; qtd_produtos: number }
export interface Produto {
  id: string; nome: string; descricao: string | null; codigo: string | null; categoria_id: string; categoria: string | null; categoria_icone: string | null;
  preco: number; custo: number; foto_id: string | null; opcoes: Opcoes; receita: { item_id: string; qtd: number }[]; ativo: boolean;
}
export async function carregarCardapio() {
  const [p, c] = await Promise.all([get<{ produtos: Produto[] }>('/produtos'), get<{ categorias: Categoria[] }>('/categorias')]);
  return { produtos: p.produtos, categorias: c.categorias };
}
export const temOpcoes = (p: Produto) => Boolean(p.opcoes?.tamanhos?.length || p.opcoes?.adicionais?.length || p.opcoes?.retirar?.length);

export type Linha = ItemCalculado & { chaveItem: string; produto: Produto };
/** Calcula o carrinho com os preços do cardápio; itens que saíram do cardápio ficam marcados. */
export function calcularPedido(pedido: Pedido, produtos: Produto[]) {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const linhas: Linha[] = [], invalidos: ItemCarrinho[] = [];
  for (const i of pedido.itens) {
    const p = porId.get(i.produtoId);
    if (!p || !p.ativo) { invalidos.push(i); continue; }
    try { linhas.push({ ...calcularItem(p, i), chaveItem: i.chaveItem, produto: p }); } catch { invalidos.push(i); }
  }
  const taxa = pedido.entrega?.taxa || 0;
  let t = { subtotal: 0, desconto: 0, taxaEntrega: 0, total: 0 };
  try { t = totais(linhas, pedido.desconto, taxa); } catch { t = totais(linhas, null, taxa > 0 && taxa <= 100000 ? taxa : 0); }
  return { linhas, invalidos, ...t, qtdItens: linhas.reduce((s, l) => s + l.qtd, 0) };
}
/** Texto curto das escolhas (ex.: "Queijo extra, Bacon extra · Sem cebola"). */
export function textoEscolhas(d: Linha['detalhes']) {
  const partes = [d.tamanho && d.tamanho !== 'Padrão' ? d.tamanho : '', d.adicionais.map((a) => a.nome).join(', '), d.retirar.map((r) => 'Sem ' + r.toLowerCase()).join(', ')].filter(Boolean);
  return partes.join(' · ') + (d.observacao ? (partes.length ? ' · ' : '') + d.observacao : '');
}
