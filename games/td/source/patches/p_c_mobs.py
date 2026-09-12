# -*- coding: utf-8 -*-
"""
p_c_mobs.py —— v5.5 新增 5 种怪物（模块 C：怪物/MOB 系统）

新增：医疗兵 healer / 分裂虫 splitter(+分裂幼体 spawn2) / 自爆兵 bomber /
      精英队长 elite / 重装冲锋 charger

用法：python3 p_c_mobs.py [目标html，默认 game.html]
特性：
  * 每处「精确整段匹配」，assert count == 1；不唯一 → 打印标签并 sys.exit(1)，绝不写回
  * 幂等保护：检测到已打补丁的标记直接跳过（不重复注入）
  * 全部为 ES5 风格（var/function），无 let/const/箭头函数/模板字符串
"""
import io, sys, os

MARK = '/* ===== v5.5 MOB PACK ===== */'

# ============================================================ ① ENEMIES 表
A1_OLD = """  boss:   { name:'BOSS',   hp:1050, speed:0.60, gold:90, color:'#ff4d6d', r:18, boss:true, armor:0.2 }
};"""

A1_NEW = """  boss:   { name:'BOSS',   hp:1050, speed:0.60, gold:90, color:'#ff4d6d', r:18, boss:true, armor:0.2 },
  """ + MARK + """
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
  healer:  { name:'医疗兵',   hp:92,  speed:1.15, gold:16, color:'#2fd66b', r:11, heal:true },
  splitter:{ name:'分裂虫',   hp:240, speed:0.95, gold:22, color:'#a35cff', r:13, split:true },
  spawn2:  { name:'分裂幼体', hp:80,  speed:1.75, gold:5,  color:'#c98cff', r:8,  spawnOnly:true },
  bomber:  { name:'自爆兵',   hp:80,  speed:1.10, gold:14, color:'#ff7a2f', r:11, bomb:true },
  elite:   { name:'精英队长', hp:460, speed:0.90, gold:20, color:'#ffd24a', r:15, aura:true, dblGold:true },
  charger: { name:'重装冲锋', hp:360, speed:0.62, gold:26, color:'#9aa7b8', r:15, armor:0.5, charge:true }
};"""

# ============================================================ ② spawnEnemy 新字段
A2_OLD = """    enraged: false, skill1T: d.boss ? 5.0 : 0, skill2T: d.boss ? 8.0 : 0
  });"""

A2_NEW = """    enraged: false, skill1T: d.boss ? 5.0 : 0, skill2T: d.boss ? 8.0 : 0,
    /* —— v5.5 新怪字段（普通怪带着无害，updateMobSkills 只处理带标记的）—— */
    heal: !!d.heal, healT: d.heal ? 4.0 : 0,                    // 医疗兵：治疗冷却（秒，每 4 秒一次）
    split: !!d.split,                                            // 分裂虫：死亡时分裂 2 只幼体
    bomb: !!d.bomb, sprinting: false,                            // 自爆兵：冲刺中标记（>70% 路程触发）
    aura: !!d.aura, auraF: 1,                                    // 精英队长：光环源；auraF = 本怪当前受到的速度倍率
    dblGold: !!d.dblGold,                                        // 精英队长：击杀掉落双倍金币
    charge: !!d.charge, chargeCd: d.charge ? 5.0 : 0, chargingT: 0,  // 重装冲锋：每 5 秒起冲一次（冲锋 1.5s + 冷却 3.5s）
    totalPath: pathLenToWp(WAYPOINTS.length - 1) || 1            // 本关路径总长（像素）：自爆兵算路程进度用
  });"""

# ============================================================ ③ stepSim 安全点前置
A3_OLD = """function stepSim(d){
  if (waveActive){"""

A3_NEW = """function stepSim(d){
  /* v5.5 安全点前置：上一子步 updateTowers（塔击杀分裂虫）入队的怪在这里补进战场。
     必须放在波次判定之前，否则「最后一只怪是分裂虫」时波次会提前结束、幼体被吞掉 */
  flushPendingSpawn();
  if (waveActive){"""

