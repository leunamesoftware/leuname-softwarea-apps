// 🌐 Meu site: o dono edita, cria e esconde produtos do site e troca as fotos, direto pelo app.
// O catálogo fixo vem do próprio site (produtos.js); o que muda aqui fica no app e o site aplica em até 1 minuto.
import { B, $, esc, aviso } from './erp-base.js';

const SITE = 'https://www.supermistotemperos.com.br';
const TAMS = ['10 g', '30 g', '50 g', '100 g', '250 g', '500 g', '1 kg', '150 ml', '300 ml', '500 ml', '1 L', '200 g', '300 g'];
const slug = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let linhasApp = {}, base = null, editados = {}, filtroLinha = 'todos', busca = '', carregando = null;

/** Lê o catálogo fixo do site (produtos.js) uma vez. */
function catalogoDoSite() {
  if (base) return Promise.resolve(base);
  carregando = carregando || new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = `${SITE}/produtos.js?t=${Date.now()}`;
    s.onload = () => { try { const info = (0, eval)('typeof INFO === "undefined" ? {} : INFO'); base = { linhas: (0, eval)('LINHAS'), produtos: (0, eval)('PRODUTOS').map((p) => ({ ...(info[p.nome] || {}), ...p, id: slug(p.nome) })) }; ok(base); } catch (e) { falha(e); } };
    s.onerror = falha; document.head.append(s);
  });
  return carregando;
}

/** Junta o fixo do site com o que foi mudado pelo app. */
function lista() {
  const l = base.produtos.map((p) => ({ ...p, ...(editados[p.id] ? mesclar(editados[p.id]) : {}), id: p.id, fixo: true }));
  Object.values(editados).filter((e) => !base.produtos.some((p) => p.id === e.slug)).forEach((e) => l.push({ id: e.slug, ...mesclar(e), novo: true }));
  return l;
}
const mesclar = (e) => Object.fromEntries(Object.entries({ nome: e.nome, linha: e.linha, desc: e.descricao, usos: e.usos, tam: e.tamanhos?.length ? e.tamanhos : undefined, foto: e.foto, fotosPeso: e.fotos_peso, oculto: e.oculto, ingredientes: e.ingredientes, conservacao: e.conservacao, validade: e.validade, alergicos: e.alergicos }).filter(([, v]) => v !== undefined && v !== ''));
const fotoDe = (p) => p.foto || `${SITE}/img/produtos/${p.id}.webp`;

/** Catálogo completo do site (fixo + o que foi mudado pelo app), também usado na aba Cadastrar na Shopee. */
export async function produtosDoSite() {
  await catalogoDoSite();
  const r = await B.api('/api/erp/site');
  editados = Object.fromEntries(r.produtos.map((p) => [p.slug, p]));
  linhasApp = r.linhas || {};
  return { linhas: base.linhas, produtos: lista(), cadastrados: r.cadastrados || {}, fotoDe };
}

async function desenhar() {
  const el = $('#site-lista'); if (!el || $('#aba-site').hidden) return;
  if (!base) el.innerHTML = '<p class="suave">Carregando o catálogo do site…</p>';
  try { await produtosDoSite(); }
  catch { el.innerHTML = '<p class="erro">Não consegui abrir o catálogo do site. Confira a internet e toque em Meu site de novo.</p>'; return; }
  desenharLinhas();
  $('#site-filtros').innerHTML = [['todos', 'Todos'], ...base.linhas.map((l) => [l.id, l.nome])].map(([k, n]) => `<button data-sl="${k}" class="${k === filtroLinha ? 'ativo' : ''}">${esc(n)}</button>`).join('');
  const q = busca.toLowerCase(), ls = lista().filter((p) => (filtroLinha === 'todos' || p.linha === filtroLinha) && (!q || p.nome.toLowerCase().includes(q)));
  el.innerHTML = ls.map((p) => `<button class="site-item${p.oculto ? ' oculto' : ''}" data-site="${p.id}">
      <span class="site-foto"><img src="${esc(fotoDe(p))}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('em'),{textContent:'Em breve'}))"></span>
      <span class="site-txt"><b>${esc(p.nome)}</b><small>${esc(base.linhas.find((l) => l.id === p.linha)?.nome || '')} · ${(p.tam || []).join(', ')}</small>
      ${p.oculto ? '<i class="tg cinza">Escondido</i>' : p.novo ? '<i class="tg">Novo pelo app</i>' : editados[p.id] ? '<i class="tg">Editado</i>' : ''}</span><span>›</span></button>`).join('') || '<p class="suave">Nenhum produto.</p>';
}

