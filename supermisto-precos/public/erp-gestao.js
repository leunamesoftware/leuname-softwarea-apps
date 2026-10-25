// Gestão: compras e matéria-prima, financeiro, relatórios e dados da empresa.
import { B, $, brl, esc, lerNum, dataCurta, hojeISO, kg, vendaValida, aviso, contaSku } from './erp-base.js';

/* ---------- 🛍️ Compras e matéria-prima ---------- */
function desenharCompras() {
  const E = B.E, sel = $('#cp-insumo'), atual = sel.value;
  sel.innerHTML = '<optgroup label="Matéria-prima (entra no estoque em kg)">' + E.insumos.map((i) => `<option value="${esc(i.nome)}">${esc(i.nome)}</option>`).join('') + '</optgroup>'
    + '<optgroup label="Outras compras"><option value="">Embalagem, etiqueta, frete ou outra</option></optgroup>';
  if (sel.dataset.ok && [...sel.options].some((o) => o.value === atual)) sel.value = atual;
  sel.dataset.ok = 1;
  modoCompra();
  if (!$('#f-compra').data.value) $('#f-compra').data.value = hojeISO();
  $('#mp-lista').innerHTML = `<table class="tab-mp"><tr><th>Matéria-prima</th><th>Em estoque</th><th>Mínimo</th><th>Custo/kg</th></tr>
    ${E.insumos.map((i) => `<tr class="${i.estoque_kg < i.minimo_kg ? 'baixo' : ''}" data-ins="${esc(i.nome)}"><td>${esc(i.nome)}</td>
      <td><input class="mini" name="estoque_kg" inputmode="decimal" value="${String(Math.round(i.estoque_kg * 1000) / 1000).replace('.', ',')}" aria-label="Estoque em kg"></td>
      <td><input class="mini" name="minimo_kg" inputmode="decimal" value="${String(i.minimo_kg).replace('.', ',')}" aria-label="Mínimo em kg"></td>
      <td>${brl(i.preco_kg)}</td></tr>`).join('')}</table>
    <p class="suave">Valor parado em matéria-prima: <b>${brl(E.insumos.reduce((t, i) => t + i.estoque_kg * i.preco_kg, 0))}</b></p>`;
  $('#cp-lista').innerHTML = E.compras.length ? `<table><tr><th>Data</th><th>Compra</th><th>Kg</th><th>Valor</th></tr>
    ${E.compras.slice(0, 60).map((c) => `<tr><td>${dataCurta(c.data)}</td><td>${esc(c.descricao)}<small class="suave">${c.fornecedor ? ' · ' + esc(c.fornecedor) : ''}</small></td><td>${c.rendeu_kg ? kg(c.rendeu_kg) : '–'}</td><td><b>${brl(c.valor)}</b></td></tr>`).join('')}</table>`
    : '<p class="suave">Nenhuma compra registrada ainda.</p>';
}
function modoCompra() {
  const mp = !!$('#cp-insumo').value;
  document.querySelectorAll('#f-compra .kg').forEach((l) => { l.hidden = !mp; });
  $('#cp-desc-l').hidden = mp;
}
document.addEventListener('change', async (e) => {
  if (e.target.id === 'cp-insumo') modoCompra();
  const tr = e.target.closest('#mp-lista [data-ins]');
  if (tr) {
    await B.post('/api/erp/insumo', { nome: tr.dataset.ins, estoque_kg: lerNum(tr.querySelector('[name=estoque_kg]').value), minimo_kg: lerNum(tr.querySelector('[name=minimo_kg]').value) }).catch((er) => aviso(er.message, false));
    const i = B.E.insumos.find((x) => x.nome === tr.dataset.ins); i.estoque_kg = lerNum(tr.querySelector('[name=estoque_kg]').value) || 0; i.minimo_kg = lerNum(tr.querySelector('[name=minimo_kg]').value) || 0;
    tr.classList.toggle('baixo', i.estoque_kg < i.minimo_kg); aviso('✅ Salvo.');
  }
});
$('#f-compra').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, insumo = f.insumo.value;
  const d = { insumo, descricao: insumo ? `${insumo}${f.comprado_kg.value ? ` ${f.comprado_kg.value} kg` : ''}` : f.descricao.value.trim(), fornecedor: f.fornecedor.value.trim(), valor: lerNum(f.valor.value),
    comprado_kg: lerNum(f.comprado_kg.value), rendeu_kg: lerNum(f.rendeu_kg.value), data: f.data.value, pago: f.pago.checked };
  if (insumo && !(d.comprado_kg > 0)) return aviso('Coloque quantos kg comprou.', false);
  try { await B.post('/api/erp/compra', d); f.valor.value = ''; f.comprado_kg.value = ''; f.rendeu_kg.value = ''; f.descricao.value = ''; aviso('✅ Compra registrada.'); await B.recarregar(); }
  catch (er) { aviso(er.message, false); }
});

