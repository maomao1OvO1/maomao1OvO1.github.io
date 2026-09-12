# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 敌人词缀定义
rep("var AFFIX_POOL = [",
"""/* ===== v8.8 敌人词缀 =====
   毛毛发的方案里「敌人必须有变化，不能一套阵容到底」那一条。
   部分敌人生成时会随机带 1 个词缀（越到后期越常见），行为和应对方式都要跟着变，
   而不是单纯加血 —— 逼玩家调整塔种与站位。 */
var ENEMY_AFFIXES = [
  { key:'rage',    name:'狂暴', icon:'💢', color:'#ff5a2a', minWave:6,  chance:0.10,
    fx:'血量低于 50% 后移速 +60%', tip:'留减速塔，或提前集火点掉' },
  { key:'tough',   name:'硬化', icon:'🛡', color:'#c8a24a', minWave:8,  chance:0.12,
    fx:'受击时有 25% 概率只吃 40% 伤害', tip:'用多段/持续伤害磨，别赌单发爆发' },
  { key:'boom',    name:'死亡爆炸', icon:'💥', color:'#ffb04a', minWave:9, chance:0.12,
    fx:'死亡时原地爆炸，1.2 格内的塔被眩晕 2 秒', tip:'别把主力塔堆在它的必经之路上' },
  { key:'stealth', name:'隐匿', icon:'👻', color:'#9fd0ff', minWave:11, chance:0.10,
    fx:'周期性隐身 3 秒，隐身期间塔无法锁定它', tip:'用溅射/链式盲打，或等它现身再集火' },
  { key:'thorn',   name:'反伤', icon:'🌵', color:'#7cf5c0', minWave:13, chance:0.10,
    fx:'被击中时反噬攻击塔（该塔短暂卡顿）', tip:'别用单发高伤硬砸，分散火力' },
  { key:'regen',   name:'自愈', icon:'♻️', color:'#4fe060', minWave:15, chance:0.09,
    fx:'每秒回复 1.5% 最大血量', tip:'需要爆发或毒伤压制，拖久了打不死' }
];
function rollEnemyAffix(w){
  for (var i = 0; i < ENEMY_AFFIXES.length; i++){
    var a = ENEMY_AFFIXES[i];
    if (w < a.minWave) continue;
    var ch = Math.min(0.30, a.chance + (w - a.minWave) * 0.004);   /* 越后期越常见（封顶 30%） */
    if (Math.random() < ch) return a;
  }
  return null;
}
var AFFIX_POOL = [""", '词缀定义')

# ② 生成敌人时附加词缀
rep("    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）",
"""    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）
    /* —— v8.8 敌人词缀（BOSS 与分裂幼体不参与，避免叠加过复杂）—— */
    aff: (d.boss || d.spawnOnly) ? null : rollEnemyAffix(wave),
    hidden: false, stealthT: 4.5,                                     // 隐匿：计时切换可见性""", '生成时附加词缀')

# ③ updateEnemies：狂暴提速 / 隐匿切换 / 自愈
rep("""    if (e.dotT > 0){ e.dotT -= dt; e.hp -= e.dotD * dt; if (e.hp <= 0){ killEnemy(e, i); continue; } }""",
"""    if (e.dotT > 0){ e.dotT -= dt; e.hp -= e.dotD * dt; if (e.hp <= 0){ killEnemy(e, i); continue; } }
    /* —— v8.8 词缀：隐匿（周期性隐身）/ 自愈（每秒回血）—— */
    if (e.aff){
      if (e.aff.key === 'stealth'){
        e.stealthT -= dt;
        if (e.stealthT <= 0){ e.hidden = !e.hidden; e.stealthT = e.hidden ? 3.0 : 6.0; }
      } else if (e.aff.key === 'regen'){
        e.hp = Math.min(e.maxhp, e.hp + e.maxhp * 0.015 * dt);
      }
    }""", '词缀状态推进')
