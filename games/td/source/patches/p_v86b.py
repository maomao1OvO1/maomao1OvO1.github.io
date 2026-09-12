# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# A-2 未解锁时点了给提示
rep("""function onSkillBtn(key){
  if (!running || paused) return;
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return;""",
"""function onSkillBtn(key){
  if (!running || paused) return;
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return;
  if (!skillUnlocked(key)){ showTip(sk.icon + ' ' + sk.name + ' 还没解锁 —— 第 ' + skillUnlockLv(key) + ' 关开始可用'); return; }""", '未解锁提示')

# A-3 技能栏：未解锁显示锁 + 末尾加「?」说明按钮
rep("""  if (skillBtns.length !== SKILLS.length){
    bar.innerHTML = '';
    skillBtns = [];
    for (var i = 0; i < SKILLS.length; i++){""",
"""  if (skillBtns.length !== SKILLS.length){
    bar.innerHTML = '';
    skillBtns = [];
    var helpBtn = document.createElement('button');
    helpBtn.className = 'btn';
    helpBtn.id = 'sk_help';
    helpBtn.style.cssText = 'padding:5px 9px;border-radius:9px;font-size:13px;font-weight:700;'
      + 'border:1px solid rgba(140,200,255,.5);background:rgba(24,44,74,.9);color:#9fd0ff;';
    helpBtn.textContent = '?';
    helpBtn.title = '主动技能说明：怎么用 / 什么时候解锁';
    helpBtn.addEventListener('click', function(ev){ ev.stopPropagation(); showSkillHelp(); });
    bar.appendChild(helpBtn);
    for (var i = 0; i < SKILLS.length; i++){""", '技能栏加说明按钮')

rep("""  for (var k = 0; k < SKILLS.length; k++){
    var el = skillBtns[k];
    if (!el) continue;
    var sk2 = SKILLS[k];
    el.textContent = sk2.icon + (sk2.t > 0 ? Math.ceil(sk2.t) + 's' : '');
    el.style.opacity = (sk2.t > 0) ? '.45' : '1';
    el.style.outline = (skillMode === sk2.key) ? '2px solid #ffd76a' : 'none';
  }""",
"""  for (var k = 0; k < SKILLS.length; k++){
    var el = skillBtns[k];
    if (!el) continue;
    var sk2 = SKILLS[k], un = skillUnlocked(sk2.key);
    el.textContent = un ? (sk2.icon + (sk2.t > 0 ? Math.ceil(sk2.t) + 's' : '')) : '🔒';
    el.style.opacity = (!un || sk2.t > 0) ? '.45' : '1';
    el.style.outline = (skillMode === sk2.key) ? '2px solid #ffd76a' : 'none';
    el.title = un ? (sk2.name + '：' + sk2.desc + '　【用法】' + skHowTo(sk2.key))
                  : (sk2.name + '：第 ' + skillUnlockLv(sk2.key) + ' 关解锁');
  }""", '技能栏未解锁显示')

