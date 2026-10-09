// LeuPede: app de pedidos dos clientes. Um app só para todas as lojas.
// - Público (sem login): lista de lojas perto do cliente, cardápio da loja, fazer pedido e acompanhar.
// - Loja (com login): pedidos do app para aceitar ou recusar e a configuração da loja no app.
// O cliente nunca vê custo, receita, estoque nem dados de outras lojas; cada loja só vê os pedidos dela.
import { Hono } from 'hono';
import { z } from 'zod';
import { calcularItem, ErroPedido, FORMAS, totais, type EscolhaItem, type ItemCalculado, type ProdutoPreco } from '../regras/pedido';
import { agora, aleatorio, corpo, erro, novoId, type C, type D1Prepared, type Empresa, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';
import { registrarVenda } from './vendas';

export const NOME_APP = 'LeuPede';
export const TIPOS_LOJA = { lanches: 'Lanches', hamburgueria: 'Hamburgueria', restaurante: 'Restaurante', marmitaria: 'Marmitaria', pizzaria: 'Pizzaria', acai: 'Açaí e sorvetes', pastelaria: 'Pastelaria', japonesa: 'Comida japonesa', doces: 'Doces e bolos', bebidas: 'Bebidas' } as const;

type Loja = Empresa & {
  slug: string; no_app: number; aceitando: number; tipo_loja: string; descricao: string | null; logo_id: string | null; capa_id: string | null; tempo_entrega: string | null;
  pedido_minimo: number; faz_entrega: number; faz_retirada: number; lat: number | null; lng: number | null; raio_km: number; taxa_entrega_padrao: number;
};

/** Loja com acesso em dia (assinatura, teste ou vitalício) e ligada no app. */
const LOJA_ATIVA = "e.no_app = 1 AND e.slug IS NOT NULL AND (e.acesso_ate IS NULL OR e.acesso_ate > ?) AND EXISTS (SELECT 1 FROM produtos p WHERE p.empresa_id = e.id AND p.ativo = 1)";
const limiteAcesso = () => new Date(Date.now() - 864e5).toISOString();
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const digitos = (s: string | null | undefined) => String(s || '').replace(/\D/g, '');

/** Distância em km entre dois pontos (fórmula de haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const cartaoLoja = (e: Loja, distancia: number | null) => ({
  slug: e.slug, nome: e.nome, tipo: e.tipo_loja, tipo_nome: TIPOS_LOJA[e.tipo_loja as keyof typeof TIPOS_LOJA] || 'Lanches', descricao: e.descricao,
  logo_id: e.logo_id, capa_id: e.capa_id, cidade: e.cidade, uf: e.uf, aceitando: Boolean(e.aceitando), tempo_entrega: e.tempo_entrega,
  taxa_entrega: e.taxa_entrega_padrao || 0, pedido_minimo: e.pedido_minimo || 0, faz_entrega: Boolean(e.faz_entrega), faz_retirada: Boolean(e.faz_retirada),
  distancia: distancia == null ? null : Math.round(distancia * 10) / 10,
  // Fora do raio de entrega da loja: o cliente ainda vê, mas só pode retirar.
  entrega_aqui: Boolean(e.faz_entrega) && (distancia == null || distancia <= (e.raio_km || 8)),
});

async function lojaPorSlug(c: C, slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw erro(404, 'loja_nao_encontrada', 'Loja não encontrada.');
  const e = await c.env.BANCO.prepare(`SELECT e.* FROM empresas e WHERE e.slug = ? AND ${LOJA_ATIVA}`).bind(slug, limiteAcesso()).first<Loja>();
  if (!e) throw erro(404, 'loja_nao_encontrada', 'Esta loja não está no app no momento.');
  return e;
}

/** Recalcula o pedido do app com os preços de agora (nunca confia no preço do aparelho). */
async function calcularPedidoApp(c: C, e: Loja, escolhas: EscolhaItem[], tipo: 'entrega' | 'balcao') {
  const ids = [...new Set(escolhas.map((i) => i.produtoId))];
  const { results: prods } = await c.env.BANCO.prepare(`SELECT id, nome, preco, custo, opcoes, ativo FROM produtos WHERE empresa_id = ? AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(e.id, ...ids).all<{ id: string; nome: string; preco: number; custo: number; opcoes: string; ativo: number }>();
  const porId = new Map(prods.map((p) => [p.id, p]));
  let itens: ItemCalculado[], t: ReturnType<typeof totais>;
  try {
    itens = escolhas.map((x) => {
      const p = porId.get(x.produtoId);
      if (!p || !p.ativo) throw new ErroPedido('Um item do carrinho não está mais no cardápio. Tire ele e tente de novo.');
      const pp: ProdutoPreco = { id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, opcoes: JSON.parse(p.opcoes || '{}') };
      return calcularItem(pp, { ...x, tamanho: x.tamanho ?? null });
    });
    t = totais(itens, null, tipo === 'entrega' ? e.taxa_entrega_padrao || 0 : 0);
  } catch (err) {
    if (err instanceof ErroPedido) throw erro(400, 'pedido_invalido', err.message);
    throw err;
  }
  return { itens, ...t };
}

// ---------- público (sem login) ----------
export const appPublico = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Lojas para o cliente: perto dele (se mandou a localização) ou da cidade escolhida. */
appPublico.get('/publico/app/lojas', async (c) => {
  const q = c.req.query(), lat = Number(q.lat), lng = Number(q.lng);
  const temLocal = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const { results } = await c.env.BANCO.prepare(`SELECT e.* FROM empresas e WHERE ${LOJA_ATIVA} LIMIT 2000`).bind(limiteAcesso()).all<Loja>();
  const cidade = semAcento(String(q.cidade || '')), busca = semAcento(String(q.busca || ''));
  let lojas = results.map((e) => ({ e, d: temLocal && e.lat != null && e.lng != null ? distanciaKm({ lat, lng }, { lat: e.lat, lng: e.lng }) : null }));
  if (temLocal) lojas = lojas.filter(({ e, d }) => (d != null ? d <= 40 : cidade && semAcento(e.cidade || '') === cidade));
  else if (cidade) lojas = lojas.filter(({ e }) => semAcento(e.cidade || '') === cidade);
  if (busca) lojas = lojas.filter(({ e }) => semAcento(`${e.nome} ${e.descricao || ''} ${TIPOS_LOJA[e.tipo_loja as keyof typeof TIPOS_LOJA] || ''}`).includes(busca));
  lojas.sort((a, b) => Number(b.e.aceitando) - Number(a.e.aceitando) || (a.d ?? 1e9) - (b.d ?? 1e9) || a.e.nome.localeCompare(b.e.nome));
  return c.json({ lojas: lojas.slice(0, 200).map(({ e, d }) => cartaoLoja(e, d)) });
});

/** Cidades que têm lojas no app (para quem não quer mandar a localização). */
appPublico.get('/publico/app/cidades', async (c) => {
  const { results } = await c.env.BANCO.prepare(`SELECT e.cidade, e.uf, COUNT(*) AS lojas FROM empresas e WHERE ${LOJA_ATIVA} AND e.cidade IS NOT NULL GROUP BY e.cidade, e.uf ORDER BY e.cidade`)
    .bind(limiteAcesso()).all();
  return c.json({ cidades: results });
});

/** Cardápio da loja: só o que o cliente precisa ver (sem custo, receita ou estoque). */
appPublico.get('/publico/app/loja/:slug', async (c) => {
  const e = await lojaPorSlug(c, c.req.param('slug'));
  const db = c.env.BANCO;
  const { results: categorias } = await db.prepare(`SELECT id, nome, icone FROM categorias c WHERE empresa_id = ? AND ativo = 1
    AND EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id = c.id AND p.ativo = 1) ORDER BY ordem, nome`).bind(e.id).all();
  const { results: produtos } = await db.prepare(`SELECT p.id, p.categoria_id, p.nome, p.descricao, p.preco, p.foto_id, p.opcoes, c.icone AS categoria_icone FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.empresa_id = ? AND p.ativo = 1 ORDER BY c.ordem, p.nome`).bind(e.id).all<Record<string, unknown>>();
  const lat = Number(c.req.query('lat')), lng = Number(c.req.query('lng'));
  const d = Number.isFinite(lat) && Number.isFinite(lng) && e.lat != null && e.lng != null ? distanciaKm({ lat, lng }, { lat: e.lat, lng: e.lng }) : null;
  return c.json({
    loja: { ...cartaoLoja(e, d), telefone: e.telefone, endereco: e.endereco, formas: JSON.parse(e.formas_pagamento) },
    categorias, produtos: produtos.map((p) => ({ ...p, opcoes: JSON.parse(String(p.opcoes || '{}')) })),
  });
});

/** Fotos dos produtos e o logo, só de lojas que estão no app. */
appPublico.get('/publico/app/foto/:id', async (c) => {
  const f = await c.env.BANCO.prepare(`SELECT f.tipo, f.dados FROM fotos f JOIN empresas e ON e.id = f.empresa_id WHERE f.id = ? AND e.no_app = 1`).bind(c.req.param('id')).first<{ tipo: string; dados: ArrayBuffer | number[] }>();
  if (!f) throw erro(404, 'nao_encontrado', 'Foto não encontrada.');
  const dados = f.dados instanceof ArrayBuffer ? f.dados : new Uint8Array(f.dados as number[]);
  return new Response(dados, { headers: { 'Content-Type': f.tipo, 'Cache-Control': 'public, max-age=31536000, immutable' } });
});

const esqItem = z.object({
  produtoId: z.string().min(1).max(64), qtd: z.number().int().min(1).max(99), tamanho: z.string().max(30).nullable().optional(),
  adicionais: z.array(z.string().max(40)).max(30).optional(), retirar: z.array(z.string().max(40)).max(20).optional(), observacao: z.string().max(150).optional(),
});
const esqPedido = z.object({
  chave: z.string().min(8).max(64),
  nome: z.string().trim().min(2, 'Digite seu nome.').max(60),
  telefone: z.string().trim().refine((t) => digitos(t).length >= 10 && digitos(t).length <= 13, 'Digite o WhatsApp com DDD.'),
  tipo: z.enum(['entrega', 'balcao']),
  endereco: z.string().trim().max(200).optional().nullable(),
  forma: z.enum(Object.keys(FORMAS) as [keyof typeof FORMAS, ...(keyof typeof FORMAS)[]]),
  trocoPara: z.number().int().min(0).max(10_000_000).optional().nullable(),
  observacao: z.string().trim().max(200).optional().nullable(),
  itens: z.array(esqItem).min(1, 'O carrinho está vazio.').max(50),
});

/** Cliente faz o pedido: fica aguardando a loja aceitar. */
appPublico.post('/publico/app/loja/:slug/pedido', async (c) => {
  const e = await lojaPorSlug(c, c.req.param('slug'));
  const d = validar(esqPedido, await corpo(c));
  const db = c.env.BANCO;
  const ja = await db.prepare('SELECT token FROM pedidos_online WHERE empresa_id = ? AND chave = ?').bind(e.id, d.chave).first<{ token: string }>();
  if (ja) return c.json({ ok: true, token: ja.token, repetido: true });
  if (!e.aceitando) throw erro(409, 'loja_fechada', 'A loja não está recebendo pedidos agora.');
  if (d.tipo === 'entrega' && !e.faz_entrega) throw erro(400, 'sem_entrega', 'Esta loja não faz entrega. Escolha retirar no local.');
  if (d.tipo === 'balcao' && !e.faz_retirada) throw erro(400, 'sem_retirada', 'Esta loja só faz entrega.');
  if (d.tipo === 'entrega' && (d.endereco || '').length < 5) throw erro(400, 'dados_invalidos', 'Digite o endereço da entrega.', { endereco: 'Digite o endereço.' });
  if (!(JSON.parse(e.formas_pagamento) as string[]).includes(d.forma)) throw erro(400, 'dados_invalidos', 'A loja não aceita esta forma de pagamento.');
  // Proteção contra abuso: no máximo 6 pedidos a cada 10 minutos do mesmo aparelho/rede.
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  const rec = await db.prepare('SELECT COUNT(*) AS n FROM pedidos_online WHERE ip = ? AND criado_em > ?').bind(ip, new Date(Date.now() - 6e5).toISOString()).first<{ n: number }>();
  if ((rec?.n || 0) >= 6) throw erro(429, 'muitos_pedidos', 'Muitos pedidos seguidos. Espere alguns minutos.');
  const p = await calcularPedidoApp(c, e, d.itens, d.tipo);
  if (p.subtotal < (e.pedido_minimo || 0)) throw erro(400, 'pedido_minimo', `O pedido mínimo desta loja é R$ ${(e.pedido_minimo / 100).toFixed(2).replace('.', ',')}.`);
  if (d.forma === 'dinheiro' && d.trocoPara && d.trocoPara < p.total) throw erro(400, 'dados_invalidos', 'O troco precisa ser para um valor maior que o total.', { trocoPara: 'Valor menor que o total.' });
  const id = novoId(), token = aleatorio(18);
  try {
    await db.prepare(`INSERT INTO pedidos_online (id, empresa_id, token, chave, nome, telefone, tipo, endereco, forma, troco_para, observacao, itens, resumo, subtotal, taxa_entrega, total, ip, criado_em)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, e.id, token, d.chave, d.nome, d.telefone, d.tipo, d.tipo === 'entrega' ? d.endereco : null, d.forma,
      d.forma === 'dinheiro' && d.trocoPara ? d.trocoPara : null, d.observacao || null, JSON.stringify(d.itens),
      JSON.stringify(p.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, total: i.total, detalhes: i.detalhes }))), p.subtotal, p.taxaEntrega, p.total, ip, agora()).run();
  } catch (err) {
    const outro = await db.prepare('SELECT token FROM pedidos_online WHERE empresa_id = ? AND chave = ?').bind(e.id, d.chave).first<{ token: string }>();
    if (outro) return c.json({ ok: true, token: outro.token, repetido: true });
    throw err;
  }
  return c.json({ ok: true, token }, 201);
});

