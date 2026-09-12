# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 四元素共鸣（一座塔最多连 4 座 → 四元素是上限）
rep("""  res.tags = res.tags.filter(function(v, i, a){ return a.indexOf(v) === i; });""",
"""  /* ===== v8.16 四元素共鸣（上限：一座塔最多连 4 座）=====
     中心塔的上下左右四座都存在、元素互不相同、且都不是辅助塔 → 触发四元素共鸣。 */
  (function(){
    var q = [towerAt(t.c - 1, t.r), towerAt(t.c + 1, t.r), towerAt(t.c, t.r - 1), towerAt(t.c, t.r + 1)];
    for (var qi = 0; qi < 4; qi++) if (!q[qi] || q[qi].elem === 'support') return;
    var list = [t.elem, q[0].elem, q[1].elem, q[2].elem, q[3].elem];
    var seen = {};
    for (var si = 0; si < list.length; si++){ if (seen[list[si]]) return; seen[list[si]] = 1; }   /* 必须四座各不相同 */
    var quad = list.slice().sort().join('+');
    if (quad === 'fire+ice+sniper+thunder'){
      res.dmgMul += 1.10; res.rateMul += 0.35; res.critAdd = (res.critAdd || 0) + 0.20; res.freeze = true; res.tags.push('🌌元素洪流');
    } else if (quad === 'fire+ice+mortar+poison'){
      res.splash = Math.max(res.splash || 1, 1.70); res.splashBurn = 12; res.splashDot = 10; res.splashSlow = 0.60; res.tags.push('🌌灾厄领域');
    } else if (quad === 'mortar+phys+sniper+thunder'){
      res.pierceFull = true; res.dmgMul += 0.80; res.splash = Math.max(res.splash || 1, 1.50); res.tags.push('🌌战争矩阵');
    } else if (quad === 'fire+ice+poison+thunder'){
      res.dmgMul += 0.85; res.dotMul = 1.8; res.slowMul = Math.max(res.slowMul || 1, 2.0); res.tags.push('🌌四相漩涡');
    } else if (quad === 'fire+ice+phys+sniper'){
      res.pierceFull = true; res.critAdd = (res.critAdd || 0) + 0.30; res.dmgMul += 0.70; res.freeze = true; res.tags.push('🌌绝对猎杀');
    } else if (quad === 'fire+poison+thunder+sniper'){
      res.dmgMul += 0.90; res.dotMul = 2.0; res.rateMul += 0.25; res.tags.push('🌌雷火毒狙');
    } else if (quad === 'ice+mortar+poison+thunder'){
      res.splash = Math.max(res.splash || 1, 1.50); res.splashDot = 9; res.splashSlow = 0.60; res.dmgMul += 0.50; res.tags.push('🌌霜雷毒爆');
    } else if (quad === 'fire+mortar+phys+sniper'){
      res.splash = Math.max(res.splash || 1, 1.50); res.armorBreak = 1.7; res.critAdd = (res.critAdd || 0) + 0.20; res.tags.push('🌌重炮矩阵');
    } else {
      res.dmgMul += 0.75; res.rateMul += 0.20; res.tags.push('🌌四元素共鸣');   /* 其余组合的保底收益 */
    }
  })();
  res.tags = res.tags.filter(function(v, i, a){ return a.indexOf(v) === i; });""", '四元素共鸣')

