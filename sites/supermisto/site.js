/* Supermisto Temperos: configuração do site. Troque aqui o WhatsApp, o e-mail e as redes sociais. */
const CONFIG = {
  whatsapp: '5524998721557',       // DDI + DDD + número, só números
  fone: '(24) 99872-1557',
  email: 'contato@supermistotemperos.com.br',
  instagram: '', // ex.: https://instagram.com/supermistotemperos (vazio = não aparece)
  facebook: '',
  tiktok: '',
  youtube: '',
  shopee: '', // link da loja na Shopee quando estiver no ar (vazio = botão não aparece)
  // condições de revenda: preencha quando definir (vazio = "a combinar pelo WhatsApp")
  revenda: { pedidoMinimo: '', prazo: '', regioes: '', pagamento: '' },
};

const KITS = [
  { ico: '🔥', nome: 'Kit Churrasco', itens: 'Chimichurri, tempero para churrasco, sal de parrilla e páprica defumada' },
  { ico: '🍲', nome: 'Kit Cozinha do Dia a Dia', itens: 'Colorau, tempero completo, cominho, pimenta-do-reino e orégano' },
  { ico: '🎁', nome: 'Kit Presente Gourmet', itens: 'Geleia de pimenta, pimenta biquinho, lemon pepper e ervas finas' },
];

/* Fotos reais: coloque o arquivo em img/produtos/<nome-do-produto>.webp e o nome aqui (ex.: 'colorau').
   Produto sem foto aparece com a embalagem desenhada. */
const FOTOS = new Set(['colorau', 'tempero-completo', 'pimenta-do-reino-moida', 'cominho-moido', 'chimichurri', 'oregano', 'paprica-doce', 'paprica-defumada', 'acafrao-da-terra-curcuma', 'alho-em-po', 'cebola-em-po', 'lemon-pepper', 'pimenta-calabresa', 'canela-em-po', 'tempero-baiano', 'molho-de-pimenta-vermelha', 'molho-shoyu', 'molho-de-alho',
  'paprica-picante', 'noz-moscada-moida', 'cravo-da-india-moido', 'gengibre-em-po', 'mostarda-em-grao',
  'ervas-finas', 'tempero-para-frango', 'tempero-para-feijao', 'tempero-para-arroz', 'curry',
  'tempero-para-saladas', 'tempero-para-pizza', 'tempero-para-carne-moida', 'sal-com-alho', 'sal-de-ervas']);
// fotos das linhas (cartão 4:3) e capas largas das páginas de linha (img/linhas/<id>-capa.webp)
const FOTOS_LINHA = ['ervas', 'puros', 'conservas', 'misturas', 'churrasco', 'molhos', 'doces', 'amidos'];
const CAPAS_LINHA = [];
const slug = (n) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// foto do tamanho escolhido: 10 g (padrão), 50 g, 100 g ou o pacote de 1 kg
const PESO_FOTO = { '50 g': '-50g', '100 g': '-100g', '1 kg': '-1kg' };
// sabores que já têm a foto do pacote de 1 kg (os outros mostram o sachê com o aviso)
const FOTOS_1KG = new Set(['acafrao-da-terra-curcuma', 'alho-em-po', 'canela-em-po', 'cebola-em-po', 'chimichurri', 'colorau', 'cominho-moido', 'gengibre-em-po', 'mostarda-em-grao',
  'lemon-pepper', 'oregano', 'paprica-defumada', 'paprica-doce', 'pimenta-calabresa', 'pimenta-do-reino-moida', 'tempero-baiano', 'tempero-completo']);
