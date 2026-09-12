# -*- coding: utf-8 -*-
# v8.18 (3) 主界面 UI 重做：大标题 + 主按钮 + 图标网格 + 纯 CSS 动效
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ---------- 1. 样式：图标网格 + 呼吸光环 + Logo 辉光 ----------
rep('''  .home-menu{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:340px;}
  .home-menu .btn{margin-top:0 !important;width:100%;border-radius:12px !important;letter-spacing:2px !important;}
  .home-foot{font-size:10px;color:#4d678f;letter-spacing:1px;}''',
'''  /* ===== v8.18 主界面重做：大标题 + 主按钮 + 图标网格（纯 CSS 动效，零图片资源）===== */
  .home-aura{position:absolute;inset:0;pointer-events:none;z-index:1;
    background:radial-gradient(circle at 50% 36%,rgba(110,190,255,.20),rgba(150,110,255,.10) 38%,transparent 64%);
    animation:auraBreath 6.5s ease-in-out infinite;}
  @keyframes auraBreath{0%,100%{opacity:.5;transform:scale(1);}50%{opacity:1;transform:scale(1.05);}}
  .home-menu{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:400px;}
  /* 图标网格瓦片：图标在上、名字在下（横屏压缩时也保持堆叠）。
     注意：#bookBtn 的 class 必须是「btn」本身（deep11 有断言），所以样式不能靠额外类名挂，只能落在 .home-menu .btn 上 */
  .home-menu .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    margin-top:0 !important;width:100%;border-radius:14px;letter-spacing:1px;
    padding:10px 4px !important;font-size:12px !important;
    border-color:rgba(120,180,255,.34);background:rgba(22,34,58,.88);
    box-shadow:none;transition:transform .12s,border-color .18s,box-shadow .18s;}
  .home-menu .btn .ti{font-size:22px;line-height:1.05;}
  .home-menu .btn:active{transform:scale(.94);}
  .home-menu .btn.hot{border-color:rgba(255,200,110,.6);box-shadow:0 0 14px rgba(255,180,60,.22);background:linear-gradient(180deg,rgba(58,44,16,.92),rgba(36,26,8,.92));}
  .home-menu .btn.pink{border-color:rgba(255,140,200,.55);background:linear-gradient(180deg,rgba(52,20,40,.92),rgba(34,12,26,.92));}
  .home-menu2{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:400px;}
  .home-menu2 .btn{margin-top:0 !important;width:100%;border-radius:12px;letter-spacing:1px;
    padding:9px 4px !important;font-size:13px !important;box-shadow:none;}
  .home-hint{min-height:14px;font-size:11px;color:#7cf5c0;letter-spacing:.5px;}
  .home-foot{font-size:10px;color:#4d678f;letter-spacing:1px;}''',
    '主界面样式重做')

rep('''    filter:drop-shadow(0 0 16px rgba(90,200,255,.55)) drop-shadow(0 3px 0 rgba(8,16,34,.85));
    animation:logoFloat 4.6s ease-in-out infinite;}''',
'''    filter:drop-shadow(0 0 16px rgba(90,200,255,.55)) drop-shadow(0 3px 0 rgba(8,16,34,.85));
    animation:logoFloat 4.6s ease-in-out infinite, logoGlow 5.2s ease-in-out infinite;}
  @keyframes logoGlow{
    0%,100%{filter:drop-shadow(0 0 14px rgba(90,200,255,.45)) drop-shadow(0 3px 0 rgba(8,16,34,.85));}
    50%{filter:drop-shadow(0 0 28px rgba(130,205,255,.8)) drop-shadow(0 3px 0 rgba(8,16,34,.85));}}''',
    'Logo 辉光呼吸')

