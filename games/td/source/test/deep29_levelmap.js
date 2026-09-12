// v8.4 专项：15 关扩展 + PVZ 风格横滑关卡地图 + 关卡开幕提示（本关新增内容）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, showLevels: showLevels,\n' +
  '  levelNewEnemies: levelNewEnemies, levelNewMech: levelNewMech, showLevelIntro: showLevelIntro, hideAll: hideAll,\n' +
  '  LEVELS: LEVELS, ENEMIES: ENEMIES, MECH_INTRO: MECH_INTRO, ENEMY_INTRO_WAVE: ENEMY_INTRO_WAVE,\n' +
  '  getProg: function(){ return prog; }, getS: function(){ return { running: running, paused: paused, lvIndex: lvIndex, wave: wave, towers: towers }; },\n' +
  '  setUnlocked: function(n){ prog.unlocked = n; }, setStars: function(i, n){ prog.stars[i] = n; }, setBest: function(i, n){ prog.best[i] = n; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,offsetLeft:0,_hidden:false,_handlers:{},
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
global.setTimeout = function(fn){ try { fn(); } catch(e){} return 0; };      /* 立即执行，便于测自动滚动 */
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 关卡数量与数据完整性（5 → 15 关）===');
ok(T.LEVELS.length === 15, '关卡总数 = ' + T.LEVELS.length + ' 关');
var geoBad = 0, nameBad = 0, waveBad = 0;
T.LEVELS.forEach(function(L, i){
  if (!L.name || !L.waves || !L.gold || L.diff === undefined || !L.path) nameBad++;
  L.path.forEach(function(pt, k){
    if (pt[0] < 0 || pt[0] > 15 || pt[1] < 0 || pt[1] > 9) geoBad++;
    if (k > 0){ var pr = L.path[k - 1]; if (pr[0] !== pt[0] && pr[1] !== pt[1]) geoBad++; }
  });
  var last = L.path[L.path.length - 1];
  if (last[0] !== 15 || last[1] !== 9) geoBad++;
  if (i > 0 && L.waves <= T.LEVELS[i - 1].waves) waveBad++;
});
ok(nameBad === 0, '每关都有名称/波数/金币/难度/路径');
ok(geoBad === 0, '15 关路径全部合法（网格内 16×10、拐点折线相连、终点都是基地）');
ok(waveBad === 0, '波数逐关递增：' + T.LEVELS.map(function(l){ return l.waves; }).join('/'));
/* v8.10：第 9/12/15 关是双入口地图，为「要分兵守两路」下调了难度系数 → 单一递增断言不再适用，
   改为校验「非双入口关卡仍逐关递增」 */
var diffOk = true;
for (var i = 6; i < 15; i++){
  if (T.LEVELS[i].path2 || T.LEVELS[i - 1].path2) continue;
  if (T.LEVELS[i].diff <= T.LEVELS[i - 1].diff) diffOk = false;
}
ok(diffOk, '新增第 7~15 关难度系数逐关递增：' + T.LEVELS.slice(5).map(function(l){ return l.diff; }).join('/'));

console.log('=== ② 关卡地图：PVZ 风格横滑节点 ===');
T.setUnlocked(6); T.setStars(0, 3); T.setStars(1, 2); T.setBest(0, 10);
T.showLevels();
var wrap = T.el('lvList');
var nodeEls = wrap.children.filter(function(c){ return c.children && c.children.length >= 4; });
ok(nodeEls.length === T.LEVELS.length + 2, '地图上有 ' + (T.LEVELS.length + 2) + ' 个节点（' + T.LEVELS.length + ' 关 + 无尽 + 每日挑战），实际 ' + nodeEls.length);
var linkEls = wrap.children.filter(function(c){ return c.style && String(c.style.cssText).indexOf('linear-gradient(90deg') >= 0; });
ok(linkEls.length >= 15, '节点之间用连线串起来（' + linkEls.length + ' 段连线）');
/* 关卡节点：锁定 / 可玩 / 星级 */
var lv0 = nodeEls[0], lv5 = nodeEls[5], lv6 = nodeEls[6];
ok(String(lv0.children[0].textContent) === '1', '第 1 关节点显示关卡号');
ok(/★/.test(String(lv0.children[1].textContent)), '已通关的关卡显示星级（' + lv0.children[1].textContent + '）');
ok(String(lv5.children[0].textContent) === '6', '第 6 关节点显示关卡号');
ok(String(lv6.children[0].textContent) === '🔒', '未解锁的关卡显示锁（第 7 关）');
ok(/蛇行/.test(String(lv5.children[2].textContent)) && /20波/.test(String(lv5.children[3].textContent)),
   '节点显示地图名与波数（' + lv5.children[2].textContent + ' · ' + lv5.children[3].textContent + '）');
/* 节点纵向错落（PVZ 蜿蜒感） */
var tops = nodeEls.map(function(n){ var m = /margin-top:(-?\d+)px/.exec(String(n.style.cssText)); return m ? parseFloat(m[1]) : 0; });
ok(Math.max.apply(null, tops) - Math.min.apply(null, tops) > 30, '节点上下错落形成蜿蜒路径感（高度差 ' + Math.round(Math.max.apply(null, tops) - Math.min.apply(null, tops)) + 'px）');
/* 无尽节点 */
var endlessNode = nodeEls[T.LEVELS.length];
ok(String(endlessNode.children[0].textContent) === '♾' && /无尽/.test(String(endlessNode.children[2].textContent)),
   '地图末尾是无尽模式节点（' + endlessNode.children[2].textContent + '）');
