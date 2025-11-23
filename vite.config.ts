import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are linked relatively, crucial for GitHub Pages
  define: {
    // Prevents "process is not defined" errors in the browser for the Google GenAI SDK usage
    'process.env': process.env
  }
});