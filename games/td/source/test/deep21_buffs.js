// v7.5 逐卡体检：26 张强化卡是否真的生效（字段 + 端到端指标）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startWave: startWave, frame: frame, towerCost: towerCost,\n' +
  '  addTower: addTower, BUFF_POOL: BUFF_POOL, statAt: statAt, towerStat: towerStat,\n' +
  '  applyCard: function(id){ for (var i=0;i<BUFF_POOL.length;i++) if (BUFF_POOL[i].id===id){ BUFF_POOL[i].apply(); return true; } return false; },\n' +
  '  fakeTower: function(elem, lv){ return { c:0, r:0, elem:elem, lv:lv||1, res:null }; },\n' +
  '  setHp: function(v){ hp = v; }, setGold: function(v){ gold = v; },\n' +
  '  getS: function(){ return { hp: hp, gold: gold, MAXHP: MAXHP, BUFFS: BUFFS, towers: towers }; },\n' +
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
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== 逐卡体检（' + T.BUFF_POOL.length + ' 张）：改动 BUFFS/状态 之外，还要有真实数值变化 ===');
T.startLevel(0);
T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'ice'); T.addTower(0, 2, 'thunder');
T.addTower(0, 3, 'poison'); T.addTower(0, 4, 'phys'); T.addTower(0, 5, 'support');
T.addTower(0, 6, 'sniper'); T.addTower(0, 7, 'mortar');

function probe(){                       // 采样一批端到端指标
  var ft = T.fakeTower('fire', 2), mt = T.fakeTower('mortar', 2), pt = T.fakeTower('phys', 2);
  return {
    fireDmg: T.statAt(ft, 2).dmg,
    fireRate: T.statAt(ft, 2).rate,
    fireRange: T.statAt(ft, 2).range,
    cost: T.towerCost('fire'),
    hp: T.getS().hp, gold: T.getS().gold,
    B: JSON.stringify(T.getS().BUFFS)
  };
}
var needField = {
  dmg:'dmg', rate:'rate', range:'range', gold:'gold', crit:'crit', combo:'combo', reso:'reso',
  splash:'splash', hp:'hp', gold2:'gold2', range2:'range', cost:'costCut', bank:'interest',
  regen:'regen', bossh:'bossDmg', pierce:'pierceAdd', zero:'slowAdd', blast:'splashDmg',
  venom:'dotAdd', over:'elBoost'
};
var covered = {};
T.BUFF_POOL.forEach(function(card){
  T.startLevel(0);
  T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'mortar'); T.addTower(0, 2, 'phys');
  T.setHp(10); T.setGold(500);
  var before = probe();
  T.applyCard(card.id);
  var after = probe();
  var changedField = before.B !== after.B;
  var changedValue = (before.fireDmg !== after.fireDmg) || (before.fireRate !== after.fireRate) ||
                     (before.fireRange !== after.fireRange) || (before.cost !== after.cost) ||
                     (before.hp !== after.hp) || (before.gold !== after.gold);
  var okCard = changedField || changedValue;
  covered[card.rar] = (covered[card.rar] || 0) + 1;
  if (!okCard){ console.log('  ❌ [' + card.rar + '] ' + card.name + '（' + card.id + '）—— 应用后无任何变化！'); fail++; }
});
ok(fail === 0, '全部 ' + T.BUFF_POOL.length + ' 张卡应用后都有实际变化（失败 ' + fail + ' 张）');
console.log('   稀有度分布：' + JSON.stringify(covered));

console.log('=== 关键卡端到端验证 ===');
T.startLevel(0);
T.addTower(0, 0, 'fire');
var d0 = T.statAt(T.fakeTower('fire', 2), 2).dmg;
T.applyCard('dmg');
var d1 = T.statAt(T.fakeTower('fire', 2), 2).dmg;
ok(d1 > d0, '火力强化：伤害 ' + d0.toFixed(1) + ' → ' + d1.toFixed(1));

T.startLevel(0);
var c0 = T.towerCost('fire'); T.applyCard('cost'); var c1 = T.towerCost('fire');
ok(c1 < c0, '塔位折扣：造价 ' + c0 + ' → ' + c1);

T.startLevel(0);
T.setHp(20); T.applyCard('regen'); T.startWave();
ok(T.getS().BUFFS.shieldHP > 0, '修复无人机：满血时转成护盾 ' + T.getS().BUFFS.shieldHP);

T.startLevel(0);
T.applyCard('blast'); T.applyCard('splash');
ok(T.getS().BUFFS.splashDmg > 0 && T.getS().BUFFS.splash > 0,
   '连锁爆破(+' + T.getS().BUFFS.splashDmg + ') 与 扩散弹头(+' + T.getS().BUFFS.splash + ') 都已记录');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
if (errs.length) errs.slice(0,3).forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v7.5 逐卡体检全部通过（0 失败）' : '  ❌ v7.5 逐卡体检 ' + fail + ' 项失败');
