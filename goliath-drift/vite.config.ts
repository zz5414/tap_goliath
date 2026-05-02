import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 8414,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 8414,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
});
