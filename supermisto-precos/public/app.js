import { gerarAnuncio } from './anuncios.js';
import { iniciarErp, desenharErp } from './erp.js';
import { CONFIG_PADRAO, FAIXAS, tabelaProduto, precoKgReal, analisarMercado, tendencia, ranking, por100g, espelho, montagem, tetoKg, abaixo99, montagensPorPeso, embUnidade, contaKit } from './precos.js';

const $ = (s) => document.querySelector(s);
const brl = (v) => (v == null ? '–' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SITUACAO = { mais_barato: 'Mais barato que todos', acima: 'Não dá p/ ser o mais barato', sem_concorrente: 'Sem concorrente lido' };
let D = null;
const kgOuG = (g) => (g >= 1000 ? `${(g / 1000).toLocaleString('pt-BR')} kg` : `${g} g`);

async function api(rota, opcoes = {}) {
  const r = await fetch(rota, { ...opcoes, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && rota !== '/api/entrar') { mostrarLogin(); throw new Error('sessao'); }
  if (!r.ok) throw new Error(d.erro || 'Erro. Tente de novo.');
  return d;
}
const post = (rota, corpo, metodo = 'POST') => api(rota, { method: metodo, body: JSON.stringify(corpo || {}) });

function mostrarLogin() { $('#app').hidden = true; $('#sair').hidden = true; $('#login').hidden = false; }

async function iniciar() {
  try { D = await api('/api/dados'); } catch { return; }
  D.config = { ...CONFIG_PADRAO, ...D.config };
  $('#login').hidden = true; $('#app').hidden = false; $('#sair').hidden = false;
  desenharTudo();
  iniciarErp(D, { api, post }).catch((er) => console.error(er));
}
const desenharTudo = () => { desenharLidos(); desenharTabela(); desenharCustos(); desenharManual(); };

/* ---------- login ---------- */
$('#f-login').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#erro-login').textContent = '';
  try { await post('/api/entrar', { senha: $('#senha').value }); $('#senha').value = ''; iniciar(); }
  catch (er) { $('#erro-login').textContent = er.message; }
});
$('#sair').addEventListener('click', async () => { await post('/api/sair').catch(() => {}); mostrarLogin(); });

/* ---------- menu (lateral no computador, gaveta no celular) ---------- */
const fecharMenu = () => { document.body.classList.remove('menu-aberto'); $('#menu-fundo').hidden = true; };
const abrirMenu = () => { document.body.classList.add('menu-aberto'); $('#menu-fundo').hidden = false; };
$('#menu-btn').addEventListener('click', () => (document.body.classList.contains('menu-aberto') ? fecharMenu() : abrirMenu()));
$('#abrir-menu').addEventListener('click', abrirMenu);
$('#menu-fundo').addEventListener('click', fecharMenu);
document.querySelectorAll('.barra-baixo [data-ir]').forEach((b) => b.addEventListener('click', () => document.querySelector(`.abas button[data-aba="${b.dataset.ir}"]`).click()));

/* ---------- abas ---------- */
document.querySelectorAll('.abas button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativo', x === b));
  document.querySelectorAll('.abas button').forEach((x) => { $(`#aba-${x.dataset.aba}`).hidden = x !== b; });
  if (['painel', 'pedidos', 'clientes', 'produtos', 'estoque', 'compras', 'financeiro', 'relatorios', 'loja', 'empresa', 'impressao'].includes(b.dataset.aba)) desenharErp();
  document.querySelectorAll('.barra-baixo [data-ir]').forEach((x) => x.classList.toggle('ativo', x.dataset.ir === b.dataset.aba));
  fecharMenu(); window.scrollTo({ top: 0 });
  if (b.dataset.aba === 'tabela') desenharTabela();
  if (b.dataset.aba === 'ranking') desenharRanking();
  if (b.dataset.aba === 'duelo') desenharDuelo();
  if (b.dataset.aba === 'anuncios') desenharAnuncios();
}));

