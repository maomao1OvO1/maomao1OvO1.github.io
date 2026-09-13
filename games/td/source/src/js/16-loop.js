/* ══════════════════════════════════════════════════════════════════════════
 * 16-loop.js —— 主循环：frame() 每帧的推进与调度
 *
 * 来源：game.html 第 5792-5968 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 主循环 ================= */
var last = 0, running = false, paused = false, gameT = 0;
var fpsTxt = '', fpsAcc = 0, fpsN = 0;   // FPS 自检（右下角小字）
var speedMul = 1;             // 倍速档位：#speedBtn 切换（普通关卡 1/2，无尽模式 1/2/5/10/100）
/* 倍速档位表：无尽模式后期怪海太磨人，给到 5/10/100 倍快进 */
var SPEED_LIST_NORMAL = [1, 2];
/* 无尽模式的倍速档位：1/2/5/10/100（普通关卡见 SPEED_LIST_NORMAL，只有 1/2）*/
var SPEED_LIST_ENDLESS = [1, 2, 5, 10, 100];
/* 倍速换算成每帧子步数：倍速越高拆得越细，保证炮塔照常开火、敌人不会瞬移穿过射程 */
function speedSteps(){
  if (speedMul <= 2) return Math.max(1, Math.round(speedMul));
  if (speedMul <= 5) return 5;
  if (speedMul <= 10) return 10;
  return 20;                    // 100x：20 个子步 × 5 倍，保证塔照常开火、怪不会瞬移穿过射程
}
/* 同步倍速按钮上的文案（如 ⏩ 5x）*/
function updateSpeedBtn(){
  var sb = document.getElementById('speedBtn');
  if (sb) sb.textContent = '⏩ ' + speedMul + 'x';
}
/* 一「子步」的世界更新：波次生成 + 敌人 + BOSS 技能 + 塔开火 */
function stepSim(d){
  /* v5.5 安全点前置：上一子步 updateTowers（塔击杀分裂虫）入队的怪在这里补进战场。
     必须放在波次判定之前，否则「最后一只怪是分裂虫」时波次会提前结束、幼体被吞掉 */
  flushPendingSpawn();
  if (waveActive){
    if (curGroup){
      spawnTimer -= d;
      if (spawnTimer <= 0){
        spawnEnemy(curGroup.type);
        curGroup.n--;
        spawnTimer = curGroup.gap * (0.88 + Math.random() * 0.28);
        if (curGroup.n <= 0){ curGroup = null; spawnTimer = spawnQueue.length ? 1.8 : 0; }
      }
    } else if (spawnQueue.length){
      curGroup = spawnQueue.shift();
      spawnTimer = 0.5;
    } else if (enemies.length === 0){
      waveActive = false; waveBreak = 2.2;
      var bonus = 22 + Math.min(70, wave * 5); goldAdd(bonus);
      if (BUFFS.interest > 0){                                   // v7.4 金库利息
        var it = Math.round(gold * BUFFS.interest);
        if (it > 0){ goldAdd(it); addFloat(W / 2, H * 0.55, '利息 +' + it, '#ffd76a'); }
      }   // 后期收入封顶，避免钱多到无脑堆塔
      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');
      /* ==== TUTORIAL_PATCH_V1：教学关容错 —— 每波结束基地修复 +5（仅教学关；正式关卡 / 无尽模式不走这里）==== */
      if (tutorial && hp > 0 && hp < MAXHP){
        hp = Math.min(MAXHP, hp + 5);
        addFloat(W / 2, H * 0.60, '教学补给：基地修复 +5', '#7cf5c0');
      }
      /* ===== v8.1 维护费（无尽专属，温和版）=====
         塔数 × 等级总和 × 3：逼玩家在「铺塔海」与「升级精品」之间取舍。
         正式关卡不启用（避免影响已校准的 5 关平衡）。 */
      if (endless && towers.length){
        var lvSum = 0;
        for (var ti3 = 0; ti3 < towers.length; ti3++) lvSum += towers[ti3].lv;
        var upkeep = lvSum * 3;
        if (upkeep > 0){
          goldSub(upkeep);
          addFloat(W / 2, H * 0.58, '维护费 -' + upkeep + '（' + towers.length + ' 塔 · 共 ' + lvSum + ' 级）', '#ff9a6a');
        }
      }
      /* v8.21 共鸣裂隙：无尽模式每 15 波长出一个（最多 3 个） */
      if (endless && wave > 0 && wave % 15 === 0) spawnRift();
      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）
      /* 无尽模式：血上限每 10 波 +5（上限 50），且**每 5 波才回 2 血**
         —— 原来是每波回 2 血，导致后期血量长期满格、完全没有压力 */
      if (endless){
        var capHP = 20 + Math.floor(wave / 10) * 5;
        if (capHP > 50) capHP = 50;
        if (capHP > MAXHP) MAXHP = capHP;
        if (wave % 5 === 0 && hp < MAXHP){
          hp = Math.min(MAXHP, hp + 2);
          addFloat(W / 2, H * 0.52, '基地修复 +2（上限 ' + MAXHP + '）', '#7cf5c0');
        }
      }
      if (!endless && wave >= WAVES_TOTAL){
        /* TUTORIAL_PATCH_V1：教学关走专属结算（不写 prog.unlocked / best / stars、不弹选关流程）*/
        if (tutorial){ tutorialClear(); return; }
        levelClear(); return;
      }   // 无尽模式永不结算
      addDraftTools();          /* v8.7：每过 5 波补 1 次「换一批」 */
      /* v8.0 无尽：每 5 波先弹「无尽契约」（三选一，代价与收益并存），选完接着选强化卡 */
      if (endless && wave % 5 === 0){ showPactChoices(); return; }
      showBuffChoices(); return;
    }
  } else {
    waveBreak -= d;
    if (waveBreak <= 0){ wave++; startWave(); }
  }
  updateMobSkills(d);             // v5.5 新怪：医疗兵治疗 / 精英光环 / 重装冲锋（按 dt 增量，倍速子步安全）
  updateEnemies(d);
  updateBossSkills(d);            // BOSS 三技能（普通波自动空转）
  flushPendingSpawn();            // 安全点：把召唤的步兵真正放进战场
  if (running) updateTowers(d);
}
var menuPause = false;        // 打开建塔/升级面板时冻结战场（怪不动）
/* 刷新塔面板上「全额退款」按钮的剩余秒数与金额（建塔 5 秒悔棋窗口内显示）*/
function syncRefundBtn(){
  // 悔棋按钮上的倒计时刷新（只在塔面板打开且按钮仍显示时执行）
  var t = sel._tower, b = (t && sel._refundShown) ? document.getElementById('refundBtn') : null;
  if (!b) return;
  if (!(t.fresh > 0)){ b.style.display = 'none'; sel._refundShown = false; return; }
  b.textContent = '↩ 全额退款（' + Math.ceil(t.fresh) + ' 秒） +' + ELEMS[t.elem].cost;
}
/* 主循环（每帧由 requestAnimationFrame 调用）：算帧间隔、按倍速跑若干子步的 stepSim，再绘制与刷新 HUD */
function frame(now){
  requestAnimationFrame(frame);
  if (!last) last = now;
  var raw = Math.min((now - last) / 1000, 0.05);
  var dt = raw * speedMul;                        // 2 倍速：整体时间缩放
  if (!running || paused || menuPause) dt = raw;  // 暂停/面板冻结：战场不推进，特效也不加速
  last = now;
  frameDt = dt;   // 真实帧间隔交给 draw()：120Hz 屏上建造弹出/开炮闪光/出生弹出不再快一倍
  /* 倍速越高，每帧允许的音效越少：100x 时一帧跑 20 子步，不限流会有几十个音效同时爆响 */
  sfxBudget = speedMul >= 20 ? 2 : (speedMul >= 5 ? 4 : 10);
  if (running && !paused && !menuPause){
    var simSteps = speedSteps();          // 高倍速拆成多个子步，避免「一帧跨过塔的射程」
    var simSub = dt / simSteps;
    for (var si = 0; si < simSteps; si++){
      gameT += simSub;
      stepSim(simSub);
      if (!running || paused || menuPause) break;   // 波次结算 / 防线失守等中断
    }
    updateHud();
  }
  // 建塔悔棋窗口倒计时（面板打开时也照常走秒；暂停时才冻结，保证不会永远不减）
  if (running && !paused){
    for (var fq = 0; fq < towers.length; fq++){
      if (towers[fq].fresh > 0){
        towers[fq].fresh -= dt;
        if (towers[fq].fresh < 0) towers[fq].fresh = 0;
      }
    }
    if (sel._refundShown) syncRefundBtn();
  }
  // 特效
  for (var i = beams.length - 1; i >= 0; i--){ beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }
  for (var f = floats.length - 1; f >= 0; f--){ floats[f].life -= dt; if (floats[f].life <= 0) floats.splice(f, 1); }
  for (var p = parts.length - 1; p >= 0; p--){
    var pt = parts[p];
    pt.life -= dt;
    if (pt.life <= 0){ parts.splice(p, 1); continue; }
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.94; pt.vy *= 0.94;
  }
  /* TOWERS_V6_PATCH：命中圈按 dt 递减（与 beams/floats/parts 同一套）*/
  for (var rg = rings.length - 1; rg >= 0; rg--){
    rings[rg].life -= dt;
    if (rings[rg].life <= 0) rings.splice(rg, 1);
  }
  if (tutorial) tutTick();       /* TUTORIAL_PATCH_V1：教学分步引导判定（每帧一次；暂停 / 面板冻结时也照常判定）*/
  if (bannerT > 0) bannerT -= dt;
  if (hurtT > 0) hurtT -= dt;
  if (comboT > 0){ comboT -= dt; if (comboT <= 0) comboCount = 0; }
  if (shakeT > 0) shakeT -= dt;
  pvT += dt;   // 射程圈预览计时：面板打开时 gameT 冻结，脉冲/虚线流动仍要继续
  skillTick(dt);          /* v8.5：技能冷却 / 过载 / 眩晕 / 标记计时 */
  musicTick(raw);   // v6.4 背景音乐（真实时间驱动，不随倍速加速）
  achTick += raw; if (achTick >= 2){ achTick = 0; checkAch(); }   /* v8.21 成就判定（每 2 秒一次，成本可忽略） */
  for (var cf = coinFly.length - 1; cf >= 0; cf--){
    var c = coinFly[cf];
    c.t += dt * 2.6;
    if (c.t >= 1){ coinFly.splice(cf, 1); continue; }
  }
  fpsAcc += raw; fpsN++;
  if (fpsAcc >= 0.5){ fpsTxt = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
  if (tipT > 0){
    tipT -= dt;
    if (tipT <= 0 && HINT_ON){
      var te = document.getElementById('tip');
      te.style.color = '#8fb4dc';
      te.textContent = '点空地建塔 · 点塔升级/出售 · 相邻不同元素会共鸣';
    }
  }
  draw();
}