# A-4 技能说明面板
rep("""/* 选择模式下点战场：找最近的敌人 / 对应的塔 */""",
"""/* 技能「怎么用」一句话说明（面板与按钮提示共用） */
function skHowTo(key){
  if (key === 'freeze')   return '点按钮直接释放（不需要选目标）';
  if (key === 'mark')     return '点按钮 → 再点战场上的一个敌人';
  if (key === 'overload') return '点按钮 → 再点一座已建好的塔';
  return '点按钮直接释放（不需要选目标）';
}
/* 技能说明面板（技能栏「?」按钮打开）—— 毛毛要求「标一下怎么用」 */
function showSkillHelp(){
  running = false; paused = true;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#9fd0ff;text-align:center;margin-bottom:4px;">⚡ 主动技能说明</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:7px;">'
    + (endless ? '无尽模式：4 个技能全部可用' : '带 🔒 的技能要打到对应关卡才解锁') + '</div>';
  el.innerHTML = h;
  SKILLS.forEach(function(sk){
    var un = skillUnlocked(sk.key);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:9px 11px;border-radius:11px;margin-bottom:6px;'
      + 'background:rgba(22,32,56,.82);border:1px solid ' + (un ? 'rgba(255,200,110,.35)' : 'rgba(120,140,170,.28)') + ';'
      + (un ? '' : 'opacity:.62;');
    box.innerHTML = '<b style="font-size:14px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
      + '<span style="float:right;font-size:11px;color:#8fb4dc;">冷却 ' + sk.cd + ' 秒</span>'
      + '<div style="font-size:11.5px;color:#c8d8ee;line-height:1.5;margin-top:3px;">' + sk.desc + '</div>'
      + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">🖐 用法：' + skHowTo(sk.key) + '</div>'
      + '<div style="font-size:11px;color:' + (un ? '#9fc4f0' : '#ff9a6a') + ';margin-top:2px;">'
      + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    el.appendChild(box);
  });
  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '✅ 知道了';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
    running = true; paused = false; last = 0;
  });
  el.appendChild(close);
  document.getElementById('buffOv').classList.remove('hidden');
}
/* 选择模式下点战场：找最近的敌人 / 对应的塔 */""", '技能说明面板')

# A-5 关卡开幕提示：本关可用技能
rep("""  /* 地图特征 */
  h += '<div style="font-size:11.5px;color:#9fc4f0;margin-top:8px;line-height:1.5;">🗺 地图：<b>' + L.name + '</b>'""",
"""  /* 本关可用的主动技能（新解锁的会标出来）—— 回应「每关增加一个技能」 */
  var skNew = [], skHave = [];
  SKILLS.forEach(function(sk){
    if (skillUnlockedAt(sk.key, idx)){
      if (skillUnlockLv(sk.key) === idx + 1) skNew.push(sk); else skHave.push(sk);
    }
  });
  h += '<div style="font-size:12.5px;font-weight:700;color:#ffd08a;margin:9px 0 5px;">⚡ 本关主动技能</div>';
  if (skNew.length){
    skNew.forEach(function(sk){
      h += '<div style="font-size:12px;color:#fff0c0;line-height:1.5;padding:6px 9px;border-radius:10px;'
        + 'background:rgba(96,66,16,.75);border:1px solid rgba(255,200,110,.5);margin-bottom:5px;">'
        + '🆕 <b>' + sk.icon + ' ' + sk.name + '</b>（冷却 ' + sk.cd + ' 秒）　' + skHowTo(sk.key)
        + '<span style="display:block;font-size:11px;color:#ffd08a;">' + sk.desc + '</span></div>';
    });
  }
  if (skHave.length){
    h += '<div style="font-size:11.5px;color:#9fc4f0;line-height:1.5;padding:0 2px;">已有：'
      + skHave.map(function(sk){ return sk.icon + ' ' + sk.name; }).join('　') + '（点技能栏「?」看用法）</div>';
  }
  if (!skNew.length && !skHave.length){
    h += '<div style="font-size:11.5px;color:#9fc4f0;">本关暂无可用技能</div>';
  }
  /* 地图特征 */
  h += '<div style="font-size:11.5px;color:#9fc4f0;margin-top:8px;line-height:1.5;">🗺 地图：<b>' + L.name + '</b>'""", '开幕提示加技能')

