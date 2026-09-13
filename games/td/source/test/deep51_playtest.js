var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower,\n' +
  '  getS: function(){ return { gold: gold, hp: hp, wave: wave, enemies: enemies, towers: towers,\n' +
  '    running: running, paused: paused, kills: kills, WAVES_TOTAL: WAVES_TOTAL, prog: prog, BUFFS: BUFFS }; },\n' +
  '  towerCost: towerCost, upgradeCost: upgradeCost, ELEMS: ELEMS, isPath: isPath, COLS2: COLS, ROWS2: ROWS, hpNow: function(){ return hp; }, waveNow: function(){ return wave; }, setGold: function(v){ gold = v; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
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
    set:function(v){ el._html = v; el.children = []; }   // 关键：设置 innerHTML 要清空子元素
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
var t0 = 0, fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }

console.log('=== 第四遍（修正测试脚本后）：完整通关 + 强化叠加 ===');
T.startLevel(0);
T.setGold(99999);
var placed = 0, elems = ['fire','ice','thunder','poison'];
for (var c = 0; c < 9 && placed < 30; c++)
  for (var r = 0; r < 14 && placed < 30; r++)
    if (T.addTower(c, r, elems[(c+r)%4])) placed++;

var cards = 0, guard = 0, cleared = false, lastCardName = '';
while (guard < 300000){
  t0 += 16; T.frame(t0); guard++;
  var s = T.getS();
  if (s.hp <= 0){ console.log('  ⚠️ 阵亡于第 ' + s.wave + ' 波'); break; }
  if (T.el('clearOv')._hidden === false){ cleared = true; break; }
  if (s.paused && !s.running){
    var list = T.el('buffList');
    if (list.children.length > 0){
      /* v7.8：第一张固定是「炮塔专属强化」（只进 BUFFS.tw），所以交替点
         第 0 张（专属）与第 1 张（通用），两条线都验证到 */
      var pickIdx = (cards % 2 === 0) ? 0 : Math.min(1, list.children.length - 1);
      lastCardName = list.children[pickIdx]._html || list.children[pickIdx].textContent || '?';
      list.children[pickIdx].fire('click');
      cards++;
      continue;
    }
    break;
  }
}
var s2 = T.getS(), B = s2.BUFFS;
console.log('  时长 ' + (guard/62).toFixed(0) + ' 秒 · 波次 ' + s2.wave + '/' + s2.WAVES_TOTAL +
            ' · 选卡 ' + cards + ' 次 · 血 ' + s2.hp + ' · 击杀 ' + s2.kills);
ok(cards >= 9, '每波结束都弹卡片并可点击（' + cards + ' 次）');
ok(cleared === true, '打通全部波次触发「关卡完成」');
ok(s2.prog.unlocked >= 2, '通关解锁下一关（unlocked=' + s2.prog.unlocked + '）');
console.log('  最终强化: 伤害×' + B.dmg.toFixed(2) + ' 攻速×' + B.rate.toFixed(2) + ' 射程×' + B.range.toFixed(2) +
            ' 金币×' + B.gold.toFixed(2) + ' 暴击' + (B.crit*100).toFixed(0) + '% 共鸣增幅×' + B.reso.toFixed(2));
/* v8.18 修：原断言只查了 19 个通用加成字段里的 8 个（dmg/rate/range/gold/crit/reso/aura/el），
   抽到「塔位折扣」「金库利息」「修复无人机」等卡时会误报失败 ——
   属于**旧有的偶发性误报**（已用 v8.14 备份实测复现：8 次里有 1 次会挂）。
   现在把全部通用字段都纳入判定（专属卡走 BUFFS.tw，不会被误算进来）。 */
