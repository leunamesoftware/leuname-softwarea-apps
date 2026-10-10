// Pedêê: app de pedidos dos clientes. Um app só para todas as lojas.
// - Público (sem login): lista de lojas perto do cliente, cardápio da loja, fazer pedido e acompanhar.
// - Loja (com login): pedidos do app para aceitar ou recusar e a configuração da loja no app.
// O cliente nunca vê custo, receita, estoque nem dados de outras lojas; cada loja só vê os pedidos dela.
import { Hono } from 'hono';
import { z } from 'zod';
import { prazosDoPedido } from '../regras/prazos';
import { avisar, inscrever } from './push';
import { conferirMensagem, RAPIDAS_CLIENTE, vezesPermitidas } from '../regras/mensagens';
import { calcularItem, ErroPedido, FORMAS, totais, type EscolhaItem, type ItemCalculado, type ProdutoPreco } from '../regras/pedido';
import { contaLogada } from './contaCliente';
import { enviarFoto } from './entregador';
import { agora, aleatorio, auditar, corpo, erro, esperaLojaMs, janelaCancelarMs, MOTIVO_SEM_RESPOSTA, novoId, type C, type D1Prepared, type Empresa, type Env, type Vars } from './base';
import { exigir, validar } from './cadastros';
import { registrarVenda } from './vendas';
import { abrirSessao } from './auth';
import { hashSenha, type Usuario } from './base';

export const NOME_APP = 'Pedêê';
export const TIPOS_LOJA = {
  acai: 'Açaí', arabe: 'Árabe', bebidas: 'Bebidas', brasileira: 'Brasileira', cafeteria: 'Cafeterias', carnes: 'Carnes', sucos: 'Casa de Sucos', chinesa: 'Chinesa',
  congelados: 'Congelados', cozinha_rapida: 'Cozinha Rápida', doces: 'Doces & Bolos', espetinhos: 'Espetinhos', frangos: 'Frangos', frutos_mar: 'Frutos do Mar',
  hamburgueria: 'Hamburgueria', hotdog: 'Hot Dog', internacional: 'Internacional', italiana: 'Italiana', japonesa: 'Comida japonesa', lanches: 'Lanches',
  marmitaria: 'Marmitaria', mexicana: 'Mexicana', padaria: 'Padaria', pastelaria: 'Pastelaria', peixes: 'Peixes', pizzaria: 'Pizzaria', poke: 'Poke', regional: 'Regional',
  restaurante: 'Restaurante', salgados: 'Salgados', saudavel: 'Saudável', sopas: 'Sopas & Caldos', sorvetes: 'Sorvetes', tapioca: 'Tapioca', variada: 'Variada',
} as const;

type Loja = Empresa & {
  slug: string; no_app: number; aceitando: number; tipo_loja: string; descricao: string | null; logo_id: string | null; capa_id: string | null; tempo_entrega: string | null;
  pedido_minimo: number; faz_entrega: number; faz_retirada: number; lat: number | null; lng: number | null; raio_km: number; taxa_entrega_padrao: number;
  nota_media?: number | null; nota_total?: number;
};

/** Loja com acesso em dia (assinatura, teste ou vitalício) e ligada no app. */
const NOTAS = "(SELECT ROUND(AVG(a.nota), 1) FROM avaliacoes a WHERE a.empresa_id = e.id) AS nota_media, (SELECT COUNT(*) FROM avaliacoes a WHERE a.empresa_id = e.id) AS nota_total";
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
  nota: e.nota_media ?? null, avaliacoes: e.nota_total || 0,
  // Fora do raio de entrega da loja: o cliente ainda vê, mas só pode retirar.
  entrega_aqui: Boolean(e.faz_entrega) && (distancia == null || distancia <= (e.raio_km || 8)),
});

