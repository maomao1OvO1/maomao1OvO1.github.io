/*
 * 文件：device-check.js —— 移动端适配检测（页面加载早期执行）
 * 功能：在页面渲染前检查访客设备，做「移动端适配提示」。
 *   匹配以下情况的设备会看到「设备限制提示」页（提示改用安卓/Windows 访问）：
 *     a) 系统标识包含 HarmonyOS / Harmony / OpenHarmony / Huawei；
 *     b) UA 为 Macintosh 且不含 iPhone/iPad 字样（即桌面 Mac，含伪装成 Mac 的平板之外的真实 Mac）；
 *     c) UA 含 iPhone / iPad / iPod 字样（苹果手机/平板）。
 *   其余设备（安卓/Windows/Linux/BSD/Chrome OS 等）正常运行网站。
 * 定位：站内每个 HTML 页面的 <head> 内同步引入（<script src="/device-check.js?v=N"></script>），
 *       保证在任何内容渲染之前就完成适配提示。
 * 说明：纯 ES5 语法 + 零外部依赖；提示附带随机延时（100-300ms）模拟设备能力检测耗时。
 */
(function () {
    "use strict";

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

    /* ── 3. 提示用系统名（仅用于提示页展示） ── */
    var sysName;
    if (isHmHw) {
        sysName = "华为 / 鸿蒙设备";
    } else if (isMacPure) {
        sysName = "苹果 Mac 电脑";
    } else {
        sysName = "苹果系统（iOS / iPadOS）";
    }

    /* ── 4. 未适配：整页替换为提示页 ── */
    if (notAdapted) {
        // 提示文案（按设备类型区分）
        var msg = isMacPure
            ? "本站暂不支持 Mac 系统，请使用 Windows 电脑访问。"
            : "本站暂不支持你的设备，请使用安卓手机/平板或Windows电脑访问。";
        // 简短的 UA 摘要，展示在提示页中（只保留一段，无信息泄露）
        var uaShort = ua.replace(/\s+/g, " ").slice(0, 90);

        // 「常见问题」入口：仅华为/鸿蒙设备可见（跳转到独立说明页 why-blocked.html，免责声明置顶）
        var whyBlock = isHmHw
            ? '<div class="why"><a href="/why-blocked.html">❓ 为什么我被拦截？</a></div>'
            : '';

        // 随机延时 100-300ms 后给出适配提示（模拟设备能力检测耗时）
        var delay = 100 + Math.floor(Math.random() * 200);
        setTimeout(function () {
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
                '.why{margin-top:2px}.why a{display:inline-block;color:#7c5cbf;font-size:13px;text-decoration:none;' +
                'border-bottom:1px dashed #7c5cbf;padding-bottom:1px;cursor:pointer}' +
                '@media (prefers-color-scheme:dark){' +
                'body{background:linear-gradient(135deg,#2a2140 0%,#14121e 55%,#1e1830 100%);color:#eee}' +
                '.card{background:#201a30dd;border-color:#4a3a78}' +
                '.name{color:#bb9cff}.sub{color:#9a92b5}.lists{background:#2a2142;border-color:#4a3a78;color:#b9b3d0}' +
                '.tag{background:#3a2a1a;color:#ffb25e}.info{color:#6d6690}.foot{color:#8f7ac2}' +
                '.why a{color:#bb9cff;border-color:#bb9cff}}' +
                '</style></head><body>' +
                '<div class="card">' +
                '<div class="logo">🚧</div>' +
                '<div class="name">设备限制提示</div>' +
                '<div class="sub">' + msg + '</div>' +
                '<div class="tag">已检测到你的系统：' + sysName + '</div>' +
                '<div class="lists">' +
                '· 请改用安卓手机 / 安卓平板 / Windows 电脑打开<br>' +
                '· 若你是在微信内打开的，请点右上角在浏览器打开</div>' +
                '<div class="info">UA: ' + uaShort + '</div>' +
                '<div class="foot">毛毛的个人主页 · maomaowang.top</div>' +
                whyBlock +
                '</div></body></html>'
            );
            document.close(); // 结束写入：后续页面内容一律不加载
        }, delay);
    }
})();
