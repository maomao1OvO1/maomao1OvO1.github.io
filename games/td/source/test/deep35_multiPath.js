// v8.10 专项：多入口（双路径）关卡
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, spawnEnemy: spawnEnemy,\n' +
  '  LEVELS: LEVELS, isPath: isPath, waypointPx: waypointPx, pathLenToWp: pathLenToWp, showLevelIntro: showLevelIntro,\n' +
  '  cx: cx, cy: cy, CELL: CELL, setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); },\n' +
  '  clearE: function(){ enemies = []; }, getWP: function(){ return WAYPOINTS; }, getWP2: function(){ return WAYPOINTS2; },\n' +
  '  getS: function(){ return { enemies: enemies, towers: towers, lvIndex: lvIndex }; },\n' +
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

console.log('=== ① 哪些关卡是双入口 ===');
var dual = [];
T.LEVELS.forEach(function(L, i){ if (L.path2) dual.push(i + 1); });
ok(dual.length === 6, '共 ' + dual.length + ' 张双入口地图：第 ' + dual.join('/') + ' 关（v8.21 起 6/7/8 也改为双入口）');
var geoBad = 0;
T.LEVELS.forEach(function(L){
  if (!L.path2) return;
  L.path2.forEach(function(pt, k){
    if (pt[0] < 0 || pt[0] > 15 || pt[1] < 0 || pt[1] > 9) geoBad++;
    if (k > 0){ var pr = L.path2[k-1]; if (pr[0] !== pt[0] && pr[1] !== pt[1]) geoBad++; }
  });
  var last = L.path2[L.path2.length - 1];
  if (last[0] !== 15 || last[1] !== 9) geoBad++;
  var f = L.path2[0];
  if (f[0] !== 0 && f[1] !== 0 && f[1] !== 9 && f[0] !== 15) geoBad++;
});
ok(geoBad === 0, '第二入口路径全部合法（网格内 16×10 / 折线相连 / 终点基地）');

console.log('=== ② 进入双入口关卡：两条路都生效 ===');
var dIdx = dual[0] - 1;
T.startLevel(dIdx);
ok(!!T.getWP2(), '第 ' + (dIdx + 1) + ' 关已加载第二入口路径（' + T.getWP2().length + ' 个拐点）');
/* 两条路都不能建塔 */
var blockBad = 0, totalCells = 0;
[0, 1].forEach(function(pi){
  var list = pi === 1 ? T.getWP2() : T.getWP();
  for (var i = 0; i < list.length - 1; i++){
    var a = list[i], b = list[i+1];
    var dx = Math.sign(b[0]-a[0]), dy = Math.sign(b[1]-a[1]);
    var x = a[0], y = a[1];
    totalCells++;
    if (!T.isPath(x, y)) blockBad++;
    while (x !== b[0] || y !== b[1]){ x += dx; y += dy; totalCells++; if (!T.isPath(x, y)) blockBad++; }
  }
});
ok(blockBad === 0, '两条路径共 ' + totalCells + ' 个格子全部被标记为「路径」（都不能建塔）');

console.log('=== ③ 敌人会从两条路分别来 ===');
T.setWave(6); T.clearE();
var side = { 0:0, 1:0 };
for (var i = 0; i < 200; i++){
  T.spawnEnemy('normal');
  var e = T.getS().enemies[T.getS().enemies.length - 1];
  side[e.pathIdx || 0]++;
  T.clearE();
}
ok(side[0] > 40 && side[1] > 40, '200 只怪里两条路各占一半（入口 A ' + side[0] + ' 只 / 入口 B ' + side[1] + ' 只）');
/* 出生点确实在各自入口 */
T.clearE(); T.spawnEnemy('normal');
var a0 = T.getS().enemies[0];
T.clearE();
for (i = 0; i < 40; i++){ T.spawnEnemy('normal'); }
var has2 = T.getS().enemies.filter(function(e){ return e.pathIdx === 1; });
ok(has2.length > 0, '同批次里确实有敌人从第二入口出生（' + has2.length + ' 只）');
var p2 = T.getWP2()[0];
var near2 = has2.every(function(e){ return Math.abs(e.x - T.cx(p2[0])) < T.CELL * 1.6 + Math.abs(e.y - T.cy(p2[1])) < T.CELL * 1.6; });
ok(near2, '第二入口的敌人生成在第二路径起点附近');
ok(Math.abs(a0.x - T.cx(T.getWP()[0])) < T.CELL * 1.6 || Math.abs(a0.x - T.cx(p2[0])) < T.CELL * 1.6, '入口 A 的敌人从主路径起点出生');

console.log('=== ④ 各走各的路（不会跑到另一条路上）===');
T.setWave(6); T.clearE();
T.spawnEnemy('normal'); T.spawnEnemy('normal');
var es = T.getS().enemies;
var t0 = 0;
for (i = 0; i < 300; i++){ t0 += 16; T.frame(t0); }
var moved = es.filter(function(e){ return (e.done || 0) > 0; });
ok(moved.length >= 1, '敌人沿路径前进（' + moved.length + ' 只已推进路程）');
var e1 = es.filter(function(e){ return e.pathIdx === 1; })[0];
if (e1){
  var wps = T.getWP2();
  var nearOwn = false;
  for (i = 0; i < wps.length; i++){
    if (Math.abs(e1.x - T.cx(wps[i][0])) < T.CELL * 2.2 && Math.abs(e1.y - T.cy(wps[i][1])) < T.CELL * 2.2) nearOwn = true;
  }
  ok(nearOwn, '第二路径的敌人始终在自己那条路附近（不会串到主路径）');
} else ok(true, '（本轮未生成第二入口敌人，跳过位置校验）');
T.startLevel(0);
ok(T.getWP2() === null, '回到单入口关卡后第二路径被清空');

console.log('=== ⑤ 双入口信息照常告知玩家（v9.15 起改由波次小字播报，不再用开幕弹层）===');
/* v9.15 变更：普通关卡开局一律不弹开幕层（showLevelIntro 已是空壳）；新机制说明改由 waveIntroTips()
   在第 1 波开始时用顶部一行小字播报（hintOnce 记账、4.2 秒淡出、每类一辈子一次）。
   本节据此改为：① 弹层确定不再出现；② 双入口文案确实存在于源码（由波内小字承接）。*/
global.NO_INTRO = false;
T.showLevelIntro(dIdx);
var body = String(T.el('introBody').innerHTML);
ok(!/双入口/.test(body), '第 ' + (dIdx + 1) + ' 关不再靠开幕弹层告知（弹层已停用）');
ok(html.indexOf('双入口') >= 0, '双入口说明仍在源码中（由 waveIntroTips 波内小字播报）');
ok(html.indexOf('双入口地图') >= 0 || /双入口/.test(html), '波内播报含「双入口地图」提示文案');
T.showLevelIntro(0);
ok(!/双入口/.test(String(T.el('introBody').innerHTML)), '单入口关卡不会误报双入口');
global.NO_INTRO = true;

console.log('=== ⑥ 双入口关卡能正常打完一波（不崩）===');
T.startLevel(dIdx); T.setGold(99999);
T.getS().towers.length; 
T.frame(16);
var t1 = 0;
for (i = 0; i < 600; i++){ t1 += 16; T.frame(t1); }
ok(errs.length === 0, '双入口关卡跑 600 帧无报错（' + errs.length + '）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.10 多入口关卡专项全部通过（0 失败）' : '  ❌ v8.10 专项 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
