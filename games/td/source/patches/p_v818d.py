# -*- coding: utf-8 -*-
# v8.18 (4)(5) 游戏内左侧常驻信息栏：天气 / 加成 / 减益 / 本局强化卡 / 套装
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ---------- 1. CSS ----------
rep('  #tip{position:absolute;left:50%;bottom:8px;',
'''  /* ===== v8.18 左侧常驻信息栏 =====
     毛毛：「选的那个卡片和 debuff 你都列出来，有什么加成有什么 debuff 写到左边」
     默认**折叠**成一条窄图标带（几乎不挡战场），点一下才铺开详情；
     容器整体 pointer-events:none，只有图标带与面板本身可点 → 战场点击不受影响。 */
  #sideWin{position:absolute;left:env(safe-area-inset-left,0px);top:0;bottom:0;z-index:22;
    display:flex;align-items:flex-start;pointer-events:none;
    padding:6px 0 6px calc(5px + env(safe-area-inset-left,0px));}
  #swStrip{pointer-events:auto;display:flex;flex-direction:column;gap:4px;padding:4px;
    border-radius:12px;background:rgba(10,16,30,.72);border:1px solid rgba(90,140,220,.28);}
  .swChip{position:relative;width:30px;height:30px;border-radius:9px;
    display:flex;align-items:center;justify-content:center;font-size:15px;
    background:rgba(22,34,58,.92);border:1px solid rgba(120,180,255,.28);}
  .swChip:active{transform:scale(.92);}
  .swChip.dim{opacity:.38;}
  .swChip .n{position:absolute;right:-3px;top:-4px;font-size:9px;font-weight:700;
    color:#20180a;background:#ffd76a;border-radius:7px;padding:0 3px;line-height:13px;}
  #swBody{pointer-events:auto;display:none;width:min(48vw,200px);max-height:100%;overflow-y:auto;
    margin-left:5px;padding:8px 9px;border-radius:12px;background:rgba(10,16,30,.92);
    border:1px solid rgba(90,140,220,.34);box-shadow:0 6px 20px rgba(0,0,0,.5);
    font-size:11.5px;line-height:1.5;text-align:left;-webkit-overflow-scrolling:touch;}
  #sideWin[data-open="1"] #swBody{display:block;}
  .swSec{margin-bottom:7px;}
  .swSec:last-child{margin-bottom:0;}
  .swT{font-size:10.5px;font-weight:700;color:#8fb4dc;letter-spacing:1px;margin-bottom:3px;}
  .swRow{display:flex;justify-content:space-between;gap:6px;font-size:11.5px;}
  .swRow .k{color:#9fc4f0;}
  .swRow .v{color:#7cf5c0;font-weight:700;font-variant-numeric:tabular-nums;}
  .swRow.bad .v{color:#ff9a8a;}
  .swRow.dim .v{color:#6c7f9b;font-weight:400;}
  .swCardLine{display:flex;gap:5px;align-items:center;font-size:11px;margin-bottom:2px;}
  .swCardLine .rn{font-size:9px;border:1px solid currentColor;border-radius:6px;padding:0 3px;flex:0 0 auto;}
  #tip{position:absolute;left:50%;bottom:8px;''',
    '信息栏 CSS')

# ---------- 2. HTML（放在 #canvasWrap 里，紧随 canvas 之后）----------
rep('''    <canvas id="cv"></canvas>
    <div id="sel"></div>''',
'''    <canvas id="cv"></canvas>
    <!-- v8.18 左侧常驻信息栏（默认折叠；点图标展开）-->
    <div id="sideWin" data-open="0">
      <div id="swStrip">
        <div class="swChip" id="swWx" title="当前天气（点开看全部天气说明）">🌤</div>
        <div class="swChip" id="swBuff" title="本局加成">📈</div>
        <div class="swChip" id="swDeb" title="本局减益">🔻</div>
        <div class="swChip" id="swCard" title="本局已获得的强化卡">🎴</div>
        <div class="swChip" id="swSet" title="已激活的套装">🧩</div>
      </div>
      <div id="swBody"></div>
    </div>
    <div id="sel"></div>''',
    '信息栏 HTML')

