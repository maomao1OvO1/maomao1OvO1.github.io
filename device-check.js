/*
 * 文件：device-check.js —— 移动端适配检测 v16（页面加载早期执行）
 * 功能：在页面渲染前检查访客设备，做「移动端适配提示」。
 *   匹配以下情况的设备会跳转到独立的提示页 /device-blocked.html（独占窗口，不与内容堆叠）：
 *     a) 系统标识包含 HarmonyOS / Harmony / OpenHarmony / Huawei；
 *     b) UA 为 Macintosh 且不含 iPhone/iPad 字样（即桌面 Mac）；
 *     c) UA 含 iPhone / iPad / iPod 字样（苹果手机/平板）。
 *   其余设备（安卓/Windows/Linux/BSD/Chrome OS 等）正常运行网站。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js?v=16"></script>）。
 * 说明：纯 ES5 语法 + 零外部依赖。
 * v15 变更（2026-08-30）：原 v14 用 document.write 整页替换提示，实测移动端会写成「插入页面流」的
 *   卡片堆叠（用户截图确认）——改为 location.replace 跳转独立页 /device-blocked.html?type=…，
 *   文案按 type 分流（hw=华为/鸿蒙、mac=桌面 Mac、apple=iPhone/iPad），与 v14 体验一致。
 * v16 变更（2026-08-30，用户明确要求「华为每次都弹、苹果弹一次就行」）：
 *   - 华为/鸿蒙：每次访问都拦截（含刷新），不写任何放行标记——永远进不去；
 *   - 苹果（iPhone/iPad/桌面 Mac）：首访弹一次提示并记 mm_dc_seen 标记，本会话内再访问（含刷新）直接放行；
 *   - 苹果用户点过提示页/说明页的「继续访问」按钮（写 mm_dc_continue）同样放行。
 *   - 华为说明页 why-blocked.html 的「继续访问」按钮已移除（原按钮无意义且造成死循环抱怨）。
 */
(function () {
    "use strict";

    /* ── 0. 会话内放行标记（仅苹果生效；华为永不读它） ── */
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

    /* ── 3. 未适配拦截（用户要求：华为每次都弹；苹果弹一次就行） ── */
    if (notAdapted) {
        // a) 华为 / 鸿蒙：永远拦截。不读任何放行标记，每次刷新都重新弹（品牌策略，铁律不可绕）。
        if (isHmHw) {
            try { window.location.replace("/device-blocked.html?type=hw"); } catch (e) {}
            return;
        }
        // b) 苹果（iPhone/iPad/桌面 Mac）：「弹一次就行」——有标记（自动 seen 或点按钮 continue）→ 放行
        try {
            var seen = DC_SS.getItem("mm_dc_seen") || DC_SS.getItem("mm_dc_continue");
            if (seen === "1") return;                       // 已提示过本会话 → 直接放行
            DC_SS.setItem("mm_dc_seen", "1");               // 首次：记下「已弹过提示」，下次起放行
        } catch (e) {}
        var type = isMacPure ? "mac" : "apple";
        try { window.location.replace("/device-blocked.html?type=" + type); } catch (e) {}
    }
    /* 适配设备：什么都不做，正常继续渲染页面 */
})();
