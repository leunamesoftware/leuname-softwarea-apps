// Venda pelo Mercado Pago (Checkout Pro: Pix e cartão). A chave só é emitida depois que a
// própria API do Mercado Pago confirma o pagamento; o aviso (webhook) serve só de gatilho.
import { emitirLicenca, revogarLicenca } from './licencas.js';

const MP = 'https://api.mercadopago.com';
export const PRECO = 20;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ESTORNO = new Set(['refunded', 'charged_back', 'cancelled']);

async function mp(env, caminho, opcoes = {}) {
  const r = await fetch((env.MP_API_BASE || MP) + caminho, {
    ...opcoes,
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
  });
  if (!r.ok) throw new Error(`mercadopago ${r.status}`);
  return r.json();
}

export async function criarPedido(env, origem, d) {
  if (!env.MP_ACCESS_TOKEN) return { erro: 'pagamento_indisponivel', status: 503 };
  const nome = String(d?.nome || '').trim().slice(0, 80);
  const email = String(d?.email || '').trim().toLowerCase().slice(0, 120);
  if (nome.length < 2 || !EMAIL.test(email)) return { erro: 'dados_invalidos', status: 400 };

  const id = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const agora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO pedidos (id, nome, email, status, criado_em, atualizado_em) VALUES (?, ?, ?, 'aguardando', ?, ?)")
    .bind(id, nome, email, agora, agora).run();

  const pref = await mp(env, '/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': id },
    body: JSON.stringify({
      items: [{ id: env.APP_ID, title: 'Quanto Cobrar — calculadora de receitas (acesso vitalício)', quantity: 1, unit_price: PRECO, currency_id: 'BRL' }],
      payer: { name: nome, email },
      external_reference: id,
      notification_url: `${origem}/api/mp/aviso`,
      back_urls: { success: `${origem}/compra?p=${id}`, pending: `${origem}/compra?p=${id}`, failure: `${origem}/compra?p=${id}` },
      auto_return: 'approved',
      payment_methods: { installments: 1 },
      statement_descriptor: 'LEUNAME',
    }),
  });
  return { url: pref.init_point, pedido: id };
}

/** Consulta o pagamento no Mercado Pago e aplica: aprovado → emite a chave; estornado/contestado → bloqueia. */
export async function processarPagamento(env, pagamentoId) {
  if (!/^\d{1,20}$/.test(String(pagamentoId))) return;
  const p = await mp(env, `/v1/payments/${pagamentoId}`);
  const pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(String(p.external_reference || '')).first();
  if (!pedido) return;
  const agora = new Date().toISOString();

  if (p.status === 'approved' && p.currency_id === 'BRL' && Number(p.transaction_amount) >= PRECO && !pedido.chave) {
    // Marca o pedido antes de emitir: dois avisos simultâneos não geram duas chaves.
    const travado = new Date(Date.now() - 120000).toISOString();
    const r = await env.DB.prepare("UPDATE pedidos SET status = 'emitindo', pagamento_id = ?, atualizado_em = ? WHERE id = ? AND chave IS NULL AND (status != 'emitindo' OR atualizado_em < ?)")
      .bind(String(p.id), agora, pedido.id, travado).run();
    if (!r.meta.changes) return;
    const chave = await emitirLicenca(env, pedido.nome, pedido.email);
    await env.DB.prepare("UPDATE pedidos SET status = 'pago', chave = ?, atualizado_em = ? WHERE id = ?").bind(chave, agora, pedido.id).run();
    return;
  }
  if (ESTORNO.has(p.status) && pedido.chave) {
    await revogarLicenca(env, pedido.chave, `mercadopago:${p.status}`);
    await env.DB.prepare('UPDATE pedidos SET status = ?, atualizado_em = ? WHERE id = ?').bind(p.status, agora, pedido.id).run();
    return;
  }
  if (!pedido.chave && ['rejected', 'cancelled', 'pending', 'in_process'].includes(p.status)) {
    await env.DB.prepare('UPDATE pedidos SET status = ?, pagamento_id = ?, atualizado_em = ? WHERE id = ?').bind(p.status, String(p.id), agora, pedido.id).run();
  }
}

/** Aviso do Mercado Pago (webhook). Aceita os dois formatos que ele envia. */
export async function receberAviso(env, req) {
  const url = new URL(req.url);
  let corpo = {};
  try { corpo = await req.json(); } catch { /* aviso sem corpo */ }
  const tipo = corpo.type || corpo.topic || url.searchParams.get('type') || url.searchParams.get('topic');
  const id = corpo.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
  if (tipo === 'payment' && id) await processarPagamento(env, id);
  else if (tipo === 'chargebacks' && id) {
    // Contestação no cartão: busca o pagamento ligado à contestação e bloqueia a chave.
    const cb = await mp(env, `/v1/chargebacks/${encodeURIComponent(id)}`).catch(() => null);
    for (const pid of cb?.payments || []) {
      const pedido = await env.DB.prepare('SELECT chave FROM pedidos WHERE pagamento_id = ?').bind(String(pid)).first();
      if (pedido?.chave) {
        await revogarLicenca(env, pedido.chave, 'mercadopago:contestacao');
        await env.DB.prepare("UPDATE pedidos SET status = 'contestado', atualizado_em = ? WHERE pagamento_id = ?").bind(new Date().toISOString(), String(pid)).run();
      }
    }
  }
}

/** Recupera a chave pelo e-mail da compra + número da operação do Mercado Pago (está no comprovante). */
export async function recuperarChave(env, d) {
  const email = String(d?.email || '').trim().toLowerCase();
  const operacao = String(d?.operacao || '').replace(/\D/g, '');
  if (!EMAIL.test(email) || !operacao) return null;
  const p = await env.DB.prepare("SELECT chave FROM pedidos WHERE email = ? AND pagamento_id = ? AND status = 'pago'").bind(email, operacao).first();
  return p?.chave || null;
}

export async function situacaoPedido(env, id, pagamentoId) {
  if (!/^[0-9a-f]{36}$/.test(id)) return null;
  // Na volta do Mercado Pago, confere na hora (não depende de o aviso já ter chegado).
  if (pagamentoId && env.MP_ACCESS_TOKEN) await processarPagamento(env, pagamentoId).catch(() => {});
  const p = await env.DB.prepare('SELECT status, chave, nome FROM pedidos WHERE id = ?').bind(id).first();
  return p ? { status: p.status, chave: p.status === 'pago' ? p.chave : null, nome: p.nome.split(' ')[0] } : null;
}
