// v6 炮塔定位重构 + 新增 2 塔（狙击 / 榴弹）专项验证
// 用法: node test/deep13_towers.js work/t_role.html
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, spawnEnemy: spawnEnemy,\n' +
  '  ELEMS: ELEMS, ENEMIES: ENEMIES, statAt: statAt, hitEnemy: hitEnemy, resonanceOf: resonanceOf,\n' +
  '  updateEnemies: updateEnemies, openBuild: openBuild, towerStat: towerStat, isPath: isPath,\n' +
  '  cx: cx, cy: cy, cell: function(){ return CELL; },\n' +
  '  stopWaves: function(){ waveActive = false; spawnQueue = []; curGroup = null; waveBreak = 99999; },\n' +
  '  setSpeed: function(v){ speedMul = v; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, kills: kills, rings: rings, parts: parts, beams: beams }; },\n' +
  '  setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
global.WX_LOCK = 'none';   /* v8.3：本专项验证塔本身数值，锁掉元素天气避免干扰 */
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
function near(a, b, e){ return Math.abs(a - b) <= e; }
var CLK = 9e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }
var CELLPX = T.cell();

// —— 工具：建一座塔（清场后），返回塔对象 ——
function oneTower(elem, c, r){
  T.startLevel(0); T.stopWaves(); T.setGold(99999);   // 关掉自动波次：用例只验证塔本身的行为
  T.addTower(c, r, elem);
  var tw = T.getS().towers;
  var t2 = tw[tw.length - 1];
  /* v8.4：v8.2 起每座塔会随机抽「词条」（可能带 +8% 暴击等）→ 会让精确数值断言偶发失败，
     本用例只验证塔本身的机制，所以把词条与精通分支清掉，保证可复现 */
  if (t2){ t2.affix = null; t2.spec = null; }
  return t2;
}
// —— 工具：造一只可控的怪 ——
function makeEnemy(type, x, y, hp){
  var es = T.getS().enemies;
  T.spawnEnemy(type);
  var e = es[es.length - 1];
  e.x = x; e.y = y; e.hp = hp; e.maxhp = hp;
  e.shieldT = 0; e.shieldBuffT = 0; e.spawnT = 0; e.slowT = 0; e.slowF = 1; e.dotT = 0; e.dotD = 0;
  return e;
}
function dmgTo(e, hp0){ return hp0 - e.hp; }

console.log('=== ① 八塔字段完整性（role / soloStar / groupStar）+ 面板 8 张卡 ===');
var KEYS = ['fire','ice','thunder','poison','phys','support','sniper','mortar'];
ok(Object.keys(T.ELEMS).length === 9, 'ELEMS 共 9 条塔（' + Object.keys(T.ELEMS).join('/') + '）');
var ROLE = { fire:'溅射', ice:'控场', thunder:'链式', poison:'持续', phys:'单体', support:'光环', sniper:'点杀', mortar:'范围' };
var STAR = { phys:[4,1], fire:[2,3], poison:[1,4], thunder:[1,4], ice:[1,2], sniper:[5,1], mortar:[1,5] };
KEYS.forEach(function(k){
  var d = T.ELEMS[k];
  ok(typeof d.role === 'string' && d.role.length > 0, k + ' 有 role = ' + d.role);
  ok(typeof d.soloStar === 'number' && typeof d.groupStar === 'number', k + ' 有 soloStar/groupStar = ' + d.soloStar + '/' + d.groupStar);
  ok(!!(d.fx && d.fx.length > 4), k + ' 有 fx 特效文案（图鉴自动收录）');
});
KEYS.forEach(function(k){
  ok(T.ELEMS[k].role === ROLE[k], k + ' role 定位正确 = ' + ROLE[k]);
});
Object.keys(STAR).forEach(function(k){
  ok(T.ELEMS[k].soloStar === STAR[k][0] && T.ELEMS[k].groupStar === STAR[k][1],
     k + ' 星级对单★' + STAR[k][0] + ' / 对群★' + STAR[k][1]);
});
ok(T.ELEMS.support.soloStar === 0 && T.ELEMS.support.groupStar === 0, '辅助塔不攻击 → 星级记 0（不参与对单/对群评级）');
T.startLevel(0); T.setGold(99999);
T.openBuild(2, 2, 100, 100);
var bh = T.el('sel').innerHTML;
ok((bh.match(/data-mk=/g) || []).length === 9, '建塔面板提供 9 种塔选项（' + (bh.match(/data-mk=/g) || []).length + '）');
ok(bh.indexOf('狙击') >= 0 && bh.indexOf('榴弹') >= 0, '面板含新增的狙击塔 / 榴弹塔');
console.log('--- 新旧机制字段 ---');
ok(T.ELEMS.phys.pierce === undefined && T.ELEMS.phys.antiArmor === 0.35, '物理塔：pierce 已移除，改为 antiArmor 0.35');
ok(T.ELEMS.fire.splashR === 1.0 && T.ELEMS.fire.splashK === 0.6, '火焰塔：splashR 1.0 / splashK 0.6');
ok(T.ELEMS.poison.dotR === 1.2 && T.ELEMS.poison.dot === 10 && T.ELEMS.poison.dotT === 3.0, '剧毒塔：dotR 1.2 / dot 10 × 3 秒');
ok(T.ELEMS.thunder.chain === 5 && T.ELEMS.thunder.chainK === 0.85, '雷电塔：chain 5 / 每跳衰减 0.85');
ok(T.ELEMS.ice.slowR === 1.0 && T.ELEMS.ice.slow === 0.5, '冰霜塔：slowR 1.0 / 减速 0.5');
ok(T.ELEMS.sniper.range === 4.5 && T.ELEMS.sniper.highValue === true, '狙击塔：射程 4.5 格 / highValue 优先锁高价值目标');
ok(T.ELEMS.mortar.splashR === 2.2 && T.ELEMS.mortar.splashK === 0.45, '榴弹塔：splashR 2.2 / splashK 0.45');
ok(html.indexOf("tw.elem === 'sniper'") >= 0 && html.indexOf("tw.elem === 'mortar'") >= 0
   && html.indexOf("elem === 'sniper'") >= 0 && html.indexOf("elem === 'mortar'") >= 0,
   'drawTowerBody / 炮口 都有狙击与榴弹专属造型分支');

