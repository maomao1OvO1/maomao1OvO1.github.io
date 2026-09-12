// v5.0 合并后综合验证：五路补丁同时生效、互不干扰
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, openBuild: openBuild,\n' +
  '  openTower: openTower, spawnEnemy: spawnEnemy, hideSel: hideSel, showBuffChoices: showBuffChoices,\n' +
  '  setGold: function(v){ gold = v; },\n' +
  '  statAt: statAt, ELEMS: ELEMS, waveComp: waveComp,\n' +
  '  speed: function(){ return typeof speedMul !== "undefined" ? speedMul : null; },\n' +
  '  lowfx: function(){ return typeof LOWFX !== "undefined" ? LOWFX : null; },\n' +
  '  sfxon: function(){ return typeof SFX_ON !== "undefined" ? SFX_ON : null; },\n' +
  '  pv: function(){ return typeof pvOn !== "undefined" ? { on: pvOn, elem: pvElem } : null; },\n' +
  '  time: function(){ return gameT; },\n' +
  '  endless: function(){ return typeof endless !== "undefined" ? endless : null; },\n' +
  '  stars: function(h){ return typeof starsForHp === "function" ? starsForHp(h) : null; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, kills: kills, WAVES_TOTAL: WAVES_TOTAL, BUFFS: BUFFS, prog: prog, lvIndex: lvIndex }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);
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
var LS = { 'td_settings': JSON.stringify({ sfx:false, fx:true }) };   // 预置设置：静音 + 低画质
global.localStorage = { getItem:function(k){ return (k in LS) ? LS[k] : null; },
  setItem:function(k,v){ LS[k]=String(v); }, removeItem:function(k){ delete LS[k]; } };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 5e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }

console.log('=== ① 五路补丁均已并入（HTML 结构 + 接口）===');
[['speedBtn','2 倍速按钮'],['waveInfo','下一波预告栏'],['skipBuffBtn','跳过强化按钮'],
 ['setBtn1','首页设置按钮'],['setBtn2','暂停页设置按钮'],['setOv','设置面板'],
 ['refundBtn','悔棋按钮'],['clearStars','三星显示']].forEach(function(p){
  ok(html.indexOf('id="' + p[0] + '"') >= 0, p[1] + '（#' + p[0] + '）已加入');
});
ok(html.indexOf("id = 'endlessBtn'") >= 0 || html.indexOf('endlessBtn') >= 0, '无尽模式入口（#endlessBtn，showLevels 动态创建）已加入');
ok(html.indexOf('function glow(') >= 0 && html.indexOf('function setLowFX(') >= 0, '低画质接口 glow/setLowFX 已提供');
ok(html.indexOf('电磁炮') >= 0 && html.indexOf('增幅场') >= 0, '新共鸣组合（电磁炮/增幅场…）已加入');
ok(html.indexOf('updateBossSkills') >= 0, 'BOSS 技能模块已加入');
ok(html.indexOf('flushPendingSpawn') >= 0, '召唤物安全点入队已加入');

console.log('=== ② 设置启动应用（静音 + 低画质）===');
ok(T.sfxon() === false, '启动读到 td_settings.sfx=false → 音效已静音（SFX_ON=' + T.sfxon() + '）');
ok(T.lowfx() === true, '启动读到 td_settings.fx=true → 低画质已生效（LOWFX=' + T.lowfx() + '）');

console.log('=== ③ 2 倍速与战场冻结共存 ===');
T.startLevel(0); T.setGold(9999);
var t0 = T.time(); step(60); var gain1 = T.time() - t0;
T.el('speedBtn').fire('click');
ok(T.speed() === 2, '点击后 speedMul = ' + T.speed());
step(1);   // 切换后首帧不计
var t1 = T.time(); step(60); var gain2 = T.time() - t1;
ok(gain2 > gain1 * 1.7, '2 倍速下战场时间确实加速（1x=' + gain1.toFixed(3) + 's → 2x=' + gain2.toFixed(3) + 's）');
T.spawnEnemy('normal'); var e0 = T.getS().enemies[0]; step(5);
var ex = e0.x, ey = e0.y;
T.openBuild(2, 2, 100, 100);
step(120);
ok(e0.x === ex && e0.y === ey, '2 倍速下打开面板依然完全冻结（敌人不动）');
ok(T.pv() && T.pv().on === true && T.pv().elem === 'fire', '建塔时射程圈预览已激活（' + JSON.stringify(T.pv()) + '）');
T.hideSel(); step(5);
ok(T.pv() && T.pv().on === false, '关闭面板后射程圈消失');
ok(e0.x !== ex || e0.y !== ey, '关闭面板后敌人恢复移动');
T.el('speedBtn').fire('click');
ok(T.speed() === 1, '再点一次回到 1x');

