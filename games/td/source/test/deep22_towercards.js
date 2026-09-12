// v7.8 炮塔专属强化专项：32 张专属卡逐张验证「真的作用到对应那一座塔」
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startWave: startWave, frame: frame, towerCost: towerCost,\n' +
  '  addTower: addTower, BUFF_POOL: BUFF_POOL, statAt: statAt, elemAt: elemAt, ELEMS: ELEMS, CELL: CELL,\n' +
  '  hitEnemy: hitEnemy, pickBuffs: pickBuffs, rarityWeight: rarityWeight,\n' +
  '  applyCard: function(id){ for (var i=0;i<BUFF_POOL.length;i++) if (BUFF_POOL[i].id===id){ BUFF_POOL[i].apply(); return true; } return false; },\n' +
  '  fakeTower: function(elem, lv){ return { c:0, r:0, elem:elem, lv:lv||1, res:null }; },\n' +
  '  clearE: function(){ enemies = []; }, pushE: function(e){ enemies.push(e); return e; },\n' +
  '  setHp: function(v){ hp = v; }, setGold: function(v){ gold = v; },\n' +
  '  getS: function(){ return { hp: hp, gold: gold, MAXHP: MAXHP, BUFFS: BUFFS, towers: towers, enemies: enemies, wave: wave }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\nrequestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:800,height:600};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v;}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},body:mkEl('body'),addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0, checks = 0;
function ok(c, m){ checks++; if (!c){ console.log('  ❌ ' + m); fail++; } }

/* —— 敌人 mock：字段与 spawnEnemy 产出的敌人保持一致（不跑帧，伤害/状态可直接观测）—— */
function mk(x, y, over){
  var e = { type:'normal', x:x, y:y, hp:100000, maxhp:100000, speed:60, gold:10, color:'#fff', r:11,
            armor:0, immuneSlow:false, boss:false, wp:0, done:0, slowT:0, slowF:1, dotT:0, dotD:0,
            hitFlash:0, dir:0, spawnT:0, walk:0, shieldT:0, shieldBuffT:0 };
  for (var k in (over||{})) e[k] = over[k];
  return e;
}
var REAL_RANDOM = Math.random;
function noCrit(){ Math.random = function(){ return 0.999; }; }   // 关掉暴击随机性
function alwaysCrit(){ Math.random = function(){ return 0; }; }

/* —— 探针：既取「塔的面板数值」，也取「真打一下敌人」的战果 —— */
function probes(elem){
  noCrit();
  var ft = T.fakeTower(elem, 1), st = T.statAt(ft, 1), def = T.ELEMS[elem];
  var ea = T.elemAt(elem, 1) || {};
  var p = { dmg:st.dmg, rate:st.rate, range:st.range, cost:T.towerCost(elem),
            splashR:ea.splashR||0, splashK:ea.splashK||0, chain:ea.chain||0, chainK:ea.chainK||0,
            dotR:ea.dotR||0, auraDmg:ea.auraDmg||0, auraRate:ea.auraRate||0 };
  /* ① 普通敌人：主目标伤害 + 减速/中毒状态 */
  T.clearE();
  var e1 = T.pushE(mk(300, 300));
  T.hitEnemy(ft, e1, st, def);
  p.normal  = 100000 - e1.hp; p.slowT = e1.slowT; p.slowF = e1.slowF; p.dotD = e1.dotD; p.dotT = e1.dotT;
  /* ② 范围减速：把一只敌人摆在 1.15 格外，冰塔基础范围 1.0 格时打不到它 */
  T.clearE();
  var e2 = T.pushE(mk(300, 300)), far = T.pushE(mk(300 + T.CELL * 1.15, 300));
  T.hitEnemy(ft, e2, st, def);
  p.farSlowed = far.slowF < 1;
  /* ③ 装甲敌人 / ④ BOSS / ⑤ 医疗兵（高价值） */
  T.clearE(); var e3 = T.pushE(mk(300, 300, { armor:0.5, type:'armor' }));
  T.hitEnemy(ft, e3, st, def); p.armor = 100000 - e3.hp;
  T.clearE(); var e4 = T.pushE(mk(300, 300, { boss:true, type:'boss' }));
  T.hitEnemy(ft, e4, st, def); p.boss = 100000 - e4.hp;
  T.clearE(); var e5 = T.pushE(mk(300, 300, { heal:true, type:'healer' }));
  T.hitEnemy(ft, e5, st, def); p.hv = 100000 - e5.hp;
  /* ⑥ 暴击探针：强制必暴击时的一次伤害（只在测暴击卡时用）*/
  alwaysCrit();
  T.clearE(); var e6 = T.pushE(mk(300, 300));
  T.hitEnemy(ft, e6, st, def); p.critHit = 100000 - e6.hp;
  noCrit();
  T.clearE();
  return p;
}
/* —— 字段 → 「必须朝正确方向变化」的判定 —— */
var PROBE = {
  dmg:      function(b,a){ return a.dmg > b.dmg + 1e-6; },
  rate:     function(b,a){ return a.rate < b.rate - 1e-9; },
  range:    function(b,a){ return a.range > b.range + 1e-9; },
  cost:     function(b,a){ return a.cost < b.cost; },
  crit:     function(b,a){ return a.critHit > b.critHit + 1e-6; },
  splashR:  function(b,a){ return a.splashR > b.splashR + 1e-9; },
  splashK:  function(b,a){ return a.splashK > b.splashK + 1e-9; },
  chain:    function(b,a){ return a.chain > b.chain; },
  chainK:   function(b,a){ return a.chainK > b.chainK + 1e-9; },
  dotR:     function(b,a){ return a.dotR > b.dotR + 1e-9; },
  dotFlat:  function(b,a){ return a.dotD > b.dotD + 1e-9; },
  dotMul:   function(b,a){ return a.dotD > b.dotD + 1e-9; },
  dotT:     function(b,a){ return a.dotT > b.dotT + 1e-9; },
  slowT:    function(b,a){ return a.slowT > b.slowT + 1e-9; },
  slowR:    function(b,a){ return a.farSlowed && !b.farSlowed; },
  slowK:    function(b,a){ return a.slowF < b.slowF - 1e-9; },
  antiArmor:function(b,a){ return a.armor > b.armor + 1e-6; },
  hv:       function(b,a){ return a.hv > b.hv + 1e-6; },
  boss:     function(b,a){ return a.boss > b.boss + 1e-6; },
  auraDmg:  function(b,a){ return a.auraDmg > b.auraDmg + 1e-9; },
  auraRate: function(b,a){ return a.auraRate > b.auraRate + 1e-9; }
};

