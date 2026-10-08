import { calcularReceita, CHAMAS, UNIDADES, normalizar, chave } from './calculo.js';

// O app abre em quantocobrar.leunamesoftware.com.br/app/ e também dentro da loja
// (www.leunamesoftware.com.br/quantocobrar/app/, sem barra de endereço). RAIZ é o começo do caminho.
const RAIZ = location.pathname.replace(/\/app(\/.*)?$/, '');
// Compra e "esqueci a senha" ficam no mesmo endereço do app (dentro da loja quando aberto por ela).
const PAGINAS = RAIZ;
const LINK_COMPRA = PAGINAS + '/comprar';
// Fotos das receitas vêm com caminho do site; dentro da loja ganham o começo /quantocobrar.
const fotoDe = (r) => (String(r.foto || '').startsWith('/') ? RAIZ + r.foto : r.foto);
// App instalado pela Play/APK: regra do Google proíbe vender dentro do app; a compra é feita no site/canal.
const APP_LOJA = /QuantoCobrarApp/.test(navigator.userAgent);
const VERSAO_APP = '6.7';
const tela = document.getElementById('tela');
const abas = document.getElementById('abas');

// ---------- armazenamento local (funciona sem internet) ----------
function ler(chave, padrao) {
  try { const v = localStorage.getItem('calc.' + chave); return v === null ? padrao : JSON.parse(v); } catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem('calc.' + chave, JSON.stringify(valor)); } catch { /* armazenamento cheio/bloqueado */ }
}

const estado = {
  chave: ler('chave', ''),
  receitas: ler('receitas', []),
  ingredientes: ler('ingredientes', {}),
  config: { precoBotijao: 130, valorHora: 0, metaMensal: 0, ...ler('config', {}) },
  calc: ler('calc', null),
  minhas: ler('minhas', []),
  acesso: ler('acesso', {}),
  conta: ler('conta', null),
  aba: 'receitas',
};

const nomeProduto = (nome) => String(nome || '').replace(/\s*\(.*\)\s*$/, '');
for (const k of Object.keys(estado.ingredientes)) {
  const nova = chave(k);
  if (nova !== k) { if (!estado.ingredientes[nova]) estado.ingredientes[nova] = { ...estado.ingredientes[k], nome: nomeProduto(estado.ingredientes[k].nome) }; delete estado.ingredientes[k]; gravar('ingredientes', estado.ingredientes); }
}

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : 0; };
const qtd = (v, u) => `${(Math.round(v * 100) / 100).toLocaleString('pt-BR')} ${u}`;
// Sobra em kg/L fica mais clara em g/ml (0,995 kg → 995 g).
const qtdSobra = (v, u) => (u === 'kg' || u === 'L') && v < 10 ? qtd(Math.round(v * 1000), u === 'kg' ? 'g' : 'ml') : qtd(v, u);
const opcoesUnidade = (sel) => Object.keys(UNIDADES).map((u) => `<option ${u === sel ? 'selected' : ''}>${u}</option>`).join('');

function aviso(texto) {
  const el = document.getElementById('aviso');
  el.textContent = texto; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3200);
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(RAIZ + caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(estado.chave ? { Authorization: 'Bearer ' + estado.chave } : {}), ...(opcoes.headers || {}) },
  });
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== '/api/ativar') { sair('Sua chave não está mais ativa.'); throw new Error('chave'); }
  if (!r.ok) throw Object.assign(new Error(dados.erro || 'erro'), { status: r.status });
  return dados;
}

// Identificador deste aparelho (teste grátis é um só por aparelho).
function idAparelho() {
  let id = ler('aparelho', '');
  if (!/^[0-9a-f]{32}$/.test(id)) { id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); gravar('aparelho', id); }
  return id;
}

// ---------- entrar (conta: e-mail + senha) ----------
const logado = () => Boolean(estado.conta || estado.chave);
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR');

function telaAtivacao(erro = '') {
  abas.hidden = true;
  document.body.classList.add('abertura');
  tela.innerHTML = `
    <section class="capa">
      <img class="capa-logo" src="${RAIZ}/img/logo.webp" alt="">
      <h1 class="capa-nome">Quanto <span>Cobrar?</span></h1>
      <p class="capa-lema">Calcule certo e lucre mais.</p>
      <div class="capa-beneficios"><span>📦 Quanto rende</span><span>🧮 Quanto custa</span><span>💰 Quanto cobrar</span><span>📈 Quanto lucra</span></div>
      <form id="form-entrar" class="capa-cartao">
        <label for="email">Entre na sua conta</label>
        <input id="email" type="email" inputmode="email" autocomplete="email" placeholder="Seu e-mail" required>
        <input id="senha" type="password" autocomplete="current-password" placeholder="Sua senha" required style="margin-top:8px">
        <p class="erro" id="erro-ativar">${esc(erro)}</p>
        <button class="botao" type="submit">Entrar</button>
        <a class="capa-esqueci" href="https://www.leunamesoftware.com.br/loja/esqueci">Esqueci a senha</a>
      </form>
      <button class="capa-teste" id="gratis">🎁 Testar grátis por 2 dias</button>
      ${APP_LOJA ? '' : `<div class="capa-comprar">Ainda não tem conta?<br><a href="${LINK_COMPRA}">Ver planos · a partir de R$ 2,99</a></div>`}
      <button class="capa-recuperar capa-chave" id="tenho-chave" type="button">Tenho uma chave antiga</button>
      <p class="capa-rodape">LeuName Softwares · versão ${VERSAO_APP}</p>
    </section>`;
  document.getElementById('gratis').addEventListener('click', telaTesteGratis);
  document.getElementById('tenho-chave').addEventListener('click', telaChaveAntiga);
  document.getElementById('form-entrar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!document.getElementById('senha')) return; // formulário trocado (teste grátis ou chave antiga)
    const botao = ev.target.querySelector('button');
    const email = document.getElementById('email').value.trim(), senha = document.getElementById('senha').value;
    botao.disabled = true; botao.textContent = 'Entrando...';
    try {
      const r = await fetch(RAIZ + '/api/conta/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
      if (r.status === 429) throw new Error('Muitas tentativas. Espere um minuto e tente de novo.');
      if (!r.ok) throw new Error('E-mail ou senha incorretos.');
      await conferirConta();
      await carregarReceitas();
      abrir('receitas');
      aviso(estado.acesso?.plano && estado.acesso.plano !== 'gratis' ? 'Bem-vindo de volta! Seu plano está ativo.' : 'Conta conectada.');
    } catch (e) {
      document.getElementById('erro-ativar').textContent = navigator.onLine ? e.message : 'Sem internet. Conecte-se para entrar.';
      botao.disabled = false; botao.textContent = 'Entrar';
    }
  });
}

// Quem comprou antes das contas ainda pode entrar com a chave LEU-...
function telaChaveAntiga() {
  const form = document.getElementById('form-entrar');
  form.innerHTML = `
    <label for="chave">Digite sua chave antiga</label>
    <input id="chave" placeholder="LEU-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
    <p class="erro" id="erro-ativar"></p>
    <button class="botao" type="submit">Entrar com a chave</button>`;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); ev.stopImmediatePropagation();
    const botao = form.querySelector('button');
    const chave = document.getElementById('chave').value.trim().toUpperCase().replace(/\s+/g, '');
    botao.disabled = true;
    try {
      const r = await fetch(RAIZ + '/api/ativar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave }) });
      if (!r.ok) throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um minuto.' : 'Chave não encontrada.');
      estado.chave = chave; gravar('chave', chave);
      await carregarReceitas(); abrir('receitas');
    } catch (e) { document.getElementById('erro-ativar').textContent = e.message; botao.disabled = false; }
  };
}

// Trava de aparelhos: cada conta usa 1 celular + 1 computador. Entrou em outro, este é desconectado.
const MSG_OUTRO_APARELHO = 'Sua conta entrou em outro aparelho e este foi desconectado (cada conta usa 1 celular e 1 computador). Entre de novo para usar aqui: o outro será desconectado.';
let motivoConta = null;
async function conferirConta() {
  try {
    const d = await (await fetch(RAIZ + '/api/conta', { cache: 'no-store' })).json();
    motivoConta = d.motivo || null;
    estado.conta = d.conta ? { ...d.conta, acesso: d.acesso } : null;
    gravar('conta', estado.conta);
  } catch { /* sem internet: fica com o que estava guardado */ }
  return estado.conta;
}

async function sair(motivo) {
  if (estado.conta) await fetch(RAIZ + '/api/conta/sair', { method: 'POST' }).catch(() => {});
  estado.conta = null; gravar('conta', null);
  estado.chave = ''; gravar('chave', ''); estado.acesso = {}; gravar('acesso', {});
  telaAtivacao(motivo || '');
}