function midia(p, peso) {
  const s = slug(p.nome);
  if (FOTOS.has(s) && peso === '1 kg' && !FOTOS_1KG.has(s)) return `<img class="foto-prod" src="img/produtos/${s}.webp?v=40" alt="${escapar(p.nome)} Supermisto" loading="lazy"><span class="foto-aviso">Foto do pacote de 1 kg em breve</span>`;
  return FOTOS.has(s) ? `<img class="foto-prod" src="img/produtos/${s}${PESO_FOTO[peso] || ''}.webp?v=40" alt="${escapar(p.nome)} Supermisto ${peso || ''}" loading="lazy">` : embalagem(p, peso);
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const linkWhats = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const linhaDe = (id) => LINHAS.find((l) => l.id === id) || {};
const WHATS_SVG = '<svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.3z"/></svg>';

/* ---------- cartões de produto ---------- */
function cartao(p) {
  if (!FOTOS.has(slug(p.nome))) return `<article class="prod prod-embreve aparece" aria-label="${escapar(p.nome)}: em breve">
    <div class="prod-img"><img class="breve-logo" src="img/logo-supermisto.png?v=40" alt="" loading="lazy"><span class="breve-selo">Em breve</span></div>
    <div class="prod-corpo">
      <small class="prod-linha">${linhaDe(p.linha).nome}</small>
      <h3>${escapar(p.nome)}</h3>
      <p>${escapar(p.desc)}</p>
      <div class="prod-tam">${p.tam.map((t) => `<span>${t}</span>`).join('')}</div>
      <span class="btn btn-breve">Em breve</span>
    </div>
  </article>`;
  return `<a class="prod aparece" href="${linkProduto(p)}" aria-label="Ver ${escapar(p.nome)}">
    <div class="prod-img" style="--c:${linhaDe(p.linha).cor}">${p.tag ? `<span class="prod-tag">${p.tag}</span>` : ''}${midia(p, FOTOS.has(slug(p.nome)) ? p.tam[0] : p.tam[1] || p.tam[0])}</div>
    <div class="prod-corpo">
      <small class="prod-linha">${linhaDe(p.linha).nome}</small>
      <h3>${escapar(p.nome)}</h3>
      <p>${escapar(p.desc)}</p>
      <div class="prod-tam">${p.tam.map((t) => `<span>${t}</span>`).join('')}</div>
      <span class="btn btn-roxo">Ver produto</span>
    </div>
  </a>`;
}
const linkProduto = (p) => `produto.html?id=${slug(p.nome)}`;
const recsDe = (p) => (typeof RECEITAS === 'undefined' ? [] : RECEITAS.filter((r) => r.usa.includes(p.nome)));


/* ---------- receitas ---------- */
const produtoPorNome = (n) => PRODUTOS.find((p) => p.nome === n);
function capaReceita(r, grande = false) {
  if (r.foto) return `<div class="rc-capa rc-foto${grande ? ' grande' : ''}" style="background-image:url(img/receitas/${r.foto}.webp)"></div>`;
  const pacotes = r.usa.slice(0, grande ? 4 : 3).map(produtoPorNome).filter(Boolean)
    .map((p, i) => `<span class="rc-p rc-p${i}">${embalagem(p, p.tam[1] || p.tam[0])}</span>`).join('');
  return `<div class="rc-capa${grande ? ' grande' : ''}" style="--c:${r.cor}"><span class="rc-prato">${r.emoji}</span>${pacotes}</div>`;
}
function cartaoReceita(r) {
  return `<a class="rec aparece" href="receita.html?id=${r.id}">${capaReceita(r)}
    <div class="rec-corpo"><small>${r.tempo} · ${r.rende}</small><h3>${r.titulo}</h3><p>${r.resumo}</p><span class="saiba">Saiba mais →</span></div></a>`;
}
function receitasLista(el, lista) { el.innerHTML = lista.map(cartaoReceita).join(''); }
function receitaDetalhe() {
  const r = RECEITAS.find((x) => x.id === new URLSearchParams(location.search).get('id')) || RECEITAS[0];
  document.title = r.titulo + ' | Supermisto Temperos';
  const usados = r.usa.map((n) => [produtoPorNome(n)]).filter(([p]) => p);
  $('#receita').innerHTML = `<header class="rc-topo" style="--c:${r.cor}"><div class="caixa rc-topo-in">
      <div><a class="voltar" href="receitas.html">← Todas as receitas</a><h1>${r.titulo}</h1><p>${r.resumo}</p>
      <div class="rc-info"><span>${r.tempo}</span><span>${r.rende}</span></div></div>${capaReceita(r, true)}</div></header>
    <div class="caixa rc-corpo">
      <div class="rc-col"><h2>Ingredientes</h2><ul class="rc-ing">${r.ingredientes.map((i) => `<li>${i}</li>`).join('')}</ul>
        <h2>Modo de preparo</h2><ol class="rc-modo">${r.preparo.map((i) => `<li>${i}</li>`).join('')}</ol>
        ${r.variacoes ? `<h2>Varie o sabor</h2><div class="rc-var">${r.variacoes.map(([t, d]) => `<div><b>${t}</b><p>${d}</p></div>`).join('')}</div>` : ''}</div>
      <aside class="rc-lado"><h3>Produtos Supermisto desta receita</h3><div class="rc-prods">${usados.map(([p]) =>
        (FOTOS.has(slug(p.nome)) ? `<a class="rc-prod" href="${linkProduto(p)}">${midia(p)}<span>${p.nome}</span></a>` : `<div class="rc-prod rc-breve"><span class="breve-mini">Em breve</span><span>${p.nome}</span></div>`)).join('')}</div>
        <a class="btn btn-roxo" href="${linkWhats('Olá! Vi a receita "' + r.titulo + '" no site e quero os temperos Supermisto.')}" target="_blank" rel="noopener">Quero estes temperos</a></aside>
    </div>`;
  receitasLista($('#receitas-mais'), RECEITAS.filter((x) => x.id !== r.id).slice(0, 3));
}

/* ---------- partes comuns ---------- */
function redes() {
  const r = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']].filter(([k]) => CONFIG[k]);
  return r.length ? `<div class="redes">${r.map(([k, n]) => `<a href="${CONFIG[k]}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>` : '';
}
function rodape() {
  $('#rodape').innerHTML = `<div class="caixa rod-grid">
    <div><img src="img/logo-supermisto.png" alt="Supermisto Temperos" width="190" height="94" loading="lazy"><p><span class="ln">Temperos de verdade, 100% naturais</span> <span class="ln">e sem conservantes. Fábrica própria.</span></p>${redes()}</div>
    <div><b>Produtos</b>${LINHAS.slice(0, 5).map((l) => `<a href="linha.html?id=${l.id}">${l.nome}</a>`).join('')}<a href="catalogo.html">Ver todos →</a></div>
    <div><b>Empresa</b><a href="receitas.html">Receitas</a><a href="index.html#sobre">Nossa história</a><a href="revenda.html">Revenda e atacado</a><a href="revenda.html">Marca própria</a></div>
    <div class="rod-contato"><b>Contato</b><a data-whats="Olá! Vim pelo site da Supermisto."><span data-fone></span></a><a data-mail-link><span data-mail-txt></span></a><span class="rod-end"><span class="ln">Estrada de Xerém, 484 · Xerém</span><i class="sep"> · </i><span class="ln">Duque de Caxias (RJ)</span></span></div>
  </div>
  <div class="caixa rod-base"><span><span class="ln">SUPER MISTO TEMPEROS LTDA</span><i class="sep"> · </i><span class="ln">CNPJ 13.580.397/0001-80</span></span><span><span class="ln"><a href="privacidade.html">Política de privacidade</a></span><i class="sep"> · </i><span class="ln">© ${new Date().getFullYear()} Supermisto. Todos os direitos reservados.</span></span></div>`;
}
function ligacoes() {
  $$('[data-whats]').forEach((a) => { a.href = linkWhats(a.dataset.whats); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-fone]').forEach((a) => { a.textContent = CONFIG.fone; });
  $$('[data-mail]').forEach((a) => { a.href = 'mailto:' + CONFIG.email; a.textContent = CONFIG.email; });
  $$('[data-mail-link]').forEach((a) => { a.href = 'mailto:' + CONFIG.email; });
  $$('[data-mail-txt]').forEach((a) => { a.textContent = CONFIG.email; });
  const w = $('.whats-flutua'); if (w) w.innerHTML = WHATS_SVG;
}
let obs;
function observar() {
  if (!('IntersectionObserver' in window)) { $$('.aparece').forEach((e) => e.classList.add('ok')); return; }
  obs = obs || new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('ok'); obs.unobserve(e.target); } }), { threshold: 0.1 });
  $$('.aparece:not(.ok)').forEach((e) => obs.observe(e));
}

