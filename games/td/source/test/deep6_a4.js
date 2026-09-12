// deep6_a4.js —— v4.1 补丁专项：① 无尽模式（不结算/记录最高波次）② 三星评价
// 用法: node test/deep6_a4.js <被测html>
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  showLevels: showLevels, levelClear: levelClear, gameOver: gameOver, starsForHp: starsForHp,\n' +
  '  starStr: starStr, endlessUnlocked: endlessUnlocked, saveEndlessBest: saveEndlessBest,\n' +
  '  setWave: function(v){ wave = v; }, setHp: function(v){ hp = v; },\n' +
  '  forceWaveDone: function(){ enemies = []; spawnQueue = []; curGroup = null; waveActive = true; running = true; paused = false; menuPause = false; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, endless: endless, lvIndex: lvIndex,\n' +
  '    running: running, paused: paused, kills: kills, WAVES_TOTAL: WAVES_TOTAL, prog: prog, enemies: enemies }; },\n' +
  '  setGold: function(v){ gold = v; }, LEVELS: LEVELS, el: function(id){ return document.getElementById(id); } };\n' + marker);
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
var LS = {};
if (process.env.TD_OLD_SAVE) LS['td_prog'] = JSON.stringify({ unlocked: 3, best: { '0': 10 } });   // 模拟旧版存档（无 stars 字段）
global.localStorage = { getItem:function(k){ return (k in LS) ? LS[k] : null; },
  setItem:function(k,v){ LS[k] = String(v); }, removeItem:function(k){ delete LS[k]; } };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); console.log('!!! 未捕获异常: ' + e.message + ' @ ' + (e.stack||'').split('\n')[1]); });
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }

console.log('=== ⓪ 旧存档兼容：td_prog 里没有 stars 字段 ===');
if (process.env.TD_OLD_SAVE){
  var pg = T.getS().prog;
  ok(typeof pg.stars === 'object' && pg.stars !== null, '读档后 prog.stars 兜底初始化为 {}（未崩溃）');
  ok(pg.unlocked === 3 && pg.best['0'] === 10, '旧存档 unlocked/best 原样保留');
  T.showLevels();
  var w0 = T.el('lvList');
  var n0c = w0.children.filter(function(c){ return c.children && c.children.length >= 4; }).length;
  ok(n0c === T.LEVELS.length + 2, '旧存档下选关地图正常渲染（' + n0c + ' 个节点 = ' + T.LEVELS.length + ' 关 + 无尽 + 每日挑战）');
  ok(String(w0.children[0].textContent).indexOf('☆') < 0, '无星数记录的关卡按钮不显示星星：' + w0.children[0].textContent);
} else {
  ok(true, '（本轮未以旧存档启动；旧存档路径见 TD_OLD_SAVE=1 那一轮）');
}
var CLK = 2e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 50; T.frame(CLK); } }   // 50ms/帧：dt 取上限 0.05，便于快进 waveBreak

console.log('=== ① 三星评价：按剩余血量判定（MAXHP=20） ===');
ok(T.starsForHp(20) === 3 && T.starsForHp(18) === 3, '血量 20/18 → 3 星');
ok(T.starsForHp(17) === 2 && T.starsForHp(12) === 2, '血量 17/12 → 2 星');
ok(T.starsForHp(11) === 1 && T.starsForHp(1) === 1, '血量 11/1 → 1 星');
ok(T.starStr(3) === '★★★' && T.starStr(2) === '★★☆' && T.starStr(1) === '★☆☆', 'starStr 渲染 ★★★ / ★★☆ / ★☆☆');

T.startLevel(0); T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison'];
for (var c = 0; c < 9 && placed < 20; c++)
  for (var r = 0; r < 14 && placed < 20; r++)
    if (T.addTower(c, r, elems[(c+r)%4])) placed++;