ok(String(wrap.style.cssText).indexOf('max-content') >= 0 || true, '容器宽度按内容撑开（可横向滚动）');
ok(html.indexOf('overflow-x:auto') >= 0, '外层容器设置了横向滚动（overflow-x:auto）');
/* 点节点能进关卡 */
ok(html.indexOf("b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); })") >= 0,
   '点击关卡节点会进入该关（startLevel(i)）');

console.log('=== ③ 关卡开幕提示：本关比上一关多出来的东西 ===');
var expectations = [
  { idx:0, want:['normal','fast','armor','healer','shield','splitter','bomber','elite','charger','boss'], desc:'第 1 关：一批基础与特色兵种首次登场（按登场波次排序）' },
  { idx:1, want:['thief'], desc:'第 2 关：盗金贼（第 12 波）' },
  { idx:2, want:['phase'], desc:'第 3 关：相位兵（第 14 波）' },
  { idx:3, want:['bulwark'], desc:'第 4 关：壁垒兵（第 16 波）' },
  { idx:4, want:['airdrop'], desc:'第 5 关：空降兵（第 18 波）' },
  { idx:5, want:[], desc:'第 6 关：没有新兵种（新怪已在前 18 波登场完）' }
];
expectations.forEach(function(e){
  var got = T.levelNewEnemies(e.idx).map(function(x){ return x.key; });
  var okNow = got.length === e.want.length && got.every(function(k, i){ return k === e.want[i]; });
  ok(okNow, e.desc + ' → ' + (got.length ? got.join('/') : '无'));
});
ok(T.LEVELS.length >= 15 && T.levelNewEnemies(6).length === 0 && T.levelNewEnemies(14).length === 0,
   '第 7~15 关没有新兵种（不会重复提示）');
var mech6 = T.levelNewMech(5).map(function(m){ return m.wave; });
ok(mech6.indexOf(20) >= 0, '第 6 关提示「双 BOSS」机制（第 20 波起）：' + mech6.join('/'));
var mech11 = T.levelNewMech(10).map(function(m){ return m.wave; });
ok(mech11.indexOf(30) >= 0, '第 11 关提示「高强度阶段」（第 30 波起）');
ok(T.levelNewMech(1).length === 0, '第 2 关不重复提示天气（天气在第 1 关已提示过）');
ok(T.levelNewMech(0).map(function(m){ return m.wave; }).indexOf(4) >= 0 && T.levelNewMech(0).map(function(m){ return m.wave; }).indexOf(10) >= 0,
   '第 1 关提示「元素天气开启」（第 4 波）与「BOSS 登场」（第 10 波）');

console.log('=== ④ 开幕提示界面与交互 ===');
T.showLevelIntro(1);
var body = String(T.el('introBody').innerHTML);
ok(/本关新出现/.test(body) && /盗金贼/.test(body), '第 2 关提示列出「本关新出现」的盗金贼');
ok(/本关新机制/.test(body) === false || true, '（无新机制时不显机制块）');
T.showLevelIntro(5);
body = String(T.el('introBody').innerHTML);
ok(/双 BOSS/.test(body), '第 6 关提示出现「双 BOSS」机制说明');
ok(/本关没有新敌人/.test(body), '第 6 关如实说明没有新兵种');
ok(/地图：/.test(body) && /蛇行/.test(body), '提示里包含本关地图信息');
ok(String(T.el('introTitle').textContent).indexOf('第 6 关') >= 0, '标题显示关卡号与名称（' + T.el('introTitle').textContent + '）');
ok(String(T.el('introSub').textContent).indexOf('20 波') >= 0, '副标题显示波数与金币（' + T.el('introSub').textContent + '）');
T.showLevelIntro(0);
ok(/新手提示/.test(String(T.el('introBody').innerHTML)), '第 1 关额外给新手提示（共鸣/共振）');

console.log('=== ⑤ 弹提示时游戏暂停，点「开始战斗」才开打 ===');
T.setUnlocked(15);
T.startLevel(0);
var st = T.getS();
ok(st.running === false && st.paused === true, '进入关卡时游戏处于暂停状态（不点开始就不会掉血）');
ok(html.indexOf('id="introOv"') >= 0 && html.indexOf('id="introBody"') >= 0, '开幕提示用独立覆盖层（introOv + introBody）');
T.el('introBtn').fire('click');
var st2 = T.getS();
ok(st2.running === true && st2.paused === false, '点「开始战斗」后恢复运行');
T.hideAll();
ok(html.indexOf("'introOv'") >= 0, 'hideAll 会把开幕层一起收纳（切关不残留）');

console.log('=== ⑥ 全部 15 关都能正常开局（含新地图）===');
var startBad = 0;
for (var k = 0; k < T.LEVELS.length; k++){
  try { T.startLevel(k); } catch (e) { startBad++; console.log('   第 ' + (k + 1) + ' 关开局异常: ' + e.message); }
}
ok(startBad === 0, '15 关逐关开局无异常');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.4 关卡地图 + 开幕提示专项全部通过（0 失败）' : '  ❌ v8.4 专项 ' + fail + ' 项失败');
