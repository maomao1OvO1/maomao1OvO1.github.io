#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.2 数值回调：怪物强度回落 + 金币经济放宽（毛毛：太肉 / 钱不够）
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        print('❌ [%s] 命中 %d 次' % (tag, n)); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ── ① 怪物：血量成长 0.30 → 0.24、基础血量回落（BOSS 降幅最大）──
sub("""  normal: { name:'步兵',   hp:80,  speed:1.05, gold:9,  color:'#7ea8d8', r:11 },
  fast:   { name:'疾行者', hp:56,  speed:2.05, gold:8,  color:'#7cf5c0', r:9 },
  armor:  { name:'装甲',   hp:220, speed:0.74, gold:15, color:'#c8a24a', r:13, armor:0.35 },
  shield: { name:'护盾',   hp:155, speed:1.05, gold:17, color:'#b48cff', r:12, immuneSlow:true },
  boss:   { name:'BOSS',   hp:1200, speed:0.60, gold:85, color:'#ff4d6d', r:18, boss:true, armor:0.2 }""",
"""  normal: { name:'步兵',   hp:72,  speed:1.05, gold:11,  color:'#7ea8d8', r:11 },
  fast:   { name:'疾行者', hp:50,  speed:2.00, gold:10,  color:'#7cf5c0', r:9 },
  armor:  { name:'装甲',   hp:195, speed:0.74, gold:18, color:'#c8a24a', r:13, armor:0.35 },
  shield: { name:'护盾',   hp:138, speed:1.02, gold:20, color:'#b48cff', r:12, immuneSlow:true },
  boss:   { name:'BOSS',   hp:1050, speed:0.60, gold:100, color:'#ff4d6d', r:18, boss:true, armor:0.2 }""", '怪物血量/掉落')

sub("  var mul = 1 + (wave - 1) * 0.30;",
    "  var mul = 1 + (wave - 1) * 0.24;", '血量成长 0.30→0.24')

# ── ② 波次数量：增长放缓（保留「快速怪第 2 波就来」的节奏）──
sub("""  add('normal', 5 + Math.floor(w * 1.15), 0.82);
  if (w >= 2) add('fast',   2 + Math.floor(w * 0.70), 0.60);""",
"""  add('normal', 5 + Math.floor(w * 1.00), 0.84);
  if (w >= 2) add('fast',   2 + Math.floor(w * 0.60), 0.62);""", '波次数量放缓')

# ── ③ 经济：初始金币回升、塔价下调 ──
sub("name:'1 · 直廊', waves:10, gold:135", "name:'1 · 直廊', waves:10, gold:165", 'L1 金币')
sub("name:'2 · 双弯', waves:12, gold:122", "name:'2 · 双弯', waves:12, gold:150", 'L2 金币')
sub("name:'3 · 回环', waves:14, gold:112", "name:'3 · 回环', waves:14, gold:138", 'L3 金币')
sub("name:'4 · 迷宫', waves:16, gold:100", "name:'4 · 迷宫', waves:16, gold:124", 'L4 金币')
sub("name:'5 · 螺旋', waves:18, gold:92",  "name:'5 · 螺旋', waves:18, gold:112", 'L5 金币')

sub("color:'#ff5a2a', cost:80,",  "color:'#ff5a2a', cost:72,",  '火塔 80→72')
sub("color:'#7fe4ff', cost:75,",  "color:'#7fe4ff', cost:68,",  '冰塔 75→68')
sub("color:'#ffd21a', cost:115,", "color:'#ffd21a', cost:100,", '雷塔 115→100')
sub("color:'#4fe060', cost:100,", "color:'#4fe060', cost:88,",  '毒塔 100→88')
sub("color:'#cfd8e8', cost:85,",  "color:'#cfd8e8', cost:78,",  '物理塔 85→78')
sub("color:'#b98cff', cost:95,",  "color:'#b98cff', cost:88,",  '辅助塔 95→88')

# ── ④ 波次奖励放宽 ──
sub("        var bonus = 20 + wave * 5; gold += bonus;",
    "        var bonus = 26 + wave * 7; gold += bonus;", '波次奖励 20+5w→26+7w')

io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a7_balance 完成 →', P)
