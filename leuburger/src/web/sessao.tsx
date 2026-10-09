// Quem está logado, dados da lanchonete e o pedido em andamento (carrinho).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { pode, type Acao, type Papel } from '../regras/permissoes';
import type { EscolhaItem } from '../regras/pedido';
import { get, post, quandoPerderSessao } from './api';

export interface Empresa {
  id: string; nome: string; cnpj: string | null; telefone: string | null; endereco: string | null; cidade: string | null; uf: string | null;
  mensagem_cupom: string | null; formas_pagamento: string[]; desconto_max_caixa: number; largura_cupom: '58' | '80'; acesso_ate: string | null; taxa_entrega_padrao: number; no_app: boolean; aceitando: boolean; slug: string | null;
}
export interface Eu { usuario: { id: string; nome: string; login: string; papel: Papel; dono: boolean }; empresa: Empresa }

interface ValorSessao {
  eu: Eu | null;
  carregando: boolean;
  bloqueio: { codigo: string; mensagem: string } | null;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
  pode: (a: Acao) => boolean;
}
const Ctx = createContext<ValorSessao>(null as never);
export const useSessao = () => useContext(Ctx);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [eu, setEu] = useState<Eu | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [bloqueio, setBloqueio] = useState<ValorSessao['bloqueio']>(null);
  const recarregar = useCallback(async () => {
    try {
      setEu(await get<Eu>('/eu')); setBloqueio(null);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setEu(null);
      if (e?.status === 402) setBloqueio({ codigo: e.codigo, mensagem: e.message });
      else if (e?.status === 401) {
        // Já logado na loja LeuApps neste navegador: entra direto.
        try { await post('/auth/leuapps'); setEu(await get<Eu>('/eu')); } catch (e2: any) { if (e2?.status === 402) setBloqueio({ codigo: e2.codigo, mensagem: e2.message }); } // eslint-disable-line @typescript-eslint/no-explicit-any
      } else if (e?.status === 0) setBloqueio({ codigo: 'sem_internet', mensagem: e.message });
    } finally { setCarregando(false); }
  }, []);
  useEffect(() => { quandoPerderSessao(() => setEu(null)); recarregar(); }, [recarregar]);
  const sair = useCallback(async () => { await post('/auth/sair').catch(() => {}); limparPedido(); setEu(null); }, []);
  return <Ctx.Provider value={{ eu, carregando, bloqueio, recarregar, sair, pode: (a) => pode(eu?.usuario.papel, a) }}>{children}</Ctx.Provider>;
}

// ---------- pedido em andamento (fica guardado no aparelho até finalizar) ----------
export interface ItemCarrinho extends EscolhaItem { chaveItem: string }
export interface Pedido { itens: ItemCarrinho[]; observacao: string; desconto: { tipo: 'valor' | 'pct'; valor: number } | null; clienteId: string | null; chave: string; entrega?: { endereco: string; taxa: number } | null }
const GUARDA = 'leuburger_pedido';
const novaChave = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
export const pedidoVazio = (): Pedido => ({ itens: [], observacao: '', desconto: null, clienteId: null, chave: novaChave() });
export function lerPedido(): Pedido {
  try { const p = JSON.parse(localStorage.getItem(GUARDA) || 'null'); if (p && Array.isArray(p.itens) && p.chave) return p; } catch { /* sem armazenamento */ }
  return pedidoVazio();
}
export function guardarPedido(p: Pedido) { try { localStorage.setItem(GUARDA, JSON.stringify(p)); } catch { /* sem armazenamento */ } }
export function limparPedido() { try { localStorage.removeItem(GUARDA); } catch { /* sem armazenamento */ } }

const CtxPedido = createContext<{ pedido: Pedido; mudar: (f: (p: Pedido) => Pedido) => void; zerar: () => void }>(null as never);
export const usePedido = () => useContext(CtxPedido);
export function ProvedorPedido({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido>(lerPedido);
  const mudar = useCallback((f: (p: Pedido) => Pedido) => setPedido((p) => { const n = f(p); guardarPedido(n); return n; }), []);
  const zerar = useCallback(() => { const n = pedidoVazio(); guardarPedido(n); setPedido(n); }, []);
  return <CtxPedido.Provider value={{ pedido, mudar, zerar }}>{children}</CtxPedido.Provider>;
}
