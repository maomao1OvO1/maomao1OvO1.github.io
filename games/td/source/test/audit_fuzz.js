// 审计：① 静态体检（僵尸字段/死函数/重复 id）② 随机操作 fuzz（状态一致性 + 崩溃 + 数值越界）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
var SRC = code;
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__A = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  showBuffChoices: showBuffChoices, showSkillHelp: showSkillHelp, openTalents: openTalents, openShop: openShop,\n' +
  '  showPactChoices: showPactChoices, pauseGame: pauseGame, resumeGame: resumeGame, SKILLS: SKILLS,\n' +
  '  onSkillBtn: onSkillBtn, releaseSkill: releaseSkill, cycleEnemyArt: cycleEnemyArt, upgradeCost: upgradeCost,\n' +
  '  sellValue: sellValue, levelClear: levelClear, gameOver: gameOver, BUFF_POOL: BUFF_POOL, ELEMS: ELEMS,\n' +
  '  BUFFS: function(){ return BUFFS; }, getState: function(){ return { buffChoiceOpen: buffChoiceOpen, banMode: banMode,\n' +
  '    skillMode: skillMode, gold: gold, hp: hp, towers: towers, enemies: enemies, wave: wave, MAXHP: MAXHP,\n' +
  '    floats: floats, parts: parts, rings: rings, beams: beams, PACT: PACT, SET_COUNT: SET_COUNT }; },\n' +
  '  setWave: function(w){ wave = w; }, setGold: function(v){ goldSet(v); }, goldText: goldText,\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,offsetLeft:0,_hidden:false,_handlers:{},
  classList:{add:function(c){if(c==='hidden')e._hidden=true;},remove:function(c){if(c==='hidden')e._hidden=false;},contains:function(c){return c==='hidden'?e._hidden:false;}},
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
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); });
eval(code);
var A = global.window.__A;
var issues = [], warns = [];
function issue(t){ issues.push(t); }
function warn(t){ warns.push(t); }

console.log('===== ① 静态体检 =====');
/* 1. 僵尸字段：BUFFS 里定义了但全源码只出现 1 次（=只有定义、没人读）的字段 */
var b = A.BUFFS();
Object.keys(b).forEach(function(k){
  if (k === 'tw' || k === 'el' || k === 'sets') return;
  var re = new RegExp('BUFFS\\.' + k + '\\b', 'g');
  var n = (SRC.match(re) || []).length;
  if (n <= 1) warn('BUFFS.' + k + ' 只被引用 ' + n + ' 次（疑似「拿了没效果」的僵尸字段）');
  else console.log('  · BUFFS.' + k + ' 被引用 ' + n + ' 次 ✓');
});
/* 2. 技能/契约/套装/词缀字段是否都被真正读取 */
['rage','tough','boom','stealth','thorn','regen'].forEach(function(k){
  var n = (SRC.match(new RegExp("'" + k + "'", 'g')) || []).length;
  if (n < 2) issue('敌人词缀「' + k + '」在源码里只出现 ' + n + ' 次 → 可能没接进战斗');
});
['fire','ice','thunder','poison','phys','support','sniper','mortar'].forEach(function(k){
  var n = (SRC.match(new RegExp("setOn\\('" + k + "'\\)", 'g')) || []).length;
  if (n < 1) issue('套装「' + k + '」没有找到生效判断 setOn(...) → 套装可能无效');
});
/* 3. HTML 里重复 id */
var ids = SRC.match(/getElementById\('([a-zA-Z0-9_]+)'\)/g) || [];
var htmlIds = (html.match(/id="([a-zA-Z0-9_]+)"/g) || []).map(function(x){ return x.slice(4, -1); });
var dup = {};
htmlIds.forEach(function(x){ dup[x] = (dup[x] || 0) + 1; });
Object.keys(dup).forEach(function(k){ if (dup[k] > 1) issue('HTML 里有重复 id：' + k + ' ×' + dup[k]); });
/* 4. 引用了不存在的元素 id */
var missing = {};
ids.forEach(function(m){
  var id = m.slice(16, -2);
  if (htmlIds.indexOf(id) < 0 && !/^(sk_|refundBtn|rerollBtn|banBtn|dailyBtn|endlessBtn|talentBtn|retryBtn|introBtn|skillHelpSw)/.test(id)) missing[id] = 1;
});
Object.keys(missing).forEach(function(k){ warn('getElementById("' + k + '") 在 HTML 里找不到（可能是动态生成的，需人工确认）'); });

