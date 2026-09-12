# -*- coding: utf-8 -*-
# v8.22 修毛毛报的两个 bug：
#   ① 双入口地图只有一条路有流动光点（流动能量带只画了 WAYPOINTS，漏了 WAYPOINTS2）
#   ② 冷启动首页缺战绩胶囊与提示行（初始化从没调用 renderHome，只有 hideAll 里调）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 流动能量带：两条路都画
rep('''  // 流动能量带
  ctx.save();
  ctx.setLineDash([CELL*0.5, CELL*0.62]);
  ctx.lineDashOffset = -(gameT * CELL * 1.5) % (CELL * 1.12);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(120,220,255,.22)';
  ctx.beginPath();
  for (var wi = 0; wi < WAYPOINTS.length; wi++){
    var wp2 = waypointPx(wi);
    if (wi === 0) ctx.moveTo(wp2.x, wp2.y); else ctx.lineTo(wp2.x, wp2.y);
  }
  ctx.stroke();
  ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(180,240,255,.7)';
  ctx.stroke();
  ctx.restore();''',
'''  /* 流动能量带
     v8.22 修 bug（毛毛报「两条路只有一条路会有点点」）：
     原来这里只遍历了 WAYPOINTS —— 双入口地图的第二条入口路完全没有流动光点，
     看起来像是「画了但没通电」。坐标函数 waypointPx(i, pi) 本来就支持 pi=1 走第二条，
     静态层的路径也是两条都画的，只有这段动画漏了。 */
  ctx.save();
  ctx.setLineDash([CELL*0.5, CELL*0.62]);
  ctx.lineDashOffset = -(gameT * CELL * 1.5) % (CELL * 1.12);
  var _pathN = WAYPOINTS2 ? 2 : 1;
  for (var _pn = 0; _pn < _pathN; _pn++){
    var _plist = (_pn === 1) ? WAYPOINTS2 : WAYPOINTS;
    if (!_plist) continue;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(120,220,255,.22)';
    ctx.beginPath();
    for (var wi = 0; wi < _plist.length; wi++){
      var wp2 = waypointPx(wi, _pn);
      if (!wp2) continue;
      if (wi === 0) ctx.moveTo(wp2.x, wp2.y); else ctx.lineTo(wp2.x, wp2.y);
    }
    ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(180,240,255,.7)';
    ctx.stroke();
  }
  ctx.restore();''',
    '流动能量带支持双入口')

# 起点标记：两个入口都标（终点共用基地，保持一次）
rep('''  // 起点 / 终点
  var s0 = waypointPx(0), s1 = waypointPx(WAYPOINTS.length - 1);
  ctx.fillStyle = 'rgba(120,200,255,.25)'; ctx.beginPath(); ctx.arc(s0.x, s0.y, CELL*0.35, 0, 6.3); ctx.fill();''',
'''  // 起点 / 终点（v8.22：双入口地图有两个起点，都要标出来；终点共用基地所以只标一次）
  var s1 = waypointPx(WAYPOINTS.length - 1);
  for (var _sp = 0; _sp < (WAYPOINTS2 ? 2 : 1); _sp++){
    var s0 = waypointPx(0, _sp);
    if (!s0) continue;
    ctx.fillStyle = 'rgba(120,200,255,.25)'; ctx.beginPath(); ctx.arc(s0.x, s0.y, CELL*0.35, 0, 6.3); ctx.fill();
  }''',
    '两个入口起点都标记')

# ② 冷启动调用 renderHome（否则首页缺战绩胶囊、缺无尽存档提示）
rep('''  applyLowFX(LOW_FX);
  syncSetBtns();
})();''',
'''  applyLowFX(LOW_FX);
  syncSetBtns();
  /* v8.22 修 bug（毛毛报「直接进入游戏和选一关再进入游戏的主页面 UI 不一样」）：
     renderHome() 原来只在 hideAll() 里被调用 —— 也就是说**冷启动那一次首页从来没渲染过**，
     战绩胶囊（最高波次/无尽/已解锁/星数）和「继续 N 波」提示行都是空的；
     而只要进过一关再返回首页（走 hideAll）就会补上 → 两个场景看起来不一样。
     启动这里补一次即可。 */
  renderHome();
})();''',
    '冷启动调用 renderHome')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.22 两个 bug 已修')
