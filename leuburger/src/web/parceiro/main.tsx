// Pedêê Parceiro: o app do lojista (separado do app dos clientes e do app do entregador).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Lojista } from './Lojista';
import '../estilo.css';
import '../pedir/pedir.css';

createRoot(document.getElementById('raiz')!).render(<StrictMode><BrowserRouter basename="/parceiro"><Lojista /></BrowserRouter></StrictMode>);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
