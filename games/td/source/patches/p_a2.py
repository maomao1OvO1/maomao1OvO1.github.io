#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 共鸣之塔 A2 补丁：① 2 倍速按钮 ② 下一波预告 ③ 波次强化「跳过换金币」
# 用法：python3 p_a2.py [目标html]     默认目标 = game.html
import io, sys

DEFAULT = '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
P = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
src = io.open(P, encoding='utf-8').read()
hits = []

# 表情用码位显式写出（源码里 ❄️ 带 FE0F、⏸ 不带，避免整段匹配失败）
ICE_SNOW  = u'\u2744\ufe0f'   # ❄️
PAUSE_SYM = u'\u23f8'         # ⏸
FF        = u'\u23e9'         # ⏩
BOSS_WARN = u'\u26a0\ufe0f'   # ⚠️
SKIP_TEXT = u'\u8df3\u8fc7 \u00b7 \u76f4\u63a5\u62ff 150 \u91d1\u5e01'   # 跳过 · 直接拿 150 金币

def sub(old, new, tag):
    global src
    n = src.count(old)
    if n != 1:
        print('!! [%s] 精确整段命中 %d 次（期望 1），已中止' % (tag, n))
        print('   片段: ' + repr(old[:140]))
        sys.exit(1)
    assert src.count(old) == 1
    src = src.replace(old, new, 1)
    hits.append(tag)

# ============ ①-1 HTML：HUD 内加 #speedBtn，HUD 下方加 #waveInfo 固定栏 ============
old = ('    <button id="skillBtn" style="padding:6px 12px;border-radius:9px;'
       'border:1px solid rgba(255,180,90,.5);background:rgba(70,45,20,.9);'
       'color:#ffd08a;font-size:14px;font-weight:700;">' + ICE_SNOW + u' \u51b0\u51bb</button>\n'
       '    <button id="pauseBtn" style="padding:6px 12px;border-radius:9px;'
       'border:1px solid rgba(120,180,255,.4);background:rgba(30,48,84,.9);'
       'color:#dfe8f5;font-size:15px;">' + PAUSE_SYM + u'</button>\n'
       '    <div id="hpbar"><div id="hpfill"></div></div>\n'
       '  </div>\n'
       '  <div id="canvasWrap">')

new = ('    <button id="skillBtn" style="padding:6px 12px;border-radius:9px;'
       'border:1px solid rgba(255,180,90,.5);background:rgba(70,45,20,.9);'
       'color:#ffd08a;font-size:14px;font-weight:700;">' + ICE_SNOW + u' \u51b0\u51bb</button>\n'
       '    <button id="speedBtn" style="padding:6px 10px;border-radius:9px;'
       'border:1px solid rgba(140,240,180,.45);background:rgba(24,58,44,.9);'
       'color:#8ff0c0;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;">'
       + FF + u' 1x</button>\n'
       '    <button id="pauseBtn" style="padding:6px 12px;border-radius:9px;'
       'border:1px solid rgba(120,180,255,.4);background:rgba(30,48,84,.9);'
       'color:#dfe8f5;font-size:15px;">' + PAUSE_SYM + u'</button>\n'
       '    <div id="hpbar"><div id="hpfill"></div></div>\n'
       '  </div>\n'
       '  <div id="waveInfo" style="flex:0 0 auto;padding:4px 10px;font-size:11px;color:#8fb4dc;'
       'background:linear-gradient(180deg,rgba(12,18,34,.93),rgba(9,13,24,.8));'
       'border-bottom:1px solid rgba(90,140,220,.18);letter-spacing:.4px;'
       'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
       u'\u4e0b\u4e00\u6ce2\uff1a--</div>\n'
       '  <div id="canvasWrap">')
sub(old, new, 'HTML: HUD 加 #speedBtn + HUD 下方加 #waveInfo')

# ============ ②-1 波次：startWave() 刷新预告 + updateWaveInfo() 实现 ============
old = ('function startWave(){\n'
       '  spawnQueue = waveComp(wave);\n'
       '  waveActive = true; spawnTimer = 0;\n'
       "  document.getElementById('wave').textContent = wave;\n"
       u"  showBanner('\u7b2c ' + wave + ' \u6ce2');\n"
       '  SFX.wave();\n'
       '}')

new = ('function startWave(){\n'
       '  spawnQueue = waveComp(wave);\n'
       '  waveActive = true; spawnTimer = 0;\n'
       "  document.getElementById('wave').textContent = wave;\n"
       u"  showBanner('\u7b2c ' + wave + ' \u6ce2');\n"
       '  SFX.wave();\n'
       '  updateWaveInfo();\n'
       '}\n'
       u'/* \u4e0b\u4e00\u6ce2\u9884\u544a\uff1a\u628a waveComp(wave+1) \u7ffb\u6210\u4e2d\u6587\u540d\u5355 */\n'
       'function updateWaveInfo(){\n'
       "  var box = document.getElementById('waveInfo');\n"
       '  if (!box) return;\n'
       u"  if (wave >= WAVES_TOTAL){ box.textContent = '\u6700\u540e\u4e00\u6ce2 \u00b7 \u575a\u6301\u4f4f\uff01'; return; }\n"
       '  var comp = waveComp(wave + 1), parts = [], isBoss = false;\n'
       '  for (var i = 0; i < comp.length; i++){\n'
       '    var g = comp[i], d = ENEMIES[g.type];\n'
       u"    parts.push((d ? d.name : g.type) + '\u00d7' + g.n);\n"
       "    if (g.type === 'boss') isBoss = true;\n"
       '  }\n'
       "  box.textContent = (isBoss ? '" + BOSS_WARN + u" BOSS \u6ce2 \u00b7 ' : '')\n"
       u"    + '\u4e0b\u4e00\u6ce2\uff08' + (wave + 1) + '/' + WAVES_TOTAL + '\uff09\uff1a' + parts.join(' \u00b7 ');\n"
       '}')
