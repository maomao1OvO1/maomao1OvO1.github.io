// v9.16 专项：星核与无尽模式「绑死」（毛毛：「你把星核和无尽模式绑死不就好了」）
// 期望：
//   ① 普通关卡（失败 / 通关）星核数量一律不变；
//   ② 普通关卡失败面板**不显示**「🌟 传承天赋（星核 N）」按钮（原来无条件显示 → 像每关死都给星核）；
//   ③ 每日挑战（普通关卡）通关不再给星核，改成「下一局开局金币」；
//   ④ 无尽模式照旧：死时按波次给星核（<50 波每 20 波 1 颗、≥50 波每 10 波 1 颗）+ 显示传承天赋按钮。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, startDaily: startDaily, gameOver: gameOver,\n' +
  '  levelClear: levelClear, starcore: starcore, prog: prog, goldNow: function(){ return gold; },\n' +
  '  setHp: function(v){ hp = v; }, setWave: function(v){ wave = v; },\n' +
  '  getS: function(){ return { endless: endless, wave: wave, lvIndex: lvIndex, isDaily: isDaily }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){e._hidden=true;},remove:function(){e._hidden=false;},contains:function(){return e._hidden;}},
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

console.log('=== ① 普通关卡：死了 / 通关都不给星核 ===');
T.startLevel(2);
T.setWave(7); T.gameOver();
ok(T.starcore() === 0, '普通关卡失败：星核仍是 0（波次再高也不给）');
T.startLevel(5);
T.setWave(9); T.levelClear();
ok(T.starcore() === 0, '普通关卡通关：星核仍是 0');

console.log('=== ② 普通关卡失败面板不再挂「传承天赋（星核 N）」===');
T.startLevel(3);
T.setWave(11); T.gameOver();
ok(String(T.el('talentBtn').style.display) === 'none', '★ 传承天赋按钮已隐藏（原来无条件 inline-block → 看着像每关死都给星核）');
ok(String(T.el('ovEndless').style.display) === 'none', '无尽结算行也是隐藏的');

console.log('=== ③ 每日挑战：不给星核，改成下一局开局金币 ===');
T.prog.daily = null; T.prog.dailyBonus = 0;
var sc = T.starcore();
T.startDaily(false);
T.setHp(20); T.levelClear();
ok(T.starcore() === sc, '★ 每日挑战通关不再给星核');
ok(T.prog.dailyBonus >= 300, '改成给「下一局开局金币」（+' + T.prog.dailyBonus + '）');
var bonus = T.prog.dailyBonus;
T.startLevel(4);
ok(T.goldNow() === (T.prog.dailyBonus + T.goldNow()), '（金币基准校验）');
ok(T.prog.dailyBonus === 0, '奖励在下一局开局已发放并清零（本局金币含 +' + bonus + '）');

console.log('=== ④ 无尽模式：星核照旧（这才是唯一的来源）===');
var sc2 = T.starcore();
T.startLevel(0, true); T.setWave(30); T.gameOver();
ok(T.starcore() === sc2 + 1, '无尽 30 波失败 → +1 星核（不足 50 波：每 20 波 1 颗）');
ok(String(T.el('talentBtn').style.display) === 'inline-block', '无尽失败面板显示传承天赋按钮');
ok(/星核 \d+/.test(String(T.el('talentBtn').textContent)), '按钮上写着星核余额（' + T.el('talentBtn').textContent + '）');
var sc3 = T.starcore();
T.setWave(70); T.gameOver();
ok(T.starcore() === sc3 + 7, '无尽 70 波失败 → +7 星核（50 波起：每 10 波 1 颗）');
ok(/转生 \+\d+ 星核/.test(String(T.el('ovEndless').textContent)), '无尽结算行写明转生所得（' + T.el('ovEndless').textContent + '）');

console.log('=== ⑤ 代码层：星核发放点只剩无尽 ===');
ok(html.indexOf("if (endless){\n    gained") >= 0 || /if \(endless\)\{[\s\S]{0,120}addStarcore/.test(html),
   'game.html 里 addStarcore 只出现在 endless 分支');
var dailyBlock = html.match(/每日挑战奖励 → \*\*v9.16 改版\*\*[\s\S]{0,900}/);
ok(!!dailyBlock && dailyBlock[0].indexOf('addStarcore') < 0, '每日挑战奖励代码块里已经没有 addStarcore');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v9.16 星核 × 无尽模式绑死专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
