/* ════════════════════════════════════════════════════════════════
   文件：js/home/07-td-update-button.js
   来源：2026-09-18 从 index.html 内联脚本原样拆分（内容逐字节未改，只搬了位置）
   用途：塔防更新日志按钮交互
   注意：页面里用 <script src> 同步引入（无 defer），保证与拆分前完全相同的执行时机
   ═══════════════════════════════════════════════════════════════ */

(function(){
  var b = document.getElementById('tdUpdateBtn');
  if (!b) return;
  b.addEventListener('click', function(){
    b.textContent = '🔍 正在检查…';
    fetch('games/td/version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j){
        b.textContent = '🔄 检查更新（看是否已是最新版）';
        var msg = '最新版本：v' + j.version + '（' + j.versionCode + '）'
                + (j.date ? '\n发布时间：' + j.date : '')
                + (j.size ? '\n安装包大小：' + j.size : '')
                + (j.note ? '\n更新内容：' + j.note : '')
                + '\n\n要现在下载吗？';
        if (confirm(msg)){
          location.href = j.url || 'games/td/maomao-td-latest.apk';
        }
      })
      .catch(function(e){
        b.textContent = '🔄 检查更新（看是否已是最新版）';
        alert('检查更新失败：' + (e && e.message ? e.message : '网络不可用'));
      });
  });
})();
