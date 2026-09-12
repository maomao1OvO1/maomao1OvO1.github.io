# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 随机词条池（每座塔建成时抽一个 → 同一种塔也不再千篇一律）
rep("var SHOP_POOL = [",
"""/* ===== v8.2 随机词条：每座塔建成时随机获得一个词条 =====
   目的：破除「固定一套点满」，同一局里两座火焰塔也可能强弱不同 → 逼玩家按手里的牌打。 */
var AFFIX_POOL = [
  { id:'sharp',   name:'锐利', desc:'伤害 +12%',        dmg:0.12 },
  { id:'rapid',   name:'迅捷', desc:'攻速 +10%',        rate:0.10 },
  { id:'long',    name:'远视', desc:'射程 +12%',        range:0.12 },
  { id:'critA',   name:'致命', desc:'本塔暴击率 +8%',   crit:0.08 },
  { id:'pierceA', name:'穿透', desc:'无视护甲 +12%',    pierce:0.12 },
  { id:'splashA', name:'扩散', desc:'溅射半径 +0.2 格', splashR:0.20 },
  { id:'dotA',    name:'蚀骨', desc:'中毒伤害 +25%',    dot:0.25 },
  { id:'slowA',   name:'霜纹', desc:'减速时长 +15%',    slowT:0.15 },
  { id:'bossA',   name:'猎王', desc:'对 BOSS +20%',     boss:0.20 }
];
function rollAffix(){ return AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]; }
var SHOP_POOL = [""", '词条池')

# ② 建塔时抽词条 + 专精字段
rep("var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME, paid: cost };",
    "var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME, paid: cost,\n            affix: rollAffix(), spec: null };   /* v8.2 随机词条 + 精通分支（互斥） */", '建塔抽词条')

# ③ statAt：词条与精通分支的乘区
rep("""  var tw = twOf(t.elem);
  var twD = 1 + ((tw && tw.dmg)  || 0),
      twG = 1 + ((tw && tw.range) || 0),
      twS = 1 + ((tw && tw.rate) || 0);""",
"""  var tw = twOf(t.elem);
  var twD = 1 + ((tw && tw.dmg)  || 0),
      twG = 1 + ((tw && tw.range) || 0),
      twS = 1 + ((tw && tw.rate) || 0);
  /* v8.2 随机词条 + 互斥精通分支（都是「这一座塔」级别） */
  var af = t.affix || null, sp = t.spec || null;
  twD *= 1 + ((af && af.dmg)   || 0);
  twG *= 1 + ((af && af.range) || 0);
  twS *= 1 + ((af && af.rate)  || 0);
  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */""", 'statAt 词条与精通')

# ④ hitEnemy：词条对暴击/穿透/溅射/毒/减速/BOSS 的影响
rep("""  var tw = twOf(t.elem);                                   // v7.8 本塔专属强化（无则 null）""",
"""  var tw = twOf(t.elem);                                   // v7.8 本塔专属强化（无则 null）
  var af = t.affix || null;                                // v8.2 本塔随机词条""", 'hitEnemy 取词条')

rep("""  var armor = (res && res.pierceFull) ? 1
            : (1 - (e.armor || 0) * (1 - (BUFFS.pierceAdd || 0)));   // v7.4 穿甲弹芯：无视部分护甲""",
"""  var pierceAll = Math.min(1, (BUFFS.pierceAdd || 0) + ((af && af.pierce) || 0));   // v8.2 词条「穿透」也计入
  var armor = (res && res.pierceFull) ? 1
            : (1 - (e.armor || 0) * (1 - pierceAll));   // v7.4 穿甲弹芯：无视部分护甲""", '词条穿透')

rep("  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0));",
    "  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0));   // v8.2 词条「致命」", '词条暴击')

rep("  var bossMul = e.boss ? (1 + (BUFFS.bossDmg || 0) + ((tw && tw.boss) || 0)) : 1;",
    "  var bossMul = e.boss ? (1 + (BUFFS.bossDmg || 0) + ((tw && tw.boss) || 0) + ((af && af.boss) || 0)) : 1;   // v8.2 词条「猎王」", '词条BOSS')

