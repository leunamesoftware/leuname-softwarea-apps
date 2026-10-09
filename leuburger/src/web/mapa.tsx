// Mapa real (OpenStreetMap + Leaflet, grátis): loja, casa do cliente e o motoboy se mexendo.
import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';

export interface Ponto { lat: number; lng: number }
export interface DadosMapa { loja: Ponto | null; destino: Ponto | null; entregador: (Ponto & { em?: string | null }) | null }

export function distanciaKm(a: Ponto, b: Ponto) {
  const r = (g: number) => (g * Math.PI) / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
/** Tempo estimado em minutos (moto na cidade, ~22 km/h em linha reta + folga). */
export const minutosAte = (km: number) => Math.max(1, Math.round((km * 1.3 / 22) * 60));

export function Mapa({ dados, altura = 260 }: { dados: DadosMapa; altura?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const estado = useRef<{ L: typeof Leaflet; mapa: Leaflet.Map; moto?: Leaflet.Marker; ajustou: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (!vivo || !caixa.current) return;
      const mapa = L.map(caixa.current, { zoomControl: false, attributionControl: true }).setView([dados.destino?.lat ?? dados.loja?.lat ?? -22.9, dados.destino?.lng ?? dados.loja?.lng ?? -43.2], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
      estado.current = { L, mapa, ajustou: false };
      atualizar();
    })();
    return () => { vivo = false; estado.current?.mapa.remove(); estado.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizar = () => {
    const e = estado.current; if (!e) return;
    const { L, mapa } = e;
    const icone = (emoji: string, tam = 34) => L.divIcon({ className: 'mapa-pino', html: `<span>${emoji}</span>`, iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] });
    mapa.eachLayer((l) => { if ((l as Leaflet.Marker).options && (l as Leaflet.Marker).options.title === 'fixo') mapa.removeLayer(l); });
    if (dados.loja) L.marker([dados.loja.lat, dados.loja.lng], { icon: icone('🏪'), title: 'fixo' }).addTo(mapa);
    if (dados.destino) L.marker([dados.destino.lat, dados.destino.lng], { icon: icone('🏠'), title: 'fixo' }).addTo(mapa);
    if (dados.entregador) {
      const p: [number, number] = [dados.entregador.lat, dados.entregador.lng];
      if (e.moto) e.moto.setLatLng(p); else e.moto = L.marker(p, { icon: icone('🛵', 40), zIndexOffset: 1000 }).addTo(mapa);
    }
    const pts = [dados.loja, dados.destino, dados.entregador].filter(Boolean) as Ponto[];
    if (pts.length > 1) mapa.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 17, animate: e.ajustou });
    else if (pts.length === 1) mapa.setView([pts[0].lat, pts[0].lng], 16);
    e.ajustou = true;
  };
  useEffect(atualizar, [dados.loja?.lat, dados.loja?.lng, dados.destino?.lat, dados.destino?.lng, dados.entregador?.lat, dados.entregador?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={caixa} className="mapa-caixa" style={{ height: altura }} aria-label="Mapa da entrega" />;
}
