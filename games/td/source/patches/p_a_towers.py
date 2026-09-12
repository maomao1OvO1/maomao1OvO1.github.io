# -*- coding: utf-8 -*-
"""
p_a_towers.py —— 《共鸣之塔》补丁：炮塔定位重构（六塔重定位）+ 新增 2 塔（狙击 / 榴弹）

用法：
    python3 patches/p_a_towers.py [目标html]      # 默认 game.html

设计：
    ① 六塔重新定位：phys 单体输出(antiArmor) / fire 小范围溅射(splashR) / poison 大范围持续(dotR)
       / thunder 链式清群(chain 5, 每跳 ×0.85) / ice 控场(slowR) / support 光环不变
    ② 新增 sniper(高价值目标优先锁定) / mortar(2.2 格 45% 范围伤)
    ③ 共鸣补齐 5 组：燃烧弹 / 毒气弹 / 冰爆 / 电磁狙击 / 破甲弹（既有 8 组一个不删）
    ④ 每条 ELEMS 追加 role / soloStar / groupStar（供面板与图鉴直接读）

约束：
    - ES5 风格（var/function，无箭头函数/模板字符串），与正式源码一致
    - 所有溅射/范围毒/范围减速走 dt 增量通道（dotT/slowT 由 updateEnemies 按 dt 结算），
      不依赖「每帧只调用一次」；特效池每发子弹只产生 1 个对象，绝不每帧新建
    - 每处替换均为「精确整段匹配 + 断言恰好 1 次」，任何一处异常 → 报标签 + sys.exit(1) 且不写回
    - 写前自动备份 <目标>.pre_towers.bak；带幂等保护（重复运行不会二次改写）
"""
import io
import os
import shutil
import sys

MARKER = 'TOWERS_V6_PATCH'
DEFAULT_TARGET = 'game.html'

REPS = []


def rep(tag, old, new):
    REPS.append((tag, old, new))


# ============================================================================
# ① ELEMS 八塔数值表
# ============================================================================
OLD_ELEMS = (
    "var ELEMS = {\n"
    "  fire:    { name:'\u706b\u7130', icon:'\U0001f525', color:'#ff5a2a', cost:72,  dmg:18, rate:0.72, range:2.5,\n"
    "             fx:'\u5355\u4f53\u9ad8\u4f24\uff0c\u6e85\u5c04\u7ec4\u5408\u6838\u5fc3' },\n"
    "  ice:     { name:'\u51b0\u971c', icon:'\u2744\ufe0f', color:'#7fe4ff', cost:68,  dmg:9,  rate:0.85, range:2.3, slow:0.5, slowT:1.6,\n"
    "             fx:'\u51cf\u901f 50%\uff0c\u6301\u7eed 1.6 \u79d2' },\n"
    "  thunder: { name:'\u96f7\u7535', icon:'\u26a1', color:'#ffd21a', cost:100, dmg:15, rate:1.15, range:2.7, chain:3,\n"
    "             fx:'\u94fe\u5f0f\u5f39\u5c04 3 \u4e2a\u76ee\u6807' },\n"
    "  poison:  { name:'\u5267\u6bd2', icon:'\u2620\ufe0f', color:'#4fe060', cost:88, dmg:7,  rate:1.0,  range:2.4, dot:9, dotT:3.0,\n"
    "             fx:'\u6301\u7eed\u4e2d\u6bd2 9/\u79d2 \xd7 3 \u79d2' },\n"
    "  phys:    { name:'\u7269\u7406', icon:'\U0001f528', color:'#cfd8e8', cost:78,  dmg:27, rate:0.62, range:2.2, pierce:0.6,\n"
    "             fx:'\u7a7f\u7532\uff1a\u65e0\u89c6 60% \u62a4\u7532' },\n"
    "  support: { name:'\u8f85\u52a9', icon:'\U0001f4e1', color:'#b98cff', cost:88,  dmg:0,  rate:0,    range:2.6, aura:true,\n"
    "             auraDmg:0.25, auraRate:0.18, fx:'\u5149\u73af\uff1a\u76f8\u90bb\u5854\u4f24\u5bb3 +25%\u3001\u653b\u901f +18%' }\n"
    "};\n"
)

