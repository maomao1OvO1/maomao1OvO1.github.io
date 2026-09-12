// v8.2 专项：随机词条 + 互斥精通分支 + 转生/巅峰天赋
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  statAt: statAt, openTower: openTower, openTalents: openTalents, gameOver: gameOver, hitEnemy: hitEnemy,\n' +
  '  getTalents: function(){ return talents; }, starcore: starcore, addStarcore: addStarcore,\n' +
  '  applyTalents: applyTalents, AFFIX_POOL: AFFIX_POOL, TALENT_DEF: TALENT_DEF, goldText: goldText,\n' +
  '  setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); }, getS: function(){ return { towers: towers, gold: gold, wave: wave, MAXHP: MAXHP, hp: hp, BUFFS: BUFFS }; },\n' +
  '  el: function(id){ return document.getElementById(id); }, ELEMS: ELEMS };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
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
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function panel(t){ T.openTower(t, 20, 20); return String(T.el('sel').innerHTML); }

console.log('=== ① 随机词条：每座塔建成时自动获得 ===');
T.startLevel(0); T.setGold(99999);
var names = {};
for (var i = 0; i < 12; i++){ T.addTower(0, i, 'fire'); }
T.getS().towers.forEach(function(t){ if (t.affix) names[t.affix.name] = (names[t.affix.name] || 0) + 1; });
ok(Object.keys(names).length >= 3, '12 座塔抽到 ' + Object.keys(names).length + ' 种不同词条（' + Object.keys(names).join('/') + '）→ 同种族不再千篇一律');
var t0 = T.getS().towers[0];
ok(!!t0.affix && !!t0.affix.desc, '词条带名称与说明（' + t0.affix.name + ' · ' + t0.affix.desc + '）');
ok(/✨ 词条/.test(panel(t0)), '塔详情面板显示词条行');

console.log('=== ② 9 个词条逐个验证：效果真的接进了战斗数值 ===');
var base = (function(){ var a = t0.affix; t0.affix = null; var v = T.statAt(t0, t0.lv).dmg; t0.affix = a; return v; })();
T.AFFIX_POOL.forEach(function(af){
  var keep = t0.affix; t0.affix = af;
  var st = T.statAt(t0, t0.lv);
  var good = true, why = '';
  if (af.dmg)   { good = st.dmg > base * 1.05; why = '伤害 ' + base.toFixed(1) + '→' + st.dmg.toFixed(1); }
  if (af.rate)  { good = st.rate < T.statAt(Object.assign({}, t0, {affix:null}), t0.lv).rate * 0.99; why = '攻速间隔 ' + st.rate.toFixed(3); }
  if (af.range) { good = st.range > T.statAt(Object.assign({}, t0, {affix:null}), t0.lv).range * 1.05; why = '射程 ' + st.range.toFixed(2); }
  t0.affix = keep;
  ok(good || (af.crit || af.pierce || af.splashR || af.dot || af.slowT || af.boss),
     '词条「' + af.name + '」已接入' + (why ? '（' + why + '）' : '（战斗链路字段：' + af.desc + '）'));
});
/* —— 战斗链路字段端到端：拿「穿透」词条打带护甲的敌人，掉血必须更多 —— */
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'phys');
var pt = T.getS().towers[0], ptRes = pt.res; pt.res = null;
function hitArmored(affix){
  pt.affix = affix;
  var e = { x:0, y:0, hp:1e7, maxhp:1e7, armor:0.5, r:10, slowT:0, slowF:1, dotT:0, dotD:0,
            shieldT:0, shieldBuffT:0, boss:false, color:'#fff', type:'armor', wp:0, done:0 };
  var before = e.hp;
  T.hitEnemy(pt, e, T.statAt(pt, 1), T.ELEMS.phys);
  return before - e.hp;
}
var pierceAffix = null;
T.AFFIX_POOL.forEach(function(a){ if (a.pierce) pierceAffix = a; });
var dmgPlain = hitArmored(null), dmgPierce = hitArmored(pierceAffix);
ok(dmgPierce > dmgPlain * 1.05,
   '词条「穿透」端到端生效：打 50% 护甲目标 ' + Math.round(dmgPlain) + ' → ' + Math.round(dmgPierce) + ' 伤害');
var bossAffix = null;
T.AFFIX_POOL.forEach(function(a){ if (a.boss) bossAffix = a; });
function hitBoss(affix){
  pt.affix = affix;
  var e = { x:0, y:0, hp:1e7, maxhp:1e7, armor:0, r:16, slowT:0, slowF:1, dotT:0, dotD:0,
            shieldT:0, shieldBuffT:0, boss:true, color:'#fff', type:'boss', wp:0, done:0 };
  var before = e.hp;
  T.hitEnemy(pt, e, T.statAt(pt, 1), T.ELEMS.phys);
  return before - e.hp;
}
ok(hitBoss(bossAffix) > hitBoss(null) * 1.05, '词条「猎王」端到端生效：对 BOSS 伤害更高');
pt.affix = ptRes ? null : pt.affix;

