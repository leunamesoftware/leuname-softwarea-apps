// Contas da aba Ceasa: da caixa de fruta fresca ao lucro do pacote e do kit (usadas no navegador, no servidor e nos testes).
import { precoMinimo, sugerir, lucro, tetoKg, abaixo90, acima90 } from './precos.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
/** Minúsculas e sem acento, para comparar texto da cotação. */
export const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- matéria-prima: caixa → kg pronto ---------- */

/** Preço e peso da caixa que valem hoje: o que o dono pagou por último ou, sem isso, a cotação. */
export function caixaAtual(p) {
  if (p.pago_caixa > 0) return { preco: p.pago_caixa, kg: p.pago_caixa_kg > 0 ? p.pago_caixa_kg : p.caixa_kg > 0 ? p.caixa_kg : 1, origem: 'pago', em: p.pago_em };
  if (p.preco_caixa > 0) return { preco: p.preco_caixa, kg: p.caixa_kg > 0 ? p.caixa_kg : 1, origem: 'tabela', em: p.tabela_em };
  return null;
}

/** Quantos kg de produto pronto saem de 1 kg comprado (descontando limpeza e secagem/moagem). */
export const rendimentoFinal = (p) => (1 - (p.perda_pct || 0) / 100) * ((p.rendimento_pct || 0) / 100);

/** Quanto custa 1 kg do produto pronto: preço do kg fresco ÷ o que sobra + secagem. */
export function custoKgPronto(p) {
  const c = caixaAtual(p), rend = rendimentoFinal(p);
  if (!c || !(rend > 0)) return null;
  const frescoKg = c.preco / c.kg;
  return { frescoKg: r2(frescoKg), prontoKg: r2(frescoKg / rend + (p.secagem_kg || 0)), kgProntoPorCaixa: r3(c.kg * rend), origem: c.origem, em: c.em, precoCaixa: c.preco, caixaKg: c.kg };
}

/* ---------- embalagens ---------- */
export const custoUnidade = (e) => (e.preco > 0 && e.quantidade > 0 ? e.preco / e.quantidade : 0);
export const somaUso = (lista, uso) => r2(lista.filter((e) => e.uso === uso).reduce((s, e) => s + custoUnidade(e), 0));
/** Embalagens ainda sem preço ou sem quantidade: sem elas o lucro mostrado fica maior do que o real. */
export const faltando = (lista) => lista.filter((e) => !(e.preco > 0 && e.quantidade > 0)).map((e) => e.nome);

/* ---------- parâmetros de venda ---------- */
/** Taxa da Shopee + extra do frete grátis + imposto, no formato das contas do Precificador. */
export const configVenda = (cfg, extraPct = 0) => ({ ...cfg, taxa_pct: (Number(cfg.taxa_pct) || 0) + (Number(extraPct) || 0) });

/** Custo de um pacote vendido sozinho (tempero + saquinho + solapa + etiqueta + envio). */
export function custoPacote(p, gramas, embalagens, sozinho = true) {
  const k = custoKgPronto(p);
  if (!k) return null;
  const emb = somaUso(embalagens, 'pacote') + (sozinho ? somaUso(embalagens, 'envio') : 0);
  return { materia: r2((gramas / 1000) * k.prontoKg), embalagem: r2(emb), total: r2((gramas / 1000) * k.prontoKg + emb) };
}

/**
 * Linha completa de um produto num peso: custo, preço mínimo, sugestão contra o concorrente,
 * lucro no preço escolhido e quanto pode custar a caixa para continuar valendo a pena.
 */
