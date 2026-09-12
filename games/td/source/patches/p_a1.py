#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《共鸣之塔》补丁 p_a1.py  —— A1 路（射程预览 / 低画质开关 / 高刷动画修正）

覆盖三块：
  ① 射程圈预览：建塔面板→候选格中心、升级面板→该塔位置，画半透明填充+虚线描边+轻微脉冲的射程圈；
     建塔时另外 5 种塔的射程用细虚线叠出来，可直观比较 6 种塔射程差异；hideSel() 清空。
     层级：路径之后、塔与敌人之前（不遮挡塔/怪）。
  ② 低画质开关：新增 var LOWFX / function setLowFX(v) / function glow(color, blur)，
     draw()（含 drawTowerBody）里成对的 shadowColor+shadowBlur 全部改为 glow(颜色, 数字)。
  ③ 高刷新率动画过快修正：新增 var frameDt（frame() 每帧写真实 dt，初值 0.016 兜底），
     draw() 里塔的 buildT/flash、敌人的 spawnT 三处写死 0.016 改用 frameDt。

用法：
  python3 patches/p_a1.py                                   # 默认打正式文件（常量 GAME）
  TD_PATCH_TARGET=/path/to/work/a1.html python3 patches/p_a1.py   # 仅在副本上做验证时用

每处替换都要求「精确整段 + 全文唯一（count==1）」，不唯一/找不到就打印标签与匹配数并 exit(1)。
"""
import io
import os
import sys

# 默认目标 = 正式文件（主线直接跑就是打正式文件）
GAME = '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
TARGET = os.environ.get('TD_PATCH_TARGET', GAME)

# ---------------------------------------------------------------- ① 全局块
GLOBALS_OLD = "function cy(r){ return OY + r * CELL + CELL/2; }\n"

GLOBALS_NEW = """function cy(r){ return OY + r * CELL + CELL/2; }

/* ================= 全局开关 / 工具（A1 路） ================= */
var LOWFX = false;                          // 低画质模式：关闭所有发光（shadowBlur），低端机提帧
function setLowFX(v){ LOWFX = !!v; }        // 设置面板只调这一个接口
function glow(color, blur){                 // 统一发光设置：低画质时 blur 归零（语义等价于不开发光）
  ctx.shadowColor = color;
  ctx.shadowBlur = LOWFX ? 0 : blur;
}
var frameDt = 0.016;   // 真实帧间隔（秒）：frame() 每帧写入；draw() 读取（测试台可能先调 draw，故给默认值）

