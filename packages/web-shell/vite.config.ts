import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  build: {
    outDir: path.resolve(rootDir, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    // Proxy /api requests to the Go web server during development,
    // avoiding CORS and matching the production same-origin setup.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: [
      { find: '@app', replacement: path.resolve(rootDir, '../ui/src/app') },
      { find: '@pages', replacement: path.resolve(rootDir, '../ui/src/pages') },
      { find: '@shared', replacement: path.resolve(rootDir, '../ui/src/shared') },
      { find: '@kernel', replacement: path.resolve(rootDir, '../ui/src/kernel') },
      { find: '@plugins', replacement: path.resolve(rootDir, '../ui/src/plugins') },
      { find: '@common', replacement: path.resolve(rootDir, '../../common') },
    ],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