/** Acompanhamento do pedido do app (aguardando → aceito e andamento da cozinha/entrega, ou recusado). */
appPublico.get('/publico/app/pedido/:token', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const o = await c.env.BANCO.prepare(`SELECT o.*, e.nome AS loja, e.slug, e.telefone AS loja_telefone, v.numero, v.andamento, v.status AS venda_status, v.pronto_em, v.saiu_em, v.finalizado_em, v.entregador
    FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id LEFT JOIN vendas v ON v.id = o.venda_id WHERE o.token = ?`).bind(token).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const situacao = o.status === 'aguardando' ? 'aguardando' : o.status === 'recusado' ? 'recusado' : o.venda_status === 'cancelada' ? 'cancelado' : o.andamento;
  return c.json({ pedido: {
    loja: o.loja, slug: o.slug, loja_telefone: o.loja_telefone, numero: o.numero || null, situacao, motivo_recusa: o.motivo_recusa, tipo: o.tipo, endereco: o.endereco,
    forma: o.forma, troco_para: o.troco_para, itens: JSON.parse(o.resumo), subtotal: o.subtotal, taxa_entrega: o.taxa_entrega, total: o.total,
    criado_em: o.criado_em, respondido_em: o.respondido_em, pronto_em: o.pronto_em, saiu_em: o.saiu_em, finalizado_em: o.finalizado_em, entregador: o.entregador,
  } });
});