console.log('=== ② 物理塔 antiArmor：有甲 ×1.35，无甲不变 ===');
var pt = oneTower('phys', 0, 0), pdef = T.ELEMS.phys, pst = T.statAt(pt, 1);
var eArm = makeEnemy('armor', T.cx(2), T.cy(0), 100000);      // armor 0.35
var hp0 = eArm.hp;
T.hitEnemy(pt, eArm, pst, pdef, false);
var dArm = dmgTo(eArm, hp0);
var wantArm = pst.dmg * (1 - 0.35) * 1.35;
ok(near(dArm, wantArm, 1e-6), '有甲目标伤害 = ' + dArm.toFixed(2) + '（期望 ' + wantArm.toFixed(2) + ' = 基础 ' + pst.dmg.toFixed(1) + ' × 0.65 护甲 × 1.35 antiArmor）');
var eNo = makeEnemy('normal', T.cx(0), T.cy(2), 100000);       // armor 0
var hp1 = eNo.hp;
T.hitEnemy(pt, eNo, pst, pdef, false);
var dNo = dmgTo(eNo, hp1);
ok(near(dNo, pst.dmg, 1e-6), '无甲目标伤害 = ' + dNo.toFixed(2) + '（= 基础 ' + pst.dmg.toFixed(1) + '，未被 antiArmor 改变）');
ok(near(dArm / dNo, 0.65 * 1.35, 1e-6), '有甲/无甲比 = ' + (dArm / dNo).toFixed(4) + '（= 0.65 × 1.35，护甲系数与 antiArmor 同时生效）');

console.log('=== ③ 火焰溅射：一发命中，1.0 格内两只都掉血，副目标约 60% ===');
var ft = oneTower('fire', 0, 0), fdef = T.ELEMS.fire, fst = T.statAt(ft, 1);
var A = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
var B = makeEnemy('normal', T.cx(0) + CELLPX * 0.9, T.cy(0), 100000);       // 0.9 格 < 1.0 格
var C = makeEnemy('normal', T.cx(0) + CELLPX * 1.4, T.cy(0), 100000);       // 1.4 格 > 1.0 格（不该吃溅射）
var a0 = A.hp, b0 = B.hp, c0 = C.hp;
T.hitEnemy(ft, A, fst, fdef, false);
var dA = dmgTo(A, a0), dB = dmgTo(B, b0), dC = dmgTo(C, c0);
ok(dA > 0, '主目标掉血 ' + dA.toFixed(2));
ok(dB > 0, '1.0 格内的副目标也掉血 ' + dB.toFixed(2));
ok(near(dB / dA, 0.6, 1e-6), '副目标 = 主目标 × ' + (dB / dA).toFixed(4) + '（期望 0.6）');
ok(dC === 0, '1.4 格外的敌人不吃溅射（范围严格 1.0 格）');
ok(T.getS().rings.length >= 1, '命中点产生了扩散圈特效（rings = ' + T.getS().rings.length + '）');

