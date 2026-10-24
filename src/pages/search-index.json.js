import { posts } from '../lib/content.mjs';
export function GET() {
  return Response.json(
    posts.map(({ title, path, text, tags, date }) => ({
      title,
      path,
      text,
      tags,
      date,
    })),
  );
}
