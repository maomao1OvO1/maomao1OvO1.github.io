// v8.18 专项：背景音乐循环「双声道交叉淡化」（治循环接缝听得出来）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, musicTick: musicTick,\n' +
  '  bgmPlay: bgmPlay, bgmPause: bgmPause, bgmAdapt: bgmAdapt, bgmSetVol: bgmSetVol, bgmSetRate: bgmSetRate,\n' +
  '  xfade: bgmXfadeTick,\n' +
  '  deck: function(i){ return bgmDeckEl(i); }, cur: function(){ return bgmCur; },\n' +
  '  fade: function(){ return bgmFade; }, vol: function(){ return bgmVol; }, rate: function(){ return bgmRate; },\n' +
  '  ok: function(){ return bgmOK; }, setOk: function(v){ bgmOK = v; }, XF: function(){ return BGM_XF; },\n' +
  '  startLevel: startLevel, setRunning: function(v){ running = v; }, setWave: function(w){ wave = w; },\n' +
  '  getS: function(){ return { running: running, paused: paused }; } };\n' +
  'requestAnimationFrame(frame);\n})();');

/* ---- 假 audio 元素：能记录 play/pause/volume，供交叉淡化逻辑驱动 ---- */
var els = {};
function mkAudio(id){
  var e = {
    id: id, _h: {}, volume: 1, playbackRate: 1, currentTime: 0, duration: 0, paused: true,
    preload: 'none', plays: 0, pauses: 0,
    addEventListener: function(t, f){ e._h[t] = f; },
    fire: function(t){ if (e._h[t]) e._h[t](); },
    play: function(){ e.paused = false; e.plays++; return { catch: function(){} }; },
    pause: function(){ e.paused = true; e.pauses++; },
    load: function(){ e.loaded = true; }
  };
  els[id] = e;
  return e;
}
mkAudio('bgm'); mkAudio('bgm2');

function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){e.children.push(c);return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[];}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if (els[id]) return els[id]; if(!cache[id])cache[id]=mkEl(); return cache[id]; },
  createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},body:mkEl('body'),addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 静态：双声道结构 + 旧内核已清干净 ===');
ok((html.match(/<audio id="bgm"/g) || []).length === 1, '存在 <audio id="bgm">');
ok((html.match(/<audio id="bgm2"/g) || []).length === 1, '存在第二个声道 <audio id="bgm2">（交叉淡化用）');
ok(/<audio id="bgm" loop /.test(html) && /<audio id="bgm2" loop /.test(html),
   '两个声道都保留 loop 属性 —— 万一交叉淡化没跑起来，浏览器仍会原生循环（绝不静音）');
ok(html.indexOf('bgmNode') < 0 && html.indexOf('bgmTried') < 0 && html.indexOf('var bgmEl') < 0,
   '旧的单元素内核（bgmNode / bgmEl / bgmTried）已全部移除，不留僵尸变量');

console.log('=== ② 播放：走当前主声道，音量/速率按目标值下发 ===');
T.xfade(0.016);
var a = T.deck(0), b = T.deck(1);
ok(!!a && !!b, '两个声道元素都能取到');
T.bgmPlay();
ok(a.plays === 1 && a.paused === false, 'bgmPlay() 播放了主声道（plays=' + a.plays + '）');
ok(a.volume >= 0 && a.volume < 0.42, '弱起生效：起播音量低于目标值 0.42（v9.0 新增，毛毛要求音乐弱起）');
a.fire('playing');
ok(T.ok() === true, '收到 playing 事件后 bgmOK = true');
ok(b.preload === 'auto', '主声道确认能响之后自动预热第二声道（避免打不开音频的设备白占内存）');

T.xfade(3.0);   /* v9.0 起有「弱起」：先把这 2 秒推完，再单独测交叉淡化
                   （实际游戏里弱起在开头、交叉淡化在曲尾，两者不会同时发生）*/
console.log('=== ③ 交叉淡化：曲尾前 1 秒起淡，第二声道渐入 ===');
a.duration = 60; a.currentTime = 0;
T.xfade(0.016);
ok(T.fade() === 0, '离曲尾还很远 → 不触发淡化（fade=' + T.fade() + '）');
ok(b.plays === 0, '此时第二声道没有被动过');
a.currentTime = 59.5;                      /* 距曲尾 0.5 秒（< BGM_XF=1.0） */
T.xfade(0.016);
ok(T.fade() > 0, '进入淡化区 → 淡化倒计时启动（剩余 ' + T.fade().toFixed(2) + ' 秒）');
ok(b.plays === 1 && b.paused === false, '第二声道同时开始播放（交叉淡化成立的关键）');
ok(Math.abs(b.volume) < 1e-6, '第二声道从 0 音量渐入（不会突然插进来一个满音量）');
var volBefore = a.volume;
T.xfade(0.25);
ok(a.volume < volBefore, '当前声道音量在往下走（' + volBefore.toFixed(3) + ' → ' + a.volume.toFixed(3) + '）');
ok(b.volume > 0, '第二声道音量在往上走（' + b.volume.toFixed(3) + '）');

