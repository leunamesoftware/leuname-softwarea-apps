import { calcularReceita, CHAMAS, UNIDADES, normalizar } from './calculo.js';

const LINK_COMPRA = 'https://leunamesoftware.com.br/producto.html?id=calculadora-receitas';
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
  aba: 'receitas',
};

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : 0; };
const qtd = (v, u) => `${(Math.round(v * 100) / 100).toLocaleString('pt-BR')} ${u}`;
const opcoesUnidade = (sel) => Object.keys(UNIDADES).map((u) => `<option ${u === sel ? 'selected' : ''}>${u}</option>`).join('');

function aviso(texto) {
  const el = document.getElementById('aviso');
  el.textContent = texto; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3200);
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + estado.chave, ...(opcoes.headers || {}) },
  });
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== '/api/ativar') { sair(); throw new Error('chave'); }
  if (!r.ok) throw Object.assign(new Error(dados.erro || 'erro'), { status: r.status });
  return dados;
}

// ---------- ativação ----------
function telaAtivacao(erro = '') {
  abas.hidden = true;
  document.body.classList.add('abertura');
  tela.innerHTML = `
    <section class="capa">
      <img class="capa-logo" src="/img/logo.webp" alt="">
      <h1 class="capa-nome">Calculadora <span>Inteligente</span></h1>
      <p class="capa-lema">Do fazer ao vender: calcule certo e lucre mais.</p>
      <div class="capa-beneficios"><span>📦 Quanto rende</span><span>🧮 Quanto custa</span><span>💰 Quanto cobrar</span><span>📈 Quanto lucra</span></div>
      <form id="form-ativar" class="capa-cartao">
        <label for="chave">Digite sua chave de acesso</label>
        <input id="chave" placeholder="LEU-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
        <p class="erro" id="erro-ativar">${esc(erro)}</p>
        <button class="botao" type="submit">Entrar</button>
      </form>
      <div class="capa-comprar">Ainda não tem a chave?<br><a href="${LINK_COMPRA}">Comprar por R$ 20 · acesso vitalício</a></div>
      <p class="capa-rodape">LeuName Softwares</p>
    </section>`;
  document.getElementById('form-ativar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = ev.target.querySelector('button');
    const chave = document.getElementById('chave').value.trim().toUpperCase().replace(/\s+/g, '');
    botao.disabled = true; botao.textContent = 'Conferindo...';
    try {
      const r = await fetch('/api/ativar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave }) });
      if (r.status === 429) throw new Error('Muitas tentativas. Espere um minuto e tente de novo.');
      if (!r.ok) throw new Error('Chave não encontrada. Confira as letras e os números.');
      estado.chave = chave; gravar('chave', chave);
      await carregarReceitas();
      abrir('receitas');
      aviso('Calculadora ativada! Bom trabalho e boas vendas.');
    } catch (e) {
      document.getElementById('erro-ativar').textContent = navigator.onLine ? e.message : 'Sem internet. Conecte-se para ativar.';
      botao.disabled = false; botao.textContent = 'Entrar';
    }
  });
}

function sair() {
  estado.chave = ''; gravar('chave', '');
  telaAtivacao('Sua chave não está mais ativa. Fale com o suporte se precisar de ajuda.');
}

async function carregarReceitas() {
  try {
    const { receitas } = await api('/api/receitas');
    estado.receitas = receitas; gravar('receitas', receitas);
  } catch (e) {
    if (e.message !== 'chave' && !estado.receitas.length) aviso('Sem internet: as receitas aparecem quando você conectar.');
  }
}

// ---------- navegação ----------
function abrir(aba, extra) {
  estado.aba = aba;
  document.body.classList.remove('abertura');
  abas.hidden = false;
  abas.querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  window.scrollTo(0, 0);
  ({ receitas: telaReceitas, receita: telaReceita, calcular: telaCalcular, ingredientes: telaIngredientes, historico: telaHistorico })[aba](extra);
}
abas.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) abrir(b.dataset.aba); });

// ---------- receitas ----------
function textoRendimento(r) {
  const o = r.rendimentoObservado || { tipo: 'inicial', min: r.rendimento.faixa[0], max: r.rendimento.faixa[1] };
  return `${o.min} a ${o.max} unidades`;
}