# ② 组合枚举（给图鉴用：把所有可能组合列全，不靠手写）
rep("""function bookResoCard(row, idx){""",
"""/* ===== v8.16 共鸣组合枚举 =====
   图鉴不再手写列表：两两 / 三元素 / 四元素 的组合**全部程序枚举**（8 座塔里 7 座攻击塔参与），
   具名组合显示名字与效果，未具名的显示保底效果 —— 保证「能组合出来的都在表里」。 */
var RESO_NAMED = {};      /* key = 元素字母序拼接，value = [名称, 效果] */
function resoElemKey(list){ return list.slice().sort().join('+'); }
function resoAllCombos(n){
  var atk = ['fire', 'ice', 'thunder', 'poison', 'phys', 'sniper', 'mortar'];
  var out = [];
  (function walk(start, cur){
    if (cur.length === n){ out.push(cur.slice()); return; }
    for (var i = start; i < atk.length; i++){ cur.push(atk[i]); walk(i + 1, cur); cur.pop(); }
  })(0, []);
  return out;
}
function resoIconOf(e){ var d = ELEMS[e]; return d ? d.icon : e; }
function resoNameOf(list){
  var k = resoElemKey(list);
  if (RESO_NAMED[k]) return RESO_NAMED[k];
  return [(list.length === 2 ? '普通共鸣' : list.length === 3 ? '⭐三元素共鸣' : '🌌四元素共鸣'),
          list.length === 2 ? '伤害 +25%' : list.length === 3 ? '伤害 +45%' : '伤害 +75%、攻速 +20%'];
}
/* 把具名组合登记进表（与 resonanceOf 里的实现一一对应，改一处记得同步另一处） */
function buildResoNamed(){
  RESO_NAMED = {};
  var add = function(list, name, fx){ RESO_NAMED[resoElemKey(list)] = [name, fx]; };
  /* 两两（21 种非辅助组合，全部有名字） */
  add(['fire','ice'], '热震', '伤害 +70%，命中点爆炸溅射');
  add(['fire','thunder'], '等离子', '伤害 +80%、攻速 +25%');
  add(['ice','thunder'], '超导', '减速强度 ×3，并附加冻结');
  add(['fire','poison'], '燃爆', '中毒伤害立刻结算，且 ×2');
  add(['phys','thunder'], '电磁炮', '无视目标全部护甲，伤害 +60%');
  add(['fire','phys'], '熔铁', '伤害 +50%，对有甲目标 ×1.4');
  add(['ice','phys'], '碎冰', '伤害 +55%，暴击率 +15%');
  add(['phys','poison'], '腐蚀', '伤害 +50%，中毒伤害 ×1.8');
  add(['fire','mortar'], '燃烧弹', '溅射区域内附加持续燃烧');
  add(['mortar','poison'], '毒气弹', '溅射区域内敌人中毒');
  add(['ice','mortar'], '冰爆', '溅射区域内敌人减速');
  add(['sniper','thunder'], '电磁狙击', '伤害 +60%，且无视护甲');
  add(['phys','sniper'], '破甲弹', '无视护甲，并对护甲目标 ×1.4');
  add(['fire','sniper'], '燃烧狙击', '伤害 +55%，命中附加持续燃烧');
  add(['ice','sniper'], '冻结狙击', '暴击率 +20%，命中附加冻结');
  add(['ice','poison'], '霜毒', '中毒伤害 ×1.6，并附带减速');
  add(['poison','thunder'], '电弧腐蚀', '伤害 +35%，中毒伤害 ×1.7');
  add(['mortar','thunder'], '电磁爆炸', '溅射范围 ×1.35，伤害 +30%');
  add(['poison','sniper'], '毒狙', '伤害 +45%，中毒伤害 ×2');
  add(['mortar','phys'], '破片重锤', '溅射范围 ×1.3，对有甲目标 ×1.5');
  add(['mortar','sniper'], '抛射狙击', '射程 +30%，溅射范围 ×1.25');
  /* 三元素（12 种具名 + 其余走保底） */
  add(['fire','ice','thunder'], '⭐元素风暴', '伤害 +90%、攻速 +30%、减速强度 ×2.5');
  add(['fire','mortar','poison'], '⭐燃烧大地', '溅射范围 ×1.4，区域内燃烧 + 中毒');
  add(['mortar','phys','thunder'], '⭐电磁风暴', '无视全部护甲，伤害 +50%，溅射 ×1.4');
  add(['fire','ice','mortar'], '⭐冰火爆裂', '溅射范围 ×1.6，区域内敌人减速');
  add(['ice','phys','sniper'], '⭐破冰穿甲', '无视护甲 + 冻结 + 暴击率 +25%');
  add(['fire','phys','sniper'], '⭐熔金狙击', '对有甲目标 ×1.6，暴击率 +20%');
  add(['poison','thunder','sniper'], '⭐腐蚀雷狙', '无视护甲，中毒伤害 ×2');
  add(['ice','mortar','poison'], '⭐霜毒轰炸', '溅射范围内中毒 + 减速');
  add(['fire','ice','sniper'], '⭐冰火狙击', '伤害 +60%，冻结 + 暴击率 +15%');
  add(['fire','poison','sniper'], '⭐毒火狙击', '伤害 +35%，燃烧 + 中毒 ×1.8');
  add(['ice','poison','thunder'], '⭐雷霜毒', '伤害 +40%，减速 ×2 + 中毒 ×1.7');
  add(['phys','poison','sniper'], '⭐腐蚀穿甲', '无视护甲，中毒伤害 ×1.9');
  /* 四元素（8 种具名 + 其余走保底） */
  add(['fire','ice','sniper','thunder'], '🌌元素洪流', '伤害 +110%、攻速 +35%、冻结 + 暴击 +20%');
  add(['fire','ice','mortar','poison'], '🌌灾厄领域', '溅射 ×1.7，燃烧 + 中毒 + 减速全附');
  add(['mortar','phys','sniper','thunder'], '🌌战争矩阵', '无视护甲，伤害 +80%，溅射 ×1.5');
  add(['fire','ice','poison','thunder'], '🌌四相漩涡', '伤害 +85%，中毒 ×1.8，减速 ×2');
  add(['fire','ice','phys','sniper'], '🌌绝对猎杀', '无视护甲，暴击 +30%，冻结，伤害 +70%');
  add(['fire','poison','thunder','sniper'], '🌌雷火毒狙', '伤害 +90%，中毒 ×2，攻速 +25%');
  add(['ice','mortar','poison','thunder'], '🌌霜雷毒爆', '溅射 ×1.5，中毒 + 减速，伤害 +50%');
  add(['fire','mortar','phys','sniper'], '🌌重炮矩阵', '溅射 ×1.5，破甲 ×1.7，暴击 +20%');
  RESO_NAMED['fire+ice'] = RESO_NAMED['fire+ice'];   /* 占位：保持结构清晰 */
}
function bookResoCard(row, idx){""", '组合枚举与命名表')

