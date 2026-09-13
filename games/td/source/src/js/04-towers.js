/* ══════════════════════════════════════════════════════════════════════════
 * 04-towers.js —— 塔：9 座塔数据表 ELEMS、全局加成 BUFFS、连杀状态、技能/套装/成就状态
 *
 * 来源：game.html 第 1337-2592 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 塔 ================= */
/* ===== 9 座塔的数值与机制总表（8 座攻击塔 + 1 座辅助塔）=====
   通用字段：name 中文名 · icon 图标 · color 主色 · cost 建造成本 · dmg 单发伤害 · rate 攻击间隔(秒) ·
            range 射程(格) · sys 所属体系(solo/group/ctrl/support) · role 定位 · soloStar/groupStar 展示星级
            upXxx 每级成长值 · upName 升级说明文案
   机制字段：slow/slowT 减速 · dot/dotT 中毒 · chain/chainK 链弹 · aura 光环 · splash 溅射 · crit 暴击 等 */
var ELEMS = {
  /* ===== TOWERS_V6_PATCH：炮塔定位重构（对单 / 对群分工明确）+ 新增狙击 / 榴弹 =====
     每条统一追加 role / soloStar / groupStar 三个展示字段（面板与图鉴直接读，不另建表）
     机制字段：splashR 溅射半径(格) / splashK 溅射伤害系数 / dotR 中毒范围(格) / slowR 减速范围(格)
               antiArmor 对有甲目标加伤 / highValue 优先锁定高价值目标 / chainK 链弹每跳衰减 */
  fire:    { name:'火焰', icon:'🔥', color:'#ff5a2a', cost:76,  dmg:15, rate:0.80, range:2.5,
             splashR:1.0, splashK:0.6, sys:'group',
             upSplashR:0.06, upSplashK:0.03, upName:'溅射半径 +0.06 格 / 溅射伤害 +3%',
             role:'溅射', soloStar:2, groupStar:3,
             fx:'小范围溅射：命中点 1.0 格内「其他敌人」受 60% 伤害（与热震叠加共存）' },
  ice:     { name:'冰霜', icon:'❄️', color:'#7fe4ff', cost:72,  dmg:7,  rate:0.85, range:2.4, slow:0.5, slowT:1.6,
             slowR:1.0, sys:'ctrl',
             upSlowT:0.15, upSlowR:0.06, upName:'减速时长 +0.15 秒 / 减速范围 +0.06 格',
             role:'控场', soloStar:1, groupStar:2,
             fx:'控场：命中 50% 减速 1.6 秒，且命中点 1.0 格内敌人全部减速；伤害最低' },
  thunder: { name:'雷电', icon:'⚡', color:'#ffd21a', cost:104, dmg:14, rate:1.20, range:2.8, chain:5, chainK:0.85, sys:'group',
             upChain:0.4, upChainK:0.012, upName:'链弹 +0.4 个目标 / 每跳衰减改善',
             role:'链式', soloStar:1, groupStar:4,
             fx:'链式清群：弹射 5 个目标，每跳衰减 ×0.85（放宽了旧的 ×0.6）' },
  poison:  { name:'剧毒', icon:'☠️', color:'#4fe060', cost:88,  dmg:6,  rate:1.05, range:2.5, dot:10, dotT:3.0,
             dotR:1.2, sys:'group',
             upDot:2.0, upDotR:0.08, upName:'毒伤 +2/秒 / 中毒范围 +0.08 格',
             role:'持续', soloStar:1, groupStar:4,
             fx:'大范围持续：命中点 1.2 格内所有敌人中毒（10/秒 × 3 秒），毒伤无视护甲' },
  phys:    { name:'物理', icon:'🔨', color:'#cfd8e8', cost:78,  dmg:30, rate:0.72, range:2.2,
             antiArmor:0.35, sys:'solo',
             upAntiArmor:0.06, upName:'对护甲目标加成 +6%/级',
             role:'单体', soloStar:4, groupStar:1,
             fx:'单体输出：对有护甲的目标伤害 +35%（已取消穿甲，护甲改靠组合破除）' },
  support: { name:'辅助', icon:'📡', color:'#b98cff', cost:88,  dmg:0,  rate:0,    range:2.6, aura:true,
             auraDmg:0.25, auraRate:0.18, sys:'support',
             upAura:0.08, upName:'光环效果 +8%/级（伤害与攻速同步增强）',
             role:'光环', soloStar:0, groupStar:0,
             fx:'光环：相邻塔伤害 +25%、攻速 +18%（自身不攻击）' },
  sniper:  { name:'狙击', icon:'🎯', color:'#9fe8ff', cost:120, dmg:95, rate:2.6,  range:4.5,
             highValue:true, sys:'solo',
             upRange:0.25, upHV:0.10, upName:'射程 +0.25 格 / 对高价值目标 +10%/级',
             role:'点杀', soloStar:5, groupStar:1,
             fx:'超远点杀：只打单体（射程 4.5 格）；优先锁定医疗兵 / 精英队长 / BOSS' },
  /* ===== v8.21 第 9 座塔：机枪（🎯 一次「只加数据、不改代码」的示范）=====
     整座塔**只加了这条数据**：建塔面板、图鉴、升级面板、专属强化卡池全部自动收录
     （因为它们都是遍历 ELEMS 生成的）。定位是现有 8 座塔都没覆盖的「高频低伤」：
     单次伤害极小 → 天然绕过「壁垒兵」的单次伤害减免（>25% 血量才触发减伤）与「硬化」词缀
     （25% 概率只吃 40% 伤害，多段小伤害的期望损失更小）。 */
  gatling: { name:'机枪', icon:'🔫', color:'#d8cff0', cost:96, dmg:6, rate:0.16, range:2.3,
             sys:'solo', role:'速射', soloStar:3, groupStar:2,
             fx:'高频低伤：单次伤害极小，专克「壁垒兵」的单次减伤与「硬化」词缀',
             upRange:0.05, upName:'射程 +0.05 格/级' },
  mortar:  { name:'榴弹', icon:'💥', color:'#ffb04a', cost:115, dmg:12, rate:1.8,  range:3.0,
             splashR:2.2, splashK:0.45, sys:'group',
             upSplashR:0.15, upSplashK:0.03, upName:'溅射半径 +0.15 格 / 溅射伤害 +3%',
             role:'范围', soloStar:1, groupStar:5,
             fx:'大范围爆破：命中点 2.2 格内敌人受 45% 伤害；对单体极低' }
};
/* 场上所有炮塔对象数组；grid 是「格子键 'c,r' → 塔」的索引，塔的增删必须两边同步 */
var towers = [], grid = {};
/* 本局所有全局加成与特殊状态的总账本（倍率默认 1、加法项默认 0）。
   字段示例：dmg 全塔伤害 / rate 攻速 / range 射程 / gold 金币收益 / crit 暴击率 / reso 共鸣强度 /
   sets 已激活的元素套装 / tw 各元素塔的专属加成 / shieldHP 基地护盾 等 */
var BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,
              costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0, shieldHP:0,
              splashDmg:0, dotAdd:0, elBoost:0,
              el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },
              tw:{}, sets:{} };                       /* v8.6 套装激活标记 */                       // v7.8 炮塔专属强化：tw[elem] = 该塔的专属加成（全部加性累加）
/* ===== v7.8 炮塔专属强化接口 =====
   BUFFS.tw[elem] 存单座塔的专属加成（key = fire/ice/thunder/poison/phys/support/sniper/mortar）。
   专属卡的 apply 必须通过 twAdd() 写入 → 自动 bump twStamp 让 elemAt 缓存失效，
   避免「抽了卡但塔的数据还是旧的」这类缓存不刷新问题。 */
var twStamp = 0;
/* 累加某元素炮塔的专属加成（BUFFS.tw[elem][field] += v），并清空元素数值缓存 —— 抽到「火塔伤害 +10%」这类卡时调用 */
function twAdd(elem, field, v){
  if (!BUFFS.tw) BUFFS.tw = {};
  var o = BUFFS.tw[elem] || (BUFFS.tw[elem] = {});
  o[field] = (o[field] || 0) + v;
  twStamp++; elemCache = {};                       // 缓存最多 48 项，重建成本可忽略
}
/* 取某元素炮塔的专属加成对象；没有则返回 null（statAt 与面板显示都会查它）*/
function twOf(elem){ return (BUFFS.tw && BUFFS.tw[elem]) || null; }
/* 连杀状态：comboCount 当前连杀数 · comboT 提示剩余秒数 · comboTxt 提示文字 · bgmT 音乐节拍计时 */
var comboCount = 0, comboT = 0, comboTxt = '', bgmT = 0;
/* —— 连杀提示重做（A 路）状态：弹入/档位判定全靠 gameT 打时间戳，不新增任何计时器 —— */
var COMBO_T_MAX = 2.4;                       // 连杀提示存活基准秒数（与 killEnemy 保持一致）
var comboShown = -99;                        // 本次「弹入」起始的 gameT 时间戳（不是计时器）
var comboShownN = -1, comboShownTier = -1;   // 已处理过的连杀数 / 档位：用于判定弹入与切档时机
/* ===== v8.5 主动技能扩展 =====
   毛毛发的方案里「让玩家有事可做」那一条：后期不该只是看塔打。
   4 个技能各有独立冷却；需要指定目标的技能会先进入「选择模式」，再点战场上的敌人/塔生效。 */
var SKILLS = [
  { key:'freeze',   icon:'❄️', name:'冰冻', cd:26, need:'none',  t:0,
    desc:'全屏冻结：所有敌人减速 92% 持续 3.2 秒' },
  { key:'mark',     icon:'🎯', name:'标记', cd:18, need:'enemy', t:0,
    desc:'标记一个敌人 5 秒：所有塔优先集火它（点敌人释放）' },
  { key:'overload', icon:'⚡', name:'过载', cd:22, need:'tower', t:0,
    desc:'指定一座塔 5 秒内攻速 ×2.5、伤害 ×1.5，结束后眩晕 3 秒（点塔释放）' },
  { key:'repair',   icon:'🔧', name:'维修', cd:30, need:'none',  t:0,
    desc:'立刻回 3 点基地血，并清除所有塔的眩晕' }
];
/* ===== v8.7 肉鸽闭环补强 =====
   ① 抽卡可控：换一批 + 禁卡（纯随机很劝退，要让玩家觉得「运气重要但我的决策也重要」）
   ② 流派识别：告诉玩家「你现在凑的是什么流派、还差多少」，给构筑一个目标感 */
var rerollLeft = 3, banLeft = 2, bannedIds = {}, curPicks = [], banMode = false;
/* v8.12：只有「波次结束的三选一」才允许用跳过换金币；其它复用同一弹层的面板（商店/技能说明/天赋）一律不算 */
var buffChoiceOpen = false;
/* v8.13：任何关闭这个复用弹层的地方都走这里 —— 一次性把「选卡状态 / 禁卡模式」清干净，
   避免出现「面板关了但状态还留着」的残留（审计脚本发现的隐患：现在无害，但以后加新面板一定会踩坑）*/
