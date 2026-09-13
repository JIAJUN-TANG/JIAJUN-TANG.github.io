import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // `'.'` resolves to the Vite root (same directory `process.cwd()` would report)
  // and keeps this file free of Node type dependencies.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Base path for GitHub Pages
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    define: {
      // Polyfill process.env for the browser
      'process.env': JSON.stringify({
        API_KEY: env.API_KEY || ''
      }),
    }
  };
});