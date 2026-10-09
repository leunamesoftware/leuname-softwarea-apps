// Pedêê Entregador: o app do motoboy. Cadastro e login próprios; recebe as entregas que as lojas passam para ele,
// com aviso, e marca "saí para entrega" e "entreguei". Cada um no seu quadrado: não vê nada além das entregas dele.
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { ErroApp, get, post } from '../api';
import { msgErro } from '../comuns';
import { Ic } from '../icones';
import '../estilo.css';
import '../pedir/pedir.css';
import './entregador.css';

interface Eu { entregador: { nome: string; telefone: string; veiculo: string; disponivel: boolean }; lojas: { nome: string; cidade: string | null }[] }
interface Entrega {
  id: string; numero: number; andamento: string; total: number; troco: number; criado_em: string; saiu_em: string | null; finalizado_em: string | null; endereco_entrega: string; observacao: string | null;
  loja: string; loja_endereco: string | null; loja_telefone: string | null; cliente: string | null; cliente_telefone: string | null; resumo: string | null; formas: string | null;
}
const dig = (s: string | null | undefined) => String(s || '').replace(/\D/g, '');
const fone = (s: string | null | undefined) => { const n = dig(s); return n.length >= 10 && n.length <= 11 ? '55' + n : n; };
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
  const [aba, setAba] = useState<'cadastrar' | 'entrar'>('cadastrar');
  const [f, setF] = useState({ nome: '', telefone: '', senha: '', veiculo: 'moto', cidade: '' });
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErro(''); };
  const enviar = async () => {
    setOcupado(true);
    try {
      if (aba === 'entrar') await post('/entregador/entrar', { telefone: f.telefone, senha: f.senha });
      else await post('/entregador/cadastrar', { nome: f.nome, telefone: f.telefone, senha: f.senha, veiculo: f.veiculo, cidade: f.cidade || null });
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
          <p style={{ margin: 0, color: 'var(--suave)' }}>Cadastre-se e passe o seu WhatsApp para as lojas. As entregas chegam aqui, com aviso.</p>
        </section>
        <div className="chips">
          <button className={`chip ${aba === 'cadastrar' ? 'sel' : ''}`} onClick={() => { setAba('cadastrar'); setErro(''); }}>Quero me cadastrar</button>
          <button className={`chip ${aba === 'entrar' ? 'sel' : ''}`} onClick={() => { setAba('entrar'); setErro(''); }}>Já tenho cadastro</button>
        </div>
        <section className="cartao"><div className="campos">
          {aba === 'cadastrar' && <label className="campo largo">Seu nome<input value={f.nome} onChange={muda('nome')} autoComplete="name" maxLength={60} /></label>}
          <label className="campo largo">WhatsApp<input value={f.telefone} onChange={muda('telefone')} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" /></label>
          {aba === 'cadastrar' && <>
            <label className="campo">Entrega de<select value={f.veiculo} onChange={muda('veiculo')}><option value="moto">🛵 Moto</option><option value="bike">🚲 Bicicleta</option><option value="carro">🚗 Carro</option></select></label>
            <label className="campo">Cidade<input value={f.cidade} onChange={muda('cidade')} maxLength={60} placeholder="Ex.: Duque de Caxias" /></label>
          </>}
          <label className="campo largo">Senha<input type="password" value={f.senha} onChange={muda('senha')} autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'} placeholder={aba === 'cadastrar' ? 'Pelo menos 6 letras ou números' : ''} /></label>
          <button className="btn prim grande bloco largo" onClick={enviar} disabled={ocupado}>{ocupado ? 'Aguarde…' : aba === 'entrar' ? 'Entrar' : 'Criar meu cadastro'}</button>
        </div>{erro && <p className="aviso erro" style={{ marginBottom: 0 }}>{erro}</p>}</section>
      </main>
    </div>
  );
}

