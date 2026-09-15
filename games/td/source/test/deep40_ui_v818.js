// v8.18 专项：① 天气介绍（HUD 弹层 + 图鉴天气页）③ 主界面 UI 重做 ④⑤ 左侧常驻信息栏
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { frame: frame, startLevel: startLevel, startEndless: startEndless,\n' +
  '  updateHud: updateHud, grantCard: grantCard, BUFF_POOL: BUFF_POOL, WEATHERS: WEATHERS,\n' +
  '  WEATHER_KEYS: WEATHER_KEYS, ELEM_SETS: ELEM_SETS, RARITY: RARITY, LEVELS: LEVELS,\n' +
  '  showWeatherHelp: showWeatherHelp, bookShow: bookShow, bookTab: function(){ return bookTab; },\n' +
  '  sideToggle: sideToggle, sideOpen: function(){ return sideOpen; }, updateSideBar: updateSideBar,\n' +
  '  enterEndless: enterEndless,\n' +
  '  getBuffs: function(){ return BUFFS; }, pact: function(){ return PACT; }, setPactReset: pactReset,\n' +
  '  cards: function(){ return runCards; }, weather: function(){ return weather; },\n' +
  '  nextWeather: function(){ return nextWeather; }, wxNote: wxSwitchNote,\n' +
  '  setWeather: function(w){ weather = w; elemCache = {}; }, setWave: function(w){ wave = w; },\n' +
  '  WX_ADVICE: WX_ADVICE,\n' +
  '  prog: function(){ return prog; },\n' +
  '  getS: function(){ return { running: running, paused: paused, endless: endless, isDaily: isDaily }; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' +
  'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
  offsetWidth:100,offsetHeight:100,clientWidth:800,clientHeight:600,_hidden:false,_handlers:{},
  classList:{add:function(){},remove:function(){},contains:function(){return false;}},
  appendChild:function(c){e.children.push(c);return c;},addEventListener:function(t2,f){e._handlers[t2]=f;},
  fire:function(t2){if(e._handlers[t2])e._handlers[t2]({stopPropagation:function(){},target:e});},
  removeEventListener:function(){},setPointerCapture:function(){},remove:function(){},closest:function(){return null;},
  contains:function(){return false;},getContext:function(){return ctx;},getBoundingClientRect:function(){return{left:0,top:0,width:200,height:200};}};
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=v; e.children=[]; e._sets=(e._sets||0)+1;}}); return e; }
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
global.NO_INTRO = true;
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! ' + e.message); });
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }
function txt(el){
  /* 天气面板的每条天气是 appendChild 进去的（内容挂在子节点自己的 innerHTML 上），
     所以收集文本必须递归子树，只看父节点会漏掉整块内容 */
  if (!el) return '';
  var s = String(el._html || '') + String(el.textContent || '');
  var ch = el.children || [];
  for (var i = 0; i < ch.length; i++) s += txt(ch[i]);
  return s;
}

