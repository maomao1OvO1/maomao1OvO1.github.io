#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.7 图鉴扩充：怪物/炮塔/共鸣/强化卡/体系/资料 六页
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)

# ① tab 按钮：2 个 → 6 个（两行三列）
sub("""    <button class="btn" id="bookTabMob" style="flex:1;padding:10px 0;font-size:14px;letter-spacing:1px;">👾 怪物</button>
    <button class="btn" id="bookTabTower" style="flex:1;padding:10px 0;font-size:14px;letter-spacing:1px;background:rgba(40,60,100,.85)">🗼 炮塔</button>""",
"""    <button class="btn" id="bookTabMob" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;">👾 怪物</button>
    <button class="btn" id="bookTabTower" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🗼 炮塔</button>
    <button class="btn" id="bookTabReso" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🔗 共鸣</button>
    <button class="btn" id="bookTabBuff" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🎴 强化卡</button>
    <button class="btn" id="bookTabSys" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🏷 体系</button>
    <button class="btn" id="bookTabInfo" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">📜 资料</button>""", '六个页签')
# 让页签容器允许换行
s2 = s.replace('<div style="display:flex;gap:8px;width:100%;max-width:520px;margin:2px 0 2px;">',
               '<div style="display:flex;flex-wrap:wrap;gap:6px;width:100%;max-width:520px;margin:2px 0 2px;">', 1)
if s2 != s: s = s2; hits.append('页签容器换行')

