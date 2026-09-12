# -*- coding: utf-8 -*-
# v8.23 ① 修主界面横屏被裁（版本号与底部按钮都显示不全）
#      ② 新增「版本信息」面板：点版本号展开，再点一下关上（方便别人反馈 bug 时提供版本/环境）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ═══════ ① 横屏小高度自适应：主界面内容压扁，保证一屏放得下 ═══════
rep('''  .home-foot{font-size:10px;color:#4d678f;letter-spacing:1px;}''',
'''  .home-foot{font-size:10px;color:#4d678f;letter-spacing:1px;}
  /* v8.23 修毛毛报的「字没显示全 / 没有版本号」——
     根因其实是同一个：主界面内容（logo + 战绩 + 提示 + 主按钮 + 3 行网格 + 页脚）在横屏
     540px 高的手机上比视口还高 → 顶部那行版本号被挤出视口、底部「玩法/检查更新」被裁一半。
     原来只有 max-height:480px 一档，而横屏手机常见是 500~600px 高 → 完全不生效。
     这里补一档 640px 的压缩规则（只压缩、不隐藏内容，保证所有入口都完整可见）。 */
  @media (max-height:640px){
    #startOv .home-wrap{gap:7px;padding:10px 16px;}
    .home-top{font-size:9.5px;}
    .logo{font-size:clamp(24px,6.4vw,38px);letter-spacing:5px;}
    .logo-tag{font-size:10px;letter-spacing:3px;margin-top:1px;}
    .home-stats{gap:5px;min-height:20px;}
    .home-stats .st{padding:3px 8px;font-size:10.5px;}
    .home-hint{font-size:10px;min-height:12px;}
    .btn-hero{padding:11px 38px !important;font-size:17px !important;letter-spacing:4px !important;}
    .home-menu{gap:6px;}
    .home-menu .btn{padding:7px 4px !important;border-radius:12px;}
    .home-menu .btn .ti{font-size:17px;}
    .home-menu2{gap:6px;}
    .home-menu2 .btn{padding:6px 4px !important;font-size:12px !important;}
    .home-foot{display:none;}
  }''',
    '横屏 640px 档压缩规则')

# ═══════ ② 版本号改成可点的「版本信息」入口 ═══════
rep('''    <div class="home-top"><span>MAOMAO · TOWER DEFENSE</span><span id="homeVer">v__VERSION__</span></div>''',
'''    <div class="home-top"><span>MAOMAO · TOWER DEFENSE</span><button id="homeVer" title="点这里看版本与运行环境（反馈问题时用得上）">v__VERSION__ ▾</button></div>''',
    '版本号改为可点入口')

rep('''  .home-top{width:100%;display:flex;justify-content:space-between;font-size:10px;color:#5f7ba6;letter-spacing:2px;}''',
'''  .home-top{width:100%;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#5f7ba6;letter-spacing:2px;}
  /* v8.23 版本号按钮：一眼看出能点（反馈 bug 时要提供的就是它） */
  #homeVer{padding:2px 8px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:1px;
    border:1px solid rgba(120,180,255,.32);background:rgba(24,40,68,.85);color:#9fd0ff;}
  #homeVer:active{transform:scale(.96);}
  #homeVer:hover{background:rgba(36,60,100,.95);}''',
    '版本号按钮样式')

# ═══════ 版本信息弹层 ═══════
rep('''<div class="ov hidden" id="helpOv">''',
'''<!-- v8.23 版本信息面板：点主界面右上角的版本号打开，再点一下关上（方便别人反馈 bug 时报版本与环境）-->
<div class="ov hidden" id="verOv">
  <h1 style="font-size:24px">版本信息</h1>
  <div class="sub" id="verSub" style="font-size:12px">《共鸣之塔》· 反馈问题时把下面这些一起发出来</div>
  <div id="verBody" style="text-align:left;width:100%;max-width:430px;max-height:56vh;overflow-y:auto;margin:6px 0;"></div>
  <button class="btn" id="verCopyBtn" style="padding:10px 26px;font-size:14px;background:rgba(30,80,60,.9);border-color:rgba(140,240,180,.5)">📋 复制全部信息</button>
  <button class="btn" id="verCloseBtn" style="margin-top:6px;padding:10px 32px;font-size:15px;background:rgba(40,60,100,.85)">关 闭</button>
</div>
<div class="ov hidden" id="helpOv">''',
    '版本信息弹层 HTML')

