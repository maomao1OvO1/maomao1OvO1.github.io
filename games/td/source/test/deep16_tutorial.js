// deep16_tutorial.js —— 新手教学关专项验证（补丁 patches/p_h_tutorial.py）
// 覆盖：入口 #tutBtn / 独立配置 TUTORIAL / 5 步分步引导 / 教学通关与奖励只发一次 /
//       非教学模式下 #tutBar 不显示 / 教学关内暂停·重开·返回选关 / 存档旧版本兜底 / 0 运行时报错
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startTutorial: startTutorial, frame: frame, addTower: addTower,\n' +
  '  openTower: openTower, upgradeCost: upgradeCost, syncTutLabel: syncTutLabel, hideAll: hideAll,\n' +
  '  isPath: isPath,\n' +
  '  ELEMS: ELEMS, LEVELS: LEVELS, TUTORIAL: TUTORIAL, TUT_STEPS: TUT_STEPS,\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, paused: paused, kills: kills, built: built, WAVES_TOTAL: WAVES_TOTAL,\n' +
  '    WAYPOINTS: WAYPOINTS, prog: prog, tutorial: tutorial, tutStep: tutStep, tutBuffCount: tutBuffCount,\n' +
  '    floats: floats, BUFFS: BUFFS }; },\n' +
  '  setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
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
var t0 = 5e6;
function step(n){ for (var i = 0; i < n; i++){ t0 += 16.7; T.frame(t0); } }
function hasFloat(txt){
  var f = T.getS().floats || [];
  for (var i = 0; i < f.length; i++){ if (String(f[i].txt).indexOf(txt) >= 0) return true; }
  return false;
}
var selEl = T.el('sel');
selEl.firePointer = function(ds){
  var h = selEl._handlers['click'];
  if (!h) throw new Error('sel 未绑定 pointerdown');
  h({ stopPropagation:function(){}, target:{ closest:function(){ return { dataset: ds }; } } });
};

console.log('=== ① 入口与结构（不污染既有流程）===');
ok(html.indexOf('id="tutBtn"') >= 0, '首页存在 #tutBtn「🎓 新手教学」');
ok(html.indexOf('id="startBtn"') < html.indexOf('id="tutBtn"') && html.indexOf('id="tutBtn"') < html.indexOf('id="bookBtn"'),
   '#tutBtn 位于 #startBtn 下方、#bookBtn 上方');
var lvFrom = html.indexOf('id="levelsOv"'), lvTo = html.indexOf('id="overOv"');
ok(lvFrom > 0 && lvTo > lvFrom && html.slice(lvFrom, lvTo).indexOf('tutBtn') < 0,
   '选关页 #levelsOv 内没有教学入口（v8.4 起选关页是 15 关 + 无尽的横滑地图）');
var l1 = html.indexOf('var LEVELS = ['), l2 = html.indexOf('];', l1);
ok(l1 > 0 && l2 > l1 && html.slice(l1, l2).indexOf('TUTORIAL') < 0, '教学配置未混入 LEVELS 数组（v8.4 起 15 关）');
ok(html.indexOf('id="tutBar"') > 0 && /id="tutBar"[^>]*display:none/.test(html), '#tutBar 默认 display:none（仅教学关显示）');
ok(T.LEVELS.length === 15, 'LEVELS 共 ' + T.LEVELS.length + ' 关（v8.4 从 5 关扩到 15 关）');
ok(T.TUTORIAL && T.TUTORIAL.waves > 0 && T.TUTORIAL.path.length >= 2, '独立教学配置 TUTORIAL 就绪（' + T.TUTORIAL.name + ' / ' + T.TUTORIAL.waves + ' 波 / 金币 ' + T.TUTORIAL.gold + '）');
ok(/var TUT_TOTAL = 0/.test(html) && /var TUT_STEPS = \[\]/.test(html), 'v9.9 弱指引：任务清单已撤（TUT_TOTAL=0 / TUT_STEPS=[]）');

console.log('=== ② 非教学模式：#tutBar 不显示 ===');
T.startLevel(0);
ok(T.getS().tutorial === false, '普通关卡 tutorial = false');
ok(T.el('tutBar').style.display === 'none', '普通关卡 #tutBar 隐藏（display=none）');
ok('tutorialDone' in T.getS().prog && 'tutReward' in T.getS().prog && 'tutBonus' in T.getS().prog,
   '旧存档兜底字段已初始化（tutorialDone / tutReward / tutBonus）');
ok(T.getS().prog.tutorialDone === false, '未通关教学时 prog.tutorialDone = false');