# ========== B. 元素套装卡 ==========
rep("""/* 技能解锁进度：第几关开始有这个技能""",
"""/* ===== v8.6 元素套装卡（构筑联动）=====
   毛毛发的方案里「让卡牌选择更有意义」那一条：集齐 3 张同元素的专属强化卡 → 激活该元素套装。
   套装是「构筑目标」：逼玩家在抽卡时主动往某个方向凑，而不是无脑拿最高稀有度。 */
var ELEM_SETS = {
  fire:    { name:'🔥 烈焰套装', desc:'火焰塔溅射半径 +30%' },
  ice:     { name:'❄️ 永冻套装', desc:'被减速的敌人承受的暴击率 +20%' },
  thunder: { name:'⚡ 雷暴套装', desc:'链弹不再衰减（每跳满额伤害）' },
  poison:  { name:'☠️ 瘟疫套装', desc:'中毒死亡的敌人把毒传播给 1.5 格内的其他敌人' },
  phys:    { name:'🔨 破军套装', desc:'物理塔对有护甲目标再 +30%' },
  support: { name:'📡 共鸣套装', desc:'辅助塔光环效果 +50%' },
  sniper:  { name:'🎯 狙击套装', desc:'暴击伤害从 2.5 倍提升到 3.2 倍' },
  mortar:  { name:'💥 轰炸套装', desc:'榴弹塔溅射半径 +30%、溅射伤害 +25%' }
};
var SET_NEED = 3;
var SET_COUNT = {};
function setOn(k){ return !!(BUFFS.sets && BUFFS.sets[k]); }
function checkElemSets(){
  for (var k in ELEM_SETS){
    if (!setOn(k) && (SET_COUNT[k] || 0) >= SET_NEED){
      BUFFS.sets[k] = 1;
      var w = ELEM_SETS[k];
      addFloat(W / 2, H * 0.36, w.name + ' 激活！', '#ffd76a');
      burst(W / 2, H * 0.36, '#ffd76a', 26);
      SFX.upgrade();
      showBanner(w.name + ' 激活');
      showTip(w.name + '：' + w.desc);
    }
  }
}
/* 统一的「获得一张强化卡」入口：应用效果 + 套装计数（抽卡 / 商店 / 契约都走这里） */
function grantCard(card){
  if (!card) return;
  card.apply();
  if (card.elKey){
    SET_COUNT[card.elKey] = (SET_COUNT[card.elKey] || 0) + 1;
    checkElemSets();
  }
}
/* 技能解锁进度：第几关开始有这个技能""", '套装系统')

# BUFFS 加 sets 字段（定义 + 两处重置）
rep("              el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },\n              tw:{} };",
    "              el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },\n              tw:{}, sets:{} };                       /* v8.6 套装激活标记 */", 'BUFFS 定义加 sets')
rep("            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },\n            tw:{} };                                  /* v7.8 清空上一局的炮塔专属强化 */",
    "            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },\n            tw:{}, sets:{} };                         /* v7.8 清空专属强化 ｜ v8.6 清空套装 */", 'BUFFS 重置加 sets', cnt=2)
rep("  wxReset();                                          /* v8.3：新一局天气回到平稳并重掷预告 */",
    "  wxReset();                                          /* v8.3：新一局天气回到平稳并重掷预告 */\n  SET_COUNT = {};                                     /* v8.6：新一局重新累计套装进度 */", '开局重置套装', cnt=2)

# 抽卡三处改走 grantCard
rep("apply:function(){ var c = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]; c.apply(); } },",
    "apply:function(){ grantCard(BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]); } },", '商店战术档案走 grantCard')
rep("      for (var pi = 0; pi < 2; pi++){ var c = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]; c.apply(); } } },",
    "      for (var pi = 0; pi < 2; pi++) grantCard(BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]); } },", '苦行契约走 grantCard')
rep("      b.apply();\n      if (tutorial) tutMark('buff');",
    "      grantCard(b);                            /* v8.6：走统一入口（含套装计数） */\n      if (tutorial) tutMark('buff');", '强化卡点击走 grantCard')

# 套装效果接入
rep("""  if (elem === 'thunder'){ var wxc = wxEff('thunderChain'); if (wxc) o.chain = (o.chain || 0) + wxc; }""",
"""  if (elem === 'thunder'){
    var wxc = wxEff('thunderChain'); if (wxc) o.chain = (o.chain || 0) + wxc;
    if (setOn('thunder')) o.chainK = 1;               /* v8.6 雷暴套装：链弹不再衰减 */
  }""", '套装-雷暴链弹')
