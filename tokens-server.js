// tokens-server.js
// 本地预览服务器：托管静态网站 + 提供 /api/tokens 余额接口
// 数据来源：tokens-config.json（里面填 API Key，不会上传）
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CONFIG_FILE = path.join(ROOT, "tokens-config.json");
const PORT = process.env.PORT || 3000;

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

// 读取配置
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (e) {
    return { providers: [] };
  }
}

// 简单 JSON 路径取值，支持 a.b[0].c
function getByPath(obj, p) {
  if (!p) return null;
  const parts = String(p).replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur === undefined || cur === null) return null;
    cur = cur[part];
  }
  return cur;
}

// 查询单个厂商余额
function queryProvider(prov) {
  return new Promise((resolve) => {
    if (!prov.apiKey || prov.apiKey.indexOf("在此填入") !== -1) {
      return resolve({ ok: false, error: "未填 API Key" });
    }
    if (!prov.baseUrl || !prov.path) {
      return resolve({ ok: false, error: "配置缺 baseUrl / path" });
    }
    const url = prov.baseUrl.replace(/\/$/, "") + prov.path;
    const prefix = prov.authPrefix !== undefined ? prov.authPrefix : "Bearer ";
    const headers = {
      "Authorization": prefix + prov.apiKey,
      "Accept": "application/json",
      "User-Agent": "tokens-balance-viewer"
    };
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        // 非 2xx 视为错误（如 401 表示 Key 无效）
        if (res.statusCode >= 400) {
          return resolve({ ok: false, error: "HTTP " + res.statusCode + (body ? "：" + body.slice(0, 120) : "") });
        }
        try {
          const data = JSON.parse(body);
          const balance = getByPath(data, prov.balancePath);
          resolve({
            ok: true,
            balance: balance === null || balance === undefined ? "未找到" : balance,
            unit: prov.unit || ""
          });
        } catch (e) {
          resolve({ ok: false, error: "响应解析失败", raw: body.slice(0, 160) });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ ok: false, error: "请求超时" });
    });
  });
}

// 创建服务器
const server = http.createServer((req, res) => {
  const route = req.url.split("?")[0];

  // ===== 余额接口 =====
  if (route === "/api/tokens") {
    const config = loadConfig();
    const tasks = config.providers.map(queryProvider);
    Promise.all(tasks).then((results) => {
      const providers = config.providers.map((p, i) => ({
        name: p.name || ("服务" + (i + 1)),
        hasKey: !!(p.apiKey && p.apiKey.indexOf("在此填入") === -1),
        ...results[i]
      }));
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(JSON.stringify({
        providers: providers,
        updatedAt: new Date().toISOString()
      }));
    });
    return;
  }

  // ===== 网页填写并保存 Key =====
  if (route === "/api/tokens/config" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const keyMap = payload.keyMap || {};
        const config = loadConfig();
        config.providers.forEach((p) => {
          if (keyMap[p.name] !== undefined) {
            p.apiKey = keyMap[p.name];
          }
        });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ===== 静态文件 =====
  let filePath = path.join(ROOT, route === "/" ? "index.html" : route);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log("AI 余额预览服务器已启动：http://localhost:" + PORT);
  console.log("页面: http://localhost:" + PORT + "/");
  console.log("接口: http://localhost:" + PORT + "/api/tokens");
});
