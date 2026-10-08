// MercaGestão: regras do caixa, sem tela (testadas em leuapps/test/mercagestao.test.mjs).
// Dinheiro sempre em centavos (inteiros) para não errar conta com vírgula.

export const centavos = (v) => Math.round((Number(v) || 0) * 100);
export const reais = (c) => Math.round(c) / 100;

/** "1.234,56" / "1234.56" / 12.5 → número. */
export function numeroBR(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function brl(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------- itens e total da venda ----------

/** Total de um item: preço × quantidade − desconto do item (nunca negativo). Quantidade em kg vale com 3 casas. */
export function totalItem(item) {
  // Etiqueta da balança com preço: vale o total impresso na etiqueta.
  const bruto = item.totalFixo != null ? centavos(item.totalFixo) : Math.round(centavos(item.preco) * (Number(item.qtd) || 0));
  return Math.max(0, bruto - centavos(item.desconto || 0));
}

/**
 * Resumo da venda. desconto: { tipo: 'valor'|'pct', valor }.
 * Retorna tudo em centavos: subtotal, desconto, acrescimo, total.
 */
export function resumoVenda(itens, desconto = null, acrescimo = 0) {
  const subtotal = itens.reduce((s, i) => s + totalItem(i), 0);
  let desc = 0;
  if (desconto && Number(desconto.valor) > 0) {
    desc = desconto.tipo === 'pct' ? Math.round(subtotal * Math.min(100, Number(desconto.valor)) / 100) : centavos(desconto.valor);
  }
  desc = Math.min(desc, subtotal);
  const acr = Math.max(0, centavos(acrescimo));
  return { subtotal, desconto: desc, acrescimo: acr, total: subtotal - desc + acr, itens: itens.reduce((s, i) => s + (i.unidade === 'kg' ? 1 : Number(i.qtd) || 0), 0) };
}

export const FORMAS = {
  dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão de débito', credito: 'Cartão de crédito', fiado: 'Fiado', vale: 'Vale-alimentação', outro: 'Outro',
};

/**
 * Pagamentos de uma venda (pode misturar formas). Só o dinheiro dá troco.
 * Retorna { pago, falta, troco } em centavos e ok = pagou tudo.
 */
export function conferirPagamento(totalCent, pagamentos) {
  const pago = pagamentos.reduce((s, p) => s + centavos(p.valor), 0);
  const dinheiro = pagamentos.filter((p) => p.forma === 'dinheiro').reduce((s, p) => s + centavos(p.valor), 0);
  const outros = pago - dinheiro;
  const falta = Math.max(0, totalCent - pago);
  // Troco só sai do dinheiro: Pix/cartão acima do total não vira troco.
  const troco = falta > 0 ? 0 : Math.min(dinheiro, Math.max(0, pago - totalCent));
  const sobraSemDinheiro = Math.max(0, outros - totalCent);
  return { pago, falta, troco, ok: falta === 0 && sobraSemDinheiro === 0, erro: sobraSemDinheiro > 0 ? 'Pix/cartão maior que o total' : null };
}

// ---------- código de barras ----------

function digitoEAN(semDigito) {
  let soma = 0;
  const n = semDigito.length;
  for (let i = 0; i < n; i++) soma += Number(semDigito[n - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (soma % 10)) % 10;
}

/**
 * Código 2D / GS1 (DataMatrix ou GS1-128): além do produto (01), pode trazer validade (17) e lote (10).
 * Aceita "(01)07896003701685(17)261231(10)L23" e a forma corrida do leitor (separador GS ou ]d2 no começo).
 * Devolve { gtin, validade: 'AAAA-MM-DD' | '', lote } ou null se não for GS1.
 */
const GS1_FIXO = { '01': 14, '11': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
export function lerGS1(texto) {
  let t = String(texto || '').trim().replace(/^\][A-Za-z]\d/, '');
  const ai = {};
  if (t.startsWith('(')) {
    for (const m of t.matchAll(/\((\d{2,4})\)([^(]*)/g)) ai[m[1]] = m[2].trim();
  } else {
    if (!/^01\d{14}./.test(t)) return null;
    while (t.length) {
      const k = t.slice(0, 2), n = GS1_FIXO[k];
      if (n) { ai[k] = t.slice(2, 2 + n); t = t.slice(2 + n); }
      else if (['10', '21', '30', '37', '90', '91', '92'].includes(k)) {
        const fim = t.indexOf('\x1d'); ai[k] = fim < 0 ? t.slice(2) : t.slice(2, fim); t = fim < 0 ? '' : t.slice(fim);
      } else break;
      t = t.replace(/^\x1d+/, '');
    }
  }
  if (!/^\d{14}$/.test(ai['01'] || '') || !eanValido(ai['01'])) return null;
  // GTIN-14 com zeros na frente vira o EAN-13 (ou EAN-8) que está no produto.
  let gtin = ai['01'];
  while (gtin.length > 8 && gtin.startsWith('0') && gtin.length !== 13) gtin = gtin.slice(1);
  if (gtin.length === 13 && gtin.startsWith('00000')) gtin = gtin.slice(5);
  let validade = '';
  const v = ai['17'] || ai['15'];
  if (/^\d{6}$/.test(v || '')) {
    const ano = 2000 + Number(v.slice(0, 2)), mes = Number(v.slice(2, 4));
    // Dia 00 = fim do mês.
    const dia = Number(v.slice(4, 6)) || new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    if (mes >= 1 && mes <= 12) validade = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  return { gtin, validade, lote: ai['10'] || '' };
}

/** Categoria do mercado a partir das categorias da base de produtos (ou do nome). '' se não reconhecer. */
const CATEGORIAS = [
  ['Pet', /pet-food|dog|cat-food|ra[cç][aã]o|petisco/],
  ['Biscoitos', /biscuit|cookie|biscoito|bolacha|wafer|cracker|rosquinha/],
  ['Salgadinhos', /salty-snack|chips|crisps|salgadinho|amendoim|pipoca|popcorn/],
  ['Bebidas', /beverage|drink|soda|juice|waters|beer|wine|bebida|refrigerante|suco|cerveja|vinho|[aá]gua mineral|energ[eé]tico/],
  ['Laticínios', /dairy|milk|cheese|yogurt|butter|leite|queijo|iogurte|manteiga|requeij[aã]o|creme de leite/],
  ['Higiene', /hygiene|shampoo|soap|toothpaste|deodorant|cosmetic|higiene|sabonete|creme dental|desodorante|papel higi[eê]nico|fralda|absorvente|condicionador/],
  ['Limpeza', /detergent|cleaning|laundry|bleach|limpeza|detergente|sab[aã]o em p[oó]|amaciante|desinfetante|[aá]gua sanit[aá]ria|esponja/],
  ['Congelados', /frozen|congelad|sorvete|ice-cream/],
  ['Frios e carnes', /meat|sausage|ham|chicken|carne|lingui[cç]a|presunto|mortadela|salsicha|frango|bacon/],
  ['Padaria', /bread|bakery|cake|p[aã]o|bolo|torrada/],
  ['Doces', /chocolate|candy|confection|sweet|doce|bala|bombom|gelatina|achocolatado/],
  ['Matinais', /breakfast-cereal|cereal|granola|aveia/],
  ['Hortifruti', /fresh-fruit|fresh-vegetable|fruta|verdura|legume/],
  ['Mercearia', /pasta|rice|beans|flour|sugar|oil|coffee|sauce|condiment|spice|canned|macarr[aã]o|arroz|feij[aã]o|farinha|a[cç][uú]car|[oó]leo|caf[eé]|molho|tempero|sal |enlatad|conserva|azeite|fub[aá]/],
];
export function categoriaPorTexto(texto) {
  const t = ' ' + String(texto || '').toLowerCase() + ' ';
  const c = CATEGORIAS.find(([, re]) => re.test(t));
  return c ? c[0] : '';
}

/** Confere EAN-8, EAN-13 (e GTIN-12/14) pelo dígito verificador. */
export function eanValido(codigo) {
  const c = String(codigo || '').trim();
  if (!/^\d{8}$|^\d{12,14}$/.test(c)) return false;
  return digitoEAN(c.slice(0, -1)) === Number(c.slice(-1));
}

/**
 * Etiqueta da balança (EAN-13 começando com 2): 2 · código (posições 2 a 7) · valor (8 a 12) · dígito.
 * config: { digitosCodigo: 4|5|6, valor: 'preco'|'peso' } — quantos dígitos do código a balança usa
 * (4: 2 CCCC 00 VVVVV D; 5: 2 CCCCC 0 VVVVV D; 6: 2 CCCCCC VVVVV D). Valor: preço em centavos ou peso em gramas.
 */
export function lerEtiquetaBalanca(codigo, config = {}) {
  const c = String(codigo || '').trim();
  if (!/^2\d{12}$/.test(c) || !eanValido(c)) return null;
  const dig = [4, 5, 6].includes(Number(config.digitosCodigo)) ? Number(config.digitosCodigo) : 4;
  const codigoProduto = String(Number(c.slice(1, 1 + dig)));
  const valor = Number(c.slice(7, 12));
  if (config.valor === 'peso') return { codigoProduto, pesoKg: valor / 1000 };
  return { codigoProduto, precoCent: valor };
}

// ---------- preço e margem ----------

export const precoPorMargem = (custo, margemPct) => Math.round(centavos(custo) * (1 + (Number(margemPct) || 0) / 100)) / 100;
export function margemDe(custo, preco) {
  const c = centavos(custo), p = centavos(preco);
  return c > 0 ? Math.round(((p - c) / c) * 1000) / 10 : 0;
}

// ---------- validade ----------

const DIA = 864e5;
const soData = (d) => { const x = new Date(d); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()); };

/** Dias até vencer (negativo = vencido). Data no formato AAAA-MM-DD. */
export function diasParaVencer(validade, hoje = new Date()) {
  if (!validade) return null;
  const [a, m, d] = String(validade).split('-').map(Number);
  if (!a || !m || !d) return null;
  return Math.round((Date.UTC(a, m - 1, d) - soData(hoje)) / DIA);
}

export function situacaoValidade(validade, hoje = new Date(), avisoDias = 15) {
  const d = diasParaVencer(validade, hoje);
  if (d === null) return 'sem';
  if (d < 0) return 'vencido';
  if (d <= avisoDias) return 'vencendo';
  return 'ok';
}

// ---------- fiado ----------

/** Saldo devedor do cliente: compras no fiado − pagamentos (em centavos). */
export function saldoFiado(movimentos) {
  return movimentos.reduce((s, m) => s + (m.tipo === 'compra' ? centavos(m.valor) : -centavos(m.valor)), 0);
}

/** Pode vender no fiado? limite 0 = sem limite. */
export function podeFiado(saldoCent, limite, valorCent) {
  const lim = centavos(limite);
  if (!lim) return { ok: true };
  const disponivel = lim - saldoCent;
  return valorCent <= disponivel ? { ok: true, disponivel } : { ok: false, disponivel: Math.max(0, disponivel) };
}

// ---------- caixa ----------

/**
 * Fechamento do caixa: o que deveria ter em dinheiro na gaveta.
 * movimentos: abertura (fundo de troco), suprimento (+), sangria (−), e as vendas com pagamentos.
 */
export function fechamentoCaixa({ fundo = 0, suprimentos = [], sangrias = [], vendas = [], recebimentosFiado = [] }) {
  const porForma = {};
  let trocos = 0;
  for (const v of vendas) {
    if (v.cancelada) continue;
    for (const p of v.pagamentos || []) porForma[p.forma] = (porForma[p.forma] || 0) + centavos(p.valor);
    trocos += centavos(v.troco || 0);
  }
  const recebFiadoDinheiro = recebimentosFiado.filter((r) => r.forma === 'dinheiro').reduce((s, r) => s + centavos(r.valor), 0);
  for (const r of recebimentosFiado) porForma['receb_' + r.forma] = (porForma['receb_' + r.forma] || 0) + centavos(r.valor);
  const sup = suprimentos.reduce((s, x) => s + centavos(x.valor), 0);
  const san = sangrias.reduce((s, x) => s + centavos(x.valor), 0);
  const dinheiroEsperado = centavos(fundo) + (porForma.dinheiro || 0) - trocos + recebFiadoDinheiro + sup - san;
  const totalVendido = vendas.filter((v) => !v.cancelada).reduce((s, v) => s + centavos(v.total), 0);
  return { porForma, trocos, suprimentos: sup, sangrias: san, dinheiroEsperado, totalVendido, qtdVendas: vendas.filter((v) => !v.cancelada).length };
}

// ---------- relatórios ----------

export function resumoPeriodo(vendas, produtosPorId = {}) {
  const ok = vendas.filter((v) => !v.cancelada);
  const porForma = {}, porProduto = {};
  let faturamento = 0, custo = 0;
  for (const v of ok) {
    faturamento += centavos(v.total);
    for (const p of v.pagamentos || []) porForma[p.forma] = (porForma[p.forma] || 0) + centavos(p.valor);
    if (v.troco) porForma.dinheiro = (porForma.dinheiro || 0) - centavos(v.troco);
    for (const i of v.itens || []) {
      const k = i.produtoId || i.nome;
      const t = porProduto[k] ||= { nome: i.nome, qtd: 0, total: 0 };
      t.qtd += Number(i.qtd) || 0;
      t.total += totalItem(i);
      const custoUnit = i.custo ?? produtosPorId[i.produtoId]?.custo ?? 0;
      custo += Math.round(centavos(custoUnit) * (Number(i.qtd) || 0));
    }
  }
  const ranking = Object.values(porProduto).sort((a, b) => b.total - a.total);
  return {
    qtd: ok.length, faturamento, custo, lucro: faturamento - custo,
    ticketMedio: ok.length ? Math.round(faturamento / ok.length) : 0,
    porForma, ranking,
  };
}

/** Curva ABC: A = até 80% do faturamento, B = até 95%, C = resto. */
export function curvaABC(ranking) {
  const total = ranking.reduce((s, r) => s + r.total, 0) || 1;
  let acum = 0;
  return ranking.map((r) => { acum += r.total; const pct = acum / total; return { ...r, classe: pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C' }; });
}

// ---------- XML da nota de compra (entrada de mercadoria) ----------

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
const desfaz = (s) => String(s || '').replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENT[m]).trim();
const tag = (xml, nome) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${nome}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`)); return m ? desfaz(m[1]) : ''; };

/** Lê o XML da NF-e do fornecedor: fornecedor, número e itens (código de barras, nome, quantidade, custo). */
export function lerXmlNfe(xml) {
  const x = String(xml || '');
  if (!/<(?:\w+:)?infNFe/.test(x)) throw new Error('Este arquivo não é o XML de uma NF-e.');
  const emit = tag(x, 'emit');
  const ide = tag(x, 'ide');
  const itens = [];
  const re = /<(?:\w+:)?det\b[^>]*>([\s\S]*?)<\/(?:\w+:)?det>/g;
  let m;
  while ((m = re.exec(x))) {
    const prod = tag(m[1], 'prod');
    const ean = tag(prod, 'cEAN');
    const qtd = Number(tag(prod, 'qCom')) || 0;
    const total = Number(tag(prod, 'vProd')) || 0;
    itens.push({
      codigoFornecedor: tag(prod, 'cProd'),
      codigoBarras: /^\d{8,14}$/.test(ean) ? ean : '',
      nome: tag(prod, 'xProd'),
      ncm: tag(prod, 'NCM'),
      unidade: tag(prod, 'uCom'),
      qtd,
      custoUnit: qtd ? Math.round((total / qtd) * 10000) / 10000 : Number(tag(prod, 'vUnCom')) || 0,
      total,
    });
  }
  return {
    fornecedor: { nome: tag(emit, 'xNome'), fantasia: tag(emit, 'xFant'), cnpj: tag(emit, 'CNPJ') || tag(emit, 'CPF') },
    numero: tag(ide, 'nNF'), serie: tag(ide, 'serie'), emissao: tag(ide, 'dhEmi') || tag(ide, 'dEmi'),
    chave: (x.match(/Id="NFe(\d{44})"/) || [])[1] || '',
    total: Number(tag(tag(x, 'ICMSTot'), 'vNF')) || itens.reduce((s, i) => s + i.total, 0),
    itens,
  };
}

// ---------- NFC-e (serviço emissor Focus NFe) ----------

// Código da forma de pagamento na NFC-e (tabela da SEFAZ).
export const FORMA_NFCE = { dinheiro: '01', credito: '03', debito: '04', fiado: '05', vale: '10', pix: '17', outro: '99' };

/**
 * Monta o pedido de NFC-e no formato do Focus NFe (POST /v2/nfce?ref=...).
 * fiscal: { cnpj, regime: 'simples'|'normal', cfop, csosn, cst } — valores padrão para Simples Nacional.
 * Cada produto precisa de NCM (8 dígitos); sem NCM a SEFAZ recusa.
 */
export function montarNfce(venda, fiscal, cliente = null) {
  const simples = (fiscal.regime || 'simples') === 'simples';
  const itens = venda.itens.map((i, n) => {
    const qtd = Number(i.qtd) || 0;
    const bruto = reais(i.totalFixo != null ? centavos(i.totalFixo) : Math.round(centavos(i.preco) * qtd));
    const item = {
      numero_item: n + 1,
      codigo_produto: String(i.codigo || i.produtoId || n + 1).slice(0, 60),
      descricao: String(i.nome).slice(0, 120),
      codigo_ncm: String(i.ncm || '').replace(/\D/g, ''),
      cfop: fiscal.cfop || '5102',
      unidade_comercial: i.unidade === 'kg' ? 'KG' : 'UN',
      quantidade_comercial: qtd,
      valor_unitario_comercial: Number(i.preco),
      unidade_tributavel: i.unidade === 'kg' ? 'KG' : 'UN',
      quantidade_tributavel: qtd,
      valor_unitario_tributavel: Number(i.preco),
      valor_bruto: bruto,
      icms_origem: 0,
      icms_situacao_tributaria: simples ? (fiscal.csosn || '102') : (fiscal.cst || '00'),
    };
    if (i.desconto) item.valor_desconto = Number(i.desconto);
    if (eanValido(i.codigo)) { item.codigo_barras_comercial = String(i.codigo); item.codigo_barras_tributavel = String(i.codigo); }
    return item;
  });
  // Desconto da venda inteira: rateado nos itens (a NFC-e não tem desconto "no total").
  const r = resumoVenda(venda.itens, venda.descontoVenda);
  if (r.desconto > 0) {
    let resto = r.desconto;
    itens.forEach((it, k) => {
      const parte = k === itens.length - 1 ? resto : Math.floor(r.desconto * centavos(it.valor_bruto - (it.valor_desconto || 0)) / Math.max(1, r.subtotal));
      resto -= parte;
      it.valor_desconto = reais(centavos(it.valor_desconto || 0) + parte);
    });
  }
  const pedido = {
    cnpj_emitente: String(fiscal.cnpj || '').replace(/\D/g, ''),
    data_emissao: new Date(venda.data || Date.now()).toISOString(),
    presenca_comprador: 1,
    modalidade_frete: 9,
    local_destino: 1,
    items: itens,
    formas_pagamento: venda.pagamentos.map((p) => ({ forma_pagamento: FORMA_NFCE[p.forma] || '99', valor_pagamento: Number(p.valor) })),
  };
  if (venda.troco) pedido.valor_troco = reais(centavos(venda.troco));
  const doc = String(cliente?.cpf || '').replace(/\D/g, '');
  if (doc.length === 11) pedido.cpf_destinatario = doc;
  if (doc.length === 14) pedido.cnpj_destinatario = doc;
  return pedido;
}

/** O que falta para emitir NFC-e (mensagens para o lojista). */
export function pendenciasNfce(venda, fiscal) {
  const p = [];
  if (String(fiscal?.cnpj || '').replace(/\D/g, '').length !== 14) p.push('CNPJ da loja em Configurações → Nota fiscal');
  if (!fiscal?.token) p.push('Token do emissor em Configurações → Nota fiscal');
  const semNcm = venda.itens.filter((i) => String(i.ncm || '').replace(/\D/g, '').length !== 8).map((i) => i.nome);
  if (semNcm.length) p.push('NCM (8 dígitos) nos produtos: ' + semNcm.slice(0, 5).join(', ') + (semNcm.length > 5 ? '…' : ''));
  return p;
}

// ---------- texto do WhatsApp ----------

export function textoCobrancaFiado(loja, cliente, saldoCent) {
  return `Olá, ${cliente.nome.split(' ')[0]}! Aqui é do ${loja}. Seu saldo no fiado está em ${brl(reais(saldoCent))}. Quando puder, passe aqui para acertar. Obrigado!`;
}

// ---------- cupom em texto (impressora térmica Bluetooth, ESC/POS) ----------

const semAcento = (s) => String(s ?? '').replace(/\u00a0/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
const ladoALado = (esq, dir, col) => { esq = semAcento(esq); dir = semAcento(dir); const espaco = col - dir.length; return (esq.length > espaco - 1 ? esq.slice(0, Math.max(0, espaco - 1)) : esq).padEnd(espaco) + dir; };
const centro = (s, col) => { s = semAcento(s).slice(0, col); return ' '.repeat(Math.floor((col - s.length) / 2)) + s; };
const qtdTxt = (q, un) => (un === 'kg' ? Number(q).toFixed(3).replace('.', ',') + 'kg' : String(q));

/** Cupom não fiscal em texto puro, com `col` colunas (32 = 58 mm, 48 = 80 mm). */
export function cupomTexto(venda, loja, col = 48) {
  const L = [], traco = '-'.repeat(col), r = resumoVenda(venda.itens, venda.descontoVenda);
  L.push(centro(loja.nome || 'MercaGestao', col));
  if (loja.cnpj) L.push(centro('CNPJ ' + loja.cnpj, col));
  if (loja.endereco) L.push(centro(loja.endereco, col));
  L.push(traco, centro('CUPOM NAO FISCAL', col), traco);
  venda.itens.forEach((i, n) => {
    L.push(semAcento(`${n + 1} ${i.nome}`).slice(0, col));
    L.push(ladoALado(`  ${qtdTxt(i.qtd, i.unidade)} x ${brl(i.preco)}`, brl(reais(totalItem(i))), col));
  });
  L.push(traco, ladoALado('Subtotal', brl(reais(r.subtotal)), col));
  if (r.desconto) L.push(ladoALado('Desconto', '-' + brl(reais(r.desconto)), col));
  L.push(ladoALado('TOTAL', brl(reais(r.total)), col));
  for (const p of venda.pagamentos || []) L.push(ladoALado(FORMAS[p.forma] || p.forma, brl(p.valor), col));
  if (venda.troco) L.push(ladoALado('Troco', brl(venda.troco), col));
  L.push(traco);
  if (venda.cliente) L.push(semAcento('Cliente: ' + venda.cliente).slice(0, col));
  L.push(semAcento(`Venda ${venda.numero} - ${new Date(venda.data).toLocaleString('pt-BR')}`).slice(0, col));
  if (loja.mensagem) L.push('', ...semAcento(loja.mensagem).match(new RegExp(`.{1,${col}}`, 'g')).map((x) => centro(x, col)));
  return L.join('\n');
}

/** Bytes ESC/POS: inicia a impressora, imprime o texto, avança e corta o papel. */
export function escpos(texto) {
  const corpo = Array.from(semAcento(texto).replace(/\n/g, '\r\n') + '\r\n\r\n\r\n', (c) => c.charCodeAt(0));
  return new Uint8Array([0x1b, 0x40, ...corpo, 0x1d, 0x56, 0x42, 0x00]);
}
