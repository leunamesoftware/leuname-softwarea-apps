// Pedidos: histórico das vendas, detalhes, reimpressão e cancelamento com motivo.
import { useState } from 'react';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { dataHora, fuso, get, hojeLocal, post } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useDados, Vazio } from '../comuns';
import { detalhesItem, imprimirComprovante, type VendaCompleta } from '../comprovante';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';
import { useSessao } from '../sessao';

interface LinhaVenda { id: string; numero: number; total: number; status: string; tipo?: string; criado_em: string; operador: string | null; cliente: string | null; itens: number; formas: string | null }
const nomesFormas = (f: string | null) => [...new Set((f || '').split(',').filter(Boolean))].map((x) => FORMAS[x as Forma]?.replace('Cartão ', '') || x).join(' + ');

export function Pedidos() {
  const [de, setDe] = useState(hojeLocal()), [ate, setAte] = useState(hojeLocal());
  const [status, setStatus] = useState(''), [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const d = useDados(() => get<{ vendas: LinhaVenda[] }>(`/vendas?de=${de}&ate=${ate}&fuso=${fuso()}&status=${status}&busca=${encodeURIComponent(busca.trim())}`), [de, ate, status, busca]);
  const lista = d.dados?.vendas || [];
  const concl = lista.filter((v) => v.status === 'concluida');
  return (
    <>
      <Cabeca titulo="Pedidos" sub="Consulte, reimprima ou cancele as vendas." />
      <div className="busca-barra" style={{ marginBottom: 14 }}>
        <span className="entrada"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nº do pedido ou cliente…" aria-label="Buscar pedido" /></span>
        <span className="periodo"><input type="date" value={de} max={ate} onChange={(e) => e.target.value && setDe(e.target.value)} aria-label="De" /><span>até</span><input type="date" value={ate} min={de} onChange={(e) => e.target.value && setAte(e.target.value)} aria-label="Até" /></span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação"><option value="">Todos</option><option value="concluida">Concluídos</option><option value="cancelada">Cancelados</option></select>
      </div>
      {!d.carregando && concl.length > 0 && <p style={{ margin: '0 0 12px', color: 'var(--suave)' }}><b style={{ color: 'var(--texto)' }}>{concl.length}</b> pedido(s) concluído(s) · <b style={{ color: 'var(--texto)' }} className="num">{brl(concl.reduce((s, v) => s + v.total, 0))}</b></p>}
      {d.carregando && !d.dados ? <Carregando /> : d.erro ? <Falha erro={d.erro} tentar={d.recarregar} /> : !lista.length ? <div className="cartao"><Vazio icone="pedidos" titulo="Nenhum pedido neste período" /></div> : (
        <div className="cartao tabela-cartao"><div className="tabela"><table className="tabela-movel">
          <thead><tr><th>Nº</th><th>Data</th><th className="dir">Total</th><th>Pagamento</th><th>Cliente</th><th className="cen">Itens</th><th>Situação</th></tr></thead>
          <tbody>{lista.map((v) => (
            <tr key={v.id} className="clicavel" onClick={() => setAberta(v.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setAberta(v.id)}>
              <td><b>#{v.numero}</b>{v.tipo === 'entrega' && <span title="Entrega"> 🛵</span>}</td><td>{dataHora(v.criado_em)}</td><td className="dir num"><b>{v.status === 'cancelada' ? <s>{brl(v.total)}</s> : brl(v.total)}</b></td>
              <td>{nomesFormas(v.formas)}</td><td>{v.cliente || '—'}</td><td className="cen">{v.itens}</td>
              <td><span className={`selo ${v.status === 'cancelada' ? 'cancelada' : 'ok'}`}>{v.status === 'cancelada' ? 'Cancelado' : 'Concluído'}</span></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      {aberta && <DetalheVenda id={aberta} aoFechar={() => setAberta(null)} aoMudar={d.recarregar} />}
    </>
  );
}

function DetalheVenda({ id, aoFechar, aoMudar }: { id: string; aoFechar: () => void; aoMudar: () => void }) {
  const { eu, pode } = useSessao();
  const aviso = useAviso();
  const d = useDados(() => get<{ venda: VendaCompleta }>(`/vendas/${id}`), [id]);
  const [cancelar, setCancelar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const v = d.dados?.venda;
  const confirmarCancelamento = async () => {
    if (motivo.trim().length < 5) return setErro('Escreva o motivo (pelo menos 5 letras).');
    setOcupado(true);
    try { await post(`/vendas/${id}/cancelar`, { motivo: motivo.trim() }); aviso('Venda cancelada. O estoque foi devolvido.'); setCancelar(false); d.recarregar(); aoMudar(); }
    catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={v ? `Pedido #${v.numero}` : 'Pedido'} aoFechar={aoFechar} largo pe={v && <>
      {v.status === 'concluida' && pode('cancelarVenda') && !cancelar && <button className="btn perigo" onClick={() => setCancelar(true)}><Ic n="x" />Cancelar venda</button>}
      <button className="btn prim" onClick={() => imprimirComprovante(v, eu!.empresa)}><Ic n="impressora" />Reimprimir</button>
    </>}>
      {d.carregando && !v ? <Carregando /> : d.erro || !v ? <Falha erro={d.erro || ''} tentar={d.recarregar} /> : <>
        <p style={{ margin: '0 0 10px', color: 'var(--suave)' }}>{dataHora(v.criado_em)} · {v.operador}{v.cliente ? ` · Cliente: ${v.cliente}` : ''}</p>
        {v.tipo === 'entrega' && <div className="aviso" style={{ marginBottom: 12 }}><b>🛵 Entrega:</b> {v.endereco_entrega}{v.cliente_telefone ? ` · Tel. ${v.cliente_telefone}` : ''}</div>}
        {v.status === 'cancelada' && <div className="aviso erro" style={{ marginBottom: 12 }}><b>Cancelada</b> em {dataHora(v.cancelada_em!)} por {v.cancelada_por_nome}. Motivo: {v.motivo_cancelamento}</div>}
        <div className="tabela"><table><thead><tr><th>Item</th><th className="cen">Qtd</th><th className="dir">Unit.</th><th className="dir">Total</th></tr></thead>
          <tbody>{v.itens.map((i) => <tr key={i.id}><td><b>{i.nome}</b>{detalhesItem(i.detalhes) && <div style={{ color: 'var(--suave)', fontSize: 13 }}>{detalhesItem(i.detalhes)}</div>}</td><td className="cen">{i.qtd}</td><td className="dir num">{brl(i.preco_unit)}</td><td className="dir num">{brl(i.total)}</td></tr>)}</tbody>
        </table></div>
        <div style={{ display: 'grid', gap: 6, marginTop: 12, maxWidth: 360, marginLeft: 'auto' }}>
          <div className="linha-valor"><span>Subtotal</span><b className="num">{brl(v.subtotal)}</b></div>
          {v.desconto > 0 && <div className="linha-valor"><span>Desconto</span><b className="num">− {brl(v.desconto)}</b></div>}
          {Boolean(v.taxa_entrega) && <div className="linha-valor"><span>Taxa de entrega</span><b className="num">{brl(v.taxa_entrega!)}</b></div>}
          <div className="total" style={{ fontSize: 21 }}><span>Total</span><b className="num">{brl(v.total)}</b></div>
          {v.pagamentos.map((p, k) => <div className="linha-valor" key={k}><span>{FORMAS[p.forma as Forma] || p.forma}</span><b className="num">{brl(p.valor)}</b></div>)}
          {v.troco > 0 && <div className="linha-valor"><span>Troco</span><b className="num">{brl(v.troco)}</b></div>}
        </div>
        {v.observacao && <p><b>Observação:</b> {v.observacao}</p>}
        {cancelar && <div className="cartao" style={{ marginTop: 14, background: '#FFF8F8', borderColor: '#F5C2C2' }}>
          <label className="campo">Motivo do cancelamento<input value={motivo} onChange={(e) => { setMotivo(e.target.value); setErro(''); }} placeholder="Ex.: cliente desistiu, pedido errado" autoFocus maxLength={200} /></label>
          {erro && <div className="aviso erro" style={{ marginTop: 10 }}>{erro}</div>}
          <p style={{ color: 'var(--suave)', fontSize: 13.5 }}>O estoque usado nesta venda volta, e ela sai dos relatórios e do caixa.</p>
          <div className="dupla"><button className="btn" onClick={() => setCancelar(false)}>Voltar</button><button className="btn perigo" onClick={confirmarCancelamento} disabled={ocupado}>Confirmar cancelamento</button></div>
        </div>}
      </>}
    </Modal>
  );
}