function closeBuffPanel(){
  document.getElementById('buffOv').classList.add('hidden');
  setSkipBtnVisible(false);
  banMode = false;
}
/* 显示/隐藏强化卡界面的「跳过换金币」按钮，同时记录是否处于选卡状态（防止其他面板借用这个按钮刷金币）*/
function setSkipBtnVisible(on, key){
  var b = document.getElementById('skipBuffBtn');
  if (b) b.style.display = on ? '' : 'none';
  buffChoiceOpen = !!on;
}
/* 重置选卡辅助工具：换一批 3 次、禁卡 2 次、禁卡表与当前手牌清空（每新开一局调用）*/
function resetDraftTools(){
  rerollLeft = 3; banLeft = 2; bannedIds = {}; curPicks = []; banMode = false;
  runCards = [];                                  /* v8.18：新一局清空「本局已获得的强化卡」 */
}
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
/* 统计场上某元素的炮塔数量（封顶 3，与元素套装 SET_NEED 对齐），用于激活判定与流派强度评估 */
function countTowersOf(elem){
  var n = 0;
  for (var i = 0; i < towers.length; i++) if (towers[i].elem === elem) n++;
  return Math.min(3, n);
}
/* 判定当前最接近成型的流派（灼烧/连锁/…）：取所有流派评分最高者，用于强化卡界面的副标题与提示 */
function archetypeNow(){
  var best = null, bs = -1;
  for (var i = 0; i < ARCHETYPES.length; i++){ var sc = ARCHETYPES[i].score(); if (sc > bs){ bs = sc; best = ARCHETYPES[i]; } }
  if (!best || bs <= 0) return { name:'未成型', hint:'多抽同系卡 / 多建同系塔就会成型', score:0 };
  return { name:best.name, hint:best.hint + '（强度 ' + bs + '）', score:bs };
}
/* ===== v8.6 元素套装卡（构筑联动）=====
   毛毛发的方案里「让卡牌选择更有意义」那一条：集齐 3 张同元素的专属强化卡 → 激活该元素套装。
   套装是「构筑目标」：逼玩家在抽卡时主动往某个方向凑，而不是无脑拿最高稀有度。 */
var ELEM_SETS = {
  fire:    { name:'🔥 烈焰套装', desc:'火焰塔溅射半径 +30%' },
  ice:     { name:'❄️ 永冻套装', desc:'被减速的敌人承受的暴击率 +20%' },
  thunder: { name:'⚡ 雷暴套装', desc:'链弹不再衰减（每跳满额伤害）' },
  poison:  { name:'☠️ 瘟疫套装', desc:'中毒死亡的敌人把毒传播给 1.5 格内的其他敌人' },
  phys:    { name:'🔨 破军套装', desc:'物理塔对有护甲目标再 +30%' },
  support: { name:'📡 共鸣套装', desc:'辅助塔光环效果 +50%' },
  sniper:  { name:'🎯 狙击套装', desc:'暴击伤害从 2.5 倍提升到 3.2 倍' },
  mortar:  { name:'💥 轰炸套装', desc:'榴弹塔溅射半径 +30%、溅射伤害 +25%' }
};
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
/* 按 key 从 ACHIEVEMENTS 表里取出成就定义（解锁时取名称与图标用）*/
function achByKey(k){ for (var i = 0; i < ACHIEVEMENTS.length; i++) if (ACHIEVEMENTS[i].key === k) return ACHIEVEMENTS[i]; return null; }
/* 已解锁成就总数（首页与成就面板显示 x/y 用）*/
function achCount(){ var n = 0, a = prog.ach || {}; for (var k in a) if (a[k]) n++; return n; }
/* 某成就是否已解锁（成就列表逐条渲染时查它）*/
function achUnlocked(k){ return !!(prog.ach && prog.ach[k]); }
/* 解锁一个成就：写入存档、弹飘字与提示、触发音效；已解锁则直接返回 false 不重复播 */
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
/* 逐条执行成就的 test() 条件，把新达成的解锁掉（每帧由 stepSim 调用，未解锁的才测以省开销）*/
function checkAch(){
  if (!prog.ach) prog.ach = {};
  for (var i = 0; i < ACHIEVEMENTS.length; i++){
    var a = ACHIEVEMENTS[i];
    if (prog.ach[a.key]) continue;
    try { if (a.test()) unlockAch(a.key); } catch (e) {}
  }
}
/* 成就检查节流计时：每 2 秒才遍历判定一次，避免每帧跑 14 个 test() */
var achTick = 0;
/* 激活元素套装所需的同系强化卡张数（集满 3 张触发套装）*/
var SET_NEED = 3;
/* 本局各元素已获得的专属强化卡张数统计（checkElemSets 用它判定套装是否激活）*/
var SET_COUNT = {};
/* v8.18 左侧信息栏要显示的「本局已获得的强化卡」——所有抽卡都走 grantCard()，在那里统一记一笔 */
var runCards = [];
/* 某元素套装（3 座同系塔）是否已激活（判定与显示都读它）*/
function setOn(k){ return !!(BUFFS.sets && BUFFS.sets[k]); }
/* 检查元素套装：场上某元素塔达到 3 座即激活并永久生效，同时飘字提示。建塔/拆塔后调用 */
function checkElemSets(){
  for (var k in ELEM_SETS){
    if (!setOn(k) && (SET_COUNT[k] || 0) >= SET_NEED){
      BUFFS.sets[k] = 1;
      var w = ELEM_SETS[k];
      addFloat(W / 2, H * 0.36, w.name + ' 激活！', '#ffd76a');
      burst(W / 2, H * 0.36, '#ffd76a', 26);
      SFX.upgrade();
      showBanner(w.name + ' 激活');
      checkAch();                              /* v8.21：套装类成就（如一局凑齐 3 套） */
      showTip(w.name + '：' + w.desc);
    }
  }
}
/* 统一的「获得一张强化卡」入口：应用效果 + 套装计数（抽卡 / 商店 / 契约都走这里） */
function grantCard(card){
  hintOnce('card', '集齐 3 张同元素专属卡会激活【套装】—— 卡面下方会亮起来');
  if (!card) return;
  /* v8.18：记进「本局已抽卡」列表（左侧信息栏要按稀有度列出来）——
     这是所有抽卡的统一入口（波次三选一 / 商店战术档案 / 苦行契约），所以记在这里不会漏 */
  runCards.push({ id: card.id || card.name, name: card.name, rar: card.rar || 'common', elKey: card.elKey || null });
  card.apply();
  if (card.elKey){
    SET_COUNT[card.elKey] = (SET_COUNT[card.elKey] || 0) + 1;
    checkElemSets();
  }
}
/* 技能解锁进度：第几关开始有这个技能（毛毛要求「每关增加一个，到后期才全部有」）
   无尽模式视为「后期」→ 4 个技能全开 */
var SKILL_UNLOCK = { freeze:1, mark:3, overload:6, repair:10 };
/* 某技能需要打到第几关才解锁（查 SKILL_UNLOCK 表）*/
function skillUnlockLv(key){ return SKILL_UNLOCK[key] || 1; }
/* 在指定关卡（从 0 数起）下技能是否已解锁；无尽模式恒为已解锁 */
function skillUnlockedAt(key, levelIdx){
  if (endless) return true;
  return (levelIdx + 1) >= skillUnlockLv(key);
}
/* 当前关卡下技能是否已解锁（技能栏渲染与点击拦截都用它）*/
function skillUnlocked(key){ return skillUnlockedAt(key, lvIndex | 0); }
var skillMode = null;                       /* 正在等待选目标：'mark' | 'overload' | null */
function skillByKey(k){ for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].key === k) return SKILLS[i]; return null; }
/* 技能是否冷却完毕（冷却计时 t <= 0 即可用）*/
function skillReady(k){ var sk = skillByKey(k); return !!sk && sk.t <= 0; }
/* 技能与炮塔状态计时：技能冷却递减，并推进每座塔的眩晕/过载倒计时（每帧由 stepSim 调用）*/
function skillTick(dt){
  for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].t > 0) SKILLS[i].t -= dt;
  for (var j = 0; j < towers.length; j++){
    var t = towers[j];
    /* 注意顺序：先跑眩晕倒计时，再跑过载倒计时 —— 否则「过载刚结束设上 3 秒眩晕」会被同一个 dt 立刻扣掉 */
    if (t.stunT > 0){ t.stunT -= dt; }
    else if (t.overT > 0){
      t.overT -= dt;
      if (t.overT <= 0){ t.stunT = 3.0; addFloat(cx(t.c), cy(t.r) - CELL * 0.4, '过载结束 · 眩晕', '#ff9a6a'); }
    }
  }
  for (var m = 0; m < enemies.length; m++) if (enemies[m].markT > 0) enemies[m].markT -= dt;
}
/* 重置所有技能冷却并清空待选目标状态（开新关/重开一局时调用）*/
function skillResetAll(){ for (var i = 0; i < SKILLS.length; i++) SKILLS[i].t = 0; skillMode = null; skillBtns = []; }
var skillBtns = [];                       /* 保存按钮引用：比每帧 getElementById 更稳也更快 */
function renderSkillBar(){
  var bar = document.getElementById('skillBar');
  if (!bar) return;
  if (skillBtns.length !== SKILLS.length){
    bar.innerHTML = '';
    skillBtns = [];
    for (var i = 0; i < SKILLS.length; i++){
      (function(sk){
        var b = document.createElement('button');
        b.className = 'btn';
        b.id = 'sk_' + sk.key;
        b.style.cssText = 'padding:5px 9px;border-radius:9px;font-size:13px;font-weight:700;'
          + 'border:1px solid rgba(255,180,90,.45);background:rgba(70,45,20,.9);color:#ffd08a;';
        b.title = sk.name + '：' + sk.desc;
        b.addEventListener('click', function(ev){ ev.stopPropagation(); onSkillBtn(sk.key); });
        bar.appendChild(b);
        skillBtns.push(b);
      })(SKILLS[i]);
    }
    var helpBtn = document.createElement('button');   /* 「?」说明按钮排在 4 个技能之后 */
    helpBtn.className = 'btn';
    helpBtn.id = 'sk_help';
    helpBtn.style.cssText = 'padding:5px 9px;border-radius:9px;font-size:13px;font-weight:700;'
      + 'border:1px solid rgba(180,160,255,.5);background:rgba(32,22,60,.9);color:#cfc4ff;';
    helpBtn.textContent = '?';
    helpBtn.title = '主动技能说明：怎么用 / 什么时候解锁';
    helpBtn.addEventListener('click', function(ev){ ev.stopPropagation(); showSkillHelp(); });
    bar.appendChild(helpBtn);
  }
  for (var k = 0; k < SKILLS.length; k++){
    var el = skillBtns[k];
    if (!el) continue;
    var sk2 = SKILLS[k], un = skillUnlocked(sk2.key);
    el.textContent = un ? (sk2.icon + (sk2.t > 0 ? Math.ceil(sk2.t) + 's' : '')) : '🔒';
    el.style.opacity = (!un || sk2.t > 0) ? '.45' : '1';
    el.style.outline = (skillMode === sk2.key) ? '2px solid #ffd76a' : 'none';
    el.title = un ? (sk2.name + '：' + sk2.desc + '　【用法】' + skHowTo(sk2.key))
                  : (sk2.name + '：第 ' + skillUnlockLv(sk2.key) + ' 关解锁');
  }
}
/* 点击技能按钮的处理：未解锁/冷却中就提示，需要选目标的进入选目标模式，否则直接释放 */
function onSkillBtn(key){
  if (!running || paused) return;
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return;
  if (!skillUnlocked(key)){ showTip(sk.icon + ' ' + sk.name + ' 还没解锁 —— 第 ' + skillUnlockLv(key) + ' 关开始可用'); return; }
  if (sk.need !== 'none'){
    skillMode = (skillMode === key) ? null : key;
    showTip(skillMode ? (sk.desc) : '已取消选择');
    renderSkillBar();
    return;
  }
  releaseSkill(key, null);
}
/* 真正释放技能：按 key 分派冻结/标记/过载/修理四种效果，设置冷却并播特效；成功返回 true */
function releaseSkill(key, target){
  hintOnce('skill', '技能进冷却了 —— 它会自己恢复，波次越高越值钱');
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return false;
  if (key === 'freeze'){
    for (var i = 0; i < enemies.length; i++){
      var e = enemies[i];
      e.slowF = 0.08; e.slowT = 3.2;
      addFloat(e.x, e.y - e.r, '冻结', '#8ff0ff');
    }
    burst(W / 2, H / 2, '#8ff0ff', 40); shakeT = 0.35;
    SFX.freeze(); showBanner('全屏冻结！');
  } else if (key === 'mark'){
    if (!target) return false;
    target.markT = 5.0;
    addRing(target.x, target.y, '#ffd76a', CELL * 0.9, 0.6);
    addFloat(target.x, target.y - target.r - 8, '已标记 · 集火 5 秒', '#ffd76a');
    SFX.upgrade(); showTip('已标记该敌人：所有塔优先打它');
  } else if (key === 'overload'){
    if (!target) return false;
    target.overT = 5.0; target.stunT = 0;
    addRing(cx(target.c), cy(target.r), '#ffd76a', CELL * 0.8, 0.6);
    addFloat(cx(target.c), cy(target.r) - CELL * 0.5, '过载 · 攻速×2.5 伤害×1.5', '#ffd76a');
    SFX.upgrade(); showTip('过载中：5 秒后该塔会眩晕 3 秒');
  } else if (key === 'repair'){
    hp = Math.min(MAXHP, hp + 3);
    for (var j = 0; j < towers.length; j++) towers[j].stunT = 0;
    addFloat(W / 2, H * 0.45, '基地维修 +3 ｜ 全塔解除眩晕', '#7cf5c0');
    SFX.upgrade(); showTip('紧急维修完成');
  }
  sk.t = sk.cd;
  skillMode = null;
  renderSkillBar(); updateHud();
  return true;
}
/* 技能「怎么用」一句话说明（面板与按钮提示共用） */
function skHowTo(key){
  if (key === 'freeze')   return '点按钮直接释放（不需要选目标）';
  if (key === 'mark')     return '点按钮 → 再点战场上的一个敌人';
  if (key === 'overload') return '点按钮 → 再点一座已建好的塔';
  return '点按钮直接释放（不需要选目标）';
}
/* 技能说明面板（技能栏「?」按钮打开）—— 毛毛要求「标一下怎么用」 */
/* ===== v8.14 全局「文字详略」开关 =====
   毛毛要求：所有文本型界面都要有「简易模式」。
   做法：说明类文字统一打上 class="udesc"，简易模式下用 CSS 隐藏；面板底部与设置里都能一键切换，
   切换后当前面板立即重渲染，状态存进 td_settings。 */
