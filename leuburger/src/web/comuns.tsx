// Peças usadas em várias telas: avisos, janelas, foto do produto, gráficos, estados de carregar/vazio.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { brl } from '../regras/pedido';
import { ErroApp } from './api';
import { Ic } from './icones';

// ---------- avisos (toast) ----------
type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' };
const CtxToast = createContext<(texto: string, tipo?: 'ok' | 'erro') => void>(() => {});
export const useAviso = () => useContext(CtxToast);
export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const avisar = useCallback((texto: string, tipo: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    // Só o último aviso de sucesso fica na tela (não empilha "adicionado" em cima dos produtos).
    setLista((l) => [...l.filter((t) => t.tipo === 'erro').slice(-1), { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tipo === 'erro' ? 5000 : 2000);
  }, []);
  return (
    <CtxToast.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {lista.map((t) => <div key={t.id} className={`toast ${t.tipo}`}><Ic n={t.tipo === 'ok' ? 'check' : 'alerta'} />{t.texto}</div>)}
      </div>
    </CtxToast.Provider>
  );
}
export const msgErro = (e: unknown) => (e instanceof ErroApp ? e.message : 'Algo deu errado. Tente de novo.');

// ---------- janela (modal) ----------
export function Modal({ titulo, aoFechar, children, largo = false, pe }: { titulo: string; aoFechar: () => void; children: ReactNode; largo?: boolean; pe?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    addEventListener('keydown', tecla);
    const antes = document.activeElement as HTMLElement | null;
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input:not([type=checkbox]),select,textarea')?.focus(), 40);
    return () => { removeEventListener('keydown', tecla); antes?.focus?.(); };
  }, [aoFechar]);
  return (
    <div className="fundo-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="modal-topo"><h2>{titulo}</h2><button className="btn-ic" onClick={aoFechar} aria-label="Fechar"><Ic n="x" /></button></div>
        {children}
        {pe && <div className="modal-pe">{pe}</div>}
      </div>
    </div>
  );
}

/** Pergunta de confirmação; devolve true se confirmou. */
const CtxConfirmar = createContext<(texto: string, opcoes?: { sim?: string; perigo?: boolean }) => Promise<boolean>>(async () => false);
export const useConfirmar = () => useContext(CtxConfirmar);
export function ProvedorConfirmar({ children }: { children: ReactNode }) {
  const [p, setP] = useState<{ texto: string; sim: string; perigo: boolean; ok: (v: boolean) => void } | null>(null);
  const confirmar = useCallback((texto: string, o: { sim?: string; perigo?: boolean } = {}) => new Promise<boolean>((ok) => setP({ texto, sim: o.sim || 'Confirmar', perigo: Boolean(o.perigo), ok })), []);
  const fim = (v: boolean) => { p?.ok(v); setP(null); };
  return (
    <CtxConfirmar.Provider value={confirmar}>
      {children}
      {p && <Modal titulo="Confirmar" aoFechar={() => fim(false)} pe={<><button className="btn" onClick={() => fim(false)}>Voltar</button><button className={`btn ${p.perigo ? 'perigo' : 'prim'}`} onClick={() => fim(true)} autoFocus>{p.sim}</button></>}>
        <p style={{ margin: 0, fontSize: 16 }}>{p.texto}</p>
      </Modal>}
    </CtxConfirmar.Provider>
  );
}

// ---------- estados ----------
export const Carregando = ({ texto = 'Carregando…' }: { texto?: string }) => <div className="carregando" role="status"><div className="giro" /><span className="sr">{texto}</span></div>;
export const Vazio = ({ icone = 'outro', titulo, texto, children }: { icone?: string; titulo: string; texto?: string; children?: ReactNode }) => (
  <div className="vazio"><Ic n={icone} t={40} /><b>{titulo}</b>{texto && <span>{texto}</span>}{children}</div>
);
export const Falha = ({ erro, tentar }: { erro: string; tentar: () => void }) => (
  <div className="vazio"><Ic n="alerta" t={40} /><b>Não deu para carregar</b><span>{erro}</span><button className="btn" onClick={tentar}>Tentar de novo</button></div>
);

