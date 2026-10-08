import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  numeroBR, totalItem, resumoVenda, conferirPagamento, eanValido, lerEtiquetaBalanca, precoPorMargem, margemDe,
  diasParaVencer, situacaoValidade, saldoFiado, podeFiado, fechamentoCaixa, resumoPeriodo, curvaABC, lerXmlNfe,
  montarNfce, pendenciasNfce,
} from '../public/mercagestao/nucleo.js';

// Etiqueta com dígito verificador certo.
function ean13(doze) {
  let s = 0; for (let i = 0; i < 12; i++) s += Number(doze[i]) * (i % 2 ? 3 : 1);
  return doze + ((10 - (s % 10)) % 10);
}

test('números no jeito brasileiro', () => {
  assert.equal(numeroBR('1.234,56'), 1234.56);
  assert.equal(numeroBR('R$ 9,90'), 9.9);
  assert.equal(numeroBR('12.5'), 12.5);
  assert.equal(numeroBR(''), 0);
});

test('item por peso e desconto, sem erro de centavo', () => {
  assert.equal(totalItem({ preco: 39.9, qtd: 0.735 }), 2933); // 0,735 kg de queijo a R$ 39,90
  assert.equal(totalItem({ preco: 0.1, qtd: 3 }), 30);
  assert.equal(totalItem({ preco: 5, qtd: 2, desconto: 20 }), 0, 'desconto maior que o item não fica negativo');
});

test('resumo da venda com desconto em % e em valor', () => {
  const itens = [{ preco: 10, qtd: 3 }, { preco: 4.5, qtd: 2 }];
  assert.deepEqual(resumoVenda(itens).total, 3900);
  assert.equal(resumoVenda(itens, { tipo: 'pct', valor: 10 }).total, 3510);
  assert.equal(resumoVenda(itens, { tipo: 'valor', valor: 100 }).total, 0, 'desconto não passa do subtotal');
});

test('troco só do dinheiro; pagamento misto', () => {
  assert.deepEqual(conferirPagamento(3550, [{ forma: 'dinheiro', valor: 50 }]), { pago: 5000, falta: 0, troco: 1450, ok: true, erro: null });
  const misto = conferirPagamento(10000, [{ forma: 'pix', valor: 60 }, { forma: 'dinheiro', valor: 50 }]);
  assert.equal(misto.troco, 1000); assert.ok(misto.ok);
  assert.equal(conferirPagamento(10000, [{ forma: 'pix', valor: 40 }]).falta, 6000);
  assert.equal(conferirPagamento(10000, [{ forma: 'credito', valor: 120 }]).ok, false, 'cartão acima do total não vira troco');
});

test('código de barras EAN', () => {
  assert.ok(eanValido('7891000100103'));
  assert.ok(!eanValido('7891000100104'));
  assert.ok(eanValido('96385074'));
});

test('etiqueta da balança: preço e peso', () => {
  const preco = ean13('201230001250'); // 2 · 0123 · 00 · 01250: produto 123 (4 dígitos), R$ 12,50
  assert.deepEqual(lerEtiquetaBalanca(preco, { digitosCodigo: 4 }), { codigoProduto: '123', precoCent: 1250 });
  const peso = ean13('200004500735'); // 2 · 000045 · 00735: produto 45 (6 dígitos), 0,735 kg
  assert.deepEqual(lerEtiquetaBalanca(peso, { digitosCodigo: 6, valor: 'peso' }), { codigoProduto: '45', pesoKg: 0.735 });
  assert.equal(lerEtiquetaBalanca('7891000100103'), null, 'não começa com 2');
  assert.equal(lerEtiquetaBalanca('2001230012509'), null, 'dígito errado');
});

test('margem e preço de venda', () => {
  assert.equal(precoPorMargem(10, 35), 13.5);
  assert.equal(margemDe(10, 13.5), 35);
  assert.equal(margemDe(0, 5), 0);
});

test('validade', () => {
  const hoje = new Date(2026, 9, 8);
  assert.equal(diasParaVencer('2026-10-08', hoje), 0);
  assert.equal(diasParaVencer('2026-10-01', hoje), -7);
  assert.equal(situacaoValidade('2026-10-01', hoje), 'vencido');
  assert.equal(situacaoValidade('2026-10-20', hoje), 'vencendo');
  assert.equal(situacaoValidade('2026-12-20', hoje), 'ok');
  assert.equal(situacaoValidade('', hoje), 'sem');
});

