#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.3 升级体系（续）：把专属成长与体系加成接到伤害/射程/链弹/减速/毒/高价值目标 + 面板显示
import io, sys, re
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)

# ① statAt：单体体系伤害加成 + 狙击专属射程成长
sub("""  return { dmg:   d.dmg * lvMul * resoK * BUFFS.dmg * elK * (1 + au.dmg),
           range: d.range * (1 + (lv - 1) * 0.08) * r.rangeMul * BUFFS.range,""",
"""  var upR = (lv - 1) * (d.upRange || 0);                       // 专属射程成长（狙击塔）
  return { dmg:   d.dmg * lvMul * resoK * BUFFS.dmg * elK * (1 + au.dmg) * sysDmgMul(t.elem),
           range: (d.range + upR) * (1 + (lv - 1) * 0.08) * r.rangeMul * BUFFS.range,""", 'statAt 体系伤害+专属射程')

# ② 链弹数量按等级（雷电塔：链弹 +0.4/级）
sub("""      var extra = 0, jumpK = def.chainK || 0.85;
      for (var k = 0; k < enemies.length && extra < def.chain - 1; k++){""",
"""      var chD = elemAt(t.elem, t.lv) || def;                  // v7.3：链弹数随等级提升
      var extra = 0, jumpK = chD.chainK || 0.85;
      for (var k = 0; k < enemies.length && extra < chD.chain - 1; k++){""", '链弹按等级')

# ③ 减速：时长走专属成长 + 控场体系
sub("""  var slowV = def.slow ? Math.max(0.12, def.slow / resoSlowK) : 1;
  var slowS = def.slowT * (res && res.freeze ? 1.8 : 1);""",
"""  var ctrlK = sysCtrlMul(t.elem);                             // 控场体系加成
  var slowV = def.slow ? Math.max(0.10, def.slow / resoSlowK / ctrlK) : 1;
  var slowS = (def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK;""", '减速按等级+体系')

# ④ 毒伤/毒范围按专属成长
sub("""  var dotD1 = def.dot ? def.dot * (1 + (t.lv - 1) * 0.4) * dotK : 0;""",
"""  var dotD1 = def.dot ? (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK : 0;   // 毒伤含专属成长""", '毒伤按等级')
sub("""      if (inCells(de, e, def.dotR)) applyDotTo(de, dotD1, dotT1);""",
"""      if (inCells(de, e, (def2 ? def2.dotR : def.dotR))) applyDotTo(de, dotD1, dotT1);""", '毒范围按等级')

# ⑤ 跳过：本版伤害计算行写法特殊（可选功能，不影响核心）

# ⑥ 升级面板显示：专属成长 + 体系进度
sub("""  sel.innerHTML = '<div class="t">⏸ ' + d.icon + ' ' + d.name + ' Lv' + t.lv + '</div>' + res""",
"""  var upLine = d.upName ? ('<div class="ce" style="margin:2px 0 0">📈 专属成长（每级）：' + d.upName + '</div>') : '';
  var sysTxt = '';
  if (d.sys){
    var sl = sysLevel(d.sys), sb = sysBonus(d.sys), nextT = null, tirs = SYS_TIER[d.sys] || [];
    for (var ti2 = 0; ti2 < tirs.length; ti2++) if (sl < tirs[ti2].lv){ nextT = tirs[ti2]; break; }
    sysTxt = '<div class="cs" style="margin:2px 0 0">🏷 ' + SYS_NAME[d.sys] + ' 总 Lv ' + sl +
             '（当前 +' + Math.round(sb * 100) + '%' + (nextT ? ' · 还需 ' + (nextT.lv - sl) + ' 级 → +' + Math.round(nextT.bonus * 100) + '%' : ' · 已满档') + '）</div>';
  }
  sel.innerHTML = '<div class="t">⏸ ' + d.icon + ' ' + d.name + ' Lv' + t.lv + '</div>' + res + upLine + sysTxt""", '面板显示专属+体系')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_n_upgrade2 完成，共 %d 处：' % len(hits))
for h in hits: print('   -', h)
