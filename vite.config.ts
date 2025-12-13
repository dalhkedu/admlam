import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (ex: .env, .env.production)
  // O terceiro parâmetro '' permite carregar todas as variáveis, não apenas as que começam com VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    base: '/',
    define: {
      // Garante que process.env.API_KEY esteja disponível para o GeminiService
      // O valor virá de VITE_GOOGLE_API_KEY ou API_KEY no seu arquivo .env
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || env.API_KEY || ''),
      // Evita crash "process is not defined" em outras partes
      'process.env': {} 
    }
  };
});