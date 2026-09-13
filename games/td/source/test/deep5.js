// v4.0 专项验证：外观数据/面板数值/提示栏/新塔/难度/局部强化
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, openBuild: openBuild,\n' +
  '  openTower: openTower, waveComp: waveComp, pickBuffs: pickBuffs, spawnEnemy: spawnEnemy,\n' +
  '  statAt: statAt, auraBonus: auraBonus, ELEMS: ELEMS, LEVELS: LEVELS, ENEMIES: ENEMIES,\n' +
  '  showBuffChoices: showBuffChoices, towerStat: towerStat, hideSel: hideSel,\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, kills: kills, WAVES_TOTAL: WAVES_TOTAL, BUFFS: BUFFS, lvIndex: lvIndex }; },\n' +
  '  setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
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
global.localStorage = { getItem:function(){ return null; }, setItem:function(){}, removeItem:function(){} };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }

console.log('=== ① 塔的视觉区分（配色 / 造型数据）===');
var want = { fire:['#ff5a2a','红'], ice:['#7fe4ff','浅蓝'], thunder:['#ffd21a','黄'], poison:['#4fe060','绿'] };
Object.keys(want).forEach(function(k){
  ok(T.ELEMS[k].color === want[k][0], k + ' 用' + want[k][1] + '色 ' + T.ELEMS[k].color);
});
ok(html.indexOf('drawTowerBody') >= 0, '六套专属造型绘制函数已接入');
ok(html.indexOf("elem === 'fire'") >= 0 && html.indexOf("poly(x, y, rad, 4, Math.PI/4)") >= 0, '火塔=方形棱角');
ok(html.indexOf("poly(x, y, rad, 6, -Math.PI/2)") >= 0, '冰塔=六边形');
ok(html.indexOf('rad * 0.26, y - rad * 0.62') >= 0, '雷塔=闪电标志');
ok(html.indexOf('rad * 0.50, 0, 6.3) ; ctx.fill()'.replace(' ;',';')) >= 0 || html.indexOf('y - rad * 0.10, rad * 0.50') >= 0, '毒塔=骷髅头');
ok(html.indexOf('上升毒气泡') >= 0, '毒塔=毒气泡上升特效');

console.log('=== ② 面板数值透明化 ===');
T.startLevel(0);
T.setGold(9999);
T.openBuild(2, 2, 100, 100);
var h = T.el('sel').innerHTML;
ok(h.indexOf('伤害') >= 0 && h.indexOf('攻速') >= 0 && h.indexOf('射程') >= 0, '建塔面板显示 伤害/攻速/射程');
ok(h.indexOf('升级 +30% 伤害 / +12% 攻速 / +8% 射程') >= 0, '面板标明升一级的增量');
ok((h.match(/data-mk=/g) || []).length === Object.keys(T.ELEMS).length && Object.keys(T.ELEMS).length >= 6, '面板列出全部塔（当前 ' + Object.keys(T.ELEMS).length + ' 种）');
ok(h.indexOf('物理') >= 0 && h.indexOf('辅助') >= 0, '物理塔 / 辅助塔已加入面板');
T.addTower(2, 2, 'fire'); T.addTower(2, 3, 'support'); T.addTower(3, 2, 'phys');
var tw = T.getS().towers;
ok(tw.length === 3, '三种塔都能建造');
T.openTower(tw[0], 100, 100);
var h2 = T.el('sel').innerHTML;
ok(h2.indexOf('下一级') >= 0, '塔面板显示「下一级」具体数值');
ok(h2.indexOf('辅助光环生效中') >= 0, '塔面板显示辅助塔光环加成');
T.openTower(tw[1], 100, 100);
ok(T.el('sel').innerHTML.indexOf('光环：相邻塔伤害') >= 0, '辅助塔面板显示自身光环数值');

console.log('=== ③ 策略选项：辅助塔不攻击、只加光环 ===');
T.startLevel(0); T.setGold(9999);
var base = T.statAt({ c:0, r:0, elem:'fire', lv:1, res:null }, 1);
T.addTower(1, 0, 'support');
var withAura = T.statAt({ c:0, r:0, elem:'fire', lv:1, res:null }, 1);
ok(withAura.dmg > base.dmg * 1.2, '辅助塔让相邻塔伤害提升（' + base.dmg.toFixed(1) + ' → ' + withAura.dmg.toFixed(1) + '）');
T.startLevel(0); T.setGold(9999); T.addTower(4, 2, 'support');
T.spawnEnemy('normal');
var e0 = T.getS().enemies[0];
for (var i = 0; i < 240; i++) T.frame(i * 16.7);
ok(e0.hp >= e0.maxhp - 0.001, '辅助塔自身不攻击（敌人未掉血 ' + e0.hp.toFixed(0) + '/' + e0.maxhp.toFixed(0) + '）');

