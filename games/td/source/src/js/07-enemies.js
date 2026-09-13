/* ══════════════════════════════════════════════════════════════════════════
 * 07-enemies.js —— 敌人：ENEMIES 数据表与词缀
 *
 * 来源：game.html 第 3135-3253 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 敌人 ================= */
/* ===== 敌人总表：每种怪的基础数值与特性开关（波次强度另由 waveComp/难度曲线叠加）=====
   通用字段：name 中文名 · hp 基础血 · speed 基础速度(格/秒) · gold 击杀金币 · color 主色 · r 半径(像素)
            fx 机制说明（图鉴展示）· tip 应对建议（图鉴展示）
   特性开关：armor 护甲减伤 · immuneSlow 免疫减速 · boss BOSS · heal 治疗 · split 分裂 · bomb 自爆 ·
            aura 指挥光环 · charge 冲锋 · absorb 吸收 · phase 相位 · airdrop 空降 · steal 偷金 */
var ENEMIES = {
  normal: { name:'步兵',   hp:72,  speed:1.05, gold:11,  color:'#7ea8d8', r:11 , fx:'普通单位，没有特殊能力，胜在数量', tip:'任意元素塔都能处理' },
  fast:   { name:'疾行者', hp:50,  speed:2.00, gold:10,  color:'#7cf5c0', r:9 , fx:'移动极快，血量很低', tip:'冰霜塔减速 / 雷电塔链式一次清一片' },
  armor:  { name:'装甲',   hp:195, speed:0.74, gold:18, color:'#c8a24a', r:13, armor:0.35 , fx:'护甲减伤 35%，走得慢但非常耐打', tip:'物理塔穿甲 / 电磁炮无视护甲' },
  shield: { name:'护盾',   hp:138, speed:1.02, gold:20, color:'#b48cff', r:12, immuneSlow:true , fx:'免疫减速，冰霜塔对它完全无效', tip:'别只堆冰霜，改用火/雷/物理硬输出' },
  boss:   { name:'BOSS',   hp:1050, speed:0.60, gold:90, color:'#ff4d6d', r:18, boss:true, armor:0.2 , fx:'超高血量 + 20% 减伤，每 10 波登场；会【狂暴】提速、【召唤】步兵、【沉默】最近的 2 座塔', tip:'别把主力塔堆在它旁边（会被沉默）；全屏冻结 + 集火' },
  /* ===== v5.5 MOB PACK ===== */
  /* —— v5.5 新增怪物：所有关卡按波次登场（第 1-4 波完全不变）——
     统一字段：name(中文名) / hp(基础血) / speed(基础速度) / gold(基础掉落) / color(主色) / r(半径)
     特性字段（图鉴可据此显示特性）：
       heal:true    —— 医疗兵：周期性治疗半径 2 格内其他怪
       split:true   —— 分裂虫：被击杀时分裂出 2 只幼体
       bomb:true    —— 自爆兵：路径 70% 后冲刺，到基地扣 2 点血
       aura:true    —— 精英队长：给半径 2.5 格内其他怪 +30% 速度（不叠加）
       dblGold:true —— 精英队长：击杀掉落双倍金币
       charge:true  —— 重装冲锋：每 5 秒冲锋一次（×1.8 速度，期间免疫减速）
       armor        —— 护甲减伤（0.5 = 减伤 50%）
       spawnOnly    —— 只由分裂产生，不进 waveComp */
  healer:  { name:'医疗兵',   hp:92,  speed:1.15, gold:16, color:'#2fd66b', r:11, heal:true , fx:'奶妈：半径 2 格内友军持续回血，每 3 秒再给最残血的友军回一大口（满血则套减伤护罩）', tip:'必须优先集火！它不死，这波怪就打不死' },
  splitter:{ name:'分裂虫',   hp:240, speed:0.95, gold:22, color:'#a35cff', r:13, split:true , fx:'被击杀时裂成 2 只快速幼体继续前进', tip:'留溅射（热震/扩散）火力收尾，别让它在你后方爆开' },
  spawn2:  { name:'分裂幼体', hp:80,  speed:1.75, gold:5,  color:'#c98cff', r:8,  spawnOnly:true , fx:'分裂虫爆开的残片，血量低但速度很快', tip:'溅射或链式一次带走一片' },
  bomber:  { name:'自爆兵',   hp:80,  speed:1.10, gold:14, color:'#ff7a2f', r:11, bomb:true , fx:'走过路径 70% 后进入冲刺（速度 ×2.2），抵达基地直接扣 2 点血', tip:'必须在中前段拦下，别放它过半程' },
  elite:   { name:'精英队长', hp:460, speed:0.90, gold:20, color:'#ffd24a', r:15, aura:true, dblGold:true , fx:'指挥光环：半径 2.5 格内友军 +30% 速度；击杀掉落双倍金币', tip:'优先点掉它，光环一散整波都会慢下来' },
  charger: { name:'重装冲锋', hp:360, speed:0.62, gold:26, color:'#9aa7b8', r:15, armor:0.5, charge:true, fx:'50% 护甲；每 5 秒冲锋 1.5 秒（冲锋期间提速 80% 且免疫减速）', tip:'物理塔穿甲；趁它冲锋结束的间隙集火' },
  /* ===== v8.1 机制轮换：让「露头就秒」不再万能，逼玩家混搭与留后手 ===== */
  bulwark: { name:'壁垒兵', hp:430, speed:0.70, gold:30, color:'#7f9bb5', r:15, armor:0.15, absorb:true,
             fx:'单次伤害超过自身血量 25% 时，该次伤害减免 65%（专克一波爆发秒杀）',
             tip:'别用单发高伤硬砸 —— 用持续输出磨它（毒 / 链式 / 溅射 / 多段）' },
  phase:   { name:'相位兵', hp:270, speed:1.05, gold:26, color:'#c78cff', r:13, phase:true,
             fx:'每 5 秒在「免疫元素」与「免疫物理」之间切换（身体颜色随之变化）',
             tip:'元素塔与物理塔混搭 —— 切换时打对应那一半' },
  airdrop: { name:'空降兵', hp:210, speed:1.20, gold:24, color:'#ff9a6a', r:12, airdrop:true,
             fx:'直接空降到路径 45% 处，跳过前半段防线（抵达基地扣 1 血）',
             tip:'后半段也要留火力，别把塔全堆在入口' },
  /* ===== v8.0 无尽经济压力：盗金贼 ===== */
  thief:  { name:'盗金贼', hp:180, speed:1.45, gold:8, color:'#ffd24a', r:12, steal:true,
            fx:'每 2 秒偷走你 2% 金币（单次上限 120），被击杀时连本带利吐回来；跑到底就真被偷走了',
            tip:'优先点它 —— 它身上带着你的钱，击杀全额归还并额外掉落' },
};
/* 敌人运行时状态：enemies 场上全部敌人 · spawnQueue 本波待出怪队列 · spawnTimer 出怪计时 ·
   waveActive 本波是否进行中 · waveBreak 波间休整剩余秒数 */