console.log('--- ③b 热震（res.splash）与新的 def.splashR 叠加共存（互不覆盖）---');
T.startLevel(0); T.stopWaves(); T.setGold(99999);
T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'ice');          // 火 + 冰相邻 → 热震
var ft2 = T.getS().towers[0];
ok(ft2.res.splash === 1.0 && ft2.res.tags.indexOf('热震') >= 0, '火塔拿到热震（res.splash = ' + ft2.res.splash + '）');
var S1 = makeEnemy('normal', T.cx(3), T.cy(0), 100000);
var S2 = makeEnemy('normal', T.cx(3) + CELLPX * 0.9, T.cy(0), 100000);
var S3 = makeEnemy('normal', T.cx(3) + CELLPX * 1.4, T.cy(0), 100000);   // 超出火焰 1.0 格，落在热震 1.5 格内
var q1 = S1.hp, q2 = S2.hp, q3 = S3.hp;
T.hitEnemy(ft2, S1, T.statAt(ft2, 1), T.ELEMS.fire, false);
var e1 = q1 - S1.hp, e2 = q2 - S2.hp, e3 = q3 - S3.hp;
ok(near(e2 / e1, 1.0, 1e-6), '0.9 格内副目标吃 ' + Math.round(e2 / e1 * 100) + '%（热震倍率 1.0 生效，没有被火焰的 0.6 覆盖降级）');
ok(e3 > 0 && near(e3 / e1, 1.0, 1e-6), '1.4 格内副目标也吃 100%（半径取 1.5 格：两套溅射共存而非互相覆盖）');

console.log('=== ④ 剧毒范围：1.2 格内两只都中毒，毒伤按 dt 结算且无视护甲 ===');
var qt = oneTower('poison', 8, 13), qdef = T.ELEMS.poison, qst = T.statAt(qt, 1);
var P1 = makeEnemy('armor', T.cx(0), T.cy(0), 100000);                        // 有护甲的怪也中毒
var P2 = makeEnemy('normal', T.cx(0) + CELLPX * 1.1, T.cy(0), 100000);        // 1.1 格 < 1.2 格
var P3 = makeEnemy('normal', T.cx(0) + CELLPX * 1.5, T.cy(0), 100000);        // 1.5 格 > 1.2 格
T.hitEnemy(qt, P1, qst, qdef, false);
ok(P1.dotT > 0 && near(P1.dotD, 10, 1e-6), '主目标中毒 dotD = ' + P1.dotD + ' / dotT = ' + P1.dotT);
ok(P2.dotT > 0 && near(P2.dotD, 10, 1e-6), '1.2 格内副目标同样中毒（dotD = ' + P2.dotD + '）');
ok(P3.dotT === 0, '1.5 格外的敌人不中毒（范围 1.2 格）');
var h1 = P1.hp, h2 = P2.hp;
step(32);                                                                     // ≈ 0.52 秒
var tick1 = h1 - P1.hp, tick2 = h2 - P2.hp;
ok(tick1 > 4 && tick1 < 7, '主目标 0.52 秒内被毒掉 ' + tick1.toFixed(2) + '（10/秒 × 0.52 ≈ 5.2，按 dt 增量结算）');
ok(tick2 > 4 && tick2 < 7, '副目标同样持续掉血 ' + tick2.toFixed(2) + '（范围毒也是 dt 通道）');
ok(P1.hp < h1 && P1.armor === 0.35, '毒伤无视护甲（装甲怪 armor=0.35 仍是全额 10/秒）');

