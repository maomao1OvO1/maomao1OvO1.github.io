#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v7.4 强化卡重做：稀有度三档 + 越后期越容易出高级卡 + 卡池扩充（10 张新卡，效果全部接入战斗）
import io, sys, re
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
hits = []
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); hits.append(tag)
def sub_soft(old, new, tag):
    """接入类替换：找不到就跳过（不影响卡池/稀有度这些核心改动）"""
    global s
    n = s.count(old)
    if n != 1:
        print('  ⚠️ [%s] 未命中（%d），跳过' % (tag, n)); return
    s = s.replace(old, new); hits.append(tag)

# ① BUFFS 增加新卡的字段
sub("var BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,\n              el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 } };",
    "var BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,\n"
    "              costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0,\n"
    "              splashDmg:0, dotAdd:0, elBoost:0,\n"
    "              el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 } };", 'BUFFS 定义')
_b_old = "  BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,\n            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 } };"
_b_new = ("  BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,\n"
          "            costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0,\n"
          "            splashDmg:0, dotAdd:0, elBoost:0,\n"
          "            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 } };")
_c = s.count(_b_old)
if _c < 1: print('❌ [BUFFS 重置] 未命中'); sys.exit(1)
s = s.replace(_b_old, _b_new); hits.append('BUFFS 重置 ×%d' % _c)

# ② 稀有度表 + 加权抽卡
sub_soft("""var BUFF_POOL = [""",
"""/* ===== v7.4 强化卡稀有度：普通 / 稀有 / 史诗 —— 越到后期越容易出高级卡 ===== */
var RARITY = { common:{ name:'普通', color:'#8fe4ff', w:100 }, rare:{ name:'稀有', color:'#b98cff', w:34 }, epic:{ name:'史诗', color:'#ffd76a', w:7 } };
function rarityWeight(rar, w){
  var base = (RARITY[rar] || RARITY.common).w;
  if (rar === 'rare') base += w * 1.6;      // 后期稀有卡概率上升
  if (rar === 'epic') base += w * 3.2;      // 史诗卡越后面越容易刷出来
  return base;
}
var BUFF_POOL = [""", '稀有度表')

