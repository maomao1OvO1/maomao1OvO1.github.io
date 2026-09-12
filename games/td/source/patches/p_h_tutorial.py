# -*- coding: utf-8 -*-
"""p_h_tutorial.py —— 《共鸣之塔》补丁 H：新手教学关（首页入口 + 独立配置 + 5 步分步引导）

用法：python3 patches/p_h_tutorial.py [target.html]
默认目标：../game.html（相对本脚本）

产出：
  ① 首页 #startOv 新增按钮 #tutBtn「🎓 新手教学」（挂在 #startBtn 下方、#bookBtn 上方，次级配色）
     —— **不加入选关页** → 选关列表仍是「5 关 + 无尽」= 6 项（deep6_a4 / deep11 断言不受影响）
  ② 新增 #tutBar 任务提示条（位于 #waveInfo 之后、#canvasWrap 之前，在文档流内 → **不遮挡战场**），
     仅教学关显示，暗色科幻底 + 金色任务文字：「任务 n/5：<目标>」
  ③ 新增 #tutDoneOv 教学完成弹窗（含 #tutDoneInfo 结算文案；不写入 prog.unlocked / best / stars）
  ④ var TUTORIAL = {...} 独立教学配置（**不进 LEVELS 数组**）；
     startTutorial() 复制 startLevel 的重置骨架（startLevel 既有行为保持不变，仅多一处收尾 + 奖励判定）
  ⑤ 5 步引导：tutTick() 每帧判定 → tutAdvance() 飘字「✅ 完成」+ SFX.tutOk() + 刷新 #tutBar
  ⑥ 存档兼容：prog.tutorialDone / prog.tutReward / prog.tutBonus 三字段兜底（旧存档无字段亦可）
  ⑦ 教学通关奖励：下一关（第 1 关）金币 +50，只发一次（prog.tutReward 防重复，prog.tutBonus 为待发放额）

规则：
  * 每处「整段精确匹配」替换，匹配数 != 1 时打印标签并 sys.exit(1)，**不写回任何文件**；
  * 幂等：已含 TUTORIAL_PATCH_V1 标记则直接跳过（exit 0）；
  * 纯 ES5（var / function），不含 let / const / 箭头函数 / 模板字符串。
"""
import io
import os
import shutil
import sys

MARK = '/* ==== TUTORIAL_PATCH_V1'

TARGET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'game.html')
TARGET = os.path.abspath(TARGET)
BAK = TARGET + '.pre_tutorial.bak'

src = io.open(TARGET, encoding='utf-8').read()

applied = []


def rep(tag, old, new):
    """整段精确匹配替换；匹配数必须 == 1，否则报标签并退出（不写回任何文件）"""
    global src
    n = src.count(old)
    if n != 1:
        print('❌ 锚点不唯一：[%s] 匹配 %d 次（要求 1 次）——未写回任何文件' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new, 1)
    applied.append(tag)


def rep_soft(tag, old, new):
    """升级路径专用：已含目标文本则跳过该处；否则必须唯一匹配"""
    global src
    if new in src:
        return False
    n = src.count(old)
    if n != 1:
        print('❌ 升级锚点不唯一：[%s] 匹配 %d 次（要求 1 次）——未写回任何文件' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new, 1)
    applied.append(tag + '（升级 rev1 → rev2）')
    return True


# ---------------------------------------------------------------- rev2 修订特征（用于识别/升级已存在的旧修订）
FEAT_HEAL = '教学补给：基地修复 +5'
FEAT_STEP5 = '继续建塔、升级，打完 '
OLD_CFG = ("""var TUTORIAL = {\n"""
           """  name: '🎓 新兵训练',\n"""
           """  waves: 6,                                /* 教学关波数：足够走完「建塔→共鸣→升级→强化→守家」 */\n"""
           """  gold: 220,                               /* 教学关初始金币（比第 1 关宽裕，保证第 3 步升得起）*/\n"""
           """  diff: 0.90,                              /* 与 LEVELS 结构对齐（波次公式与关卡无关，当前不读取）*/\n"""
           """  path: [[0,6],[8,6]]                      /* 一条直廊：路径两侧留出大块空地，便于演示相邻共鸣 */\n"""
           """};""")
