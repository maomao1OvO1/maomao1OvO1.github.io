// v6.8 存档分享验证：编解码往返 / 校验和 / 格式拒绝 / 导入只增不减
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { saveEncode: saveEncode, saveDecode: saveDecode, saveImport: saveImport,\n' +
  '  getProg: function(){ return prog; }, setProg: function(p){ prog = p; },\n' +
  '  saveProg: saveProg, el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
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
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; }

console.log('=== ① 生成存档码（普通玩家进度）===');
T.setProg({ unlocked: 3, best: { 0: 10, 1: 12 }, stars: { 0: 3, 1: 2 }, tutorialDone: true });
LS['td_best'] = '12'; LS['td_endless_best'] = '23';
var code1 = T.saveEncode();
ok(code1.indexOf('MTD1-') === 0, '存档码格式正确：' + code1.slice(0, 28) + '…（共 ' + code1.length + ' 字符）');
ok(code1.length < 220, '长度适合粘贴分享（' + code1.length + ' 字符）');

console.log('=== ② 解码往返一致 ===');
var d1 = T.saveDecode(code1);
ok(d1 && d1.p && d1.p.u === 3, '解锁关卡解出 = ' + (d1 ? d1.p.u : 'null'));
ok(d1 && d1.p.b['0'] === 10 && d1.p.b['1'] === 12, '各关最佳波次解出正确');
ok(d1 && d1.p.s['0'] === 3 && d1.p.s['1'] === 2, '星数解出正确');
ok(d1 && d1.e === 23 && d1.m === 12, '无尽纪录/最高波次解出：' + (d1 ? d1.e + ' / ' + d1.m : ''));

console.log('=== ③ 残缺 / 乱码要拒绝（防粘贴出错）===');
ok(T.saveDecode('') === null, '空串 → 拒绝');
ok(T.saveDecode('随便打几个字') === null, '乱码 → 拒绝');
ok(T.saveDecode(code1.slice(0, code1.length - 1)) === null, '被截断的码 → 拒绝（校验和起作用）');
ok(T.saveDecode(code1.slice(0, -1) + 'f') === null, '校验和被改 → 拒绝');

console.log('=== ④ 导入「只增不减」：别人的存档不会拉低你的进度 ===');
T.setProg({ unlocked: 4, best: { 0: 15 }, stars: { 0: 3 }, tutorialDone: true });
LS['td_best'] = '15'; LS['td_endless_best'] = '31';
var weak = T.saveDecode(T.saveEncode());   // 一个较弱的新存档码（模拟：换成弱号导出）
T.setProg({ unlocked: 2, best: { 0: 8, 1: 5 }, stars: { 0: 1 }, tutorialDone: false });
LS['td_best'] = '8'; LS['td_endless_best'] = '9';
var msg = T.saveImport(T.saveEncode());
var p = T.getProg();
ok(p.unlocked === 2, '导入较弱存档后：解锁仍是自己的 2（没被覆盖）');
T.setProg({ unlocked: 4, best: { 0: 15 }, stars: { 0: 3 }, tutorialDone: true });
LS['td_best'] = '15'; LS['td_endless_best'] = '31';
msg = T.saveImport(code1);         // 导入①里那个（u=3, b0=10…）
p = T.getProg();
ok(p.unlocked === 4, '导入别人存档：解锁取最大值，保持 4（别人的 3 不会降级）');
ok(p.best[0] === 15, '第 1 关最佳保持自己的 15（别人的 10 无效）');
ok(p.best[1] === 12, '第 2 关最佳补上了别人的 12');
ok(p.stars[1] === 2, '第 2 关星数补上了别人的 2');
ok(LS['td_endless_best'] === '31', '无尽纪录取较大值（保持 31，别人的 23 无效）');
ok(msg.indexOf('成功') >= 0, '导入返回提示：' + msg);

console.log('=== ⑤ 导入残缺码不破坏现有存档 ===');
var before = JSON.stringify(T.getProg());
var bad = T.saveImport('MTD1-abc-defg');
ok(bad.indexOf('成功') !== 0, '残缺码返回失败提示：' + bad);
ok(JSON.stringify(T.getProg()) === before, '存档未被破坏');
ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
if (errs.length) errs.slice(0,3).forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v6.8 存档分享验证全部通过（0 失败）' : '  ❌ v6.8 存档分享 ' + fail + ' 项失败');
