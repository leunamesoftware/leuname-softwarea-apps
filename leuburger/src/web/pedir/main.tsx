// Pedêê: o app dos clientes. Um app só, com as lanchonetes e restaurantes perto do cliente.
// O link de cada loja (/pedir/<loja>) abre o mesmo app direto naquela loja e guarda em "Minhas lojas".
import { CIDADES_RJ } from '../cidades-rj';
import { CULINARIAS, DESTAQUE, SEGMENTOS } from '../culinarias';
import { alo, faltam, prazo, useRelogio, type Prazos } from '../tempo';
import { distanciaKm, Mapa, minutosAte, type DadosMapa } from '../mapa';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { RAPIDAS_CLIENTE, RAPIDAS_CLIENTE_LOJA } from '../../regras/mensagens';
import { brl, calcularItem, FORMAS, lerValor, type EscolhaItem, type Forma, type Opcoes } from '../../regras/pedido';
import { ErroApp, get, post, put } from '../api';
import { Modal, msgErro } from '../comuns';
import { AtivarAvisos } from '../avisos';
import { Ic } from '../icones';
import '../estilo.css';
import './pedir.css';

export const NOME_APP = 'Pedêê';

// ---------- tipos ----------
interface LojaCartao {
  slug: string; nome: string; tipo: string; tipo_nome: string; descricao: string | null; logo_id: string | null; capa_id: string | null; cidade: string | null; uf: string | null;
  aceitando: boolean; tempo_entrega: string | null; taxa_entrega: number; pedido_minimo: number; faz_entrega: boolean; faz_retirada: boolean; distancia: number | null; entrega_aqui: boolean;
  nota: number | null; avaliacoes: number;
}
interface LojaCompleta extends LojaCartao { telefone: string | null; endereco: string | null; formas: Forma[] }
interface Produto { id: string; categoria_id: string; nome: string; descricao: string | null; preco: number; foto_id: string | null; categoria_icone: string | null; opcoes: Opcoes }
interface Categoria { id: string; nome: string; icone: string }
/** Procura o endereço no mapa (OpenStreetMap, grátis) para o entregador aparecer perto da casa do cliente; se falhar, o pedido segue normal. */
async function procurarEndereco(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(4000) });
    const j = (await r.json()) as { lat: string; lon: string }[];
    return j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
  } catch { return null; }
}
interface ItemCarrinho extends EscolhaItem { chave: string }

// ---------- guardado no aparelho ----------
interface Conta { nome: string; email: string; telefone: string; endereco: string | null }
interface Guardado {
  conta?: Conta | null; entrada?: 'conta' | 'visitante';
  nome: string; telefone: string; endereco: string;
  local: { lat: number; lng: number } | null; cidade: string;
  lojas: { slug: string; nome: string; logo_id: string | null; tipo: string }[];
  pedidos: { token: string; loja: string; slug: string; criado_em: string; fim?: boolean }[];
  favoritos: string[];
}
const CHAVE = 'leupede';
function ler(): Guardado {
  const vazio: Guardado = { nome: '', telefone: '', endereco: '', local: null, cidade: '', lojas: [], pedidos: [], favoritos: [] };
  try { return { ...vazio, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; } catch { return vazio; }
}
function gravar(f: (g: Guardado) => Guardado) { try { localStorage.setItem(CHAVE, JSON.stringify(f(ler()))); } catch { /* sem armazenamento */ } }
const lerCarrinho = (slug: string): ItemCarrinho[] => { try { return JSON.parse(localStorage.getItem('leupede_carrinho_' + slug) || '[]'); } catch { return []; } };
const gravarCarrinho = (slug: string, c: ItemCarrinho[]) => { try { localStorage.setItem('leupede_carrinho_' + slug, JSON.stringify(c)); } catch { /* sem armazenamento */ } };
const instalado = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const novaChave = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const qs = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

// ---------- imagens ----------
const PADRAO: Record<string, string> = { hamburguer: '/img/hamburguer.webp', porcao: '/img/porcao.webp', bebida: '/img/bebida.webp', combo: '/img/combo.webp' };
const CAPA_TIPO: Record<string, string> = { hamburgueria: '/img/hamburguer.webp', lanches: '/img/combo.webp' };
const foto = (id: string | null | undefined) => (id ? `/api/publico/app/foto/${id}` : null);
function FotoItem({ p, className }: { p: Pick<Produto, 'foto_id' | 'categoria_icone' | 'nome'>; className?: string }) {
  const src = foto(p.foto_id) || (p.categoria_icone && PADRAO[p.categoria_icone]);
  return src ? <img className={className} src={src} alt="" loading="lazy" /> : <div className={`sem-foto ${className || ''}`} aria-hidden="true"><Ic n={p.categoria_icone || 'outro'} t={30} /></div>;
}
function Logo({ l, t = 56 }: { l: Pick<LojaCartao, 'logo_id' | 'nome'>; t?: number }) {
  return l.logo_id ? <img className="logo-loja" src={foto(l.logo_id)!} alt="" style={{ width: t, height: t }} />
    : <span className="logo-loja letra" style={{ width: t, height: t, fontSize: t * 0.42 }}>{(l.nome.trim()[0] || '?').toUpperCase()}</span>;
}

// ---------- categorias (tipos de loja) ----------
const CATS = CULINARIAS;
const CATS_INICIO = DESTAQUE.map((t) => CULINARIAS.find((c) => c[0] === t)!);
const EMOJI: Record<string, string> = Object.fromEntries(CATS.map(([t, , e]) => [t, e]));
function Capa({ l, className }: { l: Pick<LojaCartao, 'capa_id' | 'tipo'>; className?: string }) {
  const src = foto(l.capa_id) || CAPA_TIPO[l.tipo];
  return src ? <img className={className} src={src} alt="" loading="lazy" /> : <div className={`capa-vazia ${className || ''}`} aria-hidden="true">{EMOJI[l.tipo] || '🍽️'}</div>;
}
const Estrelas = ({ nota, total }: { nota: number | null; total: number }) => (nota ? <span className="estrela">★ {nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}<small> ({total})</small></span> : <span className="estrela nova">Novo</span>);
const entregaTexto = (l: LojaCartao) => (!l.aceitando ? <span className="fechado">Fechada agora</span> : l.entrega_aqui ? (l.taxa_entrega ? `Entrega ${brl(l.taxa_entrega)}` : <span className="gratis">Entrega grátis</span>) : 'Retirada no local');

/** Lojas do local escolhido (localização ou cidade). */
function useLojas(busca = '') {
  const [g, setG] = useState(ler);
  const [lojas, setLojas] = useState<LojaCartao[] | null>(null), [erro, setErro] = useState('');
  useEffect(() => {
    if (!g.local && !g.cidade) { setLojas([]); return; }
    setLojas(null);
    const t = setTimeout(() => get<{ lojas: LojaCartao[] }>(`/publico/app/lojas?${qs({ lat: g.local?.lat, lng: g.local?.lng, cidade: g.cidade, busca: busca.trim() })}`)
      .then((r) => { setLojas(r.lojas); setErro(''); }).catch((e) => setErro(msgErro(e))), busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [g.local, g.cidade, busca]);
  return { g, setG, lojas, erro };
}

function Abas() {
  const { pathname } = useLocation();
  const ativos = ler().pedidos.filter((p) => !p.fim && Date.now() - new Date(p.criado_em).getTime() < 3 * 3600e3).length;
  const item = (para: string, ic: string, nome: string, extra?: number) => (
    <Link className={pathname === para ? 'ativo' : ''} to={para}><span className="bolha"><Ic n={ic} />{extra ? <i>{extra}</i> : null}</span>{nome}</Link>
  );
  return <nav className="pd-abas">{item('/', 'inicio', 'Início')}{item('/buscar', 'busca', 'Buscar')}{item('/pedidos', 'pedidos', 'Pedidos', ativos)}{item('/perfil', 'usuario', 'Perfil')}</nav>;
}

// ---------- início ----------
function Inicio() {
  const nav = useNavigate();
  const { g, setG, lojas, erro } = useLojas();
  const [tipo, setTipo] = useState('');
  const [ordem, setOrdem] = useState<'' | 'nota' | 'perto' | 'taxa'>(''), [gratis, setGratis] = useState(false);
  const [escolherLocal, setEscolherLocal] = useState(false);

  // Abriu o app instalado logo depois de instalar pelo link de uma loja: vai direto para ela.
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('leupede_abrir') || 'null');
      if (a && instalado() && Date.now() - a.em < 30 * 6e4) { localStorage.removeItem('leupede_abrir'); nav('/' + a.slug, { replace: true }); }
    } catch { /* sem armazenamento */ }
  }, [nav]);
  useEffect(() => { if (!g.local && !g.cidade) setEscolherLocal(true); }, [g.local, g.cidade]);

  const base = (lojas || []).filter((l) => !tipo || l.tipo === tipo);
  const lista = base.filter((l) => !gratis || (l.faz_entrega && !l.taxa_entrega)).sort((a, b) => ordem === 'nota' ? (b.nota || 0) - (a.nota || 0) : ordem === 'perto' ? (a.distancia ?? 999) - (b.distancia ?? 999) : ordem === 'taxa' ? a.taxa_entrega - b.taxa_entrega : 0);
  const destaques = [...lista].filter((l) => l.aceitando).sort((a, b) => (b.nota || 0) - (a.nota || 0) || b.avaliacoes - a.avaliacoes).slice(0, 8);
  const temTipo = new Set((lojas || []).map((l) => l.tipo));
  const famosos = [...(lojas || [])].sort((a, b) => (b.avaliacoes * (b.nota || 0)) - (a.avaliacoes * (a.nota || 0))).slice(0, 10);
  const andamento = g.pedidos.filter((p) => !p.fim && Date.now() - new Date(p.criado_em).getTime() < 3 * 3600e3);
  return (
    <div className="pd com-abas">
      <header className="pd-cab">
        <div className="pd-cab-linha"><span className="pd-logo-texto">Pedêê</span><Link className="pd-sino" to="/pedidos" aria-label="Seus pedidos"><Ic n="sino" />{andamento.length > 0 && <i />}</Link></div>
        <button className="pd-endereco" onClick={() => setEscolherLocal(true)}><Ic n="inicio" t={18} /><span><small>Entregar em</small><b>{g.endereco && g.local ? g.endereco : g.local ? 'Perto de você' : g.cidade || 'Escolher local'}</b></span><Ic n="baixo" t={16} /></button>
        <Link className="entrada pd-busca" to="/buscar"><Ic n="busca" /><span>Buscar restaurantes, pratos…</span></Link>
      </header>
      <main className="pd-corpo">
        <div className="pd-segmentos">
          {SEGMENTOS.map((x) => <Link key={x.id} to={`/culinaria/${x.id}`}><span>{x.emoji}</span>{x.nome}</Link>)}
          <Link to="/culinarias"><span className="pd-seg-mais">▦</span>Ver mais</Link>
        </div>
        <Carrossel />
        <div className="pd-cats-icones" role="group" aria-label="Categorias">
          {CATS_INICIO.map(([t, n, e]) => (
            <button key={t} className={`${tipo === t ? 'sel' : ''} ${lojas && !temTipo.has(t) ? 'apagada' : ''}`} onClick={() => setTipo(tipo === t ? '' : t)}><span>{e}</span>{n}</button>
          ))}
          <Link to="/culinarias" className="pd-cat-todas"><span>➕</span>Ver todas</Link>
        </div>
        {erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div> : !lista.length ? (
          <div className="vazio"><span style={{ fontSize: 40 }}>{tipo ? EMOJI[tipo] : '🍽️'}</span><b>{tipo ? 'Nenhuma loja desse tipo por aqui ainda' : 'Nenhuma loja por aqui ainda'}</b>
            <span>{tipo ? 'Veja as outras categorias.' : `Estamos chegando! Peça para a sua lanchonete preferida entrar no ${NOME_APP}.`}</span>
            {tipo ? <button className="btn" onClick={() => setTipo('')}>Ver todas</button> : <button className="btn" onClick={() => setEscolherLocal(true)}>Mudar o local</button>}</div>
        ) : <>
          {!tipo && <div className="pd-minis">{MINIS.map((m) => <Link key={m.img} to={m.ir}><img src={`/img/banners/${m.img}.webp`} alt={m.alt} width={150} height={193} loading="lazy" /></Link>)}</div>}
          {!tipo && famosos.length > 0 && <section>
            <h2 className="pd-tit">Famosos no Pedêê<small className="pd-sub">As lojas mais pedidas da região</small></h2>
            <div className="pd-famosos">{famosos.map((l) => <Link key={l.slug} to={`/${l.slug}`}><Logo l={l} t={72} /><span>{l.nome}</span></Link>)}</div>
          </section>}
          {destaques.length > 0 && <section>
            <h2 className="pd-tit pd-tit-linha">{tipo ? CATS.find((c) => c[0] === tipo)?.[1] : 'Mais bem avaliados'}</h2>
            <div className="pd-faixa pd-destaques">{destaques.map((l) => (
              <Link key={l.slug} className="pd-dest pd-dest2" to={`/${l.slug}`}>
                <div className="pd-dest-img"><Capa l={l} />{l.nota ? <span className="pd-dest-nota">★ {l.nota.toLocaleString('pt-BR')}</span> : <span className="pd-dest-nota">Novo</span>}
                  <button type="button" className={`pd-dest-fav ${ler().favoritos.includes(l.slug) ? 'sel' : ''}`} aria-label="Favoritar" onClick={(e) => { e.preventDefault(); gravar((x) => ({ ...x, favoritos: x.favoritos.includes(l.slug) ? x.favoritos.filter((y) => y !== l.slug) : [l.slug, ...x.favoritos] })); setG(ler()); }}>{ler().favoritos.includes(l.slug) ? '❤️' : '🤍'}</button></div>
                <div className="pd-dest-nome"><Logo l={l} t={34} /><b>{l.nome}</b></div>
                <small>{[l.tempo_entrega, l.faz_entrega ? (l.taxa_entrega ? brl(l.taxa_entrega) : 'Grátis') : 'Retirada'].filter(Boolean).join(' • ')}</small>
              </Link>
            ))}</div>
          </section>}
          <div className="pd-chips">
            <select className="chip" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar"><option value="">Ordenar</option><option value="nota">Melhor avaliadas</option><option value="perto">Mais perto</option><option value="taxa">Menor taxa de entrega</option></select>
            <button className={`chip ${gratis ? 'sel' : ''}`} onClick={() => setGratis(!gratis)}>Entrega grátis</button>
          </div>
          <h2 className="pd-tit">{g.local ? 'Todas as lojas perto de você' : `Todas as lojas em ${g.cidade}`}</h2>
          <div className="pd-lojas">{lista.map((l) => <CartaoLoja key={l.slug} l={l} />)}</div>
        </>}
      </main>
      <Abas />
      {escolherLocal && <EscolherLocal aoFechar={(mudou) => { setEscolherLocal(false); if (mudou) setG(ler()); }} podeFechar={Boolean(g.local || g.cidade)} />}
    </div>
  );
}

