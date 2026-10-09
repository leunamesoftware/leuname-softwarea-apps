// Relatórios: vendas do período, formas de pagamento, categorias, produtos mais vendidos e fechamentos de caixa.
import { useState } from 'react';
import { brl, FORMAS, type Forma } from '../../regras/pedido';
import { dataHora, fuso, get, hojeLocal } from '../api';
import { Carregando, CORES_FORMA, Falha, FotoProduto, GraficoBarras, Rosca, useDados, Variacao, Vazio } from '../comuns';
import { Ic } from '../icones';
import { Cabeca } from '../Layout';

interface Dados {
  atual: { pedidos: number; faturamento: number; itens: number; custo: number; lucro: number; ticketMedio: number; descontos: number; taxas: number; entregas: number };
  variacao: { faturamento: number | null; pedidos: number | null; ticketMedio: number | null; itens: number | null };
  porDia: { dia: string; total: number; pedidos: number }[];
  porForma: { forma: string; valor: number }[];
  porCategoria: { categoria: string; total: number; qtd: number }[];
  produtos: { nome: string; foto_id: string | null; icone: string | null; qtd: number; total: number }[];
  canceladas: { n: number; total: number };
}
interface Fechamento { id: string; aberto_em: string; fechado_em: string; fundo: number; contado: number; esperado: number; aberto_por_nome: string | null; fechado_por_nome: string | null }

const somaDias = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const PERIODOS = [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['mes', 'Este mês'], ['livre', 'Escolher']] as const;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function datasDo(p: string, de: string, ate: string): [string, string] {
  const h = hojeLocal();
  if (p === 'hoje') return [h, h];
  if (p === '7') return [somaDias(h, -6), h];
  if (p === '30') return [somaDias(h, -29), h];
  if (p === 'mes') return [h.slice(0, 8) + '01', h];
  return [de, ate];
}

/** Um ponto por dia (ou por mês, em períodos longos), com zero nos dias sem venda. */
function pontosGrafico(porDia: Dados['porDia'], de: string, ate: string) {
  const mapa = new Map(porDia.map((x) => [x.dia, x.total]));
  const dias: string[] = [];
  for (let d = de; d <= ate && dias.length < 400; d = somaDias(d, 1)) dias.push(d);
  if (dias.length > 62) {
    const meses = new Map<string, number>();
    dias.forEach((d) => meses.set(d.slice(0, 7), (meses.get(d.slice(0, 7)) || 0) + (mapa.get(d) || 0)));
    return [...meses].map(([m, v]) => ({ rot: `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`, valor: v }));
  }
  return dias.map((d) => ({ rot: `${d.slice(8)}/${d.slice(5, 7)}`, valor: mapa.get(d) || 0 }));
}

export function Relatorios() {
  const [aba, setAba] = useState<'vendas' | 'caixas'>('vendas');
  return (
    <>
      <Cabeca titulo="Relatórios" sub="Acompanhe o desempenho do seu negócio." />
      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'vendas'} className={`aba ${aba === 'vendas' ? 'sel' : ''}`} onClick={() => setAba('vendas')}><Ic n="grafico" />Vendas</button>
        <button role="tab" aria-selected={aba === 'caixas'} className={`aba ${aba === 'caixas' ? 'sel' : ''}`} onClick={() => setAba('caixas')}><Ic n="gaveta" />Fechamentos de caixa</button>
      </div>
      {aba === 'vendas' ? <Vendas /> : <Fechamentos />}
    </>
  );
}

function Vendas() {
  const [periodo, setPeriodo] = useState<string>('7');
  const [livre, setLivre] = useState({ de: somaDias(hojeLocal(), -6), ate: hojeLocal() });
  const [de, ate] = datasDo(periodo, livre.de, livre.ate);
  const d = useDados(() => get<Dados>(`/relatorios?de=${de}&ate=${ate}&fuso=${fuso()}`), [de, ate]);
  const comparar = periodo === 'hoje' ? 'em relação a ontem' : 'em relação ao período anterior';
  return (
    <>
      <div className="busca-barra" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="chips" role="group" aria-label="Período">{PERIODOS.map(([v, n]) => <button key={v} className={`chip ${periodo === v ? 'sel' : ''}`} onClick={() => setPeriodo(v)}>{n}</button>)}</div>
        {periodo === 'livre' && <span className="periodo"><input type="date" value={livre.de} max={livre.ate} onChange={(e) => e.target.value && setLivre({ ...livre, de: e.target.value })} aria-label="De" /><span>até</span><input type="date" value={livre.ate} min={livre.de} max={hojeLocal()} onChange={(e) => e.target.value && setLivre({ ...livre, ate: e.target.value })} aria-label="Até" /></span>}
      </div>
      {d.carregando && !d.dados ? <Carregando /> : d.erro && !d.dados ? <Falha erro={d.erro} tentar={d.recarregar} /> : <Conteudo x={d.dados!} de={de} ate={ate} comparar={comparar} />}
    </>
  );
}

