/* ==========================================================================
   Consultoría Legal & Empresarial Premium — comportamiento
   ========================================================================== */
(function () {
  'use strict';

  /* --- Menú en móvil --- */
  var boton = document.getElementById('abrirMenu');
  var menu  = document.getElementById('menuMovil');
  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('ver');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    menu.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'A') {
        menu.classList.remove('ver');
        boton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Marcar en el menú la sección que se está viendo --- */
  var enlaces = [].slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  var destinos = enlaces
    .map(function (a) { return { a: a, sec: document.querySelector(a.getAttribute('href')) }; })
    .filter(function (d) { return d.sec; });

  if (destinos.length) {
    var repintar = function () {
      var y = window.scrollY + 140;
      var activo = null;
      destinos.forEach(function (d) {
        if (d.sec.offsetTop <= y) activo = d;
      });
      destinos.forEach(function (d) { d.a.classList.toggle('act', d === activo); });
    };
    var esperando = false;
    window.addEventListener('scroll', function () {
      if (esperando) return;
      esperando = true;
      window.requestAnimationFrame(function () { repintar(); esperando = false; });
    }, { passive: true });
    repintar();
  }

  /* --- Formulario de consulta --- */
  var form = document.getElementById('formConsulta');
  if (form) {
    var aviso = document.getElementById('avisoForm');

    var decir = function (texto, clase) {
      aviso.textContent = texto;
      aviso.className = 'aviso-form ' + clase;
    };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var nombre = form.nombre.value.trim();
      var email  = form.email.value.trim();
      var caso   = form.mensaje.value.trim();

      if (nombre.length < 3) {
        decir('Escreva seu nome completo, por favor.', 'mal');
        form.nombre.focus();
        return;
      }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
        decir('Confira o e-mail: parece incompleto.', 'mal');
        form.email.focus();
        return;
      }
      if (caso.length < 12) {
        decir('Conte um pouco mais sobre a mudança para podermos ajudar.', 'mal');
        form.mensaje.focus();
        return;
      }
      if (form.privacidad && !form.privacidad.checked) {
        decir('Precisamos da sua autorização para responder.', 'mal');
        return;
      }

      LeuForm(form, 'Pedido de orçamento de mudança');
      decir('✓ Obrigado, ' + nombre.split(' ')[0] + '. Abrimos o WhatsApp com o seu pedido: é só tocar em enviar.', 'ok');
      form.reset();
      aviso.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  /* --- Año del pie --- */
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();
})();