// Teste grátis: cria a conta (sem pagar nada) e libera 2 receitas + calculadora por 2 dias.
function telaTesteGratis() {
  const form = document.getElementById('form-entrar');
  form.innerHTML = `
    <label for="t-nome">Teste grátis por 2 dias</label>
    <p class="capa-explica">2 receitas completas + a calculadora. Depois dos 2 dias, escolha um plano para continuar.</p>
    <input id="t-nome" autocomplete="name" placeholder="Seu nome" required maxlength="80">
    <input id="t-email" type="email" inputmode="email" autocomplete="email" placeholder="Seu e-mail" required maxlength="120" style="margin-top:8px">
    <input id="t-senha" type="password" autocomplete="new-password" placeholder="Crie uma senha (mín. 6)" required minlength="6" maxlength="100" style="margin-top:8px">
    <p class="erro" id="erro-ativar"></p>
    <button class="botao" type="submit">Começar o teste grátis</button>`;
  document.getElementById('gratis').hidden = true;
  form.onsubmit = async (ev) => {
    ev.preventDefault(); ev.stopImmediatePropagation();
    const botao = form.querySelector('button'), erro = document.getElementById('erro-ativar');
    const nome = document.getElementById('t-nome').value.trim(), email = document.getElementById('t-email').value.trim(), senha = document.getElementById('t-senha').value;
    if (nome.length < 2) { erro.textContent = 'Digite seu nome.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { erro.textContent = 'Confira o seu e-mail.'; return; }
    if (senha.length < 6) { erro.textContent = 'Crie uma senha com pelo menos 6 caracteres.'; return; }
    botao.disabled = true; botao.textContent = 'Criando sua conta...';
    try {
      const r = await fetch(RAIZ + '/api/conta/criar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, email, senha, aparelho: idAparelho() }) });
      if (r.status === 409) throw new Error('Este e-mail já tem conta. Volte e entre com a sua senha.');
      if (r.status === 429) throw new Error('Muitas tentativas. Espere um minuto.');
      if (!r.ok) throw new Error('Não foi possível criar a conta. Tente de novo.');
      await conferirConta(); await carregarReceitas(); abrir('receitas');
    } catch (e) {
      erro.textContent = navigator.onLine ? e.message : 'Sem internet. Conecte-se para começar.';
      botao.disabled = false; botao.textContent = 'Começar o teste grátis';
    }
  };
}

// Teste acabou (ou o Pro venceu) sem nenhum pacote comprado: tudo fica bloqueado até comprar.
function telaBloqueio() {
  const a = estado.acesso || {};
  abas.hidden = true;
  document.body.classList.add('abertura');
  const titulo = a.semTeste ? 'Teste grátis já usado' : a.plano === 'gratis' ? 'Seu teste grátis terminou' : 'Seu plano 👑 Pro venceu';
  const texto = a.semTeste ? 'O teste grátis é um só por pessoa, e este aparelho ou esta rede já usou. Para usar o app, escolha um plano.'
    : a.plano === 'gratis' ? 'Gostou? Escolha um plano para continuar usando as receitas e a calculadora.' : `Venceu em ${dataBR(a.expiraEm)}. Renove para continuar usando as receitas e a calculadora.`;
  tela.innerHTML = `
    <section class="capa">
      <img class="capa-logo" src="${RAIZ}/img/logo.webp" alt="">
      <h1 class="capa-nome" style="font-size:30px">${titulo}</h1>
      <p class="capa-lema">${texto}</p>
      <div class="capa-cartao planos-bloqueio">
        ${APP_LOJA ? '<p>Para continuar, compre um plano no site <b>quantocobrar.leunamesoftware.com.br</b>.</p>' : `
        <a class="botao" href="${PAGINAS}/comprar?plano=basico">📦 30 receitas · R$ 9,99<small>pagamento único, vitalício</small></a>
        <a class="botao" href="${PAGINAS}/comprar?plano=mensal">👑 Pro · R$ 2,99/mês<small>todas as receitas, assinatura no cartão</small></a>
        <a class="botao" href="${PAGINAS}/comprar?plano=anual">👑 Pro anual · R$ 29,90<small>todas as receitas por 1 ano</small></a>`}
      </div>
      <button class="capa-recuperar capa-chave" id="sair-bloqueio" type="button">Sair da conta</button>
    </section>`;
  document.getElementById('sair-bloqueio').addEventListener('click', () => sair());
}

async function carregarReceitas() {
  try {
    const { receitas, plano, expiraEm, venceu, bloqueado, testeAte, pacotes, semTeste } = await api('/api/receitas');
    estado.receitas = receitas; gravar('receitas', receitas);
    estado.acesso = { plano, expiraEm, venceu, bloqueado, testeAte, pacotes, semTeste }; gravar('acesso', estado.acesso);
  } catch (e) {
    if (e.message !== 'chave' && !estado.receitas.length) aviso('Sem internet: as receitas aparecem quando você conectar.');
  }
}

// ---------- navegação ----------
function abrir(aba, extra) {
  if (!logado()) return telaAtivacao();
  if (estado.acesso?.bloqueado) return telaBloqueio();
  estado.aba = aba;
  tela.dataset.aba = aba;
  document.body.classList.remove('abertura');
  abas.hidden = false;
  abas.querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  window.scrollTo(0, 0);
  ({ receitas: telaReceitas, calcular: telaCalcular, ingredientes: telaIngredientes, historico: telaHistorico })[aba](extra);
}
abas.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  if (b.dataset.aba === 'receitas' && estado.aba === 'receitas') livro.aberto = false;
  abrir(b.dataset.aba);
});

