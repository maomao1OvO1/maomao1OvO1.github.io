// v5.5 新增 5 种怪物专项验证：医疗兵 / 分裂虫 / 自爆兵 / 精英队长 / 重装冲锋
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, spawnEnemy: spawnEnemy, addTower: addTower,\n' +
  '  waveComp: waveComp, updateMobSkills: updateMobSkills, updateEnemies: updateEnemies,\n' +
  '  ENEMIES: ENEMIES, LEVELS: LEVELS, pathLenToWp: pathLenToWp,\n' +
  '  setGold: function(v){ gold = v; }, setHp: function(v){ hp = v; }, getHP: function(){ return hp; },\n' +
  '  setWave: function(v){ wave = v; }, cell: function(){ return CELL; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    kills: kills, running: running, WAVES_TOTAL: WAVES_TOTAL, lvIndex: lvIndex }; },\n' +
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
process.on('uncaughtException', function(e){ errors.push(e.message + ' ::  ' + (e.stack||'').split('\n')[1]); });
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 3e7;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }
var NEW5 = ['healer', 'splitter', 'bomber', 'elite', 'charger'];
var CELL = T.cell();
function clean(w){ T.startLevel(0); T.setGold(0); T.setHp(20); if (w) T.setWave(w); }

console.log('=== ① 5 种新怪可通过 spawnEnemy 生成且属性正确 ===');
clean(5);
var W5 = 5, late5 = Math.max(0, W5 - 7);
var mul5 = (1 + (W5 - 1) * 0.27 + late5 * late5 * 0.026) * (T.LEVELS[0].diff || 1);
var spdK5 = (1 + Math.min(0.55, (W5 - 1) * 0.024));
var flagMap = { healer:'heal', splitter:'split', bomber:'bomb', elite:'aura', charger:'charge' };
NEW5.forEach(function(t){
  var d = T.ENEMIES[t];
  T.spawnEnemy(t);
  var es = T.getS().enemies, e = es[es.length - 1];
  var hpOk = Math.abs(e.hp - d.hp * mul5) < 1e-6 && Math.abs(e.maxhp - e.hp) < 1e-6;
  var spOk = Math.abs(e.speed - d.speed * CELL * 1.25 * spdK5) < 1e-6;
  var metaOk = e.color === d.color && e.r === d.r && e.gold === d.gold;
  var flagOk = e[flagMap[t]] === true;
  ok(hpOk && spOk && metaOk && flagOk,
     t + '（' + d.name + '）血量=' + e.hp.toFixed(1) + ' 速度=' + e.speed.toFixed(2) +
     ' 金币=' + e.gold + ' 特性' + flagMap[t] + '=true' +
     (hpOk ? '' : ' [血量异常]') + (spOk ? '' : ' [速度异常]') + (metaOk ? '' : ' [外观异常]') + (flagOk ? '' : ' [特性缺失]'));
});
ok(T.ENEMIES.charger.armor === 0.5, '重装冲锋护甲 0.5（减伤 50%）');
ok(T.ENEMIES.elite.dblGold === true && T.ENEMIES.splitter.split === true, '精英双倍金币 / 分裂虫分裂标记就绪');
ok(T.ENEMIES.spawn2.hp * 3 === T.ENEMIES.splitter.hp, '分裂幼体基础血 = 分裂虫的 1/3（' + T.ENEMIES.spawn2.hp + ' × 3 = ' + T.ENEMIES.splitter.hp + '）');
var needKeys = ['name','hp','speed','gold','color','r'];
var structOk = Object.keys(T.ENEMIES).every(function(k){
  return needKeys.every(function(nk){ return T.ENEMIES[k][nk] !== undefined; });
});
ok(structOk, 'ENEMIES 全部条目结构统一（name/hp/speed/gold/color/r）→ 图鉴可自动生成');

