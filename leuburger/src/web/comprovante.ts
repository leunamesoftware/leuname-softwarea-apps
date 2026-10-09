// Comprovante de venda (não fiscal): impressão térmica (58/80 mm) e texto para o WhatsApp.
import { brl, FORMAS } from '../regras/pedido';
import { dataHora } from './api';
import type { Empresa } from './sessao';

export interface VendaCompleta {
  id: string; numero: number; subtotal: number; desconto: number; total: number; troco: number; status: string; criado_em: string;
  operador: string | null; cliente: string | null; cliente_telefone?: string | null; tipo?: string; endereco_entrega?: string | null; taxa_entrega?: number; andamento?: string; token_cliente?: string | null; token_entregador?: string | null; observacao: string | null; motivo_cancelamento?: string | null; cancelada_em?: string | null; cancelada_por_nome?: string | null;
  itens: { id: string; nome: string; foto_id?: string | null; icone?: string | null; qtd: number; preco_unit: number; total: number; produto_id: string | null; detalhes: { tamanho?: string; adicionais?: { nome: string; preco: number }[]; retirar?: string[]; observacao?: string } }[];
  pagamentos: { forma: string; valor: number }[];
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const detalhesItem = (d: VendaCompleta['itens'][0]['detalhes']) => [d.tamanho && d.tamanho !== 'Padrão' ? d.tamanho : '', (d.adicionais || []).map((a) => a.nome).join(', '), (d.retirar || []).map((r) => 'Sem ' + r.toLowerCase()).join(', '), d.observacao || ''].filter(Boolean).join(' · ');

export function imprimirComprovante(v: VendaCompleta, e: Empresa) {
  const linhas = v.itens.map((i) => `<tr><td colspan="2">${i.qtd} x ${esc(i.nome)}</td></tr>${detalhesItem(i.detalhes) ? `<tr><td colspan="2">&nbsp; ${esc(detalhesItem(i.detalhes))}</td></tr>` : ''}<tr><td>&nbsp; ${brl(i.preco_unit)} cada</td><td class="d">${brl(i.total)}</td></tr>`).join('');
  const el = document.getElementById('cupom')!;
  el.innerHTML = `<div class="cupom l${e.largura_cupom === '58' ? 58 : 80}">
    <div class="c b">${esc(e.nome)}</div>${e.cnpj ? `<div class="c">CNPJ ${esc(e.cnpj)}</div>` : ''}${e.endereco ? `<div class="c">${esc(e.endereco)}${e.cidade ? ' - ' + esc(e.cidade) : ''}</div>` : ''}${e.telefone ? `<div class="c">${esc(e.telefone)}</div>` : ''}
    <hr><div class="c b">COMPROVANTE DE VENDA</div><div class="c">NÃO É DOCUMENTO FISCAL</div><hr>
    <div>Pedido #${v.numero} · ${dataHora(v.criado_em)}</div>${v.tipo === 'entrega' ? `<hr><div class="c b">*** ENTREGA ***</div>${v.cliente ? `<div class="b">${esc(v.cliente)}</div>` : ''}${v.cliente_telefone ? `<div>Tel.: ${esc(v.cliente_telefone)}</div>` : ''}<div class="b">${esc(v.endereco_entrega)}</div>` : v.cliente ? `<div>Cliente: ${esc(v.cliente)}</div>` : ''}<hr>
    <table style="width:100%">${linhas}</table><hr>
    <table style="width:100%"><tr><td>Subtotal</td><td class="d">${brl(v.subtotal)}</td></tr>${v.desconto ? `<tr><td>Desconto</td><td class="d">-${brl(v.desconto)}</td></tr>` : ''}${v.taxa_entrega ? `<tr><td>Taxa de entrega</td><td class="d">${brl(v.taxa_entrega)}</td></tr>` : ''}
    <tr class="b"><td>TOTAL</td><td class="d">${brl(v.total)}</td></tr>
    ${v.pagamentos.map((p) => `<tr><td>${FORMAS[p.forma as keyof typeof FORMAS] || p.forma}</td><td class="d">${brl(p.valor)}</td></tr>`).join('')}
    ${v.troco ? `<tr><td>Troco</td><td class="d">${brl(v.troco)}</td></tr>` : ''}</table>
    ${v.observacao ? `<hr><div>Obs.: ${esc(v.observacao)}</div>` : ''}
    ${v.status === 'cancelada' ? '<hr><div class="c b">*** VENDA CANCELADA ***</div>' : ''}
    <hr><div class="c">${esc(e.mensagem_cupom || 'Obrigado pela preferência!')}</div>${v.operador ? `<div class="c">Atendido por ${esc(v.operador)}</div>` : ''}</div>`;
  const estilo = document.createElement('style');
  estilo.textContent = `@page { size: ${e.largura_cupom === '58' ? 58 : 80}mm auto; margin: 0; }`;
  document.head.appendChild(estilo);
  setTimeout(() => { window.print(); estilo.remove(); }, 60);
}

export function textoWhatsApp(v: VendaCompleta, e: Empresa) {
  const linhas: (string | false)[] = [`*${e.nome}*`, `Pedido #${v.numero} · ${dataHora(v.criado_em)}`, '',
    ...v.itens.map((i) => `${i.qtd}x ${i.nome}${detalhesItem(i.detalhes) ? ` (${detalhesItem(i.detalhes)})` : ''} — ${brl(i.total)}`), '',
    v.desconto > 0 && `Desconto: -${brl(v.desconto)}`, Boolean(v.taxa_entrega) && `Taxa de entrega: ${brl(v.taxa_entrega!)}`, `*Total: ${brl(v.total)}*`,
    `Pagamento: ${v.pagamentos.map((p) => FORMAS[p.forma as keyof typeof FORMAS] || p.forma).join(' + ')}`, v.troco > 0 && `Troco: ${brl(v.troco)}`,
    v.tipo === 'entrega' && `Entrega: ${v.endereco_entrega}`,
    Boolean(v.token_cliente) && `\nAcompanhe seu pedido: ${location.origin}/p/${v.token_cliente}`, '',
    e.mensagem_cupom || 'Obrigado pela preferência!', '_Comprovante não fiscal_'];
  return linhas.filter((l): l is string => l !== false).join('\n');
}
