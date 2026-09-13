/* ══════════════════════════════════════════════════════════════════════════
 * 05-cards.js —— 强化卡：76 张卡池 BUFF_POOL（普通 / 稀有 / 史诗三档）
 *
 * 来源：game.html 第 2593-2974 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ===== v7.4 强化卡稀有度：普通 / 稀有 / 史诗 —— 越到后期越容易出高级卡 ===== */
var RARITY = { common:{ name:'普通', color:'#8fe4ff', w:100 }, rare:{ name:'稀有', color:'#b98cff', w:34 }, epic:{ name:'史诗', color:'#ffd76a', w:7 } };
/* 稀有度权重：后期给稀有/史诗卡加权，让高稀有卡越往后越容易刷出来（抽卡时用）*/
function rarityWeight(rar, w){
  var base = (RARITY[rar] || RARITY.common).w;
  if (rar === 'rare') base += w * 1.6;      // 后期稀有卡概率上升
  if (rar === 'epic') base += w * 3.2;      // 史诗卡越后面越容易刷出来
  return base;
}
/* ===== 强化卡池 =====
   字段：id 唯一键 · rar 稀有度(common/rare/epic，权重见 RARITY) · name 卡名 · desc 面板说明 ·
        apply 抽到后立即执行的加成效应用 · elKey 有值时表示「某座塔专属」强化（无则通用）*/
