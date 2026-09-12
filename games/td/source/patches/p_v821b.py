# -*- coding: utf-8 -*-
# v8.21 补：给第 9 座塔（机枪）配 4 张专属强化卡，保持「每座塔都有专属卡」的一致性
import io, re
p='game.html'; s=io.open(p,encoding='utf-8').read()
m = re.search(r"\{ id:'t_mortar_4',[\s\S]*?\} \},", s)
assert m, '找不到 t_mortar_4'
NEW = '''
  /* ===== v8.21 机枪塔（第 9 座）专属卡 4 张：common×2 / rare×1 / epic×1 ===== */
  { id:'t_gatling_1', elKey:'gatling', rar:'common', name:'枪管散热',
    desc:'🔫 机枪塔攻速 +12%', apply:function(){ twAdd('gatling','rate',0.12); } },
  { id:'t_gatling_2', elKey:'gatling', rar:'common', name:'穿甲弹链',
    desc:'🔫 机枪塔伤害 +15%', apply:function(){ twAdd('gatling','dmg',0.15); } },
  { id:'t_gatling_3', elKey:'gatling', rar:'rare', name:'精密校枪',
    desc:'🔫 机枪塔射程 +18%', apply:function(){ twAdd('gatling','range',0.18); } },
  { id:'t_gatling_4', elKey:'gatling', rar:'epic', name:'金属风暴',
    desc:'🔫 机枪塔伤害 +40%（高频低伤，专治单次减伤）', apply:function(){ twAdd('gatling','dmg',0.40); } },'''
s = s[:m.end()] + NEW + s[m.end():]
io.open(p,'w',encoding='utf-8').write(s)
print('OK 机枪塔专属卡 4 张已加入')
