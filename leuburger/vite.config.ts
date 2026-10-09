import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// App (React) em src/web; em desenvolvimento, /api vai para o Worker local (wrangler dev na porta 8795).
export default defineConfig({
  root: 'src/web',
  publicDir: '../../public',
  plugins: [react()],
  // Duas páginas: o caixa da loja (/) e o app dos clientes (/pedir/).
  build: { outDir: '../../dist', emptyOutDir: true, rollupOptions: { input: { caixa: resolve(__dirname, 'src/web/index.html'), pedir: resolve(__dirname, 'src/web/pedir/index.html') } } },
  server: { port: 5175, proxy: { '/api': 'http://localhost:8795' } },
});
