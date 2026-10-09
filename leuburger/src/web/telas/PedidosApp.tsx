// Pedidos que chegam pelo app dos clientes (LeuPede): aceitar (vira venda e vai para a cozinha) ou recusar com motivo.
import { useEffect, useRef, useState } from 'react';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { get, post } from '../api';
import { Modal, msgErro, useAviso } from '../comuns';
import { Ic } from '../icones';
import { useSessao } from '../sessao';

interface PedidoApp {
  id: string; status: 'aguardando' | 'aceito' | 'recusado'; nome: string; telefone: string; tipo: 'entrega' | 'balcao'; endereco: string | null; forma: Forma; troco_para: number | null;
  observacao: string | null; itens: { nome: string; qtd: number; total: number; detalhes: { tamanho?: string; adicionais?: { nome: string }[]; retirar?: string[]; observacao?: string } }[];
  subtotal: number; taxa_entrega: number; total: number; criado_em: string;
}
const det = (d: PedidoApp['itens'][0]['detalhes']) => [d.tamanho && d.tamanho !== 'Padrão' ? d.tamanho : '', ...(d.adicionais || []).map((a) => a.nome), ...(d.retirar || []).map((r) => 'sem ' + r.toLowerCase()), d.observacao || ''].filter(Boolean).join(' · ');

/** Toca um "plim" quando chega pedido novo (o navegador só deixa tocar depois do primeiro toque na tela). */
function plim() {
  try {
    const A = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext); const ctx = new A();
    [0, 0.18].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = k ? 1320 : 880; g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4); });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* sem som */ }
}

export function PedidosApp({ aoAceitar }: { aoAceitar: () => void }) {
  const { eu, recarregar } = useSessao();
  const aviso = useAviso();
  const [lista, setLista] = useState<PedidoApp[]>([]);
  const [recusar, setRecusar] = useState<PedidoApp | null>(null);
  const [ocupado, setOcupado] = useState('');
  const vistos = useRef<Set<string> | null>(null);
  const carregar = () => get<{ pedidos: PedidoApp[] }>('/pedidos-app').then((r) => {
    const novos = r.pedidos.filter((p) => p.status === 'aguardando');
    if (vistos.current && novos.some((p) => !vistos.current!.has(p.id))) { plim(); aviso('Pedido novo pelo app!'); }
    vistos.current = new Set(r.pedidos.map((p) => p.id));
    setLista(novos);
  }).catch(() => {});
  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!eu?.empresa.no_app && !lista.length) return null;

  const aceitar = async (p: PedidoApp) => {
    setOcupado(p.id);
    try { await post(`/pedidos-app/${p.id}/aceitar`); aviso(`Pedido de ${p.nome.split(' ')[0]} aceito. Já está em preparo.`); await carregar(); aoAceitar(); }
    catch (e) { aviso(msgErro(e), 'erro'); } finally { setOcupado(''); }
  };
  const abrirFechar = async () => {
    try { await post('/loja-app/aceitando', { aceitando: !eu!.empresa.aceitando }); await recarregar(); aviso(eu!.empresa.aceitando ? 'Loja fechada no app.' : 'Loja aberta no app!'); } catch (e) { aviso(msgErro(e), 'erro'); }
  };
  return (
    <section className="cartao app-pedidos" style={{ marginBottom: 16 }}>
      <h2 className="cartao-tit"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Ic n="sino" />Pedidos do app {lista.length > 0 && <span className="selo st-a_caminho">{lista.length} novo{lista.length > 1 ? 's' : ''}</span>}</span>
        {eu?.empresa.no_app && <label className="abre-fecha"><span>{eu.empresa.aceitando ? 'Aberta' : 'Fechada'}</span><span className="interruptor"><input type="checkbox" checked={eu.empresa.aceitando} onChange={abrirFechar} aria-label="Recebendo pedidos pelo app" /><span /></span></label>}
      </h2>
      {!lista.length ? <p style={{ margin: 0, color: 'var(--suave)' }}>{eu?.empresa.aceitando ? 'Nenhum pedido esperando. Quando chegar, toca um aviso aqui.' : 'A loja está fechada no app: os clientes veem o cardápio, mas não conseguem pedir.'}</p> : (
        <div className="app-lista">{lista.map((p) => (
          <article key={p.id} className="ped novo">
            <div className="ped-topo"><b>{p.nome}</b><span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</span><small>{new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>
            {p.itens.map((i, k) => <div key={k} className="ped-itens">{i.qtd}x {i.nome}{det(i.detalhes) && <span style={{ color: 'var(--suave)' }}> ({det(i.detalhes)})</span>}</div>)}
            {p.observacao && <div className="ped-obs">Obs.: {p.observacao}</div>}
            {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco}</div>}
            <div className="ped-status"><span>{FORMAS[p.forma]}{p.troco_para ? ` · troco p/ ${brl(p.troco_para)}` : ''}</span><b className="num">{brl(p.total)}</b></div>
            <div className="ped-acoes">
              <button className="btn prim" disabled={ocupado === p.id} onClick={() => aceitar(p)}><Ic n="check" />Aceitar</button>
              <button className="btn" onClick={() => setRecusar(p)}><Ic n="x" />Recusar</button>
              <a className="btn" href={`https://wa.me/${((d) => (d.length <= 11 ? '55' + d : d))(p.telefone.replace(/\D/g, ''))}`} target="_blank" rel="noopener"><Ic n="whatsapp" />Cliente</a>
            </div>
          </article>
        ))}</div>
      )}
      {recusar && <Recusar pedido={recusar} aoFechar={() => setRecusar(null)} aoRecusar={() => { setRecusar(null); carregar(); }} />}
    </section>
  );
}

function Recusar({ pedido, aoFechar, aoRecusar }: { pedido: PedidoApp; aoFechar: () => void; aoRecusar: () => void }) {
  const [motivo, setMotivo] = useState(''), [erro, setErro] = useState('');
  const enviar = async (m: string) => {
    if (m.trim().length < 3) return setErro('Escreva o motivo para o cliente.');
    try { await post(`/pedidos-app/${pedido.id}/recusar`, { motivo: m.trim() }); aoRecusar(); } catch (e) { setErro(msgErro(e)); }
  };
  return (
    <Modal titulo={`Recusar o pedido de ${pedido.nome}`} aoFechar={aoFechar} pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn perigo" onClick={() => enviar(motivo)}>Recusar</button></>}>
      <p style={{ marginTop: 0 }}>O cliente vê o motivo na tela do pedido.</p>
      <div className="chips" style={{ marginBottom: 10 }}>{['Acabou um item do pedido', 'Fora da área de entrega', 'Loja muito cheia agora', 'Já vamos fechar'].map((m) => <button key={m} className="chip" onClick={() => enviar(m)}>{m}</button>)}</div>
      <label className="campo">Outro motivo<input value={motivo} onChange={(e) => { setMotivo(e.target.value); setErro(''); }} maxLength={150} /></label>
      {erro && <p className="aviso erro">{erro}</p>}
    </Modal>
  );
}
