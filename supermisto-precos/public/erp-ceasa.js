// Aba Ceasa: cotação em PDF → custo do quilo pronto → preço, lucro e kits.
import { B, $, brl, esc, lerNum, aviso, dataCurta, hojeISO } from './erp-base.js';
import { caixaAtual, custoKgPronto, custoUnidade, somaUso, faltando, analisarProduto, analisarKit, lerCotacao, configVenda, semaforo } from './ceasa.js';

let C = null, leitura = null, peso = 200, abertoSem = false;
const num2 = (v, c = 2) => (v == null || Number.isNaN(v) ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));
const ver = (v) => (v == null ? '' : String(v).replace('.', ','));

async function carregar() {
  C = await B.api('/api/ceasa/dados');
  C.cfg = { taxa_pct: 20, taxa_fixa: 4.5, imposto_pct: 6, lucro_min: 2, ...C.base };
  C.extra = C.config.extra_pct || 0;
  desenhar();
}
const cfgVenda = () => configVenda(C.cfg, C.extra);

/* ---------- leitura da cotação ---------- */
async function textoDoPdf(arquivo) {
  if (!window.pdfjsLib) {
    await new Promise((ok, falha) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = ok; s.onerror = () => falha(new Error('Não consegui abrir o leitor de PDF. Cole o texto da cotação.')); document.head.append(s); });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const pdf = await window.pdfjsLib.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const linhas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pag = await pdf.getPage(n), cont = await pag.getTextContent();
    const por = new Map();
    for (const it of cont.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      (por.get(y) || por.set(y, []).get(y)).push({ x: it.transform[4], t: it.str });
    }
    [...por.entries()].sort((a, b) => b[0] - a[0]).forEach(([, l]) => linhas.push(l.sort((a, b) => a.x - b.x).map((i) => i.t.trim()).join('  ')));
  }
  return linhas.join('\n');
}

async function lerArquivoOuTexto() {
  const f = $('#ce-arquivo').files[0], col = $('#ce-texto').value.trim();
  if (!f && !col) return aviso('Escolha o PDF da cotação ou cole o texto.', false);
  $('#ce-ler').disabled = true; $('#ce-ler').textContent = 'Lendo…';
  try {
    const texto = f ? (/\.pdf$/i.test(f.name) ? await textoDoPdf(f) : await f.text()) : col;
    if (f && texto.replace(/\s/g, '').length < 40) throw new Error('Esse PDF não tem texto (parece uma foto). Cole o texto ou mande o print.');
    leitura = lerCotacao(texto, C.produtos);
    leitura.texto = texto;
    desenharLeitura();
  } catch (er) { aviso(er.message, false); }
  $('#ce-ler').disabled = false; $('#ce-ler').textContent = '🔎 Ler cotação';
}

function desenharLeitura() {
  const alvo = $('#ce-leitura');
  if (!leitura) { alvo.innerHTML = ''; return; }
  const n = Object.keys(leitura.achados).length;
  alvo.innerHTML = `<h3>O que achei na cotação <small class="suave">(${leitura.linhas} linhas lidas)</small></h3>
    <label class="ce-data">Data da cotação <input type="date" id="ce-data" value="${leitura.data || hojeISO()}"></label>
    ${n ? '' : '<p class="ruim-txt">Não achei nenhum dos nossos produtos. Confira se é a cotação certa ou ajuste as palavras de cada produto.</p>'}
    <div class="ce-achados">${C.produtos.map((p) => {
      const c = leitura.achados[p.id];
      if (!c) return `<div class="ce-ach nao"><b>${esc(p.nome)}</b><small class="suave">Não está na cotação de hoje.</small></div>`;
      const a = c[0];
      return `<div class="ce-ach" data-pid="${p.id}"><label class="ce-inc"><input type="checkbox" class="ce-sel" checked> <b>${esc(p.nome)}</b></label>
        <select class="ce-cand">${c.map((x, i) => `<option value="${i}">${esc(x.linha)} → ${num2(x.preco)}</option>`).join('')}</select>
        <div class="ce-par"><label>Preço R$<input class="ce-preco mini" inputmode="decimal" value="${ver(a.preco)}"></label>
        <label>Peso da caixa/unidade (kg)<input class="ce-kg mini" inputmode="decimal" value="${ver(a.kg_unidade)}" placeholder="?"></label></div></div>`;
    }).join('')}</div>
    <button class="btn" id="ce-aplicar">✅ Usar estes preços</button> <button class="link" id="ce-cancelar">cancelar</button>`;
}

