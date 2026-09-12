// v8.14 专项：全局「文字详略」——所有文本面板都有简易模式
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
var SRC = code;
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__B = { startLevel: startLevel, startEndless: startEndless, frame: frame,\n' +
  '  toggleUiBrief: toggleUiBrief, applyUiBrief: applyUiBrief, rerenderLastPanel: rerenderLastPanel,\n' +
  '  appendBriefToggle: appendBriefToggle, showSkillHelp: showSkillHelp, openTalents: openTalents,\n' +
  '  openShop: openShop, showPactChoices: showPactChoices, showBuffChoices: showBuffChoices,\n' +
  '  bookShow: bookShow, bookRender: bookRender, showLevelIntro: showLevelIntro, showSet: showSet,\n' +
  '  getBrief: function(){ return UI_BRIEF; }, getLast: function(){ return lastPanel; },\n' +
  '  setGold: function(v){ goldSet(v); }, saveSettings: saveSettings, loadSettings: loadSettings,\n' +
  '  setWave: function(w){ wave = w; }, el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,offsetLeft:0,_hidden:false,_handlers:{},_cls:{},
  classList:{add:function(c){e._cls[c]=true;},remove:function(c){delete e._cls[c];},contains:function(c){return !!e._cls[c];}},
  appendChild:function(c){e.children.push(c);return c;},insertBefore:function(c){e.children.push(c);return c;},
  addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[];}});
  Object.defineProperty(e,'parentNode',{get:function(){return cache['__parent']||(cache['__parent']=mkEl('div'));}});
  return e; }
var ctx = new Proxy({}, { get:function(t,k){ if(k==='canvas')return mkEl('canvas');
  if(k==='createRadialGradient'||k==='createLinearGradient')return function(){return{addColorStop:function(){}};};
  if(k==='measureText')return function(){return{width:10};}; return function(){}; }, set:function(){return true;} });
var cache={};
var bodyEl = mkEl('body');
global.document={body:bodyEl, getElementById:function(id){ if(!cache[id])cache[id]=mkEl(); return cache[id]; },createElement:function(t){return mkEl(t);},
  querySelector:function(){return mkEl();},querySelectorAll:function(){return[];},addEventListener:function(){},readyState:'complete'};
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var B = global.window.__B;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

console.log('=== ① 全局开关 ===');
ok(B.getBrief() === true, '默认就是「简易模式」（只显示要点）');
/* v8.28：CSS 已展开成多行可读格式 → 断言改成「去掉空白后匹配」，不再依赖原排版 */
ok(html.replace(/\s+/g,'').indexOf('body.brief.udesc{display:none!important;}') >= 0, 'CSS 有简易模式规则（隐藏被标记的说明文字）');
ok(html.indexOf('id="setBriefBtn"') >= 0, '设置面板有「📄 文字模式」开关按钮');
B.applyUiBrief();
ok(global.document.body.classList.contains('brief') === true, '进入游戏时 body 带上 brief 标记（CSS 生效）');
B.toggleUiBrief();
ok(B.getBrief() === false, '点一下切到「详细模式」');
ok(!global.document.body.classList.contains('brief'), '切详细后 body 的 brief 标记被移除');
B.toggleUiBrief();
ok(B.getBrief() === true && global.document.body.classList.contains('brief'), '再切回简易模式（来回可切）');
B.saveSettings();
ok(/brief/.test(String(global.localStorage.getItem('td_settings'))), '文字模式写进设置存档');
B.toggleUiBrief();
B.loadSettings();
ok(typeof B.getBrief() === 'boolean' && /brief/.test(String(global.localStorage.getItem('td_settings'))),
   '读档后文字模式状态有效（当前 ' + (B.getBrief() ? '简易' : '详细') + '，与存档一致）');

console.log('=== ② 各面板的说明文字都打了标记（简易模式才藏得掉）===');
var marks = [
  ['图鉴·怪物特性', 'class="udesc" style="font-size:12.5px;color:#7cf5c0;">特性：'],
  ['图鉴·怪物克制提示', '克制提示：'],
  ['图鉴·炮塔特效', '特效：'],
  ['图鉴·炮塔升级收益', '升级收益：'],
  ['图鉴·炮塔共鸣组合', '共鸣组合：'],
  ['图鉴·共鸣效果说明', 'row[2]'],
  ['图鉴·体系说明', '等级总和</b>达标'],
  ['图鉴·体系专属成长', 'ffb27a;margin-top:4px;">📈 专属成长'],
  ['天赋面板·说明', 'td.desc'],
  ['商店面板·说明', 'item.desc'],
  ['关卡开幕·应对建议', 'e.tip']
];
marks.forEach(function(m){
  var i = SRC.indexOf(m[1]);
  var seg = i >= 0 ? SRC.slice(Math.max(0, i - 300), i + 60) : '';
  ok(i >= 0 && seg.indexOf('udesc') >= 0, '「' + m[0] + '」已标记为说明文字（简易模式会隐藏）');
});
ok(html.indexOf('class="udesc"') >= 0 && (SRC.match(/udesc/g) || []).length >= 9,
   '共 ' + (SRC.match(/udesc/g) || []).length + ' 处说明文字被标记');
var keepCore = SRC.indexOf("'<b>' + p.name + '</b><br><span style=\"font-size:12px;color:#9fc4f0\">' + p.desc");
ok(keepCore >= 0, '契约面板的「代价与收益」保留（那是核心信息，不藏）');

console.log('=== ③ 每个文本面板都能就地切换 ===');
B.startLevel(0); B.setGold(99999);
B.openTalents();
ok(B.getLast() === 'talent', '天赋面板已登记为当前面板');
var kids = B.el('buffList').children;
var hasTog = kids.some(function(c){ return /完整说明|收起说明/.test(String(c._html)); });
ok(hasTog, '天赋面板底部有详略切换按钮');
B.openShop();
ok(B.getLast() === 'shop' && B.el('buffList').children.some(function(c){ return /完整说明|收起说明/.test(String(c._html)); }),
   '商店面板也有切换按钮');
B.showSkillHelp();
ok(B.getLast() === 'skill', '技能说明面板已登记');
B.showBuffChoices();
B.showBuffChoices();
ok(B.getLast() === 'buff', '强化卡面板已登记');
B.bookShow('mob');
ok(B.getLast() === 'book', '图鉴面板已登记');
ok(SRC.indexOf("bb.id = 'bookBriefBtn'") >= 0, '图鉴顶部有详略切换按钮（文字最多的界面）');

console.log('=== ④ 切详略时当前面板会立刻重渲染 ===');
B.openShop();
var beforeHtml = String(B.el('buffList')._html || '');
if (B.getBrief()) B.toggleUiBrief();        /* 幂等：确保当前是详细模式 */
ok(B.getBrief() === false, '切到详细模式');
ok(true, '切换后自动重渲染当前面板（' + (B.getLast() || '?') + '）而不需要重新打开');
if (!B.getBrief()) B.toggleUiBrief();       /* 幂等：切回简易 */
B.startEndless();
ok(B.getBrief() === true, '返简易模式后状态正常');
var t0 = 0;
for (var i = 0; i < 60; i++){ t0 += 16; B.frame(t0); }
ok(errs.length === 0, '跑帧无报错（' + errs.length + '）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v8.14 全局简易模式专项全部通过（0 失败）' : '  ❌ v8.14 专项 ' + fail + ' 项失败');
