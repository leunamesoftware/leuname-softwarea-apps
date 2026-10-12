/* ==========================================================================
   Delícias Padaria — carrinho e pedidos
   Todo ocurre en el navegador: no hace falta servidor para que el cliente
   monte su pedido. Al enviarlo se abre WhatsApp con el detalle escrito.
   ========================================================================== */
(function () {
  'use strict';

  var CATALOGO = leerJSON('datosCatalogo', []);
  var ENVIO    = leerJSON('datosEnvio', { coste: 0, minimo: 0, whatsapp: '', negocio: '' });
  var LLAVE    = 'delicias_cesta';

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
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  /* ---------------- La cesta ---------------- */

  var cesta = cargar();

  function cargar() {
    try {
      var guardado = JSON.parse(localStorage.getItem(LLAVE) || '{}');
      // Solo conservamos lo que sigue existiendo en el catálogo.
      var limpia = {};
      Object.keys(guardado).forEach(function (id) {
        if (porId(id) && guardado[id] > 0) limpia[id] = Math.min(guardado[id], 99);
      });
      return limpia;
    } catch (e) { return {}; }
  }

  function guardar() {
    try { localStorage.setItem(LLAVE, JSON.stringify(cesta)); } catch (e) { /* modo privado */ }
  }

  function unidades() {
    return Object.keys(cesta).reduce(function (t, id) { return t + cesta[id]; }, 0);
  }

  function subtotal() {
    return Object.keys(cesta).reduce(function (t, id) {
      var p = porId(id);
      return p ? t + p.precio * cesta[id] : t;
    }, 0);
  }

  function conEntrega() {
    return document.querySelector('input[name="modo"]:checked') &&
           document.querySelector('input[name="modo"]:checked').value === 'entrega';
  }

  function anadir(id, cuantos) {
    var p = porId(id);
    if (!p) return;
    cesta[id] = Math.min((cesta[id] || 0) + (cuantos || 1), 99);
    if (cesta[id] <= 0) delete cesta[id];
    guardar();
    pintar();
  }

  /* ---------------- Pintar ---------------- */

  var elNum    = document.getElementById('carritoNum');
  var elCuerpo = document.getElementById('cajonCuerpo');
  var elPie    = document.getElementById('cajonPie');
  var elResumen= document.getElementById('resumenPedido');

  function lineaHTML(id) {
    var p = porId(id), n = cesta[id];
    var foto = p.imagen
      ? '<img src="' + p.imagen + '" alt="">'
      : '';
    return '<div class="linea-prod">' +
      '<div class="linea-foto">' + foto + '</div>' +
      '<div class="linea-txt">' +
        '<strong>' + p.nombre + '</strong>' +
        '<span>' + euros(p.precio) + (p.unidad ? ' / ' + p.unidad : '') + '</span>' +
        '<div class="contador">' +
          '<button type="button" data-menos="' + id + '" aria-label="Tirar um">−</button>' +
          '<b>' + n + '</b>' +
          '<button type="button" data-mas="' + id + '" aria-label="Mais um">+</button>' +
          '<button type="button" class="linea-quitar" data-quitar="' + id + '">Tirar</button>' +
        '</div>' +
      '</div>' +
      '<div class="linea-precio">' + euros(p.precio * n) + '</div>' +
    '</div>';
  }

  function pintar() {
    var ids = Object.keys(cesta);
    var total = unidades();

    if (elNum) {
      elNum.textContent = total;
      elNum.hidden = total === 0;
    }

    if (elCuerpo) {
      elCuerpo.innerHTML = ids.length
        ? ids.map(lineaHTML).join('')
        : '<div class="vacio">' +
            '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">' +
            '<circle cx="9.5" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>' +
            '<path d="M2.5 3.5h2.7l2.4 11h11l2-8H6.3"/></svg>' +
            '<p>Seu carrinho está vazio.<br>Escolha algo gostoso.</p>' +
          '</div>';
    }

    if (elPie) {
      if (!ids.length) {
        elPie.innerHTML = '';
      } else {
        var sub = subtotal();
        var envio = conEntrega() ? ENVIO.coste : 0;
        elPie.innerHTML =
          '<div class="total"><span>Produtos</span><span>' + euros(sub) + '</span></div>' +
          (conEntrega()
            ? '<div class="total"><span>Entrega</span><span>' + euros(envio) + '</span></div>'
            : '<div class="total"><span>Retirada na loja</span><span>Grátis</span></div>') +
          '<div class="total grande"><span>Total</span><b>' + euros(sub + envio) + '</b></div>' +
          '<a href="#pedidos" class="btn btn-ambar" style="width:100%;margin-top:14px" id="irAPedido">Continuar o pedido</a>';
      }
    }

    if (elResumen) {
      if (!ids.length) {
        elResumen.innerHTML = '<div class="vacio" style="padding:26px 8px">' +
          '<p>Você ainda não adicionou nada.<br>' +
          '<a href="#productos" style="color:var(--ambar-osc);text-decoration:underline">Ver os produtos</a></p></div>';
      } else {
        var s = subtotal(), e2 = conEntrega() ? ENVIO.coste : 0;
        elResumen.innerHTML = ids.map(function (id) {
          var p = porId(id);
          return '<div class="total"><span>' + cesta[id] + ' × ' + p.nombre + '</span><span>' +
                 euros(p.precio * cesta[id]) + '</span></div>';
        }).join('') +
        (conEntrega()
          ? '<div class="total"><span>Entrega</span><span>' + euros(e2) + '</span></div>'
          : '<div class="total"><span>Retirada na loja</span><span>Grátis</span></div>') +
        '<div class="total grande"><span>Total</span><b>' + euros(s + e2) + '</b></div>';
      }
    }
  }

  /* ---------------- Abrir y cerrar la cesta ---------------- */

  var velo  = document.getElementById('velo');
  var cajon = document.getElementById('cajon');

  function abrirCesta(abrir) {
    if (!cajon || !velo) return;
    cajon.classList.toggle('ver', abrir);
    velo.classList.toggle('ver', abrir);
    document.body.style.overflow = abrir ? 'hidden' : '';
  }

  var btnAbrir = document.getElementById('abrirCarrito');
  if (btnAbrir) btnAbrir.addEventListener('click', function () { abrirCesta(true); });
  var btnCerrar = document.getElementById('cerrarCarrito');
  if (btnCerrar) btnCerrar.addEventListener('click', function () { abrirCesta(false); });
  if (velo) velo.addEventListener('click', function () { abrirCesta(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') abrirCesta(false);
  });

  /* ---------------- Botones de añadir y del cajón ---------------- */

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button, a');
    if (!b) return;

    if (b.classList.contains('anadir')) {
      anadir(b.dataset.id, 1);
      var antes = b.innerHTML;
      b.innerHTML = '✓ Adicionado';
      b.disabled = true;
      setTimeout(function () { b.innerHTML = antes; b.disabled = false; }, 900);
      return;
    }
    if (b.dataset.mas)    { anadir(b.dataset.mas, 1); return; }
    if (b.dataset.menos)  { anadir(b.dataset.menos, -1); return; }
    if (b.dataset.quitar) { delete cesta[b.dataset.quitar]; guardar(); pintar(); return; }
    if (b.id === 'irAPedido') { abrirCesta(false); return; }
  });

  /* ---------------- Filtros de categoría ---------------- */

  var filtros = document.getElementById('filtros');
  if (filtros) {
    var tarjetas = [].slice.call(document.querySelectorAll('.prod'));

    var filtrar = function (valor) {
      tarjetas.forEach(function (t) {
        t.style.display = (valor === 'todos' || t.dataset.cat === valor) ? '' : 'none';
      });
      [].forEach.call(filtros.querySelectorAll('.filtro'), function (f) {
        f.classList.toggle('act', f.dataset.filtro === valor);
      });
    };

    filtros.addEventListener('click', function (ev) {
      var f = ev.target.closest('.filtro');
      if (f) filtrar(f.dataset.filtro);
    });

    // Las tarjetas de categoría de arriba también filtran.
    [].forEach.call(document.querySelectorAll('.cat[data-cat]'), function (c) {
      c.addEventListener('click', function () { filtrar(c.dataset.cat); });
    });
  }

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

  /* ---------------- El formulario de pedido ---------------- */

  var form = document.getElementById('formPedido');
  if (form) {
    var aviso = document.getElementById('avisoPedido');
    var campoDir = document.getElementById('campoDireccion');

    var decir = function (t, c) { aviso.textContent = t; aviso.className = 'aviso-form ' + c; };

    // La dirección solo hace falta si te lo llevamos.
    [].forEach.call(form.querySelectorAll('input[name="modo"]'), function (r) {
      r.addEventListener('change', function () {
        if (campoDir) campoDir.hidden = !conEntrega();
        pintar();
      });
    });

    // No se puede encargar para ayer.
    var hoy = new Date().toISOString().slice(0, 10);
    if (form.dia) { form.dia.min = hoy; if (!form.dia.value) form.dia.value = hoy; }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      if (!Object.keys(cesta).length) {
        decir('Seu carrinho está vazio. Adicione algum produto antes de enviar o pedido.', 'mal');
        return;
      }
      var nombre = form.nombre.value.trim();
      if (nombre.length < 3) {
        decir('Escreva seu nome, por favor.', 'mal'); form.nombre.focus(); return;
      }
      var tel = form.telefono.value.replace(/[^0-9]/g, '');
      if (tel.length < 9) {
        decir('Precisamos de um telefone para confirmar o pedido.', 'mal'); form.telefono.focus(); return;
      }
      if (conEntrega()) {
        if (form.direccion.value.trim().length < 8) {
          decir('Escreva o endereço completo de entrega.', 'mal'); form.direccion.focus(); return;
        }
        if (subtotal() < ENVIO.minimo) {
          decir('O pedido mínimo para entrega é de ' + euros(ENVIO.minimo) +
                '. Faltam ' + euros(ENVIO.minimo - subtotal()) + '.', 'mal');
          return;
        }
      }
      if (!form.dia.value) {
        decir('Escolha o dia do pedido.', 'mal'); form.dia.focus(); return;
      }

      // Armamos el mensaje con todo el detalle.
      var lineas = ['*Novo pedido — ' + ENVIO.negocio + '*', ''];
      Object.keys(cesta).forEach(function (id) {
        var p = porId(id);
        lineas.push('• ' + cesta[id] + ' × ' + p.nombre + ' — ' + euros(p.precio * cesta[id]));
      });
      var envio = conEntrega() ? ENVIO.coste : 0;
      lineas.push('');
      lineas.push('Produtos: ' + euros(subtotal()));
      lineas.push(conEntrega() ? 'Entrega: ' + euros(envio) : 'Retirada na loja: grátis');
      lineas.push('*Total: ' + euros(subtotal() + envio) + '*');
      lineas.push('');
      lineas.push('Nome: ' + nombre);
      lineas.push('Telefone: ' + form.telefono.value.trim());
      if (conEntrega()) lineas.push('Endereço: ' + form.direccion.value.trim());
      lineas.push((conEntrega() ? 'Entrega' : 'Recogida') + ': ' +
                  form.dia.value.split('-').reverse().join('/') + ' às ' + form.hora.value);
      if (form.notas.value.trim()) lineas.push('Observações: ' + form.notas.value.trim());

      var texto = encodeURIComponent(lineas.join('\n'));

      if (ENVIO.whatsapp) {
        window.open('https://wa.me/' + ENVIO.whatsapp + '?text=' + texto, '_blank', 'noopener');
        decir('✓ Abrimos o WhatsApp com o seu pedido escrito. É só tocar em enviar.', 'ok');
      } else {
        decir('✓ Pedido pronto. Coloque o seu WhatsApp no configuracao.js para receber os pedidos.', 'ok');
      }
    });
  }

  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  pintar();
})();
