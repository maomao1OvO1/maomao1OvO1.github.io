#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.3 升级体系：每塔专属成长（up* 字段 + elemAt）+ 四大体系加成（sys + sysBonus）
import io, sys, re
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)

UP = [
 ("fire", "splashR:1.0, splashK:0.6, role:'溅射', soloStar:2, groupStar:3,",
  "splashR:1.0, splashK:0.6, sys:'group',\n             upSplashR:0.06, upSplashK:0.03, upName:'溅射半径 +0.06 格 / 溅射伤害 +3%',\n             role:'溅射', soloStar:2, groupStar:3,"),
 ("ice", "slowR:1.0, role:'控场', soloStar:1, groupStar:2,",
  "slowR:1.0, sys:'ctrl',\n             upSlowT:0.15, upSlowR:0.06, upName:'减速时长 +0.15 秒 / 减速范围 +0.06 格',\n             role:'控场', soloStar:1, groupStar:2,"),
 ("thunder", "chain:5, chainK:0.85,\n             role:'链式', soloStar:1, groupStar:4,",
  "chain:5, chainK:0.85, sys:'group',\n             upChain:0.4, upChainK:0.012, upName:'链弹 +0.4 个目标 / 每跳衰减改善',\n             role:'链式', soloStar:1, groupStar:4,"),
 ("poison", "dotR:1.2, role:'持续', soloStar:1, groupStar:4,",
  "dotR:1.2, sys:'group',\n             upDot:2.0, upDotR:0.08, upName:'毒伤 +2/秒 / 中毒范围 +0.08 格',\n             role:'持续', soloStar:1, groupStar:4,"),
 ("phys", "antiArmor:0.35, role:'单体', soloStar:4, groupStar:1,",
  "antiArmor:0.35, sys:'solo',\n             upAntiArmor:0.06, upName:'对护甲目标加成 +6%/级',\n             role:'单体', soloStar:4, groupStar:1,"),
 ("support", "auraDmg:0.25, auraRate:0.18, role:'光环', soloStar:0, groupStar:0,",
  "auraDmg:0.25, auraRate:0.18, sys:'support',\n             upAura:0.08, upName:'光环效果 +8%/级（伤害与攻速同步增强）',\n             role:'光环', soloStar:0, groupStar:0,"),
 ("sniper", "highValue:true, role:'点杀', soloStar:5, groupStar:1,",
  "highValue:true, sys:'solo',\n             upRange:0.25, upHV:0.10, upName:'射程 +0.25 格 / 对高价值目标 +10%/级',\n             role:'点杀', soloStar:5, groupStar:1,"),
 ("mortar", "splashR:2.2, splashK:0.45, role:'范围', soloStar:1, groupStar:5,",
  "splashR:2.2, splashK:0.45, sys:'group',\n             upSplashR:0.15, upSplashK:0.03, upName:'溅射半径 +0.15 格 / 溅射伤害 +3%',\n             role:'范围', soloStar:1, groupStar:5,"),
]
for tag, old, new in UP:
    sub(old, new, tag + ' 专属')

sub("function auraBonus(t){",
"""/* ===== v7.3 升级体系：每座塔有专属成长，四大体系还有整体加成 ===== */
function elemAt(elem, lv){
  var d = ELEMS[elem]; if (!d) return null;
  var n = Math.max(0, (lv || 1) - 1);
  if (!n) return d;
  var o = {}, k;
  for (k in d) o[k] = d[k];
  o.splashR = (d.splashR || 0) + n * (d.upSplashR || 0);
  o.splashK = (d.splashK || 0) + n * (d.upSplashK || 0);
  if (d.chain) o.chain = Math.round(d.chain + n * (d.upChain || 0));
  if (d.chainK) o.chainK = d.chainK + n * (d.upChainK || 0);
  o.slowT = (d.slowT || 0) + n * (d.upSlowT || 0);
  o.slowR = (d.slowR || 0) + n * (d.upSlowR || 0);
  o.dot = (d.dot || 0) + n * (d.upDot || 0);
  o.dotR = (d.dotR || 0) + n * (d.upDotR || 0);
  o.antiArmor = (d.antiArmor || 0) + n * (d.upAntiArmor || 0);
  o.auraDmg = (d.auraDmg || 0) + n * (d.upAura || 0);
  o.auraRate = (d.auraRate || 0) + n * (d.upAura || 0);
  return o;
}
var SYS_NAME = { solo:'单体体系', group:'群体体系', ctrl:'控场体系', support:'支援体系' };
var SYS_TIER = {
  solo:    [ { lv:5, bonus:0.08 }, { lv:10, bonus:0.16 }, { lv:16, bonus:0.25 } ],
  group:   [ { lv:5, bonus:0.10 }, { lv:10, bonus:0.20 }, { lv:16, bonus:0.32 } ],
  ctrl:    [ { lv:5, bonus:0.12 }, { lv:10, bonus:0.24 }, { lv:16, bonus:0.36 } ],
  support: [ { lv:3, bonus:0.15 }, { lv:6, bonus:0.30 }, { lv:10, bonus:0.50 } ]
};
function sysLevel(sys){
  var sum = 0;
  for (var i = 0; i < towers.length; i++){
    var d = ELEMS[towers[i].elem];
    if (d && d.sys === sys) sum += (towers[i].lv || 1);
  }
  return sum;
}
function sysBonus(sys){
  var lv = sysLevel(sys), t = SYS_TIER[sys] || [], b = 0;
  for (var i = 0; i < t.length; i++) if (lv >= t[i].lv) b = t[i].bonus;
  return b;
}
function sysDmgMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'solo') ? (1 + sysBonus('solo')) : 1; }
function sysRangeMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'group') ? (1 + sysBonus('group')) : 1; }
function sysCtrlMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'ctrl') ? (1 + sysBonus('ctrl')) : 1; }
function sysAuraMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'support') ? (1 + sysBonus('support')) : 1; }
function auraBonus(t){""", 'elemAt+体系')

sub("""    var od = ELEMS[o.elem];
    if (od && od.aura){
      var k = (1 + (o.lv - 1) * 0.4) * (BUFFS.aura || 1);""",
"""    var od = elemAt(o.elem, o.lv), odBase = ELEMS[o.elem];
    if (odBase && odBase.aura){
      var k = (1 + (o.lv - 1) * 0.4) * (BUFFS.aura || 1) * sysAuraMul(o.elem);""", '光环按等级+体系')

sub("  var spR = def.splashR || 0, spK = def.splashK || 0;",
"""  var def2 = elemAt(t.elem, t.lv) || def;            // v7.3：按等级取专属成长后的属性
  var spR = (def2.splashR || 0) * sysRangeMul(t.elem), spK = def2.splashK || 0;""", '溅射按等级+体系')

# 毒伤 / 减速 / 单体伤害 / 控场：走体系与专属成长
s2 = s
s2 = re.sub(r'applyDotTo\(e, def\.dot \* \(1 \+ \(t\.lv - 1\) \* 0\.4\)',
            'applyDotTo(e, def2.dot * (1 + (t.lv - 1) * 0.4)', s2)
if s2 == s: print('  ⚠️ 毒伤处正则未命中（跳过）')
else: s = s2; hits.append('毒伤按等级')
io.open(P,'w',encoding='utf-8').write(s)
print('✅ p_n_upgrade 完成，共替换 %d 处：' % len(hits))
for h in hits: print('   -', h)