function CartaoLoja({ l }: { l: LojaCartao }) {
  return (
    <Link className={`pd-loja ${l.aceitando ? '' : 'fechada'}`} to={`/${l.slug}`}>
      <Logo l={l} />
      <span className="pd-loja-info">
        <b>{l.nome}</b>
        <small><Estrelas nota={l.nota} total={l.avaliacoes} /> · {l.tipo_nome}{l.distancia != null ? ` · ${l.distancia.toLocaleString('pt-BR')} km` : ''}</small>
        <small>{l.tempo_entrega ? `${l.tempo_entrega} · ` : ''}{entregaTexto(l)}</small>
      </span>
      <Ic n="direita" />
    </Link>
  );
}

// ---------- buscar ----------
function Buscar() {
  const [busca, setBusca] = useState('');
  const { lojas, erro } = useLojas(busca);
  const todas = useLojas('').lojas;
  return (
    <div className="pd com-abas">
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto">Buscar</span></div>
        <span className="entrada pd-busca"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pizza, açaí, marmita, nome da loja…" aria-label="Buscar" /></span></header>
      <main className="pd-corpo">
        {busca.trim() ? (erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div>
          : !lojas.length ? <div className="vazio"><Ic n="busca" t={36} /><b>Nada encontrado por aqui</b></div> : <div className="pd-lojas">{lojas.map((l) => <CartaoLoja key={l.slug} l={l} />)}</div>)
          : <Descobrir lojas={todas} />}
      </main>
      <Abas />
    </div>
  );
}

/** Cartões altos coloridos (“Entrega grátis”, “Melhores da região em…”), como os do iFood. Só com o que é verdade nas lojas do local. */
function FaixaSugestoes({ lojas, titulo }: { lojas: LojaCartao[] | null; titulo?: string }) {
  const nav = useNavigate();
  const tipos = CULINARIAS.filter(([t]) => (lojas || []).some((l) => l.tipo === t));
  const CORES = ['#E8160C', '#2563EB', '#7C3AED', '#059669', '#EA580C', '#DB2777'];
  const sugestoes: { titulo: string; sub: string; img: string | null; ir: string }[] = [];
  tipos.forEach(([t, n]) => {
    const boas = (lojas || []).filter((l) => l.tipo === t && (l.nota || 0) >= 4.5).sort((a, b) => (b.nota || 0) - (a.nota || 0));
    if (boas.length) sugestoes.push({ titulo: `Melhores da região em ${n}`, sub: 'Acima de 4,5 estrelas', img: foto(boas[0].capa_id) || CAPA_TIPO[t] || '/img/hamburguer.webp', ir: `/culinaria/${t}` });
  });
  const gratis = (lojas || []).filter((l) => l.faz_entrega && !l.taxa_entrega);
  if (gratis.length) sugestoes.unshift({ titulo: 'Entrega grátis', sub: `${gratis.length} ${gratis.length === 1 ? 'loja' : 'lojas'} sem taxa`, img: foto(gratis.find((l) => l.capa_id)?.capa_id) || '/img/combo.webp', ir: '/culinaria/gratis' });
  if (!sugestoes.length) return null;
  return (
    <>
      {titulo && <h2 className="pd-tit">{titulo}</h2>}
      <div className="pd-sugestoes">{sugestoes.slice(0, 8).map((x, k) => (
        <button key={x.ir} className="pd-sug" style={{ background: CORES[k % CORES.length] }} onClick={() => nav(x.ir)}>
          <b>{x.titulo}</b><span>{x.sub}</span>{x.img && <img src={x.img} alt="" loading="lazy" />}
        </button>
      ))}</div>
    </>
  );
}

/** Culinárias, “Sugestões para você” e “Populares na sua região” (como no iFood), montados com as lojas do local escolhido. */
function Descobrir({ lojas }: { lojas: LojaCartao[] | null }) {
  const tipos = useMemo(() => {
    const n = new Map<string, number>(); (lojas || []).forEach((l) => n.set(l.tipo, (n.get(l.tipo) || 0) + 1));
    return CULINARIAS.filter(([t]) => n.has(t)).sort((a, b) => n.get(b[0])! - n.get(a[0])!);
  }, [lojas]);
  const [chip, setChip] = useState('');
  const atual = chip || tipos[0]?.[0] || '';
  const populares = (lojas || []).filter((l) => l.tipo === atual).sort((a, b) => (b.avaliacoes - a.avaliacoes) || ((b.nota || 0) - (a.nota || 0)));
  return (
    <>
      <div className="pd-tit-linha"><h2 className="pd-tit">Culinárias</h2><Link className="link" to="/culinarias">Ver todas</Link></div>
      <div className="pd-cats-icones">{CATS_INICIO.map(([t, n, e]) => <Link key={t} to={`/culinaria/${t}`} className="pd-cat-link"><span>{e}</span>{n}</Link>)}</div>
      {lojas == null ? <div className="carregando"><div className="giro" /></div> : <>
        <FaixaSugestoes lojas={lojas} titulo="Sugestões para você" />
        {tipos.length > 0 && <><h2 className="pd-tit">Populares na sua região</h2>
          <div className="pd-chips">{tipos.map(([t, n]) => <button key={t} className={`chip ${atual === t ? 'sel' : ''}`} onClick={() => setChip(t)}>{n}</button>)}</div>
          <div className="pd-lojas">{populares.slice(0, 10).map((l) => <CartaoLoja key={l.slug} l={l} />)}</div></>}
        {!lojas.length && <div className="vazio"><b>Ainda não há lojas no seu local</b><span>Toque em “Entregar em” na tela inicial e escolha outra cidade.</span></div>}
      </>}
    </>
  );
}

const BANNERS: { img: string; ir: string | null; alt: string }[] = [
  { img: 'fome', ir: null, alt: 'Bateu a fome? Pedêê!' }, { img: 'pizza', ir: '/culinaria/pizzarias', alt: 'Pizza quentinha' }, { img: 'acai', ir: '/culinaria/acaiterias', alt: 'Açaí e sorvetes' },
  { img: 'salgados', ir: '/culinaria/lanchonetes', alt: 'Salgados fresquinhos' }, { img: 'mapa', ir: null, alt: 'Acompanhe no mapa' }, { img: 'pagamento', ir: null, alt: 'Pague na entrega' },
];
/** Banners pequenos em pé, embaixo das culinárias (como no iFood). */
const MINIS = [
  { img: 'm-gratis', ir: '/culinaria/gratis', alt: 'Entrega grátis aqui' }, { img: 'm-lanche', ir: '/culinaria/lanchonetes', alt: 'Lanche bom e barato' },
  { img: 'm-pizza', ir: '/culinaria/pizzarias', alt: 'Pizza quentinha' }, { img: 'm-acai', ir: '/culinaria/acaiterias', alt: 'Açaí e sorvetes' },
  { img: 'm-caseira', ir: '/culinaria/restaurantes', alt: 'Comida caseira' }, { img: 'm-salgados', ir: '/culinaria/lanchonetes', alt: 'Salgados na hora' },
  { img: 'm-doces', ir: '/culinaria/docerias', alt: 'Doces e bolos' },
];
/** Banners que passam sozinhos (e com o dedo), com as bolinhas embaixo. */
function Carrossel() {
  const nav = useNavigate();
  const faixa = useRef<HTMLDivElement>(null), [atual, setAtual] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { const f = faixa.current; if (!f) return; const prox = (atual + 1) % BANNERS.length; f.scrollTo({ left: prox * f.clientWidth * 0.88, behavior: 'smooth' }); }, 4500);
    return () => clearInterval(t);
  }, [atual]);
  return (
    <div className="pd-carrossel">
      <div ref={faixa} className="pd-car-faixa" onScroll={(e) => { const f = e.currentTarget; setAtual(Math.round(f.scrollLeft / (f.clientWidth * 0.88))); }}>
        {BANNERS.map((b) => <button key={b.img} onClick={() => b.ir && nav(b.ir)} aria-label={b.alt}><img src={`/img/banners/${b.img}.webp`} alt={b.alt} width={480} height={225} /></button>)}
      </div>
      <div className="pd-car-pontos">{BANNERS.map((b, k) => <i key={b.img} className={k === atual ? 'sel' : ''} />)}</div>
    </div>
  );
}

/** Todas as culinárias (lista como a do iFood). */
function Culinarias() {
  return (
    <div className="pd">
      <TopoVoltar titulo="Culinárias" />
      <main className="pd-corpo">
        <h1 style={{ margin: '4px 0', fontSize: 22 }}>Todas as culinárias</h1>
        <div className="pd-culinarias">{CULINARIAS.map(([t, n, e]) => <Link key={t} to={`/culinaria/${t}`}><span>{e}</span><b>{n}</b><Ic n="direita" /></Link>)}</div>
      </main>
    </div>
  );
}

/** Lojas de uma culinária (ou com entrega grátis), as melhores primeiro. */
function Culinaria() {
  const { tipo = '' } = useParams();
  const { lojas, erro } = useLojas('');
  const grupo = SEGMENTOS.find((x) => x.id === tipo);
  const info = grupo ? ['', grupo.nome, grupo.emoji] as const : CULINARIAS.find((c) => c[0] === tipo);
  const lista = (lojas || []).filter((l) => (tipo === 'gratis' ? l.faz_entrega && !l.taxa_entrega : grupo ? grupo.tipos.includes(l.tipo) : l.tipo === tipo)).sort((a, b) => ((b.nota || 0) - (a.nota || 0)) || (b.avaliacoes - a.avaliacoes));
  return (
    <div className="pd">
      <TopoVoltar titulo={tipo === 'gratis' ? 'Entrega grátis' : info ? `${info[2]} ${info[1]}` : 'Lojas'} />
      <main className="pd-corpo">
        {erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div>
          : !lista.length ? <div className="vazio"><span style={{ fontSize: 40 }}>{info?.[2] || '🍽️'}</span><b>Ainda não tem loja desta culinária no seu local</b><Link className="btn prim" to="/culinarias">Ver outras culinárias</Link></div>
          : <div className="pd-lojas">{lista.map((l) => <CartaoLoja key={l.slug} l={l} />)}</div>}
      </main>
    </div>
  );
}

