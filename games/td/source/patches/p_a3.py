# -*- coding: utf-8 -*-
"""
p_a3.py —— 《共鸣之塔》v5 补丁：① 物理塔/辅助塔参与共鸣组合 ② BOSS 三技能
用法: python3 p_a3.py [目标html]   默认 /data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html
规则: 每处替换精确整段匹配；匹配次数 != 1 立即报错并 exit(1)，不写回。
"""
import io, sys

TARGET = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'

s = io.open(TARGET, encoding='utf-8').read()
N = 0

def rep(tag, old, new):
    global s, N
    c = s.count(old)
    if c != 1:
        sys.stderr.write('  [FAIL] %s —— 匹配 %d 次（要求恰好 1 次），已放弃写回\n' % (tag, c))
        sys.exit(1)
    s = s.replace(old, new, 1)
    N += 1
    sys.stdout.write('  [OK] %s\n' % tag)

# ============ ① 共鸣组合：物理塔 / 辅助塔参与 ============
rep('R1 resonanceOf：新增 物理 4 组合 + 增幅场',
'''      if (pair === 'fire+ice'){ res.dmgMul += 0.70; res.splash = 1.0; res.tags.push('热震'); }
      else if (pair === 'fire+thunder'){ res.dmgMul += 0.80; res.rateMul += 0.25; res.tags.push('等离子'); }
      else if (pair === 'ice+thunder'){ res.slowMul = 3; res.freeze = true; res.tags.push('超导'); }
      else if (pair === 'fire+poison'){ res.dotInstant = 2.0; res.tags.push('燃爆'); }
      else { res.dmgMul += 0.25; res.tags.push('共鸣'); }''',
'''      if (pair === 'fire+ice'){ res.dmgMul += 0.70; res.splash = 1.0; res.tags.push('热震'); }
      else if (pair === 'fire+thunder'){ res.dmgMul += 0.80; res.rateMul += 0.25; res.tags.push('等离子'); }
      else if (pair === 'ice+thunder'){ res.slowMul = 3; res.freeze = true; res.tags.push('超导'); }
      else if (pair === 'fire+poison'){ res.dotInstant = 2.0; res.tags.push('燃爆'); }
      /* —— 物理塔参与的组合（v5）：让 🔨 不再只是「穿甲单体」 —— */
      else if (pair === 'phys+thunder'){ res.dmgMul += 0.60; res.pierceFull = true; res.tags.push('电磁炮'); }
      else if (pair === 'fire+phys'){ res.dmgMul += 0.50; res.armorBreak = 1.4; res.tags.push('熔铁'); }
      else if (pair === 'ice+phys'){ res.dmgMul += 0.55; res.critAdd = 0.15; res.tags.push('碎冰'); }
      else if (pair === 'phys+poison'){ res.dmgMul += 0.50; res.dotMul = 1.8; res.tags.push('腐蚀'); }
      /* —— 辅助塔：只给相邻的「攻击塔」增幅（自己不加，避免自环） —— */
      else if (o.elem === 'support'){
        if (t.elem !== 'support'){ res.dmgMul += 0.20; res.rangeMul += 0.10; res.tags.push('增幅场'); }
      }
      /* —— 辅助塔自己相邻攻击塔：不参与（它不攻击，加了也没用） —— */
      else if (t.elem === 'support'){ /* 辅助塔不攻击 */ }
      else { res.dmgMul += 0.25; res.tags.push('共鸣'); }''')

rep('R2 statAt：注明新字段不是倍率（防误用）',
'''  var r = t.res || { dmgMul:1, rateMul:1, rangeMul:1 };''',
'''  /* 注意：res 的新增字段 pierceFull / armorBreak / critAdd / dotMul == 开关或专用参数，
     不是乘区，只在 hitEnemy 里单独处理；这里只取 dmgMul / rangeMul / rateMul 三个倍率 */
  var r = t.res || { dmgMul:1, rateMul:1, rangeMul:1 };''')

