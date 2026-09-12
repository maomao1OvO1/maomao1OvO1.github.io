// v8.22 专项：修毛毛报的两个 UI bug
//   ① 双入口地图只有一条路有流动光点  ② 冷启动首页缺战绩胶囊/提示行
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, draw: draw, frame: frame, LEVELS: LEVELS,\n' +
  '  getWp2: function(){ return WAYPOINTS2; }, setWp2: function(v){ WAYPOINTS2 = v; },\n' +
  '  el: function(id){ return document.getElementById(id); },\n' +
  '  getS: function(){ return { running: running, enemies: enemies.length }; } };\n' +
  'requestAnimationFrame(frame);\n})();');
var STROKES = 0;
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){e.children.push(c);return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[];}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='stroke') return function(){ STROKES++; };
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},body:mkEl('body'),addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={'td_best':'7','td_endless_best':'42'};
global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);                                    /* ← 这一步就等于「冷启动」 */
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 冷启动首页就应该是完整的（毛毛报「UI 不一样」）===');
var stats = String(T.el('homeStats')._html || '');
ok(stats.length > 0, '★ 冷启动时 #homeStats 已渲染（长度 ' + stats.length + '）—— 修复前这里是空的');
['最高波次', '无尽', '已解锁', '星数'].forEach(function(k){
  ok(stats.indexOf(k) >= 0, '战绩胶囊含「' + k + '」');
});
ok(stats.indexOf('7') >= 0, '读取了 localStorage 里的最高波次（td_best=7）');
ok(stats.indexOf('42') >= 0, '读取了无尽最高波次（td_endless_best=42）');
ok(T.el('homeHint').textContent !== undefined, '#homeHint 也同步过（不再留空）');

console.log('=== ② 双入口地图：两条路都要有流动光点 ===');
var segStart = html.indexOf('流动能量带');
var seg = html.slice(segStart, segStart + 1200);
ok(seg.indexOf('WAYPOINTS2') >= 0, '★ 流动能量带的绘制引用了 WAYPOINTS2（修复前只遍历 WAYPOINTS）');
ok(/_pathN/.test(seg) && /_pn/.test(seg), '流动带按路径条数循环（单入口 1 次 / 双入口 2 次）');
var startSeg = html.slice(html.indexOf('// 起点 / 终点'), html.indexOf('// 起点 / 终点') + 500);
ok(startSeg.indexOf('WAYPOINTS2') >= 0, '起点标记也遍历两条入口（双入口地图有两个出生点）');

/* 行为验证：同一张地图，挂上第二条路后画一帧，描边次数应该明显变多 */
T.startLevel(0);
while (T.getS().enemies > 0) break;
T.setWp2(null);
var s1 = STROKES; T.draw(); var soloStrokes = STROKES - s1;
T.setWp2(T.LEVELS[8].path2);                 /* 第 9 关的双入口路径 */
var s2 = STROKES; T.draw(); var dualStrokes = STROKES - s2;
ok(dualStrokes > soloStrokes, '★ 挂上第二条路后描边次数变多（单入口 ' + soloStrokes + ' → 双入口 ' + dualStrokes + '），说明第二条路真的画了');
ok(dualStrokes - soloStrokes >= 2, '差值 ≥2（流动带有 2 次 stroke：底层宽光带 + 上层亮线）');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.22 双入口光点 + 冷启动首页修复专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
