// Vendas: painel, pedidos (envio, etiquetas, lista de separação), venda fora da Shopee e clientes.
import { impressora, imprimirCartoes } from './erp-impressao.js';
import { B, $, brl, esc, lerNum, dataHora, dataCurta, hojeISO, STATUS, ENVIO, vendaValida, aviso, abrirAba, contaSku, barras, area, rosca, imprimir, linhaItem, lerItens } from './erp-base.js';

const dia = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const atrasado = (p) => p.prazo_envio && p.envio && p.envio !== 'enviado' && new Date(p.prazo_envio) < new Date() && vendaValida(p);
const nomeCliente = (p) => (p.destinatario?.nome || p.cliente || '').trim();

/* ---------- 📊 Painel ---------- */
function desenharPainel() {
  const E = B.E, validos = E.pedidos.filter(vendaValida), hoje = hojeISO(), mes = hoje.slice(0, 7);
  const doDia = validos.filter((p) => dia(p.criado_em) === hoje), doMes = validos.filter((p) => dia(p.criado_em).startsWith(mes));
  const soma = (l) => l.reduce((t, p) => t + (p.total || 0), 0);
  const lancMes = E.lancamentos.filter((l) => l.vencimento.startsWith(mes) && l.pago);
  const entradas = lancMes.filter((l) => l.tipo === 'entrada').reduce((t, l) => t + l.valor, 0), saidas = lancMes.filter((l) => l.tipo === 'saida').reduce((t, l) => t + l.valor, 0);
  const aEnviar = validos.filter((p) => p.envio && p.envio !== 'enviado');
  const mesAnt = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return dia(d.toISOString()).slice(0, 7); })();
  const doMesAnt = validos.filter((p) => dia(p.criado_em).startsWith(mesAnt));
  // mesmo pedaço do mês passado (até o mesmo dia), para comparar de forma justa
  const hojeDia = hoje.slice(8, 10), ateHojeAnt = doMesAnt.filter((p) => dia(p.criado_em).slice(8, 10) <= hojeDia);
  const vMes = soma(doMes), vAnt = soma(ateHojeAnt), delta = vAnt > 0 ? ((vMes - vAnt) / vAnt) * 100 : null;
  const dias = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return dia(d.toISOString()); });
  const porDia = dias.map((d) => soma(validos.filter((p) => dia(p.criado_em) === d))), rot = dias.map((d) => d.slice(8, 10) + '/' + d.slice(5, 7));
  const atrasados = aEnviar.filter(atrasado).length;
  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  $('#painel-hero').innerHTML = `<div class="hero-p">
      <div class="hero-top"><div><small>${data}</small><span>Vendas no mês</span><b>${brl(vMes)}</b>
        ${delta === null ? '<em>primeiro mês com vendas</em>' : `<em class="${delta >= 0 ? 'sobe' : 'desce'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}% <small>vs. mesmo período do mês passado</small></em>`}</div></div>
      <div class="hero-graf">${area(porDia.slice(-14), rot.slice(-14), { altura: 70, claro: true })}</div>
      <div class="hero-kpis">
        <div><span>Hoje</span><b>${brl(soma(doDia))}</b><small>${doDia.length} pedido(s)</small></div>
        <div><span>Ticket médio</span><b>${brl(doMes.length ? vMes / doMes.length : 0)}</b><small>${doMes.length} pedido(s) no mês</small></div>
        <div class="${entradas - saidas >= 0 ? '' : 'ruim'}"><span>Caixa do mês</span><b>${brl(entradas - saidas)}</b><small>entrou ${brl(entradas)}</small></div>
        <div data-ir-pedidos="enviar" class="${atrasados ? 'ruim' : ''}"><span>A enviar</span><b>${aEnviar.length}</b><small>${atrasados ? `${atrasados} atrasado(s)` : 'nenhum atrasado'}</small></div>
      </div>
    </div>`;
  $('#painel-total30').textContent = brl(porDia.reduce((a, b) => a + b, 0));
  $('#painel-grafico').innerHTML = area(porDia, rot);
  const shopee = soma(doMes.filter((p) => p.origem !== 'manual')), fora = soma(doMes.filter((p) => p.origem === 'manual'));
  $('#painel-canais').innerHTML = vMes ? rosca([['Shopee', shopee, '#EE4D2D'], ['Fora da Shopee', fora, '#5E1675']], { centro: doMes.length + ' ped.' }) : '<p class="suave">Nenhuma venda este mês ainda.</p>';
  const env = [['Preparar', validos.filter((p) => p.envio === 'a_preparar').length, '#E0A22B'], ['Imprimir etiqueta', validos.filter((p) => p.envio === 'pronto').length, '#7B1F95'],
    ['Postar', validos.filter((p) => p.envio === 'etiqueta_impressa').length, '#3B6EA8'], ['Enviados no mês', doMes.filter((p) => p.envio === 'enviado').length, '#2E9E5B']];
  $('#painel-envios').innerHTML = env.some(([, v]) => v) ? rosca(env, { formato: (v) => String(v), centro: aEnviar.length + ' a enviar' }) : '<p class="suave">Nenhum envio ainda.</p>';
  const alertas = [];
  const atr = aEnviar.filter(atrasado);
  if (atr.length) alertas.push(['ruim', `${atr.length} pedido(s) <b>atrasado(s)</b> para enviar`, 'pedidos']);
  const prep = validos.filter((p) => p.envio === 'a_preparar').length, etq = validos.filter((p) => p.envio === 'pronto').length, postar = validos.filter((p) => p.envio === 'etiqueta_impressa').length;
  if (prep) alertas.push(['alerta', `${prep} pedido(s) para <b>preparar o envio</b>`, 'pedidos']);
  if (etq) alertas.push(['alerta', `${etq} etiqueta(s) para <b>imprimir</b>`, 'pedidos']);
  if (postar) alertas.push(['info', `${postar} pacote(s) com etiqueta para <b>postar</b>`, 'pedidos']);
  const baixo = E.skus.filter((s) => s.ativo && s.estoque <= s.estoque_min).length;
  if (baixo) alertas.push(['alerta', `${baixo} produto(s) com <b>estoque baixo</b>`, 'estoque']);
  const mpBaixa = E.insumos.filter((i) => i.estoque_kg < i.minimo_kg).length;
  if (mpBaixa) alertas.push(['info', `${mpBaixa} matéria(s)-prima(s) abaixo do mínimo`, 'compras']);
  const contas = E.lancamentos.filter((l) => !l.pago && l.tipo === 'saida' && l.vencimento <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  if (contas.length) alertas.push([contas.some((l) => l.vencimento < hoje) ? 'ruim' : 'alerta', `${contas.length} conta(s) a pagar nos próximos 7 dias (${brl(contas.reduce((t, l) => t + l.valor, 0))})`, 'financeiro']);
  const semPreco = E.skus.filter((s) => s.ativo && !(s.preco > 0)).length;
  if (semPreco) alertas.push(['info', `${semPreco} produto(s) <b>sem preço</b>`, 'produtos']);
  if (!E.shopee.conectada) alertas.push(['info', 'Loja da Shopee ainda <b>não ligada</b> ao ERP', 'loja']);
  $('#painel-alertas').innerHTML = alertas.length ? `<ul class="alertas">${alertas.map(([t, txt, aba]) => `<li class="${t}" data-ir="${aba}"><div>${txt}</div><span>›</span></li>`).join('')}</ul>` : '<p class="ok-txt">✅ Tudo em dia.</p>';
  const top = {};
  doMes.forEach((p) => p.itens.forEach((i) => { const k = i.sku || i.nome; top[k] = top[k] || { nome: E.skus.find((s) => s.id === i.sku)?.nome || i.nome, qtd: 0, valor: 0 }; top[k].qtd += i.qtd; top[k].valor += i.qtd * (i.preco || 0); }));
  const lt = Object.values(top).sort((a, b) => b.qtd - a.qtd).slice(0, 6), mx = Math.max(1, ...lt.map((x) => x.qtd));
  $('#painel-top').innerHTML = lt.length ? lt.map((x) => `<div class="barra-h"><span>${esc(x.nome)}</span><i style="width:${(x.qtd / mx) * 100}%"></i><b>${x.qtd}</b></div>`).join('') : '<p class="suave">Nenhuma venda este mês ainda.</p>';
  $('#painel-ultimos').innerHTML = E.pedidos.slice(0, 6).map((p) => `<div class="mini-ped" data-ir="pedidos"><b>${esc(p.id)}</b><span>${esc(nomeCliente(p) || '—')}</span><span class="st-${p.status}">${STATUS[p.status] || p.status}</span><b>${brl(p.total)}</b></div>`).join('') || '<p class="suave">Nenhum pedido ainda.</p>';
}
document.addEventListener('click', (e) => {
  const at = e.target.closest('[data-atalho]');
  if (at) {
    const t = at.dataset.atalho;
    if (t === 'nova') { abrirAba('pedidos'); setTimeout(() => $('#ped-nova')?.click(), 50); }
    else if (t === 'buscar') { abrirAba('pedidos'); setTimeout(() => $('#ped-buscar')?.click(), 50); }
    else if (t === 'etiquetas') { filtroPed = 'pronto'; abrirAba('pedidos'); }
    else abrirAba(t);
    return;
  }
  const k = e.target.closest('[data-ir-pedidos]'); if (k) { filtroPed = k.dataset.irPedidos; abrirAba('pedidos'); return; }
  const a = e.target.closest('#aba-painel [data-ir]'); if (a) abrirAba(a.dataset.ir);
});

/* ---------- 🧾 Pedidos ---------- */
let filtroPed = 'enviar', buscaPed = '';
const sel = new Set();
const FILTROS = [
  ['enviar', 'A enviar', (p) => vendaValida(p) && p.envio && p.envio !== 'enviado'],
  ['a_preparar', 'Preparar envio', (p) => vendaValida(p) && p.envio === 'a_preparar'],
  ['pronto', 'Imprimir etiqueta', (p) => vendaValida(p) && p.envio === 'pronto'],
  ['etiqueta_impressa', 'Postar', (p) => vendaValida(p) && p.envio === 'etiqueta_impressa'],
  ['enviado', 'Enviados', (p) => p.envio === 'enviado' && p.status !== 'COMPLETED'],
  ['concluido', 'Concluídos', (p) => p.status === 'COMPLETED'],
  ['unpaid', 'Aguardando pagamento', (p) => p.status === 'UNPAID'],
  ['cancelado', 'Cancelados', (p) => ['CANCELLED', 'IN_CANCEL'].includes(p.status)],
  ['manual', 'Fora da Shopee', (p) => p.origem === 'manual'],
  ['todos', 'Todos', () => true],
];
function desenharPedidos() {
  const E = B.E;
  const n = (f) => E.pedidos.filter(f).length;
  $('#ped-filtros').innerHTML = FILTROS.map(([k, t, f]) => `<button data-fped="${k}" class="${k === filtroPed ? 'ativo' : ''}">${t} <em>${n(f)}</em></button>`).join('');
  const aEnviar = n(FILTROS[0][2]);
  const badge = $('#badge-pedidos'); badge.hidden = !aEnviar; badge.textContent = aEnviar;
  const validos = E.pedidos.filter(vendaValida), hoje = hojeISO();
  const somaDias = (d) => validos.filter((p) => Date.now() - new Date(p.criado_em) < d * 864e5).reduce((t, p) => t + p.total, 0);
  $('#ped-resumo').innerHTML = `<div class="kpis"><div class="kpi"><span>Hoje</span><b>${brl(validos.filter((p) => dia(p.criado_em) === hoje).reduce((t, p) => t + p.total, 0))}</b></div>
    <div class="kpi"><span>7 dias</span><b>${brl(somaDias(7))}</b></div><div class="kpi"><span>30 dias</span><b>${brl(somaDias(30))}</b></div>
    <div class="kpi ${aEnviar ? 'alerta' : ''}"><span>A enviar</span><b>${aEnviar}</b></div></div>`;
  const f = FILTROS.find((x) => x[0] === filtroPed)[2], q = buscaPed.toLowerCase();
  const lista = E.pedidos.filter(f).filter((p) => !q || [p.id, nomeCliente(p), p.destinatario?.cidade, ...p.itens.map((i) => i.nome)].join(' ').toLowerCase().includes(q));
  $('#ped-lista').innerHTML = lista.map(cartaoPedido).join('') || `<div class="vazio">📭<p>Nenhum pedido aqui.</p>${E.shopee.conectada ? '' : '<p class="suave">Os pedidos da Shopee chegam sozinhos depois que a loja for ligada (🛒 Loja Shopee).</p>'}</div>`;
  desenharSelecao();
}
function cartaoPedido(p) {
  const d = p.destinatario || {}, manual = p.origem === 'manual', temEnd = !!(d.endereco && d.cidade);
  const acoes = [];
  if (vendaValida(p)) {
    if (!manual && p.envio === 'a_preparar') acoes.push('<button class="btn sec" data-acao="preparar">🚚 Preparar envio</button>');
    if (!manual && ['pronto', 'etiqueta_impressa'].includes(p.envio)) acoes.push('<button class="btn" data-acao="etiqueta">🖨️ Etiqueta</button>');
    if (manual && temEnd) acoes.push('<button class="btn" data-acao="etiqueta">🖨️ Etiqueta</button>', '<button class="btn sec" data-acao="declaracao">📄 Declaração</button>');
    if (p.envio === 'etiqueta_impressa' || (manual && p.envio && p.envio !== 'enviado')) acoes.push('<button class="btn sec" data-acao="enviado">📮 Postei</button>');
    if (manual) acoes.push('<button class="btn sec" data-acao="recibo">🧾 Recibo</button>');
    if (manual && p.status !== 'COMPLETED') acoes.push('<button class="btn sec" data-acao="concluir">✓ Entregue</button>');
    if (manual) acoes.push('<button class="link perigo" data-acao="cancelar">Cancelar</button>');
  }
  const selecionavel = vendaValida(p) && p.envio && p.envio !== 'enviado';
  return `<div class="card pedido ${atrasado(p) ? 'atrasado' : ''}" data-ped="${esc(p.id)}">
    <div class="ped-topo">${selecionavel ? `<input type="checkbox" class="ped-sel" ${sel.has(p.id) ? 'checked' : ''} aria-label="Selecionar pedido">` : ''}
      <b>${esc(p.id)}</b><span class="tag t-${p.origem}">${manual ? 'Fora da Shopee' : 'Shopee'}</span>
      <span class="st st-${p.status}">${p.envio && p.envio !== 'enviado' && vendaValida(p) ? ENVIO[p.envio] : STATUS[p.status] || p.status}</span></div>
    <div class="ped-corpo">
      <div><div class="suave">${dataHora(p.criado_em)}${p.prazo_envio && p.envio !== 'enviado' ? ` · enviar até <b class="${atrasado(p) ? 'ruim-txt' : ''}">${dataCurta(p.prazo_envio)}</b>` : ''}</div>
        <div class="cli">${esc(nomeCliente(p) || '—')}${d.cidade ? ` · ${esc(d.cidade)}/${esc(d.uf)}` : ''}${p.transportadora ? ` · ${esc(p.transportadora)}` : ''}${p.rastreio ? ` · rastreio <b>${esc(p.rastreio)}</b>` : ''}</div>
        <ul>${p.itens.map((i) => `<li><b>${i.qtd}×</b> ${esc(B.E.skus.find((s) => s.id === i.sku)?.nome || i.nome)}${i.sku ? '' : ' <span class="ruim-txt">(sem SKU: não saiu do estoque)</span>'}</li>`).join('')}</ul></div>
      <div class="ped-val"><b>${brl(p.total)}</b>${p.liquido != null ? `<small>recebe ${brl(p.liquido)}</small>` : ''}${p.pagamento ? `<small>${esc(p.pagamento)}</small>` : ''}</div>
    </div>
    ${acoes.length ? `<div class="ped-acoes">${acoes.join('')}</div>` : ''}
  </div>`;
}
function desenharSelecao() {
  const visiveis = new Set([...document.querySelectorAll('#ped-lista [data-ped]')].map((x) => x.dataset.ped));
  [...sel].forEach((id) => { if (!visiveis.has(id)) sel.delete(id); });
  $('#ped-acoes').hidden = !sel.size;
  $('#ped-qtd').textContent = `${sel.size} selecionado(s)`;
}
document.addEventListener('input', (e) => { if (e.target.id === 'ped-busca') { buscaPed = e.target.value; desenharPedidos(); } });
document.addEventListener('change', (e) => {
  if (!e.target.classList.contains('ped-sel')) return;
  const id = e.target.closest('[data-ped]').dataset.ped;
  e.target.checked ? sel.add(id) : sel.delete(id); desenharSelecao();
});
document.addEventListener('click', async (e) => {
  const fb = e.target.closest('[data-fped]');
  if (fb) { filtroPed = fb.dataset.fped; sel.clear(); desenharPedidos(); return; }
  if (e.target.id === 'ped-buscar') {
    e.target.disabled = true;
    try { const r = await B.post('/api/shopee/pedidos'); aviso(`✅ ${r.novos} pedido(s) novo(s).`); await B.recarregar(); }
    catch (er) { aviso(er.message, false); } finally { e.target.disabled = false; }
    return;
  }
  const lote = e.target.closest('[data-lote]')?.dataset.lote;
  if (lote) {
    const pedidos = B.E.pedidos.filter((p) => sel.has(p.id));
    if (lote === 'limpar') { sel.clear(); desenharPedidos(); }
    if (lote === 'separacao') imprimirSeparacao(pedidos);
    if (lote === 'preparar') await preparar(pedidos.filter((p) => p.origem === 'shopee' && p.envio === 'a_preparar'));
    if (lote === 'etiqueta') etiquetas(pedidos);
    if (lote === 'cartao') imprimirCartoes(pedidos.map(nomeCliente));
    return;
  }
  const b = e.target.closest('[data-acao]'); if (!b) return;
  const p = B.E.pedidos.find((x) => x.id === b.closest('[data-ped]').dataset.ped);
  const ac = b.dataset.acao;
  try {
    if (ac === 'preparar') await preparar([p]);
    if (ac === 'etiqueta') etiquetas([p]);
    if (ac === 'declaracao') imprimirDeclaracao(p);
    if (ac === 'recibo') imprimirRecibo(p);
    if (ac === 'enviado') {
      const r = prompt('Código de rastreio (opcional):', p.rastreio || '');
      if (r === null) return;
      await B.post(`/api/erp/pedido/${p.id}`, { envio: 'enviado', rastreio: r, status: p.origem === 'manual' ? 'SHIPPED' : undefined });
      aviso('✅ Marcado como enviado.'); await B.recarregar();
    }
    if (ac === 'concluir') { await B.post(`/api/erp/pedido/${p.id}`, { status: 'COMPLETED' }); aviso('✅ Pedido concluído.'); await B.recarregar(); }
    if (ac === 'cancelar' && confirm(`Cancelar ${p.id}? Os produtos voltam para o estoque e sai do financeiro.`)) { await B.post(`/api/erp/pedido/${p.id}`, { status: 'CANCELLED' }); aviso('Pedido cancelado.'); await B.recarregar(); }
  } catch (er) { aviso(er.message, false); }
});
async function preparar(pedidos) {
  if (!pedidos.length) return aviso('Nenhum pedido da Shopee para preparar nessa seleção.', false);
  aviso(`Preparando ${pedidos.length} envio(s)…`);
  const r = await B.post('/api/erp/preparar', { pedidos: pedidos.map((p) => p.id) });
  aviso(r.erros.length ? `⚠️ ${r.feitos.length} pronto(s), ${r.erros.length} com erro: ${r.erros[0]}` : `✅ ${r.feitos.length} pronto(s). Agora imprima as etiquetas.`, !r.erros.length);
  await B.recarregar();
}
function etiquetas(pedidos) {
  const shopee = pedidos.filter((p) => p.origem === 'shopee' && ['pronto', 'etiqueta_impressa'].includes(p.envio));
  const manuais = pedidos.filter((p) => p.origem === 'manual' && p.destinatario?.endereco);
  if (shopee.length) window.open(`/api/erp/etiqueta?papel=${impressora()}&pedidos=${encodeURIComponent(shopee.map((p) => p.id).join(','))}`, '_blank');
  if (manuais.length) imprimirEtiquetas(manuais);
  const faltou = pedidos.filter((p) => p.origem === 'shopee' && p.envio === 'a_preparar');
  if (faltou.length) aviso(`${faltou.length} pedido(s) ainda precisam de "Preparar envio" antes da etiqueta.`, false);
  if (!shopee.length && !manuais.length && !faltou.length) aviso('Nada para imprimir nessa seleção.', false);
  if (shopee.length) setTimeout(() => B.recarregar(), 5000);
}

/* ---------- impressão ---------- */
const emp = () => B.E.empresa || {};
const blocoEnd = (t, d) => `<div class="end"><small>${t}</small><b>${esc(d.nome)}</b><br>${esc(d.endereco)}<br>${esc(d.cidade)}${d.uf ? ' / ' + esc(d.uf) : ''}${d.cep ? `<br><b class="cep">CEP ${esc(d.cep)}</b>` : ''}${d.telefone ? `<br>Tel. ${esc(d.telefone)}` : ''}</div>`;
const remetente = () => { const e = emp(); return { nome: e.nome, endereco: e.endereco, cidade: e.cidade, uf: e.uf, cep: e.cep, telefone: e.telefone }; };
function imprimirEtiquetas(pedidos) {
  imprimir('Etiquetas', pedidos.map((p) => `<section class="etq">
      <div class="etq-topo"><img src="${location.origin}/logo-supermisto.png" alt=""><div><b>PEDIDO ${esc(p.id)}</b><br>${dataCurta(p.criado_em)}</div></div>
      ${blocoEnd('DESTINATÁRIO', p.destinatario)}
      ${blocoEnd('REMETENTE', remetente())}
      <div class="cont">${p.itens.map((i) => `${i.qtd}× ${esc(i.nome)}`).join(' · ')}</div>
    </section>`).join(''),
  (impressora() === 'termica' ? '@page{size:100mm 150mm;margin:0}' : '@page{size:A4;margin:0}body>section{float:left}')
   + `.etq{width:100mm;height:${impressora() === 'termica' ? 150 : 148}mm;padding:6mm;page-break-after:${impressora() === 'termica' ? 'always' : 'auto'};display:flex;flex-direction:column;gap:4mm;font-size:11pt;${impressora() === 'termica' ? '' : 'margin:0 2.5mm;border:1px dashed #bbb;'}}
   .etq-topo{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:3mm}.etq-topo img{height:14mm}
   .end{border:1.5px solid #000;border-radius:2mm;padding:3mm;line-height:1.35}.end small{display:block;font-size:8pt;font-weight:bold;letter-spacing:1px}
   .end b{font-size:13pt}.end:first-of-type b{font-size:15pt}.cep{font-size:15pt!important}.cont{font-size:9pt;margin-top:auto;border-top:1px dashed #000;padding-top:2mm}`);
}
function imprimirDeclaracao(p) {
  const d = p.destinatario || {}, r = remetente(), total = p.itens.reduce((t, i) => t + i.qtd * (i.preco || 0), 0);
  imprimir('Declaração de conteúdo', `<div class="dc"><h1>DECLARAÇÃO DE CONTEÚDO</h1>
    <table class="dois"><tr><td><b>REMETENTE</b><br>${esc(r.nome)}<br>${esc(r.endereco)}<br>${esc(r.cidade)}/${esc(r.uf)} ${esc(r.cep || '')}<br>CNPJ: ${esc(emp().cnpj || '')}</td>
      <td><b>DESTINATÁRIO</b><br>${esc(d.nome)}<br>${esc(d.endereco)}<br>${esc(d.cidade)}/${esc(d.uf)} ${esc(d.cep || '')}<br>Tel.: ${esc(d.telefone || '')}</td></tr></table>
    <h2>IDENTIFICAÇÃO DOS BENS</h2>
    <table class="itens"><tr><th>Item</th><th>Conteúdo</th><th>Quant.</th><th>Valor (R$)</th></tr>
      ${p.itens.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${(i.qtd * (i.preco || 0)).toFixed(2).replace('.', ',')}</td></tr>`).join('')}
      <tr><td colspan="2"><b>TOTAIS</b></td><td><b>${p.itens.reduce((t, i) => t + i.qtd, 0)}</b></td><td><b>${total.toFixed(2).replace('.', ',')}</b></td></tr>
      <tr><td colspan="3">Peso total (kg)</td><td></td></tr></table>
    <h2>DECLARAÇÃO</h2>
    <p>Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e a quem de direito, por informações inverídicas.</p>
    <p>Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo, gás ou qualquer outro conteúdo que constitua perigo, conforme o art. 13 da Lei Postal nº 6.538/78.</p>
    <p class="ass">________________________, ____ de ______________ de ______<br><br>_____________________________________________<br>Assinatura do Declarante/Remetente</p>
    <p class="obs">Pedido ${esc(p.id)}. Use a declaração apenas quando a venda não exigir nota fiscal; com CNPJ, o certo é emitir a NF-e.</p></div>`,
  `@page{size:A4;margin:14mm}.dc{font-size:10.5pt}h1{text-align:center;font-size:16pt;margin:4mm 0}h2{font-size:11pt;background:#eee;padding:2mm;margin:5mm 0 2mm}
   table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:2mm;vertical-align:top;text-align:left}.dois td{width:50%;line-height:1.5}
   .ass{text-align:center;margin-top:12mm}.obs{font-size:8pt;color:#555;margin-top:8mm}`);
}
function imprimirRecibo(p) {
  const e = emp();
  imprimir(`Recibo ${p.id}`, `<div class="rc"><img src="${location.origin}/logo-supermisto.png" alt=""><h1>Recibo · ${esc(p.id)}</h1>
    <p>${esc(e.nome || '')} · CNPJ ${esc(e.cnpj || '')}<br>${esc(e.endereco || '')} · ${esc(e.cidade || '')}/${esc(e.uf || '')} · ${esc(e.telefone || '')}</p>
    <p><b>Cliente:</b> ${esc(nomeCliente(p) || '—')} · <b>Data:</b> ${dataHora(p.criado_em)}${p.pagamento ? ` · <b>Pagamento:</b> ${esc(p.pagamento)}` : ''}</p>
    <table><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>
      ${p.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${brl(i.preco)}</td><td>${brl(i.qtd * (i.preco || 0))}</td></tr>`).join('')}
      ${p.frete ? `<tr><td colspan="3">Frete</td><td>${brl(p.frete)}</td></tr>` : ''}
      <tr class="tot"><td colspan="3">TOTAL</td><td>${brl(p.total)}</td></tr></table>
    <p class="ob">Obrigado pela compra! 🌿 Temperos 100% naturais, sem conservantes.</p></div>`,
  `@page{size:A5;margin:10mm}.rc{font-size:10.5pt}.rc img{height:16mm}h1{font-size:15pt;margin:3mm 0}table{width:100%;border-collapse:collapse;margin:4mm 0}
   td,th{border-bottom:1px solid #ccc;padding:2mm;text-align:left}.tot td{font-weight:bold;font-size:12pt;border-top:2px solid #000}.ob{text-align:center;margin-top:6mm}`);
}
function imprimirSeparacao(pedidos) {
  if (!pedidos.length) return aviso('Selecione os pedidos.', false);
  const soma = {};
  pedidos.forEach((p) => p.itens.forEach((i) => { const k = i.sku || i.nome; soma[k] = soma[k] || { nome: B.E.skus.find((s) => s.id === i.sku)?.nome || i.nome, sku: i.sku, qtd: 0 }; soma[k].qtd += i.qtd; }));
  const linhas = Object.values(soma).sort((a, b) => a.nome.localeCompare(b.nome));
  imprimir('Lista de separação', `<div class="ls"><h1>Lista de separação · ${new Date().toLocaleString('pt-BR')}</h1><p>${pedidos.length} pedido(s) · ${linhas.reduce((t, l) => t + l.qtd, 0)} item(ns)</p>
    <h2>Pegar no estoque</h2><table><tr><th>☐</th><th>Produto</th><th>SKU</th><th>Qtd</th></tr>${linhas.map((l) => `<tr><td>☐</td><td>${esc(l.nome)}</td><td>${esc(l.sku || '')}</td><td><b>${l.qtd}</b></td></tr>`).join('')}</table>
    <h2>Montar cada pacote</h2>${pedidos.map((p) => `<div class="pk"><b>☐ ${esc(p.id)}</b> · ${esc(nomeCliente(p) || '')}${p.destinatario?.cidade ? ' · ' + esc(p.destinatario.cidade) : ''}<br>${p.itens.map((i) => `${i.qtd}× ${esc(B.E.skus.find((s) => s.id === i.sku)?.nome || i.nome)}`).join(' · ')}${p.obs ? `<br><i>Obs.: ${esc(p.obs)}</i>` : ''}</div>`).join('')}</div>`,
  `@page{size:A4;margin:12mm}.ls{font-size:11pt}h1{font-size:15pt}h2{font-size:12pt;margin-top:6mm}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:2mm;text-align:left}.pk{border-bottom:1px dashed #999;padding:3mm 0}`);
}

/* ---------- venda fora da Shopee ---------- */
function totalVenda() {
  const f = $('#f-venda'), itens = lerItens($('#venda-itens'));
  const t = itens.reduce((s, i) => s + i.qtd * (i.preco || 0), 0) + (lerNum(f.frete.value) || 0);
  $('#venda-total').innerHTML = `Total: <b>${brl(t)}</b>`;
}
function abrirVenda() { $('#venda-itens').innerHTML = linhaItem(true); precoPadrao($('#venda-itens .linha-item')); totalVenda(); $('#venda').hidden = false; document.body.classList.add('sem-rolar'); }
function fecharVenda() { $('#venda').hidden = true; document.body.classList.remove('sem-rolar'); }
function precoPadrao(linha) {
  const op = linha.querySelector('select').selectedOptions[0], pr = linha.querySelector('[name=preco]');
  if (op && op.dataset.preco) pr.value = String(op.dataset.preco).replace('.', ',');
}
document.addEventListener('click', (e) => {
  if (e.target.id === 'ped-nova') abrirVenda();
  if (e.target.id === 'venda' || (e.target.classList.contains('fechar') && e.target.closest('#venda'))) fecharVenda();
  if (e.target.id === 'venda-mais') { $('#venda-itens').insertAdjacentHTML('beforeend', linhaItem(true)); precoPadrao($('#venda-itens').lastElementChild); totalVenda(); }
});
$('#venda').addEventListener('change', (e) => { if (e.target.name === 'sku') precoPadrao(e.target.closest('.linha-item')); totalVenda(); });
$('#venda').addEventListener('input', totalVenda);
$('#f-venda').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, itens = lerItens($('#venda-itens'));
  if (!itens.length) return aviso('Coloque a quantidade.', false);
  const destinatario = Object.fromEntries(['nome', 'telefone', 'endereco', 'cidade', 'uf', 'cep'].map((k) => [k, f[k].value.trim()]));
  try {
    const r = await B.post('/api/erp/pedido', { itens, cliente: destinatario.nome, destinatario, frete: lerNum(f.frete.value), pagamento: f.pagamento.value, recebido: f.recebido.checked, obs: f.obs.value });
    f.reset(); fecharVenda(); aviso(`✅ Venda ${r.id} registrada.`); filtroPed = 'manual'; await B.recarregar();
  } catch (er) { aviso(er.message, false); }
});