NEW_ELEMS = (
    "var ELEMS = {\n"
    "  /* ===== TOWERS_V6_PATCH：炮塔定位重构（对单 / 对群分工明确）+ 新增狙击 / 榴弹 =====\n"
    "     每条统一追加 role / soloStar / groupStar 三个展示字段（面板与图鉴直接读，不另建表）\n"
    "     机制字段：splashR 溅射半径(格) / splashK 溅射伤害系数 / dotR 中毒范围(格) / slowR 减速范围(格)\n"
    "               antiArmor 对有甲目标加伤 / highValue 优先锁定高价值目标 / chainK 链弹每跳衰减 */\n"
    "  fire:    { name:'\u706b\u7130', icon:'\U0001f525', color:'#ff5a2a', cost:76,  dmg:15, rate:0.80, range:2.5,\n"
    "             splashR:1.0, splashK:0.6, role:'\u6e85\u5c04', soloStar:2, groupStar:3,\n"
    "             fx:'\u5c0f\u8303\u56f4\u6e85\u5c04\uff1a\u547d\u4e2d\u70b9 1.0 \u683c\u5185\u300c\u5176\u4ed6\u654c\u4eba\u300d\u53d7 60% \u4f24\u5bb3\uff08\u4e0e\u70ed\u9707\u53e0\u52a0\u5171\u5b58\uff09' },\n"
    "  ice:     { name:'\u51b0\u971c', icon:'\u2744\ufe0f', color:'#7fe4ff', cost:72,  dmg:7,  rate:0.85, range:2.4, slow:0.5, slowT:1.6,\n"
    "             slowR:1.0, role:'\u63a7\u573a', soloStar:1, groupStar:2,\n"
    "             fx:'\u63a7\u573a\uff1a\u547d\u4e2d 50% \u51cf\u901f 1.6 \u79d2\uff0c\u4e14\u547d\u4e2d\u70b9 1.0 \u683c\u5185\u654c\u4eba\u5168\u90e8\u51cf\u901f\uff1b\u4f24\u5bb3\u6700\u4f4e' },\n"
    "  thunder: { name:'\u96f7\u7535', icon:'\u26a1', color:'#ffd21a', cost:104, dmg:14, rate:1.20, range:2.8, chain:5, chainK:0.85,\n"
    "             role:'\u94fe\u5f0f', soloStar:1, groupStar:4,\n"
    "             fx:'\u94fe\u5f0f\u6e05\u7fa4\uff1a\u5f39\u5c04 5 \u4e2a\u76ee\u6807\uff0c\u6bcf\u8df3\u8870\u51cf \xd70.85\uff08\u653e\u5bbd\u4e86\u65e7\u7684 \xd70.6\uff09' },\n"
    "  poison:  { name:'\u5267\u6bd2', icon:'\u2620\ufe0f', color:'#4fe060', cost:88,  dmg:6,  rate:1.05, range:2.5, dot:10, dotT:3.0,\n"
    "             dotR:1.2, role:'\u6301\u7eed', soloStar:1, groupStar:4,\n"
    "             fx:'\u5927\u8303\u56f4\u6301\u7eed\uff1a\u547d\u4e2d\u70b9 1.2 \u683c\u5185\u6240\u6709\u654c\u4eba\u4e2d\u6bd2\uff0810/\u79d2 \xd7 3 \u79d2\uff09\uff0c\u6bd2\u4f24\u65e0\u89c6\u62a4\u7532' },\n"
    "  phys:    { name:'\u7269\u7406', icon:'\U0001f528', color:'#cfd8e8', cost:78,  dmg:30, rate:0.72, range:2.2,\n"
    "             antiArmor:0.35, role:'\u5355\u4f53', soloStar:4, groupStar:1,\n"
    "             fx:'\u5355\u4f53\u8f93\u51fa\uff1a\u5bf9\u6709\u62a4\u7532\u7684\u76ee\u6807\u4f24\u5bb3 +35%\uff08\u5df2\u53d6\u6d88\u7a7f\u7532\uff0c\u62a4\u7532\u6539\u9760\u7ec4\u5408\u7834\u9664\uff09' },\n"
    "  support: { name:'\u8f85\u52a9', icon:'\U0001f4e1', color:'#b98cff', cost:88,  dmg:0,  rate:0,    range:2.6, aura:true,\n"
    "             auraDmg:0.25, auraRate:0.18, role:'\u5149\u73af', soloStar:0, groupStar:0,\n"
    "             fx:'\u5149\u73af\uff1a\u76f8\u90bb\u5854\u4f24\u5bb3 +25%\u3001\u653b\u901f +18%\uff08\u81ea\u8eab\u4e0d\u653b\u51fb\uff09' },\n"
    "  sniper:  { name:'\u72d9\u51fb', icon:'\U0001f3af', color:'#9fe8ff', cost:120, dmg:95, rate:2.6,  range:4.5,\n"
    "             highValue:true, role:'\u70b9\u6740', soloStar:5, groupStar:1,\n"
    "             fx:'\u8d85\u8fdc\u70b9\u6740\uff1a\u53ea\u6253\u5355\u4f53\uff08\u5c04\u7a0b 4.5 \u683c\uff09\uff1b\u4f18\u5148\u9501\u5b9a\u533b\u7597\u5175 / \u7cbe\u82f1\u961f\u957f / BOSS' },\n"
    "  mortar:  { name:'\u69b4\u5f39', icon:'\U0001f4a5', color:'#ffb04a', cost:115, dmg:12, rate:1.8,  range:3.0,\n"
    "             splashR:2.2, splashK:0.45, role:'\u8303\u56f4', soloStar:1, groupStar:5,\n"
    "             fx:'\u5927\u8303\u56f4\u7206\u7834\uff1a\u547d\u4e2d\u70b9 2.2 \u683c\u5185\u654c\u4eba\u53d7 45% \u4f24\u5bb3\uff1b\u5bf9\u5355\u4f53\u6781\u4f4e' }\n"
    "};\n"
)

rep('ELEMS 八塔数值表（含 role/soloStar/groupStar）', OLD_ELEMS, NEW_ELEMS)

# ============================================================================
# ② 共鸣组合补齐（插在既有 8 组之后、辅助塔分支之前；key 按 sort().join('+') 的字母序）
# ============================================================================
OLD_RESO = (
    "      else if (pair === 'phys+poison'){ res.dmgMul += 0.50; res.dotMul = 1.8; res.tags.push('\u8150\u8680'); }\n"
)
NEW_RESO = (
    "      else if (pair === 'phys+poison'){ res.dmgMul += 0.50; res.dotMul = 1.8; res.tags.push('\u8150\u8680'); }\n"
    "      /* —— TOWERS_V6_PATCH：新增塔的 5 组组合（key 一律按 [a,b].sort().join('+') 的字母序书写）—— */\n"
    "      else if (pair === 'fire+mortar'){ res.splashBurn = 8; res.tags.push('\u71c3\u70e7\u5f39'); }\n"
    "      else if (pair === 'mortar+poison'){ res.splashDot = ELEMS.poison.dot; res.tags.push('\u6bd2\u6c14\u5f39'); }\n"
    "      else if (pair === 'ice+mortar'){ res.splashSlow = 0.5; res.tags.push('\u51b0\u7206'); }\n"
    "      else if (pair === 'sniper+thunder'){ res.dmgMul += 0.60; res.pierceFull = true; res.tags.push('\u7535\u78c1\u72d9\u51fb'); }\n"
    "      else if (pair === 'phys+sniper'){ res.pierceFull = true; res.armorBreak = 1.4; res.tags.push('\u7834\u7532\u5f39'); }\n"
)
rep('resonanceOf 新增 5 组共鸣（燃烧弹/毒气弹/冰爆/电磁狙击/破甲弹）', OLD_RESO, NEW_RESO)

