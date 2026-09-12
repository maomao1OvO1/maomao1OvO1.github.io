// v8.5 专项：主动技能扩展（冰冻 / 标记集火 / 过载 / 紧急维修）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  SKILLS: SKILLS, skillByKey: skillByKey, skillReady: skillReady, skillTick: skillTick, skillResetAll: skillResetAll,\n' +
  '  releaseSkill: releaseSkill, onSkillBtn: onSkillBtn, renderSkillBar: renderSkillBar, pickEnemyAt: pickEnemyAt,\n' +
  '  getSkillMode: function(){ return skillMode; }, setSkillMode: function(v){ skillMode = v; },\n' +
  '  unlockAll: function(){ SKILL_UNLOCK = { freeze:1, mark:1, overload:1, repair:1 }; },\n' +
  '  statAt: statAt, towerStat: towerStat, ELEMS: ELEMS, towerAt: towerAt, cx: cx, cy: cy, CELL: CELL,\n' +
  '  pushE: function(e){ enemies.push(e); return e; }, clearE: function(){ enemies = []; },\n' +
  '  setGold: function(v){ goldSet(v); }, setHp: function(v){ hp = v; }, getS: function(){ return { enemies: enemies, towers: towers, hp: hp, MAXHP: MAXHP, running: running, paused: paused }; },\n' +
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
var UNLOCK_ALL = function(){ global.window.__T && global.window.__T.unlockAll(); };   /* v8.6：本用例验证技能本身，先全解锁 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function mkE(x, y, over){
  var e = { type:'normal', x:x, y:y, hp:100000, maxhp:100000, speed:20, gold:10, color:'#fff', r:11,
            armor:0, immuneSlow:false, boss:false, wp:0, done:0, slowT:0, slowF:1, dotT:0, dotD:0,
            hitFlash:0, dir:0, spawnT:0, walk:0, shieldT:0, shieldBuffT:0, markT:0 };
  for (var k in (over || {})) e[k] = over[k];
  return e;
}

T.unlockAll();   /* v8.6：技能已改为按关卡解锁，本专项先全解锁（解锁进度由 deep31 验证） */
console.log('=== ① 四个主动技能的定义与技能栏 ===');
ok(T.SKILLS.length === 4, '共 4 个主动技能（' + T.SKILLS.map(function(s){ return s.icon + s.name; }).join(' ') + '）');
['freeze', 'mark', 'overload', 'repair'].forEach(function(k){
  var sk = T.skillByKey(k);
  ok(sk && sk.cd > 0 && sk.desc, sk.icon + ' ' + sk.name + '：CD ' + sk.cd + ' 秒 ｜ 需要目标：' + (sk.need === 'none' ? '否' : sk.need === 'enemy' ? '敌人' : '塔'));
});
T.startLevel(0); T.setGold(99999); T.setRunning();
T.renderSkillBar();
var bar = T.el('skillBar');
ok(bar.children.length === 5, '技能栏 = 4 个技能 + 1 个「?」说明按钮（' + bar.children.length + '）');
ok(String(bar.children[0].textContent).indexOf('❄️') === 0, '第一个是冰冻（' + bar.children[0].textContent + '）');

console.log('=== ② 冰冻：全屏减速 + 独立冷却 ===');
T.startLevel(0); T.setRunning(); T.clearE();
var e1 = T.pushE(mkE(100, 100)), e2 = T.pushE(mkE(200, 100));
ok(T.releaseSkill('freeze', null) === true, '释放冰冻成功');
ok(e1.slowT > 3 && e1.slowF < 0.2 && e2.slowT > 3, '全屏敌人被冻结（减速 ' + Math.round((1 - e1.slowF) * 100) + '% 持续 ' + e1.slowT.toFixed(1) + ' 秒）');
ok(T.skillByKey('freeze').t > 20 && !T.skillReady('freeze'), '冰冻进入冷却（剩余 ' + Math.ceil(T.skillByKey('freeze').t) + ' 秒）');
ok(T.skillReady('mark') && T.skillReady('repair'), '其它技能冷却独立（不受冰冻影响）');
T.releaseSkill('freeze', null);
ok(T.skillByKey('freeze').t > 20, '冷却中无法重复释放');

