#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.2 经济系统：动态造价（每多建一座塔，下一座更贵）—— 让塔数自然收敛，杜绝「后期堆塔挂机」
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
R = [
 # ① 动态造价函数
 ("function addTower(c, r, elem){\n  var def = ELEMS[elem];\n  if (gold < def.cost) return false;\n  gold -= def.cost; built++;",
  "/* 动态造价：场上塔越多，下一座越贵（每座 +5.5%）\n"
  "   —— 目的：让玩家在中后期转向「升级 / 精选位置 / 元素共鸣」，而不是无脑铺塔挂机 */\n"
  "function towerCost(elem){\n"
  "  var base = ELEMS[elem].cost;\n"
  "  return Math.round(base * (1 + towers.length * 0.055));\n"
  "}\n"
  "function addTower(c, r, elem){\n"
  "  var def = ELEMS[elem];\n"
  "  var cost = towerCost(elem);\n"
  "  if (gold < cost) return false;\n"
  "  gold -= cost; built++;", '动态造价 + addTower 扣费'),
 ("  var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME };",
  "  var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME, paid: cost };",
  '塔对象记录实付'),
 # ② 升级 / 出售 以「实付价」为基数，避免玩家吃亏
 ("function upgradeCost(t){ var d = ELEMS[t.elem]; return Math.round(d.cost * (0.7 + t.lv * 0.55)); }",
  "function upgradeCost(t){ var d = ELEMS[t.elem], base = t.paid || d.cost; return Math.round(base * (0.7 + t.lv * 0.55)); }",
  '升级费按实付价'),
 ("function sellValue(t){\n  var d = ELEMS[t.elem], spent = d.cost;\n  for (var i = 1; i < t.lv; i++) spent += Math.round(d.cost * (0.7 + i * 0.55));\n  return Math.round(spent * 0.6);\n}",
  "function sellValue(t){\n  var d = ELEMS[t.elem], base = t.paid || d.cost, spent = base;\n  for (var i = 1; i < t.lv; i++) spent += Math.round(base * (0.7 + i * 0.55));\n  return Math.round(spent * 0.6);\n}",
  '出售按实付价'),
 # ③ 面板显示实时价格
 ("  var d = ELEMS[k], dis = gold < d.cost;",
  "  var d = ELEMS[k], cost = towerCost(k), dis = gold < cost;", '面板取动态价')
]
for old, new, tag in R:
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
for old, new, tag in R:
    s = s.replace(old, new); print('  [OK]', tag)

# ④ 面板上把价格显示成动态值（buildCard 里用的是 d.cost）
s2 = s.replace("    + '<div class=\"ch\"><span class=\"ci\">' + d.icon + '</span><span>' + d.name + '塔</span>'\n    + '<span class=\"cp\">' + d.cost + ' 金</span></div>'",
               "    + '<div class=\"ch\"><span class=\"ci\">' + d.icon + '</span><span>' + d.name + '塔</span>'\n    + '<span class=\"cp\">' + cost + ' 金</span></div>'")
assert s2 != s, 'buildCard 价格显示未替换'
s = s2; print('  [OK] 面板价格用动态值')

# ⑤ 悔棋退款按实付价
s3 = s.replace("var fBack = ELEMS[t4.elem].cost;", "var fBack = t4.paid || ELEMS[t4.elem].cost;")
s3 = s3.replace("+ '<span style=\"color:#ffe6a6\">+' + d.cost + '</span>", "+ '<span style=\"color:#ffe6a6\">+' + (t.paid || d.cost) + '</span>")
assert s3 != s, '悔棋退款未替换'
s = s3; print('  [OK] 悔棋退款/按钮金额按实付价')

io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a9_economy 完成')
