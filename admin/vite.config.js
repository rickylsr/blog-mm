import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  envDir: fileURLToPath(new URL('../', import.meta.url)),
  base: '/admin/',
  build: {
    outDir: fileURLToPath(new URL('../_site/admin/', import.meta.url)),
    emptyOutDir: true,
    reportCompressedSize: false,
  },
});
