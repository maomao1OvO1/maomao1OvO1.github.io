#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.4 出生护盾：怪刚出生 2.2 秒内受伤大减 —— 治「被压在出生点打」
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 敌人出生带护盾计时（BOSS 短一些，避免太肉）
sub("    slowT: 0, slowF: 1, dotT: 0, dotD: 0, hitFlash: 0, dir: 0, spawnT: 0.36, walk: Math.random()*6.28,",
    "    slowT: 0, slowF: 1, dotT: 0, dotD: 0, hitFlash: 0, dir: 0, spawnT: 0.36, walk: Math.random()*6.28,\n"
    "    shieldT: d.boss ? 1.2 : 2.2,   // 出生护盾：刚落地时受伤仅 25%，逼它走出起点区（治「被压在出生点打」）", '出生护盾字段')

# ② 护盾计时递减
sub("    if (e.hitFlash > 0) e.hitFlash -= dt;",
    "    if (e.hitFlash > 0) e.hitFlash -= dt;\n"
    "    if (e.shieldT > 0){ e.shieldT -= dt; if (e.shieldT < 0) e.shieldT = 0; }", '护盾计时')

# ③ 护盾期间减伤 75%
sub("  var dmg = st.dmg * armor * breakMul * comboMul * (crit ? 2.5 : 1);",
    "  var dmg = st.dmg * armor * breakMul * comboMul * (crit ? 2.5 : 1);\n"
    "  if (e.shieldT > 0) dmg *= 0.25;             // 出生护盾：减伤 75%", '护盾减伤')

# ④ 护罩视觉（画在新怪标记之前，任何怪通用）
sub("""    /* —— v5.5 新怪专属造型标记（沿用渐变球体+描边，不引入任何图片资源）—— */""",
"""    if (e.shieldT > 0){                            // 出生护罩：青色脉冲环
      ctx.strokeStyle = 'rgba(150,240,255,' + (0.35 + 0.35 * Math.abs(Math.sin(gameT * 7))) + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4 + Math.sin(gameT * 9) * 1.3, 0, 6.3); ctx.stroke();
    }
    /* —— v5.5 新怪专属造型标记（沿用渐变球体+描边，不引入任何图片资源）—— */""", '护罩绘制')

# ⑤ 连杀字号收一点，减少对右侧塔位的遮挡
sub("  var fz = W * 0.058 * (1 + tier * 0.05) * sc;",
    "  var fz = W * 0.050 * (1 + tier * 0.05) * sc;   // 字号收一点，少遮右侧塔位", '连杀字号')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_e_shield 完成')
