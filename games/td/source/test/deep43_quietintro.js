// v9.14/v9.15 专项：新手提示收进「新手教学」（毛毛：「为啥这游戏每一关都有新手提示啊😡」→「只有新手教程有，第一关没有对吧」）
// v9.15 期望行为：
//   ① 普通关卡（含第 1 关）开局**不弹任何介绍弹层**，点进去直接开打；
//   ② 屏幕底部那条常驻新手提示条**只在新手教学里显示**；
//   ③ 本关的新敌人 / 新机制 / 新解锁技能 / 双入口地图 → 对应波次开始时顶部飘一行小字（不挡操作、每类一次）；
//   ④ 无尽模式自己的开场提示不受影响（v8.19 的修复保持）。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, startLevel: startLevel, startWave: startWave, waveIntroTips: waveIntroTips,\n' +
  '  startEndless: startEndless, startTutorial: startTutorial,\n' +
  '  setNoIntro: function(v){ NO_INTRO = v; }, LEVELS: LEVELS, SKILLS: SKILLS,\n' +
  '  seen: function(k){ return !!HINT_SEEN[k]; }, seenKeys: function(){ return Object.keys(HINT_SEEN); },\n' +
  '  hintText: function(){ return hintEl ? String(hintEl.textContent || "") : ""; },\n' +
  '  hintOn: function(){ return !!HINT_ON; },\n' +
  '  getS: function(){ return { endless: endless, wave: wave, running: running, paused: paused, lvIndex: lvIndex, tutorial: tutorial }; },\n' +
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
global.NO_INTRO = false;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function title(){ return String(T.el('introTitle').textContent || ''); }
function shown(){ return T.el('introOv')._hidden === false; }

console.log('=== ① 普通关卡（含第 1 关）开局不再弹任何介绍弹层 ===');
T.startLevel(0);
ok(shown() === false, '★ v9.15：第 1 关不弹（原来会弹「第 1 关 · 直廊」那一层）');
ok(T.getS().running === true && T.getS().paused === false, '第 1 关点进去直接开打（不再要按「开始战斗」）');
T.startLevel(1);
ok(shown() === false, '第 2 关不弹');
T.startLevel(2);
ok(shown() === false, '第 3 关不弹');

console.log('=== ② 底部「新手提示条」只属于新手教学 ===');
ok(T.hintOn() === false, '普通关卡不显示底部新手提示条（原来第 1 关会一直挂着一行）');
ok(String(T.el('tip').style.display) !== 'block', '提示条元素确实是收起的');
T.startTutorial();
ok(T.hintOn() === true, '★ 新手教学里显示底部新手提示条');
ok(String(T.el('tip').style.display) === 'block', '教学关里提示条元素确实打开（display:block）');
T.startLevel(0);
ok(T.hintOn() === false, '从教学回到普通关卡后提示条关闭');

console.log('=== ③ 第 1 关照常走「波内一行小字」（只是不再有弹层）===');
ok(T.seen('enemy_normal') === true, '第 1 波「普通兵」登场提示已记账（信息没丢）');
ok(T.hintText().length > 0, '顶部提示行确实有内容（' + T.hintText() + '）');

console.log('=== ④ 新敌人 / 新机制 / 新技能都在对应波次播报，且一辈子只说一次 ===');
var before = T.seenKeys().length;
T.waveIntroTips(4);
ok(T.seen('mech_4') === true, '第 4 波「元素天气开启」机制提示会被播报');
ok(T.seen('enemy_armor') === true, '第 4 波登场的「装甲兵」也一起播报了');
var after = T.seenKeys().length;
T.waveIntroTips(4);
ok(T.seenKeys().length === after, '再调一次不再新增（一辈子只说一次，记账 ' + after + ' 条）');

console.log('=== ⑤ 无尽模式自己的开场提示不受影响（v8.19 的修复保持）===');
T.startLevel(0);                       /* 先回普通关卡，清掉无尽残留 */
T.startEndless();
ok(shown() === true, '无尽模式仍然弹它自己的开场（♾ 无尽模式）');
ok(title().indexOf('♾') === 0, '标题是「♾ 无尽模式」（实际：' + title() + '）');
ok(title().indexOf('第 1 关') < 0, '★ 标题里不再出现「第 1 关」（v8.19 的修复没被破坏）');
T.el('introOv').classList.add('hidden');
T.setNoIntro(true);
T.startEndless();
ok(shown() === false, 'NO_INTRO=true 时无尽也不弹（测试/模拟器的跳过开关仍有效）');
T.setNoIntro(false);
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v9.15 新手提示收进新手教学专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
