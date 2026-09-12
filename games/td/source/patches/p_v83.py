# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① HUD 加天气显示
rep("""    <div class="stat" id="lvName" style="font-size:11px">地图</div>""",
"""    <div class="stat" id="lvName" style="font-size:11px">地图</div>
    <div class="stat" id="wxBox" style="font-size:11px;border:1px solid rgba(255,200,110,.35)">🌤 平稳</div>""", 'HUD 天气框')

# ② 天气系统
rep("var AFFIX_POOL = [",
"""/* ===== v8.3 元素天气（元素战场）=====
   每 3 波切换一次战场元素倾向：**有得有失**，逼玩家每 3 波重新思考布局与共鸣搭配，
   而不是「铺一种塔海吃到底」。前 3 波固定「平稳」当新手缓冲，切换前一波会在预告栏提示。 */
var WEATHERS = {
  none:    { name:'平稳', icon:'🌤', desc:'没有元素倾向，自由布局' },
  heat:    { name:'灼热', icon:'🔥', desc:'火塔伤害 +35%、溅射范围 +20%　｜　冰塔减速时长 -40%　｜　全毒伤 +20%',
             eff:{ fireDmg:0.35, splash:0.20, iceSlowT:-0.40, dot:0.20 } },
  cold:    { name:'寒潮', icon:'❄️', desc:'冰塔减速强度 +50%　｜　火塔攻速 -20%　｜　敌人移速 -10%',
             eff:{ iceSlow:0.50, fireRate:-0.20, enemySpeed:-0.10 } },
  storm:   { name:'雷暴', icon:'⚡', desc:'雷塔链弹 +2 个目标　｜　物理塔暴击率 +10%　｜　狙击射程 -15%',
             eff:{ thunderChain:2, physCrit:0.10, sniperRange:-0.15 } },
  miasma:  { name:'瘴气', icon:'☠️', desc:'全毒伤 +50%　｜　医疗兵治疗 -30%　｜　非毒塔伤害 -10%',
             eff:{ dot:0.50, healCut:0.30, nonPoisonDmg:-0.10 } },
  iron:    { name:'铁潮', icon:'🔨', desc:'物理塔对护甲加成 +50%　｜　所有敌人 +15% 护甲',
             eff:{ physAntiArmor:0.50, enemyArmor:0.15 } },
  silence: { name:'静默', icon:'🌫', desc:'辅助塔光环失效　｜　所有塔伤害 +30%',
             eff:{ auraOff:1, dmg:0.30 } }
};
var WEATHER_KEYS = ['heat', 'cold', 'storm', 'miasma', 'iron', 'silence'];
var weather = 'none', nextWeather = 'none';
function wx(){ return WEATHERS[weather] || WEATHERS.none; }
function wxEff(k){ var e = wx().eff; return (e && e[k] !== undefined) ? e[k] : 0; }
function pickWeather(){ return WEATHER_KEYS[Math.floor(Math.random() * WEATHER_KEYS.length)]; }
function wxReset(){ weather = 'none'; nextWeather = pickWeather(); }
var AFFIX_POOL = [""", '天气定义')

# ③ elemAt 纳入天气（雷暴链弹 +2）并让缓存键带天气
rep("""  var ck = elem + '#' + (lv || 1) + '#' + twStamp;      // 缓存键带上专属强化版本号""",
"""  var ck = elem + '#' + (lv || 1) + '#' + twStamp + '#' + weather;   // v8.3 缓存键再加天气（天气变了要重算）""", 'elemAt 缓存键带天气')

rep("""    if (tw.chain) o.chain = Math.round((o.chain || 0) + tw.chain);""",
"""    if (tw.chain) o.chain = Math.round((o.chain || 0) + tw.chain);""", '（占位）', 1)
rep("""  elemCache[ck] = o;
  return o;
}""",
"""  /* v8.3 雷暴天气：雷电塔链弹 +2 个目标 */
  if (elem === 'thunder'){ var wxc = wxEff('thunderChain'); if (wxc) o.chain = (o.chain || 0) + wxc; }
  elemCache[ck] = o;
  return o;
}""", 'elemAt 天气链弹')

