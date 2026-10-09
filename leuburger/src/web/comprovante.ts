// Comprovante de venda (não fiscal): impressão térmica (58/80 mm) e texto para o WhatsApp.
import { brl, FORMAS } from '../regras/pedido';
import { dataHora } from './api';
import type { Empresa } from './sessao';

export interface VendaCompleta {
  id: string; numero: number; subtotal: number; desconto: number; total: number; troco: number; status: string; criado_em: string;
  operador: string | null; cliente: string | null; cliente_telefone?: string | null; observacao: string | null; motivo_cancelamento?: string | null; cancelada_em?: string | null; cancelada_por_nome?: string | null;
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
    <div>Pedido #${v.numero} · ${dataHora(v.criado_em)}</div>${v.cliente ? `<div>Cliente: ${esc(v.cliente)}</div>` : ''}<hr>
    <table style="width:100%">${linhas}</table><hr>
    <table style="width:100%"><tr><td>Subtotal</td><td class="d">${brl(v.subtotal)}</td></tr>${v.desconto ? `<tr><td>Desconto</td><td class="d">-${brl(v.desconto)}</td></tr>` : ''}
    <tr class="b"><td>TOTAL</td><td class="d">${brl(v.total)}</td></tr>
    ${v.pagamentos.map((p) => `<tr><td>${FORMAS[p.forma as keyof typeof FORMAS] || p.forma}</td><td class="d">${brl(p.valor)}</td></tr>`).join('')}
    ${v.troco ? `<tr><td>Troco</td><td class="d">${brl(v.troco)}</td></tr>` : ''}</table>
    ${v.observacao ? `<hr><div>Obs.: ${esc(v.observacao)}</div>` : ''}
    ${v.status === 'cancelada' ? '<hr><div class="c b">*** VENDA CANCELADA ***</div>' : ''}
    <hr><div class="c">${esc(e.mensagem_cupom || 'Obrigado pela preferência!')}</div>${v.operador ? `<div class="c">Atendido por ${esc(v.operador)}</div>` : ''}<div class="c" style="font-size:10px">LeuBurger PDV · LeuName Softwares</div></div>`;
  const estilo = document.createElement('style');
  estilo.textContent = `@page { size: ${e.largura_cupom === '58' ? 58 : 80}mm auto; margin: 0; }`;
  document.head.appendChild(estilo);
  setTimeout(() => { window.print(); estilo.remove(); }, 60);
}

export function textoWhatsApp(v: VendaCompleta, e: Empresa) {
  return [`*${e.nome}*`, `Pedido #${v.numero} · ${dataHora(v.criado_em)}`, '',
    ...v.itens.map((i) => `${i.qtd}x ${i.nome}${detalhesItem(i.detalhes) ? ` (${detalhesItem(i.detalhes)})` : ''} — ${brl(i.total)}`), '',
    v.desconto ? `Desconto: -${brl(v.desconto)}` : '', `*Total: ${brl(v.total)}*`,
    `Pagamento: ${v.pagamentos.map((p) => FORMAS[p.forma as keyof typeof FORMAS] || p.forma).join(' + ')}`, v.troco ? `Troco: ${brl(v.troco)}` : '', '',
    e.mensagem_cupom || 'Obrigado pela preferência!', '_Comprovante não fiscal_'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
