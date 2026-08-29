/*
 * 文件：device-check.js —— 设备系统检测（站点门禁）
 * 功能：在页面加载最早期检测访客设备系统。
 *   【白名单规则】放行：安卓 Android、Windows、Linux 桌面（含国产 UOS/麒麟/deepin）、
 *   BSD（FreeBSD/OpenBSD/NetBSD）、Chrome OS（Chromebook）、小众设备（智能电视 Tizen/
 *   webOS/Android TV、游戏机 Switch/PS/Xbox、KaiOS 功能机、搜索引擎爬虫 Googlebot 等）；
 *   拦截：苹果三兄弟（iPhone/iPad/iPadOS/Mac 电脑）+ 鸿蒙（HarmonyOS 3/4/NEXT/OpenHarmony）。
 *   命中拦截时立即用 document.write 整页替换为「设备限制提示页」（不进入网站任何内容）。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js?v=N"></script>），
 *       保证在任何内容渲染之前就完成拦截，被拦设备不会看到页面资源。
 * 说明：纯 ES5 语法 + 零外部依赖，老浏览器/系统也能执行；本文件为教学文档，无敏感信息。
 */
(function () {
    "use strict";

    /* ── 1. 读取 UA（User-Agent，浏览器上报的设备/系统特征字符串，只读不写） ── */
    var ua = navigator.userAgent || "";

    /* ── 2. 系统识别与白名单判定（放行条件） ── */
    // 鸿蒙：UA 含 HarmonyOS/Harmony/OpenHarmony（鸿蒙 3/4 的 UA 里会写 "Android 12"，那是伪装字样）
    var isHarmony = /HarmonyOS|Harmony|OpenHarmony/i.test(ua);
    // 安卓：UA 含 "Android"（手机/平板/安卓微信/Android TV 均命中；鸿蒙伪装由 !isHarmony 排除）
    var isAndroid = /Android/i.test(ua);
    // Windows：UA 含 "Windows"（电脑/平板；老 Windows Phone 也含，均已停产可放行）
    var isWin = /Windows/i.test(ua);
    // Linux 桌面：UA 带 X11 / Ubuntu / Fedora / Debian 等特征（含国产 UOS/麒麟，UA 里就是 Linux）
    var isLinux = /X11|Ubuntu|Fedora|Debian|SteamOS|Linux/i.test(ua);
    // BSD：FreeBSD / OpenBSD / NetBSD（macOS 的 UA 是 "Mac OS X"，不会误判）
    var isBsd = /FreeBSD|OpenBSD|NetBSD/i.test(ua);
    // Chrome OS：谷歌 Chromebook（UA 带 CrOS / Chrome OS）
    var isChromeOs = /CrOS|Chrome OS/i.test(ua);
    // 小众设备 & 程序发起方：智能电视（Tizen/webOS）、游戏机（Switch/PlayStation/Xbox）、
    // 功能机（KaiOS）、搜索引擎爬虫（Googlebot/百度蜘蛛/必应）等——都放行
    var isOther = /Tizen|webOS|KaiOS|Nintendo Switch|PlayStation|Xbox|Googlebot|Baiduspider|bingbot|JinaBot/i.test(ua);
    // 放行 = 上述任一命中 且 不是鸿蒙（鸿蒙 UA 里也带 Android/Linux 字样，必须先排除）
    var allowed = (isAndroid || isWin || isLinux || isBsd || isChromeOs || isOther) && !isHarmony;

    /* ── 3. 系统名识别（仅用于提示页展示） ── */
    // iPadOS 13+ Safari 把 UA 伪装成 Mac（Macintosh），用触屏点数>1 识别真 iPad；
    // Mac 电脑无触屏（maxTouchPoints=0），同样拦截。
    var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    var isMac = /Macintosh/i.test(ua);
    var sysName;
    if (isHarmony) {
        sysName = "鸿蒙系统（HarmonyOS）";
    } else if (isIOS) {
        sysName = "苹果系统（iOS / iPadOS）";
    } else if (isMac) {
        sysName = "苹果 Mac 电脑";
    } else {
        sysName = "其他系统";
    }

    /* ── 4. 非白名单：整页替换为提示页（不给进入） ── */
    if (!allowed) {
        // 简短的 UA 摘要，展示在提示页中让访客知道「为什么被拦」（只保留一段，无信息泄露）
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
            '<div class="sub">毛毛的个人主页 · 本站仅支持安卓 / Windows 设备访问</div>' +
            '<div class="tag">已检测到你的系统：' + sysName + '</div>' +
            '<div class="lists">' +
            '· 本站暂不支持你的系统访问<br>' +
            '· 请改用安卓手机 / 安卓平板 / Windows 电脑打开<br>' +
            '· 若你是在微信内打开的，请点右上角在浏览器打开</div>' +
            '<div class="info">UA: ' + uaShort + '</div>' +
            '<div class="foot">毛毛的个人主页 · maomaowang.top</div>' +
            '</div></body></html>'
        );
        document.close(); // 结束写入：后续页面内容一律不加载
    }
})();