// ---------- livro de receitas ----------
// Só o dono vê as receitas agendadas (escondidas para os clientes até a hora de liberar).
function textoAgendada(r) {
  const d = new Date(r.agendada);
  return Number.isNaN(d.getTime()) ? '📷 Escondida: aguardando foto'
    : `⏳ Escondida: libera ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
function textoRendimento(r) {
  if (r.bloqueada) return '🔒 na versão completa';
  const o = r.rendimentoObservado || { tipo: 'inicial', min: r.rendimento.faixa[0], max: r.rendimento.faixa[1] };
  return `${o.min} a ${o.max} unidades`;
}

// Cada receita é dividida em folhas que cabem na tela (sem rolar): foto, ingredientes, preparo e preço.
const PARTES = [['📷', 'Receita'], ['🥚', 'Ingredientes'], ['👩‍🍳', 'Preparo'], ['🧮', 'Preço']];
const livro = { aberto: false, pagina: ler('folha', 0), mini: ler('mini', {}) };
function folhas() {
  const f = [{ tipo: 'sumario' }];
  estado.receitas.forEach((r, i) => {
    if (r.bloqueada) f.push({ tipo: 'bloqueada', r, i });
    else PARTES.forEach((_, parte) => f.push({ tipo: 'receita', r, i, parte }));
  });
  f.push({ tipo: 'fim' });
  return f;
}
const totalPaginas = () => folhas().length;
const inicioDaReceita = (i) => folhas().findIndex((x) => x.i === i);

// Link direto de uma receita (www.leunamesoftware.com.br/r/<id>): abre o livro nela assim que as receitas chegarem.
let receitaDoLink = new URLSearchParams(location.search).get('receita');
function telaReceitas(extra) {
  if (!extra && receitaDoLink && estado.receitas.some((r) => r.id === receitaDoLink)) {
    extra = { receitaId: receitaDoLink }; receitaDoLink = null;
  }
  if (extra?.receitaId) {
    const i = estado.receitas.findIndex((r) => r.id === extra.receitaId);
    if (i >= 0) { livro.aberto = true; livro.pagina = inicioDaReceita(i); }
  }
  if (livro.aberto) return mostrarPagina();
  const n = estado.receitas.length;
  tela.innerHTML = `
    <section class="estante">
      <button class="livro-capa" id="capa" aria-label="Abrir o livro de receitas">
        <span class="capa-faixa">Calculadora inclusa</span>
        <span class="capa-titulo">Receitas<br><em>que Vendem</em></span>
        <img src="${RAIZ}/img/logo.webp" alt="">
        <span class="capa-texto">As receitas e a calculadora estão dentro deste livro</span>
        <span class="capa-qtd">${n ? `${n} ${n === 1 ? 'receita' : 'receitas'} · e sempre chegam mais` : 'Conecte-se para baixar as receitas'}</span>
        <span class="capa-autor">LeuName Softwares</span>
      </button>
      <p class="toque">👆 Clique no livro e veja as receitas</p>
    </section>`;
  document.getElementById('capa').addEventListener('click', (ev) => {
    ev.currentTarget.classList.add('abrindo');
    setTimeout(() => { livro.aberto = true; livro.pagina = 0; gravar('folha', 0); mostrarPagina('abrir'); }, 280); // abre sempre no sumário
  });
}

function irPara(pagina, direcao) {
  livro.pagina = Math.max(0, Math.min(totalPaginas() - 1, pagina));
  gravar('folha', livro.pagina);
  mostrarPagina(direcao);
}

function mostrarPagina(efeito) {
  const antiga = document.getElementById('pagina');
  const htmlAntigo = antiga && (efeito === 'frente' || efeito === 'tras') ? antiga.outerHTML : null;
  const lista = folhas();
  if (livro.pagina >= lista.length) livro.pagina = 0;
  const p = livro.pagina, ultima = lista.length - 1, f = lista[p];
  const r = f.r || null, total = estado.receitas.length;
  const conteudo = f.tipo === 'sumario' ? htmlSumario() : f.tipo === 'fim' ? htmlContracapa()
    : f.tipo === 'bloqueada' ? htmlPaginaBloqueada(r) : htmlParteReceita(r, f.parte);
  const inicio = r ? p - (f.parte || 0) : 0;
  tela.innerHTML = `
    <div class="livro-barra">
      <button class="link" id="fechar">📕 Fechar livro</button>
      ${p === 0 ? '<span>Sumário</span>' : '<button class="link" data-pagina="0">📑 Sumário</button>'}
    </div>
    <div class="busca-linha">
      <input type="search" id="busca-livro" placeholder="🔍 Pesquise a receita (ex.: bolo de laranja)" aria-label="Pesquisar receita" autocomplete="off">
      <ol class="busca-sugestoes" id="busca-sugestoes" hidden></ol>
    </div>
    ${f.tipo === 'receita' ? `<div class="partes" role="tablist">${PARTES.map(([ic, nome], k) => `
      <button role="tab" aria-selected="${k === f.parte}" class="${k === f.parte ? 'ativa' : ''}" data-pagina="${inicio + k}"><span>${ic}</span>${nome}</button>`).join('')}</div>` : ''}
    <div class="livro-folhas" id="folhas">
    <article class="pagina ${f.tipo === 'receita' && f.parte === 0 ? 'pagina-capa' : ''} ${efeito === 'abrir' ? 'virar-abrir' : ''}" id="pagina">
      <div class="pagina-corpo">${conteudo}</div>
    </article>
    </div>
    <div class="livro-nav">
      <button class="seta-livro ${p === ultima ? 'chamar' : ''}" data-ir="${p - 1}" ${p === 0 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
      <span>${r ? `Receita ${f.i + 1} de ${total}${f.tipo === 'receita' ? `<small>${PARTES[f.parte][1]} · ${f.parte + 1} de ${PARTES.length}</small>` : ''}` : p === 0 ? 'Sumário' : 'Fim do livro'}</span>
      <button class="seta-livro ${p === ultima ? '' : 'chamar'}" data-ir="${p + 1}" ${p === ultima ? 'disabled' : ''} aria-label="Próxima página">›</button>
    </div>`;
  ajustarFolha();
  tela.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => { gravar('virou', true); irPara(+b.dataset.ir, +b.dataset.ir > p ? 'frente' : 'tras'); }));
  if (htmlAntigo) virarFolha(htmlAntigo, efeito);
  document.getElementById('fechar').addEventListener('click', () => { livro.aberto = false; telaReceitas(); });
  tela.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => irPara(+b.dataset.pagina, +b.dataset.pagina < p ? 'tras' : 'frente')));
  tela.querySelectorAll('.nova-receita').forEach((b) => b.addEventListener('click', () => { novaConta(); abrir('calcular'); }));
  tela.querySelectorAll('[data-minha]').forEach((b) => b.addEventListener('click', () => {
    const m = estado.minhas.find((x) => x.id === b.dataset.minha);
    if (m) { estado.calc = JSON.parse(JSON.stringify({ ...m, receitaId: null, minhaId: m.id, quero: m.quero || m.rendimentoBase })); gravar('calc', estado.calc); abrir('calcular'); }
  }));
  tela.querySelectorAll('[data-minha-excluir]').forEach((b) => b.addEventListener('click', () => excluirMinha(b.dataset.minhaExcluir, () => mostrarPagina())));
  tela.querySelectorAll('[data-tenho-chave]').forEach((b) => b.addEventListener('click', () => telaAtivacao()));
  if (f.tipo === 'receita' && f.parte === 3) ligarMiniCalculadora(r);
  ligarBusca();
}

// Pesquisa por cima da página: o cliente acha outra receita sem sair de onde está.
const textoBusca = (r) => normalizar([r.nome, r.categoria, ...(r.ingredientes || []).map((x) => x.nome)].join(' '));
// Barra de pesquisa do livro: digitou, aparecem só as receitas que combinam; tocou, vai direto nela.
function ligarBusca() {
  const campo = document.getElementById('busca-livro'), lista = document.getElementById('busca-sugestoes');
  if (!campo) return;
  campo.addEventListener('input', () => {
    const termos = normalizar(campo.value).split(' ').filter(Boolean);
    if (!termos.length) { lista.hidden = true; lista.innerHTML = ''; return; }
    const achadas = estado.receitas.map((r, i) => ({ r, i })).filter(({ r }) => termos.every((t) => textoBusca(r).includes(t))).slice(0, 6);
    lista.innerHTML = achadas.length ? achadas.map(({ r, i }) => `
      <li><button data-ir-receita="${i}"><img src="${esc(fotoDe(r).replace('/receitas/', '/receitas/mini/'))}" alt="" width="40" height="40"><span>${r.bloqueada ? '🔒 ' : ''}${esc(r.nome)}</span></button></li>`).join('')
      : '<li class="nada">Nenhuma receita com esse nome.</li>';
    lista.hidden = false;
  });
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir-receita]');
    if (b) irPara(inicioDaReceita(+b.dataset.irReceita), 'frente');
  });
}

// Efeito de livro: a folha gira pela lombada (esquerda) revelando a outra página.
function virarFolha(htmlAntigo, efeito) {
  const nova = document.getElementById('pagina');
  const folha = document.createElement('div');
  folha.className = 'folha';
  folha.innerHTML = htmlAntigo;
  folha.firstElementChild.removeAttribute('id');
  folha.firstElementChild.classList.remove('virar-abrir');
  if (efeito === 'frente') {
    folha.style.height = nova.offsetHeight + 'px';
    folha.classList.add('folha-sai');
    document.getElementById('folhas').appendChild(folha);
    folha.addEventListener('animationend', () => folha.remove());
  } else {
    nova.classList.add('folha-volta');
    nova.addEventListener('animationend', () => nova.classList.remove('folha-volta'), { once: true });
  }
}

function htmlSumario() {
  return `
    <h1 class="pagina-titulo">Sumário</h1>
    ${faixaGratis()}
    <p class="sub">Toque numa receita ou pesquise na barra acima. Depois é só passar nas setas para ver ingredientes, preparo e preço.</p>
    <ol class="sumario">${estado.receitas.map((r, i) => `
      <li data-busca="${esc(normalizar([r.nome, r.categoria, ...(r.ingredientes || []).map((x) => x.nome)].join(' ')))}"><button data-pagina="${inicioDaReceita(i)}"><img src="${esc(fotoDe(r).replace('/receitas/', '/receitas/mini/'))}" alt="" loading="lazy" width="64" height="64">
        <span><small>Receita ${i + 1} · ${esc(r.categoria)}</small><b>${r.bloqueada ? '🔒 ' : ''}${esc(r.nome)}</b><small>${r.agendada ? textoAgendada(r) : `Rende ${textoRendimento(r)}`}</small></span>
        <i>›</i></button></li>`).join('') || '<p class="vazio">Conecte-se à internet para baixar as receitas.</p>'}
    </ol>
    <h2>Minhas receitas</h2>
    ${estado.minhas.length ? `<ul class="minhas">${estado.minhas.map((m) => `
      <li><button class="minha-abrir" data-minha="${esc(m.id)}"><b>${esc(m.nome || 'Sem nome')}</b><small>Rende ${m.rendimentoBase} un. · ${m.itens.length} ingredientes</small></button>
        <button class="remover" data-minha-excluir="${esc(m.id)}" aria-label="Excluir ${esc(m.nome)}">🗑️</button></li>`).join('')}</ul>`
      : '<p class="sub">Calcule e salve as suas próprias receitas. Elas ficam aqui.</p>'}
    <button class="botao sec nova-receita">＋ Nova receita minha</button>`;
}


// Botão das receitas trancadas. Básico: libera mais um pacote de 30. Teste: ver planos. (Nada de venda no app da Play.)
function botaoDesbloquear(classe) {
  if (!logado()) return `<button class="${classe}" data-tenho-chave>Entrar ou comprar</button>`;
  if (APP_LOJA) return '';
  if (estado.acesso?.plano === 'basico') return `<a class="${classe}" href="${PAGINAS}/comprar?plano=basico">🔓 Liberar +30 receitas · R$ 9,99</a>`;
  return `<a class="${classe}" href="${LINK_COMPRA}">Ver planos</a>`;
}

function faixaGratis() {
  const a = estado.acesso || {};
  const livres = estado.receitas.filter((r) => !r.bloqueada).length, total = estado.receitas.length;
  const vence = a.expiraEm && !a.venceu && new Date(a.expiraEm) - Date.now() < 7 * 864e5;
  if (a.plano === 'gratis' && a.testeAte) return `<div class="faixa-teste">🎁 Teste grátis até ${dataBR(a.testeAte)} · ${livres} de ${total} receitas ${botaoDesbloquear('link')}</div>`;
  if (livres === total && !vence) return '';
  const texto = vence ? `Seu plano 👑 Pro vence em ${dataBR(a.expiraEm)}`
    : a.plano === 'basico' ? `📦 Básico · ${livres} de ${total} receitas liberadas` : 'Versão grátis';
  return `<div class="faixa-teste">${texto} ${botaoDesbloquear('link')}</div>`;
}

function htmlPaginaBloqueada(r) {
  const basico = estado.acesso?.plano === 'basico';
  return `
    <div class="bloqueada">
      <img class="foto-grande" src="${esc(fotoDe(r))}" alt="">
      <span class="cadeado" aria-hidden="true">🔒</span>
    </div>
    <span class="etiqueta">${esc(r.categoria)}</span>
    <h1 class="pagina-titulo">${esc(r.nome)}</h1>
    <p class="sub">${basico ? 'Esta receita está no próximo pacote. Libere <b>mais 30 receitas</b> com um novo pagamento único, ou assine o 👑 Pro e tenha todas.' : 'Esta receita, com o rendimento e a calculadora, fica liberada nos planos.'}</p>
    ${botaoDesbloquear('botao')}
    ${basico && !APP_LOJA ? `<a class="link" style="display:block;text-align:center;margin-top:8px" href="${PAGINAS}/comprar?plano=mensal">👑 Ou todas as receitas no Pro · R$ 2,99/mês</a>` : ''}`;
}

function htmlContracapa() {
  return `
    <div class="contracapa">
      <h1 class="pagina-titulo fim">Fim do livro</h1>
      <button class="botao sec" data-pagina="${inicioDaReceita(0)}">↺ Voltar à primeira receita</button>
    </div>`;
}

// A folha ocupa exatamente o espaço entre o topo e as setas; só o miolo rola se não couber.
function ajustarFolha() {
  const pg = document.getElementById('pagina'), nav = tela.querySelector('.livro-nav');
  if (!pg || !nav) return;
  // No computador o menu fica na lateral (não come altura embaixo).
  const livre = innerHeight - pg.getBoundingClientRect().top - nav.offsetHeight - (matchMedia('(min-width: 1024px)').matches ? 0 : abas.offsetHeight) - 14;
  pg.style.height = Math.max(300, livre) + 'px';
}
addEventListener('resize', () => { if (estado.aba === 'receitas' && livro.aberto) ajustarFolha(); });

function htmlParteReceita(r, parte) {
  const cabeca = `<p class="folha-receita">${esc(r.nome)}</p>`;
  if (parte === 0) {
    const o = r.rendimentoObservado || { tipo: 'inicial' };
    const origem = o.tipo === 'comunidade'
      ? `Resultado real de ${o.registros} pessoas que fizeram${o.pesoMedioG ? ` (unidades de ~${o.pesoMedioG} g)` : ''}.`
      : `Estimativa inicial${r.rendimento.pesoUnidadeG ? `, unidades de ~${r.rendimento.pesoUnidadeG} g` : ''}.`;
    return `
      <img class="foto-grande" src="${esc(fotoDe(r))}" alt="">
      <div class="capa-info">
        <span class="etiqueta">${esc(r.categoria)}</span>
        <h1 class="pagina-titulo">${esc(r.nome)}</h1>
        <div class="rendimento"><span>Rende aproximadamente</span><b class="num">${textoRendimento(r)}</b>
          <p class="nota">${origem} Varia com o tamanho, o preparo e as perdas.</p></div>
      </div>`;
  }
  if (parte === 1) return `${cabeca}<h2>🥚 Ingredientes</h2>
    <ul class="ingred">${r.ingredientes.map((i) => `
      <li><span>${esc(i.nome)}<small>${esc(i.caseira || '')}</small></span><b>${qtd(i.qtd, i.unidade)}</b></li>`).join('')}
    </ul>
    ${r.embalagemSugerida ? `<p class="nota">📦 Embalagem: ${esc(r.embalagemSugerida)}</p>` : ''}`;
  if (parte === 2) return `${cabeca}<h2>👩‍🍳 Modo de preparo</h2>
    <ol class="passos">${r.preparo.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    ${r.dicas?.length ? `<h2>💡 Dicas</h2><ul class="dicas">${r.dicas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.dicaVenda ? `<p class="dica">💡 ${esc(r.dicaVenda)}</p>` : ''}`;
  const m = livro.mini[r.id] || {};
  return `${cabeca}
    <section class="mini-calc" aria-label="Calculadora desta receita">
      <div class="mini-topo">🧮 Quanto cobrar</div>
      <div class="mini-base">
        <b>📘 Nossa receita base rende cerca de ${baseDaReceita(r)} unidades</b>${r.rendimento.pesoUnidadeG ? ` (de ~${r.rendimento.pesoUnidadeG} g cada)` : ''}.
        Faça a receita com as quantidades da aba Ingredientes e depois coloque aqui quantas rendeu para você.
        Rendeu mais com o mesmo material? Cada unidade sai mais barata e o seu lucro aumenta.
      </div>
      <label for="m-rendeu">Quantas unidades rendeu para você?</label>
      <input id="m-rendeu" type="number" inputmode="numeric" min="1" value="${m.rendeu || baseDaReceita(r)}">
      <label for="m-emb-preco">Embalagens: quanto você pagou</label>
      <div class="mini-emb">
        <div class="prefixo"><span>R$</span><input id="m-emb-preco" type="number" inputmode="decimal" step="0.01" min="0" value="${m.embPreco ?? 10}" aria-label="Valor pago nas embalagens"></div>
        <span class="mini-por">por</span>
        <input id="m-emb-qtd" type="number" inputmode="numeric" min="1" value="${m.embQtd ?? 50}" aria-label="Quantidade de embalagens">
        <span class="mini-por">un.</span>
      </div>
      <p class="mini-explica" id="m-emb-cada"></p>
      <h3 class="mini-sub">🛒 Quanto você pagou</h3>
      <p class="mini-explica">Coloque o preço do pacote que você comprou. O app calcula quanto a receita gastou e quanto sobrou.</p>
      <div class="mini-itens">${r.ingredientes.map((i, k) => {
        const ing = estado.ingredientes[chave(i.nome)];
        const emb = ing?.emb || i.emb || {};
        const antes = r.ingredientes.slice(0, k).find((x) => chave(x.nome) === chave(i.nome));
        return `
        <div class="mini-item">
          <div class="mini-item-topo"><b>${esc(i.nome)}</b><span id="mi-usa-${k}"></span></div>
          ${antes ? `<p class="mini-mesmo">Mesmo pacote de ${esc(antes.nome)}, acima.</p>` : `<div class="mini-item-campos">
            <div class="prefixo"><span>R$</span><input data-mi="${k}" data-campo="preco" type="number" inputmode="decimal" step="0.01" min="0" value="${emb.preco ?? ''}" placeholder="Quanto pagou" aria-label="Preço pago em ${esc(i.nome)}"></div>
            <span class="mini-por">pacote de</span>
            <input data-mi="${k}" data-campo="qtd" type="number" inputmode="decimal" step="any" min="0" value="${emb.qtd ?? ''}" aria-label="Tamanho do pacote de ${esc(i.nome)}">
            <select data-mi="${k}" data-campo="unidade" aria-label="Unidade do pacote de ${esc(i.nome)}">${opcoesUnidade(emb.unidade || i.unidade)}</select>
          </div>`}
          <div class="mini-item-res" id="mi-res-${k}"></div>
        </div>`;
      }).join('')}</div>
      <div id="m-res"></div>
      <label for="m-lucro-pct">Ou escolha quanto quer lucrar sobre o custo</label>
      <div class="mini-emb"><input id="m-lucro-pct" type="number" inputmode="numeric" min="0" step="10" value="${m.lucroPct ?? ''}" placeholder="Ex.: 150"><span class="mini-por">%</span></div>
      <label for="m-preco">Vou vender cada uma por</label>
      <div class="prefixo"><span>R$</span><input id="m-preco" type="number" inputmode="decimal" step="0.5" min="0" value="${m.preco || ''}" placeholder="Toque num preço acima"></div>
      <div id="m-lucro"></div>
      <div id="m-sobras"></div>
      <button class="botao branco" id="m-fiz">✅ Fiz esta receita: descontar do meu estoque</button>
      <button class="link mini-mais" id="m-completa">Mais opções (horas de trabalho, outros custos) ›</button>
    </section>`;
}

// Rendimento de referência da receita (o real da comunidade, quando já existe).
const baseDaReceita = (r) => r.rendimentoObservado?.tipico || r.rendimento.unidades;
// Embalagem: a pessoa diz quanto pagou por quantas; o app acha o preço de cada uma.
function embalagemCada(m) {
  const qtdEmb = n(m.embQtd ?? 50);
  return qtdEmb > 0 ? n(m.embPreco ?? 10) / qtdEmb : 0;
}

// A receita é feita com as quantidades da base; muda só quantas unidades renderam.
function calcularMini(r, unidades) {
  const m = livro.mini[r.id] || {};
  const rendeu = unidades || Math.max(1, Math.round(n(m.rendeu) || baseDaReceita(r)));
  return calcularReceita({
    escala: 1, unidades: rendeu,
    itens: r.ingredientes.map((i) => {
      const ing = estado.ingredientes[chave(i.nome)];
      return { ...i, emb: ing?.emb || i.emb || {}, restante: Number.isFinite(ing?.restante) ? ing.restante : undefined };
    }),
    gas: { ...(r.gas || {}), precoBotijao: estado.config.precoBotijao },
    embalagemPorUnidade: embalagemCada(m), precoVenda: n(m.preco),
  });
}

function ligarMiniCalculadora(r) {
  const atualizar = () => {
    const m = livro.mini[r.id] || {};
    const res = calcularMini(r);
    const base = baseDaReceita(r);
    const naBase = res.unidades !== base ? calcularMini(r, base) : null;
    const ativo = n(m.preco);
    trocar('m-emb-cada', `Sai <b>${brl(embalagemCada(m))}</b> cada embalagem.`);
    res.itens.forEach((x, k) => {
      const ing = estado.ingredientes[chave(x.nome)];
      trocar(`mi-usa-${k}`, `usa <b>${qtd(x.uso, x.unidade)}</b>`);
      trocar(`mi-res-${k}`, x.erro === 'preco' ? 'Coloque quanto você pagou.'
        : x.erro === 'unidade' ? `<span class="falta">Use uma unidade parecida com ${esc(x.unidade)} (g com kg, ml com L).</span>`
        : `Gastou <b>${brl(x.custo)}</b>${x.falta ? ` · <span class="falta">faltam ${qtd(-x.sobra, x.unidadeEmb)}: compre mais</span>`
          : x.ultimo ? ` · sobra <b>${qtdSobra(x.sobra, x.unidadeEmb)}</b> (${brl(x.sobraValor)})` : ''}${Number.isFinite(ing?.restante) ? ' · já contando o que estava guardado' : ''}${!ing || ing.referencia ? ' · <i>preço de referência: troque pelo seu</i>' : ''}`);
    });
    trocar('m-res', `
      <div class="mini-resumo">
        <div><span>Você pagou nos pacotes</span><b>${brl(res.compras.totalPago)}</b></div>
        <div><span>Material gasto nesta receita</span><b>${brl(res.custoIngredientes)}</b></div>
        <div><span>Gás</span><b>${brl(res.custoGas)}</b></div>
        <div><span>Embalagens</span><b>${brl(res.custoEmbalagens)}</b></div>
        <div class="total"><span>Custo total · ${res.unidades} unidades</span><b>${brl(res.custoTotal)}</b></div>
      </div>
      <div class="mini-cada">
        <span>Cada unidade saiu para você por</span>
        <b>${brl(res.custoUnidade)}</b>
        ${naBase ? `<small>${res.unidades > base
          ? `Rendeu ${res.unidades - base} a mais que a base (${base}): na base cada uma sairia ${brl(naBase.custoUnidade)}. Mais lucro para você!`
          : `Rendeu ${base - res.unidades} a menos que a base (${base}): na base cada uma sairia ${brl(naBase.custoUnidade)}. Confira o tamanho das unidades.`}</small>` : ''}
      </div>
      <p class="mini-explica">Preço base sugerido por unidade (toque para escolher):</p>
      <div class="mini-precos">${res.sugestoes.map((s) => `
        <button class="${ativo === s.preco ? 'ativa' : ''}" data-mpreco="${s.preco}"><small>${s.rotulo} · +${Math.round((s.fator - 1) * 100)}%</small><b>${brl(s.preco)}</b></button>`).join('')}
      </div>`);
    const v = res.venda;
    trocar('m-lucro', v ? `
      <div class="mini-lucro ${v.lucroTotal < 0 ? 'neg' : ''}">
        <span>${v.lucroTotal < 0 ? 'Prejuízo' : 'Seu lucro final'} com ${res.unidades} unidades</span>
        <b>${brl(v.lucroTotal)}</b>
        <div class="mini-kpis">
          <div>Você recebe<strong>${brl(v.faturamento)}</strong></div>
          <div>Lucro por unidade<strong>${brl(v.lucroUnidade)}</strong></div>
          <div>Lucro sobre o custo<strong>${res.custoUnidade > 0 ? Math.round((v.lucroUnidade / res.custoUnidade) * 100) : 0}%</strong></div>
        </div>
      </div>` : '');
    const sobras = res.itens.filter((x) => x.ultimo && x.sobra > 0);
    trocar('m-sobras', sobras.length ? `
      <div class="mini-sobras">
        <b>🧺 Sobrou material: ${brl(res.compras.sobraValor)}</b>
        <ul>${sobras.map((x) => `<li>${esc(nomeProduto(x.nome))}: ${qtdSobra(x.sobra, x.unidadeEmb)} <span>(${brl(x.sobraValor)})</span></li>`).join('')}</ul>
        <p>Guarde esse material separado para a próxima receita. Toque em <b>"Fiz esta receita"</b> e o app desconta o que você usou: na próxima vez ele já calcula com o que sobrou. Quando acabar e você comprar de novo, é só colocar aqui o preço novo.</p>
      </div>` : '');
  };
  const salvar = (campo, valor) => { livro.mini[r.id] = { ...(livro.mini[r.id] || {}), [campo]: valor }; gravar('mini', livro.mini); atualizar(); };
  document.getElementById('m-rendeu').addEventListener('input', (e) => salvar('rendeu', n(e.target.value)));
  document.getElementById('m-emb-preco').addEventListener('input', (e) => salvar('embPreco', n(e.target.value)));
  document.getElementById('m-emb-qtd').addEventListener('input', (e) => salvar('embQtd', n(e.target.value)));
  document.getElementById('m-preco').addEventListener('input', (e) => salvar('preco', n(e.target.value)));
  document.getElementById('m-lucro-pct').addEventListener('input', (e) => {
    const pct = e.target.value === '' ? null : n(e.target.value);
    livro.mini[r.id] = { ...(livro.mini[r.id] || {}), lucroPct: pct };
    if (pct !== null) {
      const preco = Math.ceil(calcularMini(r).custoUnidade * (1 + pct / 100) * 10 - 1e-9) / 10; // sobe de 10 em 10 centavos
      document.getElementById('m-preco').value = preco; salvar('preco', preco);
    } else salvar('lucroPct', null);
  });
  document.getElementById('m-res').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mpreco]');
    if (b) { document.getElementById('m-preco').value = b.dataset.mpreco; salvar('preco', n(b.dataset.mpreco)); }
  });
  const levarParaConta = () => {
    const m = livro.mini[r.id] || {};
    contaDaReceita(r);
    const rendeu = Math.round(n(m.rendeu)) || estado.calc.quero;
    Object.assign(estado.calc, { rendimentoBase: rendeu, quero: rendeu, embalagemPorUnidade: embalagemCada(m), precoVenda: n(m.preco) });
    gravar('calc', estado.calc);
  };
  document.getElementById('m-completa').addEventListener('click', () => { levarParaConta(); abrir('calcular'); });
  document.getElementById('m-fiz').addEventListener('click', () => { levarParaConta(); abrirRegistro(); });
  // Preço pago e tamanho do pacote: vale para todas as receitas que usam o ingrediente.
  // Mudou o pacote = comprou de novo, então o estoque guardado volta a ser o pacote cheio.
  tela.querySelector('.mini-itens').addEventListener('input', (e) => {
    const el = e.target.closest('[data-mi]');
    if (!el) return;
    const i = r.ingredientes[+el.dataset.mi], k = chave(i.nome);
    const ing = estado.ingredientes[k] || (estado.ingredientes[k] = { nome: nomeProduto(i.nome), emb: { ...(i.emb || { unidade: i.unidade }) } });
    ing.emb[el.dataset.campo] = el.dataset.campo === 'unidade' ? el.value : n(el.value);
    delete ing.referencia; delete ing.restante;
    gravar('ingredientes', estado.ingredientes);
    atualizar();
  });
  atualizar();
}

