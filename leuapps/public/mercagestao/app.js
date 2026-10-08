// MercaGestão — caixa e gestão de mercado. Os dados ficam no próprio aparelho (IndexedDB).
// Regras e contas em nucleo.js (testadas). Acesso pela conta da loja LeuApps (teste de 7 dias ou vitalício).
import * as N from './nucleo.js';

const { brl, reais, centavos, numeroBR, FORMAS } = N;
const APP = 'mercagestao';
const LOJA_COMPRA = 'https://www.leunamesoftware.com.br/loja/comprar?app=mercagestao';
const ESQUECI = 'https://www.leunamesoftware.com.br/loja/esqueci';
const raiz = document.getElementById('raiz');

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dataBR = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR') : '');
const horaBR = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const din = (c) => brl(reais(c));
const qtdTxt = (q, un) => (un === 'kg' ? Number(q).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg' : String(q));
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};
function toast(msg, erro = false) {
  const t = document.createElement('div'); t.className = 'toast' + (erro ? ' erro' : ''); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), erro ? 4500 : 2600);
}
async function hash(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------- banco local ----------
const LOJAS = ['produtos', 'vendas', 'clientes', 'fiado', 'fornecedores', 'contas', 'caixas', 'estoque', 'operadores', 'config'];
let db;
function abrirBanco() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open('mercagestao', 1);
    r.onupgradeneeded = () => { for (const n of LOJAS) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: 'id' }); };
    r.onsuccess = () => ok((db = r.result));
    r.onerror = () => erro(r.error);
  });
}
const pedir = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const todos = (loja) => pedir(db.transaction(loja).objectStore(loja).getAll());
const pegar = (loja, id) => pedir(db.transaction(loja).objectStore(loja).get(id));
const salvar = (loja, obj) => pedir(db.transaction(loja, 'readwrite').objectStore(loja).put(obj)).then(() => obj);
const apagar = (loja, id) => pedir(db.transaction(loja, 'readwrite').objectStore(loja).delete(id));
async function cfg(id, padrao = {}) { return { ...padrao, ...((await pegar('config', id)) || {}), id }; }

// ---------- estado ----------
const S = {
  operador: null, tela: 'caixa', produtos: [], porCodigo: new Map(), porPLU: new Map(),
  loja: {}, impressao: {}, balanca: {}, fiscal: {}, caixa: null,
  venda: { itens: [], descontoVenda: null, cliente: null, cpf: '' },
};
async function carregarProdutos() {
  S.produtos = (await todos('produtos')).sort((a, b) => a.nome.localeCompare(b.nome));
  S.porCodigo = new Map(); S.porPLU = new Map();
  for (const p of S.produtos) {
    if (p.codigo) S.porCodigo.set(String(p.codigo), p);
    if (p.plu) S.porPLU.set(String(Number(p.plu)), p);
  }
}
async function carregarConfig() {
  S.loja = await cfg('loja', { nome: '', cnpj: '', endereco: '', telefone: '', mensagem: 'Obrigado pela preferência!' });
  S.impressao = await cfg('impressao', { largura: '80', automatico: true, bluetooth: false });
  S.balanca = await cfg('balanca', { digitosCodigo: 4, valor: 'preco' });
  S.fiscal = await cfg('fiscal', { ativo: false, ambiente: 'homologacao', token: '', cnpj: '', regime: 'simples', csosn: '102', cst: '00', cfop: '5102', automatico: true });
  S.caixa = (await todos('caixas')).find((c) => !c.fechadoEm) || null;
}

