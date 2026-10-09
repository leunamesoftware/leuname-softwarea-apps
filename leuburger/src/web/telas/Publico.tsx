// Páginas sem login: acompanhamento do cliente (/p/código) e entrega do motoboy (/m/código).
import { useEffect, useState } from 'react';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { get, post } from '../api';
import { msgErro } from '../comuns';
import { detalhesItem } from '../comprovante';
import { Ic } from '../icones';
import { NOME_ANDAMENTO, wa } from './Andamento';

interface Publico {
  loja: string; loja_telefone: string | null; numero: number; tipo: 'entrega' | 'balcao'; andamento: string; criado_em: string; pronto_em: string | null; saiu_em: string | null;
  finalizado_em: string | null; entregador: string | null; total: number; taxa_entrega: number;
  itens: { nome: string; qtd: number; detalhes: Parameters<typeof detalhesItem>[0] }[];
}
interface Entrega extends Publico { cliente: string | null; cliente_telefone: string | null; endereco: string; observacao: string | null; troco: number; pagamentos: { forma: string; valor: number }[] }

const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const FINAIS = ['entregue', 'retirado', 'cancelado'];

/** Carrega e recarrega a cada 15 s até o pedido terminar. */
function usePublico<T extends Publico>(caminho: string) {
  const [p, setP] = useState<T | null>(null);
  const [erro, setErro] = useState('');
  const carregar = () => get<{ pedido: T }>(caminho).then((r) => { setP(r.pedido); setErro(''); }).catch((e) => setErro(msgErro(e)));
  useEffect(() => {
    carregar();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 15000);
    return () => clearInterval(t);
  }, [caminho]); // eslint-disable-line react-hooks/exhaustive-deps
  return { p, erro, carregar };
}

function Casca({ loja, children }: { loja?: string; children: React.ReactNode }) {
  return <div className="publico"><header><b>{loja || 'Pedido'}</b></header><main>{children}</main></div>;
}
function Linha({ feito, atual, titulo, quando }: { feito: boolean; atual: boolean; titulo: string; quando?: string }) {
  return <li className={`${feito ? 'feito' : ''} ${atual ? 'atual' : ''}`}><span className="bola">{feito ? <Ic n="check" t={16} /> : null}</span><b>{titulo}</b>{quando && <small>{quando}</small>}</li>;
}

export function AcompanharPedido({ token }: { token: string }) {
  const { p, erro } = usePublico<Publico>(`/publico/pedido/${encodeURIComponent(token)}`);
  if (!p) return <Casca>{erro ? <p className="aviso erro">{erro}</p> : <div className="carregando"><div className="giro" /></div>}</Casca>;
  const ordem = p.tipo === 'entrega' ? ['preparando', 'pronto', 'a_caminho', 'entregue'] : ['preparando', 'pronto', 'retirado'];
  const pos = ordem.indexOf(p.andamento);
  const titulo = p.andamento === 'cancelado' ? 'Pedido cancelado' : p.andamento === 'a_caminho' ? 'Saiu para entrega! 🛵' : p.andamento === 'entregue' ? 'Pedido entregue 😋'
    : p.andamento === 'retirado' ? 'Pedido retirado 😋' : p.andamento === 'pronto' ? (p.tipo === 'entrega' ? 'Pronto, já vai sair!' : 'Pronto para retirar! 🍔') : 'Em preparo 👨‍🍳';
  return (
    <Casca loja={p.loja}>
      <section className="cartao" style={{ textAlign: 'center' }}>
        <small style={{ color: 'var(--suave)' }}>Pedido #{p.numero}</small>
        <h1 style={{ margin: '4px 0 0' }}>{titulo}</h1>
        {!FINAIS.includes(p.andamento) && <p style={{ color: 'var(--suave)', margin: '6px 0 0' }}>Esta página atualiza sozinha.</p>}
      </section>
      {p.andamento !== 'cancelado' && <section className="cartao"><ol className="passos">
        <Linha feito atual={pos === 0} titulo="Pedido recebido · em preparo" quando={hora(p.criado_em)} />
        <Linha feito={pos >= 1} atual={pos === 1} titulo={p.tipo === 'entrega' ? 'Pronto' : 'Pronto para retirar'} quando={hora(p.pronto_em)} />
        {p.tipo === 'entrega' && <Linha feito={pos >= 2} atual={pos === 2} titulo={`Saiu para entrega${p.entregador ? ` com ${p.entregador}` : ''}`} quando={hora(p.saiu_em)} />}
        <Linha feito={pos === ordem.length - 1} atual={pos === ordem.length - 1} titulo={p.tipo === 'entrega' ? 'Entregue' : 'Retirado'} quando={hora(p.finalizado_em)} />
      </ol></section>}
      <section className="cartao">
        <h2 className="cartao-tit">Seu pedido</h2>
        {p.itens.map((i, k) => <div key={k} style={{ padding: '6px 0', borderBottom: '1px solid var(--linha)' }}><b>{i.qtd}x {i.nome}</b>{detalhesItem(i.detalhes) && <div style={{ color: 'var(--suave)', fontSize: 14 }}>{detalhesItem(i.detalhes)}</div>}</div>)}
        {p.taxa_entrega > 0 && <div className="linha-valor" style={{ marginTop: 8 }}><span>Taxa de entrega</span><b className="num">{brl(p.taxa_entrega)}</b></div>}
        <div className="total" style={{ fontSize: 22, marginTop: 6 }}><span>Total</span><b className="num">{brl(p.total)}</b></div>
      </section>
      {p.loja_telefone && <a className="btn bloco grande" href={wa(p.loja_telefone, `Olá! Sobre o meu pedido #${p.numero}…`)} target="_blank" rel="noopener"><Ic n="whatsapp" />Falar com a loja</a>}
    </Casca>
  );
}

