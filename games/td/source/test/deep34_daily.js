// v8.9 专项：每日挑战（固定种子 / 固定天气 + 修正 / 通关给星核 / 不污染普通局）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startDaily: startDaily, frame: frame, levelClear: levelClear,\n' +
  '  todaySeed: todaySeed, buildDailyMods: buildDailyMods, dailyDesc: dailyDesc, dailyDoneToday: dailyDoneToday,\n' +
  '  WEATHERS: WEATHERS, WEATHER_KEYS: WEATHER_KEYS, LEVELS: LEVELS, starcore: starcore, addStarcore: addStarcore,\n' +
  '  showLevels: showLevels, startWave: startWave, setWave: function(w){ wave = w; }, setHp: function(v){ hp = v; },\n' +
  '  getWeather: function(){ return weather; }, getWLock: function(){ return dailyWeatherLock; },\n' +
  '  getIsDaily: function(){ return isDaily; }, getProg: function(){ return prog; },\n' +
  '  getS: function(){ return { PACT: PACT, MAXHP: MAXHP, hp: hp, wave: wave, lvIndex: lvIndex, BUFFS: BUFFS }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,offsetLeft:0,_hidden:false,_handlers:{},
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
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 种子与挑战规则：同一天完全一致 ===');
var seed = T.todaySeed();
var d = new Date();
var expect = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
ok(seed === expect, '今日种子 = 日期数字 #' + seed + '（同一天所有玩家一致）');
var m1 = T.buildDailyMods(seed), m2 = T.buildDailyMods(seed);
ok(m1.weather === m2.weather && m1.hp === m2.hp && m1.gold === m2.gold && m1.lv === m2.lv,
   '同种子生成的规则完全一致（可复现、可分享）');
ok(T.WEATHER_KEYS.indexOf(m1.weather) >= 0, '天气锁定为 ' + T.WEATHERS[m1.weather].icon + ' ' + T.WEATHERS[m1.weather].name);
ok(m1.hp >= 1 && m1.hp <= 1.4, '敌人血量修正 ×' + m1.hp.toFixed(2));
ok(m1.gold >= 1 && m1.gold <= 1.45, '金币修正 ×' + m1.gold.toFixed(2) + '（给点补偿）');
ok(m1.lv >= 0 && m1.lv < T.LEVELS.length, '挑战关卡：第 ' + (m1.lv + 1) + ' 关 ' + T.LEVELS[m1.lv].name);
ok(/天气锁定/.test(T.dailyDesc(m1)) && /敌人血量/.test(T.dailyDesc(m1)), '一段话描述规则：' + T.dailyDesc(m1));
/* 不同日期会得到不同组合（抽样验证，不是每天都一样） */
var variants = {};
[20260913, 20260914, 20260915, 20260916, 20260917, 20260918, 20260919, 20260920].forEach(function(sd){
  var mm = T.buildDailyMods(sd); variants[mm.weather + '/' + mm.hp.toFixed(2)] = 1;
});
ok(Object.keys(variants).length >= 4, '不同日期组合不同（8 天里出现 ' + Object.keys(variants).length + ' 种规则）');

console.log('=== ② 进入挑战：规则真的套上了 ===');
T.startDaily();
var st = T.getS();
ok(T.getIsDaily() === true, '已进入每日挑战状态');
ok(T.getWLock() === m1.weather, '天气被锁定为 ' + T.WEATHERS[m1.weather].name + '（普通局不受影响）');
ok(Math.abs(st.PACT.hp - m1.hp) < 1e-9, '敌方血量修正已生效（PACT.hp=' + st.PACT.hp.toFixed(2) + '）');
ok(Math.abs(st.PACT.gold - m1.gold) < 1e-9, '金币修正已生效（PACT.gold=' + st.PACT.gold.toFixed(2) + '）');
ok(st.lvIndex === m1.lv, '开的正是种子指定的关卡（第 ' + (st.lvIndex + 1) + ' 关）');
T.setWave(1); T.startWave();
ok(T.getWeather() === m1.weather, '第 1 波天气就被锁定成挑战天气（普通局这里是「平稳」）');
ok(/每日挑战/.test(String(T.el('lvName').textContent)), '顶栏显示挑战标识（' + T.el('lvName').textContent + '）');

console.log('=== ③ 通关奖励：当天首次给「下一局开局金币」，之后不重复（v9.16：星核不再从这里出）===');
T.getProg().daily = null; T.getProg().dailyBonus = 0;
var sc0 = T.starcore();
T.setHp(18);
T.levelClear();
ok(T.starcore() === sc0, '★ v9.16：每日挑战通关**不再给星核**（星核只从无尽模式来）');
var db = T.getProg().dailyBonus;
ok(db >= 300, '首次通关给「下一局开局金币」（剩余 18 血 → +' + db + '）');
ok(T.getProg().daily === String(seed), '记录「今天已领奖」（prog.daily=' + T.getProg().daily + '）');
ok(T.dailyDoneToday() === true, 'dailyDoneToday() = true');
var sc1 = T.starcore();
T.startDaily();                       /* 真实场景：再打一次是重新进入挑战（上一局的奖励金币会在开局发放并清零） */
T.setHp(20);
T.levelClear();
ok(T.starcore() === sc1, '同一天再打不给星核（星核只从无尽来）');
ok(T.getProg().dailyBonus === 0, '同一天再打不再累加奖励（今天已领过 → 不再给）');
ok(/已领过奖励/.test(String(T.el('clearNewRec').textContent)), '界面提示已领过（' + T.el('clearNewRec').textContent + '）');

console.log('=== ④ 不污染普通关卡 ===');
T.startDaily();
ok(T.getWLock() === m1.weather, '挑战中天气锁定生效');
T.startLevel(0);
ok(T.getWLock() === null && T.getIsDaily() === false, '开始普通关卡：挑战残留被清空（天气锁解除、状态复位）');
var st2 = T.getS();
ok(Math.abs(st2.PACT.hp - 1) < 1e-9 && Math.abs(st2.PACT.gold - 1) < 1e-9, '普通关卡契约倍率回到默认（hp=' + st2.PACT.hp + ' / gold=' + st2.PACT.gold + '）');
T.setWave(1); T.startWave();
ok(T.getWeather() === 'none', '普通关卡第 1 波仍是「平稳」天气');

console.log('=== ⑤ 入口节点 ===');
T.showLevels();
var nodes = T.el('lvList').children.filter(function(c){ return c.children && c.children.length >= 4; });
var dailyNode = null;
nodes.forEach(function(n){ if (n.children[0] && n.children[0].id === 'dailyBtn') dailyNode = n; });
ok(!!dailyNode, '关卡地图上有「每日挑战」节点（共 ' + nodes.length + ' 个节点）');
ok(/每日挑战/.test(String(dailyNode.children[2].textContent)), '节点名称：' + dailyNode.children[2].textContent);
ok(/#\d+/.test(String(dailyNode.children[3].textContent)), '节点显示今日种子编号：' + dailyNode.children[3].textContent);

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.9 每日挑战专项全部通过（0 失败）' : '  ❌ v8.9 专项 ' + fail + ' 项失败');