/* ---------- página inicial ---------- */
function inicio() {
  const pegar = (nome) => PRODUTOS.find((p) => p.nome === nome);
  // produtos com foto real entram como recorte (sem fundo); os outros com a embalagem desenhada
  const vit = (n) => FOTOS.has(slug(n)) ? `<img src="img/produtos/${slug(n)}-recorte.png" alt="${n} Supermisto">` : embalagem(pegar(n), pegar(n).tam[1] || pegar(n).tam[0]);
  $('#vitrine').innerHTML = '<img class="vit-kit" src="img/kit-10-temperos.webp?v=40" alt="Kit 10 temperos Supermisto" width="900" height="900">';
  $('#num-prod').textContent = PRODUTOS.length + '+';
  $('#linhas-grid').innerHTML = LINHAS.map((l) => {
    const qtd = PRODUTOS.filter((p) => p.linha === l.id).length;
    const fundo = FOTOS_LINHA.includes(l.id) ? `background-image:url(img/linhas/${l.id}.webp?v=40)` : `background:radial-gradient(circle at 50% 40%,#7B1F95,#2C0739)`;
    return `<a class="linha aparece" href="linha.html?id=${l.id}"><span class="linha-foto" style="${fundo}">${FOTOS_LINHA.includes(l.id) ? '' : `<i>${l.emoji}</i>`}</span><b>${l.nome}</b><em>${qtd} produtos</em></a>`;
  }).join('');
  // só produtos com foto real (os outros entram quando a foto chegar)
  const fav = PRODUTOS.map((p, i) => [p, i]).filter(([p]) => FOTOS.has(slug(p.nome))).slice(0, 7);
  // "Mais sabores" só completa a fileira quando sobra espaço
  $('#favoritos').innerHTML = fav.map(([p, i]) => cartao(p, i)).join('') + (true ?
    `<a class="prod prod-breve aparece" href="catalogo.html"><b>Mais sabores</b><span>Lemon pepper, calabresa, canela, tempero baiano e muito mais.</span><em>Ver catálogo completo →</em></a>` : '');
  receitasLista($('#receitas-home'), RECEITAS.filter((r) => r.foto).slice(0, 4));
  $$('.emp, .dicas article, .passos li, details').forEach((e) => e.classList.add('aparece'));
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    window.open(linkWhats(`Olá! Sou ${f.get('nome')}${f.get('empresa') ? ' da ' + f.get('empresa') : ''}. Vim pelo site e gostaria de um orçamento: ${f.get('msg')}`), '_blank', 'noopener');
  });
}

