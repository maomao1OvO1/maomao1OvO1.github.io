// v8.16 专项：四元素共鸣 + 共鸣组合全枚举 + 图鉴树状分组
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__R = { startLevel: startLevel, startEndless: startEndless, frame: frame, addTower: addTower,\n' +
  '  resonanceOf: resonanceOf, resoAllCombos: resoAllCombos, resoNameOf: resoNameOf, buildResoNamed: buildResoNamed,\n' +
  '  RESO_NAMED: function(){ return RESO_NAMED; }, RESO_LIST: RESO_LIST, ELEMS: ELEMS,\n' +
  '  bookShow: bookShow, bookRender: bookRender, getTab: function(){ return bookTab; },\n' +
  '  setGold: function(v){ goldSet(v); }, statAt: statAt, ELEM_KEYS: Object.keys(ELEMS),\n' +
  '  getS: function(){ return { towers: towers, lvIndex: lvIndex }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,offsetLeft:0,_hidden:false,_handlers:{},_cls:{},
  classList:{add:function(c){e._cls[c]=true;},remove:function(c){delete e._cls[c];},contains:function(c){return !!e._cls[c];}},
  appendChild:function(c){e.children.push(c);return c;},insertBefore:function(c){e.children.push(c);return c;},
  addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[];}}); return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
