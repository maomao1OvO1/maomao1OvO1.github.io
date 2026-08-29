// ===== AI 余额（自助查询） =====
/*
 * =========================== 文件级注释 ===========================
 * 本文件：tokens.js —— 「AI 余额自助查询」小部件
 * 用途：访客选择 AI 厂商（DeepSeek / Moonshot-Kimi / OpenAI），填入自己的 API Key，
 *       在浏览器端直接向各家官方余额接口发请求，显示剩余额度。
 *
 * 隐私说明：Key 只保存在访客自己的浏览器 localStorage，不上传任何服务器、
 *           不经任何中转，也没有人能看到（仅浏览器本地使用）。
 *
 * 主要函数清单：
 *   - getByPath(obj, path)      按路径从对象里取值，支持 a.b[0].c
 *   - saveState()               把当前选的厂商 + Key 存到 localStorage
 *   - restoreState()            从 localStorage 恢复上次的厂商 + Key
 *   - clearTokensState()        清空本地保存的 Key/厂商，重置输入框
 *   - checkBalance()            构造请求头并调用对应厂商余额接口，展示结果
 *
 * 被哪些页面引用：index.html（AI 余额卡片）
 * =================================================================
 */

// 支持查询的 AI 厂商配置表
// 每项包含：url=余额接口地址；auth=认证前缀; path=余额字段提取路径;
//          unit=单位(可为空); note=给用户的提示(可为空)。
const PROVIDERS = {
  // DeepSeek 官方余额接口：返回 balance_infos[0].total_balance
  "DeepSeek": {
    url: "https://api.deepseek.com/user/balance",
    auth: "Bearer ",
    path: "balance_infos[0].total_balance",
    unit: "",
    note: ""
  },
  // Moonshot/Kimi 余额接口：返回 data.available_balance
  "Moonshot/Kimi": {
    url: "https://api.moonshot.cn/v1/users/me/balance",
    auth: "Bearer ",
    path: "data.available_balance",
    unit: "",
    note: ""
  },
  // OpenAI 信用额度接口：返回 total_available；官方无稳定余额接口，可能查不到
  "OpenAI": {
    url: "https://api.openai.com/v1/dashboard/billing/credit_grants",
    auth: "Bearer ",
    path: "total_available",
    unit: "",
    note: "OpenAI 官方无稳定余额接口，可能查不到"
  }
};

// 按路径取值，支持 a.b[0].c
function getByPath(obj, p) {
  if (!p) return null;
  const parts = String(p).replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return null;
    cur = cur[part];
  }
  return cur;
}

// 把当前选择的厂商 + Key 存到访客自己的浏览器本地
// key 只在 localStorage，绝不上传服务器。清除按钮随时可删。
const SK_PROVIDER = "tokens_provider";
const SK_KEY = "tokens_key";

function saveState() {
    const p = document.getElementById("tokens-provider");
    const k = document.getElementById("tokens-key");
    if (!p || !k) return;
    localStorage.setItem(SK_PROVIDER, p.value);
    localStorage.setItem(SK_KEY, k.value.trim());
}

function restoreState() {
    const p = document.getElementById("tokens-provider");
    const k = document.getElementById("tokens-key");
    if (!p || !k) return;
    const sp = localStorage.getItem(SK_PROVIDER);
    const sk = localStorage.getItem(SK_KEY);
    if (sp && PROVIDERS[sp]) p.value = sp;
    if (sk) k.value = sk;
}

function clearTokensState() {
    localStorage.removeItem(SK_PROVIDER);
    localStorage.removeItem(SK_KEY);
    const p = document.getElementById("tokens-provider");
    const k = document.getElementById("tokens-key");
    const r = document.getElementById("tokens-result");
    if (p) p.value = "DeepSeek";
    if (k) k.value = "";
    if (r) { r.className = "tokens-result"; r.innerHTML = ""; }
}

function checkBalance() {

    const providerSel = document.getElementById("tokens-provider");
    const keyInput = document.getElementById("tokens-key");
    const resultBox = document.getElementById("tokens-result");

    if(!providerSel || !keyInput || !resultBox) return;

    const provider = providerSel.value;
    const key = keyInput.value.trim().replace(/^Bearer\s+/i, "");

    if(!key){
        resultBox.className = "tokens-result tokens-error";
        resultBox.innerHTML = "请输入你的 API Key";
        return;
    }

    // 记下这次的厂商 + Key（存到访客自己浏览器，刷新还在）
    saveState();

    const cfg = PROVIDERS[provider];
    if(!cfg){
        resultBox.className = "tokens-result tokens-error";
        resultBox.innerHTML = "请选择 AI 厂商";
        return;
    }

    resultBox.className = "tokens-result";
    resultBox.innerHTML = "⏳ 正在查询...";

    fetch(cfg.url, {
        headers: {
            "Authorization": cfg.auth + key,
            "Accept": "application/json"
        }
    })

    .then(response => {
        if(response.status >= 400){
            if(response.status === 401) throw new Error("Key 无效或已过期（401）");
            if(response.status === 403) throw new Error("无权限（403）");
            throw new Error("请求失败（HTTP " + response.status + "）");
        }
        return response.json();
    })

    .then(data => {
        const balance = getByPath(data, cfg.path);
        let html = "✅ " + provider + " 余额：<b>" +
            (balance === null || balance === undefined ? "未找到余额字段" : balance) +
            (cfg.unit ? " " + cfg.unit : "") + "</b>";
        if(cfg.note) html += "<br><small>" + cfg.note + "</small>";
        resultBox.className = "tokens-result tokens-ok";
        resultBox.innerHTML = html;
    })

    .catch(error => {
        resultBox.className = "tokens-result tokens-error";
        resultBox.innerHTML = "❌ " + error.message;
    });

}

// 页面加载后：恢复上次的厂商 + Key；若已存有 Key，则自动再查一次（刷新后余额也在）
document.addEventListener("DOMContentLoaded", function(){
    restoreState();
    const k = document.getElementById("tokens-key");
    if(k && k.value.trim()){
        checkBalance();
    }
});