function Painel({ eu, recarregar, aoSair }: { eu: Eu; recarregar: () => void; aoSair: () => void }) {
  const [lista, setLista] = useState<Entrega[] | null>(null), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState('');
  const vistos = useRef<Set<string> | null>(null);
  const carregar = async () => {
    try {
      const r = await get<{ entregas: Entrega[] }>('/entregador/entregas');
      const ativas = r.entregas.filter((x) => x.andamento !== 'entregue');
      if (vistos.current && ativas.some((x) => !vistos.current!.has(x.id))) plim();
      vistos.current = new Set(ativas.map((x) => x.id));
      setLista(r.entregas); setErro('');
    } catch (e) { if (e instanceof ErroApp && e.status === 401) aoSair(); else setErro(msgErro(e)); }
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const marcar = async (x: Entrega, andamento: 'a_caminho' | 'entregue') => {
    setOcupado(x.id);
    try { await post(`/entregador/entregas/${x.id}`, { andamento }); await carregar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(''); }
  };
  const disponivel = async () => { await post('/entregador/disponivel', { disponivel: !eu.entregador.disponivel }).catch(() => {}); recarregar(); };
  const ativas = (lista || []).filter((x) => x.andamento !== 'entregue'), feitas = (lista || []).filter((x) => x.andamento === 'entregue');
  const ganho = feitas.length;
  return (
    <div className="pd">
      <Topo><button className={`ent-disp ${eu.entregador.disponivel ? 'sim' : ''}`} onClick={disponivel}>{eu.entregador.disponivel ? '🟢 Disponível' : '⚪ Parado'}</button></Topo>
      <main className="pd-corpo">
        <p style={{ margin: 0 }}>Olá, <b>{eu.entregador.nome.split(' ')[0]}</b>! {ganho > 0 && <>Você fez <b>{ganho}</b> {ganho === 1 ? 'entrega' : 'entregas'} hoje.</>}</p>
        {erro && <p className="aviso erro">{erro}</p>}
        <h2 className="pd-tit">Suas entregas agora</h2>
        {lista == null ? <div className="carregando"><div className="giro" /></div> : !ativas.length ? (
          <div className="vazio"><span style={{ fontSize: 44 }}>🛵</span><b>Nenhuma entrega com você</b><span>{eu.lojas.length ? 'Quando a loja passar uma entrega para você, ela aparece aqui com aviso. Deixe o app aberto.' : 'Passe o seu WhatsApp para a loja te adicionar como motoboy dela.'}</span></div>
        ) : ativas.map((x) => {
          const dinheiro = (x.formas || '').includes('dinheiro');
          return (
            <article key={x.id} className="ent-card">
              <div className="ped-topo"><b>#{x.numero}</b><span className="selo">{x.loja}</span><small>{hora(x.criado_em)}</small></div>
              <div className="ent-end"><Ic n="inicio" /><div><b>{x.endereco_entrega}</b>{x.cliente && <small>{x.cliente}</small>}</div></div>
              {x.observacao && <div className="ped-obs">Obs.: {x.observacao}</div>}
              {x.resumo && <div className="ped-itens">{x.resumo}</div>}
              <div className="ent-valor">
                <span>{(x.formas || '').split(',').filter(Boolean).map((f) => FORMAS[f as Forma] || f).join(' + ') || 'Pagamento'}</span><b className="num">{brl(x.total)}</b>
                {dinheiro && x.troco > 0 && <em>Levar troco: {brl(x.troco)}</em>}
              </div>
              <div className="dupla">
                <a className="btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.endereco_entrega)}`} target="_blank" rel="noopener"><Ic n="seta" />Mapa</a>
                {x.cliente_telefone ? <a className="btn" href={`tel:${dig(x.cliente_telefone)}`}><Ic n="usuario" />Ligar</a> : <span />}
              </div>
              <div className="dupla" style={{ marginTop: 8 }}>
                {x.cliente_telefone && <a className="btn" href={`https://wa.me/${fone(x.cliente_telefone)}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Cliente</a>}
                {x.loja_telefone && <a className="btn" href={`https://wa.me/${fone(x.loja_telefone)}`} target="_blank" rel="noopener"><Ic n="loja" />Loja</a>}
              </div>
              {x.andamento !== 'a_caminho'
                ? <button className="btn prim grande bloco" style={{ marginTop: 10 }} disabled={ocupado === x.id} onClick={() => marcar(x, 'a_caminho')}><Ic n="seta" />Saí para entrega</button>
                : <button className="btn prim grande bloco ent-verde" style={{ marginTop: 10 }} disabled={ocupado === x.id} onClick={() => marcar(x, 'entregue')}><Ic n="check" />Entreguei</button>}
            </article>
          );
        })}
        {feitas.length > 0 && <><h2 className="pd-tit">Entregues hoje</h2>{feitas.map((x) => (
          <div key={x.id} className="linha-valor" style={{ padding: '6px 0', borderBottom: '1px solid var(--linha)' }}><span>#{x.numero} · {x.loja} · {hora(x.finalizado_em)}</span><b className="num">{brl(x.total)}</b></div>
        ))}</>}
        <section className="cartao">
          <h2 className="cartao-tit">Lojas onde você entrega</h2>
          {!eu.lojas.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>Nenhuma ainda. Passe o seu WhatsApp (<b>{eu.entregador.telefone}</b>) para a loja te adicionar no app Pedêê Parceiro.</p>
            : <div className="lista-config">{eu.lojas.map((l) => <div key={l.nome}><span>🏪 {l.nome}{l.cidade ? ` · ${l.cidade}` : ''}</span></div>)}</div>}
        </section>
        <button className="btn bloco" onClick={async () => { await post('/entregador/sair').catch(() => {}); aoSair(); }}><Ic n="sair" />Sair</button>
      </main>
    </div>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
