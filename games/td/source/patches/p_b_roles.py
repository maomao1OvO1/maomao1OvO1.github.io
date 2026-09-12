# -*- coding: utf-8 -*-
"""p_b_roles.py —— 《共鸣之塔》补丁 B：炮塔角色标签 UI（建塔面板 + 图鉴炮塔页）

用法：python3 patches/p_b_roles.py [target.html]
默认目标：../game.html（相对本脚本）

作用：
  ① 建塔面板 buildCard()：名称行下方、数值行上方插入「角色标签行」（全内联样式，不动 <style>）
     —— 左侧角色徽标（半透明色块 + 1px 描边），右侧「对单 ★★★★☆　对群 ★★☆☆☆」；
  ② 图鉴书页 bookTowerCard()：插入一行「角色：单体 · 对单 ★★★★☆ · 对群 ★☆☆☆☆」；
  ③ 新增只读辅助函数（roleTagOf / starTxtOf / roleRowHTML / roleBookLineHTML 等），
     不修改 ELEMS 任何既有条目与数值。

字段约定（由另一路写入，本补丁只读；**字段可能暂时不存在，一律兜底**）：
  d.role      角色中文（'单体'|'溅射'|'持续'|'链式'|'控场'|'光环'|'点杀'|'范围'）
  d.soloStar  1..5 对单强度星级
  d.groupStar 1..5 对群强度星级
  缺失 / 非数字 / 越界 → 显示「—」，绝不出现 undefined。

规则：
  * 每处「整段精确匹配」替换，匹配数 != 1 时打印标签并 sys.exit(1)，**不写回**；
  * 幂等：已含 ROLES_PATCH_V1 标记则直接跳过（exit 0）；
  * 纯 ES5（var / function），不含 let/const/箭头函数/模板字符串。
"""
import io
import os
import shutil
import sys

MARK = '/* ==== ROLES_PATCH_V1'

TARGET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'game.html')
TARGET = os.path.abspath(TARGET)
BAK = TARGET + '.pre_roles.bak'

src = io.open(TARGET, encoding='utf-8').read()

if MARK in src:
    print('跳过：%s 已包含 ROLES_PATCH_V1（幂等保护）' % os.path.basename(TARGET))
    sys.exit(0)

applied = []


def rep(tag, old, new):
    """整段精确替换；匹配数必须 == 1，否则报标签并退出（不写回任何文件）"""
    global src
    n = src.count(old)
    if n != 1:
        print('❌ 锚点不唯一：[%s] 匹配 %d 次（要求 1 次）——未写回任何文件' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new, 1)
    applied.append(tag)