// ---------- calculadora ----------
function contaDaReceita(r) {
  const base = r.rendimentoObservado?.tipico || r.rendimento.unidades;
  estado.calc = {
    receitaId: r.id, nome: r.nome, rendimentoBase: base, quero: base,
    itens: r.ingredientes.map((i) => {
      if (!estado.ingredientes[chave(i.nome)] && i.emb) {
        estado.ingredientes[chave(i.nome)] = { nome: i.nome, emb: { ...i.emb }, referencia: true };
      }
      return { nome: i.nome, qtd: i.qtd, unidade: i.unidade };
    }),
    gas: { minutos: r.gas?.minutos || 0, chama: r.gas?.chama || 'media' },
    embalagemPorUnidade: 0, outros: 0, horas: 0, precoVenda: 0,
  };
  gravar('ingredientes', estado.ingredientes);
  gravar('calc', estado.calc);
}

function novaConta() {
  estado.calc = {
    receitaId: null, nome: '', rendimentoBase: 10, quero: 10,
    itens: [{ nome: '', qtd: 0, unidade: 'g' }],
    gas: { minutos: 0, chama: 'media' }, embalagemPorUnidade: 0, outros: 0, horas: 0, precoVenda: 0,
  };
  gravar('calc', estado.calc);
}

function dadosDoCalculo() {
  const c = estado.calc;
  const escala = c.rendimentoBase > 0 && c.quero > 0 ? c.quero / c.rendimentoBase : 1;
  return {
    escala,
    unidades: c.quero,
    itens: c.itens.filter((i) => i.nome.trim()).map((i) => {
      const ing = estado.ingredientes[chave(i.nome)];
      return { ...i, emb: ing?.emb || {}, restante: Number.isFinite(ing?.restante) ? ing.restante : undefined };
    }),
    gas: { ...c.gas, precoBotijao: estado.config.precoBotijao },
    embalagemPorUnidade: c.embalagemPorUnidade, outros: c.outros,
    horas: c.horas, valorHora: estado.config.valorHora,
    precoVenda: c.precoVenda, metaMensal: estado.config.metaMensal,
  };
}