/* ---------- 💵 Financeiro ---------- */
function desenharFinanceiro() {
  const E = B.E, campo = $('#fin-mes');
  if (!campo.value) campo.value = hojeISO().slice(0, 7);
  const mes = campo.value, doMes = E.lancamentos.filter((l) => l.vencimento.startsWith(mes));
  const s = (l) => l.reduce((t, x) => t + x.valor, 0);
  const ent = doMes.filter((l) => l.tipo === 'entrada'), sai = doMes.filter((l) => l.tipo === 'saida');
  const entPago = s(ent.filter((l) => l.pago)), saiPago = s(sai.filter((l) => l.pago));
  $('#fin-kpis').innerHTML = `<div class="kpis">
    <div class="kpi bom"><span>Entrou</span><b>${brl(entPago)}</b><small>${ent.filter((l) => !l.pago).length ? `+ ${brl(s(ent.filter((l) => !l.pago)))} a receber` : 'nada a receber'}</small></div>
    <div class="kpi ruim"><span>Saiu</span><b>${brl(saiPago)}</b><small>${sai.filter((l) => !l.pago).length ? `+ ${brl(s(sai.filter((l) => !l.pago)))} a pagar` : 'nada a pagar'}</small></div>
    <div class="kpi destaque"><span>Resultado do mês</span><b>${brl(entPago - saiPago)}</b><small>${entPago ? `margem ${Math.round(((entPago - saiPago) / entPago) * 100)}%` : ''}</small></div></div>`;
  const cats = {};
  doMes.forEach((l) => { cats[l.categoria] = cats[l.categoria] || { e: 0, s: 0 }; cats[l.categoria][l.tipo === 'entrada' ? 'e' : 's'] += l.valor; });
  $('#fin-dre').innerHTML = Object.keys(cats).length ? `<table class="dre">${Object.entries(cats).sort((a, b) => (b[1].e - b[1].s) - (a[1].e - a[1].s)).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="${v.e ? 'ok-txt' : 'ruim-txt'}">${v.e ? '+ ' + brl(v.e) : '− ' + brl(v.s)}</td></tr>`).join('')}
    <tr class="tot"><td>Resultado <small class="suave">(contando o que está em aberto)</small></td><td>${brl(s(ent) - s(sai))}</td></tr></table>` : '<p class="suave">Nada lançado neste mês.</p>';
  const abertos = E.lancamentos.filter((l) => !l.pago).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const hoje = hojeISO();
  $('#fin-abertos').innerHTML = abertos.length ? abertos.slice(0, 15).map((l) => `<div class="lanc ${l.vencimento < hoje ? 'vencido' : ''}" data-lanc="${l.id}">
      <span>${dataCurta(l.vencimento)}</span><span>${esc(l.descricao)}</span><b class="${l.tipo === 'entrada' ? 'ok-txt' : 'ruim-txt'}">${l.tipo === 'entrada' ? '+' : '−'} ${brl(l.valor)}</b>
      <button class="link" data-pagar="1">${l.tipo === 'entrada' ? 'recebi' : 'paguei'}</button></div>`).join('') : '<p class="ok-txt">✅ Nada em aberto.</p>';
  $('#fin-lista').innerHTML = doMes.length ? doMes.map((l) => `<div class="lanc ${l.pago ? '' : 'aberto'}" data-lanc="${l.id}">
      <span>${dataCurta(l.vencimento)}</span><span>${esc(l.descricao)}<small>${esc(l.categoria)}${l.pago ? '' : ' · em aberto'}</small></span>
      <b class="${l.tipo === 'entrada' ? 'ok-txt' : 'ruim-txt'}">${l.tipo === 'entrada' ? '+' : '−'} ${brl(l.valor)}</b>
      ${l.pedido_id ? '' : `<button class="link perigo" data-apagar="1" aria-label="Apagar">×</button>`}</div>`).join('') : '<p class="suave">Nada lançado neste mês.</p>';
  if (!$('#f-lanc').vencimento.value) $('#f-lanc').vencimento.value = hojeISO();
}
document.addEventListener('change', (e) => { if (e.target.id === 'fin-mes') desenharFinanceiro(); });
document.addEventListener('click', async (e) => {
  const l = e.target.closest('[data-lanc]'); if (!l) return;
  try {
    if (e.target.dataset.pagar) { await B.post(`/api/erp/lancamento/${l.dataset.lanc}`, { pago: true }); aviso('✅ Baixado.'); await B.recarregar(); }
    if (e.target.dataset.apagar && confirm('Apagar este lançamento?')) { await B.post(`/api/erp/lancamento/${l.dataset.lanc}`, { apagar: true }); await B.recarregar(); }
  } catch (er) { aviso(er.message, false); }
});
$('#f-lanc').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await B.post('/api/erp/lancamento', { tipo: f.tipo.value, categoria: f.categoria.value, descricao: f.descricao.value.trim(), valor: lerNum(f.valor.value), vencimento: f.vencimento.value, pago: f.pago.checked });
    f.descricao.value = ''; f.valor.value = ''; aviso('✅ Lançado.'); await B.recarregar();
  } catch (er) { aviso(er.message, false); }
});

/* ---------- 📈 Relatórios ---------- */
function desenharRelatorios() {
  const E = B.E, dias = Number($('#rel-periodo').value);
  const ped = E.pedidos.filter(vendaValida).filter((p) => Date.now() - new Date(p.criado_em) < dias * 864e5);
  const fat = ped.reduce((t, p) => t + p.total, 0), itens = ped.flatMap((p) => p.itens);
  const liq = ped.filter((p) => p.liquido != null);
  $('#rel-kpis').innerHTML = `<div class="kpis"><div class="kpi destaque"><span>Faturamento</span><b>${brl(fat)}</b><small>${ped.length} pedido(s)</small></div>
    <div class="kpi"><span>Ticket médio</span><b>${brl(ped.length ? fat / ped.length : 0)}</b></div>
    <div class="kpi"><span>Itens vendidos</span><b>${itens.reduce((t, i) => t + i.qtd, 0)}</b></div>
    <div class="kpi"><span>Shopee repassou</span><b>${brl(liq.reduce((t, p) => t + p.liquido, 0))}</b><small>${liq.length ? `de ${brl(liq.reduce((t, p) => t + p.total, 0))} vendidos (${Math.round((1 - liq.reduce((t, p) => t + p.liquido, 0) / liq.reduce((t, p) => t + p.total, 0)) * 100)}% em taxas)` : 'sem repasse ainda'}</small></div></div>`;
  const por = {};
  itens.forEach((i) => { const k = i.sku || i.nome; por[k] = por[k] || { nome: E.skus.find((s) => s.id === i.sku)?.nome || i.nome, sku: i.sku, qtd: 0, valor: 0 }; por[k].qtd += i.qtd; por[k].valor += i.qtd * (i.preco || 0); });
  const lista = Object.values(por).sort((a, b) => b.valor - a.valor);
  $('#rel-produtos').innerHTML = lista.length ? `<table><tr><th>Produto</th><th>Qtd</th><th>Faturou</th><th>% do total</th></tr>${lista.map((x) => `<tr><td>${esc(x.nome)}</td><td>${x.qtd}</td><td><b>${brl(x.valor)}</b></td><td><div class="pct"><i style="width:${fat ? (x.valor / fat) * 100 : 0}%"></i><span>${fat ? Math.round((x.valor / fat) * 100) : 0}%</span></div></td></tr>`).join('')}</table>` : '<p class="suave">Nenhuma venda no período.</p>';
  const canal = { Shopee: ped.filter((p) => p.origem === 'shopee'), 'Fora da Shopee': ped.filter((p) => p.origem === 'manual') };
  $('#rel-canal').innerHTML = Object.entries(canal).map(([c, l]) => `<div class="barra-h"><span>${c}</span><i style="width:${fat ? (l.reduce((t, p) => t + p.total, 0) / fat) * 100 : 0}%"></i><b>${brl(l.reduce((t, p) => t + p.total, 0))}</b></div>`).join('');
  const margens = E.skus.filter((s) => s.ativo && s.preco > 0).map((s) => ({ s, c: contaSku(s) })).sort((a, b) => a.c.conta.sobra - b.c.conta.sobra);
  $('#rel-margem').innerHTML = margens.length ? `<table><tr><th>Produto</th><th>Preço</th><th>Sobra</th></tr>${margens.slice(0, 15).map(({ s, c }) => `<tr><td>${esc(s.nome)}</td><td>${brl(s.preco)}</td><td class="${c.conta.sobra >= B.D.config.lucro_min ? 'ok-txt' : 'ruim-txt'}"><b>${brl(c.conta.sobra)}</b></td></tr>`).join('')}</table><p class="suave">Do menor para o maior lucro. Os de vermelho estão abaixo do seu lucro mínimo.</p>` : '<p class="suave">Coloque preço nos produtos para ver a margem.</p>';
}
document.addEventListener('change', (e) => { if (e.target.id === 'rel-periodo') desenharRelatorios(); });

/* ---------- ⚙️ Empresa ---------- */
function desenharEmpresa() {
  const f = $('#f-empresa'), e = B.E.empresa || {};
  if (f.dataset.ok) return;
  ['nome', 'cnpj', 'endereco', 'cidade', 'uf', 'cep', 'telefone'].forEach((k) => { f[k].value = e[k] || ''; });
  f.dataset.ok = 1;
}
$('#f-empresa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(['nome', 'cnpj', 'endereco', 'cidade', 'uf', 'cep', 'telefone'].map((k) => [k, f[k].value.trim()]));
  try { await B.post('/api/erp/empresa', d); B.E.empresa = d; aviso('✅ Dados da empresa salvos.'); } catch (er) { aviso(er.message, false); }
});

B.desenhar.push(desenharCompras, desenharFinanceiro, desenharRelatorios, desenharEmpresa);