# ============================================================ ④ stepSim 调用新逻辑
A4_OLD = """  updateEnemies(d);
  updateBossSkills(d);            // BOSS 三技能（普通波自动空转）
  flushPendingSpawn();            // 安全点：把召唤的步兵真正放进战场"""

A4_NEW = """  updateMobSkills(d);             // v5.5 新怪：医疗兵治疗 / 精英光环 / 重装冲锋（按 dt 增量，倍速子步安全）
  updateEnemies(d);
  updateBossSkills(d);            // BOSS 三技能（普通波自动空转）
  flushPendingSpawn();            // 安全点：把召唤的步兵真正放进战场"""

# ============================================================ ⑤ 新增 updateMobSkills
A5_OLD = """function updateEnemies(dt){
  for (var i = enemies.length - 1; i >= 0; i--){"""

A5_NEW = """/* ===== v5.5 新怪技能：医疗兵 / 精英队长光环 / 重装冲锋 =====
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
      h.healT -= dt;
      if (h.healT > 0) continue;
      h.healT = 4.0;
      var healed = 0;
      for (var j = 0; j < n; j++){
        var o = enemies[j];
        if (o === h || o.hp <= 0 || o.hp >= o.maxhp) continue;
        var ox = o.x - h.x, oy = o.y - h.y;
        if (ox * ox + oy * oy > hr2) continue;
        var amt = o.maxhp * 0.08;                 // 各自的最大血量 8%，不超上限
        o.hp = Math.min(o.maxhp, o.hp + amt);
        addBeam(h.x, h.y, o.x, o.y, 'rgba(140,255,180,.9)');   // 浅绿细线
        addFloat(o.x, o.y - o.r - 6, '+' + Math.round(amt), '#8cffb4');
        healed++;
      }
      if (healed > 0) h.healFx = 0.5;
    }
  }
}
function updateEnemies(dt){
  for (var i = enemies.length - 1; i >= 0; i--){"""

# ============================================================ ⑥ 速度合成（光环/冲锋/冲刺）
A6_OLD = """    var dist = Math.hypot(dx, dy);
    var step = e.speed * e.slowF * dt;"""

A6_NEW = """    var dist = Math.hypot(dx, dy);
    /* v5.5 速度合成：基础 × 精英光环 × 冲锋/冲刺；冲锋期间免疫减速（slowF 不参与） */
    var spdF = e.auraF || 1;
    if (e.chargingT > 0) spdF *= 1.8;
    e.sprinting = !!(e.bomb && (e.done || 0) / (e.totalPath || 1) > 0.7);   // 自爆兵：70% 路程后冲刺
    if (e.sprinting) spdF *= 2.2;
    var step = e.speed * (e.chargingT > 0 ? 1 : e.slowF) * spdF * dt;"""

# ============================================================ ⑦ 到终点扣血（自爆兵 2 点）
A7_OLD = """    if (!tgt){
      hp--; flashHurt(); SFX.hurt(); enemies.splice(i, 1); updateHud();
      if (hp <= 0){ gameOver(); return; }
      continue;
    }"""

A7_NEW = """    if (!tgt){
      var baseDmg = e.bomb ? 2 : 1;                // v5.5 自爆兵：突破防线扣 2 点基地血量
      hp -= baseDmg; flashHurt(); SFX.hurt();
      if (baseDmg > 1) addFloat(e.x, e.y, '-' + baseDmg, '#ff6a3a');
      enemies.splice(i, 1); updateHud();
      if (hp <= 0){ gameOver(); return; }
      continue;
    }"""

# ============================================================ ⑧ killEnemy 双倍金币
A8_OLD = """function killEnemy(e, idx){
  var g2 = Math.round(e.gold * BUFFS.gold);"""

A8_NEW = """function killEnemy(e, idx){
  /* v5.5：精英队长掉落双倍金币 */
  var g2 = Math.round(e.gold * BUFFS.gold * (e.dblGold ? 2 : 1));"""

# ============================================================ ⑨ killEnemy 分裂（安全入队）
A9_OLD = """    SFX.combo(comboCount);
  }
  enemies.splice(idx, 1); updateHud();
}"""

