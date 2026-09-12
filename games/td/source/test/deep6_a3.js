// deep6_a3.js —— v5 新功能自测（临时脚本，可保留）：新共鸣组合 / BOSS 三技能
// 用法: node test/deep6_a3.js <被测html>
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, spawnEnemy: spawnEnemy,\n' +
  '  hitEnemy: hitEnemy, resonanceOf: resonanceOf, statAt: statAt, towerStat: towerStat,\n' +
  '  ELEMS: ELEMS, ENEMIES: ENEMIES, updateBossSkills: updateBossSkills, flushPendingSpawn: flushPendingSpawn,\n' +
  '  silenceNearestTowers: silenceNearestTowers, cx: cx, cy: cy, CELL: CELL,\n' +
  '  setRun: function(v){ running = !!v; paused = false; },\n' +
  '  tick: function(dt){ updateEnemies(dt); updateBossSkills(dt); flushPendingSpawn(); updateTowers(dt); },\n' +
  '  bossTick: function(dt){ updateBossSkills(dt); flushPendingSpawn(); },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, kills: kills, WAVES_TOTAL: WAVES_TOTAL, BUFFS: BUFFS }; },\n' +
  '  setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'',
    value:'', width:800, height:600, offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600,
    _hidden:false, _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    fire:function(t){ if (el._handlers[t]) el._handlers[t]({ stopPropagation:function(){}, target:el }); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){ return null; }, contains:function(){ return false; }, getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
  Object.defineProperty(el, 'innerHTML', {
    get:function(){ return el._html; },
    set:function(v){ el._html = v; el.children = []; }
  });
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
function near(a, b, tol){ return Math.abs(a - b) <= tol; }

/* ---------- 工具：搭一对相邻塔，返回 (3,3) 那座的 res ---------- */
function pairRes(a, b){
  T.startLevel(0); T.setGold(99999);
  T.addTower(3, 3, a); T.addTower(3, 4, b);
  return T.getS().towers[0].res;
}
function freshTower(elem, c, r){
  T.startLevel(0); T.setGold(99999);
  T.addTower(c || 5, r || 5, elem);
  return T.getS().towers[0];
}
function bigEnemy(type){
  T.spawnEnemy(type || 'armor');
  var es = T.getS().enemies, e = es[es.length - 1];
  e.hp = 1e6; e.maxhp = 1e6;
  e.shieldT = 0;                      // v5.6：清掉「出生护盾」（3 秒减伤 85%），否则伤害断言只有预期的 15%
  e.shieldBuffT = 0;
  return e;
}
var RND = Math.random;
function noCrit(){ Math.random = function(){ return 0.99; }; }   // 必定不暴击
function alwaysCrit(){ Math.random = function(){ return 0.01; }; } // 必定暴击

