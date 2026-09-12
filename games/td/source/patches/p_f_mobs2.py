#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.5 怪物特性重做：医疗兵变成真奶妈 + 全怪特性文案进图鉴
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ── ① 每种怪补上 fx（特性）与 tip（应对建议），图鉴直接读 ──
TR = [
 ("normal",  "color:'#7ea8d8', r:11 },",
  "fx:'普通单位，没有特殊能力，胜在数量', tip:'任意元素塔都能处理'"),
 ("fast",    "color:'#7cf5c0', r:9 },",
  "fx:'移动极快，血量很低', tip:'冰霜塔减速 / 雷电塔链式一次清一片'"),
 ("armor",   "r:13, armor:0.35 },",
  "fx:'护甲减伤 35%，走得慢但非常耐打', tip:'物理塔穿甲 / 电磁炮无视护甲'"),
 ("shield",  "r:12, immuneSlow:true },",
  "fx:'免疫减速，冰霜塔对它完全无效', tip:'别只堆冰霜，改用火/雷/物理硬输出'"),
 ("boss",    "r:18, boss:true, armor:0.2 },",
  "fx:'超高血量 + 20% 减伤，每 10 波登场；会【狂暴】提速、【召唤】步兵、【沉默】最近的 2 座塔', tip:'别把主力塔堆在它旁边（会被沉默）；全屏冻结 + 集火'"),
 ("healer",  "color:'#2fd66b', r:11, heal:true },",
  "fx:'奶妈：半径 2 格内友军持续回血，每 3 秒再给最残血的友军回一大口（满血则套减伤护罩）', tip:'必须优先集火！它不死，这波怪就打不死'"),
 ("splitter","color:'#a35cff', r:13, split:true },",
  "fx:'被击杀时裂成 2 只快速幼体继续前进', tip:'留溅射（热震/扩散）火力收尾，别让它在你后方爆开'"),
 ("spawn2",  "color:'#c98cff', r:8,  spawnOnly:true },",
  "fx:'分裂虫爆开的残片，血量低但速度很快', tip:'溅射或链式一次带走一片'"),
 ("bomber",  "color:'#ff7a2f', r:11, bomb:true },",
  "fx:'走过路径 70% 后进入冲刺（速度 ×2.2），抵达基地直接扣 2 点血', tip:'必须在中前段拦下，别放它过半程'"),
 ("elite",   "r:15, aura:true, dblGold:true },",
  "fx:'指挥光环：半径 2.5 格内友军 +30% 速度；击杀掉落双倍金币', tip:'优先点掉它，光环一散整波都会慢下来'"),
 ("charger", "color:'#9aa7b8', r:15, armor:0.5, charge:true }",
  "fx:'50% 护甲；每 5 秒冲锋 1.5 秒（冲锋期间提速 80% 且免疫减速）', tip:'物理塔穿甲；趁它冲锋结束的间隙集火'"),
]
import re as _re
for key, line, extra in TR:
    if s.count(line) != 1:
        print('❌ [ENEMIES %s] 命中 %d 次，未写入' % (key, s.count(line))); sys.exit(1)
    newline = line[:-2] + ", " + extra + " },"
    s = s.replace(line, newline)
print('  [OK] 11 种怪特性/应对文案已写入 ENEMIES')

# ── ② 图鉴优先读 fx / tip（字段缺失时回退到旧推导）──
sub("""function bookMobTraits(d){
  var t = [];""",
"""function bookMobTraits(d){
  if (d.fx) return [d.fx];                       // 数据里写了完整特性文案就优先用它
  var t = [];""", '图鉴特性优先 fx')
sub("""function bookMobCounter(d){
  var a = [];""",
"""function bookMobCounter(d){
  if (d.tip) return [d.tip];
  var a = [];""", '图鉴应对优先 tip')