# ============ ② hitEnemy 真正生效 ============
rep('R3 hitEnemy：无视护甲 / 破甲增伤 / 暴击加成',
'''function hitEnemy(t, e, st, def, isChain){
  var armor = 1 - (e.armor || 0) * (1 - (def.pierce || 0));
  var comboMul = 1 + Math.min(comboCount, 40) * 0.02 * (1 + BUFFS.combo);   // 连杀加成
  var crit = Math.random() < BUFFS.crit;
  var dmg = st.dmg * armor * comboMul * (crit ? 2.5 : 1);''',
'''function hitEnemy(t, e, st, def, isChain){
  var res = t.res || null;
  /* 电磁炮：完全无视护甲 */
  var armor = (res && res.pierceFull) ? 1 : (1 - (e.armor || 0) * (1 - (def.pierce || 0)));
  /* 熔铁：只对「有护甲」的目标额外 ×1.4 */
  var breakMul = (res && res.armorBreak && (e.armor || 0) > 0) ? res.armorBreak : 1;
  var comboMul = 1 + Math.min(comboCount, 40) * 0.02 * (1 + BUFFS.combo);   // 连杀加成
  /* 碎冰：本塔暴击率 +15% */
  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0));
  var dmg = st.dmg * armor * breakMul * comboMul * (crit ? 2.5 : 1);''')

rep('R4 hitEnemy：腐蚀（毒伤 ×1.8）',
'''  if (def.dot){ e.dotD = def.dot * (1 + (t.lv - 1) * 0.4); e.dotT = def.dotT * (t.res && t.res.dotInstant ? 2.0 : 1); }
  if (t.res && t.res.dotInstant && def.dot){ e.hp -= def.dot * def.dotT * t.res.dotInstant; }''',
'''  var dotK = (res && res.dotMul) ? res.dotMul : 1;                          // 腐蚀：毒伤 ×1.8
  if (def.dot){ e.dotD = def.dot * (1 + (t.lv - 1) * 0.4) * dotK; e.dotT = def.dotT * (t.res && t.res.dotInstant ? 2.0 : 1); }
  if (t.res && t.res.dotInstant && def.dot){ e.hp -= def.dot * def.dotT * t.res.dotInstant * dotK; }''')

# ============ ③ updateTowers 支持「沉默」 ============
rep('R5 updateTowers：被沉默的塔停火（冷却照常衰减）',
'''  for (var i = 0; i < towers.length; i++){
    var t = towers[i], def = ELEMS[t.elem];
    if (def.aura || !def.dmg) continue;
    var st = towerStat(t);
    t.cd -= dt;''',
'''  for (var i = 0; i < towers.length; i++){
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
    t.cd -= dt;''')

# ============ ④ spawnEnemy：BOSS 技能字段 + 新增函数 ============
rep('R6 spawnEnemy：BOSS 技能字段 + 召唤/沉默/技能主循环',
'''    slowT: 0, slowF: 1, dotT: 0, dotD: 0, hitFlash: 0, dir: 0, spawnT: 0.36, walk: Math.random()*6.28
  });
}''',
'''    slowT: 0, slowF: 1, dotT: 0, dotD: 0, hitFlash: 0, dir: 0, spawnT: 0.36, walk: Math.random()*6.28,
    /* BOSS 技能字段（普通怪带着也无害，updateBossSkills 只处理 boss） */
    enraged: false, skill1T: d.boss ? 5.0 : 0, skill2T: d.boss ? 8.0 : 0
  });
}

/* ================= BOSS 技能 ================= */
/* 待生成队列：技能触发时只入队，主循环安全点（flushPendingSpawn）再真正 push，
   避免在遍历 enemies 的过程中插入元素导致漏帧/错乱 */
var pendingSpawn = [];
function spawnEnemyAt(type, x, y, wp){
  var n0 = enemies.length;
  spawnEnemy(type);                                  // spawnEnemy 无返回值，用长度差取回新对象
  if (enemies.length <= n0) return null;
  var e = enemies[enemies.length - 1];
  e.x = x + (Math.random() - 0.5) * CELL * 0.8;
  e.y = y + (Math.random() - 0.5) * CELL * 0.8;
  var lastWp = WAYPOINTS.length - 2; if (lastWp < 0) lastWp = 0;
  e.wp = Math.max(0, Math.min(lastWp, wp || 0));     // 跟随 BOSS 的路径进度，避免倒着走
  e.spawnT = 0.36;
  return e;
}
function flushPendingSpawn(){
  if (!pendingSpawn.length) return;
  for (var i = 0; i < pendingSpawn.length; i++){
    var q = pendingSpawn[i];
    for (var k = 0; k < q.n; k++) spawnEnemyAt(q.type, q.x, q.y, q.wp);
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
    /* ② 召唤：每 6 秒 2 个步兵（入队，安全点插入） */
    if (typeof e.skill1T !== 'number') e.skill1T = 5.0;
    e.skill1T -= dt;
    if (e.skill1T <= 0){
      e.skill1T = 6.0;
      pendingSpawn.push({ type: 'normal', x: e.x, y: e.y, wp: e.wp, n: 2 });
      addFloat(e.x, e.y - e.r - 6, '召唤！', '#c9a6ff');
      SFX.summon();
    }
    /* ③ 沉默：每 10 秒让最近的 2 座塔停火 3 秒 */
    if (typeof e.skill2T !== 'number') e.skill2T = 8.0;
    e.skill2T -= dt;
    if (e.skill2T <= 0){
      e.skill2T = 10.0;
      silenceNearestTowers(e, 2, 3.0);
    }
  }
}''')