NEW_CFG = ("""var TUTORIAL = {\n"""
           """  name: '🎓 新兵训练',\n"""
           """  waves: 6,                                /* 教学关波数：足够走完「建塔→共鸣→升级→强化→守家」 */\n"""
           """  gold: 320,                               /* 教学关初始金币：够「建两塔 + 升 Lv2 + 再补两塔」，不卡进度 */\n"""
           """  diff: 0.90,                              /* 与 LEVELS 结构对齐（波次公式与关卡无关，当前不读取）*/\n"""
           """  /* 三段直廊（右行 → 下行 → 左行，共 22 格）：路径够长、转折简单，两侧留出大块空地便于演示共鸣 */\n"""
           """  path: [[0,3],[8,3],[8,10],[0,10]]\n"""
           """};""")
OLD_HEAL_UP = ("""      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔\n"""
               """      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');\n""")
OLD_STEP5 = """  '守住基地，打完 ' + TUTORIAL.waves + ' 波'"""
NEW_STEP5 = """  '守住基地：继续建塔、升级，打完 ' + TUTORIAL.waves + ' 波'"""


def upgrade_rev1():
    """已应用 rev1（旧教学数值：金币 220 + 单条直线路径 + 无每波补给）→ 就地升级到 rev2"""
    changed = 0
    changed += 1 if rep_soft('教学配置 rev1→rev2（金币 220→320 / 直线→三段直廊）', OLD_CFG, NEW_CFG) else 0
    changed += 1 if rep_soft('教学容错 rev1→rev2（每波基地修复 +5）', OLD_HEAL_UP,
                             OLD_HEAL_UP + """      /* ==== TUTORIAL_PATCH_V1：教学关容错 —— 每波结束基地修复 +5（仅教学关；正式关卡 / 无尽模式不走这里）==== */\n"""
                                            """      if (tutorial && hp > 0 && hp < MAXHP){\n"""
                                            """        hp = Math.min(MAXHP, hp + 5);\n"""
                                            """        addFloat(W / 2, H * 0.60, '教学补给：基地修复 +5', '#7cf5c0');\n"""
                                            """      }\n""") else 0
    changed += 1 if rep_soft('第 5 步文案 rev1→rev2', OLD_STEP5, NEW_STEP5) else 0
    if not changed:
        return False
    bak = TARGET + '.pre_tutorial_rev2.bak'
    shutil.copyfile(TARGET, bak)
    io.open(TARGET, 'w', encoding='utf-8').write(src)
    print('✅ p_h_tutorial 已从 rev1 升级到 rev2：%s（升级 %d 处）' % (os.path.basename(TARGET), changed))
    for t in applied:
        print('   ·', t)
    print('   备份：%s' % os.path.basename(bak))
    return True


if MARK in src:
    if FEAT_HEAL in src and FEAT_STEP5 in src:
        print('跳过：%s 已包含 TUTORIAL_PATCH_V1（rev2，幂等保护）' % os.path.basename(TARGET))
        sys.exit(0)
    print('⚠️ 检测到 %s 已应用旧修订（rev1）：改为就地升级到 rev2' % os.path.basename(TARGET))
    upgrade_rev1()
    sys.exit(0)


# ================================================================ ① HTML：#tutBar 任务条
OLD_BAR = ("""  <div id="waveInfo" style="flex:0 0 auto;padding:4px 10px;font-size:11px;color:#8fb4dc;background:linear-gradient(180deg,rgba(12,18,34,.93),rgba(9,13,24,.8));border-bottom:1px solid rgba(90,140,220,.18);letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">下一波：--</div>\n"""
           """  <div id="canvasWrap">""")