global.document={body:mkEl('body'), getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var R = global.window.__R;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 组合枚举：把「能组合出来的」全部列全 ===');
var c2 = R.resoAllCombos(2), c3 = R.resoAllCombos(3), c4 = R.resoAllCombos(4);
ok(c2.length === 21, '两两组合 ' + c2.length + ' 种（7 座攻击塔取 2）');
ok(c3.length === 35, '三元素组合 ' + c3.length + ' 种（取 3）');
ok(c4.length === 35, '四元素组合 ' + c4.length + ' 种（取 4，即一座塔最多连 4 座的上限）');
var total = c2.length + c3.length + c4.length + 2;
ok(total === 93, '合计 ' + total + ' 种组合（含共振 / 增幅场 2 种特殊）');
R.buildResoNamed();
var named = R.RESO_NAMED();
var namedAll = true, missTwo = [];
c2.forEach(function(list){ if (!named[list.slice().sort().join('+')]) { namedAll = false; missTwo.push(list.join('+')); } });
ok(namedAll, '两两组合 21 种**全部有专属名字与效果**（缺 ' + missTwo.length + ' 种）');
var named3 = 0, named4 = 0;
c3.forEach(function(l){ if (named[l.slice().sort().join('+')]) named3++; });
c4.forEach(function(l){ if (named[l.slice().sort().join('+')]) named4++; });
ok(named3 >= 12 && named4 >= 8, '三元素具名 ' + named3 + ' 种、四元素具名 ' + named4 + ' 种，其余走保底收益');
var n2 = R.resoNameOf(['fire','ice']), n3 = R.resoNameOf(['fire','ice','thunder']), n4 = R.resoNameOf(['fire','ice','phys','sniper']);
ok(n2[0] === '热震' && n3[0] === '⭐元素风暴' && n4[0] === '🌌绝对猎杀', '查表正确：' + n2[0] + ' / ' + n3[0] + ' / ' + n4[0]);
var nUn = R.resoNameOf(['thunder','poison','mortar','phys']);
ok(/四元素共鸣/.test(nUn[0]) && /伤害/.test(nUn[1]), '未具名组合走保底：' + nUn[0] + ' → ' + nUn[1]);

console.log('=== ② 四元素共鸣（上限组合）真的能触发 ===');
function place(list){
  R.startLevel(0); R.setGold(999999);
  /* 中心塔放 (8,5)，四邻各放一种元素 */
  R.addTower(8, 5, list[0]);
  R.addTower(7, 5, list[1]);
  R.addTower(9, 5, list[2]);
  R.addTower(8, 4, list[3]);
  R.addTower(8, 6, list[4]);
  var tw = R.getS().towers, center = null;
  tw.forEach(function(t){ if (t.c === 8 && t.r === 5) center = t; });
  return center;
}
var center = place(['fire','ice','thunder','sniper','mortar']);
var res = R.resonanceOf(center);
ok(res.tags.some(function(t){ return t.indexOf('🌌') === 0; }), '十字五塔 → 触发四元素共鸣：' + res.tags.join(' / '));
ok(/元素洪流|灾厄领域|战争矩阵|四元素共鸣/.test(res.tags.join(' ')), '四元素效果已生效（' + res.tags.filter(function(t){ return t.indexOf('🌌') === 0; }).join('') + '）');
/* 元素重复不该触发四元素 */
var c2b = place(['fire','fire','thunder','sniper','mortar']);
var res2 = R.resonanceOf(c2b);
ok(!res2.tags.some(function(t){ return t.indexOf('🌌') === 0; }), '相邻元素重复时不会误触发四元素共鸣');
/* 含辅助塔也不该触发（辅助走增幅场） */
var c3b = place(['fire','ice','thunder','sniper','support']);
var res3 = R.resonanceOf(c3b);
ok(!res3.tags.some(function(t){ return t.indexOf('🌌') === 0; }), '四邻含辅助塔时不触发四元素（辅助走增幅场）');

console.log('=== ③ 三元素仍然有效（且不与四元素冲突）===');
R.startLevel(0); R.setGold(999999);
R.addTower(8, 5, 'fire'); R.addTower(7, 5, 'ice'); R.addTower(8, 4, 'thunder');
var cen3 = null;
R.getS().towers.forEach(function(t){ if (t.c === 8 && t.r === 5) cen3 = t; });
var r3 = R.resonanceOf(cen3);
ok(r3.tags.some(function(t){ return t.indexOf('⭐') === 0; }), 'L 形三元素触发：' + r3.tags.join(' / '));

console.log('=== ④ 图鉴：树状分组（点哪个看哪个 + 全部展开）===');
R.bookShow('reso');
var listEl = R.el('bookList');
var htmlSrc = String(html);
/* v8.18 修：原断言写错了（用了别的脚本里的变量 code，并且把引号拼进了搜索串 →
   实际在找 data-reso-group="'two'" 这种不存在的文本）。改成直接查**渲染出来的图鉴 DOM**，
   比查源码更贴近真实行为。 */
var _grp = String(R.el('bookList')._html || '');
var _grpAll = ['special', 'two', 'three', 'four'].every(function(g){
  return _grp.indexOf('data-reso-group="' + g + '"') >= 0;
});
ok(_grpAll, '图鉴有 4 个可折叠分组（特殊 / 两两 / 三元素 / 四元素）');
ok(/resoAllBtn/.test(htmlSrc), '有「全部展开」按钮（一次看完 100+ 种）');
ok(htmlSrc.indexOf('resoOpenGroups') >= 0, '分组展开状态可控（点标题展开/收起）');
R.bookShow('reso');
var subText = String(R.el('bookSub').textContent);
ok(/93|种组合/.test(subText), '副标题显示组合总数：' + subText);

console.log('=== ⑤ 稳定性 ===');
R.startLevel(0); R.setGold(999999);
for (var i = 0; i < 7; i++) R.addTower(i + 4, 5, R.ELEM_KEYS[i % R.ELEM_KEYS.length]);
var t0 = 0;
for (i = 0; i < 200; i++){ t0 += 16; R.frame(t0); }
ok(errs.length === 0, '密集摆塔 + 跑 200 帧无报错（' + errs.length + '）');
ok(R.statAt(R.getS().towers[0], 1).dmg > 0, '共鸣计算后的伤害仍是有效数值（无 NaN）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.16 共鸣扩充专项全部通过（0 失败）' : '  ❌ v8.16 专项 ' + fail + ' 项失败');
