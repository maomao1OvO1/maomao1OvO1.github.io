/* ══════════════════════════════════════════════════════════════════════════
 * 08-boss.js —— BOSS 技能与阶段行为
 *
 * 来源：game.html 第 3254-3581 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= BOSS 技能 ================= */
/* 待生成队列：技能触发时只入队，主循环安全点（flushPendingSpawn）再真正 push，
   避免在遍历 enemies 的过程中插入元素导致漏帧/错乱 */
var pendingSpawn = [];
/* 第 i 个航点之前的累计路程（像素）：给中途生成的召唤物补齐路径进度 */
function pathLenToWp(i, pi){
  var list = (pi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;   /* v8.10 */
  var s = 0;
  for (var k = 0; k < i && k < list.length - 1; k++){
    var a = waypointPx(k, pi), b = waypointPx(k + 1, pi);
    if (a && b) s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}
/* 在指定像素位置按指定入口生成敌人并返回该对象（空投/分裂/召唤类效果用它精确落点）*/
function spawnEnemyAt(type, x, y, wp, pi){
  var n0 = enemies.length;
  spawnEnemy(type);                                  // spawnEnemy 无返回值，用长度差取回新对象
  if (enemies.length <= n0) return null;
  var e = enemies[enemies.length - 1];
  /* ===== v8.26 修毛毛报的「打爆之后乱跑、不在轨道上」=====
     根因：spawnEnemy 内部会**随机**分配入口（`pi = WAYPOINTS2 && Math.random()<0.5 ? 1 : 0`），
     但这里的生成位置 (x,y) 是**父级（分裂虫 / BOSS）所在的那一条路**。
     于是当双入口地图上父级走在第二条路、而召唤物被随机分到第一条路时，
     它就会从当前位置**斜穿到另一条路**去找自己的航点 —— 视觉上就是「脱离轨道乱跑」。
     修法：强制继承父级入口（pi），并且方向推算、路径长度、进度换算全部按同一条路算。 */
  var myPi = (typeof pi === 'number' && pi === 1 && WAYPOINTS2) ? 1 : 0;
  var myList = (myPi === 1 && WAYPOINTS2) ? WAYPOINTS2 : WAYPOINTS;
  e.pathIdx = myPi;
  /* 召唤物同样沿路径方向错开（用召唤点所在段的下一航点方向），避免横向乱散 */
  var nx2 = waypointPx((wp || 0) + 1, myPi) || { x: x, y: y };
  var angS = Math.atan2(nx2.y - y, nx2.x - x);
  var offS = (Math.random() - 0.5) * CELL * 0.6;
  e.x = x + Math.cos(angS) * offS;
  e.y = y + Math.sin(angS) * offS;
  var lastWp = myList.length - 2; if (lastWp < 0) lastWp = 0;
  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.done = pathLenToWp(e.wp, myPi);                  // 索敌排序用：与 BOSS 进度一致
  e.totalPath = pathLenToWp(myList.length - 1, myPi) || 1;   // 自爆兵算路程进度也要用同一条路
  e.spawnT = 0.36;
  return e;
}
/* 冲出本帧待生成的怪群队列（把 pendingSpawn 里攒的批量出怪一次性落地，避免同帧重复计算）*/
function flushPendingSpawn(){
  if (!pendingSpawn.length) return;
  for (var i = 0; i < pendingSpawn.length; i++){
    var q = pendingSpawn[i];
    for (var k = 0; k < q.n; k++) spawnEnemyAt(q.type, q.x, q.y, q.wp, q.pi);   /* v8.26：把入口一起传下去 */
  }
  pendingSpawn.length = 0;
}
/* 沉默：让离 BOSS 最近的 count 座攻击塔停火 dur 秒 */
function silenceNearestTowers(e, count, dur){
  var list = [];
  for (var i = 0; i < towers.length; i++){
    var t = towers[i], d = ELEMS[t.elem];
    if (!d || d.aura || !d.dmg) continue;            // 辅助塔不攻击，沉默它没有意义
    list.push({ t: t, d: Math.hypot(cx(t.c) - e.x, cy(t.r) - e.y) });
  }
  list.sort(function(a, b){ return a.d - b.d; });
  var n = Math.min(count, list.length);
  for (var k = 0; k < n; k++){
    list[k].t.silencedT = dur;
    addFloat(cx(list[k].t.c), cy(list[k].t.r) - CELL * 0.5, '沉默', '#c8d4e8');
  }
  if (n > 0) SFX.silence();
  return n;
}
/* BOSS 技能推进：处理狂暴、护盾、召唤、传送等分阶段行为（每帧由 stepSim 调用，无 BOSS 时安全空转）*/
function updateBossSkills(dt){
  if (enemies.length === 0) return;                  // 普通波：安全空转
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (!e.boss || e.hp <= 0) continue;
    /* ① 狂暴：血量首次跌破 40% 触发一次 */
    if (!e.enraged && e.hp <= e.maxhp * 0.40){
      e.enraged = true;
      e.speed *= 1.6;
      e.armor = Math.min(0.6, (e.armor || 0) + 0.2);
      addFloat(e.x, e.y - e.r - 8, '狂暴！', '#ff4d4d');
      burst(e.x, e.y, '#ff4d4d', 12);                // 克制：一次性 12 粒，不每帧刷
      SFX.rage();
      shakeT = 0.35;
    }
    /* ===== v8.21 BOSS 分阶段（方案里的 ⭐⭐ 项：原来只有「40% 触发一次狂暴」一个节点）=====
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
      e.skill1T = (e.stage >= 2) ? 3.5 : 6.0;
      pendingSpawn.push({ type: 'normal', x: e.x, y: e.y, wp: e.wp, n: 2, pi: e.pathIdx || 0 });   /* v8.26：带上 BOSS 所在入口 */
      addFloat(e.x, e.y - e.r - 6, '召唤！', '#c9a6ff');
      SFX.summon();
    }
    /* ③ 沉默：阶段 I/II 每 10 秒让最近的 2 座塔停火 3 秒；阶段 III 缩短到 5 秒 */
    if (typeof e.skill2T !== 'number') e.skill2T = 8.0;
    e.skill2T -= dt;
    if (e.skill2T <= 0){
      e.skill2T = (e.stage >= 3) ? 5.0 : 10.0;
      silenceNearestTowers(e, 2, 3.0);
    }
  }
}
/* ===== v5.5 新怪技能：医疗兵 / 精英队长光环 / 重装冲锋 =====
   全部按传入的 dt 增量推进（倍速子步 stepSim 会被多次调用，禁止依赖「每帧只调用一次」） */
