// report.js v3 —— 小游戏排行榜上报（Firestore 云数据库直连版）
// 游戏结束时调用 reportScore(游戏id, 分数)；玩家名取网站里存的昵称(playerName)
// v3 改动：
//   - 弃用 Render 服务器，成绩直接写入 Google Firestore（免费云数据库，永久存储，无冷启动）
//   - 文档 ID = 游戏_名字（如 snake_毛毛），同名玩家自动覆盖为最新成绩
//   - 保留 v2 的：失败自动重试 + 待传队列(localStorage 补传) + 15s 超时
//   - 排行榜页 games/ranking.html 也直读 Firestore，两边一致

const FS_BASE = "https://firestore.googleapis.com/v1/projects/maomao-3c9ef/databases/(default)/documents";
const FS_KEY = "AIzaSyCa7M7dFqDlilAtniesykU97PWb--S_EX8";
const PENDING_KEY = "reportPending";   // 待传队列 {game,score,name,ts,fail}
const MAX_RETRY = 3;
const RETRY_DELAY = 3000;
const REQ_TIMEOUT = 15000;

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

// 文档 ID: 游戏_名字(REST 路径须 URL 编码)
// 文档 ID: 游戏UTF8hex + "_" + 名字UTF8hex, 纯 ASCII 安全 ID
// 例: snake__毛毛 → snake__e6af9be6af9b (毛毛=UTF8字节 e6af9b e6af9b)
// Firestore REST 创建必须用 ?documentId= query 参数(路径方式 /scores/{id} 不被识别)
function docId(item) {
    const hex = (s) => {
        const bytes = new TextEncoder().encode(s);
        let h = "";
        bytes.forEach(b => h += b.toString(16).padStart(2, "0"));
        return h;
    };
    return hex(item.game) + "_" + hex(item.name);
}

// 覆盖写入(create 或 replace overwrite); 数字用字符串 integerValue
function buildDoc(item) {
    return {
        fields: {
            game:  { stringValue: item.game },
            name:  { stringValue: item.name },
            score: { integerValue: String(item.score) },
            ts:    { integerValue: String(item.ts) }
        }
    };
}

// ===== 尝试发送队首(一次只发一条) =====
let flushing = false;
function flushQueue() {
    if (flushing) return;
    const q = loadQueue();
    if (q.length === 0) return;
    const head = q[0];
    if ((head.fail || 0) >= MAX_RETRY) return;
    flushing = true;
    const item = head;

    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), REQ_TIMEOUT) : null;

    // Firestore REST: 创建用 ?documentId= ; 存在(409)则 PATCH /scores/{id} 覆盖字段
    const id = docId(item);
    const url = FS_BASE + "/scores?documentId=" + id + "&key=" + FS_KEY;
    const body = buildDoc(item);

    const doWrite = () => fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
        signal: ctrl ? ctrl.signal : undefined
    }).then(r => {
        if (r.status === 200 || r.status === 201) return { ok: true };
        // 已存在(409) → 用 PATCH 覆盖(score/ts)
        if (r.status === 409) {
            const patchUrl = FS_BASE + "/scores/" + id + "?key=" + FS_KEY +
                "&updateMask.fieldPaths=score&updateMask.fieldPaths=ts";
            const patchBody = { fields: { score: { integerValue: String(item.score) }, ts: { integerValue: String(item.ts) } } };
            return fetch(patchUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patchBody),
                keepalive: true,
                signal: ctrl ? ctrl.signal : undefined
            }).then(p => ({ ok: p.status === 200 }));
        }
        return { ok: false, status: r.status };
    });

    doWrite()
    .then(d => {
        if (d.ok) {
            console.log("[排行榜] 成绩已上传 Firestore:", d);
            finishQueue();
        } else {
            console.log("[排行榜] 该成绩不会被记录:", d);
            finishQueue();
        }
    })
    .catch(e => {
        item.fail = (item.fail || 0) + 1;
        q[0].fail = item.fail;
        saveQueue(q);
        console.log("[排行榜] 上传失败(" + item.fail + "/" + MAX_RETRY + "):", e.message);
        if (item.fail < MAX_RETRY) {
            setTimeout(() => { flushing = false; flushQueue(); }, RETRY_DELAY);
        } else {
            console.log("[排行榜] 网络重试已尽, 成绩保留本地, 下次打开页面再试");
            showToast("⚠️ 成绩上传失败，稍后自动重试");
            setTimeout(() => { flushing = false; flushQueue(); }, 500);
        }
    })
    .finally(() => { if (timer) clearTimeout(timer); });

    function finishQueue() {
        const q2 = loadQueue();
        q2.shift();
        saveQueue(q2);
        setTimeout(() => { flushing = false; flushQueue(); }, 100);
    }
}

// 页面加载时自动补传上次没传出去的(同时清零上次的重试计数)
if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("load", () => {
        const q = loadQueue();
        q.forEach(it => { it.fail = 0; });
        saveQueue(q);
        setTimeout(flushQueue, 800);
    });
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