A9_NEW = """    SFX.combo(comboCount);
  }
  /* v5.5 分裂虫：死亡时分裂 2 只幼体。只入队到 pendingSpawn，由主循环安全点
     （flushPendingSpawn）真正 push 进 enemies —— 严禁在遍历 enemies 时直接 push */
  if (e.split){
    pendingSpawn.push({ type: 'spawn2', x: e.x, y: e.y, wp: e.wp, n: 2 });
    addFloat(e.x, e.y - e.r - 10, '分裂！', '#c98cff');
    burst(e.x, e.y, '#c98cff', 8);
  }
  enemies.splice(idx, 1); updateHud();
}"""

# ============================================================ ⑩ waveComp 编入（第 1-4 波不变）
A10_OLD = """  if (w >= 6) add('shield', 1 + Math.floor(w * 0.38) + Math.floor(late * 0.3), 1.15);
  if (w % 10 === 0) add('boss', 1, 1.7);"""

A10_NEW = """  if (w >= 6) add('shield', 1 + Math.floor(w * 0.38) + Math.floor(late * 0.3), 1.15);
  /* —— v5.5 新怪：所有关卡都会登场（waveComp 与关卡无关，5 关通用；最短的第 1 关 10 波全覆盖）
     登场波次：医疗兵 5 / 分裂虫 6 / 自爆兵 7 / 精英队长 8 / 重装冲锋 9
     数量用「阶梯式」温和公式（每 3-5 波 +1），且不吃 late 加密项，避免后期怪海爆炸 */
  if (w >= 5)  add('healer', 1 + Math.floor((w - 5) / 3), 1.50);
  if (w >= 6)  add('splitter', 1 + Math.floor((w - 6) / 4), 1.35);
  if (w >= 7)  add('bomber', 1 + Math.floor((w - 7) / 3), 0.95);
  if (w >= 8)  add('elite', 1 + Math.floor((w - 8) / 5), 1.60);
  if (w >= 9)  add('charger', 1 + Math.floor((w - 9) / 5), 1.60);
  if (w % 10 === 0) add('boss', 1, 1.7);"""

# ============================================================ ⑪ 拖尾加长（冲刺/冲锋）
A11_OLD = """    ctx.globalAlpha = 0.28;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x - Math.cos(e.dir)*e.r*0.9, e.y - Math.sin(e.dir)*e.r*0.9, e.r*0.7*sp, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;"""

A11_NEW = """    /* v5.5：自爆兵冲刺 / 重装冲锋时拖尾加长 */
    var _tk = 0.9;
    if (e.sprinting) _tk = 2.6;
    if (e.chargingT > 0) _tk = 2.4;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x - Math.cos(e.dir)*e.r*_tk, e.y - Math.sin(e.dir)*e.r*_tk, e.r*0.7*sp, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 1;"""

# ============================================================ ⑫ 视觉特征（形状/标记）
A12_OLD = """    if (e.immuneSlow){
      ctx.strokeStyle = 'rgba(180,140,255,.9)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3.5, 0, 6.3); ctx.stroke();
    }
    ctx.restore();
    // 血条"""

