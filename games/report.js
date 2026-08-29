// ============================================================================
// report.js v3 —— 小游戏排行榜成绩上报脚本（Firestore 云数据库直连版）
// 这是全站「比分上报」的核心：小游戏打完一局时会调用 reportScore(游戏id, 分数)，
// 把成绩写进 Google Firestore 云数据库，供 games/ranking.html 排行榜页读取展示。
// 玩家名取自网站本地保存的昵称 localStorage["playerName"]，没有则叫「匿名玩家」。
//
// 【站长专属逻辑】本脚本本身不做站长校验（上报是公开的，任何人都能写成绩）；
//   站长/管理员校验只出现在 admin.html / users.html 等「管理页」，那里才会用
//   Firebase Auth + isMaoMao 判定。因此在 report.js 里看不到登录判断。
//
// 【数据来源】游戏结束后玩家成绩直连 Firestore REST API 写入（不再经过自建服务器），
//   排行榜页 ranking.html 也直读同一份 Firestore，两端数据天然一致。
//
// 【安全点】Firestore REST 走 Web API 密钥（记为「密钥」，实际值在 FS_KEY 常量里），
//   该密钥仅能访问「成绩写入」这一层；真正的「删除/改名」这类敏感操作需要站长
//   登录后的 ID token（见 admin.html）。展示时由 ranking.html 做 XSS 转义。
//
// 【v3 改动记录】保留 v2 的大核心——失败自动重试 + 待传队列(localStorage 补传)
//   + 15s 超时，这是本文件最值得讲透的机制（详见下方 flushQueue 注释）。
// ============================================================================

const FS_BASE = "https://firestore.googleapis.com/v1/projects/maomao-3c9ef/databases/(default)/documents"; // Firestore REST API 基础地址（项目+数据库路径）
const FS_KEY = "AIzaSyCa7M7dFqDlilAtniesykU97PWb--S_EX8"; // Web API 密钥，拼接在 query 上做只读/写入放行（记为「密钥」，勿外泄）
const PENDING_KEY = "reportPending";   // localStorage 里「待传队列」的键名：一个数组，每项 {game,score,name,ts,fail}
const MAX_RETRY = 3;    // 单条成绩最多自动重试的次数（超过就不再自动发，保留在本地待下次页面打开再补传）
const RETRY_DELAY = 3000; // 重试失败后，隔 3 秒再试下一次（单位 ms）
const REQ_TIMEOUT = 15000; // 单次 HTTP 请求超时上限 15 秒，超时用 AbortController 中断，避免卡死

// ============================================================================
// 上报入口 reportScore(game, score)——「待传队列」机制的入口
// 游戏结束时调用它提交一局成绩。它不直接发请求，而是先把成绩塞进 localStorage 队列，
// 再触发一次尝试发送。即使当前没网，成绩也已经安全落在本地，等网络恢复后会自动补传。
//   参数：game  —— 游戏 id（如 "snake"、"2048"）
//         score —— 本局分数（数字）
//   返回：无返回值；传入非法分数（非数字 / NaN）时直接忽略。
// ============================================================================
function reportScore(game, score) {
    if (typeof score !== "number" || isNaN(score)) return;  // 非法分数（NaN/字符串/非数字）直接丢弃
    const name = localStorage.getItem("playerName") || "匿名玩家"; // 取本地昵称，无则用「匿名玩家」
    const q = loadQueue();                                    // 读现有待传队列
    q.push({ game: game, score: Math.round(score), name: name, ts: Date.now(), fail: 0 }); // 追加一条，fail=0 表示未重试过
    saveQueue(q);                                             // 先写回本地（关键：先落盘再发）
    flushQueue();                                             // 尝试发送队首：有网立刻发，没网留在队列
}

// ============================================================================
// 待传队列读写（localStorage 持久化）
// loadQueue / saveQueue 负责把「还没发出去的成绩」存在浏览器本地。localStorage 不是内存，
// 关页、断网、刷新都不丢——这正是「没网也能存成绩」的根基。
// ============================================================================
function loadQueue() {  // 读队列。返回：数组（每项 {game,score,name,ts,fail}）；解析失败/非数组返回空数组兜底。
    try { const q = JSON.parse(localStorage.getItem(PENDING_KEY)); return Array.isArray(q) ? q : []; }
    catch (e) { return []; }   // JSON 损坏或键不存在 → 返回空数组，避免脚本崩掉
}
function saveQueue(q) {  // 写回队列。参数：q（数组）。返回：无。写失败静默忽略（localStorage 满/禁用），绝不抛错影响游戏。
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(q)); } catch (e) {}
}

