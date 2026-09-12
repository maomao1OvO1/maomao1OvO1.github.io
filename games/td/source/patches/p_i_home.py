#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.8 主界面美术重做：Logo + 战绩 + 大按钮 + 玩法弹窗 + 动态背景
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 首页结构重做（说明文字搬进「玩法」弹窗）
sub("""<div class="ov" id="startOv">
  <h1>共鸣之塔</h1>
  <div class="sub">在路径两侧布置元素塔，阻止敌人抵达终点</div>
  <div class="el">
    <b>⭐ 原创机制 · 元素共鸣</b><br>
    相邻的<b>不同元素</b>塔会触发组合：<br>
    🔥+❄️ <i>热震</i>（爆炸溅射） · 🔥+⚡ <i>等离子</i>（伤害+40%）<br>
    ❄️+⚡ <i>超导</i>（减速翻倍） · ☠️+🔥 <i>燃爆</i>（毒伤立刻结算）<br>
    <b>同元素相邻</b> → <i>共振</i>（伤害+25%）<br>
    🔨+⚡ <i>电磁炮</i>（无视护甲） · 🔨+🔥 <i>熔铁</i>（打有甲怪×1.4） · 🔨+❄️ <i>碎冰</i>（暴击+15%）<br>
    🔨+☠️ <i>腐蚀</i>（毒伤×1.8） · 攻击塔+📡 <i>增幅场</i>（伤害+20% 射程+10%）<br>
    塔杀敌会<b>升级进化</b>，敌人有护盾/BOSS 等 5 种
  </div>
  <button class="btn" id="startBtn">开始防守</button>
  <button class="btn" id="setBtn1" style="margin-top:2px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">⚙ 设置</button>
  <button class="btn" id="bookBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">📖 图鉴</button>
</div>""",
"""<div class="ov" id="startOv">
  <div class="home-bg"></div>
  <div class="home-wrap">
    <div class="home-top"><span>MAOMAO · TOWER DEFENSE</span><span id="homeVer">v5.8</span></div>
    <div class="home-logo">
      <h1 class="logo">共鸣之塔</h1>
      <div class="logo-tag">元素共鸣 · 塔防</div>
    </div>
    <div class="home-stats" id="homeStats"></div>
    <button class="btn btn-hero" id="startBtn">▶ 开始防御</button>
    <div class="home-menu">
      <button class="btn" id="bookBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">📖 图鉴</button>
      <button class="btn" id="setBtn1" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">⚙ 设置</button>
      <button class="btn" id="helpBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">❓ 玩法</button>
      <button class="btn" id="levelsBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">🗺 选关</button>
    </div>
    <div class="home-foot">守住基地 · 元素相邻触发共鸣</div>
  </div>
</div>
<div class="ov hidden" id="helpOv">
  <h1>玩法说明</h1>
  <div class="sub">在路径两侧布置元素塔，阻止敌人抵达终点</div>
  <div class="el">
    <b>⭐ 原创机制 · 元素共鸣</b><br>
    相邻的<b>不同元素</b>塔会触发组合：<br>
    🔥+❄️ <i>热震</i>（爆炸溅射） · 🔥+⚡ <i>等离子</i>（伤害+40%）<br>
    ❄️+⚡ <i>超导</i>（减速翻倍） · ☠️+🔥 <i>燃爆</i>（毒伤立刻结算）<br>
    <b>同元素相邻</b> → <i>共振</i>（伤害+25%）<br>
    🔨+⚡ <i>电磁炮</i>（无视护甲） · 🔨+🔥 <i>熔铁</i>（打有甲怪×1.4） · 🔨+❄️ <i>碎冰</i>（暴击+15%）<br>
    🔨+☠️ <i>腐蚀</i>（毒伤×1.8） · 攻击塔+📡 <i>增幅场</i>（伤害+20% 射程+10%）<br>
    💥+🔥 <i>燃烧弹</i> · 💥+☠️ <i>毒气弹</i> · 💥+❄️ <i>冰爆</i> · 🎯+⚡ <i>电磁狙击</i> · 🎯+🔨 <i>破甲弹</i><br>
    <b>塔的定位</b>：🎯狙击点杀高价值目标 · 💥榴弹超大范围 · ⚡雷链式清群 · ☠️毒范围持续 · ❄️冰控场 · 🔨单体<br>
    塔杀敌会<b>升级进化</b>；敌人有步兵/疾行/装甲/护盾/BOSS/医疗兵/分裂虫/自爆兵/精英队长/重装冲锋等
  </div>
  <button class="btn" id="helpBackBtn">返 回</button>
</div>""", '首页结构')

