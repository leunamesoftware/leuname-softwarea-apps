// Acompanhar: painel dos pedidos do dia (em preparo → pronto/a caminho → finalizado).
// O motoboy marca "saí" e "entreguei" pelo link dele; o painel se atualiza sozinho e avisa.
import { useEffect, useRef, useState } from 'react';
import { brl } from '../../regras/pedido';
import { get, post } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';
import { useSessao } from '../sessao';

export interface PedidoAndamento {
  id: string; numero: number; tipo: 'entrega' | 'balcao'; andamento: string; total: number; troco: number; criado_em: string; pronto_em: string | null; saiu_em: string | null;
  finalizado_em: string | null; entregador: string | null; endereco_entrega: string | null; observacao: string | null; token_cliente: string; token_entregador: string;
  cliente: string | null; cliente_telefone: string | null; resumo: string | null; formas: string | null;
}
export const NOME_ANDAMENTO: Record<string, string> = { preparando: 'Em preparo', pronto: 'Pronto', a_caminho: 'A caminho', entregue: 'Entregue', retirado: 'Retirado', cancelado: 'Cancelado' };
const FINAIS = ['entregue', 'retirado'];

export const linkCliente = (token: string) => `${location.origin}/p/${token}`;
export const linkMotoboy = (token: string) => `${location.origin}/m/${token}`;
export function wa(tel: string | null | undefined, texto: string) {
  const n = (tel || '').replace(/\D/g, '');
  return `https://wa.me/${n.length >= 10 ? (n.length <= 11 ? '55' + n : n) : ''}?text=${encodeURIComponent(texto)}`;
}
/** Mensagem para o cliente conforme o passo do pedido. */
export function mensagemCliente(p: { numero: number; tipo: string; andamento: string; token_cliente: string }, loja: string) {
  const link = linkCliente(p.token_cliente);
  if (p.andamento === 'a_caminho') return `*${loja}*\nSeu pedido #${p.numero} saiu para entrega! 🛵\nAcompanhe aqui: ${link}`;
  if (p.andamento === 'pronto') return p.tipo === 'entrega' ? `*${loja}*\nSeu pedido #${p.numero} está pronto e já vai sair para entrega. Acompanhe: ${link}` : `*${loja}*\nSeu pedido #${p.numero} está pronto para retirar! 🍔`;
  if (FINAIS.includes(p.andamento)) return `*${loja}*\nPedido #${p.numero} ${p.andamento === 'entregue' ? 'entregue' : 'retirado'}. Obrigado pela preferência! 😋`;
  return `*${loja}*\nRecebemos seu pedido #${p.numero} e ele já está em preparo! 👨‍🍳\nAcompanhe aqui: ${link}`;
}
const minutos = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));
const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');

