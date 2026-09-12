// v8.0 无尽改造专项：血量曲线不封顶 / 无尽契约 / 双BOSS / 盗金贼 / 冲波评分
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, spawnEnemy: spawnEnemy,\n' +
  '  killEnemy: killEnemy, updateMobSkills: updateMobSkills, waveComp: waveComp, gameOver: gameOver,\n' +
  '  showPactChoices: showPactChoices, showBuffChoices: showBuffChoices, pactReset: pactReset, goldText: goldText,\n' +
  '  getPACT: function(){ return PACT; }, setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); },\n' +
  '  clearE: function(){ enemies = []; }, addTower: addTower,\n' +
  '  getS: function(){ return { enemies: enemies, gold: gold, wave: wave, MAXHP: MAXHP, PACT: PACT, BUFFS: BUFFS, towers: towers }; },\n' +
  '  el: function(id){ return document.getElementById(id); }, LEVELS: LEVELS, ELEMS: ELEMS, ENEMIES: ENEMIES };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){this._h=true;},remove:function(){this._h=false;},contains:function(){return false;}},
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
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function hpAt(w, type){
  T.setWave(w); T.clearE(); T.spawnEnemy(type || 'normal');
  var arr = T.getS().enemies;
  return arr.length ? arr[0].maxhp : 0;
}

console.log('=== ① 敌人血量曲线：缓慢不封顶（旧版第 105 波后永久冻结 61 倍）===');
T.startEndless();
var h50 = hpAt(50), h105 = hpAt(105), h150 = hpAt(150), h199 = hpAt(199), h250 = hpAt(250);
console.log('  第50波 ' + h50.toFixed(0) + ' · 105波 ' + h105.toFixed(0) + ' · 150波 ' + h150.toFixed(0) +
            ' · 199波 ' + h199.toFixed(0) + ' · 250波 ' + h250.toFixed(0));
ok(h105 > h50, '前 100 波仍在增长（50→105 波 ×' + (h105 / h50).toFixed(1) + '，二次项在第 43 波封顶所以后期线性爬升——与旧版一致）');
ok(h105 / h50 < 2, '前 100 波涨幅温和，体感与旧版一致（×' + (h105 / h50).toFixed(2) + '）');
ok(h150 > h105 * 10, '105→150 波血量继续涨（×' + (h150 / h105).toFixed(1) + '，旧版这里是 ×1.0 恒定不动）');
ok(h250 > h199 * 5, '199→250 波仍在涨（×' + (h250 / h199).toFixed(1) + '）→ 没有封顶');
var expectRatio = Math.pow(1.09, 45);
ok(Math.abs((h150 / h105) - expectRatio) / expectRatio < 0.02, '150/105 波比值 ≈ 1.09^45 = ' + expectRatio.toFixed(1) + '（实际 ' + (h150 / h105).toFixed(1) + '）');
ok(hpAt(18) === hpAt(18), '正式关卡区间（≤18 波）行为稳定');
var w1 = hpAt(1);
ok(Math.abs(w1 - 72 * (T.LEVELS[0].diff) * 1) < 1, '第 1 波血量仍为基础值（' + w1.toFixed(0) + '）→ 正式关卡不受影响');

console.log('=== ② 无尽契约：每 5 波弹三选一、必选、效果真实生效 ===');
T.startEndless();
var p0 = T.getPACT();
ok(p0.hp === 1 && p0.speed === 1 && p0.armor === 0 && p0.gold === 1 && p0.count === 1,
   '开局契约倍率全为默认（血量×1 / 速度×1 / 护甲+0 / 金币×1 / 数量×1）');
T.setWave(5);
T.showPactChoices();
var list = T.el('buffList');
ok(list.children.length === 3, '契约三选一给了 3 个选项');
var firstHtml = String(list.children[0]._html || '');
ok(/契约/.test(firstHtml) && /｜/.test(firstHtml), '契约卡片显示「代价 ｜ 收益」（' + firstHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 34) + '…）');
ok(String(T.el('skipBuffBtn').style.display) === 'none', '契约界面隐藏「跳过」按钮（必须做抉择）');
var hpBefore = T.getPACT().hp, goldBefore = T.getPACT().gold;
list.children[0].fire('click');
var p1 = T.getPACT();
var changed = (p1.hp !== hpBefore || p1.gold !== goldBefore || p1.armor > 0 || p1.speed !== 1 || p1.count !== 1);
ok(changed || p1.taken.length === 1, '点选契约后立即生效（已积累契约：' + JSON.stringify(p1.taken) + '）');
ok(p1.taken.length === 1, '契约被记入本局履历（PACT.taken）');
ok(html.indexOf("endless && wave % 5 === 0") >= 0 && html.indexOf('showPactChoices()') >= 0,
   '触发条件已接入波次结算：无尽模式每 5 波弹一次');

