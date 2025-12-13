import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Diretório de saída padrão para o Vite (o firebase.json deve apontar para este 'dist')
    outDir: 'dist',
    // Gera mapa de código para facilitar o debug da tela branca no console do navegador
    sourcemap: true,
  },
  // Garante que o roteamento funcione corretamente na raiz
  base: '/',
});