import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// App (React) em src/web; em desenvolvimento, /api vai para o Worker local (wrangler dev na porta 8795).
export default defineConfig({
  root: 'src/web',
  publicDir: '../../public',
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { port: 5175, proxy: { '/api': 'http://localhost:8795' } },
});
