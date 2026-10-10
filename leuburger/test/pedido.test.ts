import { describe, expect, it } from 'vitest';
import { baixaEstoque, calcularItem, conferirPagamentos, lerValor, sugestoesTroco, totais, ErroPedido, situacaoEstoque } from '../src/regras/pedido';

const xbacon = {
  id: 'p1', nome: 'X-Bacon', preco: 2290, custo: 850,
  opcoes: {
    tamanhos: [{ nome: 'Padrão', preco: 2290 }, { nome: 'Duplo', preco: 2890 }],
    adicionais: [{ nome: 'Queijo extra', preco: 300 }, { nome: 'Bacon extra', preco: 400 }],
    retirar: ['Cebola', 'Tomate'],
  },
};

describe('item do pedido', () => {
  it('soma tamanho e adicionais (exemplo das telas: X-Bacon com queijo e bacon extra = R$ 29,90)', () => {
    const i = calcularItem(xbacon, { produtoId: 'p1', qtd: 1, tamanho: 'Padrão', adicionais: ['Queijo extra', 'Bacon extra'], retirar: ['Cebola'] });
    expect(i.precoUnit).toBe(2990);
    expect(i.total).toBe(2990);
    expect(i.detalhes.retirar).toEqual(['Cebola']);
  });
  it('tamanho duplo troca o preço base', () => {
    expect(calcularItem(xbacon, { produtoId: 'p1', qtd: 2, tamanho: 'Duplo' }).total).toBe(5780);
  });
  it('recusa quantidade inválida e opção inexistente', () => {
    expect(() => calcularItem(xbacon, { produtoId: 'p1', qtd: 0 })).toThrow(ErroPedido);
    expect(() => calcularItem(xbacon, { produtoId: 'p1', qtd: 1.5 })).toThrow(ErroPedido);
    expect(() => calcularItem(xbacon, { produtoId: 'p1', qtd: -2 })).toThrow(ErroPedido);
    expect(() => calcularItem(xbacon, { produtoId: 'p1', qtd: 1, adicionais: ['Ouro'] })).toThrow(ErroPedido);
    expect(() => calcularItem(xbacon, { produtoId: 'p1', qtd: 1, tamanho: 'Gigante' })).toThrow(ErroPedido);
  });
});

describe('totais e desconto', () => {
  const itens = [{ total: 2990 }, { total: 2980 }, { total: 700 }];
  it('total das telas: R$ 66,70 (e com R$ 5 de entrega)', () => {
    expect(totais(itens)).toEqual({ subtotal: 6670, desconto: 0, taxaEntrega: 0, total: 6670 });
    expect(totais(itens, null, 500).total).toBe(7170);
    expect(() => totais(itens, null, -1)).toThrow();
  });
  it('desconto em reais e em %', () => {
    expect(totais(itens, { tipo: 'valor', valor: 670 }).total).toBe(6000);
    expect(totais(itens, { tipo: 'pct', valor: 10 }).desconto).toBe(667);
  });
  it('desconto não passa do subtotal e não pode ser negativo', () => {
    expect(totais(itens, { tipo: 'valor', valor: 99999 }).total).toBe(0);
    expect(() => totais(itens, { tipo: 'pct', valor: 150 })).toThrow(ErroPedido);
  });
});

describe('pagamento', () => {
  it('troco em dinheiro (100,00 para 66,70 = 33,30)', () => {
    expect(conferirPagamentos(6670, [{ forma: 'dinheiro', valor: 10000 }]).troco).toBe(3330);
  });
  it('dividido entre pix e dinheiro', () => {
    expect(conferirPagamentos(6670, [{ forma: 'pix', valor: 4000 }, { forma: 'dinheiro', valor: 5000 }]).troco).toBe(2330);
  });
  it('recusa falta, valor negativo, forma inválida e troco em pix', () => {
    expect(() => conferirPagamentos(6670, [{ forma: 'pix', valor: 5000 }])).toThrow(/Falta/);
    expect(() => conferirPagamentos(6670, [{ forma: 'dinheiro', valor: -100 }])).toThrow(ErroPedido);
    expect(() => conferirPagamentos(6670, [{ forma: 'cheque', valor: 6670 }])).toThrow(ErroPedido);
    expect(() => conferirPagamentos(6670, [{ forma: 'pix', valor: 7000 }])).toThrow(/troco/);
    expect(() => conferirPagamentos(6670, [])).toThrow(ErroPedido);
  });
  it('sugestões de notas', () => expect(sugestoesTroco(6670)).toEqual([6670, 7000, 8000, 10000]));
});

