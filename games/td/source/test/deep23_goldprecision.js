// v7.9 金币精确记账专项：无尽后期大额金币下，小额收支不再被浮点吃掉（毛毛反馈「钱变化的不太一样」）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var code = html.match(/<script>[\s\S]*?<\/script>/g).pop().replace(/^<script>/, '').replace(/<\/script>$/, '');
code = code.replace('requestAnimationFrame(frame);\n})();',
  'window.__T = { startLevel: startLevel, startEndless: startEndless, resumeEndless: resumeEndless,\n' +
  '  saveEndless: saveEndless, loadEndlessSave: loadEndlessSave, clearEndlessSave: clearEndlessSave,\n' +
  '  frame: frame, addTower: addTower, towerCost: towerCost, upgradeCost: upgradeCost, updateHud: updateHud,\n' +
  '  goldAdd: goldAdd, goldSub: goldSub, goldSet: goldSet, goldText: goldText, startWave: startWave,\n' +
  '  getS: function(){ return { gold: gold, goldBig: goldBig, wave: wave, hp: hp, towers: towers };\n' +
  '  }, el: function(id){ return document.getElementById(id); } };\n' + 'requestAnimationFrame(frame);\n})();');
function mkEl(t){ var e={tagName:t||'div',style:{},dataset:{},children:[],textContent:'',_html:'',value:'',width:800,height:600,
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
global.window={innerWidth:800,innerHeight:600,devicePixelRatio:1,addEventListener:function(){}};
global.navigator={getGamepads:function(){return[];}};
var LS={}; global.localStorage={getItem:function(k){return(k in LS)?LS[k]:null;},setItem:function(k,v){LS[k]=String(v);},removeItem:function(k){delete LS[k];}};
global.performance={now:function(){return Date.now();}}; global.requestAnimationFrame=function(){return 0;}; global.alert=function(){};
var errs=[]; process.on('uncaughtException', function(e){ errs.push(e.message); console.log('  !!! 未捕获异常: ' + e.message); });
global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层，避免测试时游戏被暂停 */
eval(code);
var T = global.window.__T;
var fail = 0;
function ok(c, m){ if (!c){ console.log('  ❌ ' + m); fail++; } else console.log('  ✅ ' + m); }

var BIG = '8017754859530213000';     /* 毛毛截图里那笔钱 */

console.log('=== ① 对比：老式 Number 会在这一档吃掉多少 ===');
var asNum = Number(BIG);
console.log('  Number 表示 : ' + asNum);
console.log('  Number +22  : ' + (asNum + 22) + (asNum + 22 === asNum ? '  ← 完全被吃掉' : ''));
console.log('  Number -200 : ' + (asNum - 200) + ((asNum - 200) === asNum ? '  ← 买塔等于白送' : ''));
ok((asNum + 22) === asNum && (asNum - 200) === asNum, '（背景）Number 在这个量级确实无法表示 ±512 以内的变化');

console.log('=== ② v7.9 精确账本：同样的大数，小额收支必须真实生效 ===');
T.startLevel(0);
T.goldSet(BIG);
ok(T.goldText() === BIG, '大额金币设置后精确保持（' + T.goldText() + '）');
T.goldAdd(22);
ok(T.goldText() === '8017754859530213022', '击杀 +22 精确生效 → ' + T.goldText());
T.goldAdd(22); T.goldAdd(22);
ok(T.goldText() === '8017754859530213066', '连加 3 次 +22 → ' + T.goldText());
T.goldSub(200);
ok(T.goldText() === '8017754859530212866', '建塔/升级扣 200 精确生效 → ' + T.goldText());
T.goldSub(1);
ok(T.goldText() === '8017754859530212865', '扣 1 金币也生效（Number 做不到）→ ' + T.goldText());

console.log('=== ③ 真实链路：大额状态下建塔 / 击杀金币 ===');
T.startLevel(0); T.goldSet(BIG);
var cost = T.towerCost('fire');
var okBuild = T.addTower(0, 0, 'fire');
ok(okBuild === true && T.goldText() === String(BigInt(BIG) - BigInt(cost)),
   '大额下建火焰塔（造价 ' + cost + '）→ ' + T.goldText());

console.log('=== ④ HUD 显示的就是精确账本（不是 Number 近似值）===');
T.updateHud();
ok(String(T.el('gold').textContent) === T.goldText(), 'HUD 显示 = 精确账本（' + T.el('gold').textContent + '）');
ok(String(T.el('gold').textContent) === String(BigInt(BIG) - BigInt(cost)), 'HUD 与实际金币逐位一致');
T.goldSet('123456789012345678901234567890');
T.updateHud();
ok(T.el('gold').textContent === '123456789012345678901234567890', '30 位金币也能完整精确显示');
var fs2 = T.el('gold').style.fontSize;
ok(!!fs2 && parseFloat(fs2) < 15, '位数变多时字号自动缩小，顶部状态条不会被撑爆（font-size=' + fs2 + '）');

console.log('=== ⑤ 存档往返：大额金币不许丢精度 ===');
T.clearEndlessSave();
T.startEndless(); T.goldSet(BIG);
T.addTower(0, 0, 'fire'); T.addTower(0, 1, 'mortar');
var beforeTxt = T.goldText();
T.saveEndless();
var sv = T.loadEndlessSave();
ok(String(sv.gold) === beforeTxt, '存档里的金币是精确值（' + sv.gold + '）');
ok(typeof sv.gold === 'string', 'BigInt 账本以字符串存档（JSON 不支持 BigInt，避免序列化报错）');
T.resumeEndless();
ok(T.goldText() === beforeTxt, '续玩后金币逐位不变 → ' + T.goldText());

console.log('=== ⑥ 兼容旧存档（金币是数字的老格式）===');
var old = JSON.parse(JSON.stringify(sv));
old.gold = 8888;                       /* 老玩家存档里是 Number */
global.localStorage.setItem('td_endless_save', JSON.stringify(old));
T.resumeEndless();
ok(T.goldText() === '8888', '旧格式（数字）存档正常读取 → ' + T.goldText());

console.log('=== ⑦ 边界：金币不会被扣成负数 / 不会出现 NaN ===');
T.goldSet(100); T.goldSub(500);
ok(T.getS().gold >= 0 && T.goldText() === '0', '扣光后停在 0（' + T.goldText() + '），不变负数');
T.goldAdd(NaN); T.goldAdd(Infinity);
ok(T.goldText() === '0', 'NaN / Infinity 增量被安全忽略（' + T.goldText() + '）');
T.goldSet('不是数字');
ok(T.goldText() === '0', '脏数据兜底不崩（' + T.goldText() + '）');

console.log('=== ⑧ 普通关卡流程仍然正常（不因精确记账改变玩法）===');
T.startLevel(0);
ok(T.goldText() === '150' && T.getS().gold === 150, '第 1 关开局 150 金币');
var c0 = T.towerCost('fire');
T.addTower(0, 0, 'fire');
ok(T.goldText() === String(150 - c0), '小额下扣费与原逻辑一致（150 → ' + T.goldText() + '）');

ok(errs.length === 0, '全程无运行时错误（' + errs.length + '）');
console.log('');
console.log(fail === 0 ? '  ✅✅ v7.9 金币精确记账专项全部通过（0 失败）' : '  ❌ v7.9 专项 ' + fail + ' 项失败');
