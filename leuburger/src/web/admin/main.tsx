// Pedêê Admin: painel único do dono (instala no computador como app). Só entra o DONO_EMAIL com a senha da Área do Dono.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { brl } from '../../regras/pedido';
import { ErroApp, get, post } from '../api';
import { msgErro } from '../comuns';
import '../estilo.css';
import './admin.css';

type Aba = 'resumo' | 'lojas' | 'entregadores' | 'pedidos' | 'clientes';
type Linha = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const TIPO: Record<string, string> = { lanches: 'Lanches', hamburgueria: 'Hamburgueria', restaurante: 'Restaurante', marmitaria: 'Marmitaria', pizzaria: 'Pizzaria', acai: 'Açaí', pastelaria: 'Pastelaria', japonesa: 'Japonesa', doces: 'Doces', bebidas: 'Bebidas' };
const SIT: Record<string, string> = { aguardando: 'Esperando a loja', preparando: 'Em preparo', pronto: 'Pronto', a_caminho: 'A caminho', entregue: 'Entregue', retirado: 'Retirado' };

function App() {
  const [estado, setEstado] = useState<'carregando' | 'fora' | 'dentro'>('carregando');
  useEffect(() => { get('/admin/eu').then(() => setEstado('dentro')).catch(() => setEstado('fora')); }, []);
  if (estado === 'carregando') return <div className="carregando"><div className="giro" /></div>;
  if (estado === 'fora') return <Entrar aoEntrar={() => setEstado('dentro')} />;
  return <Painel aoSair={() => setEstado('fora')} />;
}

