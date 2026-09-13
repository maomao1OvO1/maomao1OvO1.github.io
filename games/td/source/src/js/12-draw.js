/* ══════════════════════════════════════════════════════════════════════════
 * 12-draw.js —— 渲染：静态路径层缓存、敌人贴图预渲染、全部绘制逻辑
 *
 * 来源：game.html 第 3898-4691 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 绘制 ================= */
function roundRect(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
}
/* canvas 正多边形路径（rot 为起始角）：画塔与敌人外形用 */
function poly(x, y, rad, sides, rot){
  ctx.beginPath();
  for (var i = 0; i < sides; i++){
    var a = rot + i * Math.PI * 2 / sides;
    var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
/* 每种塔一个专属造型：一眼可辨 */
function drawTowerBody(x, y, rad, elem, color, k){
  ctx.save();
  /* v7.6：塔多了（>40 座）就省掉塔身发光 —— 帧稳优先，视觉差异很小 */
  if (towers.length > 40) ctx.shadowBlur = 0; else glow(color, 16);
  if (elem === 'fire'){ poly(x, y, rad, 4, Math.PI/4); }          // 火：方形棱角
  else if (elem === 'ice'){ poly(x, y, rad, 6, -Math.PI/2); }      // 冰：六边形
  else if (elem === 'phys'){ poly(x, y, rad, 4, 0); }              // 物理：菱形
  else if (elem === 'sniper'){ poly(x, y, rad, 3, -Math.PI/2); }   // TOWERS_V6_PATCH 狙击：三角炮座
  else if (elem === 'mortar'){ poly(x, y, rad, 8, Math.PI/8); }    // TOWERS_V6_PATCH 榴弹：八角厚底座
  else { ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3); }            // 雷/毒/辅助：圆
  ctx.fillStyle = 'rgba(14,20,34,.95)'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.shadowBlur = 0;
  if (elem === 'fire'){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - rad * 0.58);
    ctx.quadraticCurveTo(x + rad * 0.48, y - rad * 0.02, x, y + rad * 0.52);
    ctx.quadraticCurveTo(x - rad * 0.48, y - rad * 0.02, x, y - rad * 0.58);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath(); ctx.arc(x, y + rad * 0.08, rad * 0.19, 0, 6.3); ctx.fill();
  } else if (elem === 'ice'){
    ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++){
      var a = i * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * rad * 0.64, y - Math.sin(a) * rad * 0.64);
      ctx.lineTo(x + Math.cos(a) * rad * 0.64, y + Math.sin(a) * rad * 0.64);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, rad * 0.24, 0, 6.3); ctx.fill();
  } else if (elem === 'thunder'){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + rad * 0.26, y - rad * 0.62);
    ctx.lineTo(x - rad * 0.30, y + rad * 0.04);
    ctx.lineTo(x - rad * 0.04, y + rad * 0.04);
    ctx.lineTo(x - rad * 0.26, y + rad * 0.62);
    ctx.lineTo(x + rad * 0.32, y - rad * 0.08);
    ctx.lineTo(x + rad * 0.04, y - rad * 0.08);
    ctx.closePath(); ctx.fill();
  } else if (elem === 'poison'){
    ctx.fillStyle = '#eaffef';
    ctx.beginPath(); ctx.arc(x, y - rad * 0.10, rad * 0.50, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#141026';
    ctx.beginPath(); ctx.arc(x - rad * 0.19, y - rad * 0.15, rad * 0.14, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(x + rad * 0.19, y - rad * 0.15, rad * 0.14, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#eaffef';
    ctx.fillRect(x - rad * 0.30, y + rad * 0.28, rad * 0.60, rad * 0.16);
    ctx.fillStyle = '#141026';
    for (var d2 = 0; d2 < 3; d2++) ctx.fillRect(x - rad * 0.24 + d2 * rad * 0.20, y + rad * 0.28, rad * 0.07, rad * 0.16);
    ctx.fillStyle = color;                                  // 上升毒气泡
    var bb = (gameT * 1.5) % 1;
    ctx.globalAlpha = 1 - bb;
    for (var p2 = 0; p2 < 2; p2++){
      var pc = (bb + p2 * 0.5) % 1;
      ctx.beginPath();
      ctx.arc(x + (p2 ? rad * 0.52 : -rad * 0.52), y - rad * 0.42 - pc * rad * 0.95, rad * 0.15 * (1 - pc * 0.4), 0, 6.3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (elem === 'phys'){
    ctx.fillStyle = '#eef3ff';
    ctx.fillRect(x - rad * 0.44, y - rad * 0.52, rad * 0.88, rad * 0.30);   // 锤头
    ctx.fillStyle = color;
    ctx.fillRect(x - rad * 0.10, y - rad * 0.22, rad * 0.20, rad * 0.66);   // 锤柄
    ctx.fillStyle = '#93a3ba';
    ctx.fillRect(x - rad * 0.24, y + rad * 0.44, rad * 0.48, rad * 0.14);
  } else if (elem === 'sniper'){
    /* TOWERS_V6_PATCH 狙击：瞄准十字（外环 + 十字线 + 中心亮点） */
    ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y, rad * 0.62, 0, 6.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - rad * 0.92, y); ctx.lineTo(x - rad * 0.28, y);
    ctx.moveTo(x + rad * 0.28, y); ctx.lineTo(x + rad * 0.92, y);
    ctx.moveTo(x, y - rad * 0.92); ctx.lineTo(x, y - rad * 0.28);
    ctx.moveTo(x, y + rad * 0.28); ctx.lineTo(x, y + rad * 0.92);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, rad * 0.20, 0, 6.3); ctx.fill();
  } else if (elem === 'mortar'){
    /* TOWERS_V6_PATCH 榴弹：圆鼓弹仓（外圈 + 内孔 + 三发炮弹） */
    ctx.fillStyle = '#ffd9a6';
    ctx.beginPath(); ctx.arc(x, y - rad * 0.06, rad * 0.54, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#141026';
    ctx.beginPath(); ctx.arc(x, y - rad * 0.06, rad * 0.32, 0, 6.3); ctx.fill();
    ctx.fillStyle = color;
    for (var m2 = 0; m2 < 3; m2++){
      var ma2 = -Math.PI / 2 + m2 * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ma2) * rad * 0.36, y - rad * 0.06 + Math.sin(ma2) * rad * 0.36, rad * 0.14, 0, 6.3);
      ctx.fill();
    }
  } else if (elem === 'support'){
    ctx.strokeStyle = color; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, rad * 0.62, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, rad * 0.30, 0, 6.3); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, rad * 0.15, 0, 6.3); ctx.fill();
    for (var s2 = 0; s2 < 4; s2++){
      var a2 = s2 * Math.PI / 2 + gameT * 0.9;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a2) * rad * 0.62, y + Math.sin(a2) * rad * 0.62);
      ctx.lineTo(x + Math.cos(a2) * rad * 0.98, y + Math.sin(a2) * rad * 0.98);
      ctx.stroke();
    }
  }
  ctx.restore();
}
/* 静态层（网格 + 路径底色）：只在布局/关卡变化时重画一次，之后每帧只 drawImage
   —— 原来每帧要画 20+ 条网格线 + 3 次路径描边，是移动端最浪费的一块 */
