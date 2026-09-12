var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');

// ---------- Stub DOM ----------
var errors = [];
function mkEl(tag){
  var el = {
    tagName: tag || 'div', style: {}, dataset: {}, children: [],
    textContent: '', innerHTML: '', value: '', width: 800, height: 600,
    offsetWidth: 100, offsetHeight: 100, clientWidth: 800, clientHeight: 600,
    classList: { add: function(){}, remove: function(){}, contains: function(){ return false; } },
    appendChild: function(c){ this.children.push(c); return c; },
    removeChild: function(){}, remove: function(){},
    addEventListener: function(){}, removeEventListener: function(){},
    setPointerCapture: function(){}, releasePointerCapture: function(){},
    closest: function(){ return null; }, contains: function(){ return false; },
    getContext: function(){ return ctx; },
    getBoundingClientRect: function(){ return { left: 0, top: 0, width: 800, height: 600 }; },
    focus: function(){}, blur: function(){}, click: function(){}
  };
  return el;
}
var ctx = new Proxy({}, {
  get: function(t, k){
    if (k === 'canvas') return mkEl('canvas');
    if (k === 'createRadialGradient' || k === 'createLinearGradient')
      return function(){ return { addColorStop: function(){} }; };
    if (k === 'measureText') return function(){ return { width: 10 }; };
    if (k === 'getImageData') return function(){ return { data: new Uint8ClampedArray(4) }; };
    return function(){};
  },
  set: function(){ return true; }
});
var elCache = {};
global.document = {
  getElementById: function(id){ if (!elCache[id]) elCache[id] = mkEl(); return elCache[id]; },
  createElement: function(t){ return mkEl(t); },
  querySelector: function(){ return mkEl(); },
  querySelectorAll: function(){ return []; },
  body: mkEl('body'),
  addEventListener: function(){}, removeEventListener: function(){},
  readyState: 'complete', hidden: false
};
global.window = {
  innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: function(){}, removeEventListener: function(){},
  requestAnimationFrame: function(){ return 0; },
  AudioContext: undefined, webkitAudioContext: undefined,
  onerror: null
};
global.navigator = { getGamepads: function(){ return []; }, userAgent: 'node-test' };
global.localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
global.performance = { now: function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.cancelAnimationFrame = function(){};
global.alert = function(m){ console.log('  [alert] ' + m); };
global.setTimeout = setTimeout; global.setInterval = setInterval;
global.setImmediate = setImmediate; global.clearTimeout = clearTimeout;

process.on('uncaughtException', function(e){
  errors.push('uncaught: ' + e.message + '  ::  ' + (e.stack||'').split('\n')[1]);
});

// ---------- 运行 ----------
try {
  eval(code);
  console.log('  ✅ 脚本加载完成（IIFE 执行完毕）');
} catch (e) {
  errors.push('load: ' + e.message + '  ::  ' + (e.stack||'').split('\n')[1]);
  console.log('  ❌ 加载即报错: ' + e.message);
}
setTimeout(function(){
  if (errors.length){
    console.log('\n  ❌ 发现 ' + errors.length + ' 个运行时错误：');
    errors.forEach(function(x){ console.log('     ' + x); });
    process.exit(1);
  } else {
    console.log('  ✅ 无运行时错误（加载 + 首帧）');
  }
  process.exit(0);
}, 260);
