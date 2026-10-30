// Avisos no WhatsApp do dono (venda nova, produto escondido). Usa o CallMeBot (serviço gratuito para o próprio número).
// O número e a chave ficam só no servidor (D1) e nunca voltam para o navegador.
import { consultar } from './shopify.js';

const get = async (env, k) => (await env.DB.prepare('SELECT valor FROM alertas WHERE chave = ?').bind(k).first())?.valor ?? null;
const set = (env, k, v) => env.DB.prepare('INSERT INTO alertas (chave, valor, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor, atualizado_em=excluded.atualizado_em').bind(k, String(v), new Date().toISOString()).run();

export async function estadoAlertas(env) {
  const tel = await get(env, 'telefone'), key = await get(env, 'apikey');
  return { ligado: Boolean(tel && key), final: tel ? tel.slice(-4) : null };
}
export async function guardarWhatsapp(env, { telefone, apikey }) {
  const tel = String(telefone || '').replace(/\D/g, '');
  const k = String(apikey || '').trim();
  if (!/^\d{11,15}$/.test(tel) || !/^[A-Za-z0-9]{3,20}$/.test(k)) return { erro: 'dados', status: 400 };
  await set(env, 'telefone', tel); await set(env, 'apikey', k);
  return { ok: true };
}
export async function removerWhatsapp(env) {
  await env.DB.prepare("DELETE FROM alertas WHERE chave IN ('telefone','apikey')").run();
  return { ok: true };
}
/** Manda uma mensagem. Devolve { ok } ou { erro }. */
export async function enviarWhats(env, texto) {
  const tel = await get(env, 'telefone'), key = await get(env, 'apikey');
  if (!tel || !key) return { erro: 'sem_whatsapp', status: 409 };
  try {
    const r = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(tel)}&text=${encodeURIComponent(String(texto).slice(0, 900))}&apikey=${encodeURIComponent(key)}`);
    return r.ok ? { ok: true } : { erro: 'envio_falhou', status: 502 };
  } catch { return { erro: 'envio_falhou', status: 502 }; }
}
export const testarWhatsapp = (env) => enviarWhats(env, '✅ LeunaPets: o aviso no WhatsApp está funcionando. Você vai receber aqui as vendas da loja.');

/** Procura vendas novas na Shopify e avisa no WhatsApp (cada venda só uma vez). */
export async function avisarVendas(env, { simular = false } = {}) {
  const q = await consultar(env, `{ orders(first: 15, sortKey: CREATED_AT, reverse: true) { nodes { id name createdAt displayFinancialStatus
    totalPriceSet { shopMoney { amount currencyCode } } shippingAddress { city countryCodeV2 }
    lineItems(first: 10) { nodes { title quantity variantTitle } } } } }`);
  if (q.erro) return q;
  const lista = (q.dados?.orders?.nodes || []).slice().reverse();
  const ultima = await get(env, 'ultima_venda');
  if (ultima === null && !simular) { // primeira vez: só marca o ponto de partida, sem avisar o que já existia
    if (lista.length) await set(env, 'ultima_venda', lista[lista.length - 1].createdAt); else await set(env, 'ultima_venda', new Date().toISOString());
    return { ok: true, novas: 0, inicio: true };
  }
  const novas = lista.filter((o) => !ultima || o.createdAt > ultima);
  let avisadas = 0;
  for (const o of novas) {
    const itens = o.lineItems.nodes.map((l) => `${l.quantity}× ${l.title}${l.variantTitle && l.variantTitle !== 'Default Title' ? ` (${l.variantTitle})` : ''}`).join(', ');
    const lugar = [o.shippingAddress?.city, o.shippingAddress?.countryCodeV2].filter(Boolean).join(', ');
    const total = o.totalPriceSet?.shopMoney;
    const msg = `🛒 Nova venda ${o.name}!\n${itens}\nTotal: ${total ? Number(total.amount).toFixed(2) + ' ' + total.currencyCode : '—'}${lugar ? '\nPara: ' + lugar : ''}\nSituação: ${o.displayFinancialStatus || '—'}`;
    const e = await enviarWhats(env, msg);
    if (e.ok) { avisadas++; await set(env, 'ultima_venda', o.createdAt); } else break;
  }
  return { ok: true, novas: novas.length, avisadas };
}
