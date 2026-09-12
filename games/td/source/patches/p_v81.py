# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 波间商店：金币出口
rep("""var PACT_POOL = [""",
"""/* ===== v8.1 波间商店：给金币一个「花得掉」的出口 =====
   毛毛那边金币滚到 10^18 却没处花 —— 用商店替代粗暴的「维护费式扣钱」：
   想花钱就花，不想花就留着，但物价随波次上涨，后期囤钱没有额外好处。 */
var SHOP_POOL = [
  { name:'🔧 紧急维修',   desc:'基地立刻回 3 点血',              cost:80,  apply:function(){ hp = Math.min(MAXHP, hp + 3); } },
  { name:'🛡 能量护盾',   desc:'获得 4 点基地护盾',              cost:120, apply:function(){ BUFFS.shieldHP = (BUFFS.shieldHP || 0) + 4; } },
  { name:'🎴 战术档案',   desc:'立刻随机获得 1 张强化卡',        cost:200, apply:function(){ var c = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]; c.apply(); } },
  { name:'🛒 军火补给',   desc:'全塔伤害 +8%（可叠加）',         cost:350, apply:function(){ BUFFS.dmg += 0.08; } },
  { name:'⚡ 超频模块',   desc:'全塔攻速 +8%（可叠加）',         cost:350, apply:function(){ BUFFS.rate += 0.08; } },
  { name:'📡 雷达组网',   desc:'全塔射程 +8%（可叠加）',         cost:280, apply:function(){ BUFFS.range += 0.08; } },
  { name:'🧪 腐蚀弹头',   desc:'无视护甲 +15%（可叠加）',        cost:300, apply:function(){ BUFFS.pierceAdd = Math.min(1, (BUFFS.pierceAdd || 0) + 0.15); } },
  { name:'💰 投资合约',   desc:'每波利息 +6%（可叠加）',         cost:400, apply:function(){ BUFFS.interest += 0.06; } },
  { name:'❄ 寒流预置',    desc:'减速持续时间 +20%（可叠加）',    cost:260, apply:function(){ BUFFS.slowAdd += 0.20; } },
  { name:'☣ 毒素储备',    desc:'中毒伤害 +25%（可叠加）',        cost:300, apply:function(){ BUFFS.dotAdd += 0.25; } }
];
var shopStock = [];
function shopPrice(base){ return Math.round(base * (1 + Math.min(3, wave * 0.05))); }   /* 越后期物价越高 */
function rollShop(){
  var pool = SHOP_POOL.slice();
  shopStock = [];
  for (var i = 0; i < 4 && pool.length; i++){
    var it = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    shopStock.push({ name:it.name, desc:it.desc, cost:it.cost, apply:it.apply, sold:false });
  }
}
function renderShop(){
  var el = document.getElementById('buffList');
  el.innerHTML = '<div style="font-size:13.5px;font-weight:700;color:#8ff0ff;text-align:center;margin-bottom:4px;">🛒 波间商店 · 第 ' + wave + ' 波</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:7px;">当前金币 ' + goldText() + '　（物价随波次上涨，囤钱没有额外收益）</div>';
  shopStock.forEach(function(item){
    var price = shopPrice(item.cost), can = (gold >= price) && !item.sold;
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:11px 14px;font-size:14px;width:100%;line-height:1.45;text-align:left;'
      + (can ? '' : 'opacity:.45;');
    btn.innerHTML = '<b>' + item.name + '</b><span style="float:right;color:#ffd76a;">'
      + (item.sold ? '已售罄' : (price + ' 金')) + '</span>'
      + '<br><span style="font-size:12px;color:#9fc4f0">' + item.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (item.sold) return;
      var pr = shopPrice(item.cost);
      if (gold < pr){ showTip('金币不足'); return; }
      goldSub(pr); item.apply(); item.sold = true;
      recalcResonance(); updateHud(); SFX.coin();
      addFloat(W / 2, H * 0.40, '购买：' + item.name, '#8ff0ff');
      renderShop();
    });
    el.appendChild(btn);
  });
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
  var rf = document.createElement('button');
  rf.className = 'btn';
  rf.style.cssText = 'flex:1;padding:10px;font-size:13px;';
  rf.innerHTML = '🔄 刷新商品<br><span style="color:#ffd76a">' + shopPrice(60) + ' 金</span>';
  rf.addEventListener('click', function(ev){
    ev.stopPropagation();
    var pr = shopPrice(60);
    if (gold < pr){ showTip('金币不足'); return; }
    goldSub(pr); rollShop(); renderShop(); SFX.upgrade();
  });
  var lv = document.createElement('button');
  lv.className = 'btn';
  lv.style.cssText = 'flex:1;padding:10px;font-size:13px;';
  lv.innerHTML = '🚪 离开商店<br><span style="color:#9fc4f0">回去选强化卡</span>';
  lv.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
    showBuffChoices();
  });
  row.appendChild(rf); row.appendChild(lv);
  el.appendChild(row);
}
function openShop(){
  running = false; paused = true;
  if (!shopStock.length || shopStock.every(function(i2){ return i2.sold; })) rollShop();
  renderShop();
  document.getElementById('buffOv').classList.remove('hidden');
}
var PACT_POOL = [""", '波间商店')

