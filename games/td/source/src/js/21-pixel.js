/* ══════════════════════════════════════════════════════════════════════════
 * 22-pixel.js —— 像素图标库 + DOM 自动替换层（B 方案 · 2026-09-13）
 *
 * 【为什么要这一层】
 *   游戏里有 400 多个 emoji，但它们 99% 是**数据表里的字段**（{icon:'🔥'} 这种），
 *   真正渲染成界面时才拼进 DOM；canvas 的 fillText 里只有 1 处用 emoji。
 *   所以不需要逐个改那 300 多处数据 —— 只要在**渲染成 DOM 之后**统一替换
 *   文本节点里的 emoji 即可，一次覆盖全游戏：塔、卡牌、图鉴、天气、菜单、结算…
 *
 * 【怎么画的】
 *   每个图标都是代码绘制的【20×20 像素网格】图形（不是 emoji、不是图片素材）：
 *   先在小画布上按 20 格描边，再整数倍放大（关掉平滑），所以边缘是真方块 —— 像素感。
 *   颜色由调用处决定，用 'source-in' 合成给整块图形染色。
 *
 * 【想关掉】删掉本文件 + index.html 里的引用即可，其余代码零改动。
 * ══════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── 图标几何：统一画在 24×24 坐标系里（中心 0,0，半径 ~11），下面再像素化 ── */
