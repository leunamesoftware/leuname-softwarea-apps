// Menu lateral (computador), barra de cima e de baixo (celular).
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Acao } from '../regras/permissoes';
import { PAPEIS } from '../regras/permissoes';
import { useConfirmar } from './comuns';
import { Ic } from './icones';
import { useSessao } from './sessao';

const MENU: { para: string; nome: string; ic: string; acao: Acao }[] = [
  { para: '/', nome: 'Início', ic: 'inicio', acao: 'vender' },
  { para: '/caixa', nome: 'Frente de Caixa', ic: 'caixa', acao: 'vender' },
  { para: '/pedidos', nome: 'Pedidos', ic: 'pedidos', acao: 'verPedidos' },
  { para: '/produtos', nome: 'Produtos', ic: 'produtos', acao: 'produtos' },
  { para: '/estoque', nome: 'Estoque', ic: 'estoque', acao: 'estoque' },
  { para: '/clientes', nome: 'Clientes', ic: 'clientes', acao: 'clientes' },
  { para: '/relatorios', nome: 'Relatórios', ic: 'relatorios', acao: 'relatorios' },
  { para: '/gaveta', nome: 'Caixa', ic: 'gaveta', acao: 'caixa' },
  { para: '/configuracoes', nome: 'Configurações', ic: 'config', acao: 'configuracoes' },
];

export const Marca = () => <span className="marca"><img src="/icone-64.png" alt="" /><b>Leu<span>Burger</span></b></span>;

function Lateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { eu, sair, pode } = useSessao();
  const confirmar = useConfirmar();
  const nav = useNavigate();
  const u = eu!.usuario;
  return (
    <aside className="lateral" aria-label="Menu">
      <Marca />
      <nav>
        {MENU.filter((m) => pode(m.acao)).map((m) => (
          <NavLink key={m.para} to={m.para} end={m.para === '/'} onClick={aoNavegar} className={({ isActive }) => (isActive ? 'ativo' : '')}>
            <Ic n={m.ic} />{m.nome}
          </NavLink>
        ))}
      </nav>
      <div className="conta">
        <div className="conta-linha"><span className="avatar">{(u.nome.trim()[0] || '?').toUpperCase()}</span><div><b>{u.nome}</b><small>{PAPEIS[u.papel].nome}</small></div></div>
        <button className="sair" onClick={async () => { if (await confirmar('Sair do LeuBurger neste aparelho?', { sim: 'Sair' })) { await sair(); nav('/'); } }}><Ic n="sair" />Sair</button>
      </div>
    </aside>
  );
}

const BARRA: { para: string; nome: string; ic: string; acao: Acao }[] = [
  { para: '/', nome: 'Início', ic: 'inicio', acao: 'vender' },
  { para: '/caixa', nome: 'Caixa', ic: 'caixa', acao: 'vender' },
  { para: '/pedidos', nome: 'Pedidos', ic: 'pedidos', acao: 'verPedidos' },
  { para: '/produtos', nome: 'Produtos', ic: 'produtos', acao: 'produtos' },
];

export function Layout() {
  const [menu, setMenu] = useState(false);
  const { pode, eu } = useSessao();
  const local = useLocation();
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [local.pathname]);
  const barra = BARRA.filter((b) => pode(b.acao));
  if (!pode('produtos')) barra.push({ para: '/clientes', nome: 'Clientes', ic: 'clientes', acao: 'clientes' });
  return (
    <div className="app">
      <Lateral />
      <div className="area">
        <header className="topo-movel">
          <button onClick={() => setMenu(true)} aria-label="Abrir o menu"><Ic n="menu" t={24} /></button>
          <Marca />
          <span className="avatar" style={{ width: 34, height: 34, fontSize: 14 }} title={eu?.usuario.nome}>{(eu?.usuario.nome.trim()[0] || '?').toUpperCase()}</span>
        </header>
        <main className="principal"><Outlet /></main>
        <nav className="barra-movel" aria-label="Atalhos">
          {barra.slice(0, 4).map((b) => (
            <NavLink key={b.para} to={b.para} end={b.para === '/'} className={({ isActive }) => (isActive ? 'ativo' : '')}><span className="bolha"><Ic n={b.ic} /></span>{b.nome}</NavLink>
          ))}
          <button onClick={() => setMenu(true)}><span className="bolha"><Ic n="menu" /></span>Mais</button>
        </nav>
      </div>
      {menu && <div className="gaveta-menu" onMouseDown={(e) => { if (e.target === e.currentTarget) setMenu(false); }}><Lateral aoNavegar={() => setMenu(false)} /></div>}
    </div>
  );
}

/** Cabeçalho padrão das telas. */
export function Cabeca({ titulo, sub, children }: { titulo: string; sub?: string; children?: React.ReactNode }) {
  return <div className="cabeca"><div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="acoes">{children}</div>}</div>;
}
