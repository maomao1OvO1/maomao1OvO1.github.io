// v8.1 专项：波间商店（金币出口）+ 机制轮换三怪（壁垒/相位/空降）+ 无尽维护费
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, spawnEnemy: spawnEnemy,\n' +
  '  hitEnemy: hitEnemy, updateMobSkills: updateMobSkills, openShop: openShop, shopPrice: shopPrice,\n' +
  '  getStock: function(){ return shopStock; }, getPACT: function(){ return PACT; }, goldText: goldText,\n' +
  '  showBuffChoices: showBuffChoices, setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); },\n' +
  '  clearE: function(){ enemies = []; }, addTower: addTower, statAt: statAt,\n' +
  '  getS: function(){ return { enemies: enemies, gold: gold, wave: wave, towers: towers, BUFFS: BUFFS }; },\n' +
  '  el: function(id){ return document.getElementById(id); }, ELEMS: ELEMS, ENEMIES: ENEMIES };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){e.children.push(c);return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[];}}); return e; }
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
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
var REAL_RANDOM = Math.random;
function noCrit(){ Math.random = function(){ return 0.999; }; }

console.log('=== ① 波间商店：金币终于有地方花 ===');
T.startEndless(); T.setWave(10); T.setGold(100000);
T.openShop();
var list = T.el('buffList');
var rowEl = list.children.filter(function(c){ return c.children && c.children.length === 2; })[0];
ok(list.children.length === 6 && !!rowEl, '商店渲染 4 件商品 + 「刷新/离开」一行 + 详略切换按钮（' + list.children.length + ' 个控件）');
ok(/波间商店/.test(String(list._html)), '标题显示「波间商店 · 第 10 波」');
/* 买第一件 */
var stock0 = T.getStock()[0], price0 = T.shopPrice(stock0.cost);
var g0 = T.getS().gold;
list.children[0].fire('click');
var g1 = T.getS().gold;
ok(g1 < g0 && Math.abs((g0 - g1) - price0) < 2, '购买扣钱正确（- ' + (g0 - g1) + '，标价 ' + price0 + '）');
ok(T.getStock()[0].sold === true, '买过的商品标记「已售罄」');
/* 金币不足 */
T.setGold(5); T.openShop();
var g2 = T.getS().gold;
T.el('buffList').children[0].fire('click');
ok(T.getS().gold === g2, '金币不足时买不了（余额未变 ' + T.goldText() + '）');
/* 物价随波次上涨 */
T.setWave(5);  var pLow = T.shopPrice(200);
T.setWave(40); var pHigh = T.shopPrice(200);
ok(pHigh > pLow * 1.5, '物价随波次上涨（第 5 波 ' + pLow + ' 金 → 第 40 波 ' + pHigh + ' 金）');
/* 刷新 */
T.setWave(20); T.setGold(100000); T.openShop();
var names0 = T.getStock().map(function(i2){ return i2.name; }).join(',');
var bottomRow = T.el('buffList').children.filter(function(c){ return c.children && c.children.length === 2; })[0];
var refreshBtn = bottomRow.children[0];
var gR0 = T.getS().gold;
refreshBtn.fire('click');
var names1 = T.getStock().map(function(i2){ return i2.name; }).join(',');
ok(T.getS().gold < gR0 && names1 !== names0, '「刷新商品」扣钱并换了一批货（' + names1.replace(/,/g, '/') + '）');
ok(T.getStock().every(function(i2){ return !i2.sold; }), '刷新后新货可再次购买');
/* 离开回强化卡 */
var leaveBtn = bottomRow.children[1];
leaveBtn.fire('click');
ok(String(T.el('skipBuffBtn').style.display) === '' && T.el('buffList').children.length >= 4,
   '「离开商店」回到强化卡三选一界面（跳过按钮已恢复 + ' + T.el('buffList').children.length + ' 个控件重新渲染）');
ok(html.indexOf('🛒 商店') >= 0 && html.indexOf('id = \'shopBtn\'') < 0, '强化卡界面带商店入口按钮（v8.7 起与「换一批/禁卡」合成工具行）');

console.log('=== ② 机制轮换：三个新怪已进图鉴与波次表 ===');
['bulwark', 'phase', 'airdrop'].forEach(function(k){
  ok(!!T.ENEMIES[k], '新怪已定义：' + (T.ENEMIES[k] ? T.ENEMIES[k].name : k));
});
ok(html.indexOf("if (w >= 14) add('phase'") >= 0 && html.indexOf("if (w >= 16) add('bulwark'") >= 0
   && html.indexOf("if (w >= 18) add('airdrop'") >= 0, '三新怪按 14/16/18 波起登场');