function telaCalcular() {
  if (!estado.calc) novaConta();
  const c = estado.calc;
  const r = c.receitaId && estado.receitas.find((x) => x.id === c.receitaId);
  const faixa = r ? `<p class="nota">Esta receita costuma render ${textoRendimento(r)}.</p>` : '';
  tela.innerHTML = `
    ${r ? `<button class="link" id="voltar">← ${esc(r.nome)}</button>` : ''}
    <h1>${r ? esc(r.nome) : 'Minha receita'}</h1>
    ${r ? '' : `<label for="nome">Nome da receita</label><input id="nome" data-k="nome" value="${esc(c.nome)}" placeholder="Ex.: Brigadeiro gourmet">`}

    <div class="cartao">
      <div class="linha">
        <div><label for="base">A receita base rende</label><input id="base" data-k="rendimentoBase" type="number" inputmode="numeric" min="1" value="${c.rendimentoBase}"></div>
        <div><label for="quero">Quero produzir</label><input id="quero" data-k="quero" type="number" inputmode="numeric" min="1" value="${c.quero}"></div>
      </div>
      ${faixa}
      <p class="nota" id="escala"></p>
    </div>

    <h2>Ingredientes e quanto você pagou</h2>
    <p class="sub">Coloque o preço do pacote inteiro que você comprou. O app calcula só o que a receita usa.</p>
    <div id="itens">${c.itens.map(htmlItem).join('')}</div>
    <button class="botao sec" id="add-item">＋ Adicionar ingrediente</button>

    <h2>Gás, embalagem e outros</h2>
    <div class="cartao">
      <div class="linha">
        <div><label for="gmin">Tempo no fogo (min)</label><input id="gmin" data-k="gas.minutos" type="number" inputmode="numeric" min="0" value="${c.gas.minutos}"></div>
        <div><label for="gchama">Chama</label><select id="gchama" data-k="gas.chama">${Object.entries(CHAMAS).map(([k, v]) => `<option value="${k}" ${k === c.gas.chama ? 'selected' : ''}>${v.rotulo}</option>`).join('')}</select></div>
      </div>
      <label for="botijao">Preço do botijão de gás (13 kg)</label>
      <div class="prefixo"><span>R$</span><input id="botijao" data-cfg="precoBotijao" type="number" inputmode="decimal" step="0.01" value="${estado.config.precoBotijao}"></div>
      <div class="linha">
        <div><label for="emb">Embalagem por unidade</label><div class="prefixo"><span>R$</span><input id="emb" data-k="embalagemPorUnidade" type="number" inputmode="decimal" step="0.01" min="0" value="${c.embalagemPorUnidade}"></div></div>
        <div><label for="outros">Outros custos (total)</label><div class="prefixo"><span>R$</span><input id="outros" data-k="outros" type="number" inputmode="decimal" step="0.01" min="0" value="${c.outros}"></div></div>
      </div>
      <div class="linha">
        <div><label for="horas">Horas de trabalho</label><input id="horas" data-k="horas" type="number" inputmode="decimal" step="0.5" min="0" value="${c.horas}"></div>
        <div><label for="vhora">Quanto vale sua hora</label><div class="prefixo"><span>R$</span><input id="vhora" data-cfg="valorHora" type="number" inputmode="decimal" step="0.5" min="0" value="${estado.config.valorHora}"></div></div>
      </div>
    </div>

    <div id="resultado"></div>

    <div class="cartao">
      <label for="preco">Seu preço de venda por unidade</label>
      <div class="prefixo"><span>R$</span><input id="preco" data-k="precoVenda" type="number" inputmode="decimal" step="0.5" min="0" value="${c.precoVenda || ''}" placeholder="Toque numa sugestão acima"></div>
      <label for="meta">Quanto quer lucrar por mês? (opcional)</label>
      <div class="prefixo"><span>R$</span><input id="meta" data-cfg="metaMensal" type="number" inputmode="decimal" step="50" min="0" value="${estado.config.metaMensal || ''}"></div>
      <div id="lucro"></div>
    </div>

    ${r ? '' : `<div class="linha" style="margin-bottom:12px">
      <button class="botao sec" id="salvar-minha">💾 ${c.minhaId ? 'Salvar alterações' : 'Salvar minha receita'}</button>
      ${c.minhaId ? '<button class="botao perigo" id="excluir-minha">🗑️ Excluir receita</button>' : '<button class="botao sec" id="limpar">🧹 Começar do zero</button>'}
    </div>`}
    <button class="botao" id="registrar">✅ Fiz esta receita — registrar produção</button>
    <p class="nota" style="text-align:center">Desconta os ingredientes do seu estoque e salva nas suas vendas.</p>`;

  document.getElementById('voltar')?.addEventListener('click', () => abrir('receitas', { receitaId: r.id }));
  document.getElementById('add-item').addEventListener('click', () => {
    c.itens.push({ nome: '', qtd: 0, unidade: 'g' }); gravar('calc', c); telaCalcular();
    const campos = tela.querySelectorAll('[data-item-nome]'); campos[campos.length - 1]?.focus();
  });
  document.getElementById('registrar').addEventListener('click', abrirRegistro);
  document.getElementById('salvar-minha')?.addEventListener('click', salvarMinha);
  document.getElementById('excluir-minha')?.addEventListener('click', () => excluirMinha(c.minhaId, () => { novaConta(); telaCalcular(); }));
  document.getElementById('limpar')?.addEventListener('click', () => { if (confirm('Apagar o que está preenchido e começar uma receita nova?')) { novaConta(); telaCalcular(); } });
  atualizarResultado();
}

