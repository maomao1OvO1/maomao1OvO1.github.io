/* ══════════════════════════════════════════════════════════════════════════
 * 06-upgrades.js —— 升级体系：每座塔的专属成长与四大体系整体加成
 *
 * 来源：game.html 第 2975-3134 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ===== v7.3 升级体系：每座塔有专属成长，四大体系还有整体加成 ===== */
var elemCache = {};                                  // v7.5 缓存：8 座塔 × 6 级，最多 48 项，构造一次后重复使用
/* 取某元素炮塔在指定等级下的全部数值（含等级成长、专属强化、天气与 BUFF 修正）—— 面板与图鉴显示塔属性都走它 */
function elemAt(elem, lv){
  var d = ELEMS[elem]; if (!d) return null;
  var n = Math.max(0, (lv || 1) - 1);
  var tw = twOf(elem);                                  // v7.8 专属强化（可能为 null）
  /* v8.3：雷暴天气的「链弹 +2」也是动态加成 → Lv1 塔同样要走副本分支，不能再提前 return */
  var wxChain = (elem === 'thunder') ? wxEff('thunderChain') : 0;
  /* 雷暴套装也会改 chainK → 同样必须走副本分支（否则 Lv1 塔上的套装效果会被跳过） */
  var setChain = (elem === 'thunder' && setOn('thunder')) ? 1 : 0;
  if (!n && !tw && !wxChain && !setChain) return d;     // 无升级、无专属强化、无天气/套装加成 → 直接用原始定义
  var ck = elem + '#' + (lv || 1) + '#' + twStamp + '#' + weather;   // v8.3 缓存键再加天气（天气变了要重算）
  if (elemCache[ck]) return elemCache[ck];
  var o = {}, k;
  for (k in d) o[k] = d[k];
  o.splashR = (d.splashR || 0) + n * (d.upSplashR || 0);
  o.splashK = (d.splashK || 0) + n * (d.upSplashK || 0);
  if (d.chain) o.chain = Math.round(d.chain + n * (d.upChain || 0));
  if (d.chainK) o.chainK = d.chainK + n * (d.upChainK || 0);
  o.slowT = (d.slowT || 0) + n * (d.upSlowT || 0);
  o.slowR = (d.slowR || 0) + n * (d.upSlowR || 0);
  o.dot = (d.dot || 0) + n * (d.upDot || 0);
  o.dotR = (d.dotR || 0) + n * (d.upDotR || 0);
  o.antiArmor = (d.antiArmor || 0) + n * (d.upAntiArmor || 0);
  o.auraDmg = (d.auraDmg || 0) + n * (d.upAura || 0);
  o.auraRate = (d.auraRate || 0) + n * (d.upAura || 0);
  /* —— v7.8 炮塔专属强化叠加 ——
     这里只叠加「下游真的从 def2 读」的字段（溅射/链弹/毒范围/光环）；
     减速时长、毒伤数值、破甲这类下游读的是原始 def，统一在 hitEnemy 里显式加，避免重复计算 */
  if (tw){
    o.splashR += tw.splashR || 0;
    o.splashK += tw.splashK || 0;
    if (tw.chain) o.chain = Math.round((o.chain || 0) + tw.chain);
    o.chainK = (o.chainK || 0) + (tw.chainK || 0);
    o.dotR = (o.dotR || 0) + (tw.dotR || 0);
    o.auraDmg = (o.auraDmg || 0) + (tw.auraDmg || 0);
    o.auraRate = (o.auraRate || 0) + (tw.auraRate || 0);
  }
  /* v8.3 雷暴天气：雷电塔链弹 +2 个目标 */
  if (elem === 'thunder'){
    var wxc = wxEff('thunderChain'); if (wxc) o.chain = (o.chain || 0) + wxc;
    if (setOn('thunder')) o.chainK = 1;               /* v8.6 雷暴套装：链弹不再衰减 */
  }
  elemCache[ck] = o;
  return o;
}
/* 四大塔体系（solo 单体 / group 群体 / ctrl 控场 / support 支援）的中文名 */
var SYS_NAME = { solo:'单体体系', group:'群体体系', ctrl:'控场体系', support:'支援体系' };
/* 各体系的等级里程碑与加成幅度：{lv 该体系塔等级总和, bonus 对应加成}，从低到高逐档叠加 */
var SYS_TIER = {
  solo:    [ { lv:5, bonus:0.08 }, { lv:10, bonus:0.16 }, { lv:16, bonus:0.25 } ],
  group:   [ { lv:5, bonus:0.10 }, { lv:10, bonus:0.20 }, { lv:16, bonus:0.32 } ],
  ctrl:    [ { lv:5, bonus:0.12 }, { lv:10, bonus:0.24 }, { lv:16, bonus:0.36 } ],
  support: [ { lv:3, bonus:0.15 }, { lv:6, bonus:0.30 }, { lv:10, bonus:0.50 } ]
};
/* 统计某体系（单体/群体/控场/支援）所有塔的等级总和，用于体系加成强度 */
function sysLevel(sys){
  var sum = 0;
  for (var i = 0; i < towers.length; i++){
    var d = ELEMS[towers[i].elem];
    if (d && d.sys === sys) sum += (towers[i].lv || 1);
  }
  return sum;
}
/* v7.5 性能：体系加成缓存 —— 原来每次开火都遍历全场塔算等级（O(塔数²)），
   现在只在「棋盘变化」时刷新一次（recalcResonance 末尾 + 开新局），开火时直接读缓存 */