# ---------- 3. 本局已抽卡数组 ----------
rep('''var SET_NEED = 3;
var SET_COUNT = {};''',
'''var SET_NEED = 3;
var SET_COUNT = {};
/* v8.18 左侧信息栏要显示的「本局已获得的强化卡」——所有抽卡都走 grantCard()，在那里统一记一笔 */
var runCards = [];''',
    'runCards 声明')

rep('''function resetDraftTools(){ rerollLeft = 3; banLeft = 2; bannedIds = {}; curPicks = []; banMode = false; }''',
    '''function resetDraftTools(){
  rerollLeft = 3; banLeft = 2; bannedIds = {}; curPicks = []; banMode = false;
  runCards = [];                                  /* v8.18：新一局清空「本局已获得的强化卡」 */
}''',
    'resetDraftTools 清空抽卡记录')

rep('''function grantCard(card){
  if (!card) return;
  card.apply();''',
'''function grantCard(card){
  if (!card) return;
  /* v8.18：记进「本局已抽卡」列表（左侧信息栏要按稀有度列出来）——
     这是所有抽卡的统一入口（波次三选一 / 商店战术档案 / 苦行契约），所以记在这里不会漏 */
  runCards.push({ id: card.id || card.name, name: card.name, rar: card.rar || 'common', elKey: card.elKey || null });
  card.apply();''',
    'grantCard 记录抽卡')

# ---------- 4. 无尽存档带上抽卡列表 ----------
rep('''      towers: list, buffs: BUFFS, best: 0, t: Date.now()''',
    '''      towers: list, buffs: BUFFS, cards: runCards, best: 0, t: Date.now()''',
    '无尽存档写入抽卡列表')
rep('''  if (sv.buffs && sv.buffs.el){ BUFFS = sv.buffs; }''',
    '''  if (sv.buffs && sv.buffs.el){ BUFFS = sv.buffs; }
  runCards = (sv.cards && sv.cards.length) ? sv.cards : [];   /* v8.18：续玩时把抽卡记录也接上 */''',
    '无尽续玩恢复抽卡列表')