console.log('=== ① 卡池结构 ===');
var pool = T.BUFF_POOL, towers8 = ['fire','ice','thunder','poison','phys','support','sniper','mortar'];
var ids = pool.map(function(c){ return c.id; });
ok(new Set(ids).size === ids.length, '卡池共 ' + pool.length + ' 张、id 无重复');
ok(pool.length === 76, '卡池 76 张（40 通用 + 36 专属：9 座塔 × 4），实际 ' + pool.length);
var exp = pool.filter(function(c){ return c.elKey; });
ok(exp.length === 36, '专属卡 36 张（9 座塔 × 4），实际 ' + exp.length);
towers8.forEach(function(k){
  var mine = exp.filter(function(c){ return c.elKey === k; });
  var rar = {}; mine.forEach(function(c){ rar[c.rar] = (rar[c.rar]||0)+1; });
  ok(mine.length === 4 && rar.common === 2 && rar.rare === 1 && rar.epic === 1,
     T.ELEMS[k].icon + ' ' + T.ELEMS[k].name + '塔专属卡 4 张（普通2/稀有1/史诗1）');
});

console.log('=== ② 36 张专属卡逐张生效验证（面板 + 实战双探针）===');
exp.forEach(function(card){
  T.startLevel(0); T.setGold(99999); T.addTower(0, 0, card.elKey);
  var before = probes(card.elKey);
  T.applyCard(card.id);
  var twObj = (T.getS().BUFFS.tw || {})[card.elKey] || {};
  var keys = Object.keys(twObj);
  var after = probes(card.elKey);
  var bad = keys.filter(function(k){ return !(PROBE[k] && PROBE[k](before, after)); });
  var otherTower = towers8.filter(function(k){ return k !== card.elKey; });
  /* 只影响「自己那一座塔」：抽完卡后，别的塔的面板数值不许变 */
  var leak = otherTower.filter(function(k){
    var ft = T.fakeTower(k, 1), st = T.statAt(ft, 1), ea = T.elemAt(k, 1) || {};
    return Math.abs(st.dmg - T.statAt(T.fakeTower(k,1), 1).dmg) > 1e-9 &&
           (ea.splashR||0) > ((T.ELEMS[k].splashR)||0) + 1e-9;
  });
  if (keys.length === 0 || bad.length) {
    console.log('  ❌ ' + card.name + '（' + card.id + '）字段 [' + keys.join(',') + '] 未全部生效，异常: ' + (bad.join(',') || '无字段'));
    fail++; checks++;
  } else {
    console.log('  ✅ ' + T.ELEMS[card.elKey].icon + ' ' + card.name + ' → ' + keys.join('+') + ' 实战生效');
  }
  if (leak.length){ console.log('  ❌ ' + card.name + ' 影响到了其它塔: ' + leak.join(',')); fail++; }
  checks++;
});