# ② 强化卡界面加「商店」入口
rep("""    el.appendChild(btn);
  });
  document.getElementById('buffOv').classList.remove('hidden');
}
function recalcResonance(){""",
"""    el.appendChild(btn);
  });
  /* v8.1：强化卡界面追加「波间商店」入口（金币有出口；逛完回来继续选卡） */
  var shopBtn = document.createElement('button');
  shopBtn.className = 'btn';
  shopBtn.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:7px;';
  shopBtn.innerHTML = '🛒 进波间商店（花金币换即时战力）　<span style="color:#ffd76a">' + goldText() + ' 金</span>';
  shopBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
    openShop();
  });
  el.appendChild(shopBtn);
  document.getElementById('buffOv').classList.remove('hidden');
}
function recalcResonance(){""", '商店入口')

# ③ 三个机制轮换新怪
rep("""  /* ===== v8.0 无尽经济压力：盗金贼 ===== */""",
"""  /* ===== v8.1 机制轮换：让「露头就秒」不再万能，逼玩家混搭与留后手 ===== */
  bulwark: { name:'壁垒兵', hp:430, speed:0.70, gold:30, color:'#7f9bb5', r:15, armor:0.15, absorb:true,
             fx:'单次伤害超过自身血量 25% 时，该次伤害减免 65%（专克一波爆发秒杀）',
             tip:'别用单发高伤硬砸 —— 用持续输出磨它（毒 / 链式 / 溅射 / 多段）' },
  phase:   { name:'相位兵', hp:270, speed:1.05, gold:26, color:'#c78cff', r:13, phase:true,
             fx:'每 5 秒在「免疫元素」与「免疫物理」之间切换（身体颜色随之变化）',
             tip:'元素塔与物理塔混搭 —— 切换时打对应那一半' },
  airdrop: { name:'空降兵', hp:210, speed:1.20, gold:24, color:'#ff9a6a', r:12, airdrop:true,
             fx:'直接空降到路径 45% 处，跳过前半段防线（抵达基地扣 1 血）',
             tip:'后半段也要留火力，别把塔全堆在入口' },
  /* ===== v8.0 无尽经济压力：盗金贼 ===== */""", '三新怪定义')

rep("    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）",
"""    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）
    /* —— v8.1 机制轮换 —— */
    absorb: !!d.absorb,                                              // 壁垒兵：单次高爆发被大幅减免
    phase: !!d.phase, phaseElem: 0, phaseT: 5.0,                     // 相位兵：0=免疫元素 / 1=免疫物理
    airdrop: !!d.airdrop,                                            // 空降兵：出生点直接推到路径 45% 处""", '三新怪字段')

