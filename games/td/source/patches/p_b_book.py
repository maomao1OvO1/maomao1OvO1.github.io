# -*- coding: utf-8 -*-
"""p_b_book.py —— 《共鸣之塔》补丁 B：主界面图鉴系统（怪物图鉴 + 炮塔图鉴）

用法：python3 patches/p_b_book.py [target.html]
默认目标：game.html（同目录）

规则：
  * 每处「整段精确匹配」替换，匹配数 != 1 时打印标签并 sys.exit(1)，**不写回**；
  * 幂等：已含 BOOK_PATCH_V1 标记则直接跳过（exit 0），不重复插入；
  * 纯 ES5（var / function），不含 let/const/箭头函数/模板字符串。
"""
import io
import os
import sys

MARK = '/* ==== BOOK_PATCH_V1'

TARGET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game.html')
TARGET = os.path.abspath(TARGET)

src = io.open(TARGET, encoding='utf-8').read()

if MARK in src:
    print('跳过：%s 已包含 BOOK_PATCH_V1（幂等保护）' % os.path.basename(TARGET))
    sys.exit(0)

applied = []


def rep(tag, old, new):
    """整段精确替换；匹配数必须 == 1，否则报标签并退出（不写回）"""
    global src
    n = src.count(old)
    if n != 1:
        print('❌ 锚点不唯一：[%s] 匹配 %d 次（要求 1 次）——未写回任何文件' % (tag, n))
        sys.exit(1)
    src = src.replace(old, new, 1)
    applied.append(tag)


# ---------------------------------------------------------------- ① 首页入口按钮 + 图鉴弹窗
OLD_ENTRY = """  <button class="btn" id="setBtn1" style="margin-top:2px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">\u2699 \u8bbe\u7f6e</button>
</div>
<div class="ov hidden" id="pauseOv">"""

NEW_ENTRY = """  <button class="btn" id="setBtn1" style="margin-top:2px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">\u2699 \u8bbe\u7f6e</button>
  <button class="btn" id="bookBtn" style="margin-top:6px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">\U0001F4D6 \u56fe\u9274</button>
</div>
<div class="ov hidden" id="bookOv">
  <h1>\u56fe\u9274</h1>
  <div class="sub" id="bookSub">\u6570\u636e\u76f4\u63a5\u8bfb\u53d6\u5b9e\u6218\u914d\u7f6e \u00b7 \u65b0\u589e\u602a\u7269/\u70ae\u5854\u4f1a\u81ea\u52a8\u51fa\u73b0</div>
  <div style="display:flex;gap:8px;width:100%;max-width:520px;margin:2px 0 2px;">
    <button class="btn" id="bookTabMob" style="flex:1;padding:10px 0;font-size:14px;letter-spacing:1px;">\U0001F47E \u602a\u7269</button>
    <button class="btn" id="bookTabTower" style="flex:1;padding:10px 0;font-size:14px;letter-spacing:1px;background:rgba(40,60,100,.85)">\U0001F5FC \u70ae\u5854</button>
  </div>
  <div id="bookList" style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:520px;"></div>
  <button class="btn" id="bookBackBtn" style="margin-top:10px;padding:11px 32px;font-size:15px;background:rgba(40,60,100,.85)">\u8fd4\u56de</button>
</div>
<div class="ov hidden" id="pauseOv">"""

rep('html: 首页 #bookBtn + #bookOv 弹窗', OLD_ENTRY, NEW_ENTRY)


# ---------------------------------------------------------------- ② hideAll 收纳 bookOv + 图鉴引擎
OLD_HIDEALL = """function hideAll(){
  hintBar(false); menuPause = false;
  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.classList.add('hidden');
  });
}"""

