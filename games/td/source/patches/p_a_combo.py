#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
p_a_combo.py —— 《共鸣之塔》A 路补丁：连杀提示重做（右侧定位 + 五档配色 + 分级动画）

用法：
    python3 p_a_combo.py [目标 html]      # 缺省 = .../td/game.html

策略：
  · 每处替换均为「精确整段匹配」，匹配次数必须 == 1，否则报出标签并 sys.exit(1)，且不写回；
  · 先在内存里全部改完并通过校验，最后才落盘（失败绝不会留下半个文件）；
  · 幂等：已打过（含 drawComboBadge 标记）则提示后退出 0；
  · 落盘前把原文件备份为 <目标>.pre_a_combo.bak。
"""

import io
import os
import sys

TARGET_DEFAULT = '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
IDEMPOTENT_MARK = 'function drawComboBadge(){'

# ---------------------------------------------------------------- 补丁 1/5：连杀状态变量
OLD_VAR = "var comboCount = 0, comboT = 0, comboTxt = '', bgmT = 0;"
NEW_VAR = """var comboCount = 0, comboT = 0, comboTxt = '', bgmT = 0;
/* —— 连杀提示重做（A 路）状态：弹入/档位判定全靠 gameT 打时间戳，不新增任何计时器 —— */
var COMBO_T_MAX = 2.4;                       // 连杀提示存活基准秒数（与 killEnemy 保持一致）
var comboShown = -99;                        // 本次「弹入」起始的 gameT 时间戳（不是计时器）
var comboShownN = -1, comboShownTier = -1;   // 已处理过的连杀数 / 档位：用于判定弹入与切档时机"""

# ---------------------------------------------------------------- 补丁 2/5：每次击杀——切档音效
OLD_KILL_INC = "  comboCount++; comboT = 2.2;"
NEW_KILL_INC = """  var comboPrevTier = comboTier(comboCount);
  comboCount++; comboT = 2.2;
  var comboNowTier = comboTier(comboCount);
  /* 档位切换（3 连首次出现 / 5 / 10 / 20 / 40）：播该档专属音效，与 SFX.kill / SFX.combo 叠加 */
  if (comboNowTier !== comboPrevTier || comboCount === 3) comboTierSfx(comboNowTier);"""

# ---------------------------------------------------------------- 补丁 3/5：里程碑飘字（保留 addFloat + SFX.combo）
OLD_MILESTONE = """  if (comboCount === 5 || comboCount === 10 || comboCount === 20 || comboCount % 25 === 0){
    comboTxt = '连杀 ×' + comboCount; comboT = 2.4;
    addFloat(W/2, H*0.3, comboTxt, '#ff9a4a');
    SFX.combo(comboCount);
  }"""
NEW_MILESTONE = """  if (comboCount === 5 || comboCount === 10 || comboCount === 20 || comboCount % 25 === 0){
    comboTxt = '连杀 ×' + comboCount; comboT = COMBO_T_MAX;
    addFloat(W/2, H*0.3, comboTxt, comboColor(comboCount));   // 飘字行为保留，颜色跟随连杀档位
    SFX.combo(comboCount);                                    // 原音效保留（切档音效另行叠加）
  }"""

