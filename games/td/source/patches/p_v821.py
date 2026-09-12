# -*- coding: utf-8 -*-
# v8.21 一次交付五项：BOSS 分阶段 / 成就系统 / 共鸣裂隙 / 6·7·8 关多入口 / 第 9 座塔
import io, re
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ══════════ ① BOSS 分阶段 ══════════
rep('''    /* ② 召唤：每 6 秒 2 个步兵（入队，安全点插入） */
    if (typeof e.skill1T !== 'number') e.skill1T = 5.0;
    e.skill1T -= dt;
    if (e.skill1T <= 0){
      e.skill1T = 6.0;''',
'''    /* ===== v8.21 BOSS 分阶段（方案里的 ⭐⭐ 项：原来只有「40% 触发一次狂暴」一个节点）=====
       阶段 I（>66%）基础 → 阶段 II（≤66%）召唤频率翻倍 → 阶段 III（≤33%）沉默频率翻倍。
       原有的「40% 狂暴」完全保留不动（移速 ×1.6、护甲 +0.2），这里是**纯叠加**，
       不改变既有触发点，避免打乱已校准的平衡。 */
    if (typeof e.stage !== 'number') e.stage = 1;
    var _hr = e.hp / e.maxhp;
    if (e.stage < 2 && _hr <= 0.66){
      e.stage = 2;
      addFloat(e.x, e.y - e.r - 12, 'BOSS 暴怒 · 阶段 II', '#ffd76a');
      burst(e.x, e.y, '#ffd76a', 14);
      SFX.rage(); shakeT = 0.3;
    }
    if (e.stage < 3 && _hr <= 0.33){
      e.stage = 3;
      addFloat(e.x, e.y - e.r - 12, 'BOSS 绝境 · 阶段 III', '#ff4d4d');
      burst(e.x, e.y, '#ff4d4d', 22);
      SFX.rage(); shakeT = 0.45;
    }
    /* ② 召唤：阶段 I 每 6 秒 2 个步兵；阶段 II 起缩短到 3.5 秒（入队，安全点插入） */
    if (typeof e.skill1T !== 'number') e.skill1T = 5.0;
    e.skill1T -= dt;
    if (e.skill1T <= 0){
      e.skill1T = (e.stage >= 2) ? 3.5 : 6.0;''',
    'BOSS 分阶段（阶段判定 + 召唤加快）')

rep('''    /* ③ 沉默：每 10 秒让最近的 2 座塔停火 3 秒 */
    if (typeof e.skill2T !== 'number') e.skill2T = 8.0;
    e.skill2T -= dt;
    if (e.skill2T <= 0){
      e.skill2T = 10.0;''',
'''    /* ③ 沉默：阶段 I/II 每 10 秒让最近的 2 座塔停火 3 秒；阶段 III 缩短到 5 秒 */
    if (typeof e.skill2T !== 'number') e.skill2T = 8.0;
    e.skill2T -= dt;
    if (e.skill2T <= 0){
      e.skill2T = (e.stage >= 3) ? 5.0 : 10.0;''',
    'BOSS 阶段 III 沉默加快')