function salvarMinha() {
  const c = estado.calc;
  if (!c.nome.trim()) { aviso('Dê um nome para a receita antes de salvar.'); document.getElementById('nome')?.focus(); return; }
  if (!c.itens.some((i) => i.nome.trim())) return aviso('Coloque pelo menos um ingrediente.');
  c.minhaId = c.minhaId || 'm' + Date.now().toString(36);
  const copia = JSON.parse(JSON.stringify({ ...c, itens: c.itens.filter((i) => i.nome.trim()), atualizado: new Date().toISOString() }));
  const i = estado.minhas.findIndex((m) => m.id === c.minhaId);
  copia.id = c.minhaId;
  if (i >= 0) estado.minhas[i] = copia; else estado.minhas.unshift(copia);
  gravar('minhas', estado.minhas); gravar('calc', c);
  aviso('Receita salva! Ela fica no livro, em "Minhas receitas".');
  telaCalcular();
}

function excluirMinha(id, depois) {
  const m = estado.minhas.find((x) => x.id === id);
  if (!m || !confirm(`Excluir a receita "${m.nome}"? Isso não pode ser desfeito.`)) return;
  estado.minhas = estado.minhas.filter((x) => x.id !== id);
  gravar('minhas', estado.minhas);
  if (estado.calc?.minhaId === id) delete estado.calc.minhaId;
  aviso('Receita excluída.');
  depois();
}

function htmlItem(it, i) {
  const ing = estado.ingredientes[chave(it.nome)] || { emb: { qtd: '', unidade: it.unidade, preco: '' } };
  return `
    <div class="item" data-i="${i}">
      <div class="item-topo">
        <input data-item-nome="${i}" value="${esc(it.nome)}" placeholder="Ingrediente (ex.: Açúcar)" aria-label="Ingrediente">
        <button class="remover" data-remover="${i}" aria-label="Remover ${esc(it.nome)}">✕</button>
      </div>
      <div class="linha">
        <div><label>A receita base usa</label><input data-item="${i}" data-campo="qtd" type="number" inputmode="decimal" step="any" min="0" value="${it.qtd || ''}"></div>
        <div><label>Unidade</label><select data-item="${i}" data-campo="unidade">${opcoesUnidade(it.unidade)}</select></div>
      </div>
      <label>Você comprou ${ing.referencia ? '<span class="ref">(preço de referência — troque pelo seu)</span>' : ''}</label>
      <div class="linha3">
        <input data-emb="${i}" data-campo="qtd" type="number" inputmode="decimal" step="any" min="0" value="${ing.emb.qtd ?? ''}" placeholder="Qtd." aria-label="Quantidade do pacote">
        <select data-emb="${i}" data-campo="unidade" aria-label="Unidade do pacote">${opcoesUnidade(ing.emb.unidade || it.unidade)}</select>
        <div class="prefixo"><span>R$</span><input data-emb="${i}" data-campo="preco" type="number" inputmode="decimal" step="0.01" min="0" value="${ing.emb.preco ?? ''}" aria-label="Preço pago"></div>
      </div>
      <div class="item-custo" data-custo="${i}"></div>
    </div>`;
}

function definir(obj, caminho, valor) {
  const partes = caminho.split('.');
  const ult = partes.pop();
  partes.reduce((o, p) => o[p], obj)[ult] = valor;
}

