import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Configure the React build and local API transport. */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
