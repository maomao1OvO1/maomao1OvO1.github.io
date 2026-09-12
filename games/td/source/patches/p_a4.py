# -*- coding: utf-8 -*-
# p_a4.py —— 《共鸣之塔》v4.1 补丁：① 无尽模式 ② 三星评价
# 用法: python3 p_a4.py [目标html]   （默认 /data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html）
# 原则: 每处「整段精确匹配」+ 唯一性断言，不唯一立即报错退出，原文件不被破坏。
import io, sys, os

DEFAULT = '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT

# ---------------- ① HTML：#clearOv 增加星数显示 ----------------
OLD_CLEAROV = """<div class="ov hidden" id="clearOv">
  <h1>关卡完成</h1>
  <div class="sub" id="clearInfo">--</div>"""
NEW_CLEAROV = """<div class="ov hidden" id="clearOv">
  <h1>关卡完成</h1>
  <div id="clearStars" style="font-size:40px;line-height:1.15;letter-spacing:10px;color:#ffd76a;text-shadow:0 0 22px rgba(255,200,60,.8);">☆☆☆</div>
  <div class="sub" id="clearNewRec" style="font-size:12px;color:#7cf5c0;display:none;">--</div>
  <div class="sub" id="clearInfo">--</div>"""

# ---------------- ② HTML：#overOv 增加无尽最高波次 ----------------
OLD_OVEROV = """  <div class="sub" style="font-size:12px">击杀 <span id="ovKills">0</span> · 建塔 <span id="ovTowers">0</span> · 最高波次 <span id="ovBest">0</span></div>
  <button class="btn" id="againBtn">再来一局</button>"""
NEW_OVEROV = """  <div class="sub" style="font-size:12px">击杀 <span id="ovKills">0</span> · 建塔 <span id="ovTowers">0</span> · 最高波次 <span id="ovBest">0</span></div>
  <div class="sub" id="ovEndless" style="display:none;font-size:13px;color:#ffd76a;">♾ 无尽最高波次 0</div>
  <button class="btn" id="againBtn">再来一局</button>"""

# ---------------- ③ 主循环：无尽模式不触发「关卡完成」 ----------------
OLD_GUARD = """        if (wave >= WAVES_TOTAL){ levelClear(); return; }"""
NEW_GUARD = """        if (!endless && wave >= WAVES_TOTAL){ levelClear(); return; }   // 无尽模式永不结算，继续下一波"""

# ---------------- ④ 存档字段 + 星数/无尽工具函数 ----------------
OLD_PROG = """var prog = { unlocked: 1, best: {} };
try { var pj = JSON.parse(localStorage.getItem('td_prog') || '{}'); if (pj && pj.unlocked) prog = pj; } catch (e) {}
function saveProg(){ try { localStorage.setItem('td_prog', JSON.stringify(prog)); } catch (e) {} }"""
NEW_PROG = """var prog = { unlocked: 1, best: {}, stars: {} };
try { var pj = JSON.parse(localStorage.getItem('td_prog') || '{}'); if (pj && pj.unlocked) prog = pj; } catch (e) {}
/* 旧存档兼容：td_prog 里可能没有 stars / best 字段，读档后兜底初始化 */
if (!prog.stars) prog.stars = {};
if (!prog.best) prog.best = {};
function saveProg(){ try { localStorage.setItem('td_prog', JSON.stringify(prog)); } catch (e) {} }
/* ================= 三星评价（按剩余基地血量，MAXHP = 20） ================= */
function starsForHp(v){ return v >= 18 ? 3 : (v >= 12 ? 2 : 1); }
function starStr(n){
  n = Math.max(0, Math.min(3, n | 0));
  var t = '';
  for (var i = 0; i < 3; i++) t += (i < n ? '★' : '☆');
  return t;
}
/* ================= 无尽模式（localStorage: td_endless_best） ================= */
var endless = false;                              // true = 当前处于无尽模式
function endlessUnlocked(){ return prog.unlocked >= 2 || (prog.best[0] || 0) > 0; }
function endlessBest(){
  var v = 0;
  try { v = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) { v = 0; }
  return v;
}
function saveEndlessBest(){
  if (!endless) return 0;
  var b = endlessBest();
  if (wave > b){
    b = wave;
    try { localStorage.setItem('td_endless_best', String(b)); } catch (e) {}
  }
  return b;
}"""

# ---------------- ⑤ 选关界面：星数 + 无尽按钮 ----------------
OLD_LEVELS = """      b.textContent = L.name + '   ' + L.waves + '波' + (best ? '  ★最佳' + best : '') + (locked ? '   🔒' : '');
      if (!locked) b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); });
      wrap.appendChild(b);
    })(i);
  }
  document.getElementById('levelsOv').classList.remove('hidden');"""