var BUFF_POOL = [
  /* —— 普通：稳扎稳打 —— */
  { id:'dmg',   rar:'common', name:'火力强化', desc:'所有塔伤害 +25%',        apply:function(){ BUFFS.dmg += 0.25; } },
  { id:'rate',  rar:'common', name:'超频',     desc:'所有塔攻速 +20%',        apply:function(){ BUFFS.rate += 0.20; } },
  { id:'range', rar:'common', name:'雷达升级', desc:'所有塔射程 +18%',        apply:function(){ BUFFS.range += 0.18; } },
  { id:'gold',  rar:'common', name:'战时经济', desc:'击杀金币 +35%',          apply:function(){ BUFFS.gold += 0.35; } },
  { id:'hp',    rar:'common', name:'装甲修复', desc:'立即回 4 点基地血量',    apply:function(){ hp = Math.min(MAXHP, hp + 4); } },
  { id:'range2',rar:'common', name:'射程校准', desc:'所有塔射程 +10%（可叠加）', apply:function(){ BUFFS.range += 0.10; } },
  { id:'cost',  rar:'common', name:'塔位折扣', desc:'建塔费用 -10%（可叠加）', apply:function(){ BUFFS.costCut = Math.min(0.5, BUFFS.costCut + 0.10); } },
  /* —— 稀有：战术级 —— */
  { id:'crit',  rar:'rare', name:'瞄准模块', desc:'暴击率 +12%（2.5 倍伤）', apply:function(){ BUFFS.crit += 0.12; } },
  { id:'combo', rar:'rare', name:'连杀引擎', desc:'连杀伤害加成翻倍',       apply:function(){ BUFFS.combo += 1; } },
  { id:'reso',  rar:'rare', name:'共鸣增幅', desc:'元素共鸣效果 +60%',      apply:function(){ BUFFS.reso += 0.6; } },
  { id:'splash',rar:'rare', name:'扩散弹头', desc:'溅射半径 +45%',          apply:function(){ BUFFS.splash += 0.45; } },
  { id:'gold2', rar:'rare', name:'战争财',   desc:'立即获得 180 金币',      apply:function(){ goldAdd(180); } },
  { id:'bank',  rar:'rare', name:'金库利息', desc:'每波结束按当前金币 +8% 结算利息', apply:function(){ BUFFS.interest += 0.08; } },
  { id:'regen', rar:'rare', name:'修复无人机', desc:'每波开始回 2 血（满血时转成等量护盾）', apply:function(){ BUFFS.regen += 2; } },
  { id:'bossh', rar:'rare', name:'BOSS 猎手', desc:'对 BOSS 伤害 +40%',     apply:function(){ BUFFS.bossDmg += 0.40; } },
  /* —— 史诗：改变打法 —— */
  { id:'pierce',rar:'epic', name:'穿甲弹芯', desc:'所有塔无视敌人 50% 护甲', apply:function(){ BUFFS.pierceAdd += 0.50; } },
  { id:'zero',  rar:'epic', name:'绝对零度', desc:'减速效果 ×1.5、持续时间 +30%', apply:function(){ BUFFS.slowAdd += 0.30; } },
  { id:'blast', rar:'epic', name:'连锁爆破', desc:'溅射伤害 +40%',          apply:function(){ BUFFS.splashDmg += 0.40; } },
  { id:'venom', rar:'epic', name:'毒液浓缩', desc:'中毒伤害 +60%',          apply:function(){ BUFFS.dotAdd += 0.60; } },
  { id:'over',  rar:'epic', name:'元素超载', desc:'元素专精效果 +50%（可叠加）', apply:function(){ BUFFS.elBoost += 0.50; } },
  /* —— v7.8 新增通用强化卡：20 张（普通 8 / 稀有 7 / 史诗 5），双效与经济型为主 —— */
  /* —— 普通：小幅稳扎稳打（8 张） —— */
  { id:'g_scope',  rar:'common', name:'望远校准', desc:'所有塔射程 +15%',                     apply:function(){ BUFFS.range += 0.15; } },
  { id:'g_gear',   rar:'common', name:'疾风齿轮', desc:'所有塔攻速 +12%',                     apply:function(){ BUFFS.rate += 0.12; } },
  { id:'g_tithe',  rar:'common', name:'战地拾荒', desc:'击杀金币 +18%',                       apply:function(){ BUFFS.gold += 0.18; } },
  { id:'g_plate',  rar:'common', name:'应急护板', desc:'立即获得 3 点护盾',                   apply:function(){ BUFFS.shieldHP += 3; } },
  { id:'g_edge',   rar:'common', name:'精准打磨', desc:'暴击率 +8%（2.5 倍伤）',              apply:function(){ BUFFS.crit += 0.08; } },
  { id:'g_frost',  rar:'common', name:'霜冻残留', desc:'减速持续时间 +15%',                   apply:function(){ BUFFS.slowAdd += 0.15; } },
  { id:'g_trade',  rar:'common', name:'物资议价', desc:'建塔费用 -8%',                        apply:function(){ BUFFS.costCut = Math.min(0.5, BUFFS.costCut + 0.08); } },
  { id:'g_pair',   rar:'common', name:'双管齐下', desc:'所有塔伤害 +10%、攻速 +8%',           apply:function(){ BUFFS.dmg += 0.10; BUFFS.rate += 0.08; } },
  /* —— 稀有：战术级（7 张） —— */
  { id:'g_greed',  rar:'rare',   name:'战利金库', desc:'击杀金币 +20%、每波利息 +5%',         apply:function(){ BUFFS.gold += 0.20; BUFFS.interest += 0.05; } },
  { id:'g_reach',  rar:'rare',   name:'全域校射', desc:'所有塔射程 +25%、溅射半径 +15%',      apply:function(){ BUFFS.range += 0.25; BUFFS.splash += 0.15; } },
  { id:'g_slay',   rar:'rare',   name:'血战成瘾', desc:'连杀伤害加成翻倍、暴击率 +6%',        apply:function(){ BUFFS.combo += 1; BUFFS.crit += 0.06; } },
  { id:'g_armor',  rar:'rare',   name:'破甲涂层', desc:'所有塔无视敌人 30% 护甲',             apply:function(){ BUFFS.pierceAdd += 0.30; } },
  { id:'g_mercy',  rar:'rare',   name:'战地军医', desc:'每波开始回 2 血（满血转护盾）、立即回 3 点基地血', apply:function(){ BUFFS.regen += 2; hp = Math.min(MAXHP, hp + 3); } },
  { id:'g_bounty', rar:'rare',   name:'悬赏标记', desc:'对 BOSS 伤害 +30%、击杀金币 +15%',    apply:function(){ BUFFS.bossDmg += 0.30; BUFFS.gold += 0.15; } },
  { id:'g_acid',   rar:'rare',   name:'腐蚀酸液', desc:'中毒伤害 +30%、溅射伤害 +15%',        apply:function(){ BUFFS.dotAdd += 0.30; BUFFS.splashDmg += 0.15; } },
  /* —— 史诗：改变打法（5 张） —— */
  { id:'g_econ',   rar:'epic',   name:'黄金律法', desc:'每波利息 +25%、建塔费用 -25%',        apply:function(){ BUFFS.interest += 0.25; BUFFS.costCut = Math.min(0.5, BUFFS.costCut + 0.25); } },
  { id:'g_relic',  rar:'epic',   name:'共鸣圣物', desc:'元素共鸣效果 +100%、元素专精收益 +50%', apply:function(){ BUFFS.reso += 1.0; BUFFS.elBoost += 0.50; } },
  { id:'g_quake',  rar:'epic',   name:'震地引信', desc:'溅射半径 +80%、溅射伤害 +30%',        apply:function(){ BUFFS.splash += 0.80; BUFFS.splashDmg += 0.30; } },
  { id:'g_beacon', rar:'epic',   name:'增幅信标', desc:'辅助塔光环效果 +60%',                 apply:function(){ BUFFS.aura += 0.60; } },
  { id:'g_hoard',  rar:'epic',   name:'孤注一掷', desc:'立即获得 650 金币（一次性暴富，无持续加成）', apply:function(){ goldAdd(650); } },
  /* —— v7.8 炮塔专属强化卡：每座塔 4 张（common×2 / rare×1 / epic×1）——
     只在「玩家已建了对应塔」时才会刷出来；效果由 twAdd 累加进 BUFFS.tw[elem]，可叠加 */
  /* ===== 🔥 火焰塔：小范围溅射 ===== */
  { id:'t_fire_1', elKey:'fire', rar:'common', name:'燃料增效',
    desc:'🔥 火焰塔溅射半径 +0.25 格', apply:function(){ twAdd('fire','splashR',0.25); } },
  { id:'t_fire_2', elKey:'fire', rar:'common', name:'助燃药剂',
    desc:'🔥 火焰塔溅射伤害 +15%', apply:function(){ twAdd('fire','splashK',0.15); } },
  { id:'t_fire_3', elKey:'fire', rar:'rare', name:'喷射增压',
    desc:'🔥 火焰塔攻速 +25%', apply:function(){ twAdd('fire','rate',0.25); } },
  { id:'t_fire_4', elKey:'fire', rar:'epic', name:'烈焰风暴',
    desc:'🔥 火焰塔溅射半径 +0.9 格、溅射伤害 +55%', apply:function(){ twAdd('fire','splashR',0.9); twAdd('fire','splashK',0.55); } },

  /* ===== ❄️ 冰霜塔：减速控场 ===== */
  { id:'t_ice_1', elKey:'ice', rar:'common', name:'寒潮延展',
    desc:'❄️ 冰霜塔减速时长 +0.2 秒', apply:function(){ twAdd('ice','slowT',0.2); } },
  { id:'t_ice_2', elKey:'ice', rar:'common', name:'霜环扩散',
    desc:'❄️ 冰霜塔减速范围 +0.2 格', apply:function(){ twAdd('ice','slowR',0.2); } },
  { id:'t_ice_3', elKey:'ice', rar:'rare', name:'深冻结界',
    desc:'❄️ 冰霜塔减速强度 +25%', apply:function(){ twAdd('ice','slowK',0.25); } },
  { id:'t_ice_4', elKey:'ice', rar:'epic', name:'绝对冰封',
    desc:'❄️ 冰霜塔减速时长 +0.8 秒、减速强度 +45%', apply:function(){ twAdd('ice','slowT',0.8); twAdd('ice','slowK',0.45); } },

  /* ===== ⚡ 雷电塔：链式弹射 ===== */
  { id:'t_thunder_1', elKey:'thunder', rar:'common', name:'超导链接',
    desc:'⚡ 雷电塔链弹 +1 个目标', apply:function(){ twAdd('thunder','chain',1); } },
  { id:'t_thunder_2', elKey:'thunder', rar:'common', name:'低损导流',
    desc:'⚡ 雷电塔链弹每跳衰减改善 +0.03', apply:function(){ twAdd('thunder','chainK',0.03); } },
  { id:'t_thunder_3', elKey:'thunder', rar:'rare', name:'雷暴蓄能',
    desc:'⚡ 雷电塔伤害 +30%', apply:function(){ twAdd('thunder','dmg',0.30); } },
  { id:'t_thunder_4', elKey:'thunder', rar:'epic', name:'万雷落顶',
    desc:'⚡ 雷电塔链弹 +3 个目标、每跳衰减改善 +0.12', apply:function(){ twAdd('thunder','chain',3); twAdd('thunder','chainK',0.12); } },

  /* ===== ☠️ 剧毒塔：大范围持续毒 ===== */
  { id:'t_poison_1', elKey:'poison', rar:'common', name:'毒液加浓',
    desc:'☠️ 剧毒塔毒伤 +3/秒', apply:function(){ twAdd('poison','dotFlat',3); } },
  { id:'t_poison_2', elKey:'poison', rar:'common', name:'余毒难消',
    desc:'☠️ 剧毒塔中毒持续 +0.5 秒', apply:function(){ twAdd('poison','dotT',0.5); } },
  { id:'t_poison_3', elKey:'poison', rar:'rare', name:'瘴气弥漫',
    desc:'☠️ 剧毒塔中毒范围 +0.3 格', apply:function(){ twAdd('poison','dotR',0.3); } },
  { id:'t_poison_4', elKey:'poison', rar:'epic', name:'瘟疫之源',
    desc:'☠️ 剧毒塔毒伤乘区 +70%、毒伤 +12/秒', apply:function(){ twAdd('poison','dotMul',0.7); twAdd('poison','dotFlat',12); } },

  /* ===== 🔨 物理塔：单体破甲 ===== */
  { id:'t_phys_1', elKey:'phys', rar:'common', name:'破甲锤击',
    desc:'🔨 物理塔对有护甲目标伤害 +15%', apply:function(){ twAdd('phys','antiArmor',0.15); } },
  { id:'t_phys_2', elKey:'phys', rar:'common', name:'淬火重锤',
    desc:'🔨 物理塔伤害 +15%', apply:function(){ twAdd('phys','dmg',0.15); } },
  { id:'t_phys_3', elKey:'phys', rar:'rare', name:'暴风连锤',
    desc:'🔨 物理塔攻速 +25%', apply:function(){ twAdd('phys','rate',0.25); } },
  { id:'t_phys_4', elKey:'phys', rar:'epic', name:'碎甲屠戮',
    desc:'🔨 物理塔对有护甲目标伤害 +55%、对 BOSS 伤害 +90%', apply:function(){ twAdd('phys','antiArmor',0.55); twAdd('phys','boss',0.9); } },

  /* ===== 📡 辅助塔：光环增益 ===== */
  { id:'t_support_1', elKey:'support', rar:'common', name:'共鸣指挥',
    desc:'📡 辅助塔光环伤害加成 +8%', apply:function(){ twAdd('support','auraDmg',0.08); } },
  { id:'t_support_2', elKey:'support', rar:'common', name:'节拍共鸣',
    desc:'📡 辅助塔光环攻速加成 +6%', apply:function(){ twAdd('support','auraRate',0.06); } },
  { id:'t_support_3', elKey:'support', rar:'rare', name:'廉价信标',
    desc:'📡 辅助塔建塔费 -15%', apply:function(){ twAdd('support','cost',0.15); } },
  { id:'t_support_4', elKey:'support', rar:'epic', name:'全域共鸣',
    desc:'📡 辅助塔光环伤害加成 +28%、光环攻速加成 +22%', apply:function(){ twAdd('support','auraDmg',0.28); twAdd('support','auraRate',0.22); } },

  /* ===== 🎯 狙击塔：超远点杀高价值 ===== */
  { id:'t_sniper_1', elKey:'sniper', rar:'common', name:'远端校准',
    desc:'🎯 狙击塔射程 +0.15 格', apply:function(){ twAdd('sniper','range',0.15); } },
  { id:'t_sniper_2', elKey:'sniper', rar:'common', name:'猎杀标记',
    desc:'🎯 狙击塔对高价值目标伤害 +20%', apply:function(){ twAdd('sniper','hv',0.2); } },
  { id:'t_sniper_3', elKey:'sniper', rar:'rare', name:'一枪爆头',
    desc:'🎯 狙击塔暴击率 +15%', apply:function(){ twAdd('sniper','crit',0.15); } },
  { id:'t_sniper_4', elKey:'sniper', rar:'epic', name:'斩首密令',
    desc:'🎯 狙击塔对高价值目标伤害 +70%、对 BOSS 伤害 +90%', apply:function(){ twAdd('sniper','hv',0.7); twAdd('sniper','boss',0.9); } },

  /* ===== 💥 榴弹塔：大范围爆破 ===== */
  { id:'t_mortar_1', elKey:'mortar', rar:'common', name:'弹药扩容',
    desc:'💥 榴弹塔溅射半径 +0.25 格', apply:function(){ twAdd('mortar','splashR',0.25); } },
  { id:'t_mortar_2', elKey:'mortar', rar:'common', name:'重装药包',
    desc:'💥 榴弹塔伤害 +15%', apply:function(){ twAdd('mortar','dmg',0.15); } },
  { id:'t_mortar_3', elKey:'mortar', rar:'rare', name:'破片强化',
    desc:'💥 榴弹塔溅射伤害 +30%', apply:function(){ twAdd('mortar','splashK',0.3); } },
  { id:'t_mortar_4', elKey:'mortar', rar:'epic', name:'饱和轰炸',
    desc:'💥 榴弹塔溅射半径 +1.2 格、溅射伤害 +35%', apply:function(){ twAdd('mortar','splashR',1.2); twAdd('mortar','splashK',0.35); } },
  /* ===== v8.21 机枪塔（第 9 座）专属卡 4 张：common×2 / rare×1 / epic×1 ===== */
  { id:'t_gatling_1', elKey:'gatling', rar:'common', name:'枪管散热',
    desc:'🔫 机枪塔攻速 +12%', apply:function(){ twAdd('gatling','rate',0.12); } },
  { id:'t_gatling_2', elKey:'gatling', rar:'common', name:'穿甲弹链',
    desc:'🔫 机枪塔伤害 +15%', apply:function(){ twAdd('gatling','dmg',0.15); } },
  { id:'t_gatling_3', elKey:'gatling', rar:'rare', name:'精密校枪',
    desc:'🔫 机枪塔射程 +18%', apply:function(){ twAdd('gatling','range',0.18); } },
  { id:'t_gatling_4', elKey:'gatling', rar:'epic', name:'金属风暴',
    desc:'🔫 机枪塔伤害 +40%（高频低伤，专治单次减伤）', apply:function(){ twAdd('gatling','dmg',0.40); } },
];
/* v7.8：本局已经出现过的卡 id —— 抽卡时优先给玩家「没见过的卡」，
   否则 70+ 张的卡池会反复只刷那几张，专属强化也永远看不见 */