# ④ statAt 天气乘区
rep("""  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */""",
"""  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */
  /* v8.3 元素天气：按塔的元素分别加成（有得有失） */
  var hd = wxEff('dmg'); if (hd) twD += hd;
  if (t.elem === 'fire'){ var hfd = wxEff('fireDmg'); if (hfd) twD += hfd;
                          var hfr = wxEff('fireRate'); if (hfr) twS += hfr; }
  if (t.elem === 'sniper'){ var hsr = wxEff('sniperRange'); if (hsr) twG += hsr; }
  var hnp = wxEff('nonPoisonDmg'); if (hnp && t.elem !== 'poison' && !ELEMS[t.elem].aura) twD += hnp;
  if (twD < 0.2) twD = 0.2; if (twS < 0.2) twS = 0.2; if (twG < 0.2) twG = 0.2;""", 'statAt 天气')

# ⑤ 光环失效（静默天气）
rep("""function auraBonus(t){
  var nb = [[1,0],[-1,0],[0,1],[0,-1]], d = 0, r = 0;""",
"""function auraBonus(t){
  if (wxEff('auraOff')) return { dmg:0, rate:0 };      /* v8.3 静默天气：辅助塔光环失效 */
  var nb = [[1,0],[-1,0],[0,1],[0,-1]], d = 0, r = 0;""", '静默天气光环失效')

# ⑥ spawnEnemy 天气：敌人速度 / 护甲
rep("    speed: d.speed * CELL * 1.25 * (1 + Math.min(0.55, (wave - 1) * 0.024)) * (PACT.speed || 1),   // 越到后期跑得越快 + 契约加速",
    "    speed: d.speed * CELL * 1.25 * (1 + Math.min(0.55, (wave - 1) * 0.024)) * (PACT.speed || 1) * (1 + wxEff('enemySpeed')),   // 后期更快 + 契约 + v8.3 寒潮减速", '天气敌人速度')
rep("    gold: d.gold, color: d.color, r: d.r, armor: Math.min(0.85, (d.armor || 0) + (PACT.armor || 0)),",
    "    gold: d.gold, color: d.color, r: d.r, armor: Math.min(0.85, (d.armor || 0) + (PACT.armor || 0) + wxEff('enemyArmor')),", '天气敌人护甲')

# ⑦ hitEnemy 天气：暴击 / 破甲 / 溅射 / 减速 / 毒
rep("  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0));   // v8.2 词条「致命」",
    "  var wxCrit = (t.elem === 'phys') ? wxEff('physCrit') : 0;   /* v8.3 雷暴：物理塔暴击 +10% */\n  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0) + wxCrit);   // v8.2 词条「致命」", '天气物暴')
rep("  var antiK = (def.antiArmor || 0) + ((tw && tw.antiArmor) || 0);",
    "  var antiK = (def.antiArmor || 0) + ((tw && tw.antiArmor) || 0) + ((t.elem === 'phys') ? wxEff('physAntiArmor') : 0);   /* v8.3 铁潮：物理塔破甲 +50% */", '天气物理破甲')
