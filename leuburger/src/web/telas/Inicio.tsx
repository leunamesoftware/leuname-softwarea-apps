// Início: resumo do dia (o caixa vê só os atalhos; dono e gerente veem os números).
import { Link } from 'react-router-dom';
import { brl } from '../../regras/pedido';
import { fuso, get, hojeLocal } from '../api';
import { Carregando, Falha, FotoProduto, GraficoLinha, useDados, Variacao, Vazio } from '../comuns';
import { Ic } from '../icones';
import { useSessao } from '../sessao';

interface DadosInicio {
  hoje: { faturamento: number; pedidos: number; ticketMedio: number; lucro: number };
  variacao: { faturamento: number | null; pedidos: number | null; ticketMedio: number | null; lucro: number | null };
  horas: { hora: number; total: number }[];
  maisVendidos: { nome: string; foto_id: string | null; icone: string | null; qtd: number }[];
  categorias: { id: string; nome: string; icone: string; qtd: number }[];
  estoque: { sem: number; baixo: number };
}
const FOTO_CAT: Record<string, string> = { hamburguer: '/img/hamburguer.webp', porcao: '/img/porcao.webp', bebida: '/img/bebida.webp', combo: '/img/combo.webp' };

export function Inicio() {
  const { eu, pode } = useSessao();
  const primeiro = eu!.usuario.nome.split(' ')[0];
  if (!pode('painel')) return (
    <>
      <div className="cabeca"><div><h1>Olá, {primeiro}!</h1><p>Bom trabalho hoje.</p></div></div>
      <div className="cat-cartoes">
        <Link className="cat-cartao" to="/caixa"><img src="/img/hamburguer.webp" alt="" /><div><span><b>Frente de Caixa</b><small>Novo pedido</small></span><span className="ir"><Ic n="seta" t={16} /></span></div></Link>
        <Link className="cat-cartao" to="/pedidos"><img src="/img/combo.webp" alt="" /><div><span><b>Pedidos</b><small>Histórico de hoje</small></span><span className="ir"><Ic n="seta" t={16} /></span></div></Link>
        <Link className="cat-cartao" to="/gaveta"><img src="/img/bebida.webp" alt="" /><div><span><b>Caixa</b><small>Abrir e fechar</small></span><span className="ir"><Ic n="seta" t={16} /></span></div></Link>
      </div>
    </>
  );
  return <Painel nome={primeiro} />;
}

function Painel({ nome }: { nome: string }) {
  const d = useDados(() => get<DadosInicio>(`/inicio?hoje=${hojeLocal()}&fuso=${fuso()}`));
  if (d.carregando && !d.dados) return <Carregando />;
  if (d.erro && !d.dados) return <Falha erro={d.erro} tentar={d.recarregar} />;
  const x = d.dados!;
  // Do começo do expediente (8h, ou antes se já vendeu) até a hora atual; no mínimo 2 pontos.
  const agora = new Date().getHours(), comHora = x.horas.map((y) => y.hora);
  const fim = Math.max(agora, ...comHora), ini = Math.min(8, ...comHora, Math.max(0, fim - 1));
  const horas = Array.from({ length: fim - ini + 1 }, (_, k) => k + ini).map((h) => ({ rot: `${String(h).padStart(2, '0')}h`, valor: x.horas.find((y) => y.hora === h)?.total || 0 }));
  return (
    <>
      <div className="cabeca"><div><h1>Olá, {nome}!</h1><p>Aqui está o resumo do seu negócio hoje.</p></div>
        <div className="acoes"><Link className="btn prim" to="/caixa"><Ic n="caixa" />Novo pedido</Link></div></div>
      <div className="kpis">
        <div className="kpi"><span className="kpi-ic laranja"><Ic n="sacola" t={24} /></span><span>Vendas de hoje</span><b className="num">{brl(x.hoje.faturamento)}</b><Variacao v={x.variacao.faturamento} /></div>
        <div className="kpi"><span className="kpi-ic azul"><Ic n="pedidos" t={24} /></span><span>Pedidos de hoje</span><b className="num">{x.hoje.pedidos}</b><Variacao v={x.variacao.pedidos} /></div>
        <div className="kpi"><span className="kpi-ic amarelo"><Ic n="tag" t={24} /></span><span>Ticket médio</span><b className="num">{brl(x.hoje.ticketMedio)}</b><Variacao v={x.variacao.ticketMedio} /></div>
        <div className="kpi"><span className="kpi-ic verde"><Ic n="grafico" t={24} /></span><span>Lucro estimado</span><b className="num verde">{brl(x.hoje.lucro)}</b><Variacao v={x.variacao.lucro} /></div>
      </div>
      {(x.estoque.sem > 0 || x.estoque.baixo > 0) && <Link to="/estoque" className="aviso" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, textDecoration: 'none' }}>
        <Ic n="alerta" /><span style={{ flex: 1 }}><b>Estoque:</b> {x.estoque.sem > 0 && `${x.estoque.sem} item(ns) sem estoque`}{x.estoque.sem > 0 && x.estoque.baixo > 0 && ' e '}{x.estoque.baixo > 0 && `${x.estoque.baixo} com estoque baixo`}.</span><Ic n="direita" /></Link>}
      <div className="inicio-meio">
        <section className="cartao"><h2 className="cartao-tit">Vendas das últimas horas <span className="selo">Hoje</span></h2>
          {x.hoje.pedidos ? <GraficoLinha pontos={horas} /> : <Vazio icone="grafico" titulo="Nenhuma venda hoje ainda" texto="As vendas aparecem aqui hora a hora." />}
        </section>
        <section className="cartao"><h2 className="cartao-tit">Mais vendidos hoje <Link to="/relatorios">Ver todos</Link></h2>
          {x.maisVendidos.length ? <div className="ranking">{x.maisVendidos.map((p, i) => (
            <div className="ranking-linha" key={p.nome}><span className="pos">{i + 1}</span><FotoProduto fotoId={p.foto_id} icone={p.icone} nome={p.nome} className="mini" /><span>{p.nome}</span><b className="num">{p.qtd}</b></div>
          ))}</div> : <Vazio icone="hamburguer" titulo="Sem vendas hoje" />}
        </section>
      </div>
      {x.categorias.length > 0 && <div className="cat-cartoes">
        {x.categorias.slice(0, 4).map((c) => (
          <Link className="cat-cartao" key={c.id} to={`/produtos?cat=${c.id}`}>
            {FOTO_CAT[c.icone] ? <img src={FOTO_CAT[c.icone]} alt="" /> : <div className="sem-foto" style={{ height: 124 }}><Ic n={c.icone} t={40} /></div>}
            <div><span><b>{c.nome}</b><small>{c.qtd} {c.qtd === 1 ? 'produto' : 'produtos'}</small></span><span className="ir"><Ic n="seta" t={16} /></span></div>
          </Link>
        ))}
      </div>}
    </>
  );
}
