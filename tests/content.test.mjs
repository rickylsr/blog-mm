import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadPosts,
  posts,
  readDocument,
  renderDocument,
  normalizePath,
} from '../src/lib/content.mjs';

test('every existing post keeps its original permalink and renders without Liquid', () => {
  const files = readdirSync('_posts').filter((name) => name.endsWith('.md'));
  assert.equal(posts.length, files.length);
  for (const file of files) {
    const { data } = readDocument(readFileSync(join('_posts', file), 'utf8'));
    const post = posts.find((post) => post.filename === file);
    assert.equal(post.path, data.permalink, file);
    assert.ok(!post.html.includes('{% include'), file);
  }
});

test('legacy travel galleries preserve every photo and escape attributes', () => {
  const { html } = renderDocument(
    '{% include gallery id="trip" layout="half" %}',
    {
      trip: [
        { image_path: '/one.webp', alt: 'a "quoted" photo' },
        { url: '/two.webp' },
      ],
    },
  );
  assert.equal((html.match(/<img /g) || []).length, 2);
  assert.ok(html.includes('a &quot;quoted&quot; photo'));
  assert.ok(html.includes('loading="lazy"'));
  assert.throws(
    () => renderDocument('{% include gallery id="missing" %}'),
    /Missing legacy gallery/,
  );
});

test('unpublished and future posts are excluded; new URLs are stable; duplicate URLs fail', () => {
  const directory = mkdtempSync(join(tmpdir(), 'blog-content-'));
  try {
    writeFileSync(
      join(directory, '2026-01-01-first.md'),
      '---\ntitle: First\ndate: 2026-01-01\n---\nHello',
    );
    writeFileSync(
      join(directory, '2026-01-02-private.md'),
      '---\ntitle: Draft\npublished: false\n---\nPrivate',
    );
    writeFileSync(
      join(directory, '2099-01-01-future.md'),
      '---\ntitle: Future\n---\nLater',
    );
    const visible = loadPosts(directory, new Date('2026-10-25'));
    assert.equal(visible.length, 1);
    assert.equal(visible[0].path, '/posts/2026/01/01/first/');
    writeFileSync(
      join(directory, '2026-02-01-duplicate.md'),
      '---\ntitle: Duplicate\npermalink: /posts/2026/01/01/first/\n---\nOops',
    );
    assert.throws(() => loadPosts(directory), /Duplicate post permalink/);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test('unsafe permalinks cannot escape the static output directory', () => {
  for (const path of [
    '//example.com',
    '/../escape/',
    '/post?x=1',
    '/post#hash',
    '/a\\b',
  ])
    assert.throws(() => normalizePath(path));
});