var SHAPES = {
  /* 九座塔 */
  fire: function(c){
    c.moveTo(0,-11); c.quadraticCurveTo(6.5,-4, 6,2.5);
    c.quadraticCurveTo(5.5,8.5, 0,9.5); c.quadraticCurveTo(-5.5,8.5, -6,2.5);
    c.quadraticCurveTo(-6.5,-4, 0,-11); c.closePath();
    c.moveTo(0,-3); c.quadraticCurveTo(2.8,1.5, 0,6.2); c.quadraticCurveTo(-2.8,1.5, 0,-3); c.closePath();
  },
  ice: function(c){
    for (var i=0;i<6;i++){ var a=i*Math.PI/3, dx=Math.cos(a), dy=Math.sin(a);
      c.moveTo(0,0); c.lineTo(dx*11,dy*11);
      c.moveTo(dx*4.5,dy*4.5); c.lineTo(dx*4.5-dy*3.2, dy*4.5+dx*3.2);
      c.moveTo(dx*4.5,dy*4.5); c.lineTo(dx*4.5+dy*3.2, dy*4.5-dx*3.2);
      c.moveTo(dx*8,dy*8);   c.lineTo(dx*8-dy*2.4, dy*8+dx*2.4);
      c.moveTo(dx*8,dy*8);   c.lineTo(dx*8+dy*2.4, dy*8-dx*2.4);
    }
  },
  bolt: function(c){
    c.moveTo(-2,-11); c.lineTo(7.5,-11); c.lineTo(2.5,-2.5);
    c.lineTo(8.5,-2.5); c.lineTo(-4.5,11); c.lineTo(0.5,1.5); c.lineTo(-6,1.5); c.closePath();
  },
  poison: function(c){
    c.moveTo(-8,-2.5); c.quadraticCurveTo(-8,-11, 0,-11); c.quadraticCurveTo(8,-11, 8,-2.5);
    c.lineTo(8,3.5); c.lineTo(4.5,3.5); c.lineTo(4.5,7.5);
    c.lineTo(-4.5,7.5); c.lineTo(-4.5,3.5); c.lineTo(-8,3.5); c.closePath();
    c.moveTo(-1.2,-4.2); c.arc(-3.6,-4.2,2.4,0,6.284);
    c.moveTo(6,-4.2);    c.arc(3.6,-4.2,2.4,0,6.284);
  },
  phys: function(c){ c.rect(-10,-9.5,20,7.5); c.rect(-2.5,-2,5,11.5); },
  aura: function(c){
    c.moveTo(0,-11); c.lineTo(9,-7.5); c.lineTo(9,1);
    c.quadraticCurveTo(9,8, 0,11); c.quadraticCurveTo(-9,8, -9,1);
    c.lineTo(-9,-7.5); c.closePath();
    c.moveTo(-2.4,-1); c.lineTo(2.4,-1); c.moveTo(0,-3.4); c.lineTo(0,1.4);
  },
  snipe: function(c){
    c.moveTo(7.5,0); c.arc(0,0,7.5,0,6.284);
    c.moveTo(11,0);  c.arc(0,0,11,0,6.284);
    c.moveTo(-11.5,0); c.lineTo(-5,0); c.moveTo(5,0); c.lineTo(11.5,0);
    c.moveTo(0,-11.5); c.lineTo(0,-5); c.moveTo(0,5); c.lineTo(0,11.5);
    c.moveTo(1.6,0); c.arc(0,0,1.6,0,6.284);
  },
  bomb: function(c){
    c.moveTo(0,-11); c.quadraticCurveTo(5.2,-6.5, 5.2,2.5);
    c.lineTo(5.2,7.5); c.lineTo(-5.2,7.5); c.lineTo(-5.2,2.5);
    c.quadraticCurveTo(-5.2,-6.5, 0,-11); c.closePath();
    c.moveTo(-8.5,-3.5); c.lineTo(8.5,-3.5);
  },
  mg: function(c){
    for (var i=-1;i<=1;i++){ var x=i*7;
      c.moveTo(x-2.4,-10); c.lineTo(x+2.4,-10); c.lineTo(x+2.4,1.5);
      c.lineTo(x,7.5); c.lineTo(x-2.4,1.5); c.closePath();
    }
  },
  /* 界面通用 */
  coin:  function(c){ c.moveTo(11,0); c.arc(0,0,11,0,6.284); c.moveTo(5,0); c.arc(0,0,5,0,6.284); },
  star:  function(c){ for(var i=0;i<5;i++){ var a=-Math.PI/2+i*2.513;
             c.moveTo(0,0); c.lineTo(11*Math.cos(a),11*Math.sin(a));
             c.lineTo(11*Math.cos(a+1.257),11*Math.sin(a+1.257)); } },
  trophy:function(c){ c.moveTo(-7,-10); c.lineTo(7,-10); c.lineTo(5,1); c.lineTo(-5,1); c.closePath();
             c.moveTo(-7,-8); c.quadraticCurveTo(-12,-6,-7,-1);
             c.moveTo(7,-8);  c.quadraticCurveTo(12,-6,7,-1);
             c.moveTo(0,1); c.lineTo(0,7); c.moveTo(-5,7); c.lineTo(5,7); c.moveTo(-6,10); c.lineTo(6,10); },
  lock:  function(c){ c.rect(-8,-1,16,11);
             c.moveTo(-5,-1); c.lineTo(-5,-6); c.quadraticCurveTo(-5,-11,0,-11);
             c.quadraticCurveTo(5,-11,5,-6); c.lineTo(5,-1); },
  check: function(c){ c.moveTo(-10,1); c.lineTo(-3,8); c.lineTo(10,-8); },
  shield:function(c){ c.moveTo(0,-11); c.lineTo(9,-7.5); c.lineTo(9,1);
             c.quadraticCurveTo(9,8, 0,11); c.quadraticCurveTo(-9,8, -9,1); c.lineTo(-9,-7.5); c.closePath(); },
  book:  function(c){ c.moveTo(0,-8); c.quadraticCurveTo(-5,-10.5,-10,-8.5); c.lineTo(-10,8.5);
             c.quadraticCurveTo(-5,6.5,0,9); c.quadraticCurveTo(5,6.5,10,8.5); c.lineTo(10,-8.5);
             c.quadraticCurveTo(5,-10.5,0,-8); c.closePath(); c.moveTo(0,-8); c.lineTo(0,9); },
  page:  function(c){ c.moveTo(-8,-11); c.lineTo(4,-11); c.lineTo(8,-7); c.lineTo(8,11); c.lineTo(-8,11); c.closePath();
             c.moveTo(4,-11); c.lineTo(4,-7); c.lineTo(8,-7);
             c.moveTo(-4,-2); c.lineTo(4,-2); c.moveTo(-4,3); c.lineTo(4,3); },
  calendar:function(c){ c.rect(-9.5,-7.5,19,16); c.moveTo(-9.5,-2); c.lineTo(9.5,-2);
             c.moveTo(-5.5,-11); c.lineTo(-5.5,-7.5); c.moveTo(5.5,-11); c.lineTo(5.5,-7.5);
             c.moveTo(-5,3); c.lineTo(5,3); },
  grad:  function(c){ c.moveTo(0,-10); c.lineTo(11,-4); c.lineTo(0,2); c.lineTo(-11,-4); c.closePath();
             c.moveTo(-6,-0.5); c.lineTo(-6,6); c.quadraticCurveTo(0,9.5,6,6); c.lineTo(6,-0.5); },
  galax: function(c){ c.moveTo(11,0); c.arc(0,0,11,0,6.284);
             c.moveTo(1.5,-8); c.lineTo(4,4); c.moveTo(1.5,-8); c.lineTo(-4.5,2);
             c.moveTo(-8,-1); c.lineTo(-2,3); c.moveTo(8,6); c.lineTo(3,8); },
  inf:   function(c){ c.moveTo(-1,0); c.arc(-5,0,5,0,6.284);
             c.moveTo(9,0); c.arc(5,0,5,0,6.284); },
  cloud: function(c){ c.moveTo(-4,-1); c.arc(-4,-3,4.5,0,6.284);
             c.moveTo(2,-2); c.arc(2,-3,5.5,0,6.284);
             c.moveTo(-11,3); c.lineTo(9,3); },
  disk:  function(c){ c.rect(-11,-11,22,22); c.rect(-5,-2,10,11);
             c.moveTo(-6,-11); c.lineTo(-6,-5); c.lineTo(6,-5); c.lineTo(6,-11); },
  cart:  function(c){ c.moveTo(-11,-8); c.lineTo(-7,-8); c.lineTo(-3,4); c.lineTo(8,4);
             c.lineTo(11,-4); c.lineTo(-6,-4);
             c.moveTo(1.6,8); c.arc(0,8,1.6,0,6.284); c.moveTo(7.6,8); c.arc(6,8,1.6,0,6.284); },
  map:   function(c){ c.rect(-10,-8,20,16); c.moveTo(-10,-2.5); c.lineTo(-3.5,-2.5); c.lineTo(-3.5,2.5);
             c.lineTo(3.5,2.5); c.lineTo(3.5,-2.5); c.lineTo(10,-2.5); c.moveTo(-6,-8); c.lineTo(-6,-11.5); },
  refresh:function(c){ c.moveTo(7,-7); c.arc(0,0,10,-0.9,4.2);
             c.moveTo(-8,-7.5); c.lineTo(-7.5,-2.5); c.lineTo(-2.8,-3.6); },
  gear:  function(c){ for(var i=0;i<6;i++){ var a=i*Math.PI/3+0.26;
             c.moveTo(5.6*Math.cos(a),5.6*Math.sin(a)); c.lineTo(10*Math.cos(a),10*Math.sin(a)); }
             c.moveTo(7.5,0); c.arc(0,0,7.5,0,6.284); c.moveTo(3,0); c.arc(0,0,3,0,6.284); },
  play:  function(c){ c.moveTo(-6,-9.5); c.lineTo(8.5,0); c.lineTo(-6,9.5); c.closePath(); },
  pause: function(c){ c.rect(-7,-9,5,18); c.rect(2,-9,5,18); },
  help:  function(c){ c.moveTo(-4.5,-4.5); c.quadraticCurveTo(-4.5,-9,0,-9);
             c.quadraticCurveTo(5,-9,5,-4); c.quadraticCurveTo(5,0.5,0,1.5); c.lineTo(0,5);
             c.moveTo(1.7,8.5); c.arc(0,8.5,1.7,0,6.284); },
  heart: function(c){ c.moveTo(0,9); c.quadraticCurveTo(-11,1,-11,-4);
             c.quadraticCurveTo(-11,-10,-5.5,-10); c.quadraticCurveTo(-1.5,-10,0,-5);
             c.quadraticCurveTo(1.5,-10,5.5,-10); c.quadraticCurveTo(11,-10,11,-4);
             c.quadraticCurveTo(11,1,0,9); },
  wave:  function(c){ c.moveTo(0,-9); c.quadraticCurveTo(6,-2,0,5); c.quadraticCurveTo(-6,-2,0,-9);
             c.moveTo(0,5); c.lineTo(0,11); c.moveTo(-6,11); c.lineTo(6,11); },
  skill: function(c){ for(var i=0;i<4;i++){ var a=i*Math.PI/2;
             c.moveTo(9*Math.cos(a),9*Math.sin(a)); c.lineTo(11.5*Math.cos(a),11.5*Math.sin(a)); }
             c.moveTo(7,0); c.arc(0,0,7,0,6.284); },
  card:  function(c){ c.rect(-8,-11,16,22); c.moveTo(-4,-5); c.lineTo(4,-5); c.moveTo(-4,0); c.lineTo(4,0); c.moveTo(-4,5); c.lineTo(2,5); },
  dice:  function(c){ c.rect(-9,-9,18,18); c.moveTo(-3.5,-3.5); c.arc(-3.5,-3.5,1.8,0,6.284);
             c.moveTo(5.3,3.5); c.arc(3.5,3.5,1.8,0,6.284); },
  plus:  function(c){ c.moveTo(-9,0); c.lineTo(9,0); c.moveTo(0,-9); c.lineTo(0,9); },
  up:    function(c){ c.moveTo(0,-9); c.lineTo(8,2); c.lineTo(-8,2); c.closePath(); },
  down:  function(c){ c.moveTo(0,9); c.lineTo(8,-2); c.lineTo(-8,-2); c.closePath(); }
};