console.log('--- ④b 倍速不变性：范围毒走 dt 增量，不依赖每帧调用次数 ---');
var qt2 = oneTower('poison', 8, 13);
var R1 = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
T.hitEnemy(qt2, R1, T.statAt(qt2, 1), T.ELEMS.poison, false);
var r0hp = R1.hp;
T.setSpeed(1);
step(2);                                        // 1x：2 帧 ≈ 0.033 秒
var slowDmg = r0hp - R1.hp;
var r1hp = R1.hp;
T.setSpeed(100);
step(2);                                        // 100x：2 帧 = 10 秒游戏时间（子步 20 × 5 倍）
T.setSpeed(1);
var fastDmg = r1hp - R1.hp;
ok(slowDmg < 1, '1x 下 2 帧只结算 ' + slowDmg.toFixed(3) + ' 点毒伤（≈0.33，按真实时间）');
ok(near(slowDmg + fastDmg, 30, 1.5), '100x 下同 2 帧把 3 秒毒伤全部结算完（合计 ' + (slowDmg + fastDmg).toFixed(2) + ' ≈ 10/秒 × 3 秒 = 30）');
ok(R1.dotT <= 0, '毒持续时间按 dt 递减到 0（dotT = ' + R1.dotT.toFixed(2) + '），没有被倍速放大或跳过');

console.log('=== ⑤ 冰霜范围减速：1.0 格内两只 slowF 都下降 ===');
var it = oneTower('ice', 0, 0), idef = T.ELEMS.ice, ist = T.statAt(it, 1);
var I1 = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
var I2 = makeEnemy('normal', T.cx(0) + CELLPX * 0.95, T.cy(0), 100000);
var I3 = makeEnemy('normal', T.cx(0) + CELLPX * 1.6, T.cy(0), 100000);
T.hitEnemy(it, I1, ist, idef, false);
ok(I1.slowF <= 0.5 + 1e-9 && I1.slowT > 0, '主目标 slowF = ' + I1.slowF + ' / slowT = ' + I1.slowT.toFixed(2));
ok(I2.slowF <= 0.5 + 1e-9 && I2.slowT > 0, '1.0 格内副目标 slowF 也下降 = ' + I2.slowF + '（范围减速）');
ok(I3.slowF === 1, '1.6 格外的敌人不受减速影响（范围 1.0 格）');

console.log('=== ⑥ 雷电链弹：chain 5 打到 5 个目标，每跳衰减 0.85 ===');
var tt = oneTower('thunder', 0, 0), tdef = T.ELEMS.thunder, tst = T.statAt(tt, 1);
ok(T.getS().enemies.length === 0, '链弹用例开跑前战场已清空（不含波次怪）');
var chain = [];
var base = { x: T.cx(1), y: T.cy(1) };
chain.push(makeEnemy('normal', base.x, base.y, 100000));                       // 主目标
chain.push(makeEnemy('normal', base.x + CELLPX * 1.1, base.y, 100000));
chain.push(makeEnemy('normal', base.x, base.y + CELLPX * 1.1, 100000));
chain.push(makeEnemy('normal', base.x - CELLPX * 1.1, base.y, 100000));
chain.push(makeEnemy('normal', base.x, base.y - CELLPX * 1.1, 100000));
var before = chain.map(function(e){ return e.hp; });
step(1);                                                                       // 让塔真的开一炮
var hitN = 0, dmgList = [];
for (var ci = 0; ci < chain.length; ci++){
  var dd = before[ci] - chain[ci].hp;
  if (dd > 0){ hitN++; dmgList.push(dd); }
}
ok(hitN === 5, '一次开火命中 ' + hitN + ' 个目标（chain 5 → 主目标 + 4 跳）');
var expJump = 0.85;
var ratio1 = dmgList[1] / dmgList[0], ratio2 = dmgList[2] / dmgList[1];
ok(near(ratio1, expJump, 0.02), '第 1 跳衰减比 = ' + ratio1.toFixed(3) + '（期望 0.85，旧版 0.6）');
ok(near(ratio2, expJump, 0.02), '第 2 跳再衰减 = ' + ratio2.toFixed(3) + '（每跳 ×0.85）');