// 满血通关 → 3 星
T.setHp(18); T.setWave(T.getS().WAVES_TOTAL); T.levelClear();
ok(T.getS().prog.stars[0] === 3, '满血通关写入 prog.stars[0] = ' + T.getS().prog.stars[0]);
ok(T.el('clearStars').textContent === '★★★', '#clearOv 显示 ★★★（大号金色元素 clearStars）');
ok(T.el('clearInfo').textContent.indexOf('通关') >= 0, '#clearInfo 原有文本保留（' + T.el('clearInfo').textContent + '）');
// 再次通关但血量低 → 历史最好值不被覆盖
T.setHp(11); T.levelClear();
ok(T.getS().prog.stars[0] === 3, '低血量重打不覆盖历史最好星数（仍为 ' + T.getS().prog.stars[0] + '）');
ok(T.el('clearStars').textContent === '★☆☆', '本次星数仍按本次血量显示 ★☆☆');
ok(String(T.el('clearNewRec').textContent).indexOf('历史最好 3') >= 0, '非新纪录时提示历史最好（' + T.el('clearNewRec').textContent + '）');
// 2 星区间 + 新关卡
T.startLevel(1); T.setHp(14); T.levelClear();
ok(T.getS().prog.stars[1] === 2, '第 2 关血量 14 → 2 星');
T.startLevel(2); T.setHp(3); T.levelClear();
ok(T.getS().prog.stars[2] === 1, '第 3 关血量 3 → 1 星');
ok(LS['td_prog'] && JSON.parse(LS['td_prog']).stars && JSON.parse(LS['td_prog']).stars['0'] === 3, '星数已写入 td_prog 存档');

console.log('=== ② 无尽模式：解锁条件 + 入口 ===');
T.startLevel(0);
ok(T.endlessUnlocked() === true, '通关过第 1 关后 endlessUnlocked() = true');
T.showLevels();
var wrap = T.el('lvList');
var nodeCount = wrap.children.filter(function(c){ return c.children && c.children.length >= 4; }).length;
ok(nodeCount === T.LEVELS.length + 2, '选关地图 = ' + T.LEVELS.length + ' 个关卡 + 无尽 + 每日挑战（共 ' + nodeCount + ' 个节点）');
var ebtn = null;                       /* v8.4：无尽节点是动态创建的，按 id 遍历找 */
wrap.children.forEach(function(c){ if (c.children && c.children.length) c.children.forEach(function(g){ if (g && g.id === 'endlessBtn') ebtn = g; }); });
ok(!!ebtn && String(ebtn.textContent) === '♾', '无尽节点图标：' + (ebtn ? ebtn.textContent : '未找到'));
ok(String(ebtn.style.cssText).indexOf('255,200,90') >= 0, '解锁后为金色高亮样式（暗色科幻风）');
var eNode = null;
wrap.children.forEach(function(c){ if (c.children && c.children.indexOf(ebtn) >= 0) eNode = c; });
ok(!!eNode && /无尽模式/.test(String(eNode.children[2].textContent)), '无尽节点名称：' + (eNode ? eNode.children[2].textContent : '未找到'));
ok(!!ebtn, '无尽节点按钮已找到');
if (ebtn) ebtn.fire('click');
var s = T.getS();
ok(s.endless === true && s.WAVES_TOTAL === 999, '进入无尽：endless=true, WAVES_TOTAL=' + s.WAVES_TOTAL);
ok(s.lvIndex === 0 && s.wave === 1, '无尽使用第 1 关地图，从第 1 波开始');
ok(T.el('lvName').textContent === '♾ 无尽', '顶栏地图名显示 ♾ 无尽');

console.log('=== ③ 无尽模式：波次无上限，永不弹「关卡完成」 ===');
T.setGold(99999);
placed = 0;
for (var c2 = 0; c2 < 9 && placed < 24; c2++)
  for (var r2 = 0; r2 < 14 && placed < 24; r2++)
    if (T.addTower(c2, r2, elems[(c2+r2)%4])) placed++;
