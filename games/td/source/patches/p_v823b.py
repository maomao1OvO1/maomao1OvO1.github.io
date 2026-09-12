# -*- coding: utf-8 -*-
# v8.23 适配补全：① HUD 左右安全区（横屏刘海/挖孔）② 竖屏提示条
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① HUD 左右安全区：横屏时刘海可能在左也可能在右（翻转），两侧都要躲开
rep('''  #top{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:8px;row-gap:5px;padding:8px 10px;''',
'''  /* v8.23 适配：HUD 两侧躲开刘海/挖孔（横屏时刘海可能在左也可能在右，所以两边都要留）*/
  #top{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:8px;row-gap:5px;
    padding:8px calc(10px + env(safe-area-inset-right,0px)) 8px calc(10px + env(safe-area-inset-left,0px));''',
    'HUD 左右安全区')

# ② 竖屏提示条
rep('''  <div id="waveInfo"''',
'''  <!-- v8.23 适配：竖屏提示（非阻塞，横屏时自动隐藏；地图是 16×10 横屏比例，窄屏下战场会被压扁）-->
  <div id="rotHint" style="display:none;flex:0 0 auto;padding:4px 10px;font-size:11px;color:#ffd76a;
    background:linear-gradient(180deg,rgba(44,34,12,.95),rgba(24,18,6,.9));border-bottom:1px solid rgba(255,200,110,.3);
    text-align:center;letter-spacing:.4px;">↻ 横屏体验更好：战场是 16:10 横屏比例，竖屏会被压扁</div>
  <div id="waveInfo"''',
    '竖屏提示条 HTML')

rep('''  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
}''',
'''  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
  /* v8.23 适配：竖屏时显示提示条（横屏自动隐藏）*/
  var _rh = document.getElementById('rotHint');
  if (_rh) _rh.style.display = (H > W) ? 'block' : 'none';
}''',
    '竖屏提示切换')

# 提示条也要跟着教学任务条一起收纳（避免首页/弹层时露在战场上）
rep('''  tutBarSync();          /* TUTORIAL_PATCH_V1：教学任务条随模式一起收起 / 放出 */''',
    '''  tutBarSync();          /* TUTORIAL_PATCH_V1：教学任务条随模式一起收起 / 放出 */
  var _rhh = document.getElementById('rotHint'); if (_rhh) _rhh.style.display = 'none';   /* v8.23：收起弹层时也收掉竖屏提示 */
  resize();              /* 重新按当前尺寸判定横竖屏（弹层开合会改变可用高度）*/''',
    'hideAll 收纳竖屏提示')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.23 适配补全完成')