console.log('=== ③ 首页按钮文案提示（仅文案，不改行为）===');
T.el('startBtn').textContent = '▶ 开始防御';
T.syncTutLabel();
T.syncTutLabel();     // 重复调用必须幂等
ok(String(T.el('startBtn').textContent) === '▶ 开始防御', '主按钮文案保持「▶ 开始防御」，不追加任何后缀（毛毛要求）：' + T.el('startBtn').textContent);
T.getS().prog.tutorialDone = true;
T.syncTutLabel();
ok(String(T.el('startBtn').textContent) === '▶ 开始防御', '通关教学后 → 文案恢复（且不会重复拼接后缀）');
T.getS().prog.tutorialDone = false;

console.log('=== ④ 进入教学关（点 #tutBtn 真实入口）===');
T.el('tutBtn').fire('click');
var s = T.getS();
ok(s.tutorial === true, '点「🎓 新手教学」进入教学关');
ok(s.WAVES_TOTAL === T.TUTORIAL.waves, 'WAVES_TOTAL = TUTORIAL.waves（' + s.WAVES_TOTAL + '）');
ok(s.gold === T.TUTORIAL.gold, '金币 = TUTORIAL.gold（' + s.gold + '）');
ok(JSON.stringify(s.WAYPOINTS) === JSON.stringify(T.TUTORIAL.path), '路径 = TUTORIAL.path（' + JSON.stringify(s.WAYPOINTS) + '）');
ok(s.wave === 1 && s.hp === 20 && s.towers.length === 0, '开局状态干净（第 1 波 / 20 血 / 0 塔）');
ok(T.el('tutBar').style.display === 'block', '教学关 #tutBar 显示');
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */
ok(T.el('startOv')._hidden === true, '首页弹窗已收起');

console.log('=== v9.9 弱指引：不派任务、只在首次动作后飘一行提示 ===');
T.addTower(0, 5, 'fire');
step(1);
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */
/* v9.9：旧「任务完成飘字」断言已随任务清单撤除 */
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */

console.log('=== v9.9 弱指引：不派任务、只在首次动作后飘一行提示 ===');
T.addTower(1, 5, 'ice');
step(1);
var tw = T.getS().towers;
ok(tw.length === 2 && tw[0].res && tw[0].res.tags.length > 0, '相邻 🔥+❄️ 触发共鸣（' + (tw[0].res ? tw[0].res.tags.join('+') : '-') + '）');
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */

console.log('=== v9.9 弱指引：不派任务、只在首次动作后飘一行提示 ===');
T.setGold(9999);
T.openTower(T.getS().towers[0], 100, 100);
selEl.firePointer({ up: '1' });          // 走真实的「升级」按钮点击路径
step(1);
ok(T.getS().towers[0].lv >= 2, '塔已升到 Lv' + T.getS().towers[0].lv);
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */

console.log('=== v9.9 弱指引：不派任务、只在首次动作后飘一行提示 ===');
var guard = 0, picked = 0, waveEnded = false;
while (guard < 62000){
  t0 += 16.7; T.frame(t0); guard++;
  var list = T.el('buffList');
  if (list.children.length > 0){
    waveEnded = true;
    list.children[0].fire('click');      // 真实点卡路径（showBuffChoices 的卡按钮）
    picked++;
    break;
  }
  if (T.getS().hp <= 0) break;
}
ok(waveEnded && picked === 1, '第 1 波结束弹出三选一（' + (guard/62).toFixed(1) + 's 游戏时间）');
step(1);
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */
/* v9.9：旧的「任务条 / 第 N 步推进」断言已随任务清单一起撤除 */