/* ── emoji → 图标名（覆盖游戏里实际用到的全部）── */
var MAP = {
  '🔥':'fire','❄️':'ice','❄':'ice','⚡':'bolt','☠️':'poison','☠':'poison','💥':'bomb','🔨':'phys','📡':'aura','🎯':'snipe','🔫':'mg',
  '💰':'coin','💵':'coin','🪙':'coin','🌟':'star','⭐':'star','✨':'star','🏆':'trophy','🔒':'lock','🔓':'lock',
  '✅':'check','✔️':'check','☑️':'check','🛡️':'shield','🛡':'shield',
  '📖':'book','📚':'book','📄':'page','📝':'page','📅':'calendar','🎓':'grad','🌌':'galax','♾️':'inf','♾':'inf',
  '🌤️':'cloud','🌤':'cloud','💾':'disk','🛒':'cart','🗺️':'map','🗺':'map','🔄':'refresh','⚙️':'gear','⚙':'gear',
  '▶️':'play','▶':'play','⏸️':'pause','⏸':'pause','❓':'help','❔':'help','💛':'heart','❤️':'heart','❤':'heart',
  '🌊':'wave','🌀':'wave','🧩':'card','🎴':'card','🎲':'dice','➕':'plus','⬆️':'up','🔺':'up','🔻':'down','🔽':'down'
};