# ③ 图鉴共鸣页改成「可折叠树状分组」
rep("""  if (bookTab === 'reso'){
    for (i = 0; i < RESO_LIST.length; i++) h += bookResoCard(RESO_LIST[i], i);
  } else if (bookTab === 'buff'){""",
"""  if (bookTab === 'reso'){
    /* ===== v8.16 树状分组：点哪个看哪个，也能一键全部展开 ===== */
    if (!RESO_NAMED['fire+ice']) buildResoNamed();
    if (typeof resoOpenGroups === 'undefined') var resoOpenGroups = null;
    var groups = [
      { key:'special', title:'✨ 特殊共鸣（共振 / 增幅场）', items: RESO_LIST.filter(function(r){ return r[1] === '共振' || r[1] === '增幅场'; }) },
      { key:'two',   title:'🔗 两两共鸣',  combos: resoAllCombos(2) },
      { key:'three', title:'⭐ 三元素共鸣', combos: resoAllCombos(3) },
      { key:'four',  title:'🌌 四元素共鸣', combos: resoAllCombos(4) }
    ];
    if (resoOpenGroups === null){
      /* 默认只展开「两两共鸣」，其余收起 —— 不把 100+ 条堆在一屏 */
      resoOpenGroups = { special:false, two:true, three:false, four:false };
    }
    var allOpen = resoOpenGroups.special && resoOpenGroups.two && resoOpenGroups.three && resoOpenGroups.four;
    h += '<button class="btn" id="resoAllBtn" style="padding:8px 12px;font-size:12.5px;width:100%;margin-bottom:6px;'
       + 'border-color:rgba(140,200,255,.5);background:rgba(24,44,74,.9);color:#9fd0ff;">'
       + (allOpen ? '📕 全部收起' : '📖 全部展开（把 100+ 种组合一次看完）') + '</button>';
    groups.forEach(function(g){
      var open = !!resoOpenGroups[g.key];
      var cnt = g.items ? g.items.length : g.combos.length;
      h += '<button class="btn" data-reso-group="' + g.key + '" style="padding:9px 12px;font-size:13px;width:100%;'
        + 'text-align:left;margin-top:5px;border-color:rgba(120,180,255,.35);background:rgba(20,32,54,.85);color:#9fc4f0;">'
        + (open ? '▼ ' : '▶ ') + g.title + '<span style="float:right;font-size:11px;color:#7d8ba3;">' + cnt + ' 种</span></button>';
      if (!open) return;
      if (g.items){
        for (i = 0; i < g.items.length; i++) h += bookResoCard(g.items[i], i);
      } else {
        for (i = 0; i < g.combos.length; i++){
          var c = g.combos[i];
          var ic = c.map(resoIconOf).join(' + ');
          var nm = resoNameOf(c);
          h += bookResoCard([ic, nm[0], nm[1]], i);
        }
      }
    });
  } else if (bookTab === 'buff'){""", '图鉴树状分组')
rep("""  bookRenderTabs();
}""",
"""  /* v8.16：树状分组与「全部展开」的点击 */
  var list2 = document.getElementById('bookList');
  if (list2 && list2.addEventListener && !list2._resoBound){
    list2._resoBound = true;
    list2.addEventListener('click', function(ev){
      var b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!b) return;
      ev.stopPropagation();
      if (b.id === 'resoAllBtn'){
        var all = resoOpenGroups && resoOpenGroups.special && resoOpenGroups.two && resoOpenGroups.three && resoOpenGroups.four;
        resoOpenGroups = { special:!all, two:!all, three:!all, four:!all };
        bookRender(); return;
      }
      if (b.dataset && b.dataset.resoGroup){
        resoOpenGroups = resoOpenGroups || { special:false, two:true, three:false, four:false };
        resoOpenGroups[b.dataset.resoGroup] = !resoOpenGroups[b.dataset.resoGroup];
        bookRender(); return;
      }
    });
  }
  bookRenderTabs();
}""", '树状分组点击')
rep("""      : (bookTab === 'reso') ? ('共 ' + RESO_LIST.length + ' 种共鸣组合 · 相邻摆放即触发')""",
"""      : (bookTab === 'reso') ? ('共 ' + (7 * 6 / 2 + 35 + 35) + ' 种组合（2/3/4 元素）· 点分组标题展开')""", '图鉴副标题')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.16 四元素 + 树状图鉴补丁完成 ---')