# ============ ⑤ 主循环接入 ============
rep('R7 frame：updateEnemies 之后调用 BOSS 技能 + 安全点插入召唤物',
'''    updateEnemies(dt);
    if (running) updateTowers(dt);
    updateHud();''',
'''    updateEnemies(dt);
    updateBossSkills(dt);            // BOSS 三技能（普通波自动空转）
    flushPendingSpawn();             // 安全点：把召唤的步兵真正放进战场
    if (running) updateTowers(dt);
    updateHud();''')

# ============ ⑥ 音效 ============
rep('R8 SFX：狂暴 / 召唤 / 沉默',
'''  error:   function(){ tone({ freq:196, dur:0.18, vol:0.07, type:'square' }); }
};''',
'''  error:   function(){ tone({ freq:196, dur:0.18, vol:0.07, type:'square' }); },
  rage:    function(){ noiseSfx(0.4, 0.10, 300); tone({ freq:150, freq2:60, dur:0.5, vol:0.09, type:'sawtooth' }); chord([110, 165], 0.4, 0.05, 'square'); },
  summon:  function(){ tone({ freq:330, freq2:660, dur:0.22, vol:0.05, type:'triangle' }); tone({ freq:494, dur:0.16, vol:0.04, type:'sine', delay:0.10 }); },
  silence: function(){ tone({ freq:880, freq2:180, dur:0.35, vol:0.05, type:'sine' }); noiseSfx(0.2, 0.03, 1600); }
};''')

# ============ ⑦ 视觉：沉默的塔 / BOSS 狂暴光环 ============
rep('R9 draw：被沉默的塔灰白 + ⚡ 断线标记',
'''    drawTowerBody(x, y, rad, tw.elem, def.color, k);
    // 辅助塔：显示光环范围''',
'''    drawTowerBody(x, y, rad, tw.elem, def.color, k);
    // 被 BOSS 沉默：灰白覆盖 + ⚡ 断线标记
    if (tw.silencedT > 0){
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#aeb8c6';
      ctx.beginPath(); ctx.arc(x, y, rad * 0.92, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, 6.3); ctx.stroke();
      ctx.fillStyle = '#e8eef8'; ctx.font = 'bold ' + (CELL*0.3) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚡', x, y - rad - 3);
      ctx.restore();
    }
    // 辅助塔：显示光环范围''')

rep('R10 draw：BOSS 狂暴红色光环脉冲',
'''    if (e.boss){ ctx.shadowBlur = 22; ctx.shadowColor = e.color; }''',
'''    if (e.boss){ ctx.shadowBlur = 22; ctx.shadowColor = e.color; }
    // 狂暴：红色光环脉冲（一圈，便宜）
    if (e.boss && e.enraged){
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(gameT * 7) * 0.25;
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3;
      ctx.shadowBlur = 18; ctx.shadowColor = '#ff3b3b';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6 + Math.sin(gameT * 7) * 3.5, 0, 6.3); ctx.stroke();
      ctx.restore();
    }''')

# ============ ⑧ 开场说明 ============
rep('R11 startOv：补一行新组合说明',
'''    <b>同元素相邻</b> → <i>共振</i>（伤害+25%）<br>''',
'''    <b>同元素相邻</b> → <i>共振</i>（伤害+25%）<br>
    🔨+⚡ <i>电磁炮</i>（无视护甲） · 🔨+🔥 <i>熔铁</i>（打有甲怪×1.4） · 🔨+❄️ <i>碎冰</i>（暴击+15%）<br>
    🔨+☠️ <i>腐蚀</i>（毒伤×1.8） · 攻击塔+📡 <i>增幅场</i>（伤害+20% 射程+10%）<br>''')

io.open(TARGET, 'w', encoding='utf-8').write(s)
print('  [DONE] %d 处替换 -> %s' % (N, TARGET))