function telaReceitas() {
  const lista = estado.receitas.map((r) => `
    <button class="cartao receita" data-id="${esc(r.id)}">
      <img src="${esc(r.foto)}" alt="" loading="lazy">
      <span><span class="etiqueta">${esc(r.categoria)}</span><strong>${esc(r.nome)}</strong>
      <small class="sub">Rende ${textoRendimento(r)}</small></span>
    </button>`).join('');
  tela.innerHTML = `
    <h1>Receitas para vender</h1>
    <p class="sub">Receita completa, quanto rende e quanto você lucra. Toda receita nova do canal aparece aqui.</p>
    ${lista || '<p class="vazio">Conecte-se à internet para baixar as receitas.</p>'}
    <button class="botao sec" id="nova">＋ Calcular uma receita minha</button>`;
  tela.querySelectorAll('.receita').forEach((b) => b.addEventListener('click', () => abrir('receita', b.dataset.id)));
  document.getElementById('nova').addEventListener('click', () => { novaConta(); abrir('calcular'); });
}

function telaReceita(id) {
  const r = estado.receitas.find((x) => x.id === id);
  if (!r) return abrir('receitas');
  const o = r.rendimentoObservado || { tipo: 'inicial' };
  const origem = o.tipo === 'comunidade'
    ? `Rendimento observado por ${o.registros} pessoas que fizeram esta receita${o.pesoMedioG ? ` (unidades de ~${o.pesoMedioG} g)` : ''}.`
    : `Estimativa inicial de rendimento${r.rendimento.pesoUnidadeG ? `, com unidades de ~${r.rendimento.pesoUnidadeG} g` : ''}.`;
  tela.innerHTML = `
    <button class="link" id="voltar">← Receitas</button>
    <img class="foto-grande" src="${esc(r.foto)}" alt="">
    <h1>${esc(r.nome)}</h1>
    <div class="rendimento">
      <div>Rende aproximadamente</div>
      <div class="num">${textoRendimento(r)}</div>
      <p class="nota">${origem} É uma estimativa: varia com o tamanho e o peso de cada unidade, a quantidade usada, o modo de preparo e as perdas.</p>
    </div>
    <button class="botao" id="calcular">🧮 Calcular custo, preço e lucro</button>
    <h2>Ingredientes (receita base)</h2>
    <ul class="ingred cartao">${r.ingredientes.map((i) => `
      <li><span>${esc(i.nome)}<small>${esc(i.caseira || '')}</small></span><b>${qtd(i.qtd, i.unidade)}</b></li>`).join('')}
    </ul>
    <h2>Modo de preparo</h2>
    <ol class="passos cartao">${r.preparo.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    ${r.embalagemSugerida ? `<h2>Embalagem</h2><p class="cartao">${esc(r.embalagemSugerida)}</p>` : ''}
    ${r.dicaVenda ? `<h2>Dica para vender mais</h2><p class="cartao">💡 ${esc(r.dicaVenda)}</p>` : ''}`;
  document.getElementById('voltar').addEventListener('click', () => abrir('receitas'));
  document.getElementById('calcular').addEventListener('click', () => { contaDaReceita(r); abrir('calcular'); });
}

