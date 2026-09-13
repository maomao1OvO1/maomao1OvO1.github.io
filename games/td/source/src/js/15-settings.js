/* ══════════════════════════════════════════════════════════════════════════
 * 15-settings.js —— 设置面板：音效 / 画质 / 清档
 *
 * 来源：game.html 第 5670-5791 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 设置面板（音效 / 画质 / 清档） ================= */
var LOW_FX = false;    // 低画质（关光效）玩家选择；真正的实现由另一路补丁的 setLowFX 负责
var setFrom = 'start'; // 设置面板来源：'start' 首页 / 'pause' 暂停面板
var clearArm = false;  // 清档二次确认开关
/* 从 localStorage 读取设置（音效/画质/音乐/敌人美术等），启动时调用 */
function loadSettings(){
  try {
    var raw = localStorage.getItem('td_settings');
    if (!raw) return;
    var o = JSON.parse(raw);
    if (o && typeof o.sfx === 'boolean') SFX_ON = o.sfx;
    if (o && typeof o.fx === 'boolean') LOW_FX = o.fx;
    if (o && typeof o.mus === 'boolean') MUSIC_ON = o.mus;
    if (o && typeof o.brief === 'boolean'){ UI_BRIEF = o.brief; applyUiBrief(); }                       /* v8.14 文字详略 */
    if (o && typeof o.art === 'string'){                                                /* v8.11 敌人美术 */
      for (var _ai = 0; _ai < ENEMY_ART_LIST.length; _ai++)
        if (ENEMY_ART_LIST[_ai].key === o.art){ ENEMY_ART = o.art; enemyTex = {}; }
    }
  } catch (e) {}
}
/* 把当前设置写回 localStorage（设置项改动后调用）*/
function saveSettings(){
  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON, art: ENEMY_ART, brief: UI_BRIEF })); } catch (e) {}
}
/* 在设置面板底部显示一行状态文字（同步各种操作反馈）*/
function setMsg(txt, color){
  var el = document.getElementById('setMsg');
  if (el){ el.textContent = txt || '--'; el.style.color = color || '#8ff0ff'; }
}
/* 同步设置面板各按钮的文案与状态（音效/画质/音乐/文字模式/敌人美术等）*/
function syncSetBtns(){
  var a = document.getElementById('setSfxBtn');
  if (a) a.textContent = SFX_ON ? '🔊 音效：开' : '🔇 音效：关（已静音）';
  var b = document.getElementById('setFxBtn');
  if (b) b.textContent = LOW_FX ? '🐢 画质：低（关光效）' : '✨ 画质：高（开光效）';
  var m = document.getElementById('setMusBtn');
  if (m) m.textContent = MUSIC_ON ? '🎵 音乐：开' : '🔕 音乐：关';
  var c = document.getElementById('setClearBtn');
  if (c) c.textContent = clearArm ? '⚠️ 再点一次确认清除' : '🗑 清除进度';
}
/* 应用低画质开关：容错调用 setLowFX，补丁未合入时静默跳过不抛错 */
function applyLowFX(v){
  // 容错：LOWFX / setLowFX 由另一路补丁提供，未合入或未定义时静默跳过（不抛错、不假设存在）
  if (typeof setLowFX === 'function') { try { setLowFX(v); } catch (e) {} }
  else if (typeof LOWFX !== 'undefined') { try { LOWFX = v; } catch (e) {} }
}
/* 打开设置面板（from='pause' 表示从暂停菜单进来的，返回时要回到暂停面板）*/
function showSet(from){
  var _bf = document.getElementById('setBriefBtn');                                    /* v8.14 同步文字模式文案 */
  if (_bf) _bf.textContent = '📄 文字模式：' + (UI_BRIEF ? '简易' : '详细');
  var _ab3 = document.getElementById('setArtBtn');                                      /* v8.11 同步美术按钮文案 */
  if (_ab3) _ab3.textContent = '🎨 敌人美术：' + enemyArtName(ENEMY_ART);
  setFrom = (from === 'pause') ? 'pause' : 'start';
  clearArm = false;
  syncSetBtns();
  setMsg('--');
  hideAll();   // 先收起全部面板（含 setOv），下面再单独放出设置面板
  var el = document.getElementById('setOv');
  if (el) el.classList.remove('hidden');
}
/* 关闭设置面板；从暂停进来的则恢复暂停面板，否则回到首页 */
function hideSet(){
  var el = document.getElementById('setOv');
  if (el) el.classList.add('hidden');
  if (setFrom === 'pause'){
    // 从暂停进来的：保持暂停不动，只把暂停面板放回来
    paused = true;
    var p = document.getElementById('pauseOv');
    if (p) p.classList.remove('hidden');
  } else {
    var s = document.getElementById('startOv');
    if (s) s.classList.remove('hidden');
  }
  SFX.click();
}
/* 切换音效开关并立即存档（设置面板按钮）*/
function toggleSfx(){
  SFX_ON = !SFX_ON;
  saveSettings();
  syncSetBtns();
  setMsg(SFX_ON ? '音效已开启' : '音效已静音', '#7cf5c0');
  SFX.click();
}
/* 切换背景音乐开关：开启就立刻播放、关闭就暂停，并存档 */
function toggleMus(){
  MUSIC_ON = !MUSIC_ON;
  if (MUSIC_ON) bgmPlay(); else bgmPause();
  saveSettings();
  syncSetBtns();
  setMsg(MUSIC_ON ? '背景音乐已开启' : '背景音乐已关闭', '#7cf5c0');
  SFX.click();
}
/* 切换画质（高/低光效）并立即应用与存档 */
function toggleFx(){
  LOW_FX = !LOW_FX;
  saveSettings();
  applyLowFX(LOW_FX);
  syncSetBtns();
  setMsg(LOW_FX ? '低画质：已关闭发光特效，帧率更稳' : '高画质：发光特效已开启', '#7cf5c0');
  SFX.click();
}
/* 清空存档：第一次点击只进入二次确认状态，再点一次才真正清除（防误触）*/
function clearProgress(){
  if (!clearArm){
    clearArm = true;
    syncSetBtns();
    setMsg('再点一次「确认清除」，会清空关卡进度与最高纪录', '#ffb27a');
    SFX.click();
    return;
  }
  clearArm = false;
  try {
    localStorage.removeItem('td_prog');
    localStorage.removeItem('td_best');
    localStorage.removeItem('td_endless_best');
  } catch (e) {}
  prog = { unlocked: 1, best: {} };
  syncSetBtns();
  setMsg('进度已清除（重进游戏生效）', '#ffd76a');
  SFX.coin();
}