# ---------------------------------------------------------------- 补丁 4/5：插入实现块（draw 之前）
HELPERS = """/* ================= 连杀提示重做（A 路）：右侧定位 + 五档配色 + 分级动画 =================
   档位：0 = 3~4 连 | 1 = 5~9 连 | 2 = 10~19 连 | 3 = 20~39 连 | 4 = 40+ 连
   动画全部只由 gameT / comboT 驱动（comboShown 只是 gameT 时间戳，不是新计时器）；
   颜色 / 后缀表均为静态数组，绘制时零对象分配、零图片资源，纯 ctx 绘制。               */
function comboTier(n){
  if (n >= 40) return 4;
  if (n >= 20) return 3;
  if (n >= 10) return 2;
  if (n >= 5) return 1;
  return 0;
}
var COMBO_FILL    = ['#8fe4ff', '#ffb24a', '#ff6a4a', '#ff5ad0', '#ffffff'];   // 五档主色（40+ = 白热芯）
var COMBO_EDGE    = ['rgba(143,228,255,.55)', 'rgba(255,178,74,.62)',
                     'rgba(255,106,74,.85)', 'rgba(255,90,208,.82)', 'rgba(255,255,255,.92)'];
var COMBO_GLOW    = ['rgba(90,190,255,.9)', 'rgba(255,170,60,.9)',
                     'rgba(255,90,60,.95)', 'rgba(255,70,200,.95)', 'rgba(255,238,214,1)'];
var COMBO_TAG     = ['', ' \\u2726', ' \\u26a1', ' \\ud83d\\udd25', ' \\ud83d\\udd25\\ud83d\\udd25'];   // 档位后缀（不改汉字部分）
var COMBO_RAINBOW = ['#ff4d4d', '#ffb24a', '#ffe94a', '#5aff9a', '#4ad4ff', '#b06aff'];       // 40+ 彩虹外圈
function comboColor(n){ return COMBO_FILL[comboTier(n)]; }
function comboTierSfx(t){          // 五档切换音效：音高/质感逐档递进（复用 tone / chord，音量克制）
  if (t <= 0){ tone({ freq:1180, dur:0.07, vol:0.032, type:'triangle' }); return; }
  if (t === 1){ tone({ freq:1397, dur:0.08, vol:0.036, type:'square' }); return; }
  if (t === 2){ chord([1046, 1568], 0.11, 0.042, 'square'); return; }
  if (t === 3){ chord([1175, 1760], 0.13, 0.046, 'square'); noiseSfx(0.10, 0.028, 4200); return; }
  chord([1568, 2093, 2637], 0.16, 0.048, 'triangle'); noiseSfx(0.16, 0.036, 5200);
}
function comboPopScale(age){       // 弹入缓动：0.6 倍弹到 1.15 再回 1.0（总时长 0.34 秒）
  if (age < 0) age = 0;
  if (age >= 0.34) return 1;
  var p = age / 0.34;
  if (p < 0.62){ var q = 1 - Math.pow(1 - p / 0.62, 3); return 0.6 + 0.55 * q; }
  var q2 = 1 - Math.pow(1 - (p - 0.62) / 0.38, 2);
  return 1.15 - 0.15 * q2;
}
function drawComboBadge(){
  if (!(comboT > 0 && comboCount >= 3)) return;
  var tier = comboTier(comboCount);
  /* 弹入时机：连杀提示首次出现（3 连）或档位提升（5 / 10 / 20 / 40）——只打 gameT 时间戳 */
  if (comboCount !== comboShownN){
    comboShownN = comboCount;
    if (comboCount === 3 || tier !== comboShownTier){ comboShown = gameT; comboShownTier = tier; }
  }
  var sc = comboPopScale(gameT - comboShown);
  /* 分级动画：3~9 上下浮动 / 10~19 加左右抖动 + 粗描边 / 20~39 加脉冲 + 旋转 / 40+ 再加彩虹光环 */
  var fly = Math.sin(gameT * 3.4) * (H * 0.008);
  var shx = tier >= 2 ? Math.sin(gameT * 26) * (W * 0.004) : 0;
  if (tier >= 3) sc *= 1 + Math.sin(gameT * 5.2) * 0.06;      // 脉冲 ±6%
  var rot = tier >= 3 ? Math.sin(gameT * 2.6) * 0.052 : 0;     // 旋转 ±3°（0.052 rad）
  /* 定位：右对齐（x = 文字右边缘 = 画布右缘内缩 W*0.04），每档右移 + 上移，越连越往外炸 */
  var rx = W * 0.96 + tier * (W * 0.005) + shx;
  if (rx > W * 0.995) rx = W * 0.995;
  var ry = H * 0.18 - tier * (H * 0.02) + fly;
  if (ry < H * 0.09) ry = H * 0.09;
  var fz = W * 0.058 * (1 + tier * 0.05) * sc;
  var txt = '连杀 ×' + comboCount + COMBO_TAG[tier];
  var alp = Math.min(1, comboT / 0.6) * 0.78;   // 半透明（发光+描边保证可读）：不糊住右侧塔位可点区域
  ctx.save();
  ctx.globalAlpha = alp;
  ctx.textAlign = 'right';         // 关键：右对齐，fillText 的 x 即文字右边缘（不再用 W/2 居中）
  ctx.lineJoin = 'round';
  ctx.translate(rx, ry);
  if (rot !== 0) ctx.rotate(rot);
  ctx.font = 'bold ' + fz + 'px sans-serif';
  var tw = ctx.measureText(txt).width;
  var ccx = -tw * 0.5, ccy = -fz * 0.34;
  if (tier >= 4){                  // 40+：扩散光环——半径随存活时间增长、透明度衰减
    var hAge = COMBO_T_MAX - comboT; if (hAge < 0) hAge = 0;
    var h0 = (hAge % 1.1) / 1.1;
    for (var hi = 0; hi < 3; hi++){
      var ph = (h0 + hi * 0.333) % 1;
      ctx.globalAlpha = alp * (1 - ph) * 0.55;
      ctx.strokeStyle = COMBO_RAINBOW[hi * 2];
      ctx.lineWidth = 1.5 + (1 - ph) * 2;
      ctx.beginPath(); ctx.arc(ccx, ccy, fz * 0.85 + ph * fz * 1.5, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = alp;
    ctx.lineWidth = 1.6;           // 白热芯 + 彩虹描边
    for (var ri = 0; ri < COMBO_RAINBOW.length; ri++){
      ctx.strokeStyle = COMBO_RAINBOW[ri];
      ctx.strokeText(txt, ri - 2.5, 0);
    }
  } else {
    ctx.lineWidth = tier >= 3 ? 3.4 : (tier === 2 ? 2.4 : 1.4);   // 10~19 连起描边加粗
    ctx.strokeStyle = COMBO_EDGE[tier];
    ctx.strokeText(txt, 0, 0);
  }
  glow(COMBO_GLOW[tier], tier >= 3 ? 26 : 18);
  ctx.fillStyle = COMBO_FILL[tier];
  ctx.fillText(txt, 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}
function draw(){"""

