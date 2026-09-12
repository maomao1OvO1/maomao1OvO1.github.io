# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① HUD：单个「冰冻」按钮 → 技能栏容器
rep("""    <button id="skillBtn" style="padding:6px 12px;border-radius:9px;border:1px solid rgba(255,180,90,.5);background:rgba(70,45,20,.9);color:#ffd08a;font-size:14px;font-weight:700;">❄️ 冰冻</button>""",
"""    <span id="skillBar" style="display:flex;gap:4px;"></span>""", 'HUD 技能栏容器')

# ② 技能系统：4 个主动技能 + 目标选择
rep("var SKILL = { cd: 0, max: 26 };",
"""/* ===== v8.5 主动技能扩展 =====
   毛毛发的方案里「让玩家有事可做」那一条：后期不该只是看塔打。
   4 个技能各有独立冷却；需要指定目标的技能会先进入「选择模式」，再点战场上的敌人/塔生效。 */
var SKILLS = [
  { key:'freeze',   icon:'❄️', name:'冰冻', cd:26, need:'none',  t:0,
    desc:'全屏冻结：所有敌人减速 92% 持续 3.2 秒' },
  { key:'mark',     icon:'🎯', name:'标记', cd:18, need:'enemy', t:0,
    desc:'标记一个敌人 5 秒：所有塔优先集火它（点敌人释放）' },
  { key:'overload', icon:'⚡', name:'过载', cd:22, need:'tower', t:0,
    desc:'指定一座塔 5 秒内攻速 ×2.5、伤害 ×1.5，结束后眩晕 3 秒（点塔释放）' },
  { key:'repair',   icon:'🔧', name:'维修', cd:30, need:'none',  t:0,
    desc:'立刻回 3 点基地血，并清除所有塔的眩晕' }
];
var skillMode = null;                       /* 正在等待选目标：'mark' | 'overload' | null */
function skillByKey(k){ for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].key === k) return SKILLS[i]; return null; }
function skillReady(k){ var sk = skillByKey(k); return !!sk && sk.t <= 0; }
function skillTick(dt){
  for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].t > 0) SKILLS[i].t -= dt;
  for (var j = 0; j < towers.length; j++){
    var t = towers[j];
    if (t.overT > 0){ t.overT -= dt; if (t.overT <= 0){ t.stunT = 3.0; addFloat(cx(t.c), cy(t.r) - CELL * 0.4, '过载结束 · 眩晕', '#ff9a6a'); } }
    if (t.stunT > 0) t.stunT -= dt;
  }
  for (var m = 0; m < enemies.length; m++) if (enemies[m].markT > 0) enemies[m].markT -= dt;
}
function skillResetAll(){ for (var i = 0; i < SKILLS.length; i++) SKILLS[i].t = 0; skillMode = null; }
function renderSkillBar(){
  var bar = document.getElementById('skillBar');
  if (!bar) return;
  if (bar.children.length !== SKILLS.length){
    bar.innerHTML = '';
    for (var i = 0; i < SKILLS.length; i++){
      (function(sk){
        var b = document.createElement('button');
        b.className = 'btn';
        b.id = 'sk_' + sk.key;
        b.style.cssText = 'padding:5px 9px;border-radius:9px;font-size:13px;font-weight:700;'
          + 'border:1px solid rgba(255,180,90,.45);background:rgba(70,45,20,.9);color:#ffd08a;';
        b.title = sk.name + '：' + sk.desc;
        b.addEventListener('click', function(ev){ ev.stopPropagation(); onSkillBtn(sk.key); });
        bar.appendChild(b);
      })(SKILLS[i]);
    }
  }
  for (var k = 0; k < SKILLS.length; k++){
    var el = document.getElementById('sk_' + SKILLS[k].key);
    if (!el) continue;
    var sk2 = SKILLS[k];
    el.textContent = sk2.icon + (sk2.t > 0 ? Math.ceil(sk2.t) + 's' : '');
    el.style.opacity = (sk2.t > 0) ? '.45' : '1';
    el.style.outline = (skillMode === sk2.key) ? '2px solid #ffd76a' : 'none';
  }
}
function onSkillBtn(key){
  if (!running || paused) return;
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return;
  if (sk.need !== 'none'){
    skillMode = (skillMode === key) ? null : key;
    showTip(skillMode ? (sk.desc) : '已取消选择');
    renderSkillBar();
    return;
  }
  releaseSkill(key, null);
}
function releaseSkill(key, target){
  var sk = skillByKey(key);
  if (!sk || sk.t > 0) return false;
  if (key === 'freeze'){
    for (var i = 0; i < enemies.length; i++){
      var e = enemies[i];
      e.slowF = 0.08; e.slowT = 3.2;
      addFloat(e.x, e.y - e.r, '冻结', '#8ff0ff');
    }
    burst(W / 2, H / 2, '#8ff0ff', 40); shakeT = 0.35;
    SFX.freeze(); showBanner('全屏冻结！');
  } else if (key === 'mark'){
    if (!target) return false;
    target.markT = 5.0;
    addRing(target.x, target.y, '#ffd76a', CELL * 0.9, 0.6);
    addFloat(target.x, target.y - target.r - 8, '已标记 · 集火 5 秒', '#ffd76a');
    SFX.upgrade(); showTip('已标记该敌人：所有塔优先打它');
  } else if (key === 'overload'){
    if (!target) return false;
    target.overT = 5.0; target.stunT = 0;
    addRing(cx(target.c), cy(target.r), '#ffd76a', CELL * 0.8, 0.6);
    addFloat(cx(target.c), cy(target.r) - CELL * 0.5, '过载 · 攻速×2.5 伤害×1.5', '#ffd76a');
    SFX.upgrade(); showTip('过载中：5 秒后该塔会眩晕 3 秒');
  } else if (key === 'repair'){
    hp = Math.min(MAXHP, hp + 3);
    for (var j = 0; j < towers.length; j++) towers[j].stunT = 0;
    addFloat(W / 2, H * 0.45, '基地维修 +3 ｜ 全塔解除眩晕', '#7cf5c0');
    SFX.upgrade(); showTip('紧急维修完成');
  }
  sk.t = sk.cd;
  skillMode = null;
  renderSkillBar(); updateHud();
  return true;
}
/* 选择模式下点战场：找最近的敌人 / 对应的塔 */
function pickEnemyAt(px, py, maxPx){
  var best = null, bd = (maxPx || 46) * (maxPx || 46);
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.hp <= 0) continue;
    var dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
    if (d2 <= bd + e.r * e.r){ bd = d2; best = e; }
  }
  return best;
}""", '技能系统')

