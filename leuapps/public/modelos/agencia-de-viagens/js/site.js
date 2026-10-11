/* Agência de Viagens — monta o site a partir do configuracao.js (sem dependências).
   Você não precisa mexer aqui: edite só o configuracao.js. */
(function () {
  "use strict";
  var S = window.SITE || {};

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function soNumeros(t) { return String(t || "").replace(/\D/g, ""); }
  function linkWhats(texto) {
    return "https://wa.me/" + soNumeros(S.whatsapp) + "?text=" + encodeURIComponent(texto || S.mensagemWhatsapp || "");
  }
  function parcela(preco, vezes) {
    var v = Number(String(preco).replace(/\./g, "").replace(",", "."));
    if (!v || !vezes || vezes < 2) return "";
    return "ou " + vezes + "x de R$ " + (v / vezes).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* Cores e textos básicos */
  var raiz = document.documentElement.style;
  if (S.corPrincipal) { raiz.setProperty("--coral", S.corPrincipal); raiz.setProperty("--coral-dark", S.corPrincipal); }
  if (S.corEscura) { raiz.setProperty("--teal-900", S.corEscura); raiz.setProperty("--teal-800", S.corEscura); }
  document.title = (S.nome || "Agência de Viagens") + " — " + (S.complemento || "Agência de Viagens");
  if (S.avisoDemonstracao) document.getElementById("avisoDemo").hidden = false;

  var valores = {
    endereco: S.endereco, horario: S.horario,
    sobre: (S.banner && S.banner.texto) || ""
  };
  $all("[data-txt]").forEach(function (el) {
    var v = valores[el.getAttribute("data-txt")];
    if (!v) { el.remove(); return; }
    el.textContent = (el.getAttribute("data-pre") || "") + v;
  });
  $all("[data-tel]").forEach(function (el) {
    if (!S.telefone) { el.remove(); return; }
    el.href = "tel:+55" + soNumeros(S.telefone);
    el.textContent = (el.getAttribute("data-pre") || "") + S.telefone;
  });
  $all("[data-mail]").forEach(function (el) {
    if (!S.email) { el.remove(); return; }
    el.href = "mailto:" + S.email;
    el.textContent = (el.getAttribute("data-pre") || "") + S.email;
  });
  $all("[data-wa]").forEach(function (el) {
    el.href = linkWhats();
    el.target = "_blank"; el.rel = "noopener";
  });
  $all("[data-cadastur]").forEach(function (el) {
    if (S.cadastur) el.textContent = "Cadastur nº " + S.cadastur; else el.remove();
  });
  $all("[data-copy]").forEach(function (el) {
    el.textContent = "© " + new Date().getFullYear() + " " + (S.nome || "") + ". Todos os direitos reservados." + (S.cadastur ? " Cadastur nº " + S.cadastur + "." : "");
  });

  /* Logo */
  $all("[data-logo]").forEach(function (el) {
    el.innerHTML = (S.logo ? '<img class="logo-img" src="' + esc(S.logo) + '" alt="">' : '<span class="logo-mark">✈</span>') +
      '<span class="logo-text">' + esc(S.nome || "") + "<small>" + esc(S.complemento || "") + "</small></span>";
    el.setAttribute("aria-label", (S.nome || "") + " — início");
  });

  /* Redes sociais */
  var redes = [["instagram", "Instagram", "ig"], ["facebook", "Facebook", "f"], ["youtube", "YouTube", "yt"], ["tiktok", "TikTok", "tt"]];
  $all("[data-redes]").forEach(function (el) {
    el.innerHTML = redes.filter(function (r) { return S[r[0]]; }).map(function (r) {
      return '<a href="' + esc(S[r[0]]) + '" target="_blank" rel="noopener" aria-label="' + r[1] + '">' + r[2] + "</a>";
    }).join("");
  });

  /* Banner */
  var b = S.banner || {};
  var img = document.getElementById("bannerImg");
  img.src = b.imagem || "imagens/banner.jpg";
  img.alt = b.titulo ? b.titulo.replace(/<[^>]+>/g, " ") : "";
  document.getElementById("bannerFrase").textContent = b.frase || "";
  document.getElementById("bannerTitulo").innerHTML = b.titulo || ""; // aceita <br>
  document.getElementById("bannerTexto").textContent = b.texto || "";

  /* Destinos */
  document.getElementById("destTrack").innerHTML = (S.destinos || []).map(function (d) {
    return '<article class="dest-card">' +
      '<div class="dest-photo"><img src="' + esc(d.imagem) + '" alt="' + esc(d.nome) + '" loading="lazy">' +
      '<button class="fav" type="button" aria-label="Favoritar ' + esc(d.nome) + '">♡</button></div>' +
      '<div class="dest-body"><span class="dest-zone">' + esc(d.regiao) + "</span><h3>" + esc(d.nome) + "</h3>" +
      '<p class="dest-days">' + esc(d.dias) + "</p>" +
      '<div class="dest-foot"><span class="stars">★★★★★ <b>' + esc(d.nota) + "</b>" + (d.avaliacoes ? " <i>(" + esc(d.avaliacoes) + ")</i>" : "") + "</span>" +
      '<span class="price"><small>A partir de</small>R$ ' + esc(d.preco) + "</span></div>" +
      (parcela(d.preco, d.parcelas) ? '<p class="parc">' + parcela(d.preco, d.parcelas) + "</p>" : "") +
      '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="' + esc(linkWhats("Olá! Quero saber mais sobre a viagem para " + d.nome + ".")) + '">Quero essa viagem</a>' +
      "</div></article>";
  }).join("");

  /* Cartões laterais */
  var lado = document.querySelector("[data-destaques]");
  lado.innerHTML = (S.destaques || []).map(function (c, i) {
    return '<a class="side-card" target="_blank" rel="noopener" href="' + esc(linkWhats("Olá! Quero saber sobre: " + c.titulo + ".")) + '">' +
      '<img src="' + esc(c.imagem) + '" alt="" loading="lazy"><div class="side-body"><h3>' + esc(c.titulo) + "</h3><p>" + esc(c.texto) + "</p>" +
      '<span class="btn ' + (i % 2 ? "btn-coral" : "btn-dark") + ' btn-sm">' + esc(c.botao) + "</span></div></a>";
  }).join("");

  /* Números */
  var icones = ["🏅", "🌍", "🧳", "🙂", "🎧"];
  document.querySelector("[data-numeros]").innerHTML = (S.numeros || []).map(function (n, i) {
    return '<div class="stat"><span class="stat-ic">' + icones[i % icones.length] + "</span><div><b>" + esc(n.valor) + "</b><span>" + esc(n.texto) + "</span></div></div>";
  }).join("");

  /* Tipos de viagem */
  var tipos = S.tipos || [];
  document.getElementById("typeGrid").innerHTML = tipos.map(function (t) {
    return '<button class="type" type="button" data-type="' + esc(t.nome) + '"><span>' + esc(t.icone) + "</span>" + esc(t.nome) + "</button>";
  }).join("") + '<a href="#planejar" class="type type-all"><span>🔲</span>Outro tipo<br>de viagem</a>';
  $all("[data-tipos-select]").forEach(function (sel) {
    sel.innerHTML = tipos.map(function (t) { return "<option>" + esc(t.nome) + "</option>"; }).join("");
  });
  $all("[data-tipos-links]").forEach(function (el) {
    el.innerHTML = tipos.slice(0, 5).map(function (t) { return '<a href="#tipos">' + esc(t.nome) + "</a>"; }).join("");
  });

  /* Depoimentos */
  document.querySelector("[data-depoimentos]").innerHTML = (S.depoimentos || []).map(function (d) {
    var ini = String(d.nome || "").split(" ").map(function (p) { return p.charAt(0); }).slice(0, 2).join("").toUpperCase();
    return '<figure class="testi"><p>“' + esc(d.texto) + '”</p><div class="testi-foot"><span class="stars">★★★★★ <b>5.0</b></span></div>' +
      '<figcaption><span class="avatar">' + esc(ini) + "</span><span><b>" + esc(d.nome) + "</b><small>" + esc(d.cidade) + "</small></span></figcaption></figure>";
  }).join("");

  /* Pacotes */
  document.querySelector("[data-pacotes]").innerHTML = (S.pacotes || []).map(function (p) {
    return '<article class="pack' + (p.destaque ? " featured" : "") + '"><span class="pack-tag">' + esc(p.etiqueta) + "</span><h3>" + esc(p.titulo) + "</h3>" +
      "<p>" + esc(p.texto) + "</p><ul>" + (p.itens || []).map(function (i) { return "<li>✓ " + esc(i) + "</li>"; }).join("") + "</ul>" +
      '<div class="pack-foot"><span class="price"><small>A partir de</small>R$ ' + esc(p.preco) +
      (parcela(p.preco, p.parcelas) ? '<em class="parc">' + parcela(p.preco, p.parcelas) + "</em>" : "") + "</span>" +
      '<a class="btn btn-coral btn-sm" target="_blank" rel="noopener" href="' + esc(linkWhats("Olá! Quero o pacote " + p.titulo + ".")) + '">Quero este</a></div></article>';
  }).join("");

  /* Perguntas */
  document.querySelector("[data-perguntas]").innerHTML = (S.perguntas || []).map(function (q) {
    return '<details class="faq"><summary>' + esc(q.p) + "</summary><p>" + esc(q.r) + "</p></details>";
  }).join("");

  /* Dicas */
  document.querySelector("[data-dicas]").innerHTML = (S.dicas || []).map(function (d) {
    return '<article class="post"><span class="post-tag">' + esc(d.etiqueta) + "</span><h3>" + esc(d.titulo) + "</h3><p>" + esc(d.texto) + "</p>" +
      '<a class="link-arrow" target="_blank" rel="noopener" href="' + esc(linkWhats("Olá! Li a dica \"" + d.titulo + "\" e quero ajuda para planejar.")) + '">Falar com um consultor →</a></article>';
  }).join("");

  /* ---------------- Interações ---------------- */

  /* Menu do celular */
  var burger = document.getElementById("burger");
  var navLinks = document.getElementById("navLinks");
  burger.addEventListener("click", function () {
    var aberto = navLinks.classList.toggle("open");
    burger.classList.toggle("open", aberto);
    burger.setAttribute("aria-expanded", String(aberto));
    burger.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  });
  $all(".nav-links a").forEach(function (a) {
    a.addEventListener("click", function () {
      navLinks.classList.remove("open"); burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false");
    });
  });

  /* Item do menu ativo conforme a seção na tela */
  var secoes = $all("section[id]"), links = $all(".nav-links a");
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach(function (s) { obs.observe(s); });
  }

  /* Carrossel de destinos */
  var trilho = document.getElementById("destTrack");
  function passo() { var c = trilho.querySelector(".dest-card"); return c ? c.getBoundingClientRect().width + 16 : 280; }
  document.getElementById("destPrev").addEventListener("click", function () { trilho.scrollBy({ left: -passo(), behavior: "smooth" }); });
  document.getElementById("destNext").addEventListener("click", function () { trilho.scrollBy({ left: passo(), behavior: "smooth" }); });

  /* Favoritar (só visual) */
  $all(".fav").forEach(function (f) {
    f.addEventListener("click", function (e) { e.preventDefault(); var on = f.classList.toggle("on"); f.textContent = on ? "♥" : "♡"; });
  });

  /* Tipos de viagem: escolhe e leva para o formulário */
  var typeMsg = document.getElementById("typeMsg");
  $all(".type[data-type]").forEach(function (bt) {
    bt.addEventListener("click", function () {
      $all(".type").forEach(function (o) { o.classList.remove("on"); });
      bt.classList.add("on");
      document.getElementById("pTipo").value = bt.getAttribute("data-type");
      typeMsg.textContent = "✓ " + bt.getAttribute("data-type") + " escolhido. Agora é só preencher o formulário abaixo.";
    });
  });

  function dataBR(v) { return v ? v.split("-").reverse().join("/") : ""; }

  /* Busca do banner: manda o pedido pelo WhatsApp */
  document.getElementById("buscaForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var destino = document.getElementById("bDestino").value.trim();
    var msg = document.getElementById("bMsg");
    if (!destino) { msg.style.color = "#d9534f"; msg.textContent = "Escreva o destino para pedir o orçamento."; document.getElementById("bDestino").focus(); return; }
    var texto = "Olá! Quero um orçamento de viagem.\n• Destino: " + destino +
      (document.getElementById("bIda").value ? "\n• Ida: " + dataBR(document.getElementById("bIda").value) : "") +
      (document.getElementById("bVolta").value ? "\n• Volta: " + dataBR(document.getElementById("bVolta").value) : "") +
      "\n• Viajantes: " + document.getElementById("bPessoas").value + "\n• Tipo: " + document.getElementById("bTipo").value;
    msg.style.color = "#1a7f5a"; msg.textContent = "✓ Abrindo o WhatsApp…";
    window.open(linkWhats(texto), "_blank", "noopener");
  });

  /* Formulário: confere os campos e envia pelo WhatsApp */
  var form = document.getElementById("planForm");
  var regras = [
    { id: "pNome", ok: function (v) { return v.length >= 3; }, msg: "Escreva seu nome completo." },
    { id: "pTel", ok: function (v) { return soNumeros(v).length >= 10; }, msg: "Escreva o WhatsApp com DDD." }
  ];
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var tudoOk = true;
    regras.forEach(function (r) {
      var el = document.getElementById(r.id), erro = el.parentElement.querySelector(".err");
      var ok = r.ok(el.value.trim());
      el.classList.toggle("bad", !ok); erro.textContent = ok ? "" : r.msg;
      if (!ok) tudoOk = false;
    });
    var saida = document.getElementById("planOk");
    if (!tudoOk) { saida.style.color = "#d9534f"; saida.textContent = "Confira os campos marcados."; form.querySelector(".bad").focus(); return; }
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var texto = "Olá! Quero planejar uma viagem.\n• Nome: " + v("pNome") + "\n• WhatsApp: " + v("pTel") +
      (v("pDestino") ? "\n• Destino: " + v("pDestino") : "") + "\n• Tipo: " + v("pTipo") +
      (v("pData") ? "\n• Data: " + dataBR(v("pData")) : "") + "\n• Pessoas: " + (v("pPessoas") || "—") +
      (v("pMsg") ? "\n• Detalhes: " + v("pMsg") : "");
    saida.style.color = "#1a7f5a"; saida.textContent = "✓ Abrindo o WhatsApp com o seu pedido…";
    window.open(linkWhats(texto), "_blank", "noopener");
  });
})();