// ---------- meus pedidos ----------
/** Pedido encerrado (entregue, retirado, recusado ou cancelado) não conta mais como "em andamento" na aba Pedidos. */
function marcarFim(token: string, situacao: string) {
  if (['entregue', 'retirado', 'recusado', 'cancelado'].includes(situacao)) gravar((x) => ({ ...x, pedidos: x.pedidos.map((p) => (p.token === token ? { ...p, fim: true } : p)) }));
}
function MeusPedidos() {
  const g = ler();
  const [sit, setSit] = useState<Record<string, { situacao: string; total: number; numero: number | null }>>({});
  useEffect(() => {
    g.pedidos.slice(0, 15).forEach((p) => get<{ pedido: { situacao: string; total: number; numero: number | null } }>(`/publico/app/pedido/${p.token}`)
      .then((r) => { setSit((x) => ({ ...x, [p.token]: r.pedido })); marcarFim(p.token, r.pedido.situacao); }).catch(() => {}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pd com-abas">
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto">Pedidos</span></div></header>
      <main className="pd-corpo">
        {!g.pedidos.length ? <div className="vazio"><Ic n="sacola" t={40} /><b>Você ainda não fez pedidos</b><Link className="btn prim" to="/">Ver as lojas</Link></div> : g.pedidos.map((p) => {
          const s = sit[p.token];
          return (
            <Link key={p.token} className="pd-loja" to={`/pedido/${p.token}`}>
              <span className="logo-loja letra" style={{ width: 48, height: 48, fontSize: 22 }}>🧾</span>
              <span className="pd-loja-info"><b>{p.loja}</b><small>{new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{s?.total ? ` · ${brl(s.total)}` : ''}</small>
                {s && <small><span className={`selo st-${s.situacao}`}>{SITUACAO[s.situacao] || s.situacao}</span></small>}</span>
              <Ic n="direita" />
            </Link>
          );
        })}
      </main>
      <Abas />
    </div>
  );
}
const SITUACAO: Record<string, string> = { aguardando: 'Esperando a loja', preparando: 'Em preparo', pronto: 'Pronto', a_caminho: 'A caminho', entregue: 'Entregue', retirado: 'Retirado', recusado: 'Recusado', cancelado: 'Cancelado' };

// ---------- perfil ----------
function Perfil() {
  const [g, setGEstado] = useState(ler);
  const [f, setF] = useState({ nome: g.nome, telefone: g.telefone, endereco: g.endereco });
  const [salvo, setSalvo] = useState(false), [local, setLocal] = useState(false);
  const favs = g.lojas.filter((l) => g.favoritos.includes(l.slug));
  const [conta, setConta] = useState<'' | 'entrar' | 'criar'>('');
  // O botão Salvar só aparece quando algo foi mudado.
  const mudou = f.nome !== g.nome || f.telefone !== g.telefone || f.endereco !== g.endereco;
  const salvar = async () => {
    gravar((x) => ({ ...x, ...f, conta: x.conta ? { ...x.conta, nome: f.nome, telefone: f.telefone, endereco: f.endereco } : x.conta }));
    if (ler().conta) await put('/publico/conta/eu', { nome: f.nome, telefone: f.telefone, endereco: f.endereco || null }).catch(() => {});
    setGEstado(ler()); setSalvo(true); setTimeout(() => setSalvo(false), 2000);
  };
  return (
    <div className="pd com-abas">
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto">Perfil</span></div></header>
      <main className="pd-corpo">
        {g.conta ? <section className="cartao pd-conta">
          <span className="pd-conta-av">{g.conta.nome.slice(0, 1).toUpperCase()}</span>
          <div><b>{g.conta.nome}</b><small>{g.conta.email}</small></div>
          <button className="btn peq" onClick={async () => { await post('/publico/conta/sair', {}).catch(() => {}); gravar((x) => ({ ...x, conta: null, entrada: undefined })); location.href = '/pedir/'; }}>Sair</button>
        </section> : <section className="cartao" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px' }}>Entre na sua conta para ver seus pedidos em qualquer celular.</p>
          <button className="btn prim bloco" onClick={() => setConta('entrar')}>Entrar ou criar conta</button>
        </section>}
        {conta && <EntrarConta modo={conta} aoFechar={() => setConta('')} aoEntrar={() => { setConta(''); setGEstado(ler()); const n = ler(); setF({ nome: n.nome, telefone: n.telefone, endereco: n.endereco }); }} />}
        <section className="cartao">
          <h2 className="cartao-tit">Seus dados</h2>
          <p style={{ margin: '0 0 10px', color: 'var(--suave)', fontSize: 14 }}>{g.conta ? 'Ficam na sua conta e já vêm preenchidos no pedido.' : 'Ficam só neste celular e já vêm preenchidos no pedido.'}</p>
          <div className="campos">
            <label className="campo largo">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" /></label>
            <label className="campo largo">WhatsApp<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} inputMode="tel" autoComplete="tel" /></label>
            <label className="campo largo">Endereço de entrega<input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} autoComplete="street-address" placeholder="Rua, número, bairro e referência" /></label>
          </div>
          {mudou ? <button className="btn prim bloco" style={{ marginTop: 12 }} onClick={salvar}>Salvar alterações</button> : salvo && <p className="aviso" style={{ margin: '12px 0 0' }}>✓ Salvo</p>}
        </section>
        <section className="cartao">
          <h2 className="cartao-tit">Local <button className="link" onClick={() => setLocal(true)}>Mudar</button></h2>
          <p style={{ margin: 0 }}>{g.local ? 'Lojas perto da sua localização' : g.cidade ? `Lojas em ${g.cidade}` : 'Nenhum local escolhido'}</p>
        </section>
        <section className="cartao">
          <h2 className="cartao-tit">Favoritas ❤️</h2>
          {!favs.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Toque no coração dentro de uma loja para guardar aqui.</p>
            : <div className="pd-faixa">{favs.map((l) => <Link key={l.slug} className="pd-minha" to={`/${l.slug}`}><Logo l={l} t={60} /><span>{l.nome}</span></Link>)}</div>}
        </section>
        {g.lojas.length > 0 && <section className="cartao"><h2 className="cartao-tit">Lojas que você visitou</h2>
          <div className="pd-faixa">{g.lojas.map((l) => <Link key={l.slug} className="pd-minha" to={`/${l.slug}`}><Logo l={l} t={60} /><span>{l.nome}</span></Link>)}</div></section>}
        <p style={{ textAlign: 'center', color: 'var(--suave)', fontSize: 13 }}>{NOME_APP} · Bateu a fome? Pedêê!</p>
      </main>
      <Abas />
      {local && <EscolherLocal aoFechar={(m) => { setLocal(false); if (m) setGEstado(ler()); }} podeFechar />}
    </div>
  );
}

function EscolherLocal({ aoFechar, podeFechar }: { aoFechar: (mudou: boolean) => void; podeFechar: boolean }) {
  const [cidades, setCidades] = useState<{ cidade: string; uf: string | null; lojas: number }[]>([]);
  const [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false), [busca, setBusca] = useState('');
  const sem = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const lista = CIDADES_RJ.map((nome) => ({ nome, lojas: cidades.find((c) => sem(c.cidade) === sem(nome))?.lojas || 0 }))
    .filter((c) => sem(c.nome).includes(sem(busca.trim()))).sort((x, y) => (y.lojas - x.lojas) || x.nome.localeCompare(y.nome, 'pt-BR'));
  useEffect(() => { get<{ cidades: typeof cidades }>('/publico/app/cidades').then((r) => setCidades(r.cidades)).catch(() => {}); }, []);
  const usarGps = () => {
    if (!navigator.geolocation) return setMsg('Este aparelho não informa a localização. Escolha a cidade.');
    setOcupado(true); setMsg('');
    navigator.geolocation.getCurrentPosition((p) => {
      gravar((g) => ({ ...g, local: { lat: Math.round(p.coords.latitude * 1e4) / 1e4, lng: Math.round(p.coords.longitude * 1e4) / 1e4 }, cidade: '' }));
      setOcupado(false); aoFechar(true);
    }, () => { setOcupado(false); setMsg('Não deu para pegar a localização. Permita o acesso ou escolha a cidade abaixo.'); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  };
  const fechar = () => (podeFechar ? aoFechar(false) : undefined);
  return (
    <Modal titulo="Onde você está?" aoFechar={fechar}>
      <p style={{ marginTop: 0 }}>Mostramos as lanchonetes e restaurantes perto de você.</p>
      <button className="btn prim grande bloco" onClick={usarGps} disabled={ocupado}><Ic n="inicio" />{ocupado ? 'Procurando…' : 'Usar minha localização'}</button>
      {msg && <p className="aviso erro" style={{ marginTop: 10 }}>{msg}</p>}
      <p style={{ color: 'var(--suave)', margin: '16px 0 8px' }}>Ou escolha a cidade (estado do Rio de Janeiro):</p>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cidade…" aria-label="Buscar cidade" style={{ marginBottom: 8 }} />
      <div className="lista-config" style={{ maxHeight: 300, overflowY: 'auto' }}>{lista.map((c) => (
        <div key={c.nome}><span>{c.nome}</span><button className={`btn peq ${c.lojas ? 'prim' : ''}`} onClick={() => { gravar((g) => ({ ...g, cidade: c.nome, local: null })); aoFechar(true); }}>{c.lojas ? `${c.lojas} ${c.lojas === 1 ? 'loja' : 'lojas'}` : 'Em breve'}</button></div>
      ))}{!lista.length && <p style={{ margin: 8 }}>Nenhuma cidade encontrada.</p>}</div>
    </Modal>
  );
}

// ---------- loja: cardápio, carrinho e pedido ----------
function Loja() {
  const { slug = '' } = useParams();
  const nav = useNavigate();
  const [dados, setDados] = useState<{ loja: LojaCompleta; categorias: Categoria[]; produtos: Produto[] } | null>(null);
  const [erro, setErro] = useState('');
  const [cat, setCat] = useState('');
  const [busca, setBusca] = useState('');
  const [escolher, setEscolher] = useState<{ p: Produto; item?: ItemCarrinho; daSacola?: boolean } | null>(null);
  const [carrinho, setCarrinhoEstado] = useState<ItemCarrinho[]>(() => lerCarrinho(slug));
  const [verCarrinho, setVerCarrinho] = useState(false);
  const [verAvaliacoes, setVerAvaliacoes] = useState(false);
  const [fav, setFav] = useState(() => ler().favoritos.includes(slug));
  const alternarFav = () => { gravar((x) => ({ ...x, favoritos: x.favoritos.includes(slug) ? x.favoritos.filter((y) => y !== slug) : [slug, ...x.favoritos] })); setFav(!fav); };
  const setCarrinho = (c: ItemCarrinho[]) => { setCarrinhoEstado(c); gravarCarrinho(slug, c); };
  // Prévia aberta pelo lojista no app Parceiro: mostra a loja igual ao cliente, sem guardar nada e sem pedir.
  const previa = new URLSearchParams(location.search).has('previa');

  useEffect(() => {
    const g = ler();
    get<{ loja: LojaCompleta; categorias: Categoria[]; produtos: Produto[] }>(`/publico/app/loja/${encodeURIComponent(slug)}?${qs({ lat: g.local?.lat, lng: g.local?.lng })}`)
      .then((r) => {
        setDados(r); document.title = `${r.loja.nome} · ${NOME_APP}`;
        if (previa) return;
        // Guarda em "Minhas lojas" (a mais recente primeiro).
        gravar((x) => ({ ...x, lojas: [{ slug, nome: r.loja.nome, logo_id: r.loja.logo_id, tipo: r.loja.tipo }, ...x.lojas.filter((l) => l.slug !== slug)].slice(0, 12) }));
        // Se instalar agora pelo navegador, o app abre direto aqui.
        if (!instalado()) try { localStorage.setItem('leupede_abrir', JSON.stringify({ slug, em: Date.now() })); } catch { /* sem armazenamento */ }
      }).catch((e) => setErro(msgErro(e)));
  }, [slug]);

  // A aba da categoria acompanha a rolagem (como no iFood).
  useEffect(() => {
    const rolar = () => {
      const secoes = [...document.querySelectorAll<HTMLElement>('.pd-loja-secao')];
      const atual = secoes.filter((x) => x.getBoundingClientRect().top <= 140).pop();
      setCat(atual ? atual.id.replace('cat-', '') : '');
    };
    addEventListener('scroll', rolar, { passive: true });
    return () => removeEventListener('scroll', rolar);
  }, [dados]);
  const porId = useMemo(() => new Map((dados?.produtos || []).map((p) => [p.id, p])), [dados]);
  const linhas = carrinho.flatMap((i) => { const p = porId.get(i.produtoId); if (!p) return []; try { return [{ i, p, c: calcularItem(p, i) }]; } catch { return []; } });
  const subtotal = linhas.reduce((s, l) => s + l.c.total, 0), qtd = linhas.reduce((s, l) => s + l.c.qtd, 0);

  if (erro) return <div className="pd"><TopoVoltar titulo="Loja" /><main className="pd-corpo"><div className="vazio"><Ic n="loja" t={40} /><b>{erro}</b><Link className="btn" to="/">Ver outras lojas</Link></div></main></div>;
  if (!dados) return <div className="pd"><TopoVoltar titulo="" /><div className="carregando"><div className="giro" /></div></div>;
  const { loja: l, categorias, produtos } = dados;
  const q = busca.trim().toLowerCase();
  const visiveis = produtos.filter((p) => (!cat || p.categoria_id === cat) && (!q || p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q)));
  const adicionar = (p: Produto) => setEscolher({ p });
  const preco = (p: Produto) => Math.min(p.preco, ...(p.opcoes?.tamanhos || []).map((t) => t.preco));
  // Destaques: os primeiros com foto (até 6), como “Destaques” do iFood.
  const destaques = [...produtos].sort((a, b) => Number(Boolean(b.foto_id)) - Number(Boolean(a.foto_id))).slice(0, 6);
  const irPara = (id: string) => { setCat(id); document.getElementById('cat-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const capa = foto(l.capa_id) || CAPA_TIPO[l.tipo];
  const entrega = !l.faz_entrega ? 'Só retirada' : !l.entrega_aqui ? 'Fora da área de entrega' : l.taxa_entrega ? brl(l.taxa_entrega) : 'Grátis';
  return (
    <div className="pd pd-loja-pag">
      {previa && <div className="pd-previa">👀 Prévia: é assim que os clientes veem a sua loja</div>}
      <div className="pd-loja-capa" style={capa ? { backgroundImage: `url(${capa})` } : undefined}>
        <button className="pd-redondo" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Voltar"><Ic n="voltar" /></button>
        <span style={{ flex: 1 }} />
        <button className="pd-redondo" onClick={alternarFav} aria-label={fav ? 'Tirar das favoritas' : 'Guardar nas favoritas'} aria-pressed={fav}>{fav ? '❤️' : '🤍'}</button>
        <button className="pd-redondo" onClick={() => document.getElementById('busca-loja')?.focus()} aria-label="Buscar no cardápio"><Ic n="busca" /></button>
      </div>
      <section className="pd-loja-card">
        <div className="pd-loja-logo"><Logo l={l} t={84} /></div>
        <h1>{l.nome}</h1>
        <p className="pd-loja-linha">{[l.distancia != null ? `${l.distancia.toLocaleString('pt-BR')} km` : l.cidade, l.pedido_minimo > 0 ? `Mín ${brl(l.pedido_minimo)}` : '', l.tipo_nome].filter(Boolean).join(' • ')}</p>
        <button className="pd-loja-item" onClick={() => setVerAvaliacoes(true)}><span>{l.nota ? <>★ <b>{l.nota.toLocaleString('pt-BR')}</b> ({l.avaliacoes} {l.avaliacoes === 1 ? 'avaliação' : 'avaliações'})</> : <><b>Novo</b> no Pedêê</>}</span><Ic n="direita" /></button>
        <div className="pd-loja-item"><span>{l.aceitando ? 'Padrão' : <b className="fechado">Fechada agora</b>}{l.tempo_entrega ? ` • ${l.tempo_entrega}` : ''} • <b className={entrega === 'Grátis' ? 'verde' : ''}>{entrega}</b></span></div>
        {l.descricao && <p className="pd-loja-desc">{l.descricao}</p>}
      </section>
      {!l.aceitando && <p className="aviso" style={{ margin: '0 16px' }}>A loja não está recebendo pedidos agora. Você pode olhar o cardápio e pedir quando ela abrir.</p>}
      <div className="pd-loja-fixo">
        <span className="entrada"><Ic n="busca" /><input id="busca-loja" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={`Buscar em ${l.nome}`} aria-label="Buscar no cardápio" /></span>
        {!q && categorias.length > 0 && <nav className="pd-loja-abas">{categorias.map((c) => <button key={c.id} className={cat === c.id ? 'sel' : ''} onClick={() => irPara(c.id)}>{c.nome}</button>)}</nav>}
      </div>
      <main className="pd-corpo" style={{ paddingTop: 6 }}>
        {!q && destaques.length > 2 && <section>
          <h2 className="pd-tit">Destaques</h2>
          <div className="pd-destaques-grade">{destaques.map((p, k) => (
            <button key={p.id} onClick={() => adicionar(p)} aria-label={`${p.nome}, ${brl(preco(p))}`}>
              <span className="pd-dg-foto"><FotoItem p={p} />{k === 0 && <em>Mais pedido</em>}</span>
              <b className="num">{brl(preco(p))}</b><span>{p.nome}</span>
            </button>
          ))}</div>
        </section>}
        {(q ? [{ id: 'x', nome: '', icone: '' }] : categorias).map((c) => {
          const itens = q ? visiveis : visiveis.filter((p) => p.categoria_id === c.id);
          if (!itens.length) return null;
          return (
            <section key={c.id} id={'cat-' + c.id} className="pd-loja-secao">
              {c.nome && <h2 className="pd-tit">{c.nome}</h2>}
              <div className="pd-cardapio2">{itens.map((p) => (
                <button key={p.id} className="pd-prod2" onClick={() => adicionar(p)} aria-label={`${p.nome}, ${brl(preco(p))}`}>
                  <span className="pd-prod-txt"><b>{p.nome}</b>{p.descricao && <small>{p.descricao}</small>}<span className="num">{p.opcoes?.tamanhos?.length ? 'a partir de ' : ''}{brl(preco(p))}</span></span>
                  <FotoItem p={p} className="pd-prod2-foto" />
                </button>
              ))}</div>
            </section>
          );
        })}
        {!visiveis.length && <div className="vazio"><Ic n="busca" t={36} /><b>Nada encontrado</b></div>}
        <div style={{ height: qtd ? 100 : 20 }} />
      </main>
      {qtd > 0 && !previa && <div className="pd-barra-sacola"><span><small>Total sem a entrega</small><b className="num">{brl(subtotal)} <small>/ {qtd} {qtd === 1 ? 'item' : 'itens'}</small></b></span><button className="btn prim grande" onClick={() => setVerCarrinho(true)}>Ver sacola</button></div>}
      {verAvaliacoes && <Avaliacoes slug={slug} aoFechar={() => setVerAvaliacoes(false)} />}
      {escolher && <Escolher produto={escolher.p} item={escolher.item} loja={l} aoFechar={() => { if (escolher.daSacola) setVerCarrinho(true); setEscolher(null); }} aoSalvar={(it) => {
        if (previa) { alert('Na prévia não dá para pedir. Os clientes veem o botão “Adicionar” assim.'); setEscolher(null); return; }
        setCarrinho(escolher.item ? carrinho.map((x) => (x.chave === escolher.item!.chave ? it : x)) : [...carrinho, it]);
        if (escolher.daSacola) setVerCarrinho(true); setEscolher(null);
      }} />}
      {verCarrinho && <Carrinho loja={l} slug={slug} linhas={linhas} subtotal={subtotal} produtos={produtos} aoFechar={() => setVerCarrinho(false)}
        adicionar={(p) => { setVerCarrinho(false); setEscolher({ p, daSacola: true }); }} limpar={() => setCarrinho([])}
        mudarQtd={(chave, n) => setCarrinho(n <= 0 ? carrinho.filter((x) => x.chave !== chave) : carrinho.map((x) => (x.chave === chave ? { ...x, qtd: Math.min(99, n) } : x)))}
        editar={(i) => { const p = porId.get(i.produtoId); if (p) { setVerCarrinho(false); setEscolher({ p, item: i, daSacola: true }); } }}
        aoPedir={(token) => { setCarrinho([]); nav(`/pedido/${token}`, { replace: false }); }} />}
    </div>
  );
}

function Avaliacoes({ slug, aoFechar }: { slug: string; aoFechar: () => void }) {
  const [d, setD] = useState<{ nota: number | null; total: number; avaliacoes: { nota: number; comentario: string | null; nome: string; criado_em: string }[] } | null>(null);
  useEffect(() => { get<NonNullable<typeof d>>(`/publico/app/loja/${encodeURIComponent(slug)}/avaliacoes`).then(setD).catch(() => setD({ nota: null, total: 0, avaliacoes: [] })); }, [slug]);
  return (
    <Modal titulo="Avaliações" aoFechar={aoFechar}>
      {!d ? <div className="carregando"><div className="giro" /></div> : !d.total ? <p style={{ margin: 0 }}>Esta loja ainda não tem avaliações. Peça e seja o primeiro a avaliar!</p> : <>
        <div className="pd-nota-grande"><b>{d.nota?.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</b><span>{'★'.repeat(Math.round(d.nota || 0))}{'☆'.repeat(5 - Math.round(d.nota || 0))}</span><small>{d.total} {d.total === 1 ? 'avaliação' : 'avaliações'}</small></div>
        {d.avaliacoes.map((a, k) => <div key={k} className="pd-aval"><div><b>{a.nome}</b><span className="estrelas-amarelas">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</span><small>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</small></div>{a.comentario && <p>{a.comentario}</p>}</div>)}
      </>}
    </Modal>
  );
}

function Avaliar({ token, aoAvaliar }: { token: string; aoAvaliar: () => void }) {
  const [nota, setNota] = useState(0), [comentario, setComentario] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async () => {
    if (!nota) return setErro('Toque nas estrelas para dar a nota.');
    setOcupado(true);
    try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/avaliar`, { nota, comentario: comentario.trim() || null }); aoAvaliar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <section className="cartao" style={{ textAlign: 'center' }}>
      <h2 className="cartao-tit" style={{ justifyContent: 'center' }}>Como foi o seu pedido?</h2>
      <div className="pd-dar-nota" role="radiogroup" aria-label="Nota">{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} className={n <= nota ? 'sim' : ''} onClick={() => { setNota(n); setErro(''); }}>★</button>)}</div>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value.slice(0, 300))} placeholder="Conte o que achou (opcional)" aria-label="Comentário" style={{ width: '100%', marginTop: 10 }} />
      {erro && <p className="aviso erro">{erro}</p>}
      <button className="btn prim bloco" style={{ marginTop: 10 }} onClick={enviar} disabled={ocupado}>Enviar avaliação</button>
    </section>
  );
}

function TopoVoltar({ titulo, compartilhar }: { titulo: string; compartilhar?: string }) {
  const nav = useNavigate();
  const partilhar = async () => {
    if (!compartilhar) return;
    try { if (navigator.share) await navigator.share({ title: titulo, text: `Peça na ${titulo} pelo ${NOME_APP}:`, url: compartilhar }); else { await navigator.clipboard.writeText(compartilhar); alert('Link copiado.'); } } catch { /* cancelou */ }
  };
  return (
    <header className="pd-topo">
      <button className="pd-voltar" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Voltar"><Ic n="voltar" /></button>
      <span className="pd-topo-tit">{titulo}</span>
      {compartilhar ? <button className="pd-voltar" onClick={partilhar} aria-label="Compartilhar a loja"><Ic n="compartilhar" /></button> : <Link className="pd-voltar" to="/" aria-label="Início"><Ic n="inicio" /></Link>}
    </header>
  );
}

function Escolher({ produto: p, item, aoFechar, aoSalvar, loja }: { produto: Produto; item?: ItemCarrinho; aoFechar: () => void; aoSalvar: (i: ItemCarrinho) => void; loja?: LojaCompleta }) {
  const op = p.opcoes || {};
  const grupos = op.grupos || [];
  const [tamanho, setTamanho] = useState(item?.tamanho || op.tamanhos?.[0]?.nome || null);
  const [adic, setAdic] = useState<string[]>(item?.adicionais || []);
  const [ret, setRet] = useState<string[]>(item?.retirar || []);
  const [obs, setObs] = useState(item?.observacao || '');
  const [qtd, setQtd] = useState(item?.qtd || 1);
  // Escolhas dos grupos: "grupo|item" → quantidade.
  const [esc, setEsc] = useState<Record<string, number>>(() => Object.fromEntries((item?.escolhas || []).map((x) => [`${x.grupo}|${x.item}`, x.qtd])));
  const [faltaVer, setFaltaVer] = useState('');
  const alternar = (l: string[], set: (x: string[]) => void, v: string) => set(l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
  const noGrupo = (g: string) => Object.entries(esc).filter(([k]) => k.startsWith(g + '|')).reduce((s, [, n]) => s + n, 0);
  const mudar = (g: NonNullable<Opcoes['grupos']>[number], it: string, n: number) => {
    const k = `${g.nome}|${it}`;
    if (g.max === 1 && !g.repetir) { setEsc((e) => { const x = Object.fromEntries(Object.entries(e).filter(([c]) => !c.startsWith(g.nome + '|'))); return n > 0 ? { ...x, [k]: 1 } : x; }); return setFaltaVer(''); }
    const atual = esc[k] || 0;
    if (n > atual && noGrupo(g.nome) >= g.max) return;
    setEsc((e) => { const x = { ...e }; if (n <= 0) delete x[k]; else x[k] = n; return x; }); setFaltaVer('');
  };
  const escolhas = grupos.flatMap((g) => g.itens.filter((it) => esc[`${g.nome}|${it.nome}`]).map((it) => ({ grupo: g.nome, item: it.nome, qtd: esc[`${g.nome}|${it.nome}`] })));
  const faltando = grupos.find((g) => noGrupo(g.nome) < (g.min || 0));
  const novo: ItemCarrinho = { chave: item?.chave || novaChave(), produtoId: p.id, qtd, tamanho, adicionais: adic, retirar: ret, observacao: obs.trim() || undefined, escolhas };
  let total = 0; try { total = calcularItem(p, { ...novo, escolhas: undefined, adicionais: [...adic] }).total + escolhas.reduce((s, x) => s + (grupos.find((g) => g.nome === x.grupo)?.itens.find((i) => i.nome === x.item)?.preco || 0) * x.qtd, 0) * qtd; } catch { /* opção que saiu do cardápio */ }
  useEffect(() => { const t = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); }; addEventListener('keydown', t); document.body.style.overflow = 'hidden'; return () => { removeEventListener('keydown', t); document.body.style.overflow = ''; }; }, [aoFechar]);
  const precoBase = op.tamanhos?.find((t) => t.nome === tamanho)?.preco ?? p.preco;
  const salvar = () => {
    if (faltando) { setFaltaVer(faltando.nome); document.getElementById('grupo-' + grupos.indexOf(faltando))?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    aoSalvar(novo);
  };
  const regra = (g: { min: number; max: number }) => (g.min && g.min === g.max ? `Escolha ${g.min} ${g.min === 1 ? 'opção' : 'opções'}` : g.min ? `Escolha de ${g.min} a ${g.max}` : `Escolha até ${g.max} ${g.max === 1 ? 'opção' : 'opções'}`);
  return (
    <div className="pd-produto" role="dialog" aria-modal="true" aria-label={p.nome}>
      <div className="pd-produto-rola">
        <div className="pd-produto-foto"><FotoItem p={p} />
          <button className="pd-redondo claro" onClick={aoFechar} aria-label="Voltar"><Ic n="voltar" /></button>
          {loja && <div className="pd-produto-loja"><Logo l={loja} t={40} /><span><b>{loja.nome}</b><small>{loja.nota ? `★ ${loja.nota.toLocaleString('pt-BR')} (${loja.avaliacoes})` : 'Novo'}{loja.tempo_entrega ? ` • ${loja.tempo_entrega}` : ''}</small></span></div>}
        </div>
        <div className="pd-produto-info">
          <h2>{p.nome}</h2>
          {p.descricao && <p>{p.descricao}</p>}
          <b className="num">{brl(precoBase)}</b>
        </div>
        {!!op.tamanhos?.length && <><div className="pd-grupo"><b>Tamanho</b><small>Escolha 1 opção</small><em className="ok"><Ic n="check" t={14} /></em></div>
          {op.tamanhos.map((t) => <label key={t.nome} className="pd-opcao"><span>{t.nome}<small className="num">{brl(t.preco)}</small></span><input type="radio" name="tam" checked={tamanho === t.nome} onChange={() => setTamanho(t.nome)} /></label>)}</>}
        {grupos.map((g, gi) => {
          const n = noGrupo(g.nome), ok = n >= (g.min || 0), radio = g.max === 1 && !g.repetir;
          return (
            <div key={g.nome} id={'grupo-' + gi}>
              <div className={`pd-grupo ${faltaVer === g.nome ? 'falta' : ''}`}><b>{g.nome}</b><small>{regra(g)}{g.max > 1 ? ` · ${n}/${g.max}` : ''}</small>
                {g.min > 0 ? (ok ? <em className="ok"><Ic n="check" t={14} /></em> : <em>Obrigatório</em>) : null}</div>
              {g.itens.map((it) => {
                const k = `${g.nome}|${it.nome}`, q = esc[k] || 0, cheio = n >= g.max;
                return radio
                  ? <label key={it.nome} className="pd-opcao"><span>{it.nome}{it.preco > 0 && <small className="num">+ {brl(it.preco)}</small>}</span><input type="radio" name={'g' + gi} checked={q > 0} onChange={() => mudar(g, it.nome, 1)} /></label>
                  : <div key={it.nome} className="pd-opcao"><span>{it.nome}{it.preco > 0 && <small className="num">+ {brl(it.preco)}</small>}</span>
                    {g.repetir
                      ? <span className="pd-passo">{q > 0 && <><button onClick={() => mudar(g, it.nome, q - 1)} aria-label={`Menos ${it.nome}`}><Ic n="menos" t={18} /></button><b className="num">{q}</b></>}<button onClick={() => mudar(g, it.nome, q + 1)} disabled={cheio} aria-label={`Mais ${it.nome}`}><Ic n="mais" t={18} /></button></span>
                      : <input type="checkbox" checked={q > 0} disabled={!q && cheio} onChange={() => mudar(g, it.nome, q ? 0 : 1)} aria-label={it.nome} />}
                  </div>;
              })}
            </div>
          );
        })}
        {!!op.adicionais?.length && <><div className="pd-grupo"><b>Adicionais</b><small>Escolha até {op.adicionais.length} {op.adicionais.length === 1 ? 'opção' : 'opções'}</small></div>
          {op.adicionais.map((a) => <label key={a.nome} className="pd-opcao"><span>{a.nome}<small className="num">+ {brl(a.preco)}</small></span><input type="checkbox" checked={adic.includes(a.nome)} onChange={() => alternar(adic, setAdic, a.nome)} /></label>)}</>}
        {!!op.retirar?.length && <><div className="pd-grupo"><b>Retirar ingredientes</b><small>Se quiser</small></div>
          {op.retirar.map((r) => <label key={r} className="pd-opcao"><span>Sem {r.toLowerCase()}</span><input type="checkbox" checked={ret.includes(r)} onChange={() => alternar(ret, setRet, r)} /></label>)}</>}
        <div className="pd-grupo"><b>Alguma observação?</b><small>{obs.length}/150</small></div>
        <textarea className="pd-obs" value={obs} onChange={(e) => setObs(e.target.value.slice(0, 150))} placeholder="Ex.: tirar a cebola, maionese à parte etc." aria-label="Observação" />
      </div>
      <div className="pd-produto-pe">
        <span className="qtd"><button onClick={() => setQtd(Math.max(1, qtd - 1))} aria-label="Menos"><Ic n="menos" /></button><span className="num">{qtd}</span><button onClick={() => setQtd(Math.min(99, qtd + 1))} aria-label="Mais"><Ic n="mais" /></button></span>
        <button className={`btn prim grande pd-adicionar ${faltando ? 'falta' : ''}`} onClick={salvar}><span>{faltando ? 'Escolha as opções' : item ? 'Atualizar' : 'Adicionar'}</span><span className="num">{brl(total)}</span></button>
      </div>
    </div>
  );
}

const textoEscolhas = (i: EscolhaItem) => [i.tamanho && i.tamanho !== 'Padrão' ? i.tamanho : '', (i.adicionais || []).join(', '), (i.retirar || []).map((r) => 'sem ' + r.toLowerCase()).join(', '), i.observacao || ''].filter(Boolean).join(' · ');
const temOpcoes = (p: Produto) => Boolean(p.opcoes?.tamanhos?.length || p.opcoes?.adicionais?.length || p.opcoes?.retirar?.length || p.opcoes?.grupos?.length);
const itensTexto = (n: number) => `${n} ${n === 1 ? 'item' : 'itens'}`;

/** Sacola em 3 passos, como no iFood: itens → entrega → pagamento → “Revise o seu pedido”. */
function Carrinho({ loja: l, slug, linhas, subtotal, produtos, aoFechar, mudarQtd, editar, adicionar, limpar, aoPedir }: {
  loja: LojaCompleta; slug: string; linhas: { i: ItemCarrinho; p: Produto; c: ReturnType<typeof calcularItem> }[]; subtotal: number; produtos: Produto[];
  aoFechar: () => void; mudarQtd: (chave: string, n: number) => void; editar: (i: ItemCarrinho) => void; adicionar: (p: Produto) => void; limpar: () => void; aoPedir: (token: string) => void;
}) {
  const g = ler();
  const podeEntregar = l.faz_entrega && l.entrega_aqui;
  const [passo, setPasso] = useState<'itens' | 'entrega' | 'pagamento'>('itens');
  const [revisar, setRevisar] = useState(false);
  const [mudarDados, setMudarDados] = useState(false);
  const [trocarEnd, setTrocarEnd] = useState(!g.endereco);
  const [talheres, setTalheres] = useState<boolean | null>(null);
  const [f, setF] = useState({ nome: g.nome, telefone: g.telefone, endereco: g.endereco, tipo: (podeEntregar ? 'entrega' : 'balcao') as 'entrega' | 'balcao', forma: (l.formas[0] || 'pix') as Forma, troco: '', obs: '' });
  const [erro, setErro] = useState(''), [enviando, setEnviando] = useState(false);
  const [chave] = useState(novaChave);
  const taxa = f.tipo === 'entrega' ? l.taxa_entrega : 0, total = subtotal + taxa;
  const falta = Math.max(0, l.pedido_minimo - subtotal);
  const qtd = linhas.reduce((s, x) => s + x.i.qtd, 0);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErro(''); };
  // “Peça também”: o que a loja tem e ainda não está na sacola (bebidas e sobremesas primeiro).
  const naSacola = new Set(linhas.map((x) => x.p.id));
  const peso = (p: Produto) => (p.categoria_icone === 'bebida' ? 0 : p.categoria_icone === 'sobremesa' || p.categoria_icone === 'acai' ? 1 : 2);
  const sugestoes = produtos.filter((p) => !naSacola.has(p.id)).sort((a, b) => peso(a) - peso(b)).slice(0, 10);
  useEffect(() => { const t = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); }; addEventListener('keydown', t); document.body.style.overflow = 'hidden'; return () => { removeEventListener('keydown', t); document.body.style.overflow = ''; }; }, [aoFechar]);
  useEffect(() => { document.querySelector('.pd-sacola-rola')?.scrollTo(0, 0); setErro(''); }, [passo]);

  const conferir = (): string => {
    if (!l.aceitando) return 'A loja está fechada agora.';
    if (falta > 0) return `Faltam ${brl(falta)} para o pedido mínimo.`;
    if (passo === 'itens') return '';
    if (f.tipo === 'entrega' && f.endereco.trim().length < 5) return 'Digite o endereço da entrega (rua, número, bairro).';
    if (passo === 'entrega') return '';
    if (f.nome.trim().length < 2) return 'Digite seu nome.';
    const tel = f.telefone.replace(/\D/g, '');
    if (tel.length < 10 || tel.length > 13) return 'Digite seu WhatsApp com DDD.';
    const troco = f.forma === 'dinheiro' && f.troco.trim() ? lerValor(f.troco) : null;
    if (troco != null && (Number.isNaN(troco) || troco < total)) return `O troco precisa ser para um valor maior que ${brl(total)}.`;
    return '';
  };
  const continuar = () => {
    const e = conferir(); if (e) return setErro(e);
    if (passo === 'itens') setPasso('entrega'); else if (passo === 'entrega') setPasso('pagamento'); else setRevisar(true);
  };
  const voltar = () => (revisar ? setRevisar(false) : passo === 'pagamento' ? setPasso('entrega') : passo === 'entrega' ? setPasso('itens') : aoFechar());
  const enviar = async () => {
    const troco = f.forma === 'dinheiro' && f.troco.trim() ? lerValor(f.troco) : null;
    const obs = [talheres === true ? 'Mandar talheres e guardanapo' : talheres === false ? 'Não precisa de talheres' : '', f.obs.trim()].filter(Boolean).join(' · ');
    setEnviando(true); setErro('');
    try {
      const dest = f.tipo === 'entrega' ? (ler().local || await procurarEndereco(`${f.endereco.trim()}, ${l.cidade || ''}, ${l.uf || 'RJ'}, Brasil`)) : null;
      const r = await post<{ token: string }>(`/publico/app/loja/${encodeURIComponent(slug)}/pedido`, {
        lat: dest?.lat ?? null, lng: dest?.lng ?? null, chave, nome: f.nome.trim(), telefone: f.telefone.trim(), tipo: f.tipo, endereco: f.tipo === 'entrega' ? f.endereco.trim() : null, forma: f.forma, trocoPara: troco, observacao: obs.slice(0, 200) || null,
        itens: linhas.map(({ i }) => ({ produtoId: i.produtoId, qtd: i.qtd, tamanho: i.tamanho ?? null, adicionais: i.adicionais || [], retirar: i.retirar || [], observacao: i.observacao, escolhas: i.escolhas })),
      });
      gravar((x) => ({ ...x, nome: f.nome.trim(), telefone: f.telefone.trim(), endereco: f.tipo === 'entrega' ? f.endereco.trim() : x.endereco,
        pedidos: [{ token: r.token, loja: l.nome, slug, criado_em: new Date().toISOString() }, ...x.pedidos.filter((p) => p.token !== r.token)].slice(0, 30) }));
      aoPedir(r.token);
    } catch (e) { setRevisar(false); setErro(msgErro(e)); } finally { setEnviando(false); }
  };
  const textoTaxa = f.tipo === 'balcao' ? 'retirando na loja' : taxa ? `entrega ${brl(taxa)}` : 'entrega grátis';

  return (
    <div className="pd-sacola" role="dialog" aria-modal="true" aria-label="Sacola">
      <header className="pd-sacola-topo">
        <button className="pd-redondo cinza" onClick={voltar} aria-label="Voltar"><Ic n={passo === 'itens' ? 'baixo' : 'voltar'} /></button>
        <b>SACOLA</b>
        {linhas.length ? <button className="link" onClick={() => { if (confirm('Tirar todos os itens da sacola?')) { limpar(); aoFechar(); } }}>Limpar</button> : <span />}
      </header>
      <div className="pd-sacola-rola">
        {passo !== 'entrega' && <div className="pd-sacola-loja"><Logo l={l} t={52} /><span><b>{l.nome}</b><button className="link" onClick={aoFechar}>Adicionar mais itens</button></span></div>}

        {passo === 'itens' && <>
          <h3 className="pd-sacola-tit">Itens adicionados</h3>
          {linhas.map(({ i, p, c }) => (
            <div className="pd-sacola-item" key={i.chave}>
              <button className="foto" onClick={() => temOpcoes(p) && editar(i)} aria-label={`Mudar ${p.nome}`}><FotoItem p={p} />{temOpcoes(p) && <span className="lapis"><Ic n="lapis" t={14} /></span>}</button>
              <div className="txt">
                <b>{p.nome}</b>
                {textoEscolhas({ ...i, adicionais: [] }) && <small>{textoEscolhas({ ...i, adicionais: [] })}</small>}
                <span className="num preco">{brl(c.total)}</span>
                {!!c.detalhes.adicionais.length && <ul>{[...(i.adicionais || []).map((a) => ({ n: 1, a })), ...(i.escolhas || []).map((x) => ({ n: x.qtd, a: x.item }))].map((x, k) => <li key={k}><em className="num">{x.n}</em>{x.a}</li>)}</ul>}
              </div>
              <span className="pd-passo cinza"><button onClick={() => mudarQtd(i.chave, i.qtd - 1)} aria-label={i.qtd === 1 ? 'Tirar' : 'Menos'}>{i.qtd === 1 ? <Ic n="lixeira" t={18} /> : <Ic n="menos" t={18} />}</button><b className="num">{i.qtd}</b><button onClick={() => mudarQtd(i.chave, i.qtd + 1)} aria-label="Mais"><Ic n="mais" t={18} /></button></span>
            </div>
          ))}
          {!linhas.length && <p className="vazio">A sacola está vazia.</p>}
          <button className="btn bloco pd-sacola-mais" onClick={aoFechar}>Adicionar mais itens</button>
          {sugestoes.length > 0 && <>
            <h3 className="pd-sacola-tit">Peça também</h3>
            <div className="pd-peca">{sugestoes.map((p) => (
              <button key={p.id} onClick={() => adicionar(p)} aria-label={`Adicionar ${p.nome}`}>
                <span className="f"><FotoItem p={p} /><i><Ic n="mais" t={16} /></i></span>
                <b className="num">{brl(Math.min(p.preco, ...(p.opcoes?.tamanhos || []).map((t) => t.preco)))}</b><span>{p.nome}</span>
              </button>
            ))}</div>
          </>}
          <h3 className="pd-sacola-tit">Precisa de talheres e guardanapo?</h3>
          <div className="chips" role="radiogroup">
            <button role="radio" aria-checked={talheres === true} className={`chip ${talheres === true ? 'sel' : ''}`} onClick={() => setTalheres(true)}>🍴 Sim, mandar</button>
            <button role="radio" aria-checked={talheres === false} className={`chip ${talheres === false ? 'sel' : ''}`} onClick={() => setTalheres(false)}>🌱 Não precisa</button>
          </div>
          <h3 className="pd-sacola-tit">Resumo de valores</h3>
          <div className="pd-sacola-valores">
            <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(subtotal)}</b></div>
            {podeEntregar && <div className="linha-valor"><span>Taxa de entrega</span><b className="num">{l.taxa_entrega ? brl(l.taxa_entrega) : 'Grátis'}</b></div>}
            {falta > 0 && <p className="aviso" style={{ margin: 0 }}>Pedido mínimo {brl(l.pedido_minimo)}: faltam {brl(falta)}.</p>}
          </div>
        </>}

        {passo === 'entrega' && <>
          {f.tipo === 'entrega' && <>
            <h3 className="pd-sacola-tit">Entregar no endereço</h3>
            {trocarEnd
              ? <label className="campo">Endereço da entrega<input value={f.endereco} onChange={muda('endereco')} maxLength={200} autoComplete="street-address" placeholder="Rua, número, bairro e referência" /></label>
              : <div className="pd-sacola-end"><span className="pino">📍</span><span><b>{f.endereco}</b><small>{g.cidade || l.cidade || ''}</small></span><button className="link" onClick={() => setTrocarEnd(true)}>Trocar</button></div>}
          </>}
          <h3 className="pd-sacola-tit">Opções de entrega</h3>
          <div className="pd-sacola-opcoes" role="radiogroup">
            {l.faz_entrega && <button role="radio" aria-checked={f.tipo === 'entrega'} disabled={!l.entrega_aqui} className={f.tipo === 'entrega' ? 'sel' : ''} onClick={() => setF({ ...f, tipo: 'entrega' })}>
              <span><b>Entrega</b><small>{l.entrega_aqui ? `Hoje${l.tempo_entrega ? `, ${l.tempo_entrega}` : ''}` : 'Fora da área de entrega'}</small></span>
              <em className={l.taxa_entrega ? '' : 'verde'}>{l.taxa_entrega ? brl(l.taxa_entrega) : 'Grátis'}</em><i /></button>}
            {l.faz_retirada && <button role="radio" aria-checked={f.tipo === 'balcao'} className={f.tipo === 'balcao' ? 'sel' : ''} onClick={() => setF({ ...f, tipo: 'balcao' })}>
              <span><b>Retirar na loja</b><small>{l.endereco || 'No endereço da loja'}</small></span><em className="verde">Grátis</em><i /></button>}
          </div>
        </>}

        {passo === 'pagamento' && <>
          <h3 className="pd-sacola-tit">Pagamento na {f.tipo === 'entrega' ? 'entrega' : 'retirada'}</h3>
          <div className="pd-sacola-opcoes" role="radiogroup">{l.formas.map((x) => (
            <button key={x} role="radio" aria-checked={f.forma === x} className={f.forma === x ? 'sel' : ''} onClick={() => setF({ ...f, forma: x })}><span><b>{FORMAS[x]}</b></span><i /></button>
          ))}</div>
          {f.forma === 'dinheiro' && <label className="campo" style={{ marginTop: 10 }}>Troco para quanto? (deixe vazio se não precisar)<input value={f.troco} onChange={muda('troco')} inputMode="decimal" placeholder="Ex.: 50,00" /></label>}
          <h3 className="pd-sacola-tit">Seus dados</h3>
          <div className="campos">
            {ler().conta && !mudarDados ? <div className="campo largo pd-quem"><span>Pedido de <b>{f.nome}</b> · {f.telefone}</span><button type="button" className="link" onClick={() => setMudarDados(true)}>Alterar</button></div> : <>
              <label className="campo">Seu nome<input value={f.nome} onChange={muda('nome')} maxLength={60} autoComplete="name" /></label>
              <label className="campo">WhatsApp<input value={f.telefone} onChange={muda('telefone')} inputMode="tel" autoComplete="tel" placeholder="(21) 98765-4321" /></label>
            </>}
          </div>
          <label className="campo" style={{ marginTop: 10 }}>Observação para a loja (opcional)<input value={f.obs} onChange={muda('obs')} maxLength={150} placeholder="Ex.: interfone 12, portão azul" /></label>
          <h3 className="pd-sacola-tit">Resumo de valores</h3>
          <div className="pd-sacola-valores">
            <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(subtotal)}</b></div>
            {f.tipo === 'entrega' && <div className="linha-valor"><span>Taxa de entrega</span><b className="num">{taxa ? brl(taxa) : 'Grátis'}</b></div>}
            <div className="linha-valor total"><span>Total</span><b className="num">{brl(total)}</b></div>
          </div>
        </>}
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
      </div>
      <footer className="pd-sacola-pe">
        <span><small>Total com <b>{textoTaxa}</b></small><b className="num">{brl(passo === 'itens' && podeEntregar ? subtotal + l.taxa_entrega : total)} <small>/ {itensTexto(qtd)}</small></b></span>
        <button className="btn prim grande" onClick={continuar} disabled={!linhas.length || !l.aceitando}>{l.aceitando ? 'Continuar' : 'Loja fechada'}</button>
      </footer>
      {revisar && <div className="pd-folha-fundo" onClick={() => !enviando && setRevisar(false)}>
        <div className="pd-folha" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Revise o seu pedido">
          <span className="alca" />
          <h2>Revise o seu pedido</h2>
          <div className="r"><span>{f.tipo === 'entrega' ? '🛵' : '🏪'}</span><span><b>{f.tipo === 'entrega' ? 'Entrega hoje' : 'Retirar na loja'}</b><small>{f.tipo === 'entrega' ? (l.tempo_entrega ? `Hoje, ${l.tempo_entrega}` : 'Hoje') : l.endereco || l.nome}</small></span></div>
          {f.tipo === 'entrega' && <div className="r"><span>📍</span><span><b>{f.endereco}</b><small>{g.cidade || l.cidade || ''}</small></span></div>}
          <div className="r"><span>{talheres ? '🍴' : '🌱'}</span><span><b>{talheres ? 'Com talheres e guardanapo' : talheres === false ? 'Sem talheres' : 'Talheres: a loja decide'}</b><small>{itensTexto(qtd)}</small></span></div>
          <div className="r"><span>💳</span><span><b>Pagamento na {f.tipo === 'entrega' ? 'entrega' : 'retirada'}</b><small>{FORMAS[f.forma]}{f.forma === 'dinheiro' && f.troco.trim() ? ` · troco para ${f.troco.trim()}` : ''}</small></span><b className="num">{brl(total)}</b></div>
          <button className="btn prim grande bloco" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Fazer pedido'}</button>
          <button className="link bloco" onClick={() => setRevisar(false)} disabled={enviando}>Alterar pedido</button>
        </div>
      </div>}
    </div>
  );
}


// ---------- acompanhamento do pedido ----------
/** Previsão em tempo real (pronto, saída, chegada) e aviso de atraso com o botão de reclamar ao Pedêê. */
function Previsao({ p, token }: { p: { situacao: string; tipo: string; prazos?: Prazos | null }; token: string }) {
  useRelogio(true);
  const [reclamar, setReclamar] = useState(false), [texto, setTexto] = useState(''), [msg, setMsg] = useState(''), [erro, setErro] = useState('');
  const z = p.prazos!; const entrega = p.tipo === 'entrega';
  const pronto = prazo(z.pronto), coleta = prazo(z.coleta), chega = prazo(z.entrega);
  const final = entrega ? chega : pronto;
  // O que está atrasado agora: o preparo (loja) ou a entrega.
  const atraso = p.situacao === 'preparando' && pronto?.atrasado ? `A loja está atrasada ${pronto.min} min no preparo.`
    : entrega && ['pronto', 'a_caminho'].includes(p.situacao) && chega?.atrasado ? `A entrega está atrasada ${chega.min} min.` : '';
  const enviar = async () => {
    try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/reclamar`, { texto: texto.trim() }); setReclamar(false); setTexto(''); setMsg('Recebemos a sua reclamação. A equipe do Pedêê vai analisar.'); } catch (e) { setErro(msgErro(e)); }
  };
  return (
    <section className={`cartao pd-previsao ${atraso ? 'atrasado' : ''}`}>
      <small>{p.situacao === 'aguardando' ? 'Se a loja aceitar agora, fica pronto por volta de' : entrega ? 'Previsão de entrega' : 'Pronto para retirar'}</small>
      <b className="num">{p.situacao === 'aguardando' && entrega ? chega?.hora : final?.hora}</b>
      {p.situacao !== 'aguardando' && final && <span>{final.atrasado ? `⚠️ ${final.texto}` : final.texto}</span>}
      {p.situacao !== 'aguardando' && <ul className="pd-prev-etapas">
        <li className={['pronto', 'a_caminho'].includes(p.situacao) ? 'ok' : pronto?.atrasado ? 'ruim' : ''}>👨‍🍳 Preparo até <b>{pronto?.hora}</b></li>
        {entrega && coleta && <li className={p.situacao === 'a_caminho' ? 'ok' : coleta.atrasado ? 'ruim' : ''}>🛵 Entregador busca até <b>{coleta.hora}</b></li>}
        {entrega && chega && <li className={chega.atrasado ? 'ruim' : ''}>🏠 Chega até <b>{chega.hora}</b> <small>({z.rota_min} min de trajeto)</small></li>}
      </ul>}
      {atraso && <p className="aviso erro" style={{ margin: '8px 0 0' }}>⚠️ {atraso}</p>}
      {msg && <p className="aviso" style={{ margin: '8px 0 0' }}>{msg}</p>}
      {atraso && !msg && !reclamar && <button className="btn bloco" style={{ marginTop: 8 }} onClick={() => setReclamar(true)}>📣 Reclamar com o Pedêê</button>}
      {reclamar && <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 500))} placeholder="Conte o que aconteceu (ex.: pedido muito atrasado e a loja não responde)." aria-label="Reclamação" />
        {erro && <p className="aviso erro" style={{ margin: 0 }}>{erro}</p>}
        <div className="dupla"><button className="btn" onClick={() => setReclamar(false)}>Voltar</button><button className="btn prim" onClick={enviar} disabled={texto.trim().length < 5}>Enviar</button></div>
      </div>}
    </section>
  );
}

/** Conversa com a loja sobre o pedido: texto livre, mas o servidor barra telefone, link e palavrão. */
function ConversaLoja({ token, loja, msgs, aoEnviar }: { token: string; loja: string; msgs: { de: 'cliente' | 'loja'; texto: string; criado_em: string }[]; aoEnviar: () => void }) {
  const [aberta, setAberta] = useState(msgs.length > 0), [texto, setTexto] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async (t: string) => {
    if (!t.trim()) return;
    setOcupado(true);
    try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/loja-mensagem`, { texto: t.trim() }); setTexto(''); setErro(''); aoEnviar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  if (!aberta) return <button className="btn bloco grande" onClick={() => setAberta(true)}>💬 Conversar com a loja</button>;
  return (
    <section className="cartao pd-conversa-loja">
      <h2 className="cartao-tit">💬 Conversa com {loja}</h2>
      {!msgs.length && <small style={{ color: 'var(--suave)' }}>Fale com a loja por aqui sobre o seu pedido. Não é permitido passar telefone, link ou palavrão.</small>}
      {msgs.length > 0 && <div className="pd-chat">{msgs.map((m, k) => <p key={k} className={m.de === 'cliente' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}</div>}
      <div className="pd-rapidas" style={{ margin: '8px 0' }}>{RAPIDAS_CLIENTE_LOJA.map((t) => <button key={t} className="chip" onClick={() => enviar(t)} disabled={ocupado}>{t}</button>)}</div>
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="pd-chat-enviar"><input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="Mensagem para a loja" aria-label="Mensagem para a loja" onKeyDown={(e) => { if (e.key === 'Enter') enviar(texto); }} /><button className="btn prim" onClick={() => enviar(texto)} disabled={!texto.trim() || ocupado}>Enviar</button></div>
    </section>
  );
}

interface Acomp {
  loja: string; slug: string; loja_telefone: string | null; numero: number | null; situacao: string; motivo_recusa: string | null; tipo: 'entrega' | 'balcao'; endereco: string | null;
  forma: Forma; troco_para: number | null; itens: { nome: string; qtd: number; total: number; detalhes: { tamanho?: string; adicionais?: { nome: string }[]; retirar?: string[]; observacao?: string } }[];
  subtotal: number; taxa_entrega: number; total: number; criado_em: string; respondido_em: string | null; pronto_em: string | null; saiu_em: string | null; finalizado_em: string | null; entregador: string | null;
  avaliacao: { nota: number; comentario: string | null } | null; mapa: DadosMapa | null; cancelar_ate: string | null; pode_cancelar?: boolean; cancelado_pelo_cliente: boolean; codigo_entrega: string | null; entregador_foto: string | null;
  mensagens: { de: 'entregador' | 'cliente'; texto: string; criado_em: string }[]; pode_conversar: boolean;
  conversa_loja?: { de: 'cliente' | 'loja'; texto: string; criado_em: string }[]; pode_falar_loja?: boolean; prazos?: Prazos | null;
}
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const AVISO: Record<string, string> = {
  preparando: '👨‍🍳 A loja aceitou! Seu pedido já está sendo preparado.', pronto: '✅ Seu pedido está pronto!', a_caminho: '🛵 O entregador saiu com o seu pedido!',
  entregue: '😋 Pedido entregue. Bom apetite!', retirado: '😋 Pedido retirado. Bom apetite!', recusado: 'A loja não pôde aceitar o pedido.', cancelado: 'O pedido foi cancelado.',
};
const PISTA: Record<string, number> = { aguardando: 6, preparando: 28, pronto: 52, a_caminho: 70, entregue: 94, retirado: 94 };
const TITULO: Record<string, string> = {
  aguardando: 'Esperando a loja aceitar…', preparando: 'Pedido aceito! Em preparo 👨‍🍳', pronto: 'Pedido pronto!', a_caminho: 'Saiu para entrega! 🛵',
  entregue: 'Pedido entregue. Bom apetite! 😋', retirado: 'Pedido retirado. Bom apetite! 😋', recusado: 'A loja não pôde aceitar', cancelado: 'Pedido cancelado',
};

function Pedido() {
  const { token = '' } = useParams();
  const [p, setP] = useState<Acomp | null>(null), [erro, setErro] = useState('');
  const [vez, setVez] = useState(0), [aviso, setAviso] = useState('');
  const antes = useRef<string | null>(null), msgs = useRef<number | null>(null), msgsLoja = useRef<number | null>(null);
  const responder = async (t: string) => { try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/mensagem`, { texto: t }); setErro(''); setVez((x) => x + 1); } catch (e) { setErro(msgErro(e)); } };
  useEffect(() => {
    let parar = false;
    const carregar = () => get<{ pedido: Acomp }>(`/publico/app/pedido/${encodeURIComponent(token)}`).then((r) => {
      if (parar) return;
      const nova = r.pedido.situacao;
      if (antes.current && antes.current !== nova && AVISO[nova]) { setAviso(AVISO[nova]); alo(); setTimeout(() => setAviso(''), 9000); }
      const doEntregador = r.pedido.mensagens.filter((m) => m.de === 'entregador');
      if (msgs.current != null && doEntregador.length > msgs.current) { setAviso(`💬 Entregador: ${doEntregador[doEntregador.length - 1].texto}`); alo(); setTimeout(() => setAviso(''), 12000); }
      msgs.current = doEntregador.length;
      const daLoja = (r.pedido.conversa_loja || []).filter((m) => m.de === 'loja');
      if (msgsLoja.current != null && daLoja.length > msgsLoja.current) { setAviso(`💬 ${r.pedido.loja}: ${daLoja[daLoja.length - 1].texto}`); alo(); setTimeout(() => setAviso(''), 12000); }
      msgsLoja.current = daLoja.length;
      antes.current = nova;
      setP(r.pedido); setErro(''); marcarFim(token, nova);
    }).catch((e) => setErro(msgErro(e)));
    carregar();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 6000);
    return () => { parar = true; clearInterval(t); };
  }, [token, vez]);
  useRelogio(Boolean(p?.cancelar_ate));
  const [cancelando, setCancelando] = useState(false);
  const cancelar = async () => {
    if (!confirm('Cancelar este pedido? A loja será avisada.')) return;
    setCancelando(true);
    try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/cancelar`, {}); setVez((x) => x + 1); } catch (e) { setErro(msgErro(e)); setVez((x) => x + 1); } finally { setCancelando(false); }
  };
  if (!p) return <div className="pd"><TopoVoltar titulo="Seu pedido" /><main className="pd-corpo">{erro ? <p className="aviso erro">{erro}</p> : <div className="carregando"><div className="giro" /></div>}</main></div>;
  const ordem = p.tipo === 'entrega' ? ['aguardando', 'preparando', 'pronto', 'a_caminho', 'entregue'] : ['aguardando', 'preparando', 'pronto', 'retirado'];
  const pos = ordem.indexOf(p.situacao), final = ['entregue', 'retirado', 'recusado', 'cancelado'].includes(p.situacao);
  const passos = [
    { t: 'Pedido enviado', h: p.criado_em }, { t: 'Loja aceitou · em preparo', h: p.respondido_em }, { t: p.tipo === 'entrega' ? 'Pronto' : 'Pronto para retirar', h: p.pronto_em },
    ...(p.tipo === 'entrega' ? [{ t: `Saiu para entrega${p.entregador ? ` com ${p.entregador}` : ''}`, h: p.saiu_em }] : []), { t: p.tipo === 'entrega' ? 'Entregue' : 'Retirado', h: p.finalizado_em },
  ];
  return (
    <div className="pd">
      <TopoVoltar titulo={p.loja} />
      <main className="pd-corpo">
        {aviso && <div className="pd-alo" role="status">{aviso}</div>}
        <section className="cartao" style={{ textAlign: 'center' }}>
          <small style={{ color: 'var(--suave)' }}>{p.numero ? `Pedido #${p.numero}` : 'Seu pedido'} · {p.loja}</small>
          <h1 style={{ margin: '6px 0 0', fontSize: 24 }} className={final ? '' : 'pd-viva'}>{TITULO[p.situacao] || p.situacao}</h1>
          {p.situacao in PISTA && <div className={`pd-pista ${p.situacao}`}><i style={{ width: `${PISTA[p.situacao]}%` }} /><span style={{ left: `${PISTA[p.situacao]}%` }}>{p.situacao === 'a_caminho' ? '🛵' : p.situacao === 'preparando' ? '👨‍🍳' : p.situacao === 'pronto' ? '🛍️' : p.situacao === 'aguardando' ? '⏳' : '🎉'}</span></div>}
          {p.situacao === 'recusado' && p.motivo_recusa && <p className="aviso erro" style={{ marginBottom: 0 }}>Motivo: {p.motivo_recusa}</p>}
          {!final && <p style={{ color: 'var(--suave)', margin: '6px 0 0' }}>Esta tela atualiza sozinha.</p>}
        </section>
        {erro && <p className="aviso erro">{erro}</p>}
        {!final && <AtivarAvisos chave={token} texto="Saiba na hora quando o pedido for aceito, ficar pronto e sair, mesmo com o app fechado." registrar={(endpoint) => post('/publico/push/cliente', { endpoint, tokens: [token, ...ler().pedidos.filter((x) => !x.fim && x.token !== token).map((x) => x.token)].slice(0, 20) })} />}
        {p.prazos && <Previsao p={p} token={token} />}
        {(p.situacao === 'aguardando' || faltam(p.cancelar_ate)) && <section className="cartao" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px' }}>{p.situacao === 'aguardando'
            ? <>A loja ainda não aceitou. Não quer mais esperar? <b>Pode cancelar</b> sem custo.<br /><small style={{ color: 'var(--suave)' }}>Se a loja não responder em 20 minutos, o pedido é cancelado sozinho.</small></>
            : <>Mudou de ideia? Você pode cancelar por mais <b>{faltam(p.cancelar_ate)}</b>.</>}</p>
          <button className="btn bloco" onClick={cancelar} disabled={cancelando}>Cancelar pedido</button>
        </section>}
        {p.codigo_entrega && <section className="cartao pd-codigo">
          <small>Código de entrega</small><b>{p.codigo_entrega}</b>
          <span>Passe este código ao entregador <u>só quando receber</u> o pedido. Sem ele a entrega não é confirmada.</span>
        </section>}
        {p.pode_conversar && <section className="cartao pd-entregador">
          <div className="pd-ent-topo">{p.entregador_foto ? <img src={p.entregador_foto} alt="" /> : <span className="pd-ent-sem">🛵</span>}<div><small>Seu entregador</small><b>{p.entregador || 'Entregador'}</b></div></div>
          {p.mensagens.length > 0 && <div className="pd-chat">{p.mensagens.map((m, k) => <p key={k} className={m.de === 'cliente' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}</div>}
          <small style={{ color: 'var(--suave)', display: 'block', margin: '8px 0 6px' }}>Avise o entregador com um toque. Para outros assuntos, fale com a loja.</small>
          <div className="pd-rapidas">{RAPIDAS_CLIENTE.map((t) => <button key={t} className="chip" onClick={() => responder(t)}>{t}</button>)}</div>
        </section>}
        {p.mapa && <section className="cartao">
          <Mapa dados={p.mapa} />
          {p.mapa.entregador ? (() => {
            const alvo = p.mapa.destino || p.mapa.loja, km = alvo ? distanciaKm(p.mapa.entregador, alvo) : null;
            return <p className="mapa-eta">🛵 {p.entregador || 'Seu entregador'} está a caminho{km != null && <small>· {km < 0.1 ? 'chegando' : `${km.toFixed(1).replace('.', ',')} km · cerca de ${minutosAte(km)} min`}</small>}</p>;
          })() : <p className="mapa-eta"><small>Assim que o entregador abrir o app, você o vê no mapa.</small></p>}
        </section>}
        {!['recusado', 'cancelado'].includes(p.situacao) && <section className="cartao"><ol className="passos">
          {passos.map((x, k) => <li key={k} className={`${k <= pos ? 'feito' : ''} ${k === pos && !final ? 'atual' : ''}`}><span className="bola">{k <= pos ? <Ic n="check" t={16} /> : null}</span><b>{x.t}</b>{k === pos && !final ? <small className="piscando">agora…</small> : k <= pos && <small>{hora(x.h)}</small>}</li>)}
        </ol></section>}
        {['entregue', 'retirado'].includes(p.situacao) && (p.avaliacao ? <section className="cartao" style={{ textAlign: 'center' }}><b>Sua avaliação</b><div className="estrelas-amarelas" style={{ fontSize: 26 }}>{'★'.repeat(p.avaliacao.nota)}{'☆'.repeat(5 - p.avaliacao.nota)}</div>{p.avaliacao.comentario && <p style={{ margin: 0, color: 'var(--suave)' }}>{p.avaliacao.comentario}</p>}</section>
          : <Avaliar token={token} aoAvaliar={() => setVez((x) => x + 1)} />)}
        <section className="cartao">
          <h2 className="cartao-tit">Itens</h2>
          {p.itens.map((i, k) => <div key={k} className="linha-valor" style={{ padding: '6px 0', borderBottom: '1px solid var(--linha)' }}><span><b>{i.qtd}x {i.nome}</b>{[i.detalhes.tamanho && i.detalhes.tamanho !== 'Padrão' ? i.detalhes.tamanho : '', ...(i.detalhes.adicionais || []).map((a) => a.nome), ...(i.detalhes.retirar || []).map((r) => 'sem ' + r.toLowerCase())].filter(Boolean).length > 0 && <small style={{ display: 'block', color: 'var(--suave)' }}>{[i.detalhes.tamanho && i.detalhes.tamanho !== 'Padrão' ? i.detalhes.tamanho : '', ...(i.detalhes.adicionais || []).map((a) => a.nome), ...(i.detalhes.retirar || []).map((r) => 'sem ' + r.toLowerCase())].filter(Boolean).join(' · ')}</small>}</span><span className="num">{brl(i.total)}</span></div>)}
          {p.taxa_entrega > 0 && <div className="linha-valor" style={{ marginTop: 8 }}><span>Taxa de entrega</span><b className="num">{brl(p.taxa_entrega)}</b></div>}
          <div className="total" style={{ fontSize: 22, marginTop: 6 }}><span>Total</span><b className="num">{brl(p.total)}</b></div>
          <p style={{ color: 'var(--suave)', marginBottom: 0 }}>Pagamento na {p.tipo === 'entrega' ? 'entrega' : 'retirada'}: {FORMAS[p.forma]}{p.troco_para ? ` · troco para ${brl(p.troco_para)}` : ''}</p>
          {p.tipo === 'entrega' && p.endereco && <p style={{ color: 'var(--suave)', marginBottom: 0 }}>Entregar em: {p.endereco}</p>}
        </section>
        {p.pode_falar_loja && <ConversaLoja token={token} loja={p.loja} msgs={p.conversa_loja || []} aoEnviar={() => setVez((x) => x + 1)} />}
        <Link className="btn prim bloco grande" to={`/${p.slug}`}><Ic n="sacola" />{final ? 'Pedir de novo' : 'Ver o cardápio'}</Link>
        <Link className="btn bloco" to="/">Ver outras lojas</Link>
      </main>
    </div>
  );
}