var pickedIds = {};
/* 返回当前场上已建炮塔的元素集合（抽卡时用来判断哪些塔的专属强化值得给）*/
function builtElemSet(){
  var s = {};
  for (var i = 0; i < towers.length; i++) s[towers[i].elem] = 1;
  return s;
}
/* 强化卡抽取核心：先保底一张「已建炮塔」的专属强化，其余按稀有度权重抽，且优先未抽过的卡；返回 n 张卡 */
function pickBuffs(n, excludeIds){
  var out = [], i;
  var ex = excludeIds || {};
  var okCard = function(b){ return !bannedIds[b.id] && !ex[b.id]; };   /* v8.7：本局禁掉的卡 + 本次刷新要排除的卡 */
  /* —— ① 保底一张炮塔专属强化：只从「玩家已经建了的塔」里抽（没建的塔抽到也白搭）—— */
  var have = builtElemSet();
  var experts = BUFF_POOL.filter(function(b){ return b.elKey && have[b.elKey] && okCard(b); });
  if (!experts.length) experts = BUFF_POOL.filter(function(b){ return b.elKey && okCard(b); });
  if (!experts.length) experts = BUFF_POOL.filter(function(b){ return b.elKey; });
  if (experts.length){
    var eFresh = experts.filter(function(b){ return !pickedIds[b.id]; });
    var ep = eFresh.length ? eFresh : experts;
    var e1 = ep[Math.floor(Math.random() * ep.length)];
    out.push(e1); pickedIds[e1.id] = 1;
  }
  /* —— ② 其余位置：通用卡按稀有度加权；若「没见过的通用卡」还有余量就优先给新的 —— */
  var pool = BUFF_POOL.filter(function(b){ return !b.elKey && okCard(b); });
  var freshPool = pool.filter(function(b){ return !pickedIds[b.id]; });
  if (freshPool.length >= (n - out.length)) pool = freshPool;
  while (out.length < n && pool.length){
    var total = 0, w = [];
    for (i = 0; i < pool.length; i++){ w[i] = rarityWeight(pool[i].rar, wave); total += w[i]; }
    var r = Math.random() * total, pick = 0;
    for (i = 0; i < pool.length; i++){ r -= w[i]; if (r <= 0){ pick = i; break; } }
    var chosen = pool.splice(pick, 1)[0];
    out.push(chosen); pickedIds[chosen.id] = 1;
  }
  return out;
}
/* v8.0：无尽契约三选一（复用强化卡面板；契约界面隐藏「跳过」——这是必须做的抉择） */
function showPactChoices(){
  lastPanel = 'pact';
  running = false; paused = true;
  setSkipBtnVisible(false);           /* v8.12：契约面板隐藏并且不允许跳过 */
  var pool = PACT_POOL.slice(), picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  var el = document.getElementById('buffList');
  el.innerHTML = '<div style="font-size:13px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:6px;">'
    + '⚔ 无尽契约 · 第 ' + wave + ' 波已过 · 必选其一</div>'
    + '<div style="font-size:11px;color:#a894d8;text-align:center;margin-bottom:6px;">代价与收益并存，每份契约都会累积影响到后面所有波</div>';
  picks.forEach(function(p){
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:13px 15px;font-size:14.5px;width:100%;line-height:1.5;text-align:left;'
      + 'border-color:#ff9a6a;box-shadow:0 0 12px #ff9a6a55;';
    btn.innerHTML = '<b>' + p.name + '</b><br><span style="font-size:12px;color:#bb9cff">' + p.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      p.apply(); PACT.taken.push(p.name);
      recalcResonance(); updateHud();
      closeBuffPanel();
      running = true; paused = false; last = 0;
      SFX.upgrade();
      addFloat(W / 2, H * 0.42, '契约生效：' + p.name, '#ff9a6a');
      showBuffChoices();                     /* 契约选完，继续本波的强化卡三选一 */
    });
    el.appendChild(btn);
  });
  document.getElementById('buffOv').classList.remove('hidden');
}
/* 只刷新强化卡面板的顶部文案与按钮高亮，不重抽卡（切详略/进出禁卡模式时调用）*/
function updateBuffHead(){
  lastPanel = 'buff';                    /* v8.14：登记当前面板，切换文字详略时能就地重渲染 */
  /* 只刷新顶部文案与按钮高亮，**不重抽卡**（v8.12 修无限刷新 bug 的关键） */
  var _bt = document.getElementById('buffTitle'), _bs = document.getElementById('buffSub');
  var _ar = archetypeNow();
  if (_bt) _bt.textContent = banMode ? '🚫 选一张禁掉（本局不再出现）' : '选择强化';
  if (_bs) _bs.innerHTML = '🎯 当前倾向：<b style="color:#ffd76a">' + _ar.name + '</b>　<span style="font-size:11px;color:#bb9cff">'
    + _ar.hint + '</span><br><span style="font-size:10.5px;color:#7d8ba3;">🔄 换一批 ' + rerollLeft + ' 次　🚫 禁卡 ' + banLeft + ' 次</span>';
  var _bb = document.getElementById('banBtn');
  if (_bb) _bb.style.outline = banMode ? '2px solid #ffd76a' : 'none';
}
/* 打开强化卡选择面板：reuse=true 且手上已有卡时原样沿用，否则重新抽卡；同时生成换一批/禁卡/商店按钮 */
function showBuffChoices(excludeIds, reuse){
  running = false; paused = true;
  setSkipBtnVisible(true);            /* v8.12：强化卡界面才显示「跳过」，并且它是唯一可用的场景 */
  /* v8.26 修毛毛报的「退出商店也会刷新」：从商店回来时必须**沿用原来的 3 张**，
     不能重抽（v8.12 修的「禁一张进出会重抽」是同一个坑，当时只改了禁卡那条路径）。
     reuse=true 且手上已有卡 → 原样渲染；其余情况才真的抽新卡。 */
  if (!reuse || !curPicks || !curPicks.length) curPicks = pickBuffs(3, excludeIds).slice();
  var picks = curPicks;
  var el = document.getElementById('buffList');
  el.innerHTML = '';
  updateBuffHead();
  picks.forEach(function(b, idx){
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:14px 16px;font-size:15px;width:100%;line-height:1.5;letter-spacing:1px;';
    var rar = RARITY[b.rar] || RARITY.common;
    btn.style.borderColor = rar.color;
    btn.style.boxShadow = '0 0 12px ' + rar.color + '55';
    btn.innerHTML = '<b>' + b.name + '</b><span style="font-size:10px;color:' + rar.color +
      ';border:1px solid ' + rar.color + ';border-radius:8px;padding:0 5px;margin-left:6px;">' + rar.name + '</span>' +
      '<br><span style="font-size:12px;color:#bb9cff">' + b.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (banMode && banLeft > 0){             /* v8.7 禁卡模式：点哪张就禁掉哪张，然后重抽 */
        bannedIds[b.id] = 1; banLeft--; banMode = false;
        showTip('已禁掉「' + b.name + '」，本局不再出现（还剩 ' + banLeft + ' 次）');
        SFX.upgrade(); showBuffChoices(); return;
      }
      grantCard(b);                            /* v8.6：走统一入口（含套装计数） */
      if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 点过强化卡 */
      recalcResonance(); updateHud();
      closeBuffPanel();
      running = true; paused = false; last = 0;
      SFX.upgrade();
      addFloat(W/2, H*0.4, b.name + ' 已生效', '#8ff0ff');
    });
    el.appendChild(btn);
  });
  /* v8.1 商店入口 ｜ v8.7 追加「换一批」「禁一张」（合并成一行，避免撑高面板） */
  var toolRow = document.createElement('div');
  toolRow.style.cssText = 'display:flex;gap:6px;width:100%;margin-top:7px;';
  var rerollBtn = document.createElement('button');
  rerollBtn.className = 'btn';
  rerollBtn.id = 'rerollBtn';
  rerollBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;'
    + (rerollLeft > 0 ? '' : 'opacity:.45;');
  rerollBtn.innerHTML = '🔄 换一批<br><span style="font-size:10.5px;color:#bb9cff">剩 ' + rerollLeft + ' 次</span>';
  rerollBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (rerollLeft <= 0){ showTip('没有「换一批」次数了（每 5 波会补充 1 次）'); return; }
    rerollLeft--;
    var ex = {};
    curPicks.forEach(function(c){ ex[c.id] = 1; });     /* 本次刷新排除当前这 3 张，避免换了个寂寞 */
    SFX.upgrade(); showBuffChoices(ex);
    showTip('已换一批（还剩 ' + rerollLeft + ' 次）');
  });
  var banBtn = document.createElement('button');
  banBtn.className = 'btn';
  banBtn.id = 'banBtn';
  banBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;'
    + (banLeft > 0 ? '' : 'opacity:.45;');
  banBtn.innerHTML = '🚫 禁一张<br><span style="font-size:10.5px;color:#bb9cff">剩 ' + banLeft + ' 次</span>';
  banBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (banLeft <= 0){ showTip('没有「禁卡」次数了'); return; }
    /* v8.12 修「无限刷新」：原来这里直接调 showBuffChoices() → 每次进出禁卡模式都会重抽 3 张，
       等于无限刷新。现在只切换模式并刷新界面文案，绝不重抽。 */
    banMode = !banMode;
    updateBuffHead();
    showTip(banMode ? '点一张卡把它禁掉（本局不再出现）' : '已取消禁卡');
  });
  var shopBtn = document.createElement('button');
  shopBtn.className = 'btn';
  shopBtn.style.cssText = 'flex:1;padding:9px 6px;font-size:12.5px;';
  shopBtn.innerHTML = '🛒 商店<br><span style="font-size:10.5px;color:#ffd76a">' + goldText() + ' 金</span>';
  shopBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    openShop();
  });
  toolRow.appendChild(rerollBtn); toolRow.appendChild(banBtn); toolRow.appendChild(shopBtn);
  el.appendChild(toolRow);
  document.getElementById('buffOv').classList.remove('hidden');
}
/* ===== v8.21 共鸣裂隙（无尽专属）=====
   原方案是「裂隙格无法触发共鸣」，但那等于惩罚玩家精心布局，太硬。
   改成**取舍**：站在裂隙格上的塔 **伤害 +50%，但完全不参与任何共鸣**（孤立）。
   → 高伤 vs 失去共鸣/共振/增幅场，玩家要自己权衡把哪座塔放上去。
   每 15 波生成 1 个（最多同时 3 个），只在无尽模式出现，不影响已校准的 15 个正式关卡。 */
var rifts = [];
/* 裂隙坐标的字符串键（供 rifts 数组存取）*/
function riftKey(c, r){ return c + ',' + r; }
/* 判断 (c,r) 上是否有裂隙（建塔时拦截：裂隙格不能建）*/
function onRift(c, r){ return rifts.indexOf(riftKey(c, r)) >= 0; }
/* 清空所有裂隙（开新关/重开一局时调用）*/
function resetRifts(){ rifts = []; }
/* 随机生成一个元素裂隙（占用非路径空格，最多 3 个）：塔建在裂隙上可获得双元素。返回是否生成成功 */
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
/* 绘制所有裂隙的旋涡标记（战场底层，画在格子之上、塔之下）*/
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
}
