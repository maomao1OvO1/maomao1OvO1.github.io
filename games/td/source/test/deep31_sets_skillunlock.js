// v8.6 专项：技能按关卡解锁 + 技能用法说明 + 元素套装卡（集 3 张同元素专属卡激活）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  SKILLS: SKILLS, skillUnlocked: skillUnlocked, skillUnlockedAt: skillUnlockedAt, skillUnlockLv: skillUnlockLv,\n' +
  '  skHowTo: skHowTo, showSkillHelp: showSkillHelp, onSkillBtn: onSkillBtn, renderSkillBar: renderSkillBar,\n' +
  '  ELEM_SETS: ELEM_SETS, SET_NEED: SET_NEED, grantCard: grantCard, setOn: setOn, checkElemSets: checkElemSets,\n' +
  '  BUFF_POOL: BUFF_POOL, statAt: statAt, elemAt: elemAt, ELEMS: ELEMS, hitEnemy: hitEnemy, killEnemy: killEnemy,\n' +
  '  setSkillUnlockDebug: function(k, lv){ SKILL_UNLOCK[k] = lv; }, getIndex: function(){ return lvIndex; },\n' +
  '  getSkillMode: function(){ return skillMode; }, setSkillMode: function(v){ skillMode = v; },\n' +
  '  setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); }, CELL: CELL,\n' +
  '  pushE: function(e){ enemies.push(e); return e; }, clearE: function(){ enemies = []; },\n' +
  '  getS: function(){ return { enemies: enemies, towers: towers, BUFFS: BUFFS, SET_COUNT: SET_COUNT }; },\n' +
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
function ft(elem, lv){ return { c:0, r:0, elem:elem, lv:lv||1, res:null, affix:null, spec:null }; }
function mkE(x, y, over){
  var e = { type:'normal', x:x, y:y, hp:100000, maxhp:100000, speed:20, gold:10, color:'#fff', r:11,
            armor:0, immuneSlow:false, boss:false, wp:0, done:0, slowT:0, slowF:1, dotT:0, dotD:0,
            hitFlash:0, dir:0, spawnT:0, walk:0, shieldT:0, shieldBuffT:0, markT:0 };
  for (var k in (over || {})) e[k] = over[k];
  return e;
}

console.log('=== ① 技能按关卡逐个解锁（不要一开始全给）===');
T.startLevel(0);
ok(!T.skillUnlocked('mark') && !T.skillUnlocked('overload') && !T.skillUnlocked('repair') && T.skillUnlocked('freeze'),
   '第 1 关：只有 ❄️冰冻 可用（其余 🔒）');
var plan = [ { lv:0, want:['freeze'] }, { lv:2, want:['freeze','mark'] }, { lv:5, want:['freeze','mark','overload'] }, { lv:9, want:['freeze','mark','overload','repair'] } ];
plan.forEach(function(p){
  var got = T.SKILLS.filter(function(sk){ return T.skillUnlockedAt(sk.key, p.lv); }).map(function(sk){ return sk.key; });
  ok(got.length === p.want.length && got.every(function(k, i){ return k === p.want[i]; }),
     '第 ' + (p.lv + 1) + ' 关可用技能：' + got.join('/'));
});
ok(T.skillUnlockLv('mark') === 3 && T.skillUnlockLv('overload') === 6 && T.skillUnlockLv('repair') === 10,
   '解锁节奏：标记第 3 关 / 过载第 6 关 / 维修第 10 关（每几关加一个，到后期才全有）');
T.startEndless();
ok(T.skillUnlocked('repair'), '无尽模式视为「后期」→ 4 个技能全部可用');
T.startLevel(0);
T.renderSkillBar();
var bar = T.el('skillBar');
var lockCount = bar.children.filter(function(c){ return String(c.textContent) === '🔒'; }).length;
ok(lockCount === 3, '第 1 关技能栏有 ' + lockCount + ' 个 🔒（未解锁的技能按钮显示锁）');
T.onSkillBtn('repair');
ok(T.getSkillMode() === null, '点未解锁技能不会进入选择模式（只给提示）');