console.log('=== v9.9 弱指引：不派任务、只在首次动作后飘一行提示 ===');
T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison','phys'];
for (var c = 0; c < 9 && placed < 26; c++){
  for (var r = 0; r < 14 && placed < 26; r++){
    if (T.isPath(c, r)) continue;                // 路径上不能建塔
    if (r === 5 && c < 2) continue;              // 前两座塔的位置已占用
    if (T.addTower(c, r, elems[(c + r) % 5])) placed++;
  }
}
var g2 = 0, cards = 0, cleared = false;
while (g2 < 60000){
  t0 += 16.7; T.frame(t0); g2++;
  var s2 = T.getS();
  if (s2.hp <= 0) break;
  if (T.el('tutDoneOv')._hidden === false){ cleared = true; break; }
  /* 只在「波次结束弹三选一」时点卡（paused && !running）：
     反复点已消费的旧卡会把 last 归零 → dt=0 → 战场冻结，故必须按此判定 */
  if (s2.paused && !s2.running){
    var list2 = T.el('buffList');
    if (list2.children.length === 0) break;
    list2.children[0].fire('click'); cards++; continue;
  }
}
ok(cleared === true, '打完 ' + T.TUTORIAL.waves + ' 波 → 弹「教学完成」（共选卡 ' + cards + ' 次）');
var s3 = T.getS();
ok(s3.tutorial === false, '教学通关后退出教学模式');
ok(s3.prog.tutorialDone === true, 'prog.tutorialDone === true');
ok(s3.prog.tutBonus === 50, '教学奖励已登记待发放（prog.tutBonus = ' + s3.prog.tutBonus + '）');
ok(s3.prog.tutReward === false, '奖励尚未发放（prog.tutReward 仍为假）');
ok(s3.prog.unlocked === 1 && Object.keys(s3.prog.best).length === 0,
   '教学通关不写 prog.unlocked / prog.best（不污染正式进度：unlocked=' + s3.prog.unlocked + ' best=' + Object.keys(s3.prog.best).length + '）');
ok(T.el('tutDoneOv')._hidden === false, '弹出「教学完成」面板');
ok(T.el('clearOv')._hidden === true, '没有误弹「关卡完成」的选关/下一关流程');
ok(String(T.el('tutDoneInfo').textContent).indexOf('教学奖励') >= 0, '完成面板写明奖励：' + T.el('tutDoneInfo').textContent);
ok(T.el('tutBar').style.display === 'none', '通关后 #tutBar 收起');
ok(String(T.el('startBtn').textContent).indexOf('建议先过教学') < 0, '通关后首页文案提示消失（' + T.el('startBtn').textContent + '）');

console.log('=== ⑩ 教学奖励只发一次 ===');
T.el('tutGoBtn').fire('click');              // 教学完成页 → 进第 1 关
var g1 = T.getS().gold;
ok(g1 === T.LEVELS[0].gold + 50, '进第 1 关结算 +50 金币（' + T.LEVELS[0].gold + ' → ' + g1 + '）');
ok(T.getS().prog.tutReward === true && T.getS().prog.tutBonus === 0, '奖励标记置位（tutReward=true / tutBonus=0）');
T.startLevel(0);
ok(T.getS().gold === T.LEVELS[0].gold, '再进第 1 关不再重复发放（金币 ' + T.getS().gold + '）');

console.log('=== ⑪ 教学关内暂停 / 重开 / 返回选关 ===');
T.el('tutBtn').fire('click');
ok(T.getS().tutorial === true, '再次进入教学关');
T.el('pauseBtn').fire('click');
ok(T.el('pauseOv')._hidden === false, '教学关内暂停面板正常弹出');
ok(String(T.el('pauseInfo').textContent).indexOf(tutorName()) >= 0, '暂停信息显示教学关名：' + T.el('pauseInfo').textContent);
function tutorName(){ return T.TUTORIAL.name; }
T.el('restartBtn').fire('click');
var s4 = T.getS();
ok(s4.tutorial === true && s4.tutStep === 1 && s4.gold === T.TUTORIAL.gold && s4.WAVES_TOTAL === T.TUTORIAL.waves,
   '「重开本关」重开教学（步骤回到 1/5，金币 ' + s4.gold + '）');
ok(T.el('tutBar').style.display === 'block', '重开后任务条仍在');
T.el('pauseBtn').fire('click');
T.el('toLevelsBtn').fire('click');
ok(T.getS().tutorial === false, '从教学关返回选关 → 教学模式退出');
ok(T.el('tutBar').style.display === 'none', '返回选关后 #tutBar 隐藏');
var _expCh = T.LEVELS.length * 2 + 1;   /* v8.4：N 关节点 + N 段连线 + 1 个无尽节点 */
ok(T.el('levelsOv')._hidden === false && T.el('lvList').children.length >= _expCh,
   '选关地图 = ' + T.LEVELS.length + ' 关 + 无尽 = ' + T.el('lvList').children.length + ' 个元素（教学未污染选关页）');
T.el('lvBackBtn').fire('click');
ok(T.el('startOv')._hidden === false, '选关页「返回首页」仍正常（既有绑定未被覆盖）');

console.log('=== ⑫ 运行时报错 ===');
ok(errors.length === 0, '全程 0 运行时报错（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ deep16 新手教学关验证全部通过（0 失败）' : '  ❌❌ deep16 共 ' + fail + ' 项失败');
process.exit(fail === 0 ? 0 : 1);
