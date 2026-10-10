// Avisos com o app fechado (o celular toca e mostra a notificação). Um botão por app: o navegador só deixa pedir
// a permissão depois de um toque da pessoa. Se ela já permitiu antes, liga sozinho, sem perguntar de novo.
import { useEffect, useState } from 'react';
import { get } from './api';

export const suportaAvisos = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const chaveBytes = (b64: string) => { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4)); return Uint8Array.from(s, (ch) => ch.charCodeAt(0)); };

/** Inscreve este aparelho e manda o endereço do aviso para `registrar` (cada app sabe para quem é). */
export async function ligarAvisos(registrar: (endpoint: string) => Promise<unknown>): Promise<'ok' | 'negado' | 'sem_suporte'> {
  if (!suportaAvisos()) return 'sem_suporte';
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return 'negado';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) { const { chave } = await get<{ chave: string }>('/publico/push/chave'); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(chave) }); }
  await registrar(sub.endpoint);
  return 'ok';
}

/** Cartão "Ativar avisos". Some quando já está ligado. `chave` muda quando há algo novo para avisar (ex.: pedido novo do cliente). */
export function AtivarAvisos({ registrar, texto, chave = '' }: { registrar: (endpoint: string) => Promise<unknown>; texto: string; chave?: string }) {
  const [estado, setEstado] = useState<'' | 'ok' | 'negado' | 'sem_suporte' | 'ligando'>(() => (!suportaAvisos() ? 'sem_suporte' : Notification.permission === 'denied' ? 'negado' : ''));
  // Já permitido antes: liga (ou atualiza) sozinho, sem perguntar.
  useEffect(() => {
    if (suportaAvisos() && Notification.permission === 'granted') ligarAvisos(registrar).then(setEstado).catch(() => setEstado(''));
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (estado === 'ok' || estado === 'sem_suporte') return null;
  if (estado === 'negado') return <p className="aviso" style={{ margin: '0 0 10px' }}>🔕 Os avisos estão bloqueados neste celular. Para receber com o app fechado: toque no cadeado (ou ⋮) → Permissões → <b>Notificações</b> → Permitir.</p>;
  return (
    <button className="avisos-ligar" onClick={async () => { setEstado('ligando'); try { setEstado(await ligarAvisos(registrar)); } catch { setEstado(''); } }} disabled={estado === 'ligando'}>
      <span>🔔</span><span><b>{estado === 'ligando' ? 'Ligando…' : 'Ativar avisos'}</b><small>{texto}</small></span>
    </button>
  );
}