# ② 主界面美术样式（追加在 </style> 前）
sub("</style>",
"""  /* ===== v5.8 主界面美术（纯 CSS，无外部素材） ===== */
  #startOv{justify-content:center;overflow-y:auto;overflow-x:hidden;padding:0;}
  #startOv .home-bg{position:absolute;inset:-12%;z-index:0;pointer-events:none;
    background:
      radial-gradient(circle at 18% 16%, rgba(90,190,255,.20), transparent 40%),
      radial-gradient(circle at 84% 24%, rgba(180,120,255,.18), transparent 44%),
      radial-gradient(circle at 50% 96%, rgba(60,230,200,.14), transparent 52%),
      radial-gradient(1.5px 1.5px at 12% 30%, rgba(255,255,255,.8), transparent 60%),
      radial-gradient(1.5px 1.5px at 34% 68%, rgba(180,220,255,.7), transparent 60%),
      radial-gradient(1.8px 1.8px at 58% 22%, rgba(255,255,255,.75), transparent 60%),
      radial-gradient(1.4px 1.4px at 76% 58%, rgba(200,230,255,.7), transparent 60%),
      radial-gradient(1.6px 1.6px at 88% 82%, rgba(255,255,255,.6), transparent 60%),
      linear-gradient(180deg,#060a14,#0a1122 55%,#070b16);
    animation: bgDrift 24s ease-in-out infinite alternate;}
  @keyframes bgDrift{from{transform:translate3d(-1.6%,-1.2%,0) scale(1.03);}to{transform:translate3d(1.6%,1.4%,0) scale(1.07);}}
  .home-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:13px;
    width:100%;max-width:460px;padding:22px 18px;}
  .home-top{width:100%;display:flex;justify-content:space-between;font-size:10px;color:#5f7ba6;letter-spacing:2px;}
  .home-logo{text-align:center;}
  .logo{margin:0;font-size:clamp(32px,8.5vw,54px);letter-spacing:7px;font-weight:900;
    background:linear-gradient(180deg,#f2fbff 6%,#8fdcff 42%,#4f8cff 74%,#b07cff 100%);
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
    filter:drop-shadow(0 0 16px rgba(90,200,255,.55)) drop-shadow(0 3px 0 rgba(8,16,34,.85));
    animation:logoFloat 4.6s ease-in-out infinite;}
  @keyframes logoFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
  .logo-tag{margin-top:3px;font-size:11px;letter-spacing:5px;color:#8fb4dc;}
  .home-stats{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;min-height:26px;}
  .home-stats .st{padding:4px 10px;border-radius:20px;font-size:11px;color:#9fc4f0;
    background:rgba(18,28,50,.78);border:1px solid rgba(90,140,220,.28);}
  .home-stats .st b{color:#ffd76a;}
  .btn-hero{padding:15px 46px !important;font-size:20px !important;letter-spacing:6px !important;
    background:linear-gradient(180deg,rgba(74,156,255,.96),rgba(34,82,188,.96)) !important;
    border-color:rgba(150,225,255,.6) !important;
    animation:heroPulse 2.8s ease-in-out infinite;}
  @keyframes heroPulse{
    0%,100%{box-shadow:0 0 20px rgba(60,150,255,.42),0 6px 16px rgba(0,0,0,.45);}
    50%{box-shadow:0 0 38px rgba(100,200,255,.75),0 6px 16px rgba(0,0,0,.45);}}
  .btn-hero:active{transform:scale(.97);}
  .home-menu{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:340px;}
  .home-menu .btn{margin-top:0 !important;width:100%;border-radius:12px !important;letter-spacing:2px !important;}
  .home-foot{font-size:10px;color:#4d678f;letter-spacing:1px;}
</style>""", '主界面样式')

# ③ 首页战绩渲染 + 玩法弹窗逻辑
sub("""function hideAll(){""",
"""/* ===== v5.8 首页战绩（读取本地存档，给主界面"游戏感"） ===== */
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
}
function hideAll(){""", '首页战绩函数')

sub("""  hintBar(false); menuPause = false;
  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv'].forEach(function(id){""",
"""  hintBar(false); menuPause = false;
  renderHome();   // 每次收起弹窗（含返回首页）时刷新战绩
  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv'].forEach(function(id){""", 'hideAll 收 helpOv + 刷新战绩')

sub("""  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); });""",
"""  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); });
  on('helpBtn', function(){ hideAll(); document.getElementById('helpOv').classList.remove('hidden'); SFX.panelOpen(); });
  on('helpBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); SFX.panelClose(); });
  on('levelsBtn', function(){ showLevels(); SFX.click(); });""", '玩法/选关按钮绑定')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_i_home 完成')