/* ---------- prints ---------- */
function reduzir(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

$('#arquivos').addEventListener('change', async (e) => {
  const lista = [...e.target.files]; e.target.value = '';
  const loja = $('#loja').value.trim();
  let novos = 0, falhas = 0;
  for (let i = 0; i < lista.length; i++) {
    $('#progresso').textContent = `Lendo print ${i + 1} de ${lista.length}…`;
    try {
      const r = await post('/api/ler-print', { imagem: await reduzir(lista[i]), loja });
      D.concorrentes.unshift(...r.itens); novos += r.itens.length; desenharLidos(); desenharTabela();
    } catch (er) { if (er.message === 'sessao') return; falhas++; }
  }
  $('#progresso').innerHTML = `✅ Pronto: <b>${novos} anúncio(s)</b> lido(s) e guardado(s) aqui embaixo` + (falhas ? `, ${falhas} print(s) não leram (tente de novo).` : '.') + ' Veja o resultado na aba <b>💰 Tabela</b>.';
});

function desenharLidos() {
  const opts = (sel) => `<option value="">— outro produto —</option>` + D.produtos.map((p) => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(p.nome)}</option>`).join('');
  $('#qtd').textContent = `(${D.concorrentes.length})`;
  $('#lidos').innerHTML = D.concorrentes.slice(0, 150).map((c) => `
    <div class="item" data-id="${c.id}">
      <div class="tit">${esc(c.anuncio) || 'Anúncio'} <small>${c.loja ? '· ' + esc(c.loja) : ''}${c.vendidos ? ' · ' + c.vendidos + ' vendidos' : ''}${c.gramas > 0 ? ' · ' + brl(c.preco / c.gramas * 100) + ' a cada 100 g' : ''}</small></div>
      <div class="linha">
        <label>Produto<select name="produto_id">${opts(c.produto_id)}</select></label>
        <label>Pacotinhos<input name="unidades" inputmode="numeric" value="${c.unidades ?? (c.gramas > 0 ? 1 : '')}"></label>
        <label>Gramas cada<input name="gramas_unidade" inputmode="decimal" value="${c.gramas_unidade ?? c.gramas ?? ''}"></label>
        <label>Preço R$<input name="preco" inputmode="decimal" value="${c.preco ?? ''}"></label>
        <button class="x" title="Apagar">×</button>
      </div>${c.gramas > 0 ? `<div class="ok">= ${montagem(c).un} × ${montagem(c).g} g = ${kgOuG(c.gramas)}</div>` : '<div class="aviso">⚠️ Sem peso: digite quantos pacotinhos e quantos gramas cada (ex.: 30 × 30 g).</div>'}
    </div>`).join('') || '<p class="suave">Nenhum print lido ainda.</p>';
}
$('#lidos').addEventListener('change', async (e) => {
  const el = e.target.closest('.item'); if (!el) return;
  const c = D.concorrentes.find((x) => String(x.id) === el.dataset.id);
  const num = (v) => (v === '' ? null : Number(String(v).replace(',', '.')));
  const un = num(el.querySelector('[name=unidades]').value), gu = num(el.querySelector('[name=gramas_unidade]').value);
  Object.assign(c, { produto_id: el.querySelector('[name=produto_id]').value || null, unidades: un, gramas_unidade: gu, gramas: un > 0 && gu > 0 ? un * gu : null, preco: num(el.querySelector('[name=preco]').value) || 0 });
  await post(`/api/concorrentes/${c.id}`, c).catch((er) => alert(er.message));
  desenharLidos();
});
$('#lidos').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('x')) return;
  const id = e.target.closest('.item').dataset.id;
  await post(`/api/concorrentes/${id}`, null, 'DELETE').catch(() => {});
  D.concorrentes = D.concorrentes.filter((x) => String(x.id) !== id); desenharLidos();
});
$('#limpar').addEventListener('click', async () => {
  if (!confirm('Apagar todos os anúncios lidos?')) return;
  await post('/api/concorrentes/limpar'); D.concorrentes = []; desenharLidos();
});

/* ---------- anúncio digitado à mão ---------- */
function desenharManual() {
  $('#m-prod').innerHTML = D.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
}
$('#f-manual').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target), d = Object.fromEntries(f);
  // 28,70 / 28.70 / 1.200,50 viram número
  const lerNum = (v) => { const t = String(v ?? '').trim(); if (!t) return null; return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); };
  ['unidades', 'gramas_unidade', 'preco', 'vendidos'].forEach((k) => { d[k] = lerNum(d[k]); });
  try {
    const c = await post('/api/concorrentes', d);
    D.concorrentes.unshift(c); desenharLidos(); desenharTabela();
    const prod = e.target.produto_id.value; e.target.reset(); e.target.produto_id.value = prod;
    $('#m-msg').textContent = `✅ Salvo: ${c.unidades} × ${c.gramas_unidade} g por ${brl(c.preco)}. Veja na aba ⚔️ Duelo.`;
  } catch (er) { $('#m-msg').textContent = er.message; }
});

/* ---------- tabela ---------- */
function desenharTabela() {
  const linhas = D.produtos.map((p) => tabelaProduto(p, D.insumos, D.config, D.concorrentes, D.produtos));
  const disputa = linhas.flatMap((l) => l.formatos.filter((f) => f.concorrentes));
  const ganha = disputa.filter((f) => f.situacao === 'mais_barato').length;
  $('#resumo').innerHTML = disputa.length ? `<div class="resumo dois"><div class="bom"><b>${ganha}</b><span>dá para vender mais barato que todos</span></div>
    <div class="ruim"><b>${disputa.length - ganha}</b><span>concorrente mais barato que o seu custo</span></div></div>` : '';
  const g = (n) => (n >= 1000 ? `${n / 1000} kg` : `${n} g`);
  // Comparação em frases: o que o concorrente cobra, quanto custa para você e o veredito.
  const frase = (f) => {
    const c = f.maisBarato;
    const ok = f.situacao === 'mais_barato';
    return `<div class="comp ${ok ? 'bom' : 'ruim'}">
      <div class="comp-tit">${f.nome}</div>
      <p>🏷️ Concorrente mais barato: <b>${brl(c.preco)}</b> por ${g(c.gramas)}${c.gramas !== f.gramas ? ` (= ${brl(c.equivalente)} por ${g(f.gramas)})` : ''}${c.loja ? ' · ' + esc(c.loja) : ''}</p>
      <p>🧾 Para você fazer ${g(f.gramas)}: <b>${brl(f.custo)}</b> (matéria-prima + embalagem)</p>
      <p>💸 Menor preço sem prejuízo: <b>${brl(f.minimo)}</b> (já paga a Shopee e deixa ${brl(D.config.lucro_min)})</p>
      <p class="veredito">${ok ? `✅ Venda por <b>${brl(f.preco)}</b>: fica mais barato que todos e sobra <b>${brl(f.lucro)}</b>.`
        : (() => { const alvo = abaixo99(c.equivalente), teto = tetoKg(alvo, f.gramas, f.custo - f.materia, D.config);
            return `⚠️ Para vender a <b>${brl(alvo)}</b> (abaixo dele), o tempero pronto pode custar no máximo <b>${brl(Math.max(teto, 0))} o kg</b>. Pelos seus custos de hoje sai ${brl(f.materia / f.gramas * 1000)} o kg: compre mais barato ou baixe a embalagem na aba 🧾 Custos.`; })()}</p></div>`;
  };
  const cartao = (l) => {
    const disp = l.formatos.filter((f) => f.concorrentes), outros = l.formatos.filter((f) => !f.concorrentes);
    return `<div class="card"><h3>${esc(l.produto.nome)}</h3>
      <div class="info">${l.total} anúncio(s) da concorrência · sua matéria-prima: ${brl(l.custo10g * 10)} a cada 100 g</div>
      ${disp.map(frase).join('')}
      ${outros.length ? `<div class="sub">${disp.length ? 'Outros formatos (sem concorrente para comparar)' : 'Preço pelo seu custo (sem concorrente para comparar)'}</div>
      <table><tr><th>Formato</th><th>Vender por</th><th>Sobra p/ você</th></tr>
      ${outros.map((f) => `<tr><td>${f.nome}</td><td><b>${brl(f.preco)}</b></td><td>${brl(f.lucro)}</td></tr>`).join('')}</table>` : ''}
    </div>`;
  };
  const com = linhas.filter((l) => l.total), sem = linhas.filter((l) => !l.total);
  $('#tabela').innerHTML = (com.length ? com.map(cartao).join('') : '<p class="suave">Ainda não há anúncios lidos. Jogue prints na aba 📷 Prints.</p>')
    + (sem.length ? `<details class="card"><summary>Produtos sem concorrente lido (${sem.length}): toque para ver o preço pelo seu custo</summary>${sem.map(cartao).join('')}</details>` : '');
  desenharMercado(linhas);
}

/* ---------- mercado (gráficos) ---------- */
const mil = (n) => (n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(n));
function graficoFaixa(fx) {
  const W = 340, H = 190, E = 44, D = 14, T = 14, B = 30; // margens: esquerda, direita, topo, base
  const pts = fx.pontos, comV = pts.filter((c) => c.vendidos > 0);
  const maxP = Math.max(...pts.map((c) => c.preco), fx.nosso ? fx.nosso.minimo : 0) * 1.12;
  const vmax = Math.max(10, ...comV.map((c) => c.vendidos)), lmin = 0, lmax = Math.ceil(Math.log10(vmax * 1.5));
  const x = (v) => E + (v / maxP) * (W - E - D);
  const y = (v) => (v > 0 ? T + (1 - (Math.log10(v) - lmin) / (lmax - lmin)) * (H - T - B) : H - B);
  const ticksY = Array.from({ length: lmax + 1 }, (_, i) => 10 ** i).filter((v, i) => i % (lmax > 4 ? 2 : 1) === 0);
  const passo = maxP > 60 ? 20 : maxP > 25 ? 10 : 5;
  const ticksX = Array.from({ length: Math.floor(maxP / passo) + 1 }, (_, i) => i * passo);
  const top = fx.maisVendido;
  return `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="${esc(fx.nome)}: preço por vendas">
    ${ticksY.map((v) => `<line x1="${E}" x2="${W - D}" y1="${y(v)}" y2="${y(v)}" class="grade"/><text x="${E - 6}" y="${y(v) + 4}" class="eixo" text-anchor="end">${mil(v)}</text>`).join('')}
    ${ticksX.map((v) => `<text x="${x(v)}" y="${H - B + 16}" class="eixo" text-anchor="middle">R$ ${v}</text>`).join('')}
    <line x1="${E}" x2="${W - D}" y1="${H - B}" y2="${H - B}" class="base"/>
    ${fx.nosso ? `<line x1="${x(fx.nosso.minimo)}" x2="${x(fx.nosso.minimo)}" y1="${T}" y2="${H - B}" class="nosso"/><text x="${x(fx.nosso.minimo) + (x(fx.nosso.minimo) > W - 80 ? -4 : 4)}" y="${H - B - 6}" class="rotulo" text-anchor="${x(fx.nosso.minimo) > W - 80 ? 'end' : 'start'}">seu mínimo</text>` : ''}
    ${pts.map((c, i) => `<g class="ponto" data-i="${i}" tabindex="0"><circle cx="${x(c.preco)}" cy="${y(c.vendidos)}" r="14" fill="transparent"/>
      <circle cx="${x(c.preco)}" cy="${y(c.vendidos)}" r="6" class="${c === top ? 'top' : c === fx.maisBarato ? 'barato' : 'pt'}"/><title>${esc(c.anuncio)} · R$ ${c.preco} · ${c.vendidos ? mil(c.vendidos) + ' vendidos' : 'sem vendas no print'}</title></g>`).join('')}
    ${top ? `<text x="${Math.min(x(top.preco), W - 80)}" y="${y(top.vendidos) - 10}" class="rotulo">mais vendido</text>` : ''}
    <text x="${E}" y="${T - 4}" class="eixo">vendidos</text>
  </svg>
  <div class="leg"><span><i class="pt"></i>anúncio</span><span><i class="top"></i>mais vendido</span><span><i class="barato"></i>mais barato</span><span><i class="linha"></i>seu mínimo</span></div>
  <div class="detalhe"></div>`;
}
function graficoTendencia(t) {
  if (t.length < 2) return '<p class="suave dica">📉📈 Jogue prints desta faixa em dias diferentes para ver se o preço está subindo ou descendo.</p>';
  const W = 340, H = 150, E = 44, D = 14, T = 14, B = 30;
  const vs = t.map((p) => p.valor), lo = Math.min(...vs) * 0.9, hi = Math.max(...vs) * 1.1;
  const x = (i) => E + (i / (t.length - 1)) * (W - E - D), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const sobe = vs[vs.length - 1] >= vs[0];
  return `<div class="sub">Preço médio ao longo do tempo (a cada 100 g)</div><p class="trend ${sobe ? 'ruim' : 'bom'}">${sobe ? '📈 O preço médio do mercado está subindo' : '📉 O preço médio do mercado está descendo'}: de ${brl(vs[0])} para ${brl(vs[vs.length - 1])} a cada 100 g.</p>
    <svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Preço médio a cada 100 g por dia">
    <line x1="${E}" x2="${W - D}" y1="${H - B}" y2="${H - B}" class="base"/>
    <path d="${t.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.valor)}`).join(' ')}" class="tend"/>
    ${t.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.valor)}" r="4.5" class="pt"><title>${p.dia.split('-').reverse().join('/')}: ${brl(p.valor)} a cada 100 g</title></circle>
      ${i === 0 || i === t.length - 1 ? `<text x="${x(i)}" y="${H - B + 16}" class="eixo" text-anchor="${i ? 'end' : 'start'}">${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}</text><text x="${x(i)}" y="${y(p.valor) - 9}" class="rotulo" text-anchor="${i ? 'end' : 'start'}">${brl(p.valor)}</text>` : ''}`).join('')}
  </svg>`;
}
let mercadoAtual = [];
function desenharMercado(linhas) {
  const com = linhas.filter((l) => l.total);
  const sel = $('#merc-prod'), atual = sel.value;
  sel.innerHTML = com.map((l) => `<option value="${l.produto.id}">${esc(l.produto.nome)} (${l.total})</option>`).join('');
  if (!com.length) { $('#mercado').innerHTML = '<p class="suave">Ainda não há anúncios lidos.</p>'; return; }
  if (com.some((l) => l.produto.id === atual)) sel.value = atual;
  const l = com.find((x) => x.produto.id === sel.value) || com[0];
  const conc = D.concorrentes.filter((c) => c.produto_id === l.produto.id);
  mercadoAtual = analisarMercado(conc, l.formatos, D.config).filter((fx) => fx.pontos.length);
  const icone = { bom: '✅', ruim: '❌', info: '💡' };
  $('#mercado').innerHTML = mercadoAtual.map((fx, k) => `<div class="card" data-fx="${k}"><h3>${fx.nome}</h3>
      <div class="info">${fx.pontos.length} anúncio(s) · de ${brl(fx.maisBarato.preco)} a ${brl(fx.maisCaro.preco)}</div>
      ${fx.alertas.map((a) => `<p class="alerta ${a.tipo}">${icone[a.tipo]} ${a.texto}</p>`).join('')}
      ${graficoFaixa(fx)}${graficoTendencia(tendencia(fx.pontos))}</div>`).join('')
    + (mercadoAtual.length ? '' : '<p class="suave">Os anúncios deste produto estão sem peso. Corrija as gramas na aba 📷 Prints.</p>');
}
$('#merc-prod').addEventListener('change', () => desenharTabela());
$('#mercado').addEventListener('click', (e) => {
  const g = e.target.closest('.ponto'); if (!g) return;
  const card = g.closest('[data-fx]'), fx = mercadoAtual[card.dataset.fx], c = fx.pontos[g.dataset.i];
  card.querySelector('.detalhe').innerHTML = `<b>${esc(c.anuncio)}</b><br>${brl(c.preco)} · ${c.gramas >= 1000 ? c.gramas / 1000 + ' kg' : c.gramas + ' g'} · ${c.vendidos ? mil(c.vendidos) + ' vendidos' : 'sem vendas no print'}${c.loja ? ' · ' + esc(c.loja) : ''}`;
});