// =====================================================================
// 1) Acesso pela conta da loja LeuApps
// =====================================================================
const MSG_OUTRO = 'Sua conta entrou em outro aparelho e este foi desconectado (cada conta usa 1 celular e 1 computador). Entre de novo para usar aqui.';
async function contaApps() {
  try {
    const r = await fetch('/loja-api/conta/apps', { cache: 'no-store', credentials: 'same-origin' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function conferirAcesso() {
  if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('semconta')) return { ok: true };
  const d = await contaApps();
  if (d) {
    if (d.motivo === 'outro_aparelho') { LS.del('mg_acesso'); return { ok: false, msg: MSG_OUTRO }; }
    const a = d.apps && d.apps[APP];
    if (a) { LS.set('mg_acesso', JSON.stringify({ teste: Boolean(a.teste), expiraEm: a.expiraEm || null })); return { ok: true, teste: Boolean(a.teste), expiraEm: a.expiraEm }; }
    LS.del('mg_acesso');
    return { ok: false, testeAcabou: Boolean(d.testes && d.testes[APP] && d.testes[APP].acabou), logado: Boolean(d.conta) };
  }
  // Sem internet: o vitalício continua; o teste vale até a data guardada (+1 dia).
  let c = null; try { c = JSON.parse(LS.get('mg_acesso') || 'null'); } catch {}
  if (!c) return { ok: false, offline: true };
  if (!c.expiraEm) return { ok: true };
  return { ok: Date.now() < new Date(c.expiraEm).getTime() + 864e5, teste: c.teste, expiraEm: c.expiraEm };
}
async function postar(rota, corpo) {
  return fetch(rota, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
}
async function comecarTeste() {
  const r = await postar('/loja-api/conta/teste', { app: APP });
  if (r.status === 401) return 'sem_conta';
  const d = await r.json().catch(() => ({}));
  if (d.erro === 'teste_acabou') return 'acabou';
  if (!r.ok) throw new Error('Não deu para começar o teste agora. Tente de novo.');
  return 'ok';
}
function telaAcesso(estado = {}, modo = '') {
  const criando = modo === 'criar';
  const campo = (id, rot, tipo, auto) => `<label>${rot}<input id="${id}" type="${tipo}" autocomplete="${auto}"></label>`;
  raiz.innerHTML = `<div class="entrada"><div class="cartao">
    <div class="logo"><img src="/img/mercagestao-192.png" alt=""><b>MercaGestão</b>
      <span class="sub">Caixa e gestão para mercado, mercearia e mini-mercado.<br>${estado.testeAcabou ? '<b>Pagamento único de R$ 200</b>, é seu para sempre.' : '<b>7 dias grátis</b> para testar. Depois, R$ 200 uma vez só.'}</span></div>
    ${estado.msg ? `<div class="aviso erro">${esc(estado.msg)}</div>` : ''}
    ${estado.offline ? '<div class="aviso">Sem internet. Conecte-se uma vez para liberar o app neste aparelho.</div>' : ''}
    ${criando ? `<b>Crie a sua conta para testar grátis</b>${campo('a-nome', 'Seu nome', 'text', 'name')}${campo('a-email', 'E-mail', 'email', 'email')}${campo('a-senha', 'Crie uma senha (mín. 6)', 'password', 'new-password')}
        <div id="a-erro" class="aviso erro" hidden></div>
        <button class="btn prim grande" id="a-ir">Começar 7 dias grátis</button>
        <a href="#" id="a-modo" style="text-align:center">Já tenho conta: entrar</a>`
      : `${estado.testeAcabou ? '' : '<button class="btn prim grande" id="a-testar">🎁 Testar 7 dias grátis</button>'}
        <a class="btn ${estado.testeAcabou ? 'prim' : ''} grande" href="${LOJA_COMPRA}">🛒 Comprar · R$ 200 (único)</a>
        <hr style="border:0;border-top:1px solid var(--linha);width:100%">
        <b>Já tem conta? Entre</b>${campo('a-email', 'E-mail', 'email', 'username')}${campo('a-senha', 'Senha', 'password', 'current-password')}
        <div id="a-erro" class="aviso erro" hidden></div>
        <button class="btn grande" id="a-ir">Entrar</button>
        <a href="${ESQUECI}" style="text-align:center">Esqueci a senha</a>`}
    <p class="sub" style="text-align:center">A mesma conta de todos os apps da LeuApps.</p>
  </div></div>`;
  const erro = (t) => { const b = $('#a-erro'); b.textContent = t; b.hidden = false; };
  const depois = async (querTeste) => {
    const a = await conferirAcesso();
    if (a.ok) return iniciar();
    if (!querTeste && a.testeAcabou) throw new Error('O teste grátis desta conta terminou. Toque em Comprar para continuar.');
    const t = await comecarTeste();
    if (t === 'acabou') return telaAcesso({ testeAcabou: true, msg: 'O teste grátis desta conta terminou.' });
    if (t === 'ok') { toast('Teste grátis de 7 dias liberado!'); return iniciar(); }
    throw new Error('Não deu para liberar agora. Tente de novo.');
  };
  const bt = $('#a-ir');
  const enviar = async () => {
    const email = $('#a-email').value.trim(), senha = $('#a-senha').value, nome = criando ? $('#a-nome').value.trim() : '';
    if (criando && nome.length < 2) return erro('Digite o seu nome.');
    if (!email || !senha) return erro('Digite o e-mail e a senha.');
    if (criando && senha.length < 6) return erro('Crie uma senha com pelo menos 6 caracteres.');
    bt.disabled = true; const rot = bt.textContent; bt.textContent = 'Aguarde…';
    try {
      if (criando) {
        const r = await postar('/loja-api/conta/criar', { nome, email, senha });
        if (!r.ok) { const c = (await r.json().catch(() => ({}))).erro; throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um minuto.' : c === 'senha_incorreta' ? 'Este e-mail já tem conta. Toque em "Já tenho conta" e entre.' : 'Não deu para criar a conta. Confira os dados.'); }
      } else {
        let r = await postar('/loja-api/conta/entrar', { email, senha });
        if (!r.ok && r.status !== 429) r = await postar('/loja-api/dono/entrar', { email, senha });
        if (!r.ok) throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um minuto.' : 'E-mail ou senha não conferem.');
      }
      await depois(criando);
    } catch (e) { erro(navigator.onLine ? e.message : 'Sem internet. Conecte-se e tente de novo.'); bt.disabled = false; bt.textContent = rot; }
  };
  bt.onclick = enviar;
  $('#a-senha').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
  const m = $('#a-modo'); if (m) m.onclick = (e) => { e.preventDefault(); telaAcesso(estado, ''); };
  const t = $('#a-testar');
  if (t) t.onclick = async () => {
    t.disabled = true; t.textContent = 'Liberando…';
    try {
      const r = await comecarTeste();
      if (r === 'sem_conta') return telaAcesso(estado, 'criar');
      if (r === 'acabou') return telaAcesso({ testeAcabou: true, msg: 'O teste grátis desta conta terminou.' });
      toast('Teste grátis de 7 dias liberado!'); iniciar();
    } catch (e) { erro(navigator.onLine ? e.message : 'Sem internet. Conecte-se e tente de novo.'); t.disabled = false; t.textContent = '🎁 Testar 7 dias grátis'; }
  };
}

// =====================================================================
// 2) Primeiro uso e operadores (PIN)
// =====================================================================
function telaPrimeiroUso() {
  raiz.innerHTML = `<div class="entrada"><div class="cartao">
    <div class="logo"><img src="/img/mercagestao-192.png" alt=""><b>Bem-vindo ao MercaGestão</b><span class="sub">Só 3 dados para começar.</span></div>
    <label>Nome do mercado<input id="p-loja" placeholder="Ex.: Mercadinho São José"></label>
    <label>Seu nome<input id="p-nome" autocomplete="name"></label>
    <label>Crie um PIN de 4 números (para abrir o caixa)<input id="p-pin" inputmode="numeric" maxlength="6" type="password"></label>
    <div id="p-erro" class="aviso erro" hidden></div>
    <button class="btn prim grande" id="p-ok">Começar</button></div></div>`;
  $('#p-ok').onclick = async () => {
    const loja = $('#p-loja').value.trim(), nome = $('#p-nome').value.trim(), pin = $('#p-pin').value.trim();
    const erro = (t) => { $('#p-erro').textContent = t; $('#p-erro').hidden = false; };
    if (loja.length < 2) return erro('Digite o nome do mercado.');
    if (nome.length < 2) return erro('Digite o seu nome.');
    if (!/^\d{4,6}$/.test(pin)) return erro('O PIN precisa ter de 4 a 6 números.');
    await salvar('config', { ...S.loja, id: 'loja', nome: loja });
    const sal = uid();
    await salvar('operadores', { id: uid(), nome, papel: 'dono', sal, pin: await hash(sal + pin), criadoEm: new Date().toISOString() });
    iniciar();
  };
}
async function telaPin() {
  const ops = (await todos('operadores')).filter((o) => !o.inativo);
  let escolhido = ops.length === 1 ? ops[0] : null, digitos = '';
  const desenhar = (erro = '') => {
    raiz.innerHTML = `<div class="entrada"><div class="cartao">
      <div class="logo"><img src="/img/mercagestao-192.png" alt=""><b>${esc(S.loja.nome || 'MercaGestão')}</b><span class="sub">${escolhido ? 'Olá, ' + esc(escolhido.nome) + '! Digite o seu PIN.' : 'Quem vai usar o caixa?'}</span></div>
      ${escolhido ? `<div class="pontos">${'●'.repeat(digitos.length) || '&nbsp;'}</div>
        ${erro ? `<div class="aviso erro">${esc(erro)}</div>` : ''}
        <div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>
        ${ops.length > 1 ? '<a href="#" id="trocar" style="text-align:center">Trocar de pessoa</a>' : ''}`
      : ops.map((o) => `<button class="btn grande" data-op="${o.id}">${esc(o.nome)} <span class="selo">${o.papel === 'dono' ? 'dono' : 'caixa'}</span></button>`).join('')}
    </div></div>`;
    $$('[data-op]').forEach((b) => (b.onclick = () => { escolhido = ops.find((o) => o.id === b.dataset.op); digitos = ''; desenhar(); }));
    const tr = $('#trocar'); if (tr) tr.onclick = (e) => { e.preventDefault(); escolhido = null; desenhar(); };
    $$('[data-k]').forEach((b) => (b.onclick = () => tecla(b.dataset.k)));
  };
  const tecla = async (k) => {
    if (k === '⌫') digitos = digitos.slice(0, -1);
    else if (k === 'OK') {
      if ((await hash(escolhido.sal + digitos)) === escolhido.pin) { S.operador = escolhido; return montarApp(); }
      digitos = ''; return desenhar('PIN errado.');
    } else if (digitos.length < 6) digitos += k;
    desenhar();
  };
  onkeydown = (e) => { if (!escolhido || S.operador) return; if (/^\d$/.test(e.key)) tecla(e.key); else if (e.key === 'Backspace') tecla('⌫'); else if (e.key === 'Enter') tecla('OK'); };
  desenhar();
}
const ehDono = () => S.operador?.papel === 'dono';

// =====================================================================
// 3) Estrutura (menu + telas)
// =====================================================================
const TELAS = [
  ['caixa', '🛒', 'Caixa'], ['vendas', '🧾', 'Vendas'], ['produtos', '📦', 'Produtos'], ['estoque', '🏷️', 'Estoque'],
  ['clientes', '👥', 'Clientes e fiado'], ['financeiro', '💰', 'Financeiro'], ['gaveta', '🗄️', 'Abrir/fechar caixa'],
  ['relatorios', '📊', 'Relatórios'], ['config', '⚙️', 'Configurações'],
];
const SO_DONO = new Set(['financeiro', 'relatorios', 'config']);
function montarApp() {
  onkeydown = null;
  raiz.innerHTML = `<div class="app"><nav class="menu">
      <div class="marca"><img src="/img/mercagestao-192.png" alt="">MercaGestão</div>
      ${TELAS.filter(([id]) => ehDono() || !SO_DONO.has(id)).map(([id, ico, nome]) => `<button data-tela="${id}"><span class="ico">${ico}</span>${nome}</button>`).join('')}
      <div class="rodape-menu">${esc(S.operador.nome)} · <a href="#" id="sair" style="color:#fff">sair</a></div>
    </nav><main class="principal" id="conteudo"></main></div>`;
  $$('[data-tela]').forEach((b) => (b.onclick = () => ir(b.dataset.tela)));
  $('#sair').onclick = (e) => { e.preventDefault(); S.operador = null; telaPin(); };
  ir(S.tela || 'caixa');
}
function ir(tela) {
  S.tela = tela;
  $$('[data-tela]').forEach((b) => b.classList.toggle('ativo', b.dataset.tela === tela));
  onkeydown = null;
  ({ caixa: telaCaixa, vendas: telaVendas, produtos: telaProdutos, estoque: telaEstoque, clientes: telaClientes, financeiro: telaFinanceiro, gaveta: telaGaveta, relatorios: telaRelatorios, config: telaConfig })[tela]();
}
const conteudo = () => $('#conteudo');

function janela(html, { larga = false } = {}) {
  const f = document.createElement('div'); f.className = 'janela-fundo';
  f.innerHTML = `<div class="janela${larga ? ' larga' : ''}">${html}</div>`;
  document.body.appendChild(f);
  const fechar = () => { f.remove(); };
  f.addEventListener('mousedown', (e) => { if (e.target === f) fechar(); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } });
  $$('[data-fechar]', f).forEach((b) => (b.onclick = fechar));
  setTimeout(() => { const i = f.querySelector('input:not([type=checkbox]),select,textarea'); if (i) i.focus(); }, 30);
  return { el: f, fechar };
}
function confirmar(msg, sim = 'Confirmar') {
  return new Promise((ok) => {
    const j = janela(`<p style="font-size:16px">${esc(msg)}</p><div class="linha-botoes" style="justify-content:flex-end"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="c-sim">${esc(sim)}</button></div>`);
    $('#c-sim', j.el).onclick = () => { j.fechar(); ok(true); };
    $$('[data-fechar]', j.el).forEach((b) => b.addEventListener('click', () => ok(false)));
  });
}

// =====================================================================
// 4) Leitor de código de barras pela câmera
// =====================================================================
async function carregarScript(src) {
  await new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
}
function lerCamera() {
  return new Promise(async (resolver) => {
    const j = janela(`<h2>📷 Aponte para o código de barras</h2><div class="camera"><video playsinline muted></video><div class="mira"></div></div>
      <p class="sub">Segure o celular parado, a uns 15 cm do código.</p><div class="linha-botoes" style="justify-content:flex-end"><button class="btn" data-fechar>Fechar</button></div>`);
    const video = $('video', j.el);
    let parar = false, stream = null, leitorZX = null;
    const fim = (codigo) => {
      if (parar) return; parar = true;
      try { leitorZX && leitorZX.reset(); } catch {}
      if (stream) stream.getTracks().forEach((t) => t.stop());
      j.fechar(); resolver(codigo || null);
    };
    $$('[data-fechar]', j.el).forEach((b) => b.addEventListener('click', () => fim(null)));
    try {
      if ('BarcodeDetector' in window) {
        const formatos = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
        const det = new BarcodeDetector({ formats: (await BarcodeDetector.getSupportedFormats()).filter((f) => formatos.includes(f)) });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream; await video.play();
        const laco = async () => {
          if (parar) return;
          try { const r = await det.detect(video); if (r[0]) return fim(r[0].rawValue); } catch {}
          requestAnimationFrame(laco);
        };
        laco();
      } else {
        if (!window.ZXing) await carregarScript('lib/zxing.min.js');
        leitorZX = new ZXing.BrowserMultiFormatReader();
        await leitorZX.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (res) => { if (res) fim(res.getText()); });
      }
    } catch (e) {
      j.fechar(); parar = true; resolver(null);
      toast(e && e.name === 'NotAllowedError' ? 'Libere a câmera para o app nas permissões do navegador.' : 'Não deu para abrir a câmera neste aparelho.', true);
    }
  });
}
const botaoCamera = (id) => `<button class="btn" type="button" data-camera="${id}" title="Ler com a câmera">📷</button>`;
function ligarCameras(el, depois) {
  $$('[data-camera]', el).forEach((b) => (b.onclick = async () => {
    const c = await lerCamera(); if (!c) return;
    const campo = document.getElementById(b.dataset.camera); campo.value = c;
    if (depois) depois(c, campo);
  }));
}

// =====================================================================
// 5) CAIXA (PDV)
// =====================================================================
function buscarProduto(texto) {
  const t = String(texto || '').trim();
  if (!t) return { lista: [] };
  // Etiqueta da balança (começa com 2): produto pelo PLU, preço ou peso na etiqueta.
  const et = N.lerEtiquetaBalanca(t, S.balanca);
  if (et) {
    const p = S.porPLU.get(et.codigoProduto);
    if (p) {
      // Etiqueta com preço: o total é o da etiqueta (o peso é calculado só para o estoque).
      if (et.precoCent != null) {
        const qtd = p.preco > 0 ? Math.round((et.precoCent / centavos(p.preco)) * 1000) / 1000 : 1;
        return { produto: p, qtd, totalFixo: reais(et.precoCent) };
      }
      return { produto: p, qtd: et.pesoKg };
    }
  }
  const exato = S.porCodigo.get(t);
  if (exato) return { produto: exato };
  const q = t.toLowerCase();
  return { lista: S.produtos.filter((p) => !p.inativo && (p.nome.toLowerCase().includes(q) || String(p.codigo || '').includes(q))).slice(0, 30) };
}
function itemDe(p, qtd = 1, preco = null) {
  return { produtoId: p.id, codigo: p.codigo || '', nome: p.nome, preco: preco ?? p.preco, qtd, unidade: p.unidade || 'un', custo: p.custo || 0, ncm: p.ncm || '', desconto: 0 };
}
async function adicionarProduto(p, qtd = null, preco = null, totalFixo = null) {
  if (!p) return;
  if (p.unidade === 'kg' && qtd == null) {
    const j = janela(`<h2>⚖️ ${esc(p.nome)}</h2><label>Peso (kg)<input id="peso" inputmode="decimal" placeholder="0,500"></label>
      <p class="sub">${brl(p.preco)} o kg</p><div class="linha-botoes" style="justify-content:flex-end"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="peso-ok">Adicionar</button></div>`);
    const ok = () => { const kg = numeroBR($('#peso', j.el).value); if (kg <= 0) return toast('Digite o peso.', true); j.fechar(); adicionarProduto(p, Math.round(kg * 1000) / 1000, preco); };
    $('#peso-ok', j.el).onclick = ok; $('#peso', j.el).addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    return;
  }
  const q = qtd ?? 1;
  const v = S.venda;
  const igual = p.unidade !== 'kg' && v.itens.find((i) => i.produtoId === p.id && i.preco === (preco ?? p.preco) && !i.desconto);
  if (igual && totalFixo == null) igual.qtd += q; else v.itens.push({ ...itemDe(p, q, preco), ...(totalFixo != null ? { totalFixo } : {}) });
  if (p.estoque != null && p.unidade !== 'kg' && p.estoque - q < 0) toast(`Atenção: estoque de "${p.nome}" ficou negativo.`, true);
  desenharVenda();
}
// Ícone de cada categoria (bloco do topo do caixa).
const ICONE_CAT = [[/bebida|refri|suco|cerveja|água/i, '🥤'], [/mercearia|grão|arroz|feij/i, '🧺'], [/horti|fruta|verdura|legume/i, '🍎'], [/carne|açougue|frango/i, '🥩'],
  [/latic|leite|frio|queijo/i, '🥛'], [/padaria|pão/i, '🥖'], [/limpeza/i, '🧴'], [/higiene|perfum/i, '🧼'], [/biscoit|doce|bomboni/i, '🍪'], [/congel/i, '🧊']];
const iconeCat = (c) => (ICONE_CAT.find(([re]) => re.test(c)) || [, '🏷️'])[1];
const CORES_TILE = ['#1D4ED8', '#F97316', '#16A34A', '#9333EA', '#DC2626', '#0891B2', '#CA8A04'];
const corDe = (t) => CORES_TILE[[...String(t)].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_TILE.length];
const ESPERA = 'mg_espera';
const vendasEmEspera = () => { try { return JSON.parse(LS.get(ESPERA) || '[]'); } catch { return []; } };

function telaCaixa() {
  if (!S.caixa) {
    conteudo().innerHTML = `<div class="topo"><h1>🛒 Caixa</h1></div><div class="cartao" style="max-width:420px">
      <h2 style="margin-top:0">O caixa está fechado</h2><p class="sub">Para começar a vender, abra o caixa com o dinheiro do troco.</p>
      <label style="margin-top:10px">Fundo de troco (R$)<input id="fundo" inputmode="decimal" placeholder="0,00"></label>
      <button class="btn prim grande" style="width:100%;margin-top:12px" id="abrir">Abrir caixa</button></div>`;
    $('#abrir').onclick = () => abrirCaixa(numeroBR($('#fundo').value));
    return;
  }
  S.cat ||= '';
  S.pag ||= { forma: 'dinheiro', recebido: '' };
  const cats = [...new Set(S.produtos.filter((p) => !p.inativo && p.categoria).map((p) => p.categoria))].sort();
  conteudo().innerHTML = `<div class="pdv">
    <div class="pdv-busca">
      <div style="position:relative;flex:1;max-width:760px"><input id="leitor" placeholder="Digite o código de barras ou nome do produto…" autocomplete="off" autofocus><div class="sugestoes" id="sug" hidden></div></div>
      ${botaoCamera('leitor')}
      <div class="oper">👤<div><b>${esc(S.operador.nome)}</b>Caixa aberto ${horaBR(S.caixa.abertoEm)}</div></div>
    </div>
    <div class="painel pdv-produtos">
      <div class="cats"><button data-cat="" class="${S.cat ? '' : 'sel'}"><span>▦</span>Todos</button>${cats.map((c) => `<button data-cat="${esc(c)}" class="${S.cat === c ? 'sel' : ''}"><span>${iconeCat(c)}</span>${esc(c)}</button>`).join('')}</div>
      <div class="tiles" id="tiles"></div>
    </div>
    <div class="painel pdv-venda">
      <h2>Venda atual <span class="linha-botoes"><button class="btn peq" id="cli">👤 Cliente</button><button class="btn peq perigo" id="limpar">🗑 Limpar</button></span></h2>
      <div id="cliente-venda" class="sub" style="margin:-4px 0 6px"></div>
      <div class="itens-tab"><table><thead><tr><th>Produto</th><th>Qtd</th><th class="dir">Total</th><th></th></tr></thead><tbody id="itens"></tbody></table></div>
      <div class="contas-venda">
        <label style="display:grid;grid-template-columns:1fr 130px;align-items:center;gap:8px">🏷️ Desconto (R$)<input id="desc-valor" inputmode="decimal" placeholder="0,00" style="text-align:right"></label>
        <div class="l"><span>Subtotal</span><b id="v-sub">R$ 0,00</b></div>
        <div class="l"><span>Desconto</span><b id="v-desc" style="color:var(--vermelho)">R$ 0,00</b></div>
        <div class="total-azul"><span>Total</span><span id="total">R$ 0,00</span></div>
        <div class="linha-botoes"><button class="btn perigo" id="cancelar" style="flex:1">✕ Cancelar venda</button><button class="btn" id="suspender" style="flex:1">⏸ Suspender</button></div>
        <div id="espera"></div>
      </div>
    </div>
    <div class="painel pdv-pagar">
      <h2>Pagamento</h2>
      <div class="formas">${[['dinheiro', '💵', 'Dinheiro'], ['pix', '⚡', 'Pix'], ['debito', '💳', 'Débito'], ['credito', '💳', 'Crédito'], ['fiado', '📒', 'Fiado'], ['multiplo', '➗', 'Múltiplo']]
        .map(([k, ic, n]) => `<button data-pag="${k}" class="${S.pag.forma === k ? 'sel' : ''}"><span>${ic}</span>${n}</button>`).join('')}</div>
      <label class="campo-grande" style="margin-top:12px">Valor recebido (R$)<input id="recebido" inputmode="decimal" placeholder="0,00"></label>
      <div style="margin-top:10px"><span class="sub">Troco (R$)</span><div class="troco" id="troco">0,00</div></div>
      ${S.fiscal.ativo && S.fiscal.token ? `<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px;color:var(--texto)"><input type="checkbox" id="nota" style="width:20px;min-height:20px" ${S.fiscal.automatico ? 'checked' : ''}> Emitir NFC-e</label>` : ''}
      <button class="btn ok grande" id="finalizar" style="margin-top:auto;min-height:60px">✔ Finalizar pagamento (F4)</button>
      <div class="atalhos" style="margin-top:6px">F2 buscar · F4 finalizar · F6 tirar último · F9 cliente</div>
    </div></div>`;
  const leitor = $('#leitor'), sug = $('#sug');
  let selecionada = -1, lista = [], mult = null;
  const mostrarSug = () => {
    sug.hidden = !lista.length;
    sug.innerHTML = lista.map((p, k) => `<button data-k="${k}" class="${k === selecionada ? 'sel' : ''}"><span>${esc(p.nome)} <span class="sub">${esc(p.codigo || '')}</span></span><b>${brl(p.preco)}${p.unidade === 'kg' ? '/kg' : ''}</b></button>`).join('');
    $$('button', sug).forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); escolher(lista[+b.dataset.k]); }));
  };
  const escolher = (p) => { lista = []; selecionada = -1; mostrarSug(); leitor.value = ''; desenharTiles(''); adicionarProduto(p, mult); mult = null; leitor.focus(); };
  const ler = (texto) => {
    let t = texto.trim(); mult = null;
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*\*\s*(.+)$/);
    if (m) { mult = numeroBR(m[1]); t = m[2]; }
    const r = buscarProduto(t);
    if (r.produto) { leitor.value = ''; desenharTiles(''); adicionarProduto(r.produto, r.qtd ?? mult, r.preco ?? null, r.totalFixo ?? null); mult = null; return; }
    if (r.lista.length === 1 && !/^\d+$/.test(t)) return escolher(r.lista[0]);
    if (r.lista.length) { lista = r.lista; selecionada = 0; mostrarSug(); return; }
    // Código novo no caixa: o dono cadastra na hora (o app puxa os dados) e o produto já entra na venda.
    if (ehDono() && N.eanValido(t)) { leitor.value = ''; return formProduto(null, { codigo: t, aoSalvar: (p) => { desenharTiles(''); adicionarProduto(p, mult); mult = null; } }); }
    toast(/^\d{6,}$/.test(t) ? 'Código não cadastrado. Cadastre em Produtos.' : 'Nenhum produto encontrado.', true);
    leitor.select();
  };
  leitor.addEventListener('input', () => {
    const t = leitor.value.trim();
    if (t.length >= 2 && !/^\d+$/.test(t) && !t.includes('*')) { lista = buscarProduto(t).lista || []; selecionada = lista.length ? 0 : -1; } else lista = [];
    mostrarSug(); desenharTiles(/^\d+$/.test(t) ? '' : t);
  });
  leitor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && lista.length) { e.preventDefault(); selecionada = Math.min(lista.length - 1, selecionada + 1); mostrarSug(); }
    else if (e.key === 'ArrowUp' && lista.length) { e.preventDefault(); selecionada = Math.max(0, selecionada - 1); mostrarSug(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (lista.length && selecionada >= 0) escolher(lista[selecionada]); else if (leitor.value.trim()) ler(leitor.value); else finalizarRapido(); }
    else if (e.key === 'Escape') { leitor.value = ''; lista = []; mostrarSug(); desenharTiles(''); }
  });
  leitor.addEventListener('blur', () => setTimeout(() => { lista = []; mostrarSug(); }, 150));
  ligarCameras(conteudo(), (c) => { leitor.value = ''; ler(c); });
  $$('[data-cat]').forEach((b) => (b.onclick = () => { S.cat = b.dataset.cat; $$('[data-cat]').forEach((x) => x.classList.toggle('sel', x === b)); desenharTiles(''); }));
  $$('[data-pag]').forEach((b) => (b.onclick = () => {
    if (b.dataset.pag === 'multiplo') return finalizarVenda();
    if (b.dataset.pag === 'fiado' && !S.venda.cliente) { toast('Para vender no fiado, escolha o cliente.', true); return escolherClienteVenda(); }
    S.pag.forma = b.dataset.pag; $$('[data-pag]').forEach((x) => x.classList.toggle('sel', x === b)); desenharPagamento();
    if (S.pag.forma === 'dinheiro') $('#recebido').focus();
  }));
  $('#recebido').addEventListener('input', (e) => { S.pag.recebido = e.target.value; desenharPagamento(false); });
  $('#recebido').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finalizarRapido(); } });
  $('#desc-valor').addEventListener('input', (e) => { const v = numeroBR(e.target.value); S.venda.descontoVenda = v > 0 ? { tipo: 'valor', valor: v } : null; desenharVenda(false); });
  $('#finalizar').onclick = finalizarRapido;
  $('#cli').onclick = escolherClienteVenda;
  $('#limpar').onclick = $('#cancelar').onclick = async () => { if (S.venda.itens.length && await confirmar('Cancelar esta venda e limpar os itens?', 'Cancelar venda')) { novaVenda(); desenharVenda(); } };
  $('#suspender').onclick = () => {
    if (!S.venda.itens.length) return toast('Não há itens para suspender.', true);
    const lista = vendasEmEspera(); lista.push({ ...S.venda, quando: new Date().toISOString() }); LS.set(ESPERA, JSON.stringify(lista));
    novaVenda(); desenharVenda(); toast('Venda suspensa. Retome quando o cliente voltar.');
  };
  onkeydown = (e) => {
    if (document.querySelector('.janela-fundo')) return;
    if (e.key === 'F2') { e.preventDefault(); leitor.focus(); leitor.select(); }
    else if (e.key === 'F4') { e.preventDefault(); finalizarRapido(); }
    else if (e.key === 'F6') { e.preventDefault(); S.venda.itens.pop(); desenharVenda(); }
    else if (e.key === 'F8') { e.preventDefault(); $('#desc-valor').focus(); }
    else if (e.key === 'F9') { e.preventDefault(); escolherClienteVenda(); }
  };
  desenharTiles(''); desenharVenda();
}
function desenharTiles(filtro) {
  const el = $('#tiles'); if (!el) return;
  const q = String(filtro || '').toLowerCase();
  const lista = S.produtos.filter((p) => !p.inativo && (!S.cat || p.categoria === S.cat) && (!q || p.nome.toLowerCase().includes(q))).slice(0, 120);
  el.innerHTML = lista.map((p) => `<button class="tile" data-tile="${p.id}">
      ${p.foto ? `<img class="foto" src="${p.foto}" alt="">` : `<span class="foto" style="background:${corDe(p.nome)}">${esc(p.nome.trim()[0] || '?').toUpperCase()}</span>`}
      <span class="n">${esc(p.nome)}</span><b>${brl(p.preco)}${p.unidade === 'kg' ? '/kg' : ''}</b>
      ${p.estoqueMin != null && Number(p.estoque) <= Number(p.estoqueMin) ? `<span class="baixo">estoque: ${qtdTxt(p.estoque ?? 0, p.unidade)}</span>` : ''}</button>`).join('')
    || `<p class="vazio">${S.produtos.length ? 'Nenhum produto nesta categoria.' : 'Cadastre os produtos em Produtos (ou importe o XML da nota do fornecedor).'}</p>`;
  $$('[data-tile]', el).forEach((b) => (b.onclick = () => adicionarProduto(S.produtos.find((p) => p.id === b.dataset.tile))));
}
function novaVenda() { S.venda = { itens: [], descontoVenda: null, cliente: null, cpf: '' }; S.pag = { forma: 'dinheiro', recebido: '' }; }
function desenharVenda(campoDesconto = true) {
  const el = $('#itens'); if (!el) return;
  const v = S.venda, r = N.resumoVenda(v.itens, v.descontoVenda);
  el.innerHTML = v.itens.length ? v.itens.map((i, k) => `<tr>
      <td><b>${esc(i.nome)}</b><div class="sub">${brl(i.preco)}${i.unidade === 'kg' ? '/kg' : ''}</div></td>
      <td>${i.unidade === 'kg' || i.totalFixo != null ? qtdTxt(i.qtd, i.unidade) : `<span class="q"><button data-menos="${k}">−</button><b style="min-width:22px;text-align:center">${i.qtd}</b><button data-mais="${k}">+</button></span>`}</td>
      <td class="dir numero"><b>${din(N.totalItem(i))}</b></td><td><button class="x" data-tirar="${k}" title="Tirar">✕</button></td></tr>`).join('')
    : '<tr><td colspan="4" class="vazio">Passe o código de barras ou toque no produto.</td></tr>';
  $$('[data-mais]', el).forEach((b) => (b.onclick = () => { v.itens[+b.dataset.mais].qtd++; desenharVenda(); }));
  $$('[data-menos]', el).forEach((b) => (b.onclick = () => { const i = v.itens[+b.dataset.menos]; if (i.qtd > 1) i.qtd--; else v.itens.splice(+b.dataset.menos, 1); desenharVenda(); }));
  $$('[data-tirar]', el).forEach((b) => (b.onclick = () => { v.itens.splice(+b.dataset.tirar, 1); desenharVenda(); }));
  const box = el.closest('.itens-tab'); if (box) box.scrollTop = box.scrollHeight;
  $('#v-sub').textContent = din(r.subtotal); $('#v-desc').textContent = din(r.desconto); $('#total').textContent = din(r.total);
  if (campoDesconto) $('#desc-valor').value = v.descontoVenda ? String(v.descontoVenda.valor).replace('.', ',') : '';
  $('#cliente-venda').innerHTML = v.cliente ? `👤 <b>${esc(v.cliente.nome)}</b>` : v.cpf ? `CPF na nota: ${esc(v.cpf)}` : '';
  const espera = vendasEmEspera();
  $('#espera').innerHTML = espera.length ? `<div class="linha-botoes">${espera.map((e, k) => `<button class="btn peq" data-retomar="${k}">▶ Retomar ${e.cliente ? esc(e.cliente.nome) : 'venda ' + (k + 1)} (${din(N.resumoVenda(e.itens, e.descontoVenda).total)})</button>`).join('')}</div>` : '';
  $$('[data-retomar]').forEach((b) => (b.onclick = () => {
    if (S.venda.itens.length) return toast('Finalize ou suspenda a venda atual antes de retomar outra.', true);
    const lista = vendasEmEspera(); const [e] = lista.splice(+b.dataset.retomar, 1); LS.set(ESPERA, JSON.stringify(lista));
    delete e.quando; S.venda = e; desenharVenda();
  }));
  desenharPagamento();
}
function desenharPagamento(preencher = true) {
  const t = $('#troco'), rec = $('#recebido'); if (!t || !rec) return;
  const total = N.resumoVenda(S.venda.itens, S.venda.descontoVenda).total;
  const dinheiro = S.pag.forma === 'dinheiro';
  rec.disabled = !dinheiro;
  if (!dinheiro) rec.value = reais(total).toFixed(2).replace('.', ',');
  else if (preencher && !S.pag.recebido) rec.value = '';
  const recebido = dinheiro ? (S.pag.recebido ? centavos(numeroBR(S.pag.recebido)) : total) : total;
  const dif = recebido - total;
  t.className = 'troco' + (dif < 0 ? ' falta' : '');
  t.textContent = dif < 0 ? 'Falta ' + din(-dif) : reais(dif).toFixed(2).replace('.', ',');
}
// Finaliza com uma forma só (o mais comum). Para dividir em várias formas: botão "Múltiplo".
async function finalizarRapido() {
  const v = S.venda;
  if (!v.itens.length) return toast('Adicione produtos antes de finalizar.', true);
  const total = N.resumoVenda(v.itens, v.descontoVenda).total;
  const forma = S.pag.forma;
  if (forma === 'fiado' && !v.cliente) { toast('Para vender no fiado, escolha o cliente.', true); return escolherClienteVenda(); }
  const recebido = forma === 'dinheiro' && S.pag.recebido ? centavos(numeroBR(S.pag.recebido)) : total;
  if (recebido < total) return toast(`Falta receber ${din(total - recebido)}. Para dividir o pagamento, use "Múltiplo".`, true);
  if (forma === 'fiado') {
    const movs = (await todos('fiado')).filter((m) => m.clienteId === v.cliente.id);
    const pode = N.podeFiado(N.saldoFiado(movs), v.cliente.limite, total);
    if (!pode.ok && !(await confirmar(`O limite do fiado de ${v.cliente.nome} é ${brl(v.cliente.limite)} e sobra ${din(pode.disponivel)}. Vender assim mesmo?`, 'Vender'))) return;
  }
  const emitir = Boolean($('#nota')?.checked);
  await concluirVenda([{ forma, valor: reais(recebido) }], reais(recebido - total), emitir);
}
function descontoVenda() {
  if (!S.venda.itens.length) return;
  const d = S.venda.descontoVenda || { tipo: 'valor', valor: '' };
  const j = janela(`<h2>Desconto na compra</h2><div class="campos"><label>Tipo<select id="d-tipo"><option value="valor">Em reais (R$)</option><option value="pct" ${d.tipo === 'pct' ? 'selected' : ''}>Em %</option></select></label>
    <label>Desconto<input id="d-valor" inputmode="decimal" value="${d.valor || ''}"></label></div>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="d-tirar">Sem desconto</button><button class="btn prim" id="d-ok">Aplicar</button></div>`);
  const aplicar = () => { const valor = numeroBR($('#d-valor', j.el).value); S.venda.descontoVenda = valor > 0 ? { tipo: $('#d-tipo', j.el).value, valor } : null; j.fechar(); desenharVenda(); };
  $('#d-ok', j.el).onclick = aplicar; $('#d-valor', j.el).addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicar(); });
  $('#d-tirar', j.el).onclick = () => { S.venda.descontoVenda = null; j.fechar(); desenharVenda(); };
}
async function escolherClienteVenda() {
  const clientes = (await todos('clientes')).sort((a, b) => a.nome.localeCompare(b.nome));
  const j = janela(`<h2>Cliente da compra</h2><label>CPF na nota (opcional)<input id="cv-cpf" inputmode="numeric" value="${esc(S.venda.cpf)}"></label>
    <label style="margin-top:10px">Buscar cliente (para fiado)<input id="cv-busca" placeholder="Nome ou telefone"></label><div id="cv-lista" style="margin-top:8px;max-height:300px;overflow-y:auto"></div>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="cv-sem">Sem cliente</button><button class="btn prim" id="cv-ok">Pronto</button></div>`);
  const lista = () => {
    const q = $('#cv-busca', j.el).value.toLowerCase();
    $('#cv-lista', j.el).innerHTML = clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || String(c.telefone || '').includes(q)).slice(0, 30)
      .map((c) => `<button class="btn" style="width:100%;justify-content:space-between;margin-bottom:6px" data-c="${c.id}"><span>${esc(c.nome)}</span><span class="sub">${esc(c.telefone || '')}</span></button>`).join('') || '<p class="sub">Nenhum cliente. Cadastre em "Clientes e fiado".</p>';
    $$('[data-c]', j.el).forEach((b) => (b.onclick = () => { S.venda.cliente = clientes.find((c) => c.id === b.dataset.c); S.venda.cpf = S.venda.cliente.cpf || $('#cv-cpf', j.el).value.trim(); j.fechar(); desenharVenda(); }));
  };
  $('#cv-busca', j.el).oninput = lista; lista();
  $('#cv-ok', j.el).onclick = () => { S.venda.cpf = $('#cv-cpf', j.el).value.trim(); j.fechar(); desenharVenda(); };
  $('#cv-sem', j.el).onclick = () => { S.venda.cliente = null; S.venda.cpf = ''; j.fechar(); desenharVenda(); };
}

async function finalizarVenda() {
  const v = S.venda;
  if (!v.itens.length) return toast('Adicione produtos antes de finalizar.', true);
  const r = N.resumoVenda(v.itens, v.descontoVenda);
  const pagamentos = [];
  const podeNota = S.fiscal.ativo && S.fiscal.token;
  const j = janela(`<h2>Finalizar · ${din(r.total)}</h2>
    <div class="pagamentos">${Object.entries(FORMAS).map(([k, n]) => `<button class="btn" data-forma="${k}">${{ dinheiro: '💵', pix: '⚡', debito: '💳', credito: '💳', fiado: '📒', vale: '🎫', outro: '•' }[k]} ${n}</button>`).join('')}</div>
    <label style="margin-top:10px">Valor<input id="f-valor" inputmode="decimal"></label>
    <div id="f-lista" style="margin-top:10px"></div>
    <div id="f-situacao" class="aviso" style="margin-top:10px"></div>
    ${podeNota ? `<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:15px;color:var(--texto)"><input type="checkbox" id="f-nota" style="width:22px;min-height:22px" ${S.fiscal.automatico ? 'checked' : ''}> Emitir NFC-e (nota fiscal)</label>` : ''}
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim grande" id="f-ok" disabled>Concluir venda</button></div>`);
  let forma = 'dinheiro';
  const valorCampo = $('#f-valor', j.el);
  const falta = () => N.conferirPagamento(r.total, pagamentos).falta;
  const marcar = () => $$('[data-forma]', j.el).forEach((b) => b.classList.toggle('sel', b.dataset.forma === forma));
  const atualizar = () => {
    const c = N.conferirPagamento(r.total, pagamentos);
    $('#f-lista', j.el).innerHTML = pagamentos.map((p, k) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span>${FORMAS[p.forma]}</span><span><b>${brl(p.valor)}</b> <button class="btn peq" data-tira="${k}">✕</button></span></div>`).join('');
    $$('[data-tira]', j.el).forEach((b) => (b.onclick = () => { pagamentos.splice(+b.dataset.tira, 1); atualizar(); }));
    const sit = $('#f-situacao', j.el);
    sit.className = 'aviso' + (c.erro ? ' erro' : c.falta ? '' : ' ok');
    sit.innerHTML = c.erro ? esc(c.erro) : c.falta ? `Falta receber <b>${din(c.falta)}</b>` : `Tudo pago.${c.troco ? ` <b style="font-size:20px">Troco: ${din(c.troco)}</b>` : ''}`;
    $('#f-ok', j.el).disabled = !c.ok;
    valorCampo.value = c.falta ? reais(c.falta).toFixed(2).replace('.', ',') : '';
  };
  const lancar = () => {
    const val = numeroBR(valorCampo.value) || reais(falta());
    if (val <= 0) return;
    if (forma === 'fiado') {
      if (!v.cliente) return toast('Para vender no fiado, escolha o cliente (botão Cliente).', true);
    }
    pagamentos.push({ forma, valor: Math.round(val * 100) / 100 });
    atualizar();
  };
  // Dinheiro: escolhe e espera o valor recebido (para o troco). Pix, cartão e fiado: lança o que falta na hora.
  $$('[data-forma]', j.el).forEach((b) => (b.onclick = () => { forma = b.dataset.forma; marcar(); if (forma !== 'dinheiro') lancar(); valorCampo.focus(); valorCampo.select(); }));
  valorCampo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (falta() > 0 || !pagamentos.length) lancar(); else $('#f-ok', j.el).click(); } });
  marcar(); atualizar();
  $('#f-ok', j.el).onclick = async () => {
    const c = N.conferirPagamento(r.total, pagamentos);
    if (!c.ok) return;
    // Fiado: confere o limite do cliente.
    const fiado = pagamentos.filter((p) => p.forma === 'fiado').reduce((s, p) => s + centavos(p.valor), 0);
    if (fiado) {
      const movs = (await todos('fiado')).filter((m) => m.clienteId === v.cliente.id);
      const pode = N.podeFiado(N.saldoFiado(movs), v.cliente.limite, fiado);
      if (!pode.ok && !(await confirmar(`O limite do fiado de ${v.cliente.nome} é ${brl(v.cliente.limite)} e sobra ${din(pode.disponivel)}. Vender assim mesmo?`, 'Vender'))) return;
    }
    $('#f-ok', j.el).disabled = true;
    const emitir = podeNota && $('#f-nota', j.el)?.checked;
    j.fechar();
    await concluirVenda(pagamentos, reais(c.troco), emitir);
  };
}
async function proximoNumero() {
  const c = await cfg('contador', { venda: 0 });
  c.venda += 1; await salvar('config', c); return c.venda;
}
async function concluirVenda(pagamentos, troco, emitir) {
  const v = S.venda, r = N.resumoVenda(v.itens, v.descontoVenda);
  const venda = {
    id: uid(), numero: await proximoNumero(), data: new Date().toISOString(), operador: S.operador.nome, caixaId: S.caixa.id,
    itens: v.itens.map((i) => ({ ...i })), descontoVenda: v.descontoVenda, subtotal: reais(r.subtotal), desconto: reais(r.desconto), total: reais(r.total),
    pagamentos, troco, clienteId: v.cliente?.id || null, cliente: v.cliente?.nome || '', cpf: v.cpf || v.cliente?.cpf || '', cancelada: false,
    nfce: emitir ? { status: 'pendente' } : null,
  };
  await salvar('vendas', venda);
  // Baixa no estoque.
  for (const i of venda.itens) await moverEstoque(i.produtoId, -i.qtd, 'venda', `Venda ${venda.numero}`, venda.id);
  // Fiado: lança a compra na conta do cliente.
  for (const p of pagamentos.filter((x) => x.forma === 'fiado')) await salvar('fiado', { id: uid(), clienteId: venda.clienteId, tipo: 'compra', valor: p.valor, data: venda.data, vendaId: venda.id, obs: `Venda ${venda.numero}` });
  novaVenda();
  toast(`Venda ${venda.numero} concluída${troco ? ' · troco ' + brl(troco) : ''}`);
  if (S.tela === 'caixa') telaCaixa();
  if (emitir) await emitirNota(venda);
  if (S.impressao.automatico) await imprimirVenda(venda);
}
async function moverEstoque(produtoId, qtd, tipo, obs, ref = null) {
  const p = await pegar('produtos', produtoId);
  if (!p) return;
  p.estoque = Math.round(((Number(p.estoque) || 0) + qtd) * 1000) / 1000;
  await salvar('produtos', p);
  await salvar('estoque', { id: uid(), produtoId, nome: p.nome, qtd, tipo, obs, ref, data: new Date().toISOString(), operador: S.operador?.nome || '' });
  const k = S.produtos.findIndex((x) => x.id === p.id); if (k >= 0) S.produtos[k] = p;
  if (p.codigo) S.porCodigo.set(String(p.codigo), p);
  if (p.plu) S.porPLU.set(String(Number(p.plu)), p);
}

// ---------- impressão ----------
let qrPronto = null;
async function qrSVG(texto) {
  if (!window.qrcode) { qrPronto ||= carregarScript('lib/qrcode.min.js'); await qrPronto; }
  const q = qrcode(0, 'M'); q.addData(texto); q.make();
  return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
}
async function cupomHTML(venda) {
  const L = S.loja, nf = venda.nfce && venda.nfce.status === 'autorizado' ? venda.nfce : null;
  const r = N.resumoVenda(venda.itens, venda.descontoVenda);
  const linhas = venda.itens.map((i, n) => `<tr><td colspan="2">${n + 1} ${esc(i.nome)}</td></tr><tr><td>&nbsp; ${qtdTxt(i.qtd, i.unidade)} × ${brl(i.preco)}</td><td class="d">${din(N.totalItem(i))}</td></tr>`).join('');
  return `<div class="cupom l${S.impressao.largura === '58' ? 58 : 80}">
    <div class="c b">${esc(L.nome)}</div>${L.cnpj ? `<div class="c">CNPJ ${esc(L.cnpj)}</div>` : ''}${L.endereco ? `<div class="c">${esc(L.endereco)}</div>` : ''}${L.telefone ? `<div class="c">${esc(L.telefone)}</div>` : ''}
    <hr><div class="c b">${nf ? 'DANFE NFC-e · Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica' : 'CUPOM NÃO FISCAL'}</div><hr>
    <table>${linhas}</table><hr>
    <table><tr><td>Subtotal</td><td class="d">${din(r.subtotal)}</td></tr>${r.desconto ? `<tr><td>Desconto</td><td class="d">-${din(r.desconto)}</td></tr>` : ''}
    <tr class="b"><td>TOTAL</td><td class="d">${din(r.total)}</td></tr>
    ${venda.pagamentos.map((p) => `<tr><td>${FORMAS[p.forma]}</td><td class="d">${brl(p.valor)}</td></tr>`).join('')}
    ${venda.troco ? `<tr><td>Troco</td><td class="d">${brl(venda.troco)}</td></tr>` : ''}</table><hr>
    ${venda.cliente ? `<div>Cliente: ${esc(venda.cliente)}</div>` : ''}${venda.cpf ? `<div>CPF: ${esc(venda.cpf)}</div>` : nf ? '<div>CONSUMIDOR NÃO IDENTIFICADO</div>' : ''}
    <div>Venda ${venda.numero} · ${horaBR(venda.data)} · ${esc(venda.operador)}</div>
    ${nf ? `<hr><div class="c">NFC-e nº ${esc(nf.numero || '')} Série ${esc(nf.serie || '')}</div><div class="c">Consulte pela chave de acesso em</div><div class="c">${esc(nf.urlConsulta || '')}</div>
      <div class="c" style="word-break:break-all">${esc(String(nf.chave || '').replace(/(\d{4})/g, '$1 '))}</div>${nf.protocolo ? `<div class="c">Protocolo ${esc(nf.protocolo)}</div>` : ''}
      ${nf.qrcode ? `<div class="qr">${await qrSVG(nf.qrcode)}</div>` : ''}${S.fiscal.ambiente === 'homologacao' ? '<div class="c b">EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL</div>' : ''}` : ''}
    ${venda.cancelada ? '<div class="c b">*** VENDA CANCELADA ***</div>' : ''}
    ${L.mensagem ? `<hr><div class="c">${esc(L.mensagem)}</div>` : ''}<div class="c" style="margin-top:4px;font-size:10px">MercaGestão · LeuName Softwares</div></div>`;
}
async function imprimirVenda(venda) {
  if (S.impressao.bluetooth && S.impressao.largura) {
    try { return await imprimirBluetooth(N.cupomTexto(venda, S.loja, S.impressao.largura === '58' ? 32 : 48)); }
    catch (e) { toast('Impressora Bluetooth: ' + (e.message || 'não conectou') + '. Usando a impressão normal.', true); }
  }
  $('#cupom').innerHTML = await cupomHTML(venda);
  const estilo = document.createElement('style');
  estilo.textContent = `@page { size: ${S.impressao.largura === '58' ? 58 : 80}mm auto; margin: 0; }`;
  document.head.appendChild(estilo);
  setTimeout(() => { window.print(); estilo.remove(); }, 60);
}
// Impressora térmica Bluetooth (ESC/POS) pelo Chrome do celular ou do computador.
let impressoraBT = null;
const SERVICOS_BT = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'];
async function imprimirBluetooth(texto) {
  if (!navigator.bluetooth) throw new Error('este navegador não tem Bluetooth (use o Chrome)');
  if (!impressoraBT || !impressoraBT.device.gatt.connected) {
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICOS_BT });
    const gatt = await device.gatt.connect();
    let carac = null;
    for (const uuid of SERVICOS_BT) {
      try {
        const serv = await gatt.getPrimaryService(uuid);
        carac = (await serv.getCharacteristics()).find((c) => c.properties.write || c.properties.writeWithoutResponse);
        if (carac) break;
      } catch {}
    }
    if (!carac) throw new Error('impressora não reconhecida');
    impressoraBT = { device, carac };
  }
  const bytes = N.escpos(texto);
  for (let i = 0; i < bytes.length; i += 100) {
    const parte = bytes.slice(i, i + 100);
    if (impressoraBT.carac.properties.writeWithoutResponse) await impressoraBT.carac.writeValueWithoutResponse(parte);
    else await impressoraBT.carac.writeValue(parte);
  }
}

// =====================================================================
// 6) NFC-e (serviço emissor; a loja tem conta no emissor e o certificado fica lá)
// =====================================================================
async function fiscalPedido(metodo, caminho, corpo) {
  const r = await fetch('/fiscal' + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-Fiscal-Token': S.fiscal.token, 'X-Fiscal-Ambiente': S.fiscal.ambiente },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}
function msgSefaz(d) {
  return d.mensagem_sefaz || d.mensagem || (d.erros && d.erros.map((e) => e.mensagem).join('; ')) || d.codigo || 'erro no emissor';
}
async function emitirNota(venda) {
  const falta = N.pendenciasNfce(venda, S.fiscal);
  if (falta.length) {
    venda.nfce = { status: 'erro', erro: 'Falta: ' + falta.join(' · ') };
    await salvar('vendas', venda);
    return toast('NFC-e não emitida. ' + venda.nfce.erro, true);
  }
  const ref = 'MG' + String(venda.numero).padStart(7, '0') + '-' + venda.id.slice(0, 6);
  const cliente = venda.cpf ? { cpf: venda.cpf } : null;
  try {
    const { ok, d } = await fiscalPedido('POST', '/nfce?ref=' + encodeURIComponent(ref), N.montarNfce(venda, S.fiscal, cliente));
    if (ok && d.status === 'autorizado') {
      venda.nfce = { status: 'autorizado', ref, chave: d.chave_nfe, numero: d.numero, serie: d.serie, protocolo: d.protocolo, qrcode: d.qrcode_url, urlConsulta: d.url_consulta_nf, danfe: d.caminho_danfe };
      toast(`NFC-e ${d.numero} autorizada.`);
    } else {
      venda.nfce = { status: 'erro', ref, erro: msgSefaz(d) };
      toast('NFC-e recusada: ' + venda.nfce.erro, true);
    }
  } catch {
    venda.nfce = { status: 'pendente', ref, erro: 'sem internet: emitir depois em Vendas' };
    toast('Sem internet: a NFC-e fica pendente. Emita em Vendas quando voltar a internet.', true);
  }
  await salvar('vendas', venda);
}
async function cancelarNota(venda, justificativa) {
  const { ok, d } = await fiscalPedido('DELETE', '/nfce/' + encodeURIComponent(venda.nfce.ref), { justificativa });
  if (ok && (d.status === 'cancelado' || d.status_sefaz === '135')) { venda.nfce.status = 'cancelado'; await salvar('vendas', venda); return true; }
  throw new Error(msgSefaz(d));
}

// =====================================================================
// 7) VENDAS (histórico)
// =====================================================================
async function telaVendas() {
  const vendas = (await todos('vendas')).sort((a, b) => b.data.localeCompare(a.data));
  let filtro = hojeISO();
  const desenhar = () => {
    const lista = vendas.filter((v) => !filtro || v.data.slice(0, 10) === filtro || dataLocal(v.data) === filtro);
    const pend = vendas.filter((v) => v.nfce && v.nfce.status === 'pendente' && !v.cancelada);
    conteudo().innerHTML = `<div class="topo"><h1>🧾 Vendas</h1><div class="linha-botoes"><input type="date" id="v-data" value="${filtro}" style="width:auto"><button class="btn" id="v-todas">Todas</button></div></div>
      ${pend.length ? `<div class="aviso" style="margin-bottom:10px">${pend.length} NFC-e pendente(s). <button class="btn peq prim" id="v-pend">Emitir agora</button></div>` : ''}
      <div class="cartao tabela"><table><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th class="dir">Total</th><th>Nota</th></tr></thead><tbody>
      ${lista.map((v) => `<tr class="clicavel" data-v="${v.id}"><td>${v.numero}</td><td>${horaBR(v.data)}</td><td>${esc(v.cliente || '—')}</td><td>${v.pagamentos.map((p) => FORMAS[p.forma]).join(' + ')}</td>
        <td class="dir numero">${v.cancelada ? '<s>' + brl(v.total) + '</s>' : brl(v.total)}</td><td>${v.cancelada ? '<span class="selo vermelho">cancelada</span>' : seloNota(v.nfce)}</td></tr>`).join('') || '<tr><td colspan="6" class="vazio">Nenhuma venda neste dia.</td></tr>'}
      </tbody></table></div>`;
    $('#v-data').onchange = (e) => { filtro = e.target.value; desenhar(); };
    $('#v-todas').onclick = () => { filtro = ''; desenhar(); };
    const vp = $('#v-pend'); if (vp) vp.onclick = async () => { vp.disabled = true; for (const v of pend) await emitirNota(v); telaVendas(); };
    $$('[data-v]').forEach((tr) => (tr.onclick = () => detalheVenda(vendas.find((v) => v.id === tr.dataset.v))));
  };
  desenhar();
}
const dataLocal = (iso) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const seloNota = (nf) => !nf ? '<span class="selo">cupom</span>' : nf.status === 'autorizado' ? '<span class="selo verde">NFC-e</span>' : nf.status === 'cancelado' ? '<span class="selo vermelho">NFC-e cancelada</span>' : `<span class="selo ambar">NFC-e ${esc(nf.status)}</span>`;
function detalheVenda(v) {
  const j = janela(`<h2>Venda ${v.numero}</h2><p class="sub">${horaBR(v.data)} · ${esc(v.operador)}${v.cliente ? ' · ' + esc(v.cliente) : ''}</p>
    <table>${v.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${qtdTxt(i.qtd, i.unidade)} × ${brl(i.preco)}</td><td class="dir">${din(N.totalItem(i))}</td></tr>`).join('')}
    ${v.desconto ? `<tr><td colspan="2">Desconto</td><td class="dir">-${brl(v.desconto)}</td></tr>` : ''}<tr><td colspan="2"><b>Total</b></td><td class="dir"><b>${brl(v.total)}</b></td></tr></table>
    <p>${v.pagamentos.map((p) => `${FORMAS[p.forma]} ${brl(p.valor)}`).join(' · ')}${v.troco ? ' · troco ' + brl(v.troco) : ''}</p>
    ${v.nfce ? `<div class="aviso ${v.nfce.status === 'autorizado' ? 'ok' : v.nfce.status === 'erro' ? 'erro' : ''}">NFC-e: ${esc(v.nfce.status)}${v.nfce.numero ? ' nº ' + esc(v.nfce.numero) : ''}${v.nfce.erro ? ' — ' + esc(v.nfce.erro) : ''}</div>` : ''}
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px">
      <button class="btn" data-fechar>Fechar</button><button class="btn" id="dv-imp">🖨️ Imprimir</button>
      ${!v.cancelada && S.fiscal.ativo && S.fiscal.token && (!v.nfce || ['erro', 'pendente'].includes(v.nfce.status)) ? '<button class="btn" id="dv-nota">Emitir NFC-e</button>' : ''}
      ${!v.cancelada && ehDono() ? '<button class="btn perigo" id="dv-cancelar">Cancelar venda</button>' : ''}</div>`);
  $('#dv-imp', j.el).onclick = () => imprimirVenda(v);
  const n = $('#dv-nota', j.el); if (n) n.onclick = async () => { n.disabled = true; await emitirNota(v); j.fechar(); telaVendas(); };
  const c = $('#dv-cancelar', j.el);
  if (c) c.onclick = async () => {
    let just = '';
    if (v.nfce && v.nfce.status === 'autorizado') {
      just = prompt('Motivo do cancelamento da NFC-e (mínimo 15 letras):', 'Venda cancelada a pedido do cliente') || '';
      if (just.trim().length < 15) return toast('O motivo precisa ter pelo menos 15 letras.', true);
      try { await cancelarNota(v, just.trim()); } catch (e) { return toast('A SEFAZ não cancelou: ' + e.message, true); }
    } else if (!(await confirmar(`Cancelar a venda ${v.numero}? O estoque volta e o fiado é desfeito.`, 'Cancelar venda'))) return;
    v.cancelada = true; v.canceladaEm = new Date().toISOString(); await salvar('vendas', v);
    for (const i of v.itens) await moverEstoque(i.produtoId, i.qtd, 'cancelamento', `Cancelamento venda ${v.numero}`, v.id);
    for (const m of (await todos('fiado')).filter((x) => x.vendaId === v.id)) await apagar('fiado', m.id);
    toast('Venda cancelada.'); j.fechar(); telaVendas();
  };
}

// =====================================================================
// 8) PRODUTOS
// =====================================================================
async function telaProdutos() {
  await carregarProdutos();
  let busca = '', so = '';
  const desenhar = () => {
    const q = busca.toLowerCase();
    const lista = S.produtos.filter((p) => (!q || p.nome.toLowerCase().includes(q) || String(p.codigo || '').includes(q) || String(p.categoria || '').toLowerCase().includes(q))
      && (!so || (so === 'baixo' ? p.estoqueMin != null && Number(p.estoque) <= Number(p.estoqueMin) : so === 'inativo' ? p.inativo : !p.inativo)));
    $('#p-lista').innerHTML = lista.map((p) => `<tr class="clicavel" data-p="${p.id}"><td>${esc(p.codigo || '')}</td><td>${esc(p.nome)}${p.inativo ? ' <span class="selo">inativo</span>' : ''}<div class="sub">${esc(p.categoria || '')}</div></td>
      <td class="dir numero">${brl(p.preco)}${p.unidade === 'kg' ? '/kg' : ''}</td><td class="dir numero ${p.estoqueMin != null && Number(p.estoque) <= Number(p.estoqueMin) ? 'b' : ''}" style="${p.estoqueMin != null && Number(p.estoque) <= Number(p.estoqueMin) ? 'color:var(--vermelho);font-weight:800' : ''}">${qtdTxt(p.estoque ?? 0, p.unidade)}</td></tr>`).join('')
      || '<tr><td colspan="4" class="vazio">Nenhum produto. Toque em "Novo produto" ou importe o XML da nota do fornecedor.</td></tr>';
    $$('[data-p]').forEach((tr) => (tr.onclick = () => formProduto(S.produtos.find((p) => p.id === tr.dataset.p))));
    $('#p-qtd').textContent = `${lista.length} de ${S.produtos.length}`;
  };
  conteudo().innerHTML = `<div class="topo"><h1>📦 Produtos</h1><div class="linha-botoes"><button class="btn prim" id="p-novo">+ Novo produto</button><button class="btn" id="p-xml">📄 Importar XML da nota</button><button class="btn" id="p-csv">⬇️ Exportar planilha</button></div></div>
    <div class="linha-botoes" style="margin-bottom:10px"><input id="p-busca" placeholder="Buscar por nome, código ou categoria" style="flex:1;min-width:200px"><select id="p-so" style="width:auto"><option value="">Ativos</option><option value="baixo">Estoque baixo</option><option value="inativo">Inativos</option></select><span class="sub" id="p-qtd" style="align-self:center"></span></div>
    <div class="cartao tabela"><table><thead><tr><th>Código</th><th>Produto</th><th class="dir">Preço</th><th class="dir">Estoque</th></tr></thead><tbody id="p-lista"></tbody></table></div>`;
  $('#p-busca').oninput = (e) => { busca = e.target.value; desenhar(); };
  $('#p-so').onchange = (e) => { so = e.target.value; desenhar(); };
  $('#p-novo').onclick = () => formProduto(null);
  $('#p-xml').onclick = importarXml;
  $('#p-csv').onclick = exportarProdutos;
  desenhar();
}
function formProduto(p, op = {}) {
  const novo = !p;
  p = p || { id: uid(), nome: '', codigo: op.codigo || '', categoria: '', unidade: 'un', custo: 0, preco: 0, estoque: 0, estoqueMin: null, validade: '', plu: '', ncm: '' };
  const v = (x) => (x == null || x === 0 ? '' : String(x).replace('.', ','));
  const j = janela(`<h2>${novo ? 'Novo produto' : 'Editar produto'}</h2>
    <div class="campos">
      <label>Código de barras<div class="leitor"><input id="pf-codigo" value="${esc(p.codigo)}" inputmode="numeric">${botaoCamera('pf-codigo')}</div></label>
      ${novo ? '<p id="pf-achou" class="sub" style="grid-column:1/-1;margin:0">Leia o código de barras: o app busca nome, foto e NCM sozinho.</p>' : ''}
      <label style="grid-column:1/-1">Nome do produto<input id="pf-nome" value="${esc(p.nome)}"></label>
      <label>Categoria<input id="pf-cat" value="${esc(p.categoria || '')}" list="pf-cats"></label>
      <label>Vende por<select id="pf-un"><option value="un">Unidade</option><option value="kg" ${p.unidade === 'kg' ? 'selected' : ''}>Peso (kg)</option></select></label>
      <label>Custo (R$)<input id="pf-custo" inputmode="decimal" value="${v(p.custo)}"></label>
      <label>Margem (%)<input id="pf-margem" inputmode="decimal" value="${p.custo ? v(N.margemDe(p.custo, p.preco)) : ''}"></label>
      <label>Preço de venda (R$)<input id="pf-preco" inputmode="decimal" value="${v(p.preco)}"></label>
      <label>Estoque atual<input id="pf-estoque" inputmode="decimal" value="${v(p.estoque)}" ${novo ? '' : 'disabled title="Mude o estoque pela tela Estoque"'}></label>
      <label>Estoque mínimo (aviso)<input id="pf-min" inputmode="decimal" value="${v(p.estoqueMin)}"></label>
      <label>Validade (lote atual)<input id="pf-val" type="date" value="${esc(p.validade || '')}"></label>
      <label>Código na balança (PLU)<input id="pf-plu" inputmode="numeric" value="${esc(p.plu || '')}"></label>
      <label>NCM (para NFC-e)<input id="pf-ncm" inputmode="numeric" maxlength="10" value="${esc(p.ncm || '')}"></label>
      <label>Foto (aparece no caixa)<span style="display:flex;gap:8px;align-items:center">${p.foto ? `<img id="pf-foto-ver" src="${p.foto}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;background:#F1F5F9">` : '<span id="pf-foto-ver"></span>'}<input id="pf-foto" type="file" accept="image/*"></span></label>
    </div><datalist id="pf-cats">${[...new Set(S.produtos.map((x) => x.categoria).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <div id="pf-erro" class="aviso erro" hidden style="margin-top:10px"></div>
    <div class="linha-botoes" style="justify-content:space-between;margin-top:12px">
      <div>${novo ? '' : `<button class="btn ${p.inativo ? '' : 'perigo'}" id="pf-ativo">${p.inativo ? 'Reativar' : 'Desativar'}</button>`}</div>
      <div class="linha-botoes"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="pf-ok">Salvar</button></div></div>`, { larga: true });
  const custo = $('#pf-custo', j.el), margem = $('#pf-margem', j.el), preco = $('#pf-preco', j.el);
  margem.oninput = () => { if (numeroBR(custo.value) > 0) preco.value = String(N.precoPorMargem(numeroBR(custo.value), numeroBR(margem.value))).replace('.', ','); };
  preco.oninput = () => { if (numeroBR(custo.value) > 0) margem.value = String(N.margemDe(numeroBR(custo.value), numeroBR(preco.value))).replace('.', ','); };
  custo.oninput = () => { if (numeroBR(margem.value)) margem.oninput(); };
  let foto = p.foto || '';
  $('#pf-foto', j.el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { foto = await reduzirFoto(f); const v = $('#pf-foto-ver', j.el); v.outerHTML = `<img id="pf-foto-ver" src="${foto}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;background:#F1F5F9">`; }
    catch { toast('Não deu para ler esta foto.', true); }
  };
  // Produto novo: com o código de barras, puxa nome, marca, foto e NCM das bases de produtos (servidor da loja).
  let ultimo = '';
  const achou = (t) => { const a = $('#pf-achou', j.el); if (a) a.textContent = t; };
  const mostrarFoto = () => { $('#pf-foto-ver', j.el).outerHTML = `<img id="pf-foto-ver" src="${foto}" style="width:48px;height:48px;border-radius:8px;object-fit:contain;background:#F1F5F9">`; };
  const completar = async () => {
    const c = $('#pf-codigo', j.el).value.trim();
    if (!novo || c === ultimo || !N.eanValido(c)) return;
    ultimo = c;
    const ja = S.porCodigo.get(c);
    if (ja) return achou(`⚠️ Este código já é do produto "${ja.nome}".`);
    achou('🔎 Procurando o produto…');
    try {
      const d = await (await fetch('/produto/' + c, { cache: 'default' })).json();
      if ($('#pf-codigo', j.el).value.trim() !== c) return;
      if (!d.ok) { achou('Não achei este código nas bases de produtos. Digite o nome.'); $('#pf-nome', j.el).focus(); return; }
      const x = d.produto, nome = $('#pf-nome', j.el), tem = (a, b) => a.toLowerCase().includes(b.toLowerCase());
      if (!nome.value.trim()) nome.value = [x.nome, x.marca && !tem(x.nome, x.marca) ? x.marca : '', x.quantidade && !tem(x.nome, x.quantidade) ? x.quantidade : ''].filter(Boolean).join(' ');
      if (x.ncm && !$('#pf-ncm', j.el).value) $('#pf-ncm', j.el).value = x.ncm;
      achou('✅ Produto encontrado: confira o nome e ponha o preço de venda.');
      preco.focus();
      if (x.foto && !foto) { try { foto = await reduzirFoto(await (await fetch(x.foto)).blob()); mostrarFoto(); } catch {} }
    } catch { achou(navigator.onLine ? 'Não deu para buscar agora. Digite o nome.' : 'Sem internet: digite o nome do produto.'); ultimo = ''; }
  };
  ligarCameras(j.el, completar);
  const cod = $('#pf-codigo', j.el);
  cod.addEventListener('change', completar);
  cod.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); completar(); } });
  if (novo && p.codigo) completar();
  const at = $('#pf-ativo', j.el); if (at) at.onclick = async () => { p.inativo = !p.inativo; await salvar('produtos', p); j.fechar(); telaProdutos(); };
  $('#pf-ok', j.el).onclick = async () => {
    const erro = (t) => { $('#pf-erro', j.el).textContent = t; $('#pf-erro', j.el).hidden = false; };
    const codigo = $('#pf-codigo', j.el).value.trim(), nome = $('#pf-nome', j.el).value.trim();
    if (nome.length < 2) return erro('Digite o nome do produto.');
    if (numeroBR(preco.value) <= 0) return erro('Digite o preço de venda.');
    if (codigo && S.porCodigo.get(codigo) && S.porCodigo.get(codigo).id !== p.id) return erro('Este código de barras já é do produto "' + S.porCodigo.get(codigo).nome + '".');
    const plu = $('#pf-plu', j.el).value.trim();
    if (plu && S.porPLU.get(String(Number(plu))) && S.porPLU.get(String(Number(plu))).id !== p.id) return erro('Este código de balança já está em outro produto.');
    const ncm = $('#pf-ncm', j.el).value.replace(/\D/g, '');
    if (ncm && ncm.length !== 8) return erro('O NCM tem 8 números.');
    const min = $('#pf-min', j.el).value.trim();
    Object.assign(p, {
      codigo, nome, categoria: $('#pf-cat', j.el).value.trim(), unidade: $('#pf-un', j.el).value, custo: numeroBR(custo.value), preco: numeroBR(preco.value),
      estoqueMin: min === '' ? null : numeroBR(min), validade: $('#pf-val', j.el).value, plu, ncm, foto, atualizadoEm: new Date().toISOString(),
    });
    if (novo) { p.estoque = 0; p.criadoEm = new Date().toISOString(); }
    await salvar('produtos', p);
    const ini = numeroBR($('#pf-estoque', j.el).value);
    if (novo && ini) await moverEstoque(p.id, ini, 'entrada', 'Estoque inicial');
    await carregarProdutos();
    toast('Produto salvo.'); j.fechar();
    if (S.tela === 'produtos') telaProdutos();
    if (op.aoSalvar) op.aoSalvar(p);
  };
}
// Foto do produto: reduzida para 200 px (fica leve no aparelho).
async function reduzirFoto(arquivo) {
  const img = await createImageBitmap(arquivo);
  const lado = 200, k = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}
function escolherArquivo(aceita) {
  return new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.accept = aceita; i.onchange = () => ok(i.files[0] || null); i.click(); });
}
async function importarXml() {
  const arq = await escolherArquivo('.xml,text/xml'); if (!arq) return;
  let nota;
  try { nota = N.lerXmlNfe(await arq.text()); } catch (e) { return toast(e.message, true); }
  const jaImportada = nota.chave && (await todos('estoque')).some((m) => m.ref === 'nfe:' + nota.chave);
  const linhas = nota.itens.map((i, k) => { const ex = i.codigoBarras && S.porCodigo.get(i.codigoBarras); return { ...i, k, existente: ex || null, margem: 30, fator: 1 }; });
  const j = janela(`<h2>Nota ${esc(nota.numero)} · ${esc(nota.fornecedor.fantasia || nota.fornecedor.nome)}</h2>
    <p class="sub">${dataBR(nota.emissao.slice(0, 10))} · ${nota.itens.length} itens · total ${brl(nota.total)}</p>
    ${jaImportada ? '<div class="aviso erro">Esta nota já foi importada antes. Importar de novo soma o estoque outra vez.</div>' : ''}
    <p class="sub">Para cada item: produto novo ou já cadastrado, quantas unidades vêm em cada embalagem (ex.: fardo com 12) e a margem para o preço de venda.</p>
    <div class="tabela"><table><thead><tr><th>Item da nota</th><th>Unid. por emb.</th><th>Margem %</th><th>Fica</th></tr></thead><tbody>
    ${linhas.map((l) => `<tr><td><b>${esc(l.nome)}</b><div class="sub">${esc(l.codigoBarras || 'sem código')} · ${l.qtd} ${esc(l.unidade)} × ${brl(l.custoUnit)}</div></td>
      <td><input data-fator="${l.k}" inputmode="numeric" value="1" style="width:70px"></td><td><input data-margem="${l.k}" inputmode="decimal" value="30" style="width:70px"></td>
      <td><span class="selo ${l.existente ? 'verde' : 'ambar'}">${l.existente ? 'já cadastrado: ' + esc(l.existente.nome) : 'produto novo'}</span></td></tr>`).join('')}</tbody></table></div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;color:var(--texto)"><input type="checkbox" id="x-preco" style="width:20px;min-height:20px" checked> Atualizar o preço de venda pela margem</label>
    <label style="display:flex;gap:8px;align-items:center;margin-top:6px;color:var(--texto)"><input type="checkbox" id="x-conta" style="width:20px;min-height:20px"> Lançar a nota em Contas a pagar</label>
    <label style="margin-top:6px">Vencimento do boleto<input id="x-venc" type="date" value="${hojeISO()}"></label>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="x-ok">Dar entrada no estoque</button></div>`, { larga: true });
  $('#x-ok', j.el).onclick = async () => {
    $('#x-ok', j.el).disabled = true;
    let forn = (await todos('fornecedores')).find((f) => f.cnpj && f.cnpj === nota.fornecedor.cnpj);
    if (!forn && nota.fornecedor.nome) forn = await salvar('fornecedores', { id: uid(), nome: nota.fornecedor.fantasia || nota.fornecedor.nome, razao: nota.fornecedor.nome, cnpj: nota.fornecedor.cnpj, telefone: '' });
    for (const l of linhas) {
      const fator = Math.max(1, numeroBR($(`[data-fator="${l.k}"]`, j.el).value) || 1);
      const margem = numeroBR($(`[data-margem="${l.k}"]`, j.el).value);
      const qtd = Math.round(l.qtd * fator * 1000) / 1000;
      const custo = Math.round((l.custoUnit / fator) * 100) / 100;
      let p = l.existente;
      if (!p) {
        p = { id: uid(), nome: l.nome, codigo: l.codigoBarras, categoria: '', unidade: /^kg$/i.test(l.unidade) ? 'kg' : 'un', custo, preco: N.precoPorMargem(custo, margem), estoque: 0, estoqueMin: null, ncm: l.ncm, criadoEm: new Date().toISOString() };
      } else {
        p.custo = custo; if (!p.ncm) p.ncm = l.ncm;
        if ($('#x-preco', j.el).checked) p.preco = N.precoPorMargem(custo, margem);
      }
      await salvar('produtos', p);
      await moverEstoque(p.id, qtd, 'entrada', `NF ${nota.numero} ${forn ? forn.nome : ''}`.trim(), nota.chave ? 'nfe:' + nota.chave : null);
    }
    if ($('#x-conta', j.el).checked) await salvar('contas', { id: uid(), descricao: `NF ${nota.numero} — ${forn ? forn.nome : 'fornecedor'}`, fornecedorId: forn?.id || null, valor: nota.total, vencimento: $('#x-venc', j.el).value || hojeISO(), pagoEm: null });
    await carregarProdutos();
    toast(`Entrada da nota ${nota.numero} feita: ${linhas.length} itens.`); j.fechar(); telaProdutos();
  };
}
function baixar(nome, conteudo, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportarProdutos() {
  const cel = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
  const linhas = [['Código', 'Nome', 'Categoria', 'Unidade', 'Custo', 'Preço', 'Estoque', 'Estoque mínimo', 'Validade', 'PLU', 'NCM'].map(cel).join(';')];
  for (const p of S.produtos) linhas.push([p.codigo, p.nome, p.categoria, p.unidade, String(p.custo).replace('.', ','), String(p.preco).replace('.', ','), String(p.estoque ?? 0).replace('.', ','), p.estoqueMin ?? '', p.validade, p.plu, p.ncm].map(cel).join(';'));
  baixar(`produtos-${hojeISO()}.csv`, '﻿' + linhas.join('\r\n'), 'text/csv;charset=utf-8');
}

// =====================================================================
// 9) ESTOQUE (entradas, perdas, ajustes, validade)
// =====================================================================
async function telaEstoque() {
  await carregarProdutos();
  const movs = (await todos('estoque')).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 200);
  const baixo = S.produtos.filter((p) => !p.inativo && p.estoqueMin != null && Number(p.estoque) <= Number(p.estoqueMin));
  const val = S.produtos.filter((p) => !p.inativo && p.validade).map((p) => ({ p, s: N.situacaoValidade(p.validade), d: N.diasParaVencer(p.validade) })).filter((x) => x.s === 'vencido' || x.s === 'vencendo').sort((a, b) => a.d - b.d);
  const perdasMes = (await todos('estoque')).filter((m) => m.tipo === 'perda' && m.data.slice(0, 7) === hojeISO().slice(0, 7));
  const valorPerdas = perdasMes.reduce((s, m) => s + Math.round(centavos(m.custo || 0) * Math.abs(m.qtd)), 0);
  conteudo().innerHTML = `<div class="topo"><h1>🏷️ Estoque</h1><div class="linha-botoes"><button class="btn prim" id="e-ent">+ Entrada</button><button class="btn perigo" id="e-perda">Perda / quebra</button><button class="btn" id="e-ajuste">Acertar contagem</button></div></div>
    <div class="grade c4" style="margin-bottom:12px"><div class="cartao kpi"><b>${baixo.length}</b><span>com estoque baixo</span></div><div class="cartao kpi"><b>${val.filter((x) => x.s === 'vencido').length}</b><span>vencidos</span></div>
      <div class="cartao kpi"><b>${val.filter((x) => x.s === 'vencendo').length}</b><span>vencem em até 15 dias</span></div><div class="cartao kpi"><b>${din(valorPerdas)}</b><span>de perdas este mês</span></div></div>
    <div class="grade c2">
      <div class="cartao"><h3 style="margin-top:0">⏰ Validade</h3>${val.length ? `<table>${val.map((x) => `<tr><td>${esc(x.p.nome)}</td><td>${dataBR(x.p.validade)}</td><td><span class="selo ${x.s === 'vencido' ? 'vermelho' : 'ambar'}">${x.d < 0 ? 'vencido há ' + -x.d + ' dia(s)' : x.d === 0 ? 'vence hoje' : 'vence em ' + x.d + ' dia(s)'}</span></td></tr>`).join('')}</table>` : '<p class="sub">Nada vencendo nos próximos 15 dias.</p>'}</div>
      <div class="cartao"><h3 style="margin-top:0">📉 Estoque baixo</h3>${baixo.length ? `<table>${baixo.map((p) => `<tr><td>${esc(p.nome)}</td><td class="dir">${qtdTxt(p.estoque ?? 0, p.unidade)}</td><td class="sub dir">mín. ${qtdTxt(p.estoqueMin, p.unidade)}</td></tr>`).join('')}</table>` : '<p class="sub">Tudo acima do mínimo.</p>'}</div>
    </div>
    <div class="cartao tabela" style="margin-top:12px"><h3 style="margin-top:0">Movimentos</h3><table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th class="dir">Qtd</th><th>Obs.</th></tr></thead><tbody>
    ${movs.map((m) => `<tr><td>${horaBR(m.data)}</td><td>${esc(m.nome)}</td><td>${esc(m.tipo)}</td><td class="dir numero" style="color:${m.qtd < 0 ? 'var(--vermelho)' : 'var(--ok)'}">${m.qtd > 0 ? '+' : ''}${String(m.qtd).replace('.', ',')}</td><td class="sub">${esc(m.obs || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Sem movimentos.</td></tr>'}</tbody></table></div>`;
  $('#e-ent').onclick = () => movimentoManual('entrada');
  $('#e-perda').onclick = () => movimentoManual('perda');
  $('#e-ajuste').onclick = () => movimentoManual('ajuste');
}
function movimentoManual(tipo) {
  const titulo = { entrada: 'Entrada de mercadoria', perda: 'Perda / quebra', ajuste: 'Acertar contagem (inventário)' }[tipo];
  const j = janela(`<h2>${titulo}</h2>
    <label>Produto (código ou nome)<div class="leitor"><input id="m-busca" autocomplete="off">${botaoCamera('m-busca')}</div></label><div id="m-sug"></div>
    <div id="m-prod" class="aviso" hidden></div>
    <div class="campos" style="margin-top:10px"><label>${tipo === 'ajuste' ? 'Quantidade contada na prateleira' : 'Quantidade'}<input id="m-qtd" inputmode="decimal"></label>
    ${tipo === 'perda' ? '<label>Motivo<select id="m-motivo"><option>Vencido</option><option>Avariado / quebrado</option><option>Furto</option><option>Consumo próprio</option><option>Outro</option></select></label>' : ''}
    ${tipo === 'entrada' ? '<label>Nova validade (opcional)<input id="m-val" type="date"></label><label>Custo unitário (opcional)<input id="m-custo" inputmode="decimal"></label>' : ''}</div>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="m-ok">Salvar</button></div>`);
  let prod = null;
  const mostrar = () => { const b = $('#m-prod', j.el); b.hidden = !prod; if (prod) b.innerHTML = `<b>${esc(prod.nome)}</b> · estoque atual ${qtdTxt(prod.estoque ?? 0, prod.unidade)}`; };
  const procurar = (t) => {
    const r = buscarProduto(t);
    if (r.produto) { prod = r.produto; $('#m-sug', j.el).innerHTML = ''; mostrar(); $('#m-qtd', j.el).focus(); return; }
    $('#m-sug', j.el).innerHTML = (r.lista || []).slice(0, 8).map((p) => `<button class="btn peq" style="margin:4px 4px 0 0" data-s="${p.id}">${esc(p.nome)}</button>`).join('');
    $$('[data-s]', j.el).forEach((b) => (b.onclick = () => { prod = S.produtos.find((p) => p.id === b.dataset.s); $('#m-sug', j.el).innerHTML = ''; mostrar(); $('#m-qtd', j.el).focus(); }));
  };
  $('#m-busca', j.el).addEventListener('keydown', (e) => { if (e.key === 'Enter') procurar(e.target.value); });
  $('#m-busca', j.el).addEventListener('input', (e) => { if (e.target.value.trim().length >= 2 && !/^\d+$/.test(e.target.value.trim())) procurar(e.target.value); });
  ligarCameras(j.el, (c) => procurar(c));
  $('#m-ok', j.el).onclick = async () => {
    if (!prod) return toast('Escolha o produto.', true);
    const q = numeroBR($('#m-qtd', j.el).value);
    if (tipo !== 'ajuste' && q <= 0) return toast('Digite a quantidade.', true);
    if (tipo === 'entrada') {
      const val = $('#m-val', j.el).value, custo = numeroBR($('#m-custo', j.el).value);
      if (val || custo) { const p = await pegar('produtos', prod.id); if (val) p.validade = val; if (custo) p.custo = custo; await salvar('produtos', p); }
      await moverEstoque(prod.id, q, 'entrada', 'Entrada manual');
    } else if (tipo === 'perda') {
      await moverEstoque(prod.id, -q, 'perda', $('#m-motivo', j.el).value);
      const ult = (await todos('estoque')).filter((m) => m.produtoId === prod.id).sort((a, b) => b.data.localeCompare(a.data))[0];
      if (ult) { ult.custo = prod.custo || 0; await salvar('estoque', ult); }
    } else {
      const dif = Math.round((q - (Number(prod.estoque) || 0)) * 1000) / 1000;
      if (!dif) return toast('O estoque já está certo.');
      await moverEstoque(prod.id, dif, 'ajuste', `Contagem: ${String(q).replace('.', ',')}`);
    }
    toast('Estoque atualizado.'); j.fechar(); telaEstoque();
  };
}

// =====================================================================
// 10) CLIENTES E FIADO
// =====================================================================
async function telaClientes() {
  const clientes = (await todos('clientes')).sort((a, b) => a.nome.localeCompare(b.nome));
  const movs = await todos('fiado');
  const saldo = (id) => N.saldoFiado(movs.filter((m) => m.clienteId === id));
  const total = clientes.reduce((s, c) => s + Math.max(0, saldo(c.id)), 0);
  let busca = '';
  conteudo().innerHTML = `<div class="topo"><h1>👥 Clientes e fiado</h1><button class="btn prim" id="c-novo">+ Novo cliente</button></div>
    <div class="grade c4" style="margin-bottom:12px"><div class="cartao kpi"><b>${din(total)}</b><span>a receber no fiado</span></div><div class="cartao kpi"><b>${clientes.filter((c) => saldo(c.id) > 0).length}</b><span>clientes devendo</span></div></div>
    <input id="c-busca" placeholder="Buscar cliente" style="margin-bottom:10px">
    <div class="cartao tabela"><table><thead><tr><th>Cliente</th><th>Telefone</th><th class="dir">Limite</th><th class="dir">Deve</th></tr></thead><tbody id="c-lista"></tbody></table></div>`;
  const desenhar = () => {
    const q = busca.toLowerCase();
    $('#c-lista').innerHTML = clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || String(c.telefone || '').includes(q))
      .map((c) => { const s = saldo(c.id); return `<tr class="clicavel" data-c="${c.id}"><td>${esc(c.nome)}</td><td>${esc(c.telefone || '')}</td><td class="dir">${c.limite ? brl(c.limite) : '—'}</td><td class="dir numero" style="${s > 0 ? 'color:var(--vermelho);font-weight:800' : ''}">${din(s)}</td></tr>`; }).join('')
      || '<tr><td colspan="4" class="vazio">Nenhum cliente.</td></tr>';
    $$('[data-c]').forEach((tr) => (tr.onclick = () => contaCliente(clientes.find((c) => c.id === tr.dataset.c))));
  };
  $('#c-busca').oninput = (e) => { busca = e.target.value; desenhar(); };
  $('#c-novo').onclick = () => formCliente(null);
  desenhar();
}
function formCliente(c) {
  const novo = !c; c = c || { id: uid(), nome: '', telefone: '', cpf: '', endereco: '', limite: 0 };
  const j = janela(`<h2>${novo ? 'Novo cliente' : 'Editar cliente'}</h2><div class="campos">
    <label style="grid-column:1/-1">Nome<input id="cf-nome" value="${esc(c.nome)}"></label><label>WhatsApp / telefone<input id="cf-tel" inputmode="tel" value="${esc(c.telefone)}"></label>
    <label>CPF (opcional)<input id="cf-cpf" inputmode="numeric" value="${esc(c.cpf)}"></label><label>Limite do fiado (R$, 0 = sem limite)<input id="cf-lim" inputmode="decimal" value="${c.limite ? String(c.limite).replace('.', ',') : ''}"></label>
    <label style="grid-column:1/-1">Endereço<input id="cf-end" value="${esc(c.endereco || '')}"></label></div>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="cf-ok">Salvar</button></div>`);
  $('#cf-ok', j.el).onclick = async () => {
    const nome = $('#cf-nome', j.el).value.trim(); if (nome.length < 2) return toast('Digite o nome.', true);
    Object.assign(c, { nome, telefone: $('#cf-tel', j.el).value.trim(), cpf: $('#cf-cpf', j.el).value.trim(), limite: numeroBR($('#cf-lim', j.el).value), endereco: $('#cf-end', j.el).value.trim() });
    await salvar('clientes', c); toast('Cliente salvo.'); j.fechar(); telaClientes();
  };
}
async function contaCliente(c) {
  const movs = (await todos('fiado')).filter((m) => m.clienteId === c.id).sort((a, b) => b.data.localeCompare(a.data));
  const saldo = N.saldoFiado(movs);
  const fone = String(c.telefone || '').replace(/\D/g, '');
  const zap = fone ? `https://wa.me/${fone.length <= 11 ? '55' + fone : fone}?text=${encodeURIComponent(N.textoCobrancaFiado(S.loja.nome || 'mercado', c, saldo))}` : '';
  const j = janela(`<h2>${esc(c.nome)}</h2><p class="sub">${esc(c.telefone || '')}${c.limite ? ' · limite ' + brl(c.limite) : ''}</p>
    <div class="total-grande" style="margin:10px 0"><span>Deve no fiado</span><b>${din(saldo)}</b></div>
    <div class="linha-botoes"><button class="btn prim" id="cc-receber" ${saldo > 0 ? '' : 'disabled'}>Receber pagamento</button>${zap && saldo > 0 ? `<a class="btn" href="${zap}" target="_blank" rel="noopener">💬 Cobrar no WhatsApp</a>` : ''}<button class="btn" id="cc-editar">Editar</button></div>
    <h3>Extrato</h3><table>${movs.map((m) => `<tr><td>${dataBR(m.data)}</td><td>${m.tipo === 'compra' ? 'Compra' : 'Pagamento ' + (FORMAS[m.forma] || '')}</td><td class="sub">${esc(m.obs || '')}</td><td class="dir" style="color:${m.tipo === 'compra' ? 'var(--vermelho)' : 'var(--ok)'}">${m.tipo === 'compra' ? '' : '-'}${brl(m.valor)}</td></tr>`).join('') || '<tr><td class="vazio">Sem lançamentos.</td></tr>'}</table>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Fechar</button></div>`, { larga: true });
  $('#cc-editar', j.el).onclick = () => { j.fechar(); formCliente(c); };
  $('#cc-receber', j.el).onclick = () => {
    const r = janela(`<h2>Receber de ${esc(c.nome)}</h2><label>Valor<input id="r-valor" inputmode="decimal" value="${reais(saldo).toFixed(2).replace('.', ',')}"></label>
      <label style="margin-top:8px">Forma<select id="r-forma">${['dinheiro', 'pix', 'debito', 'credito'].map((f) => `<option value="${f}">${FORMAS[f]}</option>`).join('')}</select></label>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="r-ok">Receber</button></div>`);
    $('#r-ok', r.el).onclick = async () => {
      const valor = numeroBR($('#r-valor', r.el).value); if (valor <= 0) return toast('Digite o valor.', true);
      const forma = $('#r-forma', r.el).value;
      await salvar('fiado', { id: uid(), clienteId: c.id, tipo: 'pagamento', valor, forma, data: new Date().toISOString(), caixaId: S.caixa?.id || null, obs: 'Recebido por ' + S.operador.nome });
      toast('Pagamento recebido.'); r.fechar(); j.fechar(); telaClientes();
      if (S.impressao.automatico) imprimirRecibo(c, valor, forma, N.saldoFiado([...movs, { tipo: 'pagamento', valor }]));
    };
  };
}
function imprimirRecibo(c, valor, forma, saldoCent) {
  $('#cupom').innerHTML = `<div class="cupom l${S.impressao.largura === '58' ? 58 : 80}"><div class="c b">${esc(S.loja.nome)}</div><hr><div class="c b">RECIBO DE PAGAMENTO · FIADO</div><hr>
    <div>Cliente: ${esc(c.nome)}</div><div>Valor pago: <b>${brl(valor)}</b> (${FORMAS[forma]})</div><div>Saldo restante: ${din(saldoCent)}</div><div>${horaBR(new Date().toISOString())}</div></div>`;
  setTimeout(() => window.print(), 60);
}

// =====================================================================
// 11) FINANCEIRO (contas a pagar e fornecedores)
// =====================================================================
async function telaFinanceiro() {
  const contas = (await todos('contas')).sort((a, b) => (a.pagoEm ? 1 : 0) - (b.pagoEm ? 1 : 0) || a.vencimento.localeCompare(b.vencimento));
  const forns = (await todos('fornecedores')).sort((a, b) => a.nome.localeCompare(b.nome));
  const abertas = contas.filter((c) => !c.pagoEm);
  const venc = abertas.filter((c) => c.vencimento < hojeISO());
  conteudo().innerHTML = `<div class="topo"><h1>💰 Financeiro</h1><div class="linha-botoes"><button class="btn prim" id="fi-conta">+ Conta a pagar</button><button class="btn" id="fi-forn">+ Fornecedor</button></div></div>
    <div class="grade c4" style="margin-bottom:12px"><div class="cartao kpi"><b>${brl(abertas.reduce((s, c) => s + c.valor, 0))}</b><span>a pagar</span></div><div class="cartao kpi"><b style="color:var(--vermelho)">${brl(venc.reduce((s, c) => s + c.valor, 0))}</b><span>vencido (${venc.length})</span></div></div>
    <div class="cartao tabela"><h3 style="margin-top:0">Contas a pagar</h3><table><thead><tr><th>Vencimento</th><th>Descrição</th><th class="dir">Valor</th><th></th></tr></thead><tbody>
    ${contas.map((c) => `<tr><td>${dataBR(c.vencimento)}</td><td>${esc(c.descricao)}</td><td class="dir">${brl(c.valor)}</td><td class="dir">${c.pagoEm ? `<span class="selo verde">pago ${dataBR(c.pagoEm)}</span>` : `<span class="selo ${c.vencimento < hojeISO() ? 'vermelho' : 'ambar'}">${c.vencimento < hojeISO() ? 'vencida' : 'em aberto'}</span> <button class="btn peq prim" data-pagar="${c.id}">Paguei</button>`} <button class="btn peq" data-apagar="${c.id}" title="Apagar">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhuma conta.</td></tr>'}</tbody></table></div>
    <div class="cartao tabela" style="margin-top:12px"><h3 style="margin-top:0">Fornecedores</h3><table><tbody>${forns.map((f) => `<tr><td>${esc(f.nome)}</td><td>${esc(f.cnpj || '')}</td><td>${esc(f.telefone || '')}</td></tr>`).join('') || '<tr><td class="vazio">Os fornecedores entram sozinhos ao importar o XML da nota.</td></tr>'}</tbody></table></div>`;
  $$('[data-pagar]').forEach((b) => (b.onclick = async () => { const c = contas.find((x) => x.id === b.dataset.pagar); c.pagoEm = hojeISO(); await salvar('contas', c); telaFinanceiro(); }));
  $$('[data-apagar]').forEach((b) => (b.onclick = async () => { if (await confirmar('Apagar esta conta?', 'Apagar')) { await apagar('contas', b.dataset.apagar); telaFinanceiro(); } }));
  $('#fi-conta').onclick = () => {
    const j = janela(`<h2>Conta a pagar</h2><div class="campos"><label style="grid-column:1/-1">Descrição<input id="ct-desc" placeholder="Ex.: Luz, aluguel, boleto do fornecedor"></label>
      <label>Valor (R$)<input id="ct-valor" inputmode="decimal"></label><label>Vencimento<input id="ct-venc" type="date" value="${hojeISO()}"></label>
      <label>Fornecedor<select id="ct-forn"><option value="">—</option>${forns.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select></label></div>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="ct-ok">Salvar</button></div>`);
    $('#ct-ok', j.el).onclick = async () => {
      const descricao = $('#ct-desc', j.el).value.trim(), valor = numeroBR($('#ct-valor', j.el).value);
      if (!descricao || valor <= 0) return toast('Preencha a descrição e o valor.', true);
      await salvar('contas', { id: uid(), descricao, valor, vencimento: $('#ct-venc', j.el).value || hojeISO(), fornecedorId: $('#ct-forn', j.el).value || null, pagoEm: null });
      j.fechar(); telaFinanceiro();
    };
  };
  $('#fi-forn').onclick = () => {
    const j = janela(`<h2>Fornecedor</h2><div class="campos"><label style="grid-column:1/-1">Nome<input id="fo-nome"></label><label>CNPJ<input id="fo-cnpj" inputmode="numeric"></label><label>Telefone<input id="fo-tel" inputmode="tel"></label></div>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="fo-ok">Salvar</button></div>`);
    $('#fo-ok', j.el).onclick = async () => {
      const nome = $('#fo-nome', j.el).value.trim(); if (!nome) return toast('Digite o nome.', true);
      await salvar('fornecedores', { id: uid(), nome, cnpj: $('#fo-cnpj', j.el).value.replace(/\D/g, ''), telefone: $('#fo-tel', j.el).value.trim() });
      j.fechar(); telaFinanceiro();
    };
  };
}

// =====================================================================
// 12) ABRIR / FECHAR CAIXA (sangria, suprimento)
// =====================================================================
async function abrirCaixa(fundo) {
  S.caixa = await salvar('caixas', { id: uid(), abertoEm: new Date().toISOString(), abertoPor: S.operador.nome, fundo, suprimentos: [], sangrias: [], fechadoEm: null });
  toast('Caixa aberto.'); ir('caixa');
}
async function resumoDoCaixa(caixa) {
  const vendas = (await todos('vendas')).filter((v) => v.caixaId === caixa.id);
  const receb = (await todos('fiado')).filter((m) => m.tipo === 'pagamento' && m.caixaId === caixa.id);
  return N.fechamentoCaixa({ fundo: caixa.fundo, suprimentos: caixa.suprimentos, sangrias: caixa.sangrias, vendas, recebimentosFiado: receb });
}
async function telaGaveta() {
  const historico = (await todos('caixas')).filter((c) => c.fechadoEm).sort((a, b) => b.fechadoEm.localeCompare(a.fechadoEm)).slice(0, 30);
  if (!S.caixa) {
    conteudo().innerHTML = `<div class="topo"><h1>🗄️ Abrir caixa</h1></div><div class="cartao" style="max-width:420px"><label>Fundo de troco (R$)<input id="fundo" inputmode="decimal" placeholder="0,00"></label>
      <button class="btn prim grande" style="width:100%;margin-top:12px" id="abrir">Abrir caixa</button></div>${tabelaCaixas(historico)}`;
    $('#abrir').onclick = () => abrirCaixa(numeroBR($('#fundo').value));
    return;
  }
  const r = await resumoDoCaixa(S.caixa);
  const formas = Object.entries(r.porForma).filter(([k]) => !k.startsWith('receb_'));
  conteudo().innerHTML = `<div class="topo"><h1>🗄️ Caixa aberto</h1><div class="linha-botoes"><button class="btn" id="g-sup">+ Suprimento</button><button class="btn" id="g-san">− Sangria</button><button class="btn perigo" id="g-fechar">Fechar caixa</button></div></div>
    <p class="sub">Aberto ${horaBR(S.caixa.abertoEm)} por ${esc(S.caixa.abertoPor)}</p>
    <div class="grade c4" style="margin:12px 0"><div class="cartao kpi"><b>${din(r.totalVendido)}</b><span>vendido (${r.qtdVendas} vendas)</span></div><div class="cartao kpi"><b>${din(r.dinheiroEsperado)}</b><span>dinheiro que deve ter na gaveta</span></div>
      <div class="cartao kpi"><b>${din(r.sangrias)}</b><span>sangrias</span></div><div class="cartao kpi"><b>${din(r.suprimentos)}</b><span>suprimentos</span></div></div>
    <div class="cartao"><h3 style="margin-top:0">Por forma de pagamento</h3><table>${formas.map(([k, v]) => `<tr><td>${FORMAS[k] || k}</td><td class="dir">${din(k === 'dinheiro' ? v - r.trocos : v)}</td></tr>`).join('') || '<tr><td class="sub">Nenhuma venda ainda.</td></tr>'}
      ${Object.entries(r.porForma).filter(([k]) => k.startsWith('receb_')).map(([k, v]) => `<tr><td>Fiado recebido (${FORMAS[k.slice(6)]})</td><td class="dir">${din(v)}</td></tr>`).join('')}</table></div>${tabelaCaixas(historico)}`;
  const mov = (tipo) => {
    const j = janela(`<h2>${tipo === 'sangrias' ? 'Sangria (tirar dinheiro)' : 'Suprimento (pôr dinheiro)'}</h2><label>Valor<input id="mv-valor" inputmode="decimal"></label><label style="margin-top:8px">Motivo<input id="mv-obs" placeholder="${tipo === 'sangrias' ? 'Ex.: depósito, pagamento de fornecedor' : 'Ex.: troco'}"></label>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="mv-ok">Salvar</button></div>`);
    $('#mv-ok', j.el).onclick = async () => {
      const valor = numeroBR($('#mv-valor', j.el).value); if (valor <= 0) return toast('Digite o valor.', true);
      S.caixa[tipo].push({ valor, obs: $('#mv-obs', j.el).value.trim(), data: new Date().toISOString(), por: S.operador.nome });
      await salvar('caixas', S.caixa); j.fechar(); telaGaveta();
    };
  };
  $('#g-sup').onclick = () => mov('suprimentos');
  $('#g-san').onclick = () => mov('sangrias');
  $('#g-fechar').onclick = () => {
    const j = janela(`<h2>Fechar caixa</h2><p>Conte o dinheiro da gaveta e digite o total.</p><label>Dinheiro contado (R$)<input id="fc-contado" inputmode="decimal"></label>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn perigo" id="fc-ok">Fechar caixa</button></div>`);
    $('#fc-ok', j.el).onclick = async () => {
      const contado = centavos(numeroBR($('#fc-contado', j.el).value));
      Object.assign(S.caixa, { fechadoEm: new Date().toISOString(), fechadoPor: S.operador.nome, contado: reais(contado), esperado: reais(r.dinheiroEsperado), diferenca: reais(contado - r.dinheiroEsperado), totalVendido: reais(r.totalVendido), qtdVendas: r.qtdVendas });
      await salvar('caixas', S.caixa);
      const fechado = S.caixa; S.caixa = null; j.fechar();
      const d = centavos(fechado.diferenca);
      toast(d === 0 ? 'Caixa fechado. Bateu certinho!' : `Caixa fechado. ${d > 0 ? 'Sobrou' : 'Faltou'} ${din(Math.abs(d))}.`, d < 0);
      imprimirFechamento(fechado, r); telaGaveta();
    };
  };
}
const tabelaCaixas = (h) => h.length ? `<div class="cartao tabela" style="margin-top:12px"><h3 style="margin-top:0">Caixas fechados</h3><table><thead><tr><th>Fechado</th><th>Por</th><th class="dir">Vendido</th><th class="dir">Esperado</th><th class="dir">Contado</th><th class="dir">Diferença</th></tr></thead><tbody>
  ${h.map((c) => `<tr><td>${horaBR(c.fechadoEm)}</td><td>${esc(c.fechadoPor)}</td><td class="dir">${brl(c.totalVendido)}</td><td class="dir">${brl(c.esperado)}</td><td class="dir">${brl(c.contado)}</td><td class="dir" style="color:${c.diferenca < 0 ? 'var(--vermelho)' : 'var(--ok)'}">${brl(c.diferenca)}</td></tr>`).join('')}</tbody></table></div>` : '';
function imprimirFechamento(c, r) {
  $('#cupom').innerHTML = `<div class="cupom l${S.impressao.largura === '58' ? 58 : 80}"><div class="c b">${esc(S.loja.nome)}</div><hr><div class="c b">FECHAMENTO DE CAIXA</div><hr>
    <div>Aberto: ${horaBR(c.abertoEm)} (${esc(c.abertoPor)})</div><div>Fechado: ${horaBR(c.fechadoEm)} (${esc(c.fechadoPor)})</div><hr>
    <table>${Object.entries(r.porForma).map(([k, v]) => `<tr><td>${k.startsWith('receb_') ? 'Fiado receb. ' + FORMAS[k.slice(6)] : FORMAS[k] || k}</td><td class="d">${din(k === 'dinheiro' ? v - r.trocos : v)}</td></tr>`).join('')}</table><hr>
    <table><tr><td>Fundo de troco</td><td class="d">${brl(c.fundo)}</td></tr><tr><td>Suprimentos</td><td class="d">${din(r.suprimentos)}</td></tr><tr><td>Sangrias</td><td class="d">-${din(r.sangrias)}</td></tr>
    <tr class="b"><td>Dinheiro esperado</td><td class="d">${brl(c.esperado)}</td></tr><tr><td>Contado</td><td class="d">${brl(c.contado)}</td></tr><tr class="b"><td>Diferença</td><td class="d">${brl(c.diferenca)}</td></tr></table>
    <hr><div>Total vendido: ${brl(c.totalVendido)} (${c.qtdVendas} vendas)</div></div>`;
  setTimeout(() => window.print(), 60);
}

// =====================================================================
// 13) RELATÓRIOS
// =====================================================================
async function telaRelatorios() {
  const vendas = await todos('vendas');
  const produtos = Object.fromEntries((await todos('produtos')).map((p) => [p.id, p]));
  let de = hojeISO().slice(0, 8) + '01', ate = hojeISO();
  const desenhar = () => {
    const lista = vendas.filter((v) => { const d = dataLocal(v.data); return d >= de && d <= ate; });
    const r = N.resumoPeriodo(lista, produtos);
    const abc = N.curvaABC(r.ranking);
    const porDia = {};
    for (const v of lista) if (!v.cancelada) porDia[dataLocal(v.data)] = (porDia[dataLocal(v.data)] || 0) + centavos(v.total);
    const dias = Object.entries(porDia).sort();
    const maxDia = Math.max(1, ...dias.map(([, x]) => x));
    $('#rel').innerHTML = `<div class="grade c4" style="margin-bottom:12px">
        <div class="cartao kpi"><b>${din(r.faturamento)}</b><span>faturamento</span></div><div class="cartao kpi"><b>${din(r.lucro)}</b><span>lucro bruto (venda − custo)</span></div>
        <div class="cartao kpi"><b>${r.qtd}</b><span>vendas</span></div><div class="cartao kpi"><b>${din(r.ticketMedio)}</b><span>ticket médio</span></div></div>
      <div class="grade c2">
        <div class="cartao"><h3 style="margin-top:0">Vendas por dia</h3>${dias.map(([d, x]) => `<div style="display:grid;grid-template-columns:80px 1fr 90px;gap:8px;align-items:center;margin:4px 0"><span class="sub">${dataBR(d)}</span><div style="height:14px;border-radius:6px;background:var(--verde);width:${Math.max(2, (x / maxDia) * 100)}%"></div><span class="dir numero">${din(x)}</span></div>`).join('') || '<p class="sub">Sem vendas no período.</p>'}</div>
        <div class="cartao"><h3 style="margin-top:0">Por forma de pagamento</h3><table>${Object.entries(r.porForma).map(([k, v]) => `<tr><td>${FORMAS[k] || k}</td><td class="dir">${din(v)}</td></tr>`).join('') || '<tr><td class="sub">—</td></tr>'}</table></div>
      </div>
      <div class="cartao tabela" style="margin-top:12px"><h3 style="margin-top:0">Produtos que mais vendem (curva ABC)</h3><table><thead><tr><th>Produto</th><th class="dir">Quantidade</th><th class="dir">Total</th><th>Classe</th></tr></thead><tbody>
      ${abc.slice(0, 50).map((x) => `<tr><td>${esc(x.nome)}</td><td class="dir">${String(Math.round(x.qtd * 1000) / 1000).replace('.', ',')}</td><td class="dir">${din(x.total)}</td><td><span class="selo ${x.classe === 'A' ? 'verde' : x.classe === 'B' ? 'ambar' : ''}">${x.classe}</span></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Sem vendas.</td></tr>'}</tbody></table>
      <p class="sub">A = produtos que fazem 80% do faturamento: nunca deixe faltar.</p></div>`;
  };
  conteudo().innerHTML = `<div class="topo"><h1>📊 Relatórios</h1><div class="linha-botoes"><label>De<input type="date" id="r-de" value="${de}"></label><label>Até<input type="date" id="r-ate" value="${ate}"></label>
    <button class="btn" id="r-hoje" style="align-self:end">Hoje</button><button class="btn" id="r-mes" style="align-self:end">Este mês</button></div></div><div id="rel"></div>`;
  $('#r-de').onchange = (e) => { de = e.target.value; desenhar(); };
  $('#r-ate').onchange = (e) => { ate = e.target.value; desenhar(); };
  $('#r-hoje').onclick = () => { de = ate = hojeISO(); $('#r-de').value = de; $('#r-ate').value = ate; desenhar(); };
  $('#r-mes').onclick = () => { de = hojeISO().slice(0, 8) + '01'; ate = hojeISO(); $('#r-de').value = de; $('#r-ate').value = ate; desenhar(); };
  desenhar();
}

// =====================================================================
// 14) CONFIGURAÇÕES
// =====================================================================
async function telaConfig() {
  const ops = await todos('operadores');
  const L = S.loja, I = S.impressao, B = S.balanca, F = S.fiscal;
  conteudo().innerHTML = `<div class="topo"><h1>⚙️ Configurações</h1></div><div class="grade c2">
    <div class="cartao"><h3 style="margin-top:0">🏪 Mercado (sai no cupom)</h3><div class="campos">
      <label style="grid-column:1/-1">Nome<input id="cl-nome" value="${esc(L.nome)}"></label><label>CNPJ<input id="cl-cnpj" value="${esc(L.cnpj)}"></label><label>Telefone<input id="cl-tel" value="${esc(L.telefone)}"></label>
      <label style="grid-column:1/-1">Endereço<input id="cl-end" value="${esc(L.endereco)}"></label><label style="grid-column:1/-1">Mensagem no fim do cupom<input id="cl-msg" value="${esc(L.mensagem)}"></label></div>
      <button class="btn prim" id="cl-ok" style="margin-top:10px">Salvar</button></div>
    <div class="cartao"><h3 style="margin-top:0">🖨️ Impressora térmica</h3><div class="campos">
      <label>Largura do papel<select id="ci-larg"><option value="80">80 mm</option><option value="58" ${I.largura === '58' ? 'selected' : ''}>58 mm</option></select></label>
      <label>Ao concluir a venda<select id="ci-auto"><option value="1">Imprimir o cupom</option><option value="0" ${I.automatico ? '' : 'selected'}>Não imprimir</option></select></label>
      <label>Como imprimir<select id="ci-bt"><option value="0">Impressora do computador/celular (USB ou rede)</option><option value="1" ${I.bluetooth ? 'selected' : ''}>Impressora Bluetooth (Chrome)</option></select></label></div>
      <p class="sub">USB: instale a impressora no Windows e deixe como padrão; na janela de impressão escolha ela, sem margens. Bluetooth: no primeiro cupom o Chrome pede para escolher a impressora.</p>
      <div class="linha-botoes" style="margin-top:10px"><button class="btn prim" id="ci-ok">Salvar</button><button class="btn" id="ci-teste">Imprimir teste</button></div></div>
    <div class="cartao"><h3 style="margin-top:0">⚖️ Balança (etiqueta com código 2…)</h3><div class="campos">
      <label>Dígitos do código do produto<select id="cb-dig"><option value="4">4</option><option value="5" ${B.digitosCodigo == 5 ? 'selected' : ''}>5</option><option value="6" ${B.digitosCodigo == 6 ? 'selected' : ''}>6</option></select></label>
      <label>A etiqueta traz<select id="cb-val"><option value="preco">O preço total</option><option value="peso" ${B.valor === 'peso' ? 'selected' : ''}>O peso</option></select></label></div>
      <p class="sub">No produto, preencha "Código na balança (PLU)" com o mesmo código cadastrado na balança.</p><button class="btn prim" id="cb-ok" style="margin-top:10px">Salvar</button></div>
    <div class="cartao"><h3 style="margin-top:0">🧾 Nota fiscal (NFC-e)</h3>
      <p class="sub">A NFC-e é emitida por um serviço emissor autorizado (Focus NFe). A loja precisa de: <b>certificado digital A1</b>, <b>inscrição estadual</b>, <b>credenciamento na SEFAZ</b> para NFC-e e o <b>CSC</b> (código do QR Code). O certificado e o CSC ficam no painel do emissor; aqui vai só o token dele.</p>
      <div class="campos" style="margin-top:8px">
        <label>Usar NFC-e<select id="cn-ativo"><option value="0">Não (só cupom não fiscal)</option><option value="1" ${F.ativo ? 'selected' : ''}>Sim</option></select></label>
        <label>Ambiente<select id="cn-amb"><option value="homologacao">Homologação (teste, sem valor)</option><option value="producao" ${F.ambiente === 'producao' ? 'selected' : ''}>Produção (valendo)</option></select></label>
        <label style="grid-column:1/-1">Token do emissor<input id="cn-token" type="password" value="${esc(F.token)}" autocomplete="off"></label>
        <label>CNPJ do emitente<input id="cn-cnpj" value="${esc(F.cnpj || L.cnpj)}"></label>
        <label>Regime<select id="cn-reg"><option value="simples">Simples Nacional</option><option value="normal" ${F.regime === 'normal' ? 'selected' : ''}>Regime normal</option></select></label>
        <label>CSOSN (Simples)<input id="cn-csosn" value="${esc(F.csosn)}"></label><label>CST (normal)<input id="cn-cst" value="${esc(F.cst)}"></label><label>CFOP<input id="cn-cfop" value="${esc(F.cfop)}"></label>
        <label>No caixa<select id="cn-auto"><option value="1">Marcar "Emitir NFC-e" sempre</option><option value="0" ${F.automatico ? '' : 'selected'}>Deixar desmarcado</option></select></label></div>
      <p class="sub">Confira CSOSN/CST e CFOP com o seu contador. Cada produto precisa do NCM.</p>
      <div class="linha-botoes" style="margin-top:10px"><button class="btn prim" id="cn-ok">Salvar</button></div></div>
    <div class="cartao"><h3 style="margin-top:0">👤 Pessoas do caixa</h3><table>${ops.map((o) => `<tr><td>${esc(o.nome)}</td><td><span class="selo">${o.papel === 'dono' ? 'dono' : 'caixa'}</span>${o.inativo ? ' <span class="selo vermelho">inativo</span>' : ''}</td><td class="dir">${o.id !== S.operador.id ? `<button class="btn peq" data-op="${o.id}">${o.inativo ? 'Reativar' : 'Desativar'}</button>` : ''} <button class="btn peq" data-pin="${o.id}">Trocar PIN</button></td></tr>`).join('')}</table>
      <button class="btn" id="co-novo" style="margin-top:10px">+ Pessoa no caixa</button><p class="sub">"Caixa" só vende e vê vendas; "dono" vê tudo.</p></div>
    <div class="cartao"><h3 style="margin-top:0">💾 Cópia de segurança</h3><p class="sub">Os dados ficam neste aparelho. Faça uma cópia toda semana e guarde no Google Drive ou WhatsApp.</p>
      <div class="linha-botoes"><button class="btn prim" id="bk-exp">Baixar cópia</button><button class="btn" id="bk-imp">Restaurar cópia</button></div>
      <p class="sub" style="margin-top:12px">Conta LeuApps: <a href="https://www.leunamesoftware.com.br/">abrir a loja</a></p></div>
  </div>`;
  const val = (id) => $(id).value.trim();
  $('#cl-ok').onclick = async () => { S.loja = await salvar('config', { ...L, nome: val('#cl-nome'), cnpj: val('#cl-cnpj'), telefone: val('#cl-tel'), endereco: val('#cl-end'), mensagem: val('#cl-msg') }); toast('Salvo.'); };
  $('#ci-ok').onclick = async () => { S.impressao = await salvar('config', { ...I, largura: val('#ci-larg'), automatico: val('#ci-auto') === '1', bluetooth: val('#ci-bt') === '1' }); toast('Salvo.'); };
  $('#ci-teste').onclick = () => imprimirVenda({ numero: 0, data: new Date().toISOString(), operador: S.operador.nome, itens: [{ nome: 'Teste de impressão', preco: 1.5, qtd: 2 }], pagamentos: [{ forma: 'dinheiro', valor: 5 }], troco: 2 });
  $('#cb-ok').onclick = async () => { S.balanca = await salvar('config', { ...B, digitosCodigo: Number(val('#cb-dig')), valor: val('#cb-val') }); toast('Salvo.'); };
  $('#cn-ok').onclick = async () => {
    const cnpj = val('#cn-cnpj').replace(/\D/g, '');
    if (val('#cn-ativo') === '1' && (cnpj.length !== 14 || !val('#cn-token'))) return toast('Para ligar a NFC-e: CNPJ (14 números) e token do emissor.', true);
    S.fiscal = await salvar('config', { ...F, ativo: val('#cn-ativo') === '1', ambiente: val('#cn-amb'), token: val('#cn-token'), cnpj, regime: val('#cn-reg'), csosn: val('#cn-csosn'), cst: val('#cn-cst'), cfop: val('#cn-cfop'), automatico: val('#cn-auto') === '1' });
    toast('Salvo.');
  };
  $$('[data-op]').forEach((b) => (b.onclick = async () => { const o = ops.find((x) => x.id === b.dataset.op); o.inativo = !o.inativo; await salvar('operadores', o); telaConfig(); }));
  const pedirPin = (titulo, comNome, depois) => {
    const j = janela(`<h2>${titulo}</h2>${comNome ? '<label>Nome<input id="op-nome"></label><label style="margin-top:8px">Função<select id="op-papel"><option value="caixa">Caixa</option><option value="dono">Dono (vê tudo)</option></select></label>' : ''}
      <label style="margin-top:8px">PIN (4 a 6 números)<input id="op-pin" type="password" inputmode="numeric" maxlength="6"></label>
      <div class="linha-botoes" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-fechar>Voltar</button><button class="btn prim" id="op-ok">Salvar</button></div>`);
    $('#op-ok', j.el).onclick = async () => {
      const pin = $('#op-pin', j.el).value.trim(); if (!/^\d{4,6}$/.test(pin)) return toast('O PIN precisa ter de 4 a 6 números.', true);
      const nome = comNome ? $('#op-nome', j.el).value.trim() : ''; if (comNome && nome.length < 2) return toast('Digite o nome.', true);
      await depois(pin, nome, comNome ? $('#op-papel', j.el).value : ''); j.fechar(); telaConfig();
    };
  };
  $$('[data-pin]').forEach((b) => (b.onclick = () => pedirPin('Trocar PIN', false, async (pin) => { const o = ops.find((x) => x.id === b.dataset.pin); o.sal = uid(); o.pin = await hash(o.sal + pin); await salvar('operadores', o); toast('PIN trocado.'); })));
  $('#co-novo').onclick = () => pedirPin('Pessoa no caixa', true, async (pin, nome, papel) => { const sal = uid(); await salvar('operadores', { id: uid(), nome, papel, sal, pin: await hash(sal + pin), criadoEm: new Date().toISOString() }); toast('Pessoa cadastrada.'); });
  $('#bk-exp').onclick = async () => {
    const dados = { app: 'mercagestao', versao: 1, data: new Date().toISOString() };
    for (const l of LOJAS) dados[l] = await todos(l);
    baixar(`mercagestao-copia-${hojeISO()}.json`, JSON.stringify(dados), 'application/json');
  };
  $('#bk-imp').onclick = async () => {
    const arq = await escolherArquivo('.json,application/json'); if (!arq) return;
    let dados; try { dados = JSON.parse(await arq.text()); } catch { return toast('Arquivo inválido.', true); }
    if (dados.app !== 'mercagestao') return toast('Esta não é uma cópia do MercaGestão.', true);
    if (!(await confirmar(`Restaurar a cópia de ${dataBR(dados.data)}? Os dados atuais deste aparelho serão substituídos.`, 'Restaurar'))) return;
    for (const l of LOJAS) {
      await pedir(db.transaction(l, 'readwrite').objectStore(l).clear());
      for (const x of dados[l] || []) await salvar(l, x);
    }
    toast('Cópia restaurada.'); setTimeout(() => location.reload(), 800);
  };
}

// =====================================================================
// Início
// =====================================================================
async function iniciar() {
  const a = await conferirAcesso();
  if (!a.ok) return telaAcesso(a);
  await carregarConfig();
  await carregarProdutos();
  const ops = await todos('operadores');
  if (!ops.length) return telaPrimeiroUso();
  if (S.operador) return montarApp();
  telaPin();
}
// Ao voltar para o app (ex.: depois de horas), confere de novo a conta (trava de aparelhos).
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.operador) return;
  const a = await conferirAcesso();
  if (!a.ok) { S.operador = null; telaAcesso(a); }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
abrirBanco().then(iniciar).catch(() => { raiz.innerHTML = '<div class="entrada"><div class="cartao"><b>Não deu para abrir o banco de dados deste navegador.</b><p class="sub">Saia da janela anônima ou libere o armazenamento do site.</p></div></div>'; });