// ---------- loja (com login) ----------
export const appLoja = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Pedidos do app esperando resposta e os respondidos nas últimas 3 horas. */
appLoja.get('/pedidos-app', async (c) => {
  exigir(c, 'vender');
  const { results } = await c.env.BANCO.prepare(`SELECT id, status, nome, telefone, tipo, endereco, forma, troco_para, observacao, resumo, subtotal, taxa_entrega, total, motivo_recusa, venda_id, criado_em, respondido_em
    FROM pedidos_online WHERE empresa_id = ? AND (status = 'aguardando' OR respondido_em > ?) ORDER BY criado_em`).bind(c.get('empresa').id, new Date(Date.now() - 3 * 3600e3).toISOString()).all<Record<string, unknown>>();
  return c.json({ pedidos: results.map((p) => ({ ...p, itens: JSON.parse(String(p.resumo)), resumo: undefined })) });
});

appLoja.post('/pedidos-app/:id/aceitar', async (c) => {
  exigir(c, 'vender');
  const db = c.env.BANCO, emp = c.get('empresa') as Loja;
  const o = await db.prepare('SELECT * FROM pedidos_online WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), emp.id).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  if (o.status !== 'aguardando') {
    if (o.status === 'aceito') return c.json({ ok: true, venda_id: o.venda_id, repetido: true });
    throw erro(409, 'ja_respondido', 'Este pedido já foi recusado.');
  }
  // Cliente da loja: acha pelo WhatsApp ou cadastra (assim ele aparece em Clientes e no comprovante).
  const tel = digitos(o.telefone);
  const { results: cls } = await db.prepare('SELECT id, telefone, endereco FROM clientes WHERE empresa_id = ? AND telefone IS NOT NULL').bind(emp.id).all<{ id: string; telefone: string; endereco: string | null }>();
  let clienteId = cls.find((x) => digitos(x.telefone) === tel)?.id || null;
  const lote: D1Prepared[] = [];
  if (!clienteId) {
    clienteId = novoId();
    lote.push(db.prepare('INSERT INTO clientes (id, empresa_id, nome, telefone, endereco, observacao, criado_em) VALUES (?,?,?,?,?,?,?)').bind(clienteId, emp.id, o.nome, o.telefone, o.endereco, 'Cliente do app', agora()));
  } else if (o.endereco) lote.push(db.prepare('UPDATE clientes SET endereco = COALESCE(endereco, ?) WHERE id = ?').bind(o.endereco, clienteId));
  if (lote.length) await db.batch(lote);
  // Total com os preços de agora; pagamento como o cliente escolheu (o dinheiro com o troco que ele pediu).
  const p = await calcularPedidoApp(c, { ...emp, taxa_entrega_padrao: o.taxa_entrega } as Loja, JSON.parse(o.itens), o.tipo);
  const valor = o.forma === 'dinheiro' && o.troco_para && o.troco_para >= p.total ? o.troco_para : p.total;
  const r = await registrarVenda(c, {
    chave: `app-${o.id}`, itens: JSON.parse(o.itens), desconto: null, pagamentos: [{ forma: o.forma, valor }], clienteId,
    observacao: ['Pedido pelo app', o.observacao].filter(Boolean).join(' · ').slice(0, 200),
    entrega: o.tipo === 'entrega' ? { endereco: String(o.endereco || ''), taxa: o.taxa_entrega } : null,
  });
  await db.prepare("UPDATE pedidos_online SET status = 'aceito', venda_id = ?, respondido_em = ? WHERE id = ? AND status = 'aguardando'").bind(r.id, agora(), o.id).run();
  return c.json({ ok: true, venda_id: r.id });
});