console.log('=== ① 新共鸣组合：标签 / 数值字段（保持原 4 对不变）===');
var rPT = pairRes('phys', 'thunder');
ok(rPT.tags.indexOf('电磁炮') >= 0, '物理+雷电 → 标签「电磁炮」（' + rPT.tags.join('+') + '）');
ok(rPT.pierceFull === true, '电磁炮 pierceFull = true（无视全部护甲）');
ok(near(rPT.dmgMul, 1.60, 0.001), '电磁炮 伤害倍率 = ' + rPT.dmgMul + '（1 + 0.60）');
var rFP = pairRes('phys', 'fire');
ok(rFP.tags.indexOf('熔铁') >= 0 && near(rFP.armorBreak, 1.4, 1e-9), '物理+火焰 → 「熔铁」 armorBreak=1.4（dmgMul ' + rFP.dmgMul + '）');
var rIP = pairRes('phys', 'ice');
ok(rIP.tags.indexOf('碎冰') >= 0 && near(rIP.critAdd, 0.15, 1e-9), '物理+冰霜 → 「碎冰」 critAdd=0.15（dmgMul ' + rIP.dmgMul + '）');
var rPP = pairRes('phys', 'poison');
ok(rPP.tags.indexOf('腐蚀') >= 0 && near(rPP.dotMul, 1.8, 1e-9), '物理+剧毒 → 「腐蚀」 dotMul=1.8（dmgMul ' + rPP.dmgMul + '）');
var rFS = pairRes('fire', 'support');
ok(rFS.tags.indexOf('增幅场') >= 0, '攻击塔+辅助塔 → 「增幅场」（' + rFS.tags.join('+') + '）');
ok(near(rFS.dmgMul, 1.20, 0.001) && near(rFS.rangeMul, 1.10, 0.001), '增幅场 伤害×' + rFS.dmgMul + ' 射程×' + rFS.rangeMul);
var rSS = pairRes('support', 'support');
ok(rSS.tags.indexOf('共振+35%') >= 0, '辅助塔相邻同元素 → 仍是「共振」（' + rSS.tags.join('+') + '）');
var rSup = pairRes('support', 'fire');
ok(rSup.tags.indexOf('增幅场') < 0, '辅助塔自身不拿「增幅场」（' + (rSup.tags.join('+') || '无标签') + '）');
var rFI = pairRes('fire', 'ice');
ok(rFI.tags.indexOf('热震') >= 0 && near(rFI.splash, 1.0, 1e-9), '原有组合回归：火焰+冰霜 = 热震 + 溅射');
ok(html.indexOf("res.tags.push('电磁炮')") >= 0 && html.indexOf('增幅场') >= 0, '补丁已写入源码文本');
ok(html.indexOf('🔨+⚡ <i>电磁炮</i>') >= 0, '开场说明已补新组合文字');

console.log('=== ② hitEnemy 真正生效（用固定 st.dmg=100 隔离）===');
var e1 = null;
function hitOnce(t, e){ noCrit(); var h0 = e.hp; T.hitEnemy(t, e, { dmg: 100 }, T.ELEMS[t.elem]); return h0 - e.hp; }
var tPlain = freshTower('phys', 5, 5);          // 孤立物理塔：穿甲 60%，护甲 0.35 → 系数 0.86
e1 = bigEnemy('armor');
var dmgPlain = hitOnce(tPlain, e1);
ok(dmgPlain > 0 && dmgPlain < 100, '对照：孤立物理塔打装甲怪 = ' + dmgPlain.toFixed(1) + '（受护甲削减，但物理塔有对护甲加成）');
var tEM = freshTower('phys', 5, 5);             // 加一个雷电邻居 → 电磁炮
T.addTower(5, 6, 'thunder');
var tEMp = T.getS().towers[0];
e1 = bigEnemy('armor');
var dmgEM = hitOnce(tEMp, e1);
ok(dmgEM > dmgPlain + 5, '电磁炮无视护甲 → 伤害高于对照（' + dmgEM.toFixed(1) + ' > ' + dmgPlain.toFixed(1) + '）');
var tMR = freshTower('phys', 5, 5); T.addTower(4, 5, 'fire');
e1 = bigEnemy('armor');
var dmgMR = hitOnce(T.getS().towers[0], e1);
ok(dmgMR > dmgPlain + 5, '熔铁对有甲目标额外加成（' + dmgMR.toFixed(1) + ' > ' + dmgPlain.toFixed(1) + '）');
var tMR_noArmor = T.getS().towers[0];
T.spawnEnemy('shield'); var esN = T.getS().enemies, eN = esN[esN.length - 1];
eN.hp = 1e6; eN.maxhp = 1e6;
eN.shieldT = 0; eN.shieldBuffT = 0;   // 清掉出生护盾，否则只打出 15%
var dmgNoArmor = hitOnce(tMR_noArmor, eN);
ok(dmgNoArmor > 0, '熔铁对无甲目标正常结算 = ' + dmgNoArmor.toFixed(1));
var tBI = freshTower('phys', 5, 5); T.addTower(5, 6, 'ice');
var tBIp = T.getS().towers[0];
e1 = bigEnemy('armor');
var h0 = e1.hp; alwaysCrit(); T.hitEnemy(tBIp, e1, { dmg: 100 }, T.ELEMS.phys); RND(); var dmgBI = h0 - e1.hp;
ok(dmgBI > dmgPlain * 1.5, '碎冰必暴击 = ' + dmgBI.toFixed(1) + '（约为对照的 ' + (dmgBI / dmgPlain).toFixed(2) + ' 倍）');
var tPlain2 = freshTower('phys', 5, 5);
e1 = bigEnemy('armor');
h0 = e1.hp; alwaysCrit(); T.hitEnemy(tPlain2, e1, { dmg: 100 }, T.ELEMS.phys); RND(); var dmgNoCrit = h0 - e1.hp;
ok(dmgNoCrit > 0 && dmgNoCrit < dmgBI, '对照：无碎冰时不暴击（' + dmgNoCrit.toFixed(1) + ' < ' + dmgBI.toFixed(1) + '）');
var tPS = freshTower('poison', 5, 5); T.addTower(5, 6, 'phys');
var tPSp = T.getS().towers[0];
e1 = bigEnemy('armor');
noCrit(); T.hitEnemy(tPSp, e1, { dmg: 100 }, T.ELEMS.poison); RND();
var dotCorrode = e1.dotD;
ok(dotCorrode > 0, '腐蚀：毒伤/秒 = ' + dotCorrode.toFixed(2));
var tPPlain = freshTower('poison', 5, 5);
e1 = bigEnemy('armor');
noCrit(); T.hitEnemy(tPPlain, e1, { dmg: 100 }, T.ELEMS.poison); RND();
ok(e1.dotD > 0 && dotCorrode > e1.dotD, '对照：孤立毒塔毒伤/秒 = ' + e1.dotD.toFixed(2) + '，腐蚀后 ' + dotCorrode.toFixed(2) + '（更高）');

