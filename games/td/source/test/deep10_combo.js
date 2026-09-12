/* deep10_combo.js —— A 路「连杀提示重做」专项验证
   断言：① 连杀块不再用 W/2 作为 x（改右侧右对齐）
        ② comboCount = 3/5/10/20/40 五档绘制颜色互不相同、且不抛异常
        ③ comboT 归零后 comboCount 归零
        ④ 跑 60 帧无报错（含 40+ 档的光环/旋转路径）
   另含分级动画差异验证（浮动 / 抖动 / 脉冲 / 旋转 / 光环）。
   用 mock ctx 记录 fillText/strokeText 的 fillStyle、textAlign、坐标（含 translate 偏移）；
   ctx.arc / ctx.rotate 只在「连杀绘制窗口」内计数，用于验证分级动画差异。
   用法：node deep10_combo.js <html> */
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, draw: draw, addTower: addTower,\n' +
  '  setGold: function(v){ gold = v; },\n' +
  '  setCombo: function(n, t){ comboCount = n; comboT = t; },\n' +
  '  getCombo: function(){ return { n: comboCount, t: comboT }; },\n' +
  '  setT: function(v){ gameT = v; },\n' +
  '  size: function(){ return { W: W, H: H }; },\n' +
  '  tier: function(n){ return comboTier(n); },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);

var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'',
    value:'', width:800, height:600, offsetWidth:800, offsetHeight:600,
    clientWidth:800, clientHeight:600, _hidden:false, _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    fire:function(t){ if (el._handlers[t]) el._handlers[t]({ stopPropagation:function(){}, target:el }); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){ return null; }, contains:function(){ return false; },
    getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
  Object.defineProperty(el, 'innerHTML', { get:function(){ return el._html; },
    set:function(v){ el._html = v; el.children = []; } });
  return el;
}

/* ---- 记录型 mock ctx：记录文本绘制的样式/坐标，并跟踪 translate 偏移 ---- */
/* 连杀绘制窗口：drawComboBadge 在 ctx.save() 后立刻设 textAlign='right'，直到 ctx.restore() 关窗。
   只有窗口内的 ctx.arc / ctx.rotate 才算「光环 / 旋转」——draw() 其余部分（塔 29 处 arc、炮塔 rotate）
   都被排除在外，避免误判。 */
var LOG = [], ARMED = false, ARCS = 0, ROTS = 0;
var TX = 0, TY = 0, TSTACK = [], ST = {};
function resetRec(){ LOG.length = 0; ARCS = 0; ROTS = 0; }
var ctx = new Proxy({}, {
  get: function(t, k){
    if (k === 'canvas') return mkEl('canvas');
    if (k === 'measureText') return function(s){ return { width: String(s).length * 11 }; };
    if (k === 'createRadialGradient' || k === 'createLinearGradient')
      return function(){ return { addColorStop: function(){} }; };
    if (k === 'save') return function(){ TSTACK.push([TX, TY]); };
    if (k === 'restore') return function(){ ARMED = false; var s = TSTACK.pop(); if (s){ TX = s[0]; TY = s[1]; } };
    if (k === 'translate') return function(a, b){ TX += a; TY += b; };
    if (k === 'setTransform') return function(a,b,c,d,e,f){ TX = e || 0; TY = f || 0; };
    if (k === 'rotate') return function(){ if (ARMED) ROTS++; };
    if (k === 'arc') return function(){ if (ARMED) ARCS++; };
    if (k === 'fillText' || k === 'strokeText') return function(txt, x, y){
      LOG.push({ op: k, txt: String(txt), x: TX + (x || 0), y: TY + (y || 0),
                 align: ST.textAlign, fill: ST.fillStyle, stroke: ST.strokeStyle,
                 font: ST.font, alpha: ST.globalAlpha });
    };
    if (Object.prototype.hasOwnProperty.call(ST, k)) return ST[k];
    return function(){};
  },
  set: function(t, k, v){ ST[k] = v; if (k === 'textAlign' && v === 'right') ARMED = true; return true; }
});

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
function uniq(a){ var o = {}, r = []; for (var i=0;i<a.length;i++){ var k=String(a[i]); if(!o[k]){ o[k]=1; r.push(k); } } return r; }
function badgeRecs(){                                   // 连杀提示（右对齐那条）
  return LOG.filter(function(r){ return r.op==='fillText' && /连杀 ×\d+/.test(r.txt) && r.align==='right'; });
}
function anyComboRecs(){
  return LOG.filter(function(r){ return (r.op==='fillText'||r.op==='strokeText') && /连杀 ×\d+/.test(r.txt); });
}
var CLK = 5e6;
function step(n){ for (var i=0;i<n;i++){ CLK += 16.7; T.frame(CLK); } }
function drawAt(n, t){
  T.setCombo(n, 2.4); resetRec(); T.draw();
  return badgeRecs();
}

