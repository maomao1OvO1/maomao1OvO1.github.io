// report.js v2 —— 所有小游戏共用的排行榜分数上报（防丢失增强版）
// 游戏结束时调用 reportScore(游戏id, 分数)；玩家名取网站里存的昵称(playerName)
// v2 改动：
//   1) 失败自动重试(最多3次, 间隔3秒, 避开服务器同玩家2秒限流)
//   2) 待传队列(localStorage)：请求失败/页面刷新都不丢, 下次打开页面自动补传
//   3) 请求超时控制(15秒, 适配Render免费实例冷启动)
//   4) 轻量提示 showToast()(右上角小条, 不阻塞游戏流程)
// 上报到线上排行榜服务器

const REPORT_URL = "https://maomao-server.onrender.com/score";
const PENDING_KEY = "reportPending";   // 待传队列 {game,score,name,ts,fail}
const MAX_RETRY = 3;
const RETRY_DELAY = 3000;              // 3秒后重试(>服务器2秒限流窗口)
const REQ_TIMEOUT = 15000;             // 15秒超时(冷启动备用)

// ===== 上报入口 =====
function reportScore(game, score) {
    if (typeof score !== "number" || isNaN(score)) return;
    const name = localStorage.getItem("playerName") || "匿名玩家";
    const q = loadQueue();
    q.push({ game: game, score: Math.round(score), name: name, ts: Date.now(), fail: 0 });
    saveQueue(q);
    flushQueue();
}

// ===== 队列读写 =====
function loadQueue() {
    try { const q = JSON.parse(localStorage.getItem(PENDING_KEY)); return Array.isArray(q) ? q : []; }
    catch (e) { return []; }
}
function saveQueue(q) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(q)); } catch (e) {}
}

// ===== 尝试发送队首(一次只发一条, 保证顺序与限流安全) =====
let flushing = false;
function flushQueue() {
    if (flushing) return;
    const q = loadQueue();
    if (q.length === 0) return;
    flushing = true;
    const item = q[0];

    // 超时控制(AbortController)
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), REQ_TIMEOUT) : null;

    fetch(REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, game: item.game, score: item.score }),
        keepalive: true,
        signal: ctrl ? ctrl.signal : undefined
    })
    .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    })
    .then(d => {
        // 「操作太快」= 上一次已成功记录, 本队首视为已完成
        // 其余失败(未知游戏/分数异常等)重试也没用, 直接丢弃
        const done = d.ok || (d.message && d.message.indexOf("太快") >= 0);
        if (!done) console.log("[排行榜] 该成绩不会被记录:", d.message);
        finishQueue();
    })
    .catch(e => {
        item.fail = (item.fail || 0) + 1;
        if (item.fail < MAX_RETRY) {
            console.log("[排行榜] 上传失败, " + RETRY_DELAY / 1000 + "秒后重试(" + item.fail + "/" + MAX_RETRY + "):", e.message);
            setTimeout(() => { flushing = false; flushQueue(); }, RETRY_DELAY);
            return; // 保留下一条
        }
        console.log("[排行榜] 上传失败已放弃(成绩保留在本地, 下次打开页面会再试):", e.message);
        q.shift();
        saveQueue(q);
        showToast("⚠️ 成绩上传失败，稍后自动重试");
        setTimeout(() => { flushing = false; flushQueue(); }, 500);
        return;
    })
    .finally(() => { if (timer) clearTimeout(timer); });

    function finishQueue() {
        const q2 = loadQueue();
        q2.shift();
        saveQueue(q2);
        setTimeout(() => { flushing = false; flushQueue(); }, 100);
    }
}

// 页面加载时自动补传上次没传出去的
if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("load", () => setTimeout(flushQueue, 800));
}

// ===== 右上角轻提示(不阻塞游戏) =====
function showToast(msg, ms) {
    ms = ms || 2600;
    let box = document.getElementById("rToast");
    if (!box) {
        box = document.createElement("div");
        box.id = "rToast";
        box.style.cssText =
            "position:fixed;top:12px;right:12px;z-index:99999;max-width:70vw;" +
            "background:rgba(0,0,0,0.82);color:#fff;padding:10px 14px;border-radius:10px;" +
            "font-size:15px;line-height:1.4;box-shadow:0 4px 14px rgba(0,0,0,0.3);" +
            "transition:opacity .25s;pointer-events:none;font-family:Arial,sans-serif;";
        document.body.appendChild(box);
    }
    box.textContent = msg;
    box.style.opacity = "1";
    clearTimeout(box._t);
    box._t = setTimeout(() => { box.style.opacity = "0"; }, ms);
}
