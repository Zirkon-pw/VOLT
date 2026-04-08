import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: {
      // Volt desktop is a local-only app — disable the file-system restriction so
      // Vite can serve source files from packages/ui/ and common/ which live
      // outside this project root (frontend/).
      strict: false,
    },
  },
  // Constrain esbuild's dep-scan entry point so it starts from our main.tsx
  // and doesn't try to crawl outside the repo root during optimisation.
  optimizeDeps: {
    entries: ['./src/main.tsx'],
  },
  resolve: {
    // Prevent duplicate React instances when packages/ui/ is resolved from
    // a different node_modules than frontend/ (workspace hoisting side-effect).
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    alias: [
      { find: '@app',     replacement: path.resolve(__dirname, '../packages/ui/src/app') },
      { find: '@pages',   replacement: path.resolve(__dirname, '../packages/ui/src/pages') },
      { find: '@shared',  replacement: path.resolve(__dirname, '../packages/ui/src/shared') },
      { find: '@kernel',  replacement: path.resolve(__dirname, '../packages/ui/src/kernel') },
      { find: '@plugins', replacement: path.resolve(__dirname, '../packages/ui/src/plugins') },
      { find: '@common',  replacement: path.resolve(__dirname, '../common') },
      // @wailsjs resolves to the Wails-generated bindings (desktop-only)
      { find: '@wailsjs', replacement: path.resolve(__dirname, 'wailsjs') },
    ],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
