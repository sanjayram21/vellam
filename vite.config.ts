import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // WSL -> Windows Chrome: bind all interfaces so the host browser can reach it.
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    target: 'es2022',
    // Phase 5 ships this as a static offline bundle; keep assets hash-named.
    assetsDir: 'assets',
  },
});
