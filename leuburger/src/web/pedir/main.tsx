// Pedêê: o app dos clientes. Um app só, com as lanchonetes e restaurantes perto do cliente.
// O link de cada loja (/pedir/<loja>) abre o mesmo app direto naquela loja e guarda em "Minhas lojas".
import { CIDADES_RJ } from '../cidades-rj';
import { alo, faltam, useRelogio } from '../tempo';
import { distanciaKm, Mapa, minutosAte, type DadosMapa } from '../mapa';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { brl, calcularItem, FORMAS, lerValor, type EscolhaItem, type Forma, type Opcoes } from '../../regras/pedido';
import { get, post } from '../api';
import { Modal, msgErro } from '../comuns';
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
interface Guardado {
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
const CATS: [string, string, string][] = [['hamburgueria', 'Hambúrguer', '🍔'], ['pizzaria', 'Pizza', '🍕'], ['lanches', 'Lanches', '🥪'], ['japonesa', 'Japonesa', '🍣'],
  ['restaurante', 'Brasileira', '🍛'], ['marmitaria', 'Marmitas', '🍱'], ['acai', 'Açaí', '🍧'], ['doces', 'Doces', '🍰'], ['pastelaria', 'Pastel', '🥟'], ['bebidas', 'Bebidas', '🥤']];
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
  const [escolherLocal, setEscolherLocal] = useState(false);

