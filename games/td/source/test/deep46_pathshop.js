// v8.26 专项：① 召唤物/分裂幼体必须走父级那条路（不再乱跑）  ② 退出商店不重抽
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame,\n' +
  '  spawnEnemy: spawnEnemy, killEnemy: killEnemy, flushPendingSpawn: flushPendingSpawn,\n' +
  '  spawnEnemyAt: spawnEnemyAt, showBuffChoices: showBuffChoices, pickBuffs: pickBuffs,\n' +
  '  WAYPOINTS: function(){ return WAYPOINTS; }, WAYPOINTS2: function(){ return WAYPOINTS2; },\n' +
  '  pending: function(){ return pendingSpawn; }, enemies: function(){ return enemies; },\n' +
  '  cards: function(){ return curPicks; }, setCards: function(v){ curPicks = v; },\n' +
  '  el: function(id){ return document.getElementById(id); },\n' +
  '  getS: function(){ return { running: running, paused: paused }; } };\n' +
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
Object.defineProperty(global,'navigator',{configurable:true,writable:true,value:{getGamepads:function(){return[];}}});
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 双入口：召唤物必须走父级那条路（毛毛报「打爆之后乱跑」）===');
T.startLevel(8);                                  /* 第 9 关 = 双入口 */
ok(!!T.WAYPOINTS2(), '第 9 关确实是双入口（有 path2）');
var p2 = T.WAYPOINTS2();
var mid = p2[Math.floor(p2.length / 2)];          /* 第二条路中间的一个航点 */
/* 在第二条路上造一只分裂虫，并明确标成「走第二条路」 */
T.spawnEnemy('splitter');
var sp = T.enemies()[T.enemies().length - 1];
sp.c = mid[0]; sp.r = mid[1];
sp.pathIdx = 1;
sp.wp = Math.floor(p2.length / 2) - 1;
/* 打死它 → 分裂（入队 pendingSpawn）*/
T.killEnemy(sp, T.enemies().indexOf(sp));
var q = T.pending()[T.pending().length - 1];
ok(!!q && q.type === 'spawn2', '分裂虫死后产生了分裂事件（' + (q && q.type) + '）');
ok(q && q.pi === 1, '★ 分裂事件带上了父级的入口 pi=1（修复前没有这个字段，幼体会重新随机）');
T.flushPendingSpawn();
var kids = T.enemies().filter(function(e){ return e.type === 'spawn2'; });
ok(kids.length === 2, '裂出 2 只幼体');
var allOnPath2 = kids.every(function(e){ return e.pathIdx === 1; });
ok(allOnPath2, '★ 两只幼体的 pathIdx 都是 1（跟父级同一条路；修复前会随机成 0 → 斜穿到另一条路）');

console.log('=== ② 退出商店不能重抽强化卡 ===');
T.setCards([]);
T.showBuffChoices();                              /* 首次抽卡（正常流程）*/
var first = T.cards().map(function(b){ return b.id; });
ok(first.length === 3, '首次抽到 3 张：' + first.join(' / '));
T.showBuffChoices(undefined, true);               /* 从商店回来：复用 */
var after = T.cards().map(function(b){ return b.id; });
ok(after.join(',') === first.join(','), '★ 从商店回来还是原来那 3 张（' + after.join(' / ') + '）—— 毛毛报的 bug 已修');
var same = true;
for (var i = 0; i < 12; i++){
  T.showBuffChoices(undefined, true);
  if (T.cards().map(function(b){ return b.id; }).join(',') !== first.join(',')){ same = false; break; }
}
ok(same, '★ 连点 12 次「离开商店」都不会换卡（修复前每次都会重抽）');
T.showBuffChoices();                              /* 对照组：正常抽卡应该换新 */
var fresh = T.cards().map(function(b){ return b.id; });
ok(true, '正常调用 showBuffChoices() 仍会抽卡：' + fresh.join(' / '));
ok(fresh.join(',') !== first.join(',') || first.length !== 3, '对照组：正常抽卡确实换了新一批（说明 reuse 参数没有把抽卡功能改死）');
/* 兜底：手上没卡时即使 reuse=true 也要能抽出卡来（不能让玩家看到空面板）*/
T.setCards([]);
T.showBuffChoices(undefined, true);
ok(T.cards().length === 3, '兜底：curPicks 为空时 reuse=true 也会正常抽 3 张（不会出现空面板）');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.26 召唤物走对路 + 商店不重抽 专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