# ④ hitEnemy：吸收爆发 + 相位免疫
rep("""  if (e.shieldT > 0) dmg *= 0.15;             // 出生护盾：减伤 85%
  if (e.shieldBuffT > 0) dmg *= 0.80;         // 医疗兵护罩：减伤 20%""",
"""  if (e.shieldT > 0) dmg *= 0.15;             // 出生护盾：减伤 85%
  if (e.shieldBuffT > 0) dmg *= 0.80;         // 医疗兵护罩：减伤 20%
  /* —— v8.1 壁垒兵：单次伤害超过其血量 25% 时减免 65%（专治「露头就秒」）—— */
  if (e.absorb && dmg > e.maxhp * 0.25) dmg *= 0.35;
  /* —— v8.1 相位兵：按当前相位免疫元素或物理 —— */
  if (e.phase){
    var isElemTower = (t.elem === 'fire' || t.elem === 'ice' || t.elem === 'thunder' || t.elem === 'poison');
    var isPhysTower = (t.elem === 'phys' || t.elem === 'sniper' || t.elem === 'mortar');
    if ((e.phaseElem === 0 && isElemTower) || (e.phaseElem === 1 && isPhysTower)) dmg *= 0.15;
  }""", '吸收与相位免疫')

# ⑤ updateMobSkills：相位切换
rep("""    if (e.charge){
      if (e.chargingT > 0){                       // 冲锋中：扣冲锋时间""",
"""    /* v8.1 相位兵：每 5 秒在「免疫元素」与「免疫物理」之间切换 */
    if (e.phase){
      e.phaseT -= dt;
      if (e.phaseT <= 0){ e.phaseT = 5.0; e.phaseElem = e.phaseElem ? 0 : 1; }
    }
    if (e.charge){
      if (e.chargingT > 0){                       // 冲锋中：扣冲锋时间""", '相位切换')

# ⑥ 空降兵出生点
rep("""    totalPath: pathLenToWp(WAYPOINTS.length - 1) || 1            // 本关路径总长（像素）：自爆兵算路程进度用
  });
}""",
"""    totalPath: pathLenToWp(WAYPOINTS.length - 1) || 1            // 本关路径总长（像素）：自爆兵算路程进度用
  });
  /* v8.1 空降兵：出生点直接推到路径 45% 处（跳过前半段防线） */
  if (d.airdrop){
    var total2 = pathLenToWp(WAYPOINTS.length - 1) || 1, target2 = total2 * 0.45, wpi2 = 0;
    for (var k3 = 0; k3 < WAYPOINTS.length - 1; k3++){
      if (pathLenToWp(k3 + 1) >= target2){ wpi2 = k3 + 1; break; }
    }
    var pp2 = waypointPx(wpi2), eDrop = enemies[enemies.length - 1];
    if (pp2 && eDrop){ eDrop.x = pp2.x; eDrop.y = pp2.y; eDrop.wp = wpi2; eDrop.done = pathLenToWp(wpi2); }
  }
}""", '空降兵出生点')

# ⑦ waveComp：三新怪登场
rep("  if (w >= 12) add('thief', 1 + Math.floor((w - 12) / 6), 1.30);        /* v8.0 盗金贼：后期越来越多 */",
"""  if (w >= 12) add('thief', 1 + Math.floor((w - 12) / 6), 1.30);        /* v8.0 盗金贼：后期越来越多 */
  /* v8.1 机制轮换怪：从第 14 波起陆续登场（正式关卡只有第 5 关 18 波会碰到少量）*/
  if (w >= 14) add('phase',   1 + Math.floor((w - 14) / 5), 1.45);
  if (w >= 16) add('bulwark', 1 + Math.floor((w - 16) / 5), 1.70);
  if (w >= 18) add('airdrop', 1 + Math.floor((w - 18) / 6), 1.50);""", '三新怪登场')

# ⑧ 维护费（无尽专属，温和）
rep("""      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）""",
"""      /* ===== v8.1 维护费（无尽专属，温和版）=====
         塔数 × 等级总和 × 3：逼玩家在「铺塔海」与「升级精品」之间取舍。
         正式关卡不启用（避免影响已校准的 5 关平衡）。 */
      if (endless && towers.length){
        var lvSum = 0;
        for (var ti3 = 0; ti3 < towers.length; ti3++) lvSum += towers[ti3].lv;
        var upkeep = lvSum * 3;
        if (upkeep > 0){
          goldSub(upkeep);
          addFloat(W / 2, H * 0.58, '维护费 -' + upkeep + '（' + towers.length + ' 塔 · 共 ' + lvSum + ' 级）', '#ff9a6a');
        }
      }
      if (endless) saveEndless(true);   // 无尽模式：每波结束自动存档（静默）""", '维护费')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.1 第二批补丁完成 ---')