console.log('=== ① 连杀块位置：不再居中 W/2，改为右侧右对齐 ===');
ok(html.indexOf("ctx.fillText('连杀 ×' + comboCount, W/2, H*0.22)") < 0,
   '旧的居中绘制块 ctx.fillText(..., W/2, H*0.22) 已移除');
ok(html.indexOf("ctx.textAlign = 'right'") >= 0, '连杀绘制使用 textAlign = \'right\'（文字右边缘定位）');
ok(html.indexOf('function drawComboBadge(){') >= 0, '连杀绘制已抽为 drawComboBadge() 并从 draw() 调用');
ok(html.indexOf('addFloat(W/2, H*0.3, comboTxt') >= 0, '原有里程碑飘字 addFloat(...) 保留');
ok(html.indexOf('SFX.combo(comboCount)') >= 0, '原有 SFX.combo(comboCount) 调用保留');
ok(html.indexOf('W/2, H*0.22') < 0, '源码中已无 W/2 + H*0.22 组合');

T.startLevel(0); T.setGold(99999);
var W = T.size().W, H = T.size().H;
console.log('  画布 W=' + W + ' H=' + H + '（判定阈值 右侧 > ' + (W*0.9).toFixed(0) + '）');
ok(W > 0 && H > 0, '画布尺寸已就绪');

var r0 = drawAt(12, 2.4)[0];
ok(!!r0, '12 连时确实绘制了「连杀 ×12」文本');
if (r0){
  ok(r0.x > W*0.9, 'x=' + r0.x.toFixed(1) + ' 位于屏幕右侧（> ' + (W*0.9).toFixed(1) + '）');
  ok(Math.abs(r0.x - W/2) > W*0.2, 'x 明显偏离屏幕中心 W/2=' + (W/2).toFixed(1));
  ok(W - r0.x >= W*0.005 && W - r0.x <= W*0.05,
     '文字右边缘距画布右边 W-x=' + (W-r0.x).toFixed(1) + 'px（≈W*0.04 量级，且不越界）');
  ok(r0.y < H*0.35, '垂直位置在上部 y=' + r0.y.toFixed(1) + '（< H*0.35）');
  ok(r0.alpha < 1, '半透明绘制（globalAlpha=' + r0.alpha + '），不糊住右侧塔位可点区域');
  ok(r0.op === 'fillText', '以 fillText 绘制（纯 ctx，无图片资源）');
  ok(html.indexOf('new Image') < 0 && html.indexOf('createPattern') < 0, '未引入任何图片/贴图资源');
}
var tierXs = [3,5,10,20,40].map(function(n){ return drawAt(n, 2.4)[0]; });
ok(tierXs.every(function(r, i){ return r && (i === 0 || r.x >= tierXs[i-1].x - 1e-6); }),
   '档位越高 x 越靠右（逐级向右堆叠：' + tierXs.map(function(r){ return r ? r.x.toFixed(0) : '-'; }).join(' → ') + '）');
ok(tierXs.every(function(r){ return r && r.x <= W*0.995 + 1e-6; }), '各档 x 均未越出画布右边');

