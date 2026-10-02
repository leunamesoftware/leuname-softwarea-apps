// Cliente mínimo da Google Play Developer API (assinaturas), usando uma
// conta de serviço e a Web Crypto do Worker — sem dependências.

const encoder = new TextEncoder();

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(serviceAccountJson: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`google_token_${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface PlaySubscription {
  subscriptionState: string;
  lineItems?: { productId: string; expiryTime?: string }[];
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
}

/** Consulta uma compra de assinatura (purchases.subscriptionsv2.get). */
export async function fetchPlaySubscription(
  serviceAccountJson: string,
  packageName: string,
  purchaseToken: string,
): Promise<PlaySubscription | null> {
  const token = await accessToken(serviceAccountJson);
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 410 || res.status === 400) return null;
  if (!res.ok) throw new Error(`google_play_${res.status}`);
  return (await res.json()) as PlaySubscription;
}

export type LocalStatus = 'active' | 'past_due' | 'canceled';

/**
 * Traduz o estado da Play para o nosso. "Cancelada" na Play ainda dá acesso
 * até o fim do período pago; "em espera"/"pausada" não dão acesso.
 */
export function toLocalStatus(sub: PlaySubscription, now = Date.now()): { status: LocalStatus; periodEnd: string } {
  const expiry = Math.max(0, ...(sub.lineItems ?? []).map((l) => (l.expiryTime ? Date.parse(l.expiryTime) : 0)));
  const periodEnd = new Date(expiry || now).toISOString();
  switch (sub.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return { status: 'active', periodEnd };
    case 'SUBSCRIPTION_STATE_CANCELED':
      return { status: expiry > now ? 'active' : 'canceled', periodEnd };
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      return { status: 'past_due', periodEnd };
    default:
      return { status: 'canceled', periodEnd };
  }
}