/* —— 射程圈预览状态：建塔/升级面板打开时点亮，hideSel() 清空 —— */
var pvOn = false, pvC = -1, pvR = -1, pvElem = '', pvTower = null, pvLastElem = 'fire';
var pvT = 0;    // 预览专用计时：面板打开时战场冻结（gameT 不动），但射程圈仍要呼吸/流动
function pvAt(c, r, elem, tower){           // 预览目标：建塔=空格(c,r)，升级=已有塔
  pvOn = true; pvC = c; pvR = r; pvElem = elem || ''; pvTower = tower || null;
}
function pvClear(){ pvOn = false; pvC = -1; pvR = -1; pvElem = ''; pvTower = null; }
function pvRGBA(hex, a){                    // #rrggbb → rgba(...)：用于半透明填充
  var h = String(hex).replace('#', '');
  if (h.length === 3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
  var n = parseInt(h, 16) || 0;
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function pvRangePx(elem, tower){            // 射程像素：与 statAt 口径一致（等级/共鸣/BUFFS.range）
  if (tower) return statAt(tower, tower.lv).range * CELL;
  return ELEMS[elem].range * (BUFFS.range || 1) * CELL;
}
function pvRing(x, y, rad, color, alpha, lw, fill){
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3);
  if (fill){ ctx.fillStyle = pvRGBA(color, 0.13); ctx.fill(); }
  ctx.setLineDash([CELL * 0.20, CELL * 0.16]);
  ctx.lineDashOffset = -(pvT * CELL * 0.5) % (CELL * 0.36);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}
"""

# ---------------------------------------------------------------- ② hideSel 清空预览
HIDESEL_OLD = "function hideSel(){ sel.style.display = 'none'; menuPause = false; }"
HIDESEL_NEW = "function hideSel(){ sel.style.display = 'none'; menuPause = false; pvClear(); }"

# ---------------------------------------------------------------- ③ draw() 里插射程圈（路径后 / 塔前）
DRAW_OLD = """  ctx.fillText('基地', s1.x, s1.y + CELL*0.12);

  // 共鸣连线
"""

DRAW_NEW = """  ctx.fillText('基地', s1.x, s1.y + CELL*0.12);

  // 射程圈预览（画在路径之上、塔与敌人之下：既看得清范围，又不遮挡塔和怪）
  if (pvOn){
    var pvx = cx(pvC), pvy = cy(pvR);
    var pvPulse = 1 + Math.sin(pvT * 3.2) * 0.035;          // 轻微脉冲（pvT：面板打开时也继续呼吸）
    var pvMain = ELEMS[pvElem] ? pvElem : pvLastElem;
    if (!ELEMS[pvMain]) pvMain = 'fire';
    // 建塔时把其余 5 种塔的射程用细虚线叠出来 → 一眼比较射程差异（不填充，避免糊成一片）
    if (!pvTower){
      var pvKeys = ['fire','ice','thunder','poison','phys','support'];
      for (var pk = 0; pk < pvKeys.length; pk++){
        if (pvKeys[pk] === pvMain) continue;
        pvRing(pvx, pvy, pvRangePx(pvKeys[pk], null) * pvPulse, ELEMS[pvKeys[pk]].color, 0.30, 1.1, false);
      }
    }
    // 主射程圈：半透明填充 + 虚线描边
    var pvRad = pvRangePx(pvMain, pvTower) * pvPulse;
    pvRing(pvx, pvy, pvRad, ELEMS[pvMain].color, 1, 2.2, true);
    // 候选格/该塔所在格高亮
    ctx.save();
    ctx.strokeStyle = pvRGBA(ELEMS[pvMain].color, 0.85); ctx.lineWidth = 2;
    roundRect(OX + pvC * CELL + 2, OY + pvR * CELL + 2, CELL - 4, CELL - 4, CELL * 0.14);
    ctx.stroke();
    ctx.restore();
    // 射程数值（压不住屏幕时下压到格子附近）
    ctx.save();
    ctx.fillStyle = ELEMS[pvMain].color;
    ctx.font = 'bold ' + (CELL*0.26) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(ELEMS[pvMain].icon + ' 射程 ' + (pvRangePx(pvMain, pvTower) / CELL).toFixed(1) + ' 格',
                 pvx, Math.max(CELL * 0.30, pvy - pvRad - CELL * 0.14));
    ctx.restore();
  }

  // 共鸣连线
"""

# ---------------------------------------------------------------- ④ 发光：成对 shadowColor+shadowBlur → glow()
GLOWS = [
    ('塔身发光(drawTowerBody)',
     "  ctx.shadowBlur = 16; ctx.shadowColor = color;",
     "  glow(color, 16);"),
    ('路径能量带发光',
     "  ctx.shadowBlur = 14; ctx.shadowColor = '#5ad7ff';",
     "  glow('#5ad7ff', 14);"),
    ('基地圈发光',
     "  ctx.shadowBlur = 18; ctx.shadowColor = '#ff5a78';",
     "  glow('#ff5a78', 18);"),
    ('共鸣连线发光',
     "      ctx.shadowBlur = 22; ctx.shadowColor = same ? '#ffd76a' : '#78f0ff';",
     "      glow(same ? '#ffd76a' : '#78f0ff', 22);"),
    ('开炮闪光发光',
     "      ctx.shadowBlur = 18; ctx.shadowColor = def.color;",
     "      glow(def.color, 18);"),
    ('共鸣光环脉冲发光',
     "      ctx.shadowBlur = 16; ctx.shadowColor = '#78f0ff';",
     "      glow('#78f0ff', 16);"),
    ('BOSS 发光',
     "    if (e.boss){ ctx.shadowBlur = 22; ctx.shadowColor = e.color; }",
     "    if (e.boss){ glow(e.color, 22); }"),
    ('光束发光',
     "    ctx.shadowBlur = 14; ctx.shadowColor = b.color;",
     "    glow(b.color, 14);"),
    ('金币飞行发光',
     "    ctx.fillStyle = '#ffd76a'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffcf4a';",
     "    ctx.fillStyle = '#ffd76a'; glow('#ffcf4a', 10);"),
    ('连杀提示发光',
     "    ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(255,140,60,.9)';",
     "    glow('rgba(255,140,60,.9)', 20);"),
    ('波次横幅发光',
     "    ctx.shadowBlur = 24; ctx.shadowColor = 'rgba(90,200,255,.9)';",
     "    glow('rgba(90,200,255,.9)', 24);"),
]

# ---------------------------------------------------------------- ⑤ 高刷动画：写死 0.016 → frameDt
FRAMEDT = [
    ('塔建造弹出用真实帧间隔',
     "    if (tw.buildT > 0) tw.buildT -= 0.016;",
     "    if (tw.buildT > 0) tw.buildT -= frameDt;"),
    ('塔开炮闪光用真实帧间隔',
     "    if (tw.flash > 0) tw.flash -= 0.016;",
     "    if (tw.flash > 0) tw.flash -= frameDt;"),
    ('敌人出生弹出用真实帧间隔',
     "    if (e.spawnT > 0) e.spawnT -= 0.016;",
     "    if (e.spawnT > 0) e.spawnT -= frameDt;"),
    ('frame() 写入真实帧间隔',
     """  var raw = Math.min((now - last) / 1000, 0.05);
  var dt = raw * speedMul;                        // 2 倍速：整体时间缩放
  if (!running || paused || menuPause) dt = raw;  // 暂停/面板冻结：战场不推进，特效也不加速
  last = now;
""",
     """  var raw = Math.min((now - last) / 1000, 0.05);
  var dt = raw * speedMul;                        // 2 倍速：整体时间缩放
  if (!running || paused || menuPause) dt = raw;  // 暂停/面板冻结：战场不推进，特效也不加速
  last = now;
  frameDt = dt;   // 真实帧间隔交给 draw()：120Hz 屏上建造弹出/开炮闪光/出生弹出不再快一倍
"""),
]

# ---------------------------------------------------------------- ⑦b 预览计时推进（面板打开时战场冻结，gameT 不动）
PVT_OLD = "  if (shakeT > 0) shakeT -= dt;\n"
PVT_NEW = ("  if (shakeT > 0) shakeT -= dt;\n"
           "  pvT += dt;   // 射程圈预览计时：面板打开时 gameT 冻结，脉冲/虚线流动仍要继续\n")

# ---------------------------------------------------------------- ⑥ 面板包装器：设置预览目标 + 卡牌划动切换元素
MENUS_OLD = """(function patchMenus(){
  var ob = openBuild, ot = openTower;
  openBuild = function(c, r, px, py){ sel.dataset.c = c; sel.dataset.r = r; menuPause = true; ob(c, r, px, py); placeMenu(px, py); };
  openTower = function(t, px, py){ sel._tower = t; menuPause = true; ot(t, px, py); placeMenu(px, py); };
})();
"""

MENUS_NEW = """(function patchMenus(){
  var ob = openBuild, ot = openTower;
  openBuild = function(c, r, px, py){
    sel.dataset.c = c; sel.dataset.r = r; menuPause = true;
    pvAt(c, r, pvLastElem, null);            // 建塔面板：候选格中心亮射程圈（默认沿用上次建的塔型）
    ob(c, r, px, py); placeMenu(px, py);
  };
  openTower = function(t, px, py){
    sel._tower = t; menuPause = true;
    pvAt(t.c, t.r, t.elem, t);               // 升级面板：该塔位置亮射程圈（按当前等级/共鸣算）
    ot(t, px, py); placeMenu(px, py);
  };
})();
// 面板里划动/悬停卡牌 → 切换预览元素，直观比较 6 种塔的射程差异
function pvFocusFrom(ev){
  var el = ev && ev.target;
  var b = (el && el.closest) ? el.closest('button[data-mk]') : null;
  if (b && b.dataset && b.dataset.mk){ pvElem = b.dataset.mk; pvLastElem = pvElem; }
}
sel.addEventListener('pointerover', pvFocusFrom);
sel.addEventListener('pointermove', pvFocusFrom);
"""

# ---------------------------------------------------------------- ⑦ 建塔成功后记住塔型（下次预览默认它）
BUILD_OLD = """    if (!addTower(cm, rm, b.dataset.mk)) showTip('金币不足');
    else showTip('已建造 · 相邻不同元素会共鸣');"""

BUILD_NEW = """    if (!addTower(cm, rm, b.dataset.mk)) showTip('金币不足');
    else { pvLastElem = b.dataset.mk; showTip('已建造 · 相邻不同元素会共鸣'); }"""


def build_reps():
    reps = [('① 全局块：LOWFX/setLowFX/glow/frameDt/射程预览状态', GLOBALS_OLD, GLOBALS_NEW)]
    reps.append(('② hideSel 清空射程预览', HIDESEL_OLD, HIDESEL_NEW))
    reps.append(('③ draw() 插入射程圈绘制块（路径后/塔前）', DRAW_OLD, DRAW_NEW))
    for label, old, new in GLOWS:
        reps.append(('④ 发光统一 glow()：' + label, old, new))
    for label, old, new in FRAMEDT:
        reps.append(('⑤ ' + label, old, new))
    reps.append(('⑤b 预览计时 pvT 每帧推进', PVT_OLD, PVT_NEW))
    reps.append(('⑥ patchMenus 包装器设置预览目标 + 卡牌划动切换', MENUS_OLD, MENUS_NEW))
    reps.append(('⑦ 建塔后记住塔型 pvLastElem', BUILD_OLD, BUILD_NEW))
    return reps


def main():
    if not os.path.isfile(TARGET):
        print('❌ 目标文件不存在：' + TARGET)
        sys.exit(1)
    s = io.open(TARGET, encoding='utf-8').read()
    if 'function pvRing(' in s or 'function glow(' in s:
        print('⚠️ 目标文件看起来已经打过本补丁，未做任何修改：' + TARGET)
        sys.exit(1)

    reps = build_reps()
    done = []
    for label, old, new in reps:
        n = s.count(old)
        if n != 1:
            print('❌ 替换失败 [' + label + ']：全文匹配数 = %d（要求恰好 1）' % n)
            print('   待匹配片段：' + repr(old[:120]))
            sys.exit(1)
        s = s.replace(old, new)
        done.append(label)

    io.open(TARGET, 'w', encoding='utf-8').write(s)
    print('✅ 补丁已应用：' + TARGET)
    print('   共替换 %d 处：' % len(done))
    for i, label in enumerate(done, 1):
        print('   %2d. %s' % (i, label))


if __name__ == '__main__':
    main()
