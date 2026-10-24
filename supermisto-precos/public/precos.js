// Contas do Precificador Supermisto (usadas no navegador e nos testes).
// Custo vem da matéria-prima (R$/kg) + embalagem; o preço mínimo já tira a taxa da Shopee e garante o lucro mínimo.

export const FORMATOS = [
  { id: 'sache', nome: 'Sachê 10 g', gramas: 10, emb: 'emb_sache', unidades: 1 },
  { id: 'kit5', nome: 'Kit 5 sachês', gramas: 50, emb: 'emb_sache', unidades: 5, kit: true },
  { id: 'kit10', nome: 'Kit 10 sachês', gramas: 100, emb: 'emb_sache', unidades: 10, kit: true },
  { id: 'p50', nome: 'Pacote 50 g', gramas: 50, emb: 'emb_50', unidades: 1 },
  { id: 'p100', nome: 'Pacote 100 g', gramas: 100, emb: 'emb_100', unidades: 1 },
  { id: 'kit10x100', nome: 'Kit 10 × 100 g (1 kg)', gramas: 1000, emb: 'emb_100', unidades: 10, kit: true },
];

export const CONFIG_PADRAO = {
  taxa_pct: 20, taxa_fixa: 4.5, lucro_min: 2, emb_sache: 0.35, emb_kit: 0.5, emb_50: 0.8, emb_100: 1,
};

const r2 = (v) => Math.round(v * 100) / 100;

/** Custo da matéria-prima por grama, pela receita (% de cada insumo). */
export function custoPorGrama(produto, insumos) {
  const preco = new Map(insumos.map((i) => [i.nome, Number(i.preco_kg) || 0]));
  return produto.receita.reduce((s, { insumo, pct }) => s + (pct / 100) * ((preco.get(insumo) || 0) / 1000), 0);
}

export function custoFormato(f, cpg, cfg) {
  return r2(f.gramas * cpg + (cfg[f.emb] || 0) * f.unidades + (f.kit ? cfg.emb_kit || 0 : 0));
}

/** Menor preço que paga a taxa da Shopee, o custo e ainda deixa o lucro mínimo. */
export function precoMinimo(custo, cfg) {
  return r2((custo + cfg.taxa_fixa + cfg.lucro_min) / (1 - cfg.taxa_pct / 100));
}

export function lucro(preco, custo, cfg) {
  return r2(preco * (1 - cfg.taxa_pct / 100) - cfg.taxa_fixa - custo);
}

/** Arredonda para cima terminando em ,90 (18,30 → 18,90). */
export const acima90 = (v) => { const b = Math.floor(v) + 0.9; return r2(b >= v - 1e-9 ? b : b + 1); };
/** Arredonda para baixo terminando em ,90 (19,50 → 18,90). */
export const abaixo90 = (v) => { const b = Math.floor(v) + 0.9; return r2(b <= v + 1e-9 ? b : b - 1); };

/** Concorrentes do mesmo produto com peso parecido, convertidos para o peso do formato. */
export function concorrentesDoFormato(f, lista) {
  return lista
    .filter((c) => c.gramas > 0 && c.preco > 0 && c.gramas >= f.gramas / 2 && c.gramas <= f.gramas * 2)
    .map((c) => ({ ...c, equivalente: r2((c.preco / c.gramas) * f.gramas) }))
    .sort((a, b) => a.equivalente - b.equivalente);
}

/**
 * Sugestão de preço para um formato:
 * - com concorrentes: 3% abaixo do mais barato (terminando em ,90), sem passar do preço mínimo;
 * - sem concorrentes: preço mínimo + 15%.
 */
export function sugerir(f, cpg, cfg, concorrentes) {
  const custo = custoFormato(f, cpg, cfg);
  const minimo = precoMinimo(custo, cfg);
  const conc = concorrentesDoFormato(f, concorrentes);
  let preco, situacao;
  if (!conc.length) { preco = acima90(minimo * 1.15); situacao = 'sem_concorrente'; }
  else {
    const alvo = abaixo90(conc[0].equivalente * 0.97);
    if (alvo >= minimo) { preco = alvo; situacao = 'mais_barato'; }
    else { preco = acima90(minimo); situacao = 'acima'; }
  }
  const media = conc.length ? r2(conc.reduce((s, c) => s + c.equivalente, 0) / conc.length) : null;
  return {
    formato: f.id, nome: f.nome, custo, minimo, preco, lucro: lucro(preco, custo, cfg), situacao,
    concorrentes: conc.length, maisBarato: conc[0] || null, maisCaro: conc[conc.length - 1] || null, media,
  };
}

/** "Sortido" (kit de vários sabores) usa a média do custo dos nossos produtos. */
export function tabelaProduto(produto, insumos, cfg, concorrentes, todos = []) {
  const outros = todos.filter((p) => p.receita.length);
  const cpg = produto.receita.length || !outros.length ? custoPorGrama(produto, insumos)
    : outros.reduce((s, p) => s + custoPorGrama(p, insumos), 0) / outros.length;
  const meus = concorrentes.filter((c) => c.produto_id === produto.id);
  return { produto, custo10g: r2(cpg * 10), formatos: FORMATOS.map((f) => sugerir(f, cpg, cfg, meus)), total: meus.length };
}