NEW_LEVELS = """      var st = prog.stars[i] || 0;            // 已得星数（未通关不显示）
      b.textContent = L.name + '   ' + L.waves + '波' + (best ? '  ★最佳' + best : '')
        + (st > 0 ? '  ' + starStr(st) : '') + (locked ? '   🔒' : '');
      if (st > 0) b.style.color = '#ffd76a';
      if (!locked) b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); });
      wrap.appendChild(b);
    })(i);
  }
  /* ♾ 无尽模式：至少通关过第 1 关才解锁（prog.unlocked >= 2 或 prog.best[0] 存在） */
  (function(){
    var u = endlessUnlocked(), eb = endlessBest();
    var eb2 = document.createElement('button');
    eb2.className = 'btn';
    eb2.id = 'endlessBtn';
    eb2.style.cssText = 'margin-top:8px;padding:13px 18px;font-size:15px;letter-spacing:2px;width:100%;'
      + (u ? 'border-color:rgba(255,200,90,.6);background:linear-gradient(180deg,rgba(150,90,20,.9),rgba(90,50,12,.9));color:#ffe6a8;'
           : 'opacity:.4;background:rgba(40,50,70,.7)');
    eb2.textContent = '♾ 无尽模式' + (eb > 0 ? '   最高' + eb + '波' : (u ? '   波次无上限' : '')) + (u ? '' : '   🔒');
    if (u) eb2.addEventListener('click', function(e){ e.stopPropagation(); startEndless(); });
    wrap.appendChild(eb2);
  })();
  document.getElementById('levelsOv').classList.remove('hidden');"""

# ---------------- ⑥ startLevel：进入普通关卡时退出无尽 ----------------
OLD_STARTLV = """function startLevel(i){
  lvIndex = i;
  WAYPOINTS = LEVELS[i].path;
  WAVES_TOTAL = LEVELS[i].waves;"""
NEW_STARTLV = """function startLevel(i){
  endless = false;                 // 普通关卡：关闭无尽模式标记
  lvIndex = i;
  WAYPOINTS = LEVELS[i].path;
  WAVES_TOTAL = LEVELS[i].waves;"""

# ---------------- ⑦ 新增 startEndless() ----------------
OLD_AFTER_STARTLV = """  initAudio(); startWave(); updateHud();
}
function resumeGame(){"""
NEW_AFTER_STARTLV = """  initAudio(); startWave(); updateHud();
}
/* 无尽模式：地图固定用第 1 关，波次无上限（WAVES_TOTAL=999），难度沿用原公式继续攀升 */
function startEndless(){
  startLevel(0);
  endless = true;
  WAVES_TOTAL = 999;
  document.getElementById('lvName').textContent = '♾ 无尽';
  hintBar(false);
  showBanner('♾ 无尽模式');
}
function resumeGame(){"""

# ---------------- ⑧ 暂停面板：无尽模式显示不封顶 ----------------
OLD_PAUSE = """  document.getElementById('pauseInfo').textContent = LEVELS[lvIndex].name + ' · 第 ' + wave + ' / ' + WAVES_TOTAL + ' 波 · 击杀 ' + kills;"""
NEW_PAUSE = """  document.getElementById('pauseInfo').textContent = (endless ? '♾ 无尽模式' : LEVELS[lvIndex].name)
    + ' · 第 ' + wave + (endless ? '' : ' / ' + WAVES_TOTAL) + ' 波 · 击杀 ' + kills;"""

# ---------------- ⑨ levelClear：三星结算 ----------------
OLD_CLEAR = """  if (prog.unlocked < lvIndex + 2) prog.unlocked = Math.min(LEVELS.length, lvIndex + 2);
  saveProg();
  document.getElementById('clearInfo').textContent = LEVELS[lvIndex].name + ' 通关！击杀 ' + kills + ' · 建塔 ' + built;
  document.getElementById('clearOv').classList.remove('hidden');"""
NEW_CLEAR = """  if (prog.unlocked < lvIndex + 2) prog.unlocked = Math.min(LEVELS.length, lvIndex + 2);
  /* 三星评价：本次按剩余血量定星，只保留历史最好值 */
  var st = starsForHp(hp);
  if (!prog.stars) prog.stars = {};
  var s0 = prog.stars[lvIndex] || 0;
  var isNew = st > s0;
  if (isNew) prog.stars[lvIndex] = st;
  saveProg();
  var stEl = document.getElementById('clearStars');
  if (stEl) stEl.textContent = starStr(st);
  var nrEl = document.getElementById('clearNewRec');
  if (nrEl){
    nrEl.style.display = 'block';
    nrEl.textContent = isNew
      ? '🎉 新纪录！剩余血量 ' + hp + ' → ' + st + ' 星'
      : '本次 ' + st + ' 星 · 历史最好 ' + Math.max(st, s0) + ' 星';
  }
  document.getElementById('clearInfo').textContent = LEVELS[lvIndex].name + ' 通关！击杀 ' + kills + ' · 建塔 ' + built;
  document.getElementById('clearOv').classList.remove('hidden');"""

