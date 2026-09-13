/* ══════════════════════════════════════════════════════════════════════════
 * 10-waves.js —— 波次：出兵调度、天气轮换（每 3 波一换）
 *
 * 来源：game.html 第 3779-3876 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 波次 ================= */
function waveComp(w){
  var g = [];
  var pc = (PACT && PACT.count) || 1;                                    /* v8.0 契约：敌人数量倍率 */
  function add(type, n, gap){ n = Math.round(n * pc); if (n > 0) g.push({ type:type, n:n, gap:gap }); }
  var late = Math.max(0, w - 6);
  add('normal', 5 + Math.floor(w * 1.00) + late * 2, Math.max(0.50, 0.84 - late * 0.035));
  if (w >= 2) add('fast',   2 + Math.floor(w * 0.60) + late, Math.max(0.42, 0.62 - late * 0.02));
  if (w >= 4) add('armor',  1 + Math.floor(w * 0.45) + Math.floor(late * 0.4), 1.00);
  if (w >= 6) add('shield', 1 + Math.floor(w * 0.38) + Math.floor(late * 0.3), 1.15);
  /* —— v5.5 新怪：所有关卡都会登场（waveComp 与关卡无关，5 关通用；最短的第 1 关 10 波全覆盖）
     登场波次：医疗兵 5 / 分裂虫 6 / 自爆兵 7 / 精英队长 8 / 重装冲锋 9
     数量用「阶梯式」温和公式（每 3-5 波 +1），且不吃 late 加密项，避免后期怪海爆炸 */
  if (w >= 5)  add('healer', 1 + Math.floor((w - 5) / 3), 1.50);
  if (w >= 6)  add('splitter', 1 + Math.floor((w - 6) / 4), 1.35);
  if (w >= 7)  add('bomber', 1 + Math.floor((w - 7) / 3), 0.95);
  if (w >= 8)  add('elite', 1 + Math.floor((w - 8) / 5), 1.60);
  if (w >= 9)  add('charger', 1 + Math.floor((w - 9) / 5), 1.60);
  if (w >= 12) add('thief', 1 + Math.floor((w - 12) / 6), 1.30);        /* v8.0 盗金贼：后期越来越多 */
  /* v8.1 机制轮换怪：从第 14 波起陆续登场（正式关卡只有第 5 关 18 波会碰到少量）*/
  if (w >= 14) add('phase',   1 + Math.floor((w - 14) / 5), 1.45);
  if (w >= 16) add('bulwark', 1 + Math.floor((w - 16) / 5), 1.70);
  if (w >= 18) add('airdrop', 1 + Math.floor((w - 18) / 6), 1.50);
  /* v8.0：每 20 波双 BOSS（每 10 波单 BOSS 保留）；契约「悬赏」会把频率提前到每 8 波 */
  var bossN = (w % 20 === 0) ? 2 : 1;
  if (w % ((PACT && PACT.bossEvery) || 10) === 0) add('boss', bossN, 1.7);
  return g;
}
/* 当前正在生成的怪群配置（waveComp 算出后交给出怪逻辑消费）*/
var curGroup = null;
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
/* 开始下一波：按波次切天气、推算本波怪物构成与强度补偿、重置连杀与出怪队列（点「开始」或上一波清完时调用）*/
function startWave(){
  /* ===== v8.3 元素天气切换：前 3 波平稳（新手缓冲），此后每 3 波换一次，提前一波预告 ===== */
  var _wlock = dailyWeatherLock || ((typeof WX_LOCK !== 'undefined' && WX_LOCK) ? WX_LOCK : null);
  if (_wlock){ weather = _wlock; }
  else if (wave <= 3){ weather = 'none'; }
  else if ((wave - 4) % 3 === 0){
    weather = nextWeather; nextWeather = pickWeather(); elemCache = {};
    var wo = wx();
    showTip(wo.icon + ' 天气变化：' + wo.name + ' —— ' + wo.desc);
    SFX.wave();
  }
  updateHud();
  spawnQueue = waveComp(wave);
  packMul = packFactor(spawnQueue);            // 本波：数量封顶 + 血量补偿
  waveActive = true; spawnTimer = 0;
  document.getElementById('wave').textContent = wave;
  showBanner('第 ' + wave + ' 波');
  waveIntroTips(wave);        /* v9.14：新敌人 / 新机制改在这里飘一行小字（不再每关弹开局弹层） */
  SFX.wave();
  if (BUFFS.regen > 0){                                       // v7.5 满血时转成护盾（永远有用，不再"看起来没用"）
    if (hp < MAXHP){
      hp = Math.min(MAXHP, hp + BUFFS.regen);
      addFloat(W / 2, H * 0.5, '修复 +' + BUFFS.regen, '#7cf5c0');
    } else {
      BUFFS.shieldHP = (BUFFS.shieldHP || 0) + BUFFS.regen;
      addFloat(W / 2, H * 0.5, '满血 → 护盾 +' + BUFFS.regen, '#8fe4ff');
    }
    updateHud();
  }
  bgmAdapt();          // v6.6：每波开始按波次/血量调整音乐速度与音量
  if (endless && wave % 10 === 0){            // 无尽模式每 10 波：里程碑音
    chord([392, 523, 659, 784], 0.5, 0.05, 'triangle');
    addFloat(W / 2, H * 0.4, '♾ 第 ' + wave + ' 波', '#8ff0ff');
  }
  updateWaveInfo();
}
/* 下一波预告：把 waveComp(wave+1) 翻成中文名单 */
function updateWaveInfo(){
  var box = document.getElementById('waveInfo');
  if (!box) return;
  if (!endless && wave >= WAVES_TOTAL){ box.textContent = '最后一波 · 坚持住！'; return; }
  var comp = waveComp(wave + 1), parts = [], isBoss = false;
  packFactor(comp);                            // 仅用于预告显示（在副本上算，不影响本波）
  for (var i = 0; i < comp.length; i++){
    var g = comp[i], d = ENEMIES[g.type];
    parts.push((d ? d.name : g.type) + '×' + g.n);
    if (g.type === 'boss') isBoss = true;
  }
  box.textContent = (isBoss ? '⚠️ BOSS 波 · ' : '')
    + (endless ? '下一波（第 ' + (wave + 1) + ' 波）：' : '下一波（' + (wave + 1) + '/' + WAVES_TOTAL + '）：') + parts.join(' · ')
    + ((wave + 1 >= 4) ? ('　｜　' + WEATHERS[nextWeather].icon + ' 天气预告：' + WEATHERS[nextWeather].name) : '');   /* v8.3 提前一波预告天气 */
}