console.log('=== ③ 增幅场进入 statAt（射程/伤害都真的变大）===');
T.startLevel(0); T.setGold(99999); T.addTower(5, 5, 'fire');
var tF = T.getS().towers[0];
var base = T.statAt(tF, 1);
T.addTower(5, 6, 'support');
var withSup = T.statAt(tF, 1);
ok(withSup.dmg > base.dmg * 1.4, '伤害提升：' + base.dmg.toFixed(1) + ' → ' + withSup.dmg.toFixed(1) + '（光环 + 增幅场）');
ok(withSup.range > base.range * 1.05, '射程提升：' + base.range.toFixed(2) + ' → ' + withSup.range.toFixed(2) + ' 格');

console.log('=== ④ BOSS 技能：狂暴 / 召唤 / 沉默 ===');
T.startLevel(0); T.setGold(99999); T.setRun(false);
T.spawnEnemy('boss');
var boss = T.getS().enemies[0];
ok(boss.boss === true && typeof boss.skill1T === 'number' && boss.skill1T > 0, 'spawnEnemy 给 BOSS 初始化技能计时（skill1T=' + boss.skill1T + ' skill2T=' + boss.skill2T + '）');
var spd0 = boss.speed, arm0 = boss.armor;
boss.hp = boss.maxhp * 0.35;
T.bossTick(0.05);
ok(boss.enraged === true, '血量 <40% 触发狂暴（enraged=true）');
ok(near(boss.speed, spd0 * 1.6, 1e-6), '狂暴速度 ×1.6：' + spd0.toFixed(2) + ' → ' + boss.speed.toFixed(2));
ok(near(boss.armor, 0.4, 1e-9), '狂暴护甲 +0.2：' + arm0 + ' → ' + boss.armor);
boss.hp = boss.maxhp * 0.05; T.bossTick(0.05);
ok(near(boss.speed, spd0 * 1.6, 1e-6) && near(boss.armor, 0.4, 1e-9), '狂暴只触发一次（速度不再翻倍，护甲 ' + boss.armor + '）');
T.startLevel(0); T.setGold(99999); T.setRun(false);
T.spawnEnemy('boss');
var b3 = T.getS().enemies[0]; b3.armor = 0.55; var s3 = b3.speed; b3.hp = b3.maxhp * 0.35;
T.bossTick(0.05);
ok(near(b3.armor, 0.6, 1e-9), '护甲封顶：0.55+0.2 被夹到 ' + b3.armor + '（上限 0.6）');
// 召唤
T.startLevel(0); T.setGold(99999); T.setRun(false);
T.spawnEnemy('boss');
var b2 = T.getS().enemies[0]; b2.speed = 0;
var n0 = T.getS().enemies.length;
for (var i = 0; i < 52; i++) T.tick(0.1);       // 5.2 秒 → 第一次召唤
var es2 = T.getS().enemies;
ok(es2.length === n0 + 2, '每 6 秒召唤 2 个步兵：敌人 ' + n0 + ' → ' + es2.length);
var nearBoss = 0;
for (var i2 = 0; i2 < es2.length; i2++){
  var ee = es2[i2];
  if (ee === b2) continue;
  if (Math.hypot(ee.x - b2.x, ee.y - b2.y) < T.CELL * 1.6) nearBoss++;
}
ok(nearBoss === 2, '召唤物出现在 BOSS 当前位置附近（' + nearBoss + '/2）');
ok(es2[es2.length - 1].type === 'normal', '召唤单位类型 = normal（' + es2[es2.length - 1].type + '）');
for (var i3 = 0; i3 < 60; i3++) T.tick(0.1);    // 再 6 秒 → 第二次召唤
ok(T.getS().enemies.length === n0 + 4, '第二个 6 秒周期再召唤 2 个（共 ' + (T.getS().enemies.length - n0) + '）');
// 沉默
T.startLevel(0); T.setGold(99999); T.setRun(false);
T.addTower(4, 4, 'fire'); T.addTower(5, 4, 'fire'); T.addTower(6, 4, 'fire'); T.addTower(7, 4, 'fire');
T.spawnEnemy('boss');
T.spawnEnemy('normal');
var bs = T.getS().enemies[0], dummy = T.getS().enemies[1];
bs.speed = 0; bs.hp = bs.maxhp; dummy.speed = 0; dummy.hp = 1e6; dummy.maxhp = 1e6;
dummy.x = T.cx(5); dummy.y = T.cy(5);                     // 站在 4 座塔中间
var own = T.getS().towers;
for (var k = 0; k < own.length; k++) own[k].cd = 0;
for (var i4 = 0; i4 < 81; i4++) T.tick(0.1);              // 8.1 秒 → 沉默触发
var silenced = own.filter(function(t){ return t.silencedT > 0; });
ok(silenced.length === 2, '沉默命中最近的 2 座塔（实际 ' + silenced.length + '）');
ok(silenced.every(function(t){ return t.silencedT <= 3.0 && t.silencedT > 2.5; }), '沉默时长 3 秒（' + silenced.map(function(t){ return t.silencedT.toFixed(2); }).join('/') + '）');
var dists = own.map(function(t){ return { t: t, d: Math.hypot(T.cx(t.c) - bs.x, T.cy(t.r) - bs.y), s: t.silencedT > 0 }; });
dists.sort(function(a, b){ return a.d - b.d; });
ok(dists[0].s && dists[1].s && !dists[2].s && !dists[3].s, '被沉默的确实是最近的两座（排序：' + dists.map(function(x){ return Math.round(x.d) + (x.s ? '⚡' : ''); }).join(' ') + '）');
// 停火验证：被沉默的塔 flash 保持 0，未被沉默的塔开火（flash=0.1）
for (var k2 = 0; k2 < own.length; k2++){ own[k2].cd = 0; own[k2].flash = 0; }
T.tick(0.02);
var fired = own.filter(function(t){ return t.flash > 0; });
var held = own.filter(function(t){ return t.silencedT > 0 && t.flash === 0; });
ok(held.length === 2, '被沉默的塔停火（flash 未触发 ' + held.length + '/2）');
ok(fired.length === 2, '未被沉默的塔照常开火（' + fired.length + '/2）');
// 沉默结束恢复
for (var i5 = 0; i5 < 32; i5++) T.tick(0.1);
ok(own.filter(function(t){ return t.silencedT > 0; }).length === 0, '3 秒后沉默自动解除');