/* ---------- fotos das linhas: quadradinho (4:3) e banner largo ---------- */
const fotoSite = (id, tipo) => `${SITE}/img/linhas/${id}${tipo === 'capa' ? '-capa' : ''}.webp`;
function desenharLinhas() {
  const el = $('#site-linhas'); if (!el) return;
  el.innerHTML = base.linhas.map((l) => {
    const a = linhasApp[l.id] || {};
    const caixa = (tipo, rot) => `<label class="ln-box ${tipo}"><img src="${esc(a[tipo] || fotoSite(l.id, tipo))}" alt="" onerror="this.style.visibility='hidden'">
      <span>📷 ${rot}</span><input type="file" accept="image/*" data-linha="${l.id}" data-tipo="${tipo}" hidden></label>`;
    return `<div class="ln-item"><b>${esc(l.emoji)} ${esc(l.nome)}</b><div class="ln-boxes">${caixa('foto', 'Quadradinho')}${caixa('capa', 'Banner')}</div></div>`;
  }).join('');
}
/** Ajusta sozinha: quadradinho vira 4:3 (corta o excesso, puxando para a direita onde costuma estar o produto); banner até 1600 px, no máximo 16:9. */
function ajustar(arquivo, tipo) {
  return new Promise((ok, falha) => {
    const img = new Image(); img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      const alvo = tipo === 'foto' ? 4 / 3 : Math.max(16 / 9, Math.min(img.width / img.height, 3));
      if (sw / sh > alvo) { const nw = sh * alvo; sx = tipo === 'foto' ? (sw - nw) * 0.75 : (sw - nw) / 2; sw = nw; }
      else if (sw / sh < alvo) { const nh = sw / alvo; sy = (sh - nh) / 2; sh = nh; }
      const W = tipo === 'foto' ? 800 : Math.min(1600, Math.round(sw)), H = Math.round(W / (sw / sh));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      URL.revokeObjectURL(img.src); ok(c.toDataURL('image/webp', 0.86));
    }; img.onerror = () => falha(new Error('Não consegui abrir essa imagem.')); img.src = URL.createObjectURL(arquivo);
  });
}
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('input[data-linha]'); if (!inp || !inp.files[0]) return;
  const caixa = inp.closest('.ln-box'); caixa.classList.add('enviando');
  try {
    const r = await B.post('/api/erp/site/linha', { linha: inp.dataset.linha, tipo: inp.dataset.tipo, imagem: await ajustar(inp.files[0], inp.dataset.tipo) });
    linhasApp = r.linhas || linhasApp; desenharLinhas(); aviso('✅ Imagem ajustada e enviada. Aparece no site em até 1 minuto.');
  } catch (err) { aviso(err.message || 'Não consegui mandar a imagem.', false); caixa.classList.remove('enviando'); }
  inp.value = '';
});

