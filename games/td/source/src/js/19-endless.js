/* ══════════════════════════════════════════════════════════════════════════
 * 19-endless.js —— 无尽模式：中途存档、续玩、最佳记录
 *
 * 来源：game.html 第 5990-6129 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 无尽模式（localStorage: td_endless_best） ================= */
var endless = false;                              // true = 当前处于无尽模式
/* 无尽模式是否已解锁（通关第 1 关或已打通第 1 关即解锁）*/
function endlessUnlocked(){ return prog.unlocked >= 2 || (prog.best[0] || 0) > 0; }
/* 读取无尽模式历史最高波次（localStorage）*/
function endlessBest(){
  var v = 0;
  try { v = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) { v = 0; }
  return v;
}
/* 无尽模式下若本局波次破纪录则写回存档并返回新纪录（返回 0 表示非无尽或没破纪录）*/
function saveEndlessBest(){
  if (!endless) return 0;
  var b = endlessBest();
  if (wave > b){
    b = wave;
    try { localStorage.setItem('td_endless_best', String(b)); } catch (e) {}
  }
  return b;
}
/* ===== v5.8 首页战绩（读取本地存档，给主界面"游戏感"） ===== */
function renderHome(){
  var el = document.getElementById('homeStats');
  if (!el) return;
  var best = 0, eBest = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) { best = 0; }
  try { eBest = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) { eBest = 0; }
  var stars = 0;
  if (prog && prog.stars){
    for (var k in prog.stars) if (prog.stars.hasOwnProperty(k)) stars += (prog.stars[k] || 0);
  }
  var unl = (prog && prog.unlocked) ? Math.min(prog.unlocked, LEVELS.length) : 1;
  el.innerHTML =
    '<span class="st">🏆 最高波次 <b>' + (best || '—') + '</b></span>' +
    '<span class="st">♾ 无尽 <b>' + (eBest || '—') + '</b></span>' +
    '<span class="st">🗺 已解锁 <b>' + unl + '/' + LEVELS.length + '</b></span>' +
    '<span class="st">⭐ 星数 <b>' + stars + '/' + (LEVELS.length * 3) + '</b></span>';
  /* v8.18：网格入口写上「当前是什么状态」——无尽有存档就写第几波、每日打过就打勾 */
  var sv = null;
  try { sv = loadEndlessSave(); } catch (e) { sv = null; }
  var eBtn = document.getElementById('homeEndlessBtn');
  if (eBtn) eBtn.innerHTML = '<span class="ti">♾</span><span>'
    + (sv ? ('继续 ' + sv.wave + ' 波') : '无尽') + '</span>';
  var dBtn = document.getElementById('homeDailyBtn');
  if (dBtn) dBtn.innerHTML = '<span class="ti">📅</span><span>'
    + (dailyDoneToday() ? '每日 ✓' : '每日挑战') + '</span>';
  var hint = document.getElementById('homeHint');
  if (hint){
    if (sv) hint.textContent = '💾 上次的无尽进度还在 · 点「继续 ' + sv.wave + ' 波」接着打';
    else if (prog && prog.tutorialDone) hint.textContent = '';
    else hint.textContent = '🎓 第一次玩？先过一遍新手教学（6 波、5 步引导）';
  }
  /* v9.3：冷启动时主界面先以 .boot 隐藏，等这一帧把战绩/提示/菜单都渲染完再显示 ——
     否则浏览器会先画一帧「空战绩 + 无尽」的旧态，再补渲染，肉眼就是「闪一下」。 */
  var _so = document.getElementById('startOv');
  if (_so && _so.classList) _so.classList.remove('boot');
}
/* ===== v6.8 存档分享：导出成一段码，别人粘贴就能用（纯离线、无服务器） ===== */
function saveChecksum(b64){
  var sum = 0;
  for (var i = 0; i < b64.length; i++) sum = (sum * 31 + b64.charCodeAt(i)) % 65536;
  return ('000' + sum.toString(16)).slice(-4);
}
/* 把关卡进度、星数、成就、天赋等打包编码成一段可分享的存档码（分享按钮用）*/
function saveEncode(){
  var d = {
    p: { u: (prog && prog.unlocked) || 1,
         b: (prog && prog.best) || {},
         s: (prog && prog.stars) || {},
         t: (prog && prog.tutorialDone) ? 1 : 0 },
    e: parseInt((function(){ try { return localStorage.getItem('td_endless_best') || '0'; } catch (e) { return '0'; } })(), 10) || 0,
    m: parseInt((function(){ try { return localStorage.getItem('td_best') || '0'; } catch (e) { return '0'; } })(), 10) || 0
  };
  var b64 = '';
  try { b64 = btoa(JSON.stringify(d)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); } catch (e) { return ''; }
  return 'MTD1-' + b64 + '-' + saveChecksum(b64);
}
/* 解析玩家粘贴的存档码：从整段文本里抠出码并校验，成功则写回本地进度，返回是否导入成功 */
function saveDecode(code){
  code = String(code || '').replace(/\s+/g, '');
  /* v8.27 修毛毛报的「直接粘贴分享原文会提示不可以」：
     分享出去的文本是「【共鸣之塔】我的存档码（…）：\nMTD1-xxx-xxxx」——
     带了中文前后缀。原来这里用 ^...$ 强制整串匹配 → 一带中文就判定格式错误。
     现在改成**从整段文本里把码抠出来**（去掉 ^ 和 $），玩家直接整段复制粘贴也能导入。
     注意仍要求校验和正确：粘贴残缺/被改过的码照样会被拒绝。 */
  var m = code.match(/MTD1-([A-Za-z0-9_-]+)-([0-9a-f]{4})/);
  if (!m) return null;
  var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
  if (saveChecksum(b64) !== m[2]) return null;                 // 校验和不符 → 拒绝（防粘贴残缺）
  try { return JSON.parse(atob(b64)); } catch (e) { return null; }
}
/* 导入合并：只增不减 —— 别人的存档不会把你的进度拉低 */
function saveImport(code){
  var d = saveDecode(code);
  if (!d || !d.p) return '没找到有效的存档码：整段复制（含前后文字也行）再试一次';
  if (!prog.best) prog.best = {};
  if (!prog.stars) prog.stars = {};
  var before = { u: prog.unlocked || 1, b: 0, s: 0 };
  for (var k in prog.best) if (prog.best[k] > before.b) before.b = prog.best[k];
  for (var k2 in prog.stars) before.s += (prog.stars[k2] || 0);
  if (d.p.u > (prog.unlocked || 1)) prog.unlocked = Math.min(LEVELS.length, d.p.u);
  var kb;
  for (kb in (d.p.b || {})) if ((d.p.b[kb] || 0) > (prog.best[kb] || 0)) prog.best[kb] = d.p.b[kb];
  for (kb in (d.p.s || {})) if ((d.p.s[kb] || 0) > (prog.stars[kb] || 0)) prog.stars[kb] = d.p.s[kb];
  if (d.p.t) prog.tutorialDone = true;
  saveProg();
  try {
    if (d.m > (parseInt(localStorage.getItem('td_best') || '0', 10) || 0)) localStorage.setItem('td_best', String(d.m));
    if (d.e > (parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0)) localStorage.setItem('td_endless_best', String(d.e));
  } catch (e) {}
  renderHome();
  return '导入成功！解锁 ' + (prog.unlocked || 1) + ' 关 · 星数 ' + (function(){
    var t = 0; for (var k3 in prog.stars) t += (prog.stars[k3] || 0); return t;
  })() + ' · 无尽最高 ' + (function(){ try { return localStorage.getItem('td_endless_best') || 0; } catch (e) { return 0; } })() + ' 波';
}
/* 复制文本到剪贴板：优先走 Android 原生桥，其次用 navigator.clipboard，都不可用返回 false */
function saveToClipboard(txt){
  try {
    if (window.Android && Android.copySave) { Android.copySave(txt); return true; }
  } catch (e) {}
  try { if (navigator.clipboard) { navigator.clipboard.writeText(txt); return true; } } catch (e) {}
  return false;
}
/* 调起系统分享（Android 原生桥），环境不支持返回 false */
function saveShareText(txt){
  try {
    if (window.Android && Android.shareSave) { Android.shareSave(txt); return true; }
  } catch (e) {}
  return false;
}
/* 收起所有全屏弹层（含结算/暂停/设置/图鉴/开幕提示），并刷新首页战绩、清掉选卡状态 */
function hideAll(){
  hintBar(false); menuPause = false;
  renderHome();   // 每次收起弹窗（含返回首页）时刷新战绩
  setSkipBtnVisible(false); banMode = false;   /* v8.13：隐藏弹层时顺手清掉「选卡/禁卡」状态，避免残留 */
  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv','introOv','updOv','verOv'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.classList.add('hidden');
  });
  tutBarSync();          /* TUTORIAL_PATCH_V1：教学任务条随模式一起收起 / 放出 */
  var _rhh = document.getElementById('rotHint'); if (_rhh) _rhh.style.display = 'none';   /* v8.23：收起弹层时也收掉竖屏提示 */
  resize();              /* 重新按当前尺寸判定横竖屏（弹层开合会改变可用高度）*/
  var tdo = document.getElementById('tutDoneOv'); if (tdo) tdo.classList.add('hidden');
}

