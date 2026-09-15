// v5.9 无尽存档验证：自动存 / 手动存 / 续玩恢复 / 非无尽不存
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startEndless: startEndless, resumeEndless: resumeEndless,\n' +
  '  saveEndless: saveEndless, loadEndlessSave: loadEndlessSave, clearEndlessSave: clearEndlessSave,\n' +
  '  frame: frame, addTower: addTower, setGold: function(v){ gold = v; }, goldText: goldText,\n' +
  '  getS: function(){ return { wave: wave, gold: gold, hp: hp, MAXHP: MAXHP, towers: towers,\n' +
  '    kills: kills, endless: endless, running: running, BUFFS: BUFFS, WAVES_TOTAL: WAVES_TOTAL }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'', width:800, height:600,
    offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600, _hidden:false, _handlers:{},
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
var LS = {};
global.localStorage = { getItem:function(k){ return (k in LS) ? LS[k] : null; },
  setItem:function(k,v){ LS[k]=String(v); }, removeItem:function(k){ delete LS[k]; } };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 3e7;

console.log('=== ① 非无尽模式不写存档 ===');
T.startLevel(0); T.setGold(9999);
T.addTower(2, 2, 'fire');
T.saveEndless();
ok(T.loadEndlessSave() === null, '普通关卡不会产生无尽存档');

console.log('=== ② 无尽模式手动存档 ===');
T.clearEndlessSave();
T.startEndless(); T.setGold(9999);
T.addTower(2, 2, 'fire'); T.addTower(2, 3, 'ice'); T.addTower(3, 3, 'thunder');
T.saveEndless();
var sv = T.loadEndlessSave();
ok(sv && sv.towers && sv.towers.length === 3, '存档记录了 3 座塔（' + (sv ? sv.towers.length : 0) + '）');
/* v7.9：金币改 BigInt 精确记账 → 存档里是十进制字符串（JSON 不支持 BigInt），按数值校验 */
var svGold = Number(sv.gold);
ok(sv.wave >= 1 && !isNaN(svGold) && svGold > 0 && typeof sv.hp === 'number',
   '记录了波次/金币/血量（第 ' + sv.wave + ' 波 · ' + sv.gold + ' 金 · ' + sv.hp + ' 血）');
ok(String(sv.gold) === T.goldText(), '存档里的金币与游戏内精确账本一致（' + sv.gold + '）');
ok(sv.towers[0].e === 'fire' && sv.towers[1].e === 'ice' && sv.towers[0].paid > 0, '塔的元素与实付价都存了');

console.log('=== ③ 每波结束自动存档 ===');
T.clearEndlessSave();
T.startEndless(); T.setGold(99999);
for (var c = 0; c < 9; c++) for (var r = 0; r < 14; r++) if (T.addTower(c, r, ['fire','ice','thunder','poison'][(c + r) % 4])) {}
var guard = 0, auto = null;
while (guard < 40000 && !auto){
  guard++;
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){ var b = T.el('buffList').children[0]; if (b) b.fire('click'); }
  auto = T.loadEndlessSave();
}
ok(auto && auto.wave >= 1, '打完波次后自动存档（存到第 ' + (auto ? auto.wave : 0) + ' 波，用了 ' + guard + ' 帧）');

console.log('=== ④ 续玩：状态正确恢复 ===');
var before = T.getS();
var towersBefore = before.towers.length;
T.clearEndlessSave();
T.startEndless(); T.setGold(99999);
T.addTower(0, 0, 'sniper'); T.addTower(0, 2, 'mortar'); T.addTower(5, 5, 'fire');
T.saveEndless();
var svW = T.loadEndlessSave().wave, svG = T.loadEndlessSave().gold;
T.startLevel(0);                                  // 先离开无尽模式
var okResume = T.resumeEndless();
var after = T.getS();
ok(okResume === true && after.endless === true, '成功续玩无尽模式');
ok(after.towers.length === 3, '恢复了 3 座塔（含 🎯狙击 / 💥榴弹）');
ok(Number(svG) === after.gold && after.wave === svW, '金币与波次一致（' + after.gold + ' 金 · 第 ' + after.wave + ' 波）');
ok(after.WAVES_TOTAL === 999, '仍是无尽模式（波次无上限）');

console.log('=== ⑤ 清档 ===');
T.clearEndlessSave();
ok(T.loadEndlessSave() === null, '清除后读不到存档');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v5.9 无尽存档验证全部通过（0 失败）' : '  ❌ v5.9 无尽存档 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