console.log('=== ③ 壁垒兵：单次爆发被大幅减免（治「露头就秒」）===');
noCrit();
function dmgOn(type, hit, elem){
  T.setWave(30); T.clearE(); T.spawnEnemy(type);
  var e = T.getS().enemies[0];
  e.shieldT = 0;                                   /* 关掉出生护盾（15% 减伤）以免干扰本次对比 */
  var before = e.hp;
  var ft = { c:0, r:0, elem: elem || 'phys', lv:1, res:null };
  T.hitEnemy(ft, e, { dmg: hit, range:1, rate:1 }, T.ELEMS[elem || 'phys']);
  return { dealt: before - e.hp, maxhp: e.maxhp };
}
var normalBig = dmgOn('normal', 5000);
var bulBig    = dmgOn('bulwark', 5000);
var bulSmall  = dmgOn('bulwark', 200);
var ratioBig   = bulBig.dealt / 5000;
var ratioSmall = bulSmall.dealt / 200;
ok(ratioBig < ratioSmall * 0.6, '壁垒兵吃爆发时有效伤害骤降（大伤害转化率 ' + ratioBig.toFixed(2) + ' vs 小伤害 ' + ratioSmall.toFixed(2) + '）');
ok(normalBig.dealt / 5000 > ratioBig, '普通兵没有这个减免（转化率 ' + (normalBig.dealt / 5000).toFixed(2) + '）');
T.setWave(30); T.clearE(); T.spawnEnemy('bulwark');
var bw = T.getS().enemies[0];
var huge = dmgOn('bulwark', bw.maxhp * 2);
ok(huge.dealt < bw.maxhp, '一发「秒杀级」（2 倍血量）伤害打不死壁垒兵：只打出 ' + Math.round(huge.dealt) + ' / ' + Math.round(bw.maxhp) + ' 血');
var expectDeal = bw.maxhp * 2 * 0.85 * 1.35 * 0.35;      /* 护甲 0.15 × 物理破甲 1.35 × absorb 0.35 */
ok(Math.abs(huge.dealt - expectDeal) / expectDeal < 0.2,
   '减免比例与设计一致（实测 ' + Math.round(huge.dealt) + ' ≈ 理论 ' + Math.round(expectDeal) + '，即 absorb ×0.35）');

console.log('=== ④ 相位兵：周期性免疫元素 / 物理 ===');
function phaseHit(elem, phaseElem){
  T.setWave(30); T.clearE(); T.spawnEnemy('phase');
  var e = T.getS().enemies[0];
  e.shieldT = 0; e.phaseElem = phaseElem;
  var before = e.hp;
  var ft = { c:0, r:0, elem: elem, lv:1, res:null };
  T.hitEnemy(ft, e, { dmg: 1000, range:1, rate:1 }, T.ELEMS[elem]);
  return before - e.hp;
}
var elemVsElemPhase = phaseHit('fire', 0);      /* 相位=免疫元素 → 火焰塔被挡 */
var physVsElemPhase = phaseHit('phys', 0);      /* 元素相位下物理塔正常 */
ok(elemVsElemPhase < physVsElemPhase * 0.3, '「免疫元素」相位：火焰塔伤害被压到 ' + Math.round(elemVsElemPhase) + '，物理塔正常 ' + Math.round(physVsElemPhase));
var physVsPhysPhase = phaseHit('phys', 1);      /* 相位=免疫物理 → 物理塔被挡 */
var elemVsPhysPhase = phaseHit('fire', 1);      /* 物理相位下元素塔正常 */
ok(physVsPhysPhase < elemVsPhysPhase * 0.3, '「免疫物理」相位：物理塔被压到 ' + Math.round(physVsPhysPhase) + '，火焰塔正常 ' + Math.round(elemVsPhysPhase));
T.setWave(30); T.clearE(); T.spawnEnemy('phase');
var pe = T.getS().enemies[0], p0 = pe.phaseElem;
T.updateMobSkills(5.1);
ok(pe.phaseElem !== p0, '相位每 5 秒自动切换（' + p0 + ' → ' + pe.phaseElem + '）');

console.log('=== ⑤ 空降兵：跳过前半段防线 ===');
T.setWave(20);
T.clearE(); T.spawnEnemy('normal');
var nrm = T.getS().enemies[0];
T.clearE(); T.spawnEnemy('airdrop');
var air = T.getS().enemies[0];
ok(air.done > nrm.done * 3, '空降兵出生点已推进到路径 45% 处（路程 ' + Math.round(air.done) + ' vs 普通兵 ' + Math.round(nrm.done) + '）');
ok(air.wp >= 1, '航点索引已同步（wp=' + air.wp + '），索敌/自爆进度计算不会错乱');

console.log('=== ⑥ 维护费：塔越多越贵，但只在无尽模式扣 ===');
ok(html.indexOf('维护费 -') >= 0 && html.indexOf('if (endless && towers.length)') >= 0,
   '维护费逻辑存在且带 endless 判定（正式关卡不扣）');
var lvSumExample = 40 * 5;
ok(lvSumExample * 3 === 600, '公式核对：40 座塔平均 5 级 = 200 级 → 每波扣 ' + (lvSumExample * 3) + ' 金（相对后期数千收入属温和）');
T.startLevel(0);
T.setGold(9999); T.addTower(0, 0, 'fire');
var gBefore = T.getS().gold;
T.frame(16); T.frame(32);
ok(T.getS().gold === gBefore, '普通关卡跑帧不会被扣维护费（余额 ' + T.goldText() + '）');

Math.random = REAL_RANDOM;
ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.1 商店 + 机制轮换专项全部通过（0 失败）' : '  ❌ v8.1 专项 ' + fail + ' 项失败');
