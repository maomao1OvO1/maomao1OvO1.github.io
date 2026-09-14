/* ============================================================================
 * 文件：gate.js —— 站点门禁合集（2026-09-14 合并）
 * 内容 = device-check.js(v18，设备适配门禁) + anti-bot.js(v5，自动化访问检测)
 * 为什么合并：原本每页发两个独立请求，慢网下各要 2~6 秒；合并后只发一个，省一个网络往返。
 * 顺序与原页面完全一致（先设备门禁，后反爬），两个脚本各自是独立 IIFE，互不依赖。
 * 维护：源文件 device-check.js / anti-bot.js 仍保留在仓库里；改规则请改源文件后重新合并。
 * ============================================================================ */

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


/*
 * 文件：anti-bot.js —— 反爬虫守卫 v4（自动化访问检测）
 * 功能：在页面渲染前检测「自动化工具/爬虫」特征（无头浏览器、Selenium、Puppeteer、Playwright、采集脚本）。
 *   采用【评分制】：多项特征各计分，总分 ≥ 5 分才拦截 —— 原则：宁放过、勿误杀（本站设备门禁已经够严，
 *   反爬再误杀真人就没人能进了）。
 *   拦截动作：先记住来源页（sessionStorage），再重定向到独立页 /ab-blocked.html（独占窗口，绝不与
 *   页面内容堆叠——v2 曾用 document.write 整页替换，实测在移动端会变成「插进页面流里」的卡片，故改独立页）。
 *   独立页带「我是真人，放我进去」按钮：写入放行标记后返回来源页，原页刷新即放行（误伤自愈）。
 * 定位：每个 HTML 页面的 <head> 内同步引入（位于 device-check.js 之后），保证在内容渲染前完成判定。
 * 说明：纯 ES5 语法 + 零外部依赖；公开自报身份的搜索引擎爬虫（Googlebot/Baiduspider 等）默认放行
 *   （不拦收录、遵守 robots 协议）。
 * 边界：静态站反爬属「软防御」——能挡住绝大多数傻瓜采集器；专业反检测框架挡不住
 *   （没有服务器，做不了 IP 级封锁；真要硬核防护得上 Cloudflare Bot Fight / 自建后端）。
 * 自查：URL 加 ?ab=preview 可强制体验拦截流程（站长检查用，正常访问无影响）。
 */
