import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (ex: .env, .env.production)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    base: '/',
    define: {
      // Define APENAS a chave específica. 
      // NÃO defina 'process.env': {} aqui, pois isso pode sobrescrever a chave API_KEY
      // dependendo da ordem de processamento do Vite.
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || env.API_KEY || ''),
    }
  };
});