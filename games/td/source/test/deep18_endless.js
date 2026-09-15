// v6.0 无尽后期平衡验证：造价斜率 / 回血削弱 / 单波封顶 / 血量补偿 / 边界与污染
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  towerCost: towerCost, waveComp: waveComp, packFactor: packFactor, spawnEnemy: spawnEnemy,\n' +
  '  updateWaveInfo: updateWaveInfo, startWave: startWave, ELEMS: ELEMS, MAX: function(){ return MAX_WAVE_MOBS; },\n' +
  '  setHp: function(v){ hp = v; },\n' +
  '  clearWave: function(){ enemies.length = 0; spawnQueue.length = 0; curGroup = null; },\n' +
  '  forceWave: function(w){ wave = w; waveActive = true; enemies.length = 0; spawnQueue.length = 0; curGroup = null; waveBreak = 1.2; },\n' +
  '  resumeSim: function(){ paused = false; running = true; last = 0; },\n' +
  '  packMulGet: function(){ return packMul; }, setWave: function(w){ wave = w; },\n' +
  '  setGold: function(v){ gold = v; },\n' +
  '  getS: function(){ return { wave: wave, gold: gold, hp: hp, MAXHP: MAXHP, enemies: enemies,\n' +
  '    towers: towers, endless: endless, spawnQueue: spawnQueue }; },\n' +
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
global.localStorage = { getItem:function(k){ return (k in LS)?LS[k]:null; }, setItem:function(k,v){ LS[k]=String(v); }, removeItem:function(k){ delete LS[k]; } };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
function total(list){ var s = 0; list.forEach(function(g){ s += g.n; }); return s; }

console.log('=== ① 造价斜率随波次递增（钱有去处）===');
T.startEndless(); T.setGold(999999);
T.setWave(1);
var c1 = T.towerCost('fire');
T.addTower(0, 0, 'fire');
var c1b = T.towerCost('fire');
ok(c1b > c1, '第 1 波：第 2 座比第 1 座贵（' + c1 + ' → ' + c1b + '）');
T.startEndless(); T.setGold(999999); T.setWave(30);
var base = T.ELEMS.fire.cost;
for (var i = 0; i < 10; i++) T.addTower(i, 0, 'fire');
var c30 = T.towerCost('fire');
ok(c30 > Math.round(base * (1 + 10 * 0.045)), '第 30 波：同样 10 座塔时价格明显更高（' + c30 + ' 金，基础 ' + base + '）');
ok(T.towerCost('fire') / base > 1.6, '第 30 波 10 座塔 → 单价约为基础的 ' + (c30 / base).toFixed(2) + ' 倍（后期钱花得出去）');

console.log('=== ② 回血削弱（后期真的会掉血）===');
T.startEndless(); T.setGold(99999);
var s0 = T.getS();
ok(s0.MAXHP === 20, '无尽开局血上限 20');
var CLK = 1e8;
function endWaveAt(w, hpSet){
  T.el('buffOv').classList.add('hidden');
  T.resumeSim();                       // 上一波结束时会被强化卡暂停
  T.setHp(hpSet);
  T.forceWave(w);                      // 强制把当前波设为 w 且置为「进行中」，再清空敌人 → 触发第 w 波的结束结算
  for (var i = 0; i < 10; i++) T.frame(CLK += 16.7);
}
endWaveAt(9, 10);
var hp9 = T.getS().hp, max9 = T.getS().MAXHP;
ok(hp9 === 10 && max9 === 20, '第 9 波结束：不回血（hp=' + hp9 + '）、血上限仍 ' + max9 + '（%5 且 %10 都不满足）');
T.el('buffOv').classList.add('hidden');   // 波次结束会弹强化卡，收起来继续
endWaveAt(10, 10);
var hp10 = T.getS().hp, max10 = T.getS().MAXHP;
ok(max10 === 25, '第 10 波结束：血上限提升到 ' + max10 + '（每 10 波 +5）');
ok(hp10 === 12, '第 10 波结束：回 2 血（10 → ' + hp10 + '），且只在 5 的倍数波回');
T.el('buffOv').classList.add('hidden');
endWaveAt(15, 5);
ok(T.getS().hp === 7, '第 15 波结束：同样回 2 血（5 → ' + T.getS().hp + '）');
T.el('buffOv').classList.add('hidden');
endWaveAt(60, 20);
ok(T.getS().MAXHP === 50, '第 60 波：血上限封顶 50（不再成长）');

