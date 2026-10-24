import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://rlee.cc',
  output: 'static',
  outDir: './_site',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