console.log('=== ② 技能用法说明（怎么用要写清楚）===');
ok(T.skHowTo('freeze').indexOf('直接释放') >= 0, '冰冻用法：' + T.skHowTo('freeze'));
ok(T.skHowTo('mark').indexOf('再点战场上的一个敌人') >= 0, '标记用法：' + T.skHowTo('mark'));
ok(T.skHowTo('overload').indexOf('再点一座已建好的塔') >= 0, '过载用法：' + T.skHowTo('overload'));
ok(T.skHowTo('repair').indexOf('直接释放') >= 0, '维修用法：' + T.skHowTo('repair'));
T.startLevel(0); T.setRunning();
T.showSkillHelp(false);   /* v8.12：技能说明默认改成「简短版」→ 本用例要看完整内容，显式指定完整版 */
var helpHtml = String(T.el('buffList')._html || '');
var helpKids = T.el('buffList').children;
ok(helpKids.length >= 5, '说明面板列出 4 个技能 + 关闭按钮（' + helpKids.length + ' 个控件）');
var helpText = helpKids.map(function(c){ return String(c._html || c.textContent || ''); }).join(' ');
ok(/用法/.test(helpText) && /冷却/.test(helpText), '每条技能都写了「用法」与「冷却」');
ok(/🔒 第 10 关解锁/.test(helpText), '未解锁技能注明解锁关卡（第 10 关解锁）');
ok(/点按钮直接释放/.test(helpText) || /再点战场/.test(helpText), '面板里有具体操作步骤');
ok(html.indexOf('主动技能说明') >= 0 && html.indexOf("helpBtn.textContent = '?'") >= 0, '技能栏末尾有「?」按钮打开该说明');
ok(html.indexOf('本关主动技能') >= 0, '关卡开幕提示里也会列出本关可用的技能');

console.log('=== ③ 套装卡：集 3 张同元素专属卡激活 ===');
T.startLevel(0);
ok(Object.keys(T.ELEM_SETS).length === 8, '共 8 个元素套装（' + Object.keys(T.ELEM_SETS).map(function(k){ return T.ELEM_SETS[k].name; }).join(' ') + '）');
ok(T.SET_NEED === 3, '每个套装需要集齐 ' + T.SET_NEED + ' 张同元素专属卡');
var fireCards = T.BUFF_POOL.filter(function(c){ return c.elKey === 'fire'; });
ok(fireCards.length >= 3, '火焰塔专属卡有 ' + fireCards.length + ' 张（够凑套装）');
T.grantCard(fireCards[0]);
ok(!T.setOn('fire') && T.getS().SET_COUNT.fire === 1, '拿 1 张火系专属卡 → 进度 1/3，未激活');
T.grantCard(fireCards[1]);
ok(!T.setOn('fire'), '拿 2 张 → 仍未激活（进度 2/3）');
T.grantCard(fireCards[2]);
ok(T.setOn('fire'), '拿第 3 张 → 🔥 烈焰套装激活！');
/* 通用卡不计数 */
T.startLevel(0);
var genCard = T.BUFF_POOL.filter(function(c){ return !c.elKey; })[0];
T.grantCard(genCard); T.grantCard(genCard); T.grantCard(genCard);
ok(!T.getS().SET_COUNT.fire && Object.keys(T.getS().SET_COUNT).length === 0, '通用卡不推进套装进度（只算专属卡）');
T.startLevel(0);
ok(Object.keys(T.getS().SET_COUNT).length === 0 && !T.setOn('fire'), '开新一局套装进度清零');

