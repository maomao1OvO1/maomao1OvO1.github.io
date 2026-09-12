# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

rep("function goldText(){ goldSync(); return goldBig.toString(); }",
"""function goldText(){ goldSync(); return goldBig.toString(); }

/* ===== v8.0 无尽契约（PACT）=====
   毛毛反馈「无尽后期就是挂机」，方案：不动普通关卡，只给无尽加「代价与收益并存」的抉择。
   PACT 存的是「敌方强度 / 收益」的全局倍率，由每 5 波一次的契约三选一累积而来。 */
var PACT = { hp:1, speed:1, armor:0, gold:1, count:1, bossEvery:10, taken:[] };
function pactReset(){ PACT = { hp:1, speed:1, armor:0, gold:1, count:1, bossEvery:10, taken:[] }; }
var PACT_POOL = [
  { name:'🩸 血祭契约', desc:'敌人血量 +25%　｜　你的击杀金币 +30%',
    apply:function(){ PACT.hp *= 1.25; PACT.gold += 0.30; } },
  { name:'🛡 钢铁契约', desc:'敌人 +12% 护甲　｜　立即获得 3 点基地护盾',
    apply:function(){ PACT.armor += 0.12; BUFFS.shieldHP = (BUFFS.shieldHP || 0) + 3; } },
  { name:'💨 疾风契约', desc:'敌人速度 +10%　｜　全塔攻速 +10%',
    apply:function(){ PACT.speed *= 1.10; BUFFS.rate += 0.10; } },
  { name:'🐜 兽潮契约', desc:'敌人数量 +25%　｜　全塔伤害 +18%',
    apply:function(){ PACT.count *= 1.25; BUFFS.dmg += 0.18; } },
  { name:'👑 悬赏契约', desc:'BOSS 改为每 8 波登场（提前）　｜　击杀金币翻倍',
    apply:function(){ PACT.bossEvery = 8; PACT.gold += 1.0; } },
  { name:'💰 贪婪契约', desc:'击杀金币 +80%　｜　敌人血量 +20%',
    apply:function(){ PACT.gold += 0.80; PACT.hp *= 1.20; } },
  { name:'⛓ 苦行契约', desc:'击杀金币 -30%　｜　立即获得 2 张随机强化卡',
    apply:function(){ PACT.gold = Math.max(0.2, PACT.gold - 0.30);
      for (var pi = 0; pi < 2; pi++){ var c = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)]; c.apply(); } } },
  { name:'⚔ 破军契约', desc:'敌人血量 +15%　｜　你的暴击率 +12%',
    apply:function(){ PACT.hp *= 1.15; BUFFS.crit += 0.12; } }
];""", 'PACT 定义与契约池')

rep("""  var hpRaw = 1 + (wave - 1) * 0.27 + lateK;
  if (hpRaw > 61) hpRaw = 61;                            // 总倍数封顶 61 → 无尽永远打得下去
  var mul = hpRaw * lvDiff * (packMul || 1);   // 保留「单波怪数封顶」的血量补偿""",
"""  var hpRaw = 1 + (wave - 1) * 0.27 + lateK;
  /* ===== v8.0 无尽改造（毛毛选「缓慢不封顶」）=====
     旧版在第 105 波把血量硬封顶 61 倍 → 敌人再也不长，而玩家每波三选一强化永远在涨，
     实测第 60 波起玩家就反超（199 波时强 11.8 万倍）→ 必然挂机。
     现在越过 61 倍后改为每波 ×1.09 的缓慢复合增长、不封顶 → 敌人最终会超过玩家，
     「尽量多撑一波」重新成立；前 100 波体感与旧版几乎一致（不会突然打不动）。
     正式关卡最多 18 波，永远走不到这条分支，5 关平衡不受影响。 */
  if (hpRaw > 61) hpRaw = 61 * Math.pow(1.09, wave - 105);
  var mul = hpRaw * lvDiff * (packMul || 1) * (PACT.hp || 1);   // 保留单波补偿 + v8.0 契约加成""", '血量曲线不封顶')

rep("    speed: d.speed * CELL * 1.25 * (1 + Math.min(0.55, (wave - 1) * 0.024)),   // 越到后期跑得越快",
    "    speed: d.speed * CELL * 1.25 * (1 + Math.min(0.55, (wave - 1) * 0.024)) * (PACT.speed || 1),   // 越到后期跑得越快 + 契约加速", '速度契约加成')
