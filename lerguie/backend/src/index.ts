// API do Lerguie (Cloudflare Worker). Stateless: não armazena imagens, áudios nem textos.
// Rotas:
//   GET  /health
//   GET  /v1/plans              catálogo de planos (público, com cache)
//   POST /v1/session            token anônimo por instalação
//   POST /v1/describe           descrição de imagem por IA (autenticado, com limites)
//   POST /v1/billing/verify     valida assinatura Google Play e devolve token com o plano
import { describeImage, NotDescribableError, type Mode } from './describe.ts';
import type { Env } from './env.ts';
import { signJwt, verifyJwt, type SessionPayload } from './jwt.ts';
import { findPlan, loadCatalog } from './plans.ts';
import { verifySubscription } from './playBilling.ts';

const SESSION_TTL = 7 * 24 * 3600;
const MAX_IMAGE_B64 = 2_800_000; // ~2 MB de JPEG; o app envia ~1024 px (bem menos)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALE_RE = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const MODES: Mode[] = ['walk', 'object', 'person', 'environment'];

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

const error = (status: number, code: string) => json({ error: code }, status);

async function readJson<T>(request: Request, maxBytes: number): Promise<T | null> {
  const length = Number(request.headers.get('Content-Length') ?? '0');
  if (length > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function auth(request: Request, env: Env): Promise<SessionPayload | null> {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  return verifyJwt(header.slice(7), env.SESSION_SECRET);
}

async function issueSession(env: Env, sub: string, plan: string, expiresAt?: number) {
  const exp = Math.min(expiresAt ?? Infinity, Math.floor(Date.now() / 1000) + SESSION_TTL);
  const token = await signJwt({ sub, plan, exp }, env.SESSION_SECRET);
  return { token, expiresAt: exp, plan };
}

/** Cota diária por plano (só se o KV USAGE estiver configurado). */
async function consumeDailyQuota(env: Env, session: SessionPayload, limit: number | undefined): Promise<boolean> {
  if (!env.USAGE || limit === undefined) return true;
  const day = new Date().toISOString().slice(0, 10);
  const key = `q:${session.sub}:${day}`;
  const used = Number((await env.USAGE.get(key)) ?? '0');
  if (used >= limit) return false;
  await env.USAGE.put(key, String(used + 1), { expirationTtl: 2 * 24 * 3600 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const route = `${request.method} ${url.pathname}`;

    try {
      if (route === 'GET /health') return json({ ok: true });

      if (route === 'GET /v1/plans') {
        return json(loadCatalog(env.PLANS_JSON), 200, { 'Cache-Control': 'public, max-age=3600' });
      }

      if (route === 'POST /v1/session') {
        if (!(await env.SESSION_LIMITER.limit({ key: ip })).success) return error(429, 'rate_limited');
        const body = await readJson<{ installId?: string }>(request, 2_000);
        if (!body?.installId || !UUID_RE.test(body.installId)) return error(400, 'invalid_request');
        const catalog = loadCatalog(env.PLANS_JSON);
        return json(await issueSession(env, body.installId, catalog.defaultPlanId));
      }

      if (route === 'POST /v1/describe') {
        const session = await auth(request, env);
        if (!session) return error(401, 'unauthorized');
        if (!(await env.DESCRIBE_LIMITER.limit({ key: session.sub })).success) return error(429, 'rate_limited');
        const body = await readJson<{ image?: string; mode?: string; locale?: string; target?: string }>(request, MAX_IMAGE_B64 + 2_000);
        if (!body?.image || !body.image.startsWith('/9j/')) return error(400, 'invalid_image');
        const mode = MODES.includes(body.mode as Mode) ? (body.mode as Mode) : 'object';
        const locale = body.locale && LOCALE_RE.test(body.locale) ? body.locale : 'pt-BR';
        // Item procurado: texto curto e limpo (sem aspas/controle) para ir ao prompt.
        const target = typeof body.target === 'string' ? body.target.replace(/[^\p{L}\p{N} .,-]/gu, '').trim().slice(0, 60) || undefined : undefined;

        const plan = findPlan(loadCatalog(env.PLANS_JSON), session.plan);
        if (!plan.features.includes('CLOUD_DESCRIPTION')) return error(403, 'feature_not_in_plan');
        if (!(await consumeDailyQuota(env, session, plan.limits.cloud_descriptions_per_day))) return error(429, 'quota_exceeded');

        try {
          return json(await describeImage(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL, body.image, mode, locale, target));
        } catch (e) {
          if (e instanceof NotDescribableError) {
            return json({ identified: '', description: '', environment: '', action: '', colors: '', hazards: [], confidence: 'low' });
          }
          throw e;
        }
      }

      if (route === 'POST /v1/billing/verify') {
        const session = await auth(request, env);
        if (!session) return error(401, 'unauthorized');
        if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) return error(501, 'billing_not_configured');
        const body = await readJson<{ productId?: string; purchaseToken?: string }>(request, 5_000);
        if (!body?.productId || !body.purchaseToken) return error(400, 'invalid_request');
        const catalog = loadCatalog(env.PLANS_JSON);
        const plan = catalog.plans.find((p) => p.productId === body.productId);
        if (!plan) return error(400, 'unknown_product');
        const sub = await verifySubscription(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, env.ANDROID_PACKAGE, body.productId, body.purchaseToken);
        if (!sub) return json(await issueSession(env, session.sub, catalog.defaultPlanId));
        return json(await issueSession(env, session.sub, plan.id, sub.expiresAt));
      }

      return error(404, 'not_found');
    } catch (e) {
      // Log técnico sem conteúdo do usuário (nada de imagem, texto ou token).
      console.error(JSON.stringify({ route, error: e instanceof Error ? e.name + ': ' + e.message.slice(0, 200) : 'unknown' }));
      return error(502, 'upstream_error');
    }
  },
} satisfies ExportedHandler<Env>;
