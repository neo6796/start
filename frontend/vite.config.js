import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Počas vývoja frontend beží na porte 5173 a API požiadavky (/api) sa
// preposielajú na backend na porte 3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
