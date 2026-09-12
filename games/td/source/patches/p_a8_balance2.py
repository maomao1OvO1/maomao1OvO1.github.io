#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.2 数值精调 2：塔伤害 +10% / 怪强度回落 / 经济放松
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
R = [
 ("color:'#ff5a2a', cost:72,  dmg:16,", "color:'#ff5a2a', cost:72,  dmg:18,", '火 16→18'),
 ("color:'#7fe4ff', cost:68,  dmg:8,",  "color:'#7fe4ff', cost:68,  dmg:9,",  '冰 8→9'),
 ("color:'#ffd21a', cost:100, dmg:13,", "color:'#ffd21a', cost:100, dmg:15,", '雷 13→15'),
 ("color:'#4fe060', cost:88, dmg:6,",   "color:'#4fe060', cost:88, dmg:7,",   '毒 6→7'),
 ("color:'#cfd8e8', cost:78,  dmg:24,", "color:'#cfd8e8', cost:78,  dmg:27,", '物理 24→27'),
 ("  var mul = 1 + (wave - 1) * 0.36;", "  var mul = 1 + (wave - 1) * 0.30;", '血量成长 0.36→0.30'),
 ("(1 + Math.min(0.55, (wave - 1) * 0.028))", "(1 + Math.min(0.45, (wave - 1) * 0.022))", '速度成长回落'),
 ("waves:10, gold:140,", "waves:10, gold:165,", 'L1 金币 165'),
 ("waves:12, gold:128,", "waves:12, gold:150,", 'L2 金币 150'),
 ("waves:14, gold:118,", "waves:14, gold:138,", 'L3 金币 138'),
 ("waves:16, gold:106,", "waves:16, gold:124,", 'L4 金币 124'),
 ("waves:18, gold:96,",  "waves:18, gold:112,", 'L5 金币 112'),
 ("speed:1.05, gold:10,", "speed:1.05, gold:11,", '步兵掉落 11'),
 ("speed:2.00, gold:9,",  "speed:2.00, gold:10,", '疾行掉落 10'),
 ("speed:0.74, gold:16,", "speed:0.74, gold:18,", '装甲掉落 18'),
 ("speed:1.02, gold:18,", "speed:1.02, gold:20,", '护盾掉落 20'),
 ("        var bonus = 18 + wave * 4; gold += bonus;", "        var bonus = 22 + wave * 5; gold += bonus;", '波次奖励 22+5w'),
]
for old, new, tag in R:
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
for old, new, tag in R:
    s = s.replace(old, new); print('  [OK]', tag)
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a8_balance2 完成')