console.log('=== ② 五档配色：3/5/10/20/40 绘制颜色互不相同 ===');
var CASE = [[3,0],[5,1],[10,2],[20,3],[40,4]];
var fills = [], strokes = [], tierNames = [], threw = 0;
CASE.forEach(function(cs){
  var n = cs[0], want = cs[1];
  ok(T.tier(n) === want, 'comboTier(' + n + ') = ' + T.tier(n) + '（期望档位 ' + want + '）');
  var before = errors.length, recs;
  try { recs = drawAt(n, 2.4); } catch (e) { threw++; recs = []; errors.push('draw 抛错 n=' + n + ': ' + e.message); }
  ok(errors.length === before, 'comboCount=' + n + ' 绘制未抛异常');
  ok(recs.length >= 1, 'comboCount=' + n + ' 绘制出右对齐的「连杀 ×' + n + '」');
  fills.push(recs[0] ? recs[0].fill : null);
  var st = LOG.filter(function(r){ return r.op==='strokeText' && /连杀 ×\d+/.test(r.txt); })
               .map(function(r){ return r.stroke; });
  strokes.push(uniq(st).join(','));
  tierNames.push(n + '连→' + (recs[0] ? recs[0].fill : '?'));
});
ok(threw === 0, '五档绘制全部无异常抛出');
ok(uniq(fills).length === 5, '五档主色互不相同：' + tierNames.join(' | '));
ok(fills[0] && fills[0].toLowerCase() === '#8fe4ff', '3 连 = 青蓝 #8fe4ff');
ok(fills[1] && fills[1].toLowerCase() === '#ffb24a', '5 连 = 橙金 #ffb24a');
ok(fills[2] && fills[2].toLowerCase() === '#ff6a4a', '10 连 = 炽红 #ff6a4a');
ok(fills[3] && fills[3].toLowerCase() === '#ff5ad0', '20 连 = 紫粉 #ff5ad0');
ok(fills[4] && fills[4].toLowerCase() === '#ffffff', '40+ 连 = 白热芯 #ffffff');
ok(uniq(strokes).length >= 4, '各档描边/外圈色也不同（' + strokes.join(' | ') + '）');
ok(/ff4d4d|ffb24a|ffe94a|5aff9a|4ad4ff|b06aff/i.test(strokes[4]), '40+ 档使用彩虹描边（多色外圈）');

console.log('=== ③ comboT 归零 → comboCount 归零 ===');
T.setCombo(12, 0.05);
step(6);
var cc = T.getCombo();
ok(cc.t <= 0, 'comboT 已归零（=' + cc.t.toFixed(3) + '）');
ok(cc.n === 0, 'comboCount 随之归零（=' + cc.n + '）');
T.setCombo(40, 2.4); CLK += 16.7; T.frame(CLK);
ok(T.getCombo().n === 40, '重新连杀后 comboCount 正常累计（=' + T.getCombo().n + '）');

console.log('=== ④ 连跑 60 帧无报错（40+ 档：光环 + 旋转路径全程执行）===');
T.setCombo(45, 2.4);
var e0 = errors.length, arcFrames = 0, rotFrames = 0;
for (var i = 0; i < 60; i++){
  resetRec(); CLK += 16.7; T.frame(CLK);
  if (ARCS > 0) arcFrames++;
  if (ROTS > 0) rotFrames++;
}
ok(errors.length === e0, '60 帧全程无报错（新增 ' + (errors.length - e0) + ' 个）');
ok(arcFrames >= 50, '40+ 档扩散光环每帧绘制（' + arcFrames + '/60 帧出现 ctx.arc）');
ok(rotFrames >= 50, '40+ 档旋转每帧生效（' + rotFrames + '/60 帧出现 ctx.rotate）');
ok(T.getCombo().n > 0 && T.getCombo().t > 0, '60 帧内连杀提示持续存活（comboT=' + T.getCombo().t.toFixed(2) + '）');