document.addEventListener('change', (e) => {
  const b = e.target.closest?.('.ce-ach'); if (!b || !leitura) return;
  if (e.target.classList.contains('ce-cand')) {
    const x = leitura.achados[b.dataset.pid][Number(e.target.value)];
    b.querySelector('.ce-preco').value = ver(x.preco); b.querySelector('.ce-kg').value = ver(x.kg_unidade);
  }
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'ce-ler') return lerArquivoOuTexto();
  if (e.target.id === 'ce-cancelar') { leitura = null; return desenharLeitura(); }
  if (e.target.id === 'ce-aplicar') {
    const itens = [...document.querySelectorAll('#ce-leitura .ce-ach[data-pid]')].filter((b) => b.querySelector('.ce-sel').checked).map((b) => {
      const x = leitura.achados[b.dataset.pid][Number(b.querySelector('.ce-cand').value)];
      return { produto_id: b.dataset.pid, preco: lerNum(b.querySelector('.ce-preco').value), kg_unidade: lerNum(b.querySelector('.ce-kg').value), linha: x?.linha, min: x?.min, max: x?.max, var12: x?.var12 };
    });
    if (itens.some((i) => !(i.kg_unidade > 0))) return aviso('Falta o peso da caixa (kg) em algum produto. Preencha ou tire o visto dele.', false);
    try { const r = await B.post('/api/ceasa/tabela', { data: $('#ce-data').value, itens }); aviso(`✅ ${r.atualizados} produto(s) atualizados.`); leitura = null; $('#ce-arquivo').value = ''; $('#ce-texto').value = ''; await carregar(); desenharLeitura(); }
    catch (er) { aviso(er.message, false); }
  }
});

/* ---------- desenho ---------- */
function corSobra(a) { return a.ok ? 'ok-txt' : 'ruim-txt'; }

