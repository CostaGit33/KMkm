import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const entrada = (arquivo) => fileURLToPath(new URL(arquivo, import.meta.url));
export default defineConfig({
  plugins: [react()],
  // Duas entradas: o app (index.html) e a administração (admin.html, servida em /admin pelo servidor).
  build: { rollupOptions: { input: { main: entrada('./index.html'), admin: entrada('./admin.html') } } },
  server: {
    host: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../shared/', import.meta.url))] },
    proxy: { '/api': 'http://localhost:3000' },
  },
});
