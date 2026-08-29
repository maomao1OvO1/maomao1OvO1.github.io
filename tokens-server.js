// ===== tokens-server.js —— 本地静态预览服务器 =====
// 用途：在手机上直接用 Node 起一个静态网站服务器，预览「毛毛的个人主页」。
// ⚠️ 现状说明：AI 余额查询已改为「浏览器直连」（不再走后端接口），所以这个文件
//    只是纯静态托管（index.html/css/js 等），不包含任何接口逻辑。
// 运行：node tokens-server.js  （默认端口 3000，可用 PORT 环境变量改）

const http = require("http");      // Node 自带 HTTP 模块：创建服务器
const fs = require("fs");          // 文件系统模块：读文件
const path = require("path");      // 路径模块：拼接/解析路径

const ROOT = __dirname;            // 网站根目录 = 本文件所在目录
const PORT = process.env.PORT || 3000;   // 监听端口（默认 3000）

// 扩展名 → Content-Type 映射表（浏览器按它正确渲染文件类型）
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8"
};

// 创建 HTTP 服务器：每次请求都走这里
const server = http.createServer((req, res) => {
  const route = req.url.split("?")[0];                       // 去掉 ? 后的查询参数，只要路径
  let filePath = path.join(ROOT, route === "/" ? "index.html" : route); // 拼出要读的文件
  // 安全防线：防止目录穿越（../ 逃出网站根目录偷读系统文件）
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  // 目录路径：自动找目录里的 index.html（例如访问 /games/ → 读 games/index.html）
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (e) { /* 文件不存在则交给下面处理 */ }
  // 读文件并返回
  fs.readFile(filePath, (err, content) => {
    if (err) {                                               // 文件不存在 → 404
      res.writeHead(404);
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();        // 拿扩展名
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" }); // 按类型给响应头
    res.end(content);
  });
});

// 启动监听：打印地址
server.listen(PORT, () => {
  console.log("预览服务器已启动：http://localhost:" + PORT);
  console.log("打开 http://localhost:" + PORT + "/ 查看效果");
});
