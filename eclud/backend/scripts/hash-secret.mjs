// Gera o hash de um PIN ou senha no mesmo formato da API (PBKDF2-SHA256).
// Uso: node scripts/hash-secret.mjs 1234
import { webcrypto as crypto } from 'node:crypto';

const secret = process.argv[2];
if (!secret) {
  console.error('Uso: node scripts/hash-secret.mjs <pin-ou-senha>');
  process.exit(1);
}
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
const hex = (b) => Buffer.from(b).toString('hex');
console.log(`${hex(salt)}:${hex(new Uint8Array(bits))}`);