  // Abriu o app instalado logo depois de instalar pelo link de uma loja: vai direto para ela.
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('leupede_abrir') || 'null');
      if (a && instalado() && Date.now() - a.em < 30 * 6e4) { localStorage.removeItem('leupede_abrir'); nav('/' + a.slug, { replace: true }); }
    } catch { /* sem armazenamento */ }
  }, [nav]);
  useEffect(() => { if (!g.local && !g.cidade) setEscolherLocal(true); }, [g.local, g.cidade]);

  const lista = (lojas || []).filter((l) => !tipo || l.tipo === tipo);
  const destaques = [...lista].filter((l) => l.aceitando).sort((a, b) => (b.nota || 0) - (a.nota || 0) || b.avaliacoes - a.avaliacoes).slice(0, 8);
  const temTipo = new Set((lojas || []).map((l) => l.tipo));
  const andamento = g.pedidos.filter((p) => Date.now() - new Date(p.criado_em).getTime() < 3 * 3600e3);
  return (
    <div className="pd com-abas">
      <header className="pd-cab">
        <div className="pd-cab-linha"><span className="pd-logo-texto">Pedêê</span><Link className="pd-sino" to="/pedidos" aria-label="Seus pedidos"><Ic n="sino" />{andamento.length > 0 && <i />}</Link></div>
        <button className="pd-endereco" onClick={() => setEscolherLocal(true)}><Ic n="inicio" t={18} /><span><small>Entregar em</small><b>{g.endereco && g.local ? g.endereco : g.local ? 'Perto de você' : g.cidade || 'Escolher local'}</b></span><Ic n="baixo" t={16} /></button>
        <Link className="entrada pd-busca" to="/buscar"><Ic n="busca" /><span>Buscar restaurantes, pratos…</span></Link>
      </header>
      <main className="pd-corpo">
        <div className="pd-cats-icones" role="group" aria-label="Categorias">
          {CATS.map(([t, n, e]) => (
            <button key={t} className={`${tipo === t ? 'sel' : ''} ${lojas && !temTipo.has(t) ? 'apagada' : ''}`} onClick={() => setTipo(tipo === t ? '' : t)}><span>{e}</span>{n}</button>
          ))}
        </div>
        {andamento.length > 0 && <div className="pd-faixa">{andamento.map((p) => <Link key={p.token} className="pd-pedido" to={`/pedido/${p.token}`}><Ic n="sacola" /><span><b>{p.loja}</b><small>Acompanhar pedido</small></span><Ic n="direita" /></Link>)}</div>}
        {!tipo && <div className="pd-banner"><div><b>Os melhores sabores perto de você</b><span>Peça e acompanhe a entrega em tempo real</span></div><img src="/img/hamburguer.webp" alt="" /></div>}
        {erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div> : !lista.length ? (
          <div className="vazio"><span style={{ fontSize: 40 }}>{tipo ? EMOJI[tipo] : '🍽️'}</span><b>{tipo ? 'Nenhuma loja desse tipo por aqui ainda' : 'Nenhuma loja por aqui ainda'}</b>
            <span>{tipo ? 'Veja as outras categorias.' : `Estamos chegando! Peça para a sua lanchonete preferida entrar no ${NOME_APP}.`}</span>
            {tipo ? <button className="btn" onClick={() => setTipo('')}>Ver todas</button> : <button className="btn" onClick={() => setEscolherLocal(true)}>Mudar o local</button>}</div>
        ) : <>
          {destaques.length > 0 && <section>
            <h2 className="pd-tit pd-tit-linha">{tipo ? CATS.find((c) => c[0] === tipo)?.[1] : 'Lojas em destaque'}</h2>
            <div className="pd-faixa pd-destaques">{destaques.map((l) => (
              <Link key={l.slug} className="pd-dest" to={`/${l.slug}`}>
                <div className="pd-dest-img"><Capa l={l} /><Logo l={l} t={42} /></div>
                <b>{l.nome}</b>
                <small><Estrelas nota={l.nota} total={l.avaliacoes} /> · {l.tipo_nome}</small>
                <small>{l.tempo_entrega ? `${l.tempo_entrega} · ` : ''}{entregaTexto(l)}</small>
              </Link>
            ))}</div>
          </section>}
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
  return (
    <div className="pd com-abas">
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto">Buscar</span></div>
        <span className="entrada pd-busca"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome da loja, pizza, açaí, marmita…" aria-label="Buscar" autoFocus /></span></header>
      <main className="pd-corpo">
        {!busca.trim() && <div className="pd-cats-grade">{CATS.map(([t, n, e]) => <button key={t} onClick={() => setBusca(n)}><span>{e}</span>{n}</button>)}</div>}
        {busca.trim() && (erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div>
          : !lojas.length ? <div className="vazio"><Ic n="busca" t={36} /><b>Nada encontrado por aqui</b></div> : <div className="pd-lojas">{lojas.map((l) => <CartaoLoja key={l.slug} l={l} />)}</div>)}
      </main>
      <Abas />
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
  const salvar = () => { gravar((x) => ({ ...x, ...f })); setGEstado(ler()); setSalvo(true); setTimeout(() => setSalvo(false), 2000); };
  return (
    <div className="pd com-abas">
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto">Perfil</span></div></header>
      <main className="pd-corpo">
        <section className="cartao">
          <h2 className="cartao-tit">Seus dados</h2>
          <p style={{ margin: '0 0 10px', color: 'var(--suave)', fontSize: 14 }}>Ficam só neste celular e já vêm preenchidos no pedido.</p>
          <div className="campos">
            <label className="campo">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" /></label>
            <label className="campo">WhatsApp<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} inputMode="tel" autoComplete="tel" /></label>
            <label className="campo largo">Endereço de entrega<input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} autoComplete="street-address" placeholder="Rua, número, bairro e referência" /></label>
          </div>
          <button className="btn prim bloco" style={{ marginTop: 12 }} onClick={salvar}>{salvo ? '✓ Salvo' : 'Salvar'}</button>
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
  const [escolher, setEscolher] = useState<{ p: Produto; item?: ItemCarrinho } | null>(null);
  const [carrinho, setCarrinhoEstado] = useState<ItemCarrinho[]>(() => lerCarrinho(slug));
  const [verCarrinho, setVerCarrinho] = useState(false);
  const [verAvaliacoes, setVerAvaliacoes] = useState(false);
  const [fav, setFav] = useState(() => ler().favoritos.includes(slug));
  const alternarFav = () => { gravar((x) => ({ ...x, favoritos: x.favoritos.includes(slug) ? x.favoritos.filter((y) => y !== slug) : [slug, ...x.favoritos] })); setFav(!fav); };
  const setCarrinho = (c: ItemCarrinho[]) => { setCarrinhoEstado(c); gravarCarrinho(slug, c); };

  useEffect(() => {
    const g = ler();
    get<{ loja: LojaCompleta; categorias: Categoria[]; produtos: Produto[] }>(`/publico/app/loja/${encodeURIComponent(slug)}?${qs({ lat: g.local?.lat, lng: g.local?.lng })}`)
      .then((r) => {
        setDados(r); document.title = `${r.loja.nome} · ${NOME_APP}`;
        // Guarda em "Minhas lojas" (a mais recente primeiro).
        gravar((x) => ({ ...x, lojas: [{ slug, nome: r.loja.nome, logo_id: r.loja.logo_id, tipo: r.loja.tipo }, ...x.lojas.filter((l) => l.slug !== slug)].slice(0, 12) }));
        // Se instalar agora pelo navegador, o app abre direto aqui.
        if (!instalado()) try { localStorage.setItem('leupede_abrir', JSON.stringify({ slug, em: Date.now() })); } catch { /* sem armazenamento */ }
      }).catch((e) => setErro(msgErro(e)));
  }, [slug]);

  const porId = useMemo(() => new Map((dados?.produtos || []).map((p) => [p.id, p])), [dados]);
  const linhas = carrinho.flatMap((i) => { const p = porId.get(i.produtoId); if (!p) return []; try { return [{ i, p, c: calcularItem(p, i) }]; } catch { return []; } });
  const subtotal = linhas.reduce((s, l) => s + l.c.total, 0), qtd = linhas.reduce((s, l) => s + l.c.qtd, 0);

  if (erro) return <div className="pd"><TopoVoltar titulo="Loja" /><main className="pd-corpo"><div className="vazio"><Ic n="loja" t={40} /><b>{erro}</b><Link className="btn" to="/">Ver outras lojas</Link></div></main></div>;
  if (!dados) return <div className="pd"><TopoVoltar titulo="" /><div className="carregando"><div className="giro" /></div></div>;
  const { loja: l, categorias, produtos } = dados;
  const q = busca.trim().toLowerCase();
  const visiveis = produtos.filter((p) => (!cat || p.categoria_id === cat) && (!q || p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q)));
  const adicionar = (p: Produto) => {
    if (p.opcoes?.tamanhos?.length || p.opcoes?.adicionais?.length || p.opcoes?.retirar?.length) return setEscolher({ p });
    const igual = carrinho.find((i) => i.produtoId === p.id && !i.adicionais?.length && !i.retirar?.length && !i.observacao && !i.tamanho);
    setCarrinho(igual ? carrinho.map((i) => (i === igual ? { ...i, qtd: Math.min(99, i.qtd + 1) } : i)) : [...carrinho, { chave: novaChave(), produtoId: p.id, qtd: 1 }]);
  };
  const capa = foto(l.capa_id) || CAPA_TIPO[l.tipo];
  return (
    <div className="pd">
      <TopoVoltar titulo={l.nome} compartilhar={`${location.origin}/pedir/${slug}`} />
      <div className="pd-capa" style={capa ? { backgroundImage: `url(${capa})` } : undefined} />
      <section className="pd-cab-loja">
        <Logo l={l} t={72} />
        <div><h1>{l.nome}</h1><p>{l.tipo_nome}{l.distancia != null ? ` · ${l.distancia.toLocaleString('pt-BR')} km` : ''}{l.cidade ? ` · ${l.cidade}` : ''}</p>
          <button className="pd-nota-btn" onClick={() => setVerAvaliacoes(true)}><Estrelas nota={l.nota} total={l.avaliacoes} />{l.avaliacoes > 0 && <span> · ver avaliações</span>}</button></div>
        <button className={`pd-fav ${fav ? 'sim' : ''}`} onClick={alternarFav} aria-label={fav ? 'Tirar das favoritas' : 'Guardar nas favoritas'} aria-pressed={fav}>{fav ? '❤️' : '🤍'}</button>
      </section>
      <main className="pd-corpo" style={{ paddingTop: 0 }}>
        {l.descricao && <p style={{ margin: 0, color: 'var(--suave)' }}>{l.descricao}</p>}
        <div className="pd-infos">
          <span className={l.aceitando ? 'aberta' : 'fechado'}>{l.aceitando ? 'Aberta' : 'Fechada agora'}</span>
          {l.tempo_entrega && <span><Ic n="calendario" t={15} />{l.tempo_entrega}</span>}
          {l.faz_entrega && <span><Ic n="seta" t={15} />{l.entrega_aqui ? (l.taxa_entrega ? `Entrega ${brl(l.taxa_entrega)}` : 'Entrega grátis') : 'Fora da área de entrega'}</span>}
          {l.pedido_minimo > 0 && <span>Mínimo {brl(l.pedido_minimo)}</span>}
        </div>
        {!l.aceitando && <p className="aviso">A loja não está recebendo pedidos agora. Você pode olhar o cardápio e pedir quando ela abrir.</p>}
        <span className="entrada"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no cardápio…" aria-label="Buscar no cardápio" /></span>
        {!q && categorias.length > 1 && <div className="chips pd-cats" role="group" aria-label="Categorias">
          <button className={`chip ${!cat ? 'sel' : ''}`} onClick={() => setCat('')}>Tudo</button>
          {categorias.map((c) => <button key={c.id} className={`chip ${cat === c.id ? 'sel' : ''}`} onClick={() => setCat(c.id)}><Ic n={c.icone} t={16} />{c.nome}</button>)}
        </div>}
        {(cat || q ? [{ id: 'x', nome: '', icone: '' }] : categorias).map((c) => {
          const itens = cat || q ? visiveis : visiveis.filter((p) => p.categoria_id === c.id);
          if (!itens.length) return null;
          return (
            <section key={c.id}>
              {c.nome && <h2 className="pd-tit">{c.nome}</h2>}
              <div className="pd-cardapio">{itens.map((p) => (
                <button key={p.id} className="pd-prod" onClick={() => adicionar(p)} aria-label={`${p.nome}, ${brl(p.preco)}`}>
                  <span className="pd-prod-txt"><b>{p.nome}</b>{p.descricao && <small>{p.descricao}</small>}<span className="num">{p.opcoes?.tamanhos?.length ? 'a partir de ' : ''}{brl(Math.min(p.preco, ...(p.opcoes?.tamanhos || []).map((t) => t.preco)))}</span></span>
                  <FotoItem p={p} className="pd-prod-foto" />
                </button>
              ))}</div>
            </section>
          );
        })}
        {!visiveis.length && <div className="vazio"><Ic n="busca" t={36} /><b>Nada encontrado</b></div>}
        <div style={{ height: qtd ? 90 : 20 }} />
      </main>
      {qtd > 0 && <button className="pd-barra-carrinho" onClick={() => setVerCarrinho(true)}><span className="selo">{qtd}</span><b>Ver carrinho</b><span className="num">{brl(subtotal)}</span></button>}
      {verAvaliacoes && <Avaliacoes slug={slug} aoFechar={() => setVerAvaliacoes(false)} />}
      {escolher && <Escolher produto={escolher.p} item={escolher.item} aoFechar={() => setEscolher(null)} aoSalvar={(it) => {
        setCarrinho(escolher.item ? carrinho.map((x) => (x.chave === escolher.item!.chave ? it : x)) : [...carrinho, it]); setEscolher(null);
      }} />}
      {verCarrinho && <Carrinho loja={l} slug={slug} linhas={linhas} subtotal={subtotal} aoFechar={() => setVerCarrinho(false)}
        mudarQtd={(chave, n) => setCarrinho(n <= 0 ? carrinho.filter((x) => x.chave !== chave) : carrinho.map((x) => (x.chave === chave ? { ...x, qtd: Math.min(99, n) } : x)))}
        editar={(i) => { const p = porId.get(i.produtoId); if (p) { setVerCarrinho(false); setEscolher({ p, item: i }); } }}
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

function Escolher({ produto: p, item, aoFechar, aoSalvar }: { produto: Produto; item?: ItemCarrinho; aoFechar: () => void; aoSalvar: (i: ItemCarrinho) => void }) {
  const op = p.opcoes || {};
  const [tamanho, setTamanho] = useState(item?.tamanho || op.tamanhos?.[0]?.nome || null);
  const [adic, setAdic] = useState<string[]>(item?.adicionais || []);
  const [ret, setRet] = useState<string[]>(item?.retirar || []);
  const [obs, setObs] = useState(item?.observacao || '');
  const [qtd, setQtd] = useState(item?.qtd || 1);
  const alternar = (l: string[], set: (x: string[]) => void, v: string) => set(l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
  const novo: ItemCarrinho = { chave: item?.chave || novaChave(), produtoId: p.id, qtd, tamanho, adicionais: adic, retirar: ret, observacao: obs.trim() || undefined };
  let total = 0; try { total = calcularItem(p, novo).total; } catch { /* opção que saiu do cardápio */ }
  return (
    <Modal titulo={p.nome} aoFechar={aoFechar}>
      <div className="personalizar pd-escolher">
        <div><FotoItem p={p} className="foto-grande" />{p.descricao && <p style={{ color: 'var(--suave)' }}>{p.descricao}</p>}</div>
        <div>
          {!!op.tamanhos?.length && <><h3>Tamanho</h3><div className="opcoes-tamanho">{op.tamanhos.map((t) => <button key={t.nome} className={`opcao-t ${tamanho === t.nome ? 'sel' : ''}`} onClick={() => setTamanho(t.nome)}>{t.nome}<small className="num">{brl(t.preco)}</small></button>)}</div></>}
          {!!op.adicionais?.length && <><h3>Adicionais</h3>{op.adicionais.map((a) => (
            <label key={a.nome} className="marcar"><input type="checkbox" checked={adic.includes(a.nome)} onChange={() => alternar(adic, setAdic, a.nome)} /><span>{a.nome}</span><small className="num">+ {brl(a.preco)}</small></label>
          ))}</>}
          {!!op.retirar?.length && <><h3>Retirar</h3>{op.retirar.map((r) => (
            <label key={r} className="marcar"><input type="checkbox" checked={ret.includes(r)} onChange={() => alternar(ret, setRet, r)} /><span>Sem {r.toLowerCase()}</span></label>
          ))}</>}
          <h3>Alguma observação?</h3>
          <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 150))} placeholder="Ex.: ponto da carne, molho à parte" aria-label="Observação" />
          <div className="rodape-fixo"><h3>Quantidade</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="qtd"><button onClick={() => setQtd(Math.max(1, qtd - 1))} aria-label="Menos"><Ic n="menos" /></button><span className="num" style={{ minWidth: 40 }}>{qtd}</span><button onClick={() => setQtd(Math.min(99, qtd + 1))} aria-label="Mais"><Ic n="mais" /></button></span>
              <button className="btn prim grande" style={{ flex: '1 1 220px' }} onClick={() => aoSalvar(novo)}><Ic n="sacola" />{item ? 'Atualizar' : 'Adicionar'}<span className="num" style={{ marginLeft: 'auto' }}>{brl(total)}</span></button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const textoEscolhas = (i: EscolhaItem) => [i.tamanho && i.tamanho !== 'Padrão' ? i.tamanho : '', (i.adicionais || []).join(', '), (i.retirar || []).map((r) => 'sem ' + r.toLowerCase()).join(', '), i.observacao || ''].filter(Boolean).join(' · ');

function Carrinho({ loja: l, slug, linhas, subtotal, aoFechar, mudarQtd, editar, aoPedir }: {
  loja: LojaCompleta; slug: string; linhas: { i: ItemCarrinho; p: Produto; c: ReturnType<typeof calcularItem> }[]; subtotal: number;
  aoFechar: () => void; mudarQtd: (chave: string, n: number) => void; editar: (i: ItemCarrinho) => void; aoPedir: (token: string) => void;
}) {
  const g = ler();
  const podeEntregar = l.faz_entrega && l.entrega_aqui;
  const [f, setF] = useState({ nome: g.nome, telefone: g.telefone, endereco: g.endereco, tipo: (podeEntregar ? 'entrega' : 'balcao') as 'entrega' | 'balcao', forma: (l.formas[0] || 'pix') as Forma, troco: '', obs: '' });
  const [erro, setErro] = useState(''), [enviando, setEnviando] = useState(false);
  const [chave] = useState(novaChave);
  const taxa = f.tipo === 'entrega' ? l.taxa_entrega : 0, total = subtotal + taxa;
  const falta = Math.max(0, l.pedido_minimo - subtotal);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErro(''); };
  const enviar = async () => {
    if (!l.aceitando) return setErro('A loja está fechada agora.');
    if (falta > 0) return setErro(`Faltam ${brl(falta)} para o pedido mínimo.`);
    if (f.nome.trim().length < 2) return setErro('Digite seu nome.');
    const tel = f.telefone.replace(/\D/g, '');
    if (tel.length < 10 || tel.length > 13) return setErro('Digite seu WhatsApp com DDD.');
    if (f.tipo === 'entrega' && f.endereco.trim().length < 5) return setErro('Digite o endereço da entrega (rua, número, bairro).');
    const troco = f.forma === 'dinheiro' && f.troco.trim() ? lerValor(f.troco) : null;
    if (troco != null && (Number.isNaN(troco) || troco < total)) return setErro(`O troco precisa ser para um valor maior que ${brl(total)}.`);
    setEnviando(true); setErro('');
    try {
      const dest = f.tipo === 'entrega' ? (ler().local || await procurarEndereco(`${f.endereco.trim()}, ${l.cidade || ''}, ${l.uf || 'RJ'}, Brasil`)) : null;
      const r = await post<{ token: string }>(`/publico/app/loja/${encodeURIComponent(slug)}/pedido`, {
        lat: dest?.lat ?? null, lng: dest?.lng ?? null, chave, nome: f.nome.trim(), telefone: f.telefone.trim(), tipo: f.tipo, endereco: f.tipo === 'entrega' ? f.endereco.trim() : null, forma: f.forma, trocoPara: troco, observacao: f.obs.trim() || null,
        itens: linhas.map(({ i }) => ({ produtoId: i.produtoId, qtd: i.qtd, tamanho: i.tamanho ?? null, adicionais: i.adicionais || [], retirar: i.retirar || [], observacao: i.observacao })),
      });
      gravar((x) => ({ ...x, nome: f.nome.trim(), telefone: f.telefone.trim(), endereco: f.tipo === 'entrega' ? f.endereco.trim() : x.endereco,
        pedidos: [{ token: r.token, loja: l.nome, slug, criado_em: new Date().toISOString() }, ...x.pedidos.filter((p) => p.token !== r.token)].slice(0, 30) }));
      aoPedir(r.token);
    } catch (e) { setErro(msgErro(e)); } finally { setEnviando(false); }
  };
  return (
    <Modal titulo="Seu pedido" aoFechar={aoFechar}>
      <div className="pd-carrinho">
        {linhas.map(({ i, p, c }) => (
          <div className="c-item" key={i.chave}>
            <FotoItem p={p} />
            <div><b>{p.nome}</b>{textoEscolhas(i) && <small>{textoEscolhas(i)}</small>}{(p.opcoes?.tamanhos?.length || p.opcoes?.adicionais?.length || p.opcoes?.retirar?.length) ? <button className="link" onClick={() => editar(i)}>Mudar</button> : null}</div>
            <div className="lado"><span className="qtd"><button onClick={() => mudarQtd(i.chave, i.qtd - 1)} aria-label="Menos">{i.qtd === 1 ? <Ic n="lixeira" t={16} /> : <Ic n="menos" t={16} />}</button><span>{i.qtd}</span><button onClick={() => mudarQtd(i.chave, i.qtd + 1)} aria-label="Mais"><Ic n="mais" t={16} /></button></span><b className="num">{brl(c.total)}</b></div>
          </div>
        ))}
        {!linhas.length && <p>O carrinho está vazio.</p>}
      </div>
      {linhas.length > 0 && <>
        <h3 className="pd-sub">Como quer receber?</h3>
        <div className="chips" role="radiogroup">
          {l.faz_entrega && <button role="radio" aria-checked={f.tipo === 'entrega'} disabled={!l.entrega_aqui} className={`chip ${f.tipo === 'entrega' ? 'sel' : ''}`} onClick={() => setF({ ...f, tipo: 'entrega' })}><Ic n="seta" t={16} />Entrega{l.taxa_entrega ? ` · ${brl(l.taxa_entrega)}` : ' grátis'}</button>}
          {l.faz_retirada && <button role="radio" aria-checked={f.tipo === 'balcao'} className={`chip ${f.tipo === 'balcao' ? 'sel' : ''}`} onClick={() => setF({ ...f, tipo: 'balcao' })}><Ic n="loja" t={16} />Retirar na loja</button>}
        </div>
        {l.faz_entrega && !l.entrega_aqui && <p className="aviso" style={{ marginTop: 8 }}>Você está fora da área de entrega desta loja. Dá para retirar no local.</p>}
        {f.tipo === 'balcao' && l.endereco && <p style={{ color: 'var(--suave)', margin: '8px 0 0' }}>Retirar em: {l.endereco}</p>}
        <div className="campos" style={{ marginTop: 12 }}>
          <label className="campo">Seu nome<input value={f.nome} onChange={muda('nome')} maxLength={60} autoComplete="name" /></label>
          <label className="campo">WhatsApp<input value={f.telefone} onChange={muda('telefone')} inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" /></label>
          {f.tipo === 'entrega' && <label className="campo largo">Endereço da entrega<input value={f.endereco} onChange={muda('endereco')} maxLength={200} autoComplete="street-address" placeholder="Rua, número, bairro e referência" /></label>}
        </div>
        <h3 className="pd-sub">Pagamento <small style={{ color: 'var(--suave)', fontWeight: 500 }}>(na entrega ou na retirada)</small></h3>
        <div className="chips" role="radiogroup">{l.formas.map((x) => <button key={x} role="radio" aria-checked={f.forma === x} className={`chip ${f.forma === x ? 'sel' : ''}`} onClick={() => setF({ ...f, forma: x })}>{FORMAS[x]}</button>)}</div>
        {f.forma === 'dinheiro' && <label className="campo" style={{ marginTop: 10 }}>Troco para quanto? (deixe vazio se não precisar)<input value={f.troco} onChange={muda('troco')} inputMode="decimal" placeholder="Ex.: 50,00" /></label>}
        <label className="campo" style={{ marginTop: 10 }}>Observação para a loja (opcional)<input value={f.obs} onChange={muda('obs')} maxLength={200} placeholder="Ex.: interfone 12, sem talher" /></label>
        <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(subtotal)}</b></div>
          {f.tipo === 'entrega' && <div className="linha-valor"><span>Taxa de entrega</span><b className="num">{taxa ? brl(taxa) : 'Grátis'}</b></div>}
          <div className="total laranja"><span>Total</span><b className="num">{brl(total)}</b></div>
          {falta > 0 && <p className="aviso" style={{ margin: 0 }}>Pedido mínimo {brl(l.pedido_minimo)}: faltam {brl(falta)}.</p>}
        </div>
        {erro && <p className="aviso erro" role="alert">{erro}</p>}
        <button className="btn prim grande bloco" style={{ marginTop: 12 }} onClick={enviar} disabled={enviando || !l.aceitando}><Ic n="check" />{enviando ? 'Enviando…' : l.aceitando ? `Fazer pedido · ${brl(total)}` : 'Loja fechada agora'}</button>
      </>}
    </Modal>
  );
}

// ---------- acompanhamento do pedido ----------
interface Acomp {
  loja: string; slug: string; loja_telefone: string | null; numero: number | null; situacao: string; motivo_recusa: string | null; tipo: 'entrega' | 'balcao'; endereco: string | null;
  forma: Forma; troco_para: number | null; itens: { nome: string; qtd: number; total: number; detalhes: { tamanho?: string; adicionais?: { nome: string }[]; retirar?: string[]; observacao?: string } }[];
  subtotal: number; taxa_entrega: number; total: number; criado_em: string; respondido_em: string | null; pronto_em: string | null; saiu_em: string | null; finalizado_em: string | null; entregador: string | null;
  avaliacao: { nota: number; comentario: string | null } | null; mapa: DadosMapa | null; cancelar_ate: string | null; cancelado_pelo_cliente: boolean; codigo_entrega: string | null; entregador_foto: string | null;
  mensagens: { de: 'entregador' | 'cliente'; texto: string; criado_em: string }[]; pode_conversar: boolean;
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
  const antes = useRef<string | null>(null), msgs = useRef<number | null>(null);
  const [texto, setTexto] = useState('');
  const responder = async (t: string) => { if (!t.trim()) return; try { await post(`/publico/app/pedido/${encodeURIComponent(token)}/mensagem`, { texto: t.trim() }); setTexto(''); setVez((x) => x + 1); } catch (e) { setErro(msgErro(e)); } };
  useEffect(() => {
    let parar = false;
    const carregar = () => get<{ pedido: Acomp }>(`/publico/app/pedido/${encodeURIComponent(token)}`).then((r) => {
      if (parar) return;
      const nova = r.pedido.situacao;
      if (antes.current && antes.current !== nova && AVISO[nova]) { setAviso(AVISO[nova]); alo(); setTimeout(() => setAviso(''), 9000); }
      const doEntregador = r.pedido.mensagens.filter((m) => m.de === 'entregador');
      if (msgs.current != null && doEntregador.length > msgs.current) { setAviso(`💬 Entregador: ${doEntregador[doEntregador.length - 1].texto}`); alo(); setTimeout(() => setAviso(''), 12000); }
      msgs.current = doEntregador.length;
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
    if (!confirm('Cancelar este pedido?')) return;
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
  const tel = (p.loja_telefone || '').replace(/\D/g, '');
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
        {faltam(p.cancelar_ate) && <section className="cartao" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px' }}>Mudou de ideia? Você pode cancelar por mais <b>{faltam(p.cancelar_ate)}</b>.</p>
          <button className="btn bloco" onClick={cancelar} disabled={cancelando}>Cancelar pedido</button>
        </section>}
        {p.codigo_entrega && <section className="cartao pd-codigo">
          <small>Código de entrega</small><b>{p.codigo_entrega}</b>
          <span>Passe este código ao entregador <u>só quando receber</u> o pedido. Sem ele a entrega não é confirmada.</span>
        </section>}
        {p.pode_conversar && <section className="cartao pd-entregador">
          <div className="pd-ent-topo">{p.entregador_foto ? <img src={p.entregador_foto} alt="" /> : <span className="pd-ent-sem">🛵</span>}<div><small>Seu entregador</small><b>{p.entregador || 'Entregador'}</b></div></div>
          {p.mensagens.length > 0 && <div className="pd-chat">{p.mensagens.map((m, k) => <p key={k} className={m.de === 'cliente' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}</div>}
          <div className="pd-rapidas">{['👍 Já estou descendo', '🏢 Pode deixar na portaria', '⏳ Estou aguardando'].map((t) => <button key={t} className="chip" onClick={() => responder(t)}>{t}</button>)}</div>
          <div className="pd-chat-enviar"><input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Mensagem para o entregador" aria-label="Mensagem para o entregador" onKeyDown={(e) => { if (e.key === 'Enter') responder(texto); }} /><button className="btn prim" onClick={() => responder(texto)} disabled={!texto.trim()}>Enviar</button></div>
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
        {tel && <a className="btn bloco grande" href={`https://wa.me/${tel.length <= 11 ? '55' + tel : tel}?text=${encodeURIComponent(`Olá! Sobre o meu pedido${p.numero ? ' #' + p.numero : ''} pelo ${NOME_APP}…`)}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Falar com a loja</a>}
        <Link className="btn prim bloco grande" to={`/${p.slug}`}><Ic n="sacola" />{final ? 'Pedir de novo' : 'Ver o cardápio'}</Link>
        <Link className="btn bloco" to="/">Ver outras lojas</Link>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/buscar" element={<Buscar />} />
      <Route path="/pedidos" element={<MeusPedidos />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/pedido/:token" element={<Pedido />} />
      <Route path="/:slug" element={<Loja />} />
    </Routes>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><BrowserRouter basename="/pedir"><App /></BrowserRouter></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
