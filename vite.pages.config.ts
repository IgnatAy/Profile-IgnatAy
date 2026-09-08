import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { runtimeAssets } from './lib/runtime-assets-plugin';

// Relative assets and hash navigation work on both username.github.io and /repo/.
// This build is static: GitHub Pages needs no Worker or Node server.
export default defineConfig({
  base: './',
  plugins: [react(), runtimeAssets()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'out', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 3001, strictPort: true },
});
