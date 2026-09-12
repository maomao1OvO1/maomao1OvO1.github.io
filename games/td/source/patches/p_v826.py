# -*- coding: utf-8 -*-
# v8.26 修毛毛报的两个 bug：
#   ① 召唤物/分裂幼体「不在轨道上乱跑」—— spawnEnemyAt 沿用了父级的位置，但入口(pathIdx)是重新随机的
#   ② 「退出商店会刷新」—— 商店的离开按钮调 showBuffChoices() 会重抽 3 张（v8.12 修过同类，这里漏了）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ═══════ ① 召唤物必须继承父级的入口（第二条路不能再随机）═══════
rep('''function spawnEnemyAt(type, x, y, wp){
  var n0 = enemies.length;
  spawnEnemy(type);                                  // spawnEnemy 无返回值，用长度差取回新对象
  if (enemies.length <= n0) return null;
  var e = enemies[enemies.length - 1];
  /* 召唤物同样沿路径方向错开（用召唤点所在段的下一航点方向），避免横向乱散 */
  var nx2 = waypointPx((wp || 0) + 1) || { x: x, y: y };
  var angS = Math.atan2(nx2.y - y, nx2.x - x);
  var offS = (Math.random() - 0.5) * CELL * 0.6;
  e.x = x + Math.cos(angS) * offS;
  e.y = y + Math.sin(angS) * offS;
  var lastWp = WAYPOINTS.length - 2; if (lastWp < 0) lastWp = 0;
  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.done = pathLenToWp(e.wp);                        // 索敌排序用：与 BOSS 进度一致
  e.spawnT = 0.36;
  return e;
}
function flushPendingSpawn(){
  if (!pendingSpawn.length) return;
  for (var i = 0; i < pendingSpawn.length; i++){
    var q = pendingSpawn[i];
    for (var k = 0; k < q.n; k++) spawnEnemyAt(q.type, q.x, q.y, q.wp);
  }
  pendingSpawn.length = 0;
}''',
'''function spawnEnemyAt(type, x, y, wp, pi){
  var n0 = enemies.length;
  spawnEnemy(type);                                  // spawnEnemy 无返回值，用长度差取回新对象
  if (enemies.length <= n0) return null;
  var e = enemies[enemies.length - 1];
  /* ===== v8.26 修毛毛报的「打爆之后乱跑、不在轨道上」=====
     根因：spawnEnemy 内部会**随机**分配入口（`pi = WAYPOINTS2 && Math.random()<0.5 ? 1 : 0`），
     但这里的生成位置 (x,y) 是**父级（分裂虫 / BOSS）所在的那一条路**。
     于是当双入口地图上父级走在第二条路、而召唤物被随机分到第一条路时，
     它就会从当前位置**斜穿到另一条路**去找自己的航点 —— 视觉上就是「脱离轨道乱跑」。
     修法：强制继承父级入口（pi），并且方向推算、路径长度、进度换算全部按同一条路算。 */
  var myPi = (typeof pi === 'number' && pi === 1 && WAYPOINTS2) ? 1 : 0;
  var myList = (myPi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;
  e.pathIdx = myPi;
  /* 召唤物同样沿路径方向错开（用召唤点所在段的下一航点方向），避免横向乱散 */
  var nx2 = waypointPx((wp || 0) + 1, myPi) || { x: x, y: y };
  var angS = Math.atan2(nx2.y - y, nx2.x - x);
  var offS = (Math.random() - 0.5) * CELL * 0.6;
  e.x = x + Math.cos(angS) * offS;
  e.y = y + Math.sin(angS) * offS;
  var lastWp = myList.length - 2; if (lastWp < 0) lastWp = 0;
  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.done = pathLenToWp(e.wp, myPi);                  // 索敌排序用：与 BOSS 进度一致
  e.totalPath = pathLenToWp(myList.length - 1, myPi) || 1;   // 自爆兵算路程进度也要用同一条路
  e.spawnT = 0.36;
  return e;
}
function flushPendingSpawn(){
  if (!pendingSpawn.length) return;
  for (var i = 0; i < pendingSpawn.length; i++){
    var q = pendingSpawn[i];
    for (var k = 0; k < q.n; k++) spawnEnemyAt(q.type, q.x, q.y, q.wp, q.pi);   /* v8.26：把入口一起传下去 */
  }
  pendingSpawn.length = 0;
}''',
    '召唤物继承父级入口')

# 两处入队都要带上入口
rep("""    pendingSpawn.push({ type: 'spawn2', x: e.x, y: e.y, wp: e.wp, n: 2 });""",
    """    pendingSpawn.push({ type: 'spawn2', x: e.x, y: e.y, wp: e.wp, n: 2, pi: e.pathIdx || 0 });   /* v8.26：带上分裂虫所在入口 */""",
    '分裂虫入队带入口')
rep("""      pendingSpawn.push({ type: 'normal', x: e.x, y: e.y, wp: e.wp, n: 2 });""",
    """      pendingSpawn.push({ type: 'normal', x: e.x, y: e.y, wp: e.wp, n: 2, pi: e.pathIdx || 0 });   /* v8.26：带上 BOSS 所在入口 */""",
    'BOSS 召唤入队带入口')

# ═══════ ② 退出商店不能重抽 ═══════
rep('''function showBuffChoices(excludeIds){
  running = false; paused = true;
  setSkipBtnVisible(true);            /* v8.12：强化卡界面才显示「跳过」，并且它是唯一可用的场景 */
  var picks = pickBuffs(3, excludeIds);
  curPicks = picks.slice();''',
'''function showBuffChoices(excludeIds, reuse){
  running = false; paused = true;
  setSkipBtnVisible(true);            /* v8.12：强化卡界面才显示「跳过」，并且它是唯一可用的场景 */
  /* v8.26 修毛毛报的「退出商店也会刷新」：从商店回来时必须**沿用原来的 3 张**，
     不能重抽（v8.12 修的「禁一张进出会重抽」是同一个坑，当时只改了禁卡那条路径）。
     reuse=true 且手上已有卡 → 原样渲染；其余情况才真的抽新卡。 */
  if (!reuse || !curPicks || !curPicks.length) curPicks = pickBuffs(3, excludeIds).slice();
  var picks = curPicks;''',
    'showBuffChoices 支持复用原卡')

rep('''  lv.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    showBuffChoices();
  });''',
'''  lv.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    showBuffChoices(undefined, true);   /* v8.26：回去看**原来那 3 张**，绝不重抽（毛毛报的 bug）*/
  });''',
    '商店离开改为复用原卡')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.26 两个 bug 已修')
