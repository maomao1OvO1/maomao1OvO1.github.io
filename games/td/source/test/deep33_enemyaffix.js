// v8.8 专项：敌人词缀（狂暴/硬化/死亡爆炸/隐匿/反伤/自愈）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  ENEMY_AFFIXES: ENEMY_AFFIXES, rollEnemyAffix: rollEnemyAffix, spawnEnemy: spawnEnemy, updateEnemies: updateEnemies,\n' +
  '  hitEnemy: hitEnemy, killEnemy: killEnemy, statAt: statAt, ELEMS: ELEMS, cx: cx, cy: cy, CELL: CELL,\n' +
  '  setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); }, towerAt: towerAt,\n' +
  '  pushE: function(e){ enemies.push(e); return e; }, clearE: function(){ enemies = []; },\n' +
  '  getS: function(){ return { enemies: enemies, towers: towers, BUFFS: BUFFS }; },\n' +
  '  setRunning: function(){ running = true; paused = false; },\n' +
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
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function affByKey(k){ var r = null; T.ENEMY_AFFIXES.forEach(function(a){ if (a.key === k) r = a; }); return r; }
var REAL_RANDOM = Math.random;
function noCrit(){ Math.random = function(){ return 0.999; }; }
function mkE(x, y, over){
  var e = { type:'normal', x:x, y:y, hp:100000, maxhp:100000, speed:100, gold:10, color:'#fff', r:11,
            armor:0, immuneSlow:false, boss:false, wp:0, done:0, slowT:0, slowF:1, dotT:0, dotD:0,
            hitFlash:0, dir:0, spawnT:0, walk:0, shieldT:0, shieldBuffT:0, markT:0,
            auraF:1, chargingT:0, sprinting:false, totalPath:10000, aff:null, hidden:false, stealthT:4.5 };
  for (var k in (over || {})) e[k] = over[k];
  return e;
}

console.log('=== ① 词缀定义齐全（每个都带效果与应对）===');
ok(T.ENEMY_AFFIXES.length === 6, '共 ' + T.ENEMY_AFFIXES.length + ' 种敌人词缀');
T.ENEMY_AFFIXES.forEach(function(a){
  ok(a.name && a.icon && a.fx && a.tip && a.color && a.minWave > 0,
     a.icon + ' ' + a.name + '（第 ' + a.minWave + ' 波起）：' + a.fx + ' → ' + a.tip);
});
/* 出现概率：早期没有、后期变常见 */
var early = 0, late = 0;
for (var i = 0; i < 400; i++){ if (T.rollEnemyAffix(3)) early++; }
for (i = 0; i < 400; i++){ if (T.rollEnemyAffix(30)) late++; }
ok(early === 0, '第 3 波：敌人不会带词缀（' + early + '/400）');
ok(late > 40 && late < 400, '第 30 波：约 ' + Math.round(late / 4) + '% 的敌人带词缀（400 次抽样 ' + late + ' 次命中）');
var seen = {};
for (i = 0; i < 4000; i++){ var a = T.rollEnemyAffix(40); if (a) seen[a.key] = (seen[a.key] || 0) + 1; }
ok(Object.keys(seen).length >= 4, '高层波次能抽到多种词缀（' + Object.keys(seen).join('/') + '）');

console.log('=== ② 生成规则：BOSS 与分裂幼体不参与 ===');
T.startEndless(); T.setWave(30); T.clearE();
var bossN = 0, affOnBoss = 0;
for (i = 0; i < 30; i++){ T.clearE(); T.spawnEnemy('boss'); var b = T.getS().enemies[0]; bossN++; if (b.aff) affOnBoss++; }
ok(affOnBoss === 0, 'BOSS 不带词缀（' + bossN + ' 次生成全部干净）');
T.clearE(); T.spawnEnemy('spawn2');
ok(T.getS().enemies[0].aff === null, '分裂幼体不带词缀（避免叠加过复杂）');

console.log('=== ③ 狂暴：半血后提速 60% ===');
function moveDist(aff, hpFrac){
  T.startEndless(); T.setWave(20); T.clearE();
  var e = T.pushE(mkE(T.cx(1), T.cy(1), { aff:aff, hp:100000 * hpFrac, maxhp:100000 }));
  var x0 = e.x, y0 = e.y;
  T.updateEnemies(0.5);
  return Math.hypot(e.x - x0, e.y - y0);
}
var rage = affByKey('rage');
var dFull = moveDist(rage, 1.0), dLow = moveDist(rage, 0.3);
ok(dLow > dFull * 1.4, '狂暴敌人半血后跑得更快（满血 ' + dFull.toFixed(1) + ' → 半血 ' + dLow.toFixed(1) + ' 像素/0.5 秒）');
var dNoAff = moveDist(null, 0.3);
ok(Math.abs(dFull - dNoAff) < 1, '满血时与无词缀速度一致（' + dFull.toFixed(1) + ' vs ' + dNoAff.toFixed(1) + '）');