/* ---------- catálogo ---------- */
function catalogo() {
  const url = new URLSearchParams(location.search);
  let linha = LINHAS.some((l) => l.id === url.get('linha')) ? url.get('linha') : 'todos';
  const busca = $('#busca');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  $('#filtros').innerHTML = `<button data-f="todos">Todos</button>` + LINHAS.map((l) => `<button data-f="${l.id}">${l.nome}</button>`).join('');
  const desenhar = () => {
    $$('#filtros button').forEach((b) => b.classList.toggle('ativo', b.dataset.f === linha));
    const q = norm(busca.value.trim());
    const lista = PRODUTOS.map((p, i) => [p, i]).filter(([p]) => (linha === 'todos' || p.linha === linha) && (!q || norm(p.nome + ' ' + p.desc + ' ' + p.usos).includes(q)))
      .sort(([a], [b]) => FOTOS.has(slug(b.nome)) - FOTOS.has(slug(a.nome)));
    $('#conta').textContent = lista.length ? `${lista.length} produto${lista.length > 1 ? 's' : ''}` : 'Nenhum produto encontrado. Chame no WhatsApp: a gente pode produzir!';
    $('#catalogo').innerHTML = lista.map(([p, i]) => cartao(p, i)).join('');
    observar();
  };
  $('#filtros').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; linha = b.dataset.f; history.replaceState(null, '', linha === 'todos' ? 'catalogo.html' : `catalogo.html?linha=${linha}`); desenhar(); });
  busca.addEventListener('input', desenhar);
  desenhar();
}