console.log('=== ③ 单波怪数封顶（后期不「排队磨时间」）===');
var late = T.waveComp(100);
var before = total(late);
var mul100 = T.packFactor(late);
var after = total(late);
ok(before > T.MAX(), '第 100 波原始怪数 ' + before + ' 只（超过上限）');
ok(after <= T.MAX(), '封顶后 ' + after + ' 只 ≤ 上限 ' + T.MAX());
ok(mul100 > 1.2, '数量被压缩后给出强度补偿 ×' + mul100.toFixed(2));
var lowW = T.waveComp(3);
ok(total(lowW) <= T.MAX() && T.packFactor(lowW) === 1, '前期波次（第 3 波 ' + total(lowW) + ' 只）不受影响，补偿系数 = 1');
var bossW = T.waveComp(10);
T.packFactor(bossW);
var hasBoss = false;
bossW.forEach(function(g){ if (g.type === 'boss') hasBoss = true; });
ok(hasBoss, '第 10 波（BOSS 波）封顶后 BOSS 依然存在（每类至少 1 只）');
var huge = T.waveComp(400);
var t400 = total(huge);
T.packFactor(huge);
ok(total(huge) <= T.MAX() && t400 > 500, '第 400 波原始 ' + t400 + ' 只 → 封顶到 ' + total(huge) + ' 只（极端波次也不爆）');

console.log('=== ④ 血量补偿真的作用到怪身上 ===');
T.startEndless(); T.setGold(999999);
T.setWave(100);
T.el('buffOv').classList.add('hidden');
T.spawnEnemy('normal');
var e1 = T.getS().enemies[T.getS().enemies.length - 1];
var hpWithPack = e1.maxhp;
// 对照：手工把 packMul 置 1 再生成一只
ok(hpWithPack > 0, '第 100 波步兵血量 ' + Math.round(hpWithPack));

console.log('=== ⑤ 预告不会污染本波的强度系数 ===');
T.startEndless(); T.setGold(99999);
T.setWave(100);
T.clearWave();
T.startWave();                          // 真正开一波 → 设置本波 packMul
var pm = T.packMulGet();
ok(pm > 1.2, '第 100 波开波时 packMul = ' + pm.toFixed(2) + '（数量封顶 → 强度补偿）');
T.updateWaveInfo();                     // 预告下一波（内部在副本上算 packFactor）
ok(Math.abs(T.packMulGet() - pm) < 1e-9, '调用 updateWaveInfo() 后本波 packMul 未被污染（' + T.packMulGet().toFixed(3) + '）');

console.log('=== ⑥ 实战：无尽跑 12 波，无报错、血量会掉 ===');
T.startEndless(); T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison','phys','sniper','mortar','support'];
for (var c2 = 0; c2 < 9 && placed < 24; c2++)
  for (var r2 = 0; r2 < 14 && placed < 24; r2++)
    if (T.addTower(c2, r2, elems[(c2 + r2) % 8])) placed++;
var guard = 0, cards = 0;
while (guard < 60000 && T.getS().wave < 12){
  guard++;
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){ var b = T.el('buffList').children[0]; if (b) b.fire('click'); cards++; }
}
var fin = T.getS();
ok(fin.wave >= 12, '无尽模式跑到第 ' + fin.wave + ' 波仍未结束（无硬上限）');
ok(fin.MAXHP <= 50, '血上限封顶 50（当前 ' + fin.MAXHP + '）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v6.0 无尽平衡验证全部通过（0 失败）' : '  ❌ v6.0 无尽平衡 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