NEW_BAR = ("""  <div id="waveInfo" style="flex:0 0 auto;padding:4px 10px;font-size:11px;color:#8fb4dc;background:linear-gradient(180deg,rgba(12,18,34,.93),rgba(9,13,24,.8));border-bottom:1px solid rgba(90,140,220,.18);letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">下一波：--</div>""" + "\n"
           """  <!-- TUTORIAL_PATCH_V1：新手教学任务条（在 #waveInfo 与 #canvasWrap 之间，属文档流 → 不遮挡战场；仅教学关显示）-->""" + "\n"
           """  <div id="tutBar" style="flex:0 0 auto;display:none;padding:5px 10px;font-size:11.5px;line-height:1.35;color:#ffd76a;background:linear-gradient(180deg,rgba(38,30,12,.95),rgba(20,15,6,.9));border-bottom:1px solid rgba(255,200,110,.32);letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 8px rgba(255,190,80,.35);">任务 1/5</div>""" + "\n"
           """  <div id="canvasWrap">""")
rep('html: 新增 #tutBar 教学任务条（#waveInfo 下方 / #canvasWrap 上方）', OLD_BAR, NEW_BAR)


# ================================================================ ② HTML：首页 #tutBtn 入口
OLD_BTN = ("""    <button class="btn btn-hero" id="startBtn">▶ 开始防御</button>\n"""
           """    <div class="home-menu">\n""")
NEW_BTN = ("""    <button class="btn btn-hero" id="startBtn">▶ 开始防御</button>\n"""
           """    <!-- TUTORIAL_PATCH_V1：新手教学入口（仅首页，不进选关页 → 选关列表仍为 5 关 + 无尽 = 6 项）-->\n"""
           """    <button class="btn" id="tutBtn" style="margin-top:6px;padding:12px 40px;font-size:15px;letter-spacing:2px;background:rgba(40,60,100,.85)">🎓 新手教学</button>\n"""
           """    <div class="home-menu">\n""")
rep('html: 首页新增 #tutBtn 新手教学按钮（#startBtn 下方 / #bookBtn 上方）', OLD_BTN, NEW_BTN)


# ================================================================ ③ HTML：#tutDoneOv 教学完成弹窗
OLD_DONE = ("""  <button class="btn" id="toLevelsBtn2" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">返回选关</button>\n"""
            """</div>\n"""
            """<div class="ov hidden" id="buffOv">""")
NEW_DONE = ("""  <button class="btn" id="toLevelsBtn2" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">返回选关</button>\n"""
            """</div>\n"""
            """<!-- TUTORIAL_PATCH_V1：教学完成弹窗（独立于 #clearOv → 不触发选关/下一关流程，不写 prog.unlocked / best）-->\n"""
            """<div class="ov hidden" id="tutDoneOv">\n"""
            """  <h1>🎓 教学完成</h1>\n"""
            """  <div class="sub" style="color:#ffd76a">建塔 → 共鸣 → 升级 → 强化 → 守家，你已经全部走通</div>\n"""
            """  <div class="sub" id="tutDoneInfo">--</div>\n"""
            """  <button class="btn" id="tutGoBtn">▶ 进入第 1 关</button>\n"""
            """  <button class="btn" id="tutAgainBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">🎓 再练一次</button>\n"""
            """  <button class="btn" id="tutHomeBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">🏠 返回首页</button>\n"""
            """</div>\n"""
            """<div class="ov hidden" id="buffOv">""")
rep('html: 新增 #tutDoneOv 教学完成弹窗', OLD_DONE, NEW_DONE)


