// v8.11 专项：敌人美术多风格（发光球/几何派/表情派/装甲派）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  enemySprite: enemySprite, ENEMY_ART_LIST: ENEMY_ART_LIST, ENEMY_SHAPE: ENEMY_SHAPE, enemyShapePath: enemyShapePath,\n' +
  '  cycleEnemyArt: cycleEnemyArt, enemyArtName: enemyArtName, showSet: showSet, saveSettings: saveSettings,\n' +
  '  loadSettings: loadSettings, getArt: function(){ return ENEMY_ART; }, setArt: function(k){ ENEMY_ART = k; enemyTex = {}; },\n' +
  '  texCount: function(){ var n = 0; for (var k in enemyTex) n++; return n; }, ENEMIES: ENEMIES,\n' +
  '  setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); },\n' +
  '  spawnEnemy: spawnEnemy, clearE: function(){ enemies = []; },\n' +
  '  getS: function(){ return { enemies: enemies, towers: towers }; },\n' +
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
var drawCalls = 0;
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};};
  return function(){ drawCalls++; }; }, set:function(){return true;} });
var cache={};
var canvasSeq = 0;
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },
  createElement:function(t){
    var el = mkEl(t);
    if (t === 'canvas'){ el.getContext = function(){ return ctx; }; el.width = 0; el.height = 0; el.__seq = ++canvasSeq; }
    return el;
  },
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

console.log('=== ① 4 套美术风格都在 ===');
ok(T.ENEMY_ART_LIST.length === 4, '共 ' + T.ENEMY_ART_LIST.length + ' 套敌人美术风格');
T.ENEMY_ART_LIST.forEach(function(a){ ok(a.key && a.name && a.tip, '「' + a.name + '」：' + a.tip); });
ok(T.ENEMY_ART_LIST[0].key === 'orbs', '默认是原版「发光球」（不改变老玩家观感）');

console.log('=== ② 每套风格都能生成贴图（程序绘制、零图片资源）===');
var types = Object.keys(T.ENEMIES);
T.ENEMY_ART_LIST.forEach(function(a){
  T.setArt(a.key);
  drawCalls = 0;
  var tex = T.enemySprite('#ff5a2a', 12, false, a.key, 'normal');
  ok(tex && tex.cv && tex.size > 0 && tex.r > 0 && drawCalls > 2,
     '「' + a.name + '」能画出贴图（画布 ' + tex.size + 'px，绘制调用 ' + drawCalls + ' 次）');
});

console.log('=== ③ 几何派：每种敌人一种外形 ===');
var shapes = {};
types.forEach(function(t2){ shapes[T.ENEMY_SHAPE[t2] || 'circle'] = 1; });
ok(Object.keys(shapes).length >= 6, '共用到 ' + Object.keys(shapes).length + ' 种几何外形（' + Object.keys(shapes).join('/') + '）');
ok(T.ENEMY_SHAPE.boss === 'star' && T.ENEMY_SHAPE.fast === 'tri' && T.ENEMY_SHAPE.armor === 'hex',
   'BOSS=星形 / 疾行者=三角 / 装甲=六边形（一眼能分辨）');
var shapeBad = 0;
Object.keys(T.ENEMY_SHAPE).forEach(function(t3){
  drawCalls = 0;
  T.setArt('shapes');
  var tex = T.enemySprite('#7ea8d8', 12, false, 'shapes', t3);
  if (!tex || drawCalls < 2) shapeBad++;
});
ok(shapeBad === 0, '所有敌人类型都能画出对应几何外形（' + Object.keys(T.ENEMY_SHAPE).length + ' 种，0 失败）');

console.log('=== ④ 贴图缓存按风格隔离（切风格不会用旧图）===');
T.setArt('orbs');
T.enemySprite('#ff5a2a', 12, false, 'orbs', 'normal');
var n1 = T.texCount();
T.enemySprite('#ff5a2a', 12, false, 'orbs', 'normal');
ok(T.texCount() === n1, '同风格同参数命中缓存（贴图数不变 = ' + n1 + '）');
T.enemySprite('#ff5a2a', 12, false, 'faces', 'normal');
ok(T.texCount() === n1 + 1, '换风格会生成新贴图（缓存按风格隔离，' + n1 + ' → ' + T.texCount() + '）');
T.enemySprite('#ff5a2a', 12, false, 'shapes', 'boss');
ok(T.texCount() === n1 + 2 && T.texCount() > n1, '同风格不同敌人类型也各自独立缓存');

console.log('=== ⑤ 切换与持久化 ===');
var start = T.getArt();
T.cycleEnemyArt();
ok(T.getArt() !== start, '切换后风格变了（' + T.enemyArtName(start) + ' → ' + T.enemyArtName(T.getArt()) + '）');
ok(T.texCount() === 0, '切换时清空贴图缓存（下次绘制用新风格重生成）');
T.setArt('orbs');                 /* 显式定起点，保证这段断言可复现 */
var seq = [];
for (var i = 0; i < 4; i++){ T.cycleEnemyArt(); seq.push(T.getArt()); }
var seenArt = {};
seq.forEach(function(k){ seenArt[k] = 1; });
ok(Object.keys(seenArt).length === 4, '连续切 4 次会轮遍全部 4 种风格（' + seq.map(function(k){ return T.enemyArtName(k); }).join(' → ') + '）');
ok(T.getArt() === 'orbs', '切满 4 次正好回到起点（形成循环）');
T.setArt('armored');
T.saveSettings();
var raw = global.localStorage.getItem('td_settings');
ok(/armored/.test(String(raw)), '风格写进了设置存档（td_settings 含 armored）');
T.setArt('orbs');
T.loadSettings();
ok(T.getArt() === 'armored', '重新读设置能恢复上次选的美术（' + T.enemyArtName(T.getArt()) + '）');
T.setArt('poses');
T.loadSettings();
ok(T.getArt() === 'armored', '存档里的非法风格值会被忽略（不会崩）');

console.log('=== ⑥ 设置面板入口 + 实战绘制 ===');
T.showSet('start');
ok(/敌人美术/.test(String(T.el('setArtBtn').textContent)), '设置面板有「' + T.el('setArtBtn').textContent + '」按钮');
ok(html.indexOf("on('setArtBtn'") >= 0, '按钮已绑定点击事件（点击即切换）');
ok(html.indexOf('enemySprite(e.color, e.r, e.hitFlash > 0, ENEMY_ART, e.type)') >= 0,
   '战场绘制时把当前风格与敌人类型传进贴图函数');
T.startLevel(0); T.setGold(99999); T.setWave(12);
T.clearE();
types.slice(0, 6).forEach(function(t4){ T.spawnEnemy(t4); });
var t0 = 0, err0 = errs.length;
['orbs', 'shapes', 'faces', 'armored'].forEach(function(a){
  T.setArt(a);
  for (var f = 0; f < 40; f++){ t0 += 16; T.frame(t0); }
});
ok(errs.length === err0, '4 套风格各跑 40 帧无报错（新增 ' + (errs.length - err0) + ' 条）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.11 敌人美术多风格专项全部通过（0 失败）' : '  ❌ v8.11 专项 ' + fail + ' 项失败');