# ② 新页渲染函数 + 通用页签高亮 + 分发
sub("""function bookRenderTabs(){""",
"""/* ===== v7.7 图鉴扩充：共鸣 / 强化卡 / 体系 / 资料 四页 ===== */
var RESO_LIST = [
  ['🔥 + ❄️', '热震', '命中点爆炸溅射，范围内敌人也吃伤害'],
  ['🔥 + ⚡', '等离子', '伤害 +80%、攻速 +25%'],
  ['❄️ + ⚡', '超导', '减速翻 3 倍，并附加冻结'],
  ['☠️ + 🔥', '燃爆', '中毒伤害立刻结算，且 ×2'],
  ['🔨 + ⚡', '电磁炮', '无视目标全部护甲'],
  ['🔨 + 🔥', '熔铁', '对有护甲的目标伤害 ×1.4'],
  ['🔨 + ❄️', '碎冰', '暴击率 +15%'],
  ['🔨 + ☠️', '腐蚀', '中毒伤害 ×1.8'],
  ['💥 + 🔥', '燃烧弹', '溅射区域内附加持续燃烧'],
  ['💥 + ☠️', '毒气弹', '溅射区域内敌人中毒'],
  ['💥 + ❄️', '冰爆', '溅射区域内敌人减速'],
  ['🎯 + ⚡', '电磁狙击', '伤害 +60%，且无视护甲'],
  ['🎯 + 🔨', '破甲弹', '无视护甲，并对护甲目标额外 ×1.4'],
  ['同元素相邻', '共振', '伤害 +35%、射程 +15%'],
  ['攻击塔 + 📡', '增幅场', '相邻辅助塔提供：伤害 +20%、射程 +10%']
];
function bookResoCard(row, idx){
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:rgba(22,32,56,.75);border:1px solid rgba(120,180,255,.22);">'
    + '<span style="font-size:17px;flex:0 0 auto;">' + row[0] + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:#8ff0ff;">' + row[1] + '</span>'
    + '<span style="display:block;font-size:11.5px;color:#9fc4f0;margin-top:1px;">' + row[2] + '</span>'
    + '</span></div>';
}
function bookBuffCard(c){
  var rar = RARITY[c.rar] || RARITY.common;
  var kind = c.elKey ? '局部强化' : '通用';
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:rgba(22,32,56,.75);border:1px solid ' + rar.color + '55;">'
    + '<span style="flex:0 0 auto;font-size:10px;color:' + rar.color + ';border:1px solid ' + rar.color
    + ';border-radius:8px;padding:1px 6px;">' + rar.name + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:#eaf3ff;">' + c.name
    + '<span style="font-size:10.5px;font-weight:400;color:#7d8ba3;"> · ' + kind + '</span></span>'
    + '<span style="display:block;font-size:11.5px;color:#7cf5c0;margin-top:1px;">' + c.desc + '</span>'
    + '</span></div>';
}
function bookSysCard(sys){
  var tirs = SYS_TIER[sys] || [], mem = [], i, k;
  for (k in ELEMS){ if (ELEMS[k].sys === sys) mem.push(ELEMS[k].icon + ELEMS[k].name); }
  var lines = tirs.map(function(t){ return '总 Lv ' + t.lv + ' → +' + Math.round(t.bonus * 100) + '%'; }).join(' · ');
  var what = (sys === 'solo') ? '伤害' : (sys === 'group') ? '范围（溅射半径/链弹）' : (sys === 'ctrl') ? '控制（减速时长与强度）' : '光环效果';
  // 各塔专属成长
  var ups = [];
  for (k in ELEMS){ if (ELEMS[k].sys === sys && ELEMS[k].upName) ups.push(ELEMS[k].icon + ELEMS[k].name + '：' + ELEMS[k].upName); }
  return '<div style="padding:9px 11px;border-radius:12px;background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.28);text-align:left;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">' + SYS_NAME[sys] + ' <span style="font-size:11px;color:#9fc4f0;">' + mem.join('、') + '</span></div>'
    + '<div style="font-size:11.5px;color:#9fc4f0;margin-top:3px;">体系内塔的<b style="color:#ffd76a;">等级总和</b>达标 → 全体同体系塔的 <b style="color:#7cf5c0;">' + what + '</b> 提升</div>'
    + '<div style="font-size:12px;color:#ffd76a;margin-top:2px;">' + lines + '</div>'
    + (ups.length ? ('<div style="font-size:11.5px;color:#ffb27a;margin-top:4px;">📈 专属成长（每级）：<br>' + ups.join('<br>') + '</div>') : '')
    + '</div>';
}
function bookInfoCard(){
  var out = [], i, k;
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.28);text-align:left;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">🗺 关卡列表</div>');
  for (i = 0; i < LEVELS.length; i++){
    var L = LEVELS[i];
    out.push('<div style="font-size:12px;color:#9fc4f0;margin-top:3px;">' + L.name
      + ' · <b style="color:#ffd76a;">' + L.waves + '</b> 波 · 初始金币 <b style="color:#ffd76a;">' + L.gold + '</b></div>');
  }
  out.push('</div>');
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">❄️ 主动技能</div>'
    + '<div style="font-size:12px;color:#9fc4f0;margin-top:3px;">全屏冻结：所有敌人短暂冻结，冷却 <b style="color:#ffd76a;">26 秒</b>。BOSS 波与漏怪救场用。</div></div>');
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">⚙️ 核心机制</div>'
    + '<div style="font-size:12px;color:#9fc4f0;line-height:1.7;margin-top:3px;">'
    + '· <b style="color:#ffd76a;">索敌</b>：优先打离基地最近的，路程相同打血量最低<br>'
    + '· <b style="color:#ffd76a;">狙击塔例外</b>：优先锁医疗兵 / 精英队长 / BOSS<br>'
    + '· <b style="color:#ffd76a;">出生护盾</b>：敌人出生 3 秒内受伤仅 15%<br>'
    + '· <b style="color:#ffd76a;">动态造价</b>：每多建一座贵 4%（斜率随波次升到 10%）<br>'
    + '· <b style="color:#ffd76a;">单波封顶</b>：每波最多 120 只，超出的转成敌人强度<br>'
    + '· <b style="color:#ffd76a;">悔棋</b>：新建的塔 5 秒内可全额退款'
    + '</div></div>');
  // 战绩
  var best = 0, eBest = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) { best = 0; }
  try { eBest = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) { eBest = 0; }
  var stars = 0;
  if (prog && prog.stars) for (k in prog.stars) stars += (prog.stars[k] || 0);
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">🏆 我的战绩</div>'
    + '<div style="font-size:12px;color:#9fc4f0;line-height:1.8;margin-top:3px;">'
    + '最高波次 <b style="color:#ffd76a;">' + (best || '—') + '</b> · 无尽最高 <b style="color:#ffd76a;">' + (eBest || '—') + '</b> 波<br>'
    + '已解锁 <b style="color:#ffd76a;">' + ((prog && prog.unlocked) || 1) + '/' + LEVELS.length + '</b> 关 · 星数 <b style="color:#ffd76a;">' + stars + '/' + (LEVELS.length * 3) + '</b>'
    + '</div></div>');
  return out.join('');
}
function bookRenderTabs(){""", '四个新页函数')

# ③ 页签高亮通用化
old_tabs_start = s.index("function bookRenderTabs(){")
old_tabs_end = s.index("}", s.index("var c = document.getElementById('setClearBtn')")) if False else None
# 直接整段替换 bookRenderTabs（括号计数）
i = s.index("function bookRenderTabs(){")
j = s.index('{', i); depth = 0; k2 = j
while k2 < len(s):
    if s[k2] == '{': depth += 1
    elif s[k2] == '}':
        depth -= 1
        if depth == 0: break
    k2 += 1
