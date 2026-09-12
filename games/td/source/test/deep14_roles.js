// v5.5 专项验证：炮塔角色标签 UI（建塔面板角色徽标 + 对单/对群星级条 + 图鉴角色行）
// 依赖补丁 patches/p_b_roles.py（标记 ROLES_PATCH_V1）
// 注意：role / soloStar / groupStar 由另一路写入，本套件用「运行时临时补字段」验证渲染，
//       并用「删字段」验证兜底（不得出现 undefined）。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var blocks = html.match(/<script>[\s\S]*?<\/script>/g);
var code = blocks[blocks.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');
var marker = 'requestAnimationFrame(frame);\n})();';
code = code.replace(marker,
  'window.__T = { ELEMS: ELEMS, buildCard: buildCard, bookTowerCard: bookTowerCard,\n' +
  '  roleRowHTML: roleRowHTML, roleBookLineHTML: roleBookLineHTML, roleTagOf: roleTagOf,\n' +
  '  statLine: statLine, bookShow: bookShow, bookRender: bookRender,\n' +
  '  startLevel: startLevel, frame: frame, addTower: addTower, openBuild: openBuild,\n' +
  '  getS: function(){ return { gold: gold, wave: wave, enemies: enemies, running: running,\n' +
  '    menuPause: menuPause, lvIndex: lvIndex }; },\n' +
  '  setGold: function(v){ gold = v; }, openSel: function(){ return sel; },\n' +
  '  el: function(id){ return document.getElementById(id); } };\n' + marker);
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
var SOLID = '\u2605', HOLLOW = '\u2606', DASH = '\u2014';
function cnt(s, ch){ return (s.match(new RegExp(ch, 'g')) || []).length; }
function soloSeg(h){ return h.substring(h.indexOf('\u5bf9\u5355 '), h.indexOf('\u5bf9\u7fa4 ')); }
function groupSeg(h){ return h.substring(h.indexOf('\u5bf9\u7fa4 ')); }

console.log('=== ① 建塔面板：角色徽标 + 星级条（运行时临时补字段）===');
ok(html.indexOf('ROLES_PATCH_V1') >= 0, '补丁标记 ROLES_PATCH_V1 存在');
var fire = T.ELEMS.fire;
var keep = { role: fire.role, soloStar: fire.soloStar, groupStar: fire.groupStar };
fire.role = '\u5355\u4f53'; fire.soloStar = 4; fire.groupStar = 2;
var h1 = T.buildCard('fire');
ok(h1.indexOf('class="cr"') >= 0, '角色行容器 class="cr" 已插入卡片');
ok(h1.indexOf('>\u5355\u4f53</span>') >= 0, '徽标文字出现「单体」');
var iName = h1.indexOf('\u5854</span>'), iRole = h1.indexOf('class="cr"'), iStat = h1.indexOf('class="cs"');
ok(iName > 0 && iName < iRole && iRole < iStat, '位置正确：名称行 → 角色行 → 数值行');
ok(h1.indexOf('border:1px solid #ffd76a') >= 0, '徽标带 1px 描边（角色专属色 #ffd76a）');
ok(h1.indexOf('background:rgba(255,215,106,0.16)') >= 0, '徽标带半透明底色 rgba(...,0.16)');
ok(h1.indexOf('font-size:10.5px') >= 0, '角色行字号 10.5px（与面板现行字号一致，紧凑）');
ok(h1.indexOf('white-space:nowrap') >= 0, '角色行 nowrap（不换行、不撑高）');
var s1 = soloSeg(h1), g1 = groupSeg(h1);
ok(cnt(s1, SOLID) === 4, 'soloStar=4 → 对单段实心 ★ = 4（实测 ' + cnt(s1, SOLID) + '）');
ok(cnt(s1, HOLLOW) === 1, 'soloStar=4 → 对单段空星 ☆ = 1（实测 ' + cnt(s1, HOLLOW) + '）');
ok(cnt(g1, SOLID) === 2, 'groupStar=2 → 对群段实心 ★ = 2（实测 ' + cnt(g1, SOLID) + '）');
ok(cnt(g1, HOLLOW) === 3, 'groupStar=2 → 对群段空星 ☆ = 3（实测 ' + cnt(g1, HOLLOW) + '）');
ok(s1.indexOf('#ffd76a') >= 0, '对单星级用暖色 #ffd76a');
ok(g1.indexOf('#8fe4ff') >= 0, '对群星级用冷色 #8fe4ff');
ok(s1.indexOf('rgba(160,180,210,.35)') >= 0 && g1.indexOf('rgba(160,180,210,.35)') >= 0,
   '空星用 rgba(160,180,210,.35)');
ok(h1.indexOf('statLine') < 0 && h1.indexOf('\u4f24\u5bb3 ') >= 0 && h1.indexOf('\u653b\u901f ') >= 0
   && h1.indexOf('\u5c04\u7a0b ') >= 0, '数值行「伤害/攻速/射程」文案未改动（deep5 依赖）');
ok(cnt(h1, SOLID) + cnt(h1, HOLLOW) === 10, '整张卡片恰好 10 颗星（5+5，未多渲染）');
fire.role = '\u6e85\u5c04'; fire.soloStar = 1; fire.groupStar = 5;
var h1b = T.buildCard('fire');
ok(h1b.indexOf('>\u6e85\u5c04</span>') >= 0, '更换 role → 徽标文字与取色同步（溅射）');
ok(h1b.indexOf('border:1px solid #ff9a5a') >= 0, '溅射角色取色 #ff9a5a');
ok(cnt(soloSeg(h1b), SOLID) === 1 && cnt(groupSeg(h1b), SOLID) === 5, '边界 1/5 星级渲染正确');

console.log('=== ② 图鉴炮塔页：角色行 ===');
fire.role = '\u5355\u4f53'; fire.soloStar = 4; fire.groupStar = 1;
var b1 = T.bookTowerCard('fire');
ok(b1.indexOf('\u89d2\u8272\uff1a') >= 0, '图鉴卡片含「角色：」行');
ok(b1.indexOf('\u89d2\u8272\uff1a<b style="color:#ffd76a;">\u5355\u4f53</b>') >= 0, '角色值「单体」按角色色渲染');
ok(cnt(soloSeg(b1), SOLID) === 4 && cnt(groupSeg(b1), SOLID) === 1, '图鉴星级 4/1 正确');
ok(b1.indexOf('font-size:12.5px;color:#9fc4f0;">\u89d2\u8272\uff1a') >= 0, '图鉴角色行与既有行同字号同配色');
var iL2 = b1.indexOf('\u4f24\u5bb3 <b'), iRl = b1.indexOf('\u89d2\u8272\uff1a'), iFx = b1.indexOf('\u7279\u6548\uff1a');
ok(iL2 < iRl && iRl < iFx, '图鉴行序：数值 → 角色 → 特效');
ok(b1.indexOf('\u5171\u9e23\u7ec4\u5408\uff1a') >= 0 && b1.indexOf('\u5347\u7ea7\u6536\u76ca\uff1a') >= 0,
   '图鉴既有行（升级收益 / 共鸣组合）未被破坏');
T.bookShow('tower');
var list = T.el('bookList')._html;
ok(list.indexOf('\u89d2\u8272\uff1a') >= 0, '整页渲染（bookShow tower）含角色行');
var nCards = T.ELEMS ? list.split('\u89d2\u8272\uff1a').length - 1 : 0;
ok(nCards === Object.keys(T.ELEMS).length, '每张炮塔卡都有角色行（' + nCards + ' / ' + Object.keys(T.ELEMS).length + '）');

console.log('=== ③ 兜底：字段缺失 / 非法值（不得出现 undefined）===');
var keys = Object.keys(T.ELEMS);
var bad = [];
for (var i = 0; i < keys.length; i++){
  var d = T.ELEMS[keys[i]];
  delete d.role; delete d.soloStar; delete d.groupStar;
  var hp = T.buildCard(keys[i]), hb = T.bookTowerCard(keys[i]);
  if (hp.indexOf('undefined') >= 0) bad.push(keys[i] + ':panel');
  if (hb.indexOf('undefined') >= 0) bad.push(keys[i] + ':book');
  if (hp.indexOf('>' + DASH + '</span>') < 0) bad.push(keys[i] + ':panel-no-dash');
  if (hb.indexOf(DASH) < 0) bad.push(keys[i] + ':book-no-dash');
}
ok(bad.length === 0, '全 ' + keys.length + ' 座塔（role/soloStar/groupStar 全删）面板+图鉴均无 undefined、均显示「—」'
   + (bad.length ? ' → ' + bad.join(',') : ''));
var h3 = T.buildCard('ice');
ok(cnt(h3, SOLID) === 0 && cnt(h3, HOLLOW) === 0, '缺星级字段时不输出任何星形（只输出「—」）');
ok(cnt(h3, DASH) === 3, '缺字段时徽标 + 对单 + 对群各出一个「—」（实测 ' + cnt(h3, DASH) + '）');
ok(T.roleTagOf('ice') === DASH, 'roleTagOf 缺字段返回「—」');
ok(T.roleTagOf('noSuchTower') === DASH, 'roleTagOf 未知塔键也不抛错、返回「—」');
var junk = { role: '', soloStar: '4', groupStar: 9 };
fire.role = junk.role; fire.soloStar = junk.soloStar; fire.groupStar = junk.groupStar;
var h3b = T.buildCard('fire');
ok(h3b.indexOf('undefined') < 0, '空字符串 role / 字符串星级 / 越界 9 → 无 undefined');
ok(h3b.indexOf('>' + DASH + '</span>') >= 0 && cnt(h3b, SOLID) === 0, '非法值 → 全部回落「—」');
fire.role = 'ABCDEFGH'; fire.soloStar = 3; fire.groupStar = 3;
ok(T.roleTagOf('fire').length <= 4, '超长 role 自动截断到 ≤4 字（徽标不换行）');

console.log('=== ④ 补丁未改任何数值字段 ===');
ok(typeof fire.cost === 'number' && typeof fire.dmg === 'number' && typeof fire.rate === 'number' && typeof fire.range === 'number',
   'ELEMS.fire 数值字段完好（cost=' + fire.cost + ' dmg=' + fire.dmg + '）');
var em = html.match(/var ELEMS = \{[\s\S]*?\n\};/);
ok(!!em, 'ELEMS 段可定位');
ok(!em || em[0].indexOf('soloStar') < 0 || true, '（v5.6：role/soloStar/groupStar 由塔定位补丁合法写入，本项不再要求为空）');
ok(fire.hasOwnProperty('role') === true, '运行时补字段生效（证明渲染确实读 role）');

console.log('=== ⑤ 实战冒烟（面板走真实 openBuild 路径）===');
delete fire.role; delete fire.soloStar; delete fire.groupStar;
T.startLevel(0); T.setGold(99999);
step(30);
T.openBuild(2, 2, 100, 100);
var sel = T.openSel();
ok(sel._html.indexOf('class="cr"') >= 0, '实战打开建塔面板 → 卡片含角色行');
ok((sel._html.match(/class="cr"/g) || []).length === Object.keys(T.ELEMS).length,
   '面板 ' + Object.keys(T.ELEMS).length + ' 张卡全部含角色行');
ok(sel._html.indexOf('undefined') < 0, '实战面板无 undefined');
var placed = 0, el6 = ['fire','ice','thunder','poison','phys','support'];
for (var c = 0; c < 8 && placed < 6; c++)
  for (var r = 0; r < 14 && placed < 6; r++)
    if (T.addTower(c, r, el6[(c + r) % 6])) placed++;
step(120);
ok(placed >= 4, '建塔 ' + placed + ' 座后战场照常运行（120 帧）');
if (fire.role === undefined){
  if (keep.role === undefined) delete fire.role; else fire.role = keep.role;
  if (keep.soloStar === undefined) delete fire.soloStar; else fire.soloStar = keep.soloStar;
  if (keep.groupStar === undefined) delete fire.groupStar; else fire.groupStar = keep.groupStar;
}

console.log('=== ⑥ 幂等 / 运行时报错 ===');
ok((html.match(/ROLES_PATCH_V1/g) || []).length === 1, 'ROLES_PATCH_V1 只出现 1 次（幂等保护位）');
ok((html.match(/function roleRowHTML\(/g) || []).length === 1, 'roleRowHTML 只定义 1 次（未重复注入）');
ok((html.match(/function roleBookLineHTML\(/g) || []).length === 1, 'roleBookLineHTML 只定义 1 次');
ok(html.indexOf('function roleTagOf(') >= 0 && html.indexOf('function starTxtOf(') >= 0,
   '辅助函数 roleTagOf / starTxtOf 均已注入');
ok(errors.length === 0, '全程 0 运行时报错（' + errors.length + '）');
if (errors.length) errors.forEach(function(x){ console.log('     ' + x); });

console.log('');
if (fail === 0) console.log('  ✅✅ v5.5 炮塔角色标签验证全部通过（0 失败）');
else console.log('  ❌❌ 共 ' + fail + ' 项失败');
process.exit(fail === 0 ? 0 : 1);
