import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',   // supaya boleh diakses dari luar container
      port: Number(process.env.PORT) || 8080,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 8080,
      allowedHosts: ['app.monoklix.com'], // whitelist domain
    },
  };
});
