import { posts, site, escapeHTML } from '../lib/content.mjs';
export function GET() {
  const paths = [
    '/',
    '/about/',
    '/posts/',
    '/tags/',
    '/categories/',
    ...posts.map((post) => post.path),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escapeHTML(new URL(path, site.url))}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
