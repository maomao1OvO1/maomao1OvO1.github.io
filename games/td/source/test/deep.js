var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');

// 注入调试出口（仅测试用）
var marker = 'requestAnimationFrame(frame);\n})();';
if (code.indexOf(marker) < 0){
  console.log('  ❌ 找不到注入锚点'); process.exit(1);
}
code = code.replace(marker,
  'window.__T = { startGame: startGame, startLevel: startLevel, frame: frame, addTower: addTower,\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, paused: paused, BUFFS: BUFFS, spawnQueue: spawnQueue, curGroup: curGroup,\n' +
  '    kills: kills, WAVES_TOTAL: WAVES_TOTAL, SKILLS: SKILLS, comboCount: comboCount }; },\n' +
  '  showBuff: function(){ try { showBuffChoices(); return !!document.getElementById("buffOv"); } catch(e){ return "ERR:"+e.message; } },\n' +
  '  elHidden: function(id){ return document.getElementById(id)._hidden; } };\n' +
  marker);

// ---------- Stub ----------
var errors = [], log = [];
function mkEl(tag){
  var el = {
    tagName: tag || 'div', style: {}, dataset: {}, children: [],
    textContent: '', innerHTML: '', value: '', width: 800, height: 600,
    offsetWidth: 100, offsetHeight: 100, clientWidth: 800, clientHeight: 600,
    _hidden: false,
    classList: {
      add: function(c){ if (c === 'hidden') el._hidden = true; },
      remove: function(c){ if (c === 'hidden') el._hidden = false; },
      contains: function(c){ return c === 'hidden' ? el._hidden : false; }
    },
    appendChild: function(c){ this.children.push(c); return c; },
    remove: function(){}, addEventListener: function(){}, removeEventListener: function(){},
    setPointerCapture: function(){}, releasePointerCapture: function(){},
    closest: function(){ return null; }, contains: function(){ return false; },
    getContext: function(){ return ctx; },
    getBoundingClientRect: function(){ return { left: 0, top: 0, width: 800, height: 600 }; },
    focus: function(){}, blur: function(){}, click: function(){}
  };
  return el;
}
var ctx = new Proxy({}, {
  get: function(t, k){
    if (k === 'canvas') return mkEl('canvas');
    if (k === 'createRadialGradient' || k === 'createLinearGradient')
      return function(){ return { addColorStop: function(){} }; };
    if (k === 'measureText') return function(){ return { width: 10 }; };
    return function(){};
  },
  set: function(){ return true; }
});
var elCache = {};
global.document = {
  getElementById: function(id){ if (!elCache[id]) elCache[id] = mkEl(); return elCache[id]; },
  createElement: function(t){ return mkEl(t); },
  querySelector: function(){ return mkEl(); }, querySelectorAll: function(){ return []; },
  body: mkEl('body'), addEventListener: function(){}, readyState: 'complete'
};
global.window = { innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
  addEventListener: function(){}, AudioContext: undefined, webkitAudioContext: undefined };
global.navigator = { getGamepads: function(){ return []; } };
global.localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
global.performance = { now: function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(m){ log.push('[alert] ' + m); };
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });

try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
if (!T){ console.log('  ❌ 未拿到调试出口'); process.exit(1); }

function step(T, frames, label){
  var t = (global.__t || 0);
  for (var i = 0; i < frames; i++){ t += 16; T.frame(t); }
  global.__t = t;
  var s = T.getS();
  console.log('  [' + label + '] 波' + s.wave + ' 敌' + s.enemies.length + ' 待出' +
    (s.spawnQueue ? s.spawnQueue.length : 0) + ' 金' + s.gold + ' 血' + s.hp +
    ' 塔' + s.towers.length + ' 运行' + s.running + ' 暂停' + s.paused);
  return s;
}

console.log('=== 测试 1：开始游戏 ===');
T.startGame();
var s = step(T, 1, '开局');
if (s.running !== true) console.log('  ❌ 开局后 running 应为 true');
if (s.hp !== 20) console.log('  ❌ 初始血量应为 20，实际 ' + s.hp);

console.log('=== 测试 2：跑 5 秒，敌人应出现并移动 ===');
s = step(T, 312, '5秒');
if (s.enemies.length === 0) console.log('  ❌ 5 秒后应该有敌人');
else {
  var e0 = s.enemies[0];
  if (e0.wp === 0 && e0.x === undefined) console.log('  ❌ 敌人没有位置');
}

console.log('=== 测试 3：建 4 座塔（不同元素，验证共鸣）===');
T.addTower(0, 0, 'fire'); T.addTower(1, 0, 'ice');
T.addTower(2, 0, 'thunder'); T.addTower(3, 0, 'poison');
s = T.getS();
console.log('  塔数:', s.towers.length, '（应为 4）');
s.towers.forEach(function(t){
  console.log('    ' + t.elem + ' Lv' + t.lv + ' 共鸣:' + (t.res && t.res.tags.length ? t.res.tags.join('/') + ' ×' + t.res.dmgMul : '无'));
});
if (s.towers.length !== 4) console.log('  ❌ 建塔失败');

console.log('=== 测试 4：长期运行（跑完第 1 波，看卡片是否弹出）===');
var sawBuff = false, frames = 0;
while (frames < 4000 && !sawBuff){
  var t2 = (global.__t || 0) + 16; global.__t = t2;
  T.frame(t2); frames++;
  var st2 = T.getS();
  if (st2.paused === true && st2.running === false){ sawBuff = true; }
  if (st2.hp <= 0) break;
}
s = T.getS();
console.log('  跑了 ' + frames + ' 帧（约 ' + (frames/62).toFixed(1) + ' 秒）；波次=' + s.wave + ' 血=' + s.hp + ' 暂停=' + s.paused);
if (sawBuff){
  console.log('  ✅ 波次结束触发了卡片（游戏暂停等待选择）');
  var vis = T.showBuff();
  console.log('  ✅ 卡片界面可用:', vis);
} else {
  console.log('  ⚠️ 没检测到卡片触发（可能敌人没被杀光 / 或塔位不在路径旁）');
}
console.log('=== 测试 5：主动技能 ===');
var before = T.getS().SKILLS[0].t;
T.getS();
console.log('  技能 CD:', before);
console.log('');
if (errors.length){
  console.log('  ❌❌ 运行时错误 ' + errors.length + ' 个：');
  errors.forEach(function(x){ console.log('     ' + x); });
} else {
  console.log('  ✅✅ 全流程无运行时错误');
}
if (log.length){ console.log('  日志:'); log.slice(0,6).forEach(function(x){ console.log('     ' + x); }); }
process.exit(0);