rep("""  var slowV = def.slow ? Math.max(0.10, def.slow / resoSlowK / ctrlK / (1 + ((tw && tw.slowK) || 0))) : 1;""",
"""  var slowV = def.slow ? Math.max(0.10, def.slow / resoSlowK / ctrlK / (1 + ((tw && tw.slowK) || 0)) / (1 + wxEff('iceSlow'))) : 1;   /* v8.3 寒潮：减速更强 */""", '天气减速强度')
rep("""            + ((tw && tw.slowT) || 0)) * (1 + ((af && af.slowT) || 0));   // v7.4 绝对零度 ｜ v7.8 专属卡 ｜ v8.2 词条「霜纹」""",
"""            + ((tw && tw.slowT) || 0)) * (1 + ((af && af.slowT) || 0)) * (1 + wxEff('iceSlowT'));   // v7.4 绝对零度 ｜ v7.8 专属 ｜ v8.2 词条 ｜ v8.3 天气""", '天气减速时长')
rep("""                         + ((tw && tw.dotFlat) || 0) ) * (1 + ((tw && tw.dotMul) || 0)) * (1 + ((af && af.dot) || 0)) : 0;""",
"""                         + ((tw && tw.dotFlat) || 0) ) * (1 + ((tw && tw.dotMul) || 0)) * (1 + ((af && af.dot) || 0)) * (1 + wxEff('dot')) : 0;   /* v8.3 天气毒伤 */""", '天气毒伤')
rep("  var spR = (def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0),   /* v8.2 词条「扩散」加半径 */",
    "  var spR = ((def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0)) * (1 + wxEff('splash')),   /* v8.2 词条「扩散」+ v8.3 灼热溅射范围 */", '天气溅射范围')

# ⑧ 医疗兵治疗受瘴气影响
rep("          o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.015);",
    "          o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.015 * (1 - wxEff('healCut')));   /* v8.3 瘴气：治疗 -30% */", '天气削减持续治疗')
rep("          var amt = worst.maxhp * 0.15;",
    "          var amt = worst.maxhp * 0.15 * (1 - wxEff('healCut'));   /* v8.3 瘴气：爆发治疗 -30% */", '天气削减爆发治疗')

# ⑨ startWave：切换天气 + 预告横幅
rep("""function startWave(){
  spawnQueue = waveComp(wave);""",
"""function startWave(){
  /* ===== v8.3 元素天气切换：前 3 波平稳（新手缓冲），此后每 3 波换一次，提前一波预告 ===== */
  if (wave <= 3){ weather = 'none'; }
  else if ((wave - 4) % 3 === 0){
    weather = nextWeather; nextWeather = pickWeather(); elemCache = {};
    var wo = wx();
    showTip(wo.icon + ' 天气变化：' + wo.name + ' —— ' + wo.desc);
    SFX.wave();
  }
  updateHud();
  spawnQueue = waveComp(wave);""", '天气切换')

# ⑩ HUD / 预告栏显示天气
rep("""  var _gEl = document.getElementById('gold'), _gTxt = goldText();""",
"""  var _wxEl = document.getElementById('wxBox');
  if (_wxEl){
    var _wo = wx();
    _wxEl.textContent = _wo.icon + ' ' + _wo.name;
    _wxEl.title = _wo.desc;
  }
  var _gEl = document.getElementById('gold'), _gTxt = goldText();""", 'HUD 天气刷新')

rep("""    + (endless ? '下一波（第 ' + (wave + 1) + ' 波）：' : '下一波（' + (wave + 1) + '/' + WAVES_TOTAL + '）：') + parts.join(' · ');""",
"""    + (endless ? '下一波（第 ' + (wave + 1) + ' 波）：' : '下一波（' + (wave + 1) + '/' + WAVES_TOTAL + '）：') + parts.join(' · ')
    + ((wave + 1 >= 4) ? ('　｜　' + WEATHERS[nextWeather].icon + ' 天气预告：' + WEATHERS[nextWeather].name) : '');   /* v8.3 提前一波预告天气 */""", '天气预告')

# ⑪ 每局重置天气
rep("  pactReset();                                        /* v8.0：新一局清空无尽契约 */",
    "  pactReset();                                        /* v8.0：新一局清空无尽契约 */\n  wxReset();                                          /* v8.3：新一局天气回到平稳并重掷预告 */", '开局重置天气', cnt=2)
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.3 天气系统补丁完成 ---')
