# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 选关界面 HTML → 横滑地图容器
rep("""  <div class="sub">通关后解锁下一张地图 · 每关波数/初始金币不同</div>
  <div id="lvList" style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:320px;"></div>""",
"""  <div class="sub" style="font-size:11.5px">通关解锁下一张地图 · 每关波数与敌人配置都不同</div>
  <div id="lvMapWrap" style="width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;padding:2px 0 0;">
    <div id="lvList" style="display:flex;align-items:flex-start;gap:0;padding:6px 22px 12px;min-width:max-content;"></div>
  </div>
  <div class="sub" style="font-size:10.5px;opacity:.72;margin-top:1px;">← 左右滑动查看全部 15 张地图 · 点圆形节点进入关卡 →</div>""", '选关容器改横滑')

# ② 关卡开幕提示 overlay
rep("""<div class="ov hidden" id="overOv">""",
"""<div class="ov hidden" id="introOv">
  <h1 id="introTitle" style="font-size:24px">第 1 关</h1>
  <div class="sub" id="introSub" style="font-size:12.5px">波数 / 初始金币</div>
  <div id="introBody" style="text-align:left;width:100%;max-width:420px;max-height:46vh;overflow-y:auto;margin:6px 0;"></div>
  <button class="btn" id="introBtn" style="padding:12px 40px;font-size:16px;letter-spacing:2px;border-color:rgba(140,240,180,.6);background:linear-gradient(180deg,rgba(20,90,66,.95),rgba(12,54,40,.95));color:#c8ffe4;">⚔ 开始战斗</button>
</div>
<div class="ov hidden" id="overOv">""", '开幕提示 overlay')

# ③ 关卡开幕提示：本关相对上一关新增的东西
rep("""var SHOP_POOL = [""",
"""/* ===== v8.4 关卡开幕提示 =====
   毛毛要求：每关开始前把「这一关比上一关多出来的东西」讲清楚（新敌人/新机制）。
   下面的登场波次表与 waveComp() 里的条件保持同步 —— 改那里记得同步这里。 */
var ENEMY_INTRO_WAVE = {
  normal:1, fast:2, armor:4, shield:6,
  healer:5, splitter:6, bomber:7, elite:8, charger:9,
  boss:10, thief:12, phase:14, bulwark:16, airdrop:18
};
var ENEMY_INTRO_ORDER = ['normal','fast','armor','shield','healer','splitter','bomber','elite','charger','boss','thief','phase','bulwark','airdrop'];
/* 返回「本关区间内首次登场、而上一关区间里没有」的敌人列表 */
function levelNewEnemies(idx){
  var prevMax = idx > 0 ? LEVELS[idx - 1].waves : 0;
  var curMax = LEVELS[idx].waves;
  var out = [];
  for (var i = 0; i < ENEMY_INTRO_ORDER.length; i++){
    var k = ENEMY_INTRO_ORDER[i], w = ENEMY_INTRO_WAVE[k];
    if (w > prevMax && w <= curMax) out.push({ key:k, wave:w });
  }
  out.sort(function(a, b){ return a.wave - b.wave; });
  return out;
}
function showLevelIntro(idx){
  var L = LEVELS[idx];
  document.getElementById('introTitle').textContent = '第 ' + (idx + 1) + ' 关 · ' + (L.name.split('·')[1] || '').trim();
  document.getElementById('introSub').textContent = L.waves + ' 波 · 初始金币 ' + L.gold + ' · 难度系数 ' + L.diff;
  var news = levelNewEnemies(idx), h = '';
  if (news.length){
    h += '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:2px 0 5px;">🆕 本关新出现（上一关还没有）</div>';
    news.forEach(function(n){
      var e = ENEMIES[n.key];
      h += '<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:10px;background:rgba(22,32,56,.8);'
        + 'border:1px solid rgba(255,200,110,.28);margin-bottom:5px;">'
        + '<span style="flex:0 0 auto;font-size:11px;color:#8fb4dc;padding-top:1px;">第' + n.wave + '波</span>'
        + '<span style="flex:1;min-width:0;">'
        + '<b style="font-size:13.5px;color:' + e.color + '">' + e.name + '</b>'
        + '<span style="display:block;font-size:11.5px;color:#c8d8ee;line-height:1.45;">' + (e.fx || '') + '</span>'
        + (e.tip ? '<span style="display:block;font-size:11px;color:#7cf5c0;line-height:1.4;">→ ' + e.tip + '</span>' : '')
        + '</span></div>';
    });
  } else {
    h += '<div style="font-size:12.5px;color:#9fc4f0;padding:8px 10px;border-radius:10px;background:rgba(22,32,56,.7);">'
      + '本关没有新敌人 —— 但强度更高、波数更多，注意把塔升级和凑共鸣。</div>';
  }
  if (idx === 0){
    h += '<div style="font-size:11.5px;color:#8fb4dc;margin-top:8px;line-height:1.5;">💡 新手提示：相邻放不同元素的塔会触发<b>元素共鸣</b>；'
      + '同元素相邻则是<b>共振</b>。点已建好的塔可以看到每发伤害与暴击伤害。</div>';
  }
  h += '<div style="font-size:11.5px;color:#ffd76a;margin-top:8px;line-height:1.5;">🌤 <b>元素天气</b>：第 4 波起每 3 波切换一次，'
    + '会给战场带来「有得有失」的加成（例如灼热让火塔变强、冰塔变弱），切换前会在「下一波」提示里预告。</div>';
  document.getElementById('introBody').innerHTML = h;
  running = false; paused = true;
  document.getElementById('introOv').classList.remove('hidden');
}
var SHOP_POOL = [""", '开幕提示逻辑')

