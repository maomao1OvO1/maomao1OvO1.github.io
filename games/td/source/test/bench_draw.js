// 渲染开销代理指标：统计固定场景下每帧 Canvas 调用次数（调用越少越省）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, spawnEnemy: spawnEnemy,\n' +
  '  setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
var CALLS = 0;
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'', width:800, height:600,
    offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600, _hidden:false, _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    fire:function(t){ if (el._handlers[t]) el._handlers[t]({ stopPropagation:function(){}, target:el }); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){ return null; }, contains:function(){ return false; },
    getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
  Object.defineProperty(el, 'innerHTML', { get:function(){ return el._html; },
    set:function(v){ el._html = v; el.children = []; } });
  return el;
}
/* 关键指标：① Canvas 调用总数 ② 处于 shadowBlur>0 状态下的绘制次数与成本（∝ 半径²）
   —— shadowBlur 是移动端 Canvas 最贵的操作，优化主要就是砍它 */
var BLUR_DRAWS = 0, BLUR_COST = 0, blurNow = 0;
var ctx = new Proxy({}, {
  get:function(t, k){
    if (k === 'canvas') return mkEl('canvas');
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return function(){ CALLS++; return { addColorStop:function(){} }; };
    if (k === 'measureText') return function(){ CALLS++; return { width:10 }; };
    return function(){
      CALLS++;
      if (blurNow > 0 && (k === 'stroke' || k === 'fill' || k === 'fillRect' || k === 'fillText')){
        BLUR_DRAWS++; BLUR_COST += blurNow * blurNow;
      }
    };
  },
  set:function(t, k, v){ CALLS++; if (k === 'shadowBlur') blurNow = v || 0; return true; }
});
var elCache = {};
global.document = { getElementById:function(id){ if(!elCache[id]) elCache[id]=mkEl(); return elCache[id]; },
  createElement:function(t){ return mkEl(t); }, querySelector:function(){ return mkEl(); },
  querySelectorAll:function(){ return []; }, body:mkEl('body'), addEventListener:function(){}, readyState:'complete' };
global.window = { innerWidth:800, innerHeight:600, devicePixelRatio:1, addEventListener:function(){} };
global.navigator = { getGamepads:function(){ return []; } };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){}, removeItem:function(){} };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
eval(code);
var T = global.window.__T;
T.startLevel(0); T.setGold(999999);
// 场景：20 座塔 + 60 只怪（接近实际中后期局面）
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 9 && placed < 20; c++)
  for (var r = 0; r < 14 && placed < 20; r++)
    if (T.addTower(c, r, elems[(c + r) % 6])) placed++;
for (var k = 0; k < 60; k++) T.spawnEnemy(k % 3 === 0 ? 'fast' : 'normal');
var CLK = 9e7;
for (var i = 0; i < 30; i++){ CLK += 16.7; T.frame(CLK); }   // 预热
CALLS = 0;
for (var j = 0; j < 60; j++){ CLK += 16.7; T.frame(CLK); }
console.log('场景：塔 ' + placed + ' 座 + 60 只怪（固定）');
console.log('  每帧 Canvas 调用   = ' + Math.round(CALLS / 60));
console.log('  每帧「发光绘制」次数 = ' + Math.round(BLUR_DRAWS / 60) + '（shadowBlur>0 时的绘制）');
console.log('  每帧发光成本(∝半径²) = ' + Math.round(BLUR_COST / 60));