# ================================================================ ④ JS：SFX.tutOk（新增音效方法）
OLD_SFX = """  silence: function(){ tone({ freq:880, freq2:180, dur:0.35, vol:0.05, type:'sine' }); noiseSfx(0.2, 0.03, 1600); }\n};\n"""
NEW_SFX = ("""  silence: function(){ tone({ freq:880, freq2:180, dur:0.35, vol:0.05, type:'sine' }); noiseSfx(0.2, 0.03, 1600); },\n"""
           """  /* TUTORIAL_PATCH_V1：教学步骤完成的轻快音（不覆盖任何既有音效方法）*/""" + "\n"
           """  tutOk:   function(){ chord([784, 1047, 1319], 0.18, 0.038, 'triangle'); tone({ freq:1568, dur:0.08, vol:0.024, type:'sine', delay:0.1 }); }\n"""
           """};\n""")
rep('js: SFX 新增 tutOk（教学步骤完成音）', OLD_SFX, NEW_SFX)


# ================================================================ ⑤ JS：存档字段兜底
OLD_PROG = """if (!prog.best) prog.best = {};\n"""
NEW_PROG = ("""if (!prog.best) prog.best = {};\n"""
            """/* ==== TUTORIAL_PATCH_V1：教学相关存档字段兜底（旧存档没有这几个字段，读取处一律按 undefined 判）==== */\n"""
            """if (!('tutorialDone' in prog)) prog.tutorialDone = false;   /* 教学是否已通关（首页「开始防守」文案用）*/\n"""
            """if (!('tutReward' in prog)) prog.tutReward = false;         /* 教学奖励是否已发放（防重复发放）*/\n"""
            """if (!('tutBonus' in prog)) prog.tutBonus = 0;               /* 待发放的教学奖励金币（进第 1 关时结算）*/\n""")
rep('js: prog 教学字段兜底初始化（旧存档兼容）', OLD_PROG, NEW_PROG)