/** Tira o fundo (branco, preto ou qualquer cor lisa/degradê que encosta nas bordas) e põe o produto centralizado no fundo bege. */
function semFundo(img) {
  const k = Math.min(1, 1000 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const dados = g.getImageData(0, 0, w, h), px = dados.data, n = w * h;
  // cor do fundo = mediana das bordas
  const med = (ch) => { const v = []; for (let x = 0; x < w; x++) { v.push(px[x * 4 + ch], px[((h - 1) * w + x) * 4 + ch]); } for (let y = 0; y < h; y++) { v.push(px[y * w * 4 + ch], px[(y * w + w - 1) * 4 + ch]); } v.sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = (i) => Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]);
  const TOL = 46, PASSO = 9;
  const fundo = new Uint8Array(n), fila = new Int32Array(n); let ini = 0, fim = 0;
  const entra = (i) => { if (!fundo[i] && dist(i) < TOL) { fundo[i] = 1; fila[fim++] = i; } };
  for (let x = 0; x < w; x++) { entra(x); entra((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { entra(y * w); entra(y * w + w - 1); }
  while (ini < fim) {
    const i = fila[ini++], x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0 || fundo[j]) continue;
      const d = Math.hypot(px[i * 4] - px[j * 4], px[i * 4 + 1] - px[j * 4 + 1], px[i * 4 + 2] - px[j * 4 + 2]);
      if (dist(j) < TOL || (d < PASSO && dist(j) < TOL * 1.8)) { fundo[j] = 1; fila[fim++] = j; }
    }
  }
  // máscara do produto, suavizada (tira o contorno de fundo)
  const m = document.createElement('canvas'); m.width = w; m.height = h;
  const gm = m.getContext('2d'), mm = gm.createImageData(w, h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) {
    const v = fundo[i] ? 0 : 255; mm.data[i * 4 + 3] = v;
    if (v) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0 || (x1 - x0) * (y1 - y0) < n * 0.03) throw new Error('Não achei o produto nessa foto. Tente uma foto com o pacote inteiro e o fundo liso.');
  gm.putImageData(mm, 0, 0);
  const rec = document.createElement('canvas'); rec.width = w; rec.height = h;
  const gr = rec.getContext('2d');
  gr.filter = 'blur(1.1px)'; gr.drawImage(m, 0, 0); gr.filter = 'none';
  gr.globalCompositeOperation = 'source-in'; gr.drawImage(c, 0, 0); // produto com borda suave
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, S = 1200, area = S * 0.84, esc = Math.min(area / bw, area / bh);
  const out = document.createElement('canvas'); out.width = S; out.height = S;
  const go = out.getContext('2d');
  const gr0 = go.createRadialGradient(S / 2, S * 0.55, S * 0.05, S / 2, S * 0.55, S * 0.75);
  gr0.addColorStop(0, '#FFF4E6'); gr0.addColorStop(1, '#F1E6D4'); go.fillStyle = gr0; go.fillRect(0, 0, S, S);
  const dw = bw * esc, dh = bh * esc, dx = (S - dw) / 2, dy = (S - dh) / 2;
  go.save(); go.shadowColor = 'rgba(70,40,10,.28)'; go.shadowBlur = 38; go.shadowOffsetY = 16;
  go.drawImage(rec, x0, y0, bw, bh, dx, dy, dw, dh); go.restore();
  go.drawImage(rec, x0, y0, bw, bh, dx, dy, dw, dh);
  return out;
}
/** Reduz a foto no próprio celular (até 1200 px, WebP); com "tirar o fundo" ligado, deixa só o pacote no fundo bege. */
function reduzir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image(); img.onload = () => {
      try {
        const limpar = !document.querySelector('#site-semfundo') || document.querySelector('#site-semfundo').checked;
        const c = limpar ? semFundo(img) : (() => {
          const k = Math.min(1, 1200 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv;
        })();
        ok(c.toDataURL('image/webp', 0.88));
      } catch (e) { falha(e); } finally { URL.revokeObjectURL(img.src); }
    }; img.onerror = () => falha(new Error('Não consegui abrir essa imagem.')); img.src = URL.createObjectURL(arquivo);
  });
}
window.semFundoErp = semFundo;

