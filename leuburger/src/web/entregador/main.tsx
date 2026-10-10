// Pedêê Entregador: o app do entregador. Cadastro e login próprios; recebe as entregas que as lojas passam para ele,
// com aviso, e marca "saí para entrega" e "entreguei". Cada um no seu quadrado: não vê nada além das entregas dele.
import { Selfie } from '../selfie';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { prazo, type Prazos } from '../tempo';
import { RAPIDAS_ENTREGADOR } from '../../regras/mensagens';
import { ErroApp, get, post } from '../api';
import { Modal, msgErro } from '../comuns';
import { Mapa } from '../mapa';
import { Ic } from '../icones';
import '../estilo.css';
import '../pedir/pedir.css';
import './entregador.css';

interface Eu { entregador: { nome: string; email: string; veiculo: string; disponivel: boolean; tem_foto: boolean }; lojas: { nome: string; cidade: string | null }[] }
interface Entrega {
  id: string; numero: number; andamento: string; total: number; troco: number; criado_em: string; saiu_em: string | null; chamado_em?: string | null; prazos?: Prazos | null; finalizado_em: string | null; endereco_entrega: string; observacao: string | null;
  loja: string; loja_endereco: string | null; cliente: string | null; resumo: string | null; formas: string | null; dest_lat: number | null; dest_lng: number | null; loja_lat: number | null; loja_lng: number | null; km: number | null;
  mensagens: { de: 'entregador' | 'cliente'; texto: string; criado_em: string }[]; conversa_loja: { de: 'entregador' | 'loja'; texto: string; criado_em: string }[];
}
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
function plim() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext, ctx = new A();
    [0, 0.22, 0.44].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = [660, 880, 1100][k]; g.gain.setValueAtTime(0.35, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.45); });
    navigator.vibrate?.([400, 150, 400, 150, 400]);
  } catch { /* sem som */ }
}

function App() {
  const [eu, setEu] = useState<Eu | null>(null), [estado, setEstado] = useState<'carregando' | 'fora' | 'dentro'>('carregando');
  const carregar = () => get<Eu>('/entregador/eu').then((r) => { setEu(r); setEstado('dentro'); }).catch(() => setEstado('fora'));
  useEffect(() => { carregar(); }, []);
  if (estado === 'carregando') return <div className="pd"><Topo /><div className="carregando"><div className="giro" /></div></div>;
  if (estado === 'fora' || !eu) return <Acesso aoEntrar={carregar} />;
  return <Painel eu={eu} recarregar={carregar} aoSair={() => setEstado('fora')} />;
}

const Topo = ({ children }: { children?: React.ReactNode }) => (
  <header className="pd-topo ent-topo"><img src="/entregador-icone-64.png" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} /><span className="pd-topo-tit">Pedêê Entregador</span>{children || <span style={{ width: 36 }} />}</header>
);

