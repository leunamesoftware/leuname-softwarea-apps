// 🌐 Meu site: o dono edita, cria e esconde produtos do site e troca as fotos, direto pelo app.
// O catálogo fixo vem do próprio site (produtos.js); o que muda aqui fica no app e o site aplica em até 1 minuto.
import { B, $, esc, aviso } from './erp-base.js';

const SITE = 'https://www.supermistotemperos.com.br';
const TAMS = ['10 g', '30 g', '50 g', '100 g', '250 g', '500 g', '1 kg', '150 ml', '300 ml', '500 ml', '1 L', '200 g', '300 g'];
const slug = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let base = null, editados = {}, filtroLinha = 'todos', busca = '', carregando = null;

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
  return { linhas: base.linhas, produtos: lista(), cadastrados: r.cadastrados || {}, fotoDe };
}

async function desenhar() {
  const el = $('#site-lista'); if (!el || $('#aba-site').hidden) return;
  if (!base) el.innerHTML = '<p class="suave">Carregando o catálogo do site…</p>';
  try { await produtosDoSite(); }
  catch { el.innerHTML = '<p class="erro">Não consegui abrir o catálogo do site. Confira a internet e toque em Meu site de novo.</p>'; return; }
  $('#site-filtros').innerHTML = [['todos', 'Todos'], ...base.linhas.map((l) => [l.id, l.nome])].map(([k, n]) => `<button data-sl="${k}" class="${k === filtroLinha ? 'ativo' : ''}">${esc(n)}</button>`).join('');
  const q = busca.toLowerCase(), ls = lista().filter((p) => (filtroLinha === 'todos' || p.linha === filtroLinha) && (!q || p.nome.toLowerCase().includes(q)));
  el.innerHTML = ls.map((p) => `<button class="site-item${p.oculto ? ' oculto' : ''}" data-site="${p.id}">
      <span class="site-foto"><img src="${esc(fotoDe(p))}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('em'),{textContent:'Em breve'}))"></span>
      <span class="site-txt"><b>${esc(p.nome)}</b><small>${esc(base.linhas.find((l) => l.id === p.linha)?.nome || '')} · ${(p.tam || []).join(', ')}</small>
      ${p.oculto ? '<i class="tg cinza">Escondido</i>' : p.novo ? '<i class="tg">Novo pelo app</i>' : editados[p.id] ? '<i class="tg">Editado</i>' : ''}</span><span>›</span></button>`).join('') || '<p class="suave">Nenhum produto.</p>';
}

/** Reduz a foto no próprio celular (até 1200 px, WebP) antes de mandar. */
function reduzir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/webp', 0.85)); URL.revokeObjectURL(img.src);
    }; img.onerror = falha; img.src = URL.createObjectURL(arquivo);
  });
}

function abrir(id) {
  const p = id ? lista().find((x) => x.id === id) : { id: '', nome: '', linha: filtroLinha === 'todos' ? base.linhas[0].id : filtroLinha, desc: '', usos: '', tam: ['10 g', '50 g', '100 g', '1 kg'], novo: true };
  const tams = [...new Set([...TAMS, ...(p.tam || [])])];
  const ed = $('#site-ed');
  ed.innerHTML = `<form class="ficha-caixa site-form" id="site-form">
    <button type="button" class="fechar" aria-label="Fechar">×</button>
    <h2>${id ? '✏️ Editar produto' : '➕ Produto novo'}</h2>
    <p class="suave">${id ? 'O que você mudar aparece no site em até 1 minuto.' : 'Ele entra no site na linha escolhida. Sem foto, aparece como “Em breve”.'}</p>
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
