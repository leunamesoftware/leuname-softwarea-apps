/* ==========================================================================
   Muebles & Deco — carrito y cajón lateral
   Todo ocurre en el navegador. Al finalizar el pedido se abre WhatsApp
   con el detalle de la compra.
   ========================================================================== */
(function () {
  'use strict';

  var CATALOGO = leerJSON('datosCatalogo', []);
  var ENVIO    = leerJSON('datosEnvio', { whatsapp: '', negocio: '' });
  var GALERIA  = leerJSON('datosGaleria', []);
  var LLAVE    = 'muebles_carrito';
  var LLAVE_FAV = 'muebles_favoritos';

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
    return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

  /* ---------------- Pintar el cajón ---------------- */

  var elNum    = document.getElementById('carritoNum');
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
          '<button type="button" data-menos="' + id + '" aria-label="Tirar um">−</button>' +
          '<b>' + n + '</b>' +
          '<button type="button" data-mas="' + id + '" aria-label="Mais um">+</button>' +
          '<button type="button" class="linea-quitar" data-quitar="' + id + '">Tirar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function pintar() {
    var ids = Object.keys(carrito);
    var total = unidades();

    if (elNum) elNum.textContent = total;

    if (elCuerpo) {
      elCuerpo.innerHTML = ids.length
        ? ids.map(lineaHTML).join('')
        : '<div class="cajon-vacio">Seu carrinho está vazio.<br>Adicione algum produto do catálogo.</div>';
    }

    if (elPie) {
      if (!ids.length) {
        elPie.innerHTML = '';
      } else {
        elPie.innerHTML =
          '<div class="cajon-total"><span>Total</span><b>' + euros(subtotal()) + '</b></div>' +
          '<button type="button" class="boton-primario" id="finalizarPedido">Finalizar pedido pelo WhatsApp</button>';
      }
    }
  }

  function pintarFavoritos() {
    [].forEach.call(document.querySelectorAll('.prod-fav'), function (b) {
      var art = b.closest('[data-anadir]');
      var id = art ? art.dataset.anadir : null;
      var activo = id && favoritos.indexOf(id) !== -1;
      b.classList.toggle('activo', !!activo);
      if (id) b.dataset.favId = id;
    });
  }

  /* ---------------- Abrir y cerrar el cajón ---------------- */

  var fondo = document.getElementById('cajonFondo');
  var cajon = document.getElementById('cajon');

  function abrirCarrito(abrir) {
    if (!cajon || !fondo) return;
    cajon.classList.toggle('abierto', abrir);
    fondo.classList.toggle('abierto', abrir);
    document.body.style.overflow = abrir ? 'hidden' : '';
  }

  var btnAbrir = document.getElementById('botonCarrito');
  if (btnAbrir) btnAbrir.addEventListener('click', function () { abrirCarrito(true); });
  var btnCerrar = document.getElementById('cajonCerrar');
  if (btnCerrar) btnCerrar.addEventListener('click', function () { abrirCarrito(false); });
  if (fondo) fondo.addEventListener('click', function () { abrirCarrito(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') abrirCarrito(false);
  });

  /* ---------------- Clics: añadir, favoritos, cantidad ---------------- */

  document.addEventListener('click', function (ev) {
    var fav = ev.target.closest('.prod-fav');
    if (fav) {
      var art = fav.closest('[data-anadir]');
      var id = art ? art.dataset.anadir : null;
      if (id) {
        var pos = favoritos.indexOf(id);
        if (pos === -1) favoritos.push(id); else favoritos.splice(pos, 1);
        guardarFav();
        pintarFavoritos();
      }
      return;
    }

    var tarjeta = ev.target.closest('.prod-card[data-anadir]');
    if (tarjeta) {
      anadir(tarjeta.dataset.anadir, 1);
      tarjeta.classList.add('anadido');
      setTimeout(function () { tarjeta.classList.remove('anadido'); }, 900);
      return;
    }

    var b = ev.target.closest('button, a');
    if (!b) return;

    if (b.dataset.anadir) {
      anadir(b.dataset.anadir, 1);
      var antes = b.innerHTML;
      b.innerHTML = '✓ Adicionado';
      b.disabled = true;
      setTimeout(function () { b.innerHTML = antes; b.disabled = false; }, 900);
      return;
    }
    if (b.dataset.mas)    { anadir(b.dataset.mas, 1); return; }
    if (b.dataset.menos)  { anadir(b.dataset.menos, -1); return; }
    if (b.dataset.quitar) { delete carrito[b.dataset.quitar]; guardar(); pintar(); return; }

    if (b.id === 'finalizarPedido') {
      if (!Object.keys(carrito).length) return;
      var lineas = ['*Novo pedido — ' + ENVIO.negocio + '*', ''];
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

    if (b.closest('.destacados-tabs')) {
      [].forEach.call(document.querySelectorAll('.destacados-tabs button'), function (o) { o.classList.remove('activo'); });
      b.classList.add('activo');
      var filtro = b.dataset.filtro || 'todos';
      [].forEach.call(document.querySelectorAll('#filaProductos .prod-card'), function (tarjeta) {
        var grupos = (tarjeta.dataset.grupos || '').split(' ');
        tarjeta.hidden = grupos.indexOf(filtro) === -1;
      });
      return;
    }

    if (b.classList.contains('prod-flecha-der') || b.classList.contains('prod-flecha-izq')) {
      var fila = document.querySelector('.prod-fila');
      if (fila) {
        var paso = fila.clientWidth * 0.6;
        fila.scrollBy({ left: b.classList.contains('prod-flecha-der') ? paso : -paso, behavior: 'smooth' });
      }
      return;
    }
  });

  /* ---------------- Galería de la portada (flechas y puntos reales) ---------------- */

  var imgPortada = document.getElementById('portadaFotoImg');
  var puntos = document.querySelectorAll('.portada-puntos span');
  var slideActual = 0;

  function irASlide(i) {
    if (!imgPortada || !GALERIA.length) return;
    slideActual = ((i % GALERIA.length) + GALERIA.length) % GALERIA.length;
    imgPortada.src = GALERIA[slideActual];
    puntos.forEach(function (p, idx) { p.classList.toggle('activo', idx === slideActual); });
  }

  var flechaIzq = document.querySelector('.portada-flecha-izq');
  var flechaDer = document.querySelector('.portada-flecha-der');
  if (flechaIzq) flechaIzq.addEventListener('click', function () { irASlide(slideActual - 1); });
  if (flechaDer) flechaDer.addEventListener('click', function () { irASlide(slideActual + 1); });
  puntos.forEach(function (p, idx) { p.addEventListener('click', function () { irASlide(idx); }); });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var tarjeta = ev.target.closest && ev.target.closest('.prod-card[data-anadir]');
    if (!tarjeta) return;
    ev.preventDefault();
    anadir(tarjeta.dataset.anadir, 1);
    tarjeta.classList.add('anadido');
    setTimeout(function () { tarjeta.classList.remove('anadido'); }, 900);
  });

  pintar();
  pintarFavoritos();

  /* ---------------- Newsletter ---------------- */

  window.enviarNewsletter = function (ev) {
    ev.preventDefault();
    var form = ev.target;
    var boton = form.querySelector('button');
    var antes = boton.textContent;
    boton.textContent = 'Obrigado!';
    boton.disabled = true;
    setTimeout(function () {
      boton.textContent = antes;
      boton.disabled = false;
      form.reset();
    }, 1800);
    return false;
  };
})();