# ---------- 2. 首页结构 ----------
rep('''<div class="ov" id="startOv">
  <div class="home-bg"></div>
  <div class="home-wrap">
    <div class="home-top"><span>MAOMAO · TOWER DEFENSE</span><span id="homeVer">v__VERSION__</span></div>
    <div class="home-logo">
      <h1 class="logo">共鸣之塔</h1>
      <div class="logo-tag">元素共鸣 · 塔防</div>
    </div>
    <div class="home-stats" id="homeStats"></div>
    <button class="btn btn-hero" id="startBtn">▶ 开始防御</button>
    <button class="btn" id="updCheckBtn" style="margin-top:6px;padding:10px 30px;font-size:13px;background:rgba(40,60,100,.85);border-color:rgba(140,200,255,.45)">🔄 检查更新</button>
    <!-- TUTORIAL_PATCH_V1：新手教学入口（仅首页，不进选关页 → 选关列表仍为 5 关 + 无尽 = 6 项）-->
    <button class="btn" id="tutBtn" style="margin-top:6px;padding:12px 40px;font-size:15px;letter-spacing:2px;background:rgba(40,60,100,.85)">🎓 新手教学</button>
    <div class="home-menu">
      <button class="btn" id="bookBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">📖 图鉴</button>
      <button class="btn" id="setBtn1" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">⚙ 设置</button>
      <button class="btn" id="helpBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">❓ 玩法</button>
      <button class="btn" id="levelsBtn" style="margin-top:0;padding:11px 0;font-size:14px;background:rgba(40,60,100,.85)">🗺 选关</button>
    </div>
    <div class="home-foot">守住基地 · 元素相邻触发共鸣</div>
  </div>
</div>''',
'''<div class="ov" id="startOv">
  <div class="home-bg"></div>
  <div class="home-aura"></div>
  <div class="home-wrap">
    <div class="home-top"><span>MAOMAO · TOWER DEFENSE</span><span id="homeVer">v__VERSION__</span></div>
    <div class="home-logo">
      <h1 class="logo">共鸣之塔</h1>
      <div class="logo-tag">元 素 共 鸣 · 塔 防</div>
    </div>
    <div class="home-stats" id="homeStats"></div>
    <div class="home-hint" id="homeHint"></div>
    <button class="btn btn-hero" id="startBtn">▶ 开始防御</button>
    <!-- v8.18：入口从「竖向堆叠」改成图标网格（3 列，两行），主按钮独占一行 → 一眼看清有什么可点 -->
    <div class="home-menu">
      <button class="btn" id="levelsBtn"><span class="ti">🗺</span><span>选关</span></button>
      <button class="btn hot" id="homeEndlessBtn"><span class="ti">♾</span><span>无尽</span></button>
      <button class="btn pink" id="homeDailyBtn"><span class="ti">📅</span><span>每日挑战</span></button>
      <button class="btn" id="bookBtn" style="background:rgba(40,60,100,.85)"><span class="ti">📖</span><span>图鉴</span></button>
      <button class="btn" id="setBtn1" style="background:rgba(40,60,100,.85)"><span class="ti">⚙</span><span>设置</span></button>
      <button class="btn" id="helpBtn" style="background:rgba(40,60,100,.85)"><span class="ti">❓</span><span>玩法</span></button>
    </div>
    <!-- TUTORIAL_PATCH_V1：新手教学入口（仅首页，不进选关页 → 选关列表仍为 15 关 + 无尽 + 每日）-->
    <div class="home-menu2">
      <button class="btn" id="tutBtn" style="background:rgba(40,60,100,.85)">🎓 新手教学</button>
      <button class="btn" id="updCheckBtn" style="background:rgba(40,60,100,.85);border-color:rgba(140,200,255,.45)">🔄 检查更新</button>
    </div>
    <div class="home-foot">守住基地 · 元素相邻触发共鸣</div>
  </div>
</div>''',
    '首页结构重做')

# ---------- 3. renderHome：补网格入口的动态状态 ----------
rep('''  el.innerHTML =
    '<span class="st">🏆 最高波次 <b>' + (best || '—') + '</b></span>' +
    '<span class="st">♾ 无尽 <b>' + (eBest || '—') + '</b></span>' +
    '<span class="st">🗺 已解锁 <b>' + unl + '/' + LEVELS.length + '</b></span>' +
    '<span class="st">⭐ 星数 <b>' + stars + '/' + (LEVELS.length * 3) + '</b></span>';
}''',
'''  el.innerHTML =
    '<span class="st">🏆 最高波次 <b>' + (best || '—') + '</b></span>' +
    '<span class="st">♾ 无尽 <b>' + (eBest || '—') + '</b></span>' +
    '<span class="st">🗺 已解锁 <b>' + unl + '/' + LEVELS.length + '</b></span>' +
    '<span class="st">⭐ 星数 <b>' + stars + '/' + (LEVELS.length * 3) + '</b></span>';
  /* v8.18：网格入口写上「当前是什么状态」——无尽有存档就写第几波、每日打过就打勾 */
  var sv = null;
  try { sv = loadEndlessSave(); } catch (e) { sv = null; }
  var eBtn = document.getElementById('homeEndlessBtn');
  if (eBtn) eBtn.innerHTML = '<span class="ti">♾</span><span>'
    + (sv ? ('继续 ' + sv.wave + ' 波') : '无尽') + '</span>';
  var dBtn = document.getElementById('homeDailyBtn');
  if (dBtn) dBtn.innerHTML = '<span class="ti">📅</span><span>'
    + (dailyDoneToday() ? '每日 ✓' : '每日挑战') + '</span>';
  var hint = document.getElementById('homeHint');
  if (hint){
    if (sv) hint.textContent = '💾 上次的无尽进度还在 · 点「继续 ' + sv.wave + ' 波」接着打';
    else if (prog && prog.tutorialDone) hint.textContent = '';
    else hint.textContent = '🎓 第一次玩？先过一遍新手教学（6 波、5 步引导）';
  }
}''',
    'renderHome 动态状态')

# ---------- 4. 无尽入口：抽成函数，首页网格用 ----------
rep('''function startEndless(){''',
'''/* v8.18 主界面「无尽」入口：有存档就续玩、没有就从第 1 波开始（与选关页 ♾ 节点同一套判定） */
function enterEndless(){
  if (!endlessUnlocked()){
    showTip('♾ 无尽模式要先通关第 1 关');
    try { SFX.click(); } catch (e) {}
    return false;
  }
  if (loadEndlessSave()) resumeEndless(); else startEndless();
  return true;
}
function startEndless(){''',
    'enterEndless 函数')

# ---------- 5. 绑定新入口 ----------
rep('''  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */''',
    '''  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */
  on('homeEndlessBtn', function(){ enterEndless(); });        /* v8.18：首页直接进无尽 */
  on('homeDailyBtn', function(){ startDaily(true); });        /* v8.18：首页直接进每日挑战 */''',
    '绑定首页新入口')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.18c 主界面 UI 补丁完成')