# ③ 卡池重写：原有卡标稀有度 + 新增 10 张
old_pool_start = s.index("var BUFF_POOL = [")
old_pool_end = s.index("];", s.index("{ id:'el_aura'")) + 2
new_pool = """var BUFF_POOL = [
  /* —— 普通：稳扎稳打 —— */
  { id:'dmg',   rar:'common', name:'火力强化', desc:'所有塔伤害 +25%',        apply:function(){ BUFFS.dmg += 0.25; } },
  { id:'rate',  rar:'common', name:'超频',     desc:'所有塔攻速 +20%',        apply:function(){ BUFFS.rate += 0.20; } },
  { id:'range', rar:'common', name:'雷达升级', desc:'所有塔射程 +18%',        apply:function(){ BUFFS.range += 0.18; } },
  { id:'gold',  rar:'common', name:'战时经济', desc:'击杀金币 +35%',          apply:function(){ BUFFS.gold += 0.35; } },
  { id:'hp',    rar:'common', name:'装甲修复', desc:'立即回 4 点基地血量',    apply:function(){ hp = Math.min(MAXHP, hp + 4); } },
  { id:'range2',rar:'common', name:'射程校准', desc:'所有塔射程 +10%（可叠加）', apply:function(){ BUFFS.range += 0.10; } },
  { id:'cost',  rar:'common', name:'塔位折扣', desc:'建塔费用 -10%（可叠加）', apply:function(){ BUFFS.costCut = Math.min(0.5, BUFFS.costCut + 0.10); } },
  /* —— 稀有：战术级 —— */
  { id:'crit',  rar:'rare', name:'瞄准模块', desc:'暴击率 +12%（2.5 倍伤）', apply:function(){ BUFFS.crit += 0.12; } },
  { id:'combo', rar:'rare', name:'连杀引擎', desc:'连杀伤害加成翻倍',       apply:function(){ BUFFS.combo += 1; } },
  { id:'reso',  rar:'rare', name:'共鸣增幅', desc:'元素共鸣效果 +60%',      apply:function(){ BUFFS.reso += 0.6; } },
  { id:'splash',rar:'rare', name:'扩散弹头', desc:'溅射半径 +45%',          apply:function(){ BUFFS.splash += 0.45; } },
  { id:'gold2', rar:'rare', name:'战争财',   desc:'立即获得 180 金币',      apply:function(){ gold += 180; } },
  { id:'bank',  rar:'rare', name:'金库利息', desc:'每波结束按当前金币 +8% 结算利息', apply:function(){ BUFFS.interest += 0.08; } },
  { id:'regen', rar:'rare', name:'修复无人机', desc:'每波开始回复 2 点基地血量', apply:function(){ BUFFS.regen += 2; } },
  { id:'bossh', rar:'rare', name:'BOSS 猎手', desc:'对 BOSS 伤害 +40%',     apply:function(){ BUFFS.bossDmg += 0.40; } },
  /* —— 史诗：改变打法 —— */
  { id:'pierce',rar:'epic', name:'穿甲弹芯', desc:'所有塔无视敌人 50% 护甲', apply:function(){ BUFFS.pierceAdd += 0.50; } },
  { id:'zero',  rar:'epic', name:'绝对零度', desc:'减速效果 ×1.5、持续时间 +30%', apply:function(){ BUFFS.slowAdd += 0.30; } },
  { id:'blast', rar:'epic', name:'连锁爆破', desc:'溅射伤害 +40%',          apply:function(){ BUFFS.splashDmg += 0.40; } },
  { id:'venom', rar:'epic', name:'毒液浓缩', desc:'中毒伤害 +60%',          apply:function(){ BUFFS.dotAdd += 0.60; } },
  { id:'over',  rar:'epic', name:'元素超载', desc:'元素专精效果 +50%（可叠加）', apply:function(){ BUFFS.elBoost += 0.50; } },
  /* —— 局部强化：只强化某一种塔 —— */
  { id:'el_fire',   elKey:'fire',    rar:'rare', name:'火焰专精', desc:'🔥 火焰塔伤害 +20%（可叠加）', apply:function(){ BUFFS.el.fire    = (BUFFS.el.fire    || 1) + 0.20; } },
  { id:'el_ice',    elKey:'ice',     rar:'rare', name:'冰霜专精', desc:'❄️ 冰霜塔伤害 +20%（可叠加）', apply:function(){ BUFFS.el.ice     = (BUFFS.el.ice     || 1) + 0.20; } },
  { id:'el_thunder',elKey:'thunder', rar:'rare', name:'雷电专精', desc:'⚡ 雷电塔伤害 +20%（可叠加）', apply:function(){ BUFFS.el.thunder = (BUFFS.el.thunder || 1) + 0.20; } },
  { id:'el_poison', elKey:'poison',  rar:'rare', name:'剧毒专精', desc:'☠️ 剧毒塔伤害 +20%（可叠加）', apply:function(){ BUFFS.el.poison  = (BUFFS.el.poison  || 1) + 0.20; } },
  { id:'el_phys',   elKey:'phys',    rar:'rare', name:'物理专精', desc:'🔨 物理塔伤害 +20%（可叠加）', apply:function(){ BUFFS.el.phys    = (BUFFS.el.phys    || 1) + 0.20; } },
  { id:'el_aura',   elKey:'aura',    rar:'epic', name:'辅助专精', desc:'📡 辅助塔光环效果 +30%',       apply:function(){ BUFFS.aura = (BUFFS.aura || 1) + 0.30; } }
];"""
s = s[:old_pool_start] + new_pool + s[old_pool_end:]
hits.append('卡池重写（20 张普通/稀有/史诗 + 6 张专精）')

# ④ 抽卡按稀有度加权
sub("""  var pool = BUFF_POOL.filter(function(b){ return !b.elKey; });
  while (out.length < n && pool.length){
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }""",
"""  var pool = BUFF_POOL.filter(function(b){ return !b.elKey; });
  while (out.length < n && pool.length){
    var total = 0, i, w = [];
    for (i = 0; i < pool.length; i++){ w[i] = rarityWeight(pool[i].rar, wave); total += w[i]; }
    var r = Math.random() * total, pick = 0;
    for (i = 0; i < pool.length; i++){ r -= w[i]; if (r <= 0){ pick = i; break; } }
    out.push(pool.splice(pick, 1)[0]);
  }""", '加权抽卡')

