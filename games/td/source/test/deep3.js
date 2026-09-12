var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startGame: startGame, startLevel: startLevel, frame: frame, addTower: addTower,\n' +
  '  showLevels: showLevels, getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies,\n' +
  '    towers: towers, running: running, paused: paused, kills: kills, WAVES_TOTAL: WAVES_TOTAL,\n' +
  '    prog: prog, lvIndex: lvIndex, BUFFS: BUFFS, LEVELS: LEVELS }; }, setGold: function(v){ gold = v; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', innerHTML:'',
    value:'', width:800, height:600, offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600, _hidden:false,
    _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ c._parent = el; this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    removeEventListener:function(){}, setPointerCapture:function(){},
    fire:function(t, ev){ if (el._handlers[t]) el._handlers[t](ev || { stopPropagation:function(){}, target:el, clientX:0, clientY:0 }); },
    remove:function(){}, closest:function(){ return null; }, contains:function(){ return false; },
    getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
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
global.alert = function(m){ console.log('    [alert] ' + m); };
process.on('uncaughtException', function(e){ errors.push(e.message); console.log('  !!! 未捕获异常: ' + e.message); });
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var t0 = 0, fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
function run1(){ t0 += 16; T.frame(t0); }

console.log('=== 第三遍：完整通关（自动选卡，跑满 10 波）===');
T.startLevel(0);
T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison'];
for (var c = 0; c < 9 && placed < 30; c++)
  for (var r = 0; r < 14 && placed < 30; r++)
    if (T.addTower(c, r, elems[(c+r)%4])) placed++;
console.log('  自动布置 ' + placed + ' 座塔');

var cards = 0, guard = 0, cleared = false;
while (guard < 300000){
  run1(); guard++;
  var s = T.getS();
  if (s.hp <= 0){ console.log('  ⚠️ 中途中阵亡（第 ' + s.wave + ' 波）'); break; }
  if (T.el('clearOv')._hidden === false){ cleared = true; break; }   /* v7.8：不依赖选卡弹窗时机 */
  if (s.paused && !s.running){
    var list = T.el('buffList');
    if (list.children.length > 0){
      list.children[0].fire('click');
      cards++;
      continue;
    } else break;
  }
}
var s2 = T.getS();
console.log('  模拟时长 ' + (guard/62).toFixed(0) + ' 秒 · 波次 ' + s2.wave + '/' + s2.WAVES_TOTAL +
            ' · 选了 ' + cards + ' 次强化 · 血 ' + s2.hp + ' · 击杀 ' + s2.kills);
ok(cards >= 9, '每波结束都弹卡片（选了 ' + cards + ' 次，应为 ≥9 次）');
ok(cleared === true, '打完最后一波触发「关卡完成」界面');
ok(T.getS().prog.unlocked >= 2, '通关后第 2 关已解锁（unlocked=' + T.getS().prog.unlocked + '）');
ok(errors.length === 0, '通关全程无运行时错误');

console.log('=== 第三遍：强化叠加是否真的生效 ===');
var B = T.getS().BUFFS;
console.log('  当前强化: 伤害×' + B.dmg.toFixed(2) + ' 攻速×' + B.rate.toFixed(2) +
            ' 射程×' + B.range.toFixed(2) + ' 金币×' + B.gold.toFixed(2) + ' 暴击' + (B.crit*100).toFixed(0) + '%');
ok(B.dmg > 1 || B.rate > 1 || B.range > 1 || B.gold > 1 || B.crit > 0 || Object.keys(B.tw || {}).length > 0,
   '强化确实叠加生效（通用 + 专属 ' + Object.keys(B.tw || {}).join(',') + '）');

console.log('=== 第三遍：连续开 3 关不残留状态 ===');
T.startLevel(1); var g1 = T.getS().gold;
T.startLevel(2); var g2 = T.getS().gold;
var LVG = T.getS().LEVELS;
ok(g1 === LVG[1].gold && g2 === LVG[2].gold,
   '切关后金币按关卡重置（' + g1 + ' / ' + g2 + '，配置 ' + LVG[1].gold + ' / ' + LVG[2].gold + '）');
ok(T.getS().towers.length === 0, '切关后塔已清空');
ok(T.getS().enemies.length === 0, '切关后敌人已清空');
ok(T.getS().BUFFS.dmg === 1, '切关后强化已重置');

console.log('');
if (errors.length){ console.log('  ❌ 错误：'); errors.forEach(function(x){ console.log('     ' + x); }); }
console.log(fail === 0 ? '  ✅✅ 第三遍全部通过（0 失败）' : '  ❌ 第三遍 ' + fail + ' 项失败');
process.exit(0);
