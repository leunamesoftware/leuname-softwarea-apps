import { Hono, type Context } from 'hono';
import { requireAuth } from '../auth';
import { fail, readJson } from '../http';
import { fetchPlaySubscription, toLocalStatus } from '../google';
import type { AppEnv, Env } from '../types';

/** Assinatura do cliente, vendida só pela Google Play. */
export const billing = new Hono<AppEnv>();

const PRODUCT_ID = 'eclud_mensual';

async function saveFromPlay(env: Env, userId: string, purchaseToken: string) {
  if (!env.GOOGLE_SERVICE_ACCOUNT) throw new Error('google_not_configured');
  const sub = await fetchPlaySubscription(env.GOOGLE_SERVICE_ACCOUNT, env.PLAY_PACKAGE_NAME, purchaseToken);
  if (!sub) return null;
  const { status, periodEnd } = toLocalStatus(sub);
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, provider, external_id, status, current_period_end, updated_at)
     VALUES (?, 'google_play', ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT(user_id) DO UPDATE SET provider = 'google_play', external_id = excluded.external_id,
       status = excluded.status, current_period_end = excluded.current_period_end, updated_at = excluded.updated_at`,
  )
    .bind(userId, purchaseToken, status, periodEnd)
    .run();
  return { sub, status, periodEnd };
}

/**
 * O app manda o token da compra; a API confere direto com o Google antes de
 * liberar o acesso. A compra precisa ter sido feita por esta conta.
 */
billing.post('/billing/google/verify', requireAuth(), async (c) => {
  const user = c.get('user');
  const body = await readJson<{ purchaseToken: string; productId: string }>(c);
  if (!body || typeof body.purchaseToken !== 'string' || body.purchaseToken.length > 4096 || body.productId !== PRODUCT_ID) {
    return fail(c, 400, 'invalid_input');
  }
  if (!c.env.GOOGLE_SERVICE_ACCOUNT) return fail(c, 503, 'billing_not_configured');

  const owner = await c.env.DB.prepare(
    "SELECT user_id FROM subscriptions WHERE provider = 'google_play' AND external_id = ?",
  )
    .bind(body.purchaseToken)
    .first<{ user_id: string }>();
  if (owner && owner.user_id !== user.id) return fail(c, 409, 'purchase_in_use');

  const sub = await fetchPlaySubscription(c.env.GOOGLE_SERVICE_ACCOUNT, c.env.PLAY_PACKAGE_NAME, body.purchaseToken);
  if (!sub || !(sub.lineItems ?? []).some((l) => l.productId === PRODUCT_ID)) return fail(c, 400, 'invalid_purchase');
  const accountId = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (accountId && accountId !== user.id) return fail(c, 409, 'purchase_in_use');

  const saved = await saveFromPlay(c.env, user.id, body.purchaseToken);
  return c.json({ status: saved!.status, currentPeriodEnd: saved!.periodEnd });
});

/**
 * Notificações em tempo real da Play (renovação, cancelamento, reembolso),
 * via Pub/Sub em modo push. Protegido por segredo na URL.
 */
billing.post('/billing/google/rtdn', async (c: Context<AppEnv>) => {
  const token = c.req.query('token');
  if (!c.env.PLAY_RTDN_TOKEN || token !== c.env.PLAY_RTDN_TOKEN) return fail(c, 401, 'unauthorized');
  const body = await readJson<{ message: { data: string } }>(c);
  try {
    const data = JSON.parse(atob(body?.message?.data ?? '')) as {
      subscriptionNotification?: { purchaseToken: string };
    };
    const purchaseToken = data.subscriptionNotification?.purchaseToken;
    if (purchaseToken) {
      const row = await c.env.DB.prepare(
        "SELECT user_id FROM subscriptions WHERE provider = 'google_play' AND external_id = ?",
      )
        .bind(purchaseToken)
        .first<{ user_id: string }>();
      if (row) await saveFromPlay(c.env, row.user_id, purchaseToken);
    }
  } catch (err) {
    console.error('rtdn', err);
  }
  // Sempre 204: a Pub/Sub não deve reenviar mensagens que não conseguimos usar.
  return c.body(null, 204);
});

/** Revalida com o Google quando o período salvo já venceu (renovação perdida). */
export async function refreshExpiredSubscription(env: Env, userId: string): Promise<void> {
  if (!env.GOOGLE_SERVICE_ACCOUNT) return;
  const row = await env.DB.prepare(
    `SELECT external_id FROM subscriptions
     WHERE user_id = ? AND provider = 'google_play' AND status != 'canceled' AND current_period_end < ?`,
  )
    .bind(userId, new Date().toISOString())
    .first<{ external_id: string }>();
  if (!row) return;
  try {
    await saveFromPlay(env, userId, row.external_id);
  } catch (err) {
    console.error('refresh subscription', err);
  }
}