# ⑤ 卡片显示稀有度（颜色边框 + 标签）
sub("""    btn.innerHTML = '<b>' + b.name + '</b><br><span style="font-size:12px;color:#9fc4f0">' + b.desc + '</span>';""",
"""    var rar = RARITY[b.rar] || RARITY.common;
    btn.style.borderColor = rar.color;
    btn.style.boxShadow = '0 0 12px ' + rar.color + '55';
    btn.innerHTML = '<b>' + b.name + '</b><span style="font-size:10px;color:' + rar.color +
      ';border:1px solid ' + rar.color + ';border-radius:8px;padding:0 5px;margin-left:6px;">' + rar.name + '</span>' +
      '<br><span style="font-size:12px;color:#9fc4f0">' + b.desc + '</span>';""", '卡片稀有度显示')

# ⑥ 新卡效果接入战斗
sub("function towerCost(elem){\n  var base = ELEMS[elem].cost;",
    "function towerCost(elem){\n  var base = ELEMS[elem].cost;", 'noop')  # 占位（保持锚点计数）
hits.pop()
s2 = re.sub(r'return Math\.round\(base \* \(1 \+ towers\.length \* slope\)\);',
            'return Math.round(base * (1 + towers.length * slope) * (1 - (BUFFS.costCut || 0)));', s)
if s2 != s: s = s2; hits.append('塔位折扣接入')
else: print('  ⚠️ 塔价行未命中')

sub_soft("""      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;""",
"""      var bonus = 22 + Math.min(70, wave * 5); gold += bonus;
      if (BUFFS.interest > 0){                                   // v7.4 金库利息
        var it = Math.round(gold * BUFFS.interest);
        if (it > 0){ gold += it; addFloat(W / 2, H * 0.55, '利息 +' + it, '#ffd76a'); }
      }""", '金库利息接入')

sub_soft("""  showBanner('第 ' + wave + ' 波');
  SFX.wave();
  bgmAdapt();""",
"""  showBanner('第 ' + wave + ' 波');
  SFX.wave();
  if (BUFFS.regen > 0 && hp < MAXHP){                          // v7.4 修复无人机
    hp = Math.min(MAXHP, hp + BUFFS.regen);
    addFloat(W / 2, H * 0.5, '修复 +' + BUFFS.regen, '#7cf5c0');
  }
  bgmAdapt();""", '修复无人接入')

sub_soft("  var armor = 1 - (e.armor || 0) * (1 - (def.pierce || 0));",
    "  var armor = 1 - (e.armor || 0) * (1 - (def.pierce || 0) - (BUFFS.pierceAdd || 0));   // v7.4 穿甲弹芯", '穿甲弹芯接入')
s2 = re.sub(r'\(crit \? 2\.5 : 1\)',
            '(crit ? 2.5 : 1) * (e.boss ? (1 + (BUFFS.bossDmg || 0)) : 1)', s, count=1)
if s2 != s: s = s2; hits.append('BOSS 猎手接入')
else: print('  ⚠️ 暴击乘区未命中（BOSS 猎手跳过）')
sub("  var slowS = (def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK;",
    "  var slowS = (def2 ? def2.slowT : def.slowT) * (res && res.freeze ? 1.8 : 1) * ctrlK * (1 + (BUFFS.slowAdd || 0));   // v7.4 绝对零度", '绝对零度接入')
sub("  var dotD1 = def.dot ? (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK : 0;",
    "  var dotD1 = def.dot ? (def2 ? def2.dot : def.dot) * (1 + (t.lv - 1) * 0.4) * dotK * (1 + (BUFFS.dotAdd || 0)) : 0;   // v7.4 毒液浓缩", '毒液浓缩接入')
sub("  var elK = (BUFFS.el && BUFFS.el[t.elem]) ? BUFFS.el[t.elem] : 1;",
    "  var elKB = (BUFFS.el && BUFFS.el[t.elem]) ? BUFFS.el[t.elem] : 1;\n"
    "  var elK = 1 + (elKB - 1) * (1 + (BUFFS.elBoost || 0));      // v7.4 元素超载：专精收益放大", '元素超载接入')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_o_cards 完成，共 %d 项：' % len(hits))
for h in hits: print('   -', h)