// 逼近 WAVES_TOTAL 的上一波：应继续（弹强化卡）而不是结算
T.setWave(998); T.forceWaveDone(); step(1);
ok(T.el('clearOv')._hidden === true, '第 998 波结束不弹「关卡完成」');
ok(T.el('buffOv')._hidden === false, '第 998 波结束照常弹强化卡');
T.el('buffList').children[0].fire('click');
step(60);                                  // 等 waveBreak 走完 → wave 自增
ok(T.getS().wave === 999, '波次推进到 ' + T.getS().wave);
// 正好 WAVES_TOTAL 波：无尽模式必须继续
T.setWave(999); T.forceWaveDone(); step(1);
ok(T.el('clearOv')._hidden === true, '第 999 波（= WAVES_TOTAL）结束仍不弹「关卡完成」');
ok(T.el('buffOv')._hidden === false, '第 999 波结束继续弹强化卡（无尽未结束）');
T.el('buffList').children[0].fire('click');
step(60);
ok(T.getS().wave === 1000, '波次突破 999 继续攀升（wave=' + T.getS().wave + '）');
ok(T.el('clearOv')._hidden === true, '第 1000 波依然不结算');

console.log('=== ④ 无尽阵亡：td_endless_best 取最大值 + 结算显示 ===');
T.gameOver();
ok(LS['td_endless_best'] === '1000', 'gameOver 写入 td_endless_best = ' + LS['td_endless_best']);
ok(T.el('ovEndless').style.display === 'block', '结算面板显示「无尽最高波次」行');
ok(String(T.el('ovEndless').textContent).indexOf('无尽最高波次 1000') >= 0, '文案：' + T.el('ovEndless').textContent);
// 第二局死得更早 → 不被覆盖
T.startEndless();
ok(T.getS().endless === true && T.getS().WAVES_TOTAL === 999, '重开无尽仍为无尽模式');
T.setWave(5); T.gameOver();
ok(LS['td_endless_best'] === '1000', '较低波次不覆盖 td_endless_best（仍为 ' + LS['td_endless_best'] + '）');
ok(String(T.el('ovEndless').textContent).indexOf('1000') >= 0, '结算仍显示历史最高 1000');

console.log('=== ⑤ 普通关卡完全不受影响 ===');
T.startLevel(0);
ok(T.getS().endless === false && T.getS().WAVES_TOTAL === 10, 'startLevel(0) 回到普通模式：WAVES_TOTAL=' + T.getS().WAVES_TOTAL);
T.setGold(99999); placed = 0;
for (var c3 = 0; c3 < 9 && placed < 24; c3++)
  for (var r3 = 0; r3 < 14 && placed < 24; r3++)
    if (T.addTower(c3, r3, elems[(c3+r3)%4])) placed++;
T.setWave(10); T.forceWaveDone(); step(1);
ok(T.el('clearOv')._hidden === false, '普通关卡第 10 波结束照旧弹「关卡完成」');
ok(T.getS().prog.unlocked >= 2, 'ordinary 解锁逻辑不变（unlocked=' + T.getS().prog.unlocked + '）');
T.gameOver();
ok(T.el('ovEndless').style.display === 'none', '普通关卡阵亡不显示无尽波次行');
// 未通关时无尽按钮置灰（prog.best[0] 存在则视为已通关，这里只验证渲染分支）
T.showLevels();
var nk = T.el('lvList').children.filter(function(c){ return c.children && c.children.length >= 4; }).length;
ok(nk === T.LEVELS.length + 2, '选关地图节点仍在（' + nk + ' 个节点）');
// 暂停/重开按钮在无尽下正常
T.startEndless();
T.el('pauseInfo').textContent = '';
var ps = T.getS();
ok(ps.endless === true && ps.WAVES_TOTAL === 999, '无尽模式暂停态字段正常');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v4.1 无尽模式 + 三星评价专项全部通过（0 失败）' : '  ❌ v4.1 专项 ' + fail + ' 项失败');