appLoja.post('/pedidos-app/:id/recusar', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ motivo: z.string().trim().min(3, 'Diga o motivo para o cliente.').max(150) }), await corpo(c));
  const r = await c.env.BANCO.prepare("UPDATE pedidos_online SET status = 'recusado', motivo_recusa = ?, respondido_em = ? WHERE id = ? AND empresa_id = ? AND status = 'aguardando'")
    .bind(d.motivo, agora(), c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(409, 'ja_respondido', 'Este pedido já foi respondido.');
  return c.json({ ok: true });
});

// ---------- configuração da loja no app ----------
const CAMPOS = 'slug, no_app, aceitando, tipo_loja, descricao, logo_id, capa_id, tempo_entrega, pedido_minimo, faz_entrega, faz_retirada, lat, lng, raio_km, taxa_entrega_padrao, cidade, uf, endereco, telefone, nome';
export const sugerirSlug = (nome: string) => semAcento(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'minha-loja';

appLoja.get('/loja-app', async (c) => {
  exigir(c, 'configuracoes');
  const e = await c.env.BANCO.prepare(`SELECT ${CAMPOS} FROM empresas WHERE id = ?`).bind(c.get('empresa').id).first<Record<string, unknown>>();
  return c.json({ loja: { ...e, slug: e?.slug || sugerirSlug(String(e?.nome || '')) }, tipos: TIPOS_LOJA, nomeApp: NOME_APP });
});

const esqLojaApp = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/, 'Use de 3 a 40 letras minúsculas, números ou traço (sem espaço e sem acento).'),
  no_app: z.boolean(), aceitando: z.boolean(), faz_entrega: z.boolean(), faz_retirada: z.boolean(),
  tipo_loja: z.enum(Object.keys(TIPOS_LOJA) as [keyof typeof TIPOS_LOJA, ...(keyof typeof TIPOS_LOJA)[]]),
  descricao: z.string().trim().max(140).nullable().optional(),
  logo_id: z.string().max(64).nullable().optional(), capa_id: z.string().max(64).nullable().optional(),
  tempo_entrega: z.string().trim().max(20).nullable().optional(),
  pedido_minimo: z.number().int().min(0).max(1_000_000),
  lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional(),
  raio_km: z.number().min(0.5).max(60),
}).refine((x) => x.faz_entrega || x.faz_retirada, 'Deixe ligada a entrega ou a retirada.');

