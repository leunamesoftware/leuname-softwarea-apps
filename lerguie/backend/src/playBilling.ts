// Validação de assinaturas do Google Play no SERVIDOR (o app nunca decide sozinho).
// Requer o segredo GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (conta de serviço com acesso à
// Google Play Android Developer API vinculada ao Play Console).
import { base64UrlEncode } from './jwt.ts';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface VerifiedSubscription {
  productId: string;
  expiresAt: number; // epoch em segundos
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const assertion = `${header}.${claims}.${base64UrlEncode(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`google_oauth_${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const ACTIVE_STATES = new Set(['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']);

export async function verifySubscription(
  serviceAccountJson: string,
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<VerifiedSubscription | null> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const token = await googleAccessToken(sa);
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`play_api_${res.status}`);
  const data = (await res.json()) as {
    subscriptionState?: string;
    lineItems?: { productId: string; expiryTime?: string }[];
  };
  if (!data.subscriptionState || !ACTIVE_STATES.has(data.subscriptionState)) return null;
  const item = data.lineItems?.find((l) => l.productId === productId);
  if (!item?.expiryTime) return null;
  const expiresAt = Math.floor(Date.parse(item.expiryTime) / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return null;
  return { productId, expiresAt };
}
