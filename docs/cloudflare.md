# Cloudflare 静态博客与自托管编辑器

本项目使用 Astro 构建静态博客，前台使用 HTML、Tailwind CSS 和少量原生 JavaScript。
当前前台没有 React 运行时；后续复杂编辑交互可以按需使用 shadcn/ui。
保留原来的 `_posts`、`_pages` 和 `assets`，所有旧文章固定链接保持不变。
Minimal Mistakes 的相册 include 已在构建时兼容处理。旧 Gemfile、`_config.yml`
仅保留作迁移参考，不参与新的构建。Sveltia 的编辑界面、字体、图片处理组件从
NPM 包构建后随博客一起部署，不使用官方托管 CMS 或运行时 CDN。文章和图片保存在
`rickylsr/blog-mm`，不需要数据库或 R2。

## 本地构建

只需要 Node.js 24，不需要 Ruby、Bundler 或数据库。

```sh
npm ci
npm test
npm run check:cms
npm run build
npm run preview
```

访问 Wrangler 输出的本地地址，编辑入口为 `/admin/`。
`npm run dev` 预览前台；`npm run dev:cms` 单独预览编辑器。默认仍连接真实 GitHub 仓库，
登录后保存会写入该仓库，不是沙箱。

构建顺序为 Astro 生成 `_site/`，复制原有图片，再把编辑器构建到 `_site/admin/`。
前台不会加载 CMS 依赖；首页无需 JavaScript，搜索和按需加载评论使用原生 JavaScript。
不要只运行 `astro build` 后直接发布，否则输出中没有可用的编辑器。
`scripts/check-build.mjs` 会检查博客和 CMS 入口，并排除源码、工具及秘密文件。

## 首次部署

```sh
npx wrangler login
npm run deploy
```

先在返回的 `workers.dev` 地址检查文章、图片、搜索、分页、404 和评论。
站点正式 URL 仍为 `https://rlee.cc`，未切换域名前的 canonical/RSS 链接仍指向该域名。
`wrangler.jsonc` 已将 `rlee.cc/*` 路由到此 Worker，同时保留 `workers.dev` 地址供检查。
`rlee.cc` 的 DNS 记录必须继续开启 Cloudflare 代理；请求由 Worker 静态资源直接响应，
不再经过旧源站，因此不依赖旧源站的证书。后续 Git 自动发布会保留同一路由配置。

当前 Wrangler 登录没有 DNS 记录修改权限，旧 DNS 记录也会阻止添加 Custom Domain，
所以使用现有代理记录配合 Worker 路由。若以后改为 Custom Domain，应先备份并清理
冲突的主机名记录，再将配置改为 `pattern: "rlee.cc", custom_domain: true`。

## GitHub 自动发布

使用 Cloudflare Workers Builds 连接 `rickylsr/blog-mm`，生产分支设为 `master`：

| 配置             | 值                                           |
| ---------------- | -------------------------------------------- |
| Worker           | `ricky-blog`                                 |
| 根目录           | `/`                                          |
| 构建命令         | `npm run build`                              |
| 部署命令         | `npx wrangler deploy`                        |
| Node 版本        | `.nvmrc` 中的 `24`                           |
| 构建变量（可选） | `VITE_CMS_AUTH_URL` 为自己部署的认证服务 URL |

Cloudflare 自动安装依赖。连接时仅授权此博客仓库，按控制台指引配置构建用的部署权限。
`.github/workflows/cloudflare.yml` 只负责 PR 和 `master` 的检查及产物上传，不重复发布，
也不需要在 GitHub 中保存 Cloudflare 部署 token。
请不要把任何凭据放进文章、`admin/config.yml` 或 `VITE_` 变量。

### 验证 Git 自动发布

连接现有仓库后，推送一次新的 `master` 提交并查看 Cloudflare 的构建历史。
仓库连接、分支和命令配置本身不代表构建已经成功。
线上 `/build.json` 会返回实际构建的提交 SHA，以及发布来源：

```sh
curl https://ricky-blog.rklee.workers.dev/build.json
```

