/*
 * 文件：device-check.js —— 移动端适配检测 v17（页面加载早期执行）
 * 功能：在页面渲染前检查访客设备，做「移动端适配提示」。
 *   匹配以下情况的设备会跳转到独立的提示页 /device-blocked.html（独占窗口，不与内容堆叠）：
 *     a) 系统标识包含 HarmonyOS / Harmony / OpenHarmony / Huawei；
 *     b) UA 为 Macintosh 且不含 iPhone/iPad 字样（即桌面 Mac）；
 *     c) UA 含 iPhone / iPad / iPod 字样（苹果手机/平板）。
 *   其余设备（安卓/Windows/Linux/BSD/Chrome OS 等）正常运行网站。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js?v=17"></script>）。
 * 说明：纯 ES5 语法 + 零外部依赖。
 * v15 变更：document.write 整页替换 → location.replace 跳独立页 /device-blocked.html?type=…
 * v16 变更：苹果「弹一次就放行」（mm_dc_seen 自动标记 / mm_dc_continue 按钮标记）。
 * v17 变更（2026-08-30，用户澄清「华为每次都弹是问题，华为也要能进去」）：
 *   华为/鸿蒙与苹果一致对待——首访弹一次提示（写 mm_dc_seen），本会话内再访问（含刷新）
 *   直接放行；点「继续访问」（写 mm_dc_continue）同样放行。华为说明页「继续访问」按钮恢复。
 */
(function () {
    "use strict";

    /* ── 0. 放行标记（华为/苹果通用：name 设备都可「弹一次后进入」） ── */
    var DC_SS = window.sessionStorage || { getItem: function () { return null; }, setItem: function () {} };

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
        // 有放行标记（首访自动 seen 或用户点过「继续访问」continue）→ 放行，正常进站
        try {
            var seen = DC_SS.getItem("mm_dc_seen") || DC_SS.getItem("mm_dc_continue");
            if (seen === "1") return;                       // 已提示过本会话 → 直接放行
            DC_SS.setItem("mm_dc_seen", "1");               // 首次：记下「已弹过提示」，下次起放行
        } catch (e) {}
        var type = isHmHw ? "hw" : (isMacPure ? "mac" : "apple");
        try { window.location.replace("/device-blocked.html?type=" + type); } catch (e) {}
    }
    /* 适配设备：什么都不做，正常继续渲染页面 */
})();
