(function () {
  'use strict';
  function leerJSON(id, r) { var el = document.getElementById(id); if (!el) return r; try { return JSON.parse(el.textContent) || r; } catch (e) { return r; } }
  var ENVIO = leerJSON('datosReserva', { whatsapp: '', negocio: '' });

  var hoy = new Date().toISOString().slice(0, 10);
  var manana2 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  var entrada = document.getElementById('rEntrada');
  var salida = document.getElementById('rSalida');
  if (entrada) { entrada.min = hoy; entrada.value = hoy; }
  if (salida) { salida.min = hoy; salida.value = manana2; }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button, a');
    if (!b) return;

    if (b.classList.contains('reservar-item')) {
      var destino = document.getElementById('rDestino');
      if (destino) destino.value = b.dataset.nombre || '';
      var caja = document.getElementById('reserva');
      if (caja) caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (b.id === 'btnBuscar') {
      var d = document.getElementById('rDestino').value.trim() || 'Grand Paradise';
      var dt = function (v) { return v ? v.split('-').reverse().join('/') : '-'; }; var e = dt(document.getElementById('rEntrada').value);
      var s = dt(document.getElementById('rSalida').value);
      var hab = document.getElementById('rHab').value;
      var ad = document.getElementById('rAdultos').value;
      var ni = document.getElementById('rNinos').value;
      var lineas = ['*Consulta de disponibilidade — ' + ENVIO.negocio + '*', '',
        'Hotel/quarto: ' + d, 'Entrada: ' + e, 'Saída: ' + s,
        'Quartos: ' + hab, 'Adultos: ' + ad, 'Crianças: ' + ni];
      var texto = encodeURIComponent(lineas.join('\n'));
      if (ENVIO.whatsapp) window.open('https://wa.me/' + ENVIO.whatsapp + '?text=' + texto, '_blank', 'noopener');
      return;
    }

    if (b.classList.contains('flecha')) {
      var fila = b.parentElement.querySelector('.fila');
      if (fila) fila.scrollBy({ left: fila.clientWidth * 0.6 * (b.classList.contains('flecha-der') ? 1 : -1), behavior: 'smooth' });
      return;
    }

    if (b.classList.contains('portada-flecha')) { return; }
  });

  window.enviarNewsletter = function (ev) {
    ev.preventDefault();
    var f = ev.target, btn = f.querySelector('button'), antes = btn.textContent;
    btn.textContent = 'Obrigado!'; btn.disabled = true;
    setTimeout(function () { btn.textContent = antes; btn.disabled = false; f.reset(); }, 1800);
    return false;
  };
})();