var bgCv = null, bgKey = '';
/* 绘制静态战场背景（网格与路径）并缓存成离屏图：缓存 key 含路径指纹，避免教学关与第 1 关共用 lvIndex 时画出错地图 */
function drawStaticBg(){
  /* 缓存 key 必须包含「路径指纹」：教学关与第 1 关的 lvIndex 都是 0、网格尺寸也相同，
     只按 lvIndex 判定会命中缓存 → 画出上一张地图的路径（怪物走的却是新地图）→ 贴图与路线不符 */
  var wpKey = '';
  for (var wk = 0; wk < WAYPOINTS.length; wk++) wpKey += WAYPOINTS[wk][0] + '_' + WAYPOINTS[wk][1] + '.';
  if (WAYPOINTS2) for (var wk2 = 0; wk2 < WAYPOINTS2.length; wk2++) wpKey += 'B' + WAYPOINTS2[wk2][0] + '_' + WAYPOINTS2[wk2][1] + '.';   /* v8.10 双入口也要进指纹 */
  var key = COLS + 'x' + ROWS + '|' + Math.round(CELL) + '|' + Math.round(OX) + '|' + Math.round(OY)
          + '|' + lvIndex + '|' + DPR + '|' + wpKey;
  if (!bgCv || bgKey !== key){
    if (!bgCv) bgCv = document.createElement('canvas');
    bgCv.width = Math.max(1, Math.floor(W * DPR));
    bgCv.height = Math.max(1, Math.floor(H * DPR));
    var g = bgCv.getContext('2d');
    if (g.setTransform) g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.strokeStyle = 'rgba(124,92,191,.16)'; g.lineWidth = 1;
    for (var c = 0; c <= COLS; c++){
      g.beginPath(); g.moveTo(OX + c*CELL, OY); g.lineTo(OX + c*CELL, OY + ROWS*CELL); g.stroke();
    }
    for (var r = 0; r <= ROWS; r++){
      g.beginPath(); g.moveTo(OX, OY + r*CELL); g.lineTo(OX + COLS*CELL, OY + r*CELL); g.stroke();
    }
    g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(36,26,74,.95)';
    g.lineJoin = 'round'; g.lineCap = 'round';
    /* v8.10：双入口关卡要画两条路（样式完全一致，玩家一眼能看出「有两路要守」） */
    var _allPaths = WAYPOINTS2 ? [WAYPOINTS, WAYPOINTS2] : [WAYPOINTS];
    for (var _pi = 0; _pi < _allPaths.length; _pi++){
      var _pl = _allPaths[_pi];
      g.beginPath();
      for (var i = 0; i < _pl.length; i++){
        var p = { x: cx(_pl[i][0]), y: cy(_pl[i][1]) };
        if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
      }
      g.stroke();
      g.lineWidth = 2; g.strokeStyle = 'rgba(187,156,255,.35)';
      g.stroke();
      g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(36,26,74,.95)';
    }
    bgKey = key;
  }
  ctx.drawImage(bgCv, 0, 0, W, H);
}
/* ================= 连杀提示重做（A 路）：右侧定位 + 五档配色 + 分级动画 =================
   档位：0 = 3~4 连 | 1 = 5~9 连 | 2 = 10~19 连 | 3 = 20~39 连 | 4 = 40+ 连
   动画全部只由 gameT / comboT 驱动（comboShown 只是 gameT 时间戳，不是新计时器）；
   颜色 / 后缀表均为静态数组，绘制时零对象分配、零图片资源，纯 ctx 绘制。               */