function Conteudo({ x, de, ate, comparar }: { x: Dados; de: string; ate: string; comparar: string }) {
  const a = x.atual;
  const maxCat = Math.max(1, ...x.porCategoria.map((c) => c.total));
  const totalFormas = x.porForma.reduce((s, f) => s + f.valor, 0);
  const margem = a.faturamento ? Math.round((a.lucro / a.faturamento) * 100) : 0;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><span className="kpi-ic laranja"><Ic n="sacola" t={24} /></span><span>Faturamento</span><b className="num">{brl(a.faturamento)}</b><Variacao v={x.variacao.faturamento} texto={comparar} /></div>
        <div className="kpi"><span className="kpi-ic azul"><Ic n="pedidos" t={24} /></span><span>Pedidos</span><b className="num">{a.pedidos}</b><Variacao v={x.variacao.pedidos} texto={comparar} /></div>
        <div className="kpi"><span className="kpi-ic amarelo"><Ic n="tag" t={24} /></span><span>Ticket médio</span><b className="num">{brl(a.ticketMedio)}</b><Variacao v={x.variacao.ticketMedio} texto={comparar} /></div>
        <div className="kpi"><span className="kpi-ic verde"><Ic n="lucro" t={24} /></span><span>Lucro estimado</span><b className="num verde">{brl(a.lucro)}</b><small>margem de {margem}% · {a.itens} itens vendidos</small></div>
      </div>
      {!a.pedidos ? <div className="cartao"><Vazio icone="grafico" titulo="Nenhuma venda neste período" texto="Escolha outro período ou faça vendas na Frente de Caixa." /></div> : <>
        <div className="inicio-meio">
          <section className="cartao"><h2 className="cartao-tit">Vendas no período</h2><GraficoBarras pontos={pontosGrafico(x.porDia, de, ate)} /></section>
          <section className="cartao"><h2 className="cartao-tit">Formas de pagamento</h2>
            <div className="rosca">
              <Rosca total={totalFormas} fatias={x.porForma.map((f) => ({ rot: FORMAS[f.forma as Forma] || f.forma, valor: f.valor, cor: CORES_FORMA[f.forma] || '#9CA3AF' }))} />
              <div className="legenda">{x.porForma.map((f) => (
                <div key={f.forma}><i style={{ background: CORES_FORMA[f.forma] || '#9CA3AF' }} /><span>{FORMAS[f.forma as Forma] || f.forma}<small>{totalFormas ? Math.round((f.valor / totalFormas) * 100) : 0}%</small></span><b className="num">{brl(f.valor)}</b></div>
              ))}</div>
            </div>
          </section>
        </div>
        <div className="inicio-meio">
          <section className="cartao"><h2 className="cartao-tit">Vendas por categoria</h2>
            {x.porCategoria.map((c) => (
              <div className="barra-cat" key={c.categoria}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.categoria}</span><span className="trilho"><i style={{ width: `${Math.max(2, (c.total / maxCat) * 100)}%` }} /></span><span className="num">{a.faturamento ? Math.round((c.total / a.faturamento) * 100) : 0}%</span><span className="num" style={{ textAlign: 'right' }}>{brl(c.total)}</span></div>
            ))}
          </section>
          <section className="cartao"><h2 className="cartao-tit">Produtos mais vendidos</h2>
            <div className="ranking">{x.produtos.slice(0, 10).map((p, i) => (
              <div className="ranking-linha" key={p.nome + i}><span className="pos">{i + 1}</span><FotoProduto fotoId={p.foto_id} icone={p.icone} nome={p.nome} className="mini" /><span>{p.nome}<small style={{ display: 'block', color: 'var(--suave)', fontWeight: 500 }}>{p.qtd} vendidos</small></span><b className="num">{brl(p.total)}</b></div>
            ))}</div>
          </section>
        </div>
        <div className="cartao" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span>Descontos dados: <b className="num">{brl(a.descontos)}</b></span>
          <span>Custo dos produtos: <b className="num">{brl(a.custo)}</b></span>
          {a.entregas > 0 && <span>Entregas: <b className="num">{a.entregas}</b> (taxas {brl(a.taxas)}, fora do lucro)</span>}
          <span>Vendas canceladas: <b className="num">{x.canceladas.n}</b>{x.canceladas.n > 0 && <> ({brl(x.canceladas.total)})</>}</span>
        </div>
      </>}
    </>
  );
}

function Fechamentos() {
  const d = useDados(() => get<{ caixas: Fechamento[] }>('/caixas'));
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const lista = d.dados!.caixas;
  if (!lista.length) return <div className="cartao"><Vazio icone="gaveta" titulo="Nenhum caixa fechado ainda" texto="Quando fechar o caixa, o resumo aparece aqui." /></div>;
  return (
    <div className="cartao tabela-cartao"><div className="tabela"><table className="tabela-movel">
      <thead><tr><th>Fechado em</th><th className="dir">Diferença</th><th className="dir">Contado</th><th className="dir">Esperado</th><th className="dir">Fundo</th><th>Aberto por</th><th>Fechado por</th></tr></thead>
      <tbody>{lista.map((c) => { const dif = c.contado - c.esperado; return (
        <tr key={c.id}><td>{dataHora(c.fechado_em)}</td>
          <td className="dir num"><b style={{ color: dif === 0 ? 'var(--verde)' : dif < 0 ? 'var(--vermelho)' : 'var(--ambar)' }}>{dif === 0 ? 'Certo' : (dif > 0 ? '+' : '−') + ' ' + brl(Math.abs(dif))}</b></td>
          <td className="dir num">{brl(c.contado)}</td><td className="dir num">{brl(c.esperado)}</td><td className="dir num">{brl(c.fundo)}</td><td>{c.aberto_por_nome || '—'}</td><td>{c.fechado_por_nome || '—'}</td></tr>
      ); })}</tbody>
    </table></div></div>
  );
}