test('fiado: saldo e limite', () => {
  const saldo = saldoFiado([{ tipo: 'compra', valor: 80 }, { tipo: 'compra', valor: 45.5 }, { tipo: 'pagamento', valor: 50 }]);
  assert.equal(saldo, 7550);
  assert.deepEqual(podeFiado(saldo, 100, 2000), { ok: true, disponivel: 2450 });
  assert.equal(podeFiado(saldo, 100, 3000).ok, false);
  assert.ok(podeFiado(saldo, 0, 999999).ok, 'sem limite');
});

test('fechamento do caixa: dinheiro esperado na gaveta', () => {
  const r = fechamentoCaixa({
    fundo: 100,
    suprimentos: [{ valor: 50 }],
    sangrias: [{ valor: 200 }],
    vendas: [
      { total: 35.5, pagamentos: [{ forma: 'dinheiro', valor: 50 }], troco: 14.5 },
      { total: 300, pagamentos: [{ forma: 'dinheiro', valor: 300 }] },
      { total: 20, pagamentos: [{ forma: 'pix', valor: 20 }] },
      { total: 999, pagamentos: [{ forma: 'dinheiro', valor: 999 }], cancelada: true },
    ],
    recebimentosFiado: [{ forma: 'dinheiro', valor: 30 }],
  });
  assert.equal(r.dinheiroEsperado, 10000 + 5000 - 1450 + 30000 + 3000 + 5000 - 20000);
  assert.equal(r.totalVendido, 35550);
  assert.equal(r.qtdVendas, 3);
});

test('relatório: lucro, ticket médio e curva ABC', () => {
  const vendas = [
    { total: 30, pagamentos: [{ forma: 'pix', valor: 30 }], itens: [{ produtoId: 'a', nome: 'Arroz', preco: 30, qtd: 1, custo: 20 }] },
    { total: 10, pagamentos: [{ forma: 'dinheiro', valor: 20 }], troco: 10, itens: [{ produtoId: 'b', nome: 'Bala', preco: 1, qtd: 10, custo: 0.5 }] },
  ];
  const r = resumoPeriodo(vendas);
  assert.equal(r.faturamento, 4000); assert.equal(r.custo, 2500); assert.equal(r.lucro, 1500); assert.equal(r.ticketMedio, 2000);
  assert.equal(r.porForma.dinheiro, 1000);
  assert.deepEqual(curvaABC(r.ranking).map((x) => x.classe), ['A', 'C']);
});

