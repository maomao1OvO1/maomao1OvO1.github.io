#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""p_a5.py —— 《共鸣之塔》a5 补丁（两项）
  ① 建塔悔棋：新建的塔 5 秒内可全额退款拆除（普通出售只有 60%）
  ② 设置面板：音效开关 / 画质高·低 / 清除进度（首页 + 暂停面板入口）

默认目标：/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html
用法：python3 p_a5.py [目标html] [--dry]
      每处替换精确整段匹配，唯一性断言失败即报错退出（不写回）
"""
import io, sys, os

DEFAULT_TARGET = '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'

PATCHES = []
def add(label, old, new):
    PATCHES.append((label, old, new))

# ------------------------------------------------------------------ 1. 建塔悔棋
add('CSS：悔棋按钮配色',
    '''  #sel .sell{border-color:rgba(255,120,120,.4);background:rgba(70,30,40,.9);}''',
    '''  #sel .sell{border-color:rgba(255,120,120,.4);background:rgba(70,30,40,.9);}
  #sel .refund{border-color:rgba(255,215,106,.55);background:rgba(72,56,18,.92);}
  #sel .refund:active{background:rgba(130,100,30,.95);}''')

add('悔棋窗口常量 FRESH_TIME',
    '''function addTower(c, r, elem){
  var def = ELEMS[elem];''',
    '''var FRESH_TIME = 5;   // 建塔悔棋窗口（秒）：这段时间内拆塔全额退款，过后只剩 60% 残值出售
function addTower(c, r, elem){
  var def = ELEMS[elem];''')

add('塔对象加 fresh 倒计时字段',
    '''  var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0 };''',
    '''  var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME };''')

add('openBuild：清掉悔棋按钮标记',
    '''  sel.innerHTML = html;''',
    '''  sel.innerHTML = html;
  sel._refundShown = false;''')

add('openTower：悔棋全额退款按钮',
    '''    + '<button class="sell" data-sell="1">出售<br><span style="color:#ffb0b0">+' + sv + '</span></button>'
    + '</div>';
  sel.style.display = 'block'; placeMenu(px, py);''',
    '''    + '<button class="sell" data-sell="1">出售<br><span style="color:#ffb0b0">+' + sv + '</span></button>'
    + '</div>'
    + (t.fresh > 0
        ? ('<div class="row" style="margin-top:6px"><button class="refund" id="refundBtn" data-refund="1">↩ 全额退款（' + Math.ceil(t.fresh) + ' 秒）<br><span style="color:#ffe6a6">+' + d.cost + '</span></button></div>')
        : '');
  sel._refundShown = (t.fresh > 0);
  sel.style.display = 'block'; placeMenu(px, py);''')

add('面板点击：全额退款分支',
    '''  } else if (b.dataset.sell){
    var t3 = sel._tower;
    if (t3){
      gold += sellValue(t3); SFX.coin();
      towers.splice(towers.indexOf(t3), 1);
      delete grid[t3.c + ',' + t3.r];
      recalcResonance(); updateHud(); showTip('已出售');
    }
  }
  hideSel();''',
    '''  } else if (b.dataset.refund){
    // 建塔悔棋：5 秒内全额退款（普通出售只有 60%）
    var t4 = sel._tower;
    if (t4){
      var fIdx = towers.indexOf(t4);
      if (fIdx >= 0) towers.splice(fIdx, 1);
      delete grid[t4.c + ',' + t4.r];
      if (t4.fresh > 0){
        var fBack = ELEMS[t4.elem].cost;
        gold += fBack; SFX.coin();
        addFloat(cx(t4.c), cy(t4.r) - CELL * 0.4, '↩ 全额退款 +' + fBack, '#ffd76a');
        showTip('悔棋成功 · 全额退回 ' + fBack + ' 金币');
      } else {
        var fSv = sellValue(t4);
        gold += fSv; SFX.coin();
        showTip('悔棋时间已过 · 按残值 ' + fSv + ' 金币出售');
      }
      sel._refundShown = false;
      recalcResonance(); updateHud();
    }
  } else if (b.dataset.sell){
    var t3 = sel._tower;
    if (t3){
      gold += sellValue(t3); SFX.coin();
      towers.splice(towers.indexOf(t3), 1);
      delete grid[t3.c + ',' + t3.r];
      recalcResonance(); updateHud(); showTip('已出售');
    }
  }
  hideSel();''')

add('悔棋按钮倒计时刷新函数',
    '''function frame(now){
  requestAnimationFrame(frame);''',
    '''function syncRefundBtn(){
  // 悔棋按钮上的倒计时刷新（只在塔面板打开且按钮仍显示时执行）
  var t = sel._tower, b = (t && sel._refundShown) ? document.getElementById('refundBtn') : null;
  if (!b) return;
  if (!(t.fresh > 0)){ b.style.display = 'none'; sel._refundShown = false; return; }
  b.textContent = '↩ 全额退款（' + Math.ceil(t.fresh) + ' 秒） +' + ELEMS[t.elem].cost;
}
function frame(now){
  requestAnimationFrame(frame);''')

add('frame：悔棋倒计时递减',
    '''  // 特效
  for (var i = beams.length - 1; i >= 0; i--){ beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }''',
    '''  // 建塔悔棋窗口倒计时（面板打开时也照常走秒；暂停时才冻结，保证不会永远不减）
  if (running && !paused){
    for (var fq = 0; fq < towers.length; fq++){
      if (towers[fq].fresh > 0){
        towers[fq].fresh -= dt;
        if (towers[fq].fresh < 0) towers[fq].fresh = 0;
      }
    }
    if (sel._refundShown) syncRefundBtn();
  }
  // 特效
  for (var i = beams.length - 1; i >= 0; i--){ beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }''')

add('draw：塔身悔棋倒计时环',
    '''      ctx.fillText(tw.res.tags[0], x, y + rad + CELL*0.28);
    }
  }
  // 敌人''',
    '''      ctx.fillText(tw.res.tags[0], x, y + rad + CELL*0.28);
    }
    // 建塔悔棋：5 秒内塔身外圈显示倒计时进度环（点它可全额退款）
    if (tw.fresh > 0){
      var fk = Math.max(0, Math.min(1, tw.fresh / FRESH_TIME));
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,106,.26)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, rad + 6, 0, 6.3); ctx.stroke();
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, rad + 6, -Math.PI / 2, -Math.PI / 2 + 6.2832 * fk); ctx.stroke();
      ctx.fillStyle = '#ffe6a6'; ctx.font = 'bold ' + (CELL*0.22) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('↩ ' + Math.ceil(tw.fresh) + 's', x, y - rad - (tw.lv > 1 ? CELL*0.34 : 5));
      ctx.restore();
    }
  }
  // 敌人''')

# ------------------------------------------------------------------ 2. 设置面板
add('首页 ⚙ 设置按钮',
    '''  <button class="btn" id="startBtn">开始防守</button>
</div>''',
    '''  <button class="btn" id="startBtn">开始防守</button>
  <button class="btn" id="setBtn1" style="margin-top:2px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">⚙ 设置</button>
</div>''')

add('暂停面板 ⚙ 设置按钮',
    '''  <button class="btn" id="toLevelsBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">返回选关</button>
</div>''',
    '''  <button class="btn" id="toLevelsBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">返回选关</button>
  <button class="btn" id="setBtn2" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">⚙ 设置</button>
</div>''')

add('新增 #setOv 设置 overlay',
    '''  <button class="btn" id="againBtn">再来一局</button>
</div>
<script>''',
    '''  <button class="btn" id="againBtn">再来一局</button>
</div>
<div class="ov hidden" id="setOv">
  <h1>设置</h1>
  <div class="sub">音效 / 画质 / 存档 · 随时可改</div>
  <button class="btn" id="setSfxBtn" style="padding:13px 30px;font-size:15px">🔊 音效：开</button>
  <button class="btn" id="setFxBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">✨ 画质：高</button>
  <button class="btn" id="setClearBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(110,40,60,.85)">🗑 清除进度</button>
  <div class="sub" id="setMsg" style="font-size:12px;color:#8ff0ff;min-height:18px">--</div>
  <button class="btn" id="setBackBtn" style="padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">返回</button>
</div>
<script>''')

add('音效总开关 SFX_ON（静音守卫·第一处 tone）',
    '''function tone(o){
  if (!AC) return; var m = ensureMaster(); if (!m) return;''',
    '''var SFX_ON = true;   // 音效总开关（设置面板可关；持久化到 td_settings）
function tone(o){
  if (!SFX_ON) return;
  if (!AC) return; var m = ensureMaster(); if (!m) return;''')

add('静音守卫·第二处 noiseSfx',
    '''function noiseSfx(dur, vol, cut, delay){
  if (!AC) return; var m = ensureMaster(); if (!m) return;''',
    '''function noiseSfx(dur, vol, cut, delay){
  if (!SFX_ON) return;
  if (!AC) return; var m = ensureMaster(); if (!m) return;''')

SET_BLOCK = '''/* ================= 设置面板（音效 / 画质 / 清档） ================= */
var LOW_FX = false;    // 低画质（关光效）玩家选择；真正的实现由另一路补丁的 setLowFX 负责
var setFrom = 'start'; // 设置面板来源：'start' 首页 / 'pause' 暂停面板
var clearArm = false;  // 清档二次确认开关
function loadSettings(){
  try {
    var raw = localStorage.getItem('td_settings');
    if (!raw) return;
    var o = JSON.parse(raw);
    if (o && typeof o.sfx === 'boolean') SFX_ON = o.sfx;
    if (o && typeof o.fx === 'boolean') LOW_FX = o.fx;
  } catch (e) {}
}
function saveSettings(){
  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX })); } catch (e) {}
}
function setMsg(txt, color){
  var el = document.getElementById('setMsg');
  if (el){ el.textContent = txt || '--'; el.style.color = color || '#8ff0ff'; }
}
function syncSetBtns(){
  var a = document.getElementById('setSfxBtn');
  if (a) a.textContent = SFX_ON ? '🔊 音效：开' : '🔇 音效：关（已静音）';
  var b = document.getElementById('setFxBtn');
  if (b) b.textContent = LOW_FX ? '🐢 画质：低（关光效）' : '✨ 画质：高（开光效）';
  var c = document.getElementById('setClearBtn');
  if (c) c.textContent = clearArm ? '⚠️ 再点一次确认清除' : '🗑 清除进度';
}
function applyLowFX(v){
  // 容错：LOWFX / setLowFX 由另一路补丁提供，未合入或未定义时静默跳过（不抛错、不假设存在）
  if (typeof setLowFX === 'function') { try { setLowFX(v); } catch (e) {} }
  else if (typeof LOWFX !== 'undefined') { try { LOWFX = v; } catch (e) {} }
}
function showSet(from){
  setFrom = (from === 'pause') ? 'pause' : 'start';
  clearArm = false;
  syncSetBtns();
  setMsg('--');
  hideAll();   // 先收起全部面板（含 setOv），下面再单独放出设置面板
  var el = document.getElementById('setOv');
  if (el) el.classList.remove('hidden');
}
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
function toggleSfx(){
  SFX_ON = !SFX_ON;
  saveSettings();
  syncSetBtns();
  setMsg(SFX_ON ? '音效已开启' : '音效已静音', '#7cf5c0');
  SFX.click();
}
function toggleFx(){
  LOW_FX = !LOW_FX;
  saveSettings();
  applyLowFX(LOW_FX);
  syncSetBtns();
  setMsg(LOW_FX ? '低画质：已关闭发光特效，帧率更稳' : '高画质：发光特效已开启', '#7cf5c0');
  SFX.click();
}
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

'''

add('设置面板逻辑块（音效/画质/清档）',
    '''})();

/* ================= 主循环 ================= */''',
    '''})();

''' + SET_BLOCK + '''/* ================= 主循环 ================= */''')

add('hideAll 一并收起设置面板',
    """  ['startOv','overOv','pauseOv','clearOv','levelsOv'].forEach(function(id){""",
    """  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv'].forEach(function(id){""")

add('事件绑定 + 启动应用设置',
    """  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); });
})();""",
    """  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); });
  /* —— 设置面板 —— */
  on('setBtn1', function(){ showSet('start'); });
  on('setBtn2', function(){ showSet('pause'); });
  on('setSfxBtn', toggleSfx);
  on('setFxBtn', toggleFx);
  on('setClearBtn', clearProgress);
  on('setBackBtn', hideSet);
  /* —— 启动时读取 td_settings 并应用（音效静音 / 画质）—— */
  loadSettings();
  applyLowFX(LOW_FX);
  syncSetBtns();
})();""")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    target = args[0] if args else DEFAULT_TARGET
    dry = '--dry' in sys.argv
    if not os.path.isfile(target):
        print('错误：目标文件不存在 -> ' + target)
        sys.exit(1)
    s = io.open(target, encoding='utf-8').read()
    # 防呆：已经应用过就不允许再打一次（否则会重复插入常量 / 按钮）
    if 'id="setOv"' in s or 'FRESH_TIME' in s:
        print('错误：目标文件似乎已经应用过本补丁 p_a5.py（检测到 setOv / FRESH_TIME），已中止，未写回。')
        sys.exit(1)
    src_len = len(s)
    for i, (label, old, new) in enumerate(PATCHES, 1):
        n = s.count(old)
        if n != 1:
            print('错误：第 %d 处「%s」匹配 %d 次（应为 1 次），已中止，未写回。' % (i, label, n))
            sys.exit(1)
        s = s.replace(old, new, 1)
        print('  [%2d/%d] ✅ %s' % (i, len(PATCHES), label))
    if dry:
        print('（--dry：未写回）')
        return
    io.open(target, 'w', encoding='utf-8').write(s)
    print('已写回：%s（%d -> %d 字符，共 %d 处替换）' % (target, src_len, len(s), len(PATCHES)))

if __name__ == '__main__':
    main()
