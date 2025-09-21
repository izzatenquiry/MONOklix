import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env variables
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',       // supaya boleh diakses dari luar
      port: 5259,            // port baru
      strictPort: true,      // kalau port taken, error terus
    },
    preview: {
      host: '0.0.0.0',
      port: 5259,
      allowedHosts: ['app.monoklix.com'], // domain yang dibenarkan
    },
  };
});