# ── ③ 医疗兵重做：常驻回血光环 + 爆发治疗/护罩（原来是「只治已受伤的怪」，实战几乎不触发）──
sub("""  if (healers.length){
    var hr = CELL * 2, hr2 = hr * hr;
    for (i = 0; i < healers.length; i++){
      var h = healers[i];
      if (h.hp <= 0) continue;
      h.healT -= dt;
      if (h.healT > 0) continue;
      h.healT = 4.0;
      var healed = 0;
      for (var j = 0; j < n; j++){
        var o = enemies[j];
        if (o === h || o.hp <= 0 || o.hp >= o.maxhp) continue;
        var ox = o.x - h.x, oy = o.y - h.y;
        if (ox * ox + oy * oy > hr2) continue;
        var amt = o.maxhp * 0.08;                 // 各自的最大血量 8%，不超上限
        o.hp = Math.min(o.maxhp, o.hp + amt);
        addBeam(h.x, h.y, o.x, o.y, 'rgba(140,255,180,.9)');   // 浅绿细线
        addFloat(o.x, o.y - o.r - 6, '+' + Math.round(amt), '#8cffb4');
        healed++;
      }
      if (healed > 0) h.healFx = 0.5;
    }
  }""",
"""  if (healers.length){
    var hr = CELL * 2, hr2 = hr * hr;
    for (i = 0; i < healers.length; i++){
      var h = healers[i];
      if (h.hp <= 0) continue;
      /* ① 常驻回血光环：半径内友军持续小量回血（每 0.6 秒 1.5% 最大血）—— 肉眼可见
         ② 爆发治疗：每 3 秒给「血量百分比最低」的友军回 15%；若它满血则改套 2 秒减伤护罩 */
      h.healAuraT = (h.healAuraT || 0) - dt;
      var auraTick = false;
      if (h.healAuraT <= 0){ h.healAuraT = 0.6; auraTick = true; }
      h.healT -= dt;
      var burst = false;
      if (h.healT <= 0){ h.healT = 3.0; burst = true; }
      if (!auraTick && !burst) continue;
      var worst = null, worstPct = 2;
      for (var j = 0; j < n; j++){
        var o = enemies[j];
        if (o === h || o.hp <= 0) continue;
        var ox = o.x - h.x, oy = o.y - h.y;
        if (ox * ox + oy * oy > hr2) continue;
        if (auraTick && o.hp < o.maxhp){                       // 持续回血
          o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.015);
          o.healGlow = 0.35;
        }
        var pct = o.hp / o.maxhp;
        if (pct < worstPct){ worstPct = pct; worst = o; }
      }
      if (burst && worst){
        if (worst.hp < worst.maxhp){                           // 爆发治疗
          var amt = worst.maxhp * 0.15;
          worst.hp = Math.min(worst.maxhp, worst.hp + amt);
          addHealBeam(h.x, h.y, worst.x, worst.y);
          addFloat(worst.x, worst.y - worst.r - 8, '+' + Math.round(amt), '#8cffb4');
          h.healFx = 0.7; worst.healGlow = 0.8;
        } else {                                               // 全员满血：给最前面的友军套护罩
          worst.shieldBuffT = 2.0;
          addHealBeam(h.x, h.y, worst.x, worst.y);
          addFloat(worst.x, worst.y - worst.r - 8, '护罩', '#8cffb4');
          h.healFx = 0.5; worst.healGlow = 0.8;
        }
      }
    }
  }""", '医疗兵重做')

# ── ④ 治疗光束（寿命更长，看得见）＋ 护罩减伤 ──
sub("function addBeam(x1, y1, x2, y2, color){ beams.push({ x1:x1, y1:y1, x2:x2, y2:y2, color:color, life:0.13, max:0.13 }); }",
    "function addBeam(x1, y1, x2, y2, color){ beams.push({ x1:x1, y1:y1, x2:x2, y2:y2, color:color, life:0.13, max:0.13 }); }\n"
    "function addHealBeam(x1, y1, x2, y2){ beams.push({ x1:x1, y1:y1, x2:x2, y2:y2, color:'rgba(140,255,180,.95)', life:0.45, max:0.45 }); }", '治疗光束')
sub("  if (e.shieldT > 0) dmg *= 0.15;             // 出生护盾：减伤 85%",
    "  if (e.shieldT > 0) dmg *= 0.15;             // 出生护盾：减伤 85%\n"
    "  if (e.shieldBuffT > 0) dmg *= 0.80;         // 医疗兵护罩：减伤 20%", '护罩减伤')
sub("    shieldT: d.boss ? 1.5 : 3.0,   // 出生护盾：刚落地 3 秒内受伤仅 15%，逼它走出起点区（治「被压在出生点打」）",
    "    shieldT: d.boss ? 1.5 : 3.0,   // 出生护盾：刚落地 3 秒内受伤仅 15%，逼它走出起点区（治「被压在出生点打」）\n"
    "    healAuraT: 0.6, healGlow: 0, shieldBuffT: 0,   // 医疗兵光环计时 / 被治疗的绿光标记 / 护罩计时", '医疗兵新字段')
sub("    heal: !!d.heal, healT: d.heal ? 4.0 : 0,                    // 医疗兵：治疗冷却（秒，每 4 秒一次）",
    "    heal: !!d.heal, healT: d.heal ? 3.0 : 0,                    // 医疗兵：爆发治疗冷却（每 3 秒一次）", '治疗冷却 3 秒')

# ── ⑤ 计时递减 ──
sub("    if (e.shieldT > 0){ e.shieldT -= dt; if (e.shieldT < 0) e.shieldT = 0; }",
    "    if (e.shieldT > 0){ e.shieldT -= dt; if (e.shieldT < 0) e.shieldT = 0; }\n"
    "    if (e.healGlow > 0){ e.healGlow -= dt; if (e.healGlow < 0) e.healGlow = 0; }\n"
    "    if (e.shieldBuffT > 0){ e.shieldBuffT -= dt; if (e.shieldBuffT < 0) e.shieldBuffT = 0; }", '计时递减')

# ── ⑥ 视觉：治疗范围虚线圈 + 被治疗者的绿光描边 ──
sub("""    if (e.heal){                                   // 医疗兵：绿色十字""",
"""    if (e.heal){                                   // 医疗兵：治疗范围（淡绿虚线圈）
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
    if (e.heal){                                   // 医疗兵：绿色十字""", '治疗视觉')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_f_mobs2 完成')
