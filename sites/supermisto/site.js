/* Super Misto Temperos: configuração do site. Troque aqui o WhatsApp, o e-mail e as redes sociais. */
const CONFIG = {
  whatsapp: '5524998721557',       // DDI + DDD + número, só números
  fone: '(24) 99872-1557',
  email: 'contato@supermistotemperos.com.br',
  instagram: '', // ex.: https://instagram.com/supermistotemperos (vazio = não aparece)
  facebook: '',
  tiktok: '',
  youtube: '',
};

const KITS = [
  { ico: '🔥', nome: 'Kit Churrasco', itens: 'Chimichurri, tempero para churrasco, sal de parrilla e páprica defumada' },
  { ico: '🍲', nome: 'Kit Cozinha do Dia a Dia', itens: 'Colorau, tempero completo, cominho, pimenta-do-reino e orégano' },
  { ico: '🎁', nome: 'Kit Presente Gourmet', itens: 'Geleia de pimenta, pimenta biquinho, lemon pepper e ervas finas' },
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const linkWhats = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const linhaDe = (id) => LINHAS.find((l) => l.id === id) || {};
const WHATS_SVG = '<svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.3z"/></svg>';

/* ---------- cartões de produto ---------- */
function cartao(p, i) {
  return `<article class="prod aparece" data-i="${i}" tabindex="0" role="button" aria-label="Ver ${escapar(p.nome)}">
    <div class="prod-img" style="--c:${linhaDe(p.linha).cor}">${p.tag ? `<span class="prod-tag">${p.tag}</span>` : ''}${embalagem(p, p.tam[1] || p.tam[0])}</div>
    <div class="prod-corpo">
      <small class="prod-linha">${linhaDe(p.linha).nome}</small>
      <h3>${escapar(p.nome)}</h3>
      <p>${escapar(p.desc)}</p>
      <div class="prod-tam">${p.tam.map((t) => `<span>${t}</span>`).join('')}</div>
      <span class="btn btn-roxo">Ver produto</span>
    </div>
  </article>`;
}
function ligarCartoes(el) {
  el.addEventListener('click', (e) => { const c = e.target.closest('.prod'); if (c) abrir(PRODUTOS[c.dataset.i]); });
  el.addEventListener('keydown', (e) => { const c = e.target.closest('.prod'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(PRODUTOS[c.dataset.i]); } });
}

/* ---------- janela do produto ---------- */
function abrir(p) {
  const m = $('#modal');
  let tam = p.tam[Math.min(1, p.tam.length - 1)];
  const desenha = () => {
    m.innerHTML = `<div class="modal-fundo" data-fechar></div>
    <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="m-tit">
      <button class="modal-x" data-fechar aria-label="Fechar">×</button>
      <div class="modal-img" style="--c:${linhaDe(p.linha).cor}">${embalagem(p, tam)}</div>
      <div class="modal-txt">
        <small class="prod-linha">${linhaDe(p.linha).emoji} ${linhaDe(p.linha).nome}</small>
        <h2 id="m-tit">${escapar(p.nome)}</h2>
        <p>${escapar(p.desc)}</p>
        <p class="modal-usos"><b>Combina com:</b> ${escapar(p.usos)}</p>
        <b class="modal-rot">Tamanhos</b>
        <div class="modal-tam">${p.tam.map((t) => `<button class="${t === tam ? 'ativo' : ''}" data-tam="${t}">${t}</button>`).join('')}</div>
        <div class="modal-btns">
          <a class="btn btn-roxo" href="${linkWhats(`Olá! Tenho interesse em ${p.nome} Super Misto (${tam}). Pode me passar valores e condições?`)}" target="_blank" rel="noopener">Pedir orçamento</a>
          <a class="btn btn-amarelo" href="${linkWhats(`Olá! Quero revender ${p.nome} Super Misto. Pode me mandar a tabela de atacado?`)}" target="_blank" rel="noopener">Quero revender</a>
        </div>
        <small class="modal-nota">Vendemos para mercados, açougues, restaurantes e revendedores.</small>
      </div>
    </div>`;
  };
  desenha();
  m.hidden = false; document.body.style.overflow = 'hidden';
  m.onclick = (e) => {
    if (e.target.closest('[data-fechar]')) return fechar();
    const b = e.target.closest('[data-tam]'); if (b) { tam = b.dataset.tam; desenha(); }
  };
  $('.modal-x', m).focus();
}
function fechar() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.style.overflow = ''; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) fechar(); });


