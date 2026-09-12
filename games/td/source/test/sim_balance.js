// 数值平衡模拟器：用「中等水平玩家」AI 跑完整关卡，输出逐波压力曲线
// 用法：node test/sim_balance.js <html> [关卡索引] [塔数上限系数]
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var LV = parseInt(process.argv[3] || '0', 10);
var MAXF = parseFloat(process.argv[4] || '2.2');   // 玩家预期塔数 ≈ 波次 × MAXF
var LEVEL = process.argv[5] || 'normal';           // normal=普通玩家 / strong=神仙摆位
var RUNS = parseInt(process.argv[6] || '5', 10);   // 取样次数（策略随机，单次不可靠）
var _seed = 20260912;
function _rnd(){ _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
Math.random = _rnd;                                // 可复现随机
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower, openTower: openTower,\n' +
  '  hideSel: hideSel, upgradeCost: upgradeCost, ELEMS: ELEMS, LEVELS: LEVELS, isPath: isPath,\n' +
  '  towerAt: towerAt, COLS: COLS, ROWS: ROWS, WAYPOINTS: function(){ return WAYPOINTS; },\n' +
  '  cx: cx, cy: cy, cell: function(){ return CELL; },\n' +
  '  showBuffChoices: showBuffChoices, pickBuffs: pickBuffs,\n' +
  '  setGold: function(v){ gold = v; },\n' +
  '  getS: function(){ return { gold: gold, hp: hp, MAXHP: MAXHP, wave: wave, enemies: enemies,\n' +
  '    towers: towers, running: running, kills: kills, WAVES_TOTAL: WAVES_TOTAL, BUFFS: BUFFS };\n' +
  '  }, el: function(id){ return document.getElementById(id); } };\n' + marker);
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
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code);
var T = global.window.__T;