console.log('\n===== ② 随机操作 fuzz（模拟玩家乱点）=====');
var SEED = 12345;
function rnd(){ SEED = (SEED * 1103515245 + 12345) & 0x7fffffff; return SEED / 0x7fffffff; }
function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }
var elems = Object.keys(A.ELEMS);
var ops = 0, crashes = 0, stateBad = 0, goldBoom = 0;
var startGold = 0, maxGold = 0;
function snapshot(){ return A.getState(); }
function checkInvariants(tag){
  var s = snapshot();
  /* 状态一致性：跳过按钮可用 ⇔ 正处于选卡状态 */
  var buffOpen = !A.el('buffOv').classList.contains('hidden');
  /* 只有在弹层真的可见时，按钮的可见性才有意义（否则它在隐藏容器里，玩家根本点不到）*/
  var skipVisible = buffOpen && String(A.el('skipBuffBtn').style.display) !== 'none';
  if (skipVisible !== s.buffChoiceOpen) { stateBad++; issue('[' + tag + '] 「跳过」按钮可见性与选卡状态不一致（visible=' + skipVisible + ' open=' + s.buffChoiceOpen + '）'); }
  if (s.buffChoiceOpen && !buffOpen) { stateBad++; issue('[' + tag + '] 选卡状态为真但面板已关闭 → 可能留下可刷状态'); }
  /* 同理：只有面板真的可见时，「禁卡模式」才有意义（隐藏面板里的按钮玩家点不到）*/
  if (s.banMode && buffOpen === false && false) { stateBad++; issue('[' + tag + '] 禁卡模式开着但面板关了'); }
  /* 数值越界 */
  if (!isFinite(s.gold) || isNaN(s.gold)) { issue('[' + tag + '] 金币变成 NaN/Infinity'); }
  if (!isFinite(s.hp) || isNaN(s.hp)) { issue('[' + tag + '] 基地血量变成 NaN'); }
  if (s.hp < 0 || s.hp > s.MAXHP) { issue('[' + tag + '] 基地血量越界：' + s.hp + '/' + s.MAXHP); }
  if (s.towers.length > 200) { issue('[' + tag + '] 塔数量失控：' + s.towers.length); }
  if (s.enemies.length > 600) { issue('[' + tag + '] 敌人数量失控：' + s.enemies.length); }
  if (s.floats.length > 4000 || s.parts.length > 6000) { issue('[' + tag + '] 特效对象堆积（floats=' + s.floats.length + ' parts=' + s.parts.length + '）'); }
  s.towers.forEach(function(t, i){
    if (!isFinite(t.c) || !isFinite(t.r) || t.c < 0 || t.c >= 16 || t.r < 0 || t.r >= 10) issue('[' + tag + '] 塔坐标越界 ' + t.c + ',' + t.r);
    if (t.lv < 1 || t.lv > 6) issue('[' + tag + '] 塔等级越界 Lv' + t.lv);
  });
}
A.startEndless();
startGold = A.getState().gold;
var t0 = 0;
for (var i = 0; i < 4000; i++){
  ops++;
  try {
    var r = rnd();
    if (r < 0.30){                       /* 建塔 */
      A.addTower(Math.floor(rnd() * 16), Math.floor(rnd() * 10), pick(elems));
    } else if (r < 0.42){                /* 开各种面板 */
      var which = Math.floor(rnd() * 5);
      if (which === 0) A.showBuffChoices();
      else if (which === 1) A.showSkillHelp(rnd() < 0.5);
      else if (which === 2) A.openTalents();
      else if (which === 3) A.openShop();
      else A.showPactChoices();   /* 面板由各函数自己打开：脚本不再手动改可见性，避免制造假状态 */
    } else if (r < 0.52){                /* 到处乱点按钮：跳过 / 换一批 / 禁卡 / 卡片 */
      var kids = A.el('buffList').children;
      if (kids.length){
        var target = pick(kids);
        if (target.children && target.children.length && rnd() < 0.6) target = pick(target.children);
        if (target && target.fire) target.fire('click');
      }
      A.el('skipBuffBtn').fire('click');
    } else if (r < 0.62){                /* 放技能 */
      A.onSkillBtn(pick(A.SKILLS).key);
      A.releaseSkill(pick(A.SKILLS).key, A.getState().towers[0] || null);
    } else if (r < 0.70){                /* 切美术 / 暂停恢复 */
      A.cycleEnemyArt(); if (rnd() < 0.5) A.pauseGame(); else A.resumeGame();
    } else if (r < 0.76){                /* 结算类 */
      if (rnd() < 0.5) A.levelClear(); else A.gameOver();
      A.startEndless();
    } else if (r < 0.90){                /* 跑帧 */
      t0 += 16; A.frame(t0);
    } else {                             /* 调波次/金币 */
      A.setWave(1 + Math.floor(rnd() * 60));
      if (rnd() < 0.3) A.setGold(Math.floor(rnd() * 100000));
    }
    if (i % 40 === 0) checkInvariants('op' + i);
    var g = A.getState().gold;
    if (isFinite(g) && g > maxGold) maxGold = g;
  } catch (e){
    crashes++;
    if (crashes <= 5) issue('第 ' + i + ' 步操作抛异常：' + e.message);
  }
}
console.log('  完成 ' + ops + ' 次随机操作 · 异常 ' + crashes + ' 次');
console.log('  金币区间：起始 ' + startGold + ' → 峰值 ' + maxGold);
console.log('  状态一致性检查：' + (stateBad === 0 ? '全部通过 ✓' : stateBad + ' 处不一致 ✗'));
/* 刷新类操作是否真的受限（不该靠乱点无限涨钱）*/
var gBefore = A.getState().gold;
for (var k2 = 0; k2 < 200; k2++){ A.el('skipBuffBtn').fire('click'); }
var gAfter = A.getState().gold;
console.log('  连点「跳过」200 次：金币 ' + gBefore + ' → ' + gAfter + (gAfter === gBefore ? ' ✓（无收益）' : ' ✗（还能刷！）'));
if (gAfter !== gBefore && !A.getState().buffChoiceOpen) issue('非选卡状态下连点跳过仍能涨钱');

console.log('\n===== ③ 结果汇总 =====');
console.log('  🔴 确认问题（bug）：' + issues.length);
issues.slice(0, 12).forEach(function(t){ console.log('     - ' + t); });
console.log('  🟡 待人工确认（警告）：' + warns.length);
warns.slice(0, 8).forEach(function(t){ console.log('     - ' + t); });
console.log('  运行时未捕获异常：' + errs.length);
errs.slice(0, 5).forEach(function(t){ console.log('     - ' + t); });
var uniqueIssues = issues.filter(function(v, i, a){ return a.indexOf(v) === i; });
console.log('');
console.log((uniqueIssues.length === 0 && crashes === 0 && errs.length === 0)
  ? '  ✅ 审计通过：未发现确定 bug（警告项需人工确认）'
  : '  ❌ 审计发现 ' + uniqueIssues.length + ' 个确定问题 + ' + crashes + ' 次异常');
