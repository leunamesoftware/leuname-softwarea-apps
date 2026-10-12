(function () {
  'use strict';

  var abrirMenu = document.getElementById('abrirMenu');
  var menuMovil = document.getElementById('menuMovil');
  if (abrirMenu && menuMovil) {
    abrirMenu.addEventListener('click', function () {
      var abierto = menuMovil.classList.toggle('abierto');
      abrirMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  var filtrosBar = document.getElementById('filtrosVehiculos');
  var grid = document.getElementById('vehiculosGrid');
  var vacio = document.getElementById('vehiculosVacio');
  var tarjetas = grid ? Array.prototype.slice.call(grid.querySelectorAll('.vehiculo')) : [];

  function actualizarVacio() {
    if (!vacio || !tarjetas.length) return;
    var algunaVisible = tarjetas.some(function (art) { return !art.hidden; });
    vacio.hidden = algunaVisible;
  }

  // Filtro rápido por categoría (Todos / SUV / Berlina / ...)
  if (filtrosBar && grid) {
    filtrosBar.addEventListener('click', function (ev) {
      var b = ev.target.closest('.filtro');
      if (!b) return;
      filtrosBar.querySelectorAll('.filtro').forEach(function (x) { x.classList.remove('act'); });
      b.classList.add('act');
      var f = b.dataset.f;
      tarjetas.forEach(function (art) {
        art.hidden = !(f === 'todos' || art.dataset.filtro === f);
      });
      actualizarVacio();
    });
  }

  // Favoritos (solo visual)
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-fav]');
    if (!b) return;
    b.classList.toggle('act');
  });

  // Buscador de la portada: filtra de verdad la rejilla de vehículos.
  var formBuscar = document.getElementById('formBuscarVehiculo');
  if (formBuscar && grid) {
    formBuscar.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var categoria = formBuscar.elements.categoria.value;
      var marca = formBuscar.elements.marca.value;
      var anioMin = parseInt(formBuscar.elements.anio_min.value, 10);
      var anioMax = parseInt(formBuscar.elements.anio_max.value, 10);
      var precioMax = parseInt(formBuscar.elements.precio_max.value, 10);

      if (filtrosBar) {
        filtrosBar.querySelectorAll('.filtro').forEach(function (x) {
          x.classList.toggle('act', categoria ? x.dataset.f === categoria : x.dataset.f === 'todos');
        });
      }

      tarjetas.forEach(function (art) {
        var okCategoria = !categoria || art.dataset.filtro === categoria;
        var okMarca = !marca || art.dataset.marca === marca;
        var anio = parseInt(art.dataset.anio, 10);
        var okAnioMin = isNaN(anioMin) || anio >= anioMin;
        var okAnioMax = isNaN(anioMax) || anio <= anioMax;
        var precio = parseInt(art.dataset.precio, 10);
        var okPrecio = isNaN(precioMax) || precioMax >= 300000 || precio <= precioMax;
        art.hidden = !(okCategoria && okMarca && okAnioMin && okAnioMax && okPrecio);
      });
      actualizarVacio();

      var caja = document.getElementById('vehiculos');
      if (caja) caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Actualiza la etiqueta "50.000+ €" del control de precio mientras se mueve.
  var precioRango = formBuscar ? formBuscar.querySelector('[name="precio_max"]') : null;
  var precioLbl = document.getElementById('precioMaxLbl');
  if (precioRango && precioLbl) {
    precioRango.addEventListener('input', function () {
      var v = parseInt(precioRango.value, 10);
      precioLbl.textContent = v >= 300000 ? 'R$ 300.000+' : 'R$ ' + v.toLocaleString('pt-BR');
    });
  }

  // Botón "Ver ofertas" de la portada: filtra solo los vehículos en oferta.
  var btnOfertas = document.getElementById('btnVerOfertas');
  if (btnOfertas && grid) {
    btnOfertas.addEventListener('click', function () {
      if (filtrosBar) filtrosBar.querySelectorAll('.filtro').forEach(function (x) { x.classList.remove('act'); });
      tarjetas.forEach(function (art) { art.hidden = art.dataset.oferta !== '1'; });
      actualizarVacio();
      var caja = document.getElementById('vehiculos');
      if (caja) caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // "Quitar filtros" del mensaje de "sin resultados"
  var btnLimpiar = document.getElementById('limpiarFiltros');
  if (btnLimpiar && grid) {
    btnLimpiar.addEventListener('click', function () {
      if (formBuscar) formBuscar.reset();
      if (filtrosBar) {
        filtrosBar.querySelectorAll('.filtro').forEach(function (x) { x.classList.remove('act'); });
        var todos = filtrosBar.querySelector('[data-f="todos"]');
        if (todos) todos.classList.add('act');
      }
      tarjetas.forEach(function (art) { art.hidden = false; });
      actualizarVacio();
    });
  }

  var formNewsletter = document.getElementById('formNewsletter');
  if (formNewsletter) {
    formNewsletter.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target, btn = f.querySelector('button'), antes = btn.textContent;
      btn.textContent = 'Obrigado!'; btn.disabled = true;
      setTimeout(function () { btn.textContent = antes; btn.disabled = false; f.reset(); }, 1800);
    });
  }
})();
