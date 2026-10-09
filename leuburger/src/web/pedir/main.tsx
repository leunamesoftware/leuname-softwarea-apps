// LeuPede: o app dos clientes. Um app só, com as lanchonetes e restaurantes perto do cliente.
// O link de cada loja (/pedir/<loja>) abre o mesmo app direto naquela loja e guarda em "Minhas lojas".
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { brl, calcularItem, FORMAS, lerValor, type EscolhaItem, type Forma, type Opcoes } from '../../regras/pedido';
import { get, post } from '../api';
import { Modal, msgErro } from '../comuns';
import { Ic } from '../icones';
import '../estilo.css';
import './pedir.css';

export const NOME_APP = 'LeuPede';

// ---------- tipos ----------
interface LojaCartao {
  slug: string; nome: string; tipo: string; tipo_nome: string; descricao: string | null; logo_id: string | null; capa_id: string | null; cidade: string | null; uf: string | null;
  aceitando: boolean; tempo_entrega: string | null; taxa_entrega: number; pedido_minimo: number; faz_entrega: boolean; faz_retirada: boolean; distancia: number | null; entrega_aqui: boolean;
}
interface LojaCompleta extends LojaCartao { telefone: string | null; endereco: string | null; formas: Forma[] }
interface Produto { id: string; categoria_id: string; nome: string; descricao: string | null; preco: number; foto_id: string | null; categoria_icone: string | null; opcoes: Opcoes }
interface Categoria { id: string; nome: string; icone: string }
interface ItemCarrinho extends EscolhaItem { chave: string }

// ---------- guardado no aparelho ----------
interface Guardado {
  nome: string; telefone: string; endereco: string;
  local: { lat: number; lng: number } | null; cidade: string;
  lojas: { slug: string; nome: string; logo_id: string | null; tipo: string }[];
  pedidos: { token: string; loja: string; slug: string; criado_em: string }[];
}
const CHAVE = 'leupede';
function ler(): Guardado {
  const vazio: Guardado = { nome: '', telefone: '', endereco: '', local: null, cidade: '', lojas: [], pedidos: [] };
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

// ---------- início: lojas perto ----------
function Inicio() {
  const nav = useNavigate();
  const [g, setG] = useState(ler);
  const [lojas, setLojas] = useState<LojaCartao[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [escolherLocal, setEscolherLocal] = useState(false);

  // Abriu o app instalado logo depois de instalar pelo link de uma loja: vai direto para ela.
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem('leupede_abrir') || 'null');
      if (a && instalado() && Date.now() - a.em < 30 * 6e4) { localStorage.removeItem('leupede_abrir'); nav('/' + a.slug, { replace: true }); }
    } catch { /* sem armazenamento */ }
  }, [nav]);

  useEffect(() => {
    if (!g.local && !g.cidade) { setEscolherLocal(true); return; }
    setLojas(null);
    get<{ lojas: LojaCartao[] }>(`/publico/app/lojas?${qs({ lat: g.local?.lat, lng: g.local?.lng, cidade: g.cidade, busca: busca.trim() })}`)
      .then((r) => { setLojas(r.lojas); setErro(''); }).catch((e) => setErro(msgErro(e)));
  }, [g.local, g.cidade, busca]);

  const tipos = useMemo(() => [...new Map((lojas || []).map((l) => [l.tipo, l.tipo_nome])).entries()], [lojas]);
  const lista = (lojas || []).filter((l) => !tipo || l.tipo === tipo);
  const andamento = g.pedidos.filter((p) => Date.now() - new Date(p.criado_em).getTime() < 6 * 3600e3);
  return (
    <div className="pd">
      <header className="pd-topo">
        <span className="pd-marca"><img src="/pedir-icone-64.png" alt="" />{NOME_APP}</span>
        <button className="pd-local" onClick={() => setEscolherLocal(true)}><Ic n="inicio" t={16} />{g.local ? 'Perto de você' : g.cidade || 'Escolher local'}<Ic n="baixo" t={16} /></button>
      </header>
      <main className="pd-corpo">
        <span className="entrada pd-busca"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar loja, lanche, pizza, marmita…" aria-label="Buscar" /></span>
        {andamento.length > 0 && <section>
          <h2 className="pd-tit">Seus pedidos de hoje</h2>
          <div className="pd-faixa">{andamento.map((p) => <Link key={p.token} className="pd-pedido" to={`/pedido/${p.token}`}><Ic n="sacola" /><span><b>{p.loja}</b><small>Ver andamento</small></span><Ic n="direita" /></Link>)}</div>
        </section>}
        {g.lojas.length > 0 && <section>
          <h2 className="pd-tit">Minhas lojas</h2>
          <div className="pd-faixa">{g.lojas.map((l) => <Link key={l.slug} className="pd-minha" to={`/${l.slug}`}><Logo l={l} t={60} /><span>{l.nome}</span></Link>)}</div>
        </section>}
        {tipos.length > 1 && <div className="chips" role="group" aria-label="Tipo de loja">
          <button className={`chip ${!tipo ? 'sel' : ''}`} onClick={() => setTipo('')}>Todas</button>
          {tipos.map(([v, n]) => <button key={v} className={`chip ${tipo === v ? 'sel' : ''}`} onClick={() => setTipo(v)}>{n}</button>)}
        </div>}
        <h2 className="pd-tit">{g.local ? 'Lojas perto de você' : `Lojas em ${g.cidade || 'sua cidade'}`}</h2>
        {erro ? <p className="aviso erro">{erro}</p> : lojas == null ? <div className="carregando"><div className="giro" /></div> : !lista.length ? (
          <div className="vazio"><Ic n="loja" t={40} /><b>Nenhuma loja por aqui ainda</b><span>Tente outra cidade, ou peça para a sua lanchonete preferida entrar no {NOME_APP}.</span><button className="btn" onClick={() => setEscolherLocal(true)}>Mudar o local</button></div>
        ) : <div className="pd-lojas">{lista.map((l) => <CartaoLoja key={l.slug} l={l} />)}</div>}
      </main>
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
        <small>{l.tipo_nome}{l.distancia != null ? ` · ${l.distancia.toLocaleString('pt-BR')} km` : ''}{l.tempo_entrega ? ` · ${l.tempo_entrega}` : ''}</small>
        <small>{!l.aceitando ? <span className="fechado">Fechada agora</span> : l.entrega_aqui ? (l.taxa_entrega ? `Entrega ${brl(l.taxa_entrega)}` : <span className="gratis">Entrega grátis</span>) : 'Só retirada no local'}</small>
      </span>
      <Ic n="direita" />
    </Link>
  );
}