function desenhar() {
  if (!C) return;
  const P = C.produtos, emb = C.embalagens, falta = faltando(emb);
  const sem = P.filter((p) => !caixaAtual(p));
  const analises = P.map((p) => analisarProduto(p, peso, emb, C.cfg, C.extra, C.concorrentes));
  const precoUn = Object.fromEntries(P.map((p, i) => [p.id, analises[i].preco || 0]));
  const kits = C.kits.map((k) => ({ kit: k, r: analisarKit(k, P, emb, C.cfg, C.extra, precoUn) }));
  const uni = C.config.unidades_mes || 0;
  const mediaSobra = analises.filter((a) => !a.semPreco).reduce((s, a, _, l) => s + a.sobra / l.length, 0);
  const mes = kits.reduce((s, { r, kit }) => s + r.sobra * (kit.vendas_mes || 0), 0) + mediaSobra * uni;

  const farol = semaforo(P, C.historico, analises, C.config.limite_caro_pct ?? 10);
  const cor = { verde: 'ce-verde', amarelo: 'ce-amarelo', vermelho: 'ce-vermelho', sem_dados: 'ce-cinza' }[farol.nivel];
  const rotulo = { bom: '🟢 bom', normal: '🟡 normal', caro: '🔴 caro', sem_dados: '⚪ sem dados' };
  $('#ce-semaforo').innerHTML = `<div class="ce-farol ${cor}"><button class="ce-sem-btn" id="ce-vou">🛒 Vou comprar hoje <span>${abertoSem ? '▲' : '▼'}</span></button>
    <div class="ce-sem-res"><b>${esc(farol.titulo)}</b><span>${esc(farol.texto)}</span></div></div>
    ${abertoSem ? `<div class="ce-sem-det"><table class="ce-tab"><tr><th>Produto</th><th>Hoje</th><th>Por quê</th></tr>${farol.lista.map((x) => `<tr><td><b>${esc(x.produto.nome)}</b></td><td>${rotulo[x.nivel]}</td><td>${esc(x.texto)}</td></tr>`).join('')}</table>
      ${farol.comprar.length ? `<p><b>Pode comprar:</b> ${esc(farol.comprar.join(', '))}.</p>` : ''}${farol.esperar.length ? `<p><b>Espere:</b> ${esc(farol.esperar.join(', '))}.</p>` : ''}
      <p class="suave">Compara com as cotações que você lançou nos últimos 7 dias; sem dias para comparar, usa a variação de 12 meses do boletim. Vira vermelho quando 2 ou mais produtos estão caros e passam de ${C.config.limite_caro_pct ?? 10}% dos produtos. Também conta como caro o produto que, a esse preço de caixa, não deixa o lucro mínimo.</p></div>` : ''}`;

  $('#ce-avisos').innerHTML = [
    falta.length ? `<p class="ce-alerta">⚠️ Faltam custos de embalagem: <b>${esc(falta.join(', '))}</b>. Enquanto não preencher (mais abaixo), o lucro aparece maior do que é.</p>` : '',
    sem.length ? `<p class="ce-alerta">⚠️ Sem preço de caixa ainda: <b>${esc(sem.map((p) => p.nome).join(', '))}</b>. Leia a cotação da Ceasa ou preencha à mão.</p>` : '',
  ].join('');

  $('#ce-kpis').innerHTML = `<div class="kpis">
    <div class="kpi ${mes > 0 ? 'bom' : ''}"><span>Lucro estimado do mês</span><b>${brl(mes)}</b><small>kits e avulsos que você marcou abaixo</small></div>
    <div class="kpi"><span>Embalagem por pacote</span><b>${brl(somaUso(emb, 'pacote'))}</b><small>+ ${brl(somaUso(emb, 'envio'))} se vai sozinho</small></div>
    <div class="kpi"><span>Cotação mais recente</span><b>${P.some((p) => p.tabela_em) ? dataCurta(P.map((p) => p.tabela_em).filter(Boolean).sort().pop()) : '–'}</b><small>${P.length - sem.length} de ${P.length} produtos com preço</small></div></div>`;

  // Matéria-prima
  $('#ce-materia').innerHTML = `<table class="ce-tab"><tr><th>Produto</th><th>Caixa (kg)</th><th>Preço da caixa</th><th>R$/kg fresco</th><th>Perda %</th><th>Rende %</th><th>Secar R$/kg</th><th>Custo kg pronto</th><th></th></tr>
    ${P.map((p) => { const k = custoKgPronto(p), c = caixaAtual(p); return `<tr data-pid="${p.id}">
      <td><b>${esc(p.nome)}</b>${c ? `<small class="suave">${c.origem === 'pago' ? 'paguei' : 'cotação'} ${c.em ? dataCurta(c.em) : ''}</small>` : '<small class="falta">sem preço</small>'}</td>
      <td><input class="mini" data-pc="caixa_kg" inputmode="decimal" value="${ver(p.caixa_kg)}"></td>
      <td><input class="mini" data-pc="preco_caixa" inputmode="decimal" value="${ver(p.preco_caixa)}"></td>
      <td>${k ? brl(k.frescoKg) : '–'}</td>
      <td><input class="mini" data-pc="perda_pct" inputmode="decimal" value="${ver(p.perda_pct)}"></td>
      <td><input class="mini" data-pc="rendimento_pct" inputmode="decimal" value="${ver(p.rendimento_pct)}"></td>
      <td><input class="mini" data-pc="secagem_kg" inputmode="decimal" value="${ver(p.secagem_kg)}"></td>
      <td><b>${k ? brl(k.prontoKg) : '–'}</b>${k ? `<small class="suave">${num2(k.kgProntoPorCaixa, 2)} kg por caixa</small>` : ''}</td>
      <td><button class="link" data-comprei="${p.id}">comprei</button>${p.pago_caixa ? ` <button class="link perigo" data-limpar-pago="${p.id}" title="Voltar a usar a cotação">×</button>` : ''}</td></tr>`; }).join('')}</table>
    <p class="suave">Perda = o que se joga fora ao limpar (casca, miolo, cabo). Rende = o que sobra depois de secar e moer. São números de partida: faça o 1º lote, pese, e ajuste aqui. <b>Comprei</b> guarda o preço que você pagou de verdade e passa a usar ele no lugar da cotação.</p>`;

  // Preço e lucro
  $('#ce-lucro').innerHTML = `<label class="ce-peso">Pacote de <select id="ce-peso">${[100, 200, 500].map((g) => `<option value="${g}"${g === peso ? ' selected' : ''}>${g} g</option>`).join('')}</select></label>
    <table class="ce-tab"><tr><th>Produto</th><th>Custo do pacote</th><th>Preço mínimo</th><th>Concorrente mais barato</th><th>Meu preço</th><th>Sobra</th><th>Pode pagar na caixa até</th></tr>
    ${analises.map((a) => { const p = a.produto; if (a.semPreco) return `<tr><td><b>${esc(p.nome)}</b></td><td colspan="6" class="falta">falta o preço da caixa</td></tr>`;
      const cm = a.maisBarato; return `<tr data-pid="${p.id}">
      <td><b>${esc(p.nome)}</b></td>
      <td>${brl(a.custo.total)}<small class="suave">tempero ${brl(a.custo.materia)} + emb. ${brl(a.custo.embalagem)}</small></td>
      <td>${brl(a.minimo)}</td>
      <td>${cm ? `${brl(cm.equivalente)}<small class="suave">${esc(cm.loja || 'concorrente')}</small>` : '<small class="suave">sem concorrente</small>'}</td>
      <td><input class="mini" data-pc="preco_venda" inputmode="decimal" value="${ver(a.preco)}" title="${a.usandoSugerido ? 'Sugestão do sistema' : 'Seu preço'}">${a.usandoSugerido ? '<small class="suave">sugerido</small>' : ''}</td>
      <td class="${corSobra(a)}"><b>${brl(a.sobra)}</b><small>${a.margemPct}%</small></td>
      <td class="${a.caixaOk ? 'ok-txt' : 'ruim-txt'}">${a.tetoCaixa != null ? brl(a.tetoCaixa) : '–'}<small>${a.caixaOk ? '✅ hoje compensa' : '❌ hoje não compensa'} (${brl(a.k.precoCaixa)})</small></td></tr>`; }).join('')}</table>
    <p class="suave">Sobra = o que fica depois da Shopee, do imposto e dos seus custos. “Pode pagar na caixa até” é o preço máximo da caixa para ainda sobrar o lucro mínimo vendendo ao preço escolhido. Vermelho = não compre a esse preço.</p>`;

  // Concorrentes
  $('#ce-conc').innerHTML = `<form id="ce-f-conc" class="ce-form"><select name="produto_id">${P.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select>
      <input name="loja" placeholder="Loja"><input name="gramas" inputmode="decimal" placeholder="Gramas" required><input name="preco" inputmode="decimal" placeholder="Preço R$" required><input name="vendidos" inputmode="numeric" placeholder="Vendidos"><button class="btn">Adicionar</button></form>
    ${C.concorrentes.length ? `<table class="ce-tab"><tr><th>Produto</th><th>Loja</th><th>Gramas</th><th>Preço</th><th>A cada 100 g</th><th>Vendidos</th><th></th></tr>
    ${C.concorrentes.slice(0, 80).map((c) => `<tr><td>${esc(P.find((p) => p.id === c.produto_id)?.nome || c.produto_id)}</td><td>${esc(c.loja || '–')}</td><td>${num2(c.gramas, 0)}</td><td>${brl(c.preco)}</td><td>${brl((c.preco / c.gramas) * 100)}</td><td>${c.vendidos ?? '–'}</td><td><button class="link perigo" data-apagar-conc="${c.id}">×</button></td></tr>`).join('')}</table>` : '<p class="suave">Nenhum concorrente ainda. Coloque os preços que você viu na Shopee.</p>'}`;

  // Kits
  $('#ce-kits').innerHTML = kits.map(({ kit, r }) => `<div class="ce-kit" data-kit="${kit.id}">
    <div class="ce-kit-cab"><input class="ce-nome" data-kc="nome" value="${esc(kit.nome)}"><button class="link perigo" data-apagar-kit="${kit.id}">apagar</button></div>
    <div class="ce-kit-itens">${r.itens.map((i, n) => `<div class="ce-item"><span>${esc(i.nome)}${i.semPreco ? ' <small class="falta">sem preço</small>' : ''}</span><input class="mini" data-ki="${n}" inputmode="numeric" value="${i.gramas}" aria-label="Gramas"><small>g</small><small class="suave">${i.materia == null ? '' : brl(i.materia)}</small><button class="link perigo" data-tirar="${n}" aria-label="Tirar">×</button></div>`).join('')}
      <div class="ce-item"><select class="ce-add">${'<option value="">+ juntar produto…</option>' + P.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></div></div>
    <div class="ce-kit-par"><label>Preço do kit R$<input class="mini" data-kc="preco" inputmode="decimal" value="${ver(kit.preco)}"></label><label>Vendas por mês<input class="mini" data-kc="vendas_mes" inputmode="numeric" value="${kit.vendas_mes || 0}"></label></div>
    <div class="kpis ce-kit-res"><div class="kpi ${r.ok ? 'bom' : 'ruim'}"><span>Sobra por kit</span><b>${brl(r.sobra)}</b><small>${r.ok ? 'passa do lucro mínimo' : 'abaixo do lucro mínimo'}</small></div>
      <div class="kpi"><span>Preço mínimo do kit</span><b>${brl(r.minimo)}</b><small>${r.preco > 0 && r.preco < r.minimo ? '❌ o seu está abaixo' : 'para sobrar o lucro mínimo'}</small></div>
      <div class="kpi"><span>No mês</span><b>${brl(r.sobraMes)}</b><small>${kit.vendas_mes || 0} kit(s)</small></div></div>
    <table class="ce-tab ce-conta"><tr><td>Preço do kit</td><td>${brl(r.preco)}</td></tr><tr><td>− Shopee (comissão + taxa fixa)</td><td>${brl(r.shopee)}</td></tr><tr><td>− Imposto</td><td>${brl(r.imposto)}</td></tr>
      <tr><td>− Tempero (${r.itens.length} pacotes, ${num2(r.gramasTotal, 0)} g)</td><td>${brl(r.materia)}</td></tr><tr><td>− Saquinho, solapa e etiqueta dos pacotes</td><td>${brl(r.embPacotes)}</td></tr><tr><td>− Caixa e enchimento do kit</td><td>${brl(r.embKit)}</td></tr>
      <tr class="tot"><td>Sobra</td><td class="${r.ok ? 'ok-txt' : 'ruim-txt'}">${brl(r.sobra)}</td></tr></table>
    <p class="suave">${r.porPacote ? `Cada pacote sai a ${brl(r.porPacote)} dentro do kit.` : ''}${r.economia != null ? ` Vendidos sozinhos (200 g) os mesmos produtos somariam ${brl(r.soltos)}: o cliente economiza uns ${r.economia}% no kit, e é isso que faz o kit vender.` : ''}${r.semPreco.length ? ` <b class="ruim-txt">Sem preço de caixa: ${esc(r.semPreco.join(', '))}.</b>` : ''}</p></div>`).join('')
    + '<button class="link" id="ce-novo-kit">+ Criar outro kit</button>'
    + `<label class="ce-un">Avulsos vendidos por mês (a sobra média deles entra no lucro do mês)<input class="mini" id="ce-unidades" inputmode="numeric" value="${uni}"></label>`;

  // Embalagens
  $('#ce-emb').innerHTML = `<table class="ce-tab"><tr><th>Embalagem</th><th>Onde entra</th><th>Quanto custou (R$)</th><th>Quantas vieram</th><th>Cada uma</th></tr>
    ${emb.map((e) => `<tr data-emb="${e.id}"><td>${esc(e.nome)}</td><td><small class="suave">${{ pacote: 'em cada pacote', envio: 'pacote vendido sozinho', kit: 'uma vez por kit' }[e.uso]}</small></td>
      <td><input class="mini" data-ec="preco" inputmode="decimal" value="${ver(e.preco)}" placeholder="preencher"></td><td><input class="mini" data-ec="quantidade" inputmode="numeric" value="${ver(e.quantidade)}" placeholder="preencher"></td>
      <td><b>${custoUnidade(e) ? brl(custoUnidade(e)) : '<span class="falta">falta</span>'}</b></td></tr>`).join('')}</table>
    <p class="suave">Exemplo: pacote de 1.000 saquinhos por R$ 80 → R$ 0,08 cada. Quando comprar de novo por outro preço, é só trocar aqui.</p>`;

  // Regras de venda
  const c = C.cfg;
  $('#ce-regras').innerHTML = `<div class="grade-campos">
    <label>Comissão da Shopee (%)<input class="mini" data-cf="taxa_pct" inputmode="decimal" value="${ver(c.taxa_pct)}"></label>
    <label>Taxa fixa por item (R$)<input class="mini" data-cf="taxa_fixa" inputmode="decimal" value="${ver(c.taxa_fixa)}"></label>
    <label>Imposto sobre a venda (%)<input class="mini" data-cf="imposto_pct" inputmode="decimal" value="${ver(c.imposto_pct)}"></label>
    <label>Extra do frete grátis (%)<input class="mini" data-cx="extra_pct" inputmode="decimal" value="${ver(C.extra)}"></label>
    <label>Lucro mínimo por pacote (R$)<input class="mini" data-cf="lucro_min" inputmode="decimal" value="${ver(c.lucro_min)}"></label>
    <label>Vermelho se mais de (% de produtos caros)<input class="mini" data-cx="limite_caro_pct" inputmode="decimal" value="${ver(C.config.limite_caro_pct ?? 10)}"></label></div>
    <p class="suave">O imposto muda conforme o regime da empresa (Simples, Lucro Presumido…): pergunte o percentual real ao contador e troque aqui. O extra do frete grátis só vale se você entrar nesse programa da Shopee: veja o percentual no Centro do Vendedor.</p>`;

  // Histórico de preços (últimos de cada produto)
  const hist = C.historico.slice(0, 40);
  $('#ce-hist').innerHTML = hist.length ? `<table class="ce-tab"><tr><th>Data</th><th>Produto</th><th>O quê</th><th>Preço</th><th>Peso</th><th>R$/kg</th></tr>${hist.map((h) => `<tr><td>${dataCurta(h.data)}</td><td>${esc(P.find((p) => p.id === h.produto_id)?.nome || h.produto_id)}</td><td>${h.tipo === 'compra' ? 'paguei' : 'cotação'}</td><td>${brl(h.preco)}</td><td>${num2(h.kg_unidade, 1)} kg</td><td>${brl(h.preco_kg)}</td></tr>`).join('')}</table>` : '<p class="suave">Quando ler a cotação, o histórico aparece aqui.</p>';
}

