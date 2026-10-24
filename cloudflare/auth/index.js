import upstream from './upstream.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      request.method === 'GET' &&
      (url.pathname === '/' || url.pathname === '/health')
    ) {
      const ready = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
      return Response.json(
        { service: 'ricky-blog-github-auth', ready },
        { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const response = await upstream.fetch(request, env);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
