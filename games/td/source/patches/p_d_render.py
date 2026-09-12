#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.4 渲染优化：静态层缓存 + 去掉高开销 shadowBlur（治「高画质卡顿」）+ FPS 自检
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 静态层缓存函数（放在 draw 之前）
sub("""function draw(){
  ctx.save();
  if (shakeT > 0){""",
"""/* 静态层（网格 + 路径底色）：只在布局/关卡变化时重画一次，之后每帧只 drawImage
   —— 原来每帧要画 20+ 条网格线 + 3 次路径描边，是移动端最浪费的一块 */
var bgCv = null, bgKey = '';
function drawStaticBg(){
  var key = COLS + 'x' + ROWS + '|' + Math.round(CELL) + '|' + Math.round(OX) + '|' + Math.round(OY) + '|' + lvIndex + '|' + DPR;
  if (!bgCv || bgKey !== key){
    if (!bgCv) bgCv = document.createElement('canvas');
    bgCv.width = Math.max(1, Math.floor(W * DPR));
    bgCv.height = Math.max(1, Math.floor(H * DPR));
    var g = bgCv.getContext('2d');
    if (g.setTransform) g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.strokeStyle = 'rgba(60,100,160,.16)'; g.lineWidth = 1;
    for (var c = 0; c <= COLS; c++){
      g.beginPath(); g.moveTo(OX + c*CELL, OY); g.lineTo(OX + c*CELL, OY + ROWS*CELL); g.stroke();
    }
    for (var r = 0; r <= ROWS; r++){
      g.beginPath(); g.moveTo(OX, OY + r*CELL); g.lineTo(OX + COLS*CELL, OY + r*CELL); g.stroke();
    }
    g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(28,42,70,.95)';
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    for (var i = 0; i < WAYPOINTS.length; i++){
      var p = waypointPx(i);
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(90,160,255,.35)';
    g.stroke();
    bgKey = key;
  }
  ctx.drawImage(bgCv, 0, 0, W, H);
}
function draw(){
  ctx.save();
  if (shakeT > 0){""", '静态层函数')

# ② draw 里用缓存层替换每帧的网格+路径绘制
sub("""  // 网格
  ctx.strokeStyle = 'rgba(60,100,160,.16)'; ctx.lineWidth = 1;
  for (var c = 0; c <= COLS; c++){
    ctx.beginPath(); ctx.moveTo(OX + c*CELL, OY); ctx.lineTo(OX + c*CELL, OY + ROWS*CELL); ctx.stroke();
  }
  for (var r = 0; r <= ROWS; r++){
    ctx.beginPath(); ctx.moveTo(OX, OY + r*CELL); ctx.lineTo(OX + COLS*CELL, OY + r*CELL); ctx.stroke();
  }
  // 路径
  ctx.lineWidth = CELL * 0.86; ctx.strokeStyle = 'rgba(28,42,70,.95)';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  for (var i = 0; i < WAYPOINTS.length; i++){
    var p = waypointPx(i);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,160,255,.35)';
  ctx.stroke();""",
"""  drawStaticBg();          // 网格 + 路径（缓存层，每帧一次 drawImage）""", 'draw 用缓存层')

# ③ 流动能量带：去 shadowBlur，改双层描边
sub("""  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(120,220,255,.5)';
  glow('#5ad7ff', 14);
  ctx.beginPath();
  for (var wi = 0; wi < WAYPOINTS.length; wi++){
    var wp2 = waypointPx(wi);
    if (wi === 0) ctx.moveTo(wp2.x, wp2.y); else ctx.lineTo(wp2.x, wp2.y);
  }
  ctx.stroke();
  ctx.restore();""",
"""  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(120,220,255,.22)';
  ctx.beginPath();
  for (var wi = 0; wi < WAYPOINTS.length; wi++){
    var wp2 = waypointPx(wi);
    if (wi === 0) ctx.moveTo(wp2.x, wp2.y); else ctx.lineTo(wp2.x, wp2.y);
  }
  ctx.stroke();
  ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(180,240,255,.7)';
  ctx.stroke();
  ctx.restore();""", '能量带双层描边')

# ④ 光束：去 shadowBlur，改双层描边
sub("""  for (var bi = 0; bi < beams.length; bi++){
    var b = beams[bi], a = b.life / b.max;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = b.color; ctx.lineWidth = 3 * a + 0.6;
    glow(b.color, 14);
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }""",
"""  ctx.lineCap = 'round';
  for (var bi = 0; bi < beams.length; bi++){
    var b = beams[bi], a = b.life / b.max;
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = b.color; ctx.lineWidth = 8 * a + 1.4;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = 2.2 * a + 0.5; ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;""", '光束双层描边')

# ⑤ 发光半径减半（视觉几乎不变，开销显著下降）
sub("""function glow(color, blur){                 // 统一发光设置：低画质时 blur 归零（语义等价于不开发光）
  ctx.shadowColor = color;
  ctx.shadowBlur = LOWFX ? 0 : blur;""",
    """function glow(color, blur){                 // 统一发光设置：低画质归零；正常画质半径减半（观感接近、开销大降）
  ctx.shadowColor = color;
  ctx.shadowBlur = LOWFX ? 0 : Math.round(blur * 0.55);""", 'glow 半径减半')

# ⑥ FPS 自检（右下角小字，方便毛毛自己看卡不卡）
sub("""  if (tipT > 0){
    tipT -= dt;""",
"""  fpsAcc += raw; fpsN++;
  if (fpsAcc >= 0.5){ fpsTxt = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
  if (tipT > 0){
    tipT -= dt;""", 'FPS 统计')

sub("""  // 受击红闪
  if (hurtT > 0){
    ctx.fillStyle = 'rgba(255,60,80,' + (hurtT * 0.5) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();""",
"""  // 受击红闪
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
  ctx.restore();""", 'FPS 绘制')

sub("var speedMul = 1;             // 倍速档位",
    "var fpsTxt = '', fpsAcc = 0, fpsN = 0;   // FPS 自检（右下角小字）\nvar speedMul = 1;             // 倍速档位", 'FPS 变量')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_d_render 完成')
