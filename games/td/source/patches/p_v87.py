# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 弹层给标题/副标题加 id（用来显示当前流派倾向，不新增子元素以免打乱既有结构）
rep("""<div class="ov hidden" id="buffOv">
  <h1>选择强化</h1>
  <div class="sub">每通过一波就能强化一次 · 越选越强</div>""",
"""<div class="ov hidden" id="buffOv">
  <h1 id="buffTitle">选择强化</h1>
  <div class="sub" id="buffSub">每通过一波就能强化一次 · 越选越强</div>""", 'buffOv 标题加 id')

# ② 结束界面加「立刻重开」
rep("""  <button class="btn" id="againBtn">再来一局</button>""",
"""  <button class="btn" id="retryBtn" style="margin-top:6px;font-size:14px;border-color:rgba(140,240,180,.55);background:linear-gradient(180deg,rgba(20,90,66,.95),rgba(12,54,40,.95));color:#c8ffe4;">🔁 立刻重开本关</button>
  <button class="btn" id="againBtn">再来一局</button>""", '结束界面重开按钮')

# ③ 流派识别 + 抽卡可控工具（刷新 / 禁卡）
rep("""/* ===== v8.6 元素套装卡（构筑联动）=====""",
"""/* ===== v8.7 肉鸽闭环补强 =====
   ① 抽卡可控：换一批 + 禁卡（纯随机很劝退，要让玩家觉得「运气重要但我的决策也重要」）
   ② 流派识别：告诉玩家「你现在凑的是什么流派、还差多少」，给构筑一个目标感 */
var rerollLeft = 3, banLeft = 2, bannedIds = {}, curPicks = [], banMode = false;
function resetDraftTools(){ rerollLeft = 3; banLeft = 2; bannedIds = {}; curPicks = []; banMode = false; }
function addDraftTools(){ rerollLeft += 1; }                       /* 每 5 波补一次「换一批」 */
var ARCHETYPES = [
  { name:'🔥 灼烧流', hint:'火塔溅射 + 毒伤叠加',
    score:function(){ return (SET_COUNT.fire || 0) + (SET_COUNT.poison || 0)
      + Math.min(3, Math.floor((BUFFS.dotAdd || 0) / 0.3)) + Math.min(3, Math.floor((BUFFS.splashDmg || 0) / 0.4)); } },
  { name:'⚡ 连锁流', hint:'雷塔链弹 + 攻速堆叠',
    score:function(){ return (SET_COUNT.thunder || 0) + countTowersOf('thunder')
      + Math.min(4, Math.floor((BUFFS.rate - 1) / 0.2)); } },
  { name:'❄️ 永冻流', hint:'减速控场 + 暴击收割',
    score:function(){ return (SET_COUNT.ice || 0) + countTowersOf('ice')
      + Math.min(3, Math.floor((BUFFS.slowAdd || 0) / 0.3)); } },
  { name:'🎯 暴击流', hint:'暴击率堆满 + 狙击点杀',
    score:function(){ return Math.min(4, Math.floor((BUFFS.crit || 0) / 0.12)) + (SET_COUNT.sniper || 0)
      + Math.min(2, Math.floor((BUFFS.bossDmg || 0) / 0.4)); } },
  { name:'💰 经济流', hint:'利息滚雪球 + 塔位折扣',
    score:function(){ return Math.min(4, Math.floor((BUFFS.interest || 0) / 0.08))
      + Math.min(2, Math.floor((BUFFS.gold - 1) / 0.35)) + Math.min(2, Math.floor((BUFFS.costCut || 0) / 0.15)); } },
  { name:'🏰 塔海流', hint:'铺满共鸣阵 + 体系加成',
    score:function(){ return Math.min(6, Math.floor(towers.length / 6)); } }
];
function countTowersOf(elem){
  var n = 0;
  for (var i = 0; i < towers.length; i++) if (towers[i].elem === elem) n++;
  return Math.min(3, n);
}
function archetypeNow(){
  var best = null, bs = -1;
  for (var i = 0; i < ARCHETYPES.length; i++){ var sc = ARCHETYPES[i].score(); if (sc > bs){ bs = sc; best = ARCHETYPES[i]; } }
  if (!best || bs <= 0) return { name:'未成型', hint:'多抽同系卡 / 多建同系塔就会成型', score:0 };
  return { name:best.name, hint:best.hint + '（强度 ' + bs + '）', score:bs };
}
/* ===== v8.6 元素套装卡（构筑联动）=====""", '流派与抽卡工具')