# ================================================================ ⑥ JS：教学大块（配置 + 状态 + 5 步引导 + 开局/结算）
TUT_JS = r"""/* ==== TUTORIAL_PATCH_V1 : 新手教学关（独立配置 + 5 步分步引导）====
   设计约束：
     · 教学配置独立于 LEVELS 数组（不新增关卡项 → 选关页仍是「5 关 + 无尽」= 6 项）；
     · 教学模式全部走本段新增代码：startLevel 只在「有待发放的教学奖励」时多结算一次金币；
     · startTutorial() 复制 startLevel 的重置骨架（startLevel 既有行为保持不变）；
     · 教学通关不写 prog.unlocked / prog.best / prog.stars（不污染正式进度与选关）；
     · 纯 ES5：只用 var / function，无 let / const / 箭头函数 / 模板字符串。 */
var TUTORIAL = {
  name: '🎓 新兵训练',
  waves: 6,                                /* 教学关波数：足够走完「建塔→共鸣→升级→强化→守家」 */
  gold: 320,                               /* 教学关初始金币：够「建两塔 + 升 Lv2 + 再补两塔」，不卡进度 */
  diff: 0.90,                              /* 与 LEVELS 结构对齐（波次公式与关卡无关，当前不读取）*/
  /* 三段直廊（右行 → 下行 → 左行，共 22 格）：路径够长、转折简单，两侧留出大块空地便于演示共鸣 */
  path: [[0,3],[8,3],[8,10],[0,10]]
};
var tutorial = false;      /* true = 当前处于教学关（教学关之外恒为 false）*/
var tutStep = 1;           /* 当前任务步骤 1..5 */
var tutBuffCount = 0;      /* 玩家累计点过强化卡 / 跳过按钮的次数 */
var tutStep4Base = 0;      /* 进入第 4 步那一刻的计数快照：只认「这一步之后」的点击 */
var TUT_TOTAL = 5;
var TUT_HINT_TXT = '（建议先过教学）';   /* 首页主按钮的提示后缀（只加文案，不改按钮行为）*/
var TUT_STEPS = [
  '建一座 🔥 火焰塔（点战场上的空地）',
  '在它旁边建一座 ❄️ 冰霜塔，触发【热震】共鸣',
  '点那座已有塔，把它升到 Lv2',
  '这一波结束后选一张强化卡（也可以点「跳过」）',
  '守住基地：继续建塔、升级，打完 ' + TUTORIAL.waves + ' 波'
];
function tutBarText(){
  var el = document.getElementById('tutBar');
  if (!el) return;
  el.textContent = '任务 ' + tutStep + '/' + TUT_TOTAL + '：' + TUT_STEPS[tutStep - 1];
}
function tutBarSync(){
  var el = document.getElementById('tutBar');
  if (!el) return;
  el.style.display = tutorial ? 'block' : 'none';
  if (tutorial) tutBarText();
}
function tutMark(kind){ if (kind === 'buff') tutBuffCount++; }      /* 第 4 步：点过强化卡 / 跳过 */
function tutAnyLv2(){                                              /* 第 3 步：任一塔升到 Lv2 */
  for (var i = 0; i < towers.length; i++){ if (towers[i].lv >= 2) return true; }
  return false;
}
function tutHasAdjDiff(){                                          /* 第 2 步：存在相邻的不同元素塔（共鸣）*/
  var nb = [[1,0],[-1,0],[0,1],[0,-1]];
  for (var i = 0; i < towers.length; i++){
    var t = towers[i];
    for (var k = 0; k < 4; k++){
      var o = towerAt(t.c + nb[k][0], t.r + nb[k][1]);
      if (o && o.elem !== t.elem) return true;
    }
  }
  return false;
}
function tutAdvance(){
  if (!tutorial || tutStep >= TUT_TOTAL) return;
  var done = TUT_STEPS[tutStep - 1];
  tutStep++;
  if (tutStep === 4) tutStep4Base = tutBuffCount;      /* 第 4 步只认「进入本步之后」的点击 */
  tutBarSync();
  addFloat(W / 2, H * 0.42, '✅ 完成：' + done, '#7cf5c0');
  addFloat(W / 2, H * 0.52, '下一任务：' + TUT_STEPS[tutStep - 1], '#ffd76a');
  SFX.tutOk();
}
function tutTick(){
  if (!tutorial) return;
  if (tutStep === 1){ if (towers.length >= 1) tutAdvance(); }
  else if (tutStep === 2){ if (tutHasAdjDiff()) tutAdvance(); }
  else if (tutStep === 3){ if (tutAnyLv2()) tutAdvance(); }
  else if (tutStep === 4){ if (tutBuffCount > tutStep4Base) tutAdvance(); }
  /* 第 5 步「守家」：由 tutorialClear() 收尾 */
}
function tutorialExit(){ tutorial = false; tutBarSync(); }
function syncTutLabel(){                       /* 未通关教学时：首页主按钮加一句文案提示（不改行为，方案无关首页改版）*/
  var b = document.getElementById('startBtn');
  if (!b) return;
  var t = String(b.textContent || '');
  while (t.indexOf(TUT_HINT_TXT) >= 0) t = t.replace(TUT_HINT_TXT, '');   /* 先去掉旧提示，避免重复拼接 */
  b.textContent = prog.tutorialDone ? t : (t + TUT_HINT_TXT);
}
/* 教学通关结算：**不写 prog.unlocked / prog.best / prog.stars**，不弹「关卡完成」选关流程 */
function tutorialClear(){
  running = false; paused = false;
  tutorial = false;                                    /* 模式收尾：立刻回到普通流程语义 */
  tutStep = TUT_TOTAL;                                 /* 剩余步骤一并判完成 */
  var first = !prog.tutReward;                         /* 奖励从未发放过 */
  var pending = (prog.tutBonus | 0) > 0;               /* 已有待发放额度（重玩不叠加）*/
  prog.tutorialDone = true;
  if (first && !pending) prog.tutBonus = 50;           /* 首关金币 +50：进第 1 关时发放 */
  saveProg();
  tutBarSync();
  syncTutLabel();                                      /* 首页主按钮文案随之恢复为「▶ 开始防御」*/
  var info = document.getElementById('tutDoneInfo');
  if (info){
    info.textContent = '击杀 ' + kills + ' · 建塔 ' + built + ' · 剩余血量 ' + hp + '/' + MAXHP
      + ((first && !pending) ? ' ｜ 教学奖励：下一关（第 1 关）金币 +50' : ' ｜ 教学奖励此前已发放，不重复给');
  }
  var ov = document.getElementById('tutDoneOv');
  if (ov) ov.classList.remove('hidden');
  showBanner('🎓 教学完成');
  SFX.clear();
  SFX.tutOk();
}
/* 教学关开局：复制 startLevel 的重置骨架，地图 / 波数 / 金币改取 TUTORIAL（不改动 startLevel 本身）*/
function startTutorial(){
  tutorial = true;                 /* 先置位：hideAll() 里的 tutBarSync() 依赖它 */
  endless = false;
  lvIndex = 0;                     /* 教学关不属于任何正式关卡：lvIndex 仅作兜底索引 */
  WAYPOINTS = TUTORIAL.path;
  WAVES_TOTAL = TUTORIAL.waves;
  buildPath();
  towers = []; grid = {}; enemies = []; spawnQueue = [];
  beams = []; floats = []; parts = []; rings = [];
  curGroup = null; spawnTimer = 0;                     /* 清掉上一局残留的刷怪队列游标 */
  MAXHP = 20; hp = MAXHP; gold = TUTORIAL.gold; wave = 1; kills = 0; built = 0;
  BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,
            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 } };
  comboCount = 0; comboT = 0; SKILL.cd = 0; coinFly = []; shakeT = 0;
  waveActive = false; waveBreak = 1.0; bannerT = 0; hurtT = 0;
  running = true; paused = false;
  tutStep = 1; tutBuffCount = 0; tutStep4Base = 0;
  hideAll();
  hideSel();
  speedMul = 1; updateSpeedBtn();                      /* 教学关也回到 1x */
  document.getElementById('lvName').textContent = TUTORIAL.name;
  hintBar(true);                                       /* 教学关显示底部操作提示（hintBar 的关卡规则不受影响）*/
  initAudio(); startWave(); updateHud(); updateWaveInfo();
  tutBarSync();
  showBanner('🎓 新兵训练');
  addFloat(W / 2, H * 0.45, '任务 1/5：' + TUT_STEPS[0], '#ffd76a');
}
"""
rep('js: 教学大块（TUTORIAL 配置 + 状态 + 5 步引导 + startTutorial/tutorialClear）',
    "function startLevel(i){\n  endless = false;                 // 普通关卡：关闭无尽模式标记\n",
    TUT_JS + "function startLevel(i){\n  endless = false;                 // 普通关卡：关闭无尽模式标记\n")


