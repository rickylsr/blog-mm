# Sveltia CMS Authenticator

`upstream.js` and `LICENSE.txt` are copied unchanged from:

- Repository: https://github.com/sveltia/sveltia-cms-auth
- Commit: `5623041efafa3984ad5d9fd7820c63a05403b863`
- Source: `src/index.js`
- License: MIT

`index.js` adds a readiness check and no-store/security response headers.
`wrangler.jsonc` restricts the permitted CMS hostnames. OAuth credentials are
Cloudflare Worker secrets and must never be committed or placed in Vite variables.

Update the pinned upstream source deliberately and run the authentication tests
before deploying. The static blog Worker and this authentication Worker are separate.
