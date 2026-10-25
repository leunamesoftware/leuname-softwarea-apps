// Coisas comuns às telas do ERP: dados carregados, chamadas ao servidor e formatação.
import { tabelaProduto, contaKit, precoMinimo, acima90 } from './precos.js';

export const B = { E: null, D: null, api: null, post: null, recarregar: null, desenhar: [] };

export const $ = (s) => document.querySelector(s);
export const brl = (v) => (v == null || Number.isNaN(v) ? '–' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const lerNum = (v) => { const t = String(v ?? '').trim(); if (!t) return null; return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); };
export const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
export const dataCurta = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
export const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const fotoUrl = (k) => (k ? `/fotos/${encodeURIComponent(k)}` : null);
export const kg = (v) => `${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;

export const STATUS = { UNPAID: 'Aguardando pagamento', READY_TO_SHIP: 'A enviar', PROCESSED: 'Pronto para etiqueta', RETRY_SHIP: 'Reenviar', SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A caminho', COMPLETED: 'Concluído', IN_CANCEL: 'Cancelando', CANCELLED: 'Cancelado', TO_RETURN: 'Devolução', INVALID: 'Inválido' };
export const ENVIO = { a_preparar: 'Preparar envio', pronto: 'Imprimir etiqueta', etiqueta_impressa: 'Etiqueta impressa', enviado: 'Enviado' };

/** Pedido que conta como venda (pago e não cancelado). */
export const vendaValida = (p) => !['UNPAID', 'CANCELLED', 'IN_CANCEL', 'INVALID'].includes(p.status);

export function aviso(txt, ok = true) {
  const el = document.createElement('div'); el.className = `toast ${ok ? 'bom' : 'ruim'}`; el.textContent = txt;
  document.body.append(el); setTimeout(() => el.remove(), 3800);
}
export function abrirAba(a) { document.querySelector(`.abas button[data-aba="${a}"]`)?.click(); }

/** Custo e sobra de um SKU com os custos da aba 🧾 Custos. */
export function contaSku(s, D = B.D) {
  const sabores = JSON.parse(s.sabores);
  const cpgs = sabores.map((id) => D.produtos.find((p) => p.id === id)).filter(Boolean)
    .map((p) => tabelaProduto(p, D.insumos, D.config, [], D.produtos).cpg);
  const cpg = cpgs.length ? cpgs.reduce((a, b) => a + b, 0) / cpgs.length : 0;
  const base = contaKit(0, s.unidades, s.gramas, cpg, D.config);
  const custo = base.tempero + base.saquinhos + base.kit;
  const minimo = precoMinimo(custo, D.config);
  return { custo, minimo, sugerido: acima90(minimo * 1.3), conta: s.preco > 0 ? contaKit(s.preco, s.unidades, s.gramas, cpg, D.config) : null };
}

export function opcoesSku(sel = '') {
  return B.E.skus.filter((s) => s.ativo).map((s) => `<option value="${s.id}" data-preco="${s.preco ?? ''}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}${s.preco ? ' · ' + brl(s.preco) : ''}</option>`).join('');
}

/** Gráfico de barras simples (SVG) com rótulos nos dias. */
export function barras(valores, rotulos, { altura = 170, cor = '#6B1420', formato = brl } = {}) {
  const W = 640, H = altura, E = 8, T = 18, Bm = 24;
  const max = Math.max(1, ...valores), n = valores.length, larg = (W - E * 2) / n;
  return `<svg viewBox="0 0 ${W} ${H}" class="graf barras" role="img" aria-label="Gráfico de vendas">
    ${valores.map((v, i) => { const h = (v / max) * (H - T - Bm); const x = E + i * larg + larg * 0.15, y = H - Bm - h;
      return `<rect x="${x}" y="${y}" width="${larg * 0.7}" height="${Math.max(h, v ? 2 : 0)}" rx="3" fill="${cor}"><title>${rotulos[i]}: ${formato(v)}</title></rect>`; }).join('')}
    <line x1="${E}" x2="${W - E}" y1="${H - Bm}" y2="${H - Bm}" class="base"/>
    ${rotulos.map((r, i) => { const passo = Math.ceil(n / 8); return (i % passo === 0 && n - 1 - i >= passo / 2) || i === n - 1; }).map((mostra, i) => (mostra ? `<text x="${E + i * larg + larg / 2}" y="${H - 7}" class="eixo" text-anchor="middle">${rotulos[i]}</text>` : '')).join('')}
    <text x="${W - E}" y="${T - 4}" class="eixo" text-anchor="end">máx. ${formato(max)}</text>
  </svg>`;
}

/** Abre uma janela só para imprimir (etiquetas, declaração, lista de separação). */
export function imprimir(titulo, corpoHtml, css = '') {
  const w = window.open('', '_blank');
  if (!w) { aviso('Libere as janelas (pop-up) para imprimir.', false); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0}${css}
    .barra{padding:10px;background:#f3f3f3;text-align:center}.barra button{font-size:16px;padding:8px 18px}
    @media print{.barra{display:none}}</style></head><body><div class="barra"><button onclick="print()">🖨️ Imprimir</button></div>${corpoHtml}
    <script>addEventListener('load',()=>setTimeout(()=>{focus();print()},250))<\/script></body></html>`);
  w.document.close();
}

/** Linha de produto + quantidade (+ preço) nos formulários de produção e de venda. */
export function linhaItem(preco = false) {
  return `<div class="linha-item"><select name="sku" aria-label="Produto">${opcoesSku()}</select><input name="qtd" inputmode="numeric" placeholder="Qtd" aria-label="Quantidade">${preco ? '<input name="preco" inputmode="decimal" placeholder="R$ cada" aria-label="Preço de cada">' : ''}<button type="button" class="x" aria-label="Tirar">×</button></div>`;
}
export const lerItens = (caixa) => [...caixa.querySelectorAll('.linha-item')].map((l) => ({ sku: l.querySelector('[name=sku]').value, qtd: lerNum(l.querySelector('[name=qtd]').value), preco: lerNum(l.querySelector('[name=preco]')?.value) })).filter((i) => i.qtd > 0);
