// Regras de cálculo da Calculadora Inteligente (sem dependências; testado em test/calculo.test.mjs).

export const UNIDADES = {
  g: { familia: 'massa', base: 1 },
  kg: { familia: 'massa', base: 1000 },
  ml: { familia: 'volume', base: 1 },
  L: { familia: 'volume', base: 1000 },
  un: { familia: 'unidade', base: 1 },
  'xícara': { familia: 'volume', base: 240 },
  'colher de sopa': { familia: 'volume', base: 15 },
  'colher de chá': { familia: 'volume', base: 5 },
};

// g por ml, para converter medidas caseiras em peso (valores médios de cozinha).
const DENSIDADES = [
  ['leite condensado', 1.3], ['creme de leite', 1.0], ['leite em pó', 0.45], ['leite', 1.03],
  ['açúcar mascavo', 0.8], ['açúcar', 0.85], ['farinha', 0.5], ['trigo', 0.5], ['fubá', 0.6],
  ['amido', 0.55], ['maisena', 0.55], ['polvilho', 0.6], ['coco', 0.35], ['aveia', 0.35],
  ['chocolate', 0.4], ['cacau', 0.4], ['achocolatado', 0.45], ['óleo', 0.92], ['azeite', 0.92],
  ['manteiga', 0.95], ['margarina', 0.95], ['mel', 1.4], ['sal', 1.2], ['arroz', 0.8],
  ['fermento', 0.8], ['água', 1], ['vinagre', 1],
];

export function normalizar(nome) {
  return String(nome || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

export function densidade(nome) {
  const n = normalizar(nome);
  const achada = DENSIDADES.find(([chave]) => n.includes(normalizar(chave)));
  return achada ? achada[1] : null;
}

/** Converte uma quantidade entre unidades. Retorna null quando não dá (ex.: "un" para "g"). */
export function converter(qtd, de, para, nome) {
  const a = UNIDADES[de], b = UNIDADES[para];
  if (!a || !b || !Number.isFinite(qtd)) return null;
  const emBase = qtd * a.base;
  if (a.familia === b.familia) return emBase / b.base;
  const d = densidade(nome);
  if (!d) return null;
  if (a.familia === 'volume' && b.familia === 'massa') return (emBase * d) / b.base;
  if (a.familia === 'massa' && b.familia === 'volume') return emBase / d / b.base;
  return null;
}

// Consumo médio de gás de cozinha (kg por hora) em fogão doméstico.
export const CHAMAS = {
  baixa: { rotulo: 'Fogo baixo', kgHora: 0.08 },
  media: { rotulo: 'Fogo médio', kgHora: 0.15 },
  alta: { rotulo: 'Fogo alto', kgHora: 0.23 },
  forno: { rotulo: 'Forno', kgHora: 0.2 },
};
const KG_BOTIJAO = 13;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const arred = (v) => Math.round(v * 100) / 100;
/** Arredonda preço de venda para cima, de 50 em 50 centavos. */
export const precoRedondo = (v) => Math.ceil(v * 2 - 1e-9) / 2;

/**
 * Calcula custos, sobras, preços sugeridos e lucro de uma receita.
 * item: { nome, qtd, unidade, emb: { qtd, unidade, preco }, restante? } — restante = estoque atual (na unidade da embalagem).
 */
export function calcularReceita(e) {
  const escala = num(e.escala) > 0 ? num(e.escala) : 1;
  const itens = (e.itens || []).map((it) => {
    const uso = num(it.qtd) * escala;
    const emb = it.emb || {};
    const qtdEmb = num(emb.qtd), preco = num(emb.preco);
    const usoNaEmb = converter(uso, it.unidade, emb.unidade, it.nome);
    if (!qtdEmb || usoNaEmb === null) {
      return { nome: it.nome, uso, unidade: it.unidade, custo: 0, erro: qtdEmb ? 'unidade' : 'preco' };
    }
    const custo = (preco / qtdEmb) * usoNaEmb;
    const disponivel = Number.isFinite(it.restante) ? it.restante : qtdEmb;
    const sobra = disponivel - usoNaEmb;
    return {
      nome: it.nome, uso, unidade: it.unidade, custo: arred(custo), precoPago: preco,
      usoNaEmb, unidadeEmb: emb.unidade, sobra, sobraValor: arred(Math.max(sobra, 0) * (preco / qtdEmb)), falta: sobra < 0,
    };
  });

  const custoIngredientes = arred(itens.reduce((s, i) => s + i.custo, 0));
  const gas = e.gas || {};
  const chama = CHAMAS[gas.chama] || CHAMAS.media;
  const custoGas = arred((num(gas.minutos) / 60) * chama.kgHora * (num(gas.precoBotijao) / KG_BOTIJAO));
  const unidades = Math.max(0, Math.floor(num(e.unidades)));
  const custoEmbalagens = arred(num(e.embalagemPorUnidade) * unidades);
  const custoOutros = arred(num(e.outros));
  const custoTotal = arred(custoIngredientes + custoGas + custoEmbalagens + custoOutros);
  const custoUnidade = unidades ? custoTotal / unidades : 0;
  const custoTempo = arred(num(e.horas) * num(e.valorHora));

  const sugestoes = unidades ? [
    { rotulo: 'Preço de entrada', fator: 2 },
    { rotulo: 'Recomendado', fator: 2.5 },
    { rotulo: 'Produto caprichado', fator: 3 },
  ].map((s) => {
    const preco = precoRedondo(custoUnidade * s.fator);
    return { ...s, preco, lucroUnidade: arred(preco - custoUnidade), lucroTotal: arred((preco - custoUnidade) * unidades) };
  }) : [];
  const precoMinimo = unidades ? precoRedondo((custoTotal + custoTempo) / unidades) : 0;

  const precoVenda = num(e.precoVenda);
  let venda = null;
  if (precoVenda > 0 && unidades) {
    const lucroUnidade = precoVenda - custoUnidade;
    const lucroTotal = lucroUnidade * unidades;
    const meta = num(e.metaMensal);
    venda = {
      precoVenda, lucroUnidade: arred(lucroUnidade), lucroTotal: arred(lucroTotal),
      faturamento: arred(precoVenda * unidades), lucroAposTempo: arred(lucroTotal - custoTempo),
      margem: Math.round((lucroUnidade / precoVenda) * 100),
      unidadesParaMeta: meta > 0 && lucroUnidade > 0 ? Math.ceil(meta / lucroUnidade) : null,
    };
  }

  const totalPago = arred(itens.reduce((s, i) => s + (i.precoPago || 0), 0));
  const sobraValor = arred(itens.reduce((s, i) => s + (i.sobraValor || 0), 0));
  return {
    itens, escala, unidades, custoIngredientes, custoGas, custoEmbalagens, custoOutros, custoTotal,
    custoUnidade: arred(custoUnidade), custoTempo, precoMinimo, sugestoes, venda,
    compras: { totalPago, usadoNaReceita: custoIngredientes, sobraValor },
  };
}