new_tabs = """function bookRenderTabs(){
  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo' };
  for (var key in ids){
    var el = document.getElementById(ids[key]);
    if (!el) continue;
    var on = (bookTab === key);
    el.style.borderColor = on ? '#ffd76a' : 'rgba(120,160,220,.3)';
    el.style.color = on ? '#ffd76a' : '#eaf3ff';
    el.style.background = on ? 'rgba(80,60,20,.9)' : 'rgba(40,60,100,.85)';
  }
}"""
s = s[:i] + new_tabs + s[k2+1:]
hits.append('页签通用高亮')

# ④ 分发器支持新页
sub("""function bookRender(){
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
      ? ('共 ' + keys.length + ' 种敌人 · 特性决定该用什么塔打')
      : ('共 ' + keys.length + ' 种塔 · 相邻不同元素触发共鸣');
  }
  bookRenderTabs();
}""",
"""function bookRender(){
  var list = document.getElementById('bookList');
  var h = '', i, keys;
  if (bookTab === 'reso'){
    for (i = 0; i < RESO_LIST.length; i++) h += bookResoCard(RESO_LIST[i], i);
  } else if (bookTab === 'buff'){
    var order = { epic:0, rare:1, common:2 };
    var cards = BUFF_POOL.slice().sort(function(a, b){ return (order[a.rar] || 9) - (order[b.rar] || 9); });
    h += '<div style="font-size:11.5px;color:#8fb4dc;text-align:left;margin-bottom:4px;">越到后期越容易抽到高级卡（稀有 +1.6/波、史诗 +3.2/波 权重）</div>';
    for (i = 0; i < cards.length; i++) h += bookBuffCard(cards[i]);
  } else if (bookTab === 'sys'){
    var sysKeys = ['solo', 'group', 'ctrl', 'support'];
    for (i = 0; i < sysKeys.length; i++) h += bookSysCard(sysKeys[i]);
  } else if (bookTab === 'info'){
    h = bookInfoCard();
  } else {
    keys = (bookTab === 'mob') ? bookMobKeys() : bookTowerKeys();
    for (i = 0; i < keys.length; i++) h += (bookTab === 'mob') ? bookMobCard(keys[i]) : bookTowerCard(keys[i]);
  }
  if (list) list.innerHTML = h;
  var sub = document.getElementById('bookSub');
  if (sub){
    sub.textContent = (bookTab === 'mob') ? ('共 ' + bookMobKeys().length + ' 种敌人 · 特性决定该用什么塔打')
      : (bookTab === 'tower') ? ('共 ' + bookTowerKeys().length + ' 种塔 · 相邻不同元素触发共鸣')
      : (bookTab === 'reso') ? ('共 ' + RESO_LIST.length + ' 种共鸣组合 · 相邻摆放即触发')
      : (bookTab === 'buff') ? ('共 ' + BUFF_POOL.length + ' 张强化卡 · 每波三选一')
      : (bookTab === 'sys') ? ('四大体系 · 体系内等级总和达标即全队加成')
      : '关卡 / 技能 / 核心机制 / 你的战绩';
  }
  bookRenderTabs();
}""", '分发器')

# ⑤ 炮塔页补一行「专属成长」
sub("""    + '<div style="font-size:12px;color:#9fc4f0;opacity:.9;">克制提示：'""",
    """    + '<div style="font-size:12px;color:#9fc4f0;opacity:.9;">克制提示：'""", 'noop')  # 占位
hits.pop()

# ⑥ 事件绑定 4 个新页签
sub("""  on('bookTabTower', function(){ bookTab = 'tower'; bookRender(); SFX.bookTab(); });""",
"""  on('bookTabTower', function(){ bookTab = 'tower'; bookRender(); SFX.bookTab(); });
  on('bookTabReso', function(){ bookTab = 'reso'; bookRender(); SFX.bookTab(); });
  on('bookTabBuff', function(){ bookTab = 'buff'; bookRender(); SFX.bookTab(); });
  on('bookTabSys', function(){ bookTab = 'sys'; bookRender(); SFX.bookTab(); });
  on('bookTabInfo', function(){ bookTab = 'info'; bookRender(); SFX.bookTab(); });""", '新页签事件')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_r_codex 完成，共 %d 项：' % len(hits))
for h in hits: print('   -', h)
