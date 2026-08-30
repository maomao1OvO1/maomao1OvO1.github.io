/*
 * 文件：device-check.js —— 移动端适配检测 v18（页面加载早期执行）
 * 功能：在页面渲染前检查访客设备，做「移动端适配提示」。
 *   匹配以下情况的设备会跳转到独立的提示页 /device-blocked.html（独占窗口，不与内容堆叠）：
 *     a) 系统标识包含 HarmonyOS / Harmony / OpenHarmony / Huawei；
 *     b) UA 为 Macintosh 且不含 iPhone/iPad 字样（即桌面 Mac）；
 *     c) UA 含 iPhone / iPad / iPod 字样（苹果手机/平板）。
 *   其余设备（安卓/Windows/Linux/BSD/Chrome OS 等）正常运行网站。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js?v=18"></script>）。
 * 说明：纯 ES5 语法 + 零外部依赖。
 * v15：document.write 整页替换 → location.replace 跳独立页。
 * v17：华为/苹果统一「弹一次就放行」（sessionStorage 标记）。
 * v18 变更（2026-08-30，用户反馈「还是进不去」——怀疑旧缓存/sessionStorage 不稳定）：
 *   三重保险放行判定：
 *     1) localStorage 持久标记 mm_dc_pass（点「继续访问」时写入，跨刷新/跨重开浏览器都有效）；
 *     2) 兼容旧 sessionStorage 标记 mm_dc_seen / mm_dc_continue（v16/v17 遗留）；
 *     3) URL 带 dc_ok=1（「继续访问」按钮跳转时携带的一次性凭证）→ 立即放行并补齐持久标记。
 */
(function () {
    "use strict";

    /* ── 0. 存储与凭证检查 ── */
    var LS = window.localStorage || { getItem: function () { return null; }, setItem: function () {} };
    var SS = window.sessionStorage || { getItem: function () { return null; }, setItem: function () {} };
    var DC_OK = /(^|[?&])dc_ok=1($|&)/.test(location.search || ""); // 按钮跳转带来的一次性凭证

    /* ── 1. 读取 UA（User-Agent，浏览器上报的设备/系统特征字符串，只读不写） ── */
    var ua = navigator.userAgent || "";

    /* ── 2. 未适配设备判定 ── */
    // a) 系统标识含 HarmonyOS/Harmony/OpenHarmony/Huawei（不区分大小写）
    var isHmHw = /HarmonyOS|Harmony|OpenHarmony|Huawei/i.test(ua);
    // b) Macintosh 且不含 iPhone/iPad 字样 = 桌面 Mac（Mac 电脑 UA 特征）
    var isMacPure = /Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua);
    // c) iPhone / iPad / iPod 字样 = 苹果手机/平板（常规 UA）
    var isApple = /iPhone|iPad|iPod/i.test(ua);
    // 未适配 = 三者任一命中；安卓（不含上述字样）/Windows/其他设备自然放行
    var notAdapted = isHmHw || isMacPure || isApple;

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
