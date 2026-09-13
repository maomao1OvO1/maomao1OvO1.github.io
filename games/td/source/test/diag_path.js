// 诊断：敌人实际轨迹 vs 绘制的路径折线，是否一致
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startTutorial: startTutorial, startLevel: startLevel, frame: frame,\n' +
  '  waypointPx: waypointPx, getWAY: function(){ return WAYPOINTS; },\n' +
  '  cx: cx, cy: cy, cell: function(){ return CELL; },\n' +
  '  getS: function(){ return { enemies: enemies, wave: wave, towers: towers }; },\n' +
  "  bgKey: function(){ return (typeof bgKey !== 'undefined') ? bgKey : ''; },\n" +
  '  el: function(id){ return document.getElementById(id); } };\nrequestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:800,height:600};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v;}}); return e; }
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
eval(code);
var T = global.window.__T;

function distToSeg(px, py, x1, y1, x2, y2){
  var dx = x2 - x1, dy = y2 - y1, L2 = dx*dx + dy*dy;
  if (L2 === 0) return Math.hypot(px - x1, py - y1);
  var t = Math.max(0, Math.min(1, ((px - x1)*dx + (py - y1)*dy) / L2));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}
function checkScene(name){
  var WP = T.getWAY(), CELL = T.cell(), pts = [];
  for (var i = 0; i < WP.length; i++){ var p = T.waypointPx(i); pts.push(p); }
  var idx = 0, CLK = 6e7, maxDev = 0, samples = 0, outside = 0;
  console.log('\n===== ' + name + ' =====');
  console.log('航点：' + JSON.stringify(WP));
  console.log('路径折线(像素)：' + pts.map(function(p){ return '(' + Math.round(p.x) + ',' + Math.round(p.y) + ')'; }).join(' → '));
  for (var f = 0; f < 1200; f++){
    T.frame(CLK += 16.7);
    if (T.el('buffOv') && T.el('buffOv')._hidden === false){ var b = T.el('buffList'); if (b && b.children[0] && b.children[0].fire) b.children[0].fire('click'); }
    var es = T.getS().enemies;
    for (var j = 0; j < es.length; j++){
      var e = es[j], best = 1e9;
      for (var s = 0; s < pts.length - 1; s++){
        var d = distToSeg(e.x, e.y, pts[s].x, pts[s].y, pts[s+1].x, pts[s+1].y);
        if (d < best) best = d;
      }
      samples++;
      if (best > maxDev) maxDev = best;
      if (best > CELL * 0.43) outside++;      // 超出路径带半宽(0.86/2)视为「跑出贴图」
      idx++;
    }
  }
  console.log('采样 ' + samples + ' 次 · 最大偏离路径线 ' + maxDev.toFixed(1) + 'px（= ' + (maxDev/CELL).toFixed(2) + ' 格）');
  console.log('跑出路径带的采样：' + outside + ' 次（占比 ' + (samples ? (outside/samples*100).toFixed(1) : 0) + '%）');
  console.log(outside === 0 && maxDev <= CELL * 0.43 ? '结论：✅ 一致' : '结论：❌ 不一致（贴图与真实路线不符）');
}
/* 复现 bug 场景：先玩第 1 关 → 再进教学关（旧版会复用第 1 关的路径贴图） */
T.startLevel(0);
checkScene('第 1 关（直廊）');
var k1 = T.bgKey();
T.startTutorial();
checkScene('教学关（新兵训练）');
var k2 = T.bgKey();
console.log('\n贴图缓存 key 是否切换：' + (k1 !== k2 ? '✅ 已重画（' + k1.slice(-24) + ' → ' + k2.slice(-24) + '）' : '❌ 仍复用旧贴图！'));
