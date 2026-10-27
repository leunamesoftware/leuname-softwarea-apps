// Impressão: tipo de impressora (comum A4 ou térmica de etiquetas 10×15), cartão de agradecimento com QR code
// e adesivos de lacre. A escolha da impressora fica em cada aparelho (cada computador tem a sua).
import { B, $, esc, aviso, imprimir } from './erp-base.js';

const CHAVE = 'erp-impressora';
export const impressora = () => { try { return localStorage.getItem(CHAVE) || 'termica'; } catch { return 'termica'; } };
const SITE = 'https://www.supermistotemperos.com.br';
const logo = () => `${location.origin}/logo-supermisto.png`;

/** QR code em SVG (biblioteca qrcode-generator, MIT, carregada uma vez). */
let qrPronto = null;
function carregarQr() {
  qrPronto = qrPronto || new Promise((ok, falha) => { const s = document.createElement('script'); s.src = '/qrcode.js'; s.onload = ok; s.onerror = falha; document.head.append(s); });
  return qrPronto;
}
export async function qrSvg(texto, cor = '#3E1C0E') {
  await carregarQr();
  const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(); let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="${cor}"/></svg>`;
}

/** Cartão de agradecimento colorido para ir dentro do pacote. */
async function cartao(nome = '') {
  const qr = await qrSvg(`${SITE}/receitas.html`);
  return `<section class="ct">
    <div class="ct-topo"><img src="${logo()}" alt="Supermisto"></div>
    <h1>Obrigado${nome ? ', ' + esc(nome.split(' ')[0]) : ''}!</h1>
    <p class="sub">Seus temperos foram moídos e embalados com carinho na nossa fábrica. 🌿</p>
    <div class="ct-qr"><div class="qr">${qr}</div><div><b>Receitas com os seus temperos</b><span>Aponte a câmera do celular para o código</span></div></div>
    <div class="ct-estrelas">★★★★★</div>
    <p class="aval">Gostou? <b>Avalie com 5 estrelas na Shopee</b>.<br>Isso ajuda muito a nossa pequena fábrica!</p>
    <p class="rod">100% natural · sem conservantes · supermistotemperos.com.br</p>
  </section>`;
}
const CSS_CARTAO = `.ct{width:100mm;height:148mm;padding:8mm 7mm;display:flex;flex-direction:column;align-items:center;text-align:center;
  background:linear-gradient(180deg,#FBF6EE 0%,#fff 45%);border:1.2mm solid #5A2A14;border-radius:5mm;position:relative;overflow:hidden;page-break-inside:avoid;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:'Trebuchet MS',Arial,sans-serif;color:#2B1A12}
  .ct::after{content:'';position:absolute;left:0;right:0;bottom:0;height:9mm;background:#5A2A14}
  .ct-topo img{width:52mm}.ct h1{font-size:23pt;color:#5A2A14;margin:3mm 0 1mm;font-weight:900}
  .sub{font-size:10.5pt;margin:0 0 4mm;line-height:1.35}.ct-qr{display:flex;gap:4mm;align-items:center;background:#fff;border:0.6mm solid #E3CBA0;border-radius:3mm;padding:3mm;text-align:left}
  .qr{width:28mm;height:28mm}.qr svg{width:100%;height:100%}.ct-qr b{display:block;font-size:11pt;color:#5A2A14}.ct-qr span{font-size:9pt;color:#6B5A4E}
  .ct-estrelas{font-size:22pt;color:#E0A22B;letter-spacing:2mm;margin:4mm 0 1mm}.aval{font-size:10.5pt;line-height:1.35;margin:0}
  .rod{position:absolute;bottom:2.2mm;left:0;right:0;margin:0;font-size:7.5pt;color:#F3DFB8;z-index:1;letter-spacing:.3mm}`;

/** Adesivos redondos de lacre (60 mm). */
function lacre() {
  return `<div class="lc"><img src="${logo()}" alt=""><b>Feito com carinho</b><span>100% natural</span></div>`;
}
const CSS_LACRE = `.lc{width:58mm;height:58mm;border-radius:50%;background:radial-gradient(circle,#7A3E1E 0%,#3E1C0E 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:#fff;border:1.4mm solid #E3BE72;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:'Trebuchet MS',Arial,sans-serif;page-break-inside:avoid}
  .lc img{width:40mm;filter:drop-shadow(0 .5mm .8mm rgba(0,0,0,.4))}.lc b{font-size:10pt;margin-top:1.5mm;color:#F3DFB8}.lc span{font-size:7.5pt;letter-spacing:.6mm;text-transform:uppercase;opacity:.85}`;

/** Monta as folhas: na térmica, 1 por etiqueta (10×15); na comum, 4 cartões ou 12 lacres por folha A4. */
export async function imprimirCartoes(nomes) {
  const lista = nomes.length ? nomes : [''];
  const itens = await Promise.all(lista.map((n) => cartao(n)));
  if (impressora() === 'termica') {
    imprimir('Cartões de agradecimento', itens.map((c) => `<div class="pg">${c}</div>`).join(''),
      `@page{size:100mm 150mm;margin:0}.pg{width:100mm;height:150mm;display:flex;align-items:center;justify-content:center;page-break-after:always}${CSS_CARTAO}`);
  } else {
    imprimir('Cartões de agradecimento', `<div class="folha">${itens.join('')}</div>`,
      `@page{size:A4;margin:0}.folha{display:grid;grid-template-columns:105mm 105mm;grid-auto-rows:148.5mm;place-items:center}${CSS_CARTAO}`);
  }
}
export function imprimirLacres(qtd = 12) {
  const n = Math.max(1, Math.min(96, qtd));
  if (impressora() === 'termica') {
    imprimir('Adesivos de lacre', Array.from({ length: n }, () => `<div class="pg">${lacre()}${lacre()}</div>`).slice(0, Math.ceil(n / 2)).join(''),
      `@page{size:100mm 150mm;margin:0}.pg{width:100mm;height:150mm;display:flex;flex-direction:column;align-items:center;justify-content:space-around;page-break-after:always}${CSS_LACRE}`);
  } else {
    imprimir('Adesivos de lacre', `<div class="folha">${Array.from({ length: n }, lacre).join('')}</div>`,
      `@page{size:A4;margin:8mm}.folha{display:grid;grid-template-columns:repeat(3,64mm);gap:4mm 2mm;justify-content:center}${CSS_LACRE}`);
  }
}

/* ---------- tela ⚙️ Impressão ---------- */
function desenhar() {
  const el = $('#imp-config'); if (!el || el.dataset.ok) return;
  el.dataset.ok = 1;
  const t = impressora();
  el.innerHTML = `<div class="imp-opcoes">
      <label class="imp-op ${t === 'termica' ? 'ativo' : ''}"><input type="radio" name="impressora" value="termica" ${t === 'termica' ? 'checked' : ''}>
        <b>🏷️ Térmica de etiquetas</b><span>A que solta a etiqueta adesiva 10×15 cm, é só colar na caixa (Zebra, Elgin, Argox, Jadens…).</span></label>
      <label class="imp-op ${t === 'a4' ? 'ativo' : ''}"><input type="radio" name="impressora" value="a4" ${t === 'a4' ? 'checked' : ''}>
        <b>🖨️ Comum (folha A4)</b><span>Jato de tinta ou laser. Recorte a etiqueta e cole com fita, ou use folha A4 adesiva.</span></label>
    </div>
    <p class="suave">Vale para este aparelho. A etiqueta da Shopee já sai no formato da impressora escolhida.</p>`;
}
document.addEventListener('change', (e) => {
  if (e.target.name !== 'impressora') return;
  try { localStorage.setItem(CHAVE, e.target.value); } catch {}
  document.querySelectorAll('.imp-op').forEach((l) => l.classList.toggle('ativo', l.querySelector('input').checked));
  aviso(e.target.value === 'termica' ? '✅ Impressora térmica (10×15).' : '✅ Impressora comum (A4).');
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'imp-cartao') { const n = Number($('#imp-qtd-cartao').value) || 1; await imprimirCartoes(Array(n).fill('')); }
  if (e.target.id === 'imp-lacre') imprimirLacres(Number($('#imp-qtd-lacre').value) || 12);
  if (e.target.id === 'imp-qr') {
    const url = $('#imp-qr-url').value.trim(); if (!url) return;
    const svg = await qrSvg(url);
    imprimir('QR code', `<div class="qrp">${svg}<p>${esc(url)}</p></div>`, '@page{margin:15mm}.qrp{width:80mm;margin:10mm auto;text-align:center;font-size:10pt}.qrp svg{width:80mm}');
  }
});
B.desenhar.push(desenhar);