export function analisarProduto(p, gramas, embalagens, cfgBase, extraPct, concorrentes) {
  const k = custoKgPronto(p);
  if (!k) return { produto: p, gramas, semPreco: true };
  const cfg = configVenda(cfgBase, extraPct);
  const c = custoPacote(p, gramas, embalagens, true);
  const embTotal = c.embalagem;
  const minimo = precoMinimo(c.total, cfg);
  const meus = concorrentes.filter((x) => x.produto_id === p.id);
  const f = { id: `p${gramas}`, nome: `Pacote ${gramas} g`, gramas, emb: 'emb_ceasa', unidades: 1 };
  const s = sugerir(f, k.prontoKg / 1000, { ...cfg, emb_ceasa: embTotal, etiqueta: 0, emb_kit: 0 }, meus);
  const preco = p.preco_venda > 0 && p.gramas_venda === gramas ? p.preco_venda : s.preco;
  const sobra = lucro(preco, c.total, cfg);
  // Até quanto pode custar o kg pronto (e a caixa) para vender a `preco` e ainda sobrar o lucro mínimo.
  const tetoPronto = tetoKg(preco, gramas, embTotal, cfg);
  const tetoFresco = tetoPronto == null ? null : r2(Math.max(0, (tetoPronto - (p.secagem_kg || 0)) * rendimentoFinal(p)));
  const tetoCaixa = tetoFresco == null ? null : r2(tetoFresco * k.caixaKg);
  return {
    produto: p, gramas, custo: c, k, minimo, sugerido: s.preco, situacao: s.situacao, concorrentes: s.concorrentes,
    maisBarato: s.maisBarato, preco, usandoSugerido: !(p.preco_venda > 0 && p.gramas_venda === gramas),
    sobra, ok: sobra >= cfg.lucro_min, tetoKgPronto: tetoPronto, tetoKgFresco: tetoFresco, tetoCaixa,
    caixaOk: tetoCaixa != null && k.precoCaixa <= tetoCaixa, margemPct: preco > 0 ? Math.round((sobra / preco) * 100) : 0,
  };
}

/* ---------- kits ---------- */
/** Custo, taxas e sobra de um kit; compara com vender os mesmos pacotes sozinhos. */
export function analisarKit(kit, produtos, embalagens, cfgBase, extraPct, precoUnitario = {}) {
  const cfg = configVenda(cfgBase, extraPct);
  const itens = (kit.itens || []).map((i) => {
    const p = produtos.find((x) => x.id === i.produto_id);
    const k = p && custoKgPronto(p);
    const materia = k ? (i.gramas / 1000) * k.prontoKg : null;
    return { ...i, nome: p?.nome || i.produto_id, materia: materia == null ? null : r2(materia), semPreco: !k };
  });
  const semPreco = itens.filter((i) => i.semPreco).map((i) => i.nome);
  const materia = r2(itens.reduce((s, i) => s + (i.materia || 0), 0));
  const embPacotes = r2(somaUso(embalagens, 'pacote') * itens.length);
  const embKit = somaUso(embalagens, 'kit');
  const custo = r2(materia + embPacotes + embKit);
  const preco = Number(kit.preco) || 0;
  const shopee = r2(preco * (cfg.taxa_pct / 100) + (preco > 0 ? cfg.taxa_fixa : 0));
  const imposto = r2(preco * ((cfg.imposto_pct || 0) / 100));
  const sobra = r2(preco - shopee - imposto - custo);
  const minimo = precoMinimo(custo, cfg);
  const gramasTotal = itens.reduce((s, i) => s + i.gramas, 0);
  const soltos = itens.reduce((s, i) => s + (precoUnitario[i.produto_id] > 0 ? precoUnitario[i.produto_id] * (i.gramas / 200) : 0), 0);
  return {
    itens, semPreco, materia, embPacotes, embKit, custo, preco, shopee, imposto, sobra, minimo, gramasTotal,
    ok: preco > 0 && sobra >= cfg.lucro_min, porPacote: itens.length ? r2(preco / itens.length) : null,
    sobraMes: r2(sobra * (kit.vendas_mes || 0)), soltos: r2(soltos),
    economia: soltos > 0 && preco > 0 ? Math.max(0, Math.round((1 - preco / soltos) * 100)) : null,
  };
}

/* ---------- leitura da cotação (PDF ou texto colado) ---------- */
const NUM = /\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+[.,]\d{1,2}|\d+/g;
const toNum = (s) => Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
const UNIDADES = [['cx', /\b(cx|caixa|cxa)\b/], ['sc', /\b(sc|saco|saca)\b/], ['kg', /\bkg\b|\bquilo\b/], ['dz', /\b(dz|duzia)\b/], ['un', /\b(un|und|unid|unidade)\b/], ['mc', /\b(maco|mc)\b/], ['bd', /\b(bd|bdj|bandeja)\b/]];

