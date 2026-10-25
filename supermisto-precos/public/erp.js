// Telas do ERP: produtos (SKUs), estoque, pedidos e loja da Shopee.
import { tabelaProduto, contaKit, precoMinimo, acima90 } from './precos.js';

const $ = (s) => document.querySelector(s);
const brl = (v) => (v == null ? '–' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const lerNum = (v) => { const t = String(v ?? '').trim(); if (!t) return null; return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); };
const data = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fotoUrl = (k) => (k ? `/fotos/${encodeURIComponent(k)}` : null);
const STATUS = { UNPAID: 'Aguardando pagamento', READY_TO_SHIP: 'Pronto para enviar', PROCESSED: 'Etiqueta emitida', SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A caminho', COMPLETED: 'Concluído', IN_CANCEL: 'Cancelando', CANCELLED: 'Cancelado', TO_RETURN: 'Devolução' };

let E = null, D = null, api = null, post = null, filtro = 'todos', busca = '';

/** Custo e sobra de um SKU com os custos da aba 🧾 Custos. */
export function contaSku(s, Dados) {
  const sabores = JSON.parse(s.sabores);
  const cpgs = sabores.map((id) => Dados.produtos.find((p) => p.id === id)).filter(Boolean)
    .map((p) => tabelaProduto(p, Dados.insumos, Dados.config, [], Dados.produtos).cpg);
  const cpg = cpgs.length ? cpgs.reduce((a, b) => a + b, 0) / cpgs.length : 0;
  const base = contaKit(0, s.unidades, s.gramas, cpg, Dados.config);
  const custo = base.tempero + base.saquinhos + base.kit;
  const minimo = precoMinimo(custo, Dados.config);
  return { custo, minimo, sugerido: acima90(minimo * 1.3), conta: s.preco > 0 ? contaKit(s.preco, s.unidades, s.gramas, cpg, Dados.config) : null };
}

export async function iniciarErp(dados, funcoes) {
  D = dados; ({ api, post } = funcoes);
  await recarregar();
  if (location.search.includes('shopee=')) {
    const ok = location.search.includes('shopee=ok');
    history.replaceState(null, '', '/');
    abrirAba('loja');
    aviso(ok ? '✅ Loja da Shopee conectada!' : '❌ A Shopee não confirmou. Tente conectar de novo.', ok);
  }
}
async function recarregar() { E = await api('/api/erp/dados'); desenharErp(); }
export function desenharErp() { if (!E) return; desenharProdutos(); desenharEstoque(); desenharPedidos(); desenharLoja(); }
function abrirAba(a) { document.querySelector(`.abas button[data-aba="${a}"]`)?.click(); }
function aviso(txt, ok = true) {
  const el = document.createElement('div'); el.className = `toast ${ok ? 'bom' : 'ruim'}`; el.textContent = txt;
  document.body.append(el); setTimeout(() => el.remove(), 3500);
}

/* ---------- 📦 Produtos ---------- */
function situacaoShopee(s) {
  if (!s.shopee_item_id) return '<span class="sp sp-nao">Shopee: não ligado</span>';
  if (s.sync_erro) return `<span class="sp sp-erro" title="${esc(s.sync_erro)}">⚠️ Shopee: erro</span>`;
  if (s.sync) return '<span class="sp sp-pend">⏳ Indo para a Shopee</span>';
  return '<span class="sp sp-ok">✓ Shopee em dia</span>';
}
function desenharProdutos() {
  const ativos = E.skus.filter((s) => s.ativo);
  const baixo = ativos.filter((s) => s.estoque <= s.estoque_min), semPreco = ativos.filter((s) => !(s.preco > 0)), pend = E.skus.filter((s) => s.sync);
  $('#erp-resumo').innerHTML = `<div class="resumo quatro">
    <div><b>${ativos.length}</b><span>produtos à venda</span></div>
    <div class="${baixo.length ? 'ruim' : 'bom'}"><b>${baixo.length}</b><span>estoque baixo</span></div>
    <div class="${semPreco.length ? 'ruim' : 'bom'}"><b>${semPreco.length}</b><span>sem preço</span></div>
    <div class="${pend.length ? 'ruim' : 'bom'}"><b>${pend.length}</b><span>esperando ir à Shopee</span></div></div>`;
  const q = busca.toLowerCase();
  const lista = E.skus.filter((s) => (filtro === 'todos' || (filtro === 'kits' ? s.tipo === 'kit' : filtro === 'avulsos' ? s.tipo === 'avulso' : filtro === 'baixo' ? s.estoque <= s.estoque_min : filtro === 'shopee' ? s.shopee_item_id : true))
    && (!q || s.nome.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)));
  $('#erp-lista').innerHTML = lista.map((s) => {
    const c = contaSku(s, D);
    return `<div class="sku ${s.ativo ? '' : 'inativo'}" data-sku="${s.id}">
      <div class="sku-foto">${s.foto ? `<img src="${fotoUrl(s.foto)}" alt="" loading="lazy">` : '<span>📷</span>'}</div>
      <div class="sku-info"><b>${esc(s.nome)}</b><small>${s.id}${s.ativo ? '' : ' · pausado'}</small>${situacaoShopee(s)}</div>
      <div class="sku-num"><span class="${s.preco > 0 ? '' : 'falta'}">${s.preco > 0 ? brl(s.preco) : 'sem preço'}</span>
        ${c.conta ? `<small class="${c.conta.sobra >= D.config.lucro_min ? 'ok-txt' : 'ruim-txt'}">sobra ${brl(c.conta.sobra)}</small>` : `<small>mín. ${brl(c.minimo)}</small>`}</div>
      <div class="sku-est ${s.estoque <= s.estoque_min ? 'baixo' : ''}"><b>${s.estoque}</b><small>em estoque</small></div>
    </div>`;
  }).join('') || '<p class="suave">Nenhum produto neste filtro.</p>';
}
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; document.querySelectorAll('[data-filtro]').forEach((b) => b.classList.toggle('ativo', b === f)); desenharProdutos(); return; }
  const s = e.target.closest('.sku[data-sku]');
  if (s) abrirSku(s.dataset.sku);
});
document.addEventListener('input', (e) => { if (e.target.id === 'erp-busca') { busca = e.target.value; desenharProdutos(); } });

