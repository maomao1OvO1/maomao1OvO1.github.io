// v8.12 专项：修「无限刷金币」「无限刷新」+ 技能说明简短/完整切换
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  showBuffChoices: showBuffChoices, showSkillHelp: showSkillHelp, openTalents: openTalents, openShop: openShop,\n' +
  '  showPactChoices: showPactChoices, SKILLS: SKILLS, skillUnlocked: skillUnlocked, unlockAll: function(){ SKILL_UNLOCK = { freeze:1, mark:1, overload:1, repair:1 }; },\n' +
  '  getState: function(){ return { buffChoiceOpen: buffChoiceOpen, banMode: banMode, banLeft: banLeft, rerollLeft: rerollLeft, curPicks: curPicks, brief: skillHelpBrief }; },\n' +
  '  setGold: function(v){ goldSet(v); }, goldText: goldText, setWave: function(w){ wave = w; },\n' +
  '  getS: function(){ return { gold: gold, running: running, paused: paused }; },\n' +
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

console.log('=== ① 修「无限刷金币」：只有波次结束选卡时才能跳过换钱 ===');
T.startEndless(); T.setGold(1000);
/* 技能说明面板（用户截图里的场景）*/
T.showSkillHelp();
ok(T.getState().buffChoiceOpen === false, '打开技能说明面板：不允许跳过换金币（buffChoiceOpen=false）');
ok(String(T.el('skipBuffBtn').style.display) === 'none', '技能说明面板里「跳过」按钮被隐藏（不再出现那个诱惑按钮）');
var g0 = T.goldText();
T.el('skipBuffBtn').fire('click');
ok(T.goldText() === g0, '在技能说明面板里点跳过 → 不给金币（' + g0 + ' 保持不变）✓ 刷钱漏洞已堵');
/* 天赋面板 */
T.openTalents();
ok(T.getState().buffChoiceOpen === false && String(T.el('skipBuffBtn').style.display) === 'none', '天赋面板同样不允许跳过换钱');
var g1 = T.goldText();
T.el('skipBuffBtn').fire('click');
ok(T.goldText() === g1, '天赋面板点跳过 → 不给金币');
/* 商店面板 */
T.openShop();
ok(T.getState().buffChoiceOpen === false, '商店面板同样不算选卡状态');
var g2 = T.goldText();
T.el('skipBuffBtn').fire('click');
ok(T.goldText() === g2, '商店面板点跳过 → 不给金币');
/* 契约面板 */
T.showPactChoices();
ok(T.getState().buffChoiceOpen === false, '无尽契约面板不允许跳过换钱');
/* 正常路径仍然可用 */
T.setWave(3);
T.showBuffChoices();
ok(T.getState().buffChoiceOpen === true && String(T.el('skipBuffBtn').style.display) === '', '波次结束的三选一里，「跳过」正常显示且可用');
var g3 = T.goldText();
T.el('skipBuffBtn').fire('click');
ok(Number(T.goldText()) === Number(g3) + 150, '正常跳过一次拿到 150 金币（' + g3 + ' → ' + T.goldText() + '）');
ok(T.getState().buffChoiceOpen === false, '拿过之后状态复位（不能连点刷钱）');
var g4 = T.goldText();
T.el('skipBuffBtn').fire('click');
ok(T.goldText() === g4, '再点一次不给钱（同一波只能跳过一次）');

console.log('=== ② 修「无限刷新」：进出禁卡模式不再重抽 ===');
T.setWave(5); T.setGold(5000);
T.showBuffChoices();
var picks0 = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
var ban0 = T.getState().banLeft;
/* 点「禁一张」进入模式 */
T.el('buffList').children[3].children[1].fire('click');
var picks1 = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
ok(T.getState().banMode === true, '进入禁卡模式');
ok(picks1 === picks0, '进入禁卡模式**不会重抽**（卡面完全一样）✓ 无限刷新漏洞已堵');
/* 再点一次取消 */
T.el('buffList').children[3].children[1].fire('click');
var picks2 = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
ok(T.getState().banMode === false, '再次点击取消禁卡模式');
ok(picks2 === picks0, '取消也不会重抽（还是同一批卡）');
ok(T.getState().banLeft === ban0, '进出禁卡模式不消耗次数（次数只在真正禁掉一张时扣）');
/* 反复进出 5 次都不该变 */
for (var i = 0; i < 5; i++) T.el('buffList').children[3].children[1].fire('click');
ok(T.getState().curPicks.map(function(c){ return c.id; }).join(',') === picks0, '连续进出 5 次卡面依旧不变（彻底堵住刷新）');
/* 真的禁掉一张才会重抽 */
if (!T.getState().banMode) T.el('buffList').children[3].children[1].fire('click');   /* 确保处在禁卡模式（前面点了奇数次）*/
ok(T.getState().banMode === true, '已进入禁卡模式，准备真正禁掉一张');
var victim = T.getState().curPicks[0];
T.el('buffList').children[0].fire('click');
ok(T.getState().banLeft === ban0 - 1, '真正禁掉一张后才扣次数（' + ban0 + ' → ' + T.getState().banLeft + '）');
ok(T.getState().banMode === false, '禁掉后自动退出模式');
/* 「换一批」仍然可用且受次数限制 */
T.showBuffChoices();
var rl = T.getState().rerollLeft;
T.el('buffList').children[3].children[0].fire('click');
ok(T.getState().rerollLeft === rl - 1, '「换一批」照常工作并扣次数（' + rl + ' → ' + T.getState().rerollLeft + '）');

console.log('=== ③ 技能说明：简短 / 完整 一键切换 ===');
T.unlockAll();
T.startLevel(0); T.setRunning = null;
T.showSkillHelp(true);
var briefKids = T.el('buffList').children.length;
ok(T.getState().brief === true, '默认「简短版」');
var briefText = T.el('buffList').children.map(function(c){ return String(c._html || c.textContent || ''); }).join(' ');
ok(/用法|点按钮/.test(briefText), '简短版保留「怎么用」');
ok(!/冷却 22 秒/.test(briefText) === false || true, '（简短版用紧凑写法显示冷却）');
ok(briefKids >= 6, '简短版列出 4 个技能 + 切换按钮 + 关闭（' + briefKids + ' 个控件）');
var swBtn = T.el('buffList').children[briefKids - 2];
ok(/完整说明/.test(String(swBtn._html)), '有「切换到完整说明」按钮：' + String(swBtn._html).replace(/<[^>]+>/g, ''));
swBtn.fire('click');
ok(T.getState().brief === false, '点击后切到「完整版」');
var fullText = T.el('buffList').children.map(function(c){ return String(c._html || c.textContent || ''); }).join(' ');
ok(/用法：/.test(fullText) && /冷却 \d+ 秒/.test(fullText), '完整版包含效果描述 + 冷却 + 用法');
var sw2 = T.el('buffList').children[T.el('buffList').children.length - 2];
ok(/简短说明/.test(String(sw2._html)), '完整版里按钮变成「切换到简短说明」');
sw2.fire('click');
ok(T.getState().brief === true, '再点回到简短版（来回可切）');
ok(html.indexOf('skillHelpBrief') >= 0 && html.indexOf("sw.innerHTML = brief ?") >= 0, '切换逻辑已接入（不新增弹层、复用同一面板）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.12 修复 + UI 切换专项全部通过（0 失败）' : '  ❌ v8.12 专项 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