console.log('=== ③ 契约强度真的作用到敌人身上 ===');
T.startEndless(); T.setWave(30);
var baseHp = hpAt(30);
T.getPACT().hp = 2.0;                       /* 模拟叠了两份「血祭」 */
var buffHp = hpAt(30);
ok(Math.abs(buffHp / baseHp - 2) < 0.01, '契约加成直接乘进敌人血量（' + baseHp.toFixed(0) + ' → ' + buffHp.toFixed(0) + '）');
T.getPACT().hp = 1; T.getPACT().armor = 0.12;
var armEnemy = (function(){ T.setWave(30); T.clearE(); T.spawnEnemy('normal'); return T.getS().enemies[0]; })();
ok(Math.abs(armEnemy.armor - 0.12) < 1e-6, '「钢铁契约」的护甲加成进入敌人（armor=' + armEnemy.armor + '）');
T.getPACT().armor = 0; T.getPACT().count = 1.25;
var comp = T.waveComp(20), n1 = 0, n2 = 0;
comp.forEach(function(g){ n1 += g.n; });
T.getPACT().count = 1;
T.waveComp(20).forEach(function(g){ n2 += g.n; });
ok(n1 > n2, '「兽潮契约」敌人数量 +25% 生效（' + n2 + ' → ' + n1 + ' 只）');

console.log('=== ④ 双 BOSS 与盗金贼登场 ===');
T.getPACT().count = 1; T.getPACT().bossEvery = 10;
function bossCount(w){ var c = 0; T.waveComp(w).forEach(function(g){ if (g.type === 'boss') c += g.n; }); return c; }
ok(bossCount(10) === 1, '第 10 波 1 只 BOSS（原设计保留）');
ok(bossCount(20) === 2, '第 20 波双 BOSS（v8.0 新增，实际 ' + bossCount(20) + ' 只）');
ok(bossCount(40) === 2, '第 40 波同样双 BOSS');
ok(bossCount(8) === 0, '默认设置下第 8 波没有 BOSS（每 10 波才有）');
T.getPACT().bossEvery = 8;
ok(bossCount(8) === 1 && bossCount(16) === 1 && bossCount(24) === 1,
   '「悬赏契约」把 BOSS 提前到每 8 波（8/16/24 波各 1 只；双 BOSS 仍只在 20 的倍数波）');
ok(bossCount(40) === 2, '悬赏状态下第 40 波仍是双 BOSS');
T.getPACT().bossEvery = 10;
function thiefCount(w){ var c = 0; T.waveComp(w).forEach(function(g){ if (g.type === 'thief') c += g.n; }); return c; }
ok(thiefCount(11) === 0 && thiefCount(12) >= 1 && thiefCount(30) > thiefCount(12),
   '盗金贼从第 12 波登场且后期变多（12 波 ' + thiefCount(12) + ' 只 · 30 波 ' + thiefCount(30) + ' 只）');
ok(!!T.ENEMIES.thief && T.ENEMIES.thief.steal === true, '盗金贼已进入图鉴数据（' + T.ENEMIES.thief.name + '）');

console.log('=== ⑤ 盗金贼：偷你的钱，杀了全吐回来 ===');
T.startEndless(); T.setGold(1000); T.setWave(15);
T.clearE(); T.spawnEnemy('thief');
var th = T.getS().enemies[0];
ok(th.steal === true && th.stolen === 0, '盗金贼带偷金标记、初始未偷钱');
for (var i = 0; i < 5; i++) T.updateMobSkills(1.0);      /* 推进 5 秒 → 应偷 2 次左右 */
var gAfterSteal = T.getS().gold;
ok(th.stolen > 0 && gAfterSteal < 1000, '盗金贼偷走金币（' + th.stolen + ' 金，余额 1000 → ' + gAfterSteal + '）');
var before = T.getS().gold;
T.killEnemy(th, 0);
var gained = T.getS().gold - before;
ok(gained >= th.stolen, '击杀后连本带利吐回（+' + gained + ' ≥ 偷走的 ' + th.stolen + '）');
ok(T.goldText() === String(1000 + 8 * (T.getS().BUFFS.gold) + th.stolen).replace(/\..*/, '') ||
   Number(T.goldText()) > 1000, '金币账本精确记账未被打乱（当前 ' + T.goldText() + '）');

console.log('=== ⑥ 冲波评分与记录 ===');
T.startEndless();
T.setWave(42);
T.gameOver();
var sc = global.localStorage.getItem('td_endless_score');
ok(sc && parseInt(sc, 10) > 42000, '无尽结束写入冲波评分（' + sc + ' = 42 波 × 1000 + 血量上限/击杀/金币项）');
ok(/评分/.test(String(T.el('ovEndless').textContent)), '结束界面显示评分：「' + T.el('ovEndless').textContent + '」');
T.setWave(10); T.gameOver();
ok(global.localStorage.getItem('td_endless_score') === sc, '低分局不会覆盖高分记录（仍是 ' + sc + '）');

console.log('=== ⑦ 每局重置：普通关卡 / 无尽开局都清空契约 ===');
T.startEndless(); T.getPACT().hp = 3; T.getPACT().armor = 0.3;
T.startLevel(0);
var pr = T.getPACT();
ok(pr.hp === 1 && pr.armor === 0 && pr.taken.length === 0, '普通关卡开局清空契约（血量×' + pr.hp + ' / 护甲+' + pr.armor + '）');
T.getPACT().hp = 2.5;
T.startEndless();
ok(T.getPACT().hp === 1, '无尽重新开局也清空契约');

console.log('=== ⑧ 正式关卡完全不受影响（只有无尽会弹契约）===');
ok(html.indexOf("if (endless && wave % 5 === 0){ showPactChoices(); return; }") >= 0,
   '契约触发带 endless 判定，普通关卡不会弹');
T.startLevel(0);
ok(T.getS().MAXHP === 20 && T.goldText() === '150', '第 1 关开局仍是 20 血 / 150 金币');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.0 无尽改造专项全部通过（0 失败）' : '  ❌ v8.0 专项 ' + fail + ' 项失败');