# ============================================================================
# ③ 溅射 / 范围状态小工具（放在 hitEnemy 之前）
# ============================================================================
ANCHOR_HITENEMY = "function hitEnemy(t, e, st, def, isChain){\n"
HELPERS = (
    "/* ===== TOWERS_V6_PATCH：溅射 / 范围状态小工具 =====\n"
    "   ① rings 是「命中圈」特效池：每发子弹只 push 一个对象、随 life 递减，绝不每帧新建；\n"
    "   ② applyDotTo / applySlowTo 只写状态字段，真正的结算在 updateEnemies 里按 dt 推进\n"
    "      （dotT / slowT 都是 dt 通道，倍速子步 stepSim 被多次调用也完全安全）；\n"
    "   ③ 上毒只加强不削弱：普通毒不会把「腐蚀 ×1.8」或更长的毒覆盖掉。 */\n"
    "function inCells(a, b, cells){\n"
    "  var dx = a.x - b.x, dy = a.y - b.y;\n"
    "  return dx * dx + dy * dy <= CELL * cells * CELL * cells;   // 平方比较，省掉每发的 Math.hypot\n"
    "}\n"
    "function applyDotTo(e, dps, dur){\n"
    "  if (!e || e.hp <= 0 || !(dps > 0)) return;\n"
    "  e.dotD = Math.max((e.dotT > 0 ? (e.dotD || 0) : 0), dps);\n"
    "  e.dotT = Math.max(e.dotT || 0, dur);\n"
    "}\n"
    "function applySlowTo(e, mul, dur){\n"
    "  if (!e || e.hp <= 0 || e.immuneSlow) return;   // 免疫减速的怪（护盾怪）直接跳过\n"
    "  e.slowF = Math.min(e.slowF || 1, mul);\n"
    "  e.slowT = Math.max(e.slowT || 0, dur);\n"
    "}\n"
    "function addRing(x, y, color, rad, life){\n"
    "  if (rings.length > 60) return;                  // 极端怪海下的硬上限，防特效池膨胀\n"
    "  rings.push({ x:x, y:y, color:color, rad:rad, life:life, max:life });\n"
    "}\n"
)
rep('新增溅射/范围辅助函数（inCells/applyDotTo/applySlowTo/addRing）', ANCHOR_HITENEMY, HELPERS + ANCHOR_HITENEMY)

# ============================================================================
# ④ hitEnemy：去掉 pierce、加 antiArmor、统一溅射入口 + dotR / slowR / 组合补状态
# ============================================================================
OLD_HIT = (
    "  /* \u7535\u78c1\u70ae\uff1a\u5b8c\u5168\u65e0\u89c6\u62a4\u7532 */\n"
    "  var armor = (res && res.pierceFull) ? 1 : (1 - (e.armor || 0) * (1 - (def.pierce || 0)));\n"
    "  /* \u7194\u94c1\uff1a\u53ea\u5bf9\u300c\u6709\u62a4\u7532\u300d\u7684\u76ee\u6807\u989d\u5916 \xd71.4 */\n"
    "  var breakMul = (res && res.armorBreak && (e.armor || 0) > 0) ? res.armorBreak : 1;\n"
    "  var comboMul = 1 + Math.min(comboCount, 40) * 0.02 * (1 + BUFFS.combo);   // \u8fde\u6740\u52a0\u6210\n"
    "  /* \u788e\u51b0\uff1a\u672c\u5854\u66b4\u51fb\u7387 +15% */\n"
    "  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0));\n"
    "  var dmg = st.dmg * armor * breakMul * comboMul * (crit ? 2.5 : 1);\n"
    "  if (e.shieldT > 0) dmg *= 0.15;             // \u51fa\u751f\u62a4\u76fe\uff1a\u51cf\u4f24 85%\n"
    "  if (e.shieldBuffT > 0) dmg *= 0.80;         // \u533b\u7597\u5175\u62a4\u7f69\uff1a\u51cf\u4f24 20%\n"
    "  e.hp -= dmg; e.hitFlash = 0.12;\n"
    "  addFloat(e.x, e.y - e.r - 4, (crit ? '\u66b4\u51fb ' : '') + Math.round(dmg), crit ? '#ffd24a' : def.color);\n"
    "  if (!isChain) addBeam(cx(t.c), cy(t.r), e.x, e.y, def.color);\n"
    "  if (def.slow && !e.immuneSlow){\n"
    "    var slowMul = (t.res && t.res.slowMul) ? t.res.slowMul : 1;\n"
    "    e.slowF = Math.min(e.slowF, Math.max(0.12, def.slow / slowMul));\n"
    "    e.slowT = def.slowT * (t.res && t.res.freeze ? 1.8 : 1);\n"
    "  }\n"
    "  var dotK = (res && res.dotMul) ? res.dotMul : 1;                          // \u8150\u8680\uff1a\u6bd2\u4f24 \xd71.8\n"
    "  if (def.dot){ e.dotD = def.dot * (1 + (t.lv - 1) * 0.4) * dotK; e.dotT = def.dotT * (t.res && t.res.dotInstant ? 2.0 : 1); }\n"
    "  if (t.res && t.res.dotInstant && def.dot){ e.hp -= def.dot * def.dotT * t.res.dotInstant * dotK; }\n"
    "  if (t.res && t.res.splash){\n"
    "    for (var i = 0; i < enemies.length; i++){\n"
    "      var o = enemies[i];\n"
    "      if (o === e) continue;\n"
    "      if (Math.hypot(o.x - e.x, o.y - e.y) < CELL * 1.5){ o.hp -= dmg * 1.0; o.hitFlash = 0.1; }\n"
    "    }\n"
    "    burst(e.x, e.y, '#ff8a3a', 8);\n"
    "  }\n"
)

