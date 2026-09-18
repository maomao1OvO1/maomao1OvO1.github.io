/* ════════════════════════════════════════════════════════════════
   文件：js/home/05-clock.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：页头实时时钟
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

function showTime(){
    let now = new Date();

    // 取当前日期各部分
    let year = now.getFullYear();
    let month = now.getMonth() + 1;      // getMonth() 从 0 开始，所以要 +1 才是真实月份
    let day = now.getDate();

    // 取当前时间各部分
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();

    // 拼成中文风格时间串，写进 id=time 的 div
    document.getElementById("time").innerHTML =
        year + "年" + month + "月" + day + "日 " +
        hour + ":" + minute + ":" + second;
}

// 每 1 秒刷新一次
setInterval(showTime, 1000);
// 页面刚加载时立刻显示一次，避免开头 1 秒空白
showTime();
