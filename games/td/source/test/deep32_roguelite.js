// v8.7 专项：肉鸽闭环补强（抽卡可控：换一批/禁卡 ｜ 流派识别 ｜ 失败也给星核 ｜ 快速重开）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  showBuffChoices: showBuffChoices, pickBuffs: pickBuffs, archetypeNow: archetypeNow, ARCHETYPES: ARCHETYPES,\n' +
  '  grantCard: grantCard, addDraftTools: addDraftTools, resetDraftTools: resetDraftTools, gameOver: gameOver,\n' +
  '  getState: function(){ return { rerollLeft: rerollLeft, banLeft: banLeft, bannedIds: bannedIds, banMode: banMode, curPicks: curPicks }; },\n' +
  '  starcore: starcore, addStarcore: addStarcore, setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); },\n' +
  '  getTalents: function(){ return talents; }, BUFF_POOL: BUFF_POOL, BUFFS_OF: function(){ return BUFFS; },\n' +
  '  getS: function(){ return { towers: towers, wave: wave, BUFFS: BUFFS, SET_COUNT: SET_COUNT, lvIndex: lvIndex }; },\n' +
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
function toolRow(){ var k = T.el('buffList').children; return k[k.length - 1]; }

console.log('=== ① 抽卡可控：换一批 ===');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'fire');
ok(T.getState().rerollLeft === 3, '每局起始有 3 次「换一批」（实际 ' + T.getState().rerollLeft + '）');
T.showBuffChoices();
var row = toolRow();
ok(row.children.length === 3, '底部工具行 = 换一批 / 禁卡 / 商店（' + row.children.length + ' 个按钮）');
ok(/换一批/.test(String(row.children[0]._html)) && /剩 3 次/.test(String(row.children[0]._html)),
   '「换一批」按钮显示剩余次数（' + String(row.children[0]._html).replace(/<[^>]+>/g, ' ') + '）');
var first = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
row.children[0].fire('click');
var second = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
ok(T.getState().rerollLeft === 2, '换一批消耗 1 次（剩 ' + T.getState().rerollLeft + ' 次）');
ok(second !== first, '换出来的三张与上一批不同（' + first.slice(0, 20) + '… → ' + second.slice(0, 20) + '…）');
T.showBuffChoices();
toolRow().children[0].fire('click');
T.showBuffChoices();
toolRow().children[0].fire('click');
ok(T.getState().rerollLeft === 0, '连续使用后次数归零');
T.showBuffChoices();
var before = T.getState().curPicks.map(function(c){ return c.id; }).join(',');
toolRow().children[0].fire('click');
ok(T.getState().curPicks.map(function(c){ return c.id; }).join(',') === before, '次数用完后不能再换（卡面不变）');
T.addDraftTools();
ok(T.getState().rerollLeft === 1, '每 5 波会补充 1 次「换一批」（=> ' + T.getState().rerollLeft + '）');
ok(html.indexOf('addDraftTools();') >= 0, '波次结算里已接入补充逻辑');

console.log('=== ② 抽卡可控：禁一张（本局不再出现）===');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'fire');
T.showBuffChoices();
ok(T.getState().banLeft === 2, '每局有 2 次禁卡机会');
toolRow().children[1].fire('click');
ok(T.getState().banMode === true, '点「禁一张」进入禁卡模式（标题提示：' + T.el('buffTitle').textContent + '）');
var victim = T.getState().curPicks[0];
T.el('buffList').children[0].fire('click');
ok(T.getState().bannedIds[victim.id] === 1, '点卡片即禁掉「' + victim.name + '」');
ok(T.getState().banLeft === 1 && T.getState().banMode === false, '消耗 1 次并退出禁卡模式（剩 ' + T.getState().banLeft + ' 次）');
var seen = {};
for (var i = 0; i < 60; i++){
  T.pickBuffs(3).forEach(function(c){ seen[c.id] = (seen[c.id] || 0) + 1; });
}
ok(!seen[victim.id], '被禁的卡在之后 60 次抽卡中再也没出现过（' + victim.name + '）');
T.startLevel(0);
ok(!T.getState().bannedIds[victim.id] && T.getState().banLeft === 2 && T.getState().rerollLeft === 3,
   '开新一局：禁用表清空、次数重置（禁卡 ' + T.getState().banLeft + ' / 换一批 ' + T.getState().rerollLeft + '）');

console.log('=== ③ 流派识别：能看出自己在凑什么 ===');
T.startLevel(0);
ok(T.ARCHETYPES.length === 6, '共识别 ' + T.ARCHETYPES.length + ' 种流派（' + T.ARCHETYPES.map(function(a){ return a.name; }).join(' ') + '）');
var a0 = T.archetypeNow();
ok(a0.score === 0 && /未成型/.test(a0.name), '空手开局：提示未成型（' + a0.name + '）');
T.getGold = null;
T.getS().BUFFS.crit = 0.5;                                  /* 堆暴击 */
ok(/暴击流/.test(T.archetypeNow().name), '堆暴击率 → 识别为「' + T.archetypeNow().name + '」（' + T.archetypeNow().hint + '）');
T.startLevel(0); T.setGold(99999);
T.getS().BUFFS.interest = 0.32; T.getS().BUFFS.gold = 1.7;  /* 堆经济 */
ok(/经济流/.test(T.archetypeNow().name), '堆利息与金币 → 识别为「' + T.archetypeNow().name + '」');
T.startLevel(0); T.setGold(99999);
for (var k = 0; k < 9; k++) T.addTower(0, k, 'thunder');     /* 一堆雷塔 */
T.getS().BUFFS.rate = 1.8;
ok(/连锁流/.test(T.archetypeNow().name), '一堆雷塔 + 攻速 → 识别为「' + T.archetypeNow().name + '」');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'fire');
T.showBuffChoices();
ok(/当前倾向/.test(String(T.el('buffSub')._html)) && /换一批/.test(String(T.el('buffSub')._html)),
   '强化卡面板顶部显示「当前倾向 + 剩余次数」');

console.log('=== ④ 失败不再白打：星核按波次给 ===');
T.startLevel(0);
T.addStarcore(-T.starcore());                                /* 清零便于计算 */
T.startEndless(); T.setWave(12); T.gameOver();
ok(T.starcore() === 0, '12 波失败：不足 20 波 → 0 星核（' + T.starcore() + '）');
T.startEndless(); T.setWave(24); T.gameOver();
ok(T.starcore() >= 1, '24 波失败 → 给 1 星核（不白打）');
var s1 = T.starcore();
T.startEndless(); T.setWave(70); T.gameOver();
ok(T.starcore() > s1 + 5, '70 波仍是高手效率（每 10 波 1 颗）：' + s1 + ' → ' + T.starcore());
ok(/转生 \+/.test(String(T.el('ovEndless').textContent)), '结束界面显示本局获得的星核（' + T.el('ovEndless').textContent.slice(-24) + '）');

console.log('=== ⑤ 快速重开 ===');
ok(html.indexOf('id="retryBtn"') >= 0 && html.indexOf("on('retryBtn'") >= 0, '结束界面有「🔁 立刻重开本关」按钮并已绑定');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.7 肉鸽闭环补强专项全部通过（0 失败）' : '  ❌ v8.7 专项 ' + fail + ' 项失败');