当 `publisher` 为 `cloudflare-builds` 且 `commit` 与目标提交一致，才能确认
Git 推送 → Cloudflare 构建 → 部署的整条链路已经打通。
本地执行 `npm run deploy` 的产物会标为 `local`，不能代替自动发布验收。

## 编辑器登录

认证服务默认地址配置在 `admin/config.yml`，界面支持 GitHub OAuth 及访问令牌登录。
`VITE_CMS_AUTH_URL` 可以覆盖默认认证服务地址；它是公开 URL，不是秘密值。
个人试用可创建仅作用于本仓库的 fine-grained token，按 Sveltia 官方文档授权
Contents、Pull requests、Issues 的读写权限，Metadata 读取权限。草稿工作流通过 PR 和标签管理。
权限以当前版本的官方要求为准：
<https://sveltiacms.app/en/docs/backends/github>

更适合手机的方式是自行部署官方 OAuth Worker：
<https://github.com/sveltia/sveltia-cms-auth>

本仓库固定官方认证代码版本，来源及许可证见 `cloudflare/auth/UPSTREAM.md`。

1. `npm run deploy:auth` 部署到自己的 Cloudflare 账户。
2. 在 GitHub 创建自己的 OAuth App，回调为
   `https://ricky-blog-auth.rklee.workers.dev/callback`。
3. 配置 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 两个 Worker secret：

   ```sh
   npx wrangler secret put GITHUB_CLIENT_ID --config cloudflare/auth/wrangler.jsonc
   npx wrangler secret put GITHUB_CLIENT_SECRET --config cloudflare/auth/wrangler.jsonc
   ```

4. `/health` 返回 `ready: true` 表示两个配置已存在；这不替代实际的登录验证。
5. 如改用不同的认证 Worker，修改 `admin/config.yml` 的 `base_url`，或通过
   本地 `.env.local` / Cloudflare Builds 中的 `VITE_CMS_AUTH_URL` 覆盖，再重新构建。

域名白名单已限定为 `ricky-blog.rklee.workers.dev` 和 `rlee.cc`。公开博客使用
`public_repo` OAuth scope，不申请修改 Actions 的 `workflow` 权限。如果以后改为私有仓库，
需要调整 scope 并重新授权。OAuth 的 `public_repo` 授权覆盖账户可访问的公开仓库，
不等同于 fine-grained token 仅限定一个仓库。

配置 OAuth 后也保留 token 登录。GitHub 授权和编辑器是两个部署，Cloudflare 登录
不能替代编辑器的 GitHub 授权。认证 Worker 的 secrets 必须设置在认证服务自己的项目中。

## 手机写作和图片

- 新建文章时填写标题、日期和正文；标签、分类、摘要和封面可选。
- 正文支持富文本和 Markdown，图片通过编辑器或媒体库上传。
- 新图片放在 `assets/images/uploads/`，上传时按配置缩放到最大 2048 × 2048，转换为 WebP。
  手机 HEIC 处理、横竖照片方向、大批量上传需要在实际设备验证。动画图片可能保留原格式。
- 保存草稿创建分支；发布合并到 `master` 后触发构建，完成构建后才在博客显示。
- 现有文章的 `permalink` 字段保留旧链接，请不要随意更改已发布文章的固定链接或文件名。

## 内容控制和备份

当前仓库公开：草稿分支、PR 及已经提交的照片同样公开，不能把“不出现在博客首页”当作私密。
需要保密草稿时，先规划私有内容仓库以及 GitHub Pages 等现有依赖的调整。
浏览器仍会直接访问 GitHub API，手机网络需要能连接 GitHub。

本配置不会主动把内容发送给 AI 服务。未来的 AI 接口应另行认证，密钥只放在服务端。
备份应包含完整 Git 仓库和图片；OAuth App、Cloudflare 配置及秘密值另外保存。
保留 `package-lock.json`，升级编辑器后先验证手机输入、图片上传、旧文保存和草稿发布。

## 参考

- Sveltia 自托管与构建：<https://sveltiacms.app/en/docs/deployments>
- Jekyll 集成：<https://sveltiacms.app/en/docs/frameworks/jekyll>
- Astro 静态构建：<https://docs.astro.build/en/guides/deploy/>
- 静态资源托管：<https://developers.cloudflare.com/workers/static-assets/>
