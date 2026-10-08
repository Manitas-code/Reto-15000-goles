import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pages = [
  'index.html',
  'reto-15000.html',
  'mas-o-menos.html',
  'blackjack-goles.html',
  'emoji-player.html',
  'caras.html',
  'editor-goles.html',
];

export default defineConfig({
  plugins: [react()],
  // Set VITE_BASE_PATH=/Reto-15000-goles/ in GitHub Pages builds.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    proxy: { '/api': { target: 'http://127.0.0.1:3001' } },
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [
          page.replace('.html', ''),
          resolve(__dirname, page),
        ]),
      ),
    },
  },
});