console.log('=== ⑤ 分级动画差异（浮动 / 抖动 / 脉冲 / 旋转 / 光环）===');
function samples(n, steps){
  T.setCombo(n, 2.4); resetRec(); T.draw();          // 先把弹入走完
  var xs = [], ys = [], fz = [], rot = 0, arc = 0;
  for (var i = 0; i < steps; i++){
    T.setT(900 + i * 0.06);
    T.setCombo(n, 2.4);
    resetRec(); T.draw();
    var r = badgeRecs()[0];
    if (r){ xs.push(Math.round(r.x * 100) / 100); ys.push(Math.round(r.y * 100) / 100); fz.push(r.font); }
    rot += ROTS; arc += ARCS;
  }
  return { x: uniq(xs), y: uniq(ys), f: uniq(fz), rot: rot, arc: arc };
}
function popSamples(n){                                // 弹入曲线：0.6 → 1.15 → 1.0
  T.setCombo(n, 2.4);
  var s = [];
  for (var i = 0; i <= 9; i++){
    T.setT(100 + i * 0.04); resetRec(); T.draw();
    var r = badgeRecs()[0];
    if (r) s.push(parseFloat(String(r.font).replace(/[^0-9.]/g, '')));
  }
  return s;
}
var S0 = samples(4, 14), S1 = samples(7, 14), S2 = samples(12, 14), S3 = samples(25, 14), S4 = samples(45, 14);
ok(S0.f.length === 1, '档位 0（3~4 连）：无脉冲，字号恒定（' + S0.f.length + ' 种）');
ok(S0.y.length > 3, '档位 0：y 轻微上下浮动（' + S0.y.length + ' 个不同值）');
ok(S0.x.length === 1, '档位 0：x 不抖动（' + S0.x.length + ' 种）');
ok(S0.rot === 0 && S0.arc === 0, '档位 0：无旋转、无光环');
ok(S1.f.length === 1 && S1.y.length > 3, '档位 1（5~9 连）：仍为纯浮动，无脉冲/抖动');
ok(S2.x.length > 3, '档位 2（10~19 连）：x 左右抖动（' + S2.x.length + ' 个不同值）');
ok(S2.rot === 0 && S2.arc === 0, '档位 2：仍未进入旋转/光环档');
ok(S3.f.length > 4, '档位 3（20~39 连）：脉冲使字号变化（' + S3.f.length + ' 种）');
ok(S3.rot >= 14, '档位 3：旋转每帧生效（rotate 调用 ' + S3.rot + ' 次）');
ok(S3.arc === 0 && S4.arc >= 14, '光环只在 40+ 档出现（档位3 arc=' + S3.arc + '，档位4 arc=' + S4.arc + '）');
ok(S0.arc === 0 && S1.arc === 0 && S2.arc === 0, '档位 0/1/2 均无扩散光环（arc 计数全为 0）');
ok(S4.f.length > 4 && S4.rot >= 14 && S4.arc >= 14, '档位 4（40+）：脉冲 + 旋转 + 光环三者同时生效');
var pop = popSamples(12);
ok(pop.length >= 6, '弹入采样成功（' + pop.length + ' 帧）');
var maxPop = Math.max.apply(null, pop), minPop = Math.min.apply(null, pop);
ok(minPop < 0.75 * maxPop + 1e-6, '弹入从 0.6 倍小字起跳（最小字号 ' + minPop.toFixed(1) + '）');
ok(maxPop > 1.08 * pop[pop.length-1], '弹入先放大到约 1.15 倍再回落（峰值 ' + maxPop.toFixed(1) +
   ' → 末帧 ' + pop[pop.length-1].toFixed(1) + '）');

console.log('');
if (errors.length){ console.log('  ❌ 错误：'); errors.forEach(function(x){ console.log('     ' + x); }); }
console.log(fail === 0 ? '  ✅✅ v5.4 连杀提示重做验证全部通过（0 失败）'
                       : '  ❌ v5.4 连杀提示重做 ' + fail + ' 项失败');
process.exit(fail === 0 && errors.length === 0 ? 0 : 1);