rep("""  var au = auraBonus(t);
  var upR = (lv - 1) * (d.upRange || 0);""",
"""  var au = auraBonus(t);
  if (setOn('support')){ au = { dmg: au.dmg * 1.5, rate: au.rate * 1.5 }; }   /* v8.6 共鸣套装：光环 +50% */
  var upR = (lv - 1) * (d.upRange || 0);""", '套装-光环')
rep("""  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0) + wxCrit);   // v8.2 词条「致命」""",
"""  var setCrit = (setOn('ice') && e.slowT > 0) ? 0.20 : 0;      /* v8.6 永冻套装：被减速目标 +20% 暴击率 */
  var crit = Math.random() < (BUFFS.crit + ((res && res.critAdd) || 0) + ((tw && tw.crit) || 0) + ((af && af.crit) || 0) + wxCrit + setCrit);   // v8.2 词条「致命」""", '套装-永冻暴击')
rep("  var antiK = (def.antiArmor || 0) + ((tw && tw.antiArmor) || 0) + ((t.elem === 'phys') ? wxEff('physAntiArmor') : 0);   /* v8.3 铁潮：物理塔破甲 +50% */",
    "  var antiK = (def.antiArmor || 0) + ((tw && tw.antiArmor) || 0) + ((t.elem === 'phys') ? wxEff('physAntiArmor') : 0)\n            + ((t.elem === 'phys' && setOn('phys')) ? 0.30 : 0);   /* v8.3 铁潮 + v8.6 破军套装 */", '套装-破军破甲')
rep("  var dmg = st.dmg * armor * breakMul * antiMul * comboMul * hvMul * (crit ? 2.5 : 1) * bossMul;",
    "  var critMul = (crit && setOn('sniper')) ? 3.2 : 2.5;    /* v8.6 狙击套装：暴击 2.5 → 3.2 倍 */\n  var dmg = st.dmg * armor * breakMul * antiMul * comboMul * hvMul * (crit ? critMul : 1) * bossMul;", '套装-狙击暴击倍率')
rep("""  var spR = ((def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0)) * (1 + wxEff('splash')),   /* v8.2 词条「扩散」+ v8.3 灼热溅射范围 */
      spK = (def2.splashK || 0) * (1 + (BUFFS.splashDmg || 0));   // v7.5 连锁爆破：溅射伤害 +40%""",
"""  var setSpR = 1, setSpK = 1;
  if (t.elem === 'fire' && setOn('fire')) setSpR = 1.3;                 /* v8.6 烈焰套装 */
  if (t.elem === 'mortar' && setOn('mortar')){ setSpR = 1.3; setSpK = 1.25; }   /* v8.6 轰炸套装 */
  var spR = ((def2.splashR || 0) * sysRangeMul(t.elem) + ((af && af.splashR) || 0)) * (1 + wxEff('splash')) * setSpR,
      spK = (def2.splashK || 0) * (1 + (BUFFS.splashDmg || 0)) * setSpK;   // v7.5 连锁爆破 + v8.6 套装""", '套装-溅射')

# 套装-瘟疫传播（毒杀传播）
rep("""function killEnemy(e, idx){
  /* v5.5：精英队长掉落双倍金币 */""",
"""function killEnemy(e, idx){
  /* v8.6 瘟疫套装：中毒而死的敌人，把毒传播给 1.5 格内的其他敌人 */
  if (setOn('poison') && e.dotT > 0 && e.dotD > 0){
    for (var qi = 0; qi < enemies.length; qi++){
      var qe = enemies[qi];
      if (qe === e || qe.hp <= 0) continue;
      if (inCells(qe, e, 1.5)) applyDotTo(qe, e.dotD, Math.max(1.5, e.dotT));
    }
    addRing(e.x, e.y, '#4fe060', CELL * 1.5, 0.5);
  }
  /* v5.5：精英队长掉落双倍金币 */""", '套装-瘟疫传播')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.6 补丁完成 ---')