# ---------------- ⑩ gameOver：无尽最高波次入档 + 结算显示 ----------------
OLD_OVERR = """  document.getElementById('ovBest').textContent = best;
  document.getElementById('overOv').classList.remove('hidden');"""
NEW_OVERR = """  document.getElementById('ovBest').textContent = best;
  var eb = saveEndlessBest();                  // 无尽模式：取最大值写入 td_endless_best
  var ebEl = document.getElementById('ovEndless');
  if (ebEl){
    ebEl.style.display = endless ? 'block' : 'none';
    ebEl.textContent = '♾ 无尽最高波次 ' + eb;
  }
  document.getElementById('overOv').classList.remove('hidden');"""

# ---------------- ⑪ 按钮：无尽模式重开 / 退出时记录 ----------------
OLD_BTN_RESTART = """  on('restartBtn', function(){ startLevel(lvIndex); });"""
NEW_BTN_RESTART = """  on('restartBtn', function(){ if (endless) startEndless(); else startLevel(lvIndex); });"""
OLD_BTN_TOLV = """  on('toLevelsBtn', function(){ running = false; paused = false; showLevels(); });"""
NEW_BTN_TOLV = """  on('toLevelsBtn', function(){ if (endless) saveEndlessBest(); running = false; paused = false; showLevels(); });"""

# ---------------- ⑬ 暂停恢复：无尽模式不重新打开新手提示栏 ----------------
OLD_RESUME = """  hideAll(); hintBar(lvIndex === 0); paused = false; menuPause = false; running = true; last = 0;"""
NEW_RESUME = """  hideAll(); hintBar(!endless && lvIndex === 0); paused = false; menuPause = false; running = true; last = 0;"""

PATCHES = [
    ('① #clearOv 增加星数/新纪录行',            OLD_CLEAROV,     NEW_CLEAROV),
    ('② #overOv 增加无尽最高波次行',            OLD_OVEROV,      NEW_OVEROV),
    ('③ 主循环：无尽模式不触发 levelClear',      OLD_GUARD,       NEW_GUARD),
    ('④ 存档字段 stars + 星数/无尽工具函数',    OLD_PROG,        NEW_PROG),
    ('⑤ 选关界面：关卡星数 + ♾ 无尽按钮',      OLD_LEVELS,      NEW_LEVELS),
    ('⑥ startLevel 关闭 endless 标记',          OLD_STARTLV,     NEW_STARTLV),
    ('⑦ 新增 startEndless()',                   OLD_AFTER_STARTLV, NEW_AFTER_STARTLV),
    ('⑧ 暂停面板无尽文案',                      OLD_PAUSE,       NEW_PAUSE),
    ('⑨ levelClear 三星结算',                   OLD_CLEAR,       NEW_CLEAR),
    ('⑩ gameOver 无尽最高波次',                 OLD_OVERR,       NEW_OVERR),
    ('⑪ restartBtn 无尽重开',                   OLD_BTN_RESTART, NEW_BTN_RESTART),
    ('⑫ toLevelsBtn 退出时记录无尽波次',        OLD_BTN_TOLV,    NEW_BTN_TOLV),
    ('⑬ resumeGame 无尽模式不重开提示栏',        OLD_RESUME,      NEW_RESUME),
]

if not os.path.isfile(target):
    print('❌ 目标文件不存在: ' + target); sys.exit(1)
s = io.open(target, encoding='utf-8').read()

# 幂等保护：已打过补丁则直接退出
if 'function startEndless()' in s and 'td_endless_best' in s and 'starsForHp' in s:
    print('⚠️ 目标文件看起来已经打过本补丁（检测到 startEndless / td_endless_best / starsForHp），未做修改。')
    sys.exit(0)

for label, old, new in PATCHES:
    n = s.count(old)
    if n != 1:
        print('❌ 补丁点不唯一: ' + label + '  (匹配 ' + str(n) + ' 次，期望 1 次)')
        sys.exit(1)
    s = s.replace(old, new)
    print('✅ ' + label)

io.open(target, 'w', encoding='utf-8').write(s)
print('🎉 共 ' + str(len(PATCHES)) + ' 处替换完成 → ' + target)
