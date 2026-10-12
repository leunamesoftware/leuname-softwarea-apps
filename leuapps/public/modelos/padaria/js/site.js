/* LeuName Softwares — liga o site ao configuracao.js (contatos e WhatsApp), confere a licença,
   protege a demonstração e o crédito do rodapé. Você não precisa mexer aqui: edite o configuracao.js. */
(function () {
  "use strict";
  var S = window.SITE || {};
  function soNumeros(t) { return String(t || "").replace(/\D/g, ""); }
  if (S.avisoDemonstracao) { var av = document.getElementById("avisoDemo"); if (av) av.hidden = false; }

  /* Pedido do carrinho: o main.js lê estes dados (número do WhatsApp e nome da empresa). */
  ["datosEnvio", "datosReserva"].forEach(function (idDados) {
  var envio = document.getElementById(idDados);
  if (envio) {
    try {
      var e = JSON.parse(envio.textContent || "{}");
      if (S.whatsapp) e.whatsapp = soNumeros(S.whatsapp);
      if (S.nome) e.negocio = S.nome;
      envio.textContent = JSON.stringify(e);
    } catch (x) {}
  }
  });


  /* Formulário → WhatsApp: junta os campos preenchidos (com o nome de cada campo) e abre a conversa
     com o número do configuracao.js. Uso no HTML: onsubmit="return LeuForm(this, 'Pedido de agendamento')". */
  window.LeuForm = function (form, titulo) {
    var linhas = ["*" + titulo + " — " + (S.nome || "") + "*", ""];
    Array.prototype.forEach.call(form.querySelectorAll("input, select, textarea"), function (el) {
      if (/^(submit|button|hidden|password)$/.test(el.type) || ((el.type === "checkbox" || el.type === "radio") && !el.checked)) return;
      var v = (el.tagName === "SELECT" && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : el.value || "").trim(); if (!v) return;
      if (el.type === "checkbox" || el.type === "radio") { var lr = el.closest("label") || (el.id && form.querySelector('label[for="' + el.id + '"]')); v = lr ? lr.textContent.replace(/\s+/g, " ").trim() : v; if (v.length > 60 || /privacid/i.test(el.name || "")) return; linhas.push("• " + v); return; }
      if (el.type === "date" && /^\d{4}-\d\d-\d\d$/.test(v)) v = v.split("-").reverse().join("/");
      var lab = el.id && form.querySelector('label[for="' + el.id + '"]');
      lab = lab || el.closest("label") || (el.parentNode && el.parentNode.querySelector("label"));
      var nome = lab ? lab.textContent.replace(/\s+/g, " ").replace(v, "").replace(/\s*\((opcional|optional)\)/i, "").trim() : (el.getAttribute("placeholder") || el.name || "");
      if (el.type === "checkbox" || el.type === "radio") { linhas.push("• " + (nome || v)); return; }
      linhas.push((nome ? nome.replace(/[:*?]\s*$/, "") + ": " : "") + v);
    });
    var zap = soNumeros(S.whatsapp);
    if (zap) window.open("https://wa.me/" + zap + "?text=" + encodeURIComponent(linhas.join("\n")), "_blank", "noopener");
    var ok = form.querySelector("[data-ok]"); if (ok) { ok.hidden = false; ok.style.display = "block"; }
    return false;
  };

  function aplicar() {
    /* Todos os links de WhatsApp vão para o número do configuracao.js. */
    var zap = soNumeros(S.whatsapp);
    if (zap) Array.prototype.forEach.call(document.querySelectorAll('a[href*="wa.me/"]'), function (a) {
      if (a.href.indexOf("wa.me/5524998721557") >= 0) return;
      var m = /[?&]text=([^&]*)/.exec(a.getAttribute("href"));
      a.href = "https://wa.me/" + zap + "?text=" + (m ? m[1] : encodeURIComponent(S.mensagemWhatsapp || ""));
    });
    /* Links de rede social sem endereço (href="#") não levam a lugar nenhum: ficam escondidos. */
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#"][target="_blank"]'), function (a) { a.style.display = "none"; });
    /* Contatos marcados no site (nome, telefone, e-mail, endereço, horário). */
    Array.prototype.forEach.call(document.querySelectorAll("[data-cfg]"), function (el) {
      var k = el.getAttribute("data-cfg");
      if (S[k] == null) return;
      if (!S[k]) { (el.closest("li") || el).style.display = "none"; return; }
      el.textContent = S[k];
      var a = el.closest("a");
      if (a && k === "telefone") a.href = "tel:+55" + soNumeros(S[k]);
      if (a && k === "email") a.href = "mailto:" + S[k];
    });
    if (S.nome) {
      document.title = document.title.replace(/^[^—|]+/, S.nome + " ");
      Array.prototype.forEach.call(document.querySelectorAll("[data-copy-ano]"), function (el) { el.textContent = new Date().getFullYear(); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicar); else aplicar();

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

/* Demonstração: os botões de WhatsApp não abrem o número de exemplo. Mostram a mensagem que chegaria
   no WhatsApp da loja e oferecem o site para quem está vendo (só quando avisoDemonstracao: true). */
(function (w, d) {
  "use strict";
  var S = w.SITE || {};
  if (!S.avisoDemonstracao) return;
  var NOSSO = "5524998721557";
  function eDaLoja(u) { return /wa\.me\//.test(u || "") && u.indexOf("wa.me/" + NOSSO) < 0; }
  function texto(u) { var m = /[?&]text=([^&]*)/.exec(u || ""); try { return m ? decodeURIComponent(m[1]) : ""; } catch (e) { return ""; } }
  function mostra(u) {
    var t = texto(u) || "(o cliente escreve a mensagem dele)";
    var j = d.createElement("div");
    j.setAttribute("role", "dialog"); j.setAttribute("aria-modal", "true");
    j.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 Inter,system-ui,sans-serif";
    var nome = (d.title || "este site").split(" — ")[0];
    j.innerHTML = '<div style="background:#fff;color:#111;border-radius:18px;max-width:440px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">' +
      '<div style="background:#128c7e;color:#fff;padding:16px 18px;border-radius:18px 18px 0 0;font-weight:700">📱 Demonstração: isto chegaria no WhatsApp da loja</div>' +
      '<pre style="white-space:pre-wrap;margin:14px 18px;background:#e7ffdb;border-radius:12px;padding:12px 14px;font:14px/1.5 Inter,system-ui,sans-serif"></pre>' +
      '<p style="margin:0 18px 14px;color:#444">No site da sua empresa, a mensagem vai direto para o <b>seu</b> WhatsApp.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;padding:0 18px 18px">' +
      '<a target="_blank" rel="noopener" style="flex:1;text-align:center;background:#16a34a;color:#fff;font-weight:800;padding:13px;border-radius:999px;text-decoration:none">Quero este site</a>' +
      '<button type="button" style="flex:1;border:1.5px solid #ccc;background:#fff;font-weight:700;padding:12px;border-radius:999px;cursor:pointer">Fechar</button></div></div>';
    j.querySelector("pre").textContent = t;
    j.querySelector("a").href = "https://wa.me/" + NOSSO + "?text=" + encodeURIComponent("Olá, LeuName Softwares! Vi a demonstração e quero o site pronto: " + nome + ".");
    function fecha() { j.remove(); }
    j.querySelector("button").addEventListener("click", fecha);
    j.addEventListener("click", function (e) { if (e.target === j) fecha(); });
    d.body.appendChild(j);
  }
  var abrir = w.open;
  w.open = function (u) { if (eDaLoja(u)) { mostra(u); return null; } return abrir.apply(w, arguments); };
  d.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a && eDaLoja(a.href)) { e.preventDefault(); e.stopPropagation(); mostra(a.href); }
  }, true);
})(window, document);

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
