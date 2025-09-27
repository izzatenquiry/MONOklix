
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: Import 'fileURLToPath' and 'URL' to correctly resolve paths in an ES module environment, replacing the need for 'path' and '__dirname'.
import { fileURLToPath, URL } from 'node:url';
// FIX: Import `process` from `node:process` to resolve issue where `process.cwd()` was not defined on the `Process` type.
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        // FIX: Replaced the CommonJS '__dirname' with the modern ES module equivalent 'import.meta.url' to fix the error on line 16.
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 8080,
      strictPort: true,
    },
  };
});