const XML = `<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe35261012345678000199550010000012341000012345" versao="4.00">
<ide><nNF>1234</nNF><serie>1</serie><dhEmi>2026-10-07T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000199</CNPJ><xNome>Distribuidora Boa &amp; Barata LTDA</xNome><xFant>Boa Barata</xFant></emit>
<det nItem="1"><prod><cProd>A1</cProd><cEAN>7891000100103</cEAN><xProd>ARROZ TIPO 1 5KG</xProd><NCM>10063021</NCM><uCom>FD</uCom><qCom>2.0000</qCom><vUnCom>120.00</vUnCom><vProd>240.00</vProd></prod></det>
<det nItem="2"><prod><cProd>B2</cProd><cEAN>SEM GTIN</cEAN><xProd>BALA SORTIDA</xProd><NCM>17049020</NCM><uCom>UN</uCom><qCom>10</qCom><vUnCom>1.5</vUnCom><vProd>15.00</vProd></prod></det>
<total><ICMSTot><vNF>255.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;

test('XML da nota do fornecedor', () => {
  const n = lerXmlNfe(XML);
  assert.equal(n.fornecedor.nome, 'Distribuidora Boa & Barata LTDA');
  assert.equal(n.fornecedor.cnpj, '12345678000199');
  assert.equal(n.numero, '1234');
  assert.equal(n.chave.length, 44);
  assert.equal(n.total, 255);
  assert.equal(n.itens.length, 2);
  assert.deepEqual(n.itens[0], { codigoFornecedor: 'A1', codigoBarras: '7891000100103', nome: 'ARROZ TIPO 1 5KG', ncm: '10063021', unidade: 'FD', qtd: 2, custoUnit: 120, total: 240 });
  assert.equal(n.itens[1].codigoBarras, '', 'SEM GTIN não vira código');
  assert.throws(() => lerXmlNfe('<html></html>'), /não é o XML/);
});

test('NFC-e: pedido do emissor com desconto rateado e troco', () => {
  const venda = {
    data: '2026-10-08T12:00:00Z',
    itens: [{ codigo: '7891000100103', nome: 'Arroz', preco: 30, qtd: 1, ncm: '10063021' }, { codigo: 'P9', nome: 'Queijo', preco: 40, qtd: 0.5, unidade: 'kg', ncm: '04069090' }],
    descontoVenda: { tipo: 'valor', valor: 5 },
    pagamentos: [{ forma: 'dinheiro', valor: 50 }], troco: 5,
  };
  const p = montarNfce(venda, { cnpj: '12.345.678/0001-99' }, { cpf: '123.456.789-09' });
  assert.equal(p.cnpj_emitente, '12345678000199');
  assert.equal(p.cpf_destinatario, '12345678909');
  assert.equal(p.items[0].codigo_barras_comercial, '7891000100103');
  assert.equal(p.items[1].unidade_comercial, 'KG');
  assert.equal(p.items[1].valor_bruto, 20);
  const desc = p.items.reduce((s, i) => s + Math.round((i.valor_desconto || 0) * 100), 0);
  assert.equal(desc, 500, 'desconto todo distribuído');
  assert.deepEqual(p.formas_pagamento, [{ forma_pagamento: '01', valor_pagamento: 50 }]);
  assert.equal(p.valor_troco, 5);
  assert.equal(p.items[0].icms_situacao_tributaria, '102');
  assert.deepEqual(pendenciasNfce({ itens: [{ nome: 'X', ncm: '' }] }, { cnpj: '1', token: '' }).length, 3);
  assert.deepEqual(pendenciasNfce(venda, { cnpj: '12345678000199', token: 't' }), []);
});

import { cupomTexto, escpos } from '../public/mercagestao/nucleo.js';

test('cupom em texto para impressora Bluetooth', () => {
  const venda = { numero: 7, data: '2026-10-08T12:00:00Z', itens: [{ nome: 'Pão francês', preco: 15.9, qtd: 0.5, unidade: 'kg' }, { nome: 'Café 500g', preco: 18, qtd: 2 }],
    pagamentos: [{ forma: 'dinheiro', valor: 50 }], troco: 6.05 };
  const t = cupomTexto(venda, { nome: 'Mercadinho São José', mensagem: 'Volte sempre!' }, 32);
  for (const linha of t.split('\n')) assert.ok(linha.length <= 32, linha);
  assert.match(t, /CUPOM NAO FISCAL/);
  assert.match(t, /Mercadinho Sao Jose/);
  assert.match(t, /0,500kg/);
  assert.match(t, /TOTAL\s+R\$\s43,95/);
  assert.match(t, /Troco\s+R\$\s6,05/);
  const b = escpos('Olá');
  assert.deepEqual([...b.slice(0, 5)], [0x1b, 0x40, 79, 108, 97]);
  assert.deepEqual([...b.slice(-4)], [0x1d, 0x56, 0x42, 0x00]);
});

test('etiqueta com preço: vale o total da etiqueta', () => {
  assert.equal(totalItem({ preco: 39.99, qtd: 0.499, totalFixo: 19.95 }), 1995);
  const p = montarNfce({ itens: [{ nome: 'Queijo', preco: 39.99, qtd: 0.499, unidade: 'kg', totalFixo: 19.95, ncm: '04069090' }], pagamentos: [{ forma: 'pix', valor: 19.95 }] }, { cnpj: '12345678000199' });
  assert.equal(p.items[0].valor_bruto, 19.95);
  assert.ok(Math.abs(p.items[0].quantidade_comercial * p.items[0].valor_unitario_comercial - 19.95) <= 0.01, 'SEFAZ aceita até 1 centavo de diferença');
});
