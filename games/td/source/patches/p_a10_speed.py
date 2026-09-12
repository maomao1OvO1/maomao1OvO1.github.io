#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v5.3 无尽模式倍率：1/2/5/10/100x（子步推进保证判定不失真）
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 倍速档位 + 子步推进：把主循环的"世界更新"抽成 stepSim(d)，高倍速用多个子步跑
sub("""  if (running && !paused && !menuPause){
    gameT += dt;
    if (waveActive){
      if (curGroup){
        spawnTimer -= dt;
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
        var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔
        addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');
        updateHud();
        if (!endless && wave >= WAVES_TOTAL){ levelClear(); return; }   // 无尽模式永不结算，继续下一波
        showBuffChoices(); return;
      }
    } else {
      waveBreak -= dt;
      if (waveBreak <= 0){ wave++; startWave(); }
    }
    updateEnemies(dt);
    updateBossSkills(dt);            // BOSS 三技能（普通波自动空转）
    flushPendingSpawn();             // 安全点：把召唤的步兵真正放进战场
    if (running) updateTowers(dt);
    updateHud();
  }""",
"""  if (running && !paused && !menuPause){
    var simSteps = speedSteps();          // 高倍速拆成多个子步，避免「一帧跨过塔的射程」
    var simSub = dt / simSteps;
    for (var si = 0; si < simSteps; si++){
      gameT += simSub;
      stepSim(simSub);
      if (!running || paused || menuPause) break;   // 波次结算 / 防线失守等中断
    }
    updateHud();
  }""", '主循环改子步推进')

# ② 新增 stepSim / speedSteps（放在 frame 之前）
sub("""var speedMul = 1;             // 倍速：1 = 正常，2 = 2 倍速（#speedBtn 切换）""",
"""var speedMul = 1;             // 倍速档位：#speedBtn 切换（普通关卡 1/2，无尽模式 1/2/5/10/100）
/* 倍速档位表：无尽模式后期怪海太磨人，给到 5/10/100 倍快进 */
var SPEED_LIST_NORMAL = [1, 2];
var SPEED_LIST_ENDLESS = [1, 2, 5, 10, 100];
function speedSteps(){
  if (speedMul <= 2) return Math.max(1, Math.round(speedMul));
  if (speedMul <= 5) return 5;
  if (speedMul <= 10) return 10;
  return 20;                    // 100x：20 个子步 × 5 倍，保证塔照常开火、怪不会瞬移穿过射程
}
function updateSpeedBtn(){
  var sb = document.getElementById('speedBtn');
  if (sb) sb.textContent = '⏩ ' + speedMul + 'x';
}
/* 一「子步」的世界更新：波次生成 + 敌人 + BOSS 技能 + 塔开火 */
function stepSim(d){
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
      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;   // 后期收入封顶，避免钱多到无脑堆塔
      addFloat(W / 2, H * 0.45, '+' + bonus + ' 波次奖励', '#ffd76a');
      if (!endless && wave >= WAVES_TOTAL){ levelClear(); return; }   // 无尽模式永不结算
      showBuffChoices(); return;
    }
  } else {
    waveBreak -= d;
    if (waveBreak <= 0){ wave++; startWave(); }
  }
  updateEnemies(d);
  updateBossSkills(d);            // BOSS 三技能（普通波自动空转）
  flushPendingSpawn();            // 安全点：把召唤的步兵真正放进战场
  if (running) updateTowers(d);
}""", 'speedSteps + stepSim')

# ③ 按钮循环档位（无尽模式多档）
sub("""  on('speedBtn', function(){
    speedMul = (speedMul === 2) ? 1 : 2;
    var sb = document.getElementById('speedBtn');
    if (sb) sb.textContent = (speedMul === 2) ? '⏩ 2x' : '⏩ 1x';
    last = 0;                                  // 清掉上一帧时间戳，避免切换瞬间 dt 跳变
    showTip(speedMul === 2 ? '⏩ 2 倍速' : '⏩ 1 倍速');
    SFX.click();
  });""",
"""  on('speedBtn', function(){
    var list = endless ? SPEED_LIST_ENDLESS : SPEED_LIST_NORMAL;
    var idx = list.indexOf(speedMul);
    if (idx < 0) idx = 0;
    speedMul = list[(idx + 1) % list.length];
    updateSpeedBtn();
    last = 0;                                  // 清掉上一帧时间戳，避免切换瞬间 dt 跳变
    showTip(speedMul >= 5 ? ('⏩ ' + speedMul + ' 倍速（无尽快进）') : ('⏩ ' + speedMul + ' 倍速'));
    SFX.click();
  });""", '按钮循环档位')

# ④ 进关卡/退出时把倍速重置回 1x（避免带着 100x 进普通关卡）
sub("""  hideSel();
  document.getElementById('lvName').textContent = LEVELS[i].name;""",
"""  hideSel();
  speedMul = 1; updateSpeedBtn();      // 每次开新关卡回到 1x
  document.getElementById('lvName').textContent = LEVELS[i].name;""", 'startLevel 重置倍速')

# ⑤ 进入无尽模式时把档位提示出来
sub("""  endless = true;""",
"""  endless = true;
  speedMul = 1; updateSpeedBtn();      // 无尽模式从 1x 起步，点按钮可切 2/5/10/100x""", '无尽模式倍速提示')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_a10_speed 完成')