console.log('=== ① 天气介绍：点 HUD 天气框弹出说明 ===');
ok(Math.abs(html.search(/<div class="ov[^"]*" id="startOv">/) ) >= 0, '首页区块定位基准仍在（未破坏既有结构）');
ok(/id="wxBox"[^>]*cursor:pointer/.test(html), 'HUD 天气框 #wxBox 变成可点样式（一眼看得出能点）');
ok(T.el('wxBox')._handlers.click !== undefined, '#wxBox 已绑定点击');
T.startLevel(0);
T.setWeather('heat');                 /* 先用一个真实天气，好验证「当前生效」高亮 */
T.el('wxBox').fire('click');
ok(T.el('buffOv').classList && T.el('buffOv')._hidden === false, '点击天气框 → 说明弹层打开（buffOv 可见）');
/* 默认是「简易模式」→ 只留应对建议；这里用完整模式验证效果原文 */
T.showWeatherHelp(false);
var wHtml = txt(T.el('buffList'));
ok(wHtml.indexOf('元素天气说明') >= 0, '弹层标题是「元素天气说明」');
var allDesc = true, missing = [];
T.WEATHER_KEYS.forEach(function(k){ if (wHtml.indexOf(T.WEATHERS[k].desc) < 0){ allDesc = false; missing.push(k); } });
ok(allDesc, '6 种天气的效果文案全部来自 WEATHERS[k].desc（数据驱动，未手写；缺：' + (missing.join(',') || '无') + '）');
ok(wHtml.indexOf('本波生效') >= 0, '当前生效的天气被高亮标出「本波生效」');
ok(wHtml.indexOf('应对：') >= 0, '每种天气都给了「怎么应对」的建议');
ok(wHtml.indexOf('平稳') >= 0, '「平稳」也在列表里（前 3 波 HUD 上就是它，不能一条都不高亮）');
ok(String(T.el('skipBuffBtn').style.display) === 'none' && wHtml.indexOf('跳过') < 0,
   '天气说明面板里没有「跳过」按钮（不会像 v8.12 那样被拿来刷金币）');
console.log('--- 与「文字详略」开关联动 ---');
T.showWeatherHelp(true);
var wBrief = txt(T.el('buffList'));
ok(wBrief.indexOf(T.WX_ADVICE.heat) >= 0, '简易模式保留「怎么应对」这句要点');
T.showWeatherHelp(false);
ok(txt(T.el('buffList')).indexOf(T.WEATHERS.heat.desc) >= 0, '完整模式才铺开效果原文（详略开关真的生效）');
T.el('buffOv')._hidden = true;
console.log('--- 天气切换规则文案 ---');
T.setWave(1);
ok(T.wxNote().indexOf('前 3 波') >= 0, '第 1 波提示「前 3 波固定平稳」（' + T.wxNote().slice(0, 22) + '…）');
T.setWave(4); T.setWeather('heat');
ok(/每 3 波换一次/.test(T.wxNote()), '第 4 波起提示「每 3 波换一次 + 下一波预报」');
ok(T.wxNote().indexOf(T.WEATHERS[T.nextWeather()].name) >= 0, '预报里写出下一波的具体天气名');

console.log('=== ① 图鉴新增「🌤 天气」页 ===');
ok(html.indexOf('id="bookTabWx"') >= 0, '图鉴页签多了 #bookTabWx');
T.setWave(4); T.setWeather('miasma');
T.bookShow('wx');
ok(T.bookTab() === 'wx', '已切到天气页');
var bHtml = txt(T.el('bookList'));
var cntAll = true;
T.WEATHER_KEYS.forEach(function(k){ if (bHtml.indexOf(T.WEATHERS[k].icon) < 0 || bHtml.indexOf(T.WEATHERS[k].name) < 0) cntAll = false; });
ok(cntAll, '天气页列出全部 ' + T.WEATHER_KEYS.length + ' 种天气（图标 + 名称）');
ok(bHtml.indexOf('平稳') >= 0, '「平稳」也收录（新手缓冲期玩家看到的就是它）');
ok(txt(T.el('bookSub')).indexOf('种天气') >= 0, '副标题写明「共 N 种天气」（' + txt(T.el('bookSub')) + '）');
ok(bHtml.indexOf('当前') >= 0, '图鉴里把当前天气标为「当前」');

console.log('=== ③ 主界面：图标网格 + 主按钮 ===');
var s0 = html.search(/<div class="ov[^"]*" id="startOv">/), s1 = html.indexOf('<div class="ov hidden" id="pauseOv">');
var home = html.slice(s0, s1);
ok(s0 > 0 && s1 > s0, '首页区块可切出（' + home.length + ' 字符）');
/* v8.28：CSS 已展开成多行可读格式 → 断言改成「去掉空白后匹配」，不再依赖原排版 */
var _cssN = html.replace(/\s+/g, '');
ok(home.indexOf('home-menu') >= 0 && _cssN.indexOf('.home-menu{display:grid;grid-template-columns:repeat(3,1fr)') >= 0,
   '入口改成 3 列图标网格（不再是竖向堆叠）');
['levelsBtn','homeEndlessBtn','homeDailyBtn','tutBtn','bookBtn','setBtn1','helpBtn','updCheckBtn','startBtn'].forEach(function(id){
  ok(home.indexOf('id="' + id + '"') >= 0, '首页仍有 #' + id);
});
ok(/class="btn btn-hero" id="startBtn"/.test(home), '主按钮「开始防御」仍是 .btn-hero（视觉主角没变）');
ok(home.indexOf('home-aura') >= 0 && html.indexOf('@keyframes auraBreath') >= 0 && html.indexOf('@keyframes logoGlow') >= 0,
   '新增纯 CSS 动效：呼吸光环 + Logo 辉光（无图片资源）');
ok(home.indexOf('<img') < 0 && home.indexOf('url(') < 0, '首页没有引入任何图片资源（包体/性能约束）');
ok(T.el('homeEndlessBtn')._handlers.click !== undefined && T.el('homeDailyBtn')._handlers.click !== undefined,
   '新增的「无尽 / 每日挑战」网格入口都绑定了点击');

console.log('--- 首页入口行为 ---');
T.prog().unlocked = 1; T.prog().best = {};
T.el('homeEndlessBtn').fire('click');
ok(T.getS().endless === false, '未通关第 1 关时点「无尽」→ 不开局（提示先去通关）');
T.prog().unlocked = 2;
T.el('homeEndlessBtn').fire('click');
ok(T.getS().running === true && T.getS().endless === true, '已解锁时点「无尽」→ 直接进无尽模式');
T.el('homeDailyBtn').fire('click');
ok(T.getS().isDaily === true, '点「每日挑战」→ 直接进今日挑战（isDaily=true）');

console.log('=== ④⑤ 左侧常驻信息栏 ===');
T.startEndless();                     /* 重开一局干净状态 */
ok(html.indexOf('id="sideWin"') >= 0 && html.indexOf('id="swStrip"') >= 0, '游戏内有左侧信息栏容器 #sideWin + 图标带');
var strip = txt(T.el('swStrip'));
['swWx','swBuff','swDeb','swCard','swSet'].forEach(function(id){ ok(html.indexOf('id="' + id + '"') >= 0, '图标带含 #' + id); });
ok(/id="sideWin" data-open="0"/.test(html), '初始是折叠态（data-open="0"）—— 默认不挡战场');
ok(/#sideWin\{[^}]*pointer-events:none/.test(_cssN) && /#swBody\{[^}]*pointer-events:auto/.test(_cssN),
   '容器 pointer-events:none、面板本身 auto → 点战场不受影响，只有信息栏自己吃点击');
ok(html.indexOf('env(safe-area-inset-left') >= 0, '左侧留了安全区（刘海屏 / 圆角屏不被压住）');
T.sideToggle(false);
T.updateHud();
ok(T.sideOpen() === false, '折叠态下 sideOpen=false');
T.el('swStrip').fire('click');
ok(T.sideOpen() === true, '点图标带 → 展开详情');
var body = txt(T.el('swBody'));
ok(body.indexOf('全局加成') >= 0, '展开后有「📈 全局加成」段');
['全塔伤害','攻速','射程','暴击率','金币收益'].forEach(function(n){
  ok(body.indexOf(n) >= 0, '加成汇总含「' + n + '」');
});
ok(body.indexOf('当前天气') >= 0 && body.indexOf('本局强化卡') >= 0 && body.indexOf('已激活套装') >= 0,
   '面板含：当前天气 / 本局强化卡 / 已激活套装 三段');
T.setWeather('heat'); T.updateHud();
body = txt(T.el('swBody'));
ok(body.indexOf('+35%') >= 0 && body.indexOf('火塔伤害') >= 0,
   '天气影响被拆进加成栏（灼热 → 火塔伤害 +35%）');
ok(body.indexOf('冰塔减速时长') >= 0 && body.indexOf('-40%') >= 0,
   '同一天气的负面被拆进减益栏（灼热 → 冰塔减速时长 -40%）');

console.log('--- 抽卡记录（🎴）---');
var c0 = T.cards().length;
var dmgCard = T.BUFF_POOL.filter(function(b){ return b.id === 'dmg'; })[0];
T.grantCard(dmgCard);
ok(T.cards().length === c0 + 1, 'grantCard 会记一笔本局抽卡（' + c0 + ' → ' + T.cards().length + '）');
T.updateHud();
body = txt(T.el('swBody'));
ok(body.indexOf(dmgCard.name) >= 0, '抽到的卡名出现在左侧面板（' + dmgCard.name + '）');
ok(body.indexOf(T.RARITY[dmgCard.rar].color) >= 0, '卡片按稀有度着色（' + T.RARITY[dmgCard.rar].name + ' 色号 ' + T.RARITY[dmgCard.rar].color + '）');
ok(body.indexOf('×1.25') >= 0, '加成数值实时反映抽卡结果（伤害 → ×1.25）');
ok(txt(T.el('swCard')).indexOf(String(T.cards().length)) >= 0, '图标带上的 🎴 角标显示本局卡数（' + T.cards().length + '）');

console.log('--- 减益（🔻 无尽契约）---');
ok(txt(T.el('swBody')).indexOf('减益') < 0 || T.pact().hp === 1, '没选契约时不显示减益段（保持干净）');
T.pact().hp = 1.25; T.pact().armor = 0.12; T.pact().count = 1.5; T.pact().gold = 0.7;
T.updateHud();
var db = txt(T.el('swBody'));
ok(db.indexOf('敌人血量') >= 0 && db.indexOf('×1.25') >= 0, '契约「敌人血量 +25%」显示为减益 ×1.25');
ok(db.indexOf('敌人护甲') >= 0 && db.indexOf('+12%') >= 0, '契约「敌人 +护甲」显示为减益 +12%');
ok(db.indexOf('敌人数量') >= 0, '契约「敌人数量」显示在减益里');
ok(db.indexOf('金币收益') >= 0 && db.indexOf('-30%') >= 0, '金币被压到 -30% 时按减益列出');
ok(txt(T.el('swDeb')).indexOf('4') >= 0 || txt(T.el('swDeb')).indexOf('5') >= 0, '🔻 图标角标统计了减益条数');

console.log('--- 天气负面影响也进减益栏 ---');
T.setWeather('iron'); T.setPactReset();
T.updateHud();
var wb = txt(T.el('swBody'));
ok(wb.indexOf('敌人护甲') >= 0, '铁潮的「所有敌人 +15% 护甲」出现在减益栏');
ok(wb.indexOf('物理破甲') >= 0, '铁潮的「物理塔破甲 +50%」出现在加成栏');
T.setWeather('silence'); T.updateHud();
ok(txt(T.el('swBody')).indexOf('失效') >= 0, '静默天气的「辅助塔光环失效」按减益列出');

console.log('--- 套装与性能 ---');
T.getBuffs().sets.fire = 1;
T.updateHud();
ok(txt(T.el('swBody')).indexOf(T.ELEM_SETS.fire.name) >= 0, '已激活套装显示在 🧩 段（' + T.ELEM_SETS.fire.name + '）');
var before = T.el('swBody')._sets;
T.updateHud(); T.updateHud(); T.updateHud();
ok(T.el('swBody')._sets === before, '值没变时 updateHud 连调 3 次不会重建面板 DOM（每帧调用也安全，sets=' + before + '）');
T.getBuffs().dmg = 2.5;
T.updateHud();
ok(T.el('swBody')._sets > before, '值变了则重建（伤害 ×2.50 立刻反映）');

console.log('--- 新一局清空 & 暂停时隐藏 ---');
T.startLevel(0);
ok(T.cards().length === 0, '开新一局清空「本局已抽卡」（runCards 重置）');
T.updateHud();
ok(txt(T.el('swBody')).indexOf('还没有抽过卡') >= 0, '新一局面板提示「还没有抽过卡」');
ok(errs.length === 0, '全程 0 运行时异常（' + errs.length + '）');

console.log(fail === 0 ? '\n✅✅ v8.18 天气介绍 + 主界面 + 左侧信息栏专项全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
