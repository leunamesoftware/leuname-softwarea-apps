import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Erros com um código fixo: o app traduz o código para o idioma do usuário,
 * então a API não manda frases prontas.
 */
export function fail(
  c: Context,
  status: ContentfulStatusCode,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return c.json({ error, ...extra }, status);
}

export async function readJson<T>(c: Context): Promise<Partial<T> | null> {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}

export const isString = (v: unknown, min = 1, max = 200): v is string =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

export const isEmail = (v: unknown): v is string =>
  isString(v, 3, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isHttpsUrl = (v: unknown): v is string => {
  if (!isString(v, 8, 500)) return false;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
};

export const isPin = (v: unknown): v is string => typeof v === 'string' && /^\d{4}$/.test(v);

/** "AAAA-MM" do mês atual em UTC. */
export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Horário semanal: {"1": [["13:00","16:00"], ["20:00","23:30"]], ...}.
 * Dias 1 (segunda) a 7 (domingo), até 2 turnos por dia; dia ausente = fechado.
 */
export function isOpeningHours(v: unknown): v is Record<string, [string, string][]> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>).every(
    ([day, ranges]) =>
      /^[1-7]$/.test(day) &&
      Array.isArray(ranges) &&
      ranges.length <= 2 &&
      ranges.every(
        (r) => Array.isArray(r) && r.length === 2 && typeof r[0] === 'string' && typeof r[1] === 'string' &&
          TIME.test(r[0]) && TIME.test(r[1]) && r[0] !== r[1],
      ),
  );
}