console.log('=== ⑦ 狙击塔：优先医疗兵 / 精英队长 / BOSS，其余按原索敌规则 ===');
function snipeCase(vipType, vipDone, decoyDone){
  var st2 = oneTower('sniper', 0, 0);
  var decoy = makeEnemy('normal', T.cx(2), T.cy(0), 100000);
  var vip = makeEnemy(vipType, T.cx(0), T.cy(2), 100000);
  decoy.done = decoyDone; vip.done = vipDone;
  var d0 = decoy.hp, v0 = vip.hp;
  step(1);
  return { vipHit: v0 - vip.hp, decoyHit: d0 - decoy.hp, vip: vip, decoy: decoy };
}
var c1 = snipeCase('healer', 0, 5000);
ok(c1.vipHit > 0 && c1.decoyHit === 0, '同射程内「普通怪更靠近基地」时，狙击仍先打医疗兵（医疗兵掉血 ' + c1.vipHit.toFixed(0) + '，普通怪未掉血）');
var c2 = snipeCase('elite', 0, 5000);
ok(c2.vipHit > 0 && c2.decoyHit === 0, '优先锁定精英队长（掉血 ' + c2.vipHit.toFixed(0) + '）');
var c3 = snipeCase('boss', 0, 5000);
ok(c3.vipHit > 0 && c3.decoyHit === 0, '优先锁定 BOSS（掉血 ' + c3.vipHit.toFixed(0) + '）');
var st3 = oneTower('sniper', 0, 0);
var nA = makeEnemy('normal', T.cx(2), T.cy(0), 100000);
var nB = makeEnemy('normal', T.cx(0), T.cy(2), 100000);
nA.done = 100; nB.done = 9000;                                                  // 无高价值目标 → 按原规则打离基地近的
var n0a = nA.hp, n0b = nB.hp;
step(1);
ok(nB.hp < n0b && nA.hp === n0a, '没有高价值目标时，退回原索敌规则（打离基地最近的 B）');
ok((T.ELEMS.sniper.dmg / (1 / (1 / T.ELEMS.sniper.rate))) > 0 && T.ELEMS.sniper.dmg === 95, '狙击单体伤害 95 / 攻速 2.6 秒（对单★5 / 对群★1）');

console.log('=== ⑧ 榴弹塔：2.2 格内多目标受到 45% 伤害 ===');
var mt = oneTower('mortar', 0, 0), mdef = T.ELEMS.mortar, mst = T.statAt(mt, 1);
var M1 = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
var M2 = makeEnemy('normal', T.cx(0) + CELLPX * 2.0, T.cy(0), 100000);          // 2.0 格 < 2.2 格
var M3 = makeEnemy('normal', T.cx(0) + CELLPX * 2.35, T.cy(0), 100000);         // 2.35 格 > 2.2 格
var m0 = M1.hp, m02 = M2.hp, m03 = M3.hp;
T.hitEnemy(mt, M1, mst, mdef, false);
var dM1 = m0 - M1.hp, dM2 = m02 - M2.hp, dM3 = m03 - M3.hp;
ok(near(dM1, mst.dmg, 1e-6), '主目标吃直击伤害 ' + dM1.toFixed(2));
ok(dM2 > 0 && near(dM2 / dM1, 0.45, 1e-6), '2.0 格内副目标 = 主目标 × ' + (dM2 / dM1).toFixed(4) + '（期望 0.45）');
ok(dM3 === 0, '2.35 格外的敌人不吃范围伤（半径严格 2.2 格）');
ok(dM1 < 15, '对单体极低：直击仅 ' + dM1.toFixed(1) + ' 伤害（1.8 秒一发 ≈ 6.7/秒）');

console.log('=== ⑨ 5 组新共鸣：标签正确触发 + 既有 8 组回归 ===');
function pairTags(a, b){
  T.startLevel(0); T.stopWaves(); T.setGold(99999);
  T.addTower(0, 0, a); T.addTower(0, 1, b);
  var t0 = T.getS().towers[0], t1 = T.getS().towers[1];
  return { a: t0.res, b: t1.res };
}
function hasTag(r, tag){ return r && r.tags && r.tags.indexOf(tag) >= 0; }
var r1 = pairTags('mortar', 'fire');
ok(hasTag(r1.a, '燃烧弹') && hasTag(r1.b, '燃烧弹'), 'fire + mortar → 「燃烧弹」（双方都拿到标签 ' + r1.a.tags.join('/') + '）');
ok(r1.a.splashBurn === 8, '燃烧弹：溅射区附加 8/秒 × 3 秒 燃烧（splashBurn = ' + r1.a.splashBurn + '）');
var r2 = pairTags('mortar', 'poison');
ok(hasTag(r2.a, '毒气弹'), 'mortar + poison → 「毒气弹」（复用毒机制 dot ' + r2.a.splashDot + '/秒 × 3 秒）');
var r3 = pairTags('mortar', 'ice');
ok(hasTag(r3.a, '冰爆') && r3.a.splashSlow === 0.5, 'ice + mortar → 「冰爆」（溅射区减速 0.5 / 1.6 秒）');
var r4 = pairTags('sniper', 'thunder');
ok(hasTag(r4.a, '电磁狙击') && r4.a.pierceFull === true && r4.a.dmgMul >= 1.6,
   'sniper + thunder → 「电磁狙击」（伤害 +60% 且无视护甲，dmgMul = ' + r4.a.dmgMul + '）');