# ③ 主循环：推进技能状态
rep("  if (SKILL.cd > 0){ SKILL.cd -= dt; var sb = document.getElementById('skillBtn'); if (sb) sb.textContent = SKILL.cd > 0 ? ('❄️ ' + Math.ceil(SKILL.cd) + 's') : '❄️ 冰冻'; }",
    "  skillTick(dt);          /* v8.5：技能冷却 / 过载 / 眩晕 / 标记计时 */", '主循环技能推进')

# ④ 开局重置
rep("  comboCount = 0; comboT = 0; SKILL.cd = 0; coinFly = []; shakeT = 0;",
    "  comboCount = 0; comboT = 0; skillResetAll(); coinFly = []; shakeT = 0;", '开局重置技能', cnt=2)

# ⑤ 技能按钮绑定（旧的单个按钮 → 技能栏）
rep("""  on('skillBtn', function(){
    if (!running || paused || SKILL.cd > 0) return;
    SKILL.cd = SKILL.max;
    for (var i = 0; i < enemies.length; i++){
      var e = enemies[i];
      e.slowF = 0.08; e.slowT = 3.2;
      addFloat(e.x, e.y - e.r, '冻结', '#8ff0ff');
    }
    burst(W/2, H/2, '#8ff0ff', 40);
    shakeT = 0.35;
    SFX.freeze();
    showBanner('全屏冻结！');
  });""",
"""  renderSkillBar();          /* v8.5：技能栏（4 个主动技能，各自冷却） */""", '技能按钮绑定')

# ⑥ 战场点击：优先处理技能的目标选择
rep("""cv.addEventListener('pointerdown', function(ev){
  if (!running) return;
  var rect = cv.getBoundingClientRect();
  var px = ev.clientX - rect.left, py = ev.clientY - rect.top;
  var c = Math.floor((px - OX) / CELL), r = Math.floor((py - OY) / CELL);""",
"""cv.addEventListener('pointerdown', function(ev){
  if (!running) return;
  var rect = cv.getBoundingClientRect();
  var px = ev.clientX - rect.left, py = ev.clientY - rect.top;
  /* v8.5：技能目标选择模式（点敌人 / 点塔），优先于建塔与查看 */
  if (skillMode === 'mark'){
    var tgt = pickEnemyAt(px, py, 52);
    if (tgt) releaseSkill('mark', tgt);
    else showTip('没点到敌人 —— 再点一次它，或点技能按钮取消');
    return;
  }
  if (skillMode === 'overload'){
    var c0 = Math.floor((px - OX) / CELL), r0 = Math.floor((py - OY) / CELL);
    var t0 = towerAt(c0, r0);
    if (t0) releaseSkill('overload', t0);
    else showTip('没点到塔 —— 点一座已建好的塔，或点技能按钮取消');
    return;
  }
  var c = Math.floor((px - OX) / CELL), r = Math.floor((py - OY) / CELL);""", '战场点击技能目标')

# ⑦ 索敌：被标记的敌人优先（狙击的高价值优先保留在第一顺位）
rep("""      var prog = (e.done || 0) * 1e6 - e.hp;
      if (def.highValue && (e.heal || e.aura || e.boss)){""",
"""      var prog = (e.done || 0) * 1e6 - e.hp;
      if (e.markT > 0) prog += 1e12;      /* v8.5：被「标记」的敌人绝对优先（所有塔集火） */
      if (def.highValue && (e.heal || e.aura || e.boss)){""", '标记优先索敌')

# ⑧ 过载 / 眩晕 对塔数值的影响
rep("""  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */""",
"""  if (sp === 'dmg')       twD *= 1.40;      /* 精通「强化弹头」：伤害 +40% */
  else if (sp === 'rate') twS *= 1.35;      /* 精通「超载循环」：攻速 +35% */
  /* v8.5 主动技能：过载（攻速×2.5、伤害×1.5）/ 眩晕（完全停火） */
  if (t.overT > 0){ twD *= 1.5; twS *= 2.5; }
  if (t.stunT > 0){ return { dmg: d.dmg * lvMul * resoK * BUFFS.dmg * elK * twD, range: d.range, rate: 1e9 }; }""", '过载与眩晕')

# ⑨ HUD 刷新技能栏
rep("""  var _wxEl = document.getElementById('wxBox');""",
"""  renderSkillBar();          /* v8.5：技能栏冷却/选择态同步 */
  var _wxEl = document.getElementById('wxBox');""", 'HUD 刷技能栏')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.5 主动技能补丁完成 ---')