var UI_BRIEF = true;            /* true = 简易（默认）：只显示要点；false = 详细：显示全部说明 */
var lastPanel = null;           /* 最近打开的面板类型，用于切换详略后就地重渲染 */
function applyUiBrief(){
  if (global_doc_body()) { try { global_doc_body().classList[UI_BRIEF ? 'add' : 'remove']('brief'); } catch (e) {} }
}
/* 安全取 document.body（测试环境无 DOM 时返回 null，避免测试脚本直接报错）*/
function global_doc_body(){ return (typeof document !== 'undefined' && document.body) ? document.body : null; }
/* 切换「简易 / 详细」说明模式（设置面板按钮），存档并就地重渲染当前面板 */
function toggleUiBrief(){
  UI_BRIEF = !UI_BRIEF;
  applyUiBrief();
  try { saveSettings(); } catch (e) {}
  showTip(UI_BRIEF ? '📄 已切到简易模式（只显示要点）' : '📖 已切到详细模式（显示全部说明）');
  rerenderLastPanel();
}
/* 按 lastPanel 记录重新渲染最近打开的那个面板（切换详略、抽卡状态变化后就地刷新，不重新开局）*/
function rerenderLastPanel(){
  if (lastPanel === 'talent') renderTalents();
  else if (lastPanel === 'shop') renderShop();
  else if (lastPanel === 'pact') showPactChoices();
  else if (lastPanel === 'skill') showSkillHelp(UI_BRIEF);
  else if (lastPanel === 'weather') showWeatherHelp(UI_BRIEF);
  else if (lastPanel === 'book') bookRender();
  else if (lastPanel === 'buff') updateBuffHead();
}
/* 每个文本面板底部都可以就地切换（长按无效、只切这一次） */
function appendBriefToggle(container){
  if (!container) return null;
  var b = document.createElement('button');
  b.className = 'btn';
  b.style.cssText = 'padding:9px 14px;font-size:12.5px;width:100%;margin-top:6px;'
    + 'border-color:rgba(180,160,255,.45);background:rgba(32,22,60,.9);color:#cfc4ff;';
  b.innerHTML = UI_BRIEF ? '📖 显示完整说明（切到详细模式）' : '📄 收起说明（切到简易模式）';
  b.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });
  container.appendChild(b);
  return b;
}
var skillHelpBrief = true;      /* v8.12：技能说明默认「简短版」，可一键切「完整版」 */
function showSkillHelp(brief){
  lastPanel = 'skill';
  running = false; paused = true;
  setSkipBtnVisible(false);     /* v8.12：技能说明面板不算选卡状态（原来在这里能点跳过刷钱） */
  if (brief === undefined) brief = skillHelpBrief;
  skillHelpBrief = brief;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#cfc4ff;text-align:center;margin-bottom:4px;">⚡ 主动技能说明</div>'
    + '<div style="font-size:11px;color:#a894d8;text-align:center;margin-bottom:7px;">'
    + (endless ? '无尽模式：4 个技能全部可用' : '带 🔒 的技能要打到对应关卡才解锁') + '</div>';
  el.innerHTML = h;
  SKILLS.forEach(function(sk){
    var un = skillUnlocked(sk.key);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:' + (brief ? '7px 10px' : '9px 11px') + ';border-radius:11px;margin-bottom:' + (brief ? '4px' : '6px') + ';'
      + 'background:rgba(28,20,52,.82);border:1px solid ' + (un ? 'rgba(255,200,110,.35)' : 'rgba(140,125,175,.28)') + ';'
      + (un ? '' : 'opacity:.62;');
    if (brief){
      /* 简短版：一行一个技能，只留「怎么用 + 冷却 + 解锁」 */
      box.innerHTML = '<b style="font-size:13px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
        + '<span style="float:right;font-size:10.5px;color:#a894d8;">' + sk.cd + ' 秒</span>'
        + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.45;margin-top:1px;">' + skHowTo(sk.key) + '</div>'
        + '<div style="font-size:10.5px;color:' + (un ? '#bb9cff' : '#ff9a6a') + ';">'
        + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    } else {
      box.innerHTML = '<b style="font-size:14px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
        + '<span style="float:right;font-size:11px;color:#a894d8;">冷却 ' + sk.cd + ' 秒</span>'
        + '<div style="font-size:11.5px;color:#d8cff0;line-height:1.5;margin-top:3px;">' + sk.desc + '</div>'
        + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">🖐 用法：' + skHowTo(sk.key) + '</div>'
        + '<div style="font-size:11px;color:' + (un ? '#bb9cff' : '#ff9a6a') + ';margin-top:2px;">'
        + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    }
    el.appendChild(box);
  });
  /* 简短 / 完整 一键切换（v8.14：改为全局「文字详略」开关，所有面板共用一套） */
  var sw = document.createElement('button');
  sw.className = 'btn';
  sw.id = 'skillHelpSw';
  sw.style.cssText = 'padding:8px 14px;font-size:12.5px;width:100%;margin-top:6px;'
    + 'border-color:rgba(180,160,255,.5);background:rgba(32,22,60,.9);color:#cfc4ff;';
  sw.innerHTML = brief ? '📖 切换到「完整说明」（带效果与数值）' : '📄 切换到「简短说明」（只留用法）';
  sw.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });
  el.appendChild(sw);
  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '✅ 知道了';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    running = true; paused = false; last = 0;
  });
  el.appendChild(close);
  document.getElementById('buffOv').classList.remove('hidden');
}
/* ===== v8.18 天气说明面板 =====
   毛毛：「天气也没有介绍啊，而且我都不知道天气有什么用」→ 原来 HUD 只有一个图标 + title。
   现在点 HUD 上的天气框就弹出完整说明：每种天气逐条列出（图标 / 名称 / 效果 / 应对建议），
   当前生效的那一条高亮。**效果文案直接读 WEATHERS[x].desc**，应对建议读 WX_ADVICE ——
   以后往 WEATHERS 里加天气，这里自动多一条，不用改代码。 */