function Acesso({ aoEntrar }: { aoEntrar: () => void }) {
  const [aba, setAba] = useState<'cadastrar' | 'entrar'>(() => { try { return localStorage.getItem('entregador_ja_entrou') ? 'entrar' : 'cadastrar'; } catch { return 'cadastrar'; } });
  const [f, setF] = useState({ nome: '', email: '', senha: '', veiculo: 'moto', cidade: '', foto: '' });
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErro(''); };
  const enviar = async () => {
    setOcupado(true);
    try {
      if (aba === 'entrar') await post('/entregador/entrar', { email: f.email, senha: f.senha });
      else { if (!f.foto) throw new ErroApp(400, 'sem_foto', 'Tire a sua foto para criar o cadastro.'); await post('/entregador/cadastrar', { nome: f.nome, email: f.email, senha: f.senha, veiculo: f.veiculo, cidade: f.cidade || null, foto: f.foto }); }
      try { localStorage.setItem('entregador_ja_entrou', '1'); } catch { /* sem armazenamento */ }
      aoEntrar();
    } catch (e) { setErro(e instanceof ErroApp && e.campos ? Object.values(e.campos)[0] || msgErro(e) : msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <div className="pd">
      <Topo />
      <main className="pd-corpo">
        <section className="cartao" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>🛵</span>
          <h1 style={{ margin: '4px 0', fontSize: 22 }}>Entregue com o Pedêê</h1>
          <p style={{ margin: 0, color: 'var(--suave)' }}>Cadastre-se e passe o seu e-mail para as lojas. As entregas chegam aqui, com aviso.</p>
        </section>
        <div className="chips">
          <button className={`chip ${aba === 'cadastrar' ? 'sel' : ''}`} onClick={() => { setAba('cadastrar'); setErro(''); }}>Quero me cadastrar</button>
          <button className={`chip ${aba === 'entrar' ? 'sel' : ''}`} onClick={() => { setAba('entrar'); setErro(''); }}>Já tenho cadastro</button>
        </div>
        <section className="cartao"><div className="campos">
          {aba === 'cadastrar' && <label className="campo largo">Seu nome<input value={f.nome} onChange={muda('nome')} autoComplete="name" maxLength={60} /></label>}
          <label className="campo largo">E-mail<input type="email" value={f.email} onChange={muda('email')} inputMode="email" autoComplete="username" placeholder="seunome@email.com" /></label>
          {aba === 'cadastrar' && <>
            <label className="campo">Entrega de<select value={f.veiculo} onChange={muda('veiculo')}><option value="moto">🛵 Moto</option><option value="bike">🚲 Bicicleta</option></select></label>
            <label className="campo">Cidade<input value={f.cidade} onChange={muda('cidade')} maxLength={60} placeholder="Ex.: Duque de Caxias" /></label>
          </>}
          {aba === 'cadastrar' && <div className="campo largo"><span>Sua foto (tirada agora)</span>{f.foto ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><img src={f.foto} alt="Sua foto" width={72} height={72} style={{ borderRadius: '50%' }} /><button type="button" className="btn peq" onClick={() => setF({ ...f, foto: '' })}>Tirar outra</button></div> : <Selfie aoTirar={(foto) => setF((x) => ({ ...x, foto }))} />}</div>}
          <label className="campo largo">Senha<input type="password" value={f.senha} onChange={muda('senha')} autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'} placeholder={aba === 'cadastrar' ? 'Pelo menos 6 letras ou números' : ''} /></label>
          <button className="btn prim grande bloco largo" onClick={enviar} disabled={ocupado}>{ocupado ? 'Aguarde…' : aba === 'entrar' ? 'Entrar' : 'Criar meu cadastro'}</button>
        </div>{erro && <p className="aviso erro" style={{ marginBottom: 0 }}>{erro}</p>}</section>
      </main>
    </div>
  );
}

interface Feita { id: string; numero: number; quando: string; saiu_em: string | null; chamado_em?: string | null; loja: string; endereco: string; ganho: number; km: number | null; criado_em?: string }
type Aba = 'inicio' | 'financeiro' | 'ajuda' | 'perfil';
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
const kmTxt = (km: number | null) => (km == null ? '' : `${km.toFixed(1).replace('.', ',')} km`);
const inicioSemana = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };

/** Ponte do app Android Pedêê Entregador (não existe no navegador). */
const NATIVO = (window as unknown as { PedeeNativo?: { rastrear: (ligar: boolean) => void; pedirLocalizacao: () => void; abrirConfiguracoes: () => void } }).PedeeNativo;

const minEntre = (a: string, b: string | number) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));

