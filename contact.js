/*
 * 文件：contact.js —— 联系方式留言箱（Firestore 直连，与排行榜同款架构）
 * 设计（2026-08-30 站长要求：邮箱全下线，用「国内不可达」服务规避风险）：
 *   - 前端源码零邮箱（明文/密文/密钥全部移除）；
 *   - 留言写入 Firestore（Google 直连：国内无梯子环境写不进去 = 天然筛选，与排行榜/登录行为一致）；
 *   - 需登录后留言（登录本身需要 Google 可达，双重筛选）；
 *   - 防滥用：蜜罐字段（机器人必填，填了静默失败）+ 本地 5 分钟限频 + 昵称/留言长度限制；
 *   - 失败自动入本地队列，下次打开页面自动补发（与排行榜「失败成绩待传队列」同款）。
 */
(function () {
    "use strict";

    var API_BASE = "https://maomao-admin-api.onrender.com";   // 留言收发走官方后台 API（服务端 Admin SDK 连 Firestore，前端不再直连 Google）
    var KEY_QUEUE = "mm_contact_queue";   // 本地待发队列
    var KEY_LIMIT = "mm_contact_last";    // 上次发送时间戳（限频用）
    var LIMIT_MS = 5 * 60 * 1000;         // 5 分钟 1 条

    function getQueue() {
        try { return JSON.parse(localStorage.getItem(KEY_QUEUE) || "[]"); } catch (e) { return []; }
    }
    function saveQueue(q) {
        try { localStorage.setItem(KEY_QUEUE, JSON.stringify(q)); } catch (e) {}
    }

    /* ── 打开/关闭弹窗 ── */
    function openContact() {
        var box = document.getElementById("contactBox");
        if (!box) return;
        // 需登录：登录本身要能访问 Google（国外/挂梯子用户），符合站长「国内不可达」筛选意图
        if (!window.firebase || !firebase.auth || !firebase.auth().currentUser) {
            alert("请先登录后再留言（登录需访问 Google 服务）。");
            return;
        }
        box.style.display = "flex";
    }
    function closeContact() {
        var box = document.getElementById("contactBox");
        if (box) box.style.display = "none";
    }

    /* ── 发送一条留言（含校验/蜜罐/限频） ── */
    function subContact() {
        var honey = document.getElementById("contactHoney");
        if (honey && honey.value) { closeContact(); return; }   // 蜜罐命中 → 静默失败（不提示机器人）
        var name = (document.getElementById("contactName") || {}).value || "";
        var text = (document.getElementById("contactText") || {}).value || "";
        name = String(name).trim().slice(0, 20);
        text = String(text).trim().slice(0, 500);
        if (!name || !text) { alert("请填写昵称和留言内容"); return; }
        var now = Date.now();
        var last = parseInt(localStorage.getItem(KEY_LIMIT) || "0", 10) || 0;
        if (now - last < LIMIT_MS) { alert("留言太频繁啦，请 5 分钟后再试；或者点“取消”先逛逛 😊"); return; }
        localStorage.setItem(KEY_LIMIT, String(now));

        var fields = {
            name: { stringValue: name },
            text: { stringValue: text },
            ts:   { timestampValue: new Date().toISOString() }
        };
        var cu = (window.firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
        if (!cu) { alert("登录状态已失效，请重新登录后再留言"); return; }
        cu.getIdToken().then(function (tk) {
            return fetch(API_BASE + "/api/feedback/send", {
                method: "POST",
                headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" },
                body: JSON.stringify({ name: name, text: text })
            });
        }).then(function (r) {
            if (r.status === 401) { throw new Error("auth_fail"); }
            if (!r.ok) throw new Error("http_" + r.status);
            return r.json();
        }).then(function () {
            alert("✅ 留言已发送，站长后台可见。");
            closeContact();
        }).catch(function (e) {
            if (e && e.message === "auth_fail") { alert("登录已过期，请重新登录后再留言"); return; }
            var q = getQueue();
            q.push({ name: name, text: text, ts: new Date().toISOString() });
            saveQueue(q);
            alert("⚠️ 暂时连不上留言服务（网络波动），已存本机，下次打开页面会自动补发。");
            closeContact();
        });
    }

    /* ── 自动补发本地队列（页面加载时尝试，经后台 API） ── */
    function flushQueue() {
        var q = getQueue();
        if (!q.length) return;
        var cu2 = (window.firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
        if (!cu2) return;
        cu2.getIdToken().then(function (tk) {
            return fetch(API_BASE + "/api/feedback/send", {
                method: "POST",
                headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" },
                body: JSON.stringify({ name: q[0].name, text: q[0].text })
            });
        }).then(function (r) { if (!r.ok) throw new Error("http_" + r.status); return r.json(); })
        .then(function () {
            q.shift();
            saveQueue(q);
            if (q.length) flushQueue();
        }).catch(function () { /* 连不上就下次再试 */ });
    }

    document.addEventListener("DOMContentLoaded", flushQueue);

    // 暴露到全局（index.html 按钮 onclick 使用）
    window.openContact = openContact;
    window.closeContact = closeContact;
    window.subContact = subContact;
})();


/* ===================== 站长留言箱（首页直接查看，仅站长可读） ===================== */
function toggleMailBox() {
    var box = document.getElementById("mailBox");
    if (!box) return;
    box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
    if (box.style.display === "block") loadMailbox();
}
function loadMailbox() {
    var box = document.getElementById("mailList");
    if (!box) return;
    box.textContent = "加载中…";
    var cur = (window.firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
    if (!cur) { box.textContent = "请先登录站长账号（仅站长可看留言）"; return; }
    cur.getIdToken().then(function (tk) {
        return fetch(API_BASE + "/api/feedback/list", {
            method: "POST",
            headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" },
            body: "{}"
        });
    }).then(function (r) {
        if (r.status === 403) { throw new Error("forbidden"); }
        if (!r.ok) throw new Error("http_" + r.status);
        return r.json();
    }).then(function (d) {
        var docs = (d.messages || []).map(function (m) {
            return { id: m.id, name: m.name || "(匿名)", text: m.text || "", ts: m.ts || "" };
        });
        box.textContent = "";
        if (!docs.length) { box.textContent = "暂无留言"; return; }
        docs.forEach(function (m) {
            var div = document.createElement("div");
            div.style.cssText = "border:1px solid #334155;border-radius:8px;padding:8px 10px;margin-bottom:8px;";
            var b = document.createElement("b"); b.textContent = m.name;
            var sm = document.createElement("small"); sm.textContent = "  " + m.ts; sm.style.color = "#94a3b8";
            var p = document.createElement("div"); p.textContent = m.text; p.style.marginTop = "4px";
            div.appendChild(b); div.appendChild(sm); div.appendChild(p);
            box.appendChild(div);
        });
    }).catch(function (e) {
        box.textContent = (e && e.message === "forbidden")
            ? "仅站长可读（当前登录账号不是站长邮箱）"
            : "读取失败：网络异常或后台服务未就绪（请稍后再试）";
    });
}
window.toggleMailBox = toggleMailBox;
window.loadMailbox = loadMailbox;