var WX_ADVICE = {
  none:    '没有元素倾向 —— 趁这几波把共鸣阵摆好、把经济铺开',
  heat:    '火塔主场：火塔这波爆发最高，多铺火塔；冰塔减速时长被砍 40%，别指望它控场',
  cold:    '冰塔主场：减速强度 +50%，把敌人按在路上就是胜利；火塔攻速 -20% 会明显变慢，火力换别的塔',
  storm:   '雷塔主场：链弹多 2 跳，打密集队列最爽；狙击射程 -15%，往后站一格再摆',
  miasma:  '毒塔主场：毒伤 +50%，剧毒塔收益翻倍；非毒塔伤害 -10%，这波纯火 / 纯物理会偏软',
  iron:    '物理塔主场：破甲加成翻倍；但全体敌人 +15% 护甲 —— 纯元素塔会明显打不动，该让物理塔上岗了',
  silence: '辅助塔光环失效：把辅助塔的加成当 0 算；换来的回报是所有塔伤害 +30%，卖塔前先算一算'
};
/* 天气切换规则（与 startWave 里的实现同源：第 4 波起、每 3 波一次、固定顺序循环） */
function wxSwitchNote(){
  if (isDaily) return '本局为每日挑战：天气锁定，不会切换';
  if (wave <= 3) return '前 3 波固定「平稳」当新手缓冲，第 4 波开始每 3 波换一次';
  var nxt = wave + 1;
  while ((nxt - 4) % 3 !== 0) nxt++;
  var nx = WEATHERS[nextWeather] || WEATHERS.none;
  return '每 3 波换一次 · 下一波（第 ' + nxt + ' 波）将变为 ' + nx.icon + '「' + nx.name + '」';
}
/* 打开「元素天气说明」面板：逐条列出六种天气的效果与应对建议，并高亮当前天气 */
function showWeatherHelp(brief){
  lastPanel = 'weather';
  running = false; paused = true;
  setSkipBtnVisible(false);          /* 不是选卡状态：禁止「跳过换金币」 */
  if (brief === undefined) brief = UI_BRIEF;
  var cur = weather;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:4px;">🌤 元素天气说明</div>'
    + '<div style="font-size:11px;color:#a894d8;text-align:center;line-height:1.6;margin-bottom:7px;">'
    + '天气会同时影响<b style="color:#ffd76a;">你的塔</b>与<b style="color:#ffd76a;">敌人</b>：有得有失，'
    + '逼你每 3 波重新想想布局与共鸣搭配<br>'
    + '<span style="color:#cfc4ff;">' + wxSwitchNote() + '</span></div>';
  el.innerHTML = h;
  /* 注意：必须把「平稳」也算上 —— 前 3 波 HUD 上就是它，只列 6 种真实天气会让玩家打开面板后
     发现「一条都没高亮」，反而更困惑。与图鉴天气页用同一口径。 */
  ['none'].concat(WEATHER_KEYS).forEach(function(k){
    var w = WEATHERS[k] || {};
    var on = (k === cur);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:9px 11px;border-radius:11px;margin-bottom:6px;'
      + 'background:' + (on ? 'rgba(60,48,16,.92)' : 'rgba(28,20,52,.78)') + ';'
      + 'border:1px solid ' + (on ? 'rgba(255,200,110,.75)' : 'rgba(160,140,255,.22)') + ';'
      + (on ? 'box-shadow:0 0 14px rgba(255,180,60,.25);' : '');
    var head = '<b style="font-size:14.5px;color:' + (on ? '#ffd76a' : '#eaf3ff') + ';">'
      + (w.icon || '') + ' ' + (w.name || k) + '</b>'
      + (on ? '<span style="float:right;font-size:10.5px;color:#20180a;background:#ffd76a;border-radius:8px;padding:1px 7px;font-weight:700;">本波生效</span>' : '');
    var body = '<div style="font-size:12px;color:#b4a6e0;line-height:1.55;margin-top:3px;">'
      + '效果：' + (w.desc || '—') + '</div>';
    var adv = '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:3px;">'
      + '应对：' + (WX_ADVICE[k] || '按这个倾向调整塔的构成') + '</div>';
    if (brief){
      box.innerHTML = head + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.45;margin-top:2px;">'
        + (WX_ADVICE[k] || '') + '</div>';
    } else {
      box.innerHTML = head + body + adv;
    }
    el.appendChild(box);
  });
  appendBriefToggle(el);
  var close = document.createElement('button');
  close.className = 'btn';
  close.id = 'wxHelpClose';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '知道了';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    running = true; paused = false; last = 0;
  });
  el.appendChild(close);
  document.getElementById('buffOv').classList.remove('hidden');
}
/* 选择模式下点战场：找最近的敌人 / 对应的塔 */
function pickEnemyAt(px, py, maxPx){
  var best = null, bd = (maxPx || 46) * (maxPx || 46);
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.hp <= 0) continue;
    var dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
    if (d2 <= bd + e.r * e.r){ bd = d2; best = e; }
  }
  return best;
}
var coinFly = [], shakeT = 0;   // grid['c,r'] = tower
/* 局内核心状态：gold 金币 · hp/MAXHP 基地血量与上限 · wave 当前波次 · kills 击杀数 · built 建塔数 */
var gold = 150, hp = 20, MAXHP = 20, wave = 1, kills = 0, built = 0;
/* ===== v7.9 金币精确记账（修「无尽后期钱变化不对」）=====
   JS 的 Number 超过 2^53（9007 万亿）就无法精确表示整数：金币涨到 10^18 量级时，
   ±512 以内的收支会被静默吃掉 —— 击杀 +22 看不见、买塔扣 200 等于白送。
   解法：所有金币变动统一走 goldAdd / goldSub / goldSet，同时维护一份 BigInt 精确账本 goldBig，
   显示与存档一律用 goldBig（永远精确）；游戏内判断仍用 Number 的 gold（性能一致，差异 < 0.0001%）。 */
var goldBig = 150n;
/* 加金币：gold（Number，用于快速计算）与 goldBig（BigInt，用于显示）双账本同时加，并防 NaN */
function goldAdd(v){
  if (!isFinite(v)) return;                       /* NaN / Infinity 保护 */
  var iv = Math.round(v);
  if (iv <= 0) return;
  gold += iv; goldBig += BigInt(iv);
}
/* 扣金币：双账本同时减，任一不越界为负（建塔/升级/商店消费走这里）*/
function goldSub(v){
  if (!isFinite(v)) return;
  var iv = Math.round(v);
  if (iv <= 0) return;
  gold -= iv; if (gold < 0) gold = 0;
  goldBig -= BigInt(iv); if (goldBig < 0n) goldBig = 0n;
}
/* 直接设置金币数额（读档、教学关初始化用），会同时重建 BigInt 账本 */
function goldSet(v){
  var n = Number(v) || 0;
  gold = n;
  try { goldBig = BigInt(typeof v === 'string' ? v.replace(/[^0-9\-]/g, '') : Math.round(n)); }
  catch (e){ goldBig = BigInt(Math.round(n)); }
  if (goldBig < 0n) goldBig = 0n;
}
/* 兜底同步：发现 gold 与 goldBig 明显脱节（有代码绕过 goldAdd/goldSub 直接赋值）时用 gold 重建 BigInt 账本 */
function goldSync(){
  /* 兜底：正常路径下 gold 与 goldBig 永远同步（差异 < 0.1%）；一旦明显脱节（有代码绕过
     goldAdd/goldSub 直接赋值，例如测试桩），就用 Number 的 gold 重建精确账本，保证显示不脱节 */
  var n = Math.round(gold), bn = Number(goldBig);
  if (!isFinite(bn) || Math.abs(bn - n) > Math.max(1, Math.abs(n) * 0.001)){
    goldBig = BigInt(n > 0 ? n : 0);
  }
}
/* 金币的显示文本（先同步再取 BigInt 字符串，避免大数显示成科学计数法）*/
function goldText(){ goldSync(); return goldBig.toString(); }

/* ===== v8.0 无尽契约（PACT）=====
   毛毛反馈「无尽后期就是挂机」，方案：不动普通关卡，只给无尽加「代价与收益并存」的抉择。
   PACT 存的是「敌方强度 / 收益」的全局倍率，由每 5 波一次的契约三选一累积而来。 */
var PACT = { hp:1, speed:1, armor:0, gold:1, count:1, bossEvery:10, taken:[] };
/* 重置无尽契约的全部强度/收益倍率（无尽模式开局时调用）*/
function pactReset(){ PACT = { hp:1, speed:1, armor:0, gold:1, count:1, bossEvery:10, taken:[] }; }
/* ===== v8.1 波间商店：给金币一个「花得掉」的出口 =====
   毛毛那边金币滚到 10^18 却没处花 —— 用商店替代粗暴的「维护费式扣钱」：
   想花钱就花，不想花就留着，但物价随波次上涨，后期囤钱没有额外好处。 */
/* ===== v8.2 随机词条：每座塔建成时随机获得一个词条 =====
   目的：破除「固定一套点满」，同一局里两座火焰塔也可能强弱不同 → 逼玩家按手里的牌打。 */
/* ===== v8.3 元素天气（元素战场）=====
   每 3 波切换一次战场元素倾向：**有得有失**，逼玩家每 3 波重新思考布局与共鸣搭配，
   而不是「铺一种塔海吃到底」。前 3 波固定「平稳」当新手缓冲，切换前一波会在预告栏提示。 */
var WEATHERS = {
  none:    { name:'平稳', icon:'🌤', desc:'没有元素倾向，自由布局' },
  heat:    { name:'灼热', icon:'🔥', desc:'火塔伤害 +35%、溅射范围 +20%　｜　冰塔减速时长 -40%　｜　全毒伤 +20%',
             eff:{ fireDmg:0.35, splash:0.20, iceSlowT:-0.40, dot:0.20 } },
  cold:    { name:'寒潮', icon:'❄️', desc:'冰塔减速强度 +50%　｜　火塔攻速 -20%　｜　敌人移速 -10%',
             eff:{ iceSlow:0.50, fireRate:-0.20, enemySpeed:-0.10 } },
  storm:   { name:'雷暴', icon:'⚡', desc:'雷塔链弹 +2 个目标　｜　物理塔暴击率 +10%　｜　狙击射程 -15%',
             eff:{ thunderChain:2, physCrit:0.10, sniperRange:-0.15 } },
  miasma:  { name:'瘴气', icon:'☠️', desc:'全毒伤 +50%　｜　医疗兵治疗 -30%　｜　非毒塔伤害 -10%',
             eff:{ dot:0.50, healCut:0.30, nonPoisonDmg:-0.10 } },
  iron:    { name:'铁潮', icon:'🔨', desc:'物理塔对护甲加成 +50%　｜　所有敌人 +15% 护甲',
             eff:{ physAntiArmor:0.50, enemyArmor:0.15 } },
  silence: { name:'静默', icon:'🌫', desc:'辅助塔光环失效　｜　所有塔伤害 +30%',
             eff:{ auraOff:1, dmg:0.30 } }
};
/* 六种元素天气的固定循环顺序：灼热→寒潮→雷暴→瘴气→铁潮→静默（不含 none）*/
var WEATHER_KEYS = ['heat', 'cold', 'storm', 'miasma', 'iron', 'silence'];
/* 天气状态：weather 当前天气 key · nextWeather 下一波预告 · wxIdx 循环序号 */
var weather = 'none', nextWeather = 'none', wxIdx = 0;
/* 当前天气的配置对象（没有则退回 none 的默认配置）*/
function wx(){ return WEATHERS[weather] || WEATHERS.none; }
/* 取当前天气某一项效果值（如 enemyHp / goldMul），未定义时返回 0 */
function wxEff(k){ var e = wx().eff; return (e && e[k] !== undefined) ? e[k] : 0; }
/* 天气按**固定顺序**循环（灼热→寒潮→雷暴→瘴气→铁潮→静默），而不是每波随机：
   这样玩家看一眼预告就能提前规划卖塔/补塔/换共鸣，也便于回归测试复现。
   测试或「每日挑战」可以用全局 WX_LOCK 把天气钉死（例如 WX_LOCK = 'none'）。 */
function pickWeather(){
  if (typeof WX_LOCK !== 'undefined' && WX_LOCK) return WX_LOCK;
  var w = WEATHER_KEYS[wxIdx % WEATHER_KEYS.length];
  wxIdx++;
  return w;
}
/* 天气循环复位：当前置为无天气、序号归零，并预告下一个天气（开新关时调用）*/
function wxReset(){ weather = 'none'; wxIdx = 0; nextWeather = pickWeather(); }
/* ===== v8.9 每日挑战（含种子）=====
   毛毛发的方案里「短局 + 长线、每日挑战、种子分享」那一条。
   每天一个固定种子：固定天气 + 固定的敌人/经济修正 + 指定的关卡；
   通关给星核（当天首次通关才给），同一天所有玩家的挑战完全相同 → 可分享、可比拼。 */