var sysCache = { solo:0, group:0, ctrl:0, support:0 };
/* 重算四大体系的等级总和缓存（建塔/拆塔/升级后调用，避免每帧遍历全场塔）*/
function refreshSysCache(){
  var sum = { solo:0, group:0, ctrl:0, support:0 }, i, k;
  for (i = 0; i < towers.length; i++){
    var d = ELEMS[towers[i].elem];
    if (d && sum[d.sys] !== undefined) sum[d.sys] += (towers[i].lv || 1);
  }
  for (k in sum){
    var t = SYS_TIER[k] || [], b = 0;
    for (i = 0; i < t.length; i++) if (sum[k] >= t[i].lv) b = t[i].bonus;
    sysCache[k] = b;
  }
}
/* 取某体系的加成数值（缓存值即加成系数）*/
function sysBonus(sys){ return sysCache[sys] || 0; }
/* 单体体系（solo）对伤害的加成倍率，非该类塔返回 1 */
function sysDmgMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'solo') ? (1 + sysBonus('solo')) : 1; }
/* 群体体系（group）对射程的加成倍率，非该类塔返回 1 */
function sysRangeMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'group') ? (1 + sysBonus('group')) : 1; }
/* 控场体系（ctrl）对减速/眩晕等控制时长的加成倍率 */
function sysCtrlMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'ctrl') ? (1 + sysBonus('ctrl')) : 1; }
/* 支援体系（support）对光环效果的加成倍率 */
function sysAuraMul(elem){ var d = ELEMS[elem]; return (d && d.sys === 'support') ? (1 + sysBonus('support')) : 1; }
/* 统计某座塔四周辅助塔给它的光环加成（攻击力/攻速）：静默天气下光环失效，每帧由塔开火前调用 */
function auraBonus(t){
  if (wxEff('auraOff')) return { dmg:0, rate:0 };      /* v8.3 静默天气：辅助塔光环失效 */
  var nb = [[1,0],[-1,0],[0,1],[0,-1]], d = 0, r = 0;
  for (var i = 0; i < 4; i++){
    var o = towerAt(t.c + nb[i][0], t.r + nb[i][1]);
    if (!o) continue;
    var od = elemAt(o.elem, o.lv), odBase = ELEMS[o.elem];
    if (odBase && odBase.aura){
      var k = (1 + (o.lv - 1) * 0.4) * (BUFFS.aura || 1) * sysAuraMul(o.elem);
      d += od.auraDmg * k; r += od.auraRate * k;
    }
  }
  return { dmg: d, rate: r };
}
/* 核心数值函数：算出一座塔在指定等级下的最终属性（伤害/攻速/射程），把等级成长、共鸣、专属强化、体系加成、光环与 BUFF 全部叠进去 */
function statAt(t, lv){
  var d = ELEMS[t.elem], lvMul = 1 + (lv - 1) * 0.30;
  /* 注意：res 的新增字段 pierceFull / armorBreak / critAdd / dotMul == 开关或专用参数，
     不是乘区，只在 hitEnemy 里单独处理；这里只取 dmgMul / rangeMul / rateMul 三个倍率 */
  var r = t.res || { dmgMul:1, rateMul:1, rangeMul:1 };
  var resoK = 1 + (r.dmgMul - 1) * BUFFS.reso;
  var elKB = (BUFFS.el && BUFFS.el[t.elem]) ? BUFFS.el[t.elem] : 1;
  var elK = 1 + (elKB - 1) * (1 + (BUFFS.elBoost || 0));      // v7.4 元素超载：专精收益放大
  var au = auraBonus(t);
  if (setOn('support')){ au = { dmg: au.dmg * 1.5, rate: au.rate * 1.5 }; }   /* v8.6 共鸣套装：光环 +50% */
  var upR = (lv - 1) * (d.upRange || 0);                       // 专属射程成长（狙击塔）
  /* v7.8 炮塔专属强化：只影响「这一座塔」的三个基础乘区 */
  var tw = twOf(t.elem);
  var twD = 1 + ((tw && tw.dmg)  || 0),
      twG = 1 + ((tw && tw.range) || 0),
      twS = 1 + ((tw && tw.rate) || 0);
  /* v8.2 随机词条 + 互斥精通分支（都是「这一座塔」级别） */
  var af = t.affix || null, sp = t.spec || null;
  twD *= 1 + ((af && af.dmg)   || 0);
  twG *= 1 + ((af && af.range) || 0);
  twS *= 1 + ((af && af.rate)  || 0);
  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */
  /* v8.5 主动技能：过载（攻速×2.5、伤害×1.5）/ 眩晕（完全停火） */
  if (t.overT > 0){ twD *= 1.5; twS *= 2.5; }
  if (t.stunT > 0){ return { dmg: d.dmg * lvMul * resoK * BUFFS.dmg * elK * twD, range: d.range, rate: 1e9 }; }
  /* v8.3 元素天气：按塔的元素分别加成（有得有失） */
  var hd = wxEff('dmg'); if (hd) twD += hd;
  if (t.elem === 'fire'){ var hfd = wxEff('fireDmg'); if (hfd) twD += hfd;
                          var hfr = wxEff('fireRate'); if (hfr) twS += hfr; }
  if (t.elem === 'sniper'){ var hsr = wxEff('sniperRange'); if (hsr) twG += hsr; }
  var hnp = wxEff('nonPoisonDmg'); if (hnp && t.elem !== 'poison' && !ELEMS[t.elem].aura) twD += hnp;
  if (t.rift) twD += 0.5;      /* v8.21 共鸣裂隙：伤害 +50%（代价是不参与任何共鸣） */
  if (twD < 0.2) twD = 0.2; if (twS < 0.2) twS = 0.2; if (twG < 0.2) twG = 0.2;
  return { dmg:   d.dmg * lvMul * resoK * BUFFS.dmg * elK * (1 + au.dmg) * sysDmgMul(t.elem) * twD,
           range: (d.range + upR) * (1 + (lv - 1) * 0.08) * r.rangeMul * BUFFS.range * twG,
           rate:  d.rate / ((1 + (lv - 1) * 0.12) * r.rateMul * BUFFS.rate * (1 + au.rate) * twS) };
}
/* 取某座塔当前等级的实际属性（面板/绘制射程圈直接用它）*/
function towerStat(t){ return statAt(t, t.lv); }
/* 塔从当前等级升到下一级要花多少金币（按初始造价与等级递增）*/
function upgradeCost(t){ var d = ELEMS[t.elem], base = t.paid || d.cost; return Math.round(base * (0.7 + t.lv * 0.55)); }
/* 拆塔能退回多少金币（累计投入的 60%，刚建 5 秒内走全额退款是另一条路径）*/
function sellValue(t){
  var d = ELEMS[t.elem], base = t.paid || d.cost, spent = base;
  for (var i = 1; i < t.lv; i++) spent += Math.round(base * (0.7 + i * 0.55));
  return Math.round(spent * 0.6);
}
/* 炮塔中心到敌人中心的距离，换算成「格」为单位（射程判定用）*/
function towerDist(t, e){
  return Math.hypot(cx(t.c) - e.x, cy(t.r) - e.y) / CELL;
}

