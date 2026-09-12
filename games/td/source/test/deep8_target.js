// v5.2 索敌优先级验证：① 离基地近优先 ② 路程相同则血量最低优先
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, spawnEnemy: spawnEnemy,\n' +
  '  pathLenToWp: pathLenToWp, setGold: function(v){ gold = v; },\n' +
  '  at: function(c, r){ return { x: cx(c), y: cy(r) }; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers, running: running, kills: kills }; },\n' +
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
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 9e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }
// 两个测试敌人：都放在塔射程内、路径上
function setup(hpA, doneA, hpB, doneB){
  T.startLevel(0); T.setGold(9999);
  T.addTower(0, 0, 'phys');                     // 纯单体塔（火焰塔 v5.6 起带溅射，会同时伤到旁边那只，干扰索敌判定）
  var es = T.getS().enemies;
  T.spawnEnemy('normal'); T.spawnEnemy('normal');
  var A = es[0], B = es[1];
  var pa = T.at(0, 1), pb = T.at(1, 1);
  A.x = pa.x; A.y = pa.y; A.hp = hpA; A.maxhp = hpA; A.done = doneA; A.wp = 1; A.spawnT = 0;
  B.x = pb.x; B.y = pb.y; B.hp = hpB; B.maxhp = hpB; B.done = doneB; B.wp = 1; B.spawnT = 0;
  return { A: A, B: B };
}

console.log('=== ① 离基地近的优先（哪怕它血多）===');
var r = setup(500, 100, 12, 40);          // A 靠近基地但血厚；B 落后但血少
step(1);
ok(r.A.hp < 500 && r.B.hp === 12, '打了离基地近的 A（A 掉血=' + (500 - r.A.hp).toFixed(1) + '，B 未掉血=' + r.B.hp + '）');

console.log('=== ② 路程相同 → 血量最低优先 ===');
var r2 = setup(500, 100, 12, 100);        // 同进度，A 血厚 B 血少
step(1);
ok(r2.B.hp < 12 && r2.A.hp === 500, '打了血少的 B（B 掉血=' + (12 - r2.B.hp).toFixed(1) + '，A 未掉血=' + r2.A.hp + '）');

console.log('=== ③ 不会被「离塔更近」误导 ===');
var r3 = setup(400, 120, 8, 60);          // B 离塔更近，但 A 更靠近基地
step(1);
ok(r3.A.hp < 400, '依然锁定离基地近的 A（旧逻辑会误打离塔近的 B）');

console.log('=== ④ 连续开火会先清掉「最先到基地」的那只 ===');
var r4 = setup(60, 130, 60, 128);         // 血量相同，A 更靠前
r4.A.speed = 0; r4.B.speed = 0;           // 定住不动，否则会跑出塔的射程（测试塔在 (0,0)）
var n = 0;
while (r4.A.hp > 0 && r4.B.hp > 0 && n < 400){ n++; T.frame(CLK += 16.7); }
ok(r4.A.hp <= 0 || T.getS().enemies.indexOf(r4.A) < 0, '先击杀更靠近基地的 A（' + n + ' 帧内）');

console.log('=== ⑤ 召唤物的路径进度会被补齐（不会排到最后）===');
ok(T.pathLenToWp(0) === 0, 'pathLenToWp(0) = 0');
ok(T.pathLenToWp(3) > T.pathLenToWp(2) && T.pathLenToWp(2) > 0, 'pathLenToWp 随航点递增（2→' + T.pathLenToWp(2).toFixed(0) + 'px，3→' + T.pathLenToWp(3).toFixed(0) + 'px）');

console.log('=== ⑥ 实战跑 3 波无报错 ===');
T.startLevel(0); T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 9 && placed < 18; c++)
  for (var rr = 0; rr < 14 && placed < 18; rr++)
    if (T.addTower(c, rr, elems[(c + rr) % 6])) placed++;
var guard = 0, cards = 0;
while (guard < 12000 && cards < 3){
  guard++;
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){ var b = T.el('buffList').children[0]; if (b) b.fire('click'); cards++; }
}
console.log('  建塔 ' + placed + ' · 波次 ' + T.getS().wave + ' · 击杀 ' + T.getS().kills);
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v5.2 索敌专项验证全部通过（0 失败）' : '  ❌ v5.2 索敌专项 ' + fail + ' 项失败');