var isDaily = false, dailySeed = 0, dailyMods = null, dailyWeatherLock = null;
/* 今日种子 = 年月日拼成的整数（如 20260913）；每日挑战与种子分享都用它 */
function todaySeed(){
  var d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
/* 由种子推导每日挑战的固定修正：天气锁定、敌人血量/金币/数量倍率、指定关卡（同一天全世界一致）*/
function buildDailyMods(seed){
  var ws = WEATHER_KEYS[seed % WEATHER_KEYS.length];
  var hp = 1 + ((seed % 5) * 0.10);              /* 敌人血量 1.00 ~ 1.40 */
  var gold = 1 + ((Math.floor(seed / 7) % 4) * 0.15);  /* 金币 1.00 ~ 1.45（给点补偿） */
  var cnt = (seed % 3 === 0) ? 1.20 : 1.0;       /* 敌人数量偶尔 +20% */
  return { weather: ws, hp: hp, gold: gold, count: cnt, lv: seed % LEVELS.length };
}
/* 生成每日挑战的一行文字说明（天气 + 各项倍率），首页与结算都显示它 */
function dailyDesc(m){
  return WEATHERS[m.weather].icon + ' 天气锁定「' + WEATHERS[m.weather].name + '」'
    + '　敌人血量 ×' + m.hp.toFixed(2)
    + '　击杀金币 ×' + m.gold.toFixed(2)
    + (m.count > 1 ? '　敌人数量 ×' + m.count.toFixed(2) : '');
}
/* 今天是否已通关每日挑战（决定是否还给星核）*/
function dailyDoneToday(){
  return prog.daily === String(todaySeed());
}
/* 开始今日每日挑战：先按普通流程开指定关卡，再打上每日修正与天气锁（必须在 startLevel 之后设置，否则会被清掉）*/
function startDaily(fromNode){
  dailySeed = todaySeed();
  var m = buildDailyMods(dailySeed);
  dailyMods = m;
  startLevel(m.lv);                       /* 先正常开局（会重置天气/契约/套装等） */
  isDaily = true;                         /* 注意：必须在 startLevel 之后设，否则会被清掉 */
  dailyWeatherLock = m.weather;           /* 挑战规则：天气锁定（独立变量，不污染调试用的 WX_LOCK） */
  elemCache = {};
  PACT.hp = m.hp;                         /* 敌人血量修正 */
  PACT.gold = m.gold;                     /* 金币修正 */
  PACT.count = m.count;                   /* 数量修正 */
  var tipEl = document.getElementById('lvName');
  if (tipEl) tipEl.textContent = '📅 每日挑战';
  showBanner('📅 每日挑战 #' + dailySeed);
  showTip('今日挑战：' + dailyDesc(m) + (dailyDoneToday() ? '（今天已领过奖励，重打不再给星核）' : '　通关可得星核'));
}
/* ===== v8.8 敌人词缀 =====
   毛毛发的方案里「敌人必须有变化，不能一套阵容到底」那一条。
   部分敌人生成时会随机带 1 个词缀（越到后期越常见），行为和应对方式都要跟着变，
   而不是单纯加血 —— 逼玩家调整塔种与站位。 */
var ENEMY_AFFIXES = [
  { key:'rage',    name:'狂暴', icon:'💢', color:'#ff5a2a', minWave:6,  chance:0.10,
    fx:'血量低于 50% 后移速 +60%', tip:'留减速塔，或提前集火点掉' },
  { key:'tough',   name:'硬化', icon:'🛡', color:'#c8a24a', minWave:8,  chance:0.12,
    fx:'受击时有 25% 概率只吃 40% 伤害', tip:'用多段/持续伤害磨，别赌单发爆发' },
  { key:'boom',    name:'死亡爆炸', icon:'💥', color:'#ffb04a', minWave:9, chance:0.12,
    fx:'死亡时原地爆炸，1.2 格内的塔被眩晕 2 秒', tip:'别把主力塔堆在它的必经之路上' },
  { key:'stealth', name:'隐匿', icon:'👻', color:'#cfc4ff', minWave:11, chance:0.10,
    fx:'周期性隐身 3 秒，隐身期间塔无法锁定它', tip:'用溅射/链式盲打，或等它现身再集火' },
  { key:'thorn',   name:'反伤', icon:'🌵', color:'#7cf5c0', minWave:13, chance:0.10,
    fx:'被击中时反噬攻击塔（该塔短暂卡顿）', tip:'别用单发高伤硬砸，分散火力' },
  { key:'regen',   name:'自愈', icon:'♻️', color:'#4fe060', minWave:15, chance:0.09,
    fx:'每秒回复 1.5% 最大血量', tip:'需要爆发或毒伤压制，拖久了打不死' }
];
/* 按波次随机决定敌人是否带词缀：越后期命中率越高（封顶 30%），生成敌人时调用 */
function rollEnemyAffix(w){
  for (var i = 0; i < ENEMY_AFFIXES.length; i++){
    var a = ENEMY_AFFIXES[i];
    if (w < a.minWave) continue;
    var ch = Math.min(0.30, a.chance + (w - a.minWave) * 0.004);   /* 越后期越常见（封顶 30%） */
    if (Math.random() < ch) return a;
  }
  return null;
}
/* 炮塔随机词条池（v8.2）：每座塔建成时随机抽 1 个，字段为各项加成的系数（dmg/rate/range/crit/pierce/splashR/dot/slowT 等）*/
var AFFIX_POOL = [
  { id:'sharp',   name:'锐利', desc:'伤害 +12%',        dmg:0.12 },
  { id:'rapid',   name:'迅捷', desc:'攻速 +10%',        rate:0.10 },
  { id:'long',    name:'远视', desc:'射程 +12%',        range:0.12 },
  { id:'critA',   name:'致命', desc:'本塔暴击率 +8%',   crit:0.08 },
  { id:'pierceA', name:'穿透', desc:'无视护甲 +12%',    pierce:0.12 },
  { id:'splashA', name:'扩散', desc:'溅射半径 +0.2 格', splashR:0.20 },
  { id:'dotA',    name:'蚀骨', desc:'中毒伤害 +25%',    dot:0.25 },
  { id:'slowA',   name:'霜纹', desc:'减速时长 +15%',    slowT:0.15 },
  { id:'bossA',   name:'猎王', desc:'对 BOSS +20%',     boss:0.20 }
];
/* 随机抽一个炮塔词条（AFFIX_POOL）：每座塔建成时调用 */
function rollAffix(){ return AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]; }

/* ===== v8.2 转生 / 巅峰：给「撑不下去」之后一个长期目标 =====
   无尽撑到 50 波起可以转生，按波数拿到「星核」，星核换成永久天赋（每局开局自动生效）。
   注意：天赋是永久成长，只影响「你自己变强」，不改敌人曲线 —— 曲线仍然会赢你，只是把极限往后推。 */
var TALENT_DEF = [
  { id:'gold', name:'💰 启动资金', desc:'每级：开局额外 +50 金币', max:5, cost:1 },
  { id:'hp',   name:'🛡 加固基座', desc:'每级：基地血量上限 +2',   max:3, cost:2 },
  { id:'dmg',  name:'🔥 战意传承', desc:'每级：全塔伤害 +5%',      max:5, cost:3 },
  { id:'coin', name:'🪙 猎金本能', desc:'每级：击杀金币 +10%',     max:5, cost:2 }
];
/* 永久天赋等级（转生成长）：key 与 TALENT_DEF 的 id 对应，每局开局由 applyTalents() 生效 */
var talents = { gold:0, hp:0, dmg:0, coin:0 };
/* 从 localStorage 读取永久天赋等级（转生成长），解析失败则回到全 0 默认值 */
function loadTalents(){
  try {
    var j = JSON.parse(localStorage.getItem('td_talents') || '{}') || {};
    talents = { gold:j.gold | 0, hp:j.hp | 0, dmg:j.dmg | 0, coin:j.coin | 0 };
  } catch (e) { talents = { gold:0, hp:0, dmg:0, coin:0 }; }
}
/* 把永久天赋等级写回 localStorage（加点后调用）*/
function saveTalents(){ try { localStorage.setItem('td_talents', JSON.stringify(talents)); } catch (e) {} }
/* 读取当前星核数量（转生获得的永久货币）*/
function starcore(){ try { return parseInt(localStorage.getItem('td_starcore') || '0', 10) || 0; } catch (e) { return 0; } }
/* 增减星核并立即存档，返回最新值（转生结算与天赋消费调用）*/
function addStarcore(n){
  var v = Math.max(0, starcore() + n);
  try { localStorage.setItem('td_starcore', String(v)); } catch (e) {}
  return v;
}
/* 开局应用永久天赋（在关卡初始化之后调用） */
function applyTalents(){
  if (talents.gold) goldAdd(50 * talents.gold);
  if (talents.hp){ MAXHP += 2 * talents.hp; hp = MAXHP; }
  if (talents.dmg) BUFFS.dmg += 0.05 * talents.dmg;
  if (talents.coin) BUFFS.gold += 0.10 * talents.coin;
}
/* 渲染「传承天赋」面板：显示星核余额与四项可升级天赋，逐个生成升级按钮 */
function renderTalents(){
  lastPanel = 'talent';
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:4px;">🌟 传承天赋 · 星核 ' + starcore() + '</div>'
    + '<div style="font-size:11px;color:#a894d8;text-align:center;margin-bottom:7px;">无尽撑到 50 波起可转生：每 10 波 = 1 星核（永久生效，每局开局自动应用）</div>';
  el.innerHTML = h;
  TALENT_DEF.forEach(function(td){
    var lv = talents[td.id] | 0, maxed = lv >= td.max;
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:11px 14px;font-size:14px;width:100%;line-height:1.45;text-align:left;'
      + ((maxed || starcore() < td.cost) ? 'opacity:.45;' : '');
    btn.innerHTML = '<b>' + td.name + '</b><span style="float:right;color:#ffd76a;">'
      + (maxed ? '已满级 Lv' + lv : ('Lv' + lv + '/' + td.max + '　升级 ' + td.cost + ' 星核')) + '</span>'
      + '<br><span class="udesc" style="font-size:12px;color:#bb9cff">' + td.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (lv >= td.max){ showTip('已满级'); return; }
      if (starcore() < td.cost){ showTip('星核不足（打无尽转生可获得）'); return; }
      addStarcore(-td.cost); talents[td.id] = lv + 1; saveTalents();
      SFX.upgrade(); renderTalents();
      showTip(td.name + ' → Lv' + (lv + 1) + '（下一局生效）');
    });
    el.appendChild(btn);
  });
  appendBriefToggle(el);                    /* v8.14：天赋面板底部也能切详略 */
  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '✅ 关闭';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
  });
  el.appendChild(close);
}
/* 打开天赋面板（复用 buffOv 弹层），先渲染再显示 */
function openTalents(){
  setSkipBtnVisible(false);           /* v8.12：天赋面板不算选卡状态 */
  renderTalents();
  document.getElementById('buffOv').classList.remove('hidden');
}
/* ===== v8.4 关卡开幕提示 =====
   毛毛要求：每关开始前把「这一关比上一关多出来的东西」讲清楚（新敌人/新机制）。
   下面的登场波次表与 waveComp() 里的条件保持同步 —— 改那里记得同步这里。 */
var ENEMY_INTRO_WAVE = {
  normal:1, fast:2, armor:4, shield:6,
  healer:5, splitter:6, bomber:7, elite:8, charger:9,
  boss:10, thief:12, phase:14, bulwark:16, airdrop:18
};
/* 关卡开幕提示里敌人的展示顺序（按登场波次从早到晚）*/
var ENEMY_INTRO_ORDER = ['normal','fast','armor','shield','healer','splitter','bomber','elite','charger','boss','thief','phase','bulwark','airdrop'];
/* 机制里程碑：某些波次会开启新规则，同样按「本关新增」提示给玩家 */
var MECH_INTRO = [
  { wave:4,  text:'🌤 元素天气开启：第 4 波起每 3 波切换一次战场元素倾向（有得有失，切换前一波会预告）' },
  { wave:10, text:'👹 BOSS 登场：每 10 波一只，会【狂暴】提速 /【召唤】步兵 /【沉默】最近的塔' },
  { wave:20, text:'👹👹 双 BOSS：每 20 波会有两只同时登场' },
  { wave:30, text:'🔥 高强度阶段：敌人数量与血量同时攀升，注意提前铺好共鸣阵' }
];
/* 取本关新引入的「特殊机制」条目（波次区间落在本关、上一关没有的），关卡开幕提示用 */
function levelNewMech(idx){
  var prevMax = idx > 0 ? LEVELS[idx - 1].waves : 0;
  var curMax = LEVELS[idx].waves;
  return MECH_INTRO.filter(function(m){ return m.wave > prevMax && m.wave <= curMax; });
}
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
/* ══════════════════════════════════════════════════════════════════════════
 * v9.14（毛毛：「为啥这游戏每一关都有新手提示啊😡」）
 * 把原来「每关开局弹层」里的新东西，改成**打到这里才飘一行顶部小字**：
 *   · 不阻塞、不用点掉（弹层要按「开始战斗」才开打，每关都弹等于每关被塞一遍教程）
 *   · 每类提示一辈子只说一次（hintOnce 记账）—— 见过了就不再打扰
 *   · 由 startWave() 每波开始时调用；无尽模式同样生效
 * ══════════════════════════════════════════════════════════════════════════ */
