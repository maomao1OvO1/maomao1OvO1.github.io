# 🐳 毛毛的网站

> GitHub Pages 托管的个人小站 —— 我的 AI 余额查询盒、小游戏大厅、硬件测试实验室与音乐/相册角落，全都在这一个纯静态仓库里。

🔗 线上地址：https://maomao1ovo1.github.io

---

## ✨ 功能亮点

- 🤖 **AI 余额一键查询**：主页查询盒支持 DeepSeek / Kimi / OpenAI，粘贴自己的 Key，浏览器直连官方接口——**Key 不入库、不上传**，带一键刷新与清除。
- 🎮 **小游戏大厅**：2048 / 贪吃蛇 / 打字 / 猜数字 / 五子棋 / 象棋 / 捕鱼 / 围棋，全部接入**排行榜**。
- 🏆 **排行榜（Firestore 云数据库）**：免费额度、永久保存、零冷启动；同名玩家同 ID 自动覆盖，防刷分有规则兜底。
- 📱 **硬件测试大厅**：免授权指纹检测、一键授权项目（17 项，按顺序逐个授权防崩溃）。
- 👤 **登录系统（Firebase）**：Google / GitHub / 邮箱 / 游客四门可用；支持绑定/解绑三方账号、邮箱验证、**更改密码**（旧密码验证 + 两次确认的常规软件体验）。
- 🎵 **音乐页 & 相册页**：私藏的小角落。
- 🌙 **深色模式**：保持黑色系设计（#121212 / #1e1e1e / #333），主色紫 #7C5CBF。

## 🛠️ 技术栈

纯静态前端（无框架，原汁原味 HTML/CSS/JS）：

| 组件 | 说明 |
|---|---|
| Firebase Auth | Google / GitHub / 邮箱密码登录，弹窗版 OAuth |
| Firebase Firestore | 排行榜数据（`scores` 集合，公开读 / 校验写 / 禁删） |
| Service Worker | 离线缓存（更新时带 `?v=N` 破缓存） |
| Node.js（开发用） | `tokens-server.js` 静态托管预览（PORT 3001） |

## 📁 目录结构

```
├── index.html            # 主页 / 登录门 / 账号菜单
├── style.css             # 全局样式 + 主题 + 动画
├── main.js               # 首页逻辑 / 用户信息展示
├── login.js              # Firebase 登录系统（含更改密码）
├── tokens.js             # AI 余额查询逻辑
├── firebase-config.js    # Firebase 前端公开配置（Web API Key 可公开）
├── sw.js                 # Service Worker 缓存管理
├── games/                # 小游戏 + report.js（成绩上报 v3）+ ranking.html
├── hardware-lab/          # 硬件测试大厅
├── music/ · photo.html   # 音乐 / 相册角落
└── tokens-server.js      # 本地预览服务器
```

## 🚀 本地运行

```bash
# 网站预览（端口 3001）
PORT=3001 node tokens-server.js
# 打开 http://localhost:3001

# （可选）旧排行榜本地服务器（端口 3000，现已被 Firestore 取代，仅备用）
node myserver/server.js
```

## 🔐 登录与安全

- 游客默认可浏览；登录后可绑定/解绑 Google / GitHub / 邮箱。
- 邮箱验证邮件若没看到，记得看一眼**垃圾箱**。
- 「更改密码」需要输入当前密码（Firebase reauthenticate）才能修改，防他人改密。
- 联系方式做了**混淆存储**（倒序 + Base64），爬虫抓不到明文邮箱。
- **隐私红线**：AI Key 只在你的浏览器里走直连，后端/仓库永不落库；测试数据绝不进排行榜与仓库。

## 🌐 部署

推送 `main` 分支后 GitHub Pages 自动构建（无需任何配置）。**修改代码后记得更新资源版本号**（如 `login.js?v=N`）以破 Service Worker 缓存。

## 📜 开发约定

- 改完功能跑一遍：手机端 Chrome、深色模式、登录、上传、缓存版本号。
- 未明确授权不推送、不改线上配置、不删线上数据。
- 排行榜主数据源已迁移 Firestore，历史 Render 服务器仅备用。

---

Made with 🐳 & ⌨️ by 毛毛（一只勤劳的打码鲸鱼）
