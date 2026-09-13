/* ══════════════════════════════════════════════════════════════════════════
 * 03-utils.js —— 通用开关与工具：低画质模式、射程预览、发光封装
 *
 * 来源：game.html 第 1205-1336 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 全局开关 / 工具（A1 路） ================= */
var LOWFX = false;                          // 低画质模式：关闭所有发光（shadowBlur），低端机提帧
function setLowFX(v){ LOWFX = !!v; }        // 设置面板只调这一个接口
function glow(color, blur){                 // 统一发光设置：低画质归零；正常画质半径减半（观感接近、开销大降）
  ctx.shadowColor = color;
  ctx.shadowBlur = LOWFX ? 0 : Math.round(blur * 0.55);
}
var frameDt = 0.016;   // 真实帧间隔（秒）：frame() 每帧写入；draw() 读取（测试台可能先调 draw，故给默认值）

/* —— 射程圈预览状态：建塔/升级面板打开时点亮，hideSel() 清空 —— */
var pvOn = false, pvC = -1, pvR = -1, pvElem = '', pvTower = null, pvLastElem = 'fire';
var pvT = 0;    // 预览专用计时：面板打开时战场冻结（gameT 不动），但射程圈仍要呼吸/流动
function pvAt(c, r, elem, tower){           // 预览目标：建塔=空格(c,r)，升级=已有塔
  pvOn = true; pvC = c; pvR = r; pvElem = elem || ''; pvTower = tower || null;
}
/* 关闭射程预览（建塔/升级面板关闭时由 hideSel() 调用）*/
function pvClear(){ pvOn = false; pvC = -1; pvR = -1; pvElem = ''; pvTower = null; }
/* 这个射程圈能罩住几格路径（玩家真正关心的：能打多远的路） */
function pvCoverCount(c0, r0, rad){
  var n = 0, span = Math.ceil(rad / CELL) + 1;
  for (var dc = -span; dc <= span; dc++){
    for (var dr = -span; dr <= span; dr++){
      var cc = c0 + dc, rr = r0 + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      if (!isPath(cc, rr)) continue;
      var dx = (cc - c0) * CELL, dy = (rr - r0) * CELL;
      if (Math.sqrt(dx * dx + dy * dy) <= rad + CELL * 0.45) n++;
    }
  }
  return n;
}
function pvRGBA(hex, a){                    // #rrggbb → rgba(...)：用于半透明填充
  var h = String(hex).replace('#', '');
  if (h.length === 3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
  var n = parseInt(h, 16) || 0;
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function pvRangePx(elem, tower){            // 射程像素：与 statAt 口径一致（等级/共鸣/BUFFS.range）
  if (tower) return statAt(tower, tower.lv).range * CELL;
  return ELEMS[elem].range * (BUFFS.range || 1) * CELL;
}
/* 画一圈虚线射程环：建塔/升级预览用，虚线随时间流动表示范围生效中 */
function pvRing(x, y, rad, color, alpha, lw, fill){
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3);
  if (fill){ ctx.fillStyle = pvRGBA(color, 0.13); ctx.fill(); }
  ctx.setLineDash([CELL * 0.20, CELL * 0.16]);
  ctx.lineDashOffset = -(pvT * CELL * 0.5) % (CELL * 0.36);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

/* ===== 关卡表（15 关主线）=====
   字段：name 关卡名 · waves 波数 · gold 初始金币 · diff 难度系数（越大越难，敌人血量/数量按它缩放）
        path 敌人路径拐点（格坐标，基地固定在右下角 15,9；相邻拐点必须同行或同列）
        path2 第二入口路径（双入口关才有，敌人会两路同时来）*/
var LEVELS = [
  { name:'1 · 直廊', waves:10, gold:150, diff:0.78,
    path:[[0,1],[14,1],[14,4],[1,4],[1,7],[15,7],[15,9]] },
  { name:'2 · 双弯', waves:12, gold:172, diff:0.95,
    path:[[0,2],[13,2],[13,6],[2,6],[2,9],[15,9]] },
  { name:'3 · 回环', waves:14, gold:138, diff:0.76,
    path:[[0,1],[15,1],[15,4],[2,4],[2,8],[9,8],[9,5],[13,5],[13,9],[15,9]] },
  { name:'4 · 迷宫', waves:16, gold:124, diff:0.78,
    path:[[0,1],[4,1],[4,4],[1,4],[1,7],[7,7],[7,3],[11,3],[11,8],[3,8],[3,9],[15,9]] },
  { name:'5 · 螺旋', waves:18, gold:112, diff:0.70,
    path:[[0,1],[15,1],[15,8],[9,8],[9,3],[2,3],[2,6],[6,6],[6,9],[15,9]] },
  /* ===== v8.4 新增第 6~15 关：波数 20→38、难度递增，路径逐关更长更绕 =====
     （基地固定在右下 (15,9)；每个拐点必须与上一点同行或同列，形成折线路径） */
  { name:'6 · 蛇行', waves:20, gold:218, diff:0.50,
    path:[[0,8],[3,8],[3,1],[7,1],[7,7],[11,7],[11,2],[14,2],[14,9],[15,9]],
    path2:[[0,0],[6,0],[6,4],[12,4],[12,9],[15,9]] }   /* v8.21 双入口：难度按「防守需求翻倍」下调、初始金币上调（同 9/12/15 关口径） */,
  { name:'7 · 回旋镖', waves:22, gold:212, diff:0.52,
    path:[[0,4],[12,4],[12,7],[4,7],[4,2],[15,2],[15,9]],
    path2:[[0,9],[2,9],[2,6],[9,6],[9,9],[15,9]] }   /* v8.21 双入口：难度按「防守需求翻倍」下调、初始金币上调（同 9/12/15 关口径） */,
  { name:'8 · 十字口', waves:24, gold:206, diff:0.53,
    path:[[0,5],[15,5],[15,1],[8,1],[8,8],[3,8],[3,9],[15,9]],
    path2:[[0,0],[4,0],[4,3],[11,3],[11,9],[15,9]] }   /* v8.21 双入口：难度按「防守需求翻倍」下调、初始金币上调（同 9/12/15 关口径） */,
  { name:'9 · 阶梯',  waves:26, gold:205, diff:0.58,   /* v8.10 双入口：要分兵守两路，强度和金币都按「双倍防守需求」补偿（AI 模拟器不会分兵、无法用于校准，待真人实测） */
    path:[[0,0],[2,0],[2,3],[5,3],[5,0],[8,0],[8,3],[11,3],[11,0],[14,0],[14,6],[15,6],[15,9]],
    path2:[[0,9],[5,9],[5,6],[10,6],[10,9],[15,9]] },                       /* v8.10 双入口：下半区另有一条路 */
  { name:'10 · 双螺旋', waves:28, gold:134, diff:1.00,
    path:[[0,1],[13,1],[13,8],[2,8],[2,3],[10,3],[10,6],[5,6],[5,9],[15,9]] },
  { name:'11 · 长城', waves:30, gold:130, diff:1.05,
    path:[[0,9],[0,2],[15,2],[15,6],[3,6],[3,4],[12,4],[12,9],[15,9]] },
  { name:'12 · 交错', waves:32, gold:200, diff:0.64,   /* v8.10 双入口补偿（同上，待实测） */
    path:[[0,3],[5,3],[5,0],[10,0],[10,5],[3,5],[3,8],[8,8],[8,6],[14,6],[14,9],[15,9]],
    path2:[[11,0],[11,3],[15,3],[15,9]] },                                 /* v8.10 双入口：右上角直插基地 */
  { name:'13 · 铁壁', waves:34, gold:122, diff:1.15,
    path:[[0,6],[15,6],[15,3],[2,3],[2,7],[13,7],[13,1],[6,1],[6,9],[15,9]] },
  { name:'14 · 迂回', waves:36, gold:118, diff:1.20,
    path:[[0,2],[9,2],[9,9],[1,9],[1,5],[12,5],[12,8],[6,8],[6,4],[15,4],[15,9]] },
  { name:'15 · 终局', waves:38, gold:192, diff:0.72,   /* v8.10 双入口补偿（同上，待实测） */
    path:[[0,0],[15,0],[15,9],[0,9],[0,4],[8,4],[8,7],[12,7],[12,2],[15,2],[15,9]],
    path2:[[4,9],[4,6],[9,6],[9,2],[14,2],[14,9],[15,9]] },
];
/* 当前关卡下标（0 起）：LEVELS[lvIndex] 就是正在打的那一关；无尽模式借用地形时也用它 */
var lvIndex = 0;
/* 本关主路径的拐点数组（startLevel 里从 LEVELS[lvIndex].path 拷来，敌人按它逐点行进）*/
var WAYPOINTS = LEVELS[0].path;
/* ===== v8.10 多入口（双路径）=====
   毛毛方案里「多入口关卡」那一条。实现方式尽量小侵入：保留 WAYPOINTS 作为主路径，
   另外用 WAYPOINTS2 存第二入口路径；每只敌人在生成时被分配到其中一条，之后只沿自己那条走。
   两条路都通向基地，所以「只堆一边」必然漏怪 —— 这就是双入口带来的空间压力。 */
var WAYPOINTS2 = null;
/* 本关总波数：普通关卡取自关卡表，无尽模式被设成 999 */
var WAVES_TOTAL = 10;
/* 路径格集合（键 'c,r'）：由 buildPath() 生成，用来判断某格是敌人走的路、禁止建塔 */
var pathSet = {};
/* 由当前关卡的路径点生成「路径格」集合 pathSet：标记哪些格子是敌人走的、禁止建塔。切换关卡/进入无尽时调用 */
function buildPath(){
  pathSet = {};
      /* 内部工具：把一条路径的拐点逐格补全成「经过的所有格子」，写入 pathSet（相邻拐点同行或同列）*/
  var markPath = function(list){
    if (!list) return;
    for (var i = 0; i < list.length - 1; i++){
      var a = list[i], b = list[i+1];
      var dx = Math.sign(b[0]-a[0]), dy = Math.sign(b[1]-a[1]);
      var x = a[0], y = a[1];
      pathSet[x + ',' + y] = true;
      while (x !== b[0] || y !== b[1]){ x += dx; y += dy; pathSet[x + ',' + y] = true; }
    }
  };
  markPath(WAYPOINTS);
  markPath(WAYPOINTS2);          /* v8.10：第二条入口路径同样不能建塔 */
  if (typeof buildSlots === 'function') buildSlots();   /* v9.5：路径定了，塔位跟着重算 */
}
buildPath();
/* 判断 (c,r) 是否为敌人路径格：是则不能建塔（建塔点击与鼠标悬停都用它拦截）*/
function isPath(c, r){ return !!pathSet[c + ',' + r]; }

/* ══════════════════════════════════════════════════════════════════════════
 * v9.5 塔位解锁（毛毛要求：格子锁上、只留几个、玩家花钱买、越买越贵）
 *
 * 规则：
 *   · 只有「紧贴路径」的非路径格才算塔位（远处的空地不作为塔位，避免目标太散）
 *   · 每关开局免费解锁离基地最近的 UNLOCK_FREE 个，其余全部锁着
 *   · 点锁定格 → 花金币解锁；每买一个，下一个价格 ×UNLOCK_GROW（本局内递增，换关重置）
 *   · 塔位状态是「本局」状态，不进存档（换关/重开都重新算），所以不会污染老存档
 * ══════════════════════════════════════════════════════════════════════════ */
var unlockSet = {};          /* 已解锁的塔位（键 'c,r'） */
var slotAll = [];            /* 本关全部塔位候选（贴路径的格子，按离基地远近排序） */
var unlockBought = 0;        /* 本局已花钱买过的次数（决定价格递增） */
var UNLOCK_FREE = 6;         /* 开局免费给几个塔位 */
var UNLOCK_BASE = 40;        /* 第一个额外塔位的价格 */
var UNLOCK_GROW = 1.75;      /* 每买一个，价格乘以它 */
var SLOT_MIN_GAP = 2;        /* v9.7：塔位之间至少隔几格（切比雪夫距离），防满屏障碍 */

/* 下一个塔位的解锁价（本局内随购买次数递增） */
function unlockCost(){ return Math.round(UNLOCK_BASE * Math.pow(UNLOCK_GROW, unlockBought)); }
/* 该格是否已解锁（可直接建塔） */
function isUnlocked(c, r){ return !!unlockSet[c + ',' + r]; }
/* v9.5 修补：该格是否「塔位候选」—— 只有贴路径的格子才是塔位。
   毛毛报「点击哪里都解锁」：因为老代码只判断 isUnlocked，远处空地不在候选里、
   自然也不是已解锁 → 被误当成「可购买」处理。这里补上候选判定。 */
function isSlot(c, r){
  for (var i = 0; i < slotAll.length; i++){ if (slotAll[i].c === c && slotAll[i].r === r) return true; }
  return false;
}

/* 重建本关塔位：buildPath() 之后调用（路径变了塔位也就变了） */
function buildSlots(){
  unlockSet = {}; slotAll = []; unlockBought = 0;
  var base = WAYPOINTS && WAYPOINTS.length ? WAYPOINTS[WAYPOINTS.length - 1] : [0, 0];
  for (var c = 0; c < COLS; c++){
    for (var r = 0; r < ROWS; r++){
      if (pathSet[c + ',' + r]) continue;                       /* 路径格不能建塔 */
      var near = pathSet[(c-1)+','+r] || pathSet[(c+1)+','+r] ||
                 pathSet[c+','+(r-1)] || pathSet[c+','+(r+1)];
      if (!near) continue;                                      /* 不贴路径 → 不算塔位 */
      slotAll.push({ c: c, r: r, d: Math.abs(c - base[0]) + Math.abs(r - base[1]) });
    }
  }
  slotAll.sort(function(a, b){ return a.d - b.d || a.c - b.c || a.r - b.r; });
  /* v9.7 稀疏化（毛毛：「障碍太多太密，看着不对」）：
     贴路径的格子本来有九十个上下，全画成障碍就是满地石头树 + 满屏价签。
     这里按「彼此至少隔 SLOT_MIN_GAP 格」筛一遍，留下真正有战术意义的点位，
     数量降到二十来个 —— 既像障碍，也看得出哪儿值得占。 */
  var _sparse = [];
  for (var _i = 0; _i < slotAll.length; _i++){
    var _s = slotAll[_i], _ok = true;
    for (var _j = 0; _j < _sparse.length; _j++){
      var _t2 = _sparse[_j];
      if (Math.max(Math.abs(_t2.c - _s.c), Math.abs(_t2.r - _s.r)) < SLOT_MIN_GAP){ _ok = false; break; }
    }
    if (_ok) _sparse.push(_s);
  }
  slotAll = _sparse;
  for (var i = 0; i < Math.min(UNLOCK_FREE, slotAll.length); i++){
    unlockSet[slotAll[i].c + ',' + slotAll[i].r] = 1;
  }
  bgKey = '';                                                   /* 静态层缓存作废：锁的分布变了 */
}

