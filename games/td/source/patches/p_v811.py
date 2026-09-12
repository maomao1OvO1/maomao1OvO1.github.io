# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 敌人贴图：支持 4 套美术风格（全部程序绘制、无图片资源，仍然走贴图缓存所以不损性能）
rep("""function enemySprite(color, r, flash){
  var key = color + '|' + Math.round(r * 10) + '|' + (flash ? 1 : 0);
  if (enemyTex[key]) return enemyTex[key];
  var rr = Math.max(6, r) * 1.3;                 // 球半径（留出描边余量）
  var size = Math.ceil(rr * 2.3);
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  var cc = size / 2;
  var c1 = flash ? '#ffffff' : color;
  var gd = g.createRadialGradient(cc - rr * 0.35, cc - rr * 0.35, rr * 0.15, cc, cc, rr);
  gd.addColorStop(0, '#ffffff');
  gd.addColorStop(0.35, c1);
  gd.addColorStop(1, 'rgba(10,16,30,.9)');
  g.fillStyle = gd;
  g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.fill();
  g.strokeStyle = c1; g.lineWidth = 1.6;
  g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.stroke();
  var o = { cv: c, size: size, r: rr, base: r };
  enemyTex[key] = o;
  return o;
}""",
"""/* ===== v8.11 敌人美术风格（可切换）=====
   毛毛要求「敌人美术优化，多准备几版」→ 这里做 4 套完全程序绘制的风格（零图片资源），
   在设置面板里一键切换、随时对比；仍然走贴图缓存，所以多套风格不会拖慢性能。 */
var ENEMY_ART = 'orbs';
var ENEMY_ART_LIST = [
  { key:'orbs',    name:'发光球（原版）', tip:'渐变发光球体，最省性能' },
  { key:'shapes',  name:'几何派',         tip:'每种敌人一种几何外形，辨识度最高' },
  { key:'faces',   name:'表情派',         tip:'球体 + 眼睛嘴巴，更可爱有生命感' },
  { key:'armored', name:'装甲派',         tip:'球体 + 装甲片与尖刺，硬核质感' }
];
/* 每种敌人对应的几何形状（几何派用）*/
var ENEMY_SHAPE = {
  normal:'circle', fast:'tri', armor:'hex', shield:'ring', boss:'star',
  healer:'cross', splitter:'blob', spawn2:'circle', bomber:'spike',
  elite:'star', charger:'rect', thief:'diamond', phase:'ring',
  bulwark:'hex', airdrop:'tri'
};
function enemyShapePath(g, shape, cc, rad){
  g.beginPath();
  if (shape === 'tri'){
    for (var i = 0; i < 3; i++){ var a = -Math.PI / 2 + i * 2.094; var x = cc + Math.cos(a) * rad, y = cc + Math.sin(a) * rad; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  } else if (shape === 'hex'){
    for (var j = 0; j < 6; j++){ var a2 = -Math.PI / 2 + j * 1.047; var x2 = cc + Math.cos(a2) * rad, y2 = cc + Math.sin(a2) * rad; j ? g.lineTo(x2, y2) : g.moveTo(x2, y2); }
  } else if (shape === 'star'){
    for (var k = 0; k < 10; k++){ var a3 = -Math.PI / 2 + k * 0.628, rr2 = (k % 2) ? rad * 0.52 : rad; var x3 = cc + Math.cos(a3) * rr2, y3 = cc + Math.sin(a3) * rr2; k ? g.lineTo(x3, y3) : g.moveTo(x3, y3); }
  } else if (shape === 'rect'){
    g.rect(cc - rad * 0.86, cc - rad * 0.86, rad * 1.72, rad * 1.72);
  } else if (shape === 'diamond'){
    g.moveTo(cc, cc - rad); g.lineTo(cc + rad * 0.82, cc); g.lineTo(cc, cc + rad); g.lineTo(cc - rad * 0.82, cc);
  } else if (shape === 'spike'){
    for (var m = 0; m < 16; m++){ var a4 = m * 0.393, r4 = (m % 2) ? rad * 0.62 : rad * 1.12; var x4 = cc + Math.cos(a4) * r4, y4 = cc + Math.sin(a4) * r4; m ? g.lineTo(x4, y4) : g.moveTo(x4, y4); }
  } else if (shape === 'cross'){
    var w1 = rad * 0.34;
    g.moveTo(cc - w1, cc - rad); g.lineTo(cc + w1, cc - rad); g.lineTo(cc + w1, cc - w1); g.lineTo(cc + rad, cc - w1);
    g.lineTo(cc + rad, cc + w1); g.lineTo(cc + w1, cc + w1); g.lineTo(cc + w1, cc + rad); g.lineTo(cc - w1, cc + rad);
    g.lineTo(cc - w1, cc + w1); g.lineTo(cc - rad, cc + w1); g.lineTo(cc - rad, cc - w1); g.lineTo(cc - w1, cc - w1);
  } else if (shape === 'blob'){
    for (var n = 0; n < 12; n++){ var a5 = n * 0.524, r5 = rad * (0.86 + Math.sin(n * 1.9) * 0.14); var x5 = cc + Math.cos(a5) * r5, y5 = cc + Math.sin(a5) * r5; n ? g.lineTo(x5, y5) : g.moveTo(x5, y5); }
  } else if (shape === 'ring'){
    g.arc(cc, cc, rad * 0.78, 0, 6.3); g.moveTo(cc + rad, cc); g.arc(cc, cc, rad, 0, 6.3, true);
  } else {
    g.arc(cc, cc, rad, 0, 6.3);
  }
  g.closePath();
}
function enemySprite(color, r, flash, style, type){
  style = style || ENEMY_ART || 'orbs';
  var key = color + '|' + Math.round(r * 10) + '|' + (flash ? 1 : 0) + '|' + style + '|' + (type || '');
  if (enemyTex[key]) return enemyTex[key];
  var rr = Math.max(6, r) * 1.3;                 // 球半径（留出描边余量）
  var size = Math.ceil(rr * 2.6);
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var g = c.getContext('2d');
  var cc = size / 2;
  var c1 = flash ? '#ffffff' : color;
  var gd = g.createRadialGradient(cc - rr * 0.35, cc - rr * 0.35, rr * 0.15, cc, cc, rr);
  gd.addColorStop(0, '#ffffff');
  gd.addColorStop(0.35, c1);
  gd.addColorStop(1, 'rgba(10,16,30,.9)');
  if (style === 'shapes'){
    /* —— 几何派：每种敌人一个外形（三角/六边/星形/菱形/十字/锯齿…）—— */
    enemyShapePath(g, ENEMY_SHAPE[type] || 'circle', cc, rr);
    g.fillStyle = gd; g.fill();
    g.strokeStyle = c1; g.lineWidth = Math.max(1.6, rr * 0.14); g.stroke();
    g.globalAlpha = 0.5; g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.arc(cc - rr * 0.3, cc - rr * 0.3, rr * 0.18, 0, 6.3); g.fill();
    g.globalAlpha = 1;
  } else if (style === 'faces'){
    /* —— 表情派：球体 + 眼睛 + 嘴（眼睛带高光，看起来有生命）—— */
    g.fillStyle = gd;
    g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.fill();
    g.strokeStyle = c1; g.lineWidth = 1.6;
    g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.stroke();
    var er = rr * 0.24, ex = rr * 0.36, ey = -rr * 0.12;
    [-1, 1].forEach(function(sgn){
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(cc + sgn * ex, cc + ey, er, 0, 6.3); g.fill();
      g.fillStyle = '#101828';
      g.beginPath(); g.arc(cc + sgn * ex + sgn * er * 0.18, cc + ey + er * 0.12, er * 0.55, 0, 6.3); g.fill();
    });
    g.strokeStyle = 'rgba(16,24,40,.85)'; g.lineWidth = Math.max(1.4, rr * 0.11);
    g.beginPath();
    if (type === 'boss' || type === 'elite' || type === 'charger'){
      g.moveTo(cc - rr * 0.34, cc + rr * 0.42);           /* 凶：咧嘴 */
      g.lineTo(cc - rr * 0.12, cc + rr * 0.26);
      g.lineTo(cc + rr * 0.12, cc + rr * 0.46);
      g.lineTo(cc + rr * 0.34, cc + rr * 0.28);
    } else {
      g.arc(cc, cc + rr * 0.30, rr * 0.28, 0.25, Math.PI - 0.25);   /* 呆萌：微笑弧 */
    }
    g.stroke();
  } else if (style === 'armored'){
    /* —— 装甲派：球体 + 装甲环 + 外圈装甲片（硬核质感）—— */
    g.fillStyle = gd;
    g.beginPath(); g.arc(cc, cc, rr * 0.84, 0, 6.3); g.fill();
    g.strokeStyle = c1; g.lineWidth = Math.max(2, rr * 0.18);
    for (var p2 = 0; p2 < 6; p2++){
      var ap = p2 * 1.047 + 0.3;
      g.beginPath();
      g.arc(cc, cc, rr, ap - 0.28, ap + 0.28);
      g.stroke();
    }
    g.lineWidth = Math.max(2, rr * 0.22); g.strokeStyle = 'rgba(255,255,255,.5)';
    g.beginPath(); g.arc(cc, cc, rr * 0.46, 0.6, 2.4); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(cc, cc, rr * 0.16, 0, 6.3); g.fill();
  } else {
    g.fillStyle = gd;
    g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.fill();
    g.strokeStyle = c1; g.lineWidth = 1.6;
    g.beginPath(); g.arc(cc, cc, rr, 0, 6.3); g.stroke();
  }
  var o = { cv: c, size: size, r: rr, base: r };
  enemyTex[key] = o;
  return o;
}""", '敌人多风格贴图')