/* ---------- ações ---------- */
async function salvarProduto(pid, campo, valor) {
  const v = lerNum(valor);
  await B.post(`/api/ceasa/produto/${pid}`, { [campo]: v, ...(campo === 'preco_venda' ? { gramas_venda: peso } : {}) });
  const p = C.produtos.find((x) => x.id === pid); p[campo] = v; if (campo === 'preco_venda') p.gramas_venda = peso;
}
async function salvarKit(id) {
  const kit = C.kits.find((k) => k.id === id);
  await B.post('/api/ceasa/kit', { id: kit.id, nome: kit.nome, itens: kit.itens, preco: kit.preco, vendas_mes: kit.vendas_mes });
}

document.addEventListener('change', async (e) => {
  const t = e.target; if (!C || !t.closest?.('#aba-ceasa')) return;
  try {
    if (t.id === 'ce-peso') { peso = Number(t.value); return desenhar(); }
    if (t.dataset.pc) { await salvarProduto(t.closest('[data-pid]').dataset.pid, t.dataset.pc, t.value); return desenhar(); }
    if (t.dataset.ec) { const id = t.closest('[data-emb]').dataset.emb, e2 = C.embalagens.find((x) => x.id === id); e2[t.dataset.ec] = lerNum(t.value); await B.post(`/api/ceasa/embalagem/${id}`, { preco: e2.preco, quantidade: e2.quantidade }); return desenhar(); }
    if (t.dataset.cf) { const v = lerNum(t.value); await B.post('/api/config', { [t.dataset.cf]: v }); C.cfg[t.dataset.cf] = v; if (B.D) B.D.config[t.dataset.cf] = v; return desenhar(); }
    if (t.dataset.cx) { const v = lerNum(t.value); await B.post('/api/ceasa/config', { [t.dataset.cx]: v }); C.config[t.dataset.cx] = v; if (t.dataset.cx === 'extra_pct') C.extra = v; return desenhar(); }
    if (t.id === 'ce-unidades') { const v = Math.max(0, lerNum(t.value) || 0); await B.post('/api/ceasa/config', { unidades_mes: v }); C.config.unidades_mes = v; return desenhar(); }
    const kitEl = t.closest('[data-kit]');
    if (kitEl) {
      const kit = C.kits.find((k) => k.id === kitEl.dataset.kit);
      if (t.dataset.kc) kit[t.dataset.kc] = t.dataset.kc === 'nome' ? t.value : lerNum(t.value);
      else if (t.dataset.ki != null && t.dataset.ki !== '') kit.itens[Number(t.dataset.ki)].gramas = lerNum(t.value) || 0;
      else if (t.classList.contains('ce-add') && t.value) kit.itens.push({ produto_id: t.value, gramas: 100 });
      else return;
      await salvarKit(kit.id); desenhar();
    }
  } catch (er) { aviso(er.message, false); }
});