# ================================================================ ⑦ JS：hideAll 收纳教学 UI
OLD_HA = ("""    var el = document.getElementById(id); if (el) el.classList.add('hidden');\n"""
          """  });\n"""
          """}\n""")
NEW_HA = ("""    var el = document.getElementById(id); if (el) el.classList.add('hidden');\n"""
          """  });\n"""
          """  tutBarSync();          /* TUTORIAL_PATCH_V1：教学任务条随模式一起收起 / 放出 */\n"""
          """  var tdo = document.getElementById('tutDoneOv'); if (tdo) tdo.classList.add('hidden');\n"""
          """}\n""")
rep('js: hideAll 收纳教学 UI（#tutDoneOv + #tutBar）', OLD_HA, NEW_HA)


# ================================================================ ⑧ JS：stepSim 教学关结算
OLD_CLEAR = """      if (!endless && wave >= WAVES_TOTAL){ levelClear(); return; }   // 无尽模式永不结算\n"""
NEW_CLEAR = """      if (!endless && wave >= WAVES_TOTAL){\n"""
NEW_CLEAR += """        /* TUTORIAL_PATCH_V1：教学关走专属结算（不写 prog.unlocked / best / stars、不弹选关流程）*/\n"""
NEW_CLEAR += """        if (tutorial){ tutorialClear(); return; }\n"""
NEW_CLEAR += """        levelClear(); return;\n"""
NEW_CLEAR += """      }   // 无尽模式永不结算\n"""
rep('js: stepSim 波次结束 —— 教学关走 tutorialClear', OLD_CLEAR, NEW_CLEAR)


