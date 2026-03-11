import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Base path for GitHub Pages
    base: '/JIAJUNTANG.github.io/',
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