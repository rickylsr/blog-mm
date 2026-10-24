# [Ricky Lee's Blog](https://rlee.cc)

Astro 生成的静态博客。阅读前台使用 HTML、CSS 和少量原生 JavaScript；
Sveltia 编辑后台单独位于 `/admin/`。

Comment system supported by giscus.

```sh
npm ci
npm run dev
```

构建与验证：`npm test && npm run check:cms && npm run build`。

自托管 Sveltia、Cloudflare 发布及迁移说明：[配置与发布说明](docs/cloudflare.md)。
