import { cp, rm } from 'node:fs/promises';

// Keep existing Markdown/CMS image paths while making them available in Astro dev and builds.
const generated = new URL('../public/assets/', import.meta.url);
await rm(generated, { recursive: true, force: true });
await cp(new URL('../assets/', import.meta.url), generated, {
  recursive: true,
});
