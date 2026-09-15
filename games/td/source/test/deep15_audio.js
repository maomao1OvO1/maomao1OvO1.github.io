// v5.7 音效增强验证：每塔/每怪专属音色 + 立体声定位 + 静音守卫
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { startLevel: startLevel, frame: frame, towerShot: towerShot, enemyDie: enemyDie,\n' +
  '  panOf: panOf, TOWER_VOICE: TOWER_VOICE, DIE_VOICE: DIE_VOICE,\n' +
  '  setSfx: function(v){ SFX_ON = v; }, sfxOn: function(){ return SFX_ON; },\n' +
  '  setBudget: function(n){ sfxBudget = n; },\n' +
  '  w: function(){ return W; }, el: function(id){ return document.getElementById(id); } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'', width:800, height:600,
    offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600, _hidden:false, _handlers:{},
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
/* —— 音频桩：记录每个振荡器的 type/freq 与每次声像 —— */
var OSCS = [], PANS = [], NOISES = 0;
function Param(v){ this.value = v; }
Param.prototype.setValueAtTime = function(v){ this.value = v; return this; };
Param.prototype.exponentialRampToValueAtTime = function(v){ this.value = v; return this; };
function FakeCtx(){ this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
FakeCtx.prototype.createOscillator = function(){
  var o = { type:'sine', frequency:new Param(440), connect:function(){}, start:function(){}, stop:function(){} };
  OSCS.push(o); return o;
};
FakeCtx.prototype.createGain = function(){ return { gain:new Param(1), connect:function(){} }; };
FakeCtx.prototype.createStereoPanner = function(){ var p = { pan:new Param(0), connect:function(){} }; PANS.push(p); return p; };
FakeCtx.prototype.createDynamicsCompressor = function(){ return { connect:function(){} }; };
FakeCtx.prototype.createBuffer = function(ch, len){ var d = new Float32Array(len); return { getChannelData:function(){ return d; } }; };
FakeCtx.prototype.createBufferSource = function(){ return { buffer:null, connect:function(){}, start:function(){ NOISES++; } }; };
FakeCtx.prototype.createBiquadFilter = function(){ return { type:'lowpass', frequency:new Param(1000), connect:function(){} }; };
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
  AudioContext:FakeCtx, webkitAudioContext:FakeCtx };
global.navigator = { getGamepads:function(){ return []; } };
global.localStorage = { getItem:function(){ return null; }, setItem:function(){}, removeItem:function(){} };
global.performance = { now:function(){ return Date.now(); } };
global.requestAnimationFrame = function(){ return 0; };
global.alert = function(){};
process.on('uncaughtException', function(e){ errors.push(e.message + ' :: ' + (e.stack||'').split('\n')[1]); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }

console.log('=== ① 八座塔有各自的专属开火音 ===');
T.startLevel(0);                          // 触发 initAudio → 建立 AC
var elems = Object.keys(T.TOWER_VOICE).filter(function(k){ return T.TOWER_VOICE[k]; });
var sig = {};
elems.forEach(function(e){
  OSCS.length = 0;
  T.setBudget(9);
  T.towerShot(e, T.w() / 2);
  var o = OSCS[OSCS.length - 1];
  sig[e] = o ? (o.type + '/' + Math.round(o.frequency.value)) : 'none';
});
var uniq = {};
Object.keys(sig).forEach(function(k){ uniq[sig[k]] = 1; });
ok(elems.length >= 7, '定义了 ' + elems.length + ' 种塔的专属音色（' + elems.join('/') + '）');
ok(Object.keys(uniq).length === elems.length, '每种塔的音色参数互不相同（' + Object.keys(uniq).length + ' 种唯一组合）');
console.log('   音色签名：' + JSON.stringify(sig));
ok(!sig.support, '辅助塔不发声（它不攻击）');

console.log('=== ② 立体声定位（按屏幕左右）===');
var w = T.w();
ok(Math.abs(T.panOf(0) + 0.85) < 0.01, '最左侧 → 声像 ' + T.panOf(0).toFixed(2));
ok(Math.abs(T.panOf(w / 2)) < 0.01, '正中 → 声像 ' + T.panOf(w / 2).toFixed(2));
ok(Math.abs(T.panOf(w) - 0.85) < 0.01, '最右侧 → 声像 ' + T.panOf(w).toFixed(2));
PANS.length = 0;
T.setBudget(9);
T.towerShot('fire', 0); T.towerShot('fire', w);
ok(PANS.length >= 2 && PANS[0].pan.value < -0.5 && PANS[PANS.length - 1].pan.value > 0.5,
   '左塔声音偏左（' + PANS[0].pan.value.toFixed(2) + '）、右塔偏右（' + PANS[PANS.length - 1].pan.value.toFixed(2) + '）');

console.log('=== ③ 十一种怪有各自的阵亡音 ===');
var dieSig = {};
Object.keys(T.DIE_VOICE).forEach(function(k){
  OSCS.length = 0;
  T.setBudget(9);
  T.enemyDie(k, 0, T.w() / 2);
  var o = OSCS[OSCS.length - 1];
  dieSig[k] = o ? (o.type + '/' + Math.round(o.frequency.value)) : 'none';
});
var dieUniq = {};
Object.keys(dieSig).forEach(function(k){ dieUniq[dieSig[k]] = 1; });
ok(Object.keys(T.DIE_VOICE).length >= 10, '定义了 ' + Object.keys(T.DIE_VOICE).length + ' 种怪的阵亡音');
ok(Object.keys(dieUniq).length >= 8, '阵亡音有明显区分（' + Object.keys(dieUniq).length + ' 种唯一音色）');

console.log('=== ④ 连杀升调（保留老手感）===');
OSCS.length = 0; T.setBudget(9); T.enemyDie('normal', 0, 400); var f0 = OSCS[0].frequency.value;
OSCS.length = 0; T.setBudget(9); T.enemyDie('normal', 25, 400); var f25 = OSCS[0].frequency.value;
ok(f25 > f0, '连杀越高音调越高（' + Math.round(f0) + ' → ' + Math.round(f25) + '）');

console.log('=== ⑤ 设置里的静音开关仍然有效 ===');
T.setSfx(false);
OSCS.length = 0; PANS.length = 0; var nBefore = NOISES;
T.setBudget(9);
T.towerShot('fire', 100); T.enemyDie('armor', 3, 100);
ok(OSCS.length === 0 && PANS.length === 0 && NOISES === nBefore, '静音时完全不发声（振荡器 0 / 噪声 0）');
T.setSfx(true);

console.log('=== ⑥ 实战跑 3 波无报错（含动态配乐）===');
var CLK = 5e7;
for (var i = 0; i < 900; i++) T.frame(CLK += 16.7);
ok(errors.length === 0, '全程无运行时错误（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v5.7 音效增强验证全部通过（0 失败）' : '  ❌ v5.7 音效增强 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
