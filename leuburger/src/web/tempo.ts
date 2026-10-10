import { useEffect, useState } from 'react';

/** Faz a tela atualizar a cada segundo enquanto houver um prazo correndo (contagem regressiva). */
export function useRelogio(ativo: boolean) {
  const [, tic] = useState(0);
  useEffect(() => { if (!ativo) return; const t = setInterval(() => tic((x) => x + 1), 1000); return () => clearInterval(t); }, [ativo]);
}

/** "M:SS" que falta até a data; vazio se já passou. */
export function faltam(ate: string | null | undefined) {
  if (!ate) return '';
  const ms = new Date(ate).getTime() - Date.now();
  if (ms <= 0) return '';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "Alô!": som curto e vibração quando o pedido muda de etapa. */
export function alo() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext, ctx = new A();
    [0, 0.18].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = [784, 1047][k]; g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4); });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* sem som */ }
}

/** Prazos que o servidor manda (previsão de pronto, coleta e entrega). */
export interface Prazos { pronto: string; coleta: string | null; entrega: string | null; rota_min: number }
const hm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
/** "até 21:50 · faltam 8 min" ou "era até 21:50 · atrasado 5 min". */
export function prazo(iso: string | null | undefined) {
  if (!iso) return null;
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return { hora: hm(iso), atrasado: min < 0, min: Math.abs(min), texto: min < 0 ? `atrasado ${Math.abs(min)} min` : min === 0 ? 'agora' : `faltam ${min} min` };
}