function updateMobSkills(dt){
  var n = enemies.length;
  if (n === 0) return;
  var elites = [], healers = [], i, e;
  /* 第一遍：收集光环源/治疗者，并推进冲锋计时 */
  for (i = 0; i < n; i++){
    e = enemies[i];
    if (e.hp <= 0) continue;
    if (e.aura) elites.push(e);
    if (e.heal) healers.push(e);
    /* v8.1 相位兵：每 5 秒在「免疫元素」与「免疫物理」之间切换 */
    if (e.phase){
      e.phaseT -= dt;
      if (e.phaseT <= 0){ e.phaseT = 5.0; e.phaseElem = e.phaseElem ? 0 : 1; }
    }
    if (e.charge){
      if (e.chargingT > 0){                       // 冲锋中：扣冲锋时间
        e.chargingT -= dt;
        if (e.chargingT < 0) e.chargingT = 0;
        if (e.chargingT === 0) e.chargeCd = 3.5;  // 冲锋结束 → 冷却 3.5 秒（1.5+3.5 = 每 5 秒冲锋一次）
      } else {
        e.chargeCd -= dt;
        if (e.chargeCd <= 0){ e.chargingT = 1.5; } // 每 5 秒冲锋 1.5 秒（速度 ×1.8，见 updateEnemies）
      }
    }
  }
  /* —— v8.0 盗金贼：每 2 秒偷走 2% 金币（单次 5~120），记在怪身上，击杀时连本带利吐回 —— */
  for (i = 0; i < n; i++){
    e = enemies[i];
    if (!e.steal || e.hp <= 0) continue;
    e.stealT -= dt;
    if (e.stealT <= 0){
      e.stealT = 2.0;
      var take = Math.min(120, Math.max(5, Math.round(gold * 0.02)));
      if (take > 0 && gold >= take){
        goldSub(take); e.stolen = (e.stolen || 0) + take;
        addFloat(e.x, e.y - e.r - 6, '偷走 ' + take, '#ffd24a');
      }
    }
  }
  /* 精英光环：半径 2.5 格内其他怪 +30% 速度；不叠加，只取最强的一个 */
  if (elites.length){
    var ar = CELL * 2.5, ar2 = ar * ar;
    for (i = 0; i < n; i++){
      e = enemies[i];
      if (e.hp <= 0) continue;
      var f = 1;
      for (var k = 0; k < elites.length; k++){
        var el = elites[k];
        if (el === e) continue;                   // 光环只给「其他怪」
        var ax = el.x - e.x, ay = el.y - e.y;
        if (ax * ax + ay * ay <= ar2){ f = 1.3; break; }
      }
      e.auraF = f;                                // 每帧重算，不做累乘
    }
  }
  /* 医疗兵：每 4 秒治疗半径 2 格内其他怪（各自回其最大血量的 8%） */
  if (healers.length){
    var hr = CELL * 2, hr2 = hr * hr;
    for (i = 0; i < healers.length; i++){
      var h = healers[i];
      if (h.hp <= 0) continue;
      /* ① 常驻回血光环：半径内友军持续小量回血（每 0.6 秒 1.5% 最大血）—— 肉眼可见
         ② 爆发治疗：每 3 秒给「血量百分比最低」的友军回 15%；若它满血则改套 2 秒减伤护罩 */
      h.healAuraT = (h.healAuraT || 0) - dt;
      var auraTick = false;
      if (h.healAuraT <= 0){ h.healAuraT = 0.6; auraTick = true; }
      h.healT -= dt;
      var burst = false;
      if (h.healT <= 0){ h.healT = 3.0; burst = true; }
      if (!auraTick && !burst) continue;
      var worst = null, worstPct = 2;
      for (var j = 0; j < n; j++){
        var o = enemies[j];
        if (o === h || o.hp <= 0) continue;
        var ox = o.x - h.x, oy = o.y - h.y;
        if (ox * ox + oy * oy > hr2) continue;
        if (auraTick && o.hp < o.maxhp){                       // 持续回血
          o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.015 * (1 - wxEff('healCut')));   /* v8.3 瘴气：治疗 -30% */
          o.healGlow = 0.35;
        }
        var pct = o.hp / o.maxhp;
        if (pct < worstPct){ worstPct = pct; worst = o; }
      }
      if (burst && worst){
        if (worst.hp < worst.maxhp){                           // 爆发治疗
          var amt = worst.maxhp * 0.15 * (1 - wxEff('healCut'));   /* v8.3 瘴气：爆发治疗 -30% */
          worst.hp = Math.min(worst.maxhp, worst.hp + amt);
          addHealBeam(h.x, h.y, worst.x, worst.y);
          addFloat(worst.x, worst.y - worst.r - 8, '+' + Math.round(amt), '#8cffb4');
          h.healFx = 0.7; worst.healGlow = 0.8;
        } else {                                               // 全员满血：给最前面的友军套护罩
          worst.shieldBuffT = 2.0;
          addHealBeam(h.x, h.y, worst.x, worst.y);
          addFloat(worst.x, worst.y - worst.r - 8, '护罩', '#8cffb4');
          h.healFx = 0.5; worst.healGlow = 0.8;
        }
      }
    }
  }
}
/* 敌人主更新：倒序遍历每只怪推进移动/减速/中毒/受击等状态，走完路径扣血、死亡则结算（每帧由 stepSim 调用）*/
function updateEnemies(dt){
  for (var i = enemies.length - 1; i >= 0; i--){
    var e = enemies[i];
    if (e.hp <= 0){ killEnemy(e, i); continue; }
    if (e.slowT > 0) e.slowT -= dt; else e.slowF = 1;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.shieldT > 0){ e.shieldT -= dt; if (e.shieldT < 0) e.shieldT = 0; }
    if (e.healGlow > 0){ e.healGlow -= dt; if (e.healGlow < 0) e.healGlow = 0; }
    if (e.shieldBuffT > 0){ e.shieldBuffT -= dt; if (e.shieldBuffT < 0) e.shieldBuffT = 0; }
    if (e.dotT > 0){ e.dotT -= dt; e.hp -= e.dotD * dt; if (e.hp <= 0){ killEnemy(e, i); continue; } }
    /* —— v8.8 词缀：隐匿（周期性隐身）/ 自愈（每秒回血）—— */
    if (e.aff){
      if (e.aff.key === 'stealth'){
        e.stealthT -= dt;
        if (e.stealthT <= 0){ e.hidden = !e.hidden; e.stealthT = e.hidden ? 3.0 : 6.0; }
      } else if (e.aff.key === 'regen'){
        e.hp = Math.min(e.maxhp, e.hp + e.maxhp * 0.015 * dt);
      }
    }
    var tgt = waypointPx(e.wp + 1, e.pathIdx || 0);       /* v8.10：沿自己那条入口前进 */
    if (!tgt){
      var baseDmg = e.bomb ? 2 : 1;                // v5.5 自爆兵：突破防线扣 2 点基地血量
      var _sh = BUFFS.shieldHP || 0;
      if (_sh > 0){                                // v7.5 护盾先抵挡（可部分抵挡）
        var _used = Math.min(_sh, baseDmg);
        BUFFS.shieldHP = _sh - _used;
        baseDmg -= _used;
        addFloat(e.x, e.y, '护盾 -' + _used + (BUFFS.shieldHP > 0 ? '（剩 ' + BUFFS.shieldHP + '）' : ''), '#8fe4ff');
      }
      if (baseDmg > 0){
        hp -= baseDmg; flashHurt(); SFX.hurt();
        if (baseDmg > 1) addFloat(e.x, e.y, '-' + baseDmg, '#ff6a3a');
      }
      enemies.splice(i, 1); updateHud();
      if (hp <= 0){ gameOver(); return; }
      continue;
    }
    var dx = tgt.x - e.x, dy = tgt.y - e.y;
    var dist = Math.hypot(dx, dy);
    /* v5.5 速度合成：基础 × 精英光环 × 冲锋/冲刺；冲锋期间免疫减速（slowF 不参与） */
    var spdF = e.auraF || 1;
    if (e.aff && e.aff.key === 'rage' && e.hp < e.maxhp * 0.5) spdF *= 1.6;   /* v8.8 狂暴：半血后提速 */
    if (e.chargingT > 0) spdF *= 1.8;
    e.sprinting = !!(e.bomb && (e.done || 0) / (e.totalPath || 1) > 0.7);   // 自爆兵：70% 路程后冲刺
    if (e.sprinting) spdF *= 2.2;
    var step = e.speed * (e.chargingT > 0 ? 1 : e.slowF) * spdF * dt;
    if (dist <= step){ e.done = (e.done || 0) + dist; e.x = tgt.x; e.y = tgt.y; e.wp++; }
    else { e.done = (e.done || 0) + step; e.x += dx / dist * step; e.y += dy / dist * step; e.dir = Math.atan2(dy, dx); }
  }
}
/* 击杀结算：加金币、计数连杀、播死亡特效与音效、处理分裂/死亡爆炸等词缀，并把该怪从数组移除 */
function killEnemy(e, idx){
  /* v8.8 词缀「死亡爆炸」：原地炸开，1.2 格内的塔被眩晕 2 秒 */
  if (e.aff && e.aff.key === 'boom'){
    var br = CELL * 1.2, n2 = 0;
    for (var bi = 0; bi < towers.length; bi++){
      var bt = towers[bi];
      var bdx = cx(bt.c) - e.x, bdy = cy(bt.r) - e.y;
      if (bdx * bdx + bdy * bdy <= br * br){ bt.stunT = Math.max(bt.stunT || 0, 2.0); n2++; }
    }
    addRing(e.x, e.y, '#ffb04a', br, 0.55);
    burst(e.x, e.y, '#ffb04a', 18);
    if (n2) addFloat(e.x, e.y - e.r - 16, n2 + ' 座塔被眩晕', '#ffb04a');
    shakeT = Math.max(shakeT, 0.2);
  }
  /* v8.6 瘟疫套装：中毒而死的敌人，把毒传播给 1.5 格内的其他敌人 */
  if (setOn('poison') && e.dotT > 0 && e.dotD > 0){
    for (var qi = 0; qi < enemies.length; qi++){
      var qe = enemies[qi];
      if (qe === e || qe.hp <= 0) continue;
      if (inCells(qe, e, 1.5)) applyDotTo(qe, e.dotD, Math.max(1.5, e.dotT));
    }
    addRing(e.x, e.y, '#4fe060', CELL * 1.5, 0.5);
  }
  /* v5.5：精英队长掉落双倍金币 */
  var g2 = Math.round(e.gold * BUFFS.gold * (e.dblGold ? 2 : 1) * (PACT.gold || 1)) + (e.stolen || 0);   /* v8.0：契约金币倍率 + 盗金贼连本带利吐回 */
  goldAdd(g2); kills++;
  var comboPrevTier = comboTier(comboCount);
  comboCount++; comboT = 2.2;
  var comboNowTier = comboTier(comboCount);
  /* 档位切换（3 连首次出现 / 5 / 10 / 20 / 40）：播该档专属音效，与 SFX.kill / SFX.combo 叠加 */
  if (comboNowTier !== comboPrevTier || comboCount === 3) comboTierSfx(comboNowTier);
  addFloat(e.x, e.y, '+' + g2, '#ffd76a');
  burst(e.x, e.y, e.color, e.boss ? 28 : 12);
  coinFly.push({ x: e.x, y: e.y, t: 0, g: g2 });
  SFX.coin();
  shakeT = e.boss ? 0.4 : 0.12;
  var pitch = 700 + Math.min(comboCount, 20) * 45;
  enemyDie(e.type, comboCount, e.x);   // 按怪种发声 + 左右定位
  if (comboCount === 5 || comboCount === 10 || comboCount === 20 || comboCount % 25 === 0){
    comboTxt = '连杀 ×' + comboCount; comboT = COMBO_T_MAX;
    addFloat(W/2, H*0.3, comboTxt, comboColor(comboCount));   // 飘字行为保留，颜色跟随连杀档位
    SFX.combo(comboCount);                                    // 原音效保留（切档音效另行叠加）
  }
  /* v5.5 分裂虫：死亡时分裂 2 只幼体。只入队到 pendingSpawn，由主循环安全点
     （flushPendingSpawn）真正 push 进 enemies —— 严禁在遍历 enemies 时直接 push */
  if (e.split){
    pendingSpawn.push({ type: 'spawn2', x: e.x, y: e.y, wp: e.wp, n: 2, pi: e.pathIdx || 0 });   /* v8.26：带上分裂虫所在入口 */
    addFloat(e.x, e.y - e.r - 10, '分裂！', '#c98cff');
    burst(e.x, e.y, '#c98cff', 8);
  }
  enemies.splice(idx, 1); updateHud();
}