export function PaginaMotoboy({ token }: { token: string }) {
  const { p, erro, carregar } = usePublico<Entrega>(`/publico/entrega/${encodeURIComponent(token)}`);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const marcar = async (andamento: 'a_caminho' | 'entregue') => {
    setOcupado(true); setMsg('');
    try { await post(`/publico/entrega/${encodeURIComponent(token)}`, { andamento }); await carregar(); } catch (e) { setMsg(msgErro(e)); } finally { setOcupado(false); }
  };
  if (!p) return <Casca>{erro ? <p className="aviso erro">{erro}</p> : <div className="carregando"><div className="giro" /></div>}</Casca>;
  const dinheiro = p.pagamentos.some((x) => x.forma === 'dinheiro');
  const fone = (p.cliente_telefone || '').replace(/\D/g, '');
  return (
    <Casca loja={p.loja}>
      <section className="cartao">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h1 style={{ margin: 0, fontSize: 24 }}>🛵 Entrega #{p.numero}</h1><span className={`selo st-${p.andamento}`}>{NOME_ANDAMENTO[p.andamento]}</span></div>
        {p.cliente && <p style={{ margin: '10px 0 0', fontSize: 18 }}><b>{p.cliente}</b></p>}
        <p style={{ margin: '6px 0 12px', fontSize: 18 }}>{p.endereco}</p>
        {p.observacao && <p className="aviso" style={{ margin: '0 0 12px' }}>Obs.: {p.observacao}</p>}
        <div className="dupla">
          <a className="btn grande" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.endereco)}`} target="_blank" rel="noopener"><Ic n="seta" />Abrir no mapa</a>
          {fone ? <a className="btn grande" href={`tel:${fone}`}><Ic n="usuario" />Ligar</a> : <span />}
        </div>
        {fone && <a className="btn bloco" style={{ marginTop: 10 }} href={wa(fone, `Olá${p.cliente ? ', ' + p.cliente.split(' ')[0] : ''}! Sou o entregador do pedido #${p.numero} da ${p.loja}.`)} target="_blank" rel="noopener"><Ic n="whatsapp" />WhatsApp do cliente</a>}
      </section>
      <section className="cartao">
        <h2 className="cartao-tit">Pagamento</h2>
        {p.pagamentos.map((x, k) => <div className="linha-valor" key={k}><span>{FORMAS[x.forma as Forma] || x.forma}</span><b className="num">{brl(x.valor)}</b></div>)}
        <div className="total" style={{ fontSize: 22, marginTop: 6 }}><span>Total</span><b className="num">{brl(p.total)}</b></div>
        {dinheiro && p.troco > 0 && <div className="aviso" style={{ marginTop: 10 }}><b>Levar troco: {brl(p.troco)}</b></div>}
        <h2 className="cartao-tit" style={{ marginTop: 14 }}>Itens</h2>
        {p.itens.map((i, k) => <div key={k}>{i.qtd}x {i.nome}</div>)}
      </section>
      {msg && <p className="aviso erro">{msg}</p>}
      {p.andamento === 'cancelado' ? <p className="aviso erro">Este pedido foi cancelado pela loja.</p>
        : p.andamento === 'entregue' ? <div className="aviso ok" style={{ textAlign: 'center', fontSize: 18 }}><b>✅ Entregue às {hora(p.finalizado_em)}</b></div>
          : <div style={{ display: 'grid', gap: 10 }}>
            {p.andamento !== 'a_caminho' && <button className="btn grande bloco" disabled={ocupado} onClick={() => marcar('a_caminho')}><Ic n="seta" />Saí para entrega</button>}
            <button className="btn prim grande bloco" disabled={ocupado} onClick={() => marcar('entregue')}><Ic n="check" />Entreguei</button>
          </div>}
    </Casca>
  );
}
