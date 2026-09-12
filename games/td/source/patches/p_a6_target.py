#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.2 索敌逻辑：优先离基地最近，其次血量最低
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        print('❌ [%s] 命中 %d 次（期望 %d）' % (tag, n, expect)); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 敌人新增「已走路径距离」字段
sub("""    wp: 0, x: p0.x + (Math.random()-0.5)*CELL*0.9, y: p0.y + (Math.random()-0.5)*CELL*0.4,""",
    """    wp: 0, done: 0, x: p0.x + (Math.random()-0.5)*CELL*0.9, y: p0.y + (Math.random()-0.5)*CELL*0.4,""", 'spawnEnemy 加 done 字段')

# ② 移动时累计已走路程
sub("""    var step = e.speed * e.slowF * dt;
    if (dist <= step){ e.x = tgt.x; e.y = tgt.y; e.wp++; }
    else { e.x += dx / dist * step; e.y += dy / dist * step; e.dir = Math.atan2(dy, dx); }""",
    """    var step = e.speed * e.slowF * dt;
    if (dist <= step){ e.done = (e.done || 0) + dist; e.x = tgt.x; e.y = tgt.y; e.wp++; }
    else { e.done = (e.done || 0) + step; e.x += dx / dist * step; e.y += dy / dist * step; e.dir = Math.atan2(dy, dx); }""", 'updateEnemies 累计路程')

# ③ 索敌：离基地近优先，其次血量低
sub("""      var prog = e.wp * 10000 - Math.hypot(cx(t.c) - e.x, cy(t.r) - e.y);
      if (prog > bestProg){ bestProg = prog; best = e; }""",
    """      /* 索敌优先级：
         ① 先打「离基地最近」的（累计已走路程 done 越大 = 离终点越近，漏掉最危险）
         ② 路程相同时打「血量最低」的（补刀优先，防止残血怪溜过去）
         done 乘 1e6 保证路程差严格压过血量差（血量最多约 1200） */
      var prog = (e.done || 0) * 1e6 - e.hp;
      if (prog > bestProg){ bestProg = prog; best = e; }""", '索敌主逻辑')

# ④ 中途召唤出来的敌人补齐路径进度（否则会被当成「刚出生」排到最后）
sub("""var pendingSpawn = [];
function spawnEnemyAt(type, x, y, wp){""",
    """var pendingSpawn = [];
/* 第 i 个航点之前的累计路程（像素）：给中途生成的召唤物补齐路径进度 */
function pathLenToWp(i){
  var s = 0;
  for (var k = 0; k < i && k < WAYPOINTS.length - 1; k++){
    var a = waypointPx(k), b = waypointPx(k + 1);
    if (a && b) s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}
function spawnEnemyAt(type, x, y, wp){""", 'pathLenToWp 工具函数')

sub("""  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.spawnT = 0.36;""",
    """  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.done = pathLenToWp(e.wp);                        // 索敌排序用：与 BOSS 进度一致
  e.spawnT = 0.36;""", '召唤物补齐 done')

io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a6_target 完成 →', P)
