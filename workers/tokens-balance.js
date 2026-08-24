// tokens-balance.js
// Cloudflare Worker：线上查询 AI 厂商余额（免费的云端服务器）
// 部署后访问 https://tokens-balance.<你的子域>.workers.dev
// 它会读取云端环境变量里的 Key（在 Cloudflare 后台设置，不会暴露给访客）

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response("", { status: 204, headers: cors });
    }

    const providers = buildProviders(env);
    const results = [];

    for (const p of providers) {
      if (!p.key) {
        results.push({ name: p.name, ok: false, error: "未配置 Key" });
        continue;
      }
      try {
        results.push(await query(p));
      } catch (e) {
        results.push({ name: p.name, ok: false, error: e.message });
      }
    }

    return new Response(JSON.stringify({
      providers: results,
      updatedAt: new Date().toISOString()
    }), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  }
};

// 从 Cloudflare 环境变量读取各厂商 Key
function buildProviders(env) {
  return [
    {
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com",
      path: "/user/balance",
      key: env.DEEPSEEK_API_KEY || "",
      authPrefix: "Bearer ",
      balancePath: "balance_infos[0].total_balance",
      unit: ""
    },
    {
      name: "Moonshot/Kimi",
      baseUrl: "https://api.moonshot.cn/v1",
      path: "/users/me/balance",
      key: env.MOONSHOT_API_KEY || "",
      authPrefix: "Bearer ",
      balancePath: "data.available_balance",
      unit: ""
    }
  ];
}

// 查询单个厂商余额（Cloudflare 自带 fetch）
async function query(p) {
  const url = p.baseUrl + p.path;
  const resp = await fetch(url, {
    headers: {
      "Authorization": p.authPrefix + p.key,
      "Accept": "application/json"
    }
  });
  if (!resp.ok) {
    return { name: p.name, ok: false, error: "HTTP " + resp.status };
  }
  const data = await resp.json();
  let cur = data;
  const parts = p.balancePath.replace(/\[(\d+)\]/g, ".$1").split(".");
  for (const part of parts) {
    if (cur === null || cur === undefined) {
      return { name: p.name, ok: false, error: "解析失败" };
    }
    cur = cur[part];
  }
  return { name: p.name, ok: true, balance: cur, unit: p.unit || "" };
}
