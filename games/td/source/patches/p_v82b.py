# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 转生天赋系统
rep("function rollAffix(){ return AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]; }",
"""function rollAffix(){ return AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]; }

/* ===== v8.2 转生 / 巅峰：给「撑不下去」之后一个长期目标 =====
   无尽撑到 50 波起可以转生，按波数拿到「星核」，星核换成永久天赋（每局开局自动生效）。
   注意：天赋是永久成长，只影响「你自己变强」，不改敌人曲线 —— 曲线仍然会赢你，只是把极限往后推。 */
var TALENT_DEF = [
  { id:'gold', name:'💰 启动资金', desc:'每级：开局额外 +50 金币', max:5, cost:1 },
  { id:'hp',   name:'🛡 加固基座', desc:'每级：基地血量上限 +2',   max:3, cost:2 },
  { id:'dmg',  name:'🔥 战意传承', desc:'每级：全塔伤害 +5%',      max:5, cost:3 },
  { id:'coin', name:'🪙 猎金本能', desc:'每级：击杀金币 +10%',     max:5, cost:2 }
];
var talents = { gold:0, hp:0, dmg:0, coin:0 };
function loadTalents(){
  try {
    var j = JSON.parse(localStorage.getItem('td_talents') || '{}') || {};
    talents = { gold:j.gold | 0, hp:j.hp | 0, dmg:j.dmg | 0, coin:j.coin | 0 };
  } catch (e) { talents = { gold:0, hp:0, dmg:0, coin:0 }; }
}
function saveTalents(){ try { localStorage.setItem('td_talents', JSON.stringify(talents)); } catch (e) {} }
function starcore(){ try { return parseInt(localStorage.getItem('td_starcore') || '0', 10) || 0; } catch (e) { return 0; } }
function addStarcore(n){
  var v = Math.max(0, starcore() + n);
  try { localStorage.setItem('td_starcore', String(v)); } catch (e) {}
  return v;
}
/* 开局应用永久天赋（在关卡初始化之后调用） */
function applyTalents(){
  if (talents.gold) goldAdd(50 * talents.gold);
  if (talents.hp){ MAXHP += 2 * talents.hp; hp = MAXHP; }
  if (talents.dmg) BUFFS.dmg += 0.05 * talents.dmg;
  if (talents.coin) BUFFS.gold += 0.10 * talents.coin;
}
function renderTalents(){
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:4px;">🌟 传承天赋 · 星核 ' + starcore() + '</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:7px;">无尽撑到 50 波起可转生：每 10 波 = 1 星核（永久生效，每局开局自动应用）</div>';
  el.innerHTML = h;
  TALENT_DEF.forEach(function(td){
    var lv = talents[td.id] | 0, maxed = lv >= td.max;
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'padding:11px 14px;font-size:14px;width:100%;line-height:1.45;text-align:left;'
      + ((maxed || starcore() < td.cost) ? 'opacity:.45;' : '');
    btn.innerHTML = '<b>' + td.name + '</b><span style="float:right;color:#ffd76a;">'
      + (maxed ? '已满级 Lv' + lv : ('Lv' + lv + '/' + td.max + '　升级 ' + td.cost + ' 星核')) + '</span>'
      + '<br><span style="font-size:12px;color:#9fc4f0">' + td.desc + '</span>';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (lv >= td.max){ showTip('已满级'); return; }
      if (starcore() < td.cost){ showTip('星核不足（打无尽转生可获得）'); return; }
      addStarcore(-td.cost); talents[td.id] = lv + 1; saveTalents();
      SFX.upgrade(); renderTalents();
      showTip(td.name + ' → Lv' + (lv + 1) + '（下一局生效）');
    });
    el.appendChild(btn);
  });
  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:8px;';
  close.innerHTML = '✅ 关闭';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    document.getElementById('buffOv').classList.add('hidden');
  });
  el.appendChild(close);
}
function openTalents(){
  renderTalents();
  document.getElementById('buffOv').classList.remove('hidden');
}""", '转生天赋系统')

# ② 结束界面：转生结算 + 天赋入口
rep("""  var ebEl = document.getElementById('ovEndless');
  if (ebEl){
    ebEl.style.display = endless ? 'block' : 'none';
    ebEl.textContent = '♾ 无尽最高波次 ' + eb
      + (endless ? ('　🏆 本局评分 ' + score + ' · 评分王 ' + bestScore) : '');
  }""",
"""  /* ===== v8.2 转生：无尽撑到 50 波起，每 10 波换 1 星核 ===== */
  var gained = 0;
  if (endless && wave >= 50){ gained = Math.floor(wave / 10); addStarcore(gained); }
  var ebEl = document.getElementById('ovEndless');
  if (ebEl){
    ebEl.style.display = endless ? 'block' : 'none';
    ebEl.textContent = '♾ 无尽最高波次 ' + eb
      + (endless ? ('　🏆 本局评分 ' + score + ' · 评分王 ' + bestScore) : '')
      + (gained > 0 ? ('　🌟 转生 +' + gained + ' 星核（累计 ' + starcore() + '）') : '');
  }
  var tbEl = document.getElementById('talentBtn');
  if (tbEl){
    tbEl.style.display = 'inline-block';
    tbEl.textContent = '🌟 传承天赋（星核 ' + starcore() + '）';
  }""", '结束界面转生结算')

# ③ 结束界面加按钮
rep("""  <div class="sub" id="ovEndless" style="display:none;font-size:13px;color:#ffd76a;">♾ 无尽最高波次 0</div>""",
"""  <div class="sub" id="ovEndless" style="display:none;font-size:13px;color:#ffd76a;">♾ 无尽最高波次 0</div>
  <button class="btn" id="talentBtn" style="display:none;margin-top:6px;font-size:13px;">🌟 传承天赋（星核 0）</button>""", '结束界面按钮')

rep("  on('againBtn', function(){ showLevels(); });",
    "  on('againBtn', function(){ showLevels(); });\n  on('talentBtn', function(){ openTalents(); });   /* v8.2 转生天赋面板 */", '天赋按钮绑定')

# ④ 开局应用天赋（教学关 + 普通关卡）
rep("  MAXHP = 20; hp = MAXHP; goldSet(TUTORIAL.gold); wave = 1; kills = 0; built = 0;",
    "  MAXHP = 20; hp = MAXHP; goldSet(TUTORIAL.gold); wave = 1; kills = 0; built = 0;\n  applyTalents();                                     /* v8.2 永久天赋开局生效 */", '教学关应用天赋')
rep("  MAXHP = 20; hp = MAXHP; goldSet(LEVELS[i].gold); wave = 1; kills = 0; built = 0;",
    "  MAXHP = 20; hp = MAXHP; goldSet(LEVELS[i].gold); wave = 1; kills = 0; built = 0;\n  applyTalents();                                     /* v8.2 永久天赋开局生效 */", '关卡应用天赋')

# ⑤ 启动时读取天赋存档
rep("try { var pj = JSON.parse(localStorage.getItem('td_prog') || '{}'); if (pj && pj.unlocked) prog = pj; } catch (e) {}",
    "try { var pj = JSON.parse(localStorage.getItem('td_prog') || '{}'); if (pj && pj.unlocked) prog = pj; } catch (e) {}\nloadTalents();   /* v8.2 读取永久天赋 */", '启动读取天赋')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.2b 转生天赋补丁完成 ---')