/**
 * Uma linha da cotação. No boletim da Ceasa-RJ as colunas são: produto, tipo, unidade e embalagem,
 * variação em 12 meses (%), mínimo, modal (o preço mais comum) e máximo. Pega os três últimos preços
 * e usa o modal; em outros formatos usa o do meio.
 */
export function lerLinha(linha) {
  const t = norm(linha);
  const unid = (UNIDADES.find(([, re]) => re.test(t)) || [])[0] || null;
  let kgUn = null, resto = t;
  const mp = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr)\b/);
  if (mp) { const v = toNum(mp[1]); kgUn = mp[2] === 'kg' ? v : v / 1000; resto = t.replace(mp[0], ' '); }
  if (!kgUn && unid === 'kg') kgUn = 1;
  const pc = resto.match(/-?\d[\d.]*,\d+\s*%/);
  const var12 = pc ? toNum(pc[0].replace(/[%\s]/g, '')) : null;
  if (pc) resto = resto.replace(/-?\d[\d.]*,\d+\s*%/g, ' ');
  const precos = (resto.match(NUM) || []).filter((n) => /[.,]\d{1,2}$/.test(n)).map(toNum).filter((n) => n >= 0 && n < 5000);
  if (!precos.some((n) => n > 0)) return null;
  let min = null, max = null, preco;
  if (precos.length >= 3) {
    const [a, m, z] = precos.slice(-3);
    min = a; max = z;
    preco = m > 0 ? m : r2([a, z].filter((n) => n > 0).reduce((x, y) => x + y, 0) / [a, z].filter((n) => n > 0).length);
  } else {
    const ord = precos.filter((n) => n > 0).sort((x, y) => x - y);
    preco = ord[Math.floor((ord.length - 1) / 2)]; min = ord[0]; max = ord[ord.length - 1];
  }
  return { unidade: unid, kg_unidade: kgUn, preco, min, max, var12, precos };
}