/** Carrega dados da API com estado de carregando/erro e função para recarregar. */
export function useDados<T>(carregar: () => Promise<T>, deps: unknown[] = []) {
  const [estado, setEstado] = useState<{ dados: T | null; erro: string | null; carregando: boolean }>({ dados: null, erro: null, carregando: true });
  const versao = useRef(0);
  const recarregar = useCallback(() => {
    const v = ++versao.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    carregar().then((dados) => { if (v === versao.current) setEstado({ dados, erro: null, carregando: false }); })
      .catch((e) => { if (v === versao.current) setEstado((x) => ({ ...x, erro: msgErro(e), carregando: false })); });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { recarregar(); }, [recarregar]);
  return { ...estado, recarregar };
}

// ---------- foto do produto ----------
const PADRAO: Record<string, string> = { hamburguer: '/img/hamburguer.webp', porcao: '/img/porcao.webp', bebida: '/img/bebida.webp', combo: '/img/combo.webp' };
export function FotoProduto({ fotoId, icone, nome, className }: { fotoId?: string | null; icone?: string | null; nome: string; className?: string }) {
  const src = fotoId ? `/api/fotos/${fotoId}` : icone && PADRAO[icone];
  if (src) return <img className={className} src={src} alt="" loading="lazy" />;
  return <div className={`sem-foto ${className || ''}`} aria-hidden="true" title={nome}><Ic n={icone || 'outro'} t={30} /></div>;
}

/** Reduz a foto escolhida para no máximo 600 px (JPEG) antes de enviar. */
export async function reduzirFoto(arquivo: File): Promise<string> {
  const img = await createImageBitmap(arquivo);
  const k = Math.min(1, 600 / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.82);
}

// ---------- variação % ----------
export function Variacao({ v, texto = 'em relação a ontem' }: { v: number | null | undefined; texto?: string }) {
  if (v == null) return <small>sem vendas antes para comparar</small>;
  return <small><span className={v >= 0 ? 'sobe' : 'desce'}>{v >= 0 ? '↑' : '↓'} {Math.abs(v).toLocaleString('pt-BR')}%</span> {texto}</small>;
}

// ---------- gráficos em SVG ----------
/** Largura real do gráfico: o desenho usa 1 unidade = 1 pixel, então o texto fica legível no celular. */
function useLargura() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const medir = () => setW(Math.max(280, Math.round(el.clientWidth) || 640));
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
const escala = (max: number) => { const passos = [1, 2, 5]; let p = 1; while (true) for (const s of passos) if (s * p * 4 >= max) return s * p; else if (s === 5) p *= 10; };
export function GraficoLinha({ pontos }: { pontos: { rot: string; valor: number }[] }) {
  const [ref, W] = useLargura();
  const H = 230, E = 46, B = 26, max = Math.max(1, ...pontos.map((p) => p.valor)), passo = escala(max), topo = passo * 4;
  const x = (i: number) => E + (i * (W - E - 10)) / Math.max(1, pontos.length - 1), y = (v: number) => H - B - (v / topo) * (H - B - 10);
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  return (
    <div className="grafico" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de vendas">
      <defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F45B13" stopOpacity=".28" /><stop offset="1" stopColor="#F45B13" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((k) => <g key={k}><line className="guia" x1={E} x2={W - 4} y1={y(k * passo)} y2={y(k * passo)} /><text x={E - 8} y={y(k * passo) + 4} textAnchor="end">{(k * passo / 100).toLocaleString('pt-BR')}</text></g>)}
      {pontos.length > 1 && <path d={`${linha} L${x(pontos.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill="url(#gl)" />}
      <path d={linha} fill="none" stroke="#F45B13" strokeWidth="2.6" strokeLinejoin="round" />
      {pontos.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.valor)} r="4" fill="#F45B13"><title>{p.rot}: {brl(p.valor)}</title></circle>)}
      {pontos.map((p, i) => i % Math.max(1, Math.ceil(pontos.length / Math.floor((W - E) / 44))) === 0 && <text key={'r' + i} x={x(i)} y={H - 6} textAnchor="middle">{p.rot}</text>)}
    </svg></div>
  );
}
export function GraficoBarras({ pontos }: { pontos: { rot: string; valor: number }[] }) {
  const [ref, W] = useLargura();
  const H = 240, E = 56, B = 26, max = Math.max(1, ...pontos.map((p) => p.valor)), passo = escala(max), topo = passo * 4;
  const larg = (W - E - 10) / Math.max(1, pontos.length), y = (v: number) => H - B - (v / topo) * (H - B - 10);
  return (
    <div className="grafico" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de vendas por período">
      {[0, 1, 2, 3, 4].map((k) => <g key={k}><line className="guia" x1={E} x2={W - 4} y1={y(k * passo)} y2={y(k * passo)} /><text x={E - 8} y={y(k * passo) + 4} textAnchor="end">R$ {(k * passo / 100).toLocaleString('pt-BR')}</text></g>)}
      {pontos.map((p, i) => { const h = H - B - y(p.valor); return <rect key={i} x={E + i * larg + larg * 0.2} y={y(p.valor)} width={larg * 0.6} height={Math.max(h, p.valor ? 2 : 0)} rx="4" fill="#F45B13"><title>{p.rot}: {brl(p.valor)}</title></rect>; })}
      {pontos.map((p, i) => i % Math.max(1, Math.ceil(pontos.length / Math.floor((W - E) / 48))) === 0 && <text key={'r' + i} x={E + i * larg + larg / 2} y={H - 6} textAnchor="middle">{p.rot}</text>)}
    </svg></div>
  );
}
export const CORES_FORMA: Record<string, string> = { dinheiro: '#F45B13', pix: '#C2410C', debito: '#FDBA74', credito: '#9CA3AF' };
export function Rosca({ fatias, total }: { fatias: { rot: string; valor: number; cor: string }[]; total: number }) {
  const R = 70, r = 46, C = 90; let ang = -Math.PI / 2;
  const soma = fatias.reduce((s, f) => s + f.valor, 0) || 1;
  return (
    <svg viewBox="0 0 180 180" width="100%" style={{ maxWidth: 190 }} role="img" aria-label="Vendas por forma de pagamento">
      {fatias.length === 0 && <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="#EEF0F3" strokeWidth={R - r} />}
      {fatias.map((f, i) => {
        const a = (f.valor / soma) * Math.PI * 2, a1 = ang, a2 = ang + a - (fatias.length > 1 ? 0.01 : 0); ang += a;
        if (fatias.length === 1) return <circle key={i} cx={C} cy={C} r={(R + r) / 2} fill="none" stroke={f.cor} strokeWidth={R - r} />;
        const g = a > Math.PI ? 1 : 0, p = (rr: number, t: number) => `${C + rr * Math.cos(t)},${C + rr * Math.sin(t)}`;
        return <path key={i} d={`M${p(R, a1)} A${R},${R} 0 ${g} 1 ${p(R, a2)} L${p(r, a2)} A${r},${r} 0 ${g} 0 ${p(r, a1)} Z`} fill={f.cor}><title>{f.rot}</title></path>;
      })}
      <text x={C} y={C - 2} textAnchor="middle" style={{ fontSize: 15, fontWeight: 800, fill: '#171C22' }}>{brl(total)}</text>
      <text x={C} y={C + 16} textAnchor="middle" style={{ fontSize: 11, fill: '#6B7280' }}>Total</text>
    </svg>
  );
}