function waveIntroTips(w){
  var k, i;
  if (tutorial) return;                        /* 教学关有自己的弱指引，这里全程安静 */
  if (!endless && lvIndex === 0) return;       /* 第 1 关（新手关）的信息由开局弹层讲，不重复飘字 */
  /* ① 本波首次登场的敌人（按 ENEMY_INTRO_WAVE 的表） */
  for (k in ENEMY_INTRO_WAVE){
    if (ENEMY_INTRO_WAVE[k] !== w) continue;
    var e = ENEMIES[k];
    if (!e) continue;
    hintOnce('enemy_' + k, '新敌人 ' + e.name + ' 登场' + (e.fx ? ' —— ' + e.fx : '') + (e.tip ? '（' + e.tip + '）' : ''));
  }
  /* ② 机制里程碑（天气开启 / BOSS / 双 BOSS / 高强度阶段） */
  for (i = 0; i < MECH_INTRO.length; i++){
    if (MECH_INTRO[i].wave === w){
      hintOnce('mech_' + MECH_INTRO[i].wave, String(MECH_INTRO[i].text).replace(/^[^0-9A-Za-z\u4e00-\u9fa5]+/, ''));
    }
  }
  /* ③ 开局第 1 波顺带播报「本关新解锁技能」与「双入口地图」（原来塞在开局弹层里的两条） */
  if (w === 1 && !tutorial){
    for (i = 0; i < SKILLS.length; i++){
      var sk = SKILLS[i];
      if (skillUnlockedAt(sk.key, lvIndex) && skillUnlockLv(sk.key) === lvIndex + 1){
        hintOnce('skl_' + sk.key + '_' + lvIndex,
          '本关解锁技能 ' + sk.icon + ' ' + sk.name + '（冷却 ' + sk.cd + ' 秒）—— ' + skHowTo(sk.key));
      }
    }
    if (typeof LEVELS !== 'undefined' && LEVELS[lvIndex] && LEVELS[lvIndex].path2){
      hintOnce('path2_' + lvIndex, '这张图是双入口 —— 敌人从两条路同时来，两边都要布防');
    }
  }
}
/* 打开关卡开幕提示弹层：列出本关新敌人与新机制，测试可用 NO_INTRO 跳过这个阻塞式弹层 */
function showLevelIntro(idx){
  /* 自动化测试 / 批量模拟可以设全局 NO_INTRO = true 跳过这个阻塞式弹层（否则游戏会一直暂停） */
  if (typeof NO_INTRO !== 'undefined' && NO_INTRO){ running = true; paused = false; return; }
  var L = LEVELS[idx];
  /* v9.14 修 bug（毛毛：「为啥这游戏每一关都有新手提示啊😡」）：
     原来每关都**无条件**弹这个阻塞式弹层（要手动点「开始战斗」才开打），而且弹层里大段是上一关就说过的旧信息
     （「已有：技能…」、「本关暂无可用技能」、「🗺 地图…」），第 2 关起读起来就是每关重放一遍新手教程。
     现在改为：**只有第 1 关（真·新手关）弹**；其余关卡的「新敌人 / 新机制 / 双入口地图」信息
     改由 waveIntroTips() 在对应波次开始时飘一行顶部小字（不挡操作、不用点掉、每类一辈子只说一次）。 */
  var news = levelNewEnemies(idx), mech = levelNewMech(idx), skNew = [];
  SKILLS.forEach(function(sk){
    if (skillUnlockedAt(sk.key, idx) && skillUnlockLv(sk.key) === idx + 1) skNew.push(sk);
  });
  if (idx !== 0){ running = true; paused = false; last = 0; return; }
  document.getElementById('introTitle').textContent = '第 ' + (idx + 1) + ' 关 · ' + (L.name.split('·')[1] || '').trim();
  document.getElementById('introSub').textContent = L.waves + ' 波 · 初始金币 ' + L.gold + ' · 难度系数 ' + L.diff;
  var h = '';
  if (news.length){
    h += '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:2px 0 5px;">🆕 本关新出现（上一关还没有）</div>';
    news.forEach(function(n){
      var e = ENEMIES[n.key];
      h += '<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:10px;background:rgba(28,20,52,.8);'
        + 'border:1px solid rgba(255,200,110,.28);margin-bottom:5px;">'
        + '<span style="flex:0 0 auto;font-size:11px;color:#a894d8;padding-top:1px;">第' + n.wave + '波</span>'
        + '<span style="flex:1;min-width:0;">'
        + '<b style="font-size:13.5px;color:' + e.color + '">' + e.name + '</b>'
        + '<span style="display:block;font-size:11.5px;color:#d8cff0;line-height:1.45;">' + (e.fx || '') + '</span>'
        + (e.tip ? '<span class="udesc" style="display:block;font-size:11px;color:#7cf5c0;line-height:1.4;">→ ' + e.tip + '</span>' : '')
        + '</span></div>';
    });
  } else {
    h += '<div style="font-size:12.5px;color:#bb9cff;padding:8px 10px;border-radius:10px;background:rgba(28,20,52,.7);">'
      + '本关没有新敌人 —— 但强度更高、波数更多，注意把塔升级和凑共鸣。</div>';
  }
  if (idx === 0){
    h += '<div style="font-size:11.5px;color:#a894d8;margin-top:8px;line-height:1.5;">💡 新手提示：相邻放不同元素的塔会触发<b>元素共鸣</b>；'
      + '同元素相邻则是<b>共振</b>。点已建好的塔可以看到每发伤害与暴击伤害。</div>';
  }
  /* 本关的新机制（天气开启 / BOSS / 双 BOSS / 高强度阶段） */
  if (mech.length){
    h += '<div style="font-size:12.5px;font-weight:700;color:#8ff0ff;margin:9px 0 5px;">⚙️ 本关新机制</div>';
    mech.forEach(function(m){
      h += '<div style="font-size:11.5px;color:#d8cff0;line-height:1.5;padding:6px 9px;border-radius:10px;'
        + 'background:rgba(28,24,56,.8);border:1px solid rgba(120,200,255,.28);margin-bottom:5px;">'
        + '<span style="color:#a894d8;">第' + m.wave + '波起</span>　' + m.text + '</div>';
    });
  }
  /* 本关新解锁的主动技能（v9.14：只讲「本关新增」，不再每关罗列一遍已有技能） */
  if (skNew.length){
    h += '<div style="font-size:12.5px;font-weight:700;color:#ffd08a;margin:9px 0 5px;">⚡ 本关新解锁技能</div>';
    skNew.forEach(function(sk){
      h += '<div style="font-size:12px;color:#fff0c0;line-height:1.5;padding:6px 9px;border-radius:10px;'
        + 'background:rgba(96,66,16,.75);border:1px solid rgba(255,200,110,.5);margin-bottom:5px;">'
        + '🆕 <b>' + sk.icon + ' ' + sk.name + '</b>（冷却 ' + sk.cd + ' 秒）　' + skHowTo(sk.key)
        + '<span style="display:block;font-size:11px;color:#ffd08a;">' + sk.desc + '</span></div>';
    });
  }
  /* 地图特征（双入口会额外醒目提示 —— 只堆一边必定漏怪） */
  if (L.path2){
    h += '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:9px 0 5px;">🛣️ 双入口地图</div>'
      + '<div style="font-size:11.5px;color:#ffe6c0;line-height:1.5;padding:6px 9px;border-radius:10px;'
      + 'background:rgba(96,62,16,.75);border:1px solid rgba(255,200,110,.45);margin-bottom:5px;">'
      + '敌人会随机从<b>两条路</b>同时进攻（各 ' + L.path.length + ' / ' + L.path2.length + ' 个拐点），'
      + '只守一边必然漏怪 —— 注意两侧都要布防，或者把主力放在两条路的交汇处附近。</div>';
  }
  document.getElementById('introBody').innerHTML = h;
  running = false; paused = true;
  document.getElementById('introOv').classList.remove('hidden');
}
/* ===== v8.19 无尽模式的专属开场 =====
   毛毛报的 bug：「点无尽模式进去是有一个第 1 关的提示，点开始游戏才是无尽模式」。
   根因：startEndless() 内部调 startLevel(0)（借用第 1 关的地图），而 startLevel 末尾**无条件**
   调 showLevelIntro(0) → 弹出来的就是「第 1 关 · 直廊」的模板（第 1 关的波数、金币、新敌人）。
   无尽本来就不是「第 1 关」，而且它有一大堆普通关卡没有的机制（契约/商店/维护费/盗金贼/双BOSS/转生），
   原样借用第 1 关的模板等于一句都没告诉玩家。
   修法：按模式分派弹层 —— 普通关卡走 showLevelIntro、无尽走这个 showEndlessIntro。
   注意：下面写的数值全部与代码同源，改动时请同步核对（契约 wave%5、维护费 lvSum*3、
   盗金贼 thief:12、双 BOSS 每 20 波、转生 50 波起每 10 波 1 星核、血上限每 10 波 +5 封顶 50）。 */
