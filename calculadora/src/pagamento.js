// Venda pelo Mercado Pago. Básico e anual: Checkout Pro (Pix e cartão). Mensal: assinatura no cartão.
// A chave só é emitida depois que a própria API do Mercado Pago confirma o pagamento; o aviso
// (webhook) serve só de gatilho.
import { emitirLicenca, revogarLicenca } from './licencas.js';
import { PLANOS, aplicarPlano } from './planos.js';
import { avisarCompraPorEmail, marcarEmailEnviado, avisarAparelhoNovo, enviarEmailDaCompra } from './email.js';
import { contaParaCompra, senhaValida, abrirSessao, buscarConta, trocarSenha, aparelhoDoPedido, marcarTeste } from './contas.js';

const MP = 'https://api.mercadopago.com';
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

export async function criarPedido(env, origem, d, req) {
  if (!env.MP_ACCESS_TOKEN) return { erro: 'pagamento_indisponivel', status: 503 };
  const nome = String(d?.nome || '').trim().slice(0, 80);
  const email = String(d?.email || '').trim().toLowerCase().slice(0, 120);
  const plano = String(d?.plano || 'basico');
  if (nome.length < 2 || !EMAIL.test(email) || !PLANOS[plano] || PLANOS[plano].foraDeVenda) return { erro: 'dados_invalidos', status: 400 };
  if (!senhaValida(d?.senha)) return { erro: 'senha_curta', status: 400 };
  const P = PLANOS[plano];
  // A compra fica ligada à conta (e-mail + senha): o app libera pela conta, sem chave.
  const nova = !(await buscarConta(env, email));
  const c = await contaParaCompra(env, email, nome, d.senha);
  if (c.erro) return { erro: c.erro, status: 409 };
  // Conta criada na compra (ainda sem pagar) também conta para o teste grátis único.
  if (nova) await marcarTeste(env, c.conta.id, req, aparelhoDoPedido(req, d?.aparelho));
  const sessao = await abrirSessao(env, c.conta.id, req, { avisar: (x, t) => avisarAparelhoNovo(env, x, t) });

  const id = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const agora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO pedidos (id, nome, email, status, plano, conta_id, criado_em, atualizado_em) VALUES (?, ?, ?, 'aguardando', ?, ?, ?, ?)")
    .bind(id, nome, email, plano, c.conta.id, agora, agora).run();
  // Outros apps compram pela loja (www.../loja/comprar): a volta é a página da loja.
  const volta = P.app === 'quantocobrar' ? `${origem}/compra?p=${id}` : `${origem}/loja/compra?p=${id}`;
  const aviso = `${env.URL_AVISO || origem}/api/mp/aviso`;

  if (P.assinatura) {
    // Assinatura sem plano prévio: o Mercado Pago devolve o link para o cliente cadastrar o cartão.
    const a = await mp(env, '/preapproval', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': id },
      body: JSON.stringify({
        reason: P.titulo,
        external_reference: id,
        payer_email: email,
        back_url: volta,
        status: 'pending',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: P.preco, currency_id: 'BRL' },
      }),
    });
    await env.DB.prepare('UPDATE pedidos SET assinatura_id = ? WHERE id = ?').bind(String(a.id), id).run();
    return { url: a.init_point, pedido: id, sessao };
  }

  const pref = await mp(env, '/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': id },
    body: JSON.stringify({
      items: [{ id: `${env.APP_ID}-${plano}`, title: P.titulo, quantity: 1, unit_price: P.preco, currency_id: 'BRL' }],
      payer: { name: nome, email },
      external_reference: id,
      notification_url: aviso,
      back_urls: { success: volta, pending: volta, failure: volta },
      auto_return: 'approved',
      payment_methods: { installments: plano === 'anual' ? 3 : P.parcelas || 1 }, // anual: cartão em até 3x; básico: à vista
      statement_descriptor: 'LEUNAME',
    }),
  });
  return { url: pref.init_point, pedido: id, sessao };
}