document.addEventListener('click', async (e) => {
  const t = e.target; if (!C || !t.closest?.('#aba-ceasa')) return;
  try {
    if (t.id === 'ce-vou' || t.closest?.('#ce-vou')) { abertoSem = !abertoSem; return desenhar(); }
    if (t.dataset.comprei) {
      const p = C.produtos.find((x) => x.id === t.dataset.comprei), c = caixaAtual(p);
      const preco = lerNum(prompt(`Quanto você PAGOU na caixa de ${p.nome}? (R$)`, c ? ver(c.preco) : ''));
      if (!(preco > 0)) return;
      const kgU = lerNum(prompt('Quantos kg tem essa caixa?', c ? ver(c.kg) : '')); if (!(kgU > 0)) return;
      await B.post('/api/ceasa/comprei', { produto_id: p.id, preco, kg_unidade: kgU, data: hojeISO() }); aviso('✅ Compra anotada. Os cálculos já usam o que você pagou.'); return carregar();
    }
    if (t.dataset.limparPago) { await B.post('/api/ceasa/comprei/limpar', { produto_id: t.dataset.limparPago }); return carregar(); }
    if (t.dataset.apagarConc) { await B.api(`/api/ceasa/concorrente/${t.dataset.apagarConc}`, { method: 'DELETE' }); return carregar(); }
    if (t.dataset.apagarKit && confirm('Apagar este kit?')) { await B.api(`/api/ceasa/kit/${t.dataset.apagarKit}`, { method: 'DELETE' }); return carregar(); }
    if (t.dataset.tirar != null && t.dataset.tirar !== '' && t.closest('[data-kit]')) {
      const kit = C.kits.find((k) => k.id === t.closest('[data-kit]').dataset.kit); kit.itens.splice(Number(t.dataset.tirar), 1);
      if (!kit.itens.length) return aviso('O kit precisa de pelo menos um produto.', false);
      await salvarKit(kit.id); return desenhar();
    }
    if (t.id === 'ce-novo-kit') { await B.post('/api/ceasa/kit', { nome: 'Novo kit', itens: C.produtos.slice(0, 3).map((p) => ({ produto_id: p.id, gramas: 100 })), preco: null, vendas_mes: 0 }); return carregar(); }
  } catch (er) { aviso(er.message, false); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'ce-f-conc') return;
  e.preventDefault();
  const f = e.target;
  try { await B.post('/api/ceasa/concorrente', { produto_id: f.produto_id.value, loja: f.loja.value, gramas: lerNum(f.gramas.value), preco: lerNum(f.preco.value), vendidos: lerNum(f.vendidos.value) }); aviso('✅ Concorrente anotado.'); await carregar(); }
  catch (er) { aviso(er.message, false); }
});

document.querySelector('.abas button[data-aba="ceasa"]')?.addEventListener('click', () => { carregar().catch((er) => aviso(er.message, false)); });
export { desenhar as desenharCeasa };