appLoja.put('/loja-app', async (c) => {
  exigir(c, 'configuracoes');
  const d = validar(esqLojaApp, await corpo(c));
  const db = c.env.BANCO, emp = c.get('empresa');
  if (await db.prepare('SELECT 1 FROM empresas WHERE slug = ? AND id <> ?').bind(d.slug, emp.id).first()) throw erro(409, 'slug_em_uso', 'Este endereço já é de outra loja. Escolha outro.', { slug: 'Já está em uso.' });
  if (d.no_app && !emp.cidade) throw erro(400, 'sem_cidade', 'Preencha a cidade da loja em Dados da empresa antes de aparecer no app.');
  await db.prepare(`UPDATE empresas SET slug=?, no_app=?, aceitando=?, faz_entrega=?, faz_retirada=?, tipo_loja=?, descricao=?, logo_id=?, capa_id=?, tempo_entrega=?, pedido_minimo=?, lat=?, lng=?, raio_km=? WHERE id=?`)
    .bind(d.slug, d.no_app ? 1 : 0, d.aceitando ? 1 : 0, d.faz_entrega ? 1 : 0, d.faz_retirada ? 1 : 0, d.tipo_loja, d.descricao || null, d.logo_id || null, d.capa_id || null,
      d.tempo_entrega || null, d.pedido_minimo, d.lat ?? null, d.lng ?? null, d.raio_km, emp.id).run();
  return c.json({ ok: true });
});

/** Abrir/fechar para pedidos com um toque (painel Acompanhar). */
appLoja.post('/loja-app/aceitando', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ aceitando: z.boolean() }), await corpo(c));
  await c.env.BANCO.prepare('UPDATE empresas SET aceitando = ? WHERE id = ?').bind(d.aceitando ? 1 : 0, c.get('empresa').id).run();
  return c.json({ ok: true });
});