# ---------------------------------------------------------------- 补丁 5/5：draw() 内连杀绘制块 → 调用新实现
OLD_DRAW = """  // 连杀提示
  if (comboT > 0 && comboCount >= 3){
    ctx.globalAlpha = Math.min(1, comboT / 0.6);
    ctx.fillStyle = '#ff9a4a'; ctx.font = 'bold ' + (W*0.075) + 'px sans-serif'; ctx.textAlign = 'center';
    glow('rgba(255,140,60,.9)', 20);
    ctx.fillText('连杀 ×' + comboCount, W/2, H*0.22);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }"""
NEW_DRAW = """  // 连杀提示：右侧右对齐 + 五档配色 + 分级动画（实现见 drawComboBadge，不再居中压在 W/2 挡战场）
  drawComboBadge();"""

REPLACEMENTS = [
    ('A-COMBO/1-var',       OLD_VAR,       NEW_VAR),
    ('A-COMBO/2-killinc',   OLD_KILL_INC,  NEW_KILL_INC),
    ('A-COMBO/3-milestone', OLD_MILESTONE, NEW_MILESTONE),
    ('A-COMBO/4-helpers',   'function draw(){', HELPERS),
    ('A-COMBO/5-drawblock', OLD_DRAW,      NEW_DRAW),
]


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else TARGET_DEFAULT
    if not os.path.isfile(path):
        sys.stderr.write('[A-COMBO] 目标不存在：%s\n' % path)
        sys.exit(1)
    src = io.open(path, encoding='utf-8').read()

    # ---- 幂等保护 ----
    if IDEMPOTENT_MARK in src:
        sys.stderr.write('[A-COMBO] 已打过补丁（找到 %s），无需重复应用。\n' % IDEMPOTENT_MARK)
        sys.exit(0)

    # ---- 逐处精确整段替换：先全部校验，再统一落地（失败不写回）----
    out = src
    for tag, old, new in REPLACEMENTS:
        n = out.count(old)
        if n != 1:
            sys.stderr.write('[%s] 匹配 %d 次（期望恰好 1 次）——文件可能已被改动，未写回任何内容。\n'
                             % (tag, n))
            sys.exit(1)
        out = out.replace(old, new, 1)
        sys.stderr.write('[%s] 已替换 1 处\n' % tag)

    # ---- 落地前自检：关键标记齐全 ----
    for mark in ('function comboTier(n){', 'function drawComboBadge(){', 'drawComboBadge();',
                 'comboTierSfx(comboNowTier)', 'addFloat(W/2, H*0.3, comboTxt, comboColor(comboCount))'):
        if mark not in out:
            sys.stderr.write('[A-COMBO/verify] 自检失败，缺少标记：%s —— 未写回。\n' % mark)
            sys.exit(1)
    if out.count('drawComboBadge();') != 1:
        sys.stderr.write('[A-COMBO/verify] draw() 中调用点数量异常 —— 未写回。\n')
        sys.exit(1)

    bak = path + '.pre_a_combo.bak'
    io.open(bak, 'w', encoding='utf-8').write(src)
    io.open(path, 'w', encoding='utf-8').write(out)
    sys.stderr.write('[A-COMBO] 完成：5 处替换已写入 %s（原文件备份 %s，%d -> %d 字符）\n'
                     % (path, bak, len(src), len(out)))


if __name__ == '__main__':
    main()
