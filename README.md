# MARGIN NOTE · 个人博客

纯 HTML / CSS / JavaScript，Markdown 内容管理，无 npm 依赖、无构建步骤。

## 本地运行

在 PowerShell 中执行：

```powershell
cd D:\ai\demo_bloop1
py -3 -m http.server 4173 --bind 127.0.0.1
```

浏览器访问 `http://127.0.0.1:4173/`。停止服务按 Ctrl+C。
**不要双击 index.html 读取文章**：浏览器通常不允许 file 协议 fetch 本地 Markdown。

## 文件结构

- `index.html`：页面外壳、导航与页脚
- `styles.css`：纸张色调、响应式布局、键盘焦点及减少动画设置
- `config.js`：站点名称、作者、头像、介绍、联系方式、文章目录
- `app.js`：hash 路由、文章渲染、基础 Markdown 解析器、文章目录
- `posts/*.md`：三篇可替换的演示文章
- `.nojekyll`：静态文件直接发布标记
- `tests/smoke.cjs`：不依赖浏览器的逻辑回归测试

路由：`#home`、`#about`、`#post/文章slug`。链接和文件均使用相对路径，可放在仓库子目录站点，不依赖服务器重写。

## 修改站点

编辑 `config.js` 的 name、author、intro、avatar、social 等字段。关于页的长篇介绍在 `app.js` 的 `renderAbout()` 中修改；首页大标题、品牌图标 M 在模板中修改。

GitHub 地址、邮箱和作者名是占位值，三篇文章是演示内容，请上线前替换。头像是演示图库照片，并非站主真人照片。

当前字体由 Google Fonts 加载，图片来自 Unsplash；这些是可选外部资源，并不代表完全离线。核心逻辑无第三方 JS 依赖。离线/国内网络使用时建议将自己的图片放到 `assets/`，并把 config 中的路径改为 `assets/文件名.jpg`。字体无法加载时使用系统字体。

## 新增文章

1. 新建 `posts/my-first-post.md`。
2. 在 `config.js` 的 `posts` 数组中添加一项：

```javascript
{
  slug: 'my-first-post',
  title: '我的第一篇文章',
  excerpt: '一段简短的内容介绍。',
  date: '2026-10-07',
  category: '随笔',
  readTime: '3 分钟',
  cover: 'assets/my-cover.jpg', // 先放入自己的图片
  file: 'posts/my-first-post.md',
  featured: true
}
```

slug 必须唯一，建议使用小写英文和短横线；日期用 YYYY-MM-DD。数组顺序决定展示顺序，建议最新文章放在最前面。首页使用第一篇 featured 文章作为精选（没有指定则使用首篇），其余文章显示在下方。readTime 由你填写，不自动计算。

### Markdown 支持范围

支持一级至三级标题、普通段落、粗体、斜体、行内代码、无序列表、引用、围栏代码块、普通链接。原始 HTML 会转义；链接限制为 HTTP(S)、mailto 和相对地址。

这是精简解析器，不是完整 CommonMark 实现：暂不支持表格、正文图片、有序/嵌套列表、任务列表和复杂嵌套格式。段落建议整段写在同一行，段落之间空一行。不要用它展示来源不明且未经审核的公共投稿。

## 发布

以下是静态部署设置建议；控制台选项名称可能随平台更新而变化。此项目尚未上传或线上部署。

### GitHub Pages

1. 将本目录中的站点文件提交到你自己的 GitHub 仓库，确保 index.html 位于发布目录根部。
2. 仓库 Settings → Pages，选择从分支发布（Deploy from a branch）。
3. 选择实际使用的分支（例如 main）和 `/ (root)`，保存。
4. 等待部署完成，打开控制台显示的站点地址。

保留 `.nojekyll`，不需要 npm install 或 npm run build。项目站点一般位于仓库名子路径下，本项目使用相对地址兼容这种部署方式。

### EdgeOne Pages

将仓库导入 Pages，选择无框架/其他或静态站点类型，项目根目录指向包含 index.html 的目录，构建命令留空（若平台有“跳过构建”选项则启用），输出目录选择该目录（通常为 `.`）。也可使用控制台提供的静态文件上传方式。以实际控制台可用选项为准，不要设置成不存在的 dist 目录。

部署后至少验收首页、关于页、三篇文章正文、详情页刷新、返回列表和手机宽度。hash 路由不要求单独配置 SPA 重写规则。

## 验证与边界

```powershell
node --check app.js
node --check config.js
node tests/smoke.cjs
```

Node 只用于开发测试，发布的网站不需要 Node 运行时。本网站不包含后台登录、在线编辑、数据库、评论和全文搜索。内容修改后需要重新发布。正文由浏览器 JavaScript 加载，若以后强调 SEO/每篇文章独立分享预览，可另行增加静态 HTML 预生成。