console.log('=== ② 医疗兵真的治疗附近怪（半径 2 格内，各自 8% 最大血）===');
clean(0);
T.spawnEnemy('healer'); T.spawnEnemy('normal'); T.spawnEnemy('normal');
var es2 = T.getS().enemies;
var H = es2[es2.length - 3], V = es2[es2.length - 2], FAR = es2[es2.length - 1];
H.x = 300; H.y = 300; H.speed = 0;
V.x = 300 + CELL * 1.2; V.y = 300; V.speed = 0;
FAR.x = 300 + CELL * 6; FAR.y = 300; FAR.speed = 0;
V.hp = V.maxhp * 0.5; FAR.hp = FAR.maxhp * 0.5;
var vBefore = V.hp, farBefore = FAR.hp;
var healT0 = H.healT;
step(300);                                       // 5 秒（首次治疗在 4 秒）
ok(V.hp > vBefore, '半径内残血怪被治疗：' + vBefore.toFixed(1) + ' → ' + V.hp.toFixed(1));
ok((V.hp - vBefore) > V.maxhp * 0.02 && (V.hp - vBefore) < V.maxhp * 0.40,
   '治疗量合理（v5.6：爆发 15% + 光环持续回血，实测 ' + ((V.hp - vBefore) / V.maxhp * 100).toFixed(2) + '% 最大血）');
ok(Math.abs(FAR.hp - farBefore) < 1e-6, '半径外的怪没有被治疗（' + FAR.hp.toFixed(1) + ' 未变）');
ok(H.hp === H.maxhp, '医疗兵不回血（只治疗其他怪）');
ok(healT0 === 3.0, '治疗冷却初始 3 秒（v5.6 加快）');
V.hp = V.maxhp * 0.3;
var vB2 = V.hp;
T.updateMobSkills(1.0); T.updateMobSkills(1.0); T.updateMobSkills(1.0); T.updateMobSkills(1.0);
ok(V.hp > vB2, '按 dt 增量累计：4 × 1.0 秒也恰好触发一次治疗（不依赖「每帧只调用一次」）');

console.log('=== ③ 分裂虫死亡后分裂出 2 只（血量约 1/3）且走安全队列 ===');
clean(0);
T.spawnEnemy('splitter');
var es3 = T.getS().enemies;
var SP = es3[es3.length - 1];
var mh = SP.maxhp;
SP.hp = 0;                                       // 下一子步判定死亡
var kids0 = T.getS().enemies.filter(function(x){ return x.type === 'spawn2'; }).length;
step(2);
var live = T.getS().enemies;
var kids = live.filter(function(x){ return x.type === 'spawn2'; });
ok(kids.length - kids0 === 2, '分裂出 2 只幼体（+' + (kids.length - kids0) + '）');
ok(live.indexOf(SP) < 0, '母体已从敌人列表中移除（未在遍历中错乱）');
ok(kids.length && Math.abs(kids[0].maxhp / mh - 1 / 3) < 0.001,
   '幼体血量 = 母体的 1/3（' + (kids.length ? (kids[0].maxhp / mh).toFixed(4) : '?') + '）');
ok(kids.length && kids[0].speed > SP.speed * 1.5, '幼体更快（' + (kids.length ? kids[0].speed.toFixed(1) : '?') + ' > ' + SP.speed.toFixed(1) + '）');
ok(kids.length && Math.abs((kids[0].done || 0) - (SP.done || 0)) < CELL * 6, '幼体继承母体路径进度（done 不倒退）');
var errsBeforeSplit = errors.length;
ok(errsBeforeSplit === 0, '分裂期间无运行时报错（' + errsBeforeSplit + '）');

console.log('=== ④ 自爆兵到终点扣 2 点基地血量（普通怪 1 点）===');
clean(0);
T.spawnEnemy('bomber');
var es4 = T.getS().enemies;
var B4 = es4[es4.length - 1];
B4.wp = 999;                                     // 下一个航点不存在 → 判定为抵达基地
var hpA = T.getHP();
step(1);
ok(T.getHP() === hpA - 2, '自爆兵突破防线扣 2 血（' + hpA + ' → ' + T.getHP() + '）');
T.spawnEnemy('normal');
var N4 = T.getS().enemies[T.getS().enemies.length - 1];
N4.wp = 999;
var hpB = T.getHP();
step(1);
ok(T.getHP() === hpB - 1, '普通怪突破防线仍扣 1 血（' + hpB + ' → ' + T.getHP() + '）');

