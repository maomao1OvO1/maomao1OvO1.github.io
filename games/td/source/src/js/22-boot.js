/* ══════════════════════════════════════════════════════════════════════════
 * 21-boot.js —— 启动绑定：事件接线、设置加载、首页渲染、进入主循环
 *
 * 来源：game.html 第 7230-7399 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

(function(){
  /* 事件绑定小工具：按 id 给元素挂 click 监听（不存在则跳过），页面底部统一绑定所有按钮 */
  function on(id, fn){ var el = document.getElementById(id); if (el) el.addEventListener('click', function(e){ e.stopPropagation(); fn(); }); }
  on('startBtn', function(){ showLevels(); });
  on('againBtn', function(){ showLevels(); });
  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */
  on('retryBtn', function(){                          /* v8.7 失败后立刻重开（不用回首页重新点） */
    if (endless) startEndless(); else startLevel(lvIndex | 0);
    hideAll();
  });
  on('introBtn', function(){                          /* v8.4 关卡开幕提示 → 开始战斗 */
    document.getElementById('introOv').classList.add('hidden');
    running = true; paused = false; last = 0;
  });
  on('pauseBtn', function(){ if (running && !paused) pauseGame(); });
  /* v9.16 支持作者入口（主界面页脚 / 通关结算 / 失败结算）—— 三处都开同一个页面 */
  on('supportBtn', openSupport);
  on('clearSupport', openSupport);
  on('overSupport', openSupport);
  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */
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
  });
  /* v8.18 左侧信息栏：点天气图标直接看天气说明，点其它图标展开/收起详情 */
  (function(){
    var strip = document.getElementById('swStrip');
    if (strip) strip.addEventListener('click', function(e){
      e.stopPropagation();
      var t = e.target;
      if (t && t.id === 'swWx'){ showWeatherHelp(); return; }
      sideToggle();
    });
    try { sideOpen = (localStorage.getItem(SIDE_KEY) === '1'); } catch (er) { sideOpen = false; }
    sideSig = ''; updateSideBar();
  })();
  on('homeEndlessBtn', function(){ enterEndless(); });        /* v8.18：首页直接进无尽 */
  on('homeDailyBtn', function(){ startDaily(true); });        /* v8.18：首页直接进每日挑战 */
  renderSkillBar();          /* v8.5：技能栏（4 个主动技能，各自冷却） */
  on('speedBtn', function(){
    var list = endless ? SPEED_LIST_ENDLESS : SPEED_LIST_NORMAL;
    var idx = list.indexOf(speedMul);
    if (idx < 0) idx = 0;
    speedMul = list[(idx + 1) % list.length];
    updateSpeedBtn();
    last = 0;                                  // 清掉上一帧时间戳，避免切换瞬间 dt 跳变
    showTip(speedMul >= 5 ? ('⏩ ' + speedMul + ' 倍速（无尽快进）') : ('⏩ ' + speedMul + ' 倍速'));
    SFX.click();
  });
  on('skipBuffBtn', function(){
    if (document.getElementById('buffOv').classList.contains('hidden')) return;
    /* v8.12 修「无限刷金币」：商店 / 技能说明 / 天赋面板都复用同一个弹层，
       原来只要弹层可见就能点跳过拿钱 → 现在必须真的处在「波次结束三选一」状态才算数 */
    if (!buffChoiceOpen){ showTip('只有每波结束选强化卡时才能跳过换金币'); return; }
    buffChoiceOpen = false;
    if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 跳过也算完成 */
    goldAdd(150);
    updateHud();
    closeBuffPanel();
    running = true; paused = false; last = 0;
    SFX.coin();
    addFloat(W / 2, H * 0.4, '跳过强化  +150', '#ffd76a');
  });
  on('resumeBtn', resumeGame);
  on('endSaveBtn', function(){
    if (!endless) return;
    saveEndless(false);
    running = false; paused = false; endless = false;
    showLevels();
  });
  on('restartBtn', function(){ if (endless) startEndless(); else if (tutorial) startTutorial(); else startLevel(lvIndex); });
  on('toLevelsBtn', function(){ if (endless) saveEndlessBest(); running = false; paused = false; showLevels(); });
  on('toLevelsBtn2', function(){ showLevels(); });
  on('nextBtn', function(){ if (lvIndex + 1 < LEVELS.length) startLevel(lvIndex + 1); else showLevels(); });
  on('lvBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); syncTutLabel(); });
  on('helpBtn', function(){ hideAll(); document.getElementById('helpOv').classList.remove('hidden'); SFX.panelOpen(); });
  on('helpBackBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); SFX.panelClose(); });
  on('levelsBtn', function(){ showLevels(); SFX.click(); });
  /* —— 设置面板 —— */
  on('updCheckBtn', function(){ checkUpdate(); });      /* v8.17 一键检查更新 */
  on('updOkBtn', function(){ doUpdateDownload(); });
  on('updCancelBtn', function(){ document.getElementById('updOv').classList.add('hidden'); pendingUpdate = null; showTip('已取消'); });
  on('setBriefBtn', function(){               /* v8.14 全局文字详略 */
    toggleUiBrief();
    var _b2 = document.getElementById('setBriefBtn');
    if (_b2) _b2.textContent = '📄 文字模式：' + (UI_BRIEF ? '简易' : '详细');
  });
  on('setArtBtn', function(){                 /* v8.11 敌人美术风格循环切换 */
    cycleEnemyArt();
    var _ab2 = document.getElementById('setArtBtn');
    if (_ab2) _ab2.textContent = '🎨 敌人美术：' + enemyArtName(ENEMY_ART);
  });
  on('setBtn1', function(){ showSet('start'); });
  /* —— 图鉴：入口 / 分页 / 返回 —— */
  on('bookBtn', function(){ bookShow('mob'); });
  on('bookTabMob', function(){ bookTab = 'mob'; bookRender(); SFX.bookTab(); });
  on('bookTabTower', function(){ bookTab = 'tower'; bookRender(); SFX.bookTab(); });
  on('bookTabReso', function(){ bookTab = 'reso'; bookRender(); SFX.bookTab(); });
  on('bookTabBuff', function(){ bookTab = 'buff'; bookRender(); SFX.bookTab(); });
  on('bookTabSys', function(){ bookTab = 'sys'; bookRender(); SFX.bookTab(); });
  on('bookTabInfo', function(){ bookTab = 'info'; bookRender(); SFX.bookTab(); });
  /* v8.25 补：v8.18 的「🌤 天气」与 v8.21 的「🏆 成就」两个页签当时忘了绑点击 →
     点上去毫无反应（毛毛报的 bug）。以后新增图鉴页签，除了 bookRenderTabs 的 ids 表和
     bookRender 的分支，**必须在这里补一行绑定** —— test/deep45b_uiwiring.js 会自动查这件事。 */
  on('bookTabWx', function(){ bookTab = 'wx'; bookRender(); SFX.bookTab(); });
  on('bookTabAch', function(){ bookTab = 'ach'; bookRender(); SFX.bookTab(); });
  on('bookBackBtn', bookHide);
  on('setBtn2', function(){ showSet('pause'); });
  on('setSfxBtn', toggleSfx);
  on('setMusBtn', toggleMus);
  on('setExpBtn', function(){
    var code = saveEncode();
    var el = document.getElementById('saveCode');
    if (el) el.value = code;
    setMsg('存档码已生成，点「复制」或「分享」发出去', '#7cf5c0');
    SFX.click();
  });
  on('setCopyBtn', function(){
    var el = document.getElementById('saveCode');
    var code = (el && el.value) ? el.value : saveEncode();
    if (el && !el.value) el.value = code;
    setMsg(saveToClipboard(code) ? '已复制到剪贴板' : '复制失败：请长按输入框手动复制', '#7cf5c0');
  });
  on('setShareBtn', function(){
    var el = document.getElementById('saveCode');
    var code = (el && el.value) ? el.value : saveEncode();
    if (el && !el.value) el.value = code;
    /* v8.27 毛毛要求：分享文本里推广自己的网站 + 感谢游玩。
       这段文案就是分享出去的那段中文，改这里即可。 */
    var txt = '🎮 我在玩《共鸣之塔》—— 我做的原创塔防小游戏（元素共鸣机制，15 关 + 无尽 + 每日挑战）\n'
      + '这是存档码，在游戏里「设置 → 存档分享 → 粘贴导入」就能直接用：\n'
      + code + '\n\n'
      + '🕹 更多自制小游戏 / 我的网站：https://maomao1ovo1.github.io/\n'
      + '感谢游玩！游戏完全开源（MIT），随便改、随便玩 😄';
    setMsg(saveShareText(txt) ? '已调起分享' : (saveToClipboard(txt) ? '已复制（可直接粘贴发送）' : '请长按输入框手动复制'), '#7cf5c0');
  });
  on('setImpBtn', function(){
    var el = document.getElementById('saveCode');
    var msg = saveImport(el ? el.value : '');
    setMsg(msg, msg.indexOf('成功') === 0 ? '#7cf5c0' : '#ff9a9a');
    SFX.upgrade();
  });
  on('setFxBtn', toggleFx);
  on('setClearBtn', clearProgress);
  on('setBackBtn', hideSet);
  /* ==== TUTORIAL_PATCH_V1：新手教学入口与结算按钮（全部为新增 id，不覆盖任何既有监听器）==== */
  on('tutBtn', function(){ startTutorial(); });                     /* 首页「🎓 新手教学」*/
  on('tutAgainBtn', function(){ startTutorial(); });                /* 教学完成页：再练一次 */
  on('tutGoBtn', function(){ startLevel(0); });                     /* 教学完成页：直接进第 1 关（在此结算 +50 奖励）*/
  on('tutHomeBtn', function(){ hideAll(); document.getElementById('startOv').classList.remove('hidden'); syncTutLabel(); });
  syncTutLabel(); tutBarSync();                                     /* 启动即同步首页文案与任务条状态 */
  /* —— 启动时读取 td_settings 并应用（音效静音 / 画质）—— */
  loadSettings();
  applyLowFX(LOW_FX);
  syncSetBtns();
  /* v8.22 修 bug（毛毛报「直接进入游戏和选一关再进入游戏的主页面 UI 不一样」）：
     renderHome() 原来只在 hideAll() 里被调用 —— 也就是说**冷启动那一次首页从来没渲染过**，
     战绩胶囊（最高波次/无尽/已解锁/星数）和「继续 N 波」提示行都是空的；
     而只要进过一关再返回首页（走 hideAll）就会补上 → 两个场景看起来不一样。
     启动这里补一次即可。 */
  renderHome();
})();
requestAnimationFrame(frame);
