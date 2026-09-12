#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v6.0 无尽模式后期平衡：造价随波次递增 + 回血削弱 + 单波怪数封顶（超出转强度）
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① 造价斜率随波次递增（4% → 最高 10%）：后期钱有去处，堆塔不再划算
sub("""function towerCost(elem){
  var base = ELEMS[elem].cost;
  return Math.round(base * (1 + towers.length * 0.040));
}""",
"""function towerCost(elem){
  var base = ELEMS[elem].cost;
  /* 每多建一座贵一点，且斜率随波次提高（4% → 最高 10%，第 30 波封顶）：
     后期钱多也堆不出塔海，只能去升级 / 精选位置 / 凑共鸣 */
  var slope = 0.040 + Math.min(0.060, Math.max(0, wave - 1) * 0.0021);
  return Math.round(base * (1 + towers.length * slope));
}""", '造价斜率递增')

# ② 回血削弱：每 5 波才回 2 血、血上限每 10 波 +5（上限 50）
sub("""      /* 无尽模式：基地血量随波次成长（每 5 波 +5，上限 60）并每波回 2 血
         —— 否则后期怪海一起压到终点，一波就能把 20 血掏空 */
      if (endless){
        var capHP = 20 + Math.floor(wave / 5) * 5;
        if (capHP > 60) capHP = 60;
        if (capHP > MAXHP) MAXHP = capHP;
        if (hp < MAXHP){
          hp = Math.min(MAXHP, hp + 2);
          addFloat(W / 2, H * 0.52, '基地修复 +2（上限 ' + MAXHP + '）', '#7cf5c0');
        }
      }""",
"""      /* 无尽模式：血上限每 10 波 +5（上限 50），且**每 5 波才回 2 血**
         —— 原来是每波回 2 血，导致后期血量长期满格、完全没有压力 */
      if (endless){
        var capHP = 20 + Math.floor(wave / 10) * 5;
        if (capHP > 50) capHP = 50;
        if (capHP > MAXHP) MAXHP = capHP;
        if (wave % 5 === 0 && hp < MAXHP){
          hp = Math.min(MAXHP, hp + 2);
          addFloat(W / 2, H * 0.52, '基地修复 +2（上限 ' + MAXHP + '）', '#7cf5c0');
        }
      }""", '回血削弱')

# ③ 单波怪数封顶：超出部分转成「单只更强」
sub("""var curGroup = null;
function startWave(){
  spawnQueue = waveComp(wave);""",
"""var curGroup = null;
var MAX_WAVE_MOBS = 120;      // 单波怪物数量上限（超出部分转成强度，避免后期「排队磨时间」）
var packMul = 1;              // 本波的血量补偿系数（由 waveComp 的封顶逻辑算出）
/* 把超出上限的数量按比例压缩，返回「强度补偿系数」（怪少了但更硬） */
function packFactor(list){
  var total = 0, i;
  for (i = 0; i < list.length; i++) total += list[i].n;
  if (total <= MAX_WAVE_MOBS) return 1;
  var k = MAX_WAVE_MOBS / total;
  var newTotal = 0;
  for (i = 0; i < list.length; i++){
    list[i].n = Math.max(1, Math.floor(list[i].n * k));   // 每类至少 1 只（BOSS 不会消失）
    newTotal += list[i].n;
  }
  return total / Math.max(1, newTotal);
}
function startWave(){
  spawnQueue = waveComp(wave);
  packMul = packFactor(spawnQueue);            // 本波：数量封顶 + 血量补偿""", '单波封顶函数')

# ④ 血量补偿生效
sub("""  var mul = (1 + (wave - 1) * 0.27 + late * late * 0.026) * lvDiff;""",
"""  var mul = (1 + (wave - 1) * 0.27 + late * late * 0.026) * lvDiff * (packMul || 1);""", '血量补偿生效')

# ⑤ 下一波预告也用封顶后的数量（副本计算，不污染本波 packMul）
sub("""  var comp = waveComp(wave + 1), parts = [], isBoss = false;""",
"""  var comp = waveComp(wave + 1), parts = [], isBoss = false;
  packFactor(comp);                            // 仅用于预告显示（在副本上算，不影响本波）""", '预告按封顶显示')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_k_endless 完成')