/** Depois de entrar: guarda a conta e preenche os dados do pedido. */
function aoEntrarNaConta(c: Conta) {
  gravar((g) => ({ ...g, conta: c, entrada: 'conta', nome: c.nome, telefone: c.telefone, endereco: c.endereco || g.endereco }));
}
/** Junta os pedidos da conta (feitos em outro celular) com os deste celular. */
async function juntarPedidosDaConta() {
  try {
    const r = await get<{ pedidos: { token: string; loja: string; slug: string; criado_em: string }[] }>('/publico/conta/pedidos');
    gravar((g) => { const tem = new Set(g.pedidos.map((p) => p.token)); return { ...g, pedidos: [...g.pedidos, ...r.pedidos.filter((p) => !tem.has(p.token))].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, 30) }; });
  } catch (e) { if (e instanceof ErroApp && e.status === 401) gravar((g) => ({ ...g, conta: null })); }
}

/** Tela de entrada (como a do iFood): já tenho conta, criar conta ou continuar como visitante. */
function BoasVindas({ aoFim }: { aoFim: () => void }) {
  const [modo, setModo] = useState<'' | 'entrar' | 'criar'>('');
  return (
    <div className="pd-entrada">
      <div className="pd-entrada-img"><img src="/img/pedee-entrada.webp" alt="" /><span className="pd-entrada-logo">Pedêê</span><p>Bateu a fome? Pedêê!</p></div>
      <div className="pd-entrada-folha">
        <button className="btn prim grande bloco" onClick={() => setModo('entrar')}>Já tenho uma conta</button>
        <button className="btn grande bloco pd-contorno" onClick={() => setModo('criar')}>Criar nova conta</button>
        <button className="link pd-visitante" onClick={() => { gravar((g) => ({ ...g, entrada: 'visitante' })); aoFim(); }}>Continuar como visitante</button>
      </div>
      {modo && <EntrarConta modo={modo} aoFechar={() => setModo('')} aoEntrar={() => { setModo(''); aoFim(); }} />}
    </div>
  );
}

