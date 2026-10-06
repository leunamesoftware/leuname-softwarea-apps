// Instalar o app no celular ou no computador (ícone próprio, abre sem a loja).
// A loja abre o app com ?instalar=1: aparece um cartão com o botão "Instalar"
// (ou o passo a passo, quando o navegador não deixa instalar pelo botão).
// O mesmo arquivo é usado no Quanto Cobrar e no Gestacell: os dados vêm do <script data-nome data-icone data-cor>.
(function () {
  var eu = document.currentScript;
  var nome = (eu && eu.dataset.nome) || document.title;
  var icone = (eu && eu.dataset.icone) || '';
  var cor = (eu && eu.dataset.cor) || '#E8590C';
  var pedido = null, cartao = null;

  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); pedido = e; if (cartao) desenhar(); });
  addEventListener('appinstalled', function () { pedido = null; if (cartao) desenhar('pronto'); });

  var p = new URLSearchParams(location.search);
  if (p.get('instalar') !== '1' && p.get('atalho') !== '1') return;
  p.delete('instalar'); p.delete('atalho');
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
  var instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (instalado) return;

  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var celular = ios || /Android|Mobile/i.test(ua);
  var firefox = /Firefox\//.test(ua);

  function passos() {
    if (ios) return '<li>Toque em <b>Compartilhar</b> (o quadrado com a seta ⬆️, embaixo ou em cima da tela).</li><li>Desça e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li>';
    if (firefox && !celular) return '<li>Este navegador não instala apps. Abra este mesmo endereço no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>.</li>';
    if (celular) return '<li>Toque nos <b>⋮</b> do navegador (canto de cima).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li>';
    return '<li>Clique no ícone de instalar <b>⊕</b> no fim da barra de endereço.</li><li>Ou abra o menu <b>⋮</b> → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar ' + nome + '</b>.</li><li>Confirme em <b>Instalar</b>: o ícone vai para a área de trabalho.</li>';
  }

  function desenhar(estado) {
    var onde = celular ? 'na tela do seu celular' : 'na área de trabalho do seu computador';
    var corpo = estado === 'pronto'
      ? '<p class="li-texto">Pronto! O <b>' + nome + '</b> já está ' + onde + '. Abra pelo ícone, como qualquer app.</p><button type="button" class="li-sim" data-fechar>OK</button>'
      : pedido
        ? '<p class="li-texto">Falta só <b>um toque</b> para o <b>' + nome + '</b> ficar ' + onde + ', abrindo direto pelo ícone.</p><button type="button" class="li-sim" data-instalar>📲 Instalar agora</button><button type="button" class="li-nao" data-fechar>Agora não</button>'
        : '<p class="li-texto">Para colocar o <b>' + nome + '</b> ' + onde + ':</p><ol class="li-passos">' + passos() + '</ol><button type="button" class="li-nao" data-fechar>Fechar</button>';
    cartao.querySelector('.li-corpo').innerHTML = corpo;
  }

  function abrir() {
    var s = document.createElement('style');
    s.textContent = '.li-fundo{position:fixed;inset:0;z-index:2147483647;background:rgba(20,16,12,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;font:500 16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
      + '@media(min-width:640px){.li-fundo{align-items:center}}'
      + '.li-cartao{width:100%;max-width:420px;background:#fff;color:#1C1917;border-radius:22px;padding:22px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 20px 50px rgba(0,0,0,.3);display:grid;gap:12px;text-align:center}'
      + '.li-cartao img{width:76px;height:76px;border-radius:18px;justify-self:center;box-shadow:0 6px 16px rgba(0,0,0,.18)}'
      + '.li-cartao h2{margin:0;font-size:20px}.li-texto{margin:0;color:#57534E}.li-corpo{display:grid;gap:10px}'
      + '.li-passos{margin:0;padding-left:22px;text-align:left;display:grid;gap:6px}'
      + '.li-sim,.li-nao{font:inherit;font-weight:800;min-height:50px;border-radius:14px;cursor:pointer}'
      + '.li-sim{border:0;background:' + cor + ';color:#fff}.li-nao{border:1px solid #D6D0C8;background:#fff;color:#57534E}'
      + '.li-sim:focus-visible,.li-nao:focus-visible{outline:3px solid #2563EB;outline-offset:2px}';
    document.head.appendChild(s);
    cartao = document.createElement('div');
    cartao.className = 'li-fundo';
    cartao.innerHTML = '<div class="li-cartao" role="dialog" aria-label="Instalar ' + nome + '">' + (icone ? '<img src="' + icone + '" alt="">' : '')
      + '<h2>Instalar o ' + nome + '</h2><div class="li-corpo"></div></div>';
    cartao.addEventListener('click', function (e) {
      if (e.target === cartao || e.target.closest('[data-fechar]')) { cartao.remove(); cartao = null; return; }
      if (e.target.closest('[data-instalar]') && pedido) {
        var q = pedido; pedido = null;
        q.prompt();
        q.userChoice.then(function (r) { if (cartao) desenhar(r.outcome === 'accepted' ? 'pronto' : undefined); });
      }
    });
    document.body.appendChild(cartao);
    desenhar();
  }
  // Espera um pouco o navegador avisar que dá para instalar (aí o botão aparece direto).
  function quandoPronto() { setTimeout(abrir, pedido ? 0 : 1200); }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', quandoPronto); else quandoPronto();
})();