# ══════════ ② 成就系统 ══════════
ACH = u'''
/* ===== v8.21 成就系统（方案里的「缺少长期目标系统」→ 补齐）=====
   14 个成就，覆盖通关 / 无尽 / 构筑 / 收藏四条线。
   存储：prog.ach = { key:1 }（跟着 td_prog 存档走，无需新的存储键）
   判定：checkAch() 遍历未解锁的逐个 test()，由主循环节流调用（每 2 秒一次，成本可忽略）。 */
var ACHIEVEMENTS = [
  { key:'tutorial', icon:'🎓', name:'学以致用',  desc:'完成新手教学',
    test:function(){ return !!prog.tutorialDone; } },
  { key:'first',    icon:'🚩', name:'初次防御',  desc:'通关任意一关',
    test:function(){ return (prog.unlocked || 1) >= 2; } },
  { key:'three',    icon:'⭐', name:'三星指挥',  desc:'任意一关拿到 3 星',
    test:function(){ var st = prog.stars || {}; for (var k in st) if (st[k] >= 3) return true; return false; } },
  { key:'allstar',  icon:'👑', name:'满星大师',  desc:'全部 ' + LEVELS.length + ' 关都拿 3 星',
    test:function(){ var st = prog.stars || {}, n = 0; for (var k in st) if (st[k] >= 3) n++; return n >= LEVELS.length; } },
  { key:'unlock',   icon:'🗺', name:'地图全开',  desc:'解锁全部 ' + LEVELS.length + ' 关',
    test:function(){ return (prog.unlocked || 1) > LEVELS.length; } },
  { key:'flawless', icon:'🛡', name:'毫发无伤',  desc:'满血通关任意一关（基地一点血都没掉）',
    test:function(){ return false; } },          /* 只在通关那一刻由 levelClear 直接解锁 */
  { key:'e30',      icon:'♾', name:'撑住 30 波', desc:'无尽模式打到第 30 波', test:function(){ return endlessBest() >= 30; } },
  { key:'e50',      icon:'💪', name:'撑住 50 波', desc:'无尽模式打到第 50 波', test:function(){ return endlessBest() >= 50; } },
  { key:'e100',     icon:'🔥', name:'撑住 100 波', desc:'无尽模式打到第 100 波', test:function(){ return endlessBest() >= 100; } },
  { key:'rebirth',  icon:'🌟', name:'第一次转生', desc:'无尽转生拿到第 1 颗星核', test:function(){ return starcore() > 0 || (typeof prog.starTotal === 'number' && prog.starTotal > 0); } },
  { key:'sets3',    icon:'🧩', name:'套装大师',  desc:'一局同时激活 3 个元素套装',
    test:function(){ var n = 0; for (var k in ELEM_SETS) if (setOn(k)) n++; return n >= 3; } },
  { key:'tower40',  icon:'🏰', name:'塔海',      desc:'一局建满 40 座塔', test:function(){ return built >= 40; } },
  { key:'slayer',   icon:'💀', name:'千军万马',  desc:'一局击杀 1000 个敌人', test:function(){ return kills >= 1000; } },
  { key:'daily',    icon:'📅', name:'每日打卡',  desc:'完成一次每日挑战', test:function(){ return !!prog.daily; } }
];
function achByKey(k){ for (var i = 0; i < ACHIEVEMENTS.length; i++) if (ACHIEVEMENTS[i].key === k) return ACHIEVEMENTS[i]; return null; }
function achCount(){ var n = 0, a = prog.ach || {}; for (var k in a) if (a[k]) n++; return n; }
function achUnlocked(k){ return !!(prog.ach && prog.ach[k]); }
function unlockAch(key){
  if (!prog.ach) prog.ach = {};
  if (prog.ach[key]) return false;
  prog.ach[key] = 1;
  saveProg();
  var a = achByKey(key);
  if (a){
    if (running && typeof addFloat === 'function') addFloat(W / 2, H * 0.28, '🏆 成就达成：' + a.name, '#ffd76a');
    try { SFX.upgrade(); } catch (e) {}
  }
  return true;
}
function checkAch(){
  if (!prog.ach) prog.ach = {};
  for (var i = 0; i < ACHIEVEMENTS.length; i++){
    var a = ACHIEVEMENTS[i];
    if (prog.ach[a.key]) continue;
    try { if (a.test()) unlockAch(a.key); } catch (e) {}
  }
}
var achTick = 0;
'''
rep('var SET_NEED = 3;', ACH.strip() + '\nvar SET_NEED = 3;', '插入成就系统')

# 主循环节流检查（2 秒一次）
rep('''  musicTick(raw);   // v6.4 背景音乐（真实时间驱动，不随倍速加速）''',
    '''  musicTick(raw);   // v6.4 背景音乐（真实时间驱动，不随倍速加速）
  achTick += raw; if (achTick >= 2){ achTick = 0; checkAch(); }   /* v8.21 成就判定（每 2 秒一次，成本可忽略） */''',
    '主循环挂成就检查')

