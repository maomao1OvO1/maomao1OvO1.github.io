#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.7 音效增强：立体声定位 + 每塔/每怪专属音色 + 动态配乐 + UI 音
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① tone(): 支持立体声声像 o.pan
sub("""    var v = o.vol || 0.05;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(m);""",
"""    var v = o.vol || 0.05;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    if (o.pan && AC.createStereoPanner){                 // 按屏幕位置做声像（左/右）
      var pn = AC.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); pn.connect(m);
    } else g.connect(m);""", 'tone 声像')

# ② noiseSfx(): 第 5 个参数 = 声像
sub("""function noiseSfx(dur, vol, cut, delay){""",
    """function noiseSfx(dur, vol, cut, delay, pan){""", 'noiseSfx 签名')
sub("""    var g = AC.createGain(); g.gain.value = vol || 0.08;
    src.connect(f); f.connect(g); g.connect(m); src.start(t0);""",
"""    var g = AC.createGain(); g.gain.value = vol || 0.08;
    src.connect(f); f.connect(g);
    if (pan && AC.createStereoPanner){
      var pn2 = AC.createStereoPanner(); pn2.pan.value = pan; g.connect(pn2); pn2.connect(m);
    } else g.connect(m);
    src.start(t0);""", 'noiseSfx 声像')

# ③ 音色表 + 定位工具（插在 SFX 对象定义之前）
sub("var SFX = {",
"""/* ===== v5.7 音效增强 ===== */
/* 屏幕 x → 声像（-0.85 左 ←→ +0.85 右） */
function panOf(x){
  if (!W) return 0;
  var p = (x / W) * 1.7 - 0.85;
  return p < -0.85 ? -0.85 : (p > 0.85 ? 0.85 : p);
}
/* 八种塔各自的「开火音」：音色/音高完全不同，闭眼也能听出哪座塔在打 */
var TOWER_VOICE = {
  fire:    { n:[0.14, 0.045, 900],  f1:300,  f2:90,   dur:0.16, vol:0.045, type:'sawtooth' },
  ice:     { n:[0.06, 0.02, 4200],  f1:2300, f2:1500, dur:0.12, vol:0.026, type:'sine' },
  thunder: { n:[0.06, 0.04, 3200],  f1:1400, f2:380,  dur:0.09, vol:0.030, type:'square' },
  poison:  { n:[0.10, 0.02, 600],   f1:220,  f2:165,  dur:0.22, vol:0.030, type:'sine' },
  phys:    { n:null,                f1:520,  f2:180,  dur:0.08, vol:0.040, type:'square' },
  sniper:  { n:[0.20, 0.055, 2600], f1:1800, f2:260,  dur:0.20, vol:0.055, type:'triangle' },
  mortar:  { n:[0.10, 0.05, 500],   f1:140,  f2:48,   dur:0.26, vol:0.060, type:'sine' },
  support: null
};
function towerShot(elem, x){
  var v = TOWER_VOICE[elem];
  if (!v) return;
  var pan = panOf(x);
  if (v.n) noiseSfx(v.n[0], v.n[1], v.n[2], 0, pan);
  tone({ freq:v.f1, freq2:v.f2, dur:v.dur, vol:v.vol, type:v.type, pan:pan });
}
/* 十一种怪各自的「阵亡音」 */
var DIE_VOICE = {
  normal:  { n:null,                 f1:620,  f2:1320, dur:0.10, vol:0.045, type:'triangle' },
  fast:    { n:null,                 f1:900,  f2:1900, dur:0.08, vol:0.040, type:'triangle' },
  armor:   { n:[0.14, 0.05, 900],    f1:260,  f2:90,   dur:0.18, vol:0.060, type:'square' },
  shield:  { n:null,                 f1:1500, f2:2600, dur:0.14, vol:0.045, type:'sine' },
  healer:  { n:null,                 f1:1200, f2:1750, dur:0.16, vol:0.040, type:'sine' },
  splitter:{ n:[0.12, 0.04, 1400],   f1:400,  f2:150,  dur:0.20, vol:0.055, type:'sawtooth' },
  spawn2:  { n:null,                 f1:800,  f2:1500, dur:0.07, vol:0.030, type:'triangle' },
  bomber:  { n:[0.25, 0.07, 700],    f1:160,  f2:60,   dur:0.28, vol:0.075, type:'sawtooth' },
  elite:   { n:null,                 f1:700,  f2:1400, dur:0.22, vol:0.060, type:'square' },
  charger: { n:[0.18, 0.06, 800],    f1:200,  f2:70,   dur:0.24, vol:0.065, type:'square' }
};
function enemyDie(type, combo, x){
  var pan = panOf(x);
  if (type === 'boss'){ SFX.bossKill(); return; }        // BOSS 保留原有的爆炸尾音
  var v = DIE_VOICE[type] || DIE_VOICE.normal;
  var k = 1 + Math.min(combo || 0, 25) * 0.03;           // 连杀越多音调越高（保留老手感）
  if (v.n) noiseSfx(v.n[0], v.n[1], v.n[2], 0, pan);
  tone({ freq:v.f1 * k, freq2:v.f2 * k, dur:v.dur, vol:v.vol, type:v.type, pan:pan });
}
var SFX = {""", '音色表 + towerShot/enemyDie')