function showEndlessIntro(){
  if (typeof NO_INTRO !== 'undefined' && NO_INTRO){ running = true; paused = false; return; }
  document.getElementById('introTitle').textContent = '♾ 无尽模式';
  document.getElementById('introSub').textContent = '波次无上限 · 打得越远越硬 · 没有终点';
  var rows = [
    ['🌤', '天气每 3 波一换', '第 4 波起切换，提前一波在顶部预告栏提示 —— 点 HUD 天气框可看全部说明'],
    ['📜', '无尽契约（每 5 波必选）', '代价换收益，选完累积生效 —— 比如「敌血 +25%／我金币 +30%」'],
    ['🛒', '波间商店', '强化卡界面里可进：10 种商品，物价随波次上涨 —— 后期金币终于有地方花'],
    ['👹', '双 BOSS（每 20 波）', '每 10 波一只；每 20 波两只同时登场'],
    ['💰', '盗金贼（第 12 波起）', '偷走的金币只要击杀它就连本带利吐回；跑到底就真丢了'],
    ['🔧', '维护费', '每波按「塔等级总和 × 3」扣金币 —— 到后期要在「铺塔海」与「升精品」之间取舍'],
    ['🌟', '转生（撑到 50 波）', '每 10 波 = 1 星核 → 换永久天赋，每局开局自动生效']
  ];
  var h = '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:2px 0 6px;">无尽专属机制（普通关卡没有）</div>';
  for (var i = 0; i < rows.length; i++){
    h += '<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:10px;'
      + 'background:rgba(28,20,52,.8);border:1px solid rgba(255,200,110,.28);margin-bottom:5px;">'
      + '<span style="flex:0 0 auto;font-size:15px;">' + rows[i][0] + '</span>'
      + '<span style="flex:1;min-width:0;">'
      + '<b style="font-size:13px;color:#ffe6a8;">' + rows[i][1] + '</b>'
      + '<span class="udesc" style="display:block;font-size:11.5px;color:#d8cff0;line-height:1.45;">' + rows[i][2] + '</span>'
      + '</span></div>';
  }
  h += '<div style="font-size:12.5px;font-weight:700;color:#8ff0ff;margin:9px 0 5px;">本局便利</div>'
    + '<div style="font-size:11.5px;color:#d8cff0;line-height:1.5;padding:6px 9px;border-radius:10px;'
    + 'background:rgba(28,24,56,.8);border:1px solid rgba(120,200,255,.28);">'
    + '⚡ 4 个主动技能<b>全部解锁</b>（无尽视为后期）　'
    + '⏩ 倍速支持 1x/2x/5x/10x/100x</div>'
    + '<div class="udesc" style="font-size:11.5px;color:#bb9cff;line-height:1.5;margin-top:6px;">'
    + '💾 每波结束自动存档，暂停面板里「保存并退出」可随时中断；'
    + '❤ 基地血上限每 10 波 +5（封顶 50），每 5 波回 2 血。</div>';
  document.getElementById('introBody').innerHTML = h;
  running = false; paused = true;
  document.getElementById('introOv').classList.remove('hidden');
}
/* 波间商店的商品池：base 价（实际售价随波次上涨由 shopPrice 计算），apply 是购买效果函数 */
var SHOP_POOL = [
  { name:'🔧 紧急维修',   desc:'基地立刻回 3 点血',              cost:80,  apply:function(){ hp = Math.min(MAXHP, hp + 3); } },
  { name:'🛡 能量护盾',   desc:'获得 4 点基地护盾',              cost:120, apply:function(){ BUFFS.shieldHP = (BUFFS.shieldHP || 0) + 4; } },
  { name:'🎴 战术档案',   desc:'立刻随机获得 1 张强化卡',        cost:200, apply:function(){ grantCard(BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]); } },
  { name:'🛒 军火补给',   desc:'全塔伤害 +8%（可叠加）',         cost:350, apply:function(){ BUFFS.dmg += 0.08; } },
  { name:'⚡ 超频模块',   desc:'全塔攻速 +8%（可叠加）',         cost:350, apply:function(){ BUFFS.rate += 0.08; } },
  { name:'📡 雷达组网',   desc:'全塔射程 +8%（可叠加）',         cost:280, apply:function(){ BUFFS.range += 0.08; } },
  { name:'🧪 腐蚀弹头',   desc:'无视护甲 +15%（可叠加）',        cost:300, apply:function(){ BUFFS.pierceAdd = Math.min(1, (BUFFS.pierceAdd || 0) + 0.15); } },
  { name:'💰 投资合约',   desc:'每波利息 +6%（可叠加）',         cost:400, apply:function(){ BUFFS.interest += 0.06; } },
  { name:'❄ 寒流预置',    desc:'减速持续时间 +20%（可叠加）',    cost:260, apply:function(){ BUFFS.slowAdd += 0.20; } },
  { name:'☣ 毒素储备',    desc:'中毒伤害 +25%（可叠加）',        cost:300, apply:function(){ BUFFS.dotAdd += 0.25; } }
];
/* 本次商店的三件随机库存（每件带 sold 标记，卖光后刷新）*/
var shopStock = [];
function shopPrice(base){ return Math.round(base * (1 + Math.min(3, wave * 0.05))); }   /* 越后期物价越高 */
function rollShop(){
  var pool = SHOP_POOL.slice();
  shopStock = [];
  for (var i = 0; i < 4 && pool.length; i++){
    var it = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    shopStock.push({ name:it.name, desc:it.desc, cost:it.cost, apply:it.apply, sold:false });
  }
}
/* 渲染波间商店：按当前库存生成购买按钮（价格随波次上涨），含刷新与升级选项 */
function renderShop(){
  lastPanel = 'shop';
  var el = document.getElementById('buffList');
  el.innerHTML = '<div style="font-size:13.5px;font-weight:700;color:#8ff0ff;text-align:center;margin-bottom:4px;">🛒 波间商店 · 第 ' + wave + ' 波</div>'
    + '<div style="font-size:11px;color:#a894d8;text-align:center;margin-bottom:7px;">当前金币 ' + goldText() + '　（物价随波次上涨，囤钱没有额外收益）</div>';
  shopStock.forEach(function(item){
    var price = shopPrice(item.cost), can = (gold >= price) && !item.sold;
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:11px 14px;font-size:14px;width:100%;line-height:1.45;text-align:left;'
      + (can ? '' : 'opacity:.45;');
    btn.innerHTML = '<b>' + item.name + '</b><span style="float:right;color:#ffd76a;">'
      + (item.sold ? '已售罄' : (price + ' 金')) + '</span>'
      + '<br><span class="udesc" style="font-size:12px;color:#bb9cff">' + item.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (item.sold) return;
      var pr = shopPrice(item.cost);
      if (gold < pr){ showTip('金币不足'); return; }
      goldSub(pr); item.apply(); item.sold = true;
      recalcResonance(); updateHud(); SFX.coin();
      addFloat(W / 2, H * 0.40, '购买：' + item.name, '#8ff0ff');
      renderShop();
    });
    el.appendChild(btn);
  });
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
  var rf = document.createElement('button');
  rf.className = 'btn';
  rf.style.cssText = 'flex:1;padding:10px;font-size:13px;';
  rf.innerHTML = '🔄 刷新商品<br><span style="color:#ffd76a">' + shopPrice(60) + ' 金</span>';
  rf.addEventListener('click', function(ev){
    ev.stopPropagation();
    var pr = shopPrice(60);
    if (gold < pr){ showTip('金币不足'); return; }
    goldSub(pr); rollShop(); renderShop(); SFX.upgrade();
  });
  var lv = document.createElement('button');
  lv.className = 'btn';
  lv.style.cssText = 'flex:1;padding:10px;font-size:13px;';
  lv.innerHTML = '🚪 离开商店<br><span style="color:#bb9cff">回去选强化卡</span>';
  lv.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    showBuffChoices(undefined, true);   /* v8.26：回去看**原来那 3 张**，绝不重抽（毛毛报的 bug）*/
  });
  appendBriefToggle(el);                    /* v8.14：商店面板底部也能切详略 */
  row.appendChild(rf); row.appendChild(lv);
  el.appendChild(row);
}
/* 打开波间商店（暂停战场）：库存空了才重抽，然后渲染并显示弹层 */
function openShop(){
  running = false; paused = true;
  setSkipBtnVisible(false);           /* v8.12：商店面板不算选卡状态（防止借此刷金币） */
  if (!shopStock.length || shopStock.every(function(i2){ return i2.sold; })) rollShop();
  renderShop();
  document.getElementById('buffOv').classList.remove('hidden');
}
/* 无尽契约池（v8.0）：每 5 波三选一，用「敌方变强」换「自己收益变高」的取舍选项 */
var PACT_POOL = [
  { name:'🩸 血祭契约', desc:'敌人血量 +25%　｜　你的击杀金币 +30%',
    apply:function(){ PACT.hp *= 1.25; PACT.gold += 0.30; } },
  { name:'🛡 钢铁契约', desc:'敌人 +12% 护甲　｜　立即获得 3 点基地护盾',
    apply:function(){ PACT.armor += 0.12; BUFFS.shieldHP = (BUFFS.shieldHP || 0) + 3; } },
  { name:'💨 疾风契约', desc:'敌人速度 +10%　｜　全塔攻速 +10%',
    apply:function(){ PACT.speed *= 1.10; BUFFS.rate += 0.10; } },
  { name:'🐜 兽潮契约', desc:'敌人数量 +25%　｜　全塔伤害 +18%',
    apply:function(){ PACT.count *= 1.25; BUFFS.dmg += 0.18; } },
  { name:'👑 悬赏契约', desc:'BOSS 改为每 8 波登场（提前）　｜　击杀金币翻倍',
    apply:function(){ PACT.bossEvery = 8; PACT.gold += 1.0; } },
  { name:'💰 贪婪契约', desc:'击杀金币 +80%　｜　敌人血量 +20%',
    apply:function(){ PACT.gold += 0.80; PACT.hp *= 1.20; } },
  { name:'⛓ 苦行契约', desc:'击杀金币 -30%　｜　立即获得 2 张随机强化卡',
    apply:function(){ PACT.gold = Math.max(0.2, PACT.gold - 0.30);
      for (var pi = 0; pi < 2; pi++) grantCard(BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]); } },
  { name:'⚔ 破军契约', desc:'敌人血量 +15%　｜　你的暴击率 +12%',
    apply:function(){ PACT.hp *= 1.15; BUFFS.crit += 0.12; } }
];

/* ================= 共鸣系统（核心原创机制）=================
   相邻两座「不同元素」的塔触发具名共鸣，同元素相邻则算「共振」。
   resonanceOf() 负责结算，结果缓存在每座塔的 res 字段里供 statAt 读取；
   具名对应关系同时登记在 BOOK_RESO / RESO_NAMED（图鉴用），改一处记得同步另一处。 */
