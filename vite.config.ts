import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Base must be relative for GitHub Pages (which often serves from a subdirectory)
    base: './',
    define: {
      // Robustly polyfill process.env for the browser to prevent "process is not defined" errors
      // This creates a safe object containing the API_KEY that replaces 'process.env' in the code
      'process.env': JSON.stringify({
        API_KEY: env.API_KEY || ''
      }),
    }
  };
});