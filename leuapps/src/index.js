// LeuApps: serve a loja (arquivos em public/). O que não for da loja continua vindo do
// site antigo da LeuName (painel, licenças e páginas), pela ligação interna SITE_ANTIGO.
// /loja/ e /loja-api/ (comprar e entrar na conta) vão para o servidor de vendas (CONTAS).
// Depois da primeira visita o navegador já abre direto em https.
function seguro(resp) {
  const r = new Response(resp.body, resp);
  r.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return r;
}

// Área do Dono (/dono/): só abre para a conta do dono logada (a sessão é a do servidor de vendas, CONTAS).
// Manifesto e ícones ficam abertos porque o celular os busca sem a sessão na hora de instalar.
const DONO_HOST = 'dono.leunamesoftware.com.br';
const GESTACELL_HOST = 'gestacell.leunamesoftware.com.br';
const DONO_LIVRE = /^\/dono\/(app\.webmanifest|robo-\d+\.png|sw\.js)$/;
async function eDono(req, env) {
  if (!env.CONTAS || !env.DONO_EMAIL) return false;
  try {
    // Login próprio da Área do Dono (separado das contas dos apps), guardado no servidor de vendas.
    const r = await env.CONTAS.fetch(new Request(new URL('/api/dono/estado', req.url), { headers: { Cookie: req.headers.get('Cookie') || '' } }));
    return Boolean((await r.json())?.logado);
  } catch { return false; }
}
const RESTRITA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0A2BB8"><link rel="manifest" href="/dono/app.webmanifest"><link rel="icon" href="/dono/robo-192.png"><title>Leu · Área do Dono</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;font:16px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0A2BB8;color:#1C1917}
form{width:100%;max-width:360px;background:#fff;border-radius:20px;padding:22px;display:grid;gap:12px;box-shadow:0 18px 40px rgba(0,0,0,.25)}
img{width:96px;height:96px;border-radius:22px;justify-self:center}h1{margin:0;font-size:21px;text-align:center}p{margin:0;color:#6B6259;font-size:14px;text-align:center}
label{font-size:14px;font-weight:700;display:grid;gap:4px}input{font:inherit;min-height:46px;border:1px solid #D6D0C8;border-radius:10px;padding:0 12px}
input:focus{outline:3px solid #2563EB;outline-offset:1px}button{font:inherit;font-weight:800;min-height:48px;border:0;border-radius:12px;background:#0A2BB8;color:#fff;cursor:pointer}
#erro{color:#B91C1C;font-weight:700}[hidden]{display:none!important}</style></head>
<body><form id="f"><img src="/dono/robo-192.png" alt=""><h1 id="titulo">Leu · Área do Dono</h1><p id="sub">Carregando…</p>
<label>E-mail<input id="email" type="email" autocomplete="username" required></label>
<label>Senha<input id="senha" type="password" autocomplete="current-password" minlength="6" required></label>
<label id="l2" hidden>Repita a senha<input id="senha2" type="password" autocomplete="new-password" minlength="6"></label>
<p id="erro" hidden></p><button type="submit" id="bt">Entrar</button></form>
<script>
let criar = false;
fetch('/loja-api/dono/estado', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((d) => {
  criar = !d.temSenha;
  document.getElementById('sub').textContent = criar ? 'Primeiro acesso: crie a sua senha de dono (só desta área, separada dos apps).' : 'Entre com o seu e-mail e a sua senha de dono.';
  document.getElementById('l2').hidden = !criar; document.getElementById('senha2').required = criar;
  document.getElementById('senha').autocomplete = criar ? 'new-password' : 'current-password';
  document.getElementById('bt').textContent = criar ? 'Criar senha e entrar' : 'Entrar';
}).catch(() => { document.getElementById('sub').textContent = 'Sem internet. Tente de novo.'; });
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault(); const erro = document.getElementById('erro'); erro.hidden = true;
  const senha = document.getElementById('senha').value;
  if (criar && senha !== document.getElementById('senha2').value) { erro.textContent = 'As duas senhas não são iguais.'; erro.hidden = false; return; }
  try {
    const r = await fetch(criar ? '/loja-api/dono/criar' : '/loja-api/dono/entrar', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value.trim(), senha }) });
    if (r.ok) return location.reload();
    const c = (await r.json().catch(() => ({}))).erro;
    erro.textContent = c === 'email' ? 'Este não é o e-mail do dono.' : c === 'senha_curta' ? 'A senha precisa ter pelo menos 6 caracteres.'
      : c === 'muitas_tentativas' ? 'Muitas tentativas. Espere um minuto.' : c === 'ja_existe' ? 'A senha já foi criada. Recarregue a página e entre.' : 'E-mail ou senha não conferem.';
  } catch { erro.textContent = 'Sem internet. Tente de novo.'; }
  erro.hidden = false;
});
<\/script></body></html>`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Link do WhatsApp sem "https" chega como http: manda direto (um salto só) para a versão segura.
    // Só para abrir páginas (GET/HEAD): envios de programas antigos (POST) seguem como estavam.
    const abrir = req.method === 'GET' || req.method === 'HEAD';
    if ((url.protocol === 'http:' && abrir) || url.hostname === 'leunamesoftware.com.br') {
      url.protocol = 'https:';
      if (url.hostname === 'leunamesoftware.com.br') url.hostname = 'www.leunamesoftware.com.br';
      return Response.redirect(url.toString(), 301);
    }
    // Link curto de receita para o WhatsApp: /r/<id> abre o Quanto Cobrar direto nela.
    const curto = url.pathname.match(/^\/r\/([a-z0-9-]{2,60})\/?$/);
    if (curto) return Response.redirect(`${url.origin}/quantocobrar/app/?receita=${curto[1]}&leuapps=1`, 302);
    // Quanto Cobrar dentro da loja (mesmo endereço = abre sem barra de endereço no app instalado).
    // Link de divulgação: cai na página de venda do app (fotos, preços e Comprar), não direto no app.
    // Sem redirecionar (um salto a menos no celular): a própria vitrine abre e troca o endereço para /#quantocobrar.
    if (url.pathname === '/quantocobrar' || url.pathname === '/quantocobrar/') return seguro(await env.ASSETS.fetch(new Request(url.origin + '/', req)));
    if (env.CONTAS && url.pathname.startsWith('/quantocobrar/')) {
      url.pathname = url.pathname.slice('/quantocobrar'.length);
      if (url.pathname === '/api/mp/aviso') return new Response('Não encontrado.', { status: 404 });
      const pedido = new Request(url, req);
      const cab = new Headers(pedido.headers); cab.set('X-Loja-Base', '/quantocobrar');
      return env.CONTAS.fetch(new Request(pedido, { headers: cab }));
    }
    // Compra e conta (mesmo sistema de todos os apps): servidor de vendas, pela ligação interna CONTAS.
    // Fica no mesmo endereço da loja para o login valer aqui e nos apps servidos pela loja (Gestacell).
    if (env.CONTAS && (url.pathname.startsWith('/loja/') || url.pathname.startsWith('/loja-api/') || url.pathname.startsWith('/fonts/poppins-'))) {
      if (url.pathname === '/loja/compra.css') url.pathname = '/compra.css';
      if (url.pathname.startsWith('/loja-api/')) url.pathname = '/api/' + url.pathname.slice('/loja-api/'.length);
      if (url.pathname === '/api/mp/aviso') return new Response('Não encontrado.', { status: 404 });
      return env.CONTAS.fetch(new Request(url, req));
    }
    // A Área do Dono tem endereço próprio (vira um app separado no celular): dono.leunamesoftware.com.br.
    if (url.hostname !== DONO_HOST && (url.pathname === '/dono' || url.pathname.startsWith('/dono/'))) return Response.redirect(`https://${DONO_HOST}/`, 302);
    if (url.hostname === DONO_HOST) {
      if (url.pathname !== '/apps.json' && !url.pathname.startsWith('/img/') && !url.pathname.startsWith('/dono/')) url.pathname = '/dono' + url.pathname;
      req = new Request(url, req);
    }
    // Gestacell no endereço próprio: gestacell.leunamesoftware.com.br/ mostra o que está em /gestacell/.
    if (url.hostname === GESTACELL_HOST) {
      if (!url.pathname.startsWith('/img/') && !url.pathname.startsWith('/gestacell/')) url.pathname = '/gestacell' + (url.pathname === '/' ? '/' : url.pathname);
      req = new Request(url, req);
    }
    if (url.pathname.startsWith('/dono/') && !DONO_LIVRE.test(url.pathname) && !(await eDono(req, env))) {
      return new Response(RESTRITA, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    // Arquivos da vitrine (index.html, apps.json, imagens…).
    const arquivo = await env.ASSETS.fetch(req);
    // Gestacell no endereço próprio: o manifesto vai já no HTML, para a loja conseguir instalar com um toque.
    if (url.hostname === GESTACELL_HOST && arquivo.status === 200 && (arquivo.headers.get('Content-Type') || '').includes('text/html')) {
      return seguro(new HTMLRewriter().on('head', { element: (e) => e.append('<link rel="manifest" href="/app.webmanifest">', { html: true }) }).transform(arquivo));
    }
    if (arquivo.status !== 404) return seguro(arquivo);
    if (env.SITE_ANTIGO && url.hostname !== 'apps.leunamesoftware.com.br') {
      if (url.pathname === '/site-antigo') url.pathname = '/';
      return env.SITE_ANTIGO.fetch(new Request(url, req));
    }
    return new Response('Página não encontrada.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
