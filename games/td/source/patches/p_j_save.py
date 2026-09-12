#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.9 无尽模式中途存档/续玩 + 玩法说明详细化
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 存档核心（放在 startEndless 之前）
sub("""function startEndless(){""",
"""/* ===== v5.9 无尽模式中途存档：每波结束自动存一次，也可手动「保存并退出」 ===== */
var ENDLESS_SAVE_KEY = 'td_endless_save';
function saveEndless(silent){
  if (!endless || !running) return;
  try {
    var list = [];
    for (var i = 0; i < towers.length; i++){
      var t = towers[i];
      list.push({ c:t.c, r:t.r, e:t.elem, lv:t.lv, paid:t.paid || 0 });
    }
    localStorage.setItem(ENDLESS_SAVE_KEY, JSON.stringify({
      v: 1, wave: wave, gold: gold, hp: hp, maxhp: MAXHP, kills: kills, built: built,
      towers: list, buffs: BUFFS, best: 0, t: Date.now()
    }));
    if (!silent) showTip('💾 进度已保存（第 ' + wave + ' 波）');
  } catch (e) {}
}
function loadEndlessSave(){
  try {
    var raw = localStorage.getItem(ENDLESS_SAVE_KEY);
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (!d || !d.wave) return null;
    return d;
  } catch (e) { return null; }
}
function clearEndlessSave(){ try { localStorage.removeItem(ENDLESS_SAVE_KEY); } catch (e) {} }
/* 从存档续玩：重建塔、金币、血量、强化 */
function resumeEndless(){
  var sv = loadEndlessSave();
  if (!sv) return false;
  startEndless();
  wave = sv.wave || 1;
  gold = sv.gold || 0;
  MAXHP = sv.maxhp || 20;
  hp = Math.min(sv.hp || MAXHP, MAXHP);
  kills = sv.kills || 0; built = sv.built || 0;
  if (sv.buffs && sv.buffs.el){ BUFFS = sv.buffs; }
  towers = []; grid = {};
  var list = sv.towers || [];
  for (var i = 0; i < list.length; i++){
    var d = list[i], def = ELEMS[d.e];
    if (!def || isPath(d.c, d.r) || grid[d.c + ',' + d.r]) continue;
    var t = { c:d.c, r:d.r, elem:d.e, lv:d.lv || 1, exp:0, cd:0, ang:-Math.PI/2, res:null,
              buildT:0, flash:0, fresh:0, paid:d.paid || def.cost };
    towers.push(t); grid[d.c + ',' + d.r] = t;
  }
  recalcResonance();
  enemies = []; spawnQueue = []; curGroup = null; beams = []; floats = []; parts = [];
  waveActive = false; waveBreak = 1.2;
  document.getElementById('wave').textContent = wave;
  updateHud(); updateWaveInfo();
  showBanner('继续无尽 · 第 ' + wave + ' 波');
  startWave();
  return true;
}
function startEndless(){""", '存档核心')

# ② 每波结束自动存档（无尽模式）
sub("""      /* 无尽模式：基地血量随波次成长（每 5 波 +5，上限 60）并每波回 2 血""",
"""      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）
      /* 无尽模式：基地血量随波次成长（每 5 波 +5，上限 60）并每波回 2 血""", '自动存档')

# ③ 暂停面板加「保存并退出」（仅无尽显示）
sub("""  <button class="btn" id="setBtn2" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">⚙ 设置</button>
</div>""",
"""  <button class="btn" id="endSaveBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(30,80,60,.9);display:none;">💾 保存并退出</button>
  <button class="btn" id="setBtn2" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">⚙ 设置</button>
</div>""", '暂停页保存按钮')
sub("""  document.getElementById('pauseOv').classList.remove('hidden');
  hideSel();""",
"""  document.getElementById('pauseOv').classList.remove('hidden');
  var esb = document.getElementById('endSaveBtn');
  if (esb) esb.style.display = endless ? 'block' : 'none';
  hideSel();""", '暂停页显示保存按钮')
sub("""  on('resumeBtn', resumeGame);""",
"""  on('resumeBtn', resumeGame);
  on('endSaveBtn', function(){
    if (!endless) return;
    saveEndless(false);
    running = false; paused = false; endless = false;
    showLevels();
  });""", '保存并退出绑定')

# ④ 无尽入口显示「继续无尽（第 N 波）」
sub("""    eb2.id = 'endlessBtn';""",
"""    eb2.id = 'endlessBtn';
    var svNow = loadEndlessSave();""", '读取存档')
sub("""  var eb2 = document.createElement('button');""",
"""  var eb2 = document.createElement('button');
  var _sv = loadEndlessSave();""", '提前读档')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_j_save 完成（阶段一）')