/* ---------- ficha do SKU ---------- */
function abrirSku(id) {
  const s = E.skus.find((x) => x.id === id), c = contaSku(s, D), cfg = D.config;
  const fotos = [s.foto, ...JSON.parse(s.fotos || '[]')].filter(Boolean);
  const mov = E.movimentos.filter((m) => m.sku_id === id).slice(0, 8);
  const k = c.conta;
  $('#ficha').innerHTML = `<div class="ficha-caixa" role="dialog" aria-label="${esc(s.nome)}">
    <button class="fechar" aria-label="Fechar">×</button>
    <h2>${esc(s.nome)}</h2><p class="suave">${s.id} · ${s.unidades > 1 ? `${s.unidades} × ${s.gramas} g` : `${s.gramas >= 1000 ? s.gramas / 1000 + ' kg' : s.gramas + ' g'}`}</p>
    <form id="f-sku" class="grade-manual">
      <label>Preço de venda (R$)<input name="preco" inputmode="decimal" value="${s.preco != null ? String(s.preco).replace('.', ',') : ''}" placeholder="${String(c.sugerido).replace('.', ',')}"></label>
      <label>Em estoque<input name="estoque" inputmode="numeric" value="${s.estoque}"></label>
      <label>Avisar quando tiver menos de<input name="estoque_min" inputmode="numeric" value="${s.estoque_min}"></label>
      <label class="check"><input type="checkbox" name="ativo" ${s.ativo ? 'checked' : ''}> À venda</label>
      <div class="largo dica-preco">🧾 Custa ${brl(c.custo)} para fazer · menor preço sem prejuízo <b>${brl(c.minimo)}</b> ·
        <button type="button" class="link" id="usar-sug">usar ${brl(c.sugerido)}</button></div>
      <button class="btn largo">Salvar${s.shopee_item_id ? ' e mandar para a Shopee' : ''}</button>
    </form>
    ${k ? `<div class="conta-kit"><b>🧮 Conta de cada venda</b>
      <div><span>Preço</span><span>${brl(k.preco)}</span></div>
      <div class="menos"><span>Shopee (${cfg.taxa_pct}% + ${brl(cfg.taxa_fixa)})</span><span>− ${brl(k.shopee)}</span></div>
      <div class="menos"><span>Imposto (${cfg.imposto_pct || 0}%)</span><span>− ${brl(k.imposto)}</span></div>
      <div class="menos"><span>Tempero</span><span>− ${brl(k.tempero)}</span></div>
      <div class="menos"><span>Saquinhos e etiquetas</span><span>− ${brl(k.saquinhos + k.kit)}</span></div>
      <div class="total ${k.sobra >= cfg.lucro_min ? 'bom' : 'ruim'}"><span>Sobra para você</span><span>${brl(k.sobra)}</span></div></div>` : ''}
    <h3>Fotos ${s.shopee_item_id ? '<small class="suave">(a 1ª é a capa; trocou aqui, troca na Shopee)</small>' : ''}</h3>
    <div class="fotos">${fotos.map((f, i) => `<div class="ft"><img src="${fotoUrl(f)}" alt=""><button class="x" data-remover="${esc(f)}" title="Tirar">×</button>${i === 0 ? '<span>capa</span>' : ''}</div>`).join('')}
      <label class="ft add">＋<input type="file" accept="image/*" id="nova-foto" hidden></label></div>
    <label class="check"><input type="checkbox" id="foto-capa"> A próxima foto é a capa</label>
    <h3>Shopee</h3>
    <p>${s.shopee_item_id ? `Ligado ao anúncio <b>${s.shopee_item_id}</b>${s.shopee_model_id ? ` (variação ${s.shopee_model_id})` : ''}. Na Shopee: ${brl(s.shopee_preco)} · estoque ${s.shopee_estoque ?? '–'}.
      ${s.sync_erro ? `<br><span class="ruim-txt">⚠️ ${esc(s.sync_erro)}</span>` : ''}` : 'Ainda não ligado a um anúncio. Ligue na aba 🛒 Shopee.'}</p>
    ${mov.length ? `<h3>Últimas mudanças no estoque</h3><table>${mov.map((m) => `<tr><td>${data(m.criado_em)}</td><td>${{ producao: 'Produção', venda: 'Venda', ajuste: 'Acerto', cancelamento: 'Cancelamento' }[m.motivo] || m.motivo}${m.pedido_id ? ' ' + esc(m.pedido_id) : ''}</td><td class="${m.qtd > 0 ? 'ok-txt' : 'ruim-txt'}">${m.qtd > 0 ? '+' : ''}${m.qtd}</td></tr>`).join('')}</table>` : ''}
  </div>`;
  $('#ficha').hidden = false; document.body.classList.add('sem-rolar');
  $('#ficha').dataset.sku = id;
}
function fecharFicha() { $('#ficha').hidden = true; document.body.classList.remove('sem-rolar'); }
$('#ficha').addEventListener('click', async (e) => {
  if (e.target.id === 'ficha' || e.target.classList.contains('fechar')) return fecharFicha();
  const id = $('#ficha').dataset.sku;
  if (e.target.id === 'usar-sug') { const s = E.skus.find((x) => x.id === id); $('#f-sku').preco.value = String(contaSku(s, D).sugerido).replace('.', ','); return; }
  const r = e.target.dataset.remover;
  if (r && confirm('Tirar esta foto?')) { await atualizarSku(await post('/api/erp/foto/remover', { sku: id, chave: r })); abrirSku(id); }
});
$('#ficha').addEventListener('submit', async (e) => {
  if (e.target.id !== 'f-sku') return;
  e.preventDefault();
  const f = e.target, id = $('#ficha').dataset.sku;
  try {
    const s = await post(`/api/erp/sku/${id}`, { preco: lerNum(f.preco.value), estoque: lerNum(f.estoque.value), estoque_min: lerNum(f.estoque_min.value), ativo: f.ativo.checked });
    await atualizarSku(s); aviso(s.shopee_item_id ? '✅ Salvo. Indo para a Shopee…' : '✅ Salvo.'); fecharFicha();
    if (s.shopee_item_id) setTimeout(recarregar, 6000);
  } catch (er) { aviso(er.message, false); }
});
$('#ficha').addEventListener('change', async (e) => {
  if (e.target.id !== 'nova-foto' || !e.target.files[0]) return;
  const id = $('#ficha').dataset.sku;
  try {
    aviso('Enviando foto…');
    const s = await post('/api/erp/foto', { sku: id, imagem: await reduzir(e.target.files[0]), principal: $('#foto-capa').checked });
    await atualizarSku(s); abrirSku(id);
  } catch (er) { aviso(er.message, false); }
});
async function atualizarSku(s) { const i = E.skus.findIndex((x) => x.id === s.id); if (i >= 0) E.skus[i] = s; desenharProdutos(); }
function reduzir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1200 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); ok(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

/* ---------- 📥 Estoque ---------- */
function opcoesSku(sel = '') {
  return E.skus.filter((s) => s.ativo).map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.nome)}</option>`).join('');
}
function linhaItem(preco = false) {
  return `<div class="linha-item"><select name="sku">${opcoesSku()}</select><input name="qtd" inputmode="numeric" placeholder="Qtd">${preco ? '<input name="preco" inputmode="decimal" placeholder="R$ cada">' : ''}<button type="button" class="x">×</button></div>`;
}
function desenharEstoque() {
  if (!$('#prod-itens').children.length) $('#prod-itens').innerHTML = linhaItem();
  const baixo = E.skus.filter((s) => s.ativo && s.estoque <= s.estoque_min).sort((a, b) => a.estoque - b.estoque);
  $('#est-baixo').innerHTML = baixo.length ? `<table><tr><th>Produto</th><th>Tem</th><th>Mínimo</th></tr>${baixo.map((s) => `<tr><td>${esc(s.nome)}</td><td class="ruim-txt"><b>${s.estoque}</b></td><td>${s.estoque_min}</td></tr>`).join('')}</table>` : '<p class="ok-txt">✅ Nenhum produto com estoque baixo.</p>';
  const nome = (id) => E.skus.find((s) => s.id === id)?.nome || id;
  $('#est-mov').innerHTML = E.movimentos.length ? `<table>${E.movimentos.slice(0, 40).map((m) => `<tr><td>${data(m.criado_em)}</td><td>${esc(nome(m.sku_id))}<br><small class="suave">${{ producao: 'Produção', venda: 'Venda', ajuste: 'Acerto', cancelamento: 'Cancelamento' }[m.motivo] || m.motivo}${m.pedido_id ? ' · ' + esc(m.pedido_id) : ''}</small></td><td class="${m.qtd > 0 ? 'ok-txt' : 'ruim-txt'}"><b>${m.qtd > 0 ? '+' : ''}${m.qtd}</b></td></tr>`).join('')}</table>` : '<p class="suave">Nenhuma mudança ainda.</p>';
}
const lerItens = (caixa) => [...caixa.querySelectorAll('.linha-item')].map((l) => ({ sku: l.querySelector('[name=sku]').value, qtd: lerNum(l.querySelector('[name=qtd]').value), preco: lerNum(l.querySelector('[name=preco]')?.value) })).filter((i) => i.qtd > 0);
document.addEventListener('click', (e) => {
  if (e.target.id === 'prod-mais') $('#prod-itens').insertAdjacentHTML('beforeend', linhaItem());
  if (e.target.id === 'venda-mais') $('#venda-itens').insertAdjacentHTML('beforeend', linhaItem(true));
  if (e.target.matches('.linha-item .x')) e.target.closest('.linha-item').remove();
});
$('#f-producao').addEventListener('submit', async (e) => {
  e.preventDefault();
  const itens = lerItens($('#prod-itens'));
  if (!itens.length) return aviso('Coloque a quantidade.', false);
  try { await post('/api/erp/producao', { itens, obs: e.target.obs.value }); $('#prod-itens').innerHTML = ''; e.target.reset(); aviso(`✅ Entrada de ${itens.reduce((t, i) => t + i.qtd, 0)} unidade(s) no estoque.`); await recarregar(); }
  catch (er) { aviso(er.message, false); }
});

/* ---------- 🧾 Pedidos ---------- */
function desenharPedidos() {
  if (!$('#venda-itens').children.length) $('#venda-itens').innerHTML = linhaItem(true);
  const validos = E.pedidos.filter((p) => !['CANCELLED', 'IN_CANCEL', 'UNPAID'].includes(p.status));
  const desde = (dias) => validos.filter((p) => Date.now() - new Date(p.criado_em) < dias * 864e5);
  const soma = (l) => l.reduce((t, p) => t + (p.total || 0), 0);
  $('#ped-resumo').innerHTML = `<div class="resumo">${[['Hoje', 1], ['7 dias', 7], ['30 dias', 30]].map(([n, d]) => `<div><b>${brl(soma(desde(d)))}</b><span>${n} · ${desde(d).length} pedido(s)</span></div>`).join('')}</div>`;
  $('#ped-lista').innerHTML = E.pedidos.length ? E.pedidos.map((p) => `<div class="card pedido"><div class="ped-topo"><b>${esc(p.id)}</b><span class="tag t-${p.origem}">${p.origem === 'shopee' ? 'Shopee' : 'Fora da Shopee'}</span><span class="st">${STATUS[p.status] || p.status}</span></div>
    <div class="suave">${data(p.criado_em)}${p.cliente ? ' · ' + esc(p.cliente) : ''} · <b>${brl(p.total)}</b></div>
    <ul>${p.itens.map((i) => `<li>${i.qtd}× ${esc(i.nome)}${i.sku ? '' : ' <span class="ruim-txt">(sem SKU: não saiu do estoque)</span>'}</li>`).join('')}</ul></div>`).join('')
    : '<p class="suave">Nenhum pedido ainda. Os da Shopee chegam sozinhos depois que a loja for conectada.</p>';
}
$('#f-venda').addEventListener('submit', async (e) => {
  e.preventDefault();
  const itens = lerItens($('#venda-itens'));
  if (!itens.length) return aviso('Coloque a quantidade.', false);
  try { const r = await post('/api/erp/pedido', { itens, cliente: e.target.cliente.value }); $('#venda-itens').innerHTML = ''; e.target.reset(); aviso(`✅ Venda ${r.id} registrada e tirada do estoque.`); await recarregar(); }
  catch (er) { aviso(er.message, false); }
});
document.addEventListener('click', async (e) => {
  if (e.target.id !== 'ped-buscar') return;
  e.target.disabled = true;
  try { const r = await post('/api/shopee/pedidos'); aviso(`✅ ${r.novos} pedido(s) novo(s).`); await recarregar(); }
  catch (er) { aviso(er.message, false); } finally { e.target.disabled = false; }
});

/* ---------- 🛒 Shopee ---------- */
let anuncios = null;
function desenharLoja() {
  const sh = E.shopee;
  const passo = (ok, n, txt) => `<li class="${ok ? 'feito' : ''}"><span>${ok ? '✓' : n}</span><div>${txt}</div></li>`;
  $('#loja-passos').innerHTML = `<ol class="passos-sh">
    ${passo(sh.configurada, 1, sh.configurada ? 'Cadastro na Shopee Open Platform feito.' : `<b>Cadastro na Shopee Open Platform</b> (só uma vez, é grátis): em <a href="https://open.shopee.com" target="_blank" rel="noopener">open.shopee.com</a>, entre com a conta da loja, crie um app do tipo <b>Seller In House System</b> e mande o <b>Partner ID</b> e a <b>Partner Key</b> para o Claude guardar nos segredos (nunca no chat aberto: ele explica onde colar).`)}
    ${passo(sh.conectada, 2, sh.conectada ? `Loja conectada${sh.loja ? ' (' + esc(sh.loja) + ')' : ''}.` : `<b>Conectar a loja</b>: ${sh.configurada ? '<a class="btn" href="/api/shopee/conectar">Conectar com a Shopee</a>' : 'libera depois do passo 1.'}`)}
    ${passo(E.skus.some((s) => s.shopee_item_id), 3, '<b>Ligar cada anúncio ao produto do ERP</b> (lista abaixo). Ligou, o preço, o estoque e as fotos passam a ir sozinhos.')}
  </ol>
  <label class="check"><input type="checkbox" id="sh-auto" ${sh.automatico ? 'checked' : ''} ${sh.conectada ? '' : 'disabled'}> Mandar para a Shopee sozinho (preço, estoque e fotos) assim que mudar aqui</label>
  ${sh.conectada ? `<button class="btn" id="sh-enviar">Mandar agora o que está pendente (${E.skus.filter((s) => s.sync).length})</button> <button class="btn sec" id="sh-anuncios">Ver anúncios da loja</button>` : ''}`;
  $('#loja-anuncios').innerHTML = anuncios ? anuncios.map((a) => `<div class="item an-sh" data-item="${a.item_id}" data-model="${a.model_id}" data-preco="${a.preco ?? ''}" data-estoque="${a.estoque ?? ''}">
      <div class="tit">${esc(a.nome)}${a.variacao ? ` · <b>${esc(a.variacao)}</b>` : ''} <small>${brl(a.preco)} · estoque ${a.estoque ?? '–'}${a.sku ? ' · SKU ' + esc(a.sku) : ''}</small></div>
      <div class="linha2"><select><option value="">— ligar a qual produto? —</option>${opcoesSku(a.ligado || a.sugestao || '')}</select>
      ${a.ligado ? '<span class="ok-txt">✓ ligado</span> <button class="link perigo desligar">desligar</button>' : '<button class="btn ligar">Ligar</button>'}</div></div>`).join('') || '<p class="suave">Nenhum anúncio ativo na loja.</p>' : '';
  $('#loja-registro').innerHTML = E.registro.length ? `<table>${E.registro.map((r) => `<tr><td>${data(r.criado_em)}</td><td class="${r.ok ? '' : 'ruim-txt'}">${r.ok ? '' : '⚠️ '}${esc(r.texto)}</td></tr>`).join('')}</table>` : '<p class="suave">Nada ainda.</p>';
}
document.addEventListener('change', async (e) => {
  if (e.target.id === 'sh-auto') { await post('/api/shopee/automatico', { ligado: e.target.checked }); E.shopee.automatico = e.target.checked; aviso(e.target.checked ? '✅ Envio automático ligado.' : 'Envio automático desligado: use o botão "Mandar agora".'); }
});
document.addEventListener('click', async (e) => {
  const b = e.target;
  try {
    if (b.id === 'sh-enviar') { b.disabled = true; const r = await post('/api/shopee/enviar'); aviso(r.erros.length ? `⚠️ ${r.enviados} enviado(s), ${r.erros.length} com erro (veja o registro).` : `✅ ${r.enviados} produto(s) atualizado(s) na Shopee.`, !r.erros.length); await recarregar(); }
    if (b.id === 'sh-anuncios') { b.disabled = true; b.textContent = 'Buscando anúncios…'; anuncios = await api('/api/shopee/anuncios'); desenharLoja(); }
    const el = b.closest('.an-sh');
    if (el && b.classList.contains('ligar')) {
      const sku = el.querySelector('select').value;
      if (!sku) return aviso('Escolha o produto.', false);
      await post('/api/shopee/ligar', { sku, item_id: Number(el.dataset.item), model_id: Number(el.dataset.model), preco: lerNum(el.dataset.preco), estoque: lerNum(el.dataset.estoque) });
      const a = anuncios.find((x) => String(x.item_id) === el.dataset.item && String(x.model_id) === el.dataset.model); if (a) a.ligado = sku;
      aviso('✅ Ligado.'); await recarregar();
    }
    if (el && b.classList.contains('desligar')) {
      const a = anuncios.find((x) => String(x.item_id) === el.dataset.item && String(x.model_id) === el.dataset.model);
      await post('/api/shopee/desligar', { sku: a.ligado }); a.ligado = null; await recarregar();
    }
  } catch (er) { aviso(er.message, false); if (b.id === 'sh-anuncios') { b.disabled = false; b.textContent = 'Ver anúncios da loja'; } }
});
