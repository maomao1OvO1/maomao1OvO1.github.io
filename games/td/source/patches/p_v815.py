# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 补全 8 种缺失的两两共鸣（原来 13 种 → 21 种，8 座塔的所有两两组合全覆盖）
rep("""      /* —— 辅助塔：只给相邻的「攻击塔」增幅（自己不加，避免自环） —— */""",
"""      /* ===== v8.15：补全此前缺失的 8 种两两共鸣（8 座塔的 21 种非辅助两两组合现已全覆盖）===== */
      else if (pair === 'fire+sniper'){ res.dmgMul += 0.55; res.splashBurn = 6; res.tags.push('燃烧狙击'); }
      else if (pair === 'ice+sniper'){ res.critAdd = (res.critAdd || 0) + 0.20; res.freeze = true; res.tags.push('冻结狙击'); }
      else if (pair === 'ice+poison'){ res.dotMul = 1.6; res.slowMul = 1.5; res.tags.push('霜毒'); }
      else if (pair === 'poison+thunder'){ res.dmgMul += 0.35; res.dotMul = 1.7; res.tags.push('电弧腐蚀'); }
      else if (pair === 'mortar+thunder'){ res.splash = Math.max(res.splash || 1, 1.35); res.dmgMul += 0.30; res.tags.push('电磁爆炸'); }
      else if (pair === 'poison+sniper'){ res.dmgMul += 0.45; res.dotMul = 2.0; res.tags.push('毒狙'); }
      else if (pair === 'mortar+phys'){ res.splash = Math.max(res.splash || 1, 1.30); res.armorBreak = 1.5; res.tags.push('破片重锤'); }
      else if (pair === 'mortar+sniper'){ res.rangeMul += 0.30; res.splash = Math.max(res.splash || 1, 1.25); res.tags.push('抛射狙击'); }
      /* —— 辅助塔：只给相邻的「攻击塔」增幅（自己不加，避免自环） —— */""", '补全两两共鸣')

# ② 三元素共鸣（L 形相邻的三座不同元素塔）
rep("""  res.tags = res.tags.filter(function(v, i, a){ return a.indexOf(v) === i; });""",
"""  /* ===== v8.15 三元素共鸣 =====
     网格里三座塔两两相邻只能构成 L 形（不存在三角形），所以检查「右/左 + 上/下」四种 L 即可。
     要求三座塔元素互不相同、且都不是辅助塔（辅助走增幅场，不参与三元素）。
     三元素比两两更强，是「精心布局」的回报。 */
  var LSHAPES = [[1,1],[1,-1],[-1,1],[-1,-1]], trioDone = {};
  for (var li = 0; li < 4; li++){
    var dc = LSHAPES[li][0], dr = LSHAPES[li][1];
    var pa = towerAt(t.c + dc, t.r), pb = towerAt(t.c, t.r + dr);
    if (!pa || !pb || pa === pb) continue;
    if (t.elem === 'support' || pa.elem === 'support' || pb.elem === 'support') continue;
    if (t.elem === pa.elem || t.elem === pb.elem || pa.elem === pb.elem) continue;
    var trio = [t.elem, pa.elem, pb.elem].sort().join('+');
    if (trioDone[trio]) continue;
    trioDone[trio] = 1;
    if (trio === 'fire+ice+thunder'){
      res.dmgMul += 0.90; res.rateMul += 0.30; res.slowMul = Math.max(res.slowMul || 1, 2.5); res.tags.push('⭐元素风暴');
    } else if (trio === 'fire+mortar+poison'){
      res.splashBurn = 10; res.splashDot = 8; res.splash = Math.max(res.splash || 1, 1.40); res.tags.push('⭐燃烧大地');
    } else if (trio === 'mortar+phys+thunder'){
      res.pierceFull = true; res.dmgMul += 0.50; res.splash = Math.max(res.splash || 1, 1.40); res.tags.push('⭐电磁风暴');
    } else if (trio === 'fire+ice+mortar'){
      res.dmgMul += 0.40; res.splash = Math.max(res.splash || 1, 1.60); res.splashSlow = 0.55; res.tags.push('⭐冰火爆裂');
    } else if (trio === 'ice+phys+sniper'){
      res.pierceFull = true; res.freeze = true; res.critAdd = (res.critAdd || 0) + 0.25; res.tags.push('⭐破冰穿甲');
    } else if (trio === 'fire+phys+sniper'){
      res.armorBreak = 1.6; res.critAdd = (res.critAdd || 0) + 0.20; res.dmgMul += 0.30; res.tags.push('⭐熔金狙击');
    } else if (trio === 'poison+thunder+sniper'){
      res.dotMul = 2.0; res.pierceFull = true; res.dmgMul += 0.30; res.tags.push('⭐腐蚀雷狙');
    } else if (trio === 'ice+mortar+poison'){
      res.splashSlow = 0.60; res.splashDot = 9; res.splash = Math.max(res.splash || 1, 1.30); res.tags.push('⭐霜毒轰炸');
    } else if (trio === 'fire+ice+sniper'){
      res.dmgMul += 0.60; res.critAdd = (res.critAdd || 0) + 0.15; res.freeze = true; res.tags.push('⭐冰火狙击');
    } else if (trio === 'fire+poison+sniper'){
      res.dotMul = 1.8; res.splashBurn = 7; res.dmgMul += 0.35; res.tags.push('⭐毒火狙击');
    } else if (trio === 'ice+poison+thunder'){
      res.dotMul = 1.7; res.slowMul = 2.0; res.dmgMul += 0.40; res.tags.push('⭐雷霜毒');
    } else if (trio === 'phys+poison+sniper'){
      res.pierceFull = true; res.dotMul = 1.9; res.dmgMul += 0.35; res.tags.push('⭐腐蚀穿甲');
    } else {
      res.dmgMul += 0.45; res.tags.push('⭐三元素共鸣');
    }
  }
  res.tags = res.tags.filter(function(v, i, a){ return a.indexOf(v) === i; });""", '三元素共鸣')