// ── 玩家 AI ────────────────────────────────────────────────
var selEl = T.el('sel');
selEl.firePointer = function(btn){
  var h = selEl._handlers['click'];
  if (!h) return;
  h({ stopPropagation:function(){}, target:{ closest:function(){ return { dataset: btn }; } } });
};
var ELEM_CYCLE = Object.keys(T.ELEMS);   // 动态：以后加塔（狙击/榴弹）自动纳入模拟
function pathLenPx(){
  var wps = T.WAYPOINTS(), sum = 0;
  for (var i = 0; i < wps.length - 1; i++){
    var a = { x: T.cx(wps[i][0]), y: T.cy(wps[i][1]) }, b = { x: T.cx(wps[i+1][0]), y: T.cy(wps[i+1][1]) };
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}
function pathCellsNear(c, r, range){
  var list = [], wps = T.WAYPOINTS(), CELL = T.cell();
  for (var i = 0; i < wps.length - 1; i++){
    var a = wps[i], b = wps[i+1];
    var dx = Math.sign(b[0]-a[0]), dy = Math.sign(b[1]-a[1]);
    var x = a[0], y = a[1];
    while (true){
      if (Math.hypot(x - c, y - r) <= range) list.push(i * 1000 + (Math.abs(x-a[0]) + Math.abs(y-a[1])));
      if (x === b[0] && y === b[1]) break;
      x += dx; y += dy;
    }
  }
  return list;
}
function bestSpot(elem, maxTowers){
  var def = T.ELEMS[elem], best = null, bestScore = -1e9, pool = [], wps = T.WAYPOINTS();
  var totalSeg = wps.length - 1;
  for (var c = 0; c < T.COLS; c++){
    for (var r = 0; r < T.ROWS; r++){
      if (T.isPath(c, r) || T.towerAt(c, r)) continue;
      var cover = pathCellsNear(c, r, def.range);
      if (!cover.length) continue;
      // 覆盖路径格数 + 越靠后（离基地近）越好 + 与邻居元素不同（触发共鸣）加分
      var late = 0;
      for (var k = 0; k < cover.length; k++) late += cover[k] / 1000;
      var reso = 0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
        var o = T.towerAt(c + d[0], r + d[1]);
        if (!o) return;
        reso += (o.elem === elem) ? 0.2 : 1.0;
      });
      var score = cover.length * 1.0 + late * 0.25 + reso * 1.4;
      if (LEVEL === 'strong'){
        if (score > bestScore){ bestScore = score; best = { c:c, r:r }; }
      } else {
        pool.push({ c:c, r:r, score:score });
      }
    }
  }
  if (LEVEL === 'strong') return best;
  if (!pool.length) return null;
  // 普通玩家：在「还不错的候选」（覆盖度前 45%）里随机选，摆位次优、不刻意凑共鸣
  pool.sort(function(a, b){ return b.score - a.score; });
  var top = pool.slice(0, Math.max(1, Math.floor(pool.length * 0.45)));
  return top[Math.floor(Math.random() * top.length)];
}
function aiSpend(maxTowers){
  var guard = 0;
  while (guard++ < 40){
    var s = T.getS();
    if (s.towers.length < maxTowers){
      var bought = false;
      // 先尝试最贵的能买的塔，制造强度；买不起就挑便宜的
      var order = (LEVEL === 'strong') ? ELEM_CYCLE.slice() : ELEM_CYCLE.concat(ELEM_CYCLE);
      for (var i = 0; i < order.length; i++){
        var el = order[i], cost = T.ELEMS[el].cost;
        if (s.gold < cost) continue;
        // 保留一点余钱给下一波（不希望 AI 花光导致卡死）
        var spot = bestSpot(el, maxTowers);
        if (spot && T.addTower(spot.c, spot.r, el)){ bought = true; break; }
      }
      if (bought) continue;
    }
    // 升级最便宜的塔（模拟玩家「补强」行为）
    var cand = null, candCost = 1e9;
    for (var j = 0; j < s.towers.length; j++){
      var t = s.towers[j];
      if (t.lv >= 6) continue;
      var uc = T.upgradeCost(t);
      if (LEVEL === 'strong'){ if (uc < candCost){ candCost = uc; cand = t; } }
      else if (t.lv < 3 && (cand === null || t.lv < cand.lv)){ cand = t; candCost = uc; }   // 普通玩家：先升低级的
    }
    if (cand && s.gold >= candCost + 20){
      T.openTower(cand, 0, 0);
      selEl.firePointer({ up: '1' });
      continue;
    }
    break;
  }
}
// ── 跑关卡 ────────────────────────────────────────────────
function runOnce(idx){
_seed = 20260912 + idx * 7919;
if (process.env.TD_ENDLESS === '1') T.startEndless(); else T.startLevel(LV);
// 每轮基准时间必须递增：游戏内 last 是全局的，重置时间轴会让 dt 变负（敌人倒退）
var CLK = 1e7 + idx * 6000000, wave0 = T.getS().wave;
var rows = [], prevKills = 0, prevHp = T.getS().hp, prevWave = 1;
var frontPct = 0, frontN = 0;   // 「怪能推到哪」：每帧最靠前敌人的路径进度采样
var livePrev = [], deadDones = [], deadTotal = 0, deadN = 0;   // 消失（击杀/漏过）时的已走距离
var guard = 0;
while (guard < 200000){
  guard++;
  var s = T.getS();
  if (!s.running) break;
  if (!s.enemies.length && s.towers.length < 60) aiSpend(Math.floor(s.wave * MAXF) + 1);
  // BOSS 波用冰冻技能（模拟玩家操作）
  if (s.wave % 10 === 0) T.el('skillBtn').fire('click');
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){
    var b = T.el('buffList').children[0];
    if (b) b.fire('click');
  }
  var s2 = T.getS();
  /* 击杀位置统计：对比上一帧的敌人集合，消失的即「被杀或到家」 */
  var curList = s2.enemies.slice();
  for (var lp = 0; lp < livePrev.length; lp++){
    if (curList.indexOf(livePrev[lp]) < 0){
      var dd = livePrev[lp].done || 0;
      deadDones.push(dd); deadTotal += dd; deadN++;
    }
  }
  livePrev = curList;
  var front = 0, totalP = 0;
  if (s2.enemies.length){
    var wps = T.WAYPOINTS(), lastI = wps.length - 2;
    for (var q = 0; q < wps.length; q++){ /* 路径总长（格） */ }
    totalP = (wps.length - 1) * 1.0;
    for (var q2 = 0; q2 < s2.enemies.length; q2++){
      var pr = s2.enemies[q2].wp + 0.5;
      if (pr > front) front = pr;
    }
    frontPct += Math.min(1, front / totalP);
    frontN++;
  }
  if (s2.wave !== prevWave){
    rows.push({ w: prevWave, hp: s2.hp, gold: s2.gold, towers: s2.towers.length, kills: s2.kills - prevKills, leak: s2.hp - prevHp });
    prevKills = s2.kills; prevHp = s2.hp; prevWave = s2.wave;
  }
}
var fin = T.getS();
rows.push({ w: fin.wave, hp: fin.hp, gold: fin.gold, towers: fin.towers.length, kills: fin.kills - prevKills, leak: fin.hp - prevHp });
return { rows: rows, fin: fin, frontPct: frontPct, frontN: frontN, deadTotal: deadTotal, deadN: deadN, pathLen: pathLenPx(), cleared: (fin.wave >= T.LEVELS[LV].waves && fin.running === false && T.el('clearOv')._hidden === false), guard: guard };
}
var results = [];
for (var run = 0; run < RUNS; run++) results.push(runOnce(run));
var okN = results.filter(function(r0){ return r0.cleared; }).length;
var avgHp = results.reduce(function(a, r0){ return a + Math.max(0, r0.fin.hp); }, 0) / results.length;
var hpList = results.map(function(r0){ return Math.max(0, r0.fin.hp); }).join('/');
console.log('══ 关卡 ' + T.LEVELS[LV].name + ' · 策略=' + LEVEL + ' · ' + RUNS + ' 次取样 ══');
console.log('通关率 ' + okN + '/' + RUNS + ' · 最终血量 ' + hpList + '（平均 ' + avgHp.toFixed(1) + '/' + results[0].fin.MAXHP + '）');
console.log('参考曲线（最后一轮）:');
var rows = results[results.length - 1].rows, fin = results[results.length - 1].fin, guard = results[results.length - 1].guard;
console.log('波次 | 剩余血 | 该波掉血 | 该波击杀 | 金币 | 塔数');
rows.forEach(function(r2){
  console.log(String(r2.w).padStart(4) + ' |' + String(r2.hp).padStart(6) + ' |' +
    String(r2.leak).padStart(8) + ' |' + String(r2.kills).padStart(8) + ' |' +
    String(r2.gold).padStart(5) + ' |' + String(r2.towers).padStart(5));
});
console.log('（最后一轮）最终血 ' + fin.hp + '/' + fin.MAXHP + ' · 塔 ' + fin.towers.length + ' · 击杀 ' + fin.kills);
var _lr = results[results.length - 1];
console.log('  最靠前的怪能到路径 ' + (_lr.frontN ? (_lr.frontPct / _lr.frontN * 100).toFixed(0) : '0') + '% 处');
console.log('  ★ 怪被清掉时的平均位置 = 路径 ' + (_lr.deadN && _lr.pathLen ? (_lr.deadTotal / _lr.deadN / _lr.pathLen * 100).toFixed(0) : '0') + '% 处（越低=越被压在出生点打，理想 40~60%）');
if (errors.length){ console.log('运行时报错 ' + errors.length + '：'); errors.slice(0, 3).forEach(function(x){ console.log('  ' + x); }); }