# ================================================================ ⑨ JS：stepSim 教学关每波补给（容错）
OLD_HEAL = ("""      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔\n"""
            """      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');\n""")
NEW_HEAL = ("""      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔\n"""
            """      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');\n"""
            """      /* ==== TUTORIAL_PATCH_V1：教学关容错 —— 每波结束基地修复 +5（仅教学关；正式关卡 / 无尽模式不走这里）==== */\n"""
            """      if (tutorial && hp > 0 && hp < MAXHP){\n"""
            """        hp = Math.min(MAXHP, hp + 5);\n"""
            """        addFloat(W / 2, H * 0.60, '教学补给：基地修复 +5', '#7cf5c0');\n"""
            """      }\n""")
rep('js: stepSim 教学关每波基地修复 +5（容错，不影响正式关卡）', OLD_HEAL, NEW_HEAL)


# ================================================================ ⑨ JS：frame 每帧教学判定
OLD_FRAME = """  if (bannerT > 0) bannerT -= dt;\n"""
NEW_FRAME = ("""  if (tutorial) tutTick();       /* TUTORIAL_PATCH_V1：教学分步引导判定（每帧一次；暂停 / 面板冻结时也照常判定）*/\n"""
             """  if (bannerT > 0) bannerT -= dt;\n""")
rep('js: frame 主循环挂载 tutTick', OLD_FRAME, NEW_FRAME)


# ================================================================ ⑩ JS：强化卡点击 = 教学第 4 步
OLD_BUFF = ("""      b.apply();\n"""
            """      recalcResonance(); updateHud();\n""")
NEW_BUFF = ("""      b.apply();\n"""
            """      if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 点过强化卡 */\n"""
            """      recalcResonance(); updateHud();\n""")
rep('js: showBuffChoices 强化卡点击 → 教学第 4 步', OLD_BUFF, NEW_BUFF)


# ================================================================ ⑪ JS：跳过强化 = 教学第 4 步
OLD_SKIP = ("""  on('skipBuffBtn', function(){\n"""
            """    if (document.getElementById('buffOv').classList.contains('hidden')) return;\n""")
NEW_SKIP = ("""  on('skipBuffBtn', function(){\n"""
            """    if (document.getElementById('buffOv').classList.contains('hidden')) return;\n"""
            """    if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 跳过也算完成 */\n""")
rep('js: skipBuffBtn → 教学第 4 步', OLD_SKIP, NEW_SKIP)


# ================================================================ ⑫ JS：pauseGame 显示教学关名
OLD_PAUSE = """  document.getElementById('pauseInfo').textContent = (endless ? '♾ 无尽模式' : LEVELS[lvIndex].name)\n"""
NEW_PAUSE = """  document.getElementById('pauseInfo').textContent = (endless ? '♾ 无尽模式' : (tutorial ? TUTORIAL.name : LEVELS[lvIndex].name))\n"""
rep('js: pauseGame 暂停页显示教学关名', OLD_PAUSE, NEW_PAUSE)


# ================================================================ ⑬ JS：重开本关 → 教学关重开
OLD_RESTART = """  on('restartBtn', function(){ if (endless) startEndless(); else startLevel(lvIndex); });\n"""
NEW_RESTART = """  on('restartBtn', function(){ if (endless) startEndless(); else if (tutorial) startTutorial(); else startLevel(lvIndex); });\n"""
rep('js: 暂停页「重开本关」兼容教学关', OLD_RESTART, NEW_RESTART)


