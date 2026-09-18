/* ════════════════════════════════════════════════════════════════
   文件：js/home/01-early-loading-fallback.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：页面最早期性能兜底：1.8 秒内无论如何都显示主内容（慢网白屏救急）
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

/* 性能兜底（2026-09-14）：从 HTML 一开始解析就计时。
   本页原本要等「加载动画双 100%」才显示内容，而那个计时是从 main.js 执行后才开始的；
   在慢网（国内访问 GitHub 常年 2~6 秒/请求）下，等于先白等资源、再等动画兜底 —— 实测要 5 秒以上。
   这里提前挂一个硬计时：1.8 秒内无论如何都把内容显示出来（正常网速下动画 1 秒就播完了，不会被打断）（后台资源继续加载，各自就绪后自己补上）。
   注：main.js 里的 3 秒兜底保留，两者互为保险。 */
setTimeout(function () {
    var b = document.body;
    if (b && b.classList.contains("loading")) {
        b.classList.remove("loading");
        b.classList.add("page-show");
        var l = document.getElementById("loader");
        if (l) l.style.display = "none";
    }
}, 1800);