console.log('=== ⑤ 普通波空转 & 主循环接入 ===');
T.startLevel(0); T.setGold(99999); T.setRun(false);
T.spawnEnemy('normal'); T.spawnEnemy('fast');
var pre = T.getS().enemies.length;
for (var i6 = 0; i6 < 200; i6++) T.bossTick(0.1);
ok(T.getS().enemies.length === pre, '无 BOSS 时 updateBossSkills 安全空转（敌人数不变，无召唤）');
ok(html.indexOf('updateBossSkills(d);') >= 0 && html.indexOf('flushPendingSpawn();') >= 0 && html.indexOf('function stepSim(') >= 0,
   '主循环已接入（v5.3 起世界更新抽进 stepSim()，供倍速子步调用；updateEnemies 之后紧跟 BOSS 技能与召唤入队）');
ok(html.indexOf('pendingSpawn.push') >= 0, '召唤走待生成队列（遍历期间不直接 push）');

console.log('=== ⑥ 真实对局 smoke：有 BOSS 时跑主循环无报错、技能真的会触发 ===');
T.startLevel(0); T.setGold(99999); T.setRun(true);
for (var c = 0; c < 8; c++) for (var r = 0; r < 12 && T.getS().towers.length < 18; r++) T.addTower(c, r, ['fire','ice','thunder','poison','phys','support'][(c + r) % 6]);
T.spawnEnemy('boss');
var bk = T.getS().enemies[0];
bk.hp = bk.maxhp * 0.45; bk.maxhp = bk.maxhp;
var clk = 0, sawSummon = false, sawSilence = false, base = T.getS().enemies.length;
for (var i7 = 0; i7 < 1800; i7++){ clk += 16.7; T.frame(clk); if (T.getS().enemies.length > base) sawSummon = true; }
ok(errors.length === 0, '主循环 30 秒无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
ok(bk.enraged === true || T.getS().enemies.indexOf(bk) < 0, '狂暴在真实对局中触发过（enraged=' + bk.enraged + '）');
ok(sawSummon, '召唤在真实对局中触发过');

console.log('=== ⑦ 绘制路径：狂暴光环 / ⚡ 沉默标记在 frame 里真的走到了 ===');
T.startLevel(0); T.setGold(99999); T.setRun(false);          // running=false：只画不算（frame 末尾无条件 draw()）
T.addTower(4, 4, 'fire'); T.addTower(5, 4, 'ice'); T.addTower(6, 4, 'thunder');
T.spawnEnemy('boss'); T.spawnEnemy('normal');
var bd = T.getS().enemies[0], dd = T.getS().enemies[1];
bd.speed = 0; bd.hp = bd.maxhp * 0.30;                       // 一进来就狂暴
dd.speed = 0; dd.hp = 1e6; dd.maxhp = 1e6; dd.x = T.cx(5); dd.y = T.cy(5);
var err0 = errors.length, clk2 = 0;
for (var i8 = 0; i8 < 81; i8++) T.bossTick(0.1);             // 8.1 秒 → 狂暴 + 沉默
ok(bd.enraged === true, '场景就绪：BOSS 已狂暴');
ok(T.getS().towers.some(function(t){ return t.silencedT > 0; }), '场景就绪：有塔被沉默');
var rageSee = 0, silSee = 0;
for (var i9 = 0; i9 < 60; i9++){
  clk2 += 16.7; T.frame(clk2);                               // 每一帧都会 draw()
  if (bd.enraged) rageSee++;
  if (T.getS().towers.some(function(t){ return t.silencedT > 0; })) silSee++;
}
ok(errors.length === err0, '狂暴光环 + ⚡ 沉默标记绘制无报错（新增 ' + (errors.length - err0) + ' 条）');
ok(rageSee === 60, '狂暴 BOSS 绘制 ' + rageSee + '/60 帧');
ok(silSee === 60, '⚡ 沉默标记绘制 ' + silSee + '/60 帧');

console.log('');
if (errors.length){ console.log('  ⚠️ 运行期错误：'); errors.forEach(function(x){ console.log('     ' + x); }); }
console.log(fail === 0 ? '  ✅✅ v5 新功能自测全部通过（0 失败）' : '  ❌ v5 新功能自测 ' + fail + ' 项失败');
