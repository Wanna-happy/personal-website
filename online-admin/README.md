# 在线内容管理服务

网站继续由 GitHub Pages 提供；腾讯云 CloudBase Run 运行密码认证、文件上传、资料保存与发布状态接口。PostgreSQL 保存会话、登录限流、待发布附件及操作回执，容器重启不会丢失这些状态。

## 管理流程

从网站右上角「进入后台」登录，编辑简介、教育背景、项目、经历与照片后点击「保存并发布」。保存会同时更新仓库的 `content.json` 和 `content-data.js`，附件写入 `assets/uploads/`；页面分别显示保存成功和 Pages 发布状态。

照片支持上传、删除、说明编辑与排序；项目支持封面、多页展示图片和 PDF。PPT 请先导出图片或 PDF。删除资料会从当前页面移除，Git 历史仍保留以便恢复。

## 服务配置

Node.js 22 或更新版本，无第三方运行时依赖。首次部署先执行 `sql/001-admin-state.sql`。数据表启用 RLS，匿名角色与普通登录角色没有读写权限，RPC 使用调用者权限运行。

仅在云服务环境变量中设置：

- `CLOUDBASE_ENV_ID`、`CLOUDBASE_APIKEY`：当前环境 ID 及服务端 API Key。
- `ADMIN_PASSWORD_HASH`：包含十六进制 `salt`、`hash` 和 `iterations` 的 PBKDF2-SHA256 校验 JSON。不得填明文密码。
- `GITHUB_TOKEN`：仅选择个人网站仓库的 fine-grained token，Contents 读写、Actions 只读。
- `GITHUB_OWNER`、`GITHUB_REPO`、`GITHUB_BRANCH`：目标仓库和分支。
- `ALLOWED_ORIGINS`：允许的网页来源，多个来源以英文逗号分隔。
- `PORT`：默认 8080。

前端 `admin-config.js` 只存 HTTPS 服务地址，不能包含密钥或密码校验值。更换管理员密码校验值后，已有会话自动失效。令牌到期前需在云服务配置中更新。

服务空闲可缩容到 0，首次访问可能需要等待启动。当前部署限制最多 1 个实例；数据库限流仍按跨实例事务实现。体验套餐及密钥都有有效期，应在到期前续期或轮换。

## 验证与恢复

`node --test test/*.test.mjs` 运行接口测试。`GET /healthz` 检查服务与数据库；写入和附件接口必须携带有效管理会话。前端遇到网络中断可重试保存，同一操作编号不会重复发布。遇到版本冲突时，先导出草稿，再重新加载，避免覆盖另一处修改。

部署 ZIP 只能包含 Dockerfile、package 文件和 `src/`，文件路径使用 `/`。本机授权缓存、密钥文件和管理密码文件都不能打包或提交。