function Painel({ eu, recarregar, aoSair }: { eu: Eu; recarregar: () => void; aoSair: () => void }) {
  const [aba, setAba] = useState<Aba>('inicio');
  const [lista, setLista] = useState<Entrega[] | null>(null), [feitas, setFeitas] = useState<Feita[]>([]), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState('');
  const [verValor, setVerValor] = useState(() => { try { return localStorage.getItem('ent_ver_valor') !== '0'; } catch { return true; } });
  const [codigoDe, setCodigoDe] = useState<Entrega | null>(null), [eu0, setEu0] = useState<{ lat: number; lng: number } | null>(null);
  const vistos = useRef<Set<string> | null>(null), msgsVistas = useRef<number | null>(null);
  const carregar = async () => {
    try {
      const [r, h] = await Promise.all([get<{ entregas: Entrega[] }>('/entregador/entregas'), get<{ entregas: Feita[] }>('/entregador/resumo')]);
      const ativas = r.entregas.filter((x) => x.andamento !== 'entregue');
      const nMsgs = ativas.reduce((t, x) => t + x.mensagens.filter((m) => m.de === 'cliente').length + x.conversa_loja.filter((m) => m.de === 'loja').length, 0);
      if ((vistos.current && ativas.some((x) => !vistos.current!.has(x.id))) || (msgsVistas.current != null && nMsgs > msgsVistas.current)) plim();
      vistos.current = new Set(ativas.map((x) => x.id)); msgsVistas.current = nMsgs;
      setLista(r.entregas); setFeitas(h.entregas); setErro('');
    } catch (e) { if (e instanceof ErroApp && e.status === 401) aoSair(); else setErro(msgErro(e)); }
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 8000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { navigator.geolocation?.getCurrentPosition((p) => setEu0({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { maximumAge: 60000, timeout: 15000 }); }, []);
  const marcar = async (x: Entrega, andamento: 'a_caminho' | 'entregue', codigo?: string) => {
    // No toque em “Saí para entrega” (pelo navegador): pede a localização na hora, assim o Chrome mostra a pergunta em vez de bloquear sozinho.
    if (andamento === 'a_caminho' && !NATIVO) navigator.geolocation?.getCurrentPosition(() => { setGps(''); setTentarGps((n) => n + 1); }, (e) => { if (e.code === 1) setGps('negado'); }, { timeout: 15000 });
    setOcupado(x.id);
    try { await post(`/entregador/entregas/${x.id}`, { andamento, codigo }); setCodigoDe(null); await carregar(); return ''; } catch (e) { const m = msgErro(e); if (!codigo) setErro(m); return m; } finally { setOcupado(''); }
  };
  const mandar = async (x: Entrega, texto: string) => { try { await post(`/entregador/entregas/${x.id}/mensagem`, { texto }); await carregar(); } catch (e) { setErro(msgErro(e)); } };
  /** Só para a conta de teste: anda sozinho da loja até o cliente (~90 s) para mostrar o mapa em tempo real. */
  const simulando = useRef(false), [simPasso, setSimPasso] = useState(0);
  const ehTeste = eu.entregador.email.endsWith('@teste.pedee');
  const simular = (x: Entrega) => {
    const a = { lat: x.loja_lat ?? -22.7856, lng: x.loja_lng ?? -43.3117 };
    const b = x.dest_lat != null ? { lat: x.dest_lat, lng: x.dest_lng as number } : { lat: a.lat + 0.008, lng: a.lng + 0.008 };
    const total = 45; let i = 0; simulando.current = true; setSimPasso(1);
    try { NATIVO?.rastrear(false); } catch { /* app antigo */ }
    const t = setInterval(() => {
      i++; const f = Math.min(1, i / total), p = { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
      post('/entregador/posicao', p).catch(() => {}); setEu0(p);
      setSimPasso(Math.round(f * 100));
      if (f >= 1) { clearInterval(t); simulando.current = false; setSimPasso(0); }
    }, 2000);
  };
  const disponivel = async () => { await post('/entregador/disponivel', { disponivel: !eu.entregador.disponivel }).catch(() => {}); recarregar(); };
  const ativas = (lista || []).filter((x) => x.andamento !== 'entregue');
  // Enquanto tem entrega a caminho, manda a posição para o cliente ver no mapa.
  const emRota = ativas.some((x) => x.andamento === 'a_caminho');
  const [gps, setGps] = useState<'ok' | 'negado' | ''>(''), [tentarGps, setTentarGps] = useState(0);
  useEffect(() => {
    if (!emRota || !navigator.geolocation) return;
    let ultimo = 0;
    const id = navigator.geolocation.watchPosition((p) => {
      setGps('ok');
      if (simulando.current) return;
      setEu0({ lat: p.coords.latitude, lng: p.coords.longitude });
      if (Date.now() - ultimo < 8000) return;
      ultimo = Date.now();
      if (!NATIVO) post('/entregador/posicao', { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {}); // no app Android quem manda é o próprio app
    }, (e) => { if (e.code === 1) setGps('negado'); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    // Quando a pessoa libera a localização nas configurações do navegador, volta a mandar sozinho.
    let perm: PermissionStatus | null = null;
    navigator.permissions?.query({ name: 'geolocation' }).then((x) => { perm = x; x.onchange = () => { if (x.state === 'granted') { setGps(''); setTentarGps((n) => n + 1); } }; }).catch(() => {});
    return () => { navigator.geolocation.clearWatch(id); if (perm) perm.onchange = null; };
  }, [emRota, tentarGps]);
  // App Android: liga o GPS do próprio celular (continua com a tela apagada) só enquanto tem entrega a caminho.
  useEffect(() => { try { NATIVO?.rastrear(emRota); } catch { /* app antigo */ } }, [emRota]);
  const pedirGps = () => navigator.geolocation?.getCurrentPosition(() => { setGps(''); setTentarGps((n) => n + 1); }, (e) => { if (e.code === 1) setGps('negado'); }, { timeout: 15000 });

  const hoje = new Date().toDateString();
  const deHoje = feitas.filter((f) => new Date(f.quando).toDateString() === hoje);
  const ganhoHoje = deHoje.reduce((t, f) => t + f.ganho, 0), kmHoje = deHoje.reduce((t, f) => t + (f.km || 0), 0);
  const valor = (v: number) => (verValor ? brl(v) : 'R$ ••••');
  const alternarValor = () => { setVerValor(!verValor); try { localStorage.setItem('ent_ver_valor', verValor ? '0' : '1'); } catch { /* sem armazenamento */ } };
  const foco = ativas[0];
  const avatar = eu.entregador.tem_foto ? <img src="/api/entregador/foto" alt="" className="ent-avatar" /> : <span className="ent-avatar vazio">🙂</span>;

  if (!eu.entregador.tem_foto) return (
    <div className="pd"><Topo /><main className="pd-corpo">
      <section className="cartao" style={{ textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Tire sua foto para começar</h1>
        <p style={{ margin: '0 0 12px', color: 'var(--suave)' }}>Por segurança, o cliente e a loja veem quem está levando o pedido. A foto é tirada agora, pela câmera.</p>
        <Selfie aoTirar={async (dados) => { try { await post('/entregador/foto', { dados }); recarregar(); } catch (e) { setErro(msgErro(e)); } }} />
        {erro && <p className="aviso erro">{erro}</p>}
      </section>
      <button className="btn bloco" onClick={async () => { await post('/entregador/sair').catch(() => {}); aoSair(); }}><Ic n="sair" />Sair</button>
    </main></div>
  );

  return (
    <div className="pd com-abas ent-app">
      {aba === 'inicio' && <>
        <div className="ent-mapa">
          <Mapa dados={{ loja: foco?.loja_lat != null ? { lat: foco.loja_lat, lng: foco.loja_lng as number } : null, destino: foco?.dest_lat != null ? { lat: foco.dest_lat, lng: foco.dest_lng as number } : null, entregador: eu0 && { ...eu0, veiculo: eu.entregador.veiculo } }} altura={300} />
          <div className="ent-flutua">
            {avatar}
            <button className={`ent-disp2 ${eu.entregador.disponivel ? 'sim' : ''}`} onClick={disponivel}>{eu.entregador.disponivel ? '🟢 Disponível' : '🌙 Volto breve'}</button>
            <a className="ent-sos" href="tel:190" onClick={(e) => { if (!confirm('Ligar para a polícia (190)?')) e.preventDefault(); }}>⚠️ SOS</a>
          </div>
          {!ativas.length && <div className="ent-busca">{eu.entregador.disponivel ? '🔎 Esperando as lojas passarem entregas para você' : 'Você está em “Volto breve”. Quando quiser receber entregas, toque no botão e fique Disponível.'}</div>}
        </div>
        <main className="pd-corpo">
          <button className="ent-ganho" onClick={alternarValor} aria-label={verValor ? 'Esconder valores' : 'Mostrar valores'}>
            <span className="ent-cifrao">$</span><b>{valor(ganhoHoje)}</b><span>{verValor ? '👁️' : '🙈'}</span>
            <small>Hoje: {deHoje.length} {deHoje.length === 1 ? 'entrega' : 'entregas'}{kmHoje ? ` · ${kmTxt(kmHoje)}` : ''}</small>
          </button>
          {erro && <p className="aviso erro">{erro}</p>}
          {emRota && gps === 'negado' && NATIVO && <div className="aviso erro" style={{ margin: 0 }}>
            <b>Falta permitir a localização no app.</b> Sem ela o cliente não vê você no mapa.
            <div className="dupla" style={{ marginTop: 8 }}><button className="btn peq" onClick={() => { NATIVO.pedirLocalizacao(); setTimeout(pedirGps, 4000); }}>📍 Permitir</button><button className="btn peq" onClick={() => NATIVO.abrirConfiguracoes()}>⚙️ Abrir configurações</button></div>
          </div>}
          {emRota && (gps === 'negado' ? !NATIVO && <div className="aviso erro" style={{ margin: 0 }}>
                <b>O GPS está ligado, mas o Chrome não deixa o Pedêê usar a localização.</b> É uma permissão separada, só deste app. Para liberar:
                <ol style={{ margin: '6px 0', paddingLeft: 20 }}>
                  <li>Abra o <b>Chrome</b> → <b>⋮</b> (3 pontinhos) → <b>Configurações</b> → <b>Configurações do site</b> → <b>Local</b>.</li>
                  <li>Em “Bloqueado”, toque em <b>leuburger.leunamesoftware.com.br</b> → <b>Permitir</b>.</li>
                  <li>Se não achar: <b>Configurações do celular</b> → <b>Apps</b> → <b>Chrome</b> (e também <b>Pedêê Entregador</b>, se aparecer) → <b>Permissões</b> → <b>Localização</b> → <b>Permitir</b>.</li>
                </ol>
                Depois volte aqui e toque em:
                <button className="btn peq" style={{ marginTop: 8, display: 'flex' }} onClick={pedirGps}>📍 Tentar de novo</button>
              </div>
            : <p className="aviso" style={{ margin: 0 }}>📍 O cliente está vendo você no mapa. Deixe este app aberto durante a entrega.</p>)}
          <h2 className="pd-tit">Entregas agora</h2>
          {lista == null ? <div className="carregando"><div className="giro" /></div> : !ativas.length ? (
            <div className="vazio"><span style={{ fontSize: 44 }}>🛵</span><b>Nenhuma entrega com você</b><span>{eu.lojas.length ? 'Quando a loja passar uma entrega para você, ela aparece aqui com aviso. Deixe o app aberto.' : 'Passe o seu e-mail para a loja te adicionar como entregador dela.'}</span></div>
          ) : ativas.map((x) => {
            const dinheiro = (x.formas || '').includes('dinheiro');
            return (
              <article key={x.id} className="ent-card">
                <div className="ped-topo"><b>#{x.numero}</b><span className="selo">{x.loja}</span><small>{hora(x.criado_em)}</small></div>
                {(() => {
                  const emRota2 = x.andamento === 'a_caminho' && x.saiu_em;
                  const pr = prazo(emRota2 ? x.prazos?.entrega : x.prazos?.coleta);
                  return <div className={`ent-tempo ${pr?.atrasado ? 'ruim' : ''}`}>
                    {pr && <span>{emRota2 ? '🏠 Entregar até' : '🏪 Pegar na loja até'} <b>{pr.hora}</b> · {pr.atrasado ? `⚠️ ${pr.texto}` : pr.texto}</span>}
                    {emRota2 ? <small>🛵 Em rota há {minEntre(x.saiu_em!, Date.now())} min · saiu {hora(x.saiu_em!)}{x.chamado_em ? ` · levou ${minEntre(x.chamado_em, x.saiu_em!)} min para sair da loja` : ''}{x.prazos ? ` · trajeto previsto ${x.prazos.rota_min} min` : ''}</small>
                      : <small>{x.chamado_em ? `A loja chamou há ${minEntre(x.chamado_em, Date.now())} min. ` : ''}Toque em “Saí para entrega” ao pegar o pedido.</small>}
                  </div>;
                })()}
                <div className="ent-end"><Ic n="inicio" /><div><b>{x.endereco_entrega}</b><small>👤 {x.cliente || 'Cliente'}{x.km != null ? ` · ${kmTxt(x.km)} da loja` : ''}</small></div></div>
                {x.observacao && <div className="ped-obs">Obs.: {x.observacao}</div>}
                {x.resumo && <div className="ped-itens">{x.resumo}</div>}
                <div className="ent-valor">
                  <span>{(x.formas || '').split(',').filter(Boolean).map((f) => FORMAS[f as Forma] || f).join(' + ') || 'Pagamento'}</span><b className="num">{brl(x.total)}</b>
                  {dinheiro && x.troco > 0 && <em>Levar troco: {brl(x.troco)}</em>}
                </div>
                <div className="dupla">
                  <a className="btn prim" href={x.dest_lat != null ? `https://waze.com/ul?ll=${x.dest_lat},${x.dest_lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(x.endereco_entrega)}&navigate=yes`} target="_blank" rel="noopener"><Ic n="seta" />Waze</a>
                  <a className="btn" href={x.dest_lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${x.dest_lat},${x.dest_lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.endereco_entrega)}`} target="_blank" rel="noopener"><Ic n="seta" />Google Maps</a>
                </div>
                <div className="ent-chat">
                  <b>💬 Avisar {x.cliente?.split(' ')[0] || 'o cliente'}</b><small className="ent-chat-dica">Só mensagens prontas. Precisa de mais? Fale com a loja.</small>
                  {x.mensagens.map((m, k) => <p key={k} className={m.de === 'entregador' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}
                  <div className="ent-rapidas">{RAPIDAS_ENTREGADOR.map((t) => <button key={t} className="chip" onClick={() => mandar(x, t)}>{t}</button>)}</div>
                </div>
                <ConversaLoja x={x} aoEnviar={carregar} />
                {x.andamento !== 'a_caminho'
                  ? <button className="btn prim grande bloco" style={{ marginTop: 6 }} disabled={ocupado === x.id} onClick={() => marcar(x, 'a_caminho')}><Ic n="seta" />Saí para entrega</button>
                  : <button className="btn prim grande bloco ent-verde" style={{ marginTop: 6 }} disabled={ocupado === x.id} onClick={() => setCodigoDe(x)}><Ic n="check" />Entreguei</button>}
                {ehTeste && x.andamento === 'a_caminho' && <button className="btn bloco" disabled={simPasso > 0} onClick={() => simular(x)}>{simPasso > 0 ? `🧪 Andando… ${simPasso}%` : '🧪 Simular trajeto (conta de teste)'}</button>}
              </article>
            );
          })}
        </main>
      </>}
      {aba === 'financeiro' && <Financeiro feitas={feitas} valor={valor} verValor={verValor} alternar={alternarValor} />}
      {aba === 'ajuda' && <Ajuda />}
      {aba === 'perfil' && <>
        <header className="ent-menu-topo">
          {eu.entregador.tem_foto ? <img src="/api/entregador/foto" alt="" className="ent-avatar grande" /> : <span className="ent-avatar grande vazio">🙂</span>}
          <div><b>{eu.entregador.nome}</b><small>{eu.entregador.email}</small></div>
        </header>
        <main className="pd-corpo">
          <section className="cartao">
            <h2 className="cartao-tit">Pra acompanhar</h2>
            <div className="lista-config">
              <div><span>📦 Entregas nos últimos 30 dias</span><b>{feitas.length}</b></div>
              <div><span>🛣️ Km rodados (30 dias)</span><b>{kmTxt(feitas.reduce((t, f) => t + (f.km || 0), 0)) || '0 km'}</b></div>
              <div><span>💰 Ganhos (30 dias)</span><b>{valor(feitas.reduce((t, f) => t + f.ganho, 0))}</b></div>
            </div>
          </section>
          <section className="cartao">
            <h2 className="cartao-tit">Forma de entrega</h2>
            {eu.entregador.veiculo === 'bike'
              ? <p style={{ margin: 0 }}>🚲 <b>Bicicleta</b><br /><small style={{ color: 'var(--suave)' }}>Para entregar de moto é preciso cadastrar a moto e a habilitação (CNH). Em breve aqui.</small></p>
              : <div className="dupla">{(['moto', 'bike'] as const).map((v) => <button key={v} className={`btn ${eu.entregador.veiculo === v ? 'prim' : ''}`} onClick={async () => { if (v === 'bike' && !confirm('Mudar para bicicleta? Para voltar para moto vai precisar cadastrar a moto e a CNH.')) return; await post('/entregador/veiculo', { veiculo: v }).catch(() => {}); recarregar(); }}>{v === 'moto' ? '🛵 Moto' : '🚲 Bicicleta'}</button>)}</div>}
          </section>
          <section className="cartao">
            <h2 className="cartao-tit">Lojas onde você entrega</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--suave)' }}>Para entregar em uma loja nova, passe o seu e-mail (<b>{eu.entregador.email}</b>) para ela te adicionar.</p>
            {!eu.lojas.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nenhuma ainda.</p> : <div className="lista-config">{eu.lojas.map((l) => <div key={l.nome}><span>🏪 {l.nome}{l.cidade ? ` · ${l.cidade}` : ''}</span></div>)}</div>}
          </section>
          <button className="btn bloco" onClick={async () => { await post('/entregador/sair').catch(() => {}); aoSair(); }}><Ic n="sair" />Sair</button>
        </main>
      </>}
      {codigoDe && <CodigoEntrega x={codigoDe} aoFechar={() => setCodigoDe(null)} aoConfirmar={(c) => marcar(codigoDe, 'entregue', c)} />}
      <nav className="pd-abas ent-abas">
        {([['inicio', 'inicio', 'Início'], ['financeiro', 'dinheiro', 'Financeiro'], ['ajuda', 'alerta', 'Ajuda'], ['perfil', 'menu', 'Menu']] as [Aba, string, string][]).map(([v, ic, n]) => (
          <button key={v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}><Ic n={ic} /><span>{n}</span></button>
        ))}
      </nav>
    </div>
  );
}

/** O cliente passa o código de 4 números que aparece no app dele; sem o código certo não fecha a entrega. */
/** Conversa livre com a loja (sem telefone). */
function ConversaLoja({ x, aoEnviar }: { x: Entrega; aoEnviar: () => Promise<void> }) {
  const [aberta, setAberta] = useState(false), [texto, setTexto] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const daLoja = x.conversa_loja.filter((m) => m.de === 'loja').length;
  const [vistas, setVistas] = useState(daLoja);
  const novas = aberta ? 0 : daLoja - vistas;
  const enviar = async () => {
    if (!texto.trim()) return;
    setOcupado(true);
    try { await post(`/entregador/entregas/${x.id}/loja`, { texto: texto.trim() }); setTexto(''); setErro(''); await aoEnviar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  if (!aberta) return <button className="btn bloco ent-loja-bt" onClick={() => { setAberta(true); setVistas(daLoja); }}><Ic n="loja" />Conversar com a loja{novas > 0 && <span className="selo">{novas}</span>}</button>;
  return (
    <div className="ent-chat ent-chat-loja">
      <b>🏪 Conversa com {x.loja}</b><button className="link" style={{ float: 'right' }} onClick={() => { setAberta(false); setVistas(daLoja); }}>Fechar</button>
      {!x.conversa_loja.length && <small className="ent-chat-dica">Combine com a loja aqui (ex.: atraso, endereço, troco). O número de ninguém aparece.</small>}
      {x.conversa_loja.map((m, k) => <p key={k} className={m.de === 'entregador' ? 'eu' : 'ele'}>{m.texto}<small>{hora(m.criado_em)}</small></p>)}
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="pd-chat-enviar"><input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="Mensagem para a loja" aria-label="Mensagem para a loja" onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} /><button className="btn prim" onClick={enviar} disabled={!texto.trim() || ocupado}>Enviar</button></div>
    </div>
  );
}

function CodigoEntrega({ x, aoFechar, aoConfirmar }: { x: Entrega; aoFechar: () => void; aoConfirmar: (codigo: string) => Promise<string> }) {
  const [cod, setCod] = useState(''), [msg, setMsg] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async () => { setOcupado(true); const m = await aoConfirmar(cod); setOcupado(false); if (m) setMsg(m); };
  return (
    <Modal titulo={`Entregar pedido #${x.numero}`} aoFechar={aoFechar}>
      <p style={{ marginTop: 0 }}>Peça a <b>{x.cliente?.split(' ')[0] || 'o cliente'}</b> o <b>código de entrega</b>. Ele aparece no app do cliente, na tela do pedido. Você não vê o código: o sistema confere sozinho e, se estiver errado, a entrega não fecha.</p>
      <input className="ent-codigo" value={cod} onChange={(e) => { setCod(e.target.value.replace(/\D/g, '').slice(0, 4)); setMsg(''); }} inputMode="numeric" autoFocus placeholder="0000" aria-label="Código de entrega" />
      {msg && <p className="aviso erro">{msg}</p>}
      <button className="btn prim grande bloco ent-verde" style={{ marginTop: 10 }} disabled={cod.length !== 4 || ocupado} onClick={enviar}><Ic n="check" />{ocupado ? 'Conferindo…' : 'Confirmar entrega'}</button>
    </Modal>
  );
}

const PERGUNTAS: [string, string, string][] = [
  ['Pedidos', 'Estou disponível e não recebo entregas', 'As entregas vêm das lojas que te adicionaram. Passe o seu e-mail (aba Perfil) para a loja; ela coloca você em “Entregadores” e escolhe você no pedido. Deixe o app aberto e fique como “Disponível”.'],
  ['Pedidos', 'Como entrego o pedido?', 'Toque em “Saí para entrega” quando pegar o pedido na loja. No cliente, peça o código de entrega (4 números que aparecem no app dele) e toque em “Entreguei”. Sem o código certo a entrega não fecha.'],
  ['Pedidos', 'O cliente não responde / não encontro o endereço', 'Use os avisos prontos no pedido (“Cheguei, estou na frente”, “Não encontrei o endereço”). O cliente recebe no app dele. Se não resolver, toque em “Conversar com a loja” e escreva o que precisar.'],
  ['Cadastro', 'Quero trocar minha foto ou meu veículo', 'A foto é tirada pela câmera, para o cliente saber quem está levando. Para trocar a foto ou mudar de moto para bicicleta, fale com o suporte.'],
  ['Ganhos', 'Como recebo pelas entregas?', 'Por enquanto o valor de cada entrega (a taxa de entrega) é combinado e pago direto pela loja. Em Financeiro você vê quanto fez no dia, na semana e em cada entrega.'],
  ['Celular', 'Quero o GPS funcionando com a tela apagada', 'Pelo navegador o GPS para quando a tela apaga. No Android existe o app Pedêê Entregador (opcional), que continua mandando a sua posição: baixe em www.leunamesoftware.com.br/baixar/pedee-entregador.apk. O Android pode pedir para confirmar a instalação.'],
  ['Segurança', 'Sofri um acidente ou estou em perigo', 'Em perigo: toque em SOS (liga 190). Acidente com ferido: ligue 192 (SAMU). Depois avise a loja.'],
];
function Ajuda() {
  const [q, setQ] = useState(''), [aberta, setAberta] = useState('');
  const sem = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const lista = PERGUNTAS.filter(([, p, r]) => sem(p + ' ' + r).includes(sem(q.trim())));
  return (
    <>
      <Topo />
      <main className="pd-corpo">
        <h1 style={{ margin: 0, fontSize: 24 }}>Como podemos te ajudar?</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite sua dúvida" aria-label="Digite sua dúvida" />
        <section className="cartao" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 40 }}>🛡️</span>
          <div style={{ display: 'grid', gap: 6 }}><b>Central de segurança</b><span style={{ color: 'var(--suave)', fontSize: 14 }}>Em perigo ou acidente, peça ajuda na hora.</span>
            <div className="dupla"><a className="btn peq" href="tel:190">🚓 Polícia 190</a><a className="btn peq" href="tel:192">🚑 SAMU 192</a></div></div>
        </section>
        <h2 className="pd-tit">Perguntas frequentes</h2>
        <section className="cartao"><div className="lista-config">{lista.map(([, p, r]) => (
          <div key={p} style={{ display: 'grid' }}><button className="ent-lanc" onClick={() => setAberta(aberta === p ? '' : p)}><b>{p}</b><span>{aberta === p ? '▲' : '▼'}</span></button>{aberta === p && <p style={{ margin: '0 0 10px', color: 'var(--suave)' }}>{r}</p>}</div>
        ))}{!lista.length && <p style={{ margin: 0 }}>Nada encontrado. Fale com o suporte.</p>}</div></section>
        <a className="btn prim grande bloco" href="mailto:leunamesoftware@gmail.com?subject=Ajuda%20-%20Ped%C3%AA%C3%AA%20Entregador">💬 Falar com o suporte</a>
      </main>
    </>
  );
}

function Financeiro({ feitas, valor, verValor, alternar }: { feitas: Feita[]; valor: (v: number) => string; verValor: boolean; alternar: () => void }) {
  const [meta, setMeta] = useState(() => { try { return Number(localStorage.getItem('ent_meta') || 0); } catch { return 0; } });
  const [ver, setVer] = useState<Feita | null>(null);
  const ini = inicioSemana(), daSemana = feitas.filter((f) => new Date(f.quando) >= ini);
  const total = daSemana.reduce((t, f) => t + f.ganho, 0), km = daSemana.reduce((t, f) => t + (f.km || 0), 0);
  const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
  const dias = new Map<string, Feita[]>();
  feitas.forEach((f) => { const k = new Date(f.quando).toDateString(); dias.set(k, [...(dias.get(k) || []), f]); });
  const editarMeta = () => { const v = prompt('Sua meta da semana (R$):', meta ? String(meta / 100) : ''); if (v == null) return; const c = Math.round(Number(v.replace(',', '.')) * 100) || 0; setMeta(c); try { localStorage.setItem('ent_meta', String(c)); } catch { /* sem armazenamento */ } };
  return (
    <>
      <header className="pd-cab"><div className="pd-cab-linha"><span className="pd-logo-texto" style={{ background: 'none', WebkitTextFillColor: 'var(--texto)', color: 'var(--texto)' }}>Financeiro</span><button className="btn-ic" onClick={alternar} aria-label="Mostrar ou esconder valores">{verValor ? '👁️' : '🙈'}</button></div></header>
      <main className="pd-corpo">
        <section className="cartao">
          <small style={{ color: 'var(--suave)', fontWeight: 700 }}>Ganhos da semana · {ini.getDate()}–{fim.getDate()} {fim.toLocaleDateString('pt-BR', { month: 'short' })}</small>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{valor(total)}</div>
          {meta > 0 && <div className="ent-meta"><i style={{ width: `${Math.min(100, (total / meta) * 100)}%` }} /></div>}
          <div className="linha-valor"><span>{meta > 0 ? `Sua meta: ${valor(meta)}` : 'Sem meta'}</span><button className="btn peq" onClick={editarMeta}>{meta > 0 ? 'Editar meta' : 'Criar meta'}</button></div>
          <p style={{ margin: '8px 0 0', color: 'var(--suave)' }}>{daSemana.length} {daSemana.length === 1 ? 'entrega' : 'entregas'} na semana{km ? ` · ${kmTxt(km)} rodados` : ''}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--suave)' }}>Valor = taxa de entrega dos pedidos que você entregou. O pagamento é combinado com cada loja.</p>
        </section>
        <h2 className="pd-tit">Extrato (30 dias)</h2>
        {!feitas.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Suas entregas concluídas aparecem aqui.</p> : [...dias.entries()].map(([k, l]) => (
          <section key={k} className="cartao">
            <h3 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--suave)', textTransform: 'capitalize' }}>{new Date(k).toDateString() === new Date().toDateString() ? 'Hoje' : dia(l[0].quando)}</h3>
            <div className="lista-config">{l.map((f) => (
              <button key={f.id} className="ent-lanc" onClick={() => setVer(f)}><span>🛵 Entrega #{f.numero}<small>{hora(f.quando)} · {f.loja}{f.km != null ? ` · ${kmTxt(f.km)}` : ''}</small></span><b>{valor(f.ganho)}</b></button>
            ))}</div>
          </section>
        ))}
        {feitas.length > 0 && <p style={{ textAlign: 'center', color: 'var(--suave)' }}>✅ Isso é tudo</p>}
      </main>
      {ver && <Modal titulo="Detalhes da entrega" aoFechar={() => setVer(null)}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 30, fontWeight: 900 }}>{valor(ver.ganho)}</div><small style={{ color: 'var(--suave)' }}>{new Date(ver.quando).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</small></div>
        <div className="lista-config" style={{ marginTop: 12 }}>
          <div><span>Loja</span><b>{ver.loja}</b></div>
          <div><span>Entregue em</span><b style={{ textAlign: 'right' }}>{ver.endereco}</b></div>
          {ver.km != null && <div><span>Distância (loja → cliente)</span><b>{kmTxt(ver.km)}</b></div>}
          {ver.chamado_em && ver.saiu_em && <div><span>Da chamada até sair da loja</span><b>{minEntre(ver.chamado_em, ver.saiu_em)} min</b></div>}
          {ver.saiu_em && <div><span>Da loja até o cliente</span><b>{minEntre(ver.saiu_em, ver.quando)} min</b></div>}
          {ver.chamado_em && <div><span>Tempo total</span><b>{minEntre(ver.chamado_em, ver.quando)} min</b></div>}
        </div>
        <ol className="passos" style={{ marginTop: 12 }}>
          {ver.chamado_em && <li className="feito"><span className="bola"><Ic n="check" t={16} /></span><b>A loja chamou você</b><small>{hora(ver.chamado_em)}</small></li>}
          {ver.saiu_em && <li className="feito"><span className="bola"><Ic n="check" t={16} /></span><b>Saiu da loja com o pedido</b><small>{hora(ver.saiu_em)}{ver.chamado_em ? ` · ${minEntre(ver.chamado_em, ver.saiu_em)} min` : ''}</small></li>}
          <li className="feito"><span className="bola"><Ic n="check" t={16} /></span><b>Pedido entregue (código conferido)</b><small>{hora(ver.quando)}{ver.saiu_em ? ` · ${minEntre(ver.saiu_em, ver.quando)} min` : ''}</small></li>
        </ol>
      </Modal>}
    </>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
