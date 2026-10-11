/* ============================================================================
 * 文件：gate.js —— 站点门禁合集（2026-09-14 合并 · 2026-10-11 随 anti-bot v5 重新合并）
 * 内容 = device-check.js(v18，设备适配门禁) + anti-bot.js(v5，自动化访问检测 · 严模式)
 * 为什么合并：原本每页发两个独立请求，慢网下各要 2~6 秒；合并后只发一个，省一个网络往返。
 * 顺序与原页面完全一致（先设备门禁，后反爬），两个脚本各自是独立 IIFE，互不依赖。
 *
 * v5 变更（2026-10-11 按毛毛要求「能拦机器人爬虫，错杀也不放过」）：
 *   三层防御 = 硬特征层（webdriver / UA 暗号 / 框架注入变量 / 原生函数被篡改 / 蜜罐 / 合成事件）
 *            + 评分层（门槛 5 → 3，新增 userAgentData、WebGL 软渲染、deviceMemory 等特征）
 *            + 行为层（页面可见后 3 秒内零真实交互 → 拦）。
 *
 * ⚠️ 本文件是**生成物**，不要直接改这里 —— 改源文件 anti-bot.js / device-check.js 后重新合并：
 *     cat 本头部 device-check.js anti-bot.js > gate.js
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
 * 文件：anti-bot.js —— 反爬虫守卫 v5（严模式 · 宁可错杀，不放过）
 * 功能：在页面渲染前检测「自动化工具 / 爬虫 / 无头浏览器 / 采集脚本」，命中即跳到独立验证页。
 *
 * ⭐ v5 与 v4 的根本差别（2026-10-11 按毛毛要求改）：
 *   v4 = 「宁放过、勿误杀」—— 单一评分制，门槛 5 分，真人交互即放行，行为零干预。
 *   v5 = 「宁可错杀、不放过」—— 三层防御，任一层命中即拦：
 *     ① 硬特征层：命中即拦，不看行为（webdriver / UA 暗号 / 自动化框架注入的全局变量 /
 *        原生函数被篡改 / 蜜罐命中 / 伪造的合成事件）。
 *     ② 评分层：门槛从 5 分降到 3 分，并新增一批「真浏览器必然有、无头环境常常没有」的特征
 *        （userAgentData、WebGL 软渲染、deviceMemory、maxTouchPoints 矛盾等）。
 *     ③ 行为层（新）：页面打开后 BEHAVIOR_WINDOW_MS 内如果**一次真实交互都没有**（不动鼠标、
 *        不滑动、不按键、不滚动）→ 判定为「渲染完就走」的采集器，直接拦。
 *        ⇒ 这是最狠的一条，也是最能拦「真实浏览器内核的自动化」的一条。
 *
 * ⚠️ 代价（必须知情）：行为层会误杀「打开页面就静静看、3 秒内不动手」的真人。
 *   这是「错杀也不放过」的必然代价，不是 bug。误杀自愈有两条路：
 *     1) 被拦后点「我是真人，放我进去」→ 本次会话内放行（/ab-blocked.html）；
 *     2) 想放宽：调下面配置区的常量即可（BEHAVIOR_ENFORCE=false 关掉行为层；
 *        或把 BEHAVIOR_WINDOW_MS 调大、SCORE_THRESHOLD 调高）。
 *
 * 🧩 能拦谁 / 拦不住谁（静态站的物理上限，写清避免自欺）：
 *   拦得住：curl/wget 之外的「无头 Chrome、Puppeteer/Playwright/Selenium 默认配置、Selenium 伪装、
 *           stealth 部分伪装、渲染截图型采集、DOM 遍历型采集、伪造合成事件的脚本」。
 *   拦不住：① 纯 HTTP 抓取（curl/requests/Scrapy，**不执行 JS**，本脚本根本没机会运行）
 *            —— 这类只剩「蜜罐链接 + robots.txt」两道被动手段；
 *          ② 反检测做得干净、又主动模拟真人交互的定向爬虫（静态站无服务器，做不到 IP 级封锁）。
 *   要真正硬核：上 Cloudflare 侧（Bot Fight Mode / Turnstile 服务端校验）或自建后端。
 *
 * 定位：见 gate.js（本文件与 device-check.js 合并上线，每页只发一个请求）。
 * 说明：纯 ES5 语法 + 零外部依赖 + 无网络请求；不收集、不上传任何数据。
 * 自查：URL 加 ?ab=preview 可强制体验拦截流程（站长自测用，正常访问不受影响）。
 * 作者：小鲸（为毛毛写）· 2026-10-11 · v5
 */
