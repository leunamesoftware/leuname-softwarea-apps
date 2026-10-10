// Prazos de cada pedido: quando fica pronto (preparo da loja), quando o entregador pega e quando chega ao cliente.
// O cliente, a loja e o entregador veem a mesma conta; passou do horário = atrasado.
export const COLETA_MIN = 15; // tempo para o entregador chegar na loja depois de chamado
export const minutosRota = (km: number | null | undefined) => (km == null ? 15 : Math.max(5, Math.round(5 + km * 3)));

export interface BasePrazo {
  aceito_em: string | null; // quando a loja aceitou (null = ainda esperando)
  preparo_min: number;
  pronto_em: string | null;
  entregador_em: string | null;
  saiu_em: string | null;
  km: number | null; // loja → cliente
  entrega: boolean;
}
export interface Prazos { pronto: string; coleta: string | null; entrega: string | null; rota_min: number }

const iso = (ms: number) => new Date(ms).toISOString();
const t = (s: string | null) => (s ? new Date(s).getTime() : null);

export function calcularPrazos(b: BasePrazo, agora = Date.now()): Prazos {
  const aceito = t(b.aceito_em) ?? agora;
  const pronto = aceito + Math.max(1, b.preparo_min || 20) * 60e3;
  const rota = minutosRota(b.km);
  if (!b.entrega) return { pronto: iso(pronto), coleta: null, entrega: null, rota_min: rota };
  const chamado = t(b.entregador_em);
  // O entregador deve estar na loja quando o pedido fica pronto (ou 15 min depois de chamado, o que for mais tarde).
  const coleta = Math.max(pronto, (chamado ?? pronto) + (chamado ? COLETA_MIN * 60e3 : 0));
  const saiu = t(b.saiu_em);
  const entrega = saiu != null ? saiu + rota * 60e3 : Math.max(coleta, t(b.pronto_em) ?? 0, agora > coleta ? agora : 0) + rota * 60e3;
  return { pronto: iso(pronto), coleta: iso(coleta), entrega: iso(entrega), rota_min: rota };
}

const rad = (g: number) => (g * Math.PI) / 180;
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/** Prazos a partir de uma linha do banco (pedido do app ou venda com acompanhamento). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prazosDoPedido(o: Record<string, any>) {
  const dist = o.loja_lat != null && o.dest_lat != null ? km({ lat: Number(o.loja_lat), lng: Number(o.loja_lng) }, { lat: Number(o.dest_lat), lng: Number(o.dest_lng) }) : null;
  return calcularPrazos({ aceito_em: o.status === 'aguardando' ? null : o.respondido_em || null, preparo_min: Number(o.tempo_preparo) || 20, pronto_em: o.pronto_em || null,
    entregador_em: o.entregador_em || null, saiu_em: o.saiu_em || null, km: dist, entrega: o.tipo === 'entrega' });
}