// ---------- calculadora ----------
function contaDaReceita(r) {
  const base = r.rendimentoObservado?.tipico || r.rendimento.unidades;
  estado.calc = {
    receitaId: r.id, nome: r.nome, rendimentoBase: base, quero: base,
    itens: r.ingredientes.map((i) => {
      if (!estado.ingredientes[normalizar(i.nome)] && i.emb) {
        estado.ingredientes[normalizar(i.nome)] = { nome: i.nome, emb: { ...i.emb }, referencia: true };
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
      const ing = estado.ingredientes[normalizar(i.nome)];
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

    <button class="botao" id="registrar">✅ Fiz esta receita — registrar produção</button>
    <p class="nota" style="text-align:center">Desconta os ingredientes do seu estoque e salva nas suas vendas.</p>`;

  document.getElementById('voltar')?.addEventListener('click', () => abrir('receita', r.id));
  document.getElementById('add-item').addEventListener('click', () => {
    c.itens.push({ nome: '', qtd: 0, unidade: 'g' }); gravar('calc', c); telaCalcular();
    const campos = tela.querySelectorAll('[data-item-nome]'); campos[campos.length - 1]?.focus();
  });
  document.getElementById('registrar').addEventListener('click', abrirRegistro);
  atualizarResultado();
}

function htmlItem(it, i) {
  const ing = estado.ingredientes[normalizar(it.nome)] || { emb: { qtd: '', unidade: it.unidade, preco: '' } };
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
    const k = normalizar(it.nome);
    const ing = estado.ingredientes[k] || (estado.ingredientes[k] = { nome: it.nome, emb: { unidade: it.unidade } });
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

  const porNome = new Map(res.itens.map((x) => [normalizar(x.nome), x]));
  c.itens.forEach((it, i) => {
    const alvo = tela.querySelector(`[data-custo="${i}"]`);
    if (!alvo) return;
    const x = porNome.get(normalizar(it.nome));
    if (!x || !it.nome.trim()) { alvo.innerHTML = ''; return; }
    const usa = d.escala !== 1 ? `Para ${c.quero} un.: <b>${qtd(x.uso, x.unidade)}</b> · ` : '';
    if (x.erro === 'preco') alvo.innerHTML = `${usa}Informe quanto você pagou.`;
    else if (x.erro === 'unidade') alvo.innerHTML = `${usa}<span class="falta">Não dá para converter ${esc(x.unidade)} na unidade do pacote. Use a mesma unidade (ex.: g e kg).</span>`;
    else alvo.innerHTML = `${usa}Custo: <b>${brl(x.custo)}</b> · ${x.falta
      ? `<span class="falta">Falta ${qtd(-x.sobra, x.unidadeEmb)} — compre mais</span>`
      : `sobra ${qtd(x.sobra, x.unidadeEmb)} (${brl(x.sobraValor)})`}`;
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
    if (fundo.querySelector('#r-estoque').checked) {
      for (const x of res.itens) {
        const ing = estado.ingredientes[normalizar(x.nome)];
        if (ing && !x.erro) ing.restante = Math.max(0, x.sobra);
      }
      gravar('ingredientes', estado.ingredientes);
    }
    const custoUn = res.custoTotal / unidades;
    const historico = ler('historico', []);
    historico.unshift({
      data: new Date().toISOString(), nome: c.nome || 'Receita', unidades, custoTotal: res.custoTotal,
      precoVenda: n(c.precoVenda), lucroPrevisto: n(c.precoVenda) ? Math.round((n(c.precoVenda) - custoUn) * unidades * 100) / 100 : null,
    });
    gravar('historico', historico.slice(0, 300));
    fundo.remove();
    if (c.receitaId && navigator.onLine) {
      api('/api/rendimento', { method: 'POST', body: JSON.stringify({ receitaId: c.receitaId, unidades, escala: d.escala, pesoUnidadeG: peso }) })
        .then(({ rendimento }) => {
          const r = estado.receitas.find((x) => x.id === c.receitaId);
          if (r) { r.rendimentoObservado = rendimento; gravar('receitas', estado.receitas); }
        }).catch(() => {});
    }
    aviso('Produção registrada! Obrigado por ajudar a melhorar o rendimento.');
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
    ${h.length ? h.slice(0, 50).map((x) => `<div class="cartao"><strong>${esc(x.nome)}</strong>
      <div class="sub" style="margin:2px 0 0">${new Date(x.data).toLocaleDateString('pt-BR')} · ${x.unidades} un. · custo ${brl(x.custoTotal)}${x.lucroPrevisto !== null ? ` · lucro ${brl(x.lucroPrevisto)}` : ''}</div></div>`).join('')
      : '<p class="vazio">Quando fizer uma receita, toque em "Registrar produção".</p>'}
    <button class="link" id="sair" style="width:100%;margin-top:16px">Desconectar esta chave deste aparelho</button>`;
  document.getElementById('sair').addEventListener('click', () => { if (confirm('Desconectar? Você precisará digitar a chave de novo.')) { estado.chave = ''; gravar('chave', ''); telaAtivacao(); } });
}

// ---------- início ----------
tela.addEventListener('input', aoDigitar);
tela.addEventListener('change', aoDigitar);
tela.addEventListener('click', aoClicarCalculo);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
if (!estado.chave) telaAtivacao();
else {
  abrir('receitas');
  carregarReceitas().then(() => { if (estado.aba === 'receitas' && estado.chave) telaReceitas(); });
}
