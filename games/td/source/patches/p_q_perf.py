#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.6 无尽性能：敌人渐变改贴图缓存（去每帧 createRadialGradient）+ 共鸣连线/塔光环去 shadowBlur
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)

# ① 敌人球体贴图缓存（原来每帧每个敌人都 createRadialGradient → 大开销）
sub("""function draw(){""",
"""/* ===== v7.6 性能：敌人球体预渲染成贴图（原来每帧每个敌人都 createRadialGradient，
   塔多敌人多时单帧耗时飙升 → 帧数看着正常但动画一顿一顿）===== */
var enemyTex = {};
function enemySprite(color, r, flash){
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
}
function draw(){""", '敌人贴图函数')

sub("""    // 渐变球体
    var grd = ctx.createRadialGradient(e.x - e.r*0.35, e.y - e.r*0.35, e.r*0.15, e.x, e.y, e.r*sp*wob);
    var c1 = e.hitFlash > 0 ? '#ffffff' : e.color;
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, c1);
    grd.addColorStop(1, 'rgba(10,16,30,.9)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r*sp*wob, 0, 6.3); ctx.fill();
    ctx.strokeStyle = c1; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r*sp*wob, 0, 6.3); ctx.stroke();""",
"""    // 渐变球体（v7.6：用预渲染贴图，不再每帧建渐变）
    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0);
    var _k = (e.r * sp * wob) / _tex.base;
    var _ds = _tex.size * _k;
    ctx.drawImage(_tex.cv, e.x - _ds / 2, e.y - _ds / 2, _ds, _ds);""", '敌人绘制改贴图')

# ② 共鸣连线去掉 shadowBlur（改双层描边，视觉接近但便宜很多）
sub("""      ctx.strokeStyle = same ? 'rgba(255,215,106,.95)' : 'rgba(120,240,255,1)';
      glow(same ? '#ffd76a' : '#78f0ff', 22);
      ctx.stroke();
      ctx.lineWidth = (same ? 1 : 2);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.stroke();
      ctx.shadowBlur = 0;""",
"""      ctx.strokeStyle = same ? 'rgba(255,215,106,.35)' : 'rgba(120,240,255,.35)';   // v7.6：外层宽描边代替发光
      ctx.lineWidth = (same ? 7.5 : 11) * pulse;
      ctx.stroke();
      ctx.strokeStyle = same ? 'rgba(255,225,140,1)' : 'rgba(180,245,255,1)';
      ctx.lineWidth = (same ? 2.2 : 3.4) * pulse;
      ctx.stroke();""", '共鸣连线去发光')

# ③ 塔的发光：塔多时整体降级（塔身保留少量发光，共鸣圈/辅助圈改细描边）
sub("""      var pr = rad + 4 + Math.sin(gameT * 5 + k) * 2.6;
      ctx.strokeStyle = 'rgba(140,240,255,.85)'; ctx.lineWidth = 2.4;
      glow('#78f0ff', 16);
      ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.3); ctx.stroke(); ctx.shadowBlur = 0;""",
"""      var pr = rad + 4 + Math.sin(gameT * 5 + k) * 2.6;
      ctx.strokeStyle = 'rgba(140,240,255,.9)'; ctx.lineWidth = 2.4;      // v7.6：共鸣光环不再开发光
      ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.3); ctx.stroke();""", '共鸣光环去发光')

# ④ 塔多时自动降低塔身发光（超过 40 座）
sub("""function drawTowerBody(x, y, rad, elem, color, k){
  ctx.save();
  glow(color, 16);""",
"""function drawTowerBody(x, y, rad, elem, color, k){
  ctx.save();
  /* v7.6：塔多了（>40 座）就省掉塔身发光 —— 帧稳优先，视觉差异很小 */
  if (towers.length > 40) ctx.shadowBlur = 0; else glow(color, 16);""", '塔多降级')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_q_perf 完成，共 %d 项：' % len(hits))
for h in hits: print('   -', h)