NEW_HIT = (
    "  /* \u7535\u78c1\u70ae / \u7535\u78c1\u72d9\u51fb / \u7834\u7532\u5f39\uff1a\u5b8c\u5168\u65e0\u89c6\u62a4\u7532 */\n"
    "  var armor = (res && res.pierceFull) ? 1 : (1 - (e.armor || 0));\n"
    "  /* \u7194\u94c1 / \u7834\u7532\u5f39\uff1a\u53ea\u5bf9\u300c\u6709\u62a4\u7532\u300d\u7684\u76ee\u6807\u989d\u5916\u52a0\u4f24 */\n"
    "  var breakMul = (res && res.armorBreak && (e.armor || 0) > 0) ? res.armorBreak : 1;\n"
    "  /* TOWERS_V6_PATCH \u7269\u7406\u5854\uff1aantiArmor = \u5bf9\u6709\u7532\u76ee\u6807 +35%\uff08\u53d6\u4ee3\u539f pierce \u7a7f\u7532\uff09*/\n"
    "  var antiMul = (def.antiArmor && (e.armor || 0) > 0) ? (1 + def.antiArmor) : 1;\n"
    "  var comboMul = 1 + Math.min(comboCount, 40) * 0.02 * (1 + BUFFS.combo);   // \u8fde\u6740\u52a0\u6210\n"
    "  /* \u788e\u51b0\uff1a\u672c\u5854\u66b4\u51fb\u7387 +15% */\n"
    "  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0));\n"
    "  var dmg = st.dmg * armor * breakMul * antiMul * comboMul * (crit ? 2.5 : 1);\n"
    "  if (e.shieldT > 0) dmg *= 0.15;             // \u51fa\u751f\u62a4\u76fe\uff1a\u51cf\u4f24 85%\n"
    "  if (e.shieldBuffT > 0) dmg *= 0.80;         // \u533b\u7597\u5175\u62a4\u7f69\uff1a\u51cf\u4f24 20%\n"
    "  e.hp -= dmg; e.hitFlash = 0.12;\n"
    "  addFloat(e.x, e.y - e.r - 4, (crit ? '\u66b4\u51fb ' : '') + Math.round(dmg), crit ? '#ffd24a' : def.color);\n"
    "  if (!isChain) addBeam(cx(t.c), cy(t.r), e.x, e.y, def.color);\n"
    "  /* \u51cf\u901f/\u4e2d\u6bd2\u53c2\u6570\u5148\u7b97\u4e00\u904d\uff1a\u4e3b\u76ee\u6807\u4e0e\u8303\u56f4\u76ee\u6807\u7528\u540c\u4e00\u5957\u6570\u503c */\n"
    "  var resoSlowK = (res && res.slowMul) ? res.slowMul : 1;                  // \u8d85\u5bfc\uff1a\u51cf\u901f\u500d\u7387 x3\n"
    "  var slowV = def.slow ? Math.max(0.12, def.slow / resoSlowK) : 1;\n"
    "  var slowS = def.slowT * (res && res.freeze ? 1.8 : 1);\n"
    "  if (def.slow && !e.immuneSlow) applySlowTo(e, slowV, slowS);\n"
    "  var dotK = (res && res.dotMul) ? res.dotMul : 1;                          // \u8150\u8680\uff1a\u6bd2\u4f24 \xd71.8\n"
    "  var dotD1 = def.dot ? def.dot * (1 + (t.lv - 1) * 0.4) * dotK : 0;\n"
    "  var dotT1 = def.dotT * (res && res.dotInstant ? 2.0 : 1);\n"
    "  if (def.dot) applyDotTo(e, dotD1, dotT1);\n"
    "  if (res && res.dotInstant && def.dot){ e.hp -= def.dot * def.dotT * res.dotInstant * dotK; }\n"
    "  /* \u2014\u2014 TOWERS_V6_PATCH \u5267\u6bd2\u5854 dotR\uff1a\u547d\u4e2d\u70b9 1.2 \u683c\u5185\u300c\u6240\u6709\u654c\u4eba\u300d\u4e2d\u6bd2 \u2014\u2014\n"
    "     \u6bd2\u4f24\u5728 updateEnemies \u91cc\u76f4\u63a5\u6263\u8840\uff08\u4e0d\u8d70\u62a4\u7532\u7cfb\u6570\uff09= \u65e0\u89c6\u62a4\u7532\uff1b\n"
    "     \u8303\u56f4\u5185\u53ea push \u4e00\u4e2a\u547d\u4e2d\u5708\uff0c\u4e0d\u6bcf\u5e27\u65b0\u5efa\u5bf9\u8c61 */\n"
    "  if (def.dotR){\n"
    "    for (var di = 0; di < enemies.length; di++){\n"
    "      var de = enemies[di];\n"
    "      if (de === e || de.hp <= 0) continue;\n"
    "      if (inCells(de, e, def.dotR)) applyDotTo(de, dotD1, dotT1);\n"
    "    }\n"
    "    addRing(e.x, e.y, '#4fe060', CELL * def.dotR, 0.5);\n"
    "  }\n"
    "  /* \u2014\u2014 TOWERS_V6_PATCH \u51b0\u971c\u5854 slowR\uff1a\u547d\u4e2d\u70b9 1.0 \u683c\u5185\u300c\u6240\u6709\u654c\u4eba\u300d\u51cf\u901f \u2014\u2014 */\n"
    "  if (def.slowR){\n"
    "    for (var si2 = 0; si2 < enemies.length; si2++){\n"
    "      var se = enemies[si2];\n"
    "      if (se === e || se.hp <= 0) continue;\n"
    "      if (inCells(se, e, def.slowR)) applySlowTo(se, slowV, slowS);\n"
    "    }\n"
    "    addRing(e.x, e.y, '#bfeaff', CELL * def.slowR, 0.45);\n"
    "  }\n"
    "  /* \u2014\u2014 TOWERS_V6_PATCH \u6e85\u5c04\u7edf\u4e00\u5165\u53e3 \u2014\u2014\n"
    "     \u706b\u7130/\u69b4\u5f39\u7684 def.splashR \u4e0e\u7ec4\u5408\u300c\u70ed\u9707\u300d\u7684 res.splash \u53e0\u52a0\u5171\u5b58\uff1a\n"
    "     \u534a\u5f84\u53d6\u4e24\u8005\u8f83\u5927\u8005\u3001\u500d\u7387\u53d6\u4e24\u8005\u8f83\u5927\u8005\uff0c\u4e92\u4e0d\u8986\u76d6\uff1b\n"
    "     \u53ea\u6709\u4e3b\u76ee\u6807\u4e4b\u5916\u7684\u654c\u4eba\u5403\u6e85\u5c04\u4f24\u5bb3\uff08\u51cf\u8840\u540e\u7531 updateEnemies \u7edf\u4e00\u7ed3\u7b97\u6b7b\u4ea1\uff09*/\n"
    "  var spR = def.splashR || 0, spK = def.splashK || 0;\n"
    "  if (res && res.splash){\n"
    "    if (1.5 > spR) spR = 1.5;                       // \u70ed\u9707\uff1a\u539f\u786c\u7f16\u7801\u534a\u5f84 1.5 \u683c\n"
    "    if (res.splash > spK) spK = res.splash;         // \u70ed\u9707\uff1a\u6e85\u5c04\u4f24\u5bb3\u6309 100% \u7ed3\u7b97\n"
    "  }\n"
    "  if (spR > 0){\n"
    "    spR *= (BUFFS.splash || 1);                     // \u300c\u6269\u6563\u5f39\u5934\u300d\u5f3a\u5316\uff1a\u6e85\u5c04\u8303\u56f4 +45%\n"
    "    for (var pi2 = 0; pi2 < enemies.length; pi2++){\n"
    "      var so = enemies[pi2];\n"
    "      if (so === e || so.hp <= 0) continue;\n"
    "      if (!inCells(so, e, spR)) continue;\n"
    "      so.hp -= dmg * spK; so.hitFlash = 0.1;\n"
    "      /* \u71c3\u70e7\u5f39 / \u6bd2\u6c14\u5f39 / \u51b0\u7206\uff1a\u7ed9\u6e85\u5c04\u533a\u57df\u5185\u7684\u654c\u4eba\u8865\u72b6\u6001\uff08\u5168\u90e8\u8d70 dt \u901a\u9053\uff09*/\n"
    "      if (res && res.splashBurn) applyDotTo(so, res.splashBurn, 3.0);\n"
    "      if (res && res.splashDot) applyDotTo(so, res.splashDot, 3.0);\n"
    "      if (res && res.splashSlow) applySlowTo(so, res.splashSlow, 1.6);\n"
    "    }\n"
    "    addRing(e.x, e.y, def.color, CELL * spR, 0.45);\n"
    "    if (res && res.splash) burst(e.x, e.y, '#ff8a3a', 8);   // \u70ed\u9707\uff1a\u4fdd\u7559\u539f\u7c92\u5b50\u7206\u53d1\n"
    "  }\n"
)
rep('hitEnemy：去 pierce / 加 antiArmor / 统一溅射入口 / dotR / slowR', OLD_HIT, NEW_HIT)

