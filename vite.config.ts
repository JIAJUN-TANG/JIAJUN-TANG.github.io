import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Base must be './' for GitHub Pages to support subdirectories
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      // Polyfill process.env for the browser
      'process.env': JSON.stringify({
        API_KEY: env.API_KEY || ''
      }),
    }
  };
});