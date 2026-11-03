import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': 'http://localhost:4000' }, allowedHosts: true },
  // Demo tunnel: preview serves the built app and proxies /api to the API.
  preview: { proxy: { '/api': 'http://localhost:4000' }, allowedHosts: true },
  envDir: '../..',
  test: {
    environment: 'jsdom',
  },
});