# ============================================================================
# ⑤ updateTowers：狙击塔高价值目标优先 + 链弹 5 跳每跳 ×0.85
# ============================================================================
OLD_TOWER = (
    "    var st = towerStat(t);\n"
    "    t.cd -= dt;\n"
    "    var best = null, bestProg = -1e9;\n"
    "    for (var j = 0; j < enemies.length; j++){\n"
    "      var e = enemies[j];\n"
    "      if (towerDist(t, e) > st.range) continue;\n"
    "      /* \u7d22\u654c\u4f18\u5148\u7ea7\uff1a\n"
    "         \u2460 \u5148\u6253\u300c\u79bb\u57fa\u5730\u6700\u8fd1\u300d\u7684\uff08\u7d2f\u8ba1\u5df2\u8d70\u8def\u7a0b done \u8d8a\u5927 = \u79bb\u7ec8\u70b9\u8d8a\u8fd1\uff0c\u6f0f\u6389\u6700\u5371\u9669\uff09\n"
    "         \u2461 \u8def\u7a0b\u76f8\u540c\u65f6\u6253\u300c\u8840\u91cf\u6700\u4f4e\u300d\u7684\uff08\u8865\u5200\u4f18\u5148\uff0c\u9632\u6b62\u6b8b\u8840\u602a\u6e9c\u8fc7\u53bb\uff09\n"
    "         done \u4e58 1e6 \u4fdd\u8bc1\u8def\u7a0b\u5dee\u4e25\u683c\u538b\u8fc7\u8840\u91cf\u5dee\uff08\u8840\u91cf\u6700\u591a\u7ea6 1200\uff09 */\n"
    "      var prog = (e.done || 0) * 1e6 - e.hp;\n"
    "      if (prog > bestProg){ bestProg = prog; best = e; }\n"
    "    }\n"
    "    if (best) t.ang = Math.atan2(best.y - cy(t.r), best.x - cx(t.c));\n"
    "    if (!best || t.cd > 0) continue;\n"
    "    t.cd = st.rate;\n"
    "    t.flash = 0.1;\n"
    "    if (Math.random() < 0.35) SFX.shoot();\n"
    "    hitEnemy(t, best, st, def);\n"
    "    if (def.chain && !best.dead && enemies.indexOf(best) >= 0){\n"
    "      var extra = 0;\n"
    "      for (var k = 0; k < enemies.length && extra < def.chain - 1; k++){\n"
    "        var e2 = enemies[k];\n"
    "        if (e2 === best || e2.hp <= 0) continue;\n"
    "        if (Math.hypot(e2.x - best.x, e2.y - best.y) < CELL * 1.6){\n"
    "          hitEnemy(t, e2, { dmg: st.dmg * 0.6 }, def, true); extra++;\n"
    "        }\n"
    "      }\n"
    "    }\n"
)
NEW_TOWER = (
    "    var st = towerStat(t);\n"
    "    t.cd -= dt;\n"
    "    var best = null, bestProg = -1e9;\n"
    "    var vip = null, vipProg = -1e9;     // TOWERS_V6_PATCH\uff1a\u9ad8\u4ef7\u503c\u76ee\u6807\uff08\u533b\u7597\u5175/\u7cbe\u82f1\u961f\u957f/BOSS\uff09\u5355\u72ec\u4e00\u6863\n"
    "    for (var j = 0; j < enemies.length; j++){\n"
    "      var e = enemies[j];\n"
    "      if (towerDist(t, e) > st.range) continue;\n"
    "      /* \u7d22\u654c\u4f18\u5148\u7ea7\uff1a\n"
    "         \u2460 \u5148\u6253\u300c\u79bb\u57fa\u5730\u6700\u8fd1\u300d\u7684\uff08\u7d2f\u8ba1\u5df2\u8d70\u8def\u7a0b done \u8d8a\u5927 = \u79bb\u7ec8\u70b9\u8d8a\u8fd1\uff0c\u6f0f\u6389\u6700\u5371\u9669\uff09\n"
    "         \u2461 \u8def\u7a0b\u76f8\u540c\u65f6\u6253\u300c\u8840\u91cf\u6700\u4f4e\u300d\u7684\uff08\u8865\u5200\u4f18\u5148\uff0c\u9632\u6b62\u6b8b\u8840\u602a\u6e9c\u8fc7\u53bb\uff09\n"
    "         done \u4e58 1e6 \u4fdd\u8bc1\u8def\u7a0b\u5dee\u4e25\u683c\u538b\u8fc7\u8840\u91cf\u5dee\uff08\u8840\u91cf\u6700\u591a\u7ea6 1200\uff09\n"
    "         \u2462 TOWERS_V6_PATCH\uff1a\u5e26 highValue \u7684\u5854\uff08\u72d9\u51fb\uff09\u628a\u300c\u533b\u7597\u5175 / \u7cbe\u82f1\u961f\u957f / BOSS\u300d\u5355\u72ec\u6392\u4e00\u6863\uff0c\n"
    "            \u6863\u5185\u4ecd\u6309 \u2460\u2461 \u6392\u5e8f\uff1b\u53ea\u8981\u5c04\u7a0b\u5185\u6709\u9ad8\u4ef7\u503c\u76ee\u6807\uff0c\u5c31\u4e00\u5b9a\u5148\u6253\u5b83 */\n"
    "      var prog = (e.done || 0) * 1e6 - e.hp;\n"
    "      if (def.highValue && (e.heal || e.aura || e.boss)){\n"
    "        if (prog > vipProg){ vipProg = prog; vip = e; }\n"
    "      } else if (prog > bestProg){ bestProg = prog; best = e; }\n"
    "    }\n"
    "    if (def.highValue && vip) best = vip;\n"
    "    if (best) t.ang = Math.atan2(best.y - cy(t.r), best.x - cx(t.c));\n"
    "    if (!best || t.cd > 0) continue;\n"
    "    t.cd = st.rate;\n"
    "    t.flash = 0.1;\n"
    "    if (Math.random() < 0.35) SFX.shoot();\n"
    "    hitEnemy(t, best, st, def);\n"
    "    if (def.chain && !best.dead && enemies.indexOf(best) >= 0){\n"
    "      /* TOWERS_V6_PATCH\uff1a\u94fe\u5f39 5 \u8df3\uff0c\u6bcf\u8df3\u4f24\u5bb3 \xd7chainK(0.85)\uff1b\u8df3\u8dc3\u534a\u5f84\u653e\u5bbd\u5230 1.9 \u683c */\n"
    "      var extra = 0, jumpK = def.chainK || 0.85;\n"
    "      for (var k = 0; k < enemies.length && extra < def.chain - 1; k++){\n"
    "        var e2 = enemies[k];\n"
    "        if (e2 === best || e2.hp <= 0) continue;\n"
    "        if (Math.hypot(e2.x - best.x, e2.y - best.y) < CELL * 1.9){\n"
    "          hitEnemy(t, e2, { dmg: st.dmg * jumpK }, def, true);\n"
    "          extra++; jumpK *= (def.chainK || 0.85);\n"
    "        }\n"
    "      }\n"
    "    }\n"
)
rep('updateTowers：狙击高价值优先 + 链弹 5 跳每跳 ×0.85', OLD_TOWER, NEW_TOWER)

