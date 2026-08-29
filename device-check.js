/*
 * 文件：device-check.js —— 设备系统检测（站点门禁）
 * 功能：在页面加载最早期检测访客设备系统。
 *   1. Windows/安卓/其他系统 → 什么都不做，网站正常打开；
 *   2. 检测到「鸿蒙系统（HarmonyOS / OpenHarmony）」或「苹果系统（iPhone / iPad / iPod / iPadOS）」→
 *      立即用 document.write 整页替换为「设备限制提示页」（不进入网站任何内容）。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js"></script>），
 *       保证在任何内容渲染之前就完成拦截，鸿蒙/iOS 用户不会看到页面资源。
 * 说明：纯 ES5 语法 + 零外部依赖，老浏览器/系统也能执行；本文件为教学文档，无敏感信息。
 */
(function () {
    "use strict";

    /* ── 1. 读取 UA（User-Agent，浏览器上报的设备/系统特征字符串，只读不写） ── */
    var ua = navigator.userAgent || "";

    /* ── 2. 系统判定 ── */
    // 苹果系统：iPhone / iPad / iPod 直接匹配；
    // 特例：iPadOS 13+ 的 Safari UA 伪装成 Mac（Macintosh），但触屏点数 >1，
    //       所以用「Macintosh + maxTouchPoints>1」把伪装成 Mac 的 iPad 也拦下来。
    var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    // 鸿蒙系统：UA 里带 HarmonyOS / Harmony / OpenHarmony 字样（华为鸿蒙手机/平板版 UA 特征，
    // 含华为浏览器 UA 中的 HarmonyOS 字段）；普通安卓手机（无鸿蒙）UA 不含这些词，正常放行。
    var isHarmony = /HarmonyOS|Harmony|OpenHarmony/i.test(ua);

    /* ── 3. 命中拦截：整页替换为提示页（不给进入） ── */
    if (isIOS || isHarmony) {
        // 简短的 UA 摘要，展示在提示页中让访客知道「为什么被拦」（只保留系统部分，无信息泄露）
        var sysName = isHarmony ? "鸿蒙系统（HarmonyOS）" : "苹果系统（iOS / iPadOS）";
        var uaShort = ua.replace(/\s+/g, " ").slice(0, 90);

        // 提示页：整屏紫渐变卡片 + 3 条说明 + 设备信息，样式全部内联，不依赖 CSS/JS
        document.write(
            '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>设备限制提示 - 毛毛的个人主页</title>' +
            '<style>' +
            '*{margin:0;padding:0;box-sizing:border-box}' +
            'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;' +
            'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;' +
            'background:linear-gradient(135deg,#e5dcff 0%,#ffffff 55%,#7c5cbf26 100%);color:#333}' +
            '.card{text-align:center;padding:40px 30px;width:100%;max-width:400px;' +
            'background:#ffffffd9;border:1px solid #e5dcff;border-radius:26px;' +
            'box-shadow:0 20px 60px rgba(101,67,165,.20);backdrop-filter:blur(6px)}' +
            '.logo{font-size:56px;line-height:1;margin-bottom:12px}' +
            '.name{font-size:22px;font-weight:800;color:#6543a5;margin-bottom:6px}' +
            '.sub{font-size:14px;color:#888;margin-bottom:20px}' +
            '.tag{display:inline-block;padding:7px 16px;border-radius:999px;font-size:13px;font-weight:700;' +
            'background:#ffefdd;color:#c56a00;margin-bottom:16px}' +
            '.lists{text-align:left;font-size:14px;line-height:2;color:#555;background:#f7f4ff;' +
            'border:1px solid #e5dcff;border-radius:14px;padding:14px 18px;margin-bottom:18px}' +
            '.info{font-size:11px;color:#aaa;word-break:break-all;line-height:1.6;margin-bottom:14px}' +
            '.foot{font-size:12px;color:#997dcc}' +
            '@media (prefers-color-scheme:dark){' +
            'body{background:linear-gradient(135deg,#2a2140 0%,#14121e 55%,#1e1830 100%);color:#eee}' +
            '.card{background:#201a30dd;border-color:#4a3a78}' +
            '.name{color:#bb9cff}.sub{color:#9a92b5}.lists{background:#2a2142;border-color:#4a3a78;color:#b9b3d0}' +
            '.tag{background:#3a2a1a;color:#ffb25e}.info{color:#6d6690}.foot{color:#8f7ac2}}' +
            '</style></head><body>' +
            '<div class="card">' +
            '<div class="logo">🚧</div>' +
            '<div class="name">设备限制提示</div>' +
            '<div class="sub">毛毛的个人主页 · 本站当前仅支持安卓设备访问</div>' +
            '<div class="tag">已检测到你的系统：' + sysName + '</div>' +
            '<div class="lists">' +
            '· 本站暂不支持' + sysName + '访问<br>' +
            '· 请改用安卓手机 / 安卓平板浏览器打开<br>' +
            '· 若你是在微信内打开的，请点右上角在浏览器打开</div>' +
            '<div class="info">UA: ' + uaShort + '</div>' +
            '<div class="foot">毛毛的个人主页 · maomaowang.top</div>' +
            '</div></body></html>'
        );
        document.close(); // 结束写入：后续页面内容一律不加载
    }
})();
