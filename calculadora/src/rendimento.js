// Estatística de rendimento a partir dos resultados informados pelos usuários (somente valores agregados).

export const MIN_REGISTROS = 5;

function percentil(ordenados, p) {
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1));
  return ordenados[i];
}

/** Aceita só resultados plausíveis (entre 1/5 e 5x o rendimento base), para lixo não distorcer a média. */
export function rendimentoPlausivel(unidadesBase, receita) {
  const base = receita.rendimento.unidades;
  return Number.isFinite(unidadesBase) && unidadesBase >= base / 5 && unidadesBase <= base * 5;
}

/** registros: [{ unidadesBase, pesoUnidadeG }] — já normalizados para 1x a receita. */
export function estatisticaRendimento(receita, registros) {
  const n = registros.length;
  if (n < MIN_REGISTROS) {
    return { tipo: 'inicial', registros: n, min: receita.rendimento.faixa[0], max: receita.rendimento.faixa[1], tipico: receita.rendimento.unidades };
  }
  const valores = registros.map((r) => r.unidadesBase).sort((a, b) => a - b);
  const pesos = registros.map((r) => r.pesoUnidadeG).filter((p) => p > 0);
  return {
    tipo: 'comunidade',
    registros: n,
    min: Math.round(percentil(valores, 10)),
    max: Math.round(percentil(valores, 90)),
    tipico: Math.round(percentil(valores, 50)),
    pesoMedioG: pesos.length >= MIN_REGISTROS ? Math.round(pesos.reduce((s, p) => s + p, 0) / pesos.length) : null,
  };
}