# ============================================================================
# ⑥ 造型：drawTowerBody 新增狙击（细长炮管 + 瞄准十字）/ 榴弹（粗短炮管 + 圆鼓弹仓）
# ============================================================================
OLD_BASE = (
    "  else { ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3); }            // \u96f7/\u6bd2/\u8f85\u52a9\uff1a\u5706\n"
)
NEW_BASE = (
    "  else if (elem === 'sniper'){ poly(x, y, rad, 3, -Math.PI/2); }   // TOWERS_V6_PATCH \u72d9\u51fb\uff1a\u4e09\u89d2\u70ae\u5ea7\n"
    "  else if (elem === 'mortar'){ poly(x, y, rad, 8, Math.PI/8); }    // TOWERS_V6_PATCH \u69b4\u5f39\uff1a\u516b\u89d2\u539a\u5e95\u5ea7\n"
    "  else { ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3); }            // \u96f7/\u6bd2/\u8f85\u52a9\uff1a\u5706\n"
)
rep('drawTowerBody 底座造型：狙击三角 / 榴弹八角', OLD_BASE, NEW_BASE)

ANCHOR_SUPPORT_ICON = "  } else if (elem === 'support'){\n"
SNIPER_MORTAR_ICON = (
    "  } else if (elem === 'sniper'){\n"
    "    /* TOWERS_V6_PATCH \u72d9\u51fb\uff1a\u7784\u51c6\u5341\u5b57\uff08\u5916\u73af + \u5341\u5b57\u7ebf + \u4e2d\u5fc3\u4eae\u70b9\uff09 */\n"
    "    ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 1.8;\n"
    "    ctx.beginPath(); ctx.arc(x, y, rad * 0.62, 0, 6.3); ctx.stroke();\n"
    "    ctx.beginPath();\n"
    "    ctx.moveTo(x - rad * 0.92, y); ctx.lineTo(x - rad * 0.28, y);\n"
    "    ctx.moveTo(x + rad * 0.28, y); ctx.lineTo(x + rad * 0.92, y);\n"
    "    ctx.moveTo(x, y - rad * 0.92); ctx.lineTo(x, y - rad * 0.28);\n"
    "    ctx.moveTo(x, y + rad * 0.28); ctx.lineTo(x, y + rad * 0.92);\n"
    "    ctx.stroke();\n"
    "    ctx.fillStyle = color;\n"
    "    ctx.beginPath(); ctx.arc(x, y, rad * 0.20, 0, 6.3); ctx.fill();\n"
    "  } else if (elem === 'mortar'){\n"
    "    /* TOWERS_V6_PATCH \u69b4\u5f39\uff1a\u5706\u9f13\u5f39\u4ed3\uff08\u5916\u5708 + \u5185\u5b54 + \u4e09\u53d1\u70ae\u5f39\uff09 */\n"
    "    ctx.fillStyle = '#ffd9a6';\n"
    "    ctx.beginPath(); ctx.arc(x, y - rad * 0.06, rad * 0.54, 0, 6.3); ctx.fill();\n"
    "    ctx.fillStyle = '#0e1422';\n"
    "    ctx.beginPath(); ctx.arc(x, y - rad * 0.06, rad * 0.32, 0, 6.3); ctx.fill();\n"
    "    ctx.fillStyle = color;\n"
    "    for (var m2 = 0; m2 < 3; m2++){\n"
    "      var ma2 = -Math.PI / 2 + m2 * Math.PI * 2 / 3;\n"
    "      ctx.beginPath();\n"
    "      ctx.arc(x + Math.cos(ma2) * rad * 0.36, y - rad * 0.06 + Math.sin(ma2) * rad * 0.36, rad * 0.14, 0, 6.3);\n"
    "      ctx.fill();\n"
    "    }\n"
    + ANCHOR_SUPPORT_ICON
)
rep('drawTowerBody 塔身细节：狙击瞄准十字 / 榴弹弹仓', ANCHOR_SUPPORT_ICON, SNIPER_MORTAR_ICON)

