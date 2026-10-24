import assert from 'node:assert/strict';
import { access, cp, readdir } from 'node:fs/promises';
import { posts } from '../src/lib/content.mjs';

await cp('cloudflare/_headers', '_site/_headers');
await cp(
  'node_modules/@sveltia/cms/LICENSE.txt',
  '_site/admin/SVELTIA-LICENSE.txt',
);
for (const file of [
  'index.html',
  '404.html',
  'admin/index.html',
  'sitemap.xml',
  'feed.xml',
  'search-index.json',
  'build.json',
]) {
  await access(`_site/${file}`);
}
for (const post of posts)
  await access(
    `_site${post.path}${post.path.endsWith('/') ? 'index.html' : ''}`,
  );
const forbidden = [
  '.git',
  '.aws',
  '.agents',
  '.codex',
  '.env',
  '.env.local',
  '.dev.vars',
  'node_modules',
  'scripts',
  'docs',
  'cloudflare',
  'package.json',
  'package-lock.json',
  'Gemfile',
  'Gemfile.lock',
  'wrangler.jsonc',
  'README.md',
  'src',
  'tests',
  '_posts',
  '_pages',
  '_config.yml',
];
const files = await readdir('_site');
assert.deepEqual(
  files.filter((file) => forbidden.includes(file)),
  [],
  'Deployment contains source/configuration files',
);
console.log('Static blog and CMS output verified.');