console.log('=== ④ 悔棋（5 秒内全额退款）===');
T.startLevel(0); T.setGold(500);
T.addTower(2, 2, 'fire');
var g0 = T.getS().gold;
T.openTower(T.getS().towers[0], 100, 100);
ok(T.el('sel').innerHTML.indexOf('全额退款') >= 0, '新建的塔面板出现「全额退款」按钮');
var selEl = T.el('sel');
selEl.firePointer = function(btn){
  var h = selEl._handlers['click'];
  if (!h) throw new Error('sel 未绑定 pointerdown');
  h({ stopPropagation:function(){}, target:{ closest:function(){ return { dataset: btn }; } } });
};
selEl.firePointer({ refund: '1' });
ok(T.getS().gold === g0 + T.ELEMS.fire.cost, '全额退款到账（' + g0 + ' → ' + T.getS().gold + '）');
ok(T.getS().towers.length === 0, '塔已拆除');

console.log('=== ⑤ 无尽模式 + 三星 ===');
ok(T.endless() === false, '普通关卡 endless = false');
ok(T.stars(20) === 3 && T.stars(15) === 2 && T.stars(5) === 1, '三星判定：满血 3 星 / 中血 2 星 / 残血 1 星');
T.startLevel(0);
T.getS().prog.unlocked = 3; T.getS().prog.best[0] = 10;
ok(html.indexOf('startEndless') >= 0, '无尽模式入口逻辑已接入');

console.log('=== ⑥ BOSS 技能字段就绪 ===');
T.startLevel(0); T.setGold(9999);
T.spawnEnemy('boss');
var boss = T.getS().enemies[T.getS().enemies.length - 1];
var keys = Object.keys(boss).join(',');
ok(/skill/i.test(keys) || /enraged/i.test(keys), 'BOSS 带技能计时字段（' + keys.split(',').filter(function(k){ return /skill|enrage/i.test(k); }).join(',') + '）');
step(600);
ok(errors.length === 0, 'BOSS 技能运行 10 秒无报错（' + errors.length + '）');

console.log('=== ⑦ 下一波预告 ===');
T.startLevel(0);
var wi = T.el('waveInfo').textContent;
ok(wi.length > 0, '预告文本：' + wi);

console.log('=== ⑧ 强化三选一 + 跳过按钮 ===');
T.startLevel(0); T.setGold(9999);
T.startLevel(0); T.setGold(9999);
T.showBuffChoices();
var cardsLen = T.el('buffList').children.length;
/* v8.1：末尾多了「进波间商店」按钮；仍然验证跳过按钮没混进来 */
var toolRowEl = T.el('buffList').children[3];
ok(cardsLen === 4 && toolRowEl.children && toolRowEl.children.length === 3,
   '强化卡片 3 张 + 底部工具行（换一批/禁卡/商店；跳过按钮未混入，children=' + cardsLen + '）');
var gBeforeSkip = T.getS().gold;
T.el('skipBuffBtn').fire('click');
ok(T.getS().gold === gBeforeSkip + 150, '跳过强化 +150 金币（' + gBeforeSkip + ' → ' + T.getS().gold + '）');
ok(T.el('buffOv')._hidden === true, '跳过后面板关闭');

console.log('=== ⑨ 综合稳定性：跑 5 波（含 BOSS 技能 + 2 倍速）===');
T.startLevel(0); T.setGold(99999);
T.el('speedBtn').fire('click');
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 9 && placed < 20; c++)
  for (var r = 0; r < 14 && placed < 20; r++)
    if (T.addTower(c, r, elems[(c + r) % 6])) placed++;
var guard = 0, cardHit = 0;
while (guard < 20000 && cardHit < 4){
  guard++;
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){
    var b = T.el('buffList').children[0];
    if (b) b.fire('click');
    cardHit++;
  }
}
var s = T.getS();
console.log('  建塔 ' + placed + ' · 波次 ' + s.wave + ' · 血 ' + s.hp + ' · 击杀 ' + s.kills + ' · 选卡 ' + cardHit);
ok(cardHit >= 3, '波次推进与选卡正常（' + cardHit + ' 次）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v5.0 合并综合验证全部通过（0 失败）' : '  ❌ v5.0 合并综合验证 ' + fail + ' 项失败');