OLD_BARREL = (
    "    } else {\n"
    "      ctx.fillStyle = def.color;\n"
    "      roundRect(rad * 0.2, -rad * 0.16, rad * 1.05, rad * 0.32, rad * 0.14); ctx.fill();\n"
    "    }\n"
    "    if (tw.flash > 0){\n"
    "      ctx.globalAlpha = tw.flash / 0.1;\n"
    "      ctx.fillStyle = '#ffffff';\n"
    "      glow(def.color, 18);\n"
    "      ctx.beginPath(); ctx.arc(rad * 1.25, 0, rad * 0.3, 0, 6.3); ctx.fill();\n"
)
NEW_BARREL = (
    "    } else if (tw.elem === 'sniper'){\n"
    "      /* TOWERS_V6_PATCH \u72d9\u51fb\uff1a\u7ec6\u957f\u67aa\u7ba1 + \u5236\u9000\u5668 */\n"
    "      ctx.fillStyle = def.color;\n"
    "      roundRect(rad * 0.10, -rad * 0.09, rad * 1.95, rad * 0.18, rad * 0.09); ctx.fill();\n"
    "      ctx.fillStyle = '#eafcff';\n"
    "      roundRect(rad * 1.72, -rad * 0.17, rad * 0.30, rad * 0.34, rad * 0.06); ctx.fill();\n"
    "    } else if (tw.elem === 'mortar'){\n"
    "      /* TOWERS_V6_PATCH \u69b4\u5f39\uff1a\u7c97\u77ed\u70ae\u7ba1 + \u5f00\u53e3\u70ae\u53e3 */\n"
    "      ctx.fillStyle = def.color;\n"
    "      roundRect(rad * 0.12, -rad * 0.38, rad * 0.95, rad * 0.76, rad * 0.24); ctx.fill();\n"
    "      ctx.fillStyle = '#2a1c08';\n"
    "      roundRect(rad * 0.92, -rad * 0.46, rad * 0.26, rad * 0.92, rad * 0.12); ctx.fill();\n"
    "    } else {\n"
    "      ctx.fillStyle = def.color;\n"
    "      roundRect(rad * 0.2, -rad * 0.16, rad * 1.05, rad * 0.32, rad * 0.14); ctx.fill();\n"
    "    }\n"
    "    if (tw.flash > 0){\n"
    "      ctx.globalAlpha = tw.flash / 0.1;\n"
    "      ctx.fillStyle = '#ffffff';\n"
    "      glow(def.color, 18);\n"
    "      var fx2 = (tw.elem === 'sniper') ? 2.05 : ((tw.elem === 'mortar') ? 1.18 : 1.25);\n"
    "      ctx.beginPath(); ctx.arc(rad * fx2, 0, rad * (tw.elem === 'mortar' ? 0.44 : 0.3), 0, 6.3); ctx.fill();\n"
)
rep('开火炮口造型：狙击细长枪管 / 榴弹粗短炮管（含炮口闪光位置）', OLD_BARREL, NEW_BARREL)

# ============================================================================
# ⑦ 命中圈特效池 rings：声明 / 关卡重置 / 按 dt 更新 / 绘制
# ============================================================================
OLD_RING_DECL = "var beams = [], floats = [], parts = [], banner = '', bannerT = 0, hurtT = 0;\n"
NEW_RING_DECL = (
    "/* TOWERS_V6_PATCH\uff1arings = \u6e85\u5c04/\u8303\u56f4\u547d\u4e2d\u5708\u7279\u6548\u6c60\uff08\u6bcf\u53d1\u5b50\u5f39\u53ea\u4ea7\u751f 1 \u4e2a\u5bf9\u8c61\uff0c\u4e0d\u6bcf\u5e27\u65b0\u5efa\uff09*/\n"
    "var beams = [], floats = [], parts = [], rings = [], banner = '', bannerT = 0, hurtT = 0;\n"
)
rep('特效池：声明 rings', OLD_RING_DECL, NEW_RING_DECL)

OLD_RING_RESET = "  beams = []; floats = []; parts = [];\n"
NEW_RING_RESET = "  beams = []; floats = []; parts = []; rings = [];\n"
rep('特效池：开新关卡时清空 rings', OLD_RING_RESET, NEW_RING_RESET)

OLD_RING_TICK = "  if (bannerT > 0) bannerT -= dt;\n"
NEW_RING_TICK = (
    "  /* TOWERS_V6_PATCH\uff1a\u547d\u4e2d\u5708\u6309 dt \u9012\u51cf\uff08\u4e0e beams/floats/parts \u540c\u4e00\u5957\uff09*/\n"
    "  for (var rg = rings.length - 1; rg >= 0; rg--){\n"
    "    rings[rg].life -= dt;\n"
    "    if (rings[rg].life <= 0) rings.splice(rg, 1);\n"
    "  }\n"
    "  if (bannerT > 0) bannerT -= dt;\n"
)
rep('特效池：rings 按 dt 递减', OLD_RING_TICK, NEW_RING_TICK)

