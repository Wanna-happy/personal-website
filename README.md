# 阮涵 | AI创意小屋

带人物导览的个人网站：https://wanna-happy.github.io/personal-website/

## 在线管理

网站右上角点击「进入后台」，输入已设置的管理员密码，可编辑简介、相册、项目、经历和联系信息。点击「保存并发布」会自动提交到本仓库，由 GitHub Pages 更新公开网站。无需启动本机 Python。

管理地址：https://wanna-happy.github.io/personal-website/admin.html

腾讯云 CloudBase 云托管提供管理 API，PostgreSQL 保存会话。密码校验值、GitHub 令牌和云密钥仅存于服务端环境配置，不包含在仓库中。操作说明见 [ADMIN.md](ADMIN.md)，后端部署说明见 [online-admin/README.md](online-admin/README.md)。

## 网站功能

- 欢迎、认识我与生活、经历、项目、联系五个章节。
- 可中断的自动导览，人物使用已有动作视频和讲解声音。
- 深色与暖色浅色主题，桌面和手机适配。
- 生活照片完整显示、点击放大；项目支持展示图片和 PDF。
- 修改讲解文稿后先展示文字，未配新录音前不会套用旧录音。

## 发布结构

站点文件在仓库根目录，GitHub Pages 使用 main / (root)，无需构建。content.json 和 content-data.js 保存内容，assets/uploads/ 保存附件，mascot/ 保存人物素材。admin.html 是管理入口，online-admin/ 是服务端源码。

## 本地预览（可选）

安装 Python 3 后双击「打开网站管理.cmd」。首次本地管理可运行「设置管理密码.cmd」。本地服务仅监听回环地址，本地保存需要另行提交推送，不会自动同步云端密码。

```powershell
python -m http.server 8765 --bind 127.0.0.1
python tools/admin-server.py
```

## 验证

```powershell
node --test online-admin/test/*.test.mjs
python tools/check-admin-auth.py
```