rep("""    var spdF = e.auraF || 1;""",
"""    var spdF = e.auraF || 1;
    if (e.aff && e.aff.key === 'rage' && e.hp < e.maxhp * 0.5) spdF *= 1.6;   /* v8.8 狂暴：半血后提速 */""", '狂暴提速')

# ④ 索敌跳过隐身敌人
rep("""      var e = enemies[j];
      if (towerDist(t, e) > st.range) continue;""",
"""      var e = enemies[j];
      if (e.hidden) continue;                       /* v8.8 隐匿词缀：隐身期间无法被锁定 */
      if (towerDist(t, e) > st.range) continue;""", '索敌跳过隐身')

# ⑤ hitEnemy：硬化减伤 / 反伤
rep("""  /* —— v8.1 壁垒兵：单次伤害超过其血量 25% 时减免 65%（专治「露头就秒」）—— */""",
"""  /* —— v8.8 词缀：硬化（概率减伤）/ 反伤（反噬攻击塔）—— */
  if (e.aff && e.aff.key === 'tough' && Math.random() < 0.25) dmg *= 0.4;
  if (e.aff && e.aff.key === 'thorn' && t.stunT !== undefined && t.stunT <= 0){
    t.stunT = 0.35;                               /* 反噬：该塔短暂卡顿（不是永久，避免体验过差） */
  }
  /* —— v8.1 壁垒兵：单次伤害超过其血量 25% 时减免 65%（专治「露头就秒」）—— */""", '硬化与反伤')

# ⑥ killEnemy：死亡爆炸眩晕附近的塔
rep("""function killEnemy(e, idx){
  /* v8.6 瘟疫套装：中毒而死的敌人，把毒传播给 1.5 格内的其他敌人 */""",
"""function killEnemy(e, idx){
  /* v8.8 词缀「死亡爆炸」：原地炸开，1.2 格内的塔被眩晕 2 秒 */
  if (e.aff && e.aff.key === 'boom'){
    var br = CELL * 1.2, n2 = 0;
    for (var bi = 0; bi < towers.length; bi++){
      var bt = towers[bi];
      var bdx = cx(bt.c) - e.x, bdy = cy(bt.r) - e.y;
      if (bdx * bdx + bdy * bdy <= br * br){ bt.stunT = Math.max(bt.stunT || 0, 2.0); n2++; }
    }
    addRing(e.x, e.y, '#ffb04a', br, 0.55);
    burst(e.x, e.y, '#ffb04a', 18);
    if (n2) addFloat(e.x, e.y - e.r - 16, n2 + ' 座塔被眩晕', '#ffb04a');
    shakeT = Math.max(shakeT, 0.2);
  }
  /* v8.6 瘟疫套装：中毒而死的敌人，把毒传播给 1.5 格内的其他敌人 */""", '死亡爆炸')

# ⑦ 绘制：词缀光环 + 头顶图标 + 隐身半透明
rep("""    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0);""",
"""    /* v8.8 词缀视觉：外圈彩色光环 + 头顶图标；隐身时整体半透明 */
    if (e.aff){
      ctx.save();
      ctx.globalAlpha = e.hidden ? 0.3 : 0.85;
      ctx.strokeStyle = e.aff.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5.5, 0, 6.3); ctx.stroke();
      ctx.font = 'bold ' + Math.max(11, Math.round(e.r * 1.05)) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.fillStyle = e.aff.color;
      ctx.fillText(e.aff.icon, e.x, e.y - e.r - 7);
      ctx.restore();
    }
    if (e.hidden) ctx.globalAlpha = 0.35;
    var _tex = enemySprite(e.color, e.r, e.hitFlash > 0);""", '词缀视觉')
rep("""    if (e.immuneSlow){
      ctx.strokeStyle = 'rgba(180,140,255,.9)'; ctx.lineWidth = 2.2;""",
"""    if (e.hidden) ctx.globalAlpha = 1;              /* v8.8：还原透明度（隐身只影响球体） */
    if (e.immuneSlow){
      ctx.strokeStyle = 'rgba(180,140,255,.9)'; ctx.lineWidth = 2.2;""", '还原透明度')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.8 敌人词缀补丁完成 ---')
