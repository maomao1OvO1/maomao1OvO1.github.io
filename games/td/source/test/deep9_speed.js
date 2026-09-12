// v5.3 倍速档位验证：无尽模式 1/2/5/10/100x，子步推进不丢判定
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  spawnEnemy: spawnEnemy, setGold: function(v){ gold = v; },\n' +
  '  speed: function(){ return speedMul; }, time: function(){ return gameT; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    kills: kills, running: running, WAVES_TOTAL: WAVES_TOTAL, endless: endless }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'', value:'',
    width:800, height:600, offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600,
    _hidden:false, _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    fire:function(t){ if (el._handlers[t]) el._handlers[t]({ stopPropagation:function(){}, target:el }); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){ return null; }, contains:function(){ return false; }, getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
  Object.defineProperty(el, 'innerHTML', { get:function(){ return el._html; },
    set:function(v){ el._html = v; el.children = []; } });
  return el;
}
var ctx = new Proxy({}, { get:function(t,k){
  if (k==='canvas') return mkEl('canvas');
  if (k==='createRadialGradient'||k==='createLinearGradient') return function(){ return { addColorStop:function(){} }; };
  if (k==='measureText') return function(){ return { width:10 }; };
  return function(){};
}, set:function(){ return true; } });
var elCache = {};
global.document = { getElementById:function(id){ if(!elCache[id]) elCache[id]=mkEl(); return elCache[id]; },
  createElement:function(t){ return mkEl(t); }, querySelector:function(){ return mkEl(); },
  querySelectorAll:function(){ return []; }, body:mkEl('body'), addEventListener:function(){}, readyState:'complete' };
global.window = { innerWidth:800, innerHeight:600, devicePixelRatio:1, addEventListener:function(){},
  AudioContext:undefined, webkitAudioContext:undefined };
global.navigator = { getGamepads:function(){ return []; } };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){}, removeItem:function(){} };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 2e7;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }
function clickSpeed(){ T.el('speedBtn').fire('click'); }

console.log('=== ① 普通关卡：只有 1x / 2x ===');
T.startLevel(0);
ok(T.speed() === 1, '进关卡默认 1x');
clickSpeed(); ok(T.speed() === 2, '点一下 → 2x');
clickSpeed(); ok(T.speed() === 1, '再点回到 1x（普通关卡不上高档）');

console.log('=== ② 无尽模式：1 → 2 → 5 → 10 → 100 → 1 ===');
T.startEndless();
var seq = [];
for (var i = 0; i < 5; i++){ clickSpeed(); seq.push(T.speed()); }
ok(seq.join(',') === '2,5,10,100,1', '档位循环 = ' + seq.join(' → '));
clickSpeed(); clickSpeed(); clickSpeed(); clickSpeed();   // 回到 100x
ok(T.speed() === 100, '当前 = ' + T.speed() + 'x');
ok(T.el('speedBtn').textContent.indexOf('100x') >= 0, '按钮文案 = ' + T.el('speedBtn').textContent);

console.log('=== ③ 倍速真的生效（战场时间推进 ≈ 倍率）===');
T.startLevel(0);
T.setGold(99999);
// 只取 5 帧窗口：跑久了会跨波次（波次结束会弹强化卡并暂停，时间就不再加速）
var t0 = T.time(); step(5); var g1 = T.time() - t0;
T.startEndless(); T.setGold(99999);
for (var k = 0; k < 4; k++) clickSpeed();                  // 100x
var t1 = T.time(); step(5); var g100 = T.time() - t1;
ok(g1 > 0.06 && g1 < 0.12, '1x 跑 5 帧推进 ' + g1.toFixed(3) + ' 秒游戏时间');
ok(g100 > g1 * 50, '100x 跑 5 帧推进 ' + g100.toFixed(2) + ' 秒游戏时间（≈' + (g100 / g1).toFixed(0) + ' 倍）');

console.log('=== ④ 100x 下塔照常开火、怪照常被杀（子步没丢判定）===');
T.startEndless(); T.setGold(999999);
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 9 && placed < 14; c++)
  for (var r = 0; r < 14 && placed < 14; r++)
    if (T.addTower(c, r, elems[(c + r) % 6])) placed++;
for (var k2 = 0; k2 < 4; k2++) clickSpeed();               // 100x
for (var m = 0; m < 12; m++) T.spawnEnemy('normal');
var killed0 = T.getS().kills;
step(90);
var killed = T.getS().kills - killed0;
ok(killed >= 6, '100x 下 90 帧内击杀 ' + killed + '/12 只（塔正常输出）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v5.3 倍速档位验证全部通过（0 失败）' : '  ❌ v5.3 倍速档位 ' + fail + ' 项失败');
