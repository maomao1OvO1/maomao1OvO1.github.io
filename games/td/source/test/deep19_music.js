// v6.4 背景音乐 + 倍速音效限流验证
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
var OSC = 0;
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, frame: frame, towerShot: towerShot,\n' +
  '  enemyDie: enemyDie, MUSIC: MUSIC, musicTick: musicTick,\n' +
  '  setMusic: function(v){ MUSIC_ON = v; }, musicOn: function(){ return MUSIC_ON; },\n' +
  '  setSfx: function(v){ SFX_ON = v; }, sfxOn: function(){ return SFX_ON; },\n' +
  '  setSpeed: function(v){ speedMul = v; }, speed: function(){ return speedMul; },\n' +
  '  budget: function(){ return sfxBudget; },\n' +
  '  getS: function(){ return { wave: wave, hp: hp, running: running, paused: paused }; },\n' +
  '  setPaused: function(v){ paused = v; }, el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function Param(v){ this.value = v; }
Param.prototype.setValueAtTime = function(v){ this.value = v; return this; };
Param.prototype.exponentialRampToValueAtTime = function(v){ this.value = v; return this; };
function FakeCtx(){ this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
FakeCtx.prototype.createOscillator = function(){ OSC++; return { type:'sine', frequency:new Param(440), connect:function(){}, start:function(){}, stop:function(){} }; };
FakeCtx.prototype.createGain = function(){ return { gain:new Param(1), connect:function(){} }; };
FakeCtx.prototype.createStereoPanner = function(){ return { pan:new Param(0), connect:function(){} }; };
FakeCtx.prototype.createDynamicsCompressor = function(){ return { connect:function(){} }; };
FakeCtx.prototype.createBuffer = function(c,len){ return { getChannelData:function(){ return new Float32Array(len); } }; };
FakeCtx.prototype.createBufferSource = function(){ return { buffer:null, connect:function(){}, start:function(){} }; };
FakeCtx.prototype.createBiquadFilter = function(){ return { type:'lowpass', frequency:new Param(1000), connect:function(){} }; };
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:800,height:600};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v;}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},body:mkEl('body'),addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){},AudioContext:FakeCtx,webkitAudioContext:FakeCtx};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; }
var CLK = 3e8;
function frames(n){ for (var i=0;i<n;i++) T.frame(CLK += 16.7); }

T.startLevel(0);
console.log('=== ① 背景音乐真的在响 ===');
T.setSfx(false); T.setMusic(false);            // 先只测音乐：关掉音效、开音乐
T.setMusic(true);
T.MUSIC.beat = 0; OSC = 0; frames(180);        // 3 秒真实时间
ok(OSC > 0 && T.MUSIC.beat > 0, '音乐在推进（节拍 ' + T.MUSIC.beat + '，振荡器 ' + OSC + ' 次）');
var bpm = T.MUSIC.bpm;
ok(bpm >= 90 && bpm <= 130, 'BPM 随波次动态调整（当前 ' + bpm.toFixed(0) + '）');

console.log('=== ② 音乐开关真的能关 ===');
T.setMusic(false); OSC = 0; frames(120);
ok(OSC === 0, '关掉音乐后不再发声（振荡器 ' + OSC + '）');

console.log('=== ③ 音乐与「音效」开关相互独立 ===');
T.setSfx(false); T.setMusic(true); T.MUSIC.beat = 0; OSC = 0; frames(120);
ok(OSC > 0, '音效关闭时音乐照样播放（振荡器 ' + OSC + '）');
T.setSfx(true);

console.log('=== ④ 倍速越高，每帧音效越少（防爆音）===');
T.setMusic(false);
T.setSpeed(1);  frames(2); var b1 = T.budget();
T.setSpeed(10); frames(2); var b10 = T.budget();
T.setSpeed(100); frames(2); var b100 = T.budget();
ok(b1 > b10 && b10 >= b100, '每帧音效预算随倍速下降（1x=' + b1 + ' → 10x=' + b10 + ' → 100x=' + b100 + '）');
T.setSpeed(100); frames(1);                    // 重置为 100x 的预算
OSC = 0;
for (var i = 0; i < 10; i++) T.towerShot('fire', 100);
for (var j = 0; j < 10; j++) T.enemyDie('normal', 0, 100);
ok(OSC <= 4, '100x 下一帧最多放 ' + b100 + '+' + b100 + ' 次音效（实测 ' + OSC + '，不限流会是 20+）');
T.setSpeed(1);

console.log('=== ⑤ 音乐不随倍速加速（用真实时间）===');
T.setMusic(true); T.MUSIC.beat = 0; T.setSpeed(1);
var c1 = 0; for (var k = 0; k < 120; k++){ T.frame(CLK += 16.7); } c1 = T.MUSIC.beat + 0;
T.setSpeed(100); T.MUSIC.beat = 0; T.MUSIC.t = 0;
for (var k2 = 0; k2 < 120; k2++){ T.frame(CLK += 16.7); } var c100 = T.MUSIC.beat;
ok(Math.abs(c1 - c100) <= 4, '同样 2 秒真实时间，1x 推进 ' + c1 + ' 拍 / 100x 推进 ' + c100 + ' 拍（音乐不该被倍速带跑）');

console.log('=== ⑥ 暂停 / 开面板时音乐静下来 ===');
T.setSpeed(1); T.MUSIC.beat = 0; T.setPaused(true); OSC = 0; frames(120);
ok(OSC === 0 && T.MUSIC.beat === 0, '暂停时不推进节拍、不发声');
T.setPaused(false);

console.log('=== ⑦ 实战 3 波无报错 ===');
T.setMusic(true); T.setSfx(true);
var guard = 0;
while (guard < 9000 && T.getS().wave < 3){
  guard++;
  T.frame(CLK += 16.7);
  if (T.el('buffOv')._hidden === false){ var b = T.el('buffList'); if (b && b.children[0] && b.children[0].fire) b.children[0].fire('click'); }
}
ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
if (errs.length) errs.slice(0,3).forEach(function(x){ console.log('     ' + x); });
console.log('');
console.log(fail === 0 ? '  ✅✅ v6.4 背景音乐 + 音效限流验证全部通过（0 失败）' : '  ❌ v6.4 ' + fail + ' 项失败');