console.log('=== ④b 自爆兵 70% 路程后进入冲刺（速度 ×2.2）===');
clean(0);
T.spawnEnemy('bomber');
var B5 = T.getS().enemies[T.getS().enemies.length - 1];
B5.wp = 0; B5.speed = 100; B5.slowT = 0; B5.slowF = 1;
B5.done = B5.totalPath * 0.5;
step(1);
var d0 = B5.done; step(1); var dHalf = B5.done - d0;
ok(B5.sprinting === false, '半程未冲刺（sprinting=false）');
B5.done = B5.totalPath * 0.75;
step(1);
var d1 = B5.done; step(1); var dLate = B5.done - d1;
ok(B5.sprinting === true, '进度 75% → 进入冲刺（sprinting=true）');
ok(Math.abs(dLate / dHalf - 2.2) < 0.05, '冲刺速度倍率 ≈ 2.2（实测 ' + (dLate / dHalf).toFixed(2) + '）');

console.log('=== ⑤ 精英队长光环：半径 2.5 格内其他怪 +30% 速度（不叠加）===');
clean(0);
T.spawnEnemy('elite'); T.spawnEnemy('normal'); T.spawnEnemy('normal'); T.spawnEnemy('elite');
var es5 = T.getS().enemies;
var E1 = es5[es5.length - 4], A5 = es5[es5.length - 3], F5 = es5[es5.length - 2], E2 = es5[es5.length - 1];
E1.x = 300; E1.y = 300; E1.speed = 0;
A5.x = 300 + CELL * 1.5; A5.y = 300;
F5.x = 300 + CELL * 6; F5.y = 300; F5.speed = 0;
E2.x = -5000; E2.y = 300; E2.speed = 0;
A5.done = 0; A5.wp = 0; A5.slowT = 0; A5.slowF = 1;
step(1);
ok(A5.auraF === 1.3, '范围内怪 auraF = 1.3（+30%）');
ok(F5.auraF === 1, '范围外怪不受光环影响（auraF=' + F5.auraF + '）');
ok(E1.auraF === 1, '光环不给精英自己（auraF=' + E1.auraF + '）');
var dA0 = A5.done; step(1); var dWith = A5.done - dA0;
E1.x = -5000;                                    // 移走光环源
step(1);
var dA1 = A5.done; step(1); var dWithout = A5.done - dA1;
ok(dWith > dWithout, '有光环时跑得更快（' + dWith.toFixed(2) + ' vs ' + dWithout.toFixed(2) + ' px/帧）');
ok(Math.abs(dWith / dWithout - 1.3) < 0.05, '速度提升倍数 ≈ 1.3（实测 ' + (dWith / dWithout).toFixed(3) + '）');
// 双精英不叠加
E1.x = 300; E2.x = 300 + CELL;
step(1);
ok(A5.auraF === 1.3, '两个精英重叠也不叠加（仍为 1.3）');
ok(A5.auraF === 1.3, '光环为「只取最强的一个」实现（非累乘）');

console.log('=== ⑤b 精英队长击杀掉落双倍金币 ===');
clean(0);
T.spawnEnemy('elite'); T.spawnEnemy('normal');
var esG = T.getS().enemies;
var EG = esG[esG.length - 2], NG = esG[esG.length - 1];
EG.hp = 0; NG.hp = 0;
var g0 = T.getS().gold;
step(1);
var gain = T.getS().gold - g0;
ok(gain === EG.gold * 2 + NG.gold * 1, '精英 ' + (EG.gold * 2) + '（双倍）+ 步兵 ' + NG.gold + ' = 实得 ' + gain);