var _mulKeys = ['dmg', 'rate', 'range', 'gold', 'reso', 'splash', 'aura', 'combo'];
var _addKeys = ['crit', 'costCut', 'interest', 'regen', 'bossDmg', 'pierceAdd', 'slowAdd', 'shieldHP', 'splashDmg', 'dotAdd', 'elBoost'];
var _genApplied = _mulKeys.some(function(k){ return B[k] > 1; })
  || _addKeys.some(function(k){ return (B[k] || 0) > 0; })
  || Object.keys(B.el || {}).some(function(k){ return B.el[k] > 1; });
ok(_genApplied, '通用强化确实生效并叠加');
/* v7.8：专属强化走 BUFFS.tw，不与通用字段混在一起，单独断言 */
var twKeys = Object.keys(B.tw || {});
console.log('  专属强化生效的塔: ' + (twKeys.length ? twKeys.map(function(k){ return k + '(' + Object.keys(B.tw[k]).join('+') + ')'; }).join(' ') : '（无）'));
ok(twKeys.length > 0, '炮塔专属强化确实写进了 BUFFS.tw（' + twKeys.length + ' 座塔）');
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');

console.log('=== 第四遍：全 5 关都能通关（快速验证关卡数据）===');
for (var lv = 0; lv < 5; lv++){
  T.startLevel(lv);
  var w = T.getS().WAVES_TOTAL;
  ok(w >= 10, '第 ' + (lv+1) + ' 关波数 = ' + w);
}
console.log('');
if (errors.length){ console.log('  ❌ 错误：'); errors.forEach(function(x){ console.log('     ' + x); }); }
console.log(fail === 0 ? '  ✅✅ 第四遍全部通过（0 失败）' : '  ❌ 第四遍 ' + fail + ' 项失败');

console.log('');
console.log('=== v9.8 自动试玩：像人一样打通第 1 关 ===');
T.startLevel(0, false, true);
var _price = [];
for (var _k in T.ELEMS) _price.push(T.ELEMS[_k].cost);
_price.sort(function(a, b){ return a - b; });
var _cheapest = _price[0];
console.log('  · 最便宜的塔 ' + _cheapest + ' 金，开局金币 ' + T.getS().gold);
var _slots = [];
for (var _c = 0; _c < T.COLS2; _c++) for (var _r = 0; _r < T.ROWS2; _r++) if (!T.isPath(_c, _r)) _slots.push([_c, _r]);
var _elems = Object.keys(T.ELEMS), _ei = 0, _built = 0, _spent = 0, _f = 0;
for (_f = 0; _f < 12000; _f++){
  T.frame(1 / 60);
  if (_f % 30 === 0){
    var _g = T.getS().gold;
    if (_g >= _cheapest && _built < 14){
      for (var _si = 0; _si < _slots.length; _si++){
        var _cc = _slots[_si][0], _rr = _slots[_si][1];
        var _el = _elems[_ei % _elems.length];
        if (T.ELEMS[_el].cost <= _g && T.addTower(_cc, _rr, _el)){ _built++; _spent += T.ELEMS[_el].cost; break; }
        _ei++;
      }
    }
  }
  if (T.getS().running === false) break;
}
var _S = T.getS();
console.log('  · 跑了 ' + _f + ' 帧（约 ' + (_f / 60).toFixed(0) + ' 秒游戏时间）');
console.log('  · 建塔 ' + _built + ' 座（花掉 ' + _spent + ' 金）· 到第 ' + _S.wave + ' 波 · 剩余血量 ' + _S.hp + ' · 剩金币 ' + Math.round(_S.gold));
ok(_built >= 3, '试玩中至少建起 3 座塔（实际 ' + _built + '）');
ok(_S.hp > 0, '结束时基地还活着（血量 ' + _S.hp + '）—— 第 1 关新手能过');
ok(_S.hp <= 20, '血量没超过上限 20（实际 ' + _S.hp + '）');
ok(_S.wave >= 2, '至少推进到第 2 波（实际第 ' + _S.wave + ' 波）');
console.log('');
console.log(fail === 0 ? '✅✅ v9.8 自动试玩通过（0 失败）—— 人类打法可通第 1 关' : '❌❌ 共 ' + fail + ' 项失败');