# 通关瞬间：毫发无伤
rep('''  var st = starsForHp(hp);''',
    '''  if (hp >= MAXHP) unlockAch('flawless');     /* v8.21：满血通关「毫发无伤」 */
  var st = starsForHp(hp);''',
    '通关挂毫发无伤')

# 套装激活处也检查一次
rep('''      showBanner(w.name + ' 激活');''',
    '''      showBanner(w.name + ' 激活');
      checkAch();                              /* v8.21：套装类成就（如一局凑齐 3 套） */''',
    '套装激活挂成就检查')

# 图鉴：第 8 页「成就」
rep('''    <button class="btn" id="bookTabWx" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🌤 天气</button>''',
'''    <button class="btn" id="bookTabWx" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🌤 天气</button>
    <button class="btn" id="bookTabAch" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">🏆 成就</button>''',
    '图鉴加成就页签')
rep("""  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo', wx:'bookTabWx' };""",
    """  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo', wx:'bookTabWx', ach:'bookTabAch' };""",
    '图鉴页签 id 表加成就')
rep('''  } else if (bookTab === 'info'){
    h = bookInfoCard();''',
'''  } else if (bookTab === 'ach'){
    /* v8.21 成就页：已达成的高亮，未达成的置灰并给出条件 */
    h += '<div style="font-size:11.5px;color:#8fb4dc;text-align:left;margin-bottom:6px;">'
       + '已达成 <b style="color:#ffd76a;">' + achCount() + ' / ' + ACHIEVEMENTS.length + '</b>'
       + '　·　成就跟着存档走，删档会一起清掉</div>';
    var got = achCount();
    for (i = 0; i < ACHIEVEMENTS.length; i++) h += bookAchCard(ACHIEVEMENTS[i]);
    if (got >= ACHIEVEMENTS.length) h += '<div style="font-size:12px;color:#ffd76a;text-align:center;margin-top:6px;">🏆 全部达成，你就是共鸣之塔的主人</div>';
  } else if (bookTab === 'info'){
    h = bookInfoCard();''',
    '图鉴成就页渲染')
rep("      : (bookTab === 'wx') ? ('共 ' + (WEATHER_KEYS.length + 1) + ' 种天气 · 每 3 波切换 · 有得有失')",
    "      : (bookTab === 'wx') ? ('共 ' + (WEATHER_KEYS.length + 1) + ' 种天气 · 每 3 波切换 · 有得有失')\n      : (bookTab === 'ach') ? ('共 ' + ACHIEVEMENTS.length + ' 个成就 · 已达成 ' + achCount() + ' 个')",
    '图鉴成就页副标题')
rep('function bookWeatherCard(k, cur){',
'''function bookAchCard(a){
  /* v8.21：已达成 → 金色高亮；未达成 → 置灰 */
  var got = achUnlocked(a.key);
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:' + (got ? 'rgba(60,48,16,.85)' : 'rgba(22,32,56,.7)') + ';'
    + 'border:1px solid ' + (got ? 'rgba(255,200,110,.6)' : 'rgba(120,180,255,.18)') + ';">'
    + '<span style="font-size:19px;flex:0 0 auto;' + (got ? '' : 'opacity:.3;filter:grayscale(1);') + '">' + a.icon + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:' + (got ? '#ffd76a' : '#9fc4f0') + ';">' + a.name + '</span>'
    + '<span class="udesc" style="display:block;font-size:11.5px;color:#9fc4f0;">' + a.desc + '</span>'
    + '</span>'
    + '<span style="flex:0 0 auto;font-size:11px;color:' + (got ? '#7cf5c0' : '#7d8ba3') + ';">' + (got ? '✅ 已达成' : '未达成') + '</span>'
    + '</div>';
}
function bookWeatherCard(k, cur){''',
    'bookAchCard 渲染器')