/** Pagamento aprovado: emite a chave (na primeira vez) e aplica o plano. Cada pagamento conta uma vez só. */
async function aplicarPagamento(env, pedido, pagamentoId, valor) {
  const P = PLANOS[pedido.plano] || PLANOS.basico;
  if (valor < P.preco - 0.001) return;
  const agora = new Date().toISOString();
  const r = await env.DB.prepare('INSERT OR IGNORE INTO pagamentos_aplicados (pagamento_id, pedido_id, criado_em) VALUES (?, ?, ?)')
    .bind(String(pagamentoId), pedido.id, agora).run();
  if (!r.meta.changes) return;
  try {
    let chave = pedido.chave, primeiraVez = false;
    if (!chave) {
      chave = await emitirLicenca(env, pedido.nome, pedido.email, P.licenca);
      await env.DB.prepare("UPDATE pedidos SET status = 'pago', chave = ?, pagamento_id = ?, atualizado_em = ? WHERE id = ?")
        .bind(chave, String(pagamentoId), agora, pedido.id).run();
      primeiraVez = true;
    }
    await aplicarPlano(env, chave, pedido.plano);
    // Primeiro pagamento: manda por e-mail o link para instalar (não manda de novo nas mensalidades).
    // Se não sair (sem o serviço de e-mail ou passou do limite do dia), fica na Área do Dono para mandar à mão.
    if (primeiraVez && (await avisarCompraPorEmail(env, pedido))) await marcarEmailEnviado(env, pedido.id, 'auto');
  } catch (e) {
    // Deixa o pagamento livre para o próximo aviso tentar de novo.
    await env.DB.prepare('DELETE FROM pagamentos_aplicados WHERE pagamento_id = ?').bind(String(pagamentoId)).run();
    throw e;
  }
}

/** Consulta o pagamento no Mercado Pago e aplica: aprovado → chave/plano; estornado/contestado → bloqueia. */
export async function processarPagamento(env, pagamentoId) {
  if (!/^\d{1,20}$/.test(String(pagamentoId))) return;
  const p = await mp(env, `/v1/payments/${pagamentoId}`);
  let pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(String(p.external_reference || '')).first();
  // Cobrança de assinatura: o pagamento aponta para a assinatura.
  const assinatura = p.metadata?.preapproval_id || p.point_of_interaction?.transaction_data?.subscription_id;
  if (!pedido && assinatura) pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE assinatura_id = ?').bind(String(assinatura)).first();
  if (!pedido) return;
  const agora = new Date().toISOString();

  if (p.status === 'approved' && p.currency_id === 'BRL') return aplicarPagamento(env, pedido, p.id, Number(p.transaction_amount));
  if (ESTORNO.has(p.status) && pedido.chave && !PLANOS[pedido.plano]?.assinatura) {
    await revogarLicenca(env, pedido.chave, `mercadopago:${p.status}`);
    await env.DB.prepare('UPDATE pedidos SET status = ?, atualizado_em = ? WHERE id = ?').bind(p.status, agora, pedido.id).run();
    return;
  }
  if (!pedido.chave && ['rejected', 'cancelled', 'pending', 'in_process'].includes(p.status)) {
    await env.DB.prepare('UPDATE pedidos SET status = ?, pagamento_id = ?, atualizado_em = ? WHERE id = ?').bind(p.status, String(p.id), agora, pedido.id).run();
  }
}

/** Cobrança mensal da assinatura (aviso "subscription_authorized_payment"). */
async function processarCobranca(env, id) {
  if (!/^\d{1,20}$/.test(String(id))) return;
  const c = await mp(env, `/authorized_payments/${id}`);
  const pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE assinatura_id = ?').bind(String(c.preapproval_id || '')).first();
  if (!pedido) return;
  if (c.payment?.status === 'approved') await aplicarPagamento(env, pedido, c.payment.id, Number(c.transaction_amount));
}

