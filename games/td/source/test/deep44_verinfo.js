// v8.23 专项：版本信息面板（点版本号开/关）+ 横屏小高度压缩规则
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { showVerInfo: showVerInfo, hideVerInfo: hideVerInfo, toggleVerInfo: toggleVerInfo,\n' +
  '  verInfoText: verInfoText, gameVerStr: gameVerStr, BUILD_CODE: BUILD_CODE,\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){e._hidden=true;},remove:function(){e._hidden=false;},contains:function(){return e._hidden;}},
  appendChild:function(c){e.children.push(c);return c;},insertBefore:function(c){e.children.unshift(c);return c;},
  addEventListener:function(t2,f){e._handlers[t2]=f;},
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
global.window={innerWidth:1181,innerHeight:540,devicePixelRatio:2,addEventListener:function(){}};
/* ⚠️ Node 21+ 里 global.navigator 是内建只读对象，直接赋值会被忽略（读到的还是 Node 的 UA）
   → 必须用 defineProperty 强制覆盖，否则测的就不是真实行为 */
Object.defineProperty(global, 'navigator', { configurable: true, writable: true,
  value: { userAgent: 'Mozilla/5.0 (Linux; Android 15; PJZ110 Build/AP3A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
           getGamepads: function(){ return []; } } });
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
/* 还原真实 DOM 的初始状态：index.html 里 #verOv 是 class="ov hidden"、#homeVer 有打包注入的版本号文本。
   桩默认 textContent 为空、_hidden 为 false，不还原的话测的就不是真实行为。 */
T.el('verOv')._hidden = true;
T.el('homeVer').textContent = 'v8.23 ▾';
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 入口：版本号可点，且真的显示出来 ===');
ok(T.el('homeVer')._handlers.click !== undefined, '主界面版本号 #homeVer 已绑定点击');
ok(/#homeVer\{[^}]*cursor:pointer/.test(html), '版本号样式带手型光标（一眼看出能点）');
ok(/id="homeVer"[^>]*>v__VERSION__/.test(html), '版本号仍是打包时注入的占位符（不会忘同步）');
ok(html.indexOf('max-height:640px') > 0, '★ 新增 640px 档压缩规则（原来只有 480px 档，横屏手机 540px 高时不生效 → 内容被裁）');
var _mq = html.slice(html.indexOf('@media (max-height:640px)'), html.indexOf('@media (max-height:640px)') + 1200);
ok(/\.logo\{font-size:clamp/.test(_mq) && /home-stats \.st\{padding/.test(_mq) && /home-menu \.btn\{padding:7px 4px/.test(_mq),
   '压缩档里把 logo / 战绩胶囊 / 网格瓦片都压扁了（保证一屏放得下）');

console.log('=== ② 点开 / 再点关上 ===');
ok(T.el('verOv')._hidden === true, '初始版本信息面板是关着的');
T.el('homeVer').fire('click');
ok(T.el('verOv')._hidden === false, '★ 点版本号 → 面板打开');
var body = String(T.el('verBody')._html || '');
ok(body.indexOf('游戏版本') >= 0 && body.indexOf('构建号') >= 0, '面板含「游戏版本 + 构建号」');
ok(body.indexOf('Android 15') >= 0, '面板读出了系统版本（从 UA 解析：Android 15）');
ok(body.indexOf('PJZ110') >= 0, '面板读出了机型（PJZ110）');
ok(body.indexOf('Chrome/WebView 128') >= 0, '面板读出了 WebView 内核版本（128）');
ok(body.indexOf('MIT') >= 0, '面板写明 MIT 开源许可');
ok(body.indexOf('最高波次') >= 0 && body.indexOf('成就') >= 0, '面板含存档进度（最高波次 / 成就等）');
T.el('homeVer').fire('click');
ok(T.el('verOv')._hidden === true, '★ 再点一下版本号 → 面板关上（毛毛要求的行为）');
T.showVerInfo();
T.el('verCloseBtn').fire('click');
ok(T.el('verOv')._hidden === true, '面板里的「关闭」按钮也能关');

console.log('=== ③ 复制信息（给别人反馈用）===');
var txt = T.verInfoText();
ok(txt.indexOf('《共鸣之塔》版本信息') === 0, '一键复制的文本以标题开头');
ok(txt.indexOf('游戏版本：v') >= 0, '复制文本含版本号（' + (txt.match(/游戏版本：[^\n]*/) || [''])[0] + '）');
ok(txt.indexOf('系统版本：Android') >= 0 && txt.indexOf('WebView') >= 0, '复制文本含环境信息');
ok(txt.split('\n').length >= 10, '复制文本行数够全（' + txt.split('\n').length + ' 行）');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.23 版本信息面板 + 横屏自适应专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
