// v7.10 塔详情伤害显示专项：点开已放置的塔能看到 每发伤害 / 暴击伤害 / 单体 DPS
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, frame: frame, addTower: addTower, openTower: openTower, statAt: statAt,\n' +
  '  elemAt: elemAt, ELEMS: ELEMS, BUFFS: (function(){ return BUFFS; }), twAdd: twAdd,\n' +
  '  applyCard: function(id){ for (var i=0;i<BUFF_POOL.length;i++) if (BUFF_POOL[i].id===id){ BUFF_POOL[i].apply(); return true; } return false; },\n' +
  '  setGold: function(v){ goldSet(v); }, getS: function(){ return { towers: towers, gold: gold, BUFFS: BUFFS }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + 'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:200,offsetHeight:200,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v;}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},body:mkEl('body'),addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function panelOf(t){
  T.openTower(t, 20, 20);
  return String(T.el('sel').innerHTML);
}
function num(txt, re){
  var m = txt.match(re);
  return m ? parseFloat(m[1]) : null;
}

console.log('=== ① 伤害行存在且数值与面板口径一致 ===');
T.startLevel(0); T.addTower(0, 0, 'fire');
var t = T.getS().towers[0];
var h = panelOf(t);
ok(/💥 每发/.test(h), '面板出现「💥 每发」伤害行');
ok(/⚡ 暴击/.test(h), '面板出现「⚡ 暴击」');
ok(/单体 DPS/.test(h), '面板出现「单体 DPS」');
var dmg = T.statAt(t, t.lv).dmg;
var shown = num(h, /💥 每发 <b[^>]*>([\d.]+)<\/b>/);
ok(shown !== null && Math.abs(shown - dmg) < 0.05, '每发伤害 = statAt 面板口径（' + shown + ' vs ' + dmg.toFixed(1) + '）');
var shownCrit = num(h, /⚡ 暴击 <b[^>]*>([\d.]+)<\/b>/);
ok(shownCrit !== null && Math.abs(shownCrit - dmg * 2.5) < 0.1, '暴击伤害 = 每发 ×2.5（' + shownCrit + '）');
var row = T.elemAt('fire', 1), rate = T.statAt(t, t.lv).rate;
var shownDps = num(h, /单体 DPS<\/span> <b[^>]*>([\d.]+)<\/b>/);
ok(shownDps !== null && Math.abs(shownDps - dmg / rate) < 0.1, 'DPS = 每发 ÷ 射击间隔（' + shownDps + '）');

console.log('=== ② 升级后数字跟着变（读的是实时面板值，不是死数）===');
t.lv = 4;
h = panelOf(t);
var dmg4 = T.statAt(t, 4).dmg, shown4 = num(h, /💥 每发 <b[^>]*>([\d.]+)<\/b>/);
ok(shown4 > shown && Math.abs(shown4 - dmg4) < 0.05, 'Lv1 → Lv4：' + shown + ' → ' + shown4);

console.log('=== ③ 暴击率按 hitEnemy 口径合计（全局 + 共鸣 + 专属强化）===');
T.startLevel(0); T.addTower(0, 0, 'sniper');
var sn = T.getS().towers[0];
ok(/暂无暴击率/.test(panelOf(sn)), '无暴击加成时提示「暂无暴击率」');
T.applyCard('crit');                                    /* 瞄准模块：暴击率 +12% */
h = panelOf(sn);
ok(/12% ×2\.5/.test(h), '抽「瞄准模块」后显示 12% 概率 ×2.5');
T.applyCard('t_sniper_3');                              /* 狙击专属：本塔暴击率 +15% */
h = panelOf(sn);
ok(/27% ×2\.5/.test(h), '狙击专属「一枪爆头」叠加后 12%+15% = 27%');
ok(/27%/.test(panelOf(T.getS().towers[0])), '专属强化只加在本塔身上（面板显示 27%）');
T.startLevel(0); T.addTower(0, 0, 'fire');
T.applyCard('t_sniper_3');                              /* 给狙击的专属卡，火焰塔不该吃到 */
ok(/12% ×2\.5/.test(panelOf(T.getS().towers[0])) === false, '狙击专属卡不影响火焰塔（火焰塔仍无狙击暴击加成）');

console.log('=== ④ 强化卡立刻反映在伤害数字上 ===');
T.startLevel(0); T.addTower(0, 0, 'fire');
var f1 = T.getS().towers[0];
var base = num(panelOf(f1), /💥 每发 <b[^>]*>([\d.]+)<\/b>/);
T.applyCard('dmg');                                     /* 火力强化：全塔伤害 +25% */
var after = num(panelOf(f1), /💥 每发 <b[^>]*>([\d.]+)<\/b>/);
ok(after > base * 1.2, '抽「火力强化」后每发伤害 ' + base + ' → ' + after + '（+25%）');
T.applyCard('t_fire_4');                                 /* 火焰专属：溅射，不改单体伤害 */
var after2 = num(panelOf(f1), /💥 每发 <b[^>]*>([\d.]+)<\/b>/);
ok(Math.abs(after2 - after) < 0.05, '专属溅射卡不该虚报单体伤害（保持 ' + after2 + '）');

console.log('=== ⑤ 辅助塔不显示伤害行（它不攻击），仍显示光环 ===');
T.startLevel(0); T.addTower(0, 0, 'support');
var sp = T.getS().towers[0];
h = panelOf(sp);
ok(!/💥 每发/.test(h), '辅助塔面板不出现「每发伤害」');
ok(/光环/.test(h), '辅助塔面板仍显示光环效果');

console.log('=== ⑥ 8 座塔逐个点开都不报错、都有可读数字 ===');
var keys = Object.keys(T.ELEMS);
T.startLevel(0); T.setGold(99999);
for (var i = 0; i < keys.length; i++){
  T.addTower(0, i, keys[i]);
  var arr = T.getS().towers, tt = null;
  for (var j = 0; j < arr.length; j++) if (arr[j].elem === keys[i]) tt = arr[j];
  ok(!!tt, T.ELEMS[keys[i]].name + ' 塔已建成（金币充足）');
  var hh = panelOf(tt);
  var bad = !hh.length || /NaN|undefined/.test(hh);
  ok(!bad, T.ELEMS[keys[i]].icon + ' ' + T.ELEMS[keys[i]].name + ' 面板正常' + (T.ELEMS[keys[i]].aura ? '（光环塔）' : '（每发 ' + num(hh, /💥 每发 <b[^>]*>([\d.]+)<\/b>/) + '）'));
}

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v7.10 塔详情伤害显示专项全部通过（0 失败）' : '  ❌ v7.10 专项 ' + fail + ' 项失败');

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