# ══════════ ③ 共鸣裂隙 ══════════
RIFT = u'''
/* ===== v8.21 共鸣裂隙（无尽专属）=====
   原方案是「裂隙格无法触发共鸣」，但那等于惩罚玩家精心布局，太硬。
   改成**取舍**：站在裂隙格上的塔 **伤害 +50%，但完全不参与任何共鸣**（孤立）。
   → 高伤 vs 失去共鸣/共振/增幅场，玩家要自己权衡把哪座塔放上去。
   每 15 波生成 1 个（最多同时 3 个），只在无尽模式出现，不影响已校准的 15 个正式关卡。 */
var rifts = [];
function riftKey(c, r){ return c + ',' + r; }
function onRift(c, r){ return rifts.indexOf(riftKey(c, r)) >= 0; }
function resetRifts(){ rifts = []; }
function spawnRift(){
  if (rifts.length >= 3) return false;
  for (var n = 0; n < 80; n++){
    var c = 1 + Math.floor(Math.random() * (COLS - 2));
    var r = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (isPath(c, r) || grid[c + ',' + r]) continue;
    var k = riftKey(c, r);
    if (rifts.indexOf(k) >= 0) continue;
    rifts.push(k);
    addFloat(cx(c), cy(r), '⚡ 共鸣裂隙', '#c9a6ff');
    burst(cx(c), cy(r), '#c9a6ff', 18);
    showTip('⚡ 共鸣裂隙出现：建在上面的塔伤害 +50%，但不参与任何共鸣');
    recalcResonance();
    return true;
  }
  return false;
}
function drawRifts(){
  for (var i = 0; i < rifts.length; i++){
    var q = rifts[i].split(',');
    var c = parseInt(q[0], 10), r = parseInt(q[1], 10);
    var x = cx(c), y = cy(r), h = CELL * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(gameT * 3 + i * 1.7);
    ctx.strokeStyle = 'rgba(200,150,255,.55)'; ctx.lineWidth = 1.6;
    ctx.strokeRect(x - h + 2, y - h + 2, CELL - 4, CELL - 4);
    ctx.strokeStyle = '#c9a6ff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.7, y - h * 0.75);
    ctx.lineTo(x + h * 0.15, y - h * 0.15);
    ctx.lineTo(x - h * 0.35, y + h * 0.15);
    ctx.lineTo(x + h * 0.75, y + h * 0.8);
    ctx.stroke();
    ctx.restore();
  }
}
'''
rep('function recalcResonance(){ for (var i = 0; i < towers.length; i++) towers[i].res = resonanceOf(towers[i]); refreshSysCache(); }',
    RIFT.strip() + '''
/* v8.21：裂隙格上的塔「孤立」—— 不参与任何共鸣（换来伤害 +50%，见 statAt） */
function recalcResonance(){
  for (var i = 0; i < towers.length; i++){
    var t = towers[i];
    if (onRift(t.c, t.r)){
      t.rift = true;
      t.res = { dmgMul:1, rateMul:1, rangeMul:1, tags:['裂隙+50%'], combo:0 };
    } else {
      t.rift = false;
      t.res = resonanceOf(t);
    }
  }
  refreshSysCache();
}''',
    '共鸣裂隙内核 + recalcResonance 改造')

rep('''  if (twD < 0.2) twD = 0.2; if (twS < 0.2) twS = 0.2; if (twG < 0.2) twG = 0.2;''',
    '''  if (t.rift) twD += 0.5;      /* v8.21 共鸣裂隙：伤害 +50%（代价是不参与任何共鸣） */
  if (twD < 0.2) twD = 0.2; if (twS < 0.2) twS = 0.2; if (twG < 0.2) twG = 0.2;''',
    'statAt 加裂隙伤害')

rep('''  drawStaticBg();          // 网格 + 路径（缓存层，每帧一次 drawImage）''',
    '''  drawStaticBg();          // 网格 + 路径（缓存层，每帧一次 drawImage）
  drawRifts();             // v8.21 共鸣裂隙标记（数量少，直接画在动态层）''',
    '绘制裂隙')

rep('''      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）''',
    '''      /* v8.21 共鸣裂隙：无尽模式每 15 波长出一个（最多 3 个） */
      if (endless && wave > 0 && wave % 15 === 0) spawnRift();
      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）''',
    '波次结束生成裂隙')