/* ---------- receitas ---------- */
const produtoPorNome = (n) => PRODUTOS.find((p) => p.nome === n);
function capaReceita(r, grande = false) {
  const pacotes = r.usa.slice(0, grande ? 4 : 3).map(produtoPorNome).filter(Boolean)
    .map((p, i) => `<span class="rc-p rc-p${i}">${embalagem(p, p.tam[1] || p.tam[0])}</span>`).join('');
  return `<div class="rc-capa${grande ? ' grande' : ''}" style="--c:${r.cor}"><span class="rc-prato">${r.emoji}</span>${pacotes}</div>`;
}
function cartaoReceita(r) {
  return `<a class="rec aparece" href="receita.html?id=${r.id}">${capaReceita(r)}
    <div class="rec-corpo"><small>⏱ ${r.tempo} · ${r.rende}</small><h3>${r.titulo}</h3><p>${r.resumo}</p><span class="saiba">Saiba mais →</span></div></a>`;
}
function receitasLista(el, lista) { el.innerHTML = lista.map(cartaoReceita).join(''); }
function receitaDetalhe() {
  const r = RECEITAS.find((x) => x.id === new URLSearchParams(location.search).get('id')) || RECEITAS[0];
  document.title = r.titulo + ' | Super Misto Temperos';
  const usados = r.usa.map((n) => [produtoPorNome(n), PRODUTOS.findIndex((p) => p.nome === n)]).filter(([p]) => p);
  $('#receita').innerHTML = `<header class="rc-topo" style="--c:${r.cor}"><div class="caixa rc-topo-in">
      <div><a class="voltar" href="receitas.html">← Todas as receitas</a><h1>${r.titulo}</h1><p>${r.resumo}</p>
      <div class="rc-info"><span>⏱ ${r.tempo}</span><span>🍽 ${r.rende}</span></div></div>${capaReceita(r, true)}</div></header>
    <div class="caixa rc-corpo">
      <div class="rc-col"><h2>Ingredientes</h2><ul class="rc-ing">${r.ingredientes.map((i) => `<li>${i}</li>`).join('')}</ul>
        <h2>Modo de preparo</h2><ol class="rc-modo">${r.preparo.map((i) => `<li>${i}</li>`).join('')}</ol>
        ${r.variacoes ? `<h2>Varie o sabor</h2><div class="rc-var">${r.variacoes.map(([t, d]) => `<div><b>${t}</b><p>${d}</p></div>`).join('')}</div>` : ''}</div>
      <aside class="rc-lado"><h3>Produtos Super Misto desta receita</h3><div class="rc-prods">${usados.map(([p, i]) =>
        `<button class="rc-prod" data-i="${i}">${embalagem(p, p.tam[1] || p.tam[0])}<span>${p.nome}</span></button>`).join('')}</div>
        <a class="btn btn-roxo" href="${linkWhats('Olá! Vi a receita "' + r.titulo + '" no site e quero os temperos Super Misto.')}" target="_blank" rel="noopener">Quero estes temperos</a></aside>
    </div>`;
  $('#receita').addEventListener('click', (e) => { const b = e.target.closest('.rc-prod'); if (b) abrir(PRODUTOS[b.dataset.i]); });
  receitasLista($('#receitas-mais'), RECEITAS.filter((x) => x.id !== r.id).slice(0, 3));
}