console.log('=== ④ 套装效果逐个验证（真的接进战斗数值）===');
function withSet(key){
  T.startLevel(0);
  BUFFS_SETS(key);
  function BUFFS_SETS(k){ T.getS().BUFFS.sets[k] = 1; }
}
var noCrit = function(){ Math.random = function(){ return 0.999; }; };
noCrit();
/* 烈焰：溅射半径 ×1.3 */
T.startLevel(0); var spBase = T.elemAt('fire', 1).splashR;
withSet('fire');
function splashReach(){      /* 端到端：1.15 格外的敌人能不能被溅到（用真实 CELL 换算） */
  T.clearE();
  var mk = mkE;
  var tg = T.pushE(mk(300, 300)), side = T.pushE(mk(300 + T.CELL * 1.15, 300));
  var t = ft('fire');
  T.hitEnemy(t, tg, T.statAt(t, 1), T.ELEMS.fire);
  return 100000 - side.hp;
}
T.startLevel(0);
var shNo = splashReach();
withSet('fire');
var shYes = splashReach();
ok(shNo === 0 && shYes > 0, '🔥 烈焰套装：溅射半径变大（1.15 格外的敌人 平静时打不到 → 套装后能溅到 ' + Math.round(shYes) + '）');
/* 雷暴：链弹不衰减 */
T.startLevel(0); var ckNo = T.elemAt('thunder', 1).chainK;
withSet('thunder'); var ckYes = T.elemAt('thunder', 1).chainK;
ok(ckNo < 1 && ckYes === 1, '⚡ 雷暴套装：链弹衰减 ' + ckNo + ' → ' + ckYes + '（每跳满伤）');
/* 狙击：暴击倍率 2.5 → 3.2 */
function critDmg(){
  T.clearE(); var e = T.pushE(mkE(300, 300)); e.shieldT = 0;
  T.getS().BUFFS.crit = 1;                        /* 先把暴击率拉满，保证必定暴击 */
  var t = ft('sniper');
  Math.random = function(){ return 0; };          /* 必暴击 */
  var before = e.hp;
  T.hitEnemy(t, e, T.statAt(t, 1), T.ELEMS.sniper);
  Math.random = function(){ return 0.999; };
  return before - e.hp;
}
T.startLevel(0); var cd0 = critDmg();
withSet('sniper'); var cd1 = critDmg();
ok(Math.abs(cd1 / cd0 - 3.2 / 2.5) < 0.03, '🎯 狙击套装：暴击伤害 ' + cd0.toFixed(0) + ' → ' + cd1.toFixed(0) + '（2.5 → 3.2 倍）');
/* 破军：物理塔对有甲目标 +30% */
function physArmor(){
  T.clearE(); var e = T.pushE(mkE(300, 300, { armor:0.5 })); e.shieldT = 0;
  var t = ft('phys'); var before = e.hp;
  T.hitEnemy(t, e, T.statAt(t, 1), T.ELEMS.phys);
  return before - e.hp;
}
T.startLevel(0); var pa0 = physArmor();
withSet('phys'); var pa1 = physArmor();
ok(pa1 > pa0 * 1.15, '🔨 破军套装：对有甲目标 ' + Math.round(pa0) + ' → ' + Math.round(pa1) + ' 伤害');
/* 共鸣：光环 +50% */
T.startLevel(0); T.setGold(99999);
T.addTower(0, 0, 'fire'); T.addTower(1, 0, 'support');
var atk = null; T.getS().towers.forEach(function(x){ if (x.elem === 'fire') atk = x; });
var au0 = (function(){ T.getS().BUFFS.sets = {}; return T.statAt(atk, 1).dmg; })();
T.getS().BUFFS.sets.support = 1;
var au1 = T.statAt(atk, 1).dmg;
ok(au1 > au0 * 1.05, '📡 共鸣套装：光环效果提升（该塔伤害 ' + au0.toFixed(1) + ' → ' + au1.toFixed(1) + '）');
/* 瘟疫：毒杀传播 */
T.startLevel(0); T.getS().BUFFS.sets.poison = 1;
T.clearE();
var dead = T.pushE(mkE(300, 300, { dotT: 3, dotD: 50 }));
var nb = T.pushE(mkE(300 + T.CELL * 1.2, 300));
nb.dotT = 0;
dead.hp = 1;
T.killEnemy(dead, 0);
ok(nb.dotT > 0 && nb.dotD > 0, '☠️ 瘟疫套装：中毒死亡的敌人把毒传给 1.2 格内的邻居（邻居中毒 ' + nb.dotD.toFixed(0) + '/秒）');
/* 永冻 / 轰炸 接入声明 */
ok(html.indexOf("setOn('ice') && e.slowT > 0") >= 0, '❄️ 永冻套装已接入暴击判定（被减速目标 +20%）');
ok(html.indexOf("setOn('mortar')") >= 0, '💥 轰炸套装已接入溅射半径与伤害');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.6 技能解锁 + 套装卡专项全部通过（0 失败）' : '  ❌ v8.6 专项 ' + fail + ' 项失败');