NEW_HIDEALL = """function hideAll(){
  hintBar(false); menuPause = false;
  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.classList.add('hidden');
  });
}

/* ==== BOOK_PATCH_V1 : 主界面图鉴（怪物 + 炮塔）—— 数据驱动，遍历 ENEMIES / ELEMS 生成 ==== */
/* 共鸣组合表：key 必须与 resonanceOf() 里的 [t.elem,o.elem].sort().join('+') 一致（字母序） */
var BOOK_RESO = [
  { pair:'fire+ice',     name:'\u70ed\u9707',   note:'\u7206\u70b8\u6e85\u5c04' },
  { pair:'fire+thunder', name:'\u7b49\u79bb\u5b50', note:'\u4f24\u5bb3+80% / \u653b\u901f+25%' },
  { pair:'ice+thunder',  name:'\u8d85\u5bfc',   note:'\u51cf\u901f\u7ffb\u500d\u5e76\u51bb\u7ed3' },
  { pair:'fire+poison',  name:'\u71c3\u7206',   note:'\u6bd2\u4f24\u7acb\u523b\u7ed3\u7b97' },
  { pair:'fire+phys',    name:'\u7194\u94c1',   note:'\u6253\u6709\u7532\u602a\u4f24\u5bb3\u00d71.4' },
  { pair:'ice+phys',     name:'\u788e\u51b0',   note:'\u66b4\u51fb +15%' },
  { pair:'phys+thunder', name:'\u7535\u78c1\u70ae', note:'\u5b8c\u5168\u65e0\u89c6\u62a4\u7532' },
  { pair:'phys+poison',  name:'\u8150\u8680',   note:'\u6bd2\u4f24 \u00d71.8' },
  { pair:'support',      name:'\u589e\u5e45\u573a', note:'\u76f8\u90bb\u653b\u51fb\u5854 \u4f24\u5bb3+20% / \u5c04\u7a0b+10%' }
];
/* 怪物展示顺序：常见怪在前，BOSS 收尾；表里以后新增的怪会自动追加到末尾 */
var BOOK_MOB_ORDER = ['normal', 'fast', 'armor', 'shield', 'boss'];
var bookTab = 'mob';          /* 当前分页：mob=怪物 / tower=炮塔 */
var bookPausePrev = false;    /* 打开图鉴前的 menuPause（关闭时原样恢复，避免把状态搞乱） */

function bookMobKeys(){
  var out = [], k, i;
  for (i = 0; i < BOOK_MOB_ORDER.length; i++){
    if (ENEMIES[BOOK_MOB_ORDER[i]]) out.push(BOOK_MOB_ORDER[i]);
  }
  for (k in ENEMIES){
    if (ENEMIES.hasOwnProperty(k) && out.indexOf(k) < 0) out.push(k);
  }
  return out;
}
function bookTowerKeys(){
  var out = [], k;
  for (k in ELEMS){
    if (ELEMS.hasOwnProperty(k)) out.push(k);
  }
  return out;
}
/* 从数据字段推导特性文案（以后加新怪只要写字段，图鉴自动跟上） */
function bookMobTraits(d){
  var t = [];
  if (d.armor) t.push('\u62a4\u7532\u51cf\u4f24 ' + Math.round(d.armor * 100) + '%');
  if (d.immuneSlow) t.push('\u514d\u75ab\u51cf\u901f');
  if (d.boss) t.push('BOSS \u00b7 \u6bcf 10 \u6ce2\u767b\u573a');
  if (!t.length) t.push('\u65e0\u7279\u6b8a\u80fd\u529b');
  return t;
}
function bookMobCounter(d){
  var a = [];
  if (d.armor) a.push('\u62a4\u7532 \u2192 \U0001F528\u7269\u7406\u5854\u7a7f\u7532 / \u7194\u94c1 / \u7535\u78c1\u70ae');
  if (d.immuneSlow) a.push('\u514d\u75ab\u51cf\u901f \u2192 \u522b\u53ea\u5806\u51b0\u971c\uff0c\u8f6c\u706b/\u96f7\u8f93\u51fa');
  if (d.boss) a.push('BOSS \u2192 \u96c6\u706b + \u5168\u5c4f\u51bb\u7ed3\uff0c\u4e0d\u80fd\u8ba9\u5b83\u8d70\u5230\u7ec8\u70b9');
  if (!a.length) a.push('\u65e0\u7279\u6b8a\u80fd\u529b \u2192 \u4efb\u610f\u5143\u7d20\u5854\u90fd\u80fd\u5904\u7406');
  return a;
}
/* 该元素塔参与的全部共鸣组合（含同元素共振 / 辅助塔增幅场） */
function bookResoTags(elem){
  var out = [], i, r, p;
  if (elem === 'support'){
    out.push('\u589e\u5e45\u573a\uff08\u4e3a\u76f8\u90bb\u653b\u51fb\u5854\u63d0\u4f9b \u00b7 \u4f24\u5bb3+20% / \u5c04\u7a0b+10%\uff09');
    out.push('\u5171\u632f\uff08\u540c\u7c7b\u76f8\u90bb \u00b7 \u8f85\u52a9\u5854\u81ea\u8eab\u4e0d\u653b\u51fb\uff09');
    return out;
  }
  for (i = 0; i < BOOK_RESO.length; i++){
    r = BOOK_RESO[i];
    if (r.pair === 'support'){ out.push(r.name + '\uff08\u76f8\u90bb \U0001F4E1 \u8f85\u52a9\u5854\uff09'); continue; }
    p = r.pair.split('+');
    if (p[0] === elem || p[1] === elem) out.push(r.name + ' \u00b7 ' + r.note);
  }
  out.push('\u5171\u632f\uff08\u540c\u5143\u7d20\u76f8\u90bb \u00b7 \u4f24\u5bb3+35% / \u5c04\u7a0b+15%\uff09');
  return out;
}
/* —— 卡片：怪物 —— */
function bookMobCard(k){
  var d = ENEMIES[k];
  var color = d.color || '#9fc4f0';
  return '<div style="display:flex;align-items:stretch;gap:10px;width:100%;box-sizing:border-box;'
    + 'padding:10px 12px;border:1px solid rgba(120,160,220,.28);border-radius:10px;background:rgba(18,26,44,.72);">'
    + '<div style="flex:0 0 16px;width:16px;border-radius:4px;background:' + color + ';box-shadow:0 0 8px ' + color + ';"></div>'
    + '<div style="flex:1;text-align:left;line-height:1.55;min-width:0;">'
    + '<div style="font-size:15px;font-weight:bold;color:' + color + ';">' + d.name
    + '<span style="font-size:11px;font-weight:normal;color:#9fc4f0;opacity:.75;">  ' + k + '</span></div>'
    + '<div style="font-size:12.5px;color:#9fc4f0;">\u8840\u91cf <b style="color:#ffd76a;">' + d.hp
    + '</b> \u00b7 \u901f\u5ea6 <b style="color:#ffd76a;">' + d.speed
    + '</b> \u00b7 \u6389\u843d <b style="color:#ffd76a;">' + d.gold + '</b> \u91d1\u5e01</div>'
    + '<div style="font-size:12.5px;color:#7cf5c0;">\u7279\u6027\uff1a' + bookMobTraits(d).join(' \u00b7 ') + '</div>'
    + '<div style="font-size:12px;color:#9fc4f0;opacity:.9;">\u514b\u5236\u63d0\u793a\uff1a' + bookMobCounter(d).join(' \uff1b ') + '</div>'
    + '</div></div>';
}
/* —— 卡片：炮塔 —— */
function bookTowerCard(k){
  var d = ELEMS[k];
  var color = d.color || '#9fc4f0';
  var line2;
  if (d.aura){
    line2 = '\u81ea\u8eab\u4e0d\u653b\u51fb \u00b7 \u76f8\u90bb\u5854\u4f24\u5bb3 +' + Math.round((d.auraDmg || 0) * 100)
      + '% / \u653b\u901f +' + Math.round((d.auraRate || 0) * 100) + '%';
  } else {
    line2 = '\u4f24\u5bb3 <b style="color:#ffd76a;">' + d.dmg
      + '</b> \u00b7 \u653b\u901f <b style="color:#ffd76a;">' + (d.rate > 0 ? (1 / d.rate).toFixed(2) : '0.00')
      + '</b> \u6b21/\u79d2 \u00b7 \u5c04\u7a0b <b style="color:#ffd76a;">' + d.range + '</b>';
  }
  return '<div style="display:flex;align-items:stretch;gap:10px;width:100%;box-sizing:border-box;'
    + 'padding:10px 12px;border:1px solid rgba(120,160,220,.28);border-radius:10px;background:rgba(18,26,44,.72);">'
    + '<div style="flex:0 0 30px;font-size:22px;line-height:1.3;text-align:center;">' + d.icon + '</div>'
    + '<div style="flex:1;text-align:left;line-height:1.55;min-width:0;">'
    + '<div style="font-size:15px;font-weight:bold;color:' + color + ';">' + d.name
    + '<span style="font-size:11.5px;font-weight:normal;color:#9fc4f0;">  \u9020\u4ef7 <b style="color:#ffd76a;">'
    + d.cost + '</b></span></div>'
    + '<div style="font-size:12.5px;color:#9fc4f0;">' + line2 + '</div>'
    + '<div style="font-size:12.5px;color:#7cf5c0;">\u7279\u6548\uff1a' + d.fx + '</div>'
    + '<div style="font-size:12px;color:#9fc4f0;opacity:.9;">\u5347\u7ea7\u6536\u76ca\uff1a\u6bcf\u7ea7 +30% \u4f24\u5bb3 / +12% \u653b\u901f / +8% \u5c04\u7a0b</div>'
    + '<div style="font-size:12px;color:#9fc4f0;">\u5171\u9e23\u7ec4\u5408\uff1a<b style="color:#7cf5c0;">'
    + bookResoTags(k).join('</b> \u00b7 <b style="color:#7cf5c0;">') + '</b></div>'
    + '</div></div>';
}
function bookRenderTabs(){
  var m = document.getElementById('bookTabMob'), t = document.getElementById('bookTabTower');
  if (m){
    m.style.borderColor = (bookTab === 'mob') ? '#ffd76a' : 'rgba(120,160,220,.3)';
    m.style.color = (bookTab === 'mob') ? '#ffd76a' : '#eaf3ff';
    m.style.background = (bookTab === 'mob') ? 'rgba(80,60,20,.9)' : 'rgba(40,60,100,.85)';
  }
  if (t){
    t.style.borderColor = (bookTab === 'tower') ? '#ffd76a' : 'rgba(120,160,220,.3)';
    t.style.color = (bookTab === 'tower') ? '#ffd76a' : '#eaf3ff';
    t.style.background = (bookTab === 'tower') ? 'rgba(80,60,20,.9)' : 'rgba(40,60,100,.85)';
  }
}
function bookRender(){
  var list = document.getElementById('bookList');
  var keys = (bookTab === 'mob') ? bookMobKeys() : bookTowerKeys();
  var h = '', i;
  for (i = 0; i < keys.length; i++){
    h += (bookTab === 'mob') ? bookMobCard(keys[i]) : bookTowerCard(keys[i]);
  }
  if (list) list.innerHTML = h;
  var sub = document.getElementById('bookSub');
  if (sub){
    sub.textContent = (bookTab === 'mob')
      ? ('\u5171 ' + keys.length + ' \u79cd\u654c\u4eba \u00b7 \u7279\u6027\u51b3\u5b9a\u8be5\u7528\u4ec0\u4e48\u5854\u6253')
      : ('\u5171 ' + keys.length + ' \u79cd\u5854 \u00b7 \u76f8\u90bb\u4e0d\u540c\u5143\u7d20\u89e6\u53d1\u5171\u9e23');
  }
  bookRenderTabs();
}
function bookShow(tab){
  if (tab) bookTab = tab;
  bookPausePrev = menuPause;                  /* 记录打开前的状态 */
  if (running) menuPause = true;              /* 战场在跑 → 冻结（首页打开时 running=false，不动状态） */
  var so = document.getElementById('startOv'); if (so) so.classList.add('hidden');
  var bv = document.getElementById('bookOv'); if (bv) bv.classList.remove('hidden');
  bookRender();
  SFX.click();
}
function bookHide(){
  var bv = document.getElementById('bookOv'); if (bv) bv.classList.add('hidden');
  var so = document.getElementById('startOv'); if (so) so.classList.remove('hidden');
  menuPause = bookPausePrev;                  /* 恢复成打开之前的状态 */
  SFX.click();
}"""

rep('js: hideAll 收纳 bookOv + 图鉴引擎', OLD_HIDEALL, NEW_HIDEALL)


# ---------------------------------------------------------------- ③ 事件绑定
OLD_BIND = """  on('setBtn1', function(){ showSet('start'); });"""
NEW_BIND = """  on('setBtn1', function(){ showSet('start'); });
  /* —— 图鉴：入口 / 分页 / 返回 —— */
  on('bookBtn', function(){ bookShow('mob'); });
  on('bookTabMob', function(){ bookTab = 'mob'; bookRender(); SFX.click(); });
  on('bookTabTower', function(){ bookTab = 'tower'; bookRender(); SFX.click(); });
  on('bookBackBtn', bookHide);"""

rep('js: 图鉴事件绑定', OLD_BIND, NEW_BIND)


# ---------------------------------------------------------------- 写回
io.open(TARGET, 'w', encoding='utf-8').write(src)
print('✅ 已应用 %d 处补丁 → %s' % (len(applied), TARGET))
for i, t in enumerate(applied, 1):
    print('   %d) %s' % (i, t))
