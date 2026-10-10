// Pedêê Admin: painel único do dono (instala no computador como app). Só entra o DONO_EMAIL com a senha da Área do Dono.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { brl } from '../../regras/pedido';
import { ErroApp, get, post } from '../api';
import { msgErro } from '../comuns';
import '../estilo.css';
import './admin.css';

type Aba = 'testes' | 'resumo' | 'reclamacoes' | 'lojas' | 'entregadores' | 'pedidos' | 'clientes';
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
        <p>Só o administrador: e-mail do dono e a senha da Área do Dono (ou a da sua conta LeuApps).</p>
        <label className="campo">E-mail<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" /></label>
        <label className="campo">Senha<input type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} autoComplete="current-password" /></label>
        {erro && <p className="aviso erro">{erro}</p>}
        <button className="btn prim grande bloco" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function Painel({ aoSair }: { aoSair: () => void }) {
  const [aba, setAba] = useState<Aba>('testes');
  // Guarda o que já carregou de cada aba: ao trocar, mostra na hora (sem a tela pular) e atualiza por baixo.
  const [cache, setCache] = useState<Partial<Record<Aba, Linha>>>({}), [erro, setErro] = useState(''), [busca, setBusca] = useState('');
  const carregar = async () => {
    try { const d = aba === 'testes' ? (await get('/admin/eu'), {}) : await get(`/admin/${aba}`); setCache((x) => ({ ...x, [aba]: d })); setErro(''); }
    catch (e) { if (e instanceof ErroApp && e.status === 401) aoSair(); else setErro(msgErro(e)); }
  };
  // Carrega todas as abas de uma vez ao entrar: trocar de aba fica instantâneo, sem a tela pular.
  useEffect(() => { (['resumo', 'reclamacoes', 'lojas', 'entregadores', 'pedidos', 'clientes'] as Aba[]).forEach((a) => get(`/admin/${a}`).then((d) => setCache((x) => ({ [a]: d, ...x }))).catch(() => {})); }, []);
  useEffect(() => { setBusca(''); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps
  const dados = cache[aba] || null;
  const acao = async (url: string, corpo: unknown) => { try { await post(url, corpo); await carregar(); } catch (e) { setErro(msgErro(e)); } };
  const filtra = (l: Linha[]) => { const q = busca.trim().toLowerCase(); return q ? l.filter((x) => JSON.stringify(x).toLowerCase().includes(q)) : l; };
  const MENU: [Aba, string, string][] = [['testes', '🧪', 'Central de testes'], ['resumo', '📊', 'Resumo'], ['reclamacoes', '📣', 'Reclamações'], ['lojas', '🏪', 'Lojas'], ['entregadores', '🛵', 'Entregadores'], ['pedidos', '🧾', 'Pedidos'], ['clientes', '👥', 'Clientes']];
  return (
    <div className="adm">
      <aside className="adm-lado">
        <div className="adm-marca"><img src="/admin-icone-64.png" alt="" /><b>Pedêê Admin</b></div>
        <nav>{MENU.map(([v, e, n]) => <button key={v} className={aba === v ? 'ativo' : ''} onClick={() => setAba(v)}><span>{e}</span>{n}</button>)}</nav>
        <button className="adm-sair" onClick={async () => { await post('/admin/sair', {}).catch(() => {}); aoSair(); }}>Sair</button>
      </aside>
      <main className="adm-corpo">
        <header className="adm-topo"><h1>{MENU.find((m) => m[0] === aba)![2]}</h1><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar" style={['resumo', 'testes'].includes(aba) ? { visibility: 'hidden' } : undefined} /></header>
        {erro && <p className="aviso erro">{erro}</p>}
        {!dados ? <div className="carregando"><div className="giro" /></div> : <>
          {aba === 'resumo' && <Resumo r={dados} />}
          {aba === 'testes' && <Testes aoErro={setErro} />}
          {aba === 'lojas' && <table className="adm-tab"><thead><tr><th>Loja</th><th>Cidade</th><th>Pedidos 30d</th><th>Vendido 30d</th><th>Nota</th><th>Acesso até</th><th>No app</th><th /></tr></thead><tbody>
            {filtra(dados.lojas).map((l) => {
              const vencida = l.acesso_ate && new Date(l.acesso_ate) < new Date();
              return <tr key={l.id}>
                <td className="adm-titulo"><b>{l.nome}</b>{l.demo && <span className="adm-selo">demonstração</span>}<small>{TIPO[l.tipo_loja] || l.tipo_loja} · {l.telefone || 'sem telefone'} · {l.entregadores} entregador(es)</small></td>
                <td data-r="Cidade">{l.cidade}{l.uf ? `-${l.uf}` : ''}</td><td data-r="Pedidos 30d">{l.pedidos_30d}</td><td data-r="Vendido 30d">{brl(l.valor_30d)}</td><td data-r="Nota">{l.nota ? `★ ${l.nota}` : '—'}</td>
                <td data-r="Acesso até" className={vencida ? 'adm-ruim' : ''}>{l.acesso_ate ? data(l.acesso_ate) : 'Sem prazo'}{vencida ? ' (vencido)' : ''}</td>
                <td data-r="No app">{!l.aprovada ? <b className="adm-ruim">⏳ Esperando aprovação</b> : l.no_app ? (l.aceitando ? '🟢 Aberta' : '🟡 Fechada') : '⛔ Fora'}</td>
                <td className="adm-acoes">
                  {!l.aprovada && <button className="btn peq prim" onClick={() => { if (confirm(`Aprovar "${l.nome}"? A loja passa a aparecer para os clientes.`)) acao(`/admin/lojas/${l.id}`, { aprovada: true }); }}>✅ Aprovar</button>}
                  <button className="btn peq" onClick={() => { const n = prompt('Dar quantos dias de acesso a esta loja?', '30'); if (n && Number(n) > 0) acao(`/admin/lojas/${l.id}`, { mais_dias: Math.round(Number(n)) }); }}>+ dias</button>
                  <button className={`btn peq ${l.no_app ? 'adm-perigo' : ''}`} onClick={() => { if (!l.no_app || confirm(`Tirar "${l.nome}" do app? Os clientes param de ver a loja.`)) acao(`/admin/lojas/${l.id}`, { no_app: !l.no_app }); }}>{l.no_app ? 'Tirar do app' : 'Pôr no app'}</button>
                </td></tr>;
            })}</tbody></table>}
          {aba === 'entregadores' && <table className="adm-tab"><thead><tr><th>Entregador</th><th>Veículo</th><th>Lojas</th><th>Entregas 30d</th><th>Desde</th><th>Situação</th><th /></tr></thead><tbody>
            {filtra(dados.entregadores).map((e) => <tr key={e.id}>
              <td className="adm-pessoa adm-titulo">{e.tem_foto ? <img src={`/api/admin/entregadores/${e.id}/foto`} alt="" /> : <span>🙂</span>}<div><b>{e.nome}</b><small>{e.email}{e.cidade ? ` · ${e.cidade}` : ''}</small></div></td>
              <td data-r="Veículo">{e.veiculo === 'bike' ? '🚲 Bicicleta' : '🛵 Moto'}</td><td data-r="Lojas">{e.lojas || '—'}</td><td data-r="Entregas 30d">{e.entregas_30d}</td><td data-r="Desde">{data(e.criado_em)}</td>
              <td data-r="Situação">{!e.ativo ? '⛔ Desativado' : e.disponivel ? '🟢 Disponível' : '🌙 Volto breve'}</td>
              <td className="adm-acoes"><button className={`btn peq ${e.ativo ? 'adm-perigo' : ''}`} onClick={() => { if (!e.ativo || confirm(`Desativar ${e.nome}? Ele sai do app na hora.`)) acao(`/admin/entregadores/${e.id}`, { ativo: !e.ativo }); }}>{e.ativo ? 'Desativar' : 'Reativar'}</button></td>
            </tr>)}</tbody></table>}
          {aba === 'pedidos' && <table className="adm-tab"><thead><tr><th>Loja / quando</th><th>Cliente</th><th>Tipo</th><th>Valor</th><th>Situação</th><th>Entregador</th></tr></thead><tbody>
            {filtra(dados.pedidos).map((p) => <tr key={p.id}>
              <td className="adm-titulo"><b>{p.loja}</b><small>{dataHora(p.criado_em)} · {p.cidade}{p.numero ? ` · #${p.numero}` : ''}</small></td><td data-r="Cliente">{p.nome}</td>
              <td data-r="Tipo">{p.tipo === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</td><td data-r="Valor">{brl(p.total)}</td>
              <td data-r="Situação">{p.cancelado_em ? '❌ Cancelado pelo cliente' : p.status === 'recusado' ? '⛔ Recusado' : p.status === 'aguardando' ? '⏳ Esperando a loja' : SIT[p.andamento] || p.andamento}</td><td data-r="Entregador">{p.entregador || '—'}</td>
            </tr>)}</tbody></table>}
          {aba === 'reclamacoes' && <table className="adm-tab"><thead><tr><th>Reclamação</th><th>Loja</th><th>Cliente</th><th>Pedido</th><th>Situação</th><th /></tr></thead><tbody>
            {filtra(dados.reclamacoes).map((r) => <tr key={r.id}>
              <td className="adm-titulo"><b>{r.texto}</b><small>{dataHora(r.criado_em)}</small></td>
              <td data-r="Loja">{r.loja}</td><td data-r="Cliente">{r.nome}</td><td data-r="Pedido">{brl(r.total)} · {dataHora(r.pedido_em)}</td>
              <td data-r="Situação">{r.resolvida_em ? '✅ Resolvida' : '🔴 Aberta'}</td>
              <td className="adm-acoes">{!r.resolvida_em && <button className="btn peq" onClick={() => acao(`/admin/reclamacoes/${r.id}/resolver`, {})}>Marcar resolvida</button>}</td>
            </tr>)}
            {!dados.reclamacoes.length && <tr><td colSpan={6}>Nenhuma reclamação. 🎉</td></tr>}</tbody></table>}
          {aba === 'clientes' && <table className="adm-tab"><thead><tr><th>Cliente</th><th>Celular</th><th>Pedidos</th><th>Conta criada</th></tr></thead><tbody>
            {filtra(dados.clientes).map((c) => <tr key={c.email}><td className="adm-titulo"><b>{c.nome}</b><small>{c.email}</small></td><td data-r="Celular">{c.telefone}</td><td data-r="Pedidos">{c.pedidos}</td><td data-r="Conta criada">{data(c.criado_em)}</td></tr>)}
            {!dados.clientes.length && <tr><td colSpan={4}>Nenhuma conta de cliente ainda (quem pede como visitante não aparece aqui).</td></tr>}</tbody></table>}
        </>}
      </main>
    </div>
  );
}

/** Abre cada app como ele é de verdade, já logado nas contas de teste: cliente, loja (Sabor Arte) e entregador. */
function Testes({ aoErro }: { aoErro: (m: string) => void }) {
  const abrir = async (papel: 'loja' | 'entregador' | 'cliente') => {
    const janela = window.open('about:blank', '_blank');
    try {
      const url = papel === 'cliente' ? '/pedir/' : (await post<{ url: string }>(`/admin/teste/${papel}`, {})).url;
      if (janela) janela.location.href = url; else location.href = url;
    } catch (e) { janela?.close(); aoErro(msgErro(e)); }
  };
  const app = (papel: 'cliente' | 'loja' | 'entregador', icone: string, titulo: string, texto: string, link: string) => (
    <div className="adm-teste"><img src={icone} alt="" /><div><b>{titulo}</b><span>{texto}</span><small>Link para instalar: <a href={link} target="_blank" rel="noopener">{location.origin + link}</a></small></div>
      <button className="btn prim" onClick={() => abrir(papel)}>Abrir</button></div>
  );
  return (
    <>
      <p className="adm-nota" style={{ marginTop: 0 }}>Teste tudo daqui, um por vez ou em janelas lado a lado: faça o pedido como cliente, aceite na loja, mande para o entregador e acompanhe até a entrega.</p>
      <div className="adm-testes">
        {app('cliente', '/pedir-icone-192.png', '1. Cliente (quem compra)', 'Escolha Duque de Caxias e peça na loja “Sabor Arte (loja de teste)”.', '/pedir/')}
        {app('loja', '/parceiro-icone-192.png', '2. Minha loja de teste (Sabor Arte)', 'Já entra logado na loja: aceite o pedido, marque Pronto e escolha o entregador.', '/parceiro/')}
        {app('entregador', '/entregador-icone-192.png', '3. Entregador de teste', 'Já entra logado: Saí para entrega, “Simular trajeto” e Entreguei (com o código do cliente).', '/entregador/')}
      </div>
    </>
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