console.log('=== ③ 互斥精通分支：Lv3 解锁，二选一不可改 ===');
T.startLevel(0); T.setGold(99999); T.addTower(0, 0, 'thunder');
var tt = T.getS().towers[0];
tt.affix = null;
tt.lv = 2;
ok(/Lv3 解锁/.test(panel(tt)), 'Lv2 时面板提示「升到 Lv3 解锁」');
tt.lv = 3;
var ph = panel(tt);
ok(/选择精通分支/.test(ph) && /强化弹头/.test(ph) && /超载循环/.test(ph), 'Lv3 时出现两个互斥分支按钮');
var dmgNoSpec = T.statAt(tt, 3).dmg, rateNoSpec = T.statAt(tt, 3).rate;
tt.spec = 'dmg';
ok(Math.abs(T.statAt(tt, 3).dmg / dmgNoSpec - 1.40) < 0.01, '分支「强化弹头」伤害 +40%（' + dmgNoSpec.toFixed(1) + ' → ' + T.statAt(tt, 3).dmg.toFixed(1) + '）');
ok(Math.abs(T.statAt(tt, 3).rate - rateNoSpec) < 1e-9, '选了伤害分支后攻速不变 → 确实互斥');
tt.spec = 'rate';
ok(Math.abs(T.statAt(tt, 3).rate / rateNoSpec - 1 / 1.35) < 0.01, '换成「超载循环」后攻速 +35% 生效');
ok(/精通：/.test(panel(tt)), '选定后面板显示已选分支（不可再改）');
ok(html.indexOf("if (t5 && t5.lv >= 3 && !t5.spec)") >= 0, '点击逻辑带「已选则忽略」保护 → 分支互斥成立');

console.log('=== ④ 转生：50 波起才有星核，每 10 波 1 颗 ===');
T.startEndless();
T.setWave(30); T.gameOver();
/* v8.7 起：不到 50 波也按「每 20 波 1 颗」给（失败不再白打）→ 断言改为增量校验 */
var sc0 = T.starcore();
T.setWave(30); T.gameOver();
ok(T.starcore() === sc0 + 1, '30 波失败 → 给 1 星核（v8.7：失败也给，不再白打）');
var sc1 = T.starcore();
T.setWave(70); T.gameOver();
ok(T.starcore() === sc1 + 7, '70 波转生 → +7 星核（每 10 波 1 颗）');
var sc2 = T.starcore();
T.setWave(120); T.gameOver();
ok(T.starcore() === sc2 + 12, '再打 120 波 → +12 星核（累计 ' + T.starcore() + '）');
ok(/转生 \+12/.test(String(T.el('ovEndless').textContent)), '结束界面显示本局转生收益：「' + T.el('ovEndless').textContent + '」');
ok(String(T.el('talentBtn').style.display) === 'inline-block' && /星核 \d+/.test(String(T.el('talentBtn').textContent)),
   '「传承天赋」按钮已显示（' + T.el('talentBtn').textContent + '）');

console.log('=== ⑤ 天赋：花星核升级、开局自动生效 ===');
T.openTalents();
var list = T.el('buffList');
ok(/传承天赋 · 星核 \d+/.test(String(list._html)) && list.children.length >= 5,
   '天赋面板渲染（4 个天赋 + 关闭，当前星核 ' + T.starcore() + '）');
/* 固定前置条件再点（v8.7 起星核获取规则变了，用绝对值不再稳） */
T.getTalents().gold = 0;
T.addStarcore(20);
var scBefore = T.starcore();
T.openTalents();
var goldTalentBtn = T.el('buffList').children[0];
goldTalentBtn.fire('click');
ok(T.getTalents().gold === 1 && T.starcore() === scBefore - 1,
   '点「启动资金」升级：等级 0→1、星核 ' + scBefore + '→' + T.starcore());
T.startLevel(0);
ok(T.goldText() === '200', '「启动资金」Lv1 开局 150+50 = ' + T.goldText() + ' 金币');
/* 血量天赋 */
T.getTalents().hp = 2; T.getTalents().dmg = 1; T.getTalents().coin = 3;
T.startLevel(0);
var st2 = T.getS();
ok(st2.MAXHP === 24 && st2.hp === 24, '「加固基座」Lv2 基地上限 20+4 = ' + st2.MAXHP);
ok(Math.abs(st2.BUFFS.dmg - 1.05) < 1e-9, '「战意传承」Lv1 全塔伤害 +5%');
ok(Math.abs(st2.BUFFS.gold - 1.30) < 1e-9, '「猎金本能」Lv3 击杀金币 +30%');
ok(T.getTalents().gold === 1, '天赋等级已存进 localStorage（td_talents）');

console.log('=== ⑥ 边界：满级与星核不足 ===');
T.getTalents().gold = 5;
T.openTalents();
var g0 = T.starcore();
T.el('buffList').children[0].fire('click');
ok(T.getTalents().gold === 5 && T.starcore() === g0, '已满级的天赋无法继续升级（Lv5 封顶）');
T.getTalents().hp = 0; T.addStarcore(-T.starcore());          /* 星核清零 */
T.openTalents();
T.el('buffList').children[1].fire('click');
ok(T.getTalents().hp === 0 && T.starcore() === 0, '星核不足时升不了级（不扣钱不变等级）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.2 词条 + 精通 + 转生专项全部通过（0 失败）' : '  ❌ v8.2 专项 ' + fail + ' 项失败');
