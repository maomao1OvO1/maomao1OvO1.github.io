# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 三个关卡加第二入口（双入口关卡）
rep("""  { name:'9 · 阶梯',  waves:26, gold:138, diff:0.96,
    path:[[0,0],[2,0],[2,3],[5,3],[5,0],[8,0],[8,3],[11,3],[11,0],[14,0],[14,6],[15,6],[15,9]] },""",
"""  { name:'9 · 阶梯',  waves:26, gold:138, diff:0.96,
    path:[[0,0],[2,0],[2,3],[5,3],[5,0],[8,0],[8,3],[11,3],[11,0],[14,0],[14,6],[15,6],[15,9]],
    path2:[[0,9],[5,9],[5,6],[10,6],[10,9],[15,9]] },                       /* v8.10 双入口：下半区另有一条路 */""", '第9关双入口')
rep("""  { name:'12 · 交错', waves:32, gold:126, diff:1.10,
    path:[[0,3],[5,3],[5,0],[10,0],[10,5],[3,5],[3,8],[8,8],[8,6],[14,6],[14,9],[15,9]] },""",
"""  { name:'12 · 交错', waves:32, gold:126, diff:1.10,
    path:[[0,3],[5,3],[5,0],[10,0],[10,5],[3,5],[3,8],[8,8],[8,6],[14,6],[14,9],[15,9]],
    path2:[[11,0],[11,3],[15,3],[15,9]] },                                 /* v8.10 双入口：右上角直插基地 */""", '第12关双入口')
rep("""  { name:'15 · 终局', waves:38, gold:112, diff:1.26,
    path:[[0,0],[15,0],[15,9],[0,9],[0,4],[8,4],[8,7],[12,7],[12,2],[15,2],[15,9]] },""",
"""  { name:'15 · 终局', waves:38, gold:112, diff:1.26,
    path:[[0,0],[15,0],[15,9],[0,9],[0,4],[8,4],[8,7],[12,7],[12,2],[15,2],[15,9]],
    path2:[[4,9],[4,6],[9,6],[9,2],[14,2],[14,9],[15,9]] },""", '第15关双入口')

# ② 第二路径变量 + 构建（两条路都算「路径格」，都不能建塔）
rep("""var WAYPOINTS = LEVELS[0].path;""",
"""var WAYPOINTS = LEVELS[0].path;
/* ===== v8.10 多入口（双路径）=====
   毛毛方案里「多入口关卡」那一条。实现方式尽量小侵入：保留 WAYPOINTS 作为主路径，
   另外用 WAYPOINTS2 存第二入口路径；每只敌人在生成时被分配到其中一条，之后只沿自己那条走。
   两条路都通向基地，所以「只堆一边」必然漏怪 —— 这就是双入口带来的空间压力。 */
var WAYPOINTS2 = null;""", '第二路径变量')
rep("""function buildPath(){
  pathSet = {};
  for (var i = 0; i < WAYPOINTS.length - 1; i++){
    var a = WAYPOINTS[i], b = WAYPOINTS[i+1];
    var dx = Math.sign(b[0]-a[0]), dy = Math.sign(b[1]-a[1]);
    var x = a[0], y = a[1];
    pathSet[x + ',' + y] = true;
    while (x !== b[0] || y !== b[1]){ x += dx; y += dy; pathSet[x + ',' + y] = true; }
  }
}""",
"""function buildPath(){
  pathSet = {};
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
}""", 'buildPath 支持双路径')

# ③ 航点/长度查询支持路径索引
rep("function waypointPx(i){ var w = WAYPOINTS[i]; return w ? { x: cx(w[0]), y: cy(w[1]) } : null; }",
    "function waypointPx(i, pi){\n  var list = (pi === 1) ? WAYPOINTS2 : WAYPOINTS;      /* v8.10：pi=1 走第二入口 */\n  var w = list ? list[i] : null;\n  return w ? { x: cx(w[0]), y: cy(w[1]) } : null;\n}", 'waypointPx 支持路径索引')
rep("""function pathLenToWp(i){
  var s = 0;
  for (var k = 0; k < i && k < WAYPOINTS.length - 1; k++){
    var a = waypointPx(k), b = waypointPx(k + 1);""",
"""function pathLenToWp(i, pi){
  var list = (pi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;   /* v8.10 */
  var s = 0;
  for (var k = 0; k < i && k < list.length - 1; k++){
    var a = waypointPx(k, pi), b = waypointPx(k + 1, pi);""", 'pathLenToWp 支持路径索引')

# ④ 生成敌人：随机分配到两条入口之一
rep("""  var p0 = waypointPx(0), p1 = waypointPx(1);""",
"""  var pi = (WAYPOINTS2 && Math.random() < 0.5) ? 1 : 0;      /* v8.10：随机从两条入口之一登场 */
  var p0 = waypointPx(0, pi), p1 = waypointPx(1, pi);""", '敌人分配入口')
rep("    totalPath: pathLenToWp(WAYPOINTS.length - 1) || 1            // 本关路径总长（像素）：自爆兵算路程进度用",
    "    pathIdx: pi,                                                // v8.10：本敌走哪条入口\n    totalPath: pathLenToWp((pi === 1 ? WAYPOINTS2.length - 1 : WAYPOINTS.length - 1), pi) || 1   // 本关路径总长（像素）：自爆兵算路程进度用", '敌人路径字段')
rep("""    var total2 = pathLenToWp(WAYPOINTS.length - 1) || 1, target2 = total2 * 0.45, wpi2 = 0;
    for (var k3 = 0; k3 < WAYPOINTS.length - 1; k3++){
      if (pathLenToWp(k3 + 1) >= target2){ wpi2 = k3 + 1; break; }
    }
    var pp2 = waypointPx(wpi2), eDrop = enemies[enemies.length - 1];
    if (pp2 && eDrop){ eDrop.x = pp2.x; eDrop.y = pp2.y; eDrop.wp = wpi2; eDrop.done = pathLenToWp(wpi2); }""",
"""    var _pl = (pi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;
    var total2 = pathLenToWp(_pl.length - 1, pi) || 1, target2 = total2 * 0.45, wpi2 = 0;
    for (var k3 = 0; k3 < _pl.length - 1; k3++){
      if (pathLenToWp(k3 + 1, pi) >= target2){ wpi2 = k3 + 1; break; }
    }
    var pp2 = waypointPx(wpi2, pi), eDrop = enemies[enemies.length - 1];
    if (pp2 && eDrop){ eDrop.x = pp2.x; eDrop.y = pp2.y; eDrop.wp = wpi2; eDrop.done = pathLenToWp(wpi2, pi); }""", '空降兵按自身路径')

# ⑤ 行进：按敌人自己的路径取下一个航点
rep("""    var tgt = waypointPx(e.wp + 1);""",
"""    var tgt = waypointPx(e.wp + 1, e.pathIdx || 0);       /* v8.10：沿自己那条入口前进 */""", '行进按路径')
rep("""  var nx2 = waypointPx((wp || 0) + 1) || { x: x, y: y };""",
"""  var nx2 = waypointPx((wp || 0) + 1) || { x: x, y: y };""", '占位')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.10 多入口补丁（第一批）完成 ---')
