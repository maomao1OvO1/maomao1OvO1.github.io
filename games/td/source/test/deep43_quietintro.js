// v9.14 专项：修「每一关都弹新手提示」（毛毛：「为啥这游戏每一关都有新手提示啊😡」）
// 期望行为：开局弹层**只在第 1 关（新手关）**出现；其余关卡直接开打，
//           新敌人 / 新机制 / 新技能改用波次开始的顶部一行小字（hintOnce，一辈子一次、不阻塞）。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, startLevel: startLevel, startWave: startWave, waveIntroTips: waveIntroTips,\n' +
  '  setNoIntro: function(v){ NO_INTRO = v; }, LEVELS: LEVELS, SKILLS: SKILLS,\n' +
  '  seen: function(k){ return !!HINT_SEEN[k]; }, seenKeys: function(){ return Object.keys(HINT_SEEN); },\n' +
  '  hintText: function(){ return hintEl ? String(hintEl.textContent || "") : ""; },\n' +
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
global.NO_INTRO = false;                /* 本专项要真的看弹层是否弹出 → 关掉跳过开关 */
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function title(){ return String(T.el('introTitle').textContent || ''); }
function body(){ return String(T.el('introBody')._html || ''); }
function shown(){ return T.el('introOv')._hidden === false; }
function hideIntro(){ T.el('introOv').classList.add('hidden'); }

console.log('=== ① 第 1 关：新手关，照旧弹弹层（含新手提示）===');
T.startLevel(0);
ok(shown(), '第 1 关仍弹开局弹层');
ok(title().indexOf('第 1 关') === 0, '标题是第 1 关（实际：' + title() + '）');
ok(body().indexOf('新手提示') >= 0, '弹层里有「💡 新手提示」（新手关该有）');
ok(T.getS().running === false && T.getS().paused === true, '弹层期间游戏处于暂停态（点「开始战斗」才开打）');

console.log('=== ② 第 1 关不再重复飘字（信息已在弹层里）===');
ok(T.seen('enemy_normal') === false, '第 1 关没有额外飘「新敌人」小字（不重复播报）');

console.log('=== ③ 弹层里不再有「每关都一样的旧信息」===');
ok(body().indexOf('已有：') < 0, '没有「已有：技能…」那段旧信息了');
ok(body().indexOf('本关暂无可用技能') < 0, '没有「本关暂无可用技能」了');
ok(body().indexOf('🗺 地图：') < 0, '没有「🗺 地图：…」那行了');
hideIntro();

console.log('=== ④ ★ 毛毛报的场景：第 2 关起不再弹新手提示 ===');
T.startLevel(1);
ok(shown() === false, '★ 第 2 关打进来不再弹开局弹层');
ok(T.getS().running === true && T.getS().paused === false, '第 2 关直接就是运行态（不用再点一次「开始战斗」）');
T.startLevel(2);
ok(shown() === false, '★ 第 3 关同样不弹');
hideIntro();

console.log('=== ⑤ 新东西改成「波内一行小字」播报（不阻塞、一辈子一次）===');
ok(T.getS().running === true, '第 2/3 关仍在运行态（小字提示不暂停游戏）');
ok(T.seen('enemy_normal') === true, '「普通兵」首次登场时记了账（hintOnce 只提示一次）');
ok(T.hintText().length > 0, '顶部提示行确实有内容（实际：' + T.hintText() + '）');
T.waveIntroTips(4);
ok(T.seen('mech_4') === true, '第 4 波「元素天气开启」机制提示会被播报');
var after = T.seenKeys().length;
ok(T.seen('enemy_armor') === true, '第 4 波登场的「装甲兵」也一起播报了');
T.waveIntroTips(4);
ok(T.seenKeys().length === after, '再调一次不再新增（一辈子只说一次，记账数 ' + after + ' 条）');
hideIntro();

console.log('=== ⑥ NO_INTRO 开关不受影响 ===');
T.setNoIntro(true);
T.startLevel(1);
ok(shown() === false, 'NO_INTRO=true 时不弹层（测试/模拟器的跳过开关仍有效）');
ok(T.getS().running === true, 'NO_INTRO 下直接运行态');
T.setNoIntro(false);
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v9.14 开局提示收敛专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
