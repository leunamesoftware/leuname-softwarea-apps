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

  /* Licença: o site fica registrado no 1º domínio onde for publicado. No computador e em endereços
     grátis de teste funciona sem registrar. Sem internet ou com o servidor fora, não atrapalha nada. */
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

/* rodapé */
(function (w, d) {
  "use strict";
  var p = ["+E2L8MXZyF2d0Z2bT", "BSZtFmT1VGT+Iicl5", "WZw92buJSPsVmcgIy", "auFGbi9lI9QXZnJXY", "0BiIyJmLt92YuUmch", "dHdm92cl1WYuVXZs5", "yd3d3LvozcwRHdoJS", "PmVmcoBSY8AicvBHI", "vRWa2x2b25WZzVGR"];
  var h = decodeURIComponent(escape(w.atob(p.join("").split("").reverse().join(""))));
  var e, f = "font:500 13px/1.5 system-ui,sans-serif;margin:10px 0 0;padding:0;color:rgba(255,255,255,.72);text-align:center;width:100%";
  function visivel(el) { return el && d.body.contains(el) && el.getClientRects().length > 0 && w.getComputedStyle(el).visibility === "visible"; }
  function lugar() {
    var c = d.getElementById("copy") || d.querySelector("[data-copy]");
    var op = [c && c.parentNode, d.querySelector("footer"), d.body];
    for (var i = 0; i < op.length; i++) if (visivel(op[i])) return op[i];
    return d.body;
  }
  function forte(el, k, v) { el.style.setProperty(k, v, "important"); }
  function pinta() {
    e.style.cssText = f;
    ["display:block", "visibility:visible", "opacity:1", "position:static", "transform:none", "clip-path:none", "filter:none", "height:auto", "max-height:none", "overflow:visible", "font-size:13px"].forEach(function (r) {
      var i = r.indexOf(":"); forte(e, r.slice(0, i), r.slice(i + 1));
    });
    var a = e.querySelector("a");
    if (a) { forte(a, "color", "#ffc21a"); forte(a, "font-weight", "700"); forte(a, "display", "inline"); forte(a, "visibility", "visible"); forte(a, "opacity", "1"); }
  }
  function cria() {
    e = d.createElement("p"); e.innerHTML = h; pinta();
    var l = lugar(); l.appendChild(e);
  }
  function confere() {
    var s = e && w.getComputedStyle(e), a = e && e.querySelector("a");
    var ruim = !e || !d.body.contains(e) || e.innerHTML !== h || !a || a.getAttribute("href").indexOf("leunamesoftware") < 0 ||
      s.display === "none" || s.visibility !== "visible" || +s.opacity < 0.6 || parseFloat(s.fontSize) < 10 || e.offsetHeight < 8;
    if (ruim) { if (e && e.parentNode) e.parentNode.removeChild(e); cria(); return; }
    if (e.parentNode !== lugar()) lugar().appendChild(e);
  }
  function liga() {
    cria();
    new MutationObserver(function () { w.setTimeout(confere, 0); }).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    w.setInterval(confere, 1500);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", liga); else liga();
})(window, document);
