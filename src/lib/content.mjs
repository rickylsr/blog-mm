import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import { parse } from 'yaml';

export const site = {
  title: "Ricky Lee's Blog",
  url: 'https://rlee.cc',
  description: '记录琐碎杂事和一些折腾经验。快乐生活，快乐科技。',
  author: 'Ricky Lee',
};

export function escapeHTML(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
}

export function readDocument(source) {
  const match = source
    .replace(/^\uFEFF/, '')
    .match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Markdown document is missing YAML front matter');
  return { data: parse(match[1]), body: match[2] };
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-') || 'section';
const markdown = new MarkdownIt({ html: true, linkify: true })
  .use(anchor, { slugify })
  .use(footnote);
const originalImage = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('loading', 'lazy');
  tokens[index].attrSet('decoding', 'async');
  return originalImage(tokens, index, options, env, renderer);
};

export function migrateLegacyMarkdown(body, data) {
  const migrated = body
    .replace(
      /\{%\s*include\s+gallery\s+id=["']([^"']+)["'][\s\S]*?%\}/g,
      (_, id) => {
        const images = data[id];
        if (!Array.isArray(images))
          throw new Error(`Missing legacy gallery: ${id}`);
        return `\n<div class="gallery">${images
          .map((image) => {
            const src = image.image_path || image.url;
            const href = image.url || src;
            if (
              ![src, href].every(
                (url) =>
                  typeof url === 'string' && /^(\/[^/]|https?:\/\/)/.test(url),
              )
            ) {
              throw new Error(`Invalid gallery image in ${id}`);
            }
            return `<a href="${escapeHTML(href)}"><img src="${escapeHTML(src)}" alt="${escapeHTML(image.alt || '')}" loading="lazy" decoding="async"></a>`;
          })
          .join('')}</div>\n`;
      },
    )
    .replace(/^\{:\s*\.[\w-]+\s*\}\s*$/gm, '');
  if (/\{%|\{\{\s*site\./.test(migrated))
    throw new Error('Unconverted Jekyll/Liquid markup');
  return migrated;
}

export function renderDocument(body, data = {}) {
  const source = migrateLegacyMarkdown(body, data);
  const tokens = markdown.parse(source, {});
  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open' && ['h2', 'h3'].includes(token.tag)) {
      headings.push({
        depth: Number(token.tag[1]),
        slug: token.attrGet('id'),
        text: tokens[i + 1].content.replace(/<[^>]+>/g, ''),
      });
    }
  }
  return {
    html: markdown.renderer.render(tokens, markdown.options, {}),
    headings,
    source,
  };
}

function list(value) {
  if (Array.isArray(value)) return value.map(String);
  return value ? [String(value)] : [];
}

export function normalizePath(path) {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[?#\\]/.test(path) ||
    path.split('/').includes('..')
  ) {
    throw new Error(`Invalid post permalink: ${path}`);
  }
  return path.endsWith('.html') || path.endsWith('/') ? path : `${path}/`;
}

export function loadPosts(directory = resolve('_posts'), now = new Date()) {
  const paths = new Set();
  return readdirSync(directory)
    .filter((file) => /\.md$/i.test(file))
    .map((filename) => {
      const { data, body } = readDocument(
        readFileSync(resolve(directory, filename), 'utf8'),
      );
      const date = new Date(data.date || filename.slice(0, 10));
      if (!Number.isFinite(date.getTime()) || !data.title)
        throw new Error(`Invalid title/date: ${filename}`);
      const dateString = date.toISOString().slice(0, 10);
      const slug = filename
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/\.md$/i, '');
      const path = normalizePath(
        data.permalink || `/posts/${dateString.replaceAll('-', '/')}/${slug}/`,
      );
      if (paths.has(path)) throw new Error(`Duplicate post permalink: ${path}`);
      paths.add(path);
      const rendered = renderDocument(body, data);
      const text = rendered.html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        ...rendered,
        data,
        filename,
        path,
        title: String(data.title),
        date: dateString,
        timestamp: date.getTime(),
        excerpt: data.excerpt || text.slice(0, 150),
        text,
        tags: list(data.tags),
        categories: list(data.categories),
        minutes: Math.max(1, Math.ceil(text.length / 450)),
        published:
          data.published !== false && data.draft !== true && date <= now,
      };
    })
    .filter((post) => post.published)
    .sort(
      (a, b) =>
        b.timestamp - a.timestamp || b.filename.localeCompare(a.filename),
    );
}

export const posts = loadPosts();
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});
export const formatDate = (date) =>
  dateFormatter.format(new Date(`${date}T00:00:00Z`)).replaceAll('/', '.');
export const tagLink = (tag) => `/tags/#${encodeURIComponent(slugify(tag))}`;
export const tagId = slugify;
