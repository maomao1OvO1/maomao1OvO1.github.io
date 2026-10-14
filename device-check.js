/*
 * 文件：device-check.js —— 移动端适配检测 v19（页面加载早期执行）
 * 功能：在页面渲染前检查访客设备，做「移动端适配提示」。
 *   ⚠️ v19（2026-10-15）：**闸门已关闭，所有设备一律放行**。
 *      原因：本站这一轮把电脑端 + 手机端适配做完了（响应式断点、首页悬浮层回流、
 *      棋盘类游戏不再溢出），"因未适配而劝退"的前提消失。
 *      整套判定与放行机制原样保留（含 device-blocked.html 等提示页），恢复方法见下面第 3 节。
 *   v18 及以前的行为：匹配以下设备会跳转到提示页 /device-blocked.html（独占窗口）：
 *     a) 系统标识包含 HarmonyOS / Harmony / OpenHarmony / Huawei；
 *     b) UA 为 Macintosh 且不含 iPhone/iPad 字样（即桌面 Mac）；
 *     c) UA 含 iPhone / iPad / iPod 字样（苹果手机/平板）。
 *   其余设备（安卓/Windows/Linux/BSD/Chrome OS 等）一直正常运行。
 * 定位：源文件（**不要直接改 gate.js**，那是生成物）；改完按 gate.js 头部那行命令重新合并。
 * 说明：纯 ES5 语法 + 零外部依赖。
 * v15：document.write 整页替换 → location.replace 跳独立页。
 * v17：华为/苹果统一「弹一次就放行」（sessionStorage 标记）。
 * v18 变更（2026-08-30，用户反馈「还是进不去」——怀疑旧缓存/sessionStorage 不稳定）：
 *   三重保险放行判定：
 *     1) localStorage 持久标记 mm_dc_pass（点「继续访问」时写入，跨刷新/跨重开浏览器都有效）；
 *     2) 兼容旧 sessionStorage 标记 mm_dc_seen / mm_dc_continue（v16/v17 遗留）；
 *     3) URL 带 dc_ok=1（「继续访问」按钮跳转时携带的一次性凭证）→ 立即放行并补齐持久标记。
 * v19 变更（2026-10-15，毛毛要求「适配电脑端和手机端」）：判定闸门关闭 → 不再跳转。
 */
(function () {
    "use strict";

    /* ── 0. 存储与凭证检查 ── */
    var LS = window.localStorage || { getItem: function () { return null; }, setItem: function () {} };
    var SS = window.sessionStorage || { getItem: function () { return null; }, setItem: function () {} };
    var DC_OK = /(^|[?&])dc_ok=1($|&)/.test(location.search || ""); // 按钮跳转带来的一次性凭证

    /* ── 1. 读取 UA（User-Agent，浏览器上报的设备/系统特征字符串，只读不写） ── */
    var ua = navigator.userAgent || "";

    /* ── 2. 未适配设备判定 ──
       2026-10-15 起本判定**恒为 false** —— 本站已经把电脑端和手机端适配做完了
       （响应式断点、首页悬浮层回流、棋盘类游戏不再横向溢出，见 responsive.css 第二轮补丁），
       原来「因未适配而劝退苹果 / 华为 / Mac 用户」的前提已经不存在了。

       ⚠️ 下面三个特征判定的变量**故意保留**（虽然不再参与判断）：
          ① 它们记录了这套门禁的完整逻辑，将来要重新开闸时有据可依；
          ② 删掉它们就得连注释一起删，恢复时反而容易漏。
       ⇒ 要恢复拦截：把下面那行 `var notAdapted = false;` 换成
          `var notAdapted = isHmHw || isMacPure || isApple;` 即可，其它一个字都不用动
          （device-blocked.html / why-blocked*.html 三个提示页也都还在仓库里）。 */
    // a) 系统标识含 HarmonyOS/Harmony/OpenHarmony/Huawei（不区分大小写）
    var isHmHw = /HarmonyOS|Harmony|OpenHarmony|Huawei/i.test(ua);
    // b) Macintosh 且不含 iPhone/iPad 字样 = 桌面 Mac（Mac 电脑 UA 特征）
    var isMacPure = /Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua);
    // c) iPhone / iPad / iPod 字样 = 苹果手机/平板（常规 UA）
    var isApple = /iPhone|iPad|iPod/i.test(ua);
    // 闸门（2026-10-15 关闸：适配完成，所有设备一律放行）
    var notAdapted = false;

    /* ── 3. 未适配拦截（华为/苹果统一：弹一次提示后放行，可正常进站） ── */
    if (notAdapted) {
        // 三重保险放行判定：localStorage 持久标记 / 旧 sessionStorage 标记 / URL 一次性凭证
        try {
            var pass = LS.getItem("mm_dc_pass") === "1" ||
                       SS.getItem("mm_dc_seen") === "1" ||
                       SS.getItem("mm_dc_continue") === "1" ||
                       DC_OK;
            if (pass) {
                // 补齐持久标记（含 URL 凭证首次进入）：以后刷新/重开都不再拦
                try { LS.setItem("mm_dc_pass", "1"); } catch (e2) {}
                return;
            }
        } catch (e) {}
        // 首次访问：记「已提示过」并跳提示页（本次弹一次，下次起放行）
        try { SS.setItem("mm_dc_seen", "1"); } catch (e) {}
        var type = isHmHw ? "hw" : (isMacPure ? "mac" : "apple");
        try { window.location.replace("/device-blocked.html?type=" + type); } catch (e) {}
    }
    /* 适配设备：什么都不做，正常继续渲染页面 */
})();
