// Peças comuns da API: banco, erros, ids, datas e senhas.
import type { Context } from 'hono';
import type { Papel } from '../regras/permissoes';

export interface D1Result<T = Record<string, unknown>> { results: T[]; meta?: { changes?: number } }
export interface D1Prepared {
  bind(...v: unknown[]): D1Prepared;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1 { prepare(sql: string): D1Prepared; batch(s: D1Prepared[]): Promise<D1Result[]> }
export interface Servico { fetch(r: Request): Promise<Response> }

export interface Env {
  BANCO: D1;
  CONTAS?: Servico;
  ASSETS?: Servico;
  DONO_EMAIL?: string;
}

export interface Usuario { id: string; empresa_id: string; nome: string; login: string; papel: Papel; dono: number }
export interface Empresa {
  id: string; conta_email: string; nome: string; cnpj: string | null; telefone: string | null; endereco: string | null;
  cidade: string | null; uf: string | null; mensagem_cupom: string | null; formas_pagamento: string;
  desconto_max_caixa: number; largura_cupom: string; acesso_ate: string | null; proximo_numero: number; criado_em: string;
}
export type Vars = { usuario: Usuario; empresa: Empresa };
export type C = Context<{ Bindings: Env; Variables: Vars }>;

export class ErroApi extends Error {
  constructor(public status: number, public codigo: string, mensagem: string, public campos?: Record<string, string>) { super(mensagem); }
}
export const erro = (status: number, codigo: string, mensagem: string, campos?: Record<string, string>) => new ErroApi(status, codigo, mensagem, campos);

export const agora = () => new Date().toISOString();
export const novoId = () => crypto.randomUUID();

/** Lê o corpo JSON; corpo inválido vira erro 400 com mensagem clara. */
export async function corpo<T = Record<string, unknown>>(c: C): Promise<T> {
  try { return (await c.req.json()) as T; } catch { throw erro(400, 'corpo_invalido', 'Dados enviados em formato inválido.'); }
}

/** Registra uma operação importante (quem fez o quê). */
export function auditar(c: C, acao: string, detalhe: unknown) {
  const u = c.get('usuario');
  return c.env.BANCO.prepare('INSERT INTO auditoria (id, empresa_id, usuario_id, acao, detalhe, criado_em) VALUES (?,?,?,?,?,?)')
    .bind(novoId(), u.empresa_id, u.id, acao, typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe), agora());
}

// ---------- senhas e tokens ----------
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
export function aleatorio(bytes = 32) { return b64(crypto.getRandomValues(new Uint8Array(bytes))).replace(/[+/=]/g, (x) => ({ '+': '-', '/': '_', '=': '' }[x]!)); }
export async function sha256(texto: string) { return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))); }
/** Senha com PBKDF2 (100 mil voltas, sal único por usuário). Nunca guarda a senha em texto. */
export async function hashSenha(senha: string, sal: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sal), iterations: 100000 }, chave, 256);
  return b64(bits);
}
/** Compara sem vazar tempo. */
export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