/** Acha na cotação só as linhas dos nossos produtos. Devolve, por produto, as linhas candidatas. */
export function lerCotacao(texto, produtos) {
  const linhas = String(texto || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const achados = {};
  for (const l of linhas) {
    const t = norm(l);
    for (const p of produtos) {
      const quer = p.palavras.split(',').map((w) => norm(w).trim()).filter(Boolean);
      const nao = String(p.exclui || '').split(',').map((w) => norm(w).trim()).filter(Boolean);
      if (!quer.some((w) => t.includes(w)) || nao.some((w) => t.includes(w))) continue;
      const v = lerLinha(l);
      if (!v) continue;
      (achados[p.id] = achados[p.id] || []).push({ linha: l.slice(0, 160), ...v });
    }
  }
  // do mais barato por kg para o mais caro: o primeiro já vem escolhido na tela (o dono troca se quiser outra variedade)
  const porKg = (x) => (x.kg_unidade > 0 ? x.preco / x.kg_unidade : Infinity);
  for (const id of Object.keys(achados)) achados[id] = achados[id].sort((x, y) => porKg(x) - porKg(y)).slice(0, 12);
  const data = String(texto || '').match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  return { achados, data: data ? `${data[3]}-${data[2]}-${data[1]}` : null, linhas: linhas.length };
}

/* ---------- ajuda para o painel ---------- */
export { r2, acima90, abaixo90 };

/* ---------- "vou comprar hoje": está caro ou barato? ---------- */
const f2 = (v) => `R$ ${r2(v).toFixed(2).replace('.', ',')}`;

/**
 * Um produto hoje: compara o kg fresco com as cotações dos últimos `dias` dias que o dono já lançou.
 * Sem histórico, usa a variação em 12 meses que vem no próprio boletim (muito acima do ano passado = caro).
 * nivel: 'bom' | 'normal' | 'caro' | 'sem_dados'. Também confere se a caixa ainda cabe no preço de venda.
 */
export function avaliarCompra(p, historico, analise, dias = 7, hoje = new Date().toISOString().slice(0, 10)) {
  const c = caixaAtual(p);
  if (!c) return { nivel: 'sem_dados', texto: 'Ainda não tenho o preço de hoje. Leia a cotação primeiro.' };
  const atual = c.preco / c.kg;
  const limite = new Date(new Date(hoje + 'T12:00:00').getTime() - dias * 864e5).toISOString().slice(0, 10);
  const lista = historico.filter((h) => h.produto_id === p.id && h.tipo === 'tabela' && h.preco_kg > 0);
  const antes = lista.filter((h) => h.data >= limite && h.data < hoje).map((h) => h.preco_kg);
  const ultima = lista.slice().sort((a, b) => b.data.localeCompare(a.data))[0];
  const var12 = ultima && ultima.var12 != null ? ultima.var12 : null;
  const tem = analise && !analise.semPreco;
  const cabe = !tem || analise.caixaOk;
  let nivel, frase;
  if (antes.length) {
    const media = antes.reduce((s, v) => s + v, 0) / antes.length, menor = Math.min(...antes), maior = Math.max(...antes);
    if (atual <= menor * 1.03) { nivel = 'bom'; frase = `Hoje ${f2(atual)}/kg, no nível do menor dos últimos ${antes.length} dia(s) (${f2(menor)}).`; }
    else if (atual <= media * 1.05) { nivel = 'normal'; frase = `Hoje ${f2(atual)}/kg, perto da média de ${f2(media)}.`; }
    else { nivel = 'caro'; frase = `Hoje ${f2(atual)}/kg, ${Math.round((atual / media - 1) * 100)}% acima da média de ${f2(media)} (menor ${f2(menor)}).`; }
  } else if (var12 != null) {
    nivel = var12 >= 40 ? 'caro' : var12 <= -10 ? 'bom' : 'normal';
    frase = `Hoje ${f2(atual)}/kg. Ainda sem dias para comparar; o boletim mostra ${var12 > 0 ? '+' : ''}${Math.round(var12)}% em 12 meses.`;
  } else { nivel = 'normal'; frase = `Hoje ${f2(atual)}/kg. Ainda sem dias para comparar: mande a cotação dos próximos dias.`; }
  if (!cabe) { nivel = 'caro'; frase += ` E a esse preço de caixa (${f2(c.preco)}) o pacote não deixa o lucro mínimo: o máximo seria ${f2(analise.tetoCaixa)} na caixa.`; }
  return { nivel, texto: frase, atual: r2(atual), dias: antes.length, var12, caixaOk: cabe, teto: tem ? analise.tetoCaixa : null };
}

/**
 * Luz verde ou vermelha para ir à Ceasa. Um produto caro é tolerado (compra os outros e espera esse);
 * a partir de 2 caros e mais que `limitePct` % dos produtos, é vermelho: espere o dia seguinte.
 */
export function semaforo(produtos, historico, analises, limitePct = 10, hoje) {
  const lista = produtos.map((p, i) => ({ produto: p, ...avaliarCompra(p, historico, analises[i], 7, hoje) })).filter((x) => x.nivel !== 'sem_dados' || caixaAtual(x.produto));
  const com = lista.filter((x) => x.nivel !== 'sem_dados');
  if (!com.length) return { nivel: 'sem_dados', titulo: 'Sem cotação ainda', texto: 'Jogue o PDF da cotação da Ceasa para eu dizer se está bom para comprar.', lista, caros: 0, total: 0, comprar: [], esperar: [] };
  const caros = com.filter((x) => x.nivel === 'caro');
  const pct = (caros.length / com.length) * 100;
  const comprar = com.filter((x) => x.nivel !== 'caro').map((x) => x.produto.nome), esperar = caros.map((x) => x.produto.nome);
  let nivel, titulo, texto;
  if (caros.length >= 2 && pct > limitePct) { nivel = 'vermelho'; titulo = '🔴 Hoje não compensa comprar'; texto = `${caros.length} de ${com.length} produtos estão caros (${Math.round(pct)}%). Espere a cotação de amanhã.`; }
  else if (caros.length === 1) { nivel = 'amarelo'; titulo = '🟡 Pode ir, menos um produto'; texto = `Só ${esperar[0]} está caro. Compre os outros e espere esse.`; }
  else { nivel = 'verde'; titulo = '🟢 Bom para comprar hoje'; texto = `Nenhum dos ${com.length} produtos está caro. Pode ir à Ceasa.`; }
  return { nivel, titulo, texto, lista, caros: caros.length, total: com.length, pct: Math.round(pct), comprar, esperar };
}