/* 取 (c,r) 格子上的炮塔对象（没有则 null）：命中判定、共鸣、面板选择都靠它 */
function towerAt(c, r){ return grid[c + ',' + r] || null; }
/* 共鸣结算核心：扫描炮塔四周邻居（含 L 形三连与四连），算出伤害/攻速/射程倍率与共鸣标签。建塔/拆塔/升级后调用并缓存进塔对象 */
function resonanceOf(t){
  var res = { dmgMul: 1, rateMul: 1, rangeMul: 1, tags: [], combo: 0 };
  var nb = [[1,0],[-1,0],[0,1],[0,-1]];
  for (var i = 0; i < 4; i++){
    var o = towerAt(t.c + nb[i][0], t.r + nb[i][1]);
    if (!o) continue;
    res.combo++;
    if (o.elem === t.elem){
      res.dmgMul += 0.35; res.rangeMul += 0.15; res.tags.push('共振+35%');
    } else {
      var pair = [t.elem, o.elem].sort().join('+');
      if (pair === 'fire+ice'){ res.dmgMul += 0.70; res.splash = 1.0; res.tags.push('热震'); }
      else if (pair === 'fire+thunder'){ res.dmgMul += 0.80; res.rateMul += 0.25; res.tags.push('等离子'); }
      else if (pair === 'ice+thunder'){ res.slowMul = 3; res.freeze = true; res.tags.push('超导'); }
      else if (pair === 'fire+poison'){ res.dotInstant = 2.0; res.tags.push('燃爆'); }
      /* —— 物理塔参与的组合（v5）：让 🔨 不再只是「穿甲单体」 —— */
      else if (pair === 'phys+thunder'){ res.dmgMul += 0.60; res.pierceFull = true; res.tags.push('电磁炮'); }
      else if (pair === 'fire+phys'){ res.dmgMul += 0.50; res.armorBreak = 1.4; res.tags.push('熔铁'); }
      else if (pair === 'ice+phys'){ res.dmgMul += 0.55; res.critAdd = 0.15; res.tags.push('碎冰'); }
      else if (pair === 'phys+poison'){ res.dmgMul += 0.50; res.dotMul = 1.8; res.tags.push('腐蚀'); }
      /* —— TOWERS_V6_PATCH：新增塔的 5 组组合（key 一律按 [a,b].sort().join('+') 的字母序书写）—— */
      else if (pair === 'fire+mortar'){ res.splashBurn = 8; res.tags.push('燃烧弹'); }
      else if (pair === 'mortar+poison'){ res.splashDot = ELEMS.poison.dot; res.tags.push('毒气弹'); }
      else if (pair === 'ice+mortar'){ res.splashSlow = 0.5; res.tags.push('冰爆'); }
      else if (pair === 'sniper+thunder'){ res.dmgMul += 0.60; res.pierceFull = true; res.tags.push('电磁狙击'); }
      else if (pair === 'phys+sniper'){ res.pierceFull = true; res.armorBreak = 1.4; res.tags.push('破甲弹'); }
      /* ===== v8.15：补全此前缺失的 8 种两两共鸣（8 座塔的 21 种非辅助两两组合现已全覆盖）===== */
      else if (pair === 'fire+sniper'){ res.dmgMul += 0.55; res.splashBurn = 6; res.tags.push('燃烧狙击'); }
      else if (pair === 'ice+sniper'){ res.critAdd = (res.critAdd || 0) + 0.20; res.freeze = true; res.tags.push('冻结狙击'); }
      else if (pair === 'ice+poison'){ res.dotMul = 1.6; res.slowMul = 1.5; res.tags.push('霜毒'); }
      else if (pair === 'poison+thunder'){ res.dmgMul += 0.35; res.dotMul = 1.7; res.tags.push('电弧腐蚀'); }
      else if (pair === 'mortar+thunder'){ res.splash = Math.max(res.splash || 1, 1.35); res.dmgMul += 0.30; res.tags.push('电磁爆炸'); }
      else if (pair === 'poison+sniper'){ res.dmgMul += 0.45; res.dotMul = 2.0; res.tags.push('毒狙'); }
      else if (pair === 'mortar+phys'){ res.splash = Math.max(res.splash || 1, 1.30); res.armorBreak = 1.5; res.tags.push('破片重锤'); }
      else if (pair === 'mortar+sniper'){ res.rangeMul += 0.30; res.splash = Math.max(res.splash || 1, 1.25); res.tags.push('抛射狙击'); }
      /* —— 辅助塔：只给相邻的「攻击塔」增幅（自己不加，避免自环） —— */
      else if (o.elem === 'support'){
        if (t.elem !== 'support'){ res.dmgMul += 0.20; res.rangeMul += 0.10; res.tags.push('增幅场'); }
      }
      /* —— 辅助塔自己相邻攻击塔：不参与（它不攻击，加了也没用） —— */
      else if (t.elem === 'support'){ /* 辅助塔不攻击 */ }
      else { res.dmgMul += 0.25; res.tags.push('共鸣'); }
    }
  }
  /* ===== v8.15 三元素共鸣 =====
     网格里三座塔两两相邻只能构成 L 形（不存在三角形），所以检查「右/左 + 上/下」四种 L 即可。
     要求三座塔元素互不相同、且都不是辅助塔（辅助走增幅场，不参与三元素）。
     三元素比两两更强，是「精心布局」的回报。 */
  var LSHAPES = [[1,1],[1,-1],[-1,1],[-1,-1]], trioDone = {};
  for (var li = 0; li < 4; li++){
    var dc = LSHAPES[li][0], dr = LSHAPES[li][1];
    var pa = towerAt(t.c + dc, t.r), pb = towerAt(t.c, t.r + dr);
    if (!pa || !pb || pa === pb) continue;
    if (t.elem === 'support' || pa.elem === 'support' || pb.elem === 'support') continue;
    if (t.elem === pa.elem || t.elem === pb.elem || pa.elem === pb.elem) continue;
    var trio = [t.elem, pa.elem, pb.elem].sort().join('+');
    if (trioDone[trio]) continue;
    trioDone[trio] = 1;
    if (trio === 'fire+ice+thunder'){
      res.dmgMul += 0.90; res.rateMul += 0.30; res.slowMul = Math.max(res.slowMul || 1, 2.5); res.tags.push('⭐元素风暴');
    } else if (trio === 'fire+mortar+poison'){
      res.splashBurn = 10; res.splashDot = 8; res.splash = Math.max(res.splash || 1, 1.40); res.tags.push('⭐燃烧大地');
    } else if (trio === 'mortar+phys+thunder'){
      res.pierceFull = true; res.dmgMul += 0.50; res.splash = Math.max(res.splash || 1, 1.40); res.tags.push('⭐电磁风暴');
    } else if (trio === 'fire+ice+mortar'){
      res.dmgMul += 0.40; res.splash = Math.max(res.splash || 1, 1.60); res.splashSlow = 0.55; res.tags.push('⭐冰火爆裂');
    } else if (trio === 'ice+phys+sniper'){
      res.pierceFull = true; res.freeze = true; res.critAdd = (res.critAdd || 0) + 0.25; res.tags.push('⭐破冰穿甲');
    } else if (trio === 'fire+phys+sniper'){
      res.armorBreak = 1.6; res.critAdd = (res.critAdd || 0) + 0.20; res.dmgMul += 0.30; res.tags.push('⭐熔金狙击');
    } else if (trio === 'poison+thunder+sniper'){
      res.dotMul = 2.0; res.pierceFull = true; res.dmgMul += 0.30; res.tags.push('⭐腐蚀雷狙');
    } else if (trio === 'ice+mortar+poison'){
      res.splashSlow = 0.60; res.splashDot = 9; res.splash = Math.max(res.splash || 1, 1.30); res.tags.push('⭐霜毒轰炸');
    } else if (trio === 'fire+ice+sniper'){
      res.dmgMul += 0.60; res.critAdd = (res.critAdd || 0) + 0.15; res.freeze = true; res.tags.push('⭐冰火狙击');
    } else if (trio === 'fire+poison+sniper'){
      res.dotMul = 1.8; res.splashBurn = 7; res.dmgMul += 0.35; res.tags.push('⭐毒火狙击');
    } else if (trio === 'ice+poison+thunder'){
      res.dotMul = 1.7; res.slowMul = 2.0; res.dmgMul += 0.40; res.tags.push('⭐雷霜毒');
    } else if (trio === 'phys+poison+sniper'){
      res.pierceFull = true; res.dotMul = 1.9; res.dmgMul += 0.35; res.tags.push('⭐腐蚀穿甲');
    } else {
      res.dmgMul += 0.45; res.tags.push('⭐三元素共鸣');
    }
  }
  /* ===== v8.16 四元素共鸣（上限：一座塔最多连 4 座）=====
     中心塔的上下左右四座都存在、元素互不相同、且都不是辅助塔 → 触发四元素共鸣。 */
  (function(){
    var q = [towerAt(t.c - 1, t.r), towerAt(t.c + 1, t.r), towerAt(t.c, t.r - 1), towerAt(t.c, t.r + 1)];
    for (var qi = 0; qi < 4; qi++) if (!q[qi] || q[qi].elem === 'support') return;
    var list = [t.elem, q[0].elem, q[1].elem, q[2].elem, q[3].elem];
    var seen = {};
    for (var si = 0; si < list.length; si++){ if (seen[list[si]]) return; seen[list[si]] = 1; }   /* 必须四座各不相同 */
    var quad = list.slice().sort().join('+');
    if (quad === 'fire+ice+sniper+thunder'){
      res.dmgMul += 1.10; res.rateMul += 0.35; res.critAdd = (res.critAdd || 0) + 0.20; res.freeze = true; res.tags.push('🌌元素洪流');
    } else if (quad === 'fire+ice+mortar+poison'){
      res.splash = Math.max(res.splash || 1, 1.70); res.splashBurn = 12; res.splashDot = 10; res.splashSlow = 0.60; res.tags.push('🌌灾厄领域');
    } else if (quad === 'mortar+phys+sniper+thunder'){
      res.pierceFull = true; res.dmgMul += 0.80; res.splash = Math.max(res.splash || 1, 1.50); res.tags.push('🌌战争矩阵');
    } else if (quad === 'fire+ice+poison+thunder'){
      res.dmgMul += 0.85; res.dotMul = 1.8; res.slowMul = Math.max(res.slowMul || 1, 2.0); res.tags.push('🌌四相漩涡');
    } else if (quad === 'fire+ice+phys+sniper'){
      res.pierceFull = true; res.critAdd = (res.critAdd || 0) + 0.30; res.dmgMul += 0.70; res.freeze = true; res.tags.push('🌌绝对猎杀');
    } else if (quad === 'fire+poison+thunder+sniper'){
      res.dmgMul += 0.90; res.dotMul = 2.0; res.rateMul += 0.25; res.tags.push('🌌雷火毒狙');
    } else if (quad === 'ice+mortar+poison+thunder'){
      res.splash = Math.max(res.splash || 1, 1.50); res.splashDot = 9; res.splashSlow = 0.60; res.dmgMul += 0.50; res.tags.push('🌌霜雷毒爆');
    } else if (quad === 'fire+mortar+phys+sniper'){
      res.splash = Math.max(res.splash || 1, 1.50); res.armorBreak = 1.7; res.critAdd = (res.critAdd || 0) + 0.20; res.tags.push('🌌重炮矩阵');
    } else {
      res.dmgMul += 0.75; res.rateMul += 0.20; res.tags.push('🌌四元素共鸣');   /* 其余组合的保底收益 */
    }
  })();
  res.tags = res.tags.filter(function(v, i, a){ return a.indexOf(v) === i; });
  res.dmgMul = Math.round(res.dmgMul * 100) / 100;
  return res;
}
var FRESH_TIME = 5;   // 建塔悔棋窗口（秒）：这段时间内拆塔全额退款，过后只剩 60% 残值出售
/* 动态造价：场上塔越多，下一座越贵（每座 +5.5%）
   —— 目的：让玩家在中后期转向「升级 / 精选位置 / 元素共鸣」，而不是无脑铺塔挂机 */
function towerCost(elem){
  var base = ELEMS[elem].cost;
  /* 每多建一座贵一点，且斜率随波次提高（4% → 最高 10%，第 30 波封顶）：
     后期钱多也堆不出塔海，只能去升级 / 精选位置 / 凑共鸣 */
  var slope = 0.040 + Math.min(0.060, Math.max(0, wave - 1) * 0.0021);
  /* v7.8 专属强化 tw.cost：只让「这一座塔」更便宜（与全局塔位折扣乘算，总折扣封顶 50%） */
  var twCut = Math.min(0.5, (BUFFS.costCut || 0) + ((twOf(elem) && twOf(elem).cost) || 0));
  return Math.round(base * (1 + towers.length * slope) * (1 - twCut));
}
/* 建塔：校验金币与格子是否可建 → 扣钱 → 生成炮塔对象（含随机词条）写入 grid → 重新结算周边共鸣；失败返回 false */
function addTower(c, r, elem){
  var def = ELEMS[elem];
  var cost = towerCost(elem);
  if (gold < cost) return false;
  goldSub(cost); built++;
  var t = { c: c, r: r, elem: elem, lv: 1, exp: 0, cd: 0, ang: -Math.PI/2, res: null, buildT: 0.45, flash: 0, fresh: FRESH_TIME, paid: cost,
            affix: rollAffix(), spec: null };   /* v8.2 随机词条 + 精通分支（互斥） */
  t.res = resonanceOf(t);
  towers.push(t); grid[c + ',' + r] = t;
  recalcResonance();
  updateHud();
  SFX.build();
  hintOnce('build', '相邻放不同元素的塔会【共鸣】—— 试试在旁边建座别的元素');
  if (t.res && t.res.tags.length){
    addFloat(cx(c), cy(r) - CELL * 0.6, '共鸣 ' + t.res.tags.join('+') + '  伤害×' + t.res.dmgMul, '#8ff0ff');
    hintOnce('reso', '共鸣成立！一共 91 种组合 —— 图鉴里「共鸣」页可以慢慢查');
    chord([1047, 1319, 1568], 0.22, 0.045);
    recalcResonance();
  }
  return true;
}
