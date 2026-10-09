// Estoque: insumos (pão, carne, bebidas…), entradas, perdas, acertos de contagem e histórico.
import { useState } from 'react';
import { brl, lerValor } from '../../regras/pedido';
import { dataCurta, dataHora, del, get, post, put } from '../api';
import { Carregando, Falha, Modal, msgErro, useAviso, useConfirmar, useDados, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';

interface Item { id: string; nome: string; categoria: string | null; unidade: 'un' | 'kg' | 'l'; qtd: number; minimo: number; custo: number; ultima_entrada: string | null; ultima_saida: string | null }
interface Movimento { id: string; tipo: string; qtd: number; custo: number | null; motivo: string | null; usuario: string | null; criado_em: string }

const UN: Record<string, string> = { un: 'un', kg: 'kg', l: 'L' };
export const fmtQtd = (q: number, u: string) => `${q.toLocaleString('pt-BR', { maximumFractionDigits: u === 'un' ? 0 : 3 })} ${UN[u] || u}`;
const lerQtd = (s: string) => { const t = s.trim().replace(/\./g, '').replace(',', '.'); return t === '' ? NaN : Number(t); };
const reais = (c: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
const situacao = (i: Item) => (i.qtd <= 0 ? 'sem' : i.qtd <= i.minimo ? 'baixo' : 'ok');
const NOME_SIT = { ok: 'Em estoque', baixo: 'Estoque baixo', sem: 'Sem estoque' };
const NOME_MOV: Record<string, string> = { entrada: 'Entrada', perda: 'Perda', ajuste: 'Acerto', venda: 'Venda', cancelamento: 'Venda cancelada' };

export function Estoque() {
  const d = useDados(() => get<{ itens: Item[] }>('/estoque'));
  const [busca, setBusca] = useState(''), [filtro, setFiltro] = useState('');
  const [editar, setEditar] = useState<Item | 'novo' | null>(null);
  const [mov, setMov] = useState<{ item: Item; tipo: 'entrada' | 'perda' | 'ajuste' } | null>(null);
  const [historico, setHistorico] = useState<Item | null>(null);
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const itens = d.dados!.itens;
  const conta = { ok: 0, baixo: 0, sem: 0 };
  itens.forEach((i) => conta[situacao(i)]++);
  const q = busca.trim().toLowerCase();
  const lista = itens.filter((i) => (!filtro || situacao(i) === filtro) && (!q || i.nome.toLowerCase().includes(q) || (i.categoria || '').toLowerCase().includes(q)));
  const valorTotal = itens.reduce((s, i) => s + Math.max(0, i.qtd) * i.custo, 0);
  return (
    <>
      <Cabeca titulo="Estoque" sub="Controle os insumos e veja o que precisa comprar.">
        <button className="btn prim" onClick={() => setEditar('novo')}><Ic n="mais" />Novo item</button>
      </Cabeca>
      <div className="kpis">
        <button className="kpi" onClick={() => setFiltro('')} style={{ textAlign: 'left', cursor: 'pointer' }}><span className="kpi-ic laranja"><Ic n="estoque" t={24} /></span><span>Itens no estoque</span><b className="num">{itens.length}</b><small>Valor: {brl(Math.round(valorTotal))}</small></button>
        <button className="kpi" onClick={() => setFiltro('ok')} style={{ textAlign: 'left', cursor: 'pointer' }}><span className="kpi-ic verde"><Ic n="check" t={24} /></span><span>Em estoque</span><b className="num">{conta.ok}</b><small>acima do mínimo</small></button>
        <button className="kpi" onClick={() => setFiltro('baixo')} style={{ textAlign: 'left', cursor: 'pointer' }}><span className="kpi-ic amarelo"><Ic n="alerta" t={24} /></span><span>Estoque baixo</span><b className="num">{conta.baixo}</b><small>no mínimo ou abaixo</small></button>
        <button className="kpi" onClick={() => setFiltro('sem')} style={{ textAlign: 'left', cursor: 'pointer' }}><span className="kpi-ic roxo"><Ic n="x" t={24} /></span><span>Sem estoque</span><b className="num">{conta.sem}</b><small>comprar agora</small></button>
      </div>
      <div className="busca-barra" style={{ marginBottom: 14 }}>
        <span className="entrada"><Ic n="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item pelo nome ou categoria…" aria-label="Buscar item" /></span>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Situação"><option value="">Todas as situações</option><option value="ok">Em estoque</option><option value="baixo">Estoque baixo</option><option value="sem">Sem estoque</option></select>
      </div>
      {!lista.length ? <div className="cartao">{itens.length ? <Vazio icone="busca" titulo="Nenhum item encontrado" /> : <Vazio icone="estoque" titulo="Nenhum item no estoque" texto="Cadastre os insumos (pão, carne, queijo, bebidas…) e ligue cada produto aos itens que ele usa. A cada venda o estoque baixa sozinho." />}</div> : <>
        <div className="cartao tabela-cartao so-pc"><div className="tabela"><table>
          <thead><tr><th>Item</th><th>Categoria</th><th className="dir">Quantidade</th><th className="dir">Mínimo</th><th className="dir">Custo</th><th>Situação</th><th>Última entrada</th><th className="dir">Ações</th></tr></thead>
          <tbody>{lista.map((i) => { const s = situacao(i); return (
            <tr key={i.id}>
              <td><b>{i.nome}</b></td><td>{i.categoria || '—'}</td>
              <td className="dir num"><b>{fmtQtd(i.qtd, i.unidade)}</b></td><td className="dir num">{fmtQtd(i.minimo, i.unidade)}</td>
              <td className="dir num">{i.custo ? `${brl(i.custo)}/${UN[i.unidade]}` : '—'}</td>
              <td><span className={`selo ${s}`}>{NOME_SIT[s]}</span></td><td>{i.ultima_entrada ? dataCurta(i.ultima_entrada) : '—'}</td>
              <td className="dir" style={{ whiteSpace: 'nowrap' }}>
                <button className="btn peq" onClick={() => setMov({ item: i, tipo: 'entrada' })}><Ic n="mais" t={16} />Entrada</button>
                <button className="btn-ic" onClick={() => setHistorico(i)} aria-label={`Histórico de ${i.nome}`} title="Histórico e mais ações"><Ic n="pedidos" /></button>
                <button className="btn-ic" onClick={() => setEditar(i)} aria-label={`Editar ${i.nome}`}><Ic n="lapis" /></button>
              </td>
            </tr>
          ); })}</tbody>
        </table></div></div>
        <div className="lista-movel so-movel">{lista.map((i) => { const s = situacao(i); return (
          <button key={i.id} className="item-movel" onClick={() => setHistorico(i)}>
            <span className="bola"><Ic n="estoque" /></span>
            <span className="meio"><b>{i.nome}</b><span className={`selo ${s}`}>{NOME_SIT[s]}</span></span>
            <span className="fim"><b className="num">{fmtQtd(i.qtd, i.unidade)}</b><small>mín. {fmtQtd(i.minimo, i.unidade)}</small></span>
            <Ic n="direita" />
          </button>
        ); })}</div>
      </>}
      {editar && <FormItem item={editar === 'novo' ? null : editar} aoFechar={() => setEditar(null)} aoSalvar={() => { setEditar(null); d.recarregar(); }} />}
      {mov && <FormMovimento item={mov.item} tipoInicial={mov.tipo} aoFechar={() => setMov(null)} aoSalvar={() => { setMov(null); d.recarregar(); }} />}
      {historico && <Historico item={historico} aoFechar={() => setHistorico(null)} acao={(tipo) => { setMov({ item: historico, tipo }); setHistorico(null); }} editar={() => { setEditar(historico); setHistorico(null); }} />}
    </>
  );
}

function FormItem({ item, aoFechar, aoSalvar }: { item: Item | null; aoFechar: () => void; aoSalvar: () => void }) {
  const aviso = useAviso();
  const confirmar = useConfirmar();
  const [f, setF] = useState({ nome: item?.nome || '', categoria: item?.categoria || '', unidade: item?.unidade || 'un', qtd: '', minimo: item ? String(item.minimo).replace('.', ',') : '', custo: reais(item?.custo || 0) });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErros({ ...erros, [k]: '' }); };
  const salvar = async () => {
    const e: Record<string, string> = {};
    const minimo = f.minimo.trim() ? lerQtd(f.minimo) : 0, qtd = f.qtd.trim() ? lerQtd(f.qtd) : 0, custo = f.custo.trim() ? lerValor(f.custo) : 0;
    if (!f.nome.trim()) e.nome = 'Digite o nome do item.';
    if (Number.isNaN(minimo) || minimo < 0) e.minimo = 'Quantidade inválida.';
    if (Number.isNaN(qtd) || qtd < 0) e.qtd = 'Quantidade inválida.';
    if (Number.isNaN(custo) || custo < 0) e.custo = 'Custo inválido.';
    if (f.unidade === 'un' && (!Number.isInteger(qtd) || !Number.isInteger(minimo))) e[!Number.isInteger(qtd) ? 'qtd' : 'minimo'] = 'Em unidades use número inteiro.';
    if (Object.keys(e).length) return setErros(e);
    setOcupado(true);
    const dados = { nome: f.nome.trim(), categoria: f.categoria.trim() || null, unidade: f.unidade, minimo, custo };
    try {
      if (item) await put(`/estoque/${item.id}`, dados); else await post('/estoque', { ...dados, qtd });
      aviso(item ? 'Item salvo.' : 'Item cadastrado.'); aoSalvar();
    } catch (err: any) { setErros(err?.campos || {}); aviso(msgErro(err), 'erro'); } finally { setOcupado(false); } // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const apagar = async () => {
    if (!item || !(await confirmar(`Tirar "${item.nome}" do estoque? Os produtos que usam este item deixam de baixar ele.`, { sim: 'Tirar do estoque', perigo: true }))) return;
    try { await del(`/estoque/${item.id}`); aviso('Item tirado do estoque.'); aoSalvar(); } catch (e) { aviso(msgErro(e), 'erro'); }
  };
  return (
    <Modal titulo={item ? 'Editar item' : 'Novo item de estoque'} aoFechar={aoFechar} pe={<>
      {item && <button className="btn perigo" onClick={apagar} style={{ marginRight: 'auto' }}><Ic n="lixeira" />Tirar</button>}
      <button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button>
    </>}>
      <div className="campos">
        <label className="campo largo">Nome do item<input value={f.nome} onChange={muda('nome')} maxLength={60} placeholder="Ex.: Pão de hambúrguer" aria-invalid={Boolean(erros.nome)} />{erros.nome && <small className="erro">{erros.nome}</small>}</label>
        <label className="campo">Categoria<input value={f.categoria} onChange={muda('categoria')} maxLength={30} placeholder="Ex.: Pães, Carnes, Bebidas" /></label>
        <label className="campo">Unidade<select value={f.unidade} onChange={muda('unidade')}><option value="un">Unidade (un)</option><option value="kg">Quilo (kg)</option><option value="l">Litro (L)</option></select></label>
        {!item && <label className="campo">Quantidade atual<input value={f.qtd} onChange={muda('qtd')} inputMode="decimal" placeholder="0" aria-invalid={Boolean(erros.qtd)} />{erros.qtd && <small className="erro">{erros.qtd}</small>}</label>}
        <label className="campo">Estoque mínimo (avisa quando chegar)<input value={f.minimo} onChange={muda('minimo')} inputMode="decimal" placeholder="0" aria-invalid={Boolean(erros.minimo)} />{erros.minimo && <small className="erro">{erros.minimo}</small>}</label>
        <label className="campo">Custo por {UN[f.unidade]} (R$)<input value={f.custo} onChange={muda('custo')} inputMode="decimal" placeholder="0,00" aria-invalid={Boolean(erros.custo)} />{erros.custo && <small className="erro">{erros.custo}</small>}</label>
      </div>
    </Modal>
  );
}

function FormMovimento({ item, tipoInicial, aoFechar, aoSalvar }: { item: Item; tipoInicial: 'entrada' | 'perda' | 'ajuste'; aoFechar: () => void; aoSalvar: () => void }) {
  const aviso = useAviso();
  const [tipo, setTipo] = useState(tipoInicial);
  const [qtd, setQtd] = useState(''), [custo, setCusto] = useState(''), [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const n = lerQtd(qtd);
  const depois = Number.isNaN(n) ? null : tipo === 'entrada' ? item.qtd + n : tipo === 'perda' ? item.qtd - n : n;
  const salvar = async () => {
    if (Number.isNaN(n) || n < 0 || (tipo !== 'ajuste' && n === 0)) return setErro('Digite a quantidade.');
    if (item.unidade === 'un' && !Number.isInteger(n)) return setErro('Em unidades use número inteiro.');
    if (tipo === 'perda' && !motivo.trim()) return setErro('Diga o motivo da perda.');
    const c = custo.trim() ? lerValor(custo) : undefined;
    if (c !== undefined && (Number.isNaN(c) || c < 0)) return setErro('Custo inválido.');
    setOcupado(true);
    try {
      const r = await post<{ semMudanca?: boolean }>(`/estoque/${item.id}/movimento`, { tipo, qtd: n, custo: tipo === 'entrada' ? c : undefined, motivo: motivo.trim() || null });
      aviso(r.semMudanca ? 'A quantidade já era essa.' : tipo === 'entrada' ? 'Entrada registrada.' : tipo === 'perda' ? 'Perda registrada.' : 'Estoque acertado.'); aoSalvar();
    } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); }
  };
  return (
    <Modal titulo={item.nome} aoFechar={aoFechar} pe={<><button className="btn" onClick={aoFechar}>Voltar</button><button className="btn prim" onClick={salvar} disabled={ocupado}>{ocupado ? 'Salvando…' : 'Confirmar'}</button></>}>
      <div className="abas" role="tablist" style={{ marginBottom: 14 }}>
        {(['entrada', 'perda', 'ajuste'] as const).map((t) => <button key={t} role="tab" aria-selected={tipo === t} className={`aba ${tipo === t ? 'sel' : ''}`} onClick={() => { setTipo(t); setErro(''); }}>{t === 'entrada' ? 'Entrada (compra)' : t === 'perda' ? 'Perda' : 'Acerto de contagem'}</button>)}
      </div>
      <p style={{ margin: '0 0 12px', color: 'var(--suave)' }}>Agora: <b style={{ color: 'var(--texto)' }}>{fmtQtd(item.qtd, item.unidade)}</b>{depois != null && qtd.trim() && <> · Vai ficar: <b style={{ color: depois < 0 ? 'var(--vermelho)' : 'var(--texto)' }}>{fmtQtd(Math.round(depois * 1000) / 1000, item.unidade)}</b></>}</p>
      <div className="campos">
        <label className="campo">{tipo === 'ajuste' ? `Quantidade contada (${UN[item.unidade]})` : `Quantidade (${UN[item.unidade]})`}<input value={qtd} onChange={(e) => { setQtd(e.target.value); setErro(''); }} inputMode="decimal" autoFocus /></label>
        {tipo === 'entrada' && <label className="campo">Custo por {UN[item.unidade]} (R$, opcional)<input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" placeholder={reais(item.custo) || '0,00'} /></label>}
        <label className="campo largo">{tipo === 'perda' ? 'Motivo da perda' : 'Observação (opcional)'}<input value={motivo} onChange={(e) => { setMotivo(e.target.value); setErro(''); }} maxLength={120} placeholder={tipo === 'perda' ? 'Ex.: venceu, caiu no chão' : tipo === 'entrada' ? 'Ex.: nota do fornecedor' : ''} /></label>
      </div>
      {erro && <div className="aviso erro" style={{ marginTop: 12 }}>{erro}</div>}
    </Modal>
  );
}

function Historico({ item, aoFechar, acao, editar }: { item: Item; aoFechar: () => void; acao: (t: 'entrada' | 'perda' | 'ajuste') => void; editar: () => void }) {
  const d = useDados(() => get<{ movimentos: Movimento[] }>(`/estoque/${item.id}/movimentos`), [item.id]);
  const s = situacao(item);
  return (
    <Modal titulo={item.nome} aoFechar={aoFechar} largo pe={<>
      <button className="btn" onClick={editar}><Ic n="lapis" />Editar</button>
      <button className="btn" onClick={() => acao('ajuste')}>Acertar</button>
      <button className="btn" onClick={() => acao('perda')}>Perda</button>
      <button className="btn prim" onClick={() => acao('entrada')}><Ic n="mais" />Entrada</button>
    </>}>
      <p style={{ margin: '0 0 12px' }}><span className={`selo ${s}`}>{NOME_SIT[s]}</span> <b className="num" style={{ marginLeft: 6 }}>{fmtQtd(item.qtd, item.unidade)}</b> <span style={{ color: 'var(--suave)' }}>· mínimo {fmtQtd(item.minimo, item.unidade)}{item.custo ? ` · ${brl(item.custo)}/${UN[item.unidade]}` : ''}</span></p>
      {d.carregando && !d.dados ? <Carregando /> : d.erro ? <Falha erro={d.erro} tentar={d.recarregar} /> : !d.dados!.movimentos.length ? <Vazio icone="pedidos" titulo="Sem movimentações ainda" /> : (
        <div className="tabela"><table className="tabela-movel">
          <thead><tr><th>Data</th><th>Tipo</th><th className="dir">Qtd</th><th>Motivo</th><th>Quem</th></tr></thead>
          <tbody>{d.dados!.movimentos.map((m) => (
            <tr key={m.id}><td>{dataHora(m.criado_em)}</td><td>{NOME_MOV[m.tipo] || m.tipo}</td>
              <td className="dir num" style={{ color: m.qtd < 0 ? 'var(--vermelho)' : 'var(--verde)', fontWeight: 700 }}>{m.qtd > 0 ? '+' : ''}{fmtQtd(m.qtd, item.unidade)}</td>
              <td>{m.motivo || '—'}</td><td>{m.usuario || '—'}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </Modal>
  );
}
