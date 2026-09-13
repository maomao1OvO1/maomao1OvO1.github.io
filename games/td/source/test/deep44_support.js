// v9.16 专项：支持作者入口（毛毛：「喜欢这个游戏的按钮去哪里？没法打赏了」）
// 背景：这个入口 v8.29 做过，v9.0 像素风重构时整段丢了 → 本测试看住它，别再丢。
// 期望：① 三处入口都在（主界面页脚 / 通关结算 / 失败结算）；
//       ② 都在、都指向线上支持页 support.html；③ 点击能打开（APK 走原生桥，网页版走新标签页）。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, openSupport: openSupport, SUPPORT_URL: SUPPORT_URL,\n' +
  '  el: function(id){ return document.getElementById(id); }, setAndroid: function(o){ window.Android = o; } };\n' +
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
var opened=[];
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){},
  open:function(u){ opened.push(u); return null; }};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function txt(id){ return String(T.el(id).textContent || ''); }

console.log('=== ① 三处入口都在（别再丢）===');
ok(html.indexOf('id="supportBtn"') >= 0, '主界面页脚入口存在（id=supportBtn）');
ok(html.indexOf('喜欢这个小游戏') >= 0, '页脚文案在：「💛 喜欢这个小游戏？」');
ok(html.indexOf('id="clearSupport"') >= 0, '通关结算入口存在（id=clearSupport）');
ok(html.indexOf('请作者喝杯奶茶') >= 0, '通关文案在：「💛 玩得开心？请作者喝杯奶茶」');
ok(html.indexOf('id="overSupport"') >= 0, '失败结算入口存在（id=overSupport）');
ok(html.indexOf('熬了不少夜') >= 0, '失败文案在：「💛 打得不顺？作者写这个游戏熬了不少夜」');

console.log('=== ② 都指向线上支持页 ===');
ok(T.SUPPORT_URL.indexOf('/games/td/support.html') > 0, 'SUPPORT_URL = ' + T.SUPPORT_URL);
ok(T.SUPPORT_URL.indexOf('https://') === 0, '支持页用的是 https 绝对地址（APK 内也能打开）');

console.log('=== ③ 点击能打开（APK 走原生桥 → 交系统浏览器）===');
var bridged=[];
T.setAndroid({ openUrl:function(u){ bridged.push(u); } });
T.el('supportBtn').fire('click');
ok(bridged.length === 1 && bridged[0] === T.SUPPORT_URL, '主界面入口点击 → 原生桥收到支持页地址');
T.el('clearSupport').fire('click');
T.el('overSupport').fire('click');
ok(bridged.length === 3, '通关 / 失败两处入口同样能打开（共 ' + bridged.length + ' 次）');

console.log('=== ④ 没有原生桥时退化到新标签页 ===');
T.setAndroid(null);
opened.length = 0;
T.el('supportBtn').fire('click');
ok(opened.length === 1 && opened[0] === T.SUPPORT_URL, '网页版点击 → window.open 打开支持页');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v9.16 支持作者入口专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