var enemies = [], spawnQueue = [], spawnTimer = 0, waveActive = false, waveBreak = 1.2;

/* 取路径第 i 个拐点的像素坐标；pi=1 表示走第二入口（多入口关卡用）*/
function waypointPx(i, pi){
  var list = (pi === 1) ? WAYPOINTS2 : WAYPOINTS;      /* v8.10：pi=1 走第二入口 */
  var w = list ? list[i] : null;
  return w ? { x: cx(w[0]), y: cy(w[1]) } : null;
}
/* 生成一个敌人：按当前波次与关卡难度计算血量/速度/护甲/词缀，并挂到 enemies 数组末尾（出怪的唯一入口）*/
function spawnEnemy(type){
  var d = ENEMIES[type];
  var lvDiff = (LEVELS[lvIndex] && LEVELS[lvIndex].diff) || 1;
  /* 难度曲线：① 线性成长（前期友好）② 第 8 波后二次项加速（专治后期挂机，塔再多也顶不住） */
  var late = Math.max(0, wave - 7);
  var lateK = Math.min(32, late * late * 0.026);        // v7.6 无尽：二次项封顶，避免后期血量指数爆炸
  var hpRaw = 1 + (wave - 1) * 0.27 + lateK;
  /* ===== v8.0 无尽改造（毛毛选「缓慢不封顶」）=====
     旧版在第 105 波把血量硬封顶 61 倍 → 敌人再也不长，而玩家每波三选一强化永远在涨，
     实测第 60 波起玩家就反超（199 波时强 11.8 万倍）→ 必然挂机。
     现在越过 61 倍后改为每波 ×1.09 的缓慢复合增长、不封顶 → 敌人最终会超过玩家，
     「尽量多撑一波」重新成立；前 100 波体感与旧版几乎一致（不会突然打不动）。
     正式关卡最多 18 波，永远走不到这条分支，5 关平衡不受影响。 */
  if (hpRaw > 61) hpRaw = 61 * Math.pow(1.09, wave - 105);
  var mul = hpRaw * lvDiff * (packMul || 1) * (PACT.hp || 1);   // 保留单波补偿 + v8.0 契约加成
  var pi = (WAYPOINTS2 && Math.random() < 0.5) ? 1 : 0;      /* v8.10：随机从两条入口之一登场 */
  var p0 = waypointPx(0, pi), p1 = waypointPx(1, pi);
  /* 出生散开方向 = 路径方向（前后错开），不再是随机横向偏移 ——
     横向偏移会让怪刚出生时斜插进路径、视觉上像「没走贴图上的路」 */
  var ang0 = (p0 && p1) ? Math.atan2(p1.y - p0.y, p1.x - p0.x) : 0;
  var off0 = (Math.random() - 0.5) * CELL * 0.7;
  enemies.push({
    type: type, hp: d.hp * mul, maxhp: d.hp * mul,
    speed: d.speed * CELL * 1.25 * (1 + Math.min(0.55, (wave - 1) * 0.024)) * (PACT.speed || 1) * (1 + wxEff('enemySpeed')),   // 后期更快 + 契约 + v8.3 寒潮减速
    gold: d.gold, color: d.color, r: d.r, armor: Math.min(0.85, (d.armor || 0) + (PACT.armor || 0) + wxEff('enemyArmor')),
    immuneSlow: !!d.immuneSlow, boss: !!d.boss,
    wp: 0, done: 0,
    x: p0.x + Math.cos(ang0) * off0, y: p0.y + Math.sin(ang0) * off0,
    slowT: 0, slowF: 1, dotT: 0, dotD: 0, hitFlash: 0, dir: 0, spawnT: 0.36, walk: Math.random()*6.28,
    shieldT: d.boss ? 1.5 : 3.0,   // 出生护盾：刚落地 3 秒内受伤仅 15%，逼它走出起点区（治「被压在出生点打」）
    healAuraT: 0.6, healGlow: 0, shieldBuffT: 0,   // 医疗兵光环计时 / 被治疗的绿光标记 / 护罩计时
    /* BOSS 技能字段（普通怪带着也无害，updateBossSkills 只处理 boss） */
    enraged: false, skill1T: d.boss ? 5.0 : 0, skill2T: d.boss ? 8.0 : 0,
    /* —— v5.5 新怪字段（普通怪带着无害，updateMobSkills 只处理带标记的）—— */
    heal: !!d.heal, healT: d.heal ? 3.0 : 0,                    // 医疗兵：爆发治疗冷却（每 3 秒一次）
    split: !!d.split,                                            // 分裂虫：死亡时分裂 2 只幼体
    bomb: !!d.bomb, sprinting: false,                            // 自爆兵：冲刺中标记（>70% 路程触发）
    aura: !!d.aura, auraF: 1,                                    // 精英队长：光环源；auraF = 本怪当前受到的速度倍率
    dblGold: !!d.dblGold,                                        // 精英队长：击杀掉落双倍金币
    charge: !!d.charge, chargeCd: d.charge ? 5.0 : 0, chargingT: 0,  // 重装冲锋：每 5 秒起冲一次（冲锋 1.5s + 冷却 3.5s）
    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）
    /* —— v8.8 敌人词缀（BOSS 与分裂幼体不参与，避免叠加过复杂）—— */
    aff: (d.boss || d.spawnOnly) ? null : rollEnemyAffix(wave),
    hidden: false, stealthT: 4.5,                                     // 隐匿：计时切换可见性
    /* —— v8.1 机制轮换 —— */
    absorb: !!d.absorb,                                              // 壁垒兵：单次高爆发被大幅减免
    phase: !!d.phase, phaseElem: 0, phaseT: 5.0,                     // 相位兵：0=免疫元素 / 1=免疫物理
    airdrop: !!d.airdrop,                                            // 空降兵：出生点直接推到路径 45% 处
    pathIdx: pi,                                                // v8.10：本敌走哪条入口
    totalPath: pathLenToWp((pi === 1 ? WAYPOINTS2.length - 1 : WAYPOINTS.length - 1), pi) || 1   // 本关路径总长（像素）：自爆兵算路程进度用
  });
  /* v8.1 空降兵：出生点直接推到路径 45% 处（跳过前半段防线） */
  if (d.airdrop){
    var _pl = (pi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;
    var total2 = pathLenToWp(_pl.length - 1, pi) || 1, target2 = total2 * 0.45, wpi2 = 0;
    for (var k3 = 0; k3 < _pl.length - 1; k3++){
      if (pathLenToWp(k3 + 1, pi) >= target2){ wpi2 = k3 + 1; break; }
    }
    var pp2 = waypointPx(wpi2, pi), eDrop = enemies[enemies.length - 1];
    if (pp2 && eDrop){ eDrop.x = pp2.x; eDrop.y = pp2.y; eDrop.wp = wpi2; eDrop.done = pathLenToWp(wpi2, pi); }
  }
}