/* ---------- página de cada linha ---------- */
function paginaLinha() {
  const l = LINHAS.find((x) => x.id === new URLSearchParams(location.search).get('id')) || LINHAS[0];
  document.title = `${l.nome} | Supermisto Temperos`;
  const lista = PRODUTOS.map((p, i) => [p, i]).filter(([p]) => p.linha === l.id)
    .sort(([a], [b]) => FOTOS.has(slug(b.nome)) - FOTOS.has(slug(a.nome)));
  const prontos = lista.filter(([p]) => FOTOS.has(slug(p.nome))).length;
  const titulo = `<span class="sobre-tit amarelo">Nossas linhas</span><h1>${l.nome}</h1><p>${l.desc}</p>
    <span class="ln-conta">${lista.length} produtos${prontos < lista.length ? ` · ${lista.length - prontos} em breve` : ''}</span>`;
  $('#linha').innerHTML = CAPAS_LINHA.includes(l.id)
    ? `<div class="ln-capa-larga"><img src="img/linhas/${l.id}-capa.webp?v=40" alt="${l.nome} Supermisto" width="1920" height="720"></div><div class="ln-topo ln-topo-so"><div class="caixa">${titulo}</div></div>`
    : `<div class="ln-topo"><div class="caixa ln-topo-in"><div>${titulo}</div>${FOTOS_LINHA.includes(l.id) ? `<img class="ln-foto" src="img/linhas/${l.id}.webp?v=40" alt="${l.nome} Supermisto" width="800" height="600">` : `<div class="ln-foto ln-foto-vazia"><i>${l.emoji}</i></div>`}</div></div>`;
  $('#linhas-nav').innerHTML = LINHAS.map((x) => `<a href="linha.html?id=${x.id}"${x.id === l.id ? ' class="ativo" aria-current="page"' : ''}>${x.nome}</a>`).join('');
  $('#linha-prods').innerHTML = lista.map(([p, i]) => cartao(p, i)).join('');
}

/* ---------- página de cada produto ---------- */
function paginaProduto() {
  const id = new URLSearchParams(location.search).get('id');
  const p = PRODUTOS.find((x) => slug(x.nome) === id && FOTOS.has(id));
  if (!p) { location.replace('catalogo.html'); return; }
  const l = linhaDe(p.linha), info = (typeof INFO !== 'undefined' && INFO[p.nome]) || {};
  document.title = `${p.nome} Supermisto | ${l.nome}`;
  $('meta[name=description]').content = `${p.nome} Supermisto: ${p.desc} Embalagens de ${p.tam.join(', ')}.`;
  let tam = p.tam[0];
  const fichas = [['Ingredientes', info.ingredientes], ['Conservação', info.conservacao], ['Validade', info.validade], ['Alérgicos', info.alergicos]].filter(([, v]) => v);
  const recs = recsDe(p);
  const mais = PRODUTOS.filter((x) => x.linha === p.linha && x !== p && FOTOS.has(slug(x.nome))).slice(0, 4);
  $('#produto').innerHTML = `<div class="caixa">
    <nav class="pd-trilha" aria-label="Você está em"><a href="index.html">Início</a> › <a href="linha.html?id=${l.id}">${l.nome}</a> › <span>${escapar(p.nome)}</span></nav>
    <div class="pd-grid">
      <div class="pd-foto" id="pd-foto">${midia(p, tam)}</div>
      <div class="pd-txt">
        <a class="prod-linha" href="linha.html?id=${l.id}">${l.nome}</a>
        <h1>${escapar(p.nome)}</h1>
        <p class="pd-desc">${escapar(p.desc)}</p>
        <p class="pd-usos"><b>Combina com:</b> ${escapar(p.usos)}</p>
        <b class="pd-rot">Embalagens</b>
        <div class="modal-tam" id="pd-tam" role="group" aria-label="Escolha a embalagem">${p.tam.map((t) => `<button type="button" class="${t === tam ? 'ativo' : ''}" data-tam="${t}" aria-pressed="${t === tam}">${t}</button>`).join('')}</div>
        <div class="pd-btns">
          <a class="btn btn-roxo" id="pd-orc" target="_blank" rel="noopener">Pedir orçamento</a>
          <a class="btn btn-amarelo" href="revenda.html">Quero revender</a>
          ${CONFIG.shopee ? `<a class="btn btn-vazado" href="${CONFIG.shopee}" target="_blank" rel="noopener">Comprar na Shopee</a>` : ''}
        </div>
        ${fichas.length ? `<dl class="pd-ficha">${fichas.map(([k, v]) => `<dt>${k}</dt><dd>${escapar(v)}</dd>`).join('')}</dl>` : ''}
      </div>
    </div>
    ${recs.length ? `<section class="pd-bloco"><h2>Receitas com ${escapar(p.nome.toLowerCase())}</h2><div class="rec-grid rec-4">${recs.map(cartaoReceita).join('')}</div></section>` : ''}
    ${mais.length ? `<section class="pd-bloco"><h2>Veja também</h2><div class="grade">${mais.map((x) => cartao(x)).join('')}</div></section>` : ''}
  </div>`;
  const orc = () => { $('#pd-orc').href = linkWhats(`Olá! Tenho interesse em ${p.nome} Supermisto (${tam}). Pode me passar valores e condições?`); };
  orc();
  $('#pd-tam').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tam]'); if (!b) return;
    tam = b.dataset.tam; $('#pd-foto').innerHTML = midia(p, tam);
    $$('#pd-tam button').forEach((x) => { const at = x === b; x.classList.toggle('ativo', at); x.setAttribute('aria-pressed', at); });
    orc();
  });
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: `${p.nome} Supermisto`, description: p.desc, category: l.nome,
    brand: { '@type': 'Brand', name: 'Supermisto' }, image: new URL(`img/produtos/${slug(p.nome)}.webp`, location.href).href });
  document.head.append(ld);
}

