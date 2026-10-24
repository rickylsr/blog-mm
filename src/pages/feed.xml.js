import { posts, site, escapeHTML } from '../lib/content.mjs';
export function GET() {
  const items = posts
    .map(
      (post) =>
        `<item><title>${escapeHTML(post.title)}</title><link>${escapeHTML(new URL(post.path, site.url))}</link><guid isPermaLink="true">${escapeHTML(new URL(post.path, site.url))}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escapeHTML(post.excerpt)}</description></item>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeHTML(site.title)}</title><link>${site.url}/</link><description>${escapeHTML(site.description)}</description><language>zh-CN</language><atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
}
