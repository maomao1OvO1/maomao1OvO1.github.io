/* ════════════════════════════════════════════════════════════════
   文件：js/home/03-visitor-counter.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：访问人数计数：拉 Cloudflare Worker 接口，带本地缓存 + 三次重试
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

window.addEventListener("load", function () {
    var el = document.getElementById("visitor");
    if (!el) return;
    var KEY = "mm_visitors";
    var cached = null;
    try { cached = localStorage.getItem(KEY); } catch (e) {}
    if (cached) el.innerText = cached;          // ① 先用上次的值占位

    var URL_COUNTER = "https://maomao-counter.maomao1ovo1.workers.dev";

    // 别让人干等：4 秒还没结果就先把「加载中...」换成「—」，
    // 后台继续重试，一旦成功会覆盖成真实数字（体验上不再出现长时间转圈）。
    setTimeout(function () {
        if (el.innerText === "加载中...") el.innerText = "—";
    }, 4000);

    function attempt(n) {
        var ctl = ("AbortController" in window) ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 4500) : null;
        fetch(URL_COUNTER, ctl ? { signal: ctl.signal } : undefined)
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (data) {
                if (timer) clearTimeout(timer);
                if (data && data.visitors != null) {
                    el.innerText = data.visitors;
                    try { localStorage.setItem(KEY, String(data.visitors)); } catch (e) {}
                }
            })
            .catch(function () {
                if (timer) clearTimeout(timer);
                if (n < 3) {
                    setTimeout(function () { attempt(n + 1); }, 1200 * n);   // ② 退避重试
                } else if (!cached) {
                    el.innerText = "—";                                       // ③ 兜底不吓人
                }
            });
    }
    attempt(1);
});