function comboTier(n){
  if (n >= 40) return 4;
  if (n >= 20) return 3;
  if (n >= 10) return 2;
  if (n >= 5) return 1;
  return 0;
}
var COMBO_FILL    = ['#8fe4ff', '#ffb24a', '#ff6a4a', '#ff5ad0', '#ffffff'];   // 五档主色（40+ = 白热芯）
/* 连杀徽章五档配色之一：描边色 */
var COMBO_EDGE    = ['rgba(143,228,255,.55)', 'rgba(255,178,74,.62)',
                     'rgba(255,106,74,.85)', 'rgba(255,90,208,.82)', 'rgba(255,255,255,.92)'];
/* 连杀徽章五档配色之一：发光色 */
var COMBO_GLOW    = ['rgba(187,156,255,.9)', 'rgba(255,170,60,.9)',
                     'rgba(255,90,60,.95)', 'rgba(255,70,200,.95)', 'rgba(255,238,214,1)'];
/* 连杀徽章五档配色之一：档位后缀符号（✦ / ⚡ / 🔥 等）*/
var COMBO_TAG     = ['', ' \u2726', ' \u26a1', ' \ud83d\udd25', ' \ud83d\udd25\ud83d\udd25'];   // 档位后缀（不改汉字部分）
/* 最高档连杀用的彩虹渐变取色环 */
var COMBO_RAINBOW = ['#ff4d4d', '#ffb24a', '#ffe94a', '#5aff9a', '#4ad4ff', '#b06aff'];       // 40+ 彩虹外圈
/* 按当前连杀档位取主色（连杀徽章与文字用）*/
function comboColor(n){ return COMBO_FILL[comboTier(n)]; }
function comboTierSfx(t){          // 五档切换音效：音高/质感逐档递进（复用 tone / chord，音量克制）
  if (t <= 0){ tone({ freq:1180, dur:0.07, vol:0.032, type:'triangle' }); return; }
  if (t === 1){ tone({ freq:1397, dur:0.08, vol:0.036, type:'square' }); return; }
  if (t === 2){ chord([1046, 1568], 0.11, 0.042, 'square'); return; }
  if (t === 3){ chord([1175, 1760], 0.13, 0.046, 'square'); noiseSfx(0.10, 0.028, 4200); return; }
  chord([1568, 2093, 2637], 0.16, 0.048, 'triangle'); noiseSfx(0.16, 0.036, 5200);
}
function comboPopScale(age){       // 弹入缓动：0.6 倍弹到 1.15 再回 1.0（总时长 0.34 秒）
  if (age < 0) age = 0;
  if (age >= 0.34) return 1;
  var p = age / 0.34;
  if (p < 0.62){ var q = 1 - Math.pow(1 - p / 0.62, 3); return 0.6 + 0.55 * q; }
  var q2 = 1 - Math.pow(1 - (p - 0.62) / 0.38, 2);
  return 1.15 - 0.15 * q2;
}
/* 绘制连杀徽章：3 连起显示，档位提升时做弹入动画（纯靠 gameT 时间戳判定，不新增计时器）*/
function drawComboBadge(){
  if (!(comboT > 0 && comboCount >= 3)) return;
  var tier = comboTier(comboCount);
  /* 弹入时机：连杀提示首次出现（3 连）或档位提升（5 / 10 / 20 / 40）——只打 gameT 时间戳 */
  if (comboCount !== comboShownN){
    comboShownN = comboCount;
    if (comboCount === 3 || tier !== comboShownTier){ comboShown = gameT; comboShownTier = tier; }
  }
  var sc = comboPopScale(gameT - comboShown);
  /* 分级动画：3~9 上下浮动 / 10~19 加左右抖动 + 粗描边 / 20~39 加脉冲 + 旋转 / 40+ 再加彩虹光环 */
  var fly = Math.sin(gameT * 3.4) * (H * 0.008);
  var shx = tier >= 2 ? Math.sin(gameT * 26) * (W * 0.004) : 0;
  if (tier >= 3) sc *= 1 + Math.sin(gameT * 5.2) * 0.06;      // 脉冲 ±6%
  var rot = tier >= 3 ? Math.sin(gameT * 2.6) * 0.052 : 0;     // 旋转 ±3°（0.052 rad）
  /* 定位：右对齐（x = 文字右边缘 = 画布右缘内缩 W*0.04），每档右移 + 上移，越连越往外炸 */
  var rx = W * 0.96 + tier * (W * 0.005) + shx;
  if (rx > W * 0.995) rx = W * 0.995;
  var ry = H * 0.18 - tier * (H * 0.02) + fly;
  if (ry < H * 0.09) ry = H * 0.09;
  var fz = W * 0.050 * (1 + tier * 0.05) * sc;   // 字号收一点，少遮右侧塔位
  var txt = '连杀 ×' + comboCount + COMBO_TAG[tier];
  var alp = Math.min(1, comboT / 0.6) * 0.78;   // 半透明（发光+描边保证可读）：不糊住右侧塔位可点区域
  ctx.save();
  ctx.globalAlpha = alp;
  ctx.textAlign = 'right';         // 关键：右对齐，fillText 的 x 即文字右边缘（不再用 W/2 居中）
  ctx.lineJoin = 'round';
  ctx.translate(rx, ry);
  if (rot !== 0) ctx.rotate(rot);
  ctx.font = 'bold ' + fz + 'px sans-serif';
  var tw = ctx.measureText(txt).width;
  var ccx = -tw * 0.5, ccy = -fz * 0.34;
  if (tier >= 4){                  // 40+：扩散光环——半径随存活时间增长、透明度衰减
    var hAge = COMBO_T_MAX - comboT; if (hAge < 0) hAge = 0;
    var h0 = (hAge % 1.1) / 1.1;
    for (var hi = 0; hi < 3; hi++){
      var ph = (h0 + hi * 0.333) % 1;
      ctx.globalAlpha = alp * (1 - ph) * 0.55;
      ctx.strokeStyle = COMBO_RAINBOW[hi * 2];
      ctx.lineWidth = 1.5 + (1 - ph) * 2;
      ctx.beginPath(); ctx.arc(ccx, ccy, fz * 0.85 + ph * fz * 1.5, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = alp;
    ctx.lineWidth = 1.6;           // 白热芯 + 彩虹描边
    for (var ri = 0; ri < COMBO_RAINBOW.length; ri++){
      ctx.strokeStyle = COMBO_RAINBOW[ri];
      ctx.strokeText(txt, ri - 2.5, 0);
    }
  } else {
    ctx.lineWidth = tier >= 3 ? 3.4 : (tier === 2 ? 2.4 : 1.4);   // 10~19 连起描边加粗
    ctx.strokeStyle = COMBO_EDGE[tier];
    ctx.strokeText(txt, 0, 0);
  }
  glow(COMBO_GLOW[tier], tier >= 3 ? 26 : 18);
  ctx.fillStyle = COMBO_FILL[tier];
  ctx.fillText(txt, 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}
/* ===== v7.6 性能：敌人球体预渲染成贴图（原来每帧每个敌人都 createRadialGradient，
   塔多敌人多时单帧耗时飙升 → 帧数看着正常但动画一顿一顿）===== */
var enemyTex = {};
/* ===== v8.11 敌人美术风格（可切换）=====
   毛毛要求「敌人美术优化，多准备几版」→ 这里做 4 套完全程序绘制的风格（零图片资源），
   在设置面板里一键切换、随时对比；仍然走贴图缓存，所以多套风格不会拖慢性能。 */
var ENEMY_ART = 'orbs';
/* 敌人美术风格 key → 中文名（设置面板显示当前风格）*/
function enemyArtName(key){
  for (var i = 0; i < ENEMY_ART_LIST.length; i++) if (ENEMY_ART_LIST[i].key === key) return ENEMY_ART_LIST[i].name;
  return ENEMY_ART_LIST[0].name;
}
/* 切换到下一种敌人美术风格并清空贴图缓存（设置面板的「敌人外观」按钮）*/
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
}
/* 敌人美术风格备选表（设置面板可循环切换）：key 风格键 · name 显示名 · tip 说明 */
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
/* 按形状名（tri/hex/…）在离屏 canvas 上勾出敌人轮廓路径：生成敌人贴图时调用 */
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
/* 取敌人贴图：同一「颜色+半径+受击态+风格+类型」只生成一次并缓存进 enemyTex，避免每帧重画 */
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
}
/* 画面总绘制：每帧按「背景 → 路径 → 裂隙 → 炮塔 → 敌人 → 特效 → HUD」的顺序重画整个战场（frame() 每帧调用）*/
function draw(){
  ctx.save();
  if (shakeT > 0){
    var sh = shakeT * 14;
    ctx.translate((Math.random()-0.5) * sh, (Math.random()-0.5) * sh);
  }
  ctx.fillStyle = '#120d22'; ctx.fillRect(-20, -20, W+40, H+40);
  drawStaticBg();          // 网格 + 路径（缓存层，每帧一次 drawImage）
  drawRifts();             // v8.21 共鸣裂隙标记（数量少，直接画在动态层）
  /* 流动能量带
     v8.22 修 bug（毛毛报「两条路只有一条路会有点点」）：
     原来这里只遍历了 WAYPOINTS —— 双入口地图的第二条入口路完全没有流动光点，
     看起来像是「画了但没通电」。坐标函数 waypointPx(i, pi) 本来就支持 pi=1 走第二条，
     静态层的路径也是两条都画的，只有这段动画漏了。 */
  ctx.save();
  ctx.setLineDash([CELL*0.5, CELL*0.62]);
  ctx.lineDashOffset = -(gameT * CELL * 1.5) % (CELL * 1.12);
  var _pathN = WAYPOINTS2 ? 2 : 1;
  for (var _pn = 0; _pn < _pathN; _pn++){
    var _plist = (_pn === 1) ? WAYPOINTS2 : WAYPOINTS;
    if (!_plist) continue;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(120,220,255,.22)';
    ctx.beginPath();
    for (var wi = 0; wi < _plist.length; wi++){
      var wp2 = waypointPx(wi, _pn);
      if (!wp2) continue;
      if (wi === 0) ctx.moveTo(wp2.x, wp2.y); else ctx.lineTo(wp2.x, wp2.y);
    }
    ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(180,240,255,.7)';
    ctx.stroke();
  }
  ctx.restore();
  // 起点 / 终点（v8.22：双入口地图有两个起点，都要标出来；终点共用基地所以只标一次）
  var s1 = waypointPx(WAYPOINTS.length - 1);
  for (var _sp = 0; _sp < (WAYPOINTS2 ? 2 : 1); _sp++){
    var s0 = waypointPx(0, _sp);
    if (!s0) continue;
    ctx.fillStyle = 'rgba(120,200,255,.25)'; ctx.beginPath(); ctx.arc(s0.x, s0.y, CELL*0.35, 0, 6.3); ctx.fill();
  }
  var bp = 1 + Math.sin(gameT * 3) * 0.12;
  ctx.strokeStyle = 'rgba(255,110,140,.85)'; ctx.lineWidth = 3;
  glow('#ff5a78', 18);
  ctx.beginPath(); ctx.arc(s1.x, s1.y, CELL*0.5*bp, 0, 6.3); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,90,120,.28)'; ctx.beginPath(); ctx.arc(s1.x, s1.y, CELL*0.42, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#ff8fa8'; ctx.font = 'bold ' + (CELL*0.34) + 'px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('基地', s1.x, s1.y + CELL*0.12);

  // 射程圈预览（画在路径之上、塔与敌人之下：既看得清范围，又不遮挡塔和怪）
  if (pvOn){
    var pvx = cx(pvC), pvy = cy(pvR);
    var pvPulse = 1 + Math.sin(pvT * 3.2) * 0.035;          // 轻微脉冲（pvT：面板打开时也继续呼吸）
    var pvMain = ELEMS[pvElem] ? pvElem : pvLastElem;
    if (!ELEMS[pvMain]) pvMain = 'fire';
    /* v6.9：不再叠其余塔的射程圈（多圈重叠看不懂），只画当前这一种，并标出「能覆盖几格路」 */
    // 主射程圈：半透明填充 + 虚线描边
    var pvRad = pvRangePx(pvMain, pvTower) * pvPulse;
    pvRing(pvx, pvy, pvRad, ELEMS[pvMain].color, 1, 2.2, true);
    // 候选格/该塔所在格高亮
    ctx.save();
    ctx.strokeStyle = pvRGBA(ELEMS[pvMain].color, 0.85); ctx.lineWidth = 2;
    roundRect(OX + pvC * CELL + 2, OY + pvR * CELL + 2, CELL - 4, CELL - 4, CELL * 0.14);
    ctx.stroke();
    ctx.restore();
    // 射程数值（压不住屏幕时下压到格子附近）
    ctx.save();
    ctx.fillStyle = ELEMS[pvMain].color;
    ctx.font = 'bold ' + (CELL*0.26) + 'px sans-serif'; ctx.textAlign = 'center';
    var pvCover = pvCoverCount(pvC, pvR, pvRad);
    ctx.fillText(ELEMS[pvMain].icon + ' 射程 ' + (pvRangePx(pvMain, pvTower) / CELL).toFixed(1) + ' 格 · 覆盖 ' + pvCover + ' 格路',
                 pvx, Math.max(CELL * 0.30, pvy - pvRad - CELL * 0.14));
    ctx.restore();
  }

  // 共鸣连线
  for (var ti = 0; ti < towers.length; ti++){
    var t = towers[ti];
    if (!t.res || !t.res.tags.length) continue;
    var nb = [[1,0],[0,1]];
    for (var n = 0; n < 2; n++){
      var o = towerAt(t.c + nb[n][0], t.r + nb[n][1]);
      if (!o || !o.res || !o.res.tags.length) continue;
      var same = (o.elem === t.elem);
      ctx.beginPath();
      ctx.moveTo(cx(t.c), cy(t.r)); ctx.lineTo(cx(o.c), cy(o.r));
      var pulse = 0.62 + 0.38 * Math.sin(gameT * 5 + ti);
      ctx.lineWidth = (same ? 3.2 : 5.6) * pulse;
      ctx.strokeStyle = same ? 'rgba(255,215,106,.35)' : 'rgba(120,240,255,.35)';   // v7.6：外层宽描边代替发光
      ctx.lineWidth = (same ? 7.5 : 11) * pulse;
      ctx.stroke();
      ctx.strokeStyle = same ? 'rgba(255,225,140,1)' : 'rgba(180,245,255,1)';
      ctx.lineWidth = (same ? 2.2 : 3.4) * pulse;
      ctx.stroke();
    }
  }
  // 塔
  for (var k = 0; k < towers.length; k++){
    var tw = towers[k], def = ELEMS[tw.elem];
    if (tw.buildT > 0) tw.buildT -= frameDt;
    var bScale = tw.buildT > 0 ? (0.5 + 0.5 * (1 - tw.buildT / 0.45)) : 1;
    var x = cx(tw.c), y = cy(tw.r), rad = CELL * 0.34 * bScale;
    if (tw.flash > 0) tw.flash -= frameDt;
    drawTowerBody(x, y, rad, tw.elem, def.color, k);
    // 被 BOSS 沉默：灰白覆盖 + ⚡ 断线标记
    if (tw.silencedT > 0){
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#aeb8c6';
      ctx.beginPath(); ctx.arc(x, y, rad * 0.92, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#efe9ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, 6.3); ctx.stroke();
      ctx.fillStyle = '#efe9ff'; ctx.font = 'bold ' + (CELL*0.3) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚡', x, y - rad - 3);
      ctx.restore();
    }
    // 辅助塔：显示光环范围
    if (def.aura){
      ctx.save();
      ctx.setLineDash([CELL * 0.14, CELL * 0.16]);
      ctx.lineDashOffset = -(gameT * CELL * 0.6) % (CELL * 0.3);
      ctx.strokeStyle = 'rgba(185,140,255,.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, CELL * 2.6, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    // 炮口（攻击瞬间有闪光）
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tw.ang);
    if (def.aura){
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(rad * 0.9, 0, rad * 0.22, 0, 6.3); ctx.fill();
    } else if (tw.elem === 'sniper'){
      /* TOWERS_V6_PATCH 狙击：细长枪管 + 制退器 */
      ctx.fillStyle = def.color;
      roundRect(rad * 0.10, -rad * 0.09, rad * 1.95, rad * 0.18, rad * 0.09); ctx.fill();
      ctx.fillStyle = '#eafcff';
      roundRect(rad * 1.72, -rad * 0.17, rad * 0.30, rad * 0.34, rad * 0.06); ctx.fill();
    } else if (tw.elem === 'mortar'){
      /* TOWERS_V6_PATCH 榴弹：粗短炮管 + 开口炮口 */
      ctx.fillStyle = def.color;
      roundRect(rad * 0.12, -rad * 0.38, rad * 0.95, rad * 0.76, rad * 0.24); ctx.fill();
      ctx.fillStyle = '#2a1c08';
      roundRect(rad * 0.92, -rad * 0.46, rad * 0.26, rad * 0.92, rad * 0.12); ctx.fill();
    } else {
      ctx.fillStyle = def.color;
      roundRect(rad * 0.2, -rad * 0.16, rad * 1.05, rad * 0.32, rad * 0.14); ctx.fill();
    }
    if (tw.flash > 0){
      ctx.globalAlpha = tw.flash / 0.1;
      ctx.fillStyle = '#ffffff';
      glow(def.color, 18);
      var fx2 = (tw.elem === 'sniper') ? 2.05 : ((tw.elem === 'mortar') ? 1.18 : 1.25);
      ctx.beginPath(); ctx.arc(rad * fx2, 0, rad * (tw.elem === 'mortar' ? 0.44 : 0.3), 0, 6.3); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 等级
    if (tw.lv > 1){
      ctx.fillStyle = '#ffd76a'; ctx.font = 'bold ' + (CELL*0.26) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Lv' + tw.lv, x, y - rad - 4);
    }
    // 共鸣光环（有共鸣的塔外圈脉冲）
    if (tw.res && tw.res.tags.length){
      var pr = rad + 4 + Math.sin(gameT * 5 + k) * 2.6;
      ctx.strokeStyle = 'rgba(140,240,255,.9)'; ctx.lineWidth = 2.4;      // v7.6：共鸣光环不再开发光
      ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.3); ctx.stroke();
      ctx.fillStyle = '#8ff0ff'; ctx.font = 'bold ' + (CELL*0.22) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tw.res.tags[0], x, y + rad + CELL*0.28);
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
  // 敌人
  for (var ei = 0; ei < enemies.length; ei++){
    var e = enemies[ei];
    if (e.spawnT > 0) e.spawnT -= frameDt;
    var sp = e.spawnT > 0 ? (0.35 + 0.65 * (1 - e.spawnT / 0.36)) : 1;   // 出生弹出
    var wob = 1 + Math.sin(gameT * 8 + (e.walk || 0)) * 0.055;            // 走路摆动
    ctx.save();
    // 拖尾
    /* v5.5：自爆兵冲刺 / 重装冲锋时拖尾加长 */
    var _tk = 0.9;
    if (e.sprinting) _tk = 2.6;
    if (e.chargingT > 0) _tk = 2.4;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x - Math.cos(e.dir)*e.r*_tk, e.y - Math.sin(e.dir)*e.r*_tk, e.r*0.7*sp, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;
    if (e.boss){ glow(e.color, 22); }
    // 狂暴：红色光环脉冲（一圈，便宜）
    if (e.boss && e.enraged){
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(gameT * 7) * 0.25;
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3;
      ctx.shadowBlur = 18; ctx.shadowColor = '#ff3b3b';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6 + Math.sin(gameT * 7) * 3.5, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    // 渐变球体（v7.6：用预渲染贴图，不再每帧建渐变）
    /* v8.8 词缀视觉：外圈彩色光环 + 头顶图标；隐身时整体半透明 */
    if (e.aff){
      ctx.save();
      ctx.globalAlpha = e.hidden ? 0.3 : 0.85;
      ctx.strokeStyle = e.aff.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5.5, 0, 6.3); ctx.stroke();
      ctx.font = 'bold ' + Math.max(11, Math.round(e.r * 1.05)) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.fillStyle = e.aff.color;
      ctx.fillText(e.aff.icon, e.x, e.y - e.r - 7);
      ctx.restore();
    }
    if (e.hidden) ctx.globalAlpha = 0.35;
    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0, ENEMY_ART, e.type);   /* v8.11：按当前美术风格取贴图 */
    var _k = (e.r * sp * wob) / _tex.base;
    var _ds = _tex.size * _k;
    ctx.drawImage(_tex.cv, e.x - _ds / 2, e.y - _ds / 2, _ds, _ds);
    if (e.hidden) ctx.globalAlpha = 1;              /* v8.8：还原透明度（隐身只影响球体） */
    if (e.immuneSlow){
      ctx.strokeStyle = 'rgba(180,140,255,.9)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3.5, 0, 6.3); ctx.stroke();
    }
    if (e.shieldT > 0){                            // 出生护罩：青色脉冲环
      ctx.strokeStyle = 'rgba(150,240,255,' + (0.35 + 0.35 * Math.abs(Math.sin(gameT * 7))) + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4 + Math.sin(gameT * 9) * 1.3, 0, 6.3); ctx.stroke();
    }
    /* —— v5.5 新怪专属造型标记（沿用渐变球体+描边，不引入任何图片资源）—— */
    if (e.heal){                                   // 医疗兵：治疗范围（淡绿虚线圈）
      ctx.save();
      ctx.setLineDash([CELL * 0.12, CELL * 0.14]);
      ctx.strokeStyle = 'rgba(120,255,170,.26)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(e.x, e.y, CELL * 2, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    if (e.healGlow > 0){                           // 刚被治疗：淡绿描边
      ctx.strokeStyle = 'rgba(140,255,180,' + Math.min(0.9, e.healGlow * 1.6) + ')';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2.5, 0, 6.3); ctx.stroke();
    }
    if (e.heal){                                   // 医疗兵：绿色十字
      ctx.strokeStyle = '#7cffb0'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - e.r*0.62, e.y); ctx.lineTo(e.x + e.r*0.62, e.y);
      ctx.moveTo(e.x, e.y - e.r*0.62); ctx.lineTo(e.x, e.y + e.r*0.62);
      ctx.stroke();
    }
    if (e.split){                                  // 分裂虫：紫色裂纹
      ctx.strokeStyle = 'rgba(232,214,255,.92)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(e.x - e.r*0.50, e.y - e.r*0.45); ctx.lineTo(e.x + e.r*0.06, e.y - e.r*0.05);
      ctx.lineTo(e.x - e.r*0.30, e.y + e.r*0.35); ctx.moveTo(e.x + e.r*0.52, e.y + e.r*0.40);
      ctx.lineTo(e.x + e.r*0.06, e.y - e.r*0.05);
      ctx.stroke();
    }
    if (e.bomb){                                   // 自爆兵：橙红外圈闪烁（冲刺时更快更亮）
      var _bl = 0.4 + Math.abs(Math.sin(gameT * (e.sprinting ? 14 : 6))) * 0.6;
      ctx.save(); ctx.globalAlpha = _bl;
      ctx.strokeStyle = e.sprinting ? '#fff2c8' : '#ff9a3a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2.6, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    if (e.aura){                                   // 精英队长：金色外圈 + 头顶星标
      ctx.save();
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.4;
      glow('#ffd24a', 12);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4.5, 0, 6.3); ctx.stroke();
      ctx.restore();
      poly(e.x, e.y - e.r - 9, e.r * 0.34, 5, -Math.PI/2);
      ctx.fillStyle = '#ffd24a'; ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,0,.9)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (e.charge){                                 // 重装冲锋：深灰重甲环 + 冲锋时白色速度线
      ctx.strokeStyle = 'rgba(58,44,84,.95)'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.56, 0, 6.3); ctx.stroke();
      if (e.chargingT > 0){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8;
        for (var _sk = 0; _sk < 3; _sk++){
          var _so = (_sk - 1) * e.r * 0.55;
          var _cx = Math.cos(e.dir), _sy = Math.sin(e.dir);
          ctx.beginPath();
          ctx.moveTo(e.x - _cx*e.r*1.6 - _sy*_so, e.y - _sy*e.r*1.6 + _cx*_so);
          ctx.lineTo(e.x - _cx*e.r*3.0 - _sy*_so, e.y - _sy*e.r*3.0 + _cx*_so);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
    // 血条
    var hw = e.r * 2.4;
    if (sp < 0.9) { ctx.restore(); continue; }
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(e.x - hw/2, e.y - e.r - 9, hw, 4);
    ctx.fillStyle = e.hp/e.maxhp > 0.5 ? '#7cf5a0' : (e.hp/e.maxhp > 0.22 ? '#ffd76a' : '#ff5a6a');
    ctx.fillRect(e.x - hw/2, e.y - e.r - 9, hw * Math.max(0, e.hp/e.maxhp), 4);
  }
  // 光束
  ctx.lineCap = 'round';
  for (var bi = 0; bi < beams.length; bi++){
    var b = beams[bi], a = b.life / b.max;
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = b.color; ctx.lineWidth = 8 * a + 1.4;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = 2.2 * a + 0.5; ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  /* TOWERS_V6_PATCH：命中圈——火焰橙圈 / 毒绿环 / 冰冻霜环 / 榴弹琥珀圈，画在粒子之下 */
  for (var rgi = 0; rgi < rings.length; rgi++){
    var rgr = rings[rgi], rgk = 1 - Math.max(0, rgr.life) / rgr.max;
    ctx.globalAlpha = Math.max(0, rgr.life / rgr.max) * 0.85;
    ctx.strokeStyle = rgr.color; ctx.lineWidth = 2.6 * (1 - rgk) + 0.8;
    ctx.beginPath(); ctx.arc(rgr.x, rgr.y, rgr.rad * (0.35 + 0.65 * rgk), 0, 6.3); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 粒子
  for (var pi = 0; pi < parts.length; pi++){
    var p2 = parts[pi];
    ctx.globalAlpha = Math.max(0, p2.life / p2.max);
    ctx.fillStyle = p2.color;
    ctx.beginPath(); ctx.arc(p2.x, p2.y, p2.r, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 飘字
  for (var fi = 0; fi < floats.length; fi++){
    var f = floats[fi], fa = f.life / f.max;
    ctx.globalAlpha = fa;
    ctx.fillStyle = f.color; ctx.font = 'bold ' + (CELL*0.34) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y - (1 - fa) * CELL * 0.7);
    ctx.globalAlpha = 1;
  }
  // 金币飞行（向金币栏飞）
  for (var cfi = 0; cfi < coinFly.length; cfi++){
    var cfx = coinFly[cfi];
    var tx = OX + CELL * 1.2, ty = -10;
    var k = cfx.t;
    var pxx = cfx.x + (tx - cfx.x) * k * k;
    var pyy = cfx.y + (ty - cfx.y) * k * k - Math.sin(k * Math.PI) * 44;
    ctx.globalAlpha = 1 - k * 0.5;
    ctx.fillStyle = '#ffd76a'; glow('#ffcf4a', 10);
    ctx.beginPath(); ctx.arc(pxx, pyy, 4.5, 0, 6.3); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // 连杀提示：右侧右对齐 + 五档配色 + 分级动画（实现见 drawComboBadge，不再居中压在 W/2 挡战场）
  drawComboBadge();
  // 波次横幅
  if (bannerT > 0){
    ctx.globalAlpha = Math.min(1, bannerT / 0.5);
    ctx.fillStyle = '#8fe4ff'; ctx.font = 'bold ' + (W*0.09) + 'px sans-serif'; ctx.textAlign = 'center';
    glow('rgba(187,156,255,.9)', 24);
    ctx.fillText(banner, W/2, H*0.32);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // 受击红闪
  if (hurtT > 0){
    ctx.fillStyle = 'rgba(255,60,80,' + (hurtT * 0.5) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // FPS（右下角自检用，不占 UI 位置）
  if (fpsTxt){
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#7cf5c0';
    ctx.font = 'bold ' + Math.max(10, CELL * 0.24) + 'px monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(fpsTxt, W - 8, H - 6);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

