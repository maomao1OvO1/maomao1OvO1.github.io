// v8.19 专项：修「点无尽模式却先弹第 1 关的开幕提示」（毛毛报的 bug）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, startLevel: startLevel, startEndless: startEndless, resumeEndless: resumeEndless,\n' +
  '  startDaily: startDaily, saveEndless: saveEndless, loadEndlessSave: loadEndlessSave, clearEndlessSave: clearEndlessSave,\n' +
  '  setNoIntro: function(v){ NO_INTRO = v; }, LEVELS: LEVELS, TUTORIAL: TUTORIAL,\n' +
  '  getS: function(){ return { endless: endless, wave: wave, running: running, paused: paused,\n' +
  '    WAVES_TOTAL: WAVES_TOTAL, lvIndex: lvIndex, isDaily: isDaily, hp: hp }; },\n' +
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
global.NO_INTRO = false;          /* 本专项要真的看弹层内容 → 关掉跳过开关 */
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function title(){ return String(T.el('introTitle').textContent || ''); }
function body(){ return String(T.el('introBody')._html || ''); }
function shown(){ return T.el('introOv')._hidden === false; }

console.log('=== ① 复现毛毛的场景：直接进无尽 ===');
T.startEndless();
ok(shown(), '进无尽后弹出了开场提示');
ok(title() === '♾ 无尽模式', '提示标题是「♾ 无尽模式」（实际：' + title() + '）');
ok(title().indexOf('第 1 关') < 0 && title().indexOf('第1关') < 0,
   '★ 标题里不再出现「第 1 关」—— 毛毛报的 bug 已修');
var sub = String(T.el('introSub').textContent || '');
ok(sub.indexOf('波次无上限') >= 0, '副标题写的是无尽规则（' + sub + '）');
ok(sub.indexOf(String(T.LEVELS[0].waves) + ' 波') < 0, '副标题不再借用第 1 关的波数（' + T.LEVELS[0].waves + ' 波）');

console.log('=== ② 无尽专属机制都讲到了（这些普通关卡没有）===');
var b = body();
[['无尽契约', '契约'], ['波间商店', '波间商店'], ['双 BOSS', '双 BOSS'],
 ['盗金贼', '盗金贼'], ['维护费', '维护费'], ['转生', '转生']].forEach(function(p){
  ok(b.indexOf(p[0]) >= 0, '开场里讲了「' + p[1] + '」');
});
ok(b.indexOf('每 5 波') >= 0, '契约的频率写对了（每 5 波）');
ok(b.indexOf('每 20 波') >= 0 && b.indexOf('每 10 波') >= 0, 'BOSS 频率写对了（每 10 波单只 / 每 20 波双只）');
ok(b.indexOf('12 波') >= 0, '盗金贼登场波次写对了（第 12 波）');
ok(b.indexOf('50 波') >= 0, '转生门槛写对了（50 波）');
ok(b.indexOf('4 个主动技能') >= 0, '说明了无尽 4 个技能全解锁');
ok(b.indexOf('第 1 关') < 0, '★ 正文里也没有「第 1 关」字样（第 1 关的「新手提示」也没混进来）');

console.log('=== ③ 点「开始战斗」才真开打（阻塞式弹层行为保持）===');
ok(T.getS().running === false && T.getS().paused === true, '弹层期间战场是冻结的');
T.el('introBtn').fire('click');
T.el('introOv').classList.add('hidden');
ok(T.getS().running === true && T.getS().paused === false, '点「⚔ 开始战斗」后真的开打');
var s = T.getS();
ok(s.endless === true, '确实是无尽模式（endless=true）');
ok(s.WAVES_TOTAL === 999, '波次无上限（WAVES_TOTAL=999）');
ok(String(T.el('lvName').textContent) === '♾ 无尽', '顶部地图名显示「♾ 无尽」（不是「直廊」）');

console.log('=== ④ 普通关卡没被改坏：仍弹它自己那一关 ===');
T.startLevel(0);
ok(shown(), '第 1 关仍然弹开场提示');
ok(title().indexOf('第 1 关') === 0, '第 1 关弹的是「第 1 关 · …」（' + title() + '）');
ok(body().indexOf('新手提示') >= 0, '第 1 关的「新手提示」还在');
T.startLevel(2);
ok(title().indexOf('第 3 关') === 0, '第 3 关弹的是「第 3 关 · …」（' + title() + '）');
ok(String(T.el('introSub').textContent).indexOf(String(T.LEVELS[2].waves) + ' 波') >= 0,
   '第 3 关副标题是本关的波数（' + T.LEVELS[2].waves + ' 波）');
ok(T.getS().endless === false, '普通关卡不会残留 endless 标记');

console.log('=== ⑤ 无尽「续玩」不弹开场（玩家已经知道自己要接着打）===');
T.clearEndlessSave();
T.setNoIntro(true); T.startEndless(); T.el('introOv').classList.add('hidden'); T.setNoIntro(false);
var st = T.getS(); st && (T.el('introOv').classList.add('hidden'));
/* 造一个存档：把 running 打开后手动存档 */
(function(){ var g = T.getS(); })();
global.localStorage.setItem('td_endless_save', JSON.stringify({ v:1, wave:7, gold:'500', hp:18, maxhp:20,
  kills:0, built:0, towers:[], buffs:{ dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,
  costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0, shieldHP:0, splashDmg:0, dotAdd:0, elBoost:0,
  el:{fire:1,ice:1,thunder:1,poison:1,phys:1}, tw:{}, sets:{} }, best:0, t:1 }));
ok(!!T.loadEndlessSave() && T.loadEndlessSave().wave === 7, '已造出一份「第 7 波」的无尽存档');
T.el('introOv').classList.add('hidden');
var resumed = T.resumeEndless();
ok(resumed === true, 'resumeEndless 成功接档');
ok(shown() === false, '★ 续玩时不弹开场提示（原来会弹第 1 关，同样离谱）');
ok(T.getS().wave === 7, '波次恢复成存档里的第 7 波');
ok(T.getS().running === true && T.getS().paused === false, '续玩后直接就是运行态，不用再点一次「开始战斗」');

console.log('=== ⑥ 每日挑战 / NO_INTRO 开关都没受影响 ===');
T.startDaily(false);
ok(shown(), '每日挑战仍弹开场提示');
ok(title().indexOf('第 ' + (T.getS().lvIndex + 1) + ' 关') === 0,
   '每日挑战弹的是它今天指定的那一关（' + title() + '）');
T.el('introOv').classList.add('hidden');
T.setNoIntro(true);
T.startEndless();
ok(shown() === false, 'NO_INTRO=true 时无尽也不弹层（测试/模拟器的跳过开关仍然有效）');
ok(T.getS().running === true, 'NO_INTRO 下直接就是运行态');
T.setNoIntro(false);
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.19 无尽开场修复专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
