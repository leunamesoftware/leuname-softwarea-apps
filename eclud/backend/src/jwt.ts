// JWT HS256 com a Web Crypto do Worker, sem dependências.
import { constantTimeEqual } from './crypto';

export type Role = 'member' | 'merchant' | 'admin';

export interface JwtPayload {
  sub: string;
  role: Role;
  exp: number;
}

const encoder = new TextEncoder();

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function sign(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

const HEADER = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
export const SESSION_SECONDS = 60 * 60 * 24 * 30;

export async function signJwt(sub: string, role: Role, secret: string): Promise<string> {
  const payload: JwtPayload = { sub, role, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const body = b64url(JSON.stringify(payload));
  return `${HEADER}.${body}.${b64url(await sign(`${HEADER}.${body}`, secret))}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const [header, body, signature] = token.split('.');
  // Aceita só o cabeçalho que nós emitimos (bloqueia "alg: none" e afins).
  if (header !== HEADER || !body || !signature) return null;
  try {
    const expected = await sign(`${header}.${body}`, secret);
    if (!constantTimeEqual(expected, b64urlDecode(signature))) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as JwtPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}