# ④ pickBuffs 支持「排除列表」+ 本局禁卡过滤
rep("""function pickBuffs(n){
  var out = [], i;
  /* —— ① 保底一张炮塔专属强化：只从「玩家已经建了的塔」里抽（没建的塔抽到也白搭）—— */
  var have = builtElemSet();
  var experts = BUFF_POOL.filter(function(b){ return b.elKey && have[b.elKey]; });
  if (!experts.length) experts = BUFF_POOL.filter(function(b){ return b.elKey; });""",
"""function pickBuffs(n, excludeIds){
  var out = [], i;
  var ex = excludeIds || {};
  var okCard = function(b){ return !bannedIds[b.id] && !ex[b.id]; };   /* v8.7：本局禁掉的卡 + 本次刷新要排除的卡 */
  /* —— ① 保底一张炮塔专属强化：只从「玩家已经建了的塔」里抽（没建的塔抽到也白搭）—— */
  var have = builtElemSet();
  var experts = BUFF_POOL.filter(function(b){ return b.elKey && have[b.elKey] && okCard(b); });
  if (!experts.length) experts = BUFF_POOL.filter(function(b){ return b.elKey && okCard(b); });
  if (!experts.length) experts = BUFF_POOL.filter(function(b){ return b.elKey; });""", 'pickBuffs 排除列表')
rep("  var pool = BUFF_POOL.filter(function(b){ return !b.elKey; });\n  var freshPool = pool.filter(function(b){ return !pickedIds[b.id]; });",
    "  var pool = BUFF_POOL.filter(function(b){ return !b.elKey && okCard(b); });\n  var freshPool = pool.filter(function(b){ return !pickedIds[b.id]; });", 'pickBuffs 通用池排除')

# ⑤ 强化卡面板：流派提示 + 换一批 / 禁卡 / 商店（合并成一行，保持子元素数量不变）
rep("""function showBuffChoices(){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */
  var picks = pickBuffs(3);
  var el = document.getElementById('buffList');
  el.innerHTML = '';""",
"""function showBuffChoices(){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */
  var picks = pickBuffs(3);
  curPicks = picks.slice();
  var el = document.getElementById('buffList');
  el.innerHTML = '';
  /* v8.7：顶部告诉玩家「现在凑的是什么流派」+ 还剩下多少可控手段 */
  var _bt = document.getElementById('buffTitle'), _bs = document.getElementById('buffSub');
  var _ar = archetypeNow();
  if (_bt) _bt.textContent = banMode ? '🚫 选一张禁掉（本局不再出现）' : '选择强化';
  if (_bs) _bs.innerHTML = '🎯 当前倾向：<b style="color:#ffd76a">' + _ar.name + '</b>　<span style="font-size:11px;color:#9fc4f0">'
    + _ar.hint + '</span><br><span style="font-size:10.5px;color:#7d8ba3;">🔄 换一批 ' + rerollLeft + ' 次　🚫 禁卡 ' + banLeft + ' 次</span>';""", '强化卡面板顶部流派')

rep("""    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      grantCard(b);                            /* v8.6：走统一入口（含套装计数） */""",
"""    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (banMode && banLeft > 0){             /* v8.7 禁卡模式：点哪张就禁掉哪张，然后重抽 */
        bannedIds[b.id] = 1; banLeft--; banMode = false;
        showTip('已禁掉「' + b.name + '」，本局不再出现（还剩 ' + banLeft + ' 次）');
        SFX.upgrade(); showBuffChoices(); return;
      }
      grantCard(b);                            /* v8.6：走统一入口（含套装计数） */""", '禁卡模式点击')