# ② 调用点带上风格与类型
rep("    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0);",
    "    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0, ENEMY_ART, e.type);   /* v8.11：按当前美术风格取贴图 */", '调用点带风格')

# ③ 设置面板加「敌人美术」按钮
rep("""  <button class="btn" id="setFxBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">✨ 画质：高</button>""",
"""  <button class="btn" id="setFxBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">✨ 画质：高</button>
  <button class="btn" id="setArtBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(60,40,100,.85)">🎨 敌人美术：发光球</button>""", '设置面板加美术按钮')

# ④ 美术切换逻辑 + 持久化
rep("""var ENEMY_ART = 'orbs';""",
"""var ENEMY_ART = 'orbs';
function enemyArtName(key){
  for (var i = 0; i < ENEMY_ART_LIST.length; i++) if (ENEMY_ART_LIST[i].key === key) return ENEMY_ART_LIST[i].name;
  return ENEMY_ART_LIST[0].name;
}
function cycleEnemyArt(){
  var i0 = 0;
  for (var i = 0; i < ENEMY_ART_LIST.length; i++) if (ENEMY_ART_LIST[i].key === ENEMY_ART) i0 = i;
  var next = ENEMY_ART_LIST[(i0 + 1) % ENEMY_ART_LIST.length];
  ENEMY_ART = next.key;
  enemyTex = {};                     /* 清贴图缓存：换风格后要重新生成 */
  var b = document.getElementById('setArtBtn');
  if (b) b.textContent = '🎨 敌人美术：' + next.name;
  showTip('敌人美术：' + next.name + ' —— ' + next.tip);
  try { saveSettings(); } catch (e) {}
  if (typeof draw === 'function') draw();
  return next.key;
}""", '美术切换逻辑')

# ⑤ 存读设置里带上 art
rep("  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON })); } catch (e) {}",
    "  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON, art: ENEMY_ART })); } catch (e) {}", '保存美术设置')
rep("""    var raw = localStorage.getItem('td_settings');""",
"""    var raw = localStorage.getItem('td_settings');""", '占位')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.11 敌人美术补丁完成 ---')
