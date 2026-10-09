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