rep('''  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */''',
    '''  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */
  resetRifts();                                       /* v8.21：新一局清空共鸣裂隙 */''',
    '新一局清空裂隙（教学关 + 正式关卡共 2 处）', 2)

rep('''      towers: list, buffs: BUFFS, cards: runCards, best: 0, t: Date.now()''',
    '''      towers: list, buffs: BUFFS, cards: runCards, rifts: rifts, best: 0, t: Date.now()''',
    '无尽存档写入裂隙')
rep('''  runCards = (sv.cards && sv.cards.length) ? sv.cards : [];   /* v8.18：续玩时把抽卡记录也接上 */''',
    '''  runCards = (sv.cards && sv.cards.length) ? sv.cards : [];   /* v8.18：续玩时把抽卡记录也接上 */
  rifts = (sv.rifts && sv.rifts.length) ? sv.rifts.slice() : [];   /* v8.21：续玩时恢复共鸣裂隙 */
  recalcResonance();''',
    '无尽续玩恢复裂隙')

# ══════════ ④ 第 6 / 7 / 8 关改双入口 + 平衡补偿 ══════════
def dual(name, waves, gold, diff, path, path2, newgold, newdiff):
    # 各关的空白对齐不一致（有的 waves 前两个空格），用正则匹配最稳
    global s
    pat = re.compile(r"\{ name:'" + re.escape(name) + r"',\s*waves:" + str(waves) +
                     r", gold:" + str(gold) + r", diff:" + re.escape(diff) +
                     r",\s*path:" + re.escape(path) + r" \}")
    assert len(pat.findall(s)) == 1, (name, len(pat.findall(s)))
    new = ("{ name:'%s', waves:%d, gold:%d, diff:%s,\n    path:%s,\n"
           "    path2:%s }   /* v8.21 双入口：难度按「防守需求翻倍」下调、初始金币上调（同 9/12/15 关口径） */") % (
           name, waves, newgold, newdiff, path, path2)
    s = pat.sub(lambda m: new, s, count=1); print('OK 双入口：' + name)

dual('6 · 蛇行', 20, 150, '0.85', '[[0,8],[3,8],[3,1],[7,1],[7,7],[11,7],[11,2],[14,2],[14,9],[15,9]]',
     '[[0,0],[6,0],[6,4],[12,4],[12,9],[15,9]]', 218, '0.50')
dual('7 · 回旋镖', 22, 146, '0.88', '[[0,4],[12,4],[12,7],[4,7],[4,2],[15,2],[15,9]]',
     '[[0,9],[2,9],[2,6],[9,6],[9,9],[15,9]]', 212, '0.52')
dual('8 · 十字口', 24, 142, '0.92', '[[0,5],[15,5],[15,1],[8,1],[8,8],[3,8],[3,9],[15,9]]',
     '[[0,0],[4,0],[4,3],[11,3],[11,9],[15,9]]', 206, '0.53')

# ══════════ ⑤ 第 9 座塔（示例塔：机枪 · 纯数据，零逻辑代码）══════════
rep("""  mortar:  { name:'榴弹',""",
"""  /* ===== v8.21 第 9 座塔：机枪（🎯 一次「只加数据、不改代码」的示范）=====
     整座塔**只加了这条数据**：建塔面板、图鉴、升级面板、专属强化卡池全部自动收录
     （因为它们都是遍历 ELEMS 生成的）。定位是现有 8 座塔都没覆盖的「高频低伤」：
     单次伤害极小 → 天然绕过「壁垒兵」的单次伤害减免（>25% 血量才触发减伤）与「硬化」词缀
     （25% 概率只吃 40% 伤害，多段小伤害的期望损失更小）。 */
  gatling: { name:'机枪', icon:'🔫', color:'#c8d8ee', cost:96, dmg:6, rate:0.16, range:2.3,
             sys:'solo', role:'速射', soloStar:3, groupStar:2,
             fx:'高频低伤：单次伤害极小，专克「壁垒兵」的单次减伤与「硬化」词缀',
             upName:'伤害 +30%/级（攻速按通用成长）' },
  mortar:  { name:'榴弹',""",
    '第 9 座塔：机枪')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.21 五项全部写入')