function aoDigitar(ev) {
  const el = ev.target, c = estado.calc;
  if (!c || estado.aba !== 'calcular') return;
  const numerico = el.type === 'number';
  const valor = numerico ? n(el.value) : el.value;
  if (el.dataset.k) definir(c, el.dataset.k, valor);
  else if (el.dataset.cfg) { estado.config[el.dataset.cfg] = valor; gravar('config', estado.config); }
  else if (el.dataset.itemNome !== undefined) {
    const it = c.itens[+el.dataset.itemNome]; const antigo = it.nome; it.nome = el.value;
    if (ev.type === 'change' && normalizar(antigo) !== normalizar(it.nome)) { gravar('calc', c); return telaCalcular(); }
  } else if (el.dataset.item !== undefined) c.itens[+el.dataset.item][el.dataset.campo] = valor;
  else if (el.dataset.emb !== undefined) {
    const it = c.itens[+el.dataset.emb];
    if (!it.nome.trim()) return;
    const k = chave(it.nome);
    const ing = estado.ingredientes[k] || (estado.ingredientes[k] = { nome: nomeProduto(it.nome), emb: { unidade: it.unidade } });
    ing.emb[el.dataset.campo] = valor; delete ing.referencia; delete ing.restante;
    gravar('ingredientes', estado.ingredientes);
  } else return;
  gravar('calc', c);
  atualizarResultado();
}

function aoClicarCalculo(ev) {
  if (!estado.calc || estado.aba !== 'calcular') return;
  const rem = ev.target.closest('[data-remover]');
  if (rem) { estado.calc.itens.splice(+rem.dataset.remover, 1); gravar('calc', estado.calc); return telaCalcular(); }
  const sug = ev.target.closest('[data-preco]');
  if (sug) { estado.calc.precoVenda = n(sug.dataset.preco); document.getElementById('preco').value = estado.calc.precoVenda; gravar('calc', estado.calc); atualizarResultado(); }
}

function atualizarResultado() {
  const c = estado.calc;
  const d = dadosDoCalculo();
  const res = calcularReceita(d);
  const esc_ = document.getElementById('escala');
  if (esc_) esc_.textContent = Math.abs(d.escala - 1) > 0.001 ? `Ingredientes multiplicados por ${(Math.round(d.escala * 100) / 100).toLocaleString('pt-BR')}x para ${c.quero} unidades.` : '';

  const porNome = new Map(res.itens.map((x, j) => [j, x]));
  c.itens.forEach((it, i) => {
    const alvo = tela.querySelector(`[data-custo="${i}"]`);
    if (!alvo) return;
    const x = porNome.get(c.itens.filter((y) => y.nome.trim()).indexOf(it));
    if (!x || !it.nome.trim()) { alvo.innerHTML = ''; return; }
    const usa = d.escala !== 1 ? `Para ${c.quero} un.: <b>${qtd(x.uso, x.unidade)}</b> · ` : '';
    if (x.erro === 'preco') alvo.innerHTML = `${usa}Informe quanto você pagou.`;
    else if (x.erro === 'unidade') alvo.innerHTML = `${usa}<span class="falta">Não dá para converter ${esc(x.unidade)} na unidade do pacote. Use a mesma unidade (ex.: g e kg).</span>`;
    else alvo.innerHTML = `${usa}Custo: <b>${brl(x.custo)}</b> · ${x.falta
      ? `<span class="falta">Falta ${qtd(-x.sobra, x.unidadeEmb)} — compre mais</span>`
      : x.ultimo ? `sobra ${qtd(x.sobra, x.unidadeEmb)} (${brl(x.sobraValor)})` : 'mesmo pacote da linha de cima'}`;
  });

  const ativo = n(c.precoVenda);
  trocar('resultado', res.unidades ? `
    <div class="resultado">
      <div class="cinza">Custo de cada unidade</div>
      <div class="grande">${brl(res.custoUnidade)}</div>
      <table>
        <tr><td>Ingredientes usados</td><td>${brl(res.custoIngredientes)}</td></tr>
        <tr><td>Gás</td><td>${brl(res.custoGas)}</td></tr>
        <tr><td>Embalagens</td><td>${brl(res.custoEmbalagens)}</td></tr>
        ${res.custoOutros ? `<tr><td>Outros</td><td>${brl(res.custoOutros)}</td></tr>` : ''}
        <tr><td><b>Custo total (${res.unidades} un.)</b></td><td><b>${brl(res.custoTotal)}</b></td></tr>
      </table>
      <p class="cinza">Você pagou ${brl(res.compras.totalPago)} nos pacotes. Esta produção usa ${brl(res.compras.usadoNaReceita)} e sobra ${brl(res.compras.sobraValor)} em ingredientes para as próximas.</p>
    </div>
    <h2>Por quanto vender (por unidade)</h2>
    <div class="sugestoes">${res.sugestoes.map((s) => `
      <button class="sugestao ${ativo === s.preco ? 'ativa' : ''}" data-preco="${s.preco}"><small>${s.rotulo}</small><b>${brl(s.preco)}</b><small>lucro ${brl(s.lucroTotal)}</small></button>`).join('')}
    </div>
    ${res.custoTempo ? `<p class="nota">Para pagar também o seu tempo (${brl(res.custoTempo)}), venda a partir de <b>${brl(res.precoMinimo)}</b> a unidade.</p>` : ''}` : '<p class="vazio">Informe quantas unidades quer produzir.</p>');

  const v = res.venda;
  trocar('lucro', v ? `
    <div class="lucro ${v.lucroTotal < 0 ? 'neg' : ''}" style="margin-top:12px">
      <div>${v.lucroTotal < 0 ? 'Prejuízo nesta produção' : 'Seu lucro nesta produção'}</div>
      <div class="grande">${brl(v.lucroTotal)}</div>
      <div class="kpis">
        <div>Lucro por unidade<b>${brl(v.lucroUnidade)}</b></div>
        <div>Você vai receber<b>${brl(v.faturamento)}</b></div>
        <div>Margem<b>${v.margem}%</b></div>
        ${res.custoTempo ? `<div>Depois de pagar seu tempo<b>${brl(v.lucroAposTempo)}</b></div>` : ''}
        ${v.unidadesParaMeta ? `<div>Para a meta do mês<b>${v.unidadesParaMeta} unidades</b></div>` : ''}
      </div>
    </div>` : '');
}

// Só redesenha quando o conteúdo muda: assim um toque num botão não se perde no meio da atualização.
const ultimoHtml = {};
function trocar(id, html) {
  const el = document.getElementById(id);
  if (!el || (ultimoHtml[id] === html && el.innerHTML)) return;
  ultimoHtml[id] = html; el.innerHTML = html;
}