/* ---------- custos ---------- */
const NOMES_CFG = { taxa_pct: 'Comissão Shopee (%)', imposto_pct: 'Imposto sobre a venda – Simples (%)', taxa_fixa: 'Taxa fixa Shopee por item (R$)', lucro_min: 'Lucro mínimo por venda (R$)', emb_sache: 'Embalagem sachê 10 g (R$)', emb_kit: 'Saquinho que junta o kit (R$)', emb_50: 'Embalagem pacote 50 g (R$)', emb_100: 'Embalagem pacote 100 g (R$)', etiqueta: 'Adesivo/etiqueta por pacote (R$)' };
const resultadoInsumo = (i) => `Sai a <b>${brl(i.preco_kg)}</b> o kg pronto · <b>${brl(i.preco_kg / 10)}</b> cada 100 g · ${brl(i.preco_kg / 100)} cada 10 g`;
function desenharCustos() {
  $('#insumos').innerHTML = D.insumos.map((i) => `<div class="ins" data-insumo="${esc(i.nome)}"><b>${esc(i.nome)}</b>
    <div class="ins-campos">
      <label>Paguei (R$)<input name="pago" inputmode="decimal" value="${i.pago ?? ''}" placeholder="ex.: 20"></label>
      <label>Comprei (kg)<input name="comprado_kg" inputmode="decimal" value="${i.comprado_kg ?? ''}" placeholder="ex.: 2"></label>
      <label>Rendeu (kg)<input name="rendeu_kg" inputmode="decimal" value="${i.rendeu_kg ?? ''}" placeholder="ex.: 1"></label>
    </div><div class="ins-res">${i.pago == null ? 'Estimativa: ' : ''}${resultadoInsumo(i)}</div></div>`).join('');
  $('#config').innerHTML = Object.entries(NOMES_CFG).map(([k, n]) => `<label>${n}<input data-cfg="${k}" inputmode="decimal" value="${D.config[k]}"></label>`).join('');
}
const num = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));
async function salvarInsumo(e) {
  const el = e.target.closest('.ins'); if (!el) return;
  const nome = el.dataset.insumo, d = { nome };
  ['pago', 'comprado_kg', 'rendeu_kg'].forEach((k) => { d[k] = num(el.querySelector(`[name=${k}]`).value); });
  if (precoKgReal(d.pago, d.comprado_kg, d.rendeu_kg) == null) return; // ainda falta preencher
  const r = await post('/api/insumo', d).catch((er) => { alert(er.message); return null; });
  if (!r) return;
  const i = D.insumos.find((x) => x.nome === nome); Object.assign(i, d, { preco_kg: r.preco_kg });
  el.querySelector('.ins-res').innerHTML = resultadoInsumo(i);
}
async function salvarCampo(e) {
  const v = num(e.target.value);
  if (!(v >= 0)) { e.target.value = ''; return; }
  const k = e.target.dataset.cfg; await post('/api/config', { [k]: v }); D.config[k] = v;
  e.target.style.borderColor = 'var(--verde)';
}
$('#insumos').addEventListener('change', salvarInsumo);