console.log('=== ④ 难度调整 ===');
function cnt(c){ var s = 0; c.forEach(function(g){ s += g.n; }); return s; }
function has(c, t){ return c.some(function(g){ return g.type === t; }); }
ok(cnt(T.waveComp(1)) >= 6, '第 1 波敌人数 = ' + cnt(T.waveComp(1)) + '（原 4）');
ok(cnt(T.waveComp(5)) >= cnt(T.waveComp(1)) * 2, '第 5 波数量明显增长 = ' + cnt(T.waveComp(5)));
ok(has(T.waveComp(2), 'fast'), '第 2 波就出现快速怪（原第 3 波）');
ok(has(T.waveComp(4), 'armor'), '第 4 波出现装甲（原第 5 波）');
ok(T.LEVELS[0].gold === 150, '第 1 关初始金币 150');
ok(typeof T.ELEMS.fire.cost === 'number' && T.ELEMS.fire.cost > 0 && typeof T.ELEMS.thunder.cost === 'number', '建塔费用正常（火 ' + T.ELEMS.fire.cost + ' / 雷 ' + T.ELEMS.thunder.cost + '）');
ok(T.ENEMIES.normal.hp === 72 && T.ENEMIES.fast.speed === 2.00, '怪物血量/速度（步兵 72 / 疾行 2.0）');
ok(html.indexOf('(wave - 1) * 0.27') >= 0 && html.indexOf('lateK') >= 0 && html.indexOf('lvDiff') >= 0, '血量成长 0.27 + 二次项封顶(lateK) + 关卡难度系数');
ok((T.ELEMS.phys.antiArmor || 0) > 0 || (T.ELEMS.phys.pierce || 0) > 0, '物理塔有破甲能力（antiArmor=' + T.ELEMS.phys.antiArmor + ' / pierce=' + T.ELEMS.phys.pierce + '）');

console.log('=== ⑤ 局部强化（元素专精）===');
var allOk = true;
for (var k = 0; k < 30; k++){ if (!T.pickBuffs(3).some(function(b){ return b.elKey; })) allOk = false; }
ok(allOk, '每轮三选一必含一个局部强化（30 次抽样）');
T.startLevel(0); T.setGold(9999);
T.showBuffChoices();
var cards = T.el('buffList').children;
/* v8.1：强化卡界面末尾追加了「进波间商店」入口按钮 → 断言改为 3 张卡 + 商店按钮 */
ok(cards.length === 4 && cards[3].children && cards[3].children.length === 3,
   '强化卡片 3 张 + 底部工具行（换一批/禁卡/商店，children=' + cards.length + '）');
var before = T.getS().BUFFS.el.fire;
cards[0].fire('click');
var s3 = T.getS();
var boosted = Object.keys(s3.BUFFS.el).filter(function(k2){ return s3.BUFFS.el[k2] > 1; });
var twK = Object.keys(s3.BUFFS.tw || {});
ok(boosted.length > 0 || s3.BUFFS.aura > 1 || twK.length > 0,
   '点击局部强化确实生效（' + (twK.length ? 'v7.8 专属强化 → ' + twK.join(',') : '专精 ' + JSON.stringify(s3.BUFFS.el)) + '）');

console.log('=== ⑥ 新手提示栏只在 1-1 显示 ===');
T.startLevel(0); ok(T.el('tip').style.display === 'block', '第 1 关显示提示栏');
T.startLevel(1); ok(T.el('tip').style.display === 'none', '第 2 关隐藏提示栏');
T.startLevel(4); ok(T.el('tip').style.display === 'none', '第 5 关隐藏提示栏');
T.startLevel(0); ok(T.el('tip').style.display === 'block', '重玩 1-1 提示栏再次出现');
ok(html.indexOf('点空位建塔') >= 0 && html.indexOf('相邻不同元素会共鸣') >= 0, '提示栏文字仍在（v9.6 改为「点路径旁的障碍清理成塔位 · 点空位建塔」）');

console.log('=== ⑦ 稳定性：连跑 4 波无报错 ===');
T.startLevel(0); T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison','phys','support'];
for (var c2 = 0; c2 < 9 && placed < 24; c2++)
  for (var r2 = 0; r2 < 14 && placed < 24; r2++)
    if (T.addTower(c2, r2, elems[(c2 + r2) % 6])) placed++;
var guard = 0, cards2 = 0;
while (guard < 12000 && cards2 < 4){
  guard++;
  T.frame(guard * 16.7);
  if (T.el('buffOv')._hidden === false){
    var b = T.el('buffList').children[0];
    if (b) b.fire('click');
    cards2++;
  }
}
var s4 = T.getS();
console.log('  建塔 ' + placed + ' · 波次 ' + s4.wave + ' · 选卡 ' + cards2 + ' 次 · 血 ' + s4.hp);
ok(cards2 >= 3, '波次结束正常弹强化卡（' + cards2 + ' 次）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('=== ⑧ 打开面板时战场冻结（怪不动）===');
var CLK = 1e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }
T.startLevel(0); T.setGold(9999);
T.spawnEnemy('normal');
var eM = T.getS().enemies[0];
step(30);
var mx0 = eM.x, my0 = eM.y;
T.openBuild(2, 2, 100, 100);
ok(T.el('sel').innerHTML.indexOf('已暂停') >= 0, '建塔面板显示「已暂停」标识');
step(300);
ok(eM.x === mx0 && eM.y === my0, '建塔面板打开期间敌人坐标纹丝不动');
T.hideSel();
step(30);
ok(eM.x !== mx0 || eM.y !== my0, '关掉面板后敌人恢复移动');
T.addTower(3, 3, 'fire');
T.openTower(T.getS().towers[0], 100, 100);
var tx0 = eM.x, ty0 = eM.y;
step(300);
ok(eM.x === tx0 && eM.y === ty0, '点塔（升级面板）打开期间敌人也不动');
T.hideSel();
step(30);
ok(eM.x !== tx0 || eM.y !== ty0, '关闭升级面板后恢复移动');
// 波次不会在面板打开时偷偷推进
var wBefore = T.getS().wave;
T.openBuild(4, 4, 100, 100); step(600); T.hideSel();
ok(T.getS().wave === wBefore, '面板打开期间波次不推进');

console.log('');
console.log(fail === 0 ? '  ✅✅ v4.0 专项验证全部通过（0 失败）' : '  ❌ v4.0 专项验证 ' + fail + ' 项失败');