OLD_RING_DRAW = (
    "  ctx.globalAlpha = 1;\n"
    "  // \u7c92\u5b50\n"
)
NEW_RING_DRAW = (
    "  ctx.globalAlpha = 1;\n"
    "  /* TOWERS_V6_PATCH\uff1a\u547d\u4e2d\u5708\u2014\u2014\u706b\u7130\u6a59\u5708 / \u6bd2\u7eff\u73af / \u51b0\u51bb\u971c\u73af / \u69b4\u5f39\u7425\u73c0\u5708\uff0c\u753b\u5728\u7c92\u5b50\u4e4b\u4e0b */\n"
    "  for (var rgi = 0; rgi < rings.length; rgi++){\n"
    "    var rgr = rings[rgi], rgk = 1 - Math.max(0, rgr.life) / rgr.max;\n"
    "    ctx.globalAlpha = Math.max(0, rgr.life / rgr.max) * 0.85;\n"
    "    ctx.strokeStyle = rgr.color; ctx.lineWidth = 2.6 * (1 - rgk) + 0.8;\n"
    "    ctx.beginPath(); ctx.arc(rgr.x, rgr.y, rgr.rad * (0.35 + 0.65 * rgk), 0, 6.3); ctx.stroke();\n"
    "    ctx.globalAlpha = 1;\n"
    "  }\n"
    "  // \u7c92\u5b50\n"
)
rep('特效池：绘制 rings', OLD_RING_DRAW, NEW_RING_DRAW)

# ============================================================================
# ⑧ 图鉴共鸣表同步（不删既有 9 条，只补 5 条；图鉴卡片自己会按 ELEMS 遍历）
# ============================================================================
OLD_BOOK = "  { pair:'support',      name:'\u589e\u5e45\u573a', note:'\u76f8\u90bb\u653b\u51fb\u5854 \u4f24\u5bb3+20% / \u5c04\u7a0b+10%' }\n"
NEW_BOOK = (
    "  /* TOWERS_V6_PATCH\uff1a\u65b0\u589e\u5854\u7684 5 \u7ec4\u7ec4\u5408\uff08key \u4e0e resonanceOf \u5b8c\u5168\u4e00\u81f4\uff09*/\n"
    "  { pair:'fire+mortar',    name:'\u71c3\u70e7\u5f39', note:'\u6e85\u5c04\u533a\u9644\u52a0 8/\u79d2 \xd7 3 \u79d2 \u71c3\u70e7' },\n"
    "  { pair:'mortar+poison',  name:'\u6bd2\u6c14\u5f39', note:'\u6e85\u5c04\u533a\u5185\u654c\u4eba\u4e2d\u6bd2' },\n"
    "  { pair:'ice+mortar',     name:'\u51b0\u7206',   note:'\u6e85\u5c04\u533a\u5185\u654c\u4eba\u51cf\u901f' },\n"
    "  { pair:'sniper+thunder', name:'\u7535\u78c1\u72d9\u51fb', note:'\u4f24\u5bb3+60% \u4e14\u65e0\u89c6\u62a4\u7532' },\n"
    "  { pair:'phys+sniper',    name:'\u7834\u7532\u5f39', note:'\u65e0\u89c6\u62a4\u7532 \xb7 \u5bf9\u62a4\u7532\u76ee\u6807\u518d +40%' },\n"
    + OLD_BOOK
)
rep('图鉴 BOOK_RESO：补 5 组新共鸣', OLD_BOOK, NEW_BOOK)


# ============================================================================
# 应用
# ============================================================================
def self_check(s):
    """写后自检：8 条字段齐全 / 无残留穿刺穿刺字段 / 关键实现都在"""
    errs = []
    mi = s.find('var ELEMS = {')
    if mi < 0:
        return ['ELEMS 表丢失']
    me = s.find('\n};\n', mi)
    table = s[mi:me if me > 0 else len(s)]
    for key in ('fire', 'ice', 'thunder', 'poison', 'phys', 'support', 'sniper', 'mortar'):
        k = table.find('  ' + key + ':')
        if k < 0:
            errs.append('ELEMS 缺少条目 %s' % key)
            continue
        e = table.find('},', k)
        entry = table[k:(e if e > 0 else len(table))]
        for field in ('cost:', 'role:', 'soloStar:', 'groupStar:', 'fx:'):
            if field not in entry:
                errs.append('ELEMS.%s 缺少字段 %s' % (key, field))
    if 'def.pierce' in s or 'pierce:' in s:
        errs.append('仍残留 pierce 穿甲字段')
    if s.count(MARKER) < 4:
        errs.append('补丁标记数量异常（%d）' % s.count(MARKER))
    for probe in ("chain:5", "antiArmor:0.35", "splashR:1.0", "dotR:1.2", "slowR:1.0",
                  "splashR:2.2", "highValue:true", "rings = []", "addRing"):
        if probe not in s:
            errs.append('缺少关键实现：%s' % probe)
    return errs


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TARGET
    if not os.path.exists(target):
        sys.stderr.write('[错误] 目标文件不存在：%s\n' % target)
        return 1
    s = io.open(target, encoding='utf-8').read()

    if MARKER in s:
        print('[跳过] %s 已应用过 %s（幂等保护：本次未改动任何字节）' % (target, MARKER))
        return 0

    # ① 全量校验：任何一处不唯一/缺失都直接退出，绝不写回
    bad = 0
    for tag, old, new in REPS:
        n = s.count(old)
        if n != 1:
            print('[失败] 段落「%s」精确匹配 %d 次（要求恰好 1 次）' % (tag, n))
            bad += 1
    if bad:
        print('[中止] 共 %d 处匹配异常 → 未写入任何内容，%s 保持原样' % (bad, target))
        return 1

    # ② 备份
    bak = target + '.pre_towers.bak'
    shutil.copy(target, bak)

    # ③ 应用
    for tag, old, new in REPS:
        s = s.replace(old, new, 1)
        print('[应用] %s' % tag)

    # ④ 自检 + 写回
    errs = self_check(s)
    if errs:
        print('[中止] 自检未通过 → 未写入（%s 保持原样）：' % target)
        for e in errs:
            print('        - %s' % e)
        return 1
    io.open(target, 'w', encoding='utf-8').write(s)
    print('')
    print('[完成] 共替换 %d 处 → %s（备份 %s）' % (len(REPS), target, bak))
    return 0


if __name__ == '__main__':
    sys.exit(main())