rep("    gold: d.gold, color: d.color, r: d.r, armor: d.armor || 0,",
    "    gold: d.gold, color: d.color, r: d.r, armor: Math.min(0.85, (d.armor || 0) + (PACT.armor || 0)),", '护甲契约加成')

rep("""  charger: { name:'重装冲锋', hp:360, speed:0.62, gold:26, color:'#9aa7b8', r:15, armor:0.5, charge:true, fx:'50% 护甲；每 5 秒冲锋 1.5 秒（冲锋期间提速 80% 且免疫减速）', tip:'物理塔穿甲；趁它冲锋结束的间隙集火' },""",
"""  charger: { name:'重装冲锋', hp:360, speed:0.62, gold:26, color:'#9aa7b8', r:15, armor:0.5, charge:true, fx:'50% 护甲；每 5 秒冲锋 1.5 秒（冲锋期间提速 80% 且免疫减速）', tip:'物理塔穿甲；趁它冲锋结束的间隙集火' },
  /* ===== v8.0 无尽经济压力：盗金贼 ===== */
  thief:  { name:'盗金贼', hp:180, speed:1.45, gold:8, color:'#ffd24a', r:12, steal:true,
            fx:'每 2 秒偷走你 2% 金币（单次上限 120），被击杀时连本带利吐回来；跑到底就真被偷走了',
            tip:'优先点它 —— 它身上带着你的钱，击杀全额归还并额外掉落' },""", '盗金贼定义')

rep("    charge: !!d.charge, chargeCd: d.charge ? 5.0 : 0, chargingT: 0,  // 重装冲锋：每 5 秒起冲一次（冲锋 1.5s + 冷却 3.5s）",
    "    charge: !!d.charge, chargeCd: d.charge ? 5.0 : 0, chargingT: 0,  // 重装冲锋：每 5 秒起冲一次（冲锋 1.5s + 冷却 3.5s）\n    steal: !!d.steal, stealT: d.steal ? 2.0 : 0, stolen: 0,          // v8.0 盗金贼：偷金计时 + 已偷走的钱（击杀归还）", '盗金贼敌人字段')

rep("""  var g = [];
  function add(type, n, gap){ if (n > 0) g.push({ type:type, n:n, gap:gap }); }""",
"""  var g = [];
  var pc = (PACT && PACT.count) || 1;                                    /* v8.0 契约：敌人数量倍率 */
  function add(type, n, gap){ n = Math.round(n * pc); if (n > 0) g.push({ type:type, n:n, gap:gap }); }""", 'waveComp 数量契约')

rep("  if (w % 10 === 0) add('boss', 1, 1.7);\n  return g;",
"""  if (w >= 12) add('thief', 1 + Math.floor((w - 12) / 6), 1.30);        /* v8.0 盗金贼：后期越来越多 */
  /* v8.0：每 20 波双 BOSS（每 10 波单 BOSS 保留）；契约「悬赏」会把频率提前到每 8 波 */
  var bossN = (w % 20 === 0) ? 2 : 1;
  if (w % ((PACT && PACT.bossEvery) || 10) === 0) add('boss', bossN, 1.7);
  return g;""", '双BOSS与盗金贼登场')

rep("""  /* 精英光环：半径 2.5 格内其他怪 +30% 速度；不叠加，只取最强的一个 */""",
"""  /* —— v8.0 盗金贼：每 2 秒偷走 2% 金币（单次 5~120），记在怪身上，击杀时连本带利吐回 —— */
  for (i = 0; i < n; i++){
    e = enemies[i];
    if (!e.steal || e.hp <= 0) continue;
    e.stealT -= dt;
    if (e.stealT <= 0){
      e.stealT = 2.0;
      var take = Math.min(120, Math.max(5, Math.round(gold * 0.02)));
      if (take > 0 && gold >= take){
        goldSub(take); e.stolen = (e.stolen || 0) + take;
        addFloat(e.x, e.y - e.r - 6, '偷走 ' + take, '#ffd24a');
      }
    }
  }
  /* 精英光环：半径 2.5 格内其他怪 +30% 速度；不叠加，只取最强的一个 */""", '盗金贼偷金')