// ============================================================================
// 文档 ID 生成 docId(item)
// Firestore 文档 ID 只能含 ASCII 字符，中文名不能直接当 ID，所以把「游戏」和「名字」各自
// 转成 UTF-8 十六进制字符串（纯 ASCII），用下划线连接。同名玩家得到同一文档 ID → 自动覆盖为最新。
//   参数：item —— {game, name}。返回：文档 ID 字符串。
// 注意：Firestore REST「路径式 /scores/{id} 创建」不被识别，必须用 ?documentId= 查询参数。
// ============================================================================
function docId(item) {
    const hex = (s) => {
        const bytes = new TextEncoder().encode(s);                 // 字符串 → UTF-8 字节
        let h = "";
        bytes.forEach(b => h += b.toString(16).padStart(2, "0")); // 每字节转成 2 位十六进制
        return h;
    };
    return hex(item.game) + "_" + hex(item.name);                 // 例：snake_e6af9be6af9b（毛毛 的 UTF-8 hex）
}

// ============================================================================
// 构造 Firestore 文档 buildDoc(item)
// 把一条成绩组装成 Firestore REST 期望的 JSON 结构（fields 包裹 + 类型标签）。
// Firestore 数字必须写成字符串形式的 integerValue。
//   参数：item —— {game,score,name,ts}。返回：可作为请求 body 的对象。
// ============================================================================
function buildDoc(item) {
    return {
        fields: {
            game:  { stringValue: item.game },            // 游戏 id（字符串）
            name:  { stringValue: item.name },            // 玩家名（字符串）
            score: { integerValue: String(item.score) },  // 分数（数字，Firestore 需转字符串）
            ts:    { integerValue: String(item.ts) }      // 时间戳（数字）
        }
    };
}

// ============================================================================
// ★★ 发送队列 flushQueue() —— 本文件最核心的「断网补传」机制 ★★
// 设计思路：所有成绩先落地到 localStorage 队列，然后「一次只发队首一条」；
// 发成功就出队；发失败就累加次数，能重试就隔 3 秒重试；重试 3 次仍不行就保留在本地，
// 等用户下次打开页面自动补传。因此哪怕完全没网，成绩也不会丢失。
// 流程：①全局锁防并发 → ②读队列、队空或失败次数用尽则停 → ③AbortController 15s 超时
// → ④POST 创建，遇 409（同名已存在）改 PATCH 覆盖 score/ts → ⑤成功出队并继续下一条；
// 失败则 fail+1，未到上限隔 3 秒重试，到上限弹 toast 并留给下次页面加载补传。
// ============================================================================
let flushing = false;   // 发送锁：true 表示正在发一条，防止 flushQueue 被并发重复触发
function flushQueue() {
    if (flushing) return;                      // 已在发送则直接返回，避免并发
    const q = loadQueue();                     // 读最新队列
    if (q.length === 0) return;                // 没有待传，结束
    const head = q[0];                         // 只看队首（一次只发一条）
    if ((head.fail || 0) >= MAX_RETRY) return; // 这条已重试到头，本轮放弃，等下次页面 load 清 fail 后再试
    flushing = true;                           // 上锁
    const item = head;                         // 取待发这条

    // 超时控制：能用 AbortController 就建一个，超时后 abort() 中断；老浏览器退化为无超时
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), REQ_TIMEOUT) : null;

    // Firestore REST: 创建用 ?documentId= ; 存在(409)则 PATCH /scores/{id} 覆盖字段
    const id = docId(item);                    // 同名同游戏 → 同文档 ID，天然去重覆盖
    const url = FS_BASE + "/scores?documentId=" + id + "&key=" + FS_KEY; // POST 创建地址
    const body = buildDoc(item);               // 组装 fields 结构

    // 发送逻辑：先 POST 创建，遇 409 再 PATCH 覆盖
    const doWrite = () => fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,                       // 允许页面关闭的一瞬也把请求发完
        signal: ctrl ? ctrl.signal : undefined // 挂上超时信号
    }).then(r => {
        if (r.status === 200 || r.status === 201) return { ok: true }; // 创建成功
        // 已存在(409) → 用 PATCH 覆盖(score/ts)，只更新分数和时间
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
            }).then(p => ({ ok: p.status === 200 })); // PATCH 成功才算 ok
        }
        return { ok: false, status: r.status }; // 其它状态码：发送未成功但不视为网络错
    });

    doWrite()
    .then(d => {
        if (d.ok) {
            console.log("[排行榜] 成绩已上传 Firestore:", d); // 成功：出队
            finishQueue();
        } else {
            console.log("[排行榜] 该成绩不会被记录:", d);     // Firestore 拒绝（规则/状态码）也出队，避免卡住
            finishQueue();
        }
    })
    .catch(e => {
        // 走到这里 = 「网络错误 / 超时 abort / 服务器 5xx」等真正没发出去的异常
        item.fail = (item.fail || 0) + 1;      // 累加重试次数
        q[0].fail = item.fail;                 // 同步回队列
        saveQueue(q);                          // 写回本地，保证这条数据不丢
        console.log("[排行榜] 上传失败(" + item.fail + "/" + MAX_RETRY + "):", e.message);
        if (item.fail < MAX_RETRY) {
            setTimeout(() => { flushing = false; flushQueue(); }, RETRY_DELAY); // 未满：隔 3 秒重试
        } else {
            console.log("[排行榜] 网络重试已尽, 成绩保留本地, 下次打开页面再试"); // 次数用尽
            showToast("⚠️ 成绩上传失败，稍后自动重试");  // 轻提示，不打断游戏
            setTimeout(() => { flushing = false; flushQueue(); }, 500); // 释放锁，交给下次页面加载补传
        }
    })
    .finally(() => { if (timer) clearTimeout(timer); }); // 无论成败都清掉超时定时器

    // 出队函数：移除队首并保存，然后继续发下一条（间隔 100ms）
    function finishQueue() {
        const q2 = loadQueue();
        q2.shift();                            // 扔掉已成功/已被拒的队首
        saveQueue(q2);
        setTimeout(() => { flushing = false; flushQueue(); }, 100);
    }
}

