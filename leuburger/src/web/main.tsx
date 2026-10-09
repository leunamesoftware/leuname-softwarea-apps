// Entrada do app: provedores, rotas e o service worker (abre rápido e instala como app).
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Acao } from '../regras/permissoes';
import { Carregando, ProvedorAvisos, ProvedorConfirmar } from './comuns';
import { Layout } from './Layout';
import { ProvedorPedido, ProvedorSessao, useSessao } from './sessao';
import { Caixa } from './telas/Caixa';
import { Clientes } from './telas/Clientes';
import { Configuracoes } from './telas/Configuracoes';
import { Entrar } from './telas/Entrar';
import { Estoque } from './telas/Estoque';
import { Gaveta } from './telas/Gaveta';
import { Inicio } from './telas/Inicio';
import { Pagamento, VendaConcluida } from './telas/Pagamento';
import { Pedidos } from './telas/Pedidos';
import { Produtos } from './telas/Produtos';
import { Relatorios } from './telas/Relatorios';
import './estilo.css';

/** Só mostra a tela se a pessoa tem permissão; senão volta para o início. */
function Pode({ acao, children }: { acao: Acao; children: ReactNode }) {
  const { pode } = useSessao();
  return pode(acao) ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  const { eu, carregando } = useSessao();
  if (carregando) return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Carregando texto="Abrindo o LeuBurger…" /></div>;
  if (!eu) return <Entrar />;
  return (
    <ProvedorPedido>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="caixa/pagamento" element={<Pagamento />} />
          <Route path="caixa/venda/:id" element={<VendaConcluida />} />
          <Route path="pedidos" element={<Pode acao="verPedidos"><Pedidos /></Pode>} />
          <Route path="produtos" element={<Pode acao="produtos"><Produtos /></Pode>} />
          <Route path="estoque" element={<Pode acao="estoque"><Estoque /></Pode>} />
          <Route path="clientes" element={<Pode acao="clientes"><Clientes /></Pode>} />
          <Route path="relatorios" element={<Pode acao="relatorios"><Relatorios /></Pode>} />
          <Route path="gaveta" element={<Pode acao="caixa"><Gaveta /></Pode>} />
          <Route path="configuracoes" element={<Pode acao="configuracoes"><Configuracoes /></Pode>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProvedorPedido>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorAvisos>
        <ProvedorConfirmar>
          <ProvedorSessao><App /></ProvedorSessao>
        </ProvedorConfirmar>
      </ProvedorAvisos>
    </BrowserRouter>
  </StrictMode>,
);

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
