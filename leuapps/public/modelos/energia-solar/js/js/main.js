/* ==========================================================================
   Pet Shop — carrito, favoritos y menú
   Todo ocurre en el navegador. Al pedir, se abre WhatsApp con el detalle.
   ========================================================================== */
(function () {
  'use strict';

  var CATALOGO = leerJSON('datosCatalogo', []);
  var ENVIO    = leerJSON('datosEnvio', { whatsapp: '', negocio: '' });
  var LLAVE    = 'petshop_carrito';
  var LLAVE_FAV = 'petshop_favoritos';

  function leerJSON(id, respaldo) {
    var el = document.getElementById(id);
    if (!el) return respaldo;
    try { return JSON.parse(el.textContent) || respaldo; } catch (e) { return respaldo; }
  }

  function porId(id) {
    for (var i = 0; i < CATALOGO.length; i++) {
      if (CATALOGO[i].id === id) return CATALOGO[i];
    }
    return null;
  }

  function euros(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  /* ---------------- El carrito ---------------- */

  var carrito = cargar();

  function cargar() {
    try {
      var guardado = JSON.parse(localStorage.getItem(LLAVE) || '{}');
      var limpio = {};
      Object.keys(guardado).forEach(function (id) {
        if (porId(id) && guardado[id] > 0) limpio[id] = Math.min(guardado[id], 99);
      });
      return limpio;
    } catch (e) { return {}; }
  }

  function guardar() {
    try { localStorage.setItem(LLAVE, JSON.stringify(carrito)); } catch (e) { /* modo privado */ }
  }

  function unidades() {
    return Object.keys(carrito).reduce(function (t, id) { return t + carrito[id]; }, 0);
  }

  function subtotal() {
    return Object.keys(carrito).reduce(function (t, id) {
      var p = porId(id);
      return p ? t + p.precio * carrito[id] : t;
    }, 0);
  }

  function anadir(id, cuantos) {
    var p = porId(id);
    if (!p) return;
    carrito[id] = Math.min((carrito[id] || 0) + (cuantos || 1), 99);
    if (carrito[id] <= 0) delete carrito[id];
    guardar();
    pintar();
  }

  /* ---------------- Favoritos ---------------- */

  var favoritos = cargarFav();

  function cargarFav() {
    try { return JSON.parse(localStorage.getItem(LLAVE_FAV) || '[]'); } catch (e) { return []; }
  }
  function guardarFav() {
    try { localStorage.setItem(LLAVE_FAV, JSON.stringify(favoritos)); } catch (e) { /* modo privado */ }
  }

  /* ---------------- Pintar ---------------- */

  var elNum    = document.getElementById('carritoNum');
  var elTotal  = document.getElementById('carritoTotal');
  var elCuerpo = document.getElementById('cajonCuerpo');
  var elPie    = document.getElementById('cajonPie');

  function lineaHTML(id) {
    var p = porId(id), n = carrito[id];
    var foto = p.imagen ? '<img src="' + p.imagen + '" alt="">' : '';
    return '<div class="linea-prod">' +
      '<div class="linea-foto">' + foto + '</div>' +
      '<div class="linea-txt">' +
        '<strong>' + p.nombre + '</strong>' +
        '<span>' + euros(p.precio) + '</span>' +
        '<div class="contador">' +
          '<button type="button" data-menos="' + id + '" aria-label="Quitar uno">−</button>' +
          '<b>' + n + '</b>' +
          '<button type="button" data-mas="' + id + '" aria-label="Añadir uno">+</button>' +
          '<button type="button" class="linea-quitar" data-quitar="' + id + '">Quitar</button>' +
        '</div>' +
      '</div>' +
      '<div class="linea-precio">' + euros(p.precio * n) + '</div>' +
    '</div>';
  }

  function pintar() {
    var ids = Object.keys(carrito);
    var total = unidades();

    if (elNum) {
      elNum.textContent = total;
      elNum.hidden = total === 0;
    }
    if (elTotal) elTotal.textContent = euros(subtotal());

    if (elCuerpo) {
      elCuerpo.innerHTML = ids.length
        ? ids.map(lineaHTML).join('')
        : '<div class="vacio">' +
            '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">' +
            '<circle cx="9.5" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>' +
            '<path d="M2.5 3.5h2.7l2.4 11h11l2-8H6.3"/></svg>' +
            '<p>Tu carrito está vacío.<br>Añade algún producto del catálogo.</p>' +
          '</div>';
    }

    if (elPie) {
      if (!ids.length) {
        elPie.innerHTML = '';
      } else {
        var sub = subtotal();
        elPie.innerHTML =
          '<div class="total grande"><span>Total</span><b>' + euros(sub) + '</b></div>' +
          '<button type="button" class="btn btn-terra" style="width:100%;margin-top:14px" id="finalizarPedido">Finalizar pedido</button>';
      }
    }
  }

  function pintarFavoritos() {
    [].forEach.call(document.querySelectorAll('[data-fav]'), function (b) {
      var art = b.closest('.prod');
      var boton = art ? art.querySelector('.anadir') : null;
      var id = boton ? boton.dataset.id : null;
      var activo = id && favoritos.indexOf(id) !== -1;
      b.classList.toggle('act', !!activo);
      if (id) b.dataset.favId = id;
    });
  }

  /* ---------------- Abrir y cerrar el carrito ---------------- */

  var velo  = document.getElementById('velo');
  var cajon = document.getElementById('cajon');

  function abrirCarrito(abrir) {
    if (!cajon || !velo) return;
    cajon.classList.toggle('ver', abrir);
    velo.classList.toggle('ver', abrir);
    document.body.style.overflow = abrir ? 'hidden' : '';
  }

  var btnAbrir = document.getElementById('abrirCarrito');
  if (btnAbrir) btnAbrir.addEventListener('click', function () { abrirCarrito(true); });
  var btnCerrar = document.getElementById('cerrarCarrito');
  if (btnCerrar) btnCerrar.addEventListener('click', function () { abrirCarrito(false); });
  if (velo) velo.addEventListener('click', function () { abrirCarrito(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') abrirCarrito(false);
  });

  /* ---------------- Clics: añadir, favoritos, cantidad ---------------- */

  document.addEventListener('click', function (ev) {
    var fav = ev.target.closest('[data-fav]');
    if (fav) {
      var art = fav.closest('.prod');
      var boton = art ? art.querySelector('.anadir') : null;
      var id = boton ? boton.dataset.id : null;
      if (id) {
        var pos = favoritos.indexOf(id);
        if (pos === -1) favoritos.push(id); else favoritos.splice(pos, 1);
        guardarFav();
        pintarFavoritos();
      }
      return;
    }

    var b = ev.target.closest('button, a');
    if (!b) return;

    if (b.classList.contains('anadir')) {
      anadir(b.dataset.id, 1);
      var antes = b.innerHTML;
      b.innerHTML = '✓';
      b.disabled = true;
      setTimeout(function () { b.innerHTML = antes; b.disabled = false; }, 900);
      return;
    }
    if (b.dataset.mas)    { anadir(b.dataset.mas, 1); return; }
    if (b.dataset.menos)  { anadir(b.dataset.menos, -1); return; }
    if (b.dataset.quitar) { delete carrito[b.dataset.quitar]; guardar(); pintar(); return; }

    if (b.id === 'finalizarPedido') {
      if (!Object.keys(carrito).length) return;
      var lineas = ['*Nuevo pedido — ' + ENVIO.negocio + '*', ''];
      Object.keys(carrito).forEach(function (id) {
        var p = porId(id);
        lineas.push('• ' + carrito[id] + ' × ' + p.nombre + ' — ' + euros(p.precio * carrito[id]));
      });
      lineas.push('');
      lineas.push('*Total: ' + euros(subtotal()) + '*');
      var texto = encodeURIComponent(lineas.join('\n'));
      if (ENVIO.whatsapp) {
        window.open('https://wa.me/' + ENVIO.whatsapp + '?text=' + texto, '_blank', 'noopener');
      }
      abrirCarrito(false);
      return;
    }
  });

  /* ---------------- Menú móvil ---------------- */

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

  /* ---------------- Marcar la sección que se ve ---------------- */

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

  /* ---------------- Carrusel de la portada ---------------- */

  var puntos = [].slice.call(document.querySelectorAll('.puntos .punto'));
  if (puntos.length > 1) {
    var actual = 0;
    var avanzar = function () {
      actual = (actual + 1) % puntos.length;
      puntos.forEach(function (p, i) { p.classList.toggle('act', i === actual); });
    };
    setInterval(avanzar, 4500);
    var flecha = document.querySelector('.flecha');
    if (flecha) flecha.addEventListener('click', avanzar);
  }

  /* ---------------- Newsletter ---------------- */

  var nlForm = document.getElementById('formNewsletter');
  if (nlForm) {
    nlForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = nlForm.querySelector('button');
      if (btn) { btn.textContent = '✓ ¡Gracias!'; setTimeout(function () { btn.textContent = 'Suscribirme'; nlForm.reset(); }, 2200); }
    });
  }

  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  pintar();
  pintarFavoritos();
})();
