# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 开局设置第二路径
rep("  WAYPOINTS = LEVELS[i].path;", "  WAYPOINTS = LEVELS[i].path;\n  WAYPOINTS2 = LEVELS[i].path2 || null;                 /* v8.10 双入口关卡 */", '关卡设置第二路径')
rep("  WAYPOINTS = TUTORIAL.path;", "  WAYPOINTS = TUTORIAL.path;\n  WAYPOINTS2 = null;                                   /* 教学关单入口 */", '教学关单入口')

# ② 绘制两条路径
rep("""    g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(28,42,70,.95)';
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    for (var i = 0; i < WAYPOINTS.length; i++){
      var p = waypointPx(i);
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(90,160,255,.35)';
    g.stroke();""",
"""    g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(28,42,70,.95)';
    g.lineJoin = 'round'; g.lineCap = 'round';
    /* v8.10：双入口关卡要画两条路（样式完全一致，玩家一眼能看出「有两路要守」） */
    var _allPaths = WAYPOINTS2 ? [WAYPOINTS, WAYPOINTS2] : [WAYPOINTS];
    for (var _pi = 0; _pi < _allPaths.length; _pi++){
      var _pl = _allPaths[_pi];
      g.beginPath();
      for (var i = 0; i < _pl.length; i++){
        var p = { x: cx(_pl[i][0]), y: cy(_pl[i][1]) };
        if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
      }
      g.stroke();
      g.lineWidth = 2; g.strokeStyle = 'rgba(90,160,255,.35)';
      g.stroke();
      g.lineWidth = CELL * 0.86; g.strokeStyle = 'rgba(28,42,70,.95)';
    }""", '绘制双路径')

# ③ 静态层缓存 key 要包含第二路径（否则切关画错地图）
rep("  for (var wk = 0; wk < WAYPOINTS.length; wk++) wpKey += WAYPOINTS[wk][0] + '_' + WAYPOINTS[wk][1] + '.';",
    "  for (var wk = 0; wk < WAYPOINTS.length; wk++) wpKey += WAYPOINTS[wk][0] + '_' + WAYPOINTS[wk][1] + '.';\n  if (WAYPOINTS2) for (var wk2 = 0; wk2 < WAYPOINTS2.length; wk2++) wpKey += 'B' + WAYPOINTS2[wk2][0] + '_' + WAYPOINTS2[wk2][1] + '.';   /* v8.10 双入口也要进指纹 */", '缓存指纹含第二路径')

# ④ 关卡开幕提示标注双入口
rep("""  /* 地图特征 */
  h += '<div style="font-size:11.5px;color:#9fc4f0;margin-top:8px;line-height:1.5;">🗺 地图：<b>' + L.name + '</b>'""",
"""  /* 地图特征（双入口会额外醒目提示 —— 只堆一边必定漏怪） */
  if (L.path2){
    h += '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:9px 0 5px;">🛣️ 双入口地图</div>'
      + '<div style="font-size:11.5px;color:#ffe6c0;line-height:1.5;padding:6px 9px;border-radius:10px;'
      + 'background:rgba(96,62,16,.75);border:1px solid rgba(255,200,110,.45);margin-bottom:5px;">'
      + '敌人会随机从<b>两条路</b>同时进攻（各 ' + L.path.length + ' / ' + L.path2.length + ' 个拐点），'
      + '只守一边必然漏怪 —— 注意两侧都要布防，或者把主力放在两条路的交汇处附近。</div>';
  }
  h += '<div style="font-size:11.5px;color:#9fc4f0;margin-top:8px;line-height:1.5;">🗺 地图：<b>' + L.name + '</b>'""", '开幕提示双入口')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.10 补丁第二批完成 ---')