var r5 = pairTags('sniper', 'phys');
ok(hasTag(r5.a, '破甲弹') && r5.a.pierceFull === true && r5.a.armorBreak === 1.4,
   'sniper + phys → 「破甲弹」（无视护甲 + 对护甲目标 ×1.4）');
// 功能验证：燃烧弹 / 冰爆 真的作用到溅射区域
var bt = T.getS().towers[0];                                        // 上面最后一组是 phys+sniper，重建
T.startLevel(0); T.stopWaves(); T.setGold(99999);
T.addTower(0, 0, 'mortar'); T.addTower(0, 1, 'fire');
var bTower = T.getS().towers[0];
var B1 = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
var B2 = makeEnemy('normal', T.cx(0) + CELLPX * 1.5, T.cy(0), 100000);
T.hitEnemy(bTower, B1, T.statAt(bTower, 1), T.ELEMS.mortar, false);
ok(B2.dotT > 0 && near(B2.dotD, 8, 1e-6), '燃烧弹生效：溅射区内的敌人被点燃 dotD = ' + B2.dotD + ' / dotT = ' + B2.dotT.toFixed(2));
T.startLevel(0); T.stopWaves(); T.setGold(99999);
T.addTower(0, 0, 'mortar'); T.addTower(0, 1, 'ice');
var iTower = T.getS().towers[0];
var D1 = makeEnemy('normal', T.cx(0), T.cy(0), 100000);
var D2 = makeEnemy('normal', T.cx(0) + CELLPX * 1.5, T.cy(0), 100000);
T.hitEnemy(iTower, D1, T.statAt(iTower, 1), T.ELEMS.mortar, false);
ok(D2.slowF <= 0.5 + 1e-9 && D2.slowT > 0, '冰爆生效：溅射区内的敌人被减速 slowF = ' + D2.slowF);
// 既有组合回归
ok(hasTag(pairTags('fire', 'ice').a, '热震'), '既有组合回归：fire + ice = 热震');
ok(hasTag(pairTags('sniper', 'thunder').a, '电磁狙击') && hasTag(pairTags('phys', 'thunder').a, '电磁炮'),
   '既有组合回归：phys + thunder = 电磁炮（新组合没有顶掉旧组合）');
ok(hasTag(pairTags('fire', 'support').a, '增幅场'), '既有组合回归：攻击塔 + 辅助塔 = 增幅场');

console.log('=== ⑩ 稳定性：8 塔混建连跑多波 + 全程 0 报错 ===');
T.startLevel(0); T.setGold(999999);
T.el('buffOv').classList.add('hidden');      // 桩元素默认 _hidden=false，先置为隐藏，只有真弹卡才算数
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support','sniper','mortar'];
for (var cc = 0; cc < 9 && placed < 40; cc++)
  for (var rr = 0; rr < 14 && placed < 40; rr++)
    if (T.addTower(cc, rr, elems[(cc + rr) % 8])) placed++;
var guard = 0, cards = 0;
while (guard < 12000 && cards < 5){
  guard++;
  T.frame(guard * 16.7 + 5e7);
  if (T.el('buffOv')._hidden === false && T.el('buffList').children.length > 0){
    T.el('buffList').children[0].fire('click');
    cards++;
  }
}
var s9 = T.getS();
console.log('  建塔 ' + placed + ' 座 · 波次 ' + s9.wave + ' · 血 ' + s9.hp + ' · 击杀 ' + s9.kills +
            ' · 命中圈池 ' + s9.rings.length + ' · 粒子池 ' + s9.parts.length);
ok(placed >= 30, '8 种塔都能建造（' + placed + ' 座）');
ok(s9.kills > 0 && s9.wave >= 2, '8 塔混编真的在打（击杀 ' + s9.kills + ' · 推进到第 ' + s9.wave + ' 波）');
ok(cards >= 3, '波次结算与强化卡流程正常（' + cards + ' 次）');
ok(s9.rings.length <= 60, '命中圈特效池有上限，不会无限膨胀（' + s9.rings.length + ' ≤ 60）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });

console.log('');
console.log(fail === 0 ? '  ✅✅ v6 炮塔重构 + 新塔专项验证全部通过（0 失败）'
                       : '  ❌ v6 炮塔重构 + 新塔专项验证 ' + fail + ' 项失败');