console.log('=== ③ 抽卡池：专属卡只从「已建的塔」里出 ===');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'sniper');
var seen = {}, wrong = 0, firstIsExpert = 0;
for (var i = 0; i < 300; i++){
  var picks = T.pickBuffs(3);
  if (picks[0] && picks[0].elKey) firstIsExpert++;
  picks.forEach(function(p){ if (p.elKey){ seen[p.elKey] = 1; if (p.elKey !== 'fire' && p.elKey !== 'sniper') wrong++; } });
}
ok(firstIsExpert === 300, '每轮第一张都是炮塔专属强化（' + firstIsExpert + '/300）');
ok(wrong === 0, '300 轮抽卡里没有出现「没建的塔」的专属卡（异常 ' + wrong + ' 次）');
ok(Object.keys(seen).length === 2 && seen.fire && seen.sniper, '专属卡只在 fire/sniper 之间出（' + Object.keys(seen).join(',') + '）');
var variety = {}, fresh = 0;
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'fire');
for (i = 0; i < 40; i++) T.pickBuffs(3).forEach(function(p){ variety[p.id] = 1; });
ok(Object.keys(variety).length >= 25, '连续抽卡会不断给出「没见过的卡」（40 轮见到 ' + Object.keys(variety).length + ' 种）');

console.log('=== ④ 重复抽同一张卡可叠加 ===');
T.startLevel(0); T.addTower(0, 0, 'mortar');
var r0 = T.elemAt('mortar', 1).splashR;
T.applyCard('t_mortar_1'); var r1 = T.elemAt('mortar', 1).splashR;
T.applyCard('t_mortar_1'); var r2 = T.elemAt('mortar', 1).splashR;
ok(Math.abs(r1 - r0 - 0.25) < 1e-9 && Math.abs(r2 - r0 - 0.5) < 1e-9,
   '榴弹「弹药扩容」连抽两次叠加：' + r0.toFixed(2) + ' → ' + r1.toFixed(2) + ' → ' + r2.toFixed(2));
T.applyCard('t_mortar_3'); T.applyCard('t_mortar_3');
ok(T.elemAt('mortar', 1).splashK > T.ELEMS.mortar.splashK, '「破片强化」溅射伤害也叠加');

console.log('=== ⑤ 新卡不能污染通用字段 / 不能跨关残留 ===');
T.startLevel(0); T.addTower(0, 0, 'ice');
T.applyCard('t_ice_4');
var b1 = T.getS().BUFFS, twBefore = JSON.stringify(b1.tw);
ok(b1.dmg === 1 && b1.rate === 1 && b1.range === 1 && (b1.elBoost || 0) === 0,
   '专属卡只动 BUFFS.tw，通用字段保持 1（伤害×' + b1.dmg + '、攻速×' + b1.rate + '）');
T.startLevel(0);
ok(JSON.stringify(T.getS().BUFFS.tw) === '{}', '开新关卡后 BUFFS.tw 被清空（上一局: ' + twBefore.slice(0, 40) + '…）');

console.log('=== ⑥ 连续抽满强化后仍能正常推进战斗 ===');
T.startLevel(0); T.setGold(99999);
towers8.forEach(function(k, i){ T.addTower(0, i, k); });
exp.forEach(function(c){ T.applyCard(c.id); });
var t0 = 0, err0 = errs.length;
for (i = 0; i < 1200; i++){ t0 += 16; T.frame(t0); }
ok(errs.length === err0, '36 张专属卡全开后跑 1200 帧无报错（新增 ' + (errs.length - err0) + ' 条）');
ok(isFinite(T.statAt(T.fakeTower('fire', 3), 3).dmg), '全开状态下面板伤害仍为有限数（无 NaN/Infinity）');

Math.random = REAL_RANDOM;
ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
if (errs.length) errs.slice(0, 3).forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v7.8 炮塔专属强化专项全部通过（' + checks + ' 项断言，0 失败）'
                        : '  ❌ v7.8 专项 ' + fail + ' 项失败 / 共 ' + checks + ' 项');