describe('valores digitados', () => {
  it('lê vírgula e ponto', () => {
    expect(lerValor('66,70')).toBe(6670);
    expect(lerValor('1.234,50')).toBe(123450);
    expect(lerValor('12.5')).toBe(1250);
    expect(lerValor('')).toBe(0);
    expect(Number.isNaN(lerValor('abc'))).toBe(true);
    expect(Number.isNaN(lerValor('-5'))).toBe(true);
  });
});

describe('estoque', () => {
  it('baixa pela receita de cada produto', () => {
    const r = baixaEstoque(
      [{ produtoId: 'p1', qtd: 2 }, { produtoId: 'p2', qtd: 1 }],
      { p1: [{ item_id: 'pao', qtd: 1 }, { item_id: 'carne', qtd: 0.12 }], p2: [{ item_id: 'carne', qtd: 0.24 }] },
    );
    expect(r).toEqual({ pao: 2, carne: 0.48 });
  });
  it('situação', () => {
    expect(situacaoEstoque(0, 5)).toBe('sem');
    expect(situacaoEstoque(4, 5)).toBe('baixo');
    expect(situacaoEstoque(9, 5)).toBe('ok');
  });
});

describe('grupos de escolha', () => {
  const acai = { id: 'a1', nome: 'Açaí 400ml', preco: 1500, custo: 0, opcoes: { grupos: [
    { nome: 'Complementos', min: 2, max: 3, repetir: true, itens: [{ nome: 'Paçoca', preco: 0 }, { nome: 'Leite ninho', preco: 200 }] },
    { nome: 'Cobertura', min: 0, max: 1, itens: [{ nome: 'Morango', preco: 100 }] },
  ] } };
  it('soma as escolhas e confere mínimo e máximo', () => {
    const i = calcularItem(acai, { produtoId: 'a1', qtd: 2, escolhas: [{ grupo: 'Complementos', item: 'Paçoca', qtd: 1 }, { grupo: 'Complementos', item: 'Leite ninho', qtd: 2 }, { grupo: 'Cobertura', item: 'Morango', qtd: 1 }] });
    expect(i.precoUnit).toBe(1500 + 400 + 100);
    expect(i.detalhes.adicionais.map((a) => a.nome)).toEqual(['Paçoca', '2x Leite ninho', 'Morango']);
    expect(() => calcularItem(acai, { produtoId: 'a1', qtd: 1, escolhas: [{ grupo: 'Complementos', item: 'Paçoca', qtd: 1 }] })).toThrow(ErroPedido);
    expect(() => calcularItem(acai, { produtoId: 'a1', qtd: 1, escolhas: [{ grupo: 'Complementos', item: 'Paçoca', qtd: 4 }] })).toThrow(ErroPedido);
    expect(() => calcularItem(acai, { produtoId: 'a1', qtd: 1, escolhas: [{ grupo: 'Complementos', item: 'Paçoca', qtd: 2 }, { grupo: 'Cobertura', item: 'Morango', qtd: 2 }] })).toThrow(ErroPedido);
    expect(() => calcularItem(acai, { produtoId: 'a1', qtd: 1, escolhas: [{ grupo: 'Complementos', item: 'Bala', qtd: 2 }] })).toThrow(ErroPedido);
    // Caixa (sem escolhas) continua vendendo sem travar.
    expect(calcularItem(acai, { produtoId: 'a1', qtd: 1 }).total).toBe(1500);
  });
});
