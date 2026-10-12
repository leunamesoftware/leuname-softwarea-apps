/* Burger & Pizza — monta o site a partir do configuracao.js (sem dependências).
   Você não precisa mexer aqui: edite só o configuracao.js. */
(function () {
  "use strict";
  var S = window.SITE || {};
  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  // Títulos aceitam só <br> e <b> (o resto vira texto).
  function titulo(t) { return esc(t).replace(/&lt;br\s*\/?&gt;/gi, "<br>").replace(/&lt;(\/?)b&gt;/gi, "<$1b>"); }
  function soNumeros(t) { return String(t || "").replace(/\D/g, ""); }
  function reais(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function linkWhats(texto) { return "https://wa.me/" + soNumeros(S.whatsapp) + "?text=" + encodeURIComponent(texto || S.mensagemWhatsapp || ""); }
  // Fotos usadas no CSS: caminho completo (senão o navegador procura dentro da pasta css).
  function urlCss(src) { try { return 'url("' + new URL(src, location.href).href + '")'; } catch (e) { return 'url("' + src + '")'; } }
  function recorte(src) { return /\.(png|webp|svg)(\?|$)/i.test(src || ""); }

  var ICONES = {
    hamburguer: '<path d="M4 10.5a8 6 0 0 1 16 0H4Z"/><path d="M3 14h18"/><path d="M4.5 17h15a2 2 0 0 1-2 2.5h-11a2 2 0 0 1-2-2.5Z"/><path d="M9 7.5h.01M12 6.5h.01M15 7.5h.01"/>',
    pizza: '<path d="M12 3 3.5 18.5c5.4 2.3 11.6 2.3 17 0L12 3Z"/><path d="M5.6 14.6c4 1.5 8.8 1.5 12.8 0"/><circle cx="11" cy="11" r="1"/><circle cx="13.5" cy="15.8" r="1"/><circle cx="9" cy="16.2" r="1"/>',
    porcao: '<path d="M4 11h16l-1.6 8.2a1.5 1.5 0 0 1-1.5 1.3H7.1a1.5 1.5 0 0 1-1.5-1.3L4 11Z"/><path d="M7.5 11 6.5 4.5M10.5 11l-.3-7.5M13.5 11l.3-7.5M16.5 11l1-6.5"/>',
    bebida: '<path d="M6 7h12l-1.3 12.6a1.5 1.5 0 0 1-1.5 1.4H8.8a1.5 1.5 0 0 1-1.5-1.4L6 7Z"/><path d="M5 7h14"/><path d="M12 7 14 2.5h3"/>',
    sobremesa: '<path d="M4 20h16v-5.5H4V20Z"/><path d="M4 14.5c1.5 1.4 3 1.4 4.5 0s3-1.4 4.5 0 3 1.4 4.5 0 2.2-1.2 2.5-1.5"/><path d="M6.5 14.5 12 6l5.5 8.5"/>',
    combo: '<path d="M3 11a6 4.5 0 0 1 12 0H3Z"/><path d="M2.5 13.5h13"/><path d="M3.5 16h11a1.5 1.5 0 0 1-1.5 2h-8a1.5 1.5 0 0 1-1.5-2Z"/><path d="M17 8h4l-1 12h-2.4"/>',
    destaques: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
    entrega: '<circle cx="6" cy="17.5" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M8.5 17.5h7M3.5 15V9h7l2 5h3.2l2.3 3.5"/><path d="M14.5 9h3l1.5 3.5M1 11h3M1.5 13h2"/>',
    seguro: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pix: '<path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="m8 12 4-4 4 4-4 4-4-4Z"/>'
  };
  function icone(nome, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + (ICONES[nome] || ICONES.estrela) + "</svg>";
  }

  /* ---------- Cores, título, aviso ---------- */
  var raiz = document.documentElement.style;
  if (S.corPrincipal) raiz.setProperty("--amarelo", S.corPrincipal), raiz.setProperty("--amarelo-esc", S.corPrincipal);
  if (S.corDestaque) raiz.setProperty("--vermelho", S.corDestaque);
  var nomeLimpo = String(S.nome || "Hamburgueria").replace(/&/g, " & ").replace(/\s+/g, " ").trim();
  document.title = nomeLimpo + " — " + (S.complemento || "Hambúrgueres e pizzas");
  if (S.avisoDemonstracao) $("avisoDemo").hidden = false;

  /* ---------- Marca (logo ou nome escrito) ---------- */
  var partes = String(S.nome || "Hamburgueria").split("&");
  var marcaTxt = '<span class="marca-txt"><strong>' + esc(partes[0]) + (partes[1] ? "<em>&amp;" + esc(partes[1]) + "</em>" : "") + "</strong>" +
    (S.complemento ? "<small>" + esc(S.complemento) + "</small>" : "") + "</span>";
  $all("[data-marca]").forEach(function (el) {
    if (S.logo) {
      var img = new Image();
      img.alt = nomeLimpo; img.src = S.logo; img.width = 180; img.height = 52;
      img.onerror = function () { el.innerHTML = marcaTxt; };
      el.appendChild(img);
    } else el.innerHTML = marcaTxt;
  });

  /* ---------- Links do WhatsApp ---------- */
  $all("[data-zap]").forEach(function (a) { a.href = linkWhats(); });

  /* ---------- Banner ---------- */
  var B = S.banner || {};
  if (B.imagem) raiz.setProperty("--hero", urlCss(B.imagem));
  if (B.imagemCelular) raiz.setProperty("--hero-cel", urlCss(B.imagemCelular));
  $all("[data-banner]").forEach(function (el) {
    var k = el.getAttribute("data-banner");
    if (!B[k]) { el.remove(); return; }
    el.innerHTML = k === "titulo" ? titulo(B[k]) : esc(B[k]);
  });

  /* ---------- Vantagens ---------- */
  $("vantagens").innerHTML = (S.vantagens || []).map(function (v) {
    return "<li>" + icone(v.icone) + "<div><strong>" + esc(v.titulo) + "</strong><span>" + esc(v.texto) + "</span></div></li>";
  }).join("");
  if (!(S.vantagens || []).length) $("vantagens").remove();

  /* ---------- Cardápio ---------- */
  var produtos = (S.produtos || []).map(function (p, i) { p._id = "p" + i; return p; });
  var combos = (S.combos || []).map(function (c, i) { c._id = "c" + i; return c; });
  var porId = {};
  produtos.concat(combos).forEach(function (p) { porId[p._id] = p; });

  var cats = (S.categorias || []).filter(function (c) { return produtos.some(function (p) { return p.categoria === c.id; }); });
  var temDestaque = produtos.some(function (p) { return p.destaque; });
  var abas = (temDestaque ? [{ id: "_destaques", nome: "Destaques", icone: "destaques" }] : []).concat(cats);
  $("cardapioSub").textContent = cats.map(function (c) { return c.nome; }).join(", ").replace(/, ([^,]*)$/, " e $1") + ".";

  function cardProduto(p) {
    return '<article class="produto">' +
      '<div class="produto-foto' + (recorte(p.imagem) ? " recorte" : "") + '"><img src="' + esc(p.imagem) + '" alt="' + esc(p.nome) + '" loading="lazy" width="400" height="300"></div>' +
      '<div class="produto-info"><h3>' + esc(p.nome) + "</h3><p>" + esc(p.descricao) + "</p>" +
      '<div class="produto-preco"><strong>' + reais(p.preco) + "</strong>" + (p.de ? "<s>" + reais(p.de) + "</s>" : "") + "</div>" +
      '<button type="button" class="btn btn-amarelo" data-add="' + p._id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-carrinho"/></svg>Adicionar</button></div></article>';
  }
  function mostrarAba(id) {
    $all(".aba").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-aba") === id)); });
    var lista = id === "_destaques" ? produtos.filter(function (p) { return p.destaque; }) : produtos.filter(function (p) { return p.categoria === id; });
    $("produtos").innerHTML = lista.map(cardProduto).join("");
  }
  $("abas").innerHTML = abas.map(function (c) {
    return '<button type="button" class="aba" role="tab" data-aba="' + esc(c.id) + '">' + icone(c.icone) + esc(c.nome) + "</button>";
  }).join("");
  $("abas").addEventListener("click", function (e) {
    var b = e.target.closest("[data-aba]"); if (!b) return;
    mostrarAba(b.getAttribute("data-aba"));
    b.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
  if (abas.length) mostrarAba(abas[0].id);

  /* ---------- Promoções ---------- */
  var P = S.promocao || {};
  if (P.imagem) raiz.setProperty("--promo", urlCss(P.imagem));
  $all("[data-promo]").forEach(function (el) {
    var k = el.getAttribute("data-promo");
    if (!P[k]) { el.remove(); return; }
    el.innerHTML = k === "titulo" ? titulo(P[k]) : esc(P[k]);
  });
  $("combos").innerHTML = combos.map(function (c) {
    var desconto = c.de && c.de > c.preco ? Math.round((1 - c.preco / c.de) * 100) : 0;
    return '<article class="combo"><img src="' + esc(c.imagem) + '" alt="' + esc(c.nome) + '" loading="lazy" width="96" height="96">' +
      "<div><h3>" + esc(c.nome) + (desconto ? '<span class="selo">-' + desconto + "%</span>" : "") + "</h3><p>" + esc(c.descricao) + "</p>" +
      '<div class="combo-pe"><div class="produto-preco"><strong>' + reais(c.preco) + "</strong>" + (c.de ? "<s>" + reais(c.de) + "</s>" : "") + "</div>" +
      '<button type="button" class="btn btn-amarelo" data-add="' + c._id + '">Adicionar</button></div></div></article>';
  }).join("");
  if (!combos.length && !P.titulo) $("promocoes").remove();

  /* ---------- Sobre ---------- */
  var SO = S.sobre || {};
  if (SO.imagem) $("sobreImg").src = SO.imagem; else $("sobreImg").parentNode.remove();
  $("sobreTitulo").innerHTML = titulo(SO.titulo || "Sobre nós");
  $("sobreTexto").textContent = SO.texto || "";

  /* ---------- Galeria + foto ampliada ---------- */
  var gal = S.galeria || [];
  $("galeriaGrade").innerHTML = gal.map(function (src, i) {
    return '<button type="button" data-foto="' + esc(src) + '" aria-label="Ampliar foto ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy" width="300" height="300"></button>';
  }).join("");
  if (!gal.length) $("galeria").remove();
  var lb = $("lightbox");
  $("galeriaGrade").addEventListener("click", function (e) {
    var b = e.target.closest("[data-foto]"); if (!b) return;
    lb.querySelector("img").src = b.getAttribute("data-foto"); lb.hidden = false;
  });
  lb.addEventListener("click", function () { lb.hidden = true; });

  /* ---------- Depoimentos ---------- */
  $("depoimentosGrade").innerHTML = (S.depoimentos || []).map(function (d) {
    return '<article class="depo"><div class="depo-topo">' + (d.foto ? '<img src="' + esc(d.foto) + '" alt="" loading="lazy" width="76" height="76">' : "") +
      '<div class="estrelas" aria-label="5 estrelas">★★★★★</div></div><blockquote>“' + esc(d.texto) + "”</blockquote>" +
      "<footer><strong>" + esc(d.nome) + "</strong>" + (d.cidade ? "<span>" + esc(d.cidade) + "</span>" : "") + "</footer></article>";
  }).join("");
  if (!(S.depoimentos || []).length) $("depoimentos").remove();

  /* ---------- Rodapé ---------- */
  $("rodHorario").textContent = S.horarioTexto || "";
  var REDES = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8Z"/></svg>'
  };
  $("redes").innerHTML = ["instagram", "facebook"].filter(function (r) { return S[r]; }).map(function (r) {
    return '<a href="' + esc(S[r]) + '" target="_blank" rel="noopener" aria-label="' + r + '">' + REDES[r] + "</a>";
  }).join("") + '<a href="' + linkWhats() + '" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><use href="#i-zap"/></svg></a>';
  if (S.telefone) { var t = $("rodTel").querySelector("a"); t.href = "tel:+55" + soNumeros(S.telefone); t.textContent = S.telefone; } else $("rodTel").remove();
  if (S.endereco) $("rodEnd").querySelector("span").textContent = S.endereco; else $("rodEnd").remove();
  if (S.horarioTexto) $("rodHora").querySelector("span").textContent = S.horarioTexto; else $("rodHora").remove();
  if (S.endereco) {
    $("mapa").innerHTML = '<iframe title="Mapa: ' + esc(S.endereco) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
      encodeURIComponent(S.endereco) + '&z=15&output=embed"></iframe>';
  } else $("mapa").remove();
  $("copy").textContent = "© " + new Date().getFullYear() + " " + nomeLimpo + ". Todos os direitos reservados.";

  /* ---------- Aberto agora? ---------- */
  (function () {
    var H = S.horario; if (!H || !H.abre || !H.fecha) return;
    var min = function (h) { var p = String(h).split(":"); return (+p[0]) * 60 + (+p[1] || 0); };
    var agora = new Date(), m = agora.getHours() * 60 + agora.getMinutes(), dia = agora.getDay();
    var abre = min(H.abre), fecha = min(H.fecha), dias = H.dias || [0, 1, 2, 3, 4, 5, 6];
    var aberto = fecha > abre ? dias.indexOf(dia) >= 0 && m >= abre && m < fecha
      : (dias.indexOf(dia) >= 0 && m >= abre) || (dias.indexOf((dia + 6) % 7) >= 0 && m < fecha);
    var el = $("aberto"); el.hidden = false;
    el.textContent = aberto ? "Aberto agora" : "Fechado agora";
    el.classList.toggle("fechado", !aberto);
  })();

  /* ---------- Menu do celular e item ativo ---------- */
  var menu = $("menu"), menuBtn = $("menuBtn");
  function fecharMenu() { menu.classList.remove("aberto"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    var abrir = !menu.classList.contains("aberto");
    menu.classList.toggle("aberto", abrir); menuBtn.setAttribute("aria-expanded", String(abrir));
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) fecharMenu(); });
  if ("IntersectionObserver" in window) {
    var links = $all(".menu a[href^='#']");
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("ativo", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- Carrinho (fica guardado no aparelho do cliente) ---------- */
  var CHAVE = "carrinho:" + soNumeros(S.whatsapp);
  var carrinho = {};
  try { carrinho = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch (e) { carrinho = {}; }
  Object.keys(carrinho).forEach(function (k) { if (!porId[k] || !(carrinho[k] > 0)) delete carrinho[k]; });
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch (e) {} }
  var E = S.entrega || {};
  var pags = S.pagamentos && S.pagamentos.length ? S.pagamentos : ["Pix", "Cartão na entrega", "Dinheiro"];
  $("fPag").innerHTML = pags.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("");
  if (E.retirada === false) $("optRetirada").remove();

  function tipo() { var r = document.querySelector('input[name="tipo"]:checked'); return r ? r.value : "entrega"; }
  function subtotal() { return Object.keys(carrinho).reduce(function (s, k) { return s + porId[k].preco * carrinho[k]; }, 0); }
  function taxa() { return tipo() === "entrega" ? Number(E.taxa || 0) : 0; }

  function desenhar() {
    var ids = Object.keys(carrinho), qtd = ids.reduce(function (s, k) { return s + carrinho[k]; }, 0);
    var cont = $("contador"); cont.textContent = qtd;
    $("carVazio").hidden = !!ids.length; $("carForm").hidden = !ids.length; $("carRodape").hidden = !ids.length;
    $("carItens").innerHTML = ids.map(function (k) {
      var p = porId[k];
      return '<li class="car-item"><img src="' + esc(p.imagem) + '" alt=""><div><strong>' + esc(p.nome) + "</strong><span>" + reais(p.preco * carrinho[k]) + "</span></div>" +
        '<div class="qtd"><button type="button" data-menos="' + k + '" aria-label="Tirar um ' + esc(p.nome) + '">−</button><b>' + carrinho[k] +
        '</b><button type="button" data-mais="' + k + '" aria-label="Mais um ' + esc(p.nome) + '">+</button></div></li>';
    }).join("");
    var entrega = tipo() === "entrega";
    $("campoEnd").hidden = !entrega;
    $("linhaTaxa").hidden = !entrega;
    $("carTaxa").textContent = taxa() ? reais(taxa()) : "Grátis";
    $("carSub").textContent = reais(subtotal());
    $("carTotal").textContent = reais(subtotal() + taxa());
    $("campoTroco").hidden = !/dinheiro/i.test($("fPag").value);
  }
  function aviso(txt) {
    var a = $("aviso"); a.textContent = txt; a.classList.add("mostra");
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove("mostra"); }, 1800);
  }
  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]"), mais = e.target.closest("[data-mais]"), menos = e.target.closest("[data-menos]");
    if (add) {
      var k = add.getAttribute("data-add"); carrinho[k] = (carrinho[k] || 0) + 1; salvar(); desenhar();
      aviso("✓ " + porId[k].nome + " no carrinho");
      var c = $("contador"); c.classList.add("pulo"); setTimeout(function () { c.classList.remove("pulo"); }, 250);
    }
    if (mais) { carrinho[mais.getAttribute("data-mais")]++; salvar(); desenhar(); }
    if (menos) { var m = menos.getAttribute("data-menos"); if (--carrinho[m] <= 0) delete carrinho[m]; salvar(); desenhar(); }
  });
  $("carForm").addEventListener("change", desenhar);
  $("carForm").addEventListener("input", function (e) {
    if (!e.target.classList.contains("bad")) return;
    e.target.classList.remove("bad"); var er = e.target.parentNode.querySelector(".err"); if (er) er.textContent = "";
    if (!$("carForm").querySelector(".bad")) $("carMsg").textContent = "";
  });

  var painel = $("carrinho"), fundo = $("fundoEscuro");
  function abrirCarrinho() { painel.classList.add("aberto"); painel.setAttribute("aria-hidden", "false"); fundo.hidden = false; document.body.classList.add("travado"); fecharMenu(); setTimeout(function () { $("fecharCarrinho").focus(); }, 50); }
  function fecharCarrinho() { painel.classList.remove("aberto"); painel.setAttribute("aria-hidden", "true"); fundo.hidden = true; document.body.classList.remove("travado"); }
  $("abrirCarrinho").addEventListener("click", abrirCarrinho);
  $("fecharCarrinho").addEventListener("click", fecharCarrinho);
  fundo.addEventListener("click", fecharCarrinho);
  painel.addEventListener("click", function (e) { if (e.target.closest("[data-fechar]")) fecharCarrinho(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { fecharCarrinho(); lb.hidden = true; fecharMenu(); } });

  $("enviarPedido").addEventListener("click", function () {
    var msg = $("carMsg"); msg.textContent = "";
    var nome = $("fNome"), end = $("fEnd"), ok = true;
    [[nome, nome.value.trim().length >= 2, "Escreva seu nome."], [end, tipo() !== "entrega" || end.value.trim().length >= 8, "Escreva o endereço completo."]].forEach(function (r) {
      r[0].classList.toggle("bad", !r[1]); r[0].parentNode.querySelector(".err").textContent = r[1] ? "" : r[2]; if (!r[1]) ok = false;
    });
    if (!ok) { msg.textContent = "Confira os campos marcados."; ($("carForm").querySelector(".bad") || nome).focus(); return; }
    if (tipo() === "entrega" && E.pedidoMinimo && subtotal() < E.pedidoMinimo) { msg.textContent = "O pedido mínimo para entrega é " + reais(E.pedidoMinimo) + "."; return; }
    var linhas = Object.keys(carrinho).map(function (k) { return "• " + carrinho[k] + "x " + porId[k].nome + " — " + reais(porId[k].preco * carrinho[k]); });
    var texto = "Olá! Quero fazer um pedido:\n\n" + linhas.join("\n") +
      "\n\nSubtotal: " + reais(subtotal()) + (tipo() === "entrega" ? "\nEntrega: " + (taxa() ? reais(taxa()) : "grátis") : "") +
      "\n*Total: " + reais(subtotal() + taxa()) + "*" +
      "\n\nNome: " + nome.value.trim() +
      (tipo() === "entrega" ? "\nEntregar em: " + end.value.trim() : "\nVou retirar no local.") +
      "\nPagamento: " + $("fPag").value + (/dinheiro/i.test($("fPag").value) && $("fTroco").value.trim() ? " (troco para R$ " + $("fTroco").value.trim() + ")" : "") +
      ($("fObs").value.trim() ? "\nObservação: " + $("fObs").value.trim() : "");
    window.open(linkWhats(texto), "_blank", "noopener");
  });
  desenhar();

  /* ---------- Licença: o site fica registrado no 1º domínio onde for publicado ----------
     No computador e em endereços grátis de teste funciona sem registrar. Sem internet ou com o servidor fora, não atrapalha. */
  (function () {
    if (S.avisoDemonstracao || !/^https?:$/.test(location.protocol)) return;
    var host = location.hostname.toLowerCase();
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.)/.test(host) || /\.(local|pages\.dev|netlify\.app|vercel\.app|github\.io)$/.test(host)) return;
    fetch("https://www.leunamesoftware.com.br/loja-api/template/licenca?chave=" + encodeURIComponent(S.licenca || "") + "&dominio=" + encodeURIComponent(host))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.ok !== false) return;
        // Sem licença (compra cancelada, estornada ou outro endereço): o site inteiro fica bloqueado.
        var motivo = d.motivo === "cancelada" ? "A licença deste site foi cancelada."
          : d.motivo === "outro_dominio" ? "Este site está licenciado para outro endereço."
          : "Este site não tem licença para este endereço.";
        document.documentElement.style.overflow = "hidden";
        var tela = document.createElement("div");
        tela.setAttribute("role", "alert");
        tela.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:500 16px/1.5 Inter,system-ui,sans-serif";
        tela.innerHTML = "<div style=\"max-width:440px\"><div style=\"font-size:44px;margin-bottom:8px\">🔒</div><h1 style=\"font:800 24px/1.2 Inter,system-ui,sans-serif;color:#fff;margin:0 0 10px\">Site bloqueado</h1><p style=\"margin:0 0 18px;opacity:.85\">" + motivo + "</p><a style=\"display:inline-block;background:#2f7dff;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700\" href=\"https://www.leunamesoftware.com.br\">Comprar a licença</a></div>";
        document.body.appendChild(tela);
        // Se alguém apagar a tela pelo navegador, ela volta.
        new MutationObserver(function () { if (!document.body.contains(tela)) document.body.appendChild(tela); }).observe(document.body, { childList: true });
      })
      .catch(function () {});
  })();
})();