rep("""  /* v8.1：强化卡界面追加「波间商店」入口（金币有出口；逛完回来继续选卡） */
  var shopBtn = document.createElement('button');
  shopBtn.className = 'btn';
  shopBtn.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:7px;';
  shopBtn.innerHTML = '🛒 进波间商店（花金币换即时战力）　<span style="color:#ffd76a">' + goldText() + ' 金</span>';
  shopBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
    openShop();
  });
  el.appendChild(shopBtn);""",
"""  /* v8.1 商店入口 ｜ v8.7 追加「换一批」「禁一张」（合并成一行，避免撑高面板） */
  var toolRow = document.createElement('div');
  toolRow.style.cssText = 'display:flex;gap:6px;width:100%;margin-top:7px;';
  var rerollBtn = document.createElement('button');
  rerollBtn.className = 'btn';
  rerollBtn.id = 'rerollBtn';
  rerollBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;'
    + (rerollLeft > 0 ? '' : 'opacity:.45;');
  rerollBtn.innerHTML = '🔄 换一批<br><span style="font-size:10.5px;color:#9fc4f0">剩 ' + rerollLeft + ' 次</span>';
  rerollBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (rerollLeft <= 0){ showTip('没有「换一批」次数了（每 5 波会补充 1 次）'); return; }
    rerollLeft--;
    var ex = {};
    curPicks.forEach(function(c){ ex[c.id] = 1; });     /* 本次刷新排除当前这 3 张，避免换了个寂寞 */
    SFX.upgrade(); showBuffChoices();
    showTip('已换一批（还剩 ' + rerollLeft + ' 次）');
  });
  var banBtn = document.createElement('button');
  banBtn.className = 'btn';
  banBtn.id = 'banBtn';
  banBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;'
    + (banLeft > 0 ? '' : 'opacity:.45;');
  banBtn.innerHTML = '🚫 禁一张<br><span style="font-size:10.5px;color:#9fc4f0">剩 ' + banLeft + ' 次</span>';
  banBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (banLeft <= 0){ showTip('没有「禁卡」次数了'); return; }
    banMode = !banMode;
    showBuffChoices();
    showTip(banMode ? '点一张卡把它禁掉（本局不再出现）' : '已取消');
  });
  var shopBtn = document.createElement('button');
  shopBtn.className = 'btn';
  shopBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;';
  shopBtn.innerHTML = '🛒 商店<br><span style="font-size:10.5px;color:#ffd76a">' + goldText() + ' 金</span>';
  shopBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
    openShop();
  });
  toolRow.appendChild(rerollBtn); toolRow.appendChild(banBtn); toolRow.appendChild(shopBtn);
  el.appendChild(toolRow);""", '工具行（换一批/禁卡/商店）')

# 换一批要真的排除当前三张 → showBuffChoices 支持排除参数
rep("""function showBuffChoices(){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */
  var picks = pickBuffs(3);
  curPicks = picks.slice();""",
"""function showBuffChoices(excludeIds){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */
  var picks = pickBuffs(3, excludeIds);
  curPicks = picks.slice();""", 'showBuffChoices 支持排除')
rep("""    rerollLeft--;
    var ex = {};
    curPicks.forEach(function(c){ ex[c.id] = 1; });     /* 本次刷新排除当前这 3 张，避免换了个寂寞 */
    SFX.upgrade(); showBuffChoices();""",
"""    rerollLeft--;
    var ex = {};
    curPicks.forEach(function(c){ ex[c.id] = 1; });     /* 本次刷新排除当前这 3 张，避免换了个寂寞 */
    SFX.upgrade(); showBuffChoices(ex);""", '刷新传排除列表')

# ⑥ 每 5 波补一次「换一批」
rep("      /* v8.0 无尽：每 5 波先弹「无尽契约」（三选一，代价与收益并存），选完接着选强化卡 */",
    "      addDraftTools();          /* v8.7：每过 5 波补 1 次「换一批」 */\n      /* v8.0 无尽：每 5 波先弹「无尽契约」（三选一，代价与收益并存），选完接着选强化卡 */", '每5波补刷新')

# ⑦ 每局重置工具次数
rep("  SET_COUNT = {};                                     /* v8.6：新一局重新累计套装进度 */",
    "  SET_COUNT = {};                                     /* v8.6：新一局重新累计套装进度 */\n  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */", '开局重置工具', cnt=2)

# ⑧ 失败也给星核（不到 50 波也不白打）+ 快速重开
rep("""  /* ===== v8.2 转生：无尽撑到 50 波起，每 10 波换 1 星核 ===== */
  var gained = 0;
  if (endless && wave >= 50){ gained = Math.floor(wave / 10); addStarcore(gained); }""",
"""  /* ===== v8.2 转生：无尽撑到 50 波起，每 10 波换 1 星核 =====
     v8.7：不到 50 波也按每 20 波 1 颗给（失败不再白打 —— 肉鸽的长线钩子） */
  var gained = 0;
  if (endless){
    gained = (wave >= 50) ? Math.floor(wave / 10) : Math.floor(wave / 20);
    if (gained > 0) addStarcore(gained);
  }""", '失败也给星核')
rep("  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */",
    "  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */\n  on('retryBtn', function(){                          /* v8.7 失败后立刻重开（不用回首页重新点） */\n    if (endless) startEndless(); else startLevel(lvIndex | 0);\n    hideAll();\n  });", '快速重开绑定')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.7 补丁完成 ---')