A12_NEW = """    if (e.immuneSlow){
      ctx.strokeStyle = 'rgba(180,140,255,.9)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3.5, 0, 6.3); ctx.stroke();
    }
    /* —— v5.5 新怪专属造型标记（沿用渐变球体+描边，不引入任何图片资源）—— */
    if (e.heal){                                   // 医疗兵：绿色十字
      ctx.strokeStyle = '#7cffb0'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - e.r*0.62, e.y); ctx.lineTo(e.x + e.r*0.62, e.y);
      ctx.moveTo(e.x, e.y - e.r*0.62); ctx.lineTo(e.x, e.y + e.r*0.62);
      ctx.stroke();
    }
    if (e.split){                                  // 分裂虫：紫色裂纹
      ctx.strokeStyle = 'rgba(232,214,255,.92)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(e.x - e.r*0.50, e.y - e.r*0.45); ctx.lineTo(e.x + e.r*0.06, e.y - e.r*0.05);
      ctx.lineTo(e.x - e.r*0.30, e.y + e.r*0.35); ctx.moveTo(e.x + e.r*0.52, e.y + e.r*0.40);
      ctx.lineTo(e.x + e.r*0.06, e.y - e.r*0.05);
      ctx.stroke();
    }
    if (e.bomb){                                   // 自爆兵：橙红外圈闪烁（冲刺时更快更亮）
      var _bl = 0.4 + Math.abs(Math.sin(gameT * (e.sprinting ? 14 : 6))) * 0.6;
      ctx.save(); ctx.globalAlpha = _bl;
      ctx.strokeStyle = e.sprinting ? '#fff2c8' : '#ff9a3a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2.6, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    if (e.aura){                                   // 精英队长：金色外圈 + 头顶星标
      ctx.save();
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.4;
      glow('#ffd24a', 12);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4.5, 0, 6.3); ctx.stroke();
      ctx.restore();
      poly(e.x, e.y - e.r - 9, e.r * 0.34, 5, -Math.PI/2);
      ctx.fillStyle = '#ffd24a'; ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,0,.9)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (e.charge){                                 // 重装冲锋：深灰重甲环 + 冲锋时白色速度线
      ctx.strokeStyle = 'rgba(58,68,84,.95)'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.56, 0, 6.3); ctx.stroke();
      if (e.chargingT > 0){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.8;
        for (var _sk = 0; _sk < 3; _sk++){
          var _so = (_sk - 1) * e.r * 0.55;
          var _cx = Math.cos(e.dir), _sy = Math.sin(e.dir);
          ctx.beginPath();
          ctx.moveTo(e.x - _cx*e.r*1.6 - _sy*_so, e.y - _sy*e.r*1.6 + _cx*_so);
          ctx.lineTo(e.x - _cx*e.r*3.0 - _sy*_so, e.y - _sy*e.r*3.0 + _cx*_so);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
    // 血条"""

PATCHES = [
    ('①ENEMIES 表新增 6 条（5 新怪 + 分裂幼体）', A1_OLD, A1_NEW),
    ('②spawnEnemy 新增字段', A2_OLD, A2_NEW),
    ('③stepSim 安全点前置冲洗', A3_OLD, A3_NEW),
    ('④stepSim 调用 updateMobSkills', A4_OLD, A4_NEW),
    ('⑤新增 updateMobSkills 函数', A5_OLD, A5_NEW),
    ('⑥速度合成：光环/冲锋/冲刺', A6_OLD, A6_NEW),
    ('⑦到终点扣血：自爆兵 2 点', A7_OLD, A7_NEW),
    ('⑧killEnemy 双倍金币', A8_OLD, A8_NEW),
    ('⑨killEnemy 分裂入队', A9_OLD, A9_NEW),
    ('⑩waveComp 编入新怪', A10_OLD, A10_NEW),
    ('⑪draw 拖尾加长', A11_OLD, A11_NEW),
    ('⑫draw 视觉标记', A12_OLD, A12_NEW),
]

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'game.html'
    if not os.path.isabs(target):
        target = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', target)
    target = os.path.normpath(target)
    if not os.path.isfile(target):
        print('❌ 目标文件不存在: %s' % target); sys.exit(1)
    src = io.open(target, encoding='utf-8').read()

    if MARK in src:
        print('ℹ️  已应用过 v5.5 MOB PACK（幂等保护），未做任何修改: %s' % target)
        sys.exit(0)

    out = src
    for label, old, new in PATCHES:
        c = out.count(old)
        if c != 1:
            print('❌ [%s] 匹配次数 = %d（要求恰好 1 次）——未写回任何内容' % (label, c))
            sys.exit(1)
        out = out.replace(old, new, 1)
        print('  ✅ %s' % label)

    # 写回（先备份，便于回滚）
    bak = target + '.pre_mobs.bak'
    if not os.path.exists(bak):
        io.open(bak, 'w', encoding='utf-8').write(src)
        print('  📦 备份: %s' % bak)
    io.open(target, 'w', encoding='utf-8').write(out)
    print('✅ 已写入 %s（%d 处替换）' % (target, len(PATCHES)))

if __name__ == '__main__':
    main()
