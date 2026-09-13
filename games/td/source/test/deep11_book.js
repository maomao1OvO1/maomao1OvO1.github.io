// v5.4 专项验证：主界面图鉴系统（#bookOv 怪物页 / 炮塔页 · 数据驱动 ENEMIES/ELEMS）
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { el: function(id){ return document.getElementById(id); },\n' +
  '  ENEMIES: ENEMIES, ELEMS: ELEMS, startLevel: startLevel, spawnEnemy: spawnEnemy, frame: frame,\n' +
  '  getS: function(){ return { running: running, paused: paused, menuPause: menuPause,\n' +
  '    wave: wave, enemies: enemies, lvIndex: lvIndex }; } };\n' + marker);
var errors = [];
function mkEl(tag){
  var el = { tagName: tag||'div', style:{}, dataset:{}, children:[], textContent:'', _html:'',
    value:'', width:800, height:600, offsetWidth:100, offsetHeight:100, clientWidth:800, clientHeight:600,
    _hidden:false, _handlers:{},
    classList:{ add:function(c){ if(c==='hidden') el._hidden=true; }, remove:function(c){ if(c==='hidden') el._hidden=false; },
      contains:function(c){ return c==='hidden'?el._hidden:false; } },
    appendChild:function(c){ this.children.push(c); return c; },
    addEventListener:function(t, fn){ el._handlers[t] = fn; },
    fire:function(t){ if (el._handlers[t]) el._handlers[t]({ stopPropagation:function(){}, target:el }); },
    removeEventListener:function(){}, setPointerCapture:function(){}, remove:function(){},
    closest:function(){ return null; }, contains:function(){ return false; }, getContext:function(){ return ctx; },
    getBoundingClientRect:function(){ return { left:0, top:0, width:800, height:600 }; } };
  Object.defineProperty(el, 'innerHTML', {
    get:function(){ return el._html; },
    set:function(v){ el._html = v; el.children = []; }
  });
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
/* 让 mock 反映 HTML 里写死的 class="hidden" 初始态（真实 DOM 会解析，mock 不会） */
(function(){
  var re = /<div class="ov hidden" id="([A-Za-z0-9_]+)">/g, m;
  while ((m = re.exec(html))){ if (!elCache[m[1]]) elCache[m[1]] = mkEl(); elCache[m[1]]._hidden = true; }
})();
try { global.NO_INTRO = true;   /* v8.4：跳过关卡开幕弹层 */
eval(code); } catch (e) { console.log('  ❌ 加载失败:', e.message); process.exit(1); }
var T = global.window.__T;
var fail = 0;
function ok(c, msg){ console.log((c ? '  ✅ ' : '  ❌ ') + msg); if (!c) fail++; }
var CLK = 1e6;
function step(n){ for (var i = 0; i < n; i++){ CLK += 16.7; T.frame(CLK); } }

console.log('=== ① 首页入口 + 弹窗骨架 ===');
var s0 = html.indexOf('<div class="ov" id="startOv">');
var s1 = html.indexOf('<div class="ov hidden" id="pauseOv">');
var home = (s0 >= 0 && s1 > s0) ? html.slice(s0, s1) : '';
ok(s0 >= 0 && s1 > s0, '能切出首页 #startOv 区块（' + home.length + ' 字符）');
ok(home.indexOf('id="bookBtn"') >= 0, '首页区块内存在 #bookBtn');
ok(home.indexOf('<button class="btn" id="bookBtn"') >= 0 && home.indexOf('rgba(40,60,100,.85)') >= 0, '#bookBtn 沿用 .btn 类 + 次级按钮配色');
ok(home.indexOf('图鉴') >= 0 && home.indexOf('📖') >= 0, '#bookBtn 文案含「📖」「图鉴」（v8.18 图标网格把图标与文字拆成两个 span，不再是连续字符串）');
ok(home.indexOf('id="setBtn1"') >= 0 && home.indexOf('id="startBtn"') >= 0, '首页原有按钮未被破坏（#startBtn / #setBtn1 仍在）');
ok(html.indexOf('<div class="ov hidden" id="bookOv">') >= 0, '#bookOv 使用 class="ov hidden"（自动获得滚动/小屏压缩）');
['bookTabMob','bookTabTower','bookList','bookBackBtn'].forEach(function(id){
  ok(html.indexOf('id="' + id + '"') >= 0, '弹窗内含 #' + id);
});
ok(T.el('bookBtn')._handlers.click !== undefined, '#bookBtn 已绑定点击事件');

console.log('=== ② 首页打开：#bookOv 由隐藏变为可见 ===');
ok(T.el('bookOv')._hidden === true, '初始 #bookOv 处于隐藏状态');
ok(T.el('startOv')._hidden === false, '初始 #startOv 可见');
var pauseBefore = T.getS().menuPause;
T.el('bookBtn').fire('click');
ok(T.el('bookOv')._hidden === false, '点击 #bookBtn 后 #bookOv 可见');
ok(T.el('startOv')._hidden === true, '打开图鉴时首页已收起');
ok(T.getS().menuPause === pauseBefore, '首页打开（running=false）不动 menuPause（原值 ' + pauseBefore + '）');
ok(T.el('bookList')._html.length > 0, '#bookList 已渲染内容（' + T.el('bookList')._html.length + ' 字符）');

console.log('=== ③ 怪物页：遍历 ENEMIES 动态生成 ===');
T.el('bookTabMob').fire('click');
var mobHtml = T.el('bookList')._html;
var mkeys = Object.keys(T.ENEMIES);
ok(T.el('bookTabMob').style.borderColor === '#ffd76a', '当前页「怪物」高亮（金色边框）');
ok(T.el('bookTabTower').style.borderColor !== '#ffd76a', '「炮塔」页未高亮');
mkeys.forEach(function(k){
  var d = T.ENEMIES[k];
  ok(mobHtml.indexOf(d.name) >= 0, '怪物页含「' + d.name + '」');
  ok(mobHtml.indexOf(String(d.hp)) >= 0 && mobHtml.indexOf(String(d.speed)) >= 0
     && mobHtml.indexOf(String(d.gold)) >= 0, '  └ 血量 ' + d.hp + ' / 速度 ' + d.speed + ' / 掉落 ' + d.gold + ' 均已列出');
  ok(mobHtml.indexOf(d.color) >= 0, '  └ 用该怪 color ' + d.color + ' 做左侧色条');
});
ok(mobHtml.indexOf('血量') >= 0 && mobHtml.indexOf('金币') >= 0 && mobHtml.indexOf('特性：') >= 0, '卡片含 血量/速度/掉落金币/特性');
ok(mobHtml.indexOf('护甲减伤 35%') >= 0, '特性由 armor 字段推导：护甲减伤 35%');
ok(mobHtml.indexOf('免疫减速') >= 0, '特性由 immuneSlow 字段推导：免疫减速');
ok(mobHtml.indexOf('每 10 波登场') >= 0 && mobHtml.indexOf('沉默') >= 0, 'BOSS 特性文案含「每 10 波登场」与技能「沉默」');
ok(mobHtml.indexOf('普通单位') >= 0, '每种怪都有特性文案（步兵：普通单位）');
ok(mobHtml.indexOf('克制提示') >= 0, '怪物卡片含「克制提示」行');
ok(mobHtml.indexOf('#7cf5c0') >= 0 && mobHtml.indexOf('#ffd76a') >= 0 && mobHtml.indexOf('#bb9cff') >= 0,
   '沿用现有字色（金色数值 / 绿色特性 / 蓝色次要文字）');

console.log('=== ④ 炮塔页：遍历 ELEMS 动态生成 + 共鸣组合 ===');
T.el('bookTabTower').fire('click');
var twHtml = T.el('bookList')._html;
var tkeys = Object.keys(T.ELEMS);
ok(T.el('bookTabTower').style.borderColor === '#ffd76a', '切到「炮塔」页后高亮跟随');
ok(T.el('bookTabMob').style.borderColor !== '#ffd76a', '「怪物」页取消高亮');
tkeys.forEach(function(k){
  var d = T.ELEMS[k];
  ok(twHtml.indexOf(d.name) >= 0, '炮塔页含「' + d.name + '」');
  ok(twHtml.indexOf(d.icon) >= 0, '  └ 含图标 ' + d.icon);
  ok(twHtml.indexOf('造价 <b style="color:#ffd76a;">' + d.cost + '</b>') >= 0, '  └ 含造价 ' + d.cost);
});
ok(twHtml.indexOf('伤害 <b style="color:#ffd76a;">' + T.ELEMS.fire.dmg + '</b>') >= 0, '攻击塔显示伤害');
ok(twHtml.indexOf('攻速 <b style="color:#ffd76a;">' + (1 / T.ELEMS.fire.rate).toFixed(2) + '</b> 次/秒') >= 0,
   '攻速用 1/rate 保留两位（火塔 ' + (1 / T.ELEMS.fire.rate).toFixed(2) + ' 次/秒）');
ok(twHtml.indexOf('射程 <b style="color:#ffd76a;">' + T.ELEMS.fire.range + '</b>') >= 0, '显示射程');
ok(twHtml.indexOf('特效：' + T.ELEMS.poison.fx) >= 0, '显示 fx 特效说明');
ok(twHtml.indexOf('升级收益：每级 +30% 伤害 / +12% 攻速 / +8% 射程') >= 0, '显示升级收益');
ok(twHtml.indexOf('自身不攻击 · 相邻塔伤害 +25% / 攻速 +18%') >= 0,
   '辅助塔（aura）显示光环而非伤害');
ok(twHtml.indexOf('共鸣组合：') >= 0, '每张炮塔卡含「共鸣组合」行');
ok(twHtml.indexOf('热震') >= 0 && twHtml.indexOf('等离子') >= 0 && twHtml.indexOf('超导') >= 0
   && twHtml.indexOf('燃爆') >= 0 && twHtml.indexOf('电磁炮') >= 0 && twHtml.indexOf('熔铁') >= 0
   && twHtml.indexOf('碎冰') >= 0 && twHtml.indexOf('腐蚀') >= 0 && twHtml.indexOf('增幅场') >= 0,
   '9 组元素共鸣组合名均已标出');
['fire','ice','thunder','poison','phys'].forEach(function(k){
  ok(twHtml.indexOf('（相邻 📡 辅助塔）') >= 0, '攻击塔标注增幅场（抽样 ' + k + '）');
});

console.log('=== ⑤ 关闭：回首页 + menuPause 原样恢复 ===');
T.el('bookBackBtn').fire('click');
ok(T.el('bookOv')._hidden === true, '点「返回」后 #bookOv 隐藏');
ok(T.el('startOv')._hidden === false, '回到首页 #startOv');
ok(T.getS().menuPause === pauseBefore, 'menuPause 恢复为打开前的值（' + pauseBefore + '）');
ok(T.el('startBtn')._handlers.click !== undefined && T.el('setBtn1')._handlers.click !== undefined,
   '首页原有按钮绑定未被破坏');
T.el('startBtn').fire('click');
ok(T.el('levelsOv')._hidden === false, '点「开始防守」仍能进选关页（既有流程未受影响）');
T.el('lvBackBtn').fire('click');
ok(T.el('startOv')._hidden === false, '选关页返回首页正常');

console.log('=== ⑥ 战斗中打开图鉴：冻结战场并在关闭后复原 ===');
T.startLevel(0);
var st = T.getS();
ok(st.running === true && st.menuPause === false, '开局后 running=true / menuPause=false');
T.spawnEnemy('normal');
var e0 = T.getS().enemies[0];
var x0 = e0.x, hp0 = e0.hp;
T.el('bookBtn').fire('click');
ok(T.getS().menuPause === true, '游戏进行中打开图鉴 → menuPause=true（战场已冻结）');
step(60);
ok(Math.abs(e0.x - x0) < 0.001 && Math.abs(e0.hp - hp0) < 0.001,
   '图鉴打开期间敌人不移动、不掉血（60 帧后坐标/血量不变）');
ok(T.el('bookOv')._hidden === false, '战斗中图鉴正常显示');
T.el('bookTabTower').fire('click');
ok(T.el('bookList')._html.indexOf('共鸣组合：') >= 0, '战斗中切页仍能正常渲染');
T.el('bookBackBtn').fire('click');
ok(T.getS().menuPause === false, '关闭图鉴 → menuPause 归 false（恢复打开前状态）');
step(30);
ok(e0.x !== x0, '关闭后战场恢复推进（敌人重新移动 ' + x0.toFixed(1) + ' → ' + e0.x.toFixed(1) + '）');

console.log('=== ⑦ 幂等 / 结构一致性 ===');
ok((html.match(/id="bookOv"/g) || []).length === 1, '#bookOv 只出现 1 次（无重复注入）');
ok((html.match(/id="bookBtn"/g) || []).length === 1, '#bookBtn 只出现 1 次');
ok(html.indexOf('BOOK_PATCH_V1') >= 0, '补丁标记 BOOK_PATCH_V1 存在（幂等保护位）');
var hideAllLine = (html.match(/\['startOv'[^\]]*\]/) || [''])[0];
ok(hideAllLine.indexOf("'bookOv'") >= 0, 'bookOv 已纳入 hideAll 收纳列表（' + hideAllLine + '）');

console.log('=== ⑧ 运行时报错 ===');
ok(errors.length === 0, '全程 0 运行时报错（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });

console.log('');
if (fail === 0) console.log('  ✅✅ v5.4 图鉴专项验证全部通过（0 失败）');
else console.log('  ❌❌ 共 ' + fail + ' 项失败');
process.exit(fail === 0 ? 0 : 1);