/* ---------- 👥 Clientes ---------- */
let buscaCli = '';
function desenharClientes() {
  const mapa = new Map();
  for (const p of B.E.pedidos.filter(vendaValida)) {
    const nome = nomeCliente(p); if (!nome) continue;
    const k = nome.toLowerCase();
    const c = mapa.get(k) || { nome, telefone: '', cidade: '', pedidos: 0, total: 0, ultimo: p.criado_em, canais: new Set() };
    c.pedidos++; c.total += p.total; c.canais.add(p.origem === 'manual' ? 'Direto' : 'Shopee');
    if (p.destinatario?.telefone && !c.telefone) c.telefone = p.destinatario.telefone;
    if (p.destinatario?.cidade && !c.cidade) c.cidade = `${p.destinatario.cidade}/${p.destinatario.uf || ''}`;
    if (p.criado_em > c.ultimo) c.ultimo = p.criado_em;
    mapa.set(k, c);
  }
  const q = buscaCli.toLowerCase();
  const lista = [...mapa.values()].filter((c) => !q || c.nome.toLowerCase().includes(q) || c.cidade.toLowerCase().includes(q)).sort((a, b) => b.total - a.total);
  const wa = (t) => { const n = String(t).replace(/\D/g, ''); return n.length >= 10 ? `https://wa.me/${n.startsWith('55') ? n : '55' + n}` : null; };
  $('#cli-lista').innerHTML = lista.length ? `<div class="card"><table class="tab-cli"><tr><th>Cliente</th><th>Pedidos</th><th>Total</th><th>Última compra</th></tr>
    ${lista.map((c) => `<tr><td><b>${esc(c.nome)}</b><small>${esc(c.cidade)} ${[...c.canais].map((x) => `<span class="tag t-${x === 'Shopee' ? 'shopee' : 'manual'}">${x}</span>`).join(' ')}${c.telefone ? (wa(c.telefone) ? ` · <a href="${wa(c.telefone)}" target="_blank" rel="noopener">💬 ${esc(c.telefone)}</a>` : ' · ' + esc(c.telefone)) : ''}</small></td>
      <td>${c.pedidos}</td><td><b>${brl(c.total)}</b></td><td>${dataCurta(c.ultimo)}</td></tr>`).join('')}</table></div>`
    : '<div class="vazio">👥<p>Nenhum cliente ainda.</p></div>';
}
document.addEventListener('input', (e) => { if (e.target.id === 'cli-busca') { buscaCli = e.target.value; desenharClientes(); } });

B.desenhar.push(desenharPainel, desenharPedidos, desenharClientes);
export { contaSku };