/* ---------- ranking ---------- */
const MEDALHA = ['🥇', '🥈', '🥉'];
function listaRank(titulo, itens, destaque) {
  return `<div class="card"><h3>${titulo}</h3>${itens.length ? `<ol class="rank">${itens.slice(0, 10).map((c, i) => `<li>
    <span class="pos">${MEDALHA[i] || i + 1 + 'º'}</span>
    <span class="nome">${esc(c.anuncio)}<small>${kgOuG(c.gramas || 0)}${c.loja ? ' · ' + esc(c.loja) : ''}</small></span>
    <span class="val">${destaque(c)}</span></li>`).join('')}</ol>` : '<p class="suave">Sem dados nesta seleção.</p>'}</div>`;
}
function piramide(itens, top, nosso) {
  // Mais barato embaixo, mais caro em cima; a largura da barra é quanto vendeu.
  const lista = itens.filter((c) => c.vendidos > 0).sort((a, b) => b.preco - a.preco).slice(0, 12);
  if (!lista.length) return '';
  const max = Math.max(...lista.map((c) => c.vendidos));
  const minimo = nosso ? nosso.minimo : null;
  return `<div class="card"><h3>Pirâmide de preços</h3>
    <p class="suave">Mais caro em cima, mais barato embaixo. A barra é do tamanho das vendas. 🟠 = o que mais vende.</p>
    <div class="pir">${lista.map((c) => {
      const w = Math.max(8, (c.vendidos / max) * 100);
      const abaixo = minimo != null && c.preco * (nosso.gramas / c.gramas) < minimo;
      return `<div class="pir-l"><span class="pir-p">${brl(c.preco)}</span>
        <span class="pir-b"><i class="${c === top ? 'top' : abaixo ? 'abaixo' : ''}" style="width:${w}%"></i></span>
        <span class="pir-v">${mil(c.vendidos)}</span></div>`;
    }).join('')}</div>
    ${minimo != null ? '<div class="leg"><span><i class="top"></i>mais vendido</span><span><i class="pt"></i>dá para você cobrar igual</span><span><i class="abaixo"></i>abaixo do seu mínimo</span></div>' : ''}</div>`;
}
/** Bloco lado a lado: o kit do concorrente e o mesmo kit da Supermisto. */
function ladoALado(c, cpg) {
  const e = espelho(c, cpg, D.config);
  if (!e) return '';
  const m = `${e.un} × ${e.g} g${e.un > 1 ? ' = ' + kgOuG(e.un * e.g) : ''}`;
  return `<div class="duelo ${e.pode ? 'bom' : 'ruim'}">
    <div class="lado ele"><div class="quem">🛒 Concorrente</div><div class="nome-an">${esc(c.anuncio)}</div>
      <div class="kit">${m}</div><div class="preco">${brl(c.preco)}</div>
      <div class="det">${brl(e.unidadeDele)} cada pacotinho${c.vendidos ? `<br>${mil(c.vendidos)} vendidos` : ''}${c.loja ? `<br>${esc(c.loja)}` : ''}</div></div>
    <div class="vs">VS</div>
    <div class="lado nos"><div class="quem">🌿 Supermisto</div><div class="nome-an">O mesmo kit, mais barato</div>
      <div class="kit">${m}</div><div class="preco">${brl(e.preco)}</div>
      <div class="det">${brl(e.unidadeNossa)} cada pacotinho</div></div>
    <div class="conta">
      <p>🧮 Ele vende a <b>${brl(e.unidadeDele)} cada pacotinho de ${e.g} g</b>. Tirando a Shopee, ele recebe <b>${brl(e.liquidoDele)}</b> pelo kit (${brl(e.liquidoDele / e.un)} cada). Com isso ele paga o tempero, os saquinhos e o lucro dele.</p>
      <p>🎯 Para você vender a <b>${brl(e.preco)}</b>, pagar a Shopee, ${brl(e.embalagens)} de embalagem/etiqueta e ainda lucrar ${brl(D.config.lucro_min)}:
        o tempero pronto pode custar no máximo <b class="teto">${brl(Math.max(e.teto, 0))} o kg</b> (${brl(Math.max(e.teto, 0) / 10)} cada 100 g).</p>
    </div>
    <div class="veredito">${e.pode
      ? `✅ Seu tempero hoje sai ${brl(e.hojeKg)} o kg: dá! Venda por <b>${brl(e.preco)}</b> e sobra <b>${brl(e.sobra)}</b>.${e.brinde ? ` 🎁 Mande <b>1 sachê de brinde</b> (custa ${brl(e.brinde.custo)}) e ainda sobra <b>${brl(e.brinde.sobra)}</b>.` : ''}`
      : e.teto > 0
        ? `⚠️ Pelos custos da aba 🧾 Custos, seu tempero sai ${brl(e.hojeKg)} o kg. Para bater esse preço, compre a no máximo <b>${brl(e.teto)} o kg pronto</b> (já contando a perda) ou baixe a embalagem.`
        : `❌ Nesse preço, só a Shopee e a embalagem (${brl(e.embalagens)}) já comem tudo. Baixe o custo da embalagem na aba 🧾 Custos.`}</div>
  </div>`;
}
const tamanhoDe = (c) => montagem(c).g;
function desenharRanking() {
  const prods = D.produtos.filter((p) => D.concorrentes.some((c) => c.produto_id === p.id));
  const sp = $('#rk-prod'), sf = $('#rk-faixa'), ap = sp.value, af = sf.value;
  sp.innerHTML = prods.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('') || '<option value="">Nenhum anúncio lido</option>';
  if (prods.some((p) => p.id === ap)) sp.value = ap;
  const prod = D.produtos.find((p) => p.id === sp.value);
  const conc = D.concorrentes.filter((c) => prod && c.produto_id === prod.id && tamanhoDe(c));
  const tamanhos = [...new Set(conc.map(tamanhoDe))].sort((a, b) => a - b);
  sf.innerHTML = tamanhos.map((g) => `<option value="${g}">Pacotinho de ${g} g (${conc.filter((c) => tamanhoDe(c) === g).length})</option>`).join('') || '<option value="">—</option>';
  if (tamanhos.map(String).includes(af)) sf.value = af;
  else if (tamanhos.length) sf.value = String(tamanhos.reduce((a, b) => (conc.filter((c) => tamanhoDe(c) === b).length > conc.filter((c) => tamanhoDe(c) === a).length ? b : a)));
  const g = Number(sf.value);
  if (!prod || !g) { ['#rk-estrategia', '#rk-piramide', '#rk-vendas', '#rk-precos'].forEach((k) => { $(k).innerHTML = ''; }); $('#rk-estrategia').innerHTML = '<p class="suave">Jogue prints na aba 📷 Prints (com o peso aparecendo) para montar o ranking.</p>'; return; }
  const itens = conc.filter((c) => tamanhoDe(c) === g);
  const rk = ranking(itens), top = rk.vendas[0];
  const cpg = tabelaProduto(prod, D.insumos, D.config, D.concorrentes, D.produtos).cpg;
  $('#rk-estrategia').innerHTML = top
    ? `<h3>🎯 Bater de frente com o mais vendido</h3>${ladoALado(top, cpg)}`
    : '<p class="alerta info">💡 Os prints deste tamanho não mostram vendas. Tire prints com o "vendidos" aparecendo.</p>';
  $('#rk-piramide').innerHTML = piramide(itens, top, null);
  const porUn = (c) => c.preco / montagem(c).un;
  $('#rk-vendas').innerHTML = listaRank('🔥 Mais vendidos', rk.vendas, (c) => `<b>${mil(c.vendidos)}</b><small>${brl(c.preco)}</small>`);
  $('#rk-precos').innerHTML = listaRank('💲 Melhores preços (cada pacotinho)', [...itens].sort((a, b) => porUn(a) - porUn(b)), (c) => `<b>${brl(porUn(c))}</b><small>${brl(c.preco)} o kit${c.vendidos ? ' · ' + mil(c.vendidos) + ' vend.' : ''}</small>`);
}

