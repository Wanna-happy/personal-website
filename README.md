# 阮涵 | AI创意小屋

带人物导览的个人网站，原网址：https://wanna-happy.github.io/personal-website/ 。

## 访问与交互

- 欢迎、认识我与生活、经历、项目、联系五个章节。
- 可中断的自动导览，人物随页面走动，使用已生成的动作视频和讲解声音。
- 深色和暖色浅色主题，桌面和手机适配。
- 生活照片完整显示、点击放大；项目卡片可展开，支持多页图片和 PDF。
- 新增或修改讲解文稿先展示文字，未配新录音前不会套用旧录音。

## GitHub Pages

站点文件在仓库根目录。沿用 Pages 的 `main / (root)` 发布方式，无需构建，`.nojekyll` 保证直接提供静态文件。所有站内资源使用相对路径，适配 `/personal-website/` 子路径。

## 本地预览和管理

安装 Python 3，双击「打开网站管理.cmd」会启动本机预览及管理服务。也可以分别运行：

```powershell
python -m http.server 8765 --bind 127.0.0.1
python tools/admin-server.py
```

网站：http://127.0.0.1:8765/ 。管理：http://127.0.0.1:8765/admin.html 。网站右上角的「进入后台」也可以打开管理页。

首次在自己的电脑运行「设置管理密码.cmd」，设置管理员密码；已有本机凭据会继续使用。**仓库不包含管理员密码或密码校验文件**。未配置或未验证身份时，保存和上传均被服务端拒绝。

后台管理简介、教育、联系、项目、经历与相册。项目支持封面、PDF 和多张展示图片；PPTX 先导出为 PDF 或图片。保存更新根目录 `content.json`、`content-data.js` 及 `assets/uploads/`，然后提交并推送这些变更，由 Pages 更新公开网站。详见 [ADMIN.md](ADMIN.md)。

GitHub Pages 只提供静态文件，**不会运行 Python 后台**。公开页面的后台入口会说明本机管理方式；异地在线编辑还需要另行部署 HTTPS 后端。本次没有声称已提供云端管理或自动发布。

## 目录

- `index.html`、CSS 与 JS：页面、主题和交互。
- `content.json` / `content-data.js`：已保存的网站内容。
- `assets/`：照片、工具图标、上传的项目附件。
- `mascot/`：人物控制脚本、视频和声音素材。
- `admin.html` / `admin*.js` / `admin.css`：密码登录及内容编辑界面。
- `tools/admin-server.py`、`admin-auth.py`：只监听本机的管理服务和密码验证。

## 验证

```powershell
python tools/check-admin-auth.py
```

发布前另在真实浏览器检查子路径资源、主题、照片、项目详情和人物素材；所有机密配置与本地环境不随静态站点发布。