function Entrar({ aoEntrar }: { aoEntrar: () => void }) {
  const [f, setF] = useState({ email: '', senha: '' }), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const enviar = async () => { setOcupado(true); setErro(''); try { await post('/admin/entrar', f); aoEntrar(); } catch (e) { setErro(msgErro(e)); } finally { setOcupado(false); } };
  return (
    <div className="adm-entrar">
      <form className="cartao" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <img src="/admin-icone-192.png" alt="" width={72} height={72} />
        <h1>Pedêê Admin</h1>
        <p>Só o administrador. Use o seu e-mail e a senha da Área do Dono.</p>
        <label className="campo">E-mail<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" /></label>
        <label className="campo">Senha<input type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} autoComplete="current-password" /></label>
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="btn prim grande bloco" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function Painel({ aoSair }: { aoSair: () => void }) {
  const [aba, setAba] = useState<Aba>('resumo');
  const [carga, setCarga] = useState<{ aba: Aba; d: Linha } | null>(null), [erro, setErro] = useState(''), [busca, setBusca] = useState('');
  const carregar = async () => {
    try { const d = await get(`/admin/${aba}`); setCarga({ aba, d }); setErro(''); }
    catch (e) { if (e instanceof ErroApp && e.status === 401) aoSair(); else setErro(msgErro(e)); }
  };
  useEffect(() => { setBusca(''); carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps
  // Só mostra os dados da aba aberta (ao trocar de aba, espera os novos chegarem).
  const dados = carga?.aba === aba ? carga.d : null;
  const acao = async (url: string, corpo: unknown) => { try { await post(url, corpo); await carregar(); } catch (e) { setErro(msgErro(e)); } };
  const filtra = (l: Linha[]) => { const q = busca.trim().toLowerCase(); return q ? l.filter((x) => JSON.stringify(x).toLowerCase().includes(q)) : l; };
  const MENU: [Aba, string, string][] = [['resumo', '📊', 'Resumo'], ['lojas', '🏪', 'Lojas'], ['entregadores', '🛵', 'Entregadores'], ['pedidos', '🧾', 'Pedidos'], ['clientes', '👥', 'Clientes']];
  return (
    <div className="adm">
      <aside className="adm-lado">
        <div className="adm-marca"><img src="/admin-icone-64.png" alt="" /><b>Pedêê Admin</b></div>
        <nav>{MENU.map(([v, e, n]) => <button key={v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}><span>{e}</span>{n}</button>)}</nav>
        <button className="adm-sair" onClick={async () => { await post('/admin/sair', {}).catch(() => {}); aoSair(); }}>Sair</button>
      </aside>
      <main className="adm-corpo">
        <header className="adm-topo"><h1>{MENU.find((m) => m[0] === aba)![2]}</h1>{aba !== 'resumo' && <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar" />}</header>
        {erro && <p className="aviso erro">{erro}</p>}
        {!dados ? <div className="carregando"><div className="giro" /></div> : <>
          {aba === 'resumo' && <Resumo r={dados} />}
          {aba === 'lojas' && <table className="adm-tab"><thead><tr><th>Loja</th><th>Cidade</th><th>Pedidos 30d</th><th>Vendido 30d</th><th>Nota</th><th>Acesso até</th><th>No app</th><th /></tr></thead><tbody>
            {filtra(dados.lojas).map((l) => {
              const vencida = l.acesso_ate && new Date(l.acesso_ate) < new Date();
              return <tr key={l.id}>
                <td><b>{l.nome}</b>{l.demo && <span className="adm-selo">demonstração</span>}<small>{TIPO[l.tipo_loja] || l.tipo_loja} · {l.telefone || 'sem telefone'} · {l.entregadores} entregador(es)</small></td>
                <td>{l.cidade}{l.uf ? `-${l.uf}` : ''}</td><td>{l.pedidos_30d}</td><td>{brl(l.valor_30d)}</td><td>{l.nota ? `★ ${l.nota}` : '—'}</td>
                <td className={vencida ? 'adm-ruim' : ''}>{l.acesso_ate ? data(l.acesso_ate) : 'Sem prazo'}{vencida ? ' (vencido)' : ''}</td>
                <td>{l.no_app ? (l.aceitando ? '🟢 Aberta' : '🟡 Fechada') : '⛔ Fora'}</td>
                <td className="adm-acoes">
                  <button className="btn peq" onClick={() => { const n = prompt('Dar quantos dias de acesso a esta loja?', '30'); if (n && Number(n) > 0) acao(`/admin/lojas/${l.id}`, { mais_dias: Math.round(Number(n)) }); }}>+ dias</button>
                  <button className={`btn peq ${l.no_app ? 'adm-perigo' : ''}`} onClick={() => { if (!l.no_app || confirm(`Tirar "${l.nome}" do app? Os clientes param de ver a loja.`)) acao(`/admin/lojas/${l.id}`, { no_app: !l.no_app }); }}>{l.no_app ? 'Tirar do app' : 'Pôr no app'}</button>
                </td></tr>;
            })}</tbody></table>}
          {aba === 'entregadores' && <table className="adm-tab"><thead><tr><th>Entregador</th><th>Veículo</th><th>Lojas</th><th>Entregas 30d</th><th>Desde</th><th>Situação</th><th /></tr></thead><tbody>
            {filtra(dados.entregadores).map((e) => <tr key={e.id}>
              <td className="adm-pessoa">{e.tem_foto ? <img src={`/api/admin/entregadores/${e.id}/foto`} alt="" /> : <span>🙂</span>}<div><b>{e.nome}</b><small>{e.email}{e.cidade ? ` · ${e.cidade}` : ''}</small></div></td>
              <td>{e.veiculo === 'bike' ? '🚲 Bicicleta' : '🛵 Moto'}</td><td>{e.lojas || '—'}</td><td>{e.entregas_30d}</td><td>{data(e.criado_em)}</td>
              <td>{!e.ativo ? '⛔ Desativado' : e.disponivel ? '🟢 Disponível' : '⚪ Parado'}</td>
              <td className="adm-acoes"><button className={`btn peq ${e.ativo ? 'adm-perigo' : ''}`} onClick={() => { if (!e.ativo || confirm(`Desativar ${e.nome}? Ele sai do app na hora.`)) acao(`/admin/entregadores/${e.id}`, { ativo: !e.ativo }); }}>{e.ativo ? 'Desativar' : 'Reativar'}</button></td>
            </tr>)}</tbody></table>}
          {aba === 'pedidos' && <table className="adm-tab"><thead><tr><th>Quando</th><th>Loja</th><th>Cliente</th><th>Tipo</th><th>Valor</th><th>Situação</th><th>Entregador</th></tr></thead><tbody>
            {filtra(dados.pedidos).map((p) => <tr key={p.id}>
              <td>{dataHora(p.criado_em)}</td><td><b>{p.loja}</b><small>{p.cidade}{p.numero ? ` · #${p.numero}` : ''}</small></td><td>{p.nome}</td>
              <td>{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</td><td>{brl(p.total)}</td>
              <td>{p.cancelado_em ? '❌ Cancelado pelo cliente' : p.status === 'recusado' ? '⛔ Recusado' : p.status === 'aguardando' ? '⏳ Esperando a loja' : SIT[p.andamento] || p.andamento}</td><td>{p.entregador || '—'}</td>
            </tr>)}</tbody></table>}
          {aba === 'clientes' && <table className="adm-tab"><thead><tr><th>Cliente</th><th>Celular</th><th>Pedidos</th><th>Conta criada</th></tr></thead><tbody>
            {filtra(dados.clientes).map((c) => <tr key={c.email}><td><b>{c.nome}</b><small>{c.email}</small></td><td>{c.telefone}</td><td>{c.pedidos}</td><td>{data(c.criado_em)}</td></tr>)}
            {!dados.clientes.length && <tr><td colSpan={4}>Nenhuma conta de cliente ainda (quem pede como visitante não aparece aqui).</td></tr>}</tbody></table>}
        </>}
      </main>
    </div>
  );
}

function Resumo({ r }: { r: Linha }) {
  const card = (t: string, v: string | number, s?: string) => <div className="adm-card"><small>{t}</small><b>{v}</b>{s && <span>{s}</span>}</div>;
  return (
    <>
      <h2 className="adm-sub">Pedidos pelo app</h2>
      <div className="adm-cards">
        {card('Hoje', r.hoje.pedidos, `${brl(r.hoje.valor)} vendidos`)}
        {card('Últimos 7 dias', r.semana.pedidos, `${brl(r.semana.valor)} vendidos`)}
        {card('Últimos 30 dias', r.mes.pedidos, `${brl(r.mes.valor)} vendidos · ${r.mes.perdidos || 0} recusados/cancelados`)}
      </div>
      <h2 className="adm-sub">Quem usa</h2>
      <div className="adm-cards">
        {card('Lojas', r.lojas.total || 0, `${r.lojas.no_app || 0} no app · ${r.lojas.abertas || 0} abertas agora · ${r.lojas.vencidas || 0} vencidas`)}
        {card('Entregadores', r.entregadores.total || 0, `${r.entregadores.disponiveis || 0} disponíveis agora`)}
        {card('Clientes com conta', r.clientes.total || 0, `${r.clientes.novos || 0} novos na semana`)}
      </div>
      <p className="adm-nota">Valores = soma dos pedidos aceitos (o cliente paga direto à loja). A mensalidade das lojas é cobrada pela LeuApps.</p>
    </>
  );
}

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
