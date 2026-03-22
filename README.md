# 管道防腐层胶带剥离支架 — 3D 展示

基于 Three.js 的浏览器端 3D 模型（`index.html`）。

## GitHub

仓库：<https://github.com/bistuwangqiyuan/peeling-bracket-3d>

```bash
git add .
git commit -m "更新模型"
git push origin master
```

## Netlify 部署（连接 GitHub）

1. 登录 [Netlify](https://app.netlify.com/)，用 GitHub 授权。
2. **Add new site** → **Import an existing project** → 选 **GitHub**。
3. 选中仓库 `peeling-bracket-3d`。
4. 构建设置：
   - **Build command**：留空（无构建步骤）
   - **Publish directory**：`.`（根目录，与 `netlify.toml` 一致）
5. 点击 **Deploy site**。完成后会得到 `https://随机名.netlify.app`，可在 **Site settings → Domain management** 里改子域名或绑定自定义域名。

### 可选：Netlify CLI 本地上传

```bash
npm i -g netlify-cli
netlify login
netlify deploy --prod --dir=.
```

## 本地预览

用任意静态服务器打开目录，或直接双击 `index.html`（部分浏览器对 ES 模块有限制，建议用本地服务器）。

```bash
npx serve .
```