async function lojaPorSlug(c: C, slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw erro(404, 'loja_nao_encontrada', 'Loja não encontrada.');
  const e = await c.env.BANCO.prepare(`SELECT e.*, ${NOTAS} FROM empresas e WHERE e.slug = ? AND ${LOJA_ATIVA}`).bind(slug, limiteAcesso()).first<Loja>();
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
  const { results } = await c.env.BANCO.prepare(`SELECT e.*, ${NOTAS} FROM empresas e WHERE ${LOJA_ATIVA} LIMIT 2000`).bind(limiteAcesso()).all<Loja>();
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
  adicionais: z.array(z.string().max(40)).max(30).optional(), retirar: z.array(z.string().max(40)).max(20).optional(), observacao: z.string().max(150).optional(), escolhas: z.array(z.object({ grupo: z.string().max(40), item: z.string().max(40), qtd: z.number().int().min(1).max(30) })).max(60).optional(),
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
  lat: z.number().min(-90).max(90).optional().nullable(), lng: z.number().min(-180).max(180).optional().nullable(),
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
    await db.prepare(`INSERT INTO pedidos_online (id, empresa_id, token, chave, nome, telefone, tipo, endereco, forma, troco_para, observacao, itens, resumo, subtotal, taxa_entrega, total, ip, criado_em, dest_lat, dest_lng, conta_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, e.id, token, d.chave, d.nome, d.telefone, d.tipo, d.tipo === 'entrega' ? d.endereco : null, d.forma,
      d.forma === 'dinheiro' && d.trocoPara ? d.trocoPara : null, d.observacao || null, JSON.stringify(d.itens),
      JSON.stringify(p.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, total: i.total, detalhes: i.detalhes }))), p.subtotal, p.taxaEntrega, p.total, ip, agora(), d.tipo === 'entrega' ? d.lat ?? null : null, d.tipo === 'entrega' ? d.lng ?? null : null, (await contaLogada(c))?.id ?? null).run();
  } catch (err) {
    const outro = await db.prepare('SELECT token FROM pedidos_online WHERE empresa_id = ? AND chave = ?').bind(e.id, d.chave).first<{ token: string }>();
    if (outro) return c.json({ ok: true, token: outro.token, repetido: true });
    throw err;
  }
  avisar(c, 'loja', e.id, { titulo: '🛎️ Novo pedido no Pedêê!', texto: `${d.nome} · ${d.tipo === 'entrega' ? 'Entrega' : 'Retirada'} · R$ ${(p.total / 100).toFixed(2).replace('.', ',')}`, url: '/parceiro/' });
  return c.json({ ok: true, token }, 201);
});

/** Cliente e loja conversam enquanto o pedido anda e até 2 horas depois de terminar. */
function podeFalarLoja(situacao: string, fim: string | null) {
  if (['aguardando', 'preparando', 'pronto', 'a_caminho'].includes(situacao)) return true;
  return Boolean(fim) && Date.now() - new Date(String(fim)).getTime() < 2 * 3600e3;
}
async function gravarMensagemPedido(c: C, pedidoId: string, de: 'cliente' | 'loja', texto: string) {
  const ruim = conferirMensagem(texto);
  if (ruim) throw erro(400, 'mensagem_bloqueada', ruim);
  const db = c.env.BANCO;
  const n = await db.prepare('SELECT COUNT(*) AS n FROM mensagens_pedido WHERE pedido_id = ? AND de = ?').bind(pedidoId, de).first<{ n: number }>();
  if ((n?.n ?? 0) >= 40) throw erro(429, 'muitas_mensagens', 'Muitas mensagens neste pedido.');
  await db.prepare('INSERT INTO mensagens_pedido (id, pedido_id, de, texto, criado_em) VALUES (?,?,?,?,?)').bind(novoId(), pedidoId, de, texto, agora()).run();
  const o = await db.prepare('SELECT o.token, o.empresa_id, o.nome, e.nome AS loja FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id WHERE o.id = ?').bind(pedidoId).first<{ token: string; empresa_id: string; nome: string; loja: string }>();
  if (o && de === 'cliente') avisar(c, 'loja', o.empresa_id, { titulo: `💬 ${o.nome.split(' ')[0]} mandou mensagem`, texto, url: '/parceiro/' });
  if (o && de === 'loja') avisar(c, 'cliente', o.token, { titulo: `💬 ${o.loja}`, texto, url: `/pedir/pedido/${o.token}` });
}

/** Cliente manda mensagem para a loja (texto livre, sem telefone/link/palavrão). */
appPublico.post('/publico/app/pedido/:token/loja-mensagem', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const d = validar(z.object({ texto: z.string().trim().min(1, 'Escreva a mensagem.').max(300) }), await corpo(c));
  const o = await c.env.BANCO.prepare(`SELECT o.id, o.status, o.cancelado_em, o.respondido_em, v.andamento, v.status AS venda_status, v.finalizado_em FROM pedidos_online o LEFT JOIN vendas v ON v.id = o.venda_id WHERE o.token = ?`)
    .bind(token).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const situacao = o.cancelado_em ? 'cancelado' : o.status === 'aguardando' ? 'aguardando' : o.status === 'recusado' ? 'recusado' : o.venda_status === 'cancelada' ? 'cancelado' : o.andamento;
  if (!podeFalarLoja(situacao, o.finalizado_em || o.respondido_em)) throw erro(409, 'conversa_fechada', 'A conversa deste pedido já foi encerrada.');
  await gravarMensagemPedido(c, o.id, 'cliente', d.texto);
  return c.json({ ok: true });
});

/** Cliente reclama com o Pedêê (atraso, problema no pedido). O dono vê no Painel Admin. */
appPublico.post('/publico/app/pedido/:token/reclamar', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const d = validar(z.object({ texto: z.string().trim().min(5, 'Conte o que aconteceu.').max(500) }), await corpo(c));
  const db = c.env.BANCO;
  const o = await db.prepare('SELECT id, empresa_id FROM pedidos_online WHERE token = ?').bind(token).first<{ id: string; empresa_id: string }>();
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const n = await db.prepare('SELECT COUNT(*) AS n FROM reclamacoes WHERE pedido_id = ?').bind(o.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= 3) throw erro(429, 'muitas', 'Já recebemos as suas reclamações deste pedido. Vamos analisar.');
  await db.prepare('INSERT INTO reclamacoes (id, pedido_id, empresa_id, texto, criado_em) VALUES (?,?,?,?,?)').bind(novoId(), o.id, o.empresa_id, d.texto, agora()).run();
  return c.json({ ok: true });
});

/** Cancela sozinho o que a loja não aceitou no prazo (por pedido, pelo token, ou todos de uma loja). */
function expirar(c: C, onde: 'token' | 'empresa_id' | 'id', valor: string) {
  const quando = agora();
  return c.env.BANCO.prepare(`UPDATE pedidos_online SET status = 'recusado', motivo_recusa = ?, respondido_em = ? WHERE ${onde} = ? AND status = 'aguardando' AND cancelado_em IS NULL AND criado_em < ?`)
    .bind(MOTIVO_SEM_RESPOSTA, quando, valor, new Date(Date.now() - esperaLojaMs(c.env)).toISOString()).run();
}

/** Acompanhamento do pedido do app (aguardando → aceito e andamento da cozinha/entrega, ou recusado). */
appPublico.get('/publico/app/pedido/:token', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  await expirar(c, 'token', token);
  const o = await c.env.BANCO.prepare(`SELECT o.*, e.nome AS loja, e.slug, e.telefone AS loja_telefone, e.lat AS loja_lat, e.lng AS loja_lng, e.tempo_preparo, v.entregador_em, v.pos_lat, v.pos_lng, v.pos_em, v.id AS venda_id, v.entregador_id, v.codigo_entrega, (SELECT foto IS NOT NULL FROM entregadores WHERE id = v.entregador_id) AS tem_foto, (SELECT veiculo FROM entregadores WHERE id = v.entregador_id) AS veiculo, v.numero, v.andamento, v.status AS venda_status, v.pronto_em, v.saiu_em, v.finalizado_em, v.entregador, av.nota AS av_nota, av.comentario AS av_comentario
    FROM pedidos_online o JOIN empresas e ON e.id = o.empresa_id LEFT JOIN vendas v ON v.id = o.venda_id LEFT JOIN avaliacoes av ON av.pedido_id = o.id WHERE o.token = ?`).bind(token).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const situacao = o.cancelado_em ? 'cancelado' : o.status === 'aguardando' ? 'aguardando' : o.status === 'recusado' ? 'recusado' : o.venda_status === 'cancelada' ? 'cancelado' : o.andamento;
  // Cliente cancela quando quiser enquanto a loja não aceitou; depois de aceito, só nos primeiros minutos e antes de ficar pronto.
  // Conversa com o entregador (só enquanto a entrega está com ele); ninguém vê o telefone do outro.
  const conversa = o.entregador_id && !['entregue', 'retirado', 'cancelado'].includes(situacao)
    ? (await c.env.BANCO.prepare('SELECT de, texto, criado_em FROM mensagens_entrega WHERE venda_id = ? ORDER BY criado_em').bind(o.venda_id).all()).results.slice(-12) : [];
  const ate = new Date(o.criado_em).getTime() + janelaCancelarMs(c.env);
  const cancelar_ate = !o.cancelado_em && ['aguardando', 'preparando'].includes(situacao) && ate > Date.now() ? new Date(ate).toISOString() : null;
  const { results: conversaLoja } = await c.env.BANCO.prepare('SELECT de, texto, criado_em FROM mensagens_pedido WHERE pedido_id = ? ORDER BY criado_em').bind(o.id).all();
  return c.json({ pedido: {
    conversa_loja: conversaLoja.slice(-40), pode_falar_loja: podeFalarLoja(situacao, o.finalizado_em || o.respondido_em),
    loja: o.loja, slug: o.slug, loja_telefone: o.loja_telefone, numero: o.numero || null, situacao, motivo_recusa: o.motivo_recusa, tipo: o.tipo, endereco: o.endereco,
    forma: o.forma, troco_para: o.troco_para, itens: JSON.parse(o.resumo), subtotal: o.subtotal, taxa_entrega: o.taxa_entrega, total: o.total,
    criado_em: o.criado_em, respondido_em: o.respondido_em, pronto_em: o.pronto_em, saiu_em: o.saiu_em, finalizado_em: o.finalizado_em, entregador: o.entregador,
    avaliacao: o.av_nota ? { nota: o.av_nota, comentario: o.av_comentario } : null, prazos: ['aguardando', 'preparando', 'pronto', 'a_caminho'].includes(situacao) ? prazosDoPedido(o) : null, cancelar_ate, pode_cancelar: situacao === 'aguardando' || Boolean(cancelar_ate), cancelado_pelo_cliente: Boolean(o.cancelado_em),
    codigo_entrega: o.tipo === 'entrega' && ['preparando', 'pronto', 'a_caminho'].includes(situacao) ? o.codigo_entrega : null,
    entregador_foto: o.entregador_id && o.tem_foto ? `/api/publico/app/pedido/${token}/entregador-foto` : null, mensagens: conversa, pode_conversar: Boolean(o.entregador_id) && ['pronto', 'a_caminho', 'preparando'].includes(situacao),
    // Mapa ao vivo: só enquanto o entregador está a caminho.
    mapa: situacao === 'a_caminho' && o.tipo === 'entrega' ? {
      loja: o.loja_lat != null ? { lat: o.loja_lat, lng: o.loja_lng } : null,
      destino: o.dest_lat != null ? { lat: o.dest_lat, lng: o.dest_lng } : null,
      entregador: o.pos_lat != null ? { lat: o.pos_lat, lng: o.pos_lng, em: o.pos_em, veiculo: o.veiculo } : null,
    } : null,
  } });
});

/** Foto do entregador deste pedido (só quem tem o link do pedido vê). */
appPublico.get('/publico/app/pedido/:token/entregador-foto', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const f = await c.env.BANCO.prepare('SELECT e.foto FROM pedidos_online o JOIN vendas v ON v.id = o.venda_id JOIN entregadores e ON e.id = v.entregador_id WHERE o.token = ?').bind(token).first<{ foto: string | null }>();
  if (!f?.foto) throw erro(404, 'sem_foto', 'Sem foto.');
  return enviarFoto(f.foto);
});

/** Cliente responde ao entregador pelo app. */
appPublico.post('/publico/app/pedido/:token/mensagem', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const d = validar(z.object({ texto: z.enum(RAPIDAS_CLIENTE, { message: 'Escolha uma das mensagens prontas.' }) }), await corpo(c));
  const db = c.env.BANCO;
  const v = await db.prepare("SELECT v.id, v.entregador_id FROM pedidos_online o JOIN vendas v ON v.id = o.venda_id WHERE o.token = ? AND v.entregador_id IS NOT NULL AND v.status = 'concluida' AND v.andamento NOT IN ('entregue','retirado')").bind(token).first<{ id: string; entregador_id: string }>();
  if (!v) throw erro(409, 'sem_conversa', 'A conversa abre quando um entregador pega o seu pedido.');
  const n = await db.prepare('SELECT COUNT(*) AS n FROM mensagens_entrega WHERE venda_id = ? AND de = ? AND texto = ?').bind(v.id, 'cliente', d.texto).first<{ n: number }>();
  if ((n?.n ?? 0) >= vezesPermitidas(d.texto)) throw erro(429, 'muitas_mensagens', 'Você já mandou esse aviso. Se precisar, fale com a loja.');
  await db.prepare("INSERT INTO mensagens_entrega (id, venda_id, de, texto, criado_em) VALUES (?,?,'cliente',?,?)").bind(novoId(), v.id, d.texto, agora()).run();
  avisar(c, 'entregador', v.entregador_id, { titulo: '💬 Aviso do cliente', texto: d.texto, url: '/entregador/' });
  return c.json({ ok: true });
});

/** Cliente cancela o pedido dentro do prazo (padrão 5 min) e enquanto a loja ainda não marcou "pronto". */
appPublico.post('/publico/app/pedido/:token/cancelar', async (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const db = c.env.BANCO;
  const o = await db.prepare(`SELECT o.id, o.empresa_id, o.status, o.criado_em, o.cancelado_em, o.venda_id, v.andamento, v.usuario_id, v.status AS venda_status FROM pedidos_online o LEFT JOIN vendas v ON v.id = o.venda_id WHERE o.token = ?`)
    .bind(token).first<{ id: string; empresa_id: string; status: string; criado_em: string; cancelado_em: string | null; venda_id: string | null; andamento: string | null; usuario_id: string | null; venda_status: string | null }>();
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  if (o.cancelado_em) throw erro(409, 'ja_cancelado', 'Este pedido já foi cancelado.');
  if (o.status === 'recusado') throw erro(409, 'ja_recusado', 'A loja já recusou este pedido.');
  if (o.status !== 'aguardando' && (new Date(o.criado_em).getTime() + janelaCancelarMs(c.env) < Date.now() || (o.venda_id && o.andamento !== 'preparando'))) {
    throw erro(409, 'fora_do_prazo', 'O prazo para cancelar já passou. Fale com a loja pelo WhatsApp.');
  }
  const quando = agora(), stmts: D1Prepared[] = [];
  if (o.venda_id && o.venda_status === 'concluida') {
    const { results: movs } = await db.prepare("SELECT item_id, qtd FROM estoque_movimentos WHERE ref = ? AND tipo = 'venda' AND empresa_id = ?").bind(o.venda_id, o.empresa_id).all<{ item_id: string; qtd: number }>();
    stmts.push(db.prepare("UPDATE vendas SET status = 'cancelada', cancelada_em = ?, cancelada_por = ?, motivo_cancelamento = 'Cancelado pelo cliente no app' WHERE id = ? AND status = 'concluida'").bind(quando, o.usuario_id, o.venda_id));
    for (const m of movs) {
      stmts.push(db.prepare('UPDATE estoque_itens SET qtd = ROUND(qtd + ?, 3) WHERE id = ? AND empresa_id = ?').bind(-m.qtd, m.item_id, o.empresa_id));
      stmts.push(db.prepare("INSERT INTO estoque_movimentos (id, empresa_id, item_id, tipo, qtd, ref, motivo, usuario_id, criado_em) VALUES (?,?,?,'cancelamento',?,?,'Cancelado pelo cliente no app',?,?)").bind(novoId(), o.empresa_id, m.item_id, -m.qtd, o.venda_id, o.usuario_id, quando));
    }
  }
  stmts.push(db.prepare("UPDATE pedidos_online SET cancelado_em = ?, status = CASE WHEN status = 'aguardando' THEN 'recusado' ELSE status END, motivo_recusa = CASE WHEN status = 'aguardando' THEN 'Cancelado pelo cliente' ELSE motivo_recusa END, respondido_em = COALESCE(respondido_em, ?) WHERE id = ? AND status = ? AND cancelado_em IS NULL").bind(quando, quando, o.id, o.status));
  // Se a loja aceitou no mesmo instante, o pedido não muda aqui: o cliente tenta de novo já vendo o pedido aceito.
  if (o.status === 'aguardando') {
    const r = await db.batch(stmts);
    if (!r[r.length - 1].meta?.changes) throw erro(409, 'mudou', 'A loja acabou de aceitar o pedido. Toque em cancelar de novo se ainda quiser.');
    avisar(c, 'loja', o.empresa_id, { titulo: '❌ O cliente cancelou o pedido', texto: 'Não precisa preparar.', url: '/parceiro/' });
    return c.json({ ok: true });
  }
  await db.batch(stmts);
  avisar(c, 'loja', o.empresa_id, { titulo: '❌ O cliente cancelou o pedido', texto: 'Pare o preparo: a venda foi cancelada.', url: '/parceiro/' });
  return c.json({ ok: true });
});

/** Cliente avalia o pedido depois de receber (1 a 5 estrelas). Uma avaliação por pedido; só de pedido entregue ou retirado. */
appPublico.post('/publico/app/pedido/:token/avaliar', async (c) => {
  const d = validar(z.object({ nota: z.number().int().min(1, 'Escolha de 1 a 5 estrelas.').max(5), comentario: z.string().trim().max(300).optional().nullable() }), await corpo(c));
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  const db = c.env.BANCO;
  const o = await db.prepare(`SELECT o.id, o.empresa_id, o.nome, v.andamento, v.status AS venda_status FROM pedidos_online o LEFT JOIN vendas v ON v.id = o.venda_id WHERE o.token = ?`)
    .bind(token).first<{ id: string; empresa_id: string; nome: string; andamento: string | null; venda_status: string | null }>();
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  if (o.venda_status !== 'concluida' || !['entregue', 'retirado'].includes(String(o.andamento))) throw erro(409, 'ainda_nao', 'Dá para avaliar depois de receber o pedido.');
  try {
    await db.prepare('INSERT INTO avaliacoes (id, empresa_id, pedido_id, nota, comentario, nome, criado_em) VALUES (?,?,?,?,?,?,?)')
      .bind(novoId(), o.empresa_id, o.id, d.nota, d.comentario || null, o.nome.split(' ')[0], agora()).run();
  } catch { throw erro(409, 'ja_avaliado', 'Este pedido já foi avaliado. Obrigado!'); }
  return c.json({ ok: true });
});

/** Últimas avaliações da loja (para o cliente ver antes de pedir). */
appPublico.get('/publico/app/loja/:slug/avaliacoes', async (c) => {
  const e = await lojaPorSlug(c, c.req.param('slug'));
  const { results } = await c.env.BANCO.prepare('SELECT nota, comentario, nome, criado_em FROM avaliacoes WHERE empresa_id = ? ORDER BY criado_em DESC LIMIT 30').bind(e.id).all();
  return c.json({ nota: e.nota_media ?? null, total: e.nota_total || 0, avaliacoes: results });
});

// ---------- loja (com login) ----------
export const appLoja = new Hono<{ Bindings: Env; Variables: Vars }>();

/** Pedidos do app esperando resposta e os respondidos nas últimas 3 horas. */
appLoja.get('/pedidos-app', async (c) => {
  exigir(c, 'vender');
  await expirar(c, 'empresa_id', c.get('empresa').id);
  const { results } = await c.env.BANCO.prepare(`SELECT id, status, nome, telefone, tipo, endereco, forma, troco_para, observacao, resumo, subtotal, taxa_entrega, total, motivo_recusa, venda_id, criado_em, respondido_em, cancelado_em
    FROM pedidos_online WHERE empresa_id = ? AND (status = 'aguardando' OR respondido_em > ?) ORDER BY criado_em`).bind(c.get('empresa').id, new Date(Date.now() - 3 * 3600e3).toISOString()).all<Record<string, unknown>>();
  const prazo = janelaCancelarMs(c.env);
  return c.json({ pedidos: results.map((p) => {
    const ate = new Date(String(p.criado_em)).getTime() + prazo;
    return { ...p, itens: JSON.parse(String(p.resumo)), resumo: undefined, cancelar_ate: !p.cancelado_em && ate > Date.now() ? new Date(ate).toISOString() : null };
  }) });
});

/** Conversas com os clientes dos pedidos das últimas 6 horas: { pedido_id: mensagens }. */
appLoja.get('/pedidos-app/conversas', async (c) => {
  exigir(c, 'vender');
  const { results } = await c.env.BANCO.prepare(`SELECT m.pedido_id, m.de, m.texto, m.criado_em FROM mensagens_pedido m JOIN pedidos_online o ON o.id = m.pedido_id
    WHERE o.empresa_id = ? AND o.criado_em > ? ORDER BY m.criado_em`).bind(c.get('empresa').id, new Date(Date.now() - 6 * 3600e3).toISOString()).all<{ pedido_id: string; de: string; texto: string; criado_em: string }>();
  const conversas: Record<string, { de: string; texto: string; criado_em: string }[]> = {};
  for (const m of results) (conversas[m.pedido_id] ||= []).push({ de: m.de, texto: m.texto, criado_em: m.criado_em });
  return c.json({ conversas });
});

appLoja.post('/pedidos-app/:id/mensagem', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ texto: z.string().trim().min(1, 'Escreva a mensagem.').max(300) }), await corpo(c));
  const o = await c.env.BANCO.prepare('SELECT id FROM pedidos_online WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), c.get('empresa').id).first<{ id: string }>();
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  await gravarMensagemPedido(c, o.id, 'loja', d.texto);
  return c.json({ ok: true });
});

appLoja.post('/pedidos-app/:id/aceitar', async (c) => {
  exigir(c, 'vender');
  const db = c.env.BANCO, emp = c.get('empresa') as Loja;
  await expirar(c, 'id', c.req.param('id'));
  const o = await db.prepare('SELECT * FROM pedidos_online WHERE id = ? AND empresa_id = ?').bind(c.req.param('id'), emp.id).first<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!o) throw erro(404, 'nao_encontrado', 'Pedido não encontrado.');
  if (o.status !== 'aguardando') {
    if (o.status === 'aceito') return c.json({ ok: true, venda_id: o.venda_id, repetido: true });
    if (o.motivo_recusa === MOTIVO_SEM_RESPOSTA) throw erro(409, 'expirou', 'O cliente esperou demais: o pedido foi cancelado sozinho.');
    throw erro(409, 'ja_respondido', o.cancelado_em ? 'O cliente cancelou este pedido.' : 'Este pedido já foi recusado.');
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
  // Loja do app que não usa o caixa do balcão: abre o caixa sozinha no primeiro pedido aceito.
  if (!(await db.prepare('SELECT 1 FROM caixas WHERE empresa_id = ? AND fechado_em IS NULL').bind(emp.id).first())) {
    await db.batch([db.prepare('INSERT INTO caixas (id, empresa_id, aberto_por, aberto_em, fundo) VALUES (?,?,?,?,0)').bind(novoId(), emp.id, c.get('usuario').id, agora()),
      auditar(c, 'caixa_aberto', { automatico: true })]);
  }
  // Total com os preços de agora; pagamento como o cliente escolheu (o dinheiro com o troco que ele pediu).
  const p = await calcularPedidoApp(c, { ...emp, taxa_entrega_padrao: o.taxa_entrega } as Loja, JSON.parse(o.itens), o.tipo);
  const valor = o.forma === 'dinheiro' && o.troco_para && o.troco_para >= p.total ? o.troco_para : p.total;
  const r = await registrarVenda(c, {
    chave: `app-${o.id}`, itens: JSON.parse(o.itens), desconto: null, pagamentos: [{ forma: o.forma, valor }], clienteId,
    observacao: ['Pedido pelo app', o.observacao].filter(Boolean).join(' · ').slice(0, 200),
    entrega: o.tipo === 'entrega' ? { endereco: String(o.endereco || ''), taxa: o.taxa_entrega } : null,
  });
  await db.prepare("UPDATE pedidos_online SET status = 'aceito', venda_id = ?, respondido_em = ? WHERE id = ? AND status = 'aguardando'").bind(r.id, agora(), o.id).run();
  // Código de entrega: o cliente vê no app e passa ao entregador só quando recebe o pedido.
  if (o.tipo === 'entrega') await db.prepare('UPDATE vendas SET codigo_entrega = COALESCE(codigo_entrega, ?) WHERE id = ?').bind(String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0'), r.id).run();
  avisar(c, 'cliente', o.token, { titulo: '👨‍🍳 Pedido aceito!', texto: `${emp.nome} já está preparando o seu pedido.`, url: `/pedir/pedido/${o.token}` });
  return c.json({ ok: true, venda_id: r.id });
});

/** Loja ativa os avisos com o app fechado neste aparelho. */
appLoja.post('/pedidos-app/push', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ endpoint: z.string().max(1000) }), await corpo(c));
  await inscrever(c, d.endpoint, 'loja', [c.get('empresa').id]);
  return c.json({ ok: true });
});

appLoja.post('/pedidos-app/:id/recusar', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ motivo: z.string().trim().min(3, 'Diga o motivo para o cliente.').max(150) }), await corpo(c));
  const r = await c.env.BANCO.prepare("UPDATE pedidos_online SET status = 'recusado', motivo_recusa = ?, respondido_em = ? WHERE id = ? AND empresa_id = ? AND status = 'aguardando'")
    .bind(d.motivo, agora(), c.req.param('id'), c.get('empresa').id).run();
  if (!r.meta?.changes) throw erro(409, 'ja_respondido', 'Este pedido já foi respondido.');
  const o = await c.env.BANCO.prepare('SELECT token FROM pedidos_online WHERE id = ?').bind(c.req.param('id')).first<{ token: string }>();
  avisar(c, 'cliente', o?.token, { titulo: '⛔ A loja não pôde aceitar o pedido', texto: d.motivo, url: `/pedir/pedido/${o?.token}` });
  return c.json({ ok: true });
});

// ---------- configuração da loja no app ----------
const CAMPOS = 'slug, no_app, aceitando, tipo_loja, descricao, logo_id, capa_id, tempo_entrega, tempo_preparo, pedido_minimo, faz_entrega, faz_retirada, lat, lng, raio_km, taxa_entrega_padrao, cidade, uf, endereco, telefone, nome';
const RESERVADOS = new Set(['loja', 'pedido', 'pedidos', 'admin', 'entrar', 'app']);
export const sugerirSlug = (nome: string) => { const s = semAcento(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); return !s || s.length < 3 ? 'minha-loja' : RESERVADOS.has(s) ? `${s}-1` : s; };

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
  tempo_preparo: z.number().int().min(5, 'O preparo leva pelo menos 5 minutos.').max(180).optional(),
  pedido_minimo: z.number().int().min(0).max(1_000_000),
  lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional(),
  raio_km: z.number().min(0.5).max(60),
}).refine((x) => x.faz_entrega || x.faz_retirada, 'Deixe ligada a entrega ou a retirada.');

appLoja.put('/loja-app', async (c) => {
  exigir(c, 'configuracoes');
  const d = validar(esqLojaApp, await corpo(c));
  const db = c.env.BANCO, emp = c.get('empresa');
  if (RESERVADOS.has(d.slug)) throw erro(400, 'slug_reservado', 'Escolha outro endereço.', { slug: 'Endereço reservado.' });
  if (await db.prepare('SELECT 1 FROM empresas WHERE slug = ? AND id <> ?').bind(d.slug, emp.id).first()) throw erro(409, 'slug_em_uso', 'Este endereço já é de outra loja. Escolha outro.', { slug: 'Já está em uso.' });
  if (d.no_app && !emp.cidade) throw erro(400, 'sem_cidade', 'Preencha a cidade da loja em Dados da empresa antes de aparecer no app.');
  await db.prepare(`UPDATE empresas SET slug=?, no_app=?, aceitando=?, faz_entrega=?, faz_retirada=?, tipo_loja=?, descricao=?, logo_id=?, capa_id=?, tempo_entrega=?, tempo_preparo=COALESCE(?, tempo_preparo), pedido_minimo=?, lat=?, lng=?, raio_km=? WHERE id=?`)
    .bind(d.slug, d.no_app ? 1 : 0, d.aceitando ? 1 : 0, d.faz_entrega ? 1 : 0, d.faz_retirada ? 1 : 0, d.tipo_loja, d.descricao || null, d.logo_id || null, d.capa_id || null,
      d.tempo_entrega || null, d.tempo_preparo ?? null, d.pedido_minimo, d.lat ?? null, d.lng ?? null, d.raio_km, emp.id).run();
  return c.json({ ok: true });
});

/** Abrir/fechar para pedidos com um toque (painel Acompanhar). */
appLoja.post('/loja-app/aceitando', async (c) => {
  exigir(c, 'vender');
  const d = validar(z.object({ aceitando: z.boolean() }), await corpo(c));
  await c.env.BANCO.prepare('UPDATE empresas SET aceitando = ? WHERE id = ?').bind(d.aceitando ? 1 : 0, c.get('empresa').id).run();
  return c.json({ ok: true });
});

// ---------- cadastro da loja pelo próprio app (sem conta na LeuApps) ----------
export const DIAS_GRATIS = 30;
const esqCadastroLoja = z.object({
  loja: z.string().trim().min(2, 'Digite o nome da loja.').max(60),
  tipo_loja: z.enum(Object.keys(TIPOS_LOJA) as [keyof typeof TIPOS_LOJA, ...(keyof typeof TIPOS_LOJA)[]]),
  nome: z.string().trim().min(2, 'Digite o seu nome.').max(60),
  whatsapp: z.string().trim().refine((t) => digitos(t).length >= 10 && digitos(t).length <= 11, 'Digite o WhatsApp com DDD.'),
  cidade: z.string().trim().min(2, 'Digite a cidade.').max(60),
  uf: z.string().trim().length(2, 'UF com 2 letras.'),
  endereco: z.string().trim().min(5, 'Digite o endereço da loja.').max(150),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100),
});

/** O lojista cria a loja direto no app: já entra logado, com a loja no app e o primeiro mês grátis. */
appPublico.post('/publico/app/cadastrar-loja', async (c) => {
  const d = validar(esqCadastroLoja, await corpo(c));
  const db = c.env.BANCO, login = digitos(d.whatsapp);
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  const rec = await db.prepare("SELECT COUNT(*) AS n FROM auditoria WHERE acao = 'loja_cadastrada' AND detalhe LIKE ? AND criado_em > ?").bind(`%"ip":"${ip}"%`, new Date(Date.now() - 864e5).toISOString()).first<{ n: number }>();
  if ((rec?.n || 0) >= 3) throw erro(429, 'muitos_cadastros', 'Muitos cadastros seguidos deste aparelho. Tente amanhã ou fale com a gente.');
  if (await db.prepare('SELECT 1 FROM usuarios WHERE login = ?').bind(login).first()) throw erro(409, 'ja_cadastrado', 'Este WhatsApp já tem uma loja. Toque em Entrar.', { whatsapp: 'Já cadastrado.' });
  // Endereço da loja no app (/pedir/<slug>): nome sem acento; se já existir, ganha um número.
  const base = sugerirSlug(d.loja);
  let slug = base;
  for (let i = 2; await db.prepare('SELECT 1 FROM empresas WHERE slug = ?').bind(slug).first(); i++) slug = `${base.slice(0, 36)}-${i}`;
  const emp = novoId(), uid = novoId(), sal = aleatorio(16), quando = agora();
  const ate = new Date(Date.now() + DIAS_GRATIS * 864e5).toISOString();
  await db.batch([
    db.prepare(`INSERT INTO empresas (id, conta_email, nome, telefone, endereco, cidade, uf, acesso_ate, criado_em, slug, no_app, aceitando, tipo_loja, faz_entrega, faz_retirada, formas_pagamento)
      VALUES (?,?,?,?,?,?,?,?,?,?,1,1,?,1,1,'["dinheiro","pix","debito","credito"]')`)
      .bind(emp, `app-${login}@pedee.app`, d.loja, d.whatsapp, d.endereco, d.cidade, d.uf.toUpperCase(), ate, quando, slug, d.tipo_loja),
    db.prepare("INSERT INTO usuarios (id, empresa_id, nome, login, senha_hash, senha_sal, papel, dono, criado_em) VALUES (?,?,?,?,?,?,'admin',0,?)")
      .bind(uid, emp, d.nome, login, await hashSenha(d.senha, sal), sal, quando),
    db.prepare("INSERT INTO auditoria (id, empresa_id, usuario_id, acao, detalhe, criado_em) VALUES (?,?,?,'loja_cadastrada',?,?)").bind(novoId(), emp, uid, JSON.stringify({ ip, slug }), quando),
  ]);
  const u = await db.prepare('SELECT * FROM usuarios WHERE id = ?').bind(uid).first<Usuario>();
  await abrirSessao(c, u!);
  return c.json({ ok: true, slug, gratisAte: ate }, 201);
});
