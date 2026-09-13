/* ══════════════════════════════════════════════════════════════════════════
 * 09-fire.js —— 塔开火：选目标、伤害结算、共鸣触发
 *
 * 来源：game.html 第 3582-3778 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 塔开火 ================= */
function updateTowers(dt){
  for (var i = 0; i < towers.length; i++){
    var t = towers[i], def = ELEMS[t.elem];
    /* BOSS 沉默：停火，但冷却继续走完（沉默结束即可立即开火，手感更顺） */
    if (t.silencedT > 0){
      t.silencedT -= dt;
      if (t.silencedT < 0) t.silencedT = 0;
      t.cd -= dt;
      continue;
    }
    if (def.aura || !def.dmg) continue;
    var st = towerStat(t);
    t.cd -= dt;
    var best = null, bestProg = -1e9;
    var vip = null, vipProg = -1e9;     // TOWERS_V6_PATCH：高价值目标（医疗兵/精英队长/BOSS）单独一档
    for (var j = 0; j < enemies.length; j++){
      var e = enemies[j];
      if (e.hidden) continue;                       /* v8.8 隐匿词缀：隐身期间无法被锁定 */
      if (towerDist(t, e) > st.range) continue;
      /* 索敌优先级：
         ① 先打「离基地最近」的（累计已走路程 done 越大 = 离终点越近，漏掉最危险）
         ② 路程相同时打「血量最低」的（补刀优先，防止残血怪溜过去）
         done 乘 1e6 保证路程差严格压过血量差（血量最多约 1200）
         ③ TOWERS_V6_PATCH：带 highValue 的塔（狙击）把「医疗兵 / 精英队长 / BOSS」单独排一档，
            档内仍按 ①② 排序；只要射程内有高价值目标，就一定先打它 */
      /* ===== 主存档对象（localStorage 键 td_prog）=====
   unlocked 已解锁到第几关（从 1 数）· best 各关最高到达波次 · stars 各关星级 ·
   ach 已解锁成就 · daily 最近完成每日挑战的种子 · tutorialDone 是否完成教学 */
      var prog = (e.done || 0) * 1e6 - e.hp;
      if (e.markT > 0) prog += 1e12;      /* v8.5：被「标记」的敌人绝对优先（所有塔集火） */
      if (def.highValue && (e.heal || e.aura || e.boss)){
        if (prog > vipProg){ vipProg = prog; vip = e; }
      } else if (prog > bestProg){ bestProg = prog; best = e; }
    }
    if (def.highValue && vip) best = vip;
    if (best) t.ang = Math.atan2(best.y - cy(t.r), best.x - cx(t.c));
    if (!best || t.cd > 0) continue;
    t.cd = st.rate;
    t.flash = 0.1;
    if (Math.random() < 0.35) towerShot(t.elem, cx(t.c));   // 按塔种发声 + 左右定位
    hitEnemy(t, best, st, def);
    if (def.chain && !best.dead && enemies.indexOf(best) >= 0){
      /* TOWERS_V6_PATCH：链弹 5 跳，每跳伤害 ×chainK(0.85)；跳跃半径放宽到 1.9 格 */
      var chD = elemAt(t.elem, t.lv) || def;                  // v7.3：链弹数随等级提升
      var extra = 0, jumpK = chD.chainK || 0.85;
      for (var k = 0; k < enemies.length && extra < chD.chain - 1; k++){
        var e2 = enemies[k];
        if (e2 === best || e2.hp <= 0) continue;
        if (Math.hypot(e2.x - best.x, e2.y - best.y) < CELL * 1.9){
          hitEnemy(t, e2, { dmg: st.dmg * jumpK }, def, true);
          extra++; jumpK *= (def.chainK || 0.85);
        }
      }
    }
  }
}
/* ===== TOWERS_V6_PATCH：溅射 / 范围状态小工具 =====
   ① rings 是「命中圈」特效池：每发子弹只 push 一个对象、随 life 递减，绝不每帧新建；
   ② applyDotTo / applySlowTo 只写状态字段，真正的结算在 updateEnemies 里按 dt 推进
      （dotT / slowT 都是 dt 通道，倍速子步 stepSim 被多次调用也完全安全）；
   ③ 上毒只加强不削弱：普通毒不会把「腐蚀 ×1.8」或更长的毒覆盖掉。 */