console.log('=== ④ 隐匿：周期性隐身，隐身期间塔打不到 ===');
T.startEndless(); T.setWave(20); T.clearE();
var st = T.pushE(mkE(T.cx(5), T.cy(5), { aff:affByKey('stealth'), x:T.cx(5), y:T.cy(5) }));
var flips = 0, wasHidden = st.hidden;
for (i = 0; i < 100; i++){ T.updateEnemies(0.3); if (st.hidden !== wasHidden){ flips++; wasHidden = st.hidden; } }
ok(flips >= 3, '隐匿敌人会周期性切换可见性（30 秒内切换 ' + flips + ' 次）');
/* 索敌：让一座塔面对一只隐身怪，应当打不到 */
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'thunder');
var tw = T.getS().towers[0];
T.clearE();
var hid = T.pushE(mkE(T.cx(1), T.cy(0), { hidden:true, aff:affByKey('stealth') }));
var hp0 = hid.hp;
T.frame(16); T.frame(32); T.frame(48);
ok(hid.hp === hp0, '隐身期间塔无法锁定它（血量没掉）');
hid.hidden = false;
T.frame(64); T.frame(80); T.frame(96);
ok(hid.hp < hp0, '现身之后立刻可以被打（掉血 ' + Math.round(hp0 - hid.hp) + '）');

console.log('=== ⑤ 硬化：概率减伤 ===');
noCrit();
function dmgOnce(aff, n){
  Math.random = REAL_RANDOM;          /* 「硬化」是靠概率触发的词缀，必须用真实随机数 */
  T.clearE();
  var e = T.pushE(mkE(300, 300, { aff:aff }));
  e.shieldT = 0;
  var tot = 0, t = { c:0, r:0, elem:'phys', lv:1, res:null, affix:null, spec:null, stunT:0 };
  for (var q = 0; q < n; q++){
    var before = e.hp;
    T.hitEnemy(t, e, { dmg:1000, range:1, rate:1 }, T.ELEMS.phys);
    tot += before - e.hp;
    e.hp = 100000;
  }
  return tot / n;
}
var avgNo = dmgOnce(null, 200), avgTough = dmgOnce(affByKey('tough'), 200);
ok(avgTough < avgNo * 0.95, '硬化敌人的平均受伤更低（普通 ' + Math.round(avgNo) + ' → 硬化 ' + Math.round(avgTough) + '）');

console.log('=== ⑥ 反伤：攻击它的塔会被卡顿 ===');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'phys');
var pt = T.getS().towers[0];
pt.affix = null; pt.spec = null; pt.stunT = 0;
T.clearE();
var thorn = T.pushE(mkE(T.cx(1), T.cy(0), { aff:affByKey('thorn') }));
thorn.shieldT = 0;
T.hitEnemy(pt, thorn, T.statAt(pt, 1), T.ELEMS.phys);
ok(pt.stunT > 0, '反伤词缀让攻击塔短暂卡顿（stunT=' + pt.stunT.toFixed(2) + ' 秒）');
pt.stunT = 0;
T.clearE();
var plain = T.pushE(mkE(T.cx(1), T.cy(0), { aff:null }));
plain.shieldT = 0;
T.hitEnemy(pt, plain, T.statAt(pt, 1), T.ELEMS.phys);
ok(pt.stunT === 0, '普通敌人不会反伤（塔状态未变）');

console.log('=== ⑦ 死亡爆炸：击杀后波及附近的塔 ===');
T.startLevel(0); T.setGold(99999);
T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'ice');
var nearT = T.towerAt(0, 0);
T.clearE();
var bomb = T.pushE(mkE(T.cx(0), T.cy(0), { aff:affByKey('boom'), hp:1 }));
T.killEnemy(bomb, 0);
ok(nearT.stunT >= 2, '死亡爆炸让 1.2 格内的塔眩晕 2 秒（stunT=' + (nearT.stunT || 0).toFixed(1) + '）');
/* 远处的塔不该受影响 */
T.startLevel(0); T.setGold(99999);
T.addTower(8, 8, 'fire');
var farT = T.towerAt(8, 8);
T.clearE();
var bomb2 = T.pushE(mkE(T.cx(0), T.cy(0), { aff:affByKey('boom'), hp:1 }));
T.killEnemy(bomb2, 0);
ok(!farT.stunT, '远处的塔不受爆炸影响（不会误伤全场）');

console.log('=== ⑧ 自愈：持续回血 ===');
T.startEndless(); T.setWave(20); T.clearE();
var reg = T.pushE(mkE(T.cx(3), T.cy(3), { aff:affByKey('regen'), hp:50000, maxhp:100000 }));
T.updateEnemies(1.0);
ok(reg.hp > 50000, '自愈敌人每秒回 1.5% 最大血量（50000 → ' + Math.round(reg.hp) + '）');

console.log('=== ⑨ 绘制与整体运行不报错 ===');
T.startLevel(0); T.setRunning(); T.setGold(99999);
for (i = 0; i < 5; i++) T.addTower(0, i, ['fire','ice','thunder','poison','phys'][i]);
T.clearE();
T.setWave(25);
for (i = 0; i < 6; i++){
  var a = T.ENEMY_AFFIXES[i];
  T.pushE(mkE(T.cx(2 + i), T.cy(4), { aff:a, hidden:(i % 2 === 0) }));
}
var t0 = 0;
for (i = 0; i < 240; i++){ t0 += 16; T.frame(t0); }
ok(errs.length === 0, '6 种词缀敌人同时在场跑 240 帧无报错（' + errs.length + '）');

Math.random = REAL_RANDOM;
ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.8 敌人词缀专项全部通过（0 失败）' : '  ❌ v8.8 专项 ' + fail + ' 项失败');