/* ---------- duelo: agrupado pelo mesmo kit (pacotinhos × gramas) ---------- */
function desenharDuelo() {
  const prods = D.produtos.filter((p) => D.concorrentes.some((c) => c.produto_id === p.id));
  const sp = $('#du-prod'), ap = sp.value;
  sp.innerHTML = prods.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('') || '<option value="">Nenhum anúncio lido</option>';
  if (prods.some((p) => p.id === ap)) sp.value = ap;
  const prod = D.produtos.find((p) => p.id === sp.value);
  if (!prod) { $('#du-lista').innerHTML = '<p class="suave">Jogue prints na aba 📷 Prints.</p>'; return; }
  const cpg = tabelaProduto(prod, D.insumos, D.config, D.concorrentes, D.produtos).cpg;
  const lista = D.concorrentes.filter((c) => c.produto_id === prod.id);
  const grupos = new Map();
  for (const c of lista.filter(tamanhoDe)) {
    const { un, g } = montagem(c), k = `${un}x${g}`;
    if (!grupos.has(k)) grupos.set(k, { un, g, itens: [] });
    grupos.get(k).itens.push(c);
  }
  const ordem = [...grupos.values()].sort((a, b) => Math.max(...b.itens.map((c) => c.vendidos || 0)) - Math.max(...a.itens.map((c) => c.vendidos || 0)));
  const sem = lista.filter((c) => !tamanhoDe(c));
  // Mesmo peso total, montagens diferentes: o cliente vê "20 pacotinhos" e não percebe que é o mesmo 1 kg.
  const comparar = montagensPorPeso(lista, cpg, D.config).filter((p) => p.linhas.length > 1);
  const blocoPeso = comparar.map((p) => {
    const caro = p.linhas[0], barato = p.linhas[p.linhas.length - 1], m = p.melhor;
    return `<div class="card peso"><h3>🧠 Tudo dá ${kgOuG(p.peso)}: montagens diferentes</h3>
      <p class="alerta info">💡 O cliente olha a quantidade de pacotinhos e não a conta do quilo. <b>${caro.un} × ${caro.g} g</b> sai a <b>${brl(caro.porKg)} o kg</b> e <b>${barato.un} × ${barato.g} g</b> sai a <b>${brl(barato.porKg)} o kg</b>, mas é o mesmo ${kgOuG(p.peso)}.</p>
      <table class="tab-peso"><tr><th>Montagem</th><th>Ele cobra</th><th>Por kg</th><th>Vendas</th><th>Você</th></tr>
      ${p.linhas.map((l) => `<tr class="${l === m ? 'melhor' : ''}"><td><b>${l.un} × ${l.g} g</b></td><td>${brl(l.top.preco)}</td><td>${brl(l.porKg)}</td>
        <td>${l.vendidos ? mil(l.vendidos) : '–'}</td><td>${brl(l.nossoPreco)}<br><small class="${l.pode ? 'ok-txt' : 'ruim-txt'}">sobra ${brl(l.nossaSobra)}</small></td></tr>`).join('')}
      </table>
      ${p.faltando.map((l) => `<p class="alerta ruim">⚠️ <b>${l.un} × ${l.g} g</b> dá só <b>${kgOuG(l.un * l.g)}</b> (${l.falta} g a menos que ${kgOuG(p.peso)}) e cobra ${brl(l.top.preco)}. O cliente vê "${l.un} pacotinhos" e acha que leva mais.</p>`).join('')}
      ${p.ideia && p.ideia.contra.un > 1 ? `<div class="estr ${p.ideia.pode ? 'bom' : 'ruim'}"><div class="estr-tit">💡 Jogada inteligente</div>
        <p>Faça <b>${p.ideia.un} pacotinhos de ${p.ideia.g} g = ${kgOuG(p.ideia.total)} completo</b> e venda por <b>${brl(p.ideia.preco)}</b>: a mesma quantidade de pacotinhos que chama atenção, <b>o quilo inteiro</b> e mais barato que os ${brl(p.ideia.contra.top.preco)} dele. No título e na foto: <b>"${p.ideia.un} SACHÊS = 1 KG COMPLETO"</b>.</p>
        <p>${p.ideia.pode ? `Com os seus custos de hoje sobra <b>${brl(p.ideia.sobra)}</b> por kit.` : `Para sobrar o seu lucro mínimo, o tempero pronto pode custar até <b>${brl(Math.max(p.ideia.teto, 0))} o kg</b>.`}</p></div>` : ''}
      <p class="estr-dica">🎯 <b>Melhor para você:</b> montar em <b>${m.un} pacotinhos de ${m.g} g</b> e vender por <b>${brl(m.nossoPreco)}</b>${m.pode ? `: sobra <b>${brl(m.nossaSobra)}</b> por kit.` : '. Com os custos de hoje ainda não sobra; veja quanto o tempero pode custar no Duelo abaixo.'}
      Mais pacotinhos chamam mais atenção na foto, mas gastam mais saquinho e etiqueta: o app já desconta isso.</p>
    </div>`;
  }).join('');
  $('#du-lista').innerHTML = blocoPeso + ordem.map((gr) => {
    const porPreco = [...gr.itens].sort((a, b) => a.preco - b.preco);
    const porVenda = [...gr.itens].sort((a, b) => (b.vendidos || 0) - (a.vendidos || 0));
    const barato = porPreco[0], caro = porPreco[porPreco.length - 1], top = porVenda[0].vendidos ? porVenda[0] : barato;
    const nome = gr.un > 1 ? `Kit ${gr.un} × ${gr.g} g (${kgOuG(gr.un * gr.g)})` : `Pacote de ${gr.g} g`;
    const aviso = top === barato
      ? (top.vendidos ? `💡 O mais vendido também é o mais barato (${brl(barato.preco)}, ${mil(barato.vendidos)} vendidos).` : '')
      : `💡 O mais barato é ${brl(barato.preco)}, mas vendeu só ${barato.vendidos ? mil(barato.vendidos) : 'pouco'}. O que mais vende cobra ${brl(top.preco)} (${mil(top.vendidos)} vendidos): o cliente aceita esse preço, então batemos de frente com ele.`;
    return `<div class="card grupo"><h3>${nome}</h3>
      <div class="info">${gr.itens.length} concorrente(s) · de ${brl(barato.preco)} a ${brl(caro.preco)}</div>
      ${aviso ? `<p class="alerta info">${aviso}</p>` : ''}
      <div class="sub">🎯 Contra o que mais vende</div>${ladoALado(top, cpg)}
      ${top !== barato ? `<details><summary>Ver contra o mais barato (${brl(barato.preco)})</summary>${ladoALado(barato, cpg)}</details>` : ''}
      ${gr.itens.length > 1 ? `<details><summary>Todos os ${gr.itens.length} deste kit</summary><ol class="rank">${porVenda.map((c, i) => `<li><span class="pos">${MEDALHA[i] || i + 1 + 'º'}</span>
        <span class="nome">${esc(c.anuncio)}<small>${c.loja ? esc(c.loja) : ''}</small></span><span class="val"><b>${brl(c.preco)}</b><small>${c.vendidos ? mil(c.vendidos) + ' vend.' : '–'}</small></span></li>`).join('')}</ol></details>` : ''}
    </div>`;
  }).join('') + (sem.length ? `<p class="aviso">⚠️ ${sem.length} anúncio(s) sem peso ficaram de fora. Na aba 📷 Prints, coloque quantos pacotinhos e quantos gramas cada.</p>` : '');
  if (!$('#du-lista').innerHTML) $('#du-lista').innerHTML = '<p class="suave">Os anúncios deste produto estão sem peso. Corrija na aba 📷 Prints.</p>';
}
$('#du-prod').addEventListener('change', desenharDuelo);