function inCells(a, b, cells){
  var dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy <= CELL * cells * CELL * cells;   // 平方比较，省掉每发的 Math.hypot
}
/* 给敌人挂持续伤害（中毒/灼烧）：取更强的那个 dps 并延长持续时间 */
function applyDotTo(e, dps, dur){
  if (!e || e.hp <= 0 || !(dps > 0)) return;
  e.dotD = Math.max((e.dotT > 0 ? (e.dotD || 0) : 0), dps);
  e.dotT = Math.max(e.dotT || 0, dur);
}
/* 给敌人挂减速：取更强的减速倍率并延长持续时间；免疫减速的怪（护盾怪）直接跳过 */
function applySlowTo(e, mul, dur){
  if (!e || e.hp <= 0 || e.immuneSlow) return;   // 免疫减速的怪（护盾怪）直接跳过
  e.slowF = Math.min(e.slowF || 1, mul);
  e.slowT = Math.max(e.slowT || 0, dur);
}
/* 添加一个扩散光圈特效（有数量硬上限，防止怪海时特效池膨胀）*/
function addRing(x, y, color, rad, life){
  if (rings.length > 60) return;                  // 极端怪海下的硬上限，防特效池膨胀
  rings.push({ x:x, y:y, color:color, rad:rad, life:life, max:life });
}
/* 核心伤害结算：处理护甲穿透、暴击、溅射、链弹、中毒、减速、闪避、护盾与各类词条加成，扣血并飘字。炮塔每次命中都走这里 */
function hitEnemy(t, e, st, def, isChain){
  var res = t.res || null;
  var tw = twOf(t.elem);                                   // v7.8 本塔专属强化（无则 null）
  var af = t.affix || null;                                // v8.2 本塔随机词条
  /* 电磁炮 / 电磁狙击 / 破甲弹：完全无视护甲 */
  var pierceAll = Math.min(1, (BUFFS.pierceAdd || 0) + ((af && af.pierce) || 0));   // v8.2 词条「穿透」也计入
  var armor = (res && res.pierceFull) ? 1
            : (1 - (e.armor || 0) * (1 - pierceAll));   // v7.4 穿甲弹芯：无视部分护甲
  /* 熔铁 / 破甲弹：只对「有护甲」的目标额外加伤 */
  var breakMul = (res && res.armorBreak && (e.armor || 0) > 0) ? res.armorBreak : 1;
  /* TOWERS_V6_PATCH 物理塔：antiArmor = 对有甲目标 +35%（取代原 pierce 穿甲）
     v7.8：再加上专属强化 tw.antiArmor（不改变原来 tw 为空时的数值） */
  var antiK = (def.antiArmor || 0) + ((tw && tw.antiArmor) || 0) + ((t.elem === 'phys') ? wxEff('physAntiArmor') : 0)
            + ((t.elem === 'phys' && setOn('phys')) ? 0.30 : 0);   /* v8.3 铁潮 + v8.6 破军套装 */
  var antiMul = (antiK && (e.armor || 0) > 0) ? (1 + antiK) : 1;
  var comboMul = 1 + Math.min(comboCount, 40) * 0.02 * (1 + BUFFS.combo);   // 连杀加成
  /* 碎冰：本塔暴击率 +15% ｜ v7.8：狙击/物理等专属卡可再加本塔暴击率 */
  var wxCrit = (t.elem === 'phys') ? wxEff('physCrit') : 0;   /* v8.3 雷暴：物理塔暴击 +10% */
  var setCrit = (setOn('ice') && e.slowT > 0) ? 0.20 : 0;      /* v8.6 永冻套装：被减速目标 +20% 暴击率 */
  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0) + wxCrit + setCrit);   // v8.2 词条「致命」
  /* v7.8 高价值目标（医疗兵 / 精英队长 / BOSS，与索敌口径一致）与 BOSS 专属加伤 */
  var hvMul = ((e.heal || e.aura || e.boss) && tw && tw.hv) ? (1 + tw.hv) : 1;
  var bossMul = e.boss ? (1 + (BUFFS.bossDmg || 0) + ((tw && tw.boss) || 0) + ((af && af.boss) || 0)) : 1;   // v8.2 词条「猎王」
  var critMul = (crit && setOn('sniper')) ? 3.2 : 2.5;    /* v8.6 狙击套装：暴击 2.5 → 3.2 倍 */
  var dmg = st.dmg * armor * breakMul * antiMul * comboMul * hvMul * (crit ? critMul : 1) * bossMul;
  if (e.shieldT > 0) dmg *= 0.15;             // 出生护盾：减伤 85%
  if (e.shieldBuffT > 0) dmg *= 0.80;         // 医疗兵护罩：减伤 20%
  /* —— v8.8 词缀：硬化（概率减伤）/ 反伤（反噬攻击塔）—— */
  if (e.aff && e.aff.key === 'tough' && Math.random() < 0.25) dmg *= 0.4;
  if (e.aff && e.aff.key === 'thorn' && t.stunT !== undefined && t.stunT <= 0){
    t.stunT = 0.35;                               /* 反噬：该塔短暂卡顿（不是永久，避免体验过差） */
  }
  /* —— v8.1 壁垒兵：单次伤害超过其血量 25% 时减免 65%（专治「露头就秒」）—— */
  if (e.absorb && dmg > e.maxhp * 0.25) dmg *= 0.35;
  /* —— v8.1 相位兵：按当前相位免疫元素或物理 —— */
  if (e.phase){
    var isElemTower = (t.elem === 'fire' || t.elem === 'ice' || t.elem === 'thunder' || t.elem === 'poison');
    var isPhysTower = (t.elem === 'phys' || t.elem === 'sniper' || t.elem === 'mortar');
    if ((e.phaseElem === 0 && isElemTower) || (e.phaseElem === 1 && isPhysTower)) dmg *= 0.15;
  }
  e.hp -= dmg; e.hitFlash = 0.12;
  addFloat(e.x, e.y - e.r - 4, (crit ? '暴击 ' : '') + Math.round(dmg), crit ? '#ffd24a' : def.color);
  if (!isChain) addBeam(cx(t.c), cy(t.r), e.x, e.y, def.color);
  /* 减速/中毒参数先算一遍：主目标与范围目标用同一套数值 */
  var resoSlowK = (res && res.slowMul) ? res.slowMul : 1;                  // 超导：减速倍率 x3
  var ctrlK = sysCtrlMul(t.elem);                             // 控场体系加成
  /* v7.8 专属强化：slowK = 减速更强（速度压得更低）、slowT = 时长直接加秒 */
  var slowV = def.slow ? Math.max(0.10, def.slow / resoSlowK / ctrlK / (1 + ((tw && tw.slowK) || 0)) / (1 + wxEff('iceSlow'))) : 1;   /* v8.3 寒潮：减速更强 */
  var slowS = ((def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK * (1 + (BUFFS.slowAdd || 0))
            + ((tw && tw.slowT) || 0)) * (1 + ((af && af.slowT) || 0)) * (1 + wxEff('iceSlowT'));   // v7.4 绝对零度 ｜ v7.8 专属 ｜ v8.2 词条 ｜ v8.3 天气
  if (def.slow && !e.immuneSlow) applySlowTo(e, slowV, slowS);
  var dotK = (res && res.dotMul) ? res.dotMul : 1;                          // 腐蚀：毒伤 ×1.8
  /* v7.8 专属强化：dotFlat = 毒伤 +X/秒（数值）、dotMul = 毒伤乘区 */
  var dotD1 = def.dot ? ( (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK * (1 + (BUFFS.dotAdd || 0))
                         + ((tw && tw.dotFlat) || 0) ) * (1 + ((tw && tw.dotMul) || 0)) * (1 + ((af && af.dot) || 0)) * (1 + wxEff('dot')) : 0;   /* v8.3 天气毒伤 */   /* v8.2 词条「蚀骨」 */   // v7.4 毒液浓缩 / 毒伤含专属成长
  var dotT1 = def.dotT * (res && res.dotInstant ? 2.0 : 1) + ((tw && tw.dotT) || 0);
  if (def.dot) applyDotTo(e, dotD1, dotT1);
  if (res && res.dotInstant && def.dot){ e.hp -= def.dot * def.dotT * res.dotInstant * dotK; }
  /* —— TOWERS_V6_PATCH 剧毒塔 dotR：命中点 1.2 格内「所有敌人」中毒 ——
     毒伤在 updateEnemies 里直接扣血（不走护甲系数）= 无视护甲；
     范围内只 push 一个命中圈，不每帧新建对象 */
  if (def.dotR){
    for (var di = 0; di < enemies.length; di++){
      var de = enemies[di];
      if (de === e || de.hp <= 0) continue;
      if (inCells(de, e, (def2 ? def2.dotR : def.dotR))) applyDotTo(de, dotD1, dotT1);
    }
    addRing(e.x, e.y, '#4fe060', CELL * def.dotR, 0.5);
  }
  /* —— TOWERS_V6_PATCH 冰霜塔 slowR：命中点 1.0 格内「所有敌人」减速 ——
     v7.8：口径改为 def.slowR + 专属强化 tw.slowR（tw 为空时与原逻辑完全一致）*/
  var slowRUse = def.slowR ? (def.slowR + ((tw && tw.slowR) || 0)) : 0;
  if (slowRUse){
    for (var si2 = 0; si2 < enemies.length; si2++){
      var se = enemies[si2];
      if (se === e || se.hp <= 0) continue;
      if (inCells(se, e, slowRUse)) applySlowTo(se, slowV, slowS);
    }
    addRing(e.x, e.y, '#bfeaff', CELL * slowRUse, 0.45);
  }
  /* —— TOWERS_V6_PATCH 溅射统一入口 ——
     火焰/榴弹的 def.splashR 与组合「热震」的 res.splash 叠加共存：
     半径取两者较大者、倍率取两者较大者，互不覆盖；
     只有主目标之外的敌人吃溅射伤害（减血后由 updateEnemies 统一结算死亡）*/
  var def2 = elemAt(t.elem, t.lv) || def;            // v7.3：按等级取专属成长后的属性
  var setSpR = 1, setSpK = 1;
  if (t.elem === 'fire' && setOn('fire')) setSpR = 1.3;                 /* v8.6 烈焰套装 */
  if (t.elem === 'mortar' && setOn('mortar')){ setSpR = 1.3; setSpK = 1.25; }   /* v8.6 轰炸套装 */
  var spR = ((def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0)) * (1 + wxEff('splash')) * setSpR,
      spK = (def2.splashK || 0) * (1 + (BUFFS.splashDmg || 0)) * setSpK;   // v7.5 连锁爆破 + v8.6 套装
  if (res && res.splash){
    if (1.5 > spR) spR = 1.5;                       // 热震：原硬编码半径 1.5 格
    if (res.splash > spK) spK = res.splash;         // 热震：溅射伤害按 100% 结算
  }
  if (spR > 0){
    spR *= (BUFFS.splash || 1);                     // 「扩散弹头」强化：溅射范围 +45%
    for (var pi2 = 0; pi2 < enemies.length; pi2++){
      var so = enemies[pi2];
      if (so === e || so.hp <= 0) continue;
      if (!inCells(so, e, spR)) continue;
      so.hp -= dmg * spK; so.hitFlash = 0.1;
      /* 燃烧弹 / 毒气弹 / 冰爆：给溅射区域内的敌人补状态（全部走 dt 通道）*/
      if (res && res.splashBurn) applyDotTo(so, res.splashBurn, 3.0);
      if (res && res.splashDot) applyDotTo(so, res.splashDot, 3.0);
      if (res && res.splashSlow) applySlowTo(so, res.splashSlow, 1.6);
    }
    addRing(e.x, e.y, def.color, CELL * spR, 0.45);
    if (res && res.splash) burst(e.x, e.y, '#ff8a3a', 8);   // 热震：保留原粒子爆发
  }
  if (crit) SFX.crit(); else SFX.hit();
  if (e.hp <= 0) killEnemy(e, enemies.indexOf(e));
}