/** Entrar ou criar conta como no iFood: e-mail → código de 6 números que chega no e-mail → (conta nova) nome e celular. */
function EntrarConta({ modo, aoFechar, aoEntrar }: { modo: 'entrar' | 'criar'; aoFechar: () => void; aoEntrar: () => void }) {
  const g = ler();
  const [passo, setPasso] = useState<'email' | 'codigo' | 'dados'>('email');
  const [f, setF] = useState({ email: '', codigo: '', nome: g.nome, telefone: g.telefone });
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false), [reenviar, setReenviar] = useState(0);
  useEffect(() => { if (reenviar <= 0) return; const t = setTimeout(() => setReenviar(reenviar - 1), 1000); return () => clearTimeout(t); }, [reenviar]);
  const falhou = (e: unknown) => setErro(e instanceof ErroApp && e.campos ? Object.values(e.campos)[0] || msgErro(e) : msgErro(e));
  const pedirCodigo = async () => {
    setOcupado(true); setErro('');
    try { await post('/publico/conta/codigo', { email: f.email }); setPasso('codigo'); setReenviar(60); setF((x) => ({ ...x, codigo: '' })); } catch (e) { falhou(e); } finally { setOcupado(false); }
  };
  const confirmar = async (dados?: boolean) => {
    setOcupado(true); setErro('');
    try {
      const r = await post<{ conta?: Conta; falta?: string }>('/publico/conta/confirmar', { email: f.email, codigo: f.codigo, ...(dados ? { nome: f.nome, telefone: f.telefone } : {}) });
      if (r.falta) { setPasso('dados'); return; }
      aoEntrarNaConta(r.conta!); await juntarPedidosDaConta(); aoEntrar();
    } catch (e) { falhou(e); } finally { setOcupado(false); }
  };
  const digitos = f.codigo.padEnd(6, ' ').split('');
  return (
    <Modal titulo={passo === 'dados' ? 'Falta pouco' : modo === 'entrar' ? 'Entrar na sua conta' : 'Criar sua conta'} aoFechar={aoFechar}>
      {passo === 'email' && <>
        <p style={{ marginTop: 0 }}>Digite o seu e-mail. Vamos mandar um <b>código de 6 números</b> para entrar (não precisa de senha).</p>
        <input type="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); setErro(''); }} inputMode="email" autoComplete="email" placeholder="seunome@email.com" aria-label="E-mail" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') pedirCodigo(); }} />
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="btn prim grande bloco" style={{ marginTop: 12 }} onClick={pedirCodigo} disabled={ocupado || !f.email.includes('@')}>{ocupado ? 'Mandando…' : 'Receber código'}</button>
      </>}
      {passo === 'codigo' && <>
        <p style={{ marginTop: 0 }}>Digite o código de 6 números que enviamos para <b>{f.email.trim().toLowerCase()}</b>. Olhe também a caixa de spam.</p>
        <label className="pd-cod6">
          <input value={f.codigo} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setF({ ...f, codigo: v }); setErro(''); }} inputMode="numeric" autoComplete="one-time-code" autoFocus aria-label="Código de 6 números" />
          {digitos.map((d, k) => <span key={k} className={k === f.codigo.length ? 'atual' : ''}>{d.trim()}</span>)}
        </label>
        {erro && <p className="aviso erro">{erro}</p>}
        <p style={{ color: 'var(--suave)', fontWeight: 700 }}>{reenviar > 0 ? `Para reenviar o código, espere 0:${String(reenviar).padStart(2, '0')}` : <button className="link" onClick={pedirCodigo} disabled={ocupado}>Reenviar código</button>}</p>
        <button className="btn prim grande bloco" onClick={() => confirmar()} disabled={ocupado || f.codigo.length !== 6}>{ocupado ? 'Conferindo…' : 'Continuar'}</button>
        <button className="link bloco" style={{ marginTop: 10 }} onClick={() => { setPasso('email'); setErro(''); }}>Trocar e-mail</button>
      </>}
      {passo === 'dados' && <>
        <p style={{ marginTop: 0 }}>E-mail confirmado! Agora diga como a loja vai te chamar.</p>
        <div className="campos">
          <label className="campo largo">Seu nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" maxLength={60} autoFocus /></label>
          <label className="campo largo">Celular (a loja usa para falar do pedido)<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" /></label>
        </div>
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="btn prim grande bloco" style={{ marginTop: 12 }} onClick={() => confirmar(true)} disabled={ocupado}>{ocupado ? 'Criando…' : 'Criar minha conta'}</button>
      </>}
    </Modal>
  );
}

function App() {
  const loc = useLocation();
  const [entrou, setEntrou] = useState(() => Boolean(ler().entrada));
  useEffect(() => { if (ler().conta) juntarPedidosDaConta(); }, []);
  // Primeira vez no app (na tela inicial): mostra a entrada estilo iFood. Links diretos (loja, pedido) abrem direto.
  if (!entrou && loc.pathname === '/') return <BoasVindas aoFim={() => setEntrou(true)} />;
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/buscar" element={<Buscar />} />
      <Route path="/pedidos" element={<MeusPedidos />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/pedido/:token" element={<Pedido />} />
      <Route path="/culinarias" element={<Culinarias />} />
      <Route path="/culinaria/:tipo" element={<Culinaria />} />
      <Route path="/:slug" element={<Loja />} />
    </Routes>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><BrowserRouter basename="/pedir"><App /></BrowserRouter></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