// ---------- registrar produção + aprendizado de rendimento ----------
function abrirRegistro() {
  const c = estado.calc;
  const d = dadosDoCalculo();
  const res = calcularReceita(d);
  if (!res.itens.some((x) => !x.erro)) return aviso('Informe os ingredientes e quanto você pagou.');
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <form class="modal" id="form-registro">
      <h2 style="margin-top:0">Quantas unidades essa receita produziu para você?</h2>
      <p class="sub">Seu resultado real ajuda a calcular o rendimento certo. Enviamos só o número, sem nenhum dado seu.</p>
      <div class="linha">
        <div><label for="r-un">Unidades/porções</label><input id="r-un" type="number" inputmode="numeric" min="1" step="1" value="${c.quero}" required></div>
        <div><label for="r-peso">Peso de cada uma (g)</label><input id="r-peso" type="number" inputmode="numeric" min="1" placeholder="opcional"></div>
      </div>
      <label style="display:flex;gap:8px;align-items:center;color:var(--texto)"><input type="checkbox" id="r-estoque" checked style="width:22px;min-height:22px"> Descontar os ingredientes do meu estoque</label>
      <button class="botao" type="submit">Salvar</button>
      <button class="link" type="button" id="r-cancelar" style="width:100%">Cancelar</button>
    </form>`;
  document.body.appendChild(fundo);
  fundo.querySelector('#r-cancelar').addEventListener('click', () => fundo.remove());
  fundo.querySelector('#form-registro').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const unidades = Math.round(n(fundo.querySelector('#r-un').value));
    const peso = n(fundo.querySelector('#r-peso').value) || null;
    if (unidades < 1) return;
    const baixas = [];
    if (fundo.querySelector('#r-estoque').checked) {
      for (const x of res.itens) {
        const ing = estado.ingredientes[chave(x.nome)];
        if (ing && !x.erro) {
          const antes = Number.isFinite(ing.restante) ? ing.restante : n(ing.emb.qtd);
          ing.restante = Math.max(0, x.sobra);
          baixas.push({ k: chave(x.nome), qtd: antes - ing.restante });
        }
      }
      gravar('ingredientes', estado.ingredientes);
    }
    const custoUn = res.custoTotal / unidades;
    const historico = ler('historico', []);
    historico.unshift({
      id: Date.now().toString(36), baixas,
      data: new Date().toISOString(), nome: c.nome || 'Receita', unidades, custoTotal: res.custoTotal,
      precoVenda: n(c.precoVenda), lucroPrevisto: n(c.precoVenda) ? Math.round((n(c.precoVenda) - custoUn) * unidades * 100) / 100 : null,
    });
    gravar('historico', historico.slice(0, 300));
    fundo.remove();
    if (c.receitaId && logado() && navigator.onLine) {
      api('/api/rendimento', { method: 'POST', body: JSON.stringify({ receitaId: c.receitaId, unidades, escala: d.escala, pesoUnidadeG: peso }) })
        .then(({ rendimento }) => {
          const r = estado.receitas.find((x) => x.id === c.receitaId);
          if (r) { r.rendimentoObservado = rendimento; gravar('receitas', estado.receitas); }
        }).catch(() => {});
    }
    aviso(c.receitaId ? 'Produção registrada! Obrigado por ajudar a melhorar o rendimento.' : 'Produção registrada!');
    abrir('historico');
  });
}

// ---------- ingredientes (estoque) ----------
function telaIngredientes() {
  const lista = Object.entries(estado.ingredientes).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  tela.innerHTML = `
    <h1>Meus ingredientes</h1>
    <p class="sub">Preço que você pagou e quanto ainda tem. Atualize quando comprar de novo.</p>
    ${lista.length ? lista.map(([k, i]) => {
      const tem = Number.isFinite(i.restante) ? i.restante : n(i.emb.qtd);
      return `<div class="cartao">
        <div class="item-topo"><strong>${esc(i.nome)}</strong><button class="remover" data-apagar="${esc(k)}" aria-label="Apagar ${esc(i.nome)}">✕</button></div>
        <div class="sub" style="margin:4px 0 8px">${i.emb.qtd ? `${qtd(n(i.emb.qtd), i.emb.unidade)} por ${brl(i.emb.preco)}` : 'Sem preço'}${i.referencia ? ' · <span class="ref">preço de referência</span>' : ''}</div>
        <div>Em estoque: <b>${qtd(tem, i.emb.unidade || '')}</b></div>
        <button class="botao sec peq" data-reabastecer="${esc(k)}" style="margin-top:8px">Comprei de novo</button>
      </div>`;
    }).join('') : '<p class="vazio">Os ingredientes aparecem aqui quando você calcula uma receita.</p>'}`;
  tela.querySelectorAll('[data-reabastecer]').forEach((b) => b.addEventListener('click', () => {
    const ing = estado.ingredientes[b.dataset.reabastecer];
    const preco = prompt(`Quanto você pagou em ${qtd(n(ing.emb.qtd), ing.emb.unidade)} de ${ing.nome}?`, ing.emb.preco ?? '');
    if (preco === null) return;
    ing.emb.preco = n(preco); delete ing.restante; delete ing.referencia;
    gravar('ingredientes', estado.ingredientes); telaIngredientes(); aviso('Estoque e preço atualizados.');
  }));
  tela.querySelectorAll('[data-apagar]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Apagar este ingrediente?')) return;
    delete estado.ingredientes[b.dataset.apagar]; gravar('ingredientes', estado.ingredientes); telaIngredientes();
  }));
}

// ---------- histórico de produção ----------
function telaHistorico() {
  const h = ler('historico', []);
  const mes = new Date().toISOString().slice(0, 7);
  const doMes = h.filter((x) => x.data.startsWith(mes));
  const lucroMes = doMes.reduce((s, x) => s + (x.lucroPrevisto || 0), 0);
  tela.innerHTML = `
    <h1>Minhas produções</h1>
    <div class="lucro"><div>Lucro previsto este mês</div><div class="grande">${brl(lucroMes)}</div>
      <div class="kpis"><div>Produções<b>${doMes.length}</b></div><div>Unidades<b>${doMes.reduce((s, x) => s + x.unidades, 0)}</b></div></div></div>
    <h2>Últimas</h2>
    ${h.length ? h.slice(0, 50).map((x, i) => `<div class="cartao"><div class="item-topo"><strong>${esc(x.nome)}</strong>
      <button class="remover" data-excluir-prod="${i}" aria-label="Excluir esta produção">🗑️</button></div>
      <div class="sub" style="margin:2px 0 0">${new Date(x.data).toLocaleDateString('pt-BR')} · ${x.unidades} un. · custo ${brl(x.custoTotal)}${x.lucroPrevisto !== null ? ` · lucro ${brl(x.lucroPrevisto)}` : ''}</div></div>`).join('')
      : '<p class="vazio">Quando fizer uma receita, toque em "Registrar produção".</p>'}
    ${htmlConta()}
    <p class="nota" style="text-align:center">Versão ${VERSAO_APP}</p>`;
  document.getElementById('sair').addEventListener('click', () => {
    if (!logado()) return telaAtivacao();
    if (confirm('Sair da conta neste aparelho?')) sair();
  });
  tela.querySelectorAll('[data-excluir-prod]').forEach((b) => b.addEventListener('click', () => {
    const lista = ler('historico', []);
    const x = lista[+b.dataset.excluirProd];
    if (!x || !confirm(`Excluir a produção de ${x.nome} (${x.unidades} un.)?${x.baixas?.length ? ' Os ingredientes voltam para o seu estoque.' : ''}`)) return;
    for (const { k, qtd: q } of x.baixas || []) {
      const ing = estado.ingredientes[k];
      if (ing && Number.isFinite(ing.restante)) ing.restante += q;
    }
    gravar('ingredientes', estado.ingredientes);
    lista.splice(+b.dataset.excluirProd, 1); gravar('historico', lista);
    aviso('Produção excluída.'); telaHistorico();
  }));
}

const NOMES_PLANO = { dono: '👑 Dono · tudo liberado', brinde: '🎁 Pro de presente', basico: '📦 Básico (vitalício)', anual: '👑 Pro anual', mensal: '👑 Pro mensal', teste: 'Teste', completo: 'Completo', gratis: 'Grátis' };
function htmlConta() {
  const a = estado.acesso || {};
  const plano = NOMES_PLANO[a.plano] || 'Grátis';
  const validade = a.plano === 'gratis' && a.testeAte ? `teste até <b>${dataBR(a.testeAte)}</b>`
    : a.plano === 'basico' ? `<b>${(a.pacotes || 1) * 30} receitas</b> · para sempre`
    : a.expiraEm ? (a.venceu ? `<b style="color:var(--vermelho)">Venceu em ${dataBR(a.expiraEm)}</b>` : `válido até <b>${dataBR(a.expiraEm)}</b>`) : (a.plano && a.plano !== 'gratis' ? 'para sempre' : '');
  return `<div class="cartao" style="margin-top:16px">
      <h2 style="margin:0 0 6px">Minha conta</h2>
      ${estado.conta ? `<p class="sub" style="margin:0">${esc(estado.conta.email)}</p>` : ''}
      <p style="margin:6px 0 0">Plano: <b>${esc(plano)}</b>${validade ? ' · ' + validade : ''}</p>
      ${!APP_LOJA && (a.venceu || !a.plano || a.plano === 'gratis') ? `<a class="botao" style="margin-top:10px" href="${LINK_COMPRA}">${a.venceu ? 'Renovar meu plano' : 'Ver planos'}</a>` : ''}
      ${!APP_LOJA && a.plano === 'basico' ? `<a class="botao sec" style="margin-top:10px" href="${PAGINAS}/comprar?plano=basico">🔓 Liberar +30 receitas · R$ 9,99</a>` : ''}
      <button class="link" id="sair" style="width:100%;margin-top:10px">${logado() ? 'Sair da conta' : 'Entrar ou comprar'}</button>
    </div>`;
}

// ---------- início ----------
tela.addEventListener('input', aoDigitar);
tela.addEventListener('change', aoDigitar);
tela.addEventListener('click', aoClicarCalculo);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(RAIZ + '/sw.js', { scope: RAIZ + '/' }).then((r) => r.update()).catch(() => {});
}
(async () => {
  const conta = navigator.onLine ? await conferirConta() : estado.conta;
  if (!conta && !estado.chave) return telaAtivacao(motivoConta === 'outro_aparelho' ? MSG_OUTRO_APARELHO : '');
  abrir('receitas');
  carregarReceitas().then(() => { if (estado.acesso?.bloqueado) telaBloqueio(); else if (estado.aba === 'receitas') telaReceitas(); });
})();

// Receitas novas (e mudança de plano) chegam sozinhas: ao voltar para o app e a cada 15 minutos com ele aberto.
let ultimaAtualizacao = Date.now();
async function atualizarSozinho() {
  if (!navigator.onLine || !logado()) return;
  ultimaAtualizacao = Date.now();
  const marca = () => estado.receitas.map((r) => r.id + (r.bloqueada ? '#' : '')).join();
  const antes = marca(), qtdAntes = estado.receitas.filter((r) => !r.bloqueada).length;
  await conferirConta();
  if (!estado.conta && !estado.chave) return telaAtivacao(motivoConta === 'outro_aparelho' ? MSG_OUTRO_APARELHO : '');
  await carregarReceitas();
  if (marca() === antes) return;
  if (estado.acesso?.bloqueado) return telaBloqueio();
  if (estado.aba === 'receitas') telaReceitas();
  const novas = estado.receitas.filter((r) => !r.bloqueada).length - qtdAntes;
  if (novas > 0) aviso(`📚 ${novas === 1 ? 'Chegou 1 receita nova' : `Chegaram ${novas} receitas novas`}!`);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - ultimaAtualizacao > 60000) atualizarSozinho(); });
setInterval(atualizarSozinho, 15 * 60 * 1000);