console.log('=== ⑥ 重装冲锋：每 5 秒冲锋 1.5 秒（×1.8）且冲锋期间免疫减速 ===');
clean(0);
T.spawnEnemy('charger');
var C6 = T.getS().enemies[T.getS().enemies.length - 1];
C6.x = 300; C6.y = 300; C6.wp = 0; C6.slowT = 99; C6.slowF = 0.2;
step(1);
var c0 = C6.done; step(1); var dSlow = C6.done - c0;              // 未冲锋：被减速 0.2
C6.chargeCd = 0.001;
step(1);                                                          // 触发冲锋
ok(C6.chargingT > 0, '到点自动起冲（chargingT=' + C6.chargingT.toFixed(2) + 's）');
var c1 = C6.done; step(1); var dCharge = C6.done - c1;
ok(Math.abs(dCharge / dSlow - 9.0) < 0.3,
   '冲锋期间速度 ×1.8 且慢速 0.2 被忽略（总倍率 ' + (dCharge / dSlow).toFixed(2) + ' ≈ 1.8/0.2）');
ok(Math.abs(C6.slowF - 0.2) < 1e-9, '减速状态仍保留在字段上（冲锋结束会恢复减速）');
C6.slowT = 0; C6.slowF = 1;
var rises = 0, was = C6.chargingT > 0, tMax = 0, tCur = 0, cdSeen = 0, sawIdle = false;
for (var k = 0; k < 620; k++){                                    // 约 10.3 秒
  step(1);
  var now = C6.chargingT > 0;
  if (now && !was) rises++;
  was = now;
  if (now){ tCur += 0.0167; if (tCur > tMax) tMax = tCur; } else { tCur = 0; }
  if (!now && Math.abs(C6.chargeCd - 3.5) < 0.02) cdSeen++;
  if (!now && C6.chargingT === 0) sawIdle = true;
}
ok(rises >= 2, '10 秒内周期性冲锋 ' + rises + ' 次（每 5 秒一次）');
ok(Math.abs(tMax - 1.5) < 0.06, '单次冲锋持续 ≈ 1.5 秒（实测 ' + tMax.toFixed(2) + '）');
ok(sawIdle && cdSeen > 0, '冲锋结束后 chargingT 归零并进入 3.5 秒冷却（回到非冲锋状态）');

console.log('=== ⑦ 第 1-4 波 waveComp 与旧版完全一致（不引入前期难度）===');
function oldComp(w){                              // 补丁前的原始公式（冻结副本）
  var g = [];
  function add(t, n, gap){ if (n > 0) g.push({ type:t, n:n, gap:gap }); }
  var late = Math.max(0, w - 6);
  add('normal', 5 + Math.floor(w * 1.00) + late * 2, Math.max(0.50, 0.84 - late * 0.035));
  if (w >= 2) add('fast',   2 + Math.floor(w * 0.60) + late, Math.max(0.42, 0.62 - late * 0.02));
  if (w >= 4) add('armor',  1 + Math.floor(w * 0.45) + Math.floor(late * 0.4), 1.00);
  if (w >= 6) add('shield', 1 + Math.floor(w * 0.38) + Math.floor(late * 0.3), 1.15);
  if (w % 10 === 0) add('boss', 1, 1.7);
  return g;
}
for (var w = 1; w <= 4; w++){
  var a = JSON.stringify(T.waveComp(w)), b = JSON.stringify(oldComp(w));
  ok(a === b, '第 ' + w + ' 波与旧版逐字段一致 ' + (a === b ? '' : '\n     新: ' + a + '\n     旧: ' + b));
}
var early = [];
for (var w2 = 1; w2 <= 4; w2++) T.waveComp(w2).forEach(function(g){ early.push(g.type); });
ok(NEW5.every(function(t){ return early.indexOf(t) < 0; }), '第 1-4 波完全没有新怪（前期难度不变）');

