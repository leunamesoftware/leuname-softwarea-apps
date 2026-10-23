/* Super Misto Temperos: configuração do site. Troque aqui o link da Shopee, o WhatsApp e o e-mail. */
const CONFIG = {
  shopee: 'https://shopee.com.br/', // link da loja "Super misto temperos" na Shopee
  whatsapp: '5524998721557',       // DDI + DDD + número, só números
  fone: '(24) 99872-1557',
  email: 'contato@supermistotemperos.com.br',
};

// cor: cor do tempero (desenho do montinho). cat: puros | misturas | churrasco
const PRODUTOS = [
  { nome: 'Colorau', cat: 'puros', cor: '#D8401E', tag: 'Mais vendido', desc: 'Cor vermelha intensa para arroz, feijão, frango e moquecas.' },
  { nome: 'Pimenta-do-reino moída', cat: 'puros', cor: '#3A3330', desc: 'Moída na nossa fábrica: aroma forte e picância na medida.' },
  { nome: 'Cominho moído', cat: 'puros', cor: '#A9762E', desc: 'O toque marcante da cozinha nordestina, para feijão e carnes.' },
  { nome: 'Páprica doce', cat: 'puros', cor: '#E2572B', desc: 'Sabor suave e cor bonita para carnes, batatas e molhos.' },
  { nome: 'Tempero completo', cat: 'misturas', cor: '#C99A3B', tag: 'Dia a dia', desc: 'Alho, cebola, sal e ervas: o refogado pronto em uma colher.' },
  { nome: 'Lemon pepper', cat: 'misturas', cor: '#E3C34A', desc: 'Limão e pimenta para peixes, frango e saladas.' },
  { nome: 'Chimichurri', cat: 'churrasco', cor: '#6E8B3D', tag: 'Churrasco', desc: 'Ervas, alho e pimenta: perfeito para carne na brasa.' },
  { nome: 'Tempero para churrasco', cat: 'churrasco', cor: '#B5512F', desc: 'Sal, alho, pimenta e especiarias para carnes vermelhas.' },
];

const KITS = [
  { ico: '🔥', nome: 'Kit Churrasco', itens: 'Chimichurri, tempero para churrasco, pimenta-do-reino e páprica' },
  { ico: '🍲', nome: 'Kit Cozinha do Dia a Dia', itens: 'Colorau, tempero completo, cominho, pimenta-do-reino e lemon pepper' },
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const linkWhats = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

function produtos(filtro = 'todos') {
  $('#grade').innerHTML = PRODUTOS.filter((p) => filtro === 'todos' || p.cat === filtro).map((p) => `
    <article class="prod aparece">
      <div class="prod-img">${p.tag ? `<span class="prod-tag">${p.tag}</span>` : ''}<div class="monte" style="background:${p.cor}"></div></div>
      <div class="prod-corpo">
        <h3>${p.nome}</h3>
        <p>${p.desc}</p>
        <div class="prod-tam"><span>100 g</span><span>1 kg</span></div>
        <a class="btn btn-roxo" href="${CONFIG.shopee}" target="_blank" rel="noopener">Comprar</a>
      </div>
    </article>`).join('');
  observar();
}

function kits() {
  $('#kits-lista').innerHTML = KITS.map((k) => `
    <div class="kit"><span class="kit-ico">${k.ico}</span><div><b>${k.nome}</b><small>${k.itens}</small></div>
    <a class="btn btn-amarelo" href="${CONFIG.shopee}" target="_blank" rel="noopener">Ver kit</a></div>`).join('');
}

function ligacoes() {
  $$('[data-shopee]').forEach((a) => { a.href = CONFIG.shopee; });
  $$('[data-whats]').forEach((a) => { a.href = linkWhats(a.dataset.whats); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-fone]').forEach((a) => { a.textContent = CONFIG.fone; });
  $$('[data-mail]').forEach((a) => { a.href = 'mailto:' + CONFIG.email; a.textContent = CONFIG.email; });
  $('#ano').textContent = new Date().getFullYear();
}

let obs;
function observar() {
  if (!('IntersectionObserver' in window)) { $$('.aparece').forEach((e) => e.classList.add('ok')); return; }
  obs = obs || new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('ok'); obs.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.aparece:not(.ok)').forEach((e) => obs.observe(e));
}

document.addEventListener('DOMContentLoaded', () => {
  ligacoes(); produtos(); kits();
  $$('.emp, .dicas article, .vant, .kit').forEach((e) => e.classList.add('aparece'));
  observar();

  $('#filtros').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#filtros button').forEach((x) => x.classList.toggle('ativo', x === b));
    produtos(b.dataset.f);
  });

  const hamb = $('#hamb'), menu = $('#menu');
  hamb.addEventListener('click', () => { const ab = menu.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', ab); });
  $$('#menu a').forEach((a) => a.addEventListener('click', () => { menu.classList.remove('aberto'); hamb.setAttribute('aria-expanded', false); }));

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = `Olá! Sou ${f.get('nome')}${f.get('empresa') ? ' da ' + f.get('empresa') : ''}. Vim pelo site e gostaria de um orçamento: ${f.get('msg')}`;
    window.open(linkWhats(msg), '_blank', 'noopener');
  });
});