# ---------- 5. 信息栏渲染内核 ----------
rep('''function updateHud(){''',
'''/* ===== v8.18 左侧常驻信息栏：渲染内核 =====
   毛毛：「选的那个卡片和 debuff 你都列出来，有什么加成有什么 debuff 写到左边」
   内容：①天气 ②天气影响（加成/减益）③全局加成 ④减益（无尽契约 + 天气负面）
        ⑤本局已获得的强化卡 ⑥已激活套装。
   性能：updateHud() 每帧都会调用这里 → 先拼一个「签名」，值没变就**直接 return**，不重建 DOM。 */
var sideOpen = false;
var sideSig = '';
var SIDE_KEY = 'td_sideOpen';
var SIDE_MAIN = [
  { k:'dmg',   n:'全塔伤害', f:'x' },
  { k:'rate',  n:'攻速',     f:'x' },
  { k:'range', n:'射程',     f:'x' },
  { k:'crit',  n:'暴击率',   f:'p', d:0 },
  { k:'gold',  n:'金币收益', f:'x' }
];
var SIDE_EXTRA = [
  { k:'reso',     n:'共鸣效果',   f:'x' },
  { k:'splash',   n:'溅射',       f:'x' },
  { k:'aura',     n:'光环',       f:'x' },
  { k:'combo',    n:'连杀加成',   f:'x' },
  { k:'critDmg',  n:'暴击倍率',   f:'x' },
  { k:'bossDmg',  n:'对 BOSS',    f:'p', d:0 },
  { k:'elBoost',  n:'元素专精',   f:'p', d:0 },
  { k:'splashDmg',n:'溅射伤害',   f:'p', d:0 },
  { k:'dotAdd',   n:'毒伤附加',   f:'n', d:0 },
  { k:'slowAdd',  n:'减速加成',   f:'p', d:0 },
  { k:'pierceAdd',n:'破甲',       f:'p', d:0 },
  { k:'costCut',  n:'建塔折扣',   f:'p', d:0 },
  { k:'interest', n:'金库利息',   f:'p', d:0 },
  { k:'regen',    n:'每波回血',   f:'n', d:0 },
  { k:'shieldHP', n:'护盾',       f:'n', d:0 }
];
/* 天气效果字段 → 中文名（用于把天气的正面/负面拆成「加成」「减益」两栏）*/
var WX_EFF_NAME = {
  dmg:'全塔伤害', fireDmg:'火塔伤害', iceSlow:'冰塔减速强度', iceSlowT:'冰塔减速时长',
  dot:'毒伤', splash:'溅射范围', thunderChain:'雷塔链弹', physCrit:'物理塔暴击率',
  physAntiArmor:'物理破甲', healCut:'医疗兵治疗量', enemySpeed:'敌人移速',
  enemyArmor:'敌人护甲', fireRate:'火塔攻速', sniperRange:'狙击射程',
  nonPoisonDmg:'非毒塔伤害', auraOff:'辅助塔光环'
};
function sideFmt(v, f, def){
  if (f === 'p') return (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
  if (f === 'n') return (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  return '×' + (Math.round(v * 100) / 100).toFixed(2);
}
function sideIsDefault(v, def){ return def === 0 ? (v === 0) : (Math.abs(v - 1) < 1e-9); }
/* 天气带来的正负影响（数据驱动：读 wx().eff，正数进加成、负数进减益）*/
function wxSplit(){
  var out = { up:[], down:[] }, e = wx().eff || {};
  for (var k in e){
    if (!e.hasOwnProperty(k)) continue;
    var nm = WX_EFF_NAME[k] || k;
    var v = e[k];
    if (k === 'auraOff'){ if (v) out.down.push({ n:nm, v:'失效' }); }
    else if (v > 0) out.up.push({ n:nm, v:sideFmt(v, (k === 'thunderChain') ? 'n' : 'p') });
    else if (v < 0) out.down.push({ n:nm, v:sideFmt(v, 'p') });
  }
  return out;
}
/* 无尽契约带来的负面（只有真的被选了才出现）*/
function pactDebuffs(){
  var d = [];
  if (PACT.hp > 1)      d.push({ n:'敌人血量', v:'×' + (Math.round(PACT.hp * 100) / 100).toFixed(2) });
  if (PACT.speed > 1)   d.push({ n:'敌人移速', v:'×' + (Math.round(PACT.speed * 100) / 100).toFixed(2) });
  if (PACT.armor > 0)   d.push({ n:'敌人护甲', v:'+' + Math.round(PACT.armor * 100) + '%' });
  if (PACT.count > 1)   d.push({ n:'敌人数量', v:'×' + (Math.round(PACT.count * 100) / 100).toFixed(2) });
  if (PACT.gold < 1)    d.push({ n:'金币收益', v:Math.round((PACT.gold - 1) * 100) + '%' });
  if (PACT.bossEvery < 10) d.push({ n:'BOSS 频率', v:'每 ' + PACT.bossEvery + ' 波' });
  return d;
}
function pactBuffs(){
  var d = [];
  if (PACT.gold > 1) d.push({ n:'金币收益', v:'+' + Math.round((PACT.gold - 1) * 100) + '%' });
  return d;
}
function sideRow(n, v, cls){
  return '<div class="swRow' + (cls ? ' ' + cls : '') + '"><span class="k">' + n + '</span><span class="v">' + v + '</span></div>';
}
function sideCardLine(c){
  var rar = RARITY[c.rar] || RARITY.common;
  var ic = c.elKey && ELEMS[c.elKey] ? ELEMS[c.elKey].icon : '🌐';
  return '<div class="swCardLine" style="color:' + rar.color + ';">'
    + '<span class="rn">' + rar.name + '</span>'
    + '<span style="color:#dfe8f5;">' + ic + ' ' + (c.name || c.id || '?') + '</span></div>';
}
function swBodyHtml(){
  var h = '', i, k;
  var w = wx(), sp = wxSplit();
  /* ① 天气 */
  h += '<div class="swSec"><div class="swT">🌤 当前天气</div>'
    + '<div class="swRow"><span class="k" style="font-size:13px;font-weight:700;color:#ffd76a;">'
    + w.icon + ' ' + w.name + '</span></div>'
    + '<div class="udesc" style="font-size:10.5px;color:#8fb4dc;line-height:1.45;">' + w.desc + '</div>'
    + '<button class="btn" id="swWxMore" style="margin-top:5px;padding:5px 8px;font-size:11px;width:100%;letter-spacing:0;'
    + 'border-radius:8px;border-color:rgba(140,200,255,.4);background:rgba(24,44,74,.9);color:#9fd0ff;">📖 全部天气说明</button></div>';
  /* ② 天气影响（有就列）*/
  if (sp.up.length || sp.down.length){
    h += '<div class="swSec"><div class="swT">🌦 天气影响</div>';
    for (i = 0; i < sp.up.length; i++) h += sideRow(sp.up[i].n, sp.up[i].v);
    for (i = 0; i < sp.down.length; i++) h += sideRow(sp.down[i].n, sp.down[i].v, 'bad');
    h += '</div>';
  }
  /* ③ 全局加成 */
  h += '<div class="swSec"><div class="swT">📈 全局加成</div>';
  for (i = 0; i < SIDE_MAIN.length; i++){
    var r = SIDE_MAIN[i], v = BUFFS[r.k];
    if (v === undefined) continue;
    h += sideRow(r.n, sideFmt(v, r.f), sideIsDefault(v, r.d || r.d === 0 ? r.d : 1) ? 'dim' : '');
  }
  for (i = 0; i < SIDE_EXTRA.length; i++){
    var r2 = SIDE_EXTRA[i], v2 = BUFFS[r2.k];
    if (v2 === undefined || sideIsDefault(v2, r2.d || r2.d === 0 ? r2.d : 1)) continue;   /* 没吃到就不列，保持干净 */
    h += sideRow(r2.n, sideFmt(v2, r2.f));
  }
  h += '</div>';
  /* ④ 减益 */
  var db = pactDebuffs(), pb = pactBuffs();
  for (i = 0; i < pb.length; i++) db.push(pb[i]);
  if (db.length){
    h += '<div class="swSec"><div class="swT">🔻 减益（代价）</div>';
    for (i = 0; i < db.length; i++) h += sideRow(db[i].n, db[i].v, 'bad');
    h += '</div>';
  }
  /* ⑤ 本局已获得的强化卡 */
  h += '<div class="swSec"><div class="swT">🎴 本局强化卡 · ' + runCards.length + ' 张</div>';
  if (!runCards.length){
    h += '<div style="font-size:10.5px;color:#6c7f9b;">还没有抽过卡（每波结束三选一）</div>';
  } else {
    var show = runCards.slice(Math.max(0, runCards.length - 10));
    if (runCards.length > show.length) h += '<div style="font-size:10px;color:#6c7f9b;">…前 ' + (runCards.length - show.length) + ' 张已折叠</div>';
    for (i = 0; i < show.length; i++) h += sideCardLine(show[i]);
  }
  h += '</div>';
  /* ⑥ 已激活套装 */
  var sets = [];
  for (k in ELEM_SETS){ if (setOn(k)) sets.push(ELEM_SETS[k]); }
  h += '<div class="swSec"><div class="swT">🧩 已激活套装 · ' + sets.length + '</div>';
  if (!sets.length){
    h += '<div style="font-size:10.5px;color:#6c7f9b;">集齐 3 张同元素专属卡即激活</div>';
  } else {
    for (i = 0; i < sets.length; i++){
      h += '<div style="font-size:11px;color:#ffd76a;font-weight:700;">' + sets[i].name + '</div>'
        + '<div class="udesc" style="font-size:10px;color:#8fb4dc;line-height:1.4;">' + sets[i].desc + '</div>';
    }
  }
  h += '</div>';
  return h;
}
function sideToggle(force){
  sideOpen = (force === undefined) ? !sideOpen : !!force;
  try { localStorage.setItem(SIDE_KEY, sideOpen ? '1' : '0'); } catch (e) {}
  sideSig = '';                       /* 强制重绘 */
  updateSideBar();
}
function updateSideBar(){
  var win = document.getElementById('sideWin');
  if (!win) return;
  if (!running){ win.style.display = 'none'; return; }
  win.style.display = '';
  /* 签名：所有会显示的值 —— 没变就什么都不做（updateHud 每帧都调这里）*/
  var sig = [sideOpen ? 1 : 0, weather, runCards.length, PACT.hp, PACT.speed, PACT.armor, PACT.count,
             PACT.gold, PACT.bossEvery].join('|');
  for (var i = 0; i < SIDE_MAIN.length; i++) sig += '|' + BUFFS[SIDE_MAIN[i].k];
  for (var j = 0; j < SIDE_EXTRA.length; j++) sig += '|' + BUFFS[SIDE_EXTRA[j].k];
  for (var k in ELEM_SETS) sig += '|' + (setOn(k) ? 1 : 0);
  sig += '|' + (runCards.length ? (runCards[runCards.length - 1].name || '') : '');
  if (sig === sideSig) return;
  sideSig = sig;
  win.setAttribute('data-open', sideOpen ? '1' : '0');
  /* 折叠时只更新图标带上的角标，绝不动面板 DOM */
  var w = wx(), sp = wxSplit();
  var dbs = pactDebuffs();
  var nSets = 0; for (var s2 in ELEM_SETS) if (setOn(s2)) nSets++;
  var chipDefs = [
    { id:'swWx',   txt:w.icon,        n:0 },
    { id:'swBuff', txt:'📈',          n:1 + sp.up.length },
    { id:'swDeb',  txt:'🔻',          n:sp.down.length + dbs.length },
    { id:'swCard', txt:'🎴',          n:runCards.length },
    { id:'swSet',  txt:'🧩',          n:nSets }
  ];
  for (var c = 0; c < chipDefs.length; c++){
    var ch = document.getElementById(chipDefs[c].id);
    if (!ch) continue;
    var badge = chipDefs[c].n > 0 ? '<span class="n">' + (chipDefs[c].n > 99 ? '99+' : chipDefs[c].n) + '</span>' : '';
    ch.innerHTML = chipDefs[c].txt + badge;
    ch.classList[chipDefs[c].n > 0 ? 'remove' : 'add']('dim');
  }
  var body = document.getElementById('swBody');
  if (body && sideOpen){
    body.innerHTML = swBodyHtml();
    var more = document.getElementById('swWxMore');
    if (more) more.addEventListener('click', function(ev){ ev.stopPropagation(); showWeatherHelp(); });
    var inner = document.getElementById('swStrip');
    if (inner) inner.title = '点一下收起';
  }
}
function updateHud(){''',
    '信息栏渲染内核')