/** Situação da assinatura (aviso "subscription_preapproval"): guarda o status para o painel; o acesso vence sozinho se parar de pagar. */
async function processarAssinatura(env, id) {
  if (!/^[0-9a-zA-Z]{1,64}$/.test(String(id))) return;
  const a = await mp(env, `/preapproval/${id}`);
  const pedido = await env.DB.prepare('SELECT id, chave FROM pedidos WHERE assinatura_id = ?').bind(String(a.id)).first();
  if (pedido && !pedido.chave && ['cancelled', 'paused'].includes(a.status)) {
    await env.DB.prepare('UPDATE pedidos SET status = ?, atualizado_em = ? WHERE id = ?').bind(a.status, new Date().toISOString(), pedido.id).run();
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
  else if (tipo === 'subscription_authorized_payment' && id) await processarCobranca(env, id);
  else if (tipo === 'subscription_preapproval' && id) await processarAssinatura(env, id);
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

/** Esqueci a senha: e-mail da compra + número da operação do Mercado Pago (está no comprovante) → senha nova. */
export async function recuperarConta(env, d, req) {
  const email = String(d?.email || '').trim().toLowerCase();
  const operacao = String(d?.operacao || '').replace(/\D/g, '');
  if (!EMAIL.test(email) || !operacao || !senhaValida(d?.senha)) return null;
  const p = await env.DB.prepare("SELECT id, nome, conta_id FROM pedidos WHERE email = ? AND pagamento_id = ? AND status = 'pago'").bind(email, operacao).first();
  if (!p) return null;
  let conta = await buscarConta(env, email);
  if (conta) await trocarSenha(env, conta.id, d.senha);
  else conta = (await contaParaCompra(env, email, p.nome, d.senha)).conta;
  // Compras antigas do mesmo e-mail passam a ser desta conta.
  await env.DB.prepare('UPDATE pedidos SET conta_id = ? WHERE email = ? AND conta_id IS NULL').bind(conta.id, email).run();
  return abrirSessao(env, conta.id, req, { avisar: (x, t) => avisarAparelhoNovo(env, x, t) });
}

export async function situacaoPedido(env, id, pagamentoId) {
  if (!/^[0-9a-f]{36}$/.test(id)) return null;
  // Na volta do Mercado Pago, confere na hora (não depende de o aviso já ter chegado).
  if (pagamentoId && env.MP_ACCESS_TOKEN) await processarPagamento(env, pagamentoId).catch(() => {});
  const p = await env.DB.prepare('SELECT p.status, p.nome, p.plano, a.expira_em FROM pedidos p LEFT JOIN acessos a ON a.chave = p.chave WHERE p.id = ?').bind(id).first();
  return p ? { status: p.status, pago: p.status === 'pago', nome: p.nome.split(' ')[0], plano: p.plano, app: PLANOS[p.plano]?.app, expiraEm: p.expira_em || null } : null;
}

/**
 * Venda direta (o cliente pagou o dono por fora, ex.: Pix pessoal): libera o plano para o e-mail e manda o e-mail
 * com o botão Instalar. Se o e-mail ainda não tem conta, a compra fica guardada e entra na conta quando o cliente
 * criar a conta com este e-mail (contaParaCompra liga os pedidos pelo e-mail).
 */
export async function liberarVendaDireta(env, d) {
  const email = String(d?.email || '').trim().toLowerCase().slice(0, 120);
  const nome = String(d?.nome || '').trim().slice(0, 80) || email.split('@')[0];
  const plano = String(d?.plano || '');
  if (!EMAIL.test(email)) return { erro: 'email', status: 400 };
  if (!PLANOS[plano] || plano === 'teste') return { erro: 'plano', status: 400 };
  const P = PLANOS[plano];
  const conta = await buscarConta(env, email);
  const chave = await emitirLicenca(env, nome, email, P.licenca, 'venda-direta');
  const id = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const agora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO pedidos (id, nome, email, status, plano, conta_id, chave, pagamento_id, criado_em, atualizado_em) VALUES (?, ?, ?, 'pago', ?, ?, ?, ?, ?, ?)")
    .bind(id, nome, email, plano, conta?.id || null, chave, 'venda-direta:' + id.slice(0, 8), agora, agora).run();
  await aplicarPlano(env, chave, plano);
  const r = await enviarEmailDaCompra(env, { email, nome, plano }, { contaNova: !conta });
  if (r.ok) await marcarEmailEnviado(env, id, 'auto');
  return { ok: true, contaExiste: Boolean(conta), emailEnviado: r.ok };
}
