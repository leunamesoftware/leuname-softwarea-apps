// Instalar o app no celular ou no computador (ícone próprio, abre sem a loja).
// A loja abre o app com ?instalar=1: aparece na hora uma tela de instalação que cobre o app inteiro
// (a pessoa não vê login nem cadastro). A conta (nome, e-mail e senha) só é criada depois,
// quando ela abrir o app pelo ícone.
// O mesmo arquivo é usado no Quanto Cobrar, no Gestacell e no Radar: os dados vêm do <script data-nome data-icone data-cor>.
(function () {
  var eu = document.currentScript;
  var nome = (eu && eu.dataset.nome) || document.title;
  var icone = (eu && eu.dataset.icone) || '';
  var cor = (eu && eu.dataset.cor) || '#6A35E8';
  var loja = 'https://www.leunamesoftware.com.br/';
  var pedido = null, tela = null, estado = 'esperando';

  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); pedido = e; if (tela && estado !== 'pronto') desenhar('botao'); });
  addEventListener('appinstalled', function () { pedido = null; if (tela) desenhar('pronto'); });

  var p = new URLSearchParams(location.search);
  if (p.get('instalar') !== '1' && p.get('atalho') !== '1') return;
  p.delete('instalar'); p.delete('atalho');
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash);
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return; // já aberto pelo ícone: segue para o app

  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var celular = ios || /Android|Mobile/i.test(ua);
  var firefox = /Firefox\//.test(ua);
  var onde = celular ? 'na tela do seu celular' : 'na área de trabalho do seu computador';

  function passos() {
    if (ios) return '<li>Toque em <b>Compartilhar</b> (o quadrado com a seta, embaixo ou em cima da tela).</li><li>Desça e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li>';
    if (firefox && !celular) return '<li>Este navegador não instala apps. Abra este mesmo endereço no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>.</li>';
    if (celular) return '<li>Toque nos <b>⋮</b> do navegador (canto de cima).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li>';
    return '<li>Clique no ícone de instalar <b>⊕</b> no fim da barra de endereço.</li><li>Ou abra o menu <b>⋮</b> → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar ' + nome + '</b>.</li><li>Confirme em <b>Instalar</b>.</li>';
  }

  function desenhar(novo) {
    estado = novo;
    var corpo;
    if (novo === 'pronto') {
      corpo = '<div class="li-ok" aria-hidden="true">✓</div><p class="li-texto"><b>' + nome + ' instalado!</b> O ícone já está ' + onde + '.</p>'
        + '<p class="li-texto">Abra o app pelo ícone. Lá dentro você cria a sua conta (nome, e-mail e senha) e começa a usar.</p>'
        + '<a class="li-sim" href="' + loja + '">Voltar para a LeuApps</a><button type="button" class="li-nao" data-usar>Abrir aqui mesmo</button>';
    } else if (novo === 'botao') {
      corpo = '<button type="button" class="li-sim" data-instalar>Instalar</button><p class="li-mini">Grátis para instalar · o ícone fica ' + onde + '</p>';
    } else if (novo === 'passos') {
      corpo = '<p class="li-texto">Para colocar o <b>' + nome + '</b> ' + onde + ':</p><ol class="li-passos">' + passos() + '</ol>'
        + '<button type="button" class="li-nao" data-usar>Já instalei, usar agora</button>';
    } else {
      corpo = '<div class="li-anel" aria-hidden="true"></div><p class="li-mini">Preparando a instalação…</p>';
    }
    tela.querySelector('.li-corpo').innerHTML = corpo;
  }

  function abrir() {
    var s = document.createElement('style');
    s.textContent = '.li-tela{position:fixed;inset:0;z-index:2147483647;background:#fff;color:#1A1630;overflow:auto;font:500 16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
      + '.li-barra{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 12px 6px}'
      + '.li-voltar{width:44px;height:44px;border:0;background:none;border-radius:50%;display:grid;place-items:center;color:#1A1630;cursor:pointer}'
      + '.li-loja{font-weight:800;font-size:15px;color:#5D5A6B}'
      + '.li-meio{max-width:460px;margin:0 auto;padding:12px 20px calc(24px + env(safe-area-inset-bottom));display:grid;gap:20px}'
      + '.li-topo{display:flex;gap:16px;align-items:center}'
      + '.li-topo img{width:84px;height:84px;border-radius:20px;box-shadow:0 6px 16px rgba(20,10,50,.18)}'
      + '.li-topo h1{margin:0;font-size:24px;line-height:1.2}.li-dev{color:' + cor + ';font-weight:700;font-size:14px}.li-selo{color:#5D5A6B;font-size:13px}'
      + '.li-corpo{display:grid;gap:12px}.li-texto{margin:0;color:#4A4659}.li-mini{margin:0;color:#5D5A6B;font-size:14px;text-align:center}'
      + '.li-passos{margin:0;padding-left:22px;display:grid;gap:8px;color:#4A4659}'
      + '.li-sim,.li-nao{font:inherit;font-weight:800;min-height:50px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none}'
      + '.li-sim{border:0;background:' + cor + ';color:#fff}.li-nao{border:1px solid #D9D4E6;background:#fff;color:#4A4659}'
      + '.li-sim:focus-visible,.li-nao:focus-visible,.li-voltar:focus-visible{outline:3px solid #2563EB;outline-offset:2px}'
      + '.li-ok{width:64px;height:64px;border-radius:50%;background:#E7F6EC;color:#1E8E4E;font-size:34px;font-weight:800;display:grid;place-items:center;justify-self:center}'
      + '.li-anel{width:40px;height:40px;border-radius:50%;border:4px solid #E6E1F5;border-top-color:' + cor + ';justify-self:center;animation:li-gira 1s linear infinite}'
      + '@keyframes li-gira{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.li-anel{animation:none}}'
      + '.li-fatos{display:flex;justify-content:space-around;gap:8px;border-top:1px solid #ECE8F5;padding-top:14px;color:#5D5A6B;font-size:13px;text-align:center}.li-fatos b{display:block;color:#1A1630;font-size:15px}';
    document.head.appendChild(s);
    tela = document.createElement('div');
    tela.className = 'li-tela';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-label', 'Instalar ' + nome);
    tela.innerHTML = '<div class="li-barra"><button type="button" class="li-voltar" data-voltar aria-label="Voltar para a loja"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><span class="li-loja">LeuApps</span></div>'
      + '<div class="li-meio"><div class="li-topo">' + (icone ? '<img src="' + icone + '" alt="">' : '') + '<div><h1>' + nome + '</h1><div class="li-dev">LeuName Softwares</div><div class="li-selo">Verificado pela LeuApps</div></div></div>'
      + '<div class="li-corpo"></div>'
      + '<div class="li-fatos"><span><b>L</b>Classificação Livre</span><span><b>Sem anúncios</b>no app</span><span><b>Sua conta</b>criada no app</span></div></div>';
    tela.addEventListener('click', function (e) {
      if (e.target.closest('[data-voltar]')) { if (document.referrer && history.length > 1) history.back(); else location.href = loja; return; }
      if (e.target.closest('[data-usar]')) { tela.remove(); tela = null; document.documentElement.style.overflow = ''; return; }
      if (e.target.closest('[data-instalar]') && pedido) {
        var q = pedido; pedido = null;
        q.prompt();
        q.userChoice.then(function (r) { if (tela) desenhar(r.outcome === 'accepted' ? 'pronto' : (pedido ? 'botao' : 'passos')); });
      }
    });
    document.documentElement.style.overflow = 'hidden';
    (document.body || document.documentElement).appendChild(tela);
    if (pedido) desenhar('botao');
    else if (ios || firefox) desenhar('passos');
    else { desenhar('esperando'); setTimeout(function () { if (tela && estado === 'esperando') desenhar('passos'); }, 2500); }
  }
  // Abre na hora (cobre o app antes do login aparecer).
  if (document.body) abrir(); else addEventListener('DOMContentLoaded', abrir);
})();