var CACHE = {}, CACHE_ORDER = [];

/* ── 渲染：小网格描边 → 整数倍放大 → 染色 → dataURL ── */
function render(name, size, color){
  if (!SHAPES[name]) return null;
  color = color || '#bb9cff';
  size = size || 40;
  var key = name + '|' + size + '|' + color;
  if (CACHE[key]) return CACHE[key];

  var N = 20;                                  /* 像素网格：20×20 */
  var t = document.createElement('canvas'); t.width = t.height = N;
  var tc = t.getContext('2d');
  tc.save(); tc.translate(N/2, N/2); tc.scale(N/24, N/24);
  tc.lineJoin = 'miter'; tc.lineCap = 'butt'; tc.lineWidth = 2.8; tc.strokeStyle = '#fff';
  tc.beginPath(); SHAPES[name](tc); tc.stroke(); tc.restore();

  var cv = document.createElement('canvas'); cv.width = cv.height = size;
  var c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(t, 0, 0, N, N, 0, 0, size, size);
  c.globalCompositeOperation = 'source-in';    /* 整块染色 */
  c.fillStyle = color; c.fillRect(0, 0, size, size);

  var url = cv.toDataURL();
  CACHE[key] = url; CACHE_ORDER.push(key);
  if (CACHE_ORDER.length > 200){ delete CACHE[CACHE_ORDER.shift()]; }
  return url;
}

/* 图标配色：v9.3 起「一个图标一个颜色」——
   之前 17 个图标共用 #bb9cff、6 个共用 #e6b95c，整版图标看起来就是「一片紫」；
   毛毛的原话是「美术会从彩色卡成紫色」。现在按语义给每个图标独立色，既好认又丰富。 */