function EscolherLocal({ aoFechar, podeFechar }: { aoFechar: (mudou: boolean) => void; podeFechar: boolean }) {
  const [cidades, setCidades] = useState<{ cidade: string; uf: string | null; lojas: number }[]>([]);
  const [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
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
      {cidades.length > 0 && <>
        <p style={{ color: 'var(--suave)', margin: '16px 0 8px' }}>Ou escolha a cidade:</p>
        <div className="lista-config">{cidades.map((c) => (
          <div key={c.cidade + c.uf}><span>{c.cidade}{c.uf ? ` - ${c.uf}` : ''}</span><button className="btn peq" onClick={() => { gravar((g) => ({ ...g, cidade: c.cidade, local: null })); aoFechar(true); }}>{c.lojas} {c.lojas === 1 ? 'loja' : 'lojas'}</button></div>
        ))}</div>
      </>}
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
        <div><h1>{l.nome}</h1><p>{l.tipo_nome}{l.distancia != null ? ` · ${l.distancia.toLocaleString('pt-BR')} km` : ''}{l.cidade ? ` · ${l.cidade}` : ''}</p></div>
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
      const r = await post<{ token: string }>(`/publico/app/loja/${encodeURIComponent(slug)}/pedido`, {
        chave, nome: f.nome.trim(), telefone: f.telefone.trim(), tipo: f.tipo, endereco: f.tipo === 'entrega' ? f.endereco.trim() : null, forma: f.forma, trocoPara: troco, observacao: f.obs.trim() || null,
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
}
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const TITULO: Record<string, string> = {
  aguardando: 'Esperando a loja aceitar…', preparando: 'Pedido aceito! Em preparo 👨‍🍳', pronto: 'Pedido pronto!', a_caminho: 'Saiu para entrega! 🛵',
  entregue: 'Pedido entregue. Bom apetite! 😋', retirado: 'Pedido retirado. Bom apetite! 😋', recusado: 'A loja não pôde aceitar', cancelado: 'Pedido cancelado pela loja',
};

function Pedido() {
  const { token = '' } = useParams();
  const [p, setP] = useState<Acomp | null>(null), [erro, setErro] = useState('');
  useEffect(() => {
    let parar = false;
    const carregar = () => get<{ pedido: Acomp }>(`/publico/app/pedido/${encodeURIComponent(token)}`).then((r) => { if (!parar) { setP(r.pedido); setErro(''); } }).catch((e) => setErro(msgErro(e)));
    carregar();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 10000);
    return () => { parar = true; clearInterval(t); };
  }, [token]);
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
        <section className="cartao" style={{ textAlign: 'center' }}>
          <small style={{ color: 'var(--suave)' }}>{p.numero ? `Pedido #${p.numero}` : 'Seu pedido'} · {p.loja}</small>
          <h1 style={{ margin: '6px 0 0', fontSize: 24 }}>{TITULO[p.situacao] || p.situacao}</h1>
          {p.situacao === 'recusado' && p.motivo_recusa && <p className="aviso erro" style={{ marginBottom: 0 }}>Motivo: {p.motivo_recusa}</p>}
          {!final && <p style={{ color: 'var(--suave)', margin: '6px 0 0' }}>Esta tela atualiza sozinha.</p>}
        </section>
        {!['recusado', 'cancelado'].includes(p.situacao) && <section className="cartao"><ol className="passos">
          {passos.map((x, k) => <li key={k} className={`${k <= pos ? 'feito' : ''} ${k === pos ? 'atual' : ''}`}><span className="bola">{k <= pos ? <Ic n="check" t={16} /> : null}</span><b>{x.t}</b>{k <= pos && <small>{hora(x.h)}</small>}</li>)}
        </ol></section>}
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
      <Route path="/pedido/:token" element={<Pedido />} />
      <Route path="/:slug" element={<Loja />} />
    </Routes>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><BrowserRouter basename="/pedir"><App /></BrowserRouter></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
