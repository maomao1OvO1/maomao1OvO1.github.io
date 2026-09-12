// 诊断：v7.4 新卡是否真的生效（修复无人机 / 金库利息 / 塔位折扣 / 穿甲弹芯）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, startWave: startWave, frame: frame,\n' +
  '  towerCost: towerCost, addTower: addTower, BUFF_POOL: BUFF_POOL, BUFFSref: function(){ return BUFFS; },\n' +
  '  setHp: function(v){ hp = v; }, setGold: function(v){ gold = v; },\n' +
  '  applyCard: function(id){ for (var i=0;i<BUFF_POOL.length;i++) if (BUFF_POOL[i].id===id){ BUFF_POOL[i].apply(); return true; } return false; },\n' +
  '  getS: function(){ return { hp: hp, gold: gold, wave: wave, MAXHP: MAXHP, BUFFS: BUFFS, towers: towers }; },\n' +
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
eval(code);
var T = global.window.__T;

console.log('=== ① 修复无人机（每波开始回血）===');
T.startLevel(0);
ok(T.applyCard('regen'), '抽到「修复无人机」并应用 → BUFFS.regen = ' + T.getS().BUFFS.regen);
T.setHp(10);
var hp0 = T.getS().hp;
T.startWave();
var hp1 = T.getS().hp;
console.log('   第 10 血 → 开新波后 = ' + hp1 + '（期望 12）');
console.log('   ' + (hp1 === hp0 + 2 ? '✅ 生效' : '❌ 没生效'));

console.log('=== ② 金库利息（每波结束按金币结算）===');
T.startLevel(0);
T.applyCard('bank');
T.setGold(1000);
console.log('   BUFFS.interest = ' + T.getS().BUFFS.interest + '（期望 0.08）');
// 模拟波次结束（清空敌人 → 跑帧触发结算）
var CLK = 5e7, g0 = T.getS().gold;
for (var i = 0; i < 6; i++){ T.frame(CLK += 16.7); }
console.log('   注意：利息在「一波打完」时结算，需实战验证（当前金币 ' + T.getS().gold + '）');

console.log('=== ③ 塔位折扣（建塔 -10%）===');
T.startLevel(0);
var c0 = T.towerCost('fire');
T.applyCard('cost');
var c1 = T.towerCost('fire');
console.log('   火塔原价 ' + c0 + ' → 折扣后 ' + c1 + '（期望约 -10%）');
console.log('   ' + (c1 < c0 ? '✅ 生效' : '❌ 没生效'));

console.log('=== ④ 穿甲弹芯（无视 50% 护甲）===');
T.startLevel(0);
T.applyCard('pierce');
console.log('   BUFFS.pierceAdd = ' + T.getS().BUFFS.pierceAdd + '（期望 0.5）');

console.log('=== ⑤ 卡池与稀有度 ===');
var byRar = {};
T.BUFF_POOL.forEach(function(b){ byRar[b.rar] = (byRar[b.rar] || 0) + 1; });
console.log('   卡池共 ' + T.BUFF_POOL.length + ' 张：' + JSON.stringify(byRar));
console.log('   无稀有度的卡：' + T.BUFF_POOL.filter(function(b){ return !b.rar; }).length + ' 张');
if (errs.length) console.log('运行时报错：' + errs.slice(0,2).join(' | '));
function ok(c, m){ console.log((c ? '  ✅ ' : '  ❌ ') + m); }
