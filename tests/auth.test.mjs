import assert from 'node:assert/strict';
import test from 'node:test';
import auth from '../cloudflare/auth/index.js';

const env = {
  ALLOWED_DOMAINS: 'ricky-blog.rklee.workers.dev,rlee.cc',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
};

test('readiness check never exposes OAuth credentials', async () => {
  const response = await auth.fetch(
    new Request('https://auth.example/health'),
    env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: 'ricky-blog-github-auth',
    ready: true,
  });
  assert.equal(
    (await auth.fetch(new Request('https://auth.example/health'), {})).status,
    503,
  );
});

test('GitHub authorization requests a narrow scope with a secure CSRF cookie', async () => {
  const response = await auth.fetch(
    new Request(
      'https://auth.example/auth?provider=github&site_id=rlee.cc&scope=public_repo',
    ),
    env,
  );
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('Location'));
  assert.equal(location.origin, 'https://github.com');
  assert.equal(location.searchParams.get('scope'), 'public_repo');
  const cookie = response.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.ok(cookie.includes(location.searchParams.get('state')));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('untrusted domains cannot initiate authorization', async () => {
  for (const domain of ['evil.example', 'rlee.cc.evil.example', '']) {
    const response = await auth.fetch(
      new Request(
        `https://auth.example/auth?provider=github&site_id=${domain}`,
      ),
      env,
    );
    assert.notEqual(response.status, 302);
    assert.match(await response.text(), /UNSUPPORTED_DOMAIN/);
  }
});

test('a callback with a mismatched CSRF state is rejected before token exchange', async () => {
  const request = new Request(
    'https://auth.example/callback?code=example&state=wrong',
    {
      headers: { Cookie: 'csrf-token=github_0123456789abcdef0123456789abcdef' },
    },
  );
  const response = await auth.fetch(request, env);
  assert.match(await response.text(), /CSRF_DETECTED/);
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
});