# ---------------------------------------------------------------- ① 辅助函数（只读，新增不删改）（只读，新增不删改）
HELPERS = r"""/* ==== ROLES_PATCH_V1 : 炮塔角色标签（建塔面板 + 图鉴共用；字段缺失一律兜底为「—」，绝不出现 undefined）==== */
/* 本段只新增只读辅助函数，不触碰 ELEMS 任何条目与数值（role/soloStar/groupStar 由另一路写入） */
var ROLE_DASH = '\u2014';                       /* 字段缺失占位符 */
var ROLE_COLORS = {                             /* 角色 → 徽标取色（未知角色回落 #9fc4f0） */
  '单体': '#ffd76a', '溅射': '#ff9a5a', '持续': '#7cf5c0', '链式': '#8fe4ff',
  '控场': '#b98cff', '光环': '#8ff0ff', '点杀': '#ff7a9a', '范围': '#ffc06a'
};
function roleTagOf(k){
  var d = ELEMS[k];
  var r = d ? d.role : null;
  if (typeof r !== 'string') return ROLE_DASH;
  r = r.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  if (!r) return ROLE_DASH;
  return r.length > 4 ? r.substring(0, 4) : r;  /* 徽标最多 4 字：双列卡片窄，多了会换行 */
}
function roleColorOf(k){
  var c = ROLE_COLORS[roleTagOf(k)];
  return c || '#9fc4f0';
}
function roleBgOf(k){                           /* 由徽标色生成 16% 半透明底色 */
  var c = roleColorOf(k);
  if (c.charAt(0) === '#' && c.length === 7){
    return 'rgba(' + parseInt(c.substr(1, 2), 16) + ',' + parseInt(c.substr(3, 2), 16)
      + ',' + parseInt(c.substr(5, 2), 16) + ',0.16)';
  }
  return 'rgba(120,160,220,.18)';
}
function starValOf(v){                          /* 仅 1..5 的有限数字有效，其余返回 -1（→ 显示「—」） */
  if (typeof v !== 'number' || !isFinite(v)) return -1;
  v = Math.round(v);
  return (v < 1 || v > 5) ? -1 : v;
}
function starTxtOf(v, onColor){                 /* 5 格星级条：实心 ★ 用 onColor，空星 ☆ 用暗灰蓝 */
  var n = starValOf(v), i, h = '';
  if (n < 0) return '<span style="color:rgba(160,180,210,.35);">' + ROLE_DASH + '</span>';
  for (i = 0; i < 5; i++){
    h += '<span style="color:' + (i < n ? onColor : 'rgba(160,180,210,.35)') + ';">'
      + (i < n ? '\u2605' : '\u2606') + '</span>';
  }
  return h;
}
function roleRowHTML(k){                        /* 面板用：徽标 + 对单/对群星级，强制单行不撑高 */
  var d = ELEMS[k] || {};
  /* class="cr" 只是语义钩子；全部样式内联，不依赖 <style> 段（卡片网格/字号由主线调整） */
  return '<div class="cr" style="display:flex;align-items:center;gap:4px;margin-top:2px;font-size:10.5px;'
    + 'line-height:1.3;white-space:nowrap;overflow:hidden;">'
    + '<span style="flex:0 0 auto;font-size:10.5px;line-height:1.3;padding:0 5px;border-radius:6px;'
    + 'border:1px solid ' + roleColorOf(k) + ';background:' + roleBgOf(k) + ';color:' + roleColorOf(k) + ';">'
    + roleTagOf(k) + '</span>'
    + '<span style="font-size:10.5px;line-height:1.3;color:#9fc4f0;white-space:nowrap;overflow:hidden;">'
    + '对单 ' + starTxtOf(d.soloStar, '#ffd76a') + '\u3000对群 ' + starTxtOf(d.groupStar, '#8fe4ff')
    + '</span></div>';
}
function roleBookLineHTML(k){                   /* 图鉴用：与既有行同字号同配色的「角色」行 */
  var d = ELEMS[k] || {};
  return '<div style="font-size:12.5px;color:#9fc4f0;">角色：'
    + '<b style="color:' + roleColorOf(k) + ';">' + roleTagOf(k) + '</b>'
    + ' · 对单 ' + starTxtOf(d.soloStar, '#ffd76a')
    + ' · 对群 ' + starTxtOf(d.groupStar, '#8fe4ff') + '</div>';
}

"""
rep('js: 角色/星级只读辅助函数段', "function buildCard(k){\n  var d = ELEMS[k], cost = towerCost(k), dis = gold < cost;",
    HELPERS + "function buildCard(k){\n  var d = ELEMS[k], cost = towerCost(k), dis = gold < cost;")


# ---------------------------------------------------------------- ② 建塔面板：名称行 → 角色行 → 数值行
OLD_CARD = ("    + '<span class=\"cp\">' + cost + ' 金</span></div>'\n"
            "    + '<div class=\"cs\">' + statLine(k, 1) + '</div>'")
NEW_CARD = ("    + '<span class=\"cp\">' + cost + ' 金</span></div>'\n"
            "    + roleRowHTML(k)\n"
            "    + '<div class=\"cs\">' + statLine(k, 1) + '</div>'")
rep('js: buildCard 插入角色标签行', OLD_CARD, NEW_CARD)


# ---------------------------------------------------------------- ③ 图鉴炮塔页：数值行下方插入角色行
OLD_BOOK = ("    + '<div style=\"font-size:12.5px;color:#9fc4f0;\">' + line2 + '</div>'\n"
            "    + '<div style=\"font-size:12.5px;color:#7cf5c0;\">特效：' + d.fx + '</div>'")
NEW_BOOK = ("    + '<div style=\"font-size:12.5px;color:#9fc4f0;\">' + line2 + '</div>'\n"
            "    + roleBookLineHTML(k)\n"
            "    + '<div style=\"font-size:12.5px;color:#7cf5c0;\">特效：' + d.fx + '</div>'")
rep('js: bookTowerCard 插入角色行', OLD_BOOK, NEW_BOOK)


# ---------------------------------------------------------------- 写回（全部锚点通过后才落盘）
if os.path.exists(TARGET):
    shutil.copyfile(TARGET, BAK)
io.open(TARGET, 'w', encoding='utf-8').write(src)
print('✅ p_b_roles 完成：%s（替换 %d 处）' % (os.path.basename(TARGET), len(applied)))
for t in applied:
    print('   ·', t)
print('   备份：%s' % os.path.basename(BAK))