var COLOR = {
  /* 九座塔：元素语义色，必须一眼区分 */
  fire:'#ff7a45', ice:'#5ad2f0', bolt:'#ffd23f', poison:'#7ed957', phys:'#c8b8a0',
  aura:'#b48cff', snipe:'#ff6b9d', bomb:'#ff9f45', mg:'#8fb8d8',
  /* 货币与荣誉：金橙系 */
  coin:'#ffd23f', star:'#ffc93c', trophy:'#ffb347', grad:'#e8c44a', cart:'#ffc04d',
  /* 正向反馈：绿系 */
  check:'#5ad48a', plus:'#7fe0a0', up:'#8fdf6a', play:'#66d98a', disk:'#8fd48a', map:'#6fd06f',
  /* 信息与冷色：青蓝系 */
  shield:'#5ad2f0', inf:'#6fb8e8', cloud:'#a8d8f0', refresh:'#66d9e8', wave:'#7fd8e8', ice2:'#7fd4e8',
  /* 道具与中性：紫/橙/灰各不同 */
  lock:'#9a94b8', gear:'#a89cc8', page:'#e0d8f0', book:'#f0a060', calendar:'#ff8a65',
  galax:'#9b7fff', help:'#c8a8ff', card:'#d0a8ff', dice:'#ffb86b', pause:'#e6c85a',
  /* 警示 */
  down:'#ff6b5a', heart:'#ff5c8a'
};
function colorOf(name){ return COLOR[name] || '#bb9cff'; }

/* ── DOM 替换 ── */
var KEYS = Object.keys(MAP).sort(function(a,b){ return b.length - a.length; });
var RE = new RegExp('(' + KEYS.map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }).join('|') + ')', 'g');

function pxify(root){
  if (!root) return;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  var hit = [], n;
  while ((n = walker.nextNode())) {
    var v = n.nodeValue;
    if (!v || !v.length) continue;
    RE.lastIndex = 0;
    if (RE.test(v)) hit.push(n);
  }
  RE.lastIndex = 0;
  for (var i=0;i<hit.length;i++){
    var tn = hit[i], txt = tn.nodeValue;
    RE.lastIndex = 0;
    var parts = txt.split(RE);
    if (parts.length < 2) continue;
    var frag = document.createDocumentFragment();
    for (var j=0;j<parts.length;j++){
      var p = parts[j];
      if (!p) continue;
      if (MAP[p]) {
        var src = render(MAP[p], 44, colorOf(MAP[p]));
        var img = document.createElement('img');
        img.className = 'pxi';
        img.src = src; img.alt = p;
        frag.appendChild(img);
      } else {
        frag.appendChild(document.createTextNode(p));
      }
    }
    if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
  }
}

/* ── v9.1 性能：游戏里金币/波次之类的文本每帧都在变，若每次变动都全树扫描会卡。
   改成「攒到下一帧统一处理」，一帧最多扫一次；并只监听 childList（设置 textContent
   同样会产生 childList 变动），不再监听 characterData，触发次数再降一档。 ── */
var pxPending = [], pxRaf = 0;
function pxFlush(){
  pxRaf = 0;
  var list = pxPending; pxPending = [];
  for (var i = 0; i < list.length; i++){
    try { pxify(list[i]); } catch (e) {}
  }
}
function pxSchedule(root){
  if (!root) return;
  if (pxPending.indexOf(root) < 0) pxPending.push(root);
  if (pxRaf) return;
  pxRaf = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame(pxFlush) : setTimeout(pxFlush, 16);
}

/* ── 启动：先扫一遍，再用 MutationObserver 跟进后续动态内容 ── */
function boot(){
  try { pxify(document.body); } catch(e){}
  if (typeof MutationObserver === 'undefined') return;
  var mo = new MutationObserver(function(muts){
    /* v9.3：改回「同步替换」。之前为了省性能改成攒到下一帧，结果游戏一卡顿
       （帧率掉到 10fps）emoji 会明显露出 100ms 以上 —— 毛毛看到的「卡一下美术就没了」就是这个。
       同步只处理「本次新增的节点」，量很小，不会拖慢。 */
    for (var i=0;i<muts.length;i++){
      var m = muts[i];
      if (m.type !== 'childList') continue;
      for (var j=0;j<m.addedNodes.length;j++){
        var nd = m.addedNodes[j];
        try {
          if (nd.nodeType === 1) pxify(nd);
          else if (nd.nodeType === 3 && nd.parentNode) pxify(nd.parentNode);
        } catch (e) {}
      }
    }
  });
  try { mo.observe(document.body, { childList:true, subtree:true }); } catch(e){}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* 暴露出去，方便别处直接画到 canvas 上 */
window.PXI = { render: render, pxify: pxify, colorOf: colorOf, SHAPES: SHAPES, MAP: MAP };
})();
