#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.4 无尽模式：基地血量随波次成长 + 每波回血（治「怪压着家打」一波掏空）
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 无尽模式：波次结束提升血上限并回血（普通关卡不受影响）
sub("""      waveActive = false; waveBreak = 2.2;
      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔
      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');""",
"""      waveActive = false; waveBreak = 2.2;
      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔
      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');
      /* 无尽模式：基地血量随波次成长（每 5 波 +5，上限 60）并每波回 2 血
         —— 否则后期怪海一起压到终点，一波就能把 20 血掏空 */
      if (endless){
        var capHP = 20 + Math.floor(wave / 5) * 5;
        if (capHP > 60) capHP = 60;
        if (capHP > MAXHP) MAXHP = capHP;
        if (hp < MAXHP){
          hp = Math.min(MAXHP, hp + 2);
          addFloat(W / 2, H * 0.52, '基地修复 +2（上限 ' + MAXHP + '）', '#7cf5c0');
        }
      }""", '无尽基地血量成长')

# ② 开新关卡/普通关卡一律把血上限复位（避免带着 60 上限进普通关）
sub("""  gold = LEVELS[i].gold; hp = MAXHP; wave = 1; kills = 0; built = 0;""",
    """  MAXHP = 20; hp = MAXHP; gold = LEVELS[i].gold; wave = 1; kills = 0; built = 0;""", 'MAXHP 复位')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a11_endless_hp 完成')