export function Andamento() {
  const { eu } = useSessao();
  const aviso = useAviso();
  const d = useDados(() => get<{ pedidos: PedidoAndamento[] }>('/andamento'));
  const [motoboy, setMotoboy] = useState<PedidoAndamento | null>(null);
  const [, tique] = useState(0);
  const antes = useRef<Map<string, string> | null>(null);
  const meus = useRef(new Set<string>());

  // Atualiza sozinho a cada 15 s e avisa quando o motoboy muda algo.
  useEffect(() => { const t = setInterval(() => { d.recarregar(); tique((x) => x + 1); }, 15000); return () => clearInterval(t); }, [d.recarregar]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!d.dados) return;
    const agora = new Map(d.dados.pedidos.map((p) => [p.id, p.andamento]));
    if (antes.current) for (const p of d.dados.pedidos) {
      const era = antes.current.get(p.id);
      if (era && era !== p.andamento && !meus.current.has(p.id + p.andamento)) {
        aviso(`Pedido #${p.numero}: ${NOME_ANDAMENTO[p.andamento].toLowerCase()}${p.entregador ? ` (${p.entregador})` : ''}`);
        try { navigator.vibrate?.(200); } catch { /* sem vibração */ }
      }
    }
    antes.current = agora;
  }, [d.dados, aviso]);

  const mudar = async (p: PedidoAndamento, andamento: string, entregador?: string | null) => {
    meus.current.add(p.id + andamento);
    try { await post(`/vendas/${p.id}/andamento`, { andamento, ...(entregador !== undefined ? { entregador } : {}) }); d.recarregar(); }
    catch (e) { aviso(msgErro(e), 'erro'); }
  };

  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const lista = d.dados!.pedidos;
  const colunas = [
    { tit: 'Em preparo', ic: 'hamburguer', itens: lista.filter((p) => p.andamento === 'preparando') },
    { tit: 'Pronto / a caminho', ic: 'seta', itens: lista.filter((p) => p.andamento === 'pronto' || p.andamento === 'a_caminho') },
    { tit: 'Finalizados (3 h)', ic: 'check', itens: lista.filter((p) => FINAIS.includes(p.andamento)).reverse() },
  ];
  const loja = eu!.empresa.nome;
  return (
    <>
      <Cabeca titulo="Acompanhar pedidos" sub="Cozinha, retirada e entregas. Atualiza sozinho." />
      {!lista.length ? <div className="cartao"><Vazio icone="pedidos" titulo="Nenhum pedido em andamento" texto="Os pedidos aparecem aqui assim que a venda é finalizada no caixa." /></div> : (
        <div className="quadro">
          {colunas.map((col) => (
            <section key={col.tit} className="quadro-col" aria-label={col.tit}>
              <h2><Ic n={col.ic} t={18} />{col.tit}<span className="selo">{col.itens.length}</span></h2>
              {!col.itens.length && <p className="quadro-vazio">Nada aqui.</p>}
              {col.itens.map((p) => {
                const min = minutos(p.criado_em), final = FINAIS.includes(p.andamento);
                return (
                  <article key={p.id} className={`ped ${final ? 'final' : ''}`}>
                    <div className="ped-topo">
                      <b>#{p.numero}</b>
                      <span className={`selo ${p.tipo === 'entrega' ? 'cat-combo' : ''}`}>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Balcão'}</span>
                      {!final && <span className={`tempo ${min >= 40 ? 'alto' : min >= 25 ? 'medio' : ''}`}>{min} min</span>}
                      {final && <small>{hora(p.finalizado_em)}</small>}
                    </div>
                    {p.cliente && <div className="ped-cli">{p.cliente}</div>}
                    {p.resumo && <div className="ped-itens">{p.resumo}</div>}
                    {p.observacao && <div className="ped-obs">Obs.: {p.observacao}</div>}
                    {p.tipo === 'entrega' && <div className="ped-end"><Ic n="inicio" t={16} />{p.endereco_entrega}</div>}
                    <div className="ped-status">
                      <span className={`selo st-${p.andamento}`}>{NOME_ANDAMENTO[p.andamento]}</span>
                      {p.entregador && <small>Motoboy: {p.entregador}</small>}
                      <b className="num">{brl(p.total)}</b>
                    </div>
                    <div className="ped-acoes">
                      {p.andamento === 'preparando' && <button className="btn prim" onClick={() => mudar(p, 'pronto')}><Ic n="check" />Pronto</button>}
                      {p.andamento === 'pronto' && p.tipo === 'balcao' && <button className="btn prim" onClick={() => mudar(p, 'retirado')}><Ic n="check" />Cliente retirou</button>}
                      {p.andamento === 'pronto' && p.tipo === 'entrega' && <button className="btn prim" onClick={() => setMotoboy(p)}><Ic n="seta" />Mandar ao motoboy</button>}
                      {p.andamento === 'a_caminho' && <button className="btn prim" onClick={() => mudar(p, 'entregue')}><Ic n="check" />Entregue</button>}
                      {p.tipo === 'entrega' && ['preparando', 'a_caminho'].includes(p.andamento) && <button className="btn" onClick={() => setMotoboy(p)}><Ic n="seta" />Motoboy</button>}
                      <a className="btn" href={wa(p.cliente_telefone, mensagemCliente(p, loja))} target="_blank" rel="noopener"><Ic n="whatsapp" />Avisar cliente</a>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}
      {motoboy && <MandarMotoboy pedido={motoboy} aoFechar={() => setMotoboy(null)} aoSaiu={(nome) => { mudar(motoboy, 'a_caminho', nome || null); setMotoboy(null); }} />}
    </>
  );
}

function MandarMotoboy({ pedido: p, aoFechar, aoSaiu }: { pedido: PedidoAndamento; aoFechar: () => void; aoSaiu: (nome: string) => void }) {
  const aviso = useAviso();
  const [nome, setNome] = useState(() => p.entregador || (() => { try { return localStorage.getItem('leuburger_motoboy') || ''; } catch { return ''; } })());
  const [tel, setTel] = useState(() => { try { return localStorage.getItem('leuburger_motoboy_tel') || ''; } catch { return ''; } });
  const guardar = () => { try { localStorage.setItem('leuburger_motoboy', nome.trim()); localStorage.setItem('leuburger_motoboy_tel', tel.trim()); } catch { /* sem armazenamento */ } };
  const texto = `🛵 Entrega do pedido #${p.numero}\n${p.cliente ? p.cliente + '\n' : ''}${p.endereco_entrega}\n\nAbra para ver tudo e marcar quando sair e quando entregar:\n${linkMotoboy(p.token_entregador)}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(linkMotoboy(p.token_entregador)); aviso('Link do motoboy copiado.'); } catch { aviso('Não deu para copiar. Use o WhatsApp.', 'erro'); } };
  return (
    <Modal titulo={`Motoboy · pedido #${p.numero}`} aoFechar={aoFechar} pe={<>
      <button className="btn" onClick={copiar}>Copiar link</button>
      {p.andamento !== 'a_caminho' && <button className="btn prim" onClick={() => { guardar(); aoSaiu(nome.trim()); }}><Ic n="seta" />Saiu para entrega</button>}
    </>}>
      <p style={{ marginTop: 0 }}>Mande o link para o motoboy. Pelo celular dele, ele vê o endereço (com mapa), o telefone do cliente e o troco, e marca <b>Saí para entrega</b> e <b>Entreguei</b>. O painel atualiza sozinho.</p>
      <div className="campos">
        <label className="campo">Nome do motoboy (opcional)<input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 40))} placeholder="Ex.: João" /></label>
        <label className="campo">WhatsApp do motoboy (opcional)<input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(11) 98765-4321" /></label>
      </div>
      <a className="btn prim bloco grande" style={{ marginTop: 14 }} href={wa(tel, texto)} target="_blank" rel="noopener" onClick={guardar}><Ic n="whatsapp" />Enviar link pelo WhatsApp</a>
    </Modal>
  );
}
