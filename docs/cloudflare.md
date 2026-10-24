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
确认后在该 Worker 的 Settings → Domains & Routes 中添加 `rlee.cc` 为 Custom Domain。
本配置不会自动修改域名或 DNS，也不需要 GitHub Pages 使用的 `CNAME` 文件来绑定域名。

## GitHub 自动发布

`.github/workflows/cloudflare.yml` 在 PR 上构建并上传产物，在 `master` 更新时构建及部署。
仓库 Settings → Secrets and variables → Actions 需要配置：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 限定到目标账户、具有 Workers 部署权限的 token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | 目标账户 ID |
| Variable（可选） | `VITE_CMS_AUTH_URL` | 自己部署的 OAuth 认证 Worker 的 HTTPS URL |

没有部署凭据时，工作流只构建及上传产物，并在摘要中注明跳过部署。
请不要把任何凭据放进文章、`admin/config.yml` 或 `VITE_` 变量。
如果 Worker 已连接 Cloudflare 自己的 Git 构建，选择一个发布入口，避免重复部署。

## 编辑器登录

未设置 `VITE_CMS_AUTH_URL` 时，界面仅显示 GitHub 访问令牌登录。
个人试用可创建仅作用于本仓库的 fine-grained token，按 Sveltia 官方文档授权
Contents、Pull requests、Issues 的读写权限，Metadata 读取权限。草稿工作流通过 PR 和标签管理。
权限以当前版本的官方要求为准：
<https://sveltiacms.app/en/docs/backends/github>

更适合手机的方式是自行部署官方 OAuth Worker：
<https://github.com/sveltia/sveltia-cms-auth>

1. 将官方认证服务部署到自己的 Cloudflare 账户。
2. 在 GitHub 创建自己的 OAuth App，回调为认证 Worker 的 `/callback`。
3. 按上游说明配置 client ID、client secret，并将 `ALLOWED_DOMAINS` 限定为
   实际承载编辑器的域名（首次试用还包括博客的 `workers.dev` 域名）。
4. 本地复制 `.env.example` 为 `.env.local`，填入认证 Worker URL；CI 中设置同名
   `VITE_CMS_AUTH_URL` 仓库变量，再重新构建。

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
