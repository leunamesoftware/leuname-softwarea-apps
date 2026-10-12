/* ==========================================================================
   Restaurante Premium — comportamiento
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
      if (ev.target.closest('a')) {
        menu.classList.remove('ver');
        boton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Marcar en el menú la sección que se está viendo --- */
  var destinos = [].slice.call(document.querySelectorAll('.menu a[href^="#"]'))
    .map(function (a) { return { a: a, sec: document.querySelector(a.getAttribute('href')) }; })
    .filter(function (d) { return d.sec; });

  if (destinos.length) {
    var repintar = function () {
      var y = window.scrollY + 150, activo = null;
      destinos.forEach(function (d) { if (d.sec.offsetTop <= y) activo = d; });
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

  /* --- Carrusel de la portada --- */
  var lienzo = document.getElementById('lienzo');
  if (lienzo) {
    var fotos = [].slice.call(lienzo.querySelectorAll('img'));

    // Sin fotos del cliente hay un solo fondo: el carrusel sobra.
    if (fotos.length > 1) {
      var actual = 0;
      var puntos = document.getElementById('puntos');

      fotos.forEach(function (f, i) {
        f.style.position = 'absolute';
        f.style.inset = '0';
        f.style.transition = 'opacity .7s ease';
        f.style.opacity = i === 0 ? '1' : '0';
      });

      var botones = fotos.map(function (_, i) {
        var b = document.createElement('button');
        b.className = 'punto' + (i === 0 ? ' act' : '');
        b.type = 'button';
        b.setAttribute('aria-label', 'Foto ' + (i + 1));
        b.addEventListener('click', function () { mostrar(i); });
        if (puntos) puntos.appendChild(b);
        return b;
      });

      var mostrar = function (i) {
        actual = (i + fotos.length) % fotos.length;
        fotos.forEach(function (f, n) { f.style.opacity = n === actual ? '1' : '0'; });
        botones.forEach(function (b, n) { b.classList.toggle('act', n === actual); });
      };

      var antes   = document.getElementById('antes');
      var despues = document.getElementById('despues');
      if (antes)   antes.addEventListener('click', function () { mostrar(actual - 1); });
      if (despues) despues.addEventListener('click', function () { mostrar(actual + 1); });

      var solo = setInterval(function () { mostrar(actual + 1); }, 6000);
      lienzo.addEventListener('mouseenter', function () { clearInterval(solo); });
    } else {
      ['antes', 'despues', 'puntos'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }
  }

  /* --- Opiniones que van rotando --- */
  var datos = document.getElementById('datosOpiniones');
  if (datos) {
    var lista = [];
    try { lista = JSON.parse(datos.textContent) || []; } catch (e) { lista = []; }

    var iniciales = function (nombre) {
      return (nombre || '').trim().split(/\s+/).slice(0, 2)
        .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
    };

    var pintar = function (o) {
      document.getElementById('opinionTexto').textContent  = o.texto;
      document.getElementById('opinionNombre').textContent = o.nombre;
      document.getElementById('opinionLugar').textContent  = o.lugar;
      document.getElementById('opinionIni').textContent    = iniciales(o.nombre);
    };

    if (lista.length) {
      pintar(lista[0]);
      if (lista.length > 1) {
        var n = 0;
        setInterval(function () {
          n = (n + 1) % lista.length;
          var cuerpo = document.getElementById('opinionCuerpo');
          cuerpo.style.transition = 'opacity .35s';
          cuerpo.style.opacity = '0';
          setTimeout(function () { pintar(lista[n]); cuerpo.style.opacity = '1'; }, 350);
        }, 7000);
      }
    }
  }

  /* --- Buscador de disponibilidad de la portada --- */
  var buscar = document.getElementById('formBuscar');
  if (buscar) {
    buscar.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var reserva = document.getElementById('formReserva');
      var fecha = document.getElementById('rFecha');
      // Lo que ya eligió arriba se lo llevamos al formulario de reserva.
      if (fecha && fecha.value && reserva) reserva.fecha.value = fecha.value;
      var personas = document.getElementById('rPersonas');
      if (personas && reserva) {
        var num = parseInt(personas.value, 10);
        if (num) reserva.personas.value = String(num);
      }
      document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* --- Formulario de reserva --- */
  var form = document.getElementById('formReserva');
  if (form) {
    var aviso = document.getElementById('avisoForm');
    var decir = function (t, c) { aviso.textContent = t; aviso.className = 'aviso-form ' + c; };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var nombre = form.nombre.value.trim();
      var email  = form.email.value.trim();
      var tel    = form.telefono.value.replace(/[^0-9]/g, '');

      if (nombre.length < 3) {
        decir('Escreva seu nome completo, por favor.', 'mal'); form.nombre.focus(); return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
        decir('Confira o e-mail: parece incompleto.', 'mal'); form.email.focus(); return;
      }
      if (tel.length < 10) {
        decir('Precisamos de um telefone com DDD para confirmar a reserva.', 'mal'); form.telefono.focus(); return;
      }
      if (!form.fecha.value) {
        decir('Escolha o dia da reserva.', 'mal'); form.fecha.focus(); return;
      }
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      if (new Date(form.fecha.value + 'T00:00:00') < hoy) {
        decir('Essa data já passou. Escolha um dia a partir de hoje.', 'mal'); form.fecha.focus(); return;
      }

      var S = window.SITE || {}, zap = String(S.whatsapp || '').replace(/\D/g, '');
      var rh = document.getElementById('rHora'), hora = rh && rh.value ? ' às ' + rh.value : '';
      var texto = '*Pedido de reserva — ' + (S.nome || '') + '*\n\nNome: ' + nombre + '\nTelefone: ' + form.telefono.value.trim() + '\nE-mail: ' + email +
        '\nDia: ' + form.fecha.value.split('-').reverse().join('/') + hora + '\nPessoas: ' + form.personas.value + (form.mensaje && form.mensaje.value.trim() ? '\nObservações: ' + form.mensaje.value.trim() : '');
      if (zap) window.open('https://wa.me/' + zap + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
      decir('✓ Obrigado, ' + nombre.split(' ')[0] + '! Abrimos o WhatsApp com o seu pedido de reserva. É só tocar em enviar.', 'ok');
      form.reset();
      aviso.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    // No se puede reservar para ayer.
    var hoyISO = new Date().toISOString().slice(0, 10);
    [form.fecha, document.getElementById('rFecha')].forEach(function (c) {
      if (c) { c.min = hoyISO; if (!c.value) c.value = hoyISO; }
    });
  }

  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();
})();
