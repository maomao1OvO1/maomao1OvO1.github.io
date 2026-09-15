// v8.27 专项：① 存档码导入能识别「带中文前后缀的整段文本」 ② 分享文案含网站推广与感谢
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { saveDecode: saveDecode, saveImport: saveImport, saveEncode: saveEncode,\n' +
  '  prog: function(){ return prog; }, el: function(id){ return document.getElementById(id); },\n' +
  '  shareText: function(){ var el = document.getElementById("saveCode");\n' +
  '    var c = (el && el.value) ? el.value : saveEncode();\n' +
  '    return "🎮 我在玩《共鸣之塔》" + c; } };\n' +
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

/* 毛毛真实发来的那份（含中文前缀的整段）*/
var CODE = 'MTD1-eyJwIjp7InUiOjUsImIiOnsiMCI6MTAsIjEiOjEyLCIyIjoxNCwiMyI6MTZ9LCJzIjp7IjAiOjMsIjEiOjMsIjIiOjMsIjMiOjN9LCJ0IjoxfSwiZSI6MjAzLCJtIjozfQ-61f9';
var FULL = '【共鸣之塔】我的存档码（在游戏里 设置 → 存档分享 → 粘贴导入）：\n' + CODE;

console.log('=== ① 纯存档码照旧能解 ===');
var d0 = T.saveDecode(CODE);
ok(!!d0 && !!d0.p, '纯码可解（解锁 ' + (d0 && d0.p && d0.p.u) + ' 关 · 无尽 ' + (d0 && d0.e) + ' 波）');
ok(d0 && d0.e === 203 && d0.m === 3, '解出的内容与预期一致（无尽 203 / 最高波次 3）');

console.log('=== ② 带中文前后缀的整段也能解（毛毛报的 bug）===');
var d1 = T.saveDecode(FULL);
ok(!!d1 && !!d1.p, '★ 整段粘贴可解（修复前这里返回 null → 提示格式不对）');
ok(d1 && d1.p.u === 5, '★ 解锁关卡正确解出：' + (d1 && d1.p.u));
ok(d1 && d1.e === 203, '★ 无尽波次正确解出：' + (d1 && d1.e));

console.log('=== ③ 各种「整段文本」形态都要认 ===');
var variants = [
  ['前后带空格', '   ' + CODE + '   '],
  ['前面有换行和空行', '\n\n' + CODE + '\n'],
  ['夹在句子中间', '这是我的存档码 ' + CODE + ' 谢谢你'],
  ['带引号', '「' + CODE + '」'],
  ['分享原文（多行）', '🎮 我在玩《共鸣之塔》\n这是存档码：\n' + CODE + '\n\n更多游戏：https://maomao1ovo1.github.io/']
];
variants.forEach(function(v){
  var d = T.saveDecode(v[1]);
  ok(!!d && !!d.p, v[0] + ' → 能解出来');
});

console.log('=== ④ 安全性没被放松：改过的/残缺的仍然拒绝 ===');
var tampered = CODE.replace(/-61f9$/, '-aaaa');
ok(T.saveDecode(tampered) === null, '校验和被改 → 仍然拒绝');
ok(T.saveDecode('MTD1-abcdefg-ffff') === null, '乱编的码 → 仍然拒绝');
ok(T.saveDecode('MTD1-eyJwIjp7InUiOjV9') === null, '缺校验和的残缺码 → 仍然拒绝');
ok(T.saveDecode('随便一段没有码的中文文本') === null, '压根没有码的文本 → 拒绝');

console.log('=== ⑤ 真正走一遍导入流程（用毛毛的整段）===');
var msg = T.saveImport(FULL);
ok(msg.indexOf('导入成功') === 0, '★ 整段导入成功：' + msg);
ok(T.prog().unlocked === 5, '进度已写入（解锁 ' + T.prog().unlocked + ' 关）');
ok(global.localStorage.getItem('td_endless_best') === '203', '无尽最高波次已写入（' + global.localStorage.getItem('td_endless_best') + '）');

console.log('=== ⑥ 分享文案：推广网站 + 感谢游玩 ===');
ok(html.indexOf('更多自制小游戏') >= 0, '★ 分享文案里有「更多自制小游戏」引导');
ok(html.indexOf('https://maomao1ovo1.github.io/') >= 0, '★ 分享文案里有网站地址');
ok(/感谢游玩/.test(html), '★ 分享文案里有「感谢游玩」');
ok(/完全开源（MIT）|MIT 开源|完全开源/.test(html), '分享文案里提到了开源');
ok(html.indexOf('🎮 我在玩《共鸣之塔》') >= 0, '分享文案有开场标题（分享出去像一句话而不是干巴巴的码）');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.27 存档码容错 + 分享文案 专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