# ---------- 6. updateHud 里同步 ----------
rep('''  renderSkillBar();          /* v8.5：技能栏冷却/选择态同步 */''',
    '''  renderSkillBar();          /* v8.5：技能栏冷却/选择态同步 */
  updateSideBar();           /* v8.18：左侧信息栏（内部有签名比对，值没变就不动 DOM）*/''',
    'updateHud 同步信息栏')

# ---------- 7. 绑定图标带点击 ----------
rep('''  on('homeEndlessBtn', function(){ enterEndless(); });        /* v8.18：首页直接进无尽 */''',
'''  /* v8.18 左侧信息栏：点天气图标直接看天气说明，点其它图标展开/收起详情 */
  (function(){
    var strip = document.getElementById('swStrip');
    if (strip) strip.addEventListener('click', function(e){
      e.stopPropagation();
      var t = e.target;
      if (t && t.id === 'swWx'){ showWeatherHelp(); return; }
      sideToggle();
    });
    try { sideOpen = (localStorage.getItem(SIDE_KEY) === '1'); } catch (er) { sideOpen = false; }
    sideSig = ''; updateSideBar();
  })();
  on('homeEndlessBtn', function(){ enterEndless(); });        /* v8.18：首页直接进无尽 */''',
    '绑定信息栏交互')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.18d 左侧信息栏补丁完成')