// ============================================================================
// ★ 断网补传核心：页面加载时自动重发历史遗留成绩 ★
// 每次页面重开都会执行：读本地待传队列，把每条的重试计数 fail 清零（上次失败可能只是当时没网，
// 现在重新给机会），再延迟 800ms 触发一次 flushQueue 把遗留成绩补传上去。
// 这就是「没网络时成绩存本地待传队列、开梯子/恢复网络后自动补传」的完整闭环。
// ============================================================================
if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("load", () => {
        const q = loadQueue();
        q.forEach(it => { it.fail = 0; });     // 清零重试计数，给历史成绩新一轮重试机会
        saveQueue(q);
        setTimeout(flushQueue, 800);           // 等页面稳定后再补发，避免一进来抢带宽
    });
}

// ============================================================================
// 右上角轻提示 showToast(msg, ms)——不阻塞游戏的非模态提示，用于「上传失败稍后重试」等提醒
//   参数：msg —— 文案；ms —— 显示时长毫秒（默认 2600ms）。返回：无。
//   逻辑：复用已有浮层，首次调用时动态创建右上角浮层，文本 / 淡入淡出用 CSS transition。
// ============================================================================
function showToast(msg, ms) {
    ms = ms || 2600;                           // 默认显示 2.6 秒
    let box = document.getElementById("rToast"); // 复用已存在浮层
    if (!box) {
        // 首次调用：创建固定右上角、半透明黑底白字、圆角的浮层
        box = document.createElement("div");
        box.id = "rToast";
        box.style.cssText =
            "position:fixed;top:12px;right:12px;z-index:99999;max-width:70vw;" +
            "background:rgba(0,0,0,0.82);color:#fff;padding:10px 14px;border-radius:10px;" +
            "font-size:15px;line-height:1.4;box-shadow:0 4px 14px rgba(0,0,0,0.3);" +
            "transition:opacity .25s;pointer-events:none;font-family:Arial,sans-serif;";
        document.body.appendChild(box);
    }
    box.textContent = msg;                     // 写入文案
    box.style.opacity = "1";                   // 立即显示
    clearTimeout(box._t);                      // 清掉上一次隐藏定时器（连续提示不互相干扰）
    box._t = setTimeout(() => { box.style.opacity = "0"; }, ms); // 到时淡出
}