console.log('=== ④ 淡化结束：交换主从，音乐不断 ===');
T.xfade(1.0);                              /* 一次推完剩余淡化 */
ok(T.fade() === 0, '淡化结束（fade 归零）');
ok(a.pauses >= 1 && a.paused === true, '旧声道已暂停（它已经淡出到 0，听不见）');
ok(a.currentTime === 0, '旧声道回到曲首，等下一轮当「第二声道」复用');
ok(T.cur() === 1, '主声道已切换到第二声道（bgmCur=' + T.cur() + '）');
ok(T.ok() === true, '音乐没有断：接力后仍然认为 BGM 可用');
ok(Math.abs(b.volume - 0.42) < 1e-6, '新主声道音量恢复到目标值 0.42');
var seq1 = a.plays, seq2 = b.plays;
console.log('=== ⑤ 第二轮：两个声道轮换，循环点被叠在一起 ===');
b.duration = 60; b.currentTime = 59.6;
T.xfade(0.016);
ok(a.plays > seq1, '轮到旧声道重新入场（第二轮的渐入声道）');
T.xfade(1.0);
ok(T.cur() === 0, '主从再次交换回声道 0 —— 两路交替，循环接缝被淡化盖住');
ok(b.pauses >= 1, '上一轮的主声道同样被淡出后暂停');

console.log('=== ⑥ 音量/速率下发与淡化不打架 ===');
T.bgmSetVol(0.36);
ok(Math.abs(T.vol() - 0.36) < 1e-6, 'bgmSetVol 更新了目标音量');
ok(Math.abs(T.deck(T.cur()).volume - 0.36) < 1e-6, '非淡化状态下立刻下发到主声道');
var curEl = T.deck(T.cur());
curEl.duration = 60; curEl.currentTime = 59.7;
T.xfade(0.016);                            /* 重新进入淡化 */
var targetBefore = T.vol(), v1 = curEl.volume;
T.bgmSetVol(0.99);                          /* 淡化中改音量 */
ok(Math.abs(T.vol() - 0.99) < 1e-6, '淡化中允许更新目标音量（供下一波 BOSS/残血切换用）');
T.xfade(0.05);
ok(curEl.volume !== 0.99, '淡化中音量由淡化曲线接管，不被 bgmSetVol 直接覆盖（否则会「啪」一下跳音）');
T.xfade(2.0);                              /* 收尾，避免残留淡化状态影响后续断言 */
T.bgmSetVol(0.42);
T.bgmSetRate(1.1);
ok(Math.abs(T.rate() - 1.1) < 1e-6, 'bgmSetRate 记录速率');
ok(Math.abs(T.deck(0).playbackRate - 1.1) < 1e-6 && Math.abs(T.deck(1).playbackRate - 1.1) < 1e-6,
   '速率同时下发到两个声道（换声道时速度不会突变）');
T.bgmAdapt();
ok(T.rate() >= 1, 'bgmAdapt（波次/残血自适应）仍能算出速率');

console.log('=== ⑦ 暂停：两个声道都停、淡化状态清干净 ===');
T.bgmPause(true);   /* v9.0 起：无参 bgmPause 是「渐出 1.2 秒后暂停」，测试要立刻停就走 immediate */
ok(a.paused === true && b.paused === true, 'bgmPause(true) 硬停：两个声道立刻暂停（切后台不漏音）');
ok(T.fade() === 0, '暂停同时清掉淡化状态（下次进关不会带着半截淡化）');

console.log('=== ⑧ 兜底：拿不到 duration 时不淡化、也不报错 ===');
T.setOk(true);
T.deck(T.cur()).duration = 0;
T.deck(T.cur()).currentTime = 0;
T.xfade(0.016);
ok(T.fade() === 0, 'duration 未知（0）→ 不启动淡化，交给原生 loop 兜底');
T.deck(T.cur()).duration = Infinity;
T.xfade(0.016);
ok(T.fade() === 0, 'duration = Infinity → 同样不乱来（isFinite 守卫生效）');
T.deck(T.cur()).duration = 60; T.deck(T.cur()).currentTime = 0;
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.18 音乐循环交叉淡化专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);