/* ---------- partes comuns ---------- */
function redes() {
  const r = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']].filter(([k]) => CONFIG[k]);
  return r.length ? `<div class="redes">${r.map(([k, n]) => `<a href="${CONFIG[k]}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>` : '';
}
function rodape() {
  $('#rodape').innerHTML = `<div class="caixa rod-grid">
    <div><img src="img/logo.svg" alt="Super Misto Temperos" width="120" height="86" loading="lazy"><p>Temperos de verdade desde 2011. Fábrica própria em Xerém, Duque de Caxias (RJ).</p></div>
    <div><b>Linhas</b>${LINHAS.map((l) => `<a href="catalogo.html?linha=${l.id}">${l.nome}</a>`).join('')}</div>
    <div><b>Empresa</b><a href="receitas.html">Receitas</a><a href="index.html#sobre">Quem somos</a><a href="index.html#processo">Como fazemos</a><a href="index.html#empresas">Atacado e licitações</a><a href="index.html#empresas">Marca própria</a></div>
    <div><b>Contato</b><a data-whats="Olá! Vim pelo site da Super Misto." data-fone></a><a data-mail></a><span>Estrada de Xerém, 484 · Xerém · Duque de Caxias (RJ)</span>${redes()}</div>
  </div>
  <div class="caixa rod-base"><span>SUPER MISTO TEMPEROS LTDA · CNPJ 13.580.397/0001-80</span><span><a href="privacidade.html">Política de privacidade</a> · © ${new Date().getFullYear()} Super Misto Temperos</span></div>`;
}
function ligacoes() {
  $$('[data-whats]').forEach((a) => { a.href = linkWhats(a.dataset.whats); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-fone]').forEach((a) => { a.textContent = CONFIG.fone; });
  $$('[data-mail]').forEach((a) => { a.href = 'mailto:' + CONFIG.email; a.textContent = CONFIG.email; });
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
  $('#vitrine').innerHTML = [['Molho de pimenta vermelha', 'v1'], ['Colorau', 'v2'], ['Pimenta biquinho em conserva', 'v3'], ['Chimichurri', 'v4']]
    .map(([n, c]) => `<div class="vit ${c}">${embalagem(pegar(n), pegar(n).tam[1] || pegar(n).tam[0])}</div>`).join('') + '<div class="vit-blob"></div>';
  $('#num-prod').textContent = PRODUTOS.length + '+';
  const nomes = PRODUTOS.map((p) => p.nome);
  $('#letreiro').innerHTML = [...nomes, ...nomes].map((n) => `<span>${n}</span>`).join('<i>✦</i>');
  $('#linhas-grid').innerHTML = LINHAS.map((l) => {
    const qtd = PRODUTOS.filter((p) => p.linha === l.id).length;
    return `<a class="linha aparece" href="catalogo.html?linha=${l.id}" style="--c:${l.cor}"><span class="linha-emoji">${l.emoji}</span><b>${l.nome}</b><small>${l.desc}</small><em>${qtd} produtos →</em></a>`;
  }).join('');
  const fav = PRODUTOS.map((p, i) => [p, i]).filter(([p]) => p.tag === 'Mais procurado').slice(0, 8);
  $('#favoritos').innerHTML = fav.map(([p, i]) => cartao(p, i)).join('');
  ligarCartoes($('#favoritos'));
  receitasLista($('#receitas-home'), RECEITAS.slice(0, 3));
  $('#kits-lista').innerHTML = KITS.map((k) => `<div class="kit aparece"><span class="kit-ico">${k.ico}</span><div><b>${k.nome}</b><small>${k.itens}</small></div>
    <a class="btn btn-amarelo" href="${linkWhats(`Olá! Tenho interesse no ${k.nome} Super Misto.`)}" target="_blank" rel="noopener">Quero</a></div>`).join('');
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
  $('#filtros').innerHTML = `<button data-f="todos">Todos</button>` + LINHAS.map((l) => `<button data-f="${l.id}">${l.emoji} ${l.nome}</button>`).join('');
  const desenhar = () => {
    $$('#filtros button').forEach((b) => b.classList.toggle('ativo', b.dataset.f === linha));
    const q = norm(busca.value.trim());
    const lista = PRODUTOS.map((p, i) => [p, i]).filter(([p]) => (linha === 'todos' || p.linha === linha) && (!q || norm(p.nome + ' ' + p.desc + ' ' + p.usos).includes(q)));
    $('#conta').textContent = lista.length ? `${lista.length} produto${lista.length > 1 ? 's' : ''}` : 'Nenhum produto encontrado. Chame no WhatsApp: a gente pode produzir!';
    $('#catalogo').innerHTML = lista.map(([p, i]) => cartao(p, i)).join('');
    observar();
  };
  $('#filtros').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; linha = b.dataset.f; history.replaceState(null, '', linha === 'todos' ? 'catalogo.html' : `catalogo.html?linha=${linha}`); desenhar(); });
  busca.addEventListener('input', desenhar);
  ligarCartoes($('#catalogo'));
  desenhar();
}

document.addEventListener('DOMContentLoaded', () => {
  rodape();
  if ($('#vitrine')) inicio();
  if ($('#catalogo')) catalogo();
  if ($('#receitas-lista')) receitasLista($('#receitas-lista'), RECEITAS);
  if ($('#receita')) receitaDetalhe();
  ligacoes();
  observar();
  const hamb = $('#hamb'), menu = $('#menu');
  hamb.addEventListener('click', () => { const ab = menu.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', ab); });
  $$('#menu a').forEach((a) => a.addEventListener('click', () => { menu.classList.remove('aberto'); hamb.setAttribute('aria-expanded', false); }));
});
