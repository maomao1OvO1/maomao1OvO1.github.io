/* ════════════════════════════════════════════════════════════════
   文件：js/home/02-lowercase-host-redirect.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：域名大小写统一：GitHub Pages 大小写同站，Firebase 授权域名区分大小写 → 一律跳小写
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

// #maomao-lc-redirect 域名大小写统一：GitHub Pages 大小写同站，但 Firebase 授权域名区分大小写 → 强制全小写
if (location.hostname.indexOf("github.io") >= 0 && location.hostname !== location.hostname.toLowerCase()) {
  var __i = location.href.indexOf(location.host);
  location.replace(location.href.slice(0, __i) + location.hostname.toLowerCase() + location.href.slice(__i + location.host.length));
}