(function () {
    "use strict";

    /* ══════════════════ 0. 人工放行标记：被误拦的真人点「放我进去」后写入 ══════════════════ */
    var SS = window.sessionStorage || { getItem: function () { return null; }, setItem: function () {} };
    var LS = window.localStorage || { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
    try {
        if (SS.getItem("mm_ab_bypass") === "1") return; // 有标记 → 直接放行，本次会话不再检测
    } catch (e) {}

    /* ══════════════════ 0.5 预览模式（站长自查）：?ab=preview 直接体验拦截流程 ══════════════════ */
    var PREVIEW = /(^|[?&])ab=preview($|&)/.test(location.search || "");

    /* ══════════════════ 0.6 配置区（想调强弱就改这里，改完同步到 gate.js） ══════════════════ */
    var SCORE_THRESHOLD = 3;         // 评分门槛：≥ 此分即拦（v4 是 5，v5 降到 3）
    var BEHAVIOR_ENFORCE = true;     // 行为层总开关：true = 无真实交互就拦（最狠的一条）
    var BEHAVIOR_WINDOW_MS = 3000;   // 行为观察窗口：页面可见后多少毫秒内必须有真实交互
    var SCORE_WAIT_MS = 800;         // 评分达标后的观察延时（与 v4 一致，避免瞬间跳走）
    var AI_CRAWLER_ALLOW = false;    // 是否放行 AI 训练爬虫（GPTBot/ClaudeBot 等）：false = 不放过
    var HONEYPOT_INJECT = true;      // 是否注入隐藏蜜罐链接（真人看不见，遍历链接的爬虫会踩）

    /* ══════════════════ 1. 拦截动作：记住来源页 → 跳独立验证页 ══════════════════ */
    function blockPage(原因) {
        // 记下拦截原因（只存本地、不显示、不上传，站长自查用）
        try { SS.setItem("mm_ab_reason", String(原因 || "unknown")); } catch (e) {}
        // 记住来源页：真人点「放我进去」后可原路返回（replace 不留历史，爬虫无法用「返回」绕开）
        try { SS.setItem("mm_ab_from", location.href); } catch (e) {}
        try { window.location.replace("/ab-blocked.html"); } catch (e) {}
    }

    // 预览模式：跳过检测，直接体验拦截流程
    if (PREVIEW) { blockPage("preview"); return; }

    /* ══════════════════ 2. UA 白名单 ══════════════════ */
    var ua = navigator.userAgent || "";

    // ① 正经搜索引擎：**永远放行**（拦了等于自我除名，搜索里从此查不到本站）
    var 搜索引擎UA = /googlebot|google-inspectiontool|storebot-google|baiduspider|bingbot|bingpreview|yandexbot|duckduckbot|slurp|applebot|sogou web spider|360spider|haosouspider|shenmaspider/i;
    if (搜索引擎UA.test(ua)) return;

    // ② AI 训练/抓取爬虫：默认**不放过**（它们只为喂模型，对本站没有收录价值）
    //    想把 AI 收录放回来的话，把配置区的 AI_CRAWLER_ALLOW 改成 true 即可
    var AI爬虫UA = /gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|bytespider|ccbot|perplexitybot|amazonbot|meta-externalagent|petalbot/i;
    if (AI_CRAWLER_ALLOW && AI爬虫UA.test(ua)) return;

    /* ══════════════════ 3. 硬特征层：命中即拦，不看行为 ══════════════════ */
    var 硬拦原因 = "";

    // a) 自动化驾驶舱标志：Selenium / Playwright / Puppeteer / ChromeDriver 下必为 true
    if (navigator.webdriver === true) 硬拦原因 = "webdriver";

    // b) UA 暗号：无头 / 命令行 / 自动化框架字样（真机浏览器不会带）
    if (!硬拦原因 && /headless|phantomjs|selenium|webdriver|puppeteer|playwright|lighthouse|electron|jsdom|scrapy|python-requests|python-urllib|aiohttp|httpx|curl\/|wget|libwww|httpclient|okhttp|go-http-client|java\/|node-fetch|axios\/|node\.js/i.test(ua)) {
        硬拦原因 = "ua-signature";
    }

    // c) 自动化框架往 window 注入的招牌变量（真实浏览器里这些名字根本不存在）
    if (!硬拦原因) {
        var 招牌变量 = ["__nightmare", "_phantom", "callPhantom", "__phantomas", "callSelenium",
            "_selenium", "__selenium_unwrapped", "__webdriver_evaluate", "__driver_evaluate",
            "__webdriver_script_fn", "__fxdriver_evaluate", "__selenium_evaluate",
            "domAutomation", "domAutomationController", "__playwright", "__puppeteer_evaluation_script__",
            "_WEBDRIVER_ELEM_CACHE", "__lastWatirAlert", "__lastWatirConfirm", "__lastWatirPrompt"];
        try {
            for (var i = 0; i < 招牌变量.length; i++) {
                if (招牌变量[i] in window) { 硬拦原因 = "global:" + 招牌变量[i]; break; }
            }
            // ChromeDriver 会给元素挂 cdc_ / $cdc_ 前缀的私有变量（它的老毛病）
            if (!硬拦原因) {
                for (var k in window) {
                    if (/^\$?cdc_/.test(k)) { 硬拦原因 = "chromedriver-cdc"; break; }
                }
            }
        } catch (e) {}
    }

    // d) 原生函数被篡改：stealth 系框架会把 navigator.webdriver 改写成普通属性
    //    小心误伤：老浏览器（根本不支持 webdriver 属性）不该被判为篡改 ⇒ 先确认「这个属性确实存在」再判
    if (!硬拦原因) {
        try {
            var 原型描述 = Object.getOwnPropertyDescriptor(Navigator.prototype, "webdriver");
            var 原型上是原生getter = !!(原型描述 && typeof 原型描述.get === "function");
            var 属性存在 = ("webdriver" in navigator);
            // ① getter 存在、但不是原生代码（被套了一层假函数）
            if (原型上是原生getter && !/\[native code\]/.test(Function.prototype.toString.call(原型描述.get))) {
                硬拦原因 = "webdriver-getter-faked";
            }
            // ② 更常见的 stealth 手法：把 webdriver 变成「实例自有属性」（原生绝不会这样）
            if (!硬拦原因 && Object.getOwnPropertyDescriptor(navigator, "webdriver")) {
                硬拦原因 = "webdriver-instance-prop";
            }
            // ③ 浏览器明明支持 webdriver，却在原型上找不到原生 getter（被删/被换）
            if (!硬拦原因 && 属性存在 && !原型上是原生getter) 硬拦原因 = "webdriver-tampered";
        } catch (e) {}
    }

    // e) 蜜罐命中：URL 带 ?honeypot=1 = 顺着隐藏诱饵链接爬进来的
    var 蜜罐命中 = /(^|[?&])honeypot=1($|&)/.test(location.search || "");
    try {
        if (蜜罐命中) LS.setItem("mm_ab_hp", "1");
        if (LS.getItem("mm_ab_hp") === "1") 硬拦原因 = 硬拦原因 || "honeypot";
    } catch (e) {}

    // 硬特征命中 → 立即拦（不等行为、不给反悔机会）
    if (硬拦原因) { blockPage(硬拦原因); return; }

    /* ══════════════════ 4. 评分层：真浏览器必然有、无头环境常常没有 ══════════════════ */
    var 分 = 0, 扣分明细 = [];

    function 加分(值, 名称) { if (值) { 分 += 值; 扣分明细.push(名称 + "+" + 值); } }

    // a) 插件 / MIME 列表：桌面端真浏览器一定非空；无头 Chrome 恒为 0
    var 插件数 = (navigator.plugins && navigator.plugins.length) || 0;
    var MIME数 = (navigator.mimeTypes && navigator.mimeTypes.length) || 0;
    var 是桌面UA = /windows|macintosh|linux|x11|cros/i.test(ua) && !/android|iphone|ipad|mobile/i.test(ua);
    if (插件数 === 0 && MIME数 === 0) 加分(是桌面UA ? 3 : 1, "noPlugins");

    // b) 窗口尺寸为 0：无头渲染常见
    加分((window.outerWidth === 0 || window.innerWidth === 0) ? 3 : 0, "zeroWindow");

    // c) 语言列表缺失：真浏览器必有 navigator.languages
    加分((!navigator.languages || navigator.languages.length === 0) ? 2 : 0, "noLanguages");

    // d) CPU 核心数极少（无头容器默认 1~2 核）
    加分(((navigator.hardwareConcurrency || 8) <= 2) ? 2 : 0, "fewCores");

    // e) UA 自称 Chrome，却没有 userAgentData（Chrome 90+ 必有 ⇒ 伪装 UA 的强信号）
    if (/chrome|chromium|crios/i.test(ua) && !navigator.userAgentData) 加分(3, "noUAData");

    // f) UA 自称 Chrome，却没有 deviceMemory（Chrome 有，且无法被 UA 伪装出来）
    if (/chrome|chromium|crios/i.test(ua) && typeof navigator.deviceMemory === "undefined") 加分(1, "noDeviceMemory");

    // g) 没有网络信息接口（部分无头/容器环境缺失）
    加分(!navigator.connection ? 1 : 0, "noConnection");

    // h) 自称移动端，却一个触点都没有（UA 伪装 + 桌面内核的典型矛盾）
    加分((/android|iphone|ipad|mobile/i.test(ua) && navigator.maxTouchPoints === 0) ? 2 : 0, "touchMismatch");

    // i) WebGL：缺失或"软件渲染"（SwiftShader / llvmpipe 是无头 Chrome 的老底）
    var WebGL渲染器 = "";
    try {
        var 画布 = document.createElement("canvas");
        var gl = 画布.getContext("webgl") || 画布.getContext("experimental-webgl");
        if (!gl) { 加分(2, "noWebGL"); }
        else {
            var 调试扩展 = gl.getExtension("WEBGL_debug_renderer_info");
            WebGL渲染器 = String((调试扩展 && gl.getParameter(调试扩展.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || "");
            if (/swiftshader|llvmpipe|softpipe|software|mesa offscreen|virtualbox|vmware/i.test(WebGL渲染器)) 加分(3, "softwareGL:" + WebGL渲染器.slice(0, 40));
        }
    } catch (e) { 加分(1, "webglError"); }

    // j) 桌面端浏览器却开成「满屏且坐标 0,0」（无头默认视口的常见样子）
    try {
        if (是桌面UA && window.screenX === 0 && window.screenY === 0 &&
            window.outerWidth === window.screen.width && window.outerHeight === window.screen.height) {
            加分(1, "headlessViewport");
        }
    } catch (e) {}

    /* ══════════════════ 5. 蜜罐诱饵：注入真人看不见的链接（爬虫会顺着抓） ══════════════════ */
    // 原理：真人在页面上看不见、也点不到这个链接；而「遍历页面所有 <a> 去抓取」的爬虫会踩进来，
    //      带着 ?honeypot=1 访问 → 下一次加载就被上面第 3.e 条逮住（跨页生效）。
    // 注意：搜索引擎白名单在第 2 节就 return 了，所以 Googlebot 之类根本执行不到这里（不会被钓）。
    function 注入蜜罐() {
        try {
            if (!document.body) return;
            var 诱饵 = [
                { href: "/sitemap.xml?honeypot=1", 文字: "sitemap" },
                { href: "/admin?honeypot=1", 文字: "后台入口" }
            ];
            for (var i = 0; i < 诱饵.length; i++) {
                var a = document.createElement("a");
                a.href = 诱饵[i].href;
                a.textContent = 诱饵[i].文字;
                a.setAttribute("rel", "nofollow noindex");
                a.setAttribute("aria-hidden", "true");
                a.tabIndex = -1;
                // 藏在屏幕外（不用 display:none —— 那太像"明显的蜜罐"，正经采集器会跳过）
                a.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
                document.body.appendChild(a);
            }
        } catch (e) { /* 静默：注入失败不影响页面 */ }
    }
    if (HONEYPOT_INJECT) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", 注入蜜罐, { once: true });
        else 注入蜜罐();
    }

    /* ══════════════════ 6. 行为层：真人交互监听 ══════════════════ */
    var 有真人交互 = false;
    function 记录交互(e) {
        // 合成事件（脚本 dispatchEvent 造的）：isTrusted === false ⇒ 直接当作机器人
        try {
            if (e && e.isTrusted === false) { blockPage("synthetic-event"); return; }
        } catch (err) {}
        有真人交互 = true;
        // 自愈：真人出现 + 历史蜜罐标记并存 → 清掉标记，别让真人在自己站里背锅
        try { if (LS.getItem("mm_ab_hp") === "1") LS.removeItem("mm_ab_hp"); } catch (err) {}
    }
    // 事件类型越多越好：真人不点也会动/滑/滚 —— 这正是行为层要抓的「人味」
    var 事件列表 = ["mousemove", "pointermove", "touchmove", "touchstart", "pointerdown", "mousedown", "keydown", "wheel", "scroll"];
    for (var j = 0; j < 事件列表.length; j++) {
        document.addEventListener(事件列表[j], 记录交互, { passive: true, capture: true });
    }
    window.addEventListener("scroll", 记录交互, { passive: true, capture: true });

    /* ══════════════════ 7. 判定 ══════════════════ */
    // 7.1 评分达标 → 观察 SCORE_WAIT_MS 后仍无真人交互则拦
    if (分 >= SCORE_THRESHOLD) {
        setTimeout(function () {
            if (有真人交互) return;
            var 随机延时 = 100 + Math.floor(Math.random() * 200); // 随机化，避免被脚本按固定节奏绕过
            setTimeout(function () { if (!有真人交互) blockPage("score:" + 分 + "[" + 扣分明细.join(",") + "]"); }, 随机延时);
        }, SCORE_WAIT_MS);
    }

    // 7.2 行为层：页面「可见」累计观察 BEHAVIOR_WINDOW_MS，其间一次真实交互都没有 → 拦
    //     为什么按「可见」计时：新标签页在后台加载、用户还没切过去，不该算他「不动手」（那是误杀大头）
    //     为什么隐藏时停表：后台标签一直跑定时器会白耗电（手机端尤其明显）
    if (BEHAVIOR_ENFORCE) {
        var 已用毫秒 = 0, 步进 = 250, 计时器 = null;
        function 到点判定() {
            try {
                已用毫秒 += 步进;
                if (有真人交互) { 停表(); return; }
                if (已用毫秒 >= BEHAVIOR_WINDOW_MS) { 停表(); blockPage("no-interaction"); }
            } catch (e) { /* 静默 */ }
        }
        function 启动计时() { if (!计时器) 计时器 = setInterval(到点判定, 步进); }
        function 停表() { if (计时器) { clearInterval(计时器); 计时器 = null; } }
        try {
            if (document.visibilityState === "hidden") 停表(); else 启动计时();
            document.addEventListener("visibilitychange", function () {
                try { if (document.visibilityState === "hidden") 停表(); else 启动计时(); } catch (e) {}
            }, { passive: true });
        } catch (e) {}
    }
})();

/* ==== 2026-09-14 新增：清理 body 开头的孤立「>」文本节点（保留自 v4，勿删） ====
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