# ================================================================ ⑭ JS：startLevel 收尾教学态 + 发放教学奖励
OLD_GOLD = """  MAXHP = 20; hp = MAXHP; gold = LEVELS[i].gold; wave = 1; kills = 0; built = 0;\n"""
NEW_GOLD = ("""  MAXHP = 20; hp = MAXHP; gold = LEVELS[i].gold; wave = 1; kills = 0; built = 0;\n"""
            """  /* ==== TUTORIAL_PATCH_V1：普通关卡开局 = 教学模式收尾（不在教学中时这两段都是空操作，行为与原先一致）==== */\n"""
            """  if (tutorial) tutorialExit();\n"""
            """  if (i === 0 && prog.tutBonus > 0 && !prog.tutReward){   /* 教学奖励：只发一次 */\n"""
            """    var tb = prog.tutBonus | 0;\n"""
            """    gold += tb; prog.tutBonus = 0; prog.tutReward = true; saveProg();\n"""
            """    addFloat(W / 2, H * 0.38, '🎓 教学奖励  +' + tb + ' 金币', '#ffd76a');\n"""
            """  }\n""")
rep('js: startLevel 收尾教学态 + 结算教学奖励', OLD_GOLD, NEW_GOLD)


# ================================================================ ⑮ JS：showLevels = 教学结束
OLD_SHOWLV = """function showLevels(){\n  hideAll();\n"""
NEW_SHOWLV = ("""function showLevels(){\n"""
              """  tutorialExit();      /* TUTORIAL_PATCH_V1：回到选关页 = 教学结束（不在教学中时为空操作）*/\n"""
              """  hideAll();\n""")
rep('js: showLevels 收尾教学模式', OLD_SHOWLV, NEW_SHOWLV)


# ================================================================ ⑰ JS：选关页「返回首页」顺带刷新首页按钮文案
OLD_LVBACK = """  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); });\n"""
NEW_LVBACK = """  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); syncTutLabel(); });\n"""
rep('js: lvBackBtn 回首页时刷新教学提示文案（不新增监听器 → 不覆盖既有绑定）', OLD_LVBACK, NEW_LVBACK)


# ================================================================ ⑱ JS：事件绑定（入口 + 结算按钮）
OLD_ON = """  /* —— 启动时读取 td_settings 并应用（音效静音 / 画质）—— */\n"""
NEW_ON = ("""  /* ==== TUTORIAL_PATCH_V1：新手教学入口与结算按钮（全部为新增 id，不覆盖任何既有监听器）==== */\n"""
          """  on('tutBtn', function(){ startTutorial(); });                     /* 首页「🎓 新手教学」*/\n"""
          """  on('tutAgainBtn', function(){ startTutorial(); });                /* 教学完成页：再练一次 */\n"""
          """  on('tutGoBtn', function(){ startLevel(0); });                     /* 教学完成页：直接进第 1 关（在此结算 +50 奖励）*/\n"""
          """  on('tutHomeBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); syncTutLabel(); });\n"""
          """  syncTutLabel(); tutBarSync();                                     /* 启动即同步首页文案与任务条状态 */\n"""
          """  /* —— 启动时读取 td_settings 并应用（音效静音 / 画质）—— */\n""")
rep('js: 事件绑定（#tutBtn 入口 + 教学完成页三个按钮）', OLD_ON, NEW_ON)


# ---------------------------------------------------------------- 写回（全部锚点通过后才落盘）
if os.path.exists(TARGET):
    shutil.copyfile(TARGET, BAK)
io.open(TARGET, 'w', encoding='utf-8').write(src)
print('✅ p_h_tutorial 完成：%s（替换 %d 处）' % (os.path.basename(TARGET), len(applied)))
for t in applied:
    print('   ·', t)
print('   备份：%s' % os.path.basename(BAK))