function abrir(id) {
  const p = id ? lista().find((x) => x.id === id) : { id: '', nome: '', linha: filtroLinha === 'todos' ? base.linhas[0].id : filtroLinha, desc: '', usos: '', tam: ['10 g', '50 g', '100 g', '1 kg'], novo: true };
  const tams = [...new Set([...TAMS, ...(p.tam || [])])];
  const ed = $('#site-ed');
  ed.innerHTML = `<form class="ficha-caixa site-form" id="site-form">
    <button type="button" class="fechar" aria-label="Fechar">×</button>
    <h2>${id ? '✏️ Editar produto' : '➕ Produto novo'}</h2>
    <p class="suave">${id ? 'O que você mudar aparece no site em até 1 minuto.' : 'Ele entra no site na linha escolhida. Sem foto, aparece como “Em breve”.'}</p>
    <label class="site-chk"><input type="checkbox" id="site-semfundo" checked> ✨ Tirar o fundo da foto e deixar só o pacote no fundo bege</label>
    <div class="site-fotos">
      <label class="site-fotobox"><img src="${esc(id ? fotoDe(p) : '')}" alt="" onerror="this.style.visibility='hidden'"><span>📷 Foto principal</span><input type="file" accept="image/*" data-peso="" hidden></label>
      ${(p.tam || []).filter((t) => t !== (p.tam || [])[0]).map((t) => `<label class="site-fotobox peq"><img src="${esc(p.fotosPeso?.[t] || '')}" alt="" onerror="this.style.visibility='hidden'"><span>📷 ${esc(t)}</span><input type="file" accept="image/*" data-peso="${esc(t)}" hidden></label>`).join('')}
    </div>
    <label>Nome<input name="nome" required maxlength="80" value="${esc(p.nome)}"></label>
    <label>Linha<select name="linha">${base.linhas.map((l) => `<option value="${l.id}"${l.id === p.linha ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}</select></label>
    <label>Descrição<textarea name="descricao" rows="2" maxlength="400">${esc(p.desc || '')}</textarea></label>
    <label>Combina com<input name="usos" maxlength="300" value="${esc(p.usos || '')}"></label>
    <fieldset class="site-tams"><legend>Tamanhos</legend>${tams.map((t) => `<label><input type="checkbox" name="tam" value="${esc(t)}"${(p.tam || []).includes(t) ? ' checked' : ''}> ${esc(t)}</label>`).join('')}</fieldset>
    <details${p.ingredientes || p.validade ? ' open' : ''}><summary>Ficha técnica (aparece na página do produto)</summary>
      <label>Ingredientes<textarea name="ingredientes" rows="2" maxlength="600">${esc(p.ingredientes || '')}</textarea></label>
      <label>Conservação<input name="conservacao" maxlength="200" value="${esc(p.conservacao || '')}" placeholder="Local seco e arejado, longe do sol"></label>
      <label>Validade<input name="validade" maxlength="80" value="${esc(p.validade || '')}" placeholder="12 meses"></label>
      <label>Alérgicos<input name="alergicos" maxlength="200" value="${esc(p.alergicos || '')}"></label>
    </details>
    <label class="site-chk"><input type="checkbox" name="oculto"${p.oculto ? ' checked' : ''}> Esconder do site</label>
    <div class="site-btns"><button class="btn" type="submit">Salvar</button>${id ? `<a class="btn sec" href="${SITE}/produto.html?id=${esc(p.id)}" target="_blank" rel="noopener">Ver no site</a>` : ''}</div>
  </form>`;
  ed.hidden = false; document.body.classList.add('sem-rolar');
  ed.dataset.slug = p.id;
}
function fechar() { $('#site-ed').hidden = true; document.body.classList.remove('sem-rolar'); }

document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-sl]'); if (f) { filtroLinha = f.dataset.sl; desenhar(); return; }
  const it = e.target.closest('[data-site]'); if (it) { abrir(it.dataset.site); return; }
  if (e.target.id === 'site-novo') { if (base) abrir(''); return; }
  if (e.target.id === 'site-ed' || (e.target.classList.contains('fechar') && e.target.closest('#site-ed'))) fechar();
});
document.addEventListener('input', (e) => { if (e.target.id === 'site-busca') { busca = e.target.value; desenhar(); } });
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('#site-ed input[type=file]'); if (!inp || !inp.files[0]) return;
  const ed = $('#site-ed'), form = $('#site-form');
  let slugP = ed.dataset.slug;
  if (!slugP) { // produto novo: salva antes para ter o endereço da foto
    const nome = form.nome.value.trim(); if (!nome) { aviso('Escreva o nome antes da foto.', false); inp.value = ''; return; }
    slugP = slug(nome);
  }
  const caixa = inp.closest('.site-fotobox'); caixa.classList.add('enviando');
  try {
    const r = await B.post('/api/erp/site/foto', { slug: slugP, peso: inp.dataset.peso, imagem: await reduzir(inp.files[0]) });
    caixa.querySelector('img').src = inp.dataset.peso ? r.fotos_peso[inp.dataset.peso] : r.foto; caixa.querySelector('img').style.visibility = '';
    ed.dataset.slug = slugP; editados[slugP] = r; aviso('✅ Foto enviada.');
  } catch (err) { aviso(err.message || 'Não consegui mandar a foto.', false); }
  caixa.classList.remove('enviando'); inp.value = '';
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'site-form') return;
  e.preventDefault();
  const f = e.target, ed = $('#site-ed'), d = Object.fromEntries(['nome', 'linha', 'descricao', 'usos', 'ingredientes', 'conservacao', 'validade', 'alergicos'].map((k) => [k, f[k].value]));
  d.tamanhos = [...f.querySelectorAll('[name=tam]:checked')].map((x) => x.value);
  d.oculto = f.oculto.checked; d.slug = ed.dataset.slug || slug(d.nome); d.novo = !ed.dataset.slug;
  if (!d.tamanhos.length) return aviso('Marque pelo menos um tamanho.', false);
  try { const r = await B.post('/api/erp/site', d); editados[r.slug] = r; fechar(); aviso('✅ Salvo. Aparece no site em até 1 minuto.'); desenhar(); }
  catch (err) { aviso(err.message || 'Não consegui salvar.', false); }
});
B.desenhar.push(desenhar);