/* ---------- revenda e empresas ---------- */
function revenda() {
  const c = CONFIG.revenda, ac = 'A combinar pelo WhatsApp';
  $('#rv-cond').innerHTML = [['Pedido mínimo', c.pedidoMinimo], ['Prazo de entrega', c.prazo], ['Regiões atendidas', c.regioes], ['Pagamento', c.pagamento]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v || ac}</dd></div>`).join('');
  $('#rv-linhas').innerHTML = LINHAS.map((l) => `<a href="linha.html?id=${l.id}">${l.nome}</a>`).join('');
  const tams = [...new Set(PRODUTOS.flatMap((p) => p.tam))];
  const ordem = (t) => { const n = parseFloat(t.replace(',', '.')); return /kg|L$/.test(t) ? n * 1000 : n; };
  $('#rv-emb').textContent = tams.sort((a, b) => ordem(a) - ordem(b)).join(' · ');
  $('#rv-interesse').innerHTML = LINHAS.map((l) => `<label class="rv-chk"><input type="checkbox" name="linhas" value="${l.nome}"> ${l.nome}</label>`).join('');
  $('#rv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target), linhas = f.getAll('linhas');
    const msg = ['Olá! Quero comprar/revender Supermisto. Meus dados:', '',
      `*Nome:* ${f.get('nome')}`, `*Empresa:* ${f.get('empresa')}`, `*Cidade:* ${f.get('cidade')}`, `*Tipo de negócio:* ${f.get('tipo')}`,
      `*Produtos de interesse:* ${linhas.length ? linhas.join(', ') : 'Quero ver o catálogo'}`,
      f.get('qtd') ? `*Quantidade estimada:* ${f.get('qtd')}` : '', f.get('msg') ? `*Mensagem:* ${f.get('msg')}` : ''].filter((x, i) => x || i === 1).join('\n');
    window.open(linkWhats(msg), '_blank', 'noopener');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  rodape();
  if ($('#vitrine')) inicio();
  if ($('#catalogo')) catalogo();
  if ($('#receitas-lista')) receitasLista($('#receitas-lista'), RECEITAS);
  if ($('#receita')) receitaDetalhe();
  if ($('#linha')) paginaLinha();
  if ($('#produto')) paginaProduto();
  if ($('#rv-form')) revenda();
  ligacoes();
  observar();
  const hamb = $('#hamb'), menu = $('#menu');
  hamb.addEventListener('click', () => { const ab = menu.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', ab); });
  $$('#menu a').forEach((a) => a.addEventListener('click', () => { menu.classList.remove('aberto'); hamb.setAttribute('aria-expanded', false); }));
});