sub(old, new, 'startWave(): 调 updateWaveInfo() + 新增 updateWaveInfo()')

# ============ ②-2 startLevel() 开局也刷新一次 ============
old = '  initAudio(); startWave(); updateHud();'
new = '  initAudio(); startWave(); updateHud(); updateWaveInfo();'
sub(old, new, 'startLevel(): 开局刷新下一波预告')

# ============ ①-2 倍速变量 + frame() 时间缩放（暂停/冻结不推进、切换不跳变） ============
old = ('var last = 0, running = false, paused = false, gameT = 0;\n'
       u'var menuPause = false;        // \u6253\u5f00\u5efa\u5854/\u5347\u7ea7\u9762\u677f\u65f6\u51bb\u7ed3\u6218\u573a\uff08\u602a\u4e0d\u52a8\uff09\n'
       'function frame(now){\n'
       '  requestAnimationFrame(frame);\n'
       '  if (!last) last = now;\n'
       '  var dt = Math.min((now - last) / 1000, 0.05);\n'
       '  last = now;')

new = ('var last = 0, running = false, paused = false, gameT = 0;\n'
       u'var speedMul = 1;             // \u500d\u901f\uff1a1 = \u6b63\u5e38\uff0c2 = 2 \u500d\u901f\uff08#speedBtn \u5207\u6362\uff09\n'
       u'var menuPause = false;        // \u6253\u5f00\u5efa\u5854/\u5347\u7ea7\u9762\u677f\u65f6\u51bb\u7ed3\u6218\u573a\uff08\u602a\u4e0d\u52a8\uff09\n'
       'function frame(now){\n'
       '  requestAnimationFrame(frame);\n'
       '  if (!last) last = now;\n'
       '  var raw = Math.min((now - last) / 1000, 0.05);\n'
       u'  var dt = raw * speedMul;                        // 2 \u500d\u901f\uff1a\u6574\u4f53\u65f6\u95f4\u7f29\u653e\n'
       u'  if (!running || paused || menuPause) dt = raw;  // \u6682\u505c/\u9762\u677f\u51bb\u7ed3\uff1a\u6218\u573a\u4e0d\u63a8\u8fdb\uff0c\u7279\u6548\u4e5f\u4e0d\u52a0\u901f\n'
       '  last = now;')
sub(old, new, 'frame(): speedMul 时间缩放（含暂停/冻结保护）')

# ============ ③-1 强化弹窗加「跳过」按钮（放在 #buffList 之外） ============
old = ('  <div id="buffList" style="display:flex;flex-direction:column;gap:9px;width:100%;max-width:330px;"></div>\n'
       '</div>\n'
       '<div class="ov hidden" id="levelsOv">')

new = ('  <div id="buffList" style="display:flex;flex-direction:column;gap:9px;width:100%;max-width:330px;"></div>\n'
       '  <button id="skipBuffBtn" style="margin-top:10px;padding:12px 24px;border-radius:42px;'
       'border:1px solid rgba(255,200,110,.45);'
       'background:linear-gradient(180deg,rgba(84,62,26,.92),rgba(52,38,14,.92));'
       'color:#ffd76a;font-size:14px;letter-spacing:2px;font-weight:700;'
       'box-shadow:0 0 18px rgba(255,180,60,.22);">' + SKIP_TEXT + u'</button>\n'
       '</div>\n'
       '<div class="ov hidden" id="levelsOv">')
sub(old, new, 'buffOv: 新增 #skipBuffBtn（#buffList 之外，保住 children[0]）')

# ============ ③-2 / ①-3 事件绑定区：倍速切换 + 跳过换金币 ============
old = "  on('resumeBtn', resumeGame);"
new = ("  on('speedBtn', function(){\n"
       '    speedMul = (speedMul === 2) ? 1 : 2;\n'
       "    var sb = document.getElementById('speedBtn');\n"
       "    if (sb) sb.textContent = (speedMul === 2) ? '" + FF + " 2x' : '" + FF + " 1x';\n"
       u"    last = 0;                                  // \u6e05\u6389\u4e0a\u4e00\u5e27\u65f6\u95f4\u6233\uff0c\u907f\u514d\u5207\u6362\u77ac\u95f4 dt \u8df3\u53d8\n"
       u"    showTip(speedMul === 2 ? '" + FF + u" 2 \u500d\u901f' : '" + FF + u" 1 \u500d\u901f');\n"
       '    SFX.click();\n'
       '  });\n'
       "  on('skipBuffBtn', function(){\n"
       "    if (document.getElementById('buffOv').classList.contains('hidden')) return;\n"
       '    gold += 150;\n'
       '    updateHud();\n'
       "    document.getElementById('buffOv').classList.add('hidden');\n"
       '    running = true; paused = false; last = 0;\n'
       '    SFX.coin();\n'
       u"    addFloat(W / 2, H * 0.4, '\u8df3\u8fc7\u5f3a\u5316  +150', '#ffd76a');\n"
       '  });\n'
       "  on('resumeBtn', resumeGame);")
sub(old, new, "on(): #speedBtn 切换 + #skipBuffBtn 跳过换金币")

io.open(P, 'w', encoding='utf-8').write(src)
print('OK p_a2: %d \u5904\u66ff\u6362 -> %s' % (len(hits), P))
for h in hits:
    print('   - ' + h)