rep("""  var slowS = (def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK * (1 + (BUFFS.slowAdd || 0))
            + ((tw && tw.slowT) || 0);   // v7.4 绝对零度 ｜ v7.8 冰霜专属卡""",
"""  var slowS = ((def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK * (1 + (BUFFS.slowAdd || 0))
            + ((tw && tw.slowT) || 0)) * (1 + ((af && af.slowT) || 0));   // v7.4 绝对零度 ｜ v7.8 专属卡 ｜ v8.2 词条「霜纹」""", '词条减速')

rep("""  var dotD1 = def.dot ? ( (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK * (1 + (BUFFS.dotAdd || 0))
                         + ((tw && tw.dotFlat) || 0) ) * (1 + ((tw && tw.dotMul) || 0)) : 0;""",
"""  var dotD1 = def.dot ? ( (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK * (1 + (BUFFS.dotAdd || 0))
                         + ((tw && tw.dotFlat) || 0) ) * (1 + ((tw && tw.dotMul) || 0)) * (1 + ((af && af.dot) || 0)) : 0;   /* v8.2 词条「蚀骨」 */""", '词条毒伤')

rep("""  var spR = (def2.splashR || 0) * sysRangeMul(t.elem),""",
"""  var spR = (def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0),   /* v8.2 词条「扩散」加半径 */""", '词条溅射')

# ⑤ 面板：显示词条 + Lv3 精通分支选择
rep("""  sel.innerHTML = '<div class="t">⏸ ' + d.icon + ' ' + d.name + ' Lv' + t.lv + '</div>' + res + upLine + sysTxt""",
"""  /* ===== v8.2 面板新增：随机词条 + 精通分支（互斥，Lv3 解锁）===== */
  var affixHtml = t.affix
    ? ('<div class="ce" style="margin:3px 0 0;padding:3px 7px;border-radius:8px;background:rgba(185,140,255,.12);'
       + 'border:1px solid rgba(185,140,255,.35)">✨ 词条：<b style="color:#c9a4ff">' + t.affix.name + '</b>（' + t.affix.desc + '）</div>')
    : '';
  var specHtml = '';
  if (!d.aura){
    if (t.lv < 3){
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#7d8ba3">🔀 精通分支：升到 Lv3 解锁（伤害 / 攻速 二选一，互斥）</div>';
    } else if (!t.spec){
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#ffd76a">🔀 选择精通分支（<b>互斥</b>，选定不可改）</div>'
        + '<div class="row" style="margin-top:4px">'
        + '<button data-spec="dmg" style="padding:8px">🔥 强化弹头<br><span style="font-size:11px;color:#9fc4f0">伤害 +40%</span></button>'
        + '<button data-spec="rate" style="padding:8px">⚡ 超载循环<br><span style="font-size:11px;color:#9fc4f0">攻速 +35%</span></button>'
        + '</div>';
    } else {
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#8ff0ff">🔀 精通：' +
        (t.spec === 'dmg' ? '🔥 强化弹头（伤害 +40%）' : '⚡ 超载循环（攻速 +35%）') + '</div>';
    }
  }
  sel._px = px; sel._py = py;
  sel.innerHTML = '<div class="t">⏸ ' + d.icon + ' ' + d.name + ' Lv' + t.lv + '</div>' + res + upLine + sysTxt""", '面板词条与精通')

rep("""    + dmgBox
    + buffTxt""",
"""    + dmgBox
    + affixHtml
    + specHtml
    + buffTxt""", '面板插入词条/精通块')

# ⑥ 精通分支点击处理
rep("""  } else if (b.dataset.refund){""",
"""  } else if (b.dataset.spec){
    /* v8.2：Lv3 起选精通分支（互斥） */
    var t5 = sel._tower;
    if (t5 && t5.lv >= 3 && !t5.spec){
      t5.spec = b.dataset.spec;
      recalcResonance(); updateHud(); SFX.upgrade();
      addFloat(cx(t5.c), cy(t5.r) - CELL * 0.4,
        (t5.spec === 'dmg' ? '精通：伤害 +40%' : '精通：攻速 +35%'), '#ffd76a');
      showTip('精通分支已选定（互斥，不可更改）');
      openTower(t5, sel._px || 30, sel._py || 30);
    }
  } else if (b.dataset.refund){""", '精通点击处理')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.2a 词条+专精补丁完成 ---')
