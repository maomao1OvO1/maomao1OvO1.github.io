/* ════════════════════════════════════════════════════════════════
   文件：js/home/04-lazy-load-weather-tokens.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：按需加载：只在实际用到的页面/交互后才拉 weather.js 与 tokens.js
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

window.addEventListener("load", function(){
    ["weather.js?v=4", "tokens.js?v=3"].forEach(function(src){
        var el = document.createElement("script");
        el.src = src;
        el.async = true;
        document.body.appendChild(el);
    });
});
