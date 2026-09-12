#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.5 质量修复：修复无人机满血转护盾 + 护盾抵挡 + 体系加成缓存（去 O(n²)）+ elemAt 缓存
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)

# ① BUFFS 加护盾字段（两处）
old_b = "costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0,"
new_b = "costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0, shieldHP:0,"
c = s.count(old_b)
if c < 1: print('❌ BUFFS 字段未找到'); sys.exit(1)
s = s.replace(old_b, new_b); hits.append('BUFFS 护盾字段 ×%d' % c)

# ② 修复无人机：满血转护盾
sub("""  if (BUFFS.regen > 0 && hp < MAXHP){                          // v7.4 修复无人机
    hp = Math.min(MAXHP, hp + BUFFS.regen);
    addFloat(W / 2, H * 0.5, '修复 +' + BUFFS.regen, '#7cf5c0');
  }""",
"""  if (BUFFS.regen > 0){                                       // v7.5 满血时转成护盾（永远有用，不再"看起来没用"）
    if (hp < MAXHP){
      hp = Math.min(MAXHP, hp + BUFFS.regen);
      addFloat(W / 2, H * 0.5, '修复 +' + BUFFS.regen, '#7cf5c0');
    } else {
      BUFFS.shieldHP = (BUFFS.shieldHP || 0) + BUFFS.regen;
      addFloat(W / 2, H * 0.5, '满血 → 护盾 +' + BUFFS.regen, '#8fe4ff');
    }
    updateHud();
  }""", '修复无人机满血转护盾')

# ③ 敌人到基地：护盾先挡（支持自爆兵 2 点，可部分抵挡）
sub("""    if (!tgt){
      var baseDmg = e.bomb ? 2 : 1;                // v5.5 自爆兵：突破防线扣 2 点基地血量
      hp -= baseDmg; flashHurt(); SFX.hurt();
      if (baseDmg > 1) addFloat(e.x, e.y, '-' + baseDmg, '#ff6a3a');
      enemies.splice(i, 1); updateHud();
      if (hp <= 0){ gameOver(); return; }""",
"""    if (!tgt){
      var baseDmg = e.bomb ? 2 : 1;                // v5.5 自爆兵：突破防线扣 2 点基地血量
      var _sh = BUFFS.shieldHP || 0;
      if (_sh > 0){                                // v7.5 护盾先抵挡（可部分抵挡）
        var _used = Math.min(_sh, baseDmg);
        BUFFS.shieldHP = _sh - _used;
        baseDmg -= _used;
        addFloat(e.x, e.y, '护盾 -' + _used + (BUFFS.shieldHP > 0 ? '（剩 ' + BUFFS.shieldHP + '）' : ''), '#8fe4ff');
      }
      if (baseDmg > 0){
        hp -= baseDmg; flashHurt(); SFX.hurt();
        if (baseDmg > 1) addFloat(e.x, e.y, '-' + baseDmg, '#ff6a3a');
      }
      enemies.splice(i, 1); updateHud();
      if (hp <= 0){ gameOver(); return; }""", '护盾抵挡')

# ④ HUD 显示护盾
sub("""function updateHud(){
  document.getElementById('gold').textContent = gold;""",
"""function updateHud(){
  var _shEl = document.getElementById('shieldTxt');
  if (_shEl) _shEl.textContent = (BUFFS && BUFFS.shieldHP > 0) ? ('🛡' + BUFFS.shieldHP) : '';
  document.getElementById('gold').textContent = gold;""", 'HUD 护盾值')
sub("""    <div id="hpbar"><div id="hpfill"></div></div>""",
"""    <div id="hpbar"><div id="hpfill"></div><span id="shieldTxt" style="position:absolute;right:5px;top:-2px;font-size:11px;color:#8fe4ff;font-weight:700;text-shadow:0 0 6px rgba(120,200,255,.8);"></span></div>""", 'HUD 护盾元素')
sub("""  #hpbar{flex:1;height:12px;border-radius:6px;background:rgba(30,20,30,.8);""",
"""  #hpbar{flex:1;position:relative;height:12px;border-radius:6px;background:rgba(30,20,30,.8);""", '血条定位')
sub("desc:'每波开始回复 2 点基地血量'", "desc:'每波开始回 2 血（满血时转成等量护盾）'", '卡片描述')

# ⑤ 性能：体系加成改缓存（原来每次开火都遍历全场塔 → O(塔数²)）
sub("""function sysBonus(sys){
  var lv = sysLevel(sys), t = SYS_TIER[sys] || [], b = 0;
  for (var i = 0; i < t.length; i++) if (lv >= t[i].lv) b = t[i].bonus;
  return b;
}""",
"""/* v7.5 性能：体系加成缓存 —— 原来每次开火都遍历全场塔算等级（O(塔数²)），
   现在只在「棋盘变化」时刷新一次（recalcResonance 末尾 + 开新局），开火时直接读缓存 */
var sysCache = { solo:0, group:0, ctrl:0, support:0 };
function refreshSysCache(){
  var sum = { solo:0, group:0, ctrl:0, support:0 }, i, k;
  for (i = 0; i < towers.length; i++){
    var d = ELEMS[towers[i].elem];
    if (d && sum[d.sys] !== undefined) sum[d.sys] += (towers[i].lv || 1);
  }
  for (k in sum){
    var t = SYS_TIER[k] || [], b = 0;
    for (i = 0; i < t.length; i++) if (sum[k] >= t[i].lv) b = t[i].bonus;
    sysCache[k] = b;
  }
}
function sysBonus(sys){ return sysCache[sys] || 0; }""", '体系加成缓存')
sub("function recalcResonance(){ for (var i = 0; i < towers.length; i++) towers[i].res = resonanceOf(towers[i]); }",
    "function recalcResonance(){ for (var i = 0; i < towers.length; i++) towers[i].res = resonanceOf(towers[i]); refreshSysCache(); }", '刷新缓存钩子')

# ⑥ 性能：elemAt 结果缓存（每帧几十次对象分配 → 缓存到 8×6=48 项）
sub("""function elemAt(elem, lv){
  var d = ELEMS[elem]; if (!d) return null;
  var n = Math.max(0, (lv || 1) - 1);
  if (!n) return d;
  var o = {}, k;""",
"""var elemCache = {};                                  // v7.5 缓存：8 座塔 × 6 级，最多 48 项，构造一次后重复使用
function elemAt(elem, lv){
  var d = ELEMS[elem]; if (!d) return null;
  var n = Math.max(0, (lv || 1) - 1);
  if (!n) return d;
  var ck = elem + '#' + (lv || 1);
  if (elemCache[ck]) return elemCache[ck];
  var o = {}, k;""", 'elemAt 缓存头')
sub("""  o.auraRate = (d.auraRate || 0) + n * (d.upAura || 0);
  return o;
}""",
"""  o.auraRate = (d.auraRate || 0) + n * (d.upAura || 0);
  elemCache[ck] = o;
  return o;
}""", 'elemAt 缓存写入')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_p_quality 完成，共 %d 项：' % len(hits))
for h in hits: print('   -', h)