# ④ 开火：按塔种发声（保留 35% 限流，避免后期爆音）
sub("    if (Math.random() < 0.35) SFX.shoot();",
    "    if (Math.random() < 0.35) towerShot(t.elem, cx(t.c));   // 按塔种发声 + 左右定位", '开火音')

# ⑤ 阵亡：按怪种发声
sub("  if (e.boss) SFX.bossKill(); else SFX.kill(comboCount);",
    "  enemyDie(e.type, comboCount, e.x);   // 按怪种发声 + 左右定位", '阵亡音')

# ⑥ 动态配乐：后期更快、残血更紧张、BOSS 波加低沉鼓
sub("""    bgmT = (bgmT || 0) + dt;
    if (bgmT >= 0.62){
      bgmT = 0;
      tone({ freq: 62 + (wave % 5) * 4, freq2: 48, dur: 0.26, vol: 0.035, type:'sine' });
      tone({ freq: 124, dur: 0.1, vol: 0.012, type:'triangle' });
    }""",
"""    bgmT = (bgmT || 0) + dt;
    var beat = 0.62 - Math.min(0.24, wave * 0.012);      // 波次越高，鼓点越急
    if (hp <= 6) beat *= 0.82;                            // 残血：心跳加快
    if (bgmT >= beat){
      bgmT = 0;
      var base = 62 + (wave % 5) * 4;
      tone({ freq: base, freq2: base * 0.75, dur: 0.26, vol: 0.035, type:'sine' });
      tone({ freq: base * 2, dur: 0.1, vol: 0.012, type:'triangle' });
      if (wave % 10 === 0) tone({ freq: 44, freq2: 30, dur: 0.5, vol: 0.05, type:'sine' });   // BOSS 波：低沉鼓
      if (hp <= 6) tone({ freq: 1400, dur: 0.05, vol: 0.012, type:'square' });                // 残血：心跳点缀
      if (comboCount >= 10) tone({ freq: 240 + comboCount * 6, dur: 0.07, vol: 0.014, type:'square' });  // 连杀：节奏点
    }""", '动态配乐')

# ⑦ UI 音：面板开/关、无尽里程碑
sub("""  sel.innerHTML = html;
  sel._refundShown = false;
  sel.style.display = 'block'; placeMenu(px, py);
}""",
"""  sel.innerHTML = html;
  sel._refundShown = false;
  sel.style.display = 'block'; placeMenu(px, py);
  SFX.panelOpen();
}""", '建塔面板开启音')
sub("function hideSel(){ sel.style.display = 'none'; menuPause = false; pvClear(); }",
    "function hideSel(){ sel.style.display = 'none'; menuPause = false; pvClear(); SFX.panelClose(); }", '面板关闭音')
sub("""  showBanner('第 ' + wave + ' 波');
  SFX.wave();""",
"""  showBanner('第 ' + wave + ' 波');
  SFX.wave();
  if (endless && wave % 10 === 0){            // 无尽模式每 10 波：里程碑音
    chord([392, 523, 659, 784], 0.5, 0.05, 'triangle');
    addFloat(W / 2, H * 0.4, '♾ 第 ' + wave + ' 波', '#8ff0ff');
  }""", '无尽里程碑音')
sub("""  click:   function(){ tone({ freq:880, dur:0.035, vol:0.035, type:'square' }); },""",
"""  click:   function(){ tone({ freq:880, dur:0.035, vol:0.035, type:'square' }); },
  panelOpen:  function(){ tone({ freq:520, freq2:880, dur:0.09, vol:0.026, type:'triangle' }); },
  panelClose: function(){ tone({ freq:760, freq2:420, dur:0.08, vol:0.022, type:'triangle' }); },
  bookTab:    function(){ tone({ freq:1040, freq2:1320, dur:0.07, vol:0.026, type:'sine' }); },""", 'UI 音效')
sub("""  on('bookTabMob', function(){ bookTab = 'mob'; bookRender(); SFX.click(); });""",
    """  on('bookTabMob', function(){ bookTab = 'mob'; bookRender(); SFX.bookTab(); });""", '图鉴页签音 A')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_g_audio 完成')