(function () {
    "use strict";

    /* ── 0. 人工放行标记：被误拦的真人点「放我进去」后写入，本会话内生效 ── */
    var SS = window.sessionStorage || { getItem: function () { return null; }, setItem: function () {} };
    try {
        if (SS.getItem("mm_ab_bypass") === "1") return; // 有标记 → 直接放行，不再检测
    } catch (e) {}

    /* ── 0.5 预览模式（站长自查用）：URL 带 ?ab=preview 时直接体验拦截流程 ── */
    // 说明：只有主动加这个参数才会触发；爬虫/正常访问不会带它，完全不影响线上行为。
    var PREVIEW = /(^|[?&])ab=preview($|&)/.test(location.search || "");

    /* ── 拦截动作：记住来源页，再跳转到独立的访问验证页（独占窗口，不与页面内容堆叠） ── */
    function blockPage() {
        // 记住当前来源页：真人点「放我进去」后可原路返回（replace 跳转会替换历史记录，无法用 back 返回）
        try { SS.setItem("mm_ab_from", location.href); } catch (e) {}
        try {
            // location.replace = 不留历史记录的直接跳转（爬虫无法用「返回」绕开）
            window.location.replace("/ab-blocked.html");
        } catch (e) {}
    }

    // 预览模式：跳过检测，直接体验拦截流程（站长自查用）
    if (PREVIEW) { blockPage(); return; }

    /* ── 1. 读取环境特征 ── */
    var ua = navigator.userAgent || "";
    var score = 0;      // 怀疑分：越高越像爬虫（>=5 触发拦截判定）
    var human = false;  // 真人交互标志：真实指针/键盘/滚轮事件出现 = 人

    /* ── 2. 公开搜索引擎爬虫：直接放行（利于收录，符合 robots 协议） ── */
    // 这些爬虫会在 UA 里自报身份（Googlebot/Baiduspider 等），属于「守规矩的采集者」
    var crawlerUA = /googlebot|baiduspider|bingbot|bytespider|yandexbot|semrushbot|ahrefsbot|dotbot|gptbot|claudebot|anthropic-ai|duckduckbot|slurp|bingpreview/i;
    if (crawlerUA.test(ua)) return;

    /* ── 3. 特征评分（每项 1~5 分） ── */
    // a) 自动化驾驶舱标志：Selenium / Playwright / Puppeteer / ChromeDriver 注入的窗口必为 true
    if (navigator.webdriver === true) score += 5;
    // b) UA 暗号：无头/自动化字样（真机浏览器不会带这些）
    if (/headless|phantomjs|selenium|puppeteer|playwright|lighthouse|headlesschrome/i.test(ua)) score += 5;
    // c) 插件列表为空：无头 Chrome 常为 0（部分隐私模式 Firefox 也是 0，给 2 分不致命）
    var pluginsCount = (navigator.plugins && navigator.plugins.length) || 0;
    if (pluginsCount === 0) score += 2;
    // d) 窗口尺寸为 0：无头渲染窗口常见
    if (window.outerWidth === 0 || window.innerWidth === 0) score += 2;
    // e) 语言列表缺失：真浏览器必有 navigator.languages（至少一个）
    if (!navigator.languages || navigator.languages.length === 0) score += 1;
    // f) CPU 核心数极少：无头默认环境常为 1~2（低端手机会误伤吗？给 1 分，凑不够 5 分就没事）
    if ((navigator.hardwareConcurrency || 8) <= 2) score += 1;

    /* ── 4. 蜜罐陷阱：注入一个真人看不见的链接，爬虫抓 HTML 时会顺着抓到它 ── */
    // 原理：爬虫抓取「页面里所有 <a>」时会发现 display:none 的隐藏链接并去访问；
    //      真人：看不见、点不到。访问隐藏链接会带 ?honeypot=1 参数 → 本脚本检测到就记违规标记。
    //        （注意：纯 HTML 解析、不执行 JS 的采集器看不到注入的链接——这类由评分制挡住。）
    var LS = window.localStorage || { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
    var hpHit = /(^|[?&])honeypot=1($|&)/.test(location.search || ""); // URL 带蜜罐参数 = 顺着藏链接爬进来的
    try {
        if (hpHit) LS.setItem("mm_ab_hp", "1");            // 记下违规（跨页生效）
        if (LS.getItem("mm_ab_hp") === "1") score += 3;    // 历史上有过一次蜜罐命中 → 记 +3 分
    } catch (e) {}

    /* ── 5. 真人交互监听：任何真实指针/键盘/滚动事件都算「人」 ── */
    function markHuman() {
        human = true;
        // 自愈：真人 + 蜜罐标记并存（可能是误触发/环境异常）→ 清掉标记，别让真人在我这儿背锅
        try { if (human && LS.getItem("mm_ab_hp") === "1") LS.removeItem("mm_ab_hp"); } catch (e) {}
    }
    var evts = ["pointerdown", "mousedown", "touchstart", "keydown", "wheel"];
    for (var i = 0; i < evts.length; i++) {
        document.addEventListener(evts[i], markHuman, { passive: true, capture: true });
    }

    /* ── 6. 拦截判定：分数达标 → 延时 800ms 等待真人交互 → 仍无交互才拦截 ── */
    if (score >= 5) {
        setTimeout(function () {
            if (human) return; // 真人出现了，放行
            var delay = 100 + Math.floor(Math.random() * 200); // 随机延时 100-300ms（与门禁同款手法）
            setTimeout(function () {
                if (human) return; // 延时期间有交互 → 仍放行
                blockPage();
            }, delay);
        }, 800);
    }
})();

/* ==== 2026-09-14 新增：清理 body 开头的孤立「>」文本节点 ====
   现象：毛毛反馈「每个页面都有一个 >，点也点不动」。实测（Chrome DevTools Protocol 读 DOM）确认
        document.body.firstChild 是一个内容为 ">\n\n" 的文本节点，出现在 body 标签之后、第一个注释之前；
        但该字符在 HTML 源码、CSS（content 全为空）、以及本页所有脚本里都搜不到，源头未能定位。
   处理：这里做一次防御性清理 —— 只有当 body 的第一个子节点是「纯 > 与空白」的文本节点时才移除它，
        不影响任何真实内容；多个连续的同类节点也一并清掉。
   安全性：条件极其严格（nodeType 必须是文本、内容必须只含 > 和空白），命中即删、不命中不动。 */
(function () {
    function cleanStrayGt() {
        try {
            var body = document.body;
            if (!body) return;
            var n = body.firstChild;
            while (n && n.nodeType === 3 && /^[\s>]+$/.test(n.nodeValue) && n.nodeValue.indexOf('>') >= 0) {
                var next = n.nextSibling;
                body.removeChild(n);
                n = next;
            }
        } catch (e) { /* 静默：清理失败不影响页面 */ }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanStrayGt, { once: true });
    } else {
        cleanStrayGt();
    }
})();