JS = u'''
/* ===== v8.23 版本信息面板 =====
   毛毛要求：「以后别人反馈 bug 就能看到版本之类的详细信息，点开可以查看，然后再点一下可以关上」。
   所以主界面右上角的版本号按钮就是入口：点一下弹出，点「关闭」或再点一次版本号收起。
   内容尽量把「报 bug 需要的信息」一次给全：版本 / 构建号 / 环境 / 存档进度 / 许可信息，
   并且提供一个「复制全部信息」按钮，别人一键复制就能贴出来。 */
function verInfoRows(){
  var ua = '';
  try { ua = navigator.userAgent || ''; } catch (e) { ua = ''; }
  var android = (ua.match(/Android\\s+([0-9.]+)/) || [])[1] || '未知';
  var chrome = (ua.match(/Chrome\\/([0-9.]+)/) || [])[1] || '未知';
  var model = (ua.match(/;\\s*([^;)]+)\\s+Build\\//) || [])[1] || '未知';
  var sc = (typeof W === 'number' && typeof H === 'number') ? (W + ' × ' + H) : '未知';
  var dpr = (typeof devicePixelRatio === 'number') ? devicePixelRatio : 1;
  var best = 0, ebest = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) {}
  try { ebest = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) {}
  var stars = 0, k;
  if (prog && prog.stars) for (k in prog.stars) stars += (prog.stars[k] || 0);
  var nAch = 0; try { nAch = achCount(); } catch (e) {}
  var nTower = 0; try { for (k in ELEMS) nTower++; } catch (e) {}
  var nCard = 0; try { nCard = BUFF_POOL.length; } catch (e) {}
  return [
    ['游戏版本',  'v' + GAME_VER + '（构建号 ' + BUILD_CODE + '）'],
    ['构建日期',  '2026-09-13'],
    ['本包内容',  nTower + ' 座塔 · ' + LEVELS.length + ' 关 · ' + nCard + ' 张强化卡 · ' + ACHIEVEMENTS.length + ' 个成就'],
    ['许可',      'MIT · 完全开源，可自由修改分发（已移除加固）'],
    ['', ''],
    ['系统版本',  'Android ' + android],
    ['机型',      model],
    ['WebView',   'Chrome/WebView ' + chrome],
    ['屏幕',      sc + ' 逻辑像素 · DPR ' + dpr],
    ['', ''],
    ['最高波次',  best || '—'],
    ['无尽最高',  (ebest || '—') + ' 波'],
    ['已解锁',    (prog && prog.unlocked ? prog.unlocked : 1) + ' / ' + LEVELS.length + ' 关'],
    ['星数',      stars + ' / ' + (LEVELS.length * 3)],
    ['成就',      nAch + ' / ' + ACHIEVEMENTS.length],
    ['', ''],
    ['源码与文档', 'github.com/maomao1OvO1/maomao1OvO1.github.io → games/td/']
  ];
}
function verInfoText(){
  var rows = verInfoRows(), out = ['《共鸣之塔》版本信息'];
  for (var i = 0; i < rows.length; i++){
    if (!rows[i][0]){ out.push(''); continue; }
    out.push(rows[i][0] + '：' + rows[i][1]);
  }
  return out.join('\\n');
}
function showVerInfo(){
  var rows = verInfoRows(), h = '';
  for (var i = 0; i < rows.length; i++){
    if (!rows[i][0]){ h += '<div style="height:7px"></div>'; continue; }
    h += '<div style="display:flex;gap:10px;justify-content:space-between;padding:6px 10px;border-radius:9px;'
      + 'background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.2);margin-bottom:4px;">'
      + '<span style="flex:0 0 auto;font-size:11.5px;color:#8fb4dc;">' + rows[i][0] + '</span>'
      + '<span style="flex:1;text-align:right;font-size:12px;color:#eaf3ff;overflow-wrap:anywhere;">' + rows[i][1] + '</span>'
      + '</div>';
  }
  document.getElementById('verBody').innerHTML = h;
  document.getElementById('verOv').classList.remove('hidden');
  try { SFX.click(); } catch (e) {}
}
function hideVerInfo(){
  document.getElementById('verOv').classList.add('hidden');
  try { SFX.click(); } catch (e) {}
}
function toggleVerInfo(){
  var el = document.getElementById('verOv');
  if (el && !el.classList.contains('hidden')) hideVerInfo(); else showVerInfo();
}
'''
rep('function updateHud(){', JS.strip() + '\nfunction updateHud(){', '版本信息面板 JS')

# 游戏版本号常量（从 homeVer 里取，打包时已注入）
rep("var BUILD_CODE = 69;", "var BUILD_CODE = 69;\nvar GAME_VER = '8.23';                   /* v8.23：版本信息面板显示用（与 version.json 同步）*/", 'GAME_VER 常量')

# 绑定 + hideAll 收纳
rep("""  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */""",
    """  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */
  on('homeVer', function(){ toggleVerInfo(); });       /* v8.23：点版本号 → 开/关版本信息面板 */
  on('verCloseBtn', function(){ hideVerInfo(); });
  on('verCopyBtn', function(){
    var t = verInfoText();
    var okc = false;
    try { okc = saveToClipboard(t); } catch (e) {}
    if (okc) showTip('📋 已复制版本信息，直接粘贴给对方就行');
    else {
      var ta = document.createElement('textarea');
      ta.value = t;
      var bd = document.getElementById('verBody');
      if (bd) bd.insertBefore(ta, bd.firstChild);
      showTip('自动复制失败：请长按上面的文本框手动复制');
    }
  });""",
    '绑定版本信息交互')
rep("""  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv','introOv','updOv'].forEach(function(id){""",
    """  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv','introOv','updOv','verOv'].forEach(function(id){""",
    'hideAll 收纳版本信息弹层')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.23 已写入')
