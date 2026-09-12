// 验证：切换地图（第1关 ↔ 教学关）时，静态路径贴图层是否会重画
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startTutorial: startTutorial, frame: frame,\n' +
  '  getWAY: function(){ return WAYPOINTS; } };\nrequestAnimationFrame(frame);\n})();');
var BGDRAWS = 0;
function mkEl(t){
  var e = { tagName:t||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'', width:800, height:600,
    offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600, _hidden:false, _handlers:{},
    classList:{add:function(){},remove:function(){},contains:function(){return false;}},
    appendChild:function(c){return c;}, addEventListener:function(t2,f){e._handlers[t2]=f;},
    fire:function(t2){ if(e._handlers[t2]) e._handlers[t2]({stopPropagation:function(){},target:e}); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){return null;}, contains:function(){return false;},
    getContext:function(){ return ctx; },
    getBoundingClientRect:function(){return{left:0,top:0,width:800,height:600};} };
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v;}});
  return e;
}
var ctx = new Proxy({}, { get:function(t,k){
  if (k==='canvas') return mkEl('canvas');
  if (k==='createRadialGradient'||k==='createLinearGradient') return function(){return{addColorStop:function(){}};};
  if (k==='measureText') return function(){return{width:10};};
  return function(){
    if (k === 'stroke') BGDRAWS++;       // 只做粗略统计：stroke 次数（画网格/路径都要 stroke）
  };
}, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },
  createElement:function(t){return mkEl(t);}, querySelector:function(){return mkEl();},
  querySelectorAll:function(){return[];}, body:mkEl('body'), addEventListener:function(){}, readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
var errs = [];
process.on('uncaughtException', function(e){ errs.push(e.message); });
eval(code);
var T = global.window.__T;
var CLK = 8e7;
function frames(n){ for (var i=0;i<n;i++) T.frame(CLK += 16.7); }
console.log('=== 场景：先玩第 1 关，再进教学关 ===');
T.startLevel(0);
BGDRAWS = 0; frames(3);
var d1 = BGDRAWS;
console.log('第 1 关：前 3 帧静态层 stroke 次数 = ' + d1 + '（>0 说明贴图已绘制）');
BGDRAWS = 0; frames(30);
console.log('第 1 关：继续 30 帧 → stroke 次数 = ' + BGDRAWS + '（应为 0 左右：贴图走缓存不再重画）');
T.startTutorial();
BGDRAWS = 0; frames(3);
var d2 = BGDRAWS;
console.log('切到教学关：前 3 帧静态层 stroke 次数 = ' + d2);
console.log(d2 > 0 ? '✅ 教学关的路径贴图已重新绘制（不再复用第 1 关的图）' : '❌ 仍在复用旧贴图（bug 未修复）');
if (errs.length) console.log('运行时错误：' + errs.slice(0,3).join(' | '));