# ④ 按钮绑定 + hideAll 收纳
rep("  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */",
    "  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */\n  on('introBtn', function(){                          /* v8.4 关卡开幕提示 → 开始战斗 */\n    document.getElementById('introOv').classList.add('hidden');\n    running = true; paused = false; last = 0;\n  });", '开幕按钮绑定')

rep("  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv'].forEach(function(id){",
    "  ['startOv','overOv','pauseOv','clearOv','levelsOv','setOv','bookOv','helpOv','introOv'].forEach(function(id){", 'hideAll 收纳 introOv')

# ⑤ startLevel 末尾调用开幕提示
rep("  initAudio(); startWave(); updateHud(); updateWaveInfo();\n}\n/* 无尽模式：地图固定用第 1 关",
    "  initAudio(); startWave(); updateHud(); updateWaveInfo();\n  showLevelIntro(i);                                  /* v8.4：关卡开幕提示（点「开始战斗」才真正开打） */\n}\n/* 无尽模式：地图固定用第 1 关", 'startLevel 弹开幕')

# ⑥ showLevels 改成 PVZ 风格横滑节点地图
rep("""  var wrap = document.getElementById('lvList'); wrap.innerHTML = '';
  for (var i = 0; i < LEVELS.length; i++){
    (function(i){
      var L = LEVELS[i], locked = i >= prog.unlocked;
      var best = prog.best[i] || 0;
      var b = document.createElement('button');
      b.className = 'btn';
      b.style.cssText = 'padding:13px 18px;font-size:15px;letter-spacing:2px;width:100%;'
        + (locked ? 'opacity:.4;background:rgba(40,50,70,.7)' : '');
      var st = prog.stars[i] || 0;            // 已得星数（未通关不显示）
      b.textContent = L.name + '   ' + L.waves + '波' + (best ? '  ★最佳' + best : '')
        + (st > 0 ? '  ' + starStr(st) : '') + (locked ? '   🔒' : '');
      if (st > 0) b.style.color = '#ffd76a';
      if (!locked) b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); });
      wrap.appendChild(b);
    })(i);
  }""",
"""  var wrap = document.getElementById('lvList'); wrap.innerHTML = '';
  /* ===== v8.4 关卡地图（PVZ 风格）：可左右滑动的一串关卡节点，上下蜿蜒起伏，节点之间用连线串起来 ===== */
  var nodes = [];
  for (var i = 0; i < LEVELS.length; i++){
    (function(i){
      var L = LEVELS[i], locked = i >= prog.unlocked;
      var best = prog.best[i] || 0, st = prog.stars[i] || 0;
      var yOff = Math.round(Math.sin(i * 0.85) * 32);
      var node = document.createElement('div');
      node.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;width:84px;flex:0 0 auto;'
        + 'margin-top:' + (46 + yOff) + 'px;';
      var b = document.createElement('button');
      b.className = 'btn';
      b.style.cssText = 'width:56px;height:56px;border-radius:50%;padding:0;font-size:18px;font-weight:800;'
        + (locked ? 'opacity:.42;background:rgba(40,50,70,.85);border-color:rgba(120,140,170,.4);'
          : (st > 0 ? 'border-color:rgba(255,210,110,.9);background:linear-gradient(180deg,rgba(150,100,20,.96),rgba(88,54,10,.96));color:#ffe6a8;'
                    : 'border-color:rgba(140,240,180,.7);background:linear-gradient(180deg,rgba(22,86,64,.96),rgba(12,52,40,.96));color:#c8ffe4;'));
      b.textContent = locked ? '🔒' : String(i + 1);
      b.title = L.name + ' · ' + L.waves + ' 波 · 初始金币 ' + L.gold + (best ? ' · 最佳 ' + best + ' 波' : '');
      if (!locked) b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); });
      node.appendChild(b);
      var sn = document.createElement('div');
      sn.style.cssText = 'font-size:10px;height:13px;color:#ffd76a;letter-spacing:1px;';
      sn.textContent = st > 0 ? starStr(st) : (locked ? '' : '未通关');
      node.appendChild(sn);
      var nm = document.createElement('div');
      nm.style.cssText = 'font-size:10px;color:#9fc4f0;white-space:nowrap;';
      nm.textContent = (L.name.split('·')[1] || L.name).trim();
      node.appendChild(nm);
      var wv = document.createElement('div');
      wv.style.cssText = 'font-size:9px;color:#7d8ba3;';
      wv.textContent = L.waves + '波';
      node.appendChild(wv);
      nodes.push(node);
    })(i);
  }
  /* 无尽模式作为地图末尾的「终局节点」 */
  (function(){
    var u = endlessUnlocked(), eb = endlessBest(), svNow = loadEndlessSave();
    var node = document.createElement('div');
    node.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;width:92px;flex:0 0 auto;margin-top:52px;';
    var b = document.createElement('button');
    b.className = 'btn'; b.id = 'endlessBtn';
    b.style.cssText = 'width:62px;height:62px;border-radius:50%;padding:0;font-size:22px;font-weight:800;'
      + (u ? 'border-color:rgba(255,200,90,.85);background:linear-gradient(180deg,rgba(160,96,18,.96),rgba(96,54,10,.96));color:#ffe6a8;'
           : 'opacity:.42;background:rgba(40,50,70,.85);border-color:rgba(120,140,170,.4);');
    b.textContent = u ? '♾' : '🔒';
    b.title = '无尽模式：波次无上限' + (eb > 0 ? ' · 最高 ' + eb + ' 波' : '');
    if (u && svNow) b.addEventListener('click', function(e){ e.stopPropagation(); resumeEndless(); });
    else if (u) b.addEventListener('click', function(e){ e.stopPropagation(); startEndless(); });
    node.appendChild(b);
    var sn = document.createElement('div');
    sn.style.cssText = 'font-size:10px;height:13px;color:#ffd76a;';
    sn.textContent = eb > 0 ? ('最高' + eb + '波') : (svNow ? ('存到' + svNow.wave + '波') : '');
    node.appendChild(sn);
    var nm = document.createElement('div');
    nm.style.cssText = 'font-size:10.5px;color:#ffd08a;white-space:nowrap;font-weight:700;';
    nm.textContent = svNow && u ? '继续无尽' : '无尽模式';
    node.appendChild(nm);
    var wv = document.createElement('div');
    wv.style.cssText = 'font-size:9px;color:#7d8ba3;';
    wv.textContent = u ? '无上限' : '需先通关第 1 关';
    node.appendChild(wv);
    nodes.push(node);
  })();
  /* 节点之间画连线（垂直位置取两侧节点中点，形成蜿蜒路径感） */
  for (var n = 0; n < nodes.length; n++){
    if (n > 0){
      var prevTop = parseFloat(nodes[n - 1].style.marginTop) || 0;
      var curTop = parseFloat(nodes[n].style.marginTop) || 0;
      var link = document.createElement('div');
      link.style.cssText = 'flex:0 0 auto;width:22px;height:3px;border-radius:2px;margin-top:'
        + Math.round((prevTop + curTop) / 2 + 26) + 'px;'
        + 'background:linear-gradient(90deg,rgba(140,200,255,.28),rgba(140,200,255,.62));';
      wrap.appendChild(link);
    }
    wrap.appendChild(nodes[n]);
  }
  /* 打开时自动滚到「当前进度」那一关（不用手动划半天） */
  setTimeout(function(){
    var w = document.getElementById('lvMapWrap');
    if (!w) return;
    var target = Math.min(Math.max(0, prog.unlocked - 1), LEVELS.length - 1);
    if (nodes[target]) w.scrollLeft = Math.max(0, nodes[target].offsetLeft - w.clientWidth / 2 + 40);
  }, 40);""", 'PVZ 风格关卡地图')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.4 地图与开幕提示补丁完成 ---')