# ③ 图鉴共鸣页补上新组合
rep("""  ['攻击塔 + 📡', '增幅场', '相邻辅助塔提供：伤害 +20%、射程 +10%']
];""",
"""  ['攻击塔 + 📡', '增幅场', '相邻辅助塔提供：伤害 +20%、射程 +10%'],
  /* ===== v8.15 补全的两两组合 ===== */
  ['🔥 + 🎯', '燃烧狙击', '伤害 +55%，命中附加持续燃烧'],
  ['❄️ + 🎯', '冻结狙击', '暴击率 +20%，命中附加冻结'],
  ['❄️ + ☠️', '霜毒', '中毒伤害 ×1.6，并附带减速'],
  ['⚡ + ☠️', '电弧腐蚀', '伤害 +35%，中毒伤害 ×1.7'],
  ['⚡ + 💥', '电磁爆炸', '溅射范围 ×1.35，伤害 +30%'],
  ['☠️ + 🎯', '毒狙', '伤害 +45%，中毒伤害 ×2'],
  ['🔨 + 💥', '破片重锤', '溅射范围 ×1.3，对有甲目标 ×1.5'],
  ['🎯 + 💥', '抛射狙击', '射程 +30%，溅射范围 ×1.25'],
  /* ===== v8.15 三元素共鸣（L 形相邻的三座不同元素塔，比两两更强）===== */
  ['🔥+❄️+⚡', '⭐元素风暴', '伤害 +90%、攻速 +30%、减速强度 ×2.5'],
  ['🔥+☠️+💥', '⭐燃烧大地', '溅射范围 ×1.4，区域内持续燃烧 + 中毒'],
  ['🔨+⚡+💥', '⭐电磁风暴', '无视全部护甲，伤害 +50%，溅射范围 ×1.4'],
  ['🔥+❄️+💥', '⭐冰火爆裂', '溅射范围 ×1.6，区域内敌人减速'],
  ['❄️+🔨+🎯', '⭐破冰穿甲', '无视护甲 + 冻结 + 暴击率 +25%'],
  ['🔥+🔨+🎯', '⭐熔金狙击', '对有甲目标 ×1.6，暴击率 +20%'],
  ['☠️+⚡+🎯', '⭐腐蚀雷狙', '无视护甲，中毒伤害 ×2'],
  ['❄️+☠️+💥', '⭐霜毒轰炸', '溅射范围内中毒 + 减速'],
  ['🔥+❄️+🎯', '⭐冰火狙击', '伤害 +60%，冻结 + 暴击率 +15%'],
  ['🔥+☠️+🎯', '⭐毒火狙击', '伤害 +35%，命中燃烧 + 中毒 ×1.8'],
  ['❄️+☠️+⚡', '⭐雷霜毒', '伤害 +40%，减速 ×2 + 中毒 ×1.7'],
  ['🔨+☠️+🎯', '⭐腐蚀穿甲', '无视护甲，中毒伤害 ×1.9'],
  ['任意三元素', '⭐三元素共鸣', '伤害 +45%（未列出的三元素组合保底收益）']
];""", '图鉴共鸣页补充')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.15 共鸣扩充补丁完成 ---')