rep("  var g2 = Math.round(e.gold * BUFFS.gold * (e.dblGold ? 2 : 1));",
    "  var g2 = Math.round(e.gold * BUFFS.gold * (e.dblGold ? 2 : 1) * (PACT.gold || 1)) + (e.stolen || 0);   /* v8.0：契约金币倍率 + 盗金贼连本带利吐回 */", '击杀掉落契约与归还')

rep("""      }   // 无尽模式永不结算
      showBuffChoices(); return;""",
"""      }   // 无尽模式永不结算
      /* v8.0 无尽：每 5 波先弹「无尽契约」（三选一，代价与收益并存），选完接着选强化卡 */
      if (endless && wave % 5 === 0){ showPactChoices(); return; }
      showBuffChoices(); return;""", '契约触发点')

rep("""function showBuffChoices(){
  running = false; paused = true;
  var picks = pickBuffs(3);""",
"""/* v8.0：无尽契约三选一（复用强化卡面板；契约界面隐藏「跳过」——这是必须做的抉择） */
function showPactChoices(){
  running = false; paused = true;
  var _sb = document.getElementById('skipBuffBtn'); if (_sb) _sb.style.display = 'none';
  var pool = PACT_POOL.slice(), picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  var el = document.getElementById('buffList');
  el.innerHTML = '<div style="font-size:13px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:6px;">'
    + '⚔ 无尽契约 · 第 ' + wave + ' 波已过 · 必选其一</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:6px;">代价与收益并存，每份契约都会累积影响到后面所有波</div>';
  picks.forEach(function(p){
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:13px 15px;font-size:14.5px;width:100%;line-height:1.5;text-align:left;'
      + 'border-color:#ff9a6a;box-shadow:0 0 12px #ff9a6a55;';
    btn.innerHTML = '<b>' + p.name + '</b><br><span style="font-size:12px;color:#9fc4f0">' + p.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      p.apply(); PACT.taken.push(p.name);
      recalcResonance(); updateHud();
      document.getElementById('buffOv').classList.add('hidden');
      running = true; paused = false; last = 0;
      SFX.upgrade();
      addFloat(W / 2, H * 0.42, '契约生效：' + p.name, '#ff9a6a');
      showBuffChoices();                     /* 契约选完，继续本波的强化卡三选一 */
    });
    el.appendChild(btn);
  });
  document.getElementById('buffOv').classList.remove('hidden');
}
function showBuffChoices(){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */
  var picks = pickBuffs(3);""", '契约 UI')

rep("""  var eb = saveEndlessBest();                  // 无尽模式：取最大值写入 td_endless_best
  var ebEl = document.getElementById('ovEndless');
  if (ebEl){
    ebEl.style.display = endless ? 'block' : 'none';
    ebEl.textContent = '♾ 无尽最高波次 ' + eb;
  }""",
"""  var eb = saveEndlessBest();                  // 无尽模式：取最大值写入 td_endless_best
  /* ===== v8.0 无尽冲波评分：撑得越久越高，基地血量上限 / 击杀数 / 金币效率一并计入 ===== */
  var score = wave * 1000 + MAXHP * 100 + kills * 10 + Math.floor(gold / 100);
  var bestScore = 0;
  try { bestScore = parseInt(localStorage.getItem('td_endless_score') || '0', 10) || 0; } catch (e2) { bestScore = 0; }
  if (endless && score > bestScore){ bestScore = score; try { localStorage.setItem('td_endless_score', String(score)); } catch (e3) {} }
  var ebEl = document.getElementById('ovEndless');
  if (ebEl){
    ebEl.style.display = endless ? 'block' : 'none';
    ebEl.textContent = '♾ 无尽最高波次 ' + eb
      + (endless ? ('　🏆 本局评分 ' + score + ' · 评分王 ' + bestScore) : '');
  }""", '冲波评分')

rep("  twStamp++; elemCache = {}; pickedIds = {};          /* 强化缓存失效 + 本局「已见过卡」重置 */",
    "  twStamp++; elemCache = {}; pickedIds = {};          /* 强化缓存失效 + 本局「已见过卡」重置 */\n  pactReset();                                        /* v8.0：新一局清空无尽契约 */", '开局重置契约', cnt=2)
io.open(p,'w',encoding='utf-8').write(s)
print('--- 第一批补丁全部完成 ---')
