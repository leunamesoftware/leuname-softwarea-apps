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
  taxa_pct: 20, taxa_fixa: 4.5, lucro_min: 2, emb_sache: 0.35, emb_kit: 0.5, emb_50: 0.8, emb_100: 1, etiqueta: 0.1,
};

const r2 = (v) => Math.round(v * 100) / 100;

/** Quilo pronto = o que pagou ÷ o que sobrou depois de moer/secar (2 kg por R$ 20 que viram 1 kg = R$ 20 o kg). */
export function precoKgReal(pago, comprado, rendeu) {
  const kg = Number(rendeu) > 0 ? Number(rendeu) : Number(comprado);
  return kg > 0 && Number(pago) >= 0 ? r2(Number(pago) / kg) : null;
}

/** Custo da matéria-prima por grama, pela receita (% de cada insumo). */
export function custoPorGrama(produto, insumos) {
  const preco = new Map(insumos.map((i) => [i.nome, Number(i.preco_kg) || 0]));
  return produto.receita.reduce((s, { insumo, pct }) => s + (pct / 100) * ((preco.get(insumo) || 0) / 1000), 0);
}

export function custoFormato(f, cpg, cfg) {
  return r2(f.gramas * cpg + ((cfg[f.emb] || 0) + (cfg.etiqueta || 0)) * f.unidades + (f.kit ? cfg.emb_kit || 0 : 0));
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
    formato: f.id, nome: f.nome, gramas: f.gramas, custo, minimo, preco, lucro: lucro(preco, custo, cfg), situacao,
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

/* ---------- Mercado: o que vende mais, por qual preço ---------- */
export const FAIXAS = [
  { id: 'f10', nome: 'Sachê (até 30 g)', de: 1, ate: 30, formatos: ['sache'] },
  { id: 'f50', nome: 'Kits e pacotes de ~50 g', de: 31, ate: 75, formatos: ['kit5', 'p50'] },
  { id: 'f100', nome: 'Kits e pacotes de ~100 g', de: 76, ate: 150, formatos: ['kit10', 'p100'] },
  { id: 'f500', nome: 'Kits de 250 a 500 g', de: 151, ate: 600, formatos: [] },
  { id: 'f1000', nome: 'Kits de ~1 kg', de: 601, ate: 5000, formatos: ['kit10x100'] },
];

/**
 * Para cada faixa de peso: os anúncios, o mais vendido, o mais barato e os alertas.
 * `meus` = resultado de sugerir() de cada formato (para comparar com o nosso mínimo).
 */
export function analisarMercado(concorrentes, meus) {
  return FAIXAS.map((fx) => {
    const pts = concorrentes.filter((c) => c.gramas >= fx.de && c.gramas <= fx.ate && c.preco > 0);
    if (!pts.length) return { ...fx, pontos: [], alertas: [] };
    const porPreco = [...pts].sort((a, b) => a.preco - b.preco);
    const comVenda = pts.filter((c) => c.vendidos > 0).sort((a, b) => b.vendidos - a.vendidos);
    const barato = porPreco[0], caro = porPreco[porPreco.length - 1], top = comVenda[0] || null;
    const nosso = meus.filter((m) => fx.formatos.includes(m.formato)).sort((a, b) => a.minimo - b.minimo)[0];
    const alertas = [];
    if (top && top !== barato && top.preco > barato.preco) {
      alertas.push({ tipo: 'info', texto: `O mais vendido (${top.vendidos.toLocaleString('pt-BR')} vendas) custa R$ ${top.preco.toFixed(2).replace('.', ',')}, mais caro que o mais barato (R$ ${barato.preco.toFixed(2).replace('.', ',')}). O cliente paga mais por foto, avaliação e confiança: dá para cobrar até perto de R$ ${top.preco.toFixed(2).replace('.', ',')}.` });
    }
    if (top && nosso) {
      const ref = r2(top.preco * (nosso.gramas / top.gramas));
      if (nosso.minimo <= ref) alertas.push({ tipo: 'bom', texto: `${nosso.nome}: seu mínimo é R$ ${nosso.minimo.toFixed(2).replace('.', ',')} e o mais vendido cobra R$ ${ref.toFixed(2).replace('.', ',')} pelo mesmo peso. Dá para entrar de frente com ele.` });
      else alertas.push({ tipo: 'ruim', texto: `${nosso.nome}: seu mínimo (R$ ${nosso.minimo.toFixed(2).replace('.', ',')}) passa do preço do mais vendido (R$ ${ref.toFixed(2).replace('.', ',')}). Baixe o custo ou venda em outro formato.` });
    }
    if (!comVenda.length) alertas.push({ tipo: 'info', texto: 'Os prints desta faixa não mostram vendas. Tire prints com o "vendidos" aparecendo.' });
    return { ...fx, pontos: pts, maisBarato: barato, maisCaro: caro, maisVendido: top, nosso, alertas };
  });
}

/** Preço médio a cada 100 g por dia (para ver se o mercado está subindo ou descendo). */
export function tendencia(concorrentes) {
  const dias = new Map();
  for (const c of concorrentes) {
    if (!(c.gramas > 0 && c.preco > 0 && c.criado_em)) continue;
    const d = c.criado_em.slice(0, 10);
    const l = dias.get(d) || []; l.push((c.preco / c.gramas) * 100); dias.set(d, l);
  }
  return [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, valor: r2(v.reduce((s, x) => s + x, 0) / v.length) }));
}