console.log('=== ③ 标记：先选目标 → 点敌人 → 所有塔集火 ===');
T.startLevel(0); T.setRunning(); T.clearE();
T.onSkillBtn('mark');
ok(T.getSkillMode() === 'mark', '点「标记」进入选择模式（等待点敌人）');
var near = T.pushE(mkE(100, 100, { done: 9000 }));      /* 离基地更近的怪 */
var far  = T.pushE(mkE(300, 100, { done: 100 }));       /* 离基地更远的怪 */
T.releaseSkill('mark', far);
ok(far.markT >= 5, '被标记的敌人带上标记计时（' + far.markT.toFixed(1) + ' 秒）');
ok(T.getSkillMode() === null, '释放后自动退出选择模式');
/* 索敌：标记的敌人排在最前（即使它离基地更远）—— 用一座塔在射程内比较实际开火目标 */
T.setGold(99999);
function fireAt(){
  T.clearE();
  /* 塔建在格子 (0,0)：把两只怪放在它相邻格（射程内），一只更靠近基地、一只是标记目标 */
  if (!T.getS().towers.length) T.addTower(0, 0, 'phys');
  var tx = T.cx(0), ty = T.cy(0);
  var a = T.pushE(mkE(tx + T.CELL * 1.0, ty, { done: 9000 }));   /* 更靠近基地 */
  var b = T.pushE(mkE(tx + T.CELL * 1.6, ty, { done: 100 }));    /* 标记目标（更远） */
  var t = T.getS().towers[0];
  t.cd = 0; t.stunT = 0; t.overT = 0; t.affix = null; t.spec = null;
  return { a: a, b: b };
}
var pair = fireAt();
pair.b.markT = 5;
var hpA0 = pair.a.hp, hpB0 = pair.b.hp;
T.frame(16); T.frame(32); T.frame(48); T.frame(64); T.frame(80);
var dA = hpA0 - pair.a.hp, dB = hpB0 - pair.b.hp;
ok(dB > 0 && dA === 0, '标记生效后塔集火标记目标（标记目标掉血 ' + Math.round(dB) + '，更近的怪掉血 ' + Math.round(dA) + '）');
T.skillTick(20);   /* 标记自然过期 */
ok(pair.b.markT <= 0, '标记 5 秒后自动失效');

console.log('=== ④ 过载：点塔 → 攻速×2.5、伤害×1.5 → 结束眩晕 ===');
T.startLevel(0); T.setGold(99999); T.setRunning();
T.addTower(0, 0, 'fire');
var ft = T.getS().towers[0];
ft.affix = null; ft.spec = null;
var d0 = T.statAt(ft, 1).dmg, r0 = T.statAt(ft, 1).rate;
T.onSkillBtn('overload');
ok(T.getSkillMode() === 'overload', '点「过载」进入选择塔模式');
T.releaseSkill('overload', ft);
ok(ft.overT > 4, '该塔进入过载状态（' + ft.overT.toFixed(1) + ' 秒）');
ok(Math.abs(T.statAt(ft, 1).dmg / d0 - 1.5) < 0.02, '过载期间伤害 ×1.5（' + d0.toFixed(1) + ' → ' + T.statAt(ft, 1).dmg.toFixed(1) + '）');
ok(Math.abs(r0 / T.statAt(ft, 1).rate - 2.5) < 0.05, '过载期间攻速 ×2.5（间隔 ' + r0.toFixed(3) + ' → ' + T.statAt(ft, 1).rate.toFixed(3) + '）');
T.skillTick(5.1);
ok(ft.overT <= 0 && ft.stunT > 2.5, '过载结束后进入眩晕（' + ft.stunT.toFixed(1) + ' 秒）');
ok(T.statAt(ft, 1).rate > 1e6, '眩晕期间该塔无法开火（间隔被拉到极大）');
T.skillTick(3.1);
ok(ft.stunT <= 0 && T.statAt(ft, 1).rate < 1e6, '眩晕结束后恢复正常开火');

console.log('=== ⑤ 紧急维修：回血 + 全体解除眩晕 ===');
T.startLevel(0); T.setRunning();
T.addTower(0, 0, 'ice'); T.addTower(0, 1, 'fire');
T.getS().towers.forEach(function(t){ t.stunT = 5; });
T.setHp(10);
T.releaseSkill('repair', null);
var s5 = T.getS();
ok(s5.hp === 13, '立刻回 3 点基地血（10 → ' + s5.hp + '）');
ok(s5.towers.every(function(t){ return t.stunT <= 0; }), '清除所有塔的眩晕（' + s5.towers.length + ' 座塔）');
ok(s5.hp <= s5.MAXHP, '回血不会超过血上限（' + s5.hp + '/' + s5.MAXHP + '）');

console.log('=== ⑥ 选择模式可取消 / 每局重置 ===');
T.startLevel(0); T.setRunning();
T.onSkillBtn('mark');
ok(T.getSkillMode() === 'mark', '进入选择模式');
T.onSkillBtn('mark');
ok(T.getSkillMode() === null, '再点一次同一个技能按钮 = 取消选择');
T.onSkillBtn('overload');
ok(T.getSkillMode() === 'overload', '切换到过载模式');
T.skillResetAll();
ok(T.getSkillMode() === null && T.SKILLS.every(function(s){ return s.t === 0; }), '每局开始时清空选择模式与所有冷却');

console.log('=== ⑦ 战场点击分支已接入（点敌人/点塔释放）===');
ok(html.indexOf("if (skillMode === 'mark')") >= 0 && html.indexOf("if (skillMode === 'overload')") >= 0,
   '战场点击优先处理技能目标选择（不会误触建塔/查看面板）');
T.clearE();
var pick = T.pushE(mkE(500, 300));
ok(T.pickEnemyAt(505, 302, 50) === pick, '点敌人判定用像素距离取最近目标');
ok(T.pickEnemyAt(50, 50, 50) === null, '点空处不会误选敌人');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.5 主动技能专项全部通过（0 失败）' : '  ❌ v8.5 专项 ' + fail + ' 项失败');