/* ---------- anúncios prontos ---------- */
const lerNumero = (v) => { const t = String(v ?? '').trim(); return t ? Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t) : null; };
function cartaoAnuncio(prod, un, g, preco, cpg, extra = '', brindeEscolhido = null) {
  const cfg = D.config;
  const semBrinde = contaKit(preco, un, g, cpg, cfg, false), comBrinde = contaKit(preco, un, g, cpg, cfg, true);
  const brinde = brindeEscolhido ?? comBrinde.sobra >= cfg.lucro_min;
  const k = brinde ? comBrinde : semBrinde;
  const teto = tetoKg(preco, un * g, k.saquinhos + k.kit + k.brinde, cfg);
  const sobraFinal = k.sobra;
  const a = gerarAnuncio({ produto: prod, un, g, preco, brinde });
  const bloco = (rot, txt, grande) => `<div class="cp"><div class="cp-cab"><b>${rot}</b><button type="button" class="copiar">Copiar</button></div>
    <pre class="${grande ? 'grande' : ''}">${esc(txt)}</pre></div>`;
  return `<div class="card anuncio">${extra}
    <div class="an-topo"><div><div class="an-kit">${un > 1 ? `${un} sachês × ${g} g = ${kgOuG(un * g)}` : `Pacote de ${g} g`}</div>
      <div class="an-preco">${brl(preco)}</div></div>
      <div class="an-sobra ${sobraFinal >= cfg.lucro_min ? 'bom' : 'ruim'}">${sobraFinal >= cfg.lucro_min
        ? `✅ sobra ${brl(sobraFinal)} por venda`
        : `⚠️ com os custos de hoje sobra ${brl(sobraFinal)}. O tempero pronto pode custar até ${brl(Math.max(teto, 0))} o kg`}${brinde ? '<br>🎁 já com 1 sachê de brinde' : ''}</div></div>
    <div class="conta-kit"><b>🧮 Conta do kit (base)</b>
      <div><span>Preço de venda</span><span>${brl(k.preco)}</span></div>
      <div class="menos"><span>Shopee (${cfg.taxa_pct}% + ${brl(cfg.taxa_fixa)})</span><span>− ${brl(k.shopee)}</span></div>
      <div class="menos"><span>Imposto (${cfg.imposto_pct || 0}%)</span><span>− ${brl(k.imposto)}</span></div>
      <div class="menos"><span>Tempero (${kgOuG(un * g)} a ${brl(cpg * 1000)}/kg)</span><span>− ${brl(k.tempero)}</span></div>
      <div class="menos"><span>Saquinhos + etiquetas (${un} × ${brl(embUnidade(g, cfg))})</span><span>− ${brl(k.saquinhos)}</span></div>
      ${k.kit ? `<div class="menos"><span>Saquinho que junta o kit</span><span>− ${brl(k.kit)}</span></div>` : ''}
      ${k.brinde ? `<div class="menos"><span>🎁 Brinde (1 sachê de 10 g)</span><span>− ${brl(k.brinde)}</span></div>` : ''}
      <div class="total ${k.sobra >= cfg.lucro_min ? 'bom' : 'ruim'}"><span>Sobra para você</span><span>${brl(k.sobra)}</span></div>
      <small>Cada pacotinho pronto (tempero + saquinho + etiqueta) custa ${brl(k.porPacotinho)}. Os valores vêm da aba 🧾 Custos.</small>
    </div>
    ${bloco('Título', a.titulo)}
    ${bloco('Preço', preco.toFixed(2).replace('.', ','))}
    ${bloco('Descrição', a.descricao, true)}
    ${bloco('Texto para escrever na foto', a.foto.join('\n'))}
    ${bloco('Prompt da imagem (ChatGPT)', a.prompt, true)}
    ${bloco('Frete: peso e caixa', `Peso: ${String(a.frete.kg).replace('.', ',')} kg · Caixa: ${a.frete.caixa.join(' × ')} cm`)}
    ${bloco('Categoria', a.categoria)}
  </div>`;
}
function desenharAnuncios() {
  $('#an-prod').innerHTML = D.produtos.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
  const blocos = [];
  for (const prod of D.produtos) {
    const lista = D.concorrentes.filter((c) => c.produto_id === prod.id && tamanhoDe(c));
    if (!lista.length) continue;
    const cpg = tabelaProduto(prod, D.insumos, D.config, D.concorrentes, D.produtos).cpg;
    const vistos = new Set();
    // 1) jogada inteligente: mesmo nº de sachês de quem cobra mais caro por kg, mas com o peso completo
    for (const p of montagensPorPeso(lista, cpg, D.config)) {
      const i = p.ideia;
      if (!i || i.contra.un < 2) continue;
      vistos.add(`${i.un}x${i.g}`);
      blocos.push({ vendidos: i.contra.vendidos, html: cartaoAnuncio(prod, i.un, i.g, i.preco, cpg,
        `<div class="an-por">💡 Jogada inteligente · ${esc(prod.nome)}: contra "${esc(i.contra.top.anuncio)}" (${i.contra.un} × ${i.contra.g} g por ${brl(i.contra.top.preco)})</div>`) });
    }
    // 2) o mesmo kit do mais vendido de cada montagem, um pouco mais barato
    const grupos = new Map();
    for (const c of lista) { const { un, g } = montagem(c), k = `${un}x${g}`; (grupos.get(k) || grupos.set(k, []).get(k)).push(c); }
    for (const [k, itens] of grupos) {
      if (vistos.has(k)) continue;
      const top = [...itens].sort((a, b) => (b.vendidos || 0) - (a.vendidos || 0) || a.preco - b.preco)[0];
      const e = espelho(top, cpg, D.config);
      if (!e) continue;
      blocos.push({ vendidos: top.vendidos || 0, html: cartaoAnuncio(prod, e.un, e.g, e.preco, cpg,
        `<div class="an-por">🎯 ${esc(prod.nome)}: contra o mais vendido "${esc(top.anuncio)}" (${brl(top.preco)}${top.vendidos ? ', ' + mil(top.vendidos) + ' vendidos' : ''})</div>`) });
    }
  }
  $('#an-lista').innerHTML = blocos.sort((a, b) => b.vendidos - a.vendidos).map((b) => b.html).join('')
    || '<p class="suave">Jogue prints ou digite anúncios na aba 📷 Prints: os anúncios prontos aparecem aqui.</p>';
}
$('#f-anuncio').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, prod = D.produtos.find((p) => p.id === f.produto_id.value);
  const un = lerNumero(f.un.value) || 1, g = lerNumero(f.g.value), preco = lerNumero(f.preco.value);
  if (!(g > 0) || !(preco > 0)) return;
  const cpg = tabelaProduto(prod, D.insumos, D.config, D.concorrentes, D.produtos).cpg;
  $('#an-manual').innerHTML = cartaoAnuncio(prod, un, g, preco, cpg, '', f.brinde.checked);
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.copiar'); if (!b) return;
  const txt = b.closest('.cp').querySelector('pre').textContent;
  try { await navigator.clipboard.writeText(txt); } catch { const t = document.createElement('textarea'); t.value = txt; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  b.textContent = '✓ Copiado'; setTimeout(() => { b.textContent = 'Copiar'; }, 1500);
});
$('#rk-prod').addEventListener('change', () => { $('#rk-faixa').value = ''; desenharRanking(); });
$('#rk-faixa').addEventListener('change', desenharRanking);
$('#config').addEventListener('change', salvarCampo);

iniciar();
