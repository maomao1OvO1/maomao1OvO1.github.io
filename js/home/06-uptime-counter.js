/* ════════════════════════════════════════════════════════════════
   文件：js/home/06-uptime-counter.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：网站运行时长计时（以「网站生日」为基准）
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

// 上线起始时间（网站「生日」），用它作为计时基准
let startTime = new Date("2026-07-30T15:00:00")
function updateTime() {
    let now = new Date();
    let diff = now - startTime;   // 距今的毫秒差

    let seconds = Math.floor(diff / 1000);
    let years = Math.floor(seconds / 31536000); // 一年按 365 天算
    let days = Math.floor((seconds % 31536000) / 86400); // 除掉整年后剩的天
    let hours = Math.floor((seconds % 86400) / 3600);   // 天数里剩的小时
    let minutes = Math.floor((seconds % 3600) / 60);    // 小时里剩的分钟
    let sec = seconds % 60;                            // 分钟里剩的秒

    // 拼成「本站已运行X年X天X小时X分X秒」显示
    document.getElementById("runtime").innerHTML =
    "本站已运行：" +
    years + "年 " +
    days + "天 " +
    hours + "小时 " +
    minutes + "分钟 " +
    sec + "秒";
}

// 每 1 秒刷新一次计时
setInterval(updateTime, 1000);
// 页面加载后立刻显示一次
updateTime();