console.log('=== ⑦b 5 种新怪在所有 5 关都会登场，且数量温和增长 ===');
for (var lv = 0; lv < T.LEVELS.length; lv++){
  var waves = T.LEVELS[lv].waves, seen = {};
  for (var ww = 1; ww <= waves; ww++)
    T.waveComp(ww).forEach(function(g){ seen[g.type] = (seen[g.type] || 0) + g.n; });
  var miss = NEW5.filter(function(t){ return !seen[t]; });
  ok(miss.length === 0, '第 ' + (lv + 1) + ' 关（' + waves + ' 波）：' + NEW5.map(function(t){
    return T.ENEMIES[t].name + '×' + (seen[t] || 0); }).join(' ') + (miss.length ? ' ❌缺 ' + miss.join(',') : ''));
}
function total(w){ var s = 0; T.waveComp(w).forEach(function(g){ s += g.n; }); return s; }
ok(T.waveComp(5).some(function(g){ return g.type === 'healer'; }), '医疗兵第 5 波登场');
ok(T.waveComp(6).some(function(g){ return g.type === 'splitter'; }), '分裂虫第 6 波登场');
ok(T.waveComp(7).some(function(g){ return g.type === 'bomber'; }), '自爆兵第 7 波登场');
ok(T.waveComp(8).some(function(g){ return g.type === 'elite'; }), '精英队长第 8 波登场');
ok(T.waveComp(9).some(function(g){ return g.type === 'charger'; }), '重装冲锋第 9 波登场');
console.log('  波次总怪数：w5=' + total(5) + ' w10=' + total(10) + ' w20=' + total(20) + ' w50=' + total(50));
ok(total(20) < total(10) * 2.6, '数量增长温和（w20 ' + total(20) + ' < w10 ' + total(10) + ' × 2.6）');

console.log('=== ⑧ 混合战役：新怪 + BOSS + 2 倍速 连跑 6 波无报错 ===');
try {
T.startLevel(0); T.setGold(99999); T.setHp(20);
T.el('speedBtn').fire('click');
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 9 && placed < 24; c++)
  for (var r = 0; r < 14 && placed < 24; r++)
    if (T.addTower(c, r, elems[(c + r) % 6])) placed++;
var guard = 0, cards = 0, seenLive = {}, maxWave = 0;
while (guard < 40000 && cards < 7){
  guard++;
  T.frame(CLK += 16.7);
  var sv = T.getS();
  if (sv.wave > maxWave) maxWave = sv.wave;
  for (var q = 0; q < sv.enemies.length; q++) seenLive[sv.enemies[q].type] = (seenLive[sv.enemies[q].type] || 0) + 1;
  if (sv.hp <= 0) break;
  if (guard % 4000 === 0) console.log('    …推进中 第 ' + guard + ' 帧，波次 ' + T.getS().wave + '，敌 ' + T.getS().enemies.length);
  if (T.el('buffOv')._hidden === false){
    var b2 = T.el('buffList').children[0];
    if (b2){ b2.fire('click'); cards++; }
  }
}
var s8 = T.getS();
console.log('  建塔 ' + placed + ' · 波次 ' + s8.wave + ' · 血 ' + s8.hp + ' · 击杀 ' + s8.kills + ' · 选卡 ' + cards);
ok(cards >= 6, '新怪加入后波次照常推进、照常选卡（' + cards + ' 次）');
console.log('  实战出现的怪物类型：' + Object.keys(seenLive).map(function(k){ return k + '×' + seenLive[k]; }).join(' '));
ok(!!seenLive.healer && !!seenLive.splitter && !!seenLive.bomber,
   '实战中真的刷出了新怪（医疗兵/分裂虫/自爆兵）');
} catch (ex) { console.log('  ❌ ⑧ 段抛出异常: ' + ex.message + '  ::  ' + (ex.stack||'').split('\n')[1]); fail++; }
ok(errors.length === 0, '⑧ 全程 0 运行时报错（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });

console.log('');
console.log(fail === 0 ? '  ✅✅ v5.5 新怪专项验证全部通过（0 失败）' : '  ❌ v5.5 新怪专项 ' + fail + ' 项失败');
process.exitCode = (fail === 0 ? 0 : 1);   // 不用 process.exit：管道下会截断未刷出的 stdout
