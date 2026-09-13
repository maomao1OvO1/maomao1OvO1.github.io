/* ══════════════════════════════════════════════════════════════════════════
 * 13-hud.js —— HUD 与提示：金币 / 波次 / 血条，以及音效与 BGM（纯 Web Audio 合成）
 *
 * 来源：game.html 第 4692-5358 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= HUD / 提示 ================= */
/* ===== v8.18 左侧常驻信息栏：渲染内核 =====
   毛毛：「选的那个卡片和 debuff 你都列出来，有什么加成有什么 debuff 写到左边」
   内容：①天气 ②天气影响（加成/减益）③全局加成 ④减益（无尽契约 + 天气负面）
        ⑤本局已获得的强化卡 ⑥已激活套装。
   性能：updateHud() 每帧都会调用这里 → 先拼一个「签名」，值没变就**直接 return**，不重建 DOM。 */
var sideOpen = false;
/* 左侧信息栏上次渲染时的「内容签名」：签名没变就跳过 DOM 重建（每帧刷新性能关键）*/
var sideSig = '';
/* 左侧信息栏展开状态的 localStorage 键 */
var SIDE_KEY = 'td_sideOpen';
/* 左侧信息栏「主加成」行的定义表：k 取 BUFFS 的字段 · n 显示名 · f 格式(p 百分比/x 倍率) · d 默认值 */
var SIDE_MAIN = [
  { k:'dmg',   n:'全塔伤害', f:'x' },
  { k:'rate',  n:'攻速',     f:'x' },
  { k:'range', n:'射程',     f:'x' },
  { k:'crit',  n:'暴击率',   f:'p', d:0 },
  { k:'gold',  n:'金币收益', f:'x' }
];
/* 左侧信息栏「附加加成」行的定义表（共鸣、套装、词条等，格式同上）*/
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
/* 左侧信息栏的数值格式化：p=百分比、n=绝对值、其余按倍率显示 */
function sideFmt(v, f, def){
  if (f === 'p') return (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
  if (f === 'n') return (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  return '×' + (Math.round(v * 100) / 100).toFixed(2);
}
/* 某一行是不是「没吃到加成」的默认值（乘区默认 1、加法区默认 0）—— 用来决定是否置灰/隐藏 */
function sideDefOf(row){ return (row.d === undefined) ? 1 : row.d; }
/* 判断某加成是否还是默认值（乘区 1 / 加法区 0），用于决定这一行是否置灰或隐藏 */
function sideIsDefault(v, def){ return (def === 0) ? (v === 0) : (Math.abs(v - 1) < 1e-9); }
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
/* 汇总当前无尽契约带来的收益条目（左侧信息栏显示「这局签了什么」）*/
function pactBuffs(){
  var d = [];
  if (PACT.gold > 1) d.push({ n:'金币收益', v:'+' + Math.round((PACT.gold - 1) * 100) + '%' });
  return d;
}
/* 生成左侧信息栏的一行 HTML（名称 + 数值）*/
function sideRow(n, v, cls){
  return '<div class="swRow' + (cls ? ' ' + cls : '') + '"><span class="k">' + n + '</span><span class="v">' + v + '</span></div>';
}
/* 生成左侧信息栏里一枚强化卡的行 HTML（稀有度 + 图标 + 卡名）*/
function sideCardLine(c){
  var rar = RARITY[c.rar] || RARITY.common;
  var ic = c.elKey && ELEMS[c.elKey] ? ELEMS[c.elKey].icon : '🌐';
  return '<div class="swCardLine" style="color:' + rar.color + ';">'
    + '<span class="rn">' + rar.name + '</span>'
    + '<span style="color:#dfe8f5;">' + ic + ' ' + (c.name || c.id || '?') + '</span></div>';
}
/* 拼装左侧滑动信息栏的整块 HTML：当前天气、契约、套装、本局强化卡分组列出 */
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
    h += sideRow(r.n, sideFmt(v, r.f), sideIsDefault(v, sideDefOf(r)) ? 'dim' : '');
  }
  for (i = 0; i < SIDE_EXTRA.length; i++){
    var r2 = SIDE_EXTRA[i], v2 = BUFFS[r2.k];
    if (v2 === undefined || sideIsDefault(v2, sideDefOf(r2))) continue;   /* 没吃到就不列，保持干净 */
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
/* 展开/收起左侧信息栏（force 可指定目标状态），并把开关状态存进 localStorage */
function sideToggle(force){
  sideOpen = (force === undefined) ? !sideOpen : !!force;
  try { localStorage.setItem(SIDE_KEY, sideOpen ? '1' : '0'); } catch (e) {}
  sideSig = '';                       /* 强制重绘 */
  updateSideBar();
}
/* 刷新左侧信息栏：先做「内容签名」比对，值没变就直接返回，避免每帧重建 DOM */
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
  try { win.dataset.open = sideOpen ? '1' : '0'; } catch (e) {}      /* dataset 在真实 DOM 里会同步 data-open 属性 */
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
    try { ch.classList[chipDefs[c].n > 0 ? 'remove' : 'add']('dim'); } catch (e) {}
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
/* ===== v8.23 版本信息面板 =====
   毛毛要求：「以后别人反馈 bug 就能看到版本之类的详细信息，点开可以查看，然后再点一下可以关上」。
   所以主界面右上角的版本号按钮就是入口：点一下弹出，点「关闭」或再点一次版本号收起。
   内容尽量把「报 bug 需要的信息」一次给全：版本 / 构建号 / 环境 / 存档进度 / 许可信息，
   并且提供一个「复制全部信息」按钮，别人一键复制就能贴出来。 */
function verInfoRows(){
  var ua = '';
  try { ua = navigator.userAgent || ''; } catch (e) { ua = ''; }
  var android = (ua.match(/Android\s+([0-9.]+)/) || [])[1] || '未知';
  var chrome = (ua.match(/Chrome\/([0-9.]+)/) || [])[1] || '未知';
  var model = (ua.match(/;\s*([^;)]+)\s+Build\//) || [])[1] || '未知';
  var sc = (typeof W === 'number' && typeof H === 'number') ? (W + ' × ' + H) : '未知';
  var dpr = (typeof devicePixelRatio === 'number') ? devicePixelRatio : 1;
  var best = 0, ebest = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) {}
  try { ebest = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) {}
  var stars = 0, k;
  if (prog && prog.stars) for (k in prog.stars) stars += (prog.stars[k] || 0);
  var nAch = 0; try { nAch = achCount(); } catch (e) {}
  var nTower = 0; try { for (k in ELEMS) nTower++; } catch (e) {}
  var nCard = 0; try { nCard = BUFF_POOL.length; } catch (e) {}
  return [
    ['游戏版本',  'v' + gameVerStr() + '（构建号 ' + BUILD_CODE + '）'],
    ['构建日期',  '2026-09-13'],
    ['本包内容',  nTower + ' 座塔 · ' + LEVELS.length + ' 关 · ' + nCard + ' 张强化卡 · ' + ACHIEVEMENTS.length + ' 个成就'],
    ['许可',      'MIT · 完全开源，可自由修改分发（已移除加固）'],
    ['', ''],
    ['系统版本',  'Android ' + android],
    ['机型',      model],
    ['WebView',   'Chrome/WebView ' + chrome],
    ['屏幕',      sc + ' 逻辑像素 · DPR ' + dpr],
    ['', ''],
    ['最高波次',  best || '—'],
    ['无尽最高',  (ebest || '—') + ' 波'],
    ['已解锁',    (prog && prog.unlocked ? prog.unlocked : 1) + ' / ' + LEVELS.length + ' 关'],
    ['星数',      stars + ' / ' + (LEVELS.length * 3)],
    ['成就',      nAch + ' / ' + ACHIEVEMENTS.length],
    ['', ''],
    ['源码与文档', 'github.com/maomao1OvO1/maomao1OvO1.github.io → games/td/']
  ];
}
/* 版本信息面板的纯文本版（分享/复制用，供剪贴板按钮调用）*/
function verInfoText(){
  var rows = verInfoRows(), out = ['《共鸣之塔》版本信息'];
  for (var i = 0; i < rows.length; i++){
    if (!rows[i][0]){ out.push(''); continue; }
    out.push(rows[i][0] + '：' + rows[i][1]);
  }
  return out.join('\n');
}
/* 打开版本信息弹层：按行渲染版本号、构建号、更新地址等信息 */
function showVerInfo(){
  var rows = verInfoRows(), h = '';
  for (var i = 0; i < rows.length; i++){
    if (!rows[i][0]){ h += '<div style="height:7px"></div>'; continue; }
    h += '<div style="display:flex;gap:10px;justify-content:space-between;padding:6px 10px;border-radius:9px;'
      + 'background:rgba(22,32,56,.8);border:1px solid rgba(120,180,255,.2);margin-bottom:4px;">'
      + '<span style="flex:0 0 auto;font-size:11.5px;color:#8fb4dc;">' + rows[i][0] + '</span>'
      + '<span style="flex:1;text-align:right;font-size:12px;color:#eaf3ff;overflow-wrap:anywhere;">' + rows[i][1] + '</span>'
      + '</div>';
  }
  document.getElementById('verBody').innerHTML = h;
  document.getElementById('verOv').classList.remove('hidden');
  try { SFX.click(); } catch (e) {}
}
/* 关闭版本信息弹层 */
function hideVerInfo(){
  document.getElementById('verOv').classList.add('hidden');
  try { SFX.click(); } catch (e) {}
}
/* 版本信息弹层的开关切换（顶部版本号按钮点击时调用）*/
function toggleVerInfo(){
  var el = document.getElementById('verOv');
  if (el && !el.classList.contains('hidden')) hideVerInfo(); else showVerInfo();
}
/* 刷新 HUD：护盾、技能栏、左侧信息栏、天气框、金币/血量/波次等全部顶部状态（每帧调用）*/
function updateHud(){
  var _shEl = document.getElementById('shieldTxt');
  if (_shEl) _shEl.textContent = (BUFFS && BUFFS.shieldHP > 0) ? ('🛡' + BUFFS.shieldHP) : '';
  renderSkillBar();          /* v8.5：技能栏冷却/选择态同步 */
  updateSideBar();           /* v8.18：左侧信息栏（内部有签名比对，值没变就不动 DOM）*/
  var _wxEl = document.getElementById('wxBox');
  if (_wxEl){
    var _wo = wx();
    _wxEl.textContent = _wo.icon + ' ' + _wo.name;
    _wxEl.title = _wo.desc;
  }
  var _gEl = document.getElementById('gold'), _gTxt = goldText();
  _gEl.textContent = _gTxt;
  /* v7.9：位数变多时自动缩小（无尽后期几十位金币也不会把顶部状态条撑爆） */
  _gEl.style.fontSize = _gTxt.length > 10 ? Math.max(10.5, 15 - (_gTxt.length - 10) * 0.65).toFixed(1) + 'px' : '';
  document.getElementById('wave').textContent = wave;
  document.getElementById('hpfill').style.width = Math.max(0, hp / MAXHP * 100) + '%';
}
/* 底部提示语剩余显示秒数（showTip 设值，draw 里倒计时）*/
var tipT = 0;
var HINT_ON = true;          // 新手提示栏只在第 1 关显示
/* 显示/隐藏新手提示栏（仅第 1 关显示）*/
function hintBar(on){
  HINT_ON = !!on;
  var te = document.getElementById('tip');
  if (te) te.style.display = on ? 'block' : 'none';
}
/* 屏幕底部弹一条黄色提示语，1.6 秒后自动淡出（各类拦截与反馈都用它）*/
function showTip(t){
  var el = document.getElementById('tip');
  el.textContent = t; el.style.color = '#ffd76a'; tipT = 1.6;
}
/* 音频主增益节点（WebAudio 输出链的入口，懒创建）*/
var masterGain = null;
/* 确保音频主输出链存在（增益 + 压缩器），返回主增益节点；WebAudio 不可用时返回 null */
function ensureMaster(){
  if (!AC) return null;
  if (!masterGain){
    masterGain = AC.createGain(); masterGain.gain.value = 0.9;
    var comp = AC.createDynamicsCompressor ? AC.createDynamicsCompressor() : null;
    if (comp){ masterGain.connect(comp); comp.connect(AC.destination); }
    else masterGain.connect(AC.destination);
  }
  return masterGain;
}
/* ================= 音效 / 音乐（纯 Web Audio 合成，不依赖任何音频素材）=================
   tone/chord/noiseSfx 负责发声，SFX 是各类界面的音色配方，MUSIC/M_CHORDS 是内置合成 BGM，
   bgmDeck/bgmCur 则为打包进来的真人 BGM 做双声道交叉淡化。 */
var SFX_ON = true;    // 音效总开关（设置面板可关；持久化到 td_settings）
var MUSIC_ON = true;  // 背景音乐开关（独立于音效）
var sfxBudget = 10;   // 每帧允许播放的音效数量：倍速越高给得越少，
                      // 否则 100x 时一帧内几十个子步同时开火 → 音效叠在一起爆响
function tone(o){
  if (!SFX_ON && !o.music) return;      // 音乐走 music 标志，与「音效」开关互不影响
  if (!AC) return; var m = ensureMaster(); if (!m) return;
  try {
    var t0 = AC.currentTime + (o.delay || 0);
    var osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.freq2), t0 + o.dur);
    var v = o.vol || 0.05;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    if (o.pan && AC.createStereoPanner){                 // 按屏幕位置做声像（左/右）
      var pn = AC.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); pn.connect(m);
    } else g.connect(m);
    osc.start(t0); osc.stop(t0 + o.dur + 0.03);
  } catch (e) {}
}
/* 播放一段程序合成的噪声音效（爆炸/受击等），支持延迟与左右声像 */
function noiseSfx(dur, vol, cut, delay, pan){
  if (!SFX_ON) return;
  if (!AC) return; var m = ensureMaster(); if (!m) return;
  try {
    var t0 = AC.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(AC.sampleRate * dur));
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
    var src = AC.createBufferSource(); src.buffer = buf;
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut || 1200;
    var g = AC.createGain(); g.gain.value = vol || 0.08;
    src.connect(f); f.connect(g);
    if (pan && AC.createStereoPanner){
      var pn2 = AC.createStereoPanner(); pn2.pan.value = pan; g.connect(pn2); pn2.connect(m);
    } else g.connect(m);
    src.start(t0);
  } catch (e) {}
}
/* 同时播放多个音高组成和弦（依次带极小延迟，避免相位重叠）*/
function chord(freqs, dur, vol, type){
  for (var i = 0; i < freqs.length; i++) tone({ freq:freqs[i], dur:dur, vol:vol, type:type || 'sine', delay:i * 0.012 });
}
/* ===== v5.7 音效增强 ===== */
/* 屏幕 x → 声像（-0.85 左 ←→ +0.85 右） */
function panOf(x){
  if (!W) return 0;
  var p = (x / W) * 1.7 - 0.85;
  return p < -0.85 ? -0.85 : (p > 0.85 ? 0.85 : p);
}
/* 八种塔各自的「开火音」：音色/音高完全不同，闭眼也能听出哪座塔在打 */
var TOWER_VOICE = {
  fire:    { n:[0.14, 0.045, 900],  f1:300,  f2:90,   dur:0.16, vol:0.045, type:'sawtooth' },
  ice:     { n:[0.06, 0.02, 4200],  f1:2300, f2:1500, dur:0.12, vol:0.026, type:'sine' },
  thunder: { n:[0.06, 0.04, 3200],  f1:1400, f2:380,  dur:0.09, vol:0.030, type:'square' },
  poison:  { n:[0.10, 0.02, 600],   f1:220,  f2:165,  dur:0.22, vol:0.030, type:'sine' },
  phys:    { n:null,                f1:520,  f2:180,  dur:0.08, vol:0.040, type:'square' },
  sniper:  { n:[0.20, 0.055, 2600], f1:1800, f2:260,  dur:0.20, vol:0.055, type:'triangle' },
  mortar:  { n:[0.10, 0.05, 500],   f1:140,  f2:48,   dur:0.26, vol:0.060, type:'sine' },
  support: null
};
/* 炮塔开火音效：按塔的元素音色播放，并按屏幕位置做左右声像；受每帧音效预算限流 */
function towerShot(elem, x){
  var v = TOWER_VOICE[elem];
  if (!v) return;
  if (sfxBudget <= 0) return;      // 倍速限流：超出本帧预算就静默
  sfxBudget--;
  var pan = panOf(x);
  if (v.n) noiseSfx(v.n[0], v.n[1], v.n[2], 0, pan);
  tone({ freq:v.f1, freq2:v.f2, dur:v.dur, vol:v.vol, type:v.type, pan:pan });
}
/* 十一种怪各自的「阵亡音」 */
var DIE_VOICE = {
  normal:  { n:null,                 f1:620,  f2:1320, dur:0.10, vol:0.045, type:'triangle' },
  fast:    { n:null,                 f1:900,  f2:1900, dur:0.08, vol:0.040, type:'triangle' },
  armor:   { n:[0.14, 0.05, 900],    f1:260,  f2:90,   dur:0.18, vol:0.060, type:'square' },
  shield:  { n:null,                 f1:1500, f2:2600, dur:0.14, vol:0.045, type:'sine' },
  healer:  { n:null,                 f1:1200, f2:1750, dur:0.16, vol:0.040, type:'sine' },
  splitter:{ n:[0.12, 0.04, 1400],   f1:400,  f2:150,  dur:0.20, vol:0.055, type:'sawtooth' },
  spawn2:  { n:null,                 f1:800,  f2:1500, dur:0.07, vol:0.030, type:'triangle' },
  bomber:  { n:[0.25, 0.07, 700],    f1:160,  f2:60,   dur:0.28, vol:0.075, type:'sawtooth' },
  elite:   { n:null,                 f1:700,  f2:1400, dur:0.22, vol:0.060, type:'square' },
  charger: { n:[0.18, 0.06, 800],    f1:200,  f2:70,   dur:0.24, vol:0.065, type:'square' }
};
/* 敌人死亡音效：BOSS 走专用尾音，其余按敌人类型取音色，并受音效预算限流 */
function enemyDie(type, combo, x){
  if (sfxBudget <= 0) return;      // 倍速限流
  sfxBudget--;
  var pan = panOf(x);
  if (type === 'boss'){ SFX.bossKill(); return; }        // BOSS 保留原有的爆炸尾音
  var v = DIE_VOICE[type] || DIE_VOICE.normal;
  var k = 1 + Math.min(combo || 0, 25) * 0.03;           // 连杀越多音调越高（保留老手感）
  if (v.n) noiseSfx(v.n[0], v.n[1], v.n[2], 0, pan);
  tone({ freq:v.f1 * k, freq2:v.f2 * k, dur:v.dur, vol:v.vol, type:v.type, pan:pan });
}
/* ===== v6.4 背景音乐：纯 Web Audio 合成（无素材），4 小节循环 Am-F-C-G + 动态变化 ===== */
var MUSIC = { t: 0, beat: 0, bpm: 92 };
/* 内置合成 BGM 的 4 小节和弦进行（Am-F-C-G，每个数组是一个小节的和弦音高）*/
var M_CHORDS = [
  [220.00, 261.63, 329.63],   // Am
  [174.61, 220.00, 261.63],   // F
  [196.00, 246.94, 329.63],   // C
  [196.00, 246.94, 293.66]    // G
];
/* 与 M_CHORDS 逐小节对应的贝斯音高 */
var M_BASS = [110.00, 87.31, 98.00, 98.00];
/* ===== v6.5 真人 BGM（Gods Forbid · CC0 免署名 · OpenGameArt）=====
   优先播放打包进 APK 的音频文件；若设备不支持 ogg 或加载失败，自动回退到内置合成音乐 */
/* ===== v8.18 音乐循环交叉淡化 =====
   毛毛：「那个音乐循环能不能自然一点」→ 原来 <audio loop> 播到曲尾直接跳回开头，
   接缝处听得出「一顿」。改成**双声道交叉淡化**：
   还剩 BGM_XF 秒时让第二个声道从 0 音量渐入、同时把当前声道渐出，
   淡完再交换主从 —— 循环点被叠在一起，听不出接缝。
   两层保险：①两个 <audio> 都保留 loop，万一交叉淡化没跑起来（例如拿不到 duration），
   浏览器仍会像以前一样原生循环，绝不会静音；②新声道的 play() 失败时直接放弃本次淡化。 */
var bgmOK = false;
var BGM_XF = 1.0;                 /* 交叉淡化时长（秒） */
var bgmDeck = [null, null];       /* 两个播放声道 */
var bgmCur = 0;                   /* 当前主声道下标 */
var bgmVol = 0.42;                /* 目标音量（bgmAdapt / bgmSetVol 写入） */
var bgmRate = 1;                  /* 目标速率（bgmAdapt 写入） */
var bgmFade = 0, bgmFadeDur = BGM_XF;   /* 淡化剩余秒数 / 本次淡化总时长 */
var bgmWarm = false;              /* 第二声道是否已预热 */
function bgmDeckEl(i){
  i = i | 0;
  if (!bgmDeck[i]){
    var el = document.getElementById(i === 0 ? 'bgm' : 'bgm2');
    if (!el) return null;
    bgmDeck[i] = el;
    if (!el.__bgmHooked){
      el.__bgmHooked = true;
      el.addEventListener('playing', function(){
        if (bgmDeckEl(bgmCur) === el){ bgmOK = true; bgmWarmUp(); }
      });
      el.addEventListener('error', function(){ if (bgmDeckEl(bgmCur) === el) bgmOK = false; });
      /* 兜底：真播到曲尾还没轮到淡出（比如拿不到 duration）→ 立刻从头接上，不让音乐停 */
      el.addEventListener('ended', function(){
        if (bgmDeckEl(bgmCur) !== el) return;
        try {
          el.currentTime = 0; el.volume = bgmVol;
          var p0 = el.play(); if (p0 && p0.catch) p0.catch(function(){});
        } catch (e) {}
      });
    }
  }
  return bgmDeck[i];
}
/* 第一声道确认能响之后再预热第二声道（避免「打不开音频」的设备白占内存） */
function bgmWarmUp(){
  if (bgmWarm) return;
  var el = bgmDeckEl(1); if (!el) return;
  bgmWarm = true;
  try { el.preload = 'auto'; if (el.load) el.load(); } catch (e) {}
}
/* 设置背景音乐目标音量并立即应用到当前声道（淡化进行中则交给淡化曲线处理）*/
function bgmSetVol(v){
  bgmVol = Math.max(0, Math.min(1, Number(v) || 0));
  if (bgmFade > 0) return;                  /* 淡化中：音量交给淡化曲线，别互相打架 */
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i); if (!e) continue;
    try { e.volume = (i === bgmCur) ? bgmVol : 0; } catch (er) {}
  }
}
/* 设置背景音乐播放速率（倍速游戏时音乐加速）*/
function bgmSetRate(r){
  bgmRate = r;
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i); if (!e) continue;
    try { e.playbackRate = r; } catch (er) {}
  }
}
/* 每帧推进交叉淡化：曲尾前 BGM_XF 秒起淡，淡完交换主从 */
function bgmXfadeTick(rawDt){
  var cur = bgmDeckEl(bgmCur), nx = bgmDeckEl(1 - bgmCur);
  if (!cur || !nx) return;
  if (!MUSIC_ON){ if (bgmFade > 0) bgmFade = 0; return; }
  if (bgmFade > 0){
    bgmFade -= rawDt;
    var t = 1 - Math.max(0, bgmFade) / bgmFadeDur;      /* 0 → 1 */
    if (t > 1) t = 1;
    try { cur.volume = bgmVol * (1 - t); nx.volume = bgmVol * t; } catch (e) {}
    if (bgmFade <= 0){
      bgmFade = 0;
      try { cur.pause(); cur.currentTime = 0; cur.volume = 0; } catch (e) {}
      bgmCur = 1 - bgmCur;                              /* 新声道正式接班，音乐没断 */
      bgmOK = true;
      try { nx.volume = bgmVol; } catch (e) {}
    }
    return;
  }
  /* 只认「当前声道是不是真的在响」——不看 running：通关后 running=false 但音乐仍在放，
     那种状态下同样要把循环点淡过去，不能退回硬接缝。cur.paused 已经足够表达「没在放」。 */
  if (!bgmOK || cur.paused) return;
  var d = 0;
  try { d = cur.duration; } catch (e) {}
  if (!d || !isFinite(d) || d <= 0) return;
  var left = d - (cur.currentTime || 0);
  if (left > 0 && left <= BGM_XF){
    bgmFadeDur = Math.min(BGM_XF, left);
    bgmFade = bgmFadeDur;
    try {
      nx.currentTime = 0; nx.volume = 0; nx.playbackRate = bgmRate;
      var p1 = nx.play(); if (p1 && p1.catch) p1.catch(function(){});   /* 失败就放弃本次淡化，原生 loop 兜底 */
    } catch (e) { bgmFade = 0; }
  }
}
/* 页面进入后台（切 App、锁屏、切页签）时立刻停音乐；回到前台且游戏在跑就接着放 */
document.addEventListener('visibilitychange', function(){
  if (document.hidden) bgmPause();
  else if (running && !paused) bgmPlay();
});
window.addEventListener('pagehide', function(){ bgmPause(); });
window.addEventListener('blur', function(){ setTimeout(function(){ if (document.hidden) bgmPause(); }, 200); });
/* 播放背景音乐（当前主声道），音乐开关关闭时不动作 */
function bgmPlay(){
  if (!MUSIC_ON) return;
  var el = bgmDeckEl(bgmCur);
  if (!el) return;
  try {
    el.volume = bgmVol;
    try { el.playbackRate = bgmRate; } catch (er) {}
    var p = el.play();
    if (p && p.catch) p.catch(function(){ bgmOK = false; });
  } catch (e) { bgmOK = false; }
}
/* 暂停背景音乐并清掉淡化状态（暂停/切后台时调用）*/
function bgmPause(){
  bgmFade = 0;                       /* 停就停干净：别把淡化状态留到下次播放 */
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i);
    if (e){ try { e.pause(); } catch (er) {} }
  }
}
/* v6.6 音乐随局势变化：波次越高略微加快、残血再快一点；BOSS 波音量抬起 */
function bgmAdapt(){
  var rate = 1 + Math.min(0.10, Math.max(0, wave - 1) * 0.006);
  if (hp <= 6) rate += 0.04;
  if (rate > 1.14) rate = 1.14;
  bgmSetRate(rate);
  var vol = 0.42;
  if (wave % 10 === 0) vol = 0.50;      // BOSS 波：抬一点，气势更足
  if (hp <= 6) vol = 0.36;              // 残血：压低，留出心跳点缀
  bgmSetVol(vol);
}
/* 真人 BGM 播放时「局势点缀音」的节流计时 */
var accentT = 0;
/* 音乐节拍推进：先跑真人 BGM 的交叉淡化，再按局势（波次/BOSS）加程序合成的点缀音（每帧调用）*/
function musicTick(rawDt){
  bgmXfadeTick(rawDt);            /* v8.18：真人 BGM 的循环交叉淡化（每帧推进，与合成乐无关） */
  if (bgmOK){                 // 真人 BGM 在响：不再叠整曲，只在关键局势加轻点缀
    if (!running || paused || menuPause) return;
    accentT += rawDt;
    var sp = (wave % 10 === 0) ? 0.5 : 0.75;
    if (accentT >= sp){
      accentT = 0;
      if (wave % 10 === 0) tone({ freq: 44, freq2: 30, dur: 0.5, vol: 0.036, type:'sine', music: true });
      if (hp <= 6) tone({ freq: 1450, dur: 0.04, vol: 0.009, type:'square', music: true });
      if (comboCount >= 15) tone({ freq: 320 + comboCount * 4, dur: 0.05, vol: 0.010, type:'square', music: true });
    }
    return;
  }
  if (!AC || !MUSIC_ON) return;
  if (!running || paused || menuPause) return;      // 暂停 / 开面板时安静（不推进节拍）
  var bpm = 92 + Math.min(22, wave * 1.2);          // 波次越高越急
  if (hp <= 6) bpm += 10;                           // 残血：紧张
  MUSIC.bpm = bpm;
  var spb = 60 / bpm;
  MUSIC.t += rawDt;                                 // 用真实时间 → 倍速下音乐不跟着发疯
  var guard = 0;
  while (MUSIC.t >= spb && guard++ < 8){
    MUSIC.t -= spb;
    var b = MUSIC.beat, inBar = b % 4, bar = Math.floor(b / 4) % 4;
    if (inBar === 0){                               // 小节头：和弦 + 低音 + 底鼓
      var ch = M_CHORDS[bar], i;
      for (i = 0; i < ch.length; i++) tone({ freq: ch[i], dur: 1.4, vol: 0.016, type: 'triangle', delay: i * 0.025, music: true });
      tone({ freq: M_BASS[bar], freq2: M_BASS[bar] * 0.98, dur: 0.7, vol: 0.040, type: 'sine', music: true });
      tone({ freq: 62, freq2: 42, dur: 0.16, vol: 0.030, type: 'sine', music: true });
    } else if (inBar === 2){                        // 第 3 拍：五度低音 + 轻镲
      tone({ freq: M_BASS[bar] * 1.5, dur: 0.35, vol: 0.024, type: 'sine', music: true });
      tone({ freq: 6200, dur: 0.035, vol: 0.005, type: 'triangle', music: true });
    } else {                                        // 其余拍：轻镲
      tone({ freq: 7000, dur: 0.03, vol: 0.004, type: 'triangle', music: true });
    }
    if (wave % 10 === 0 && inBar === 0) tone({ freq: 44, freq2: 30, dur: 0.6, vol: 0.045, type: 'sine', music: true });
    if (hp <= 6 && inBar % 2 === 1) tone({ freq: 1500, dur: 0.04, vol: 0.010, type: 'square', music: true });
    if (comboCount >= 10 && inBar === 3) tone({ freq: 300 + comboCount * 5, dur: 0.06, vol: 0.012, type: 'square', music: true });
    MUSIC.beat = (b + 1) % 16;                      // 4 小节 × 4 拍
  }
}
/* 各类界面/战斗音效的合成配方集合：每个方法内部调 tone/chord/noiseSfx 拼出对应音色 */
var SFX = {
  shoot:   function(){ noiseSfx(0.05, 0.05, 2600); tone({ freq:560 + Math.random()*120, freq2:260, dur:0.06, vol:0.045, type:'square' }); },
  hit:     function(){ tone({ freq:1150 + Math.random()*350, dur:0.045, vol:0.038, type:'triangle' }); },
  kill:    function(c){ var f = 620 + Math.min(c, 25) * 42; tone({ freq:f, freq2:f*2.1, dur:0.1, vol:0.055, type:'triangle' }); },
  bossKill:function(){ noiseSfx(0.6, 0.16, 500); tone({ freq:80, freq2:34, dur:0.6, vol:0.12, type:'sawtooth' }); chord([196,262,330], 0.5, 0.05, 'triangle'); },
  build:   function(){ tone({ freq:392, dur:0.07, vol:0.05 }); tone({ freq:587, dur:0.09, vol:0.05, delay:0.06 }); },
  upgrade: function(){ chord([523, 659, 784], 0.3, 0.045, 'sine'); noiseSfx(0.08, 0.03, 3000); },
  coin:    function(){ tone({ freq:1660, dur:0.045, vol:0.032, type:'sine' }); tone({ freq:2217, dur:0.07, vol:0.028, type:'sine', delay:0.035 }); },
  wave:    function(){ chord([147, 196, 247], 0.55, 0.055, 'triangle'); noiseSfx(0.25, 0.04, 400); },
  combo:   function(n){ var f = 880 + Math.min(n, 20) * 55; chord([f, f * 1.5], 0.13, 0.05, 'square'); },
  crit:    function(){ tone({ freq:2400, freq2:3800, dur:0.07, vol:0.05, type:'sine' }); },
  freeze:  function(){ tone({ freq:2100, freq2:280, dur:0.55, vol:0.07, type:'sine' }); noiseSfx(0.45, 0.05, 5200); },
  hurt:    function(){ tone({ freq:240, freq2:104, dur:0.24, vol:0.09, type:'sawtooth' }); noiseSfx(0.12, 0.06, 700); },
  clear:   function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone({ freq:f, dur:0.24, vol:0.055, type:'triangle', delay:i * 0.11 }); }); },
  gameover:function(){ [330, 262, 196, 147].forEach(function(f, i){ tone({ freq:f, dur:0.4, vol:0.07, type:'sawtooth', delay:i * 0.18 }); }); noiseSfx(0.8, 0.06, 380, 0.1); },
  click:   function(){ tone({ freq:880, dur:0.035, vol:0.035, type:'square' }); },
  panelOpen:  function(){ tone({ freq:520, freq2:880, dur:0.09, vol:0.026, type:'triangle' }); },
  panelClose: function(){ tone({ freq:760, freq2:420, dur:0.08, vol:0.022, type:'triangle' }); },
  bookTab:    function(){ tone({ freq:1040, freq2:1320, dur:0.07, vol:0.026, type:'sine' }); },
  error:   function(){ tone({ freq:196, dur:0.18, vol:0.07, type:'square' }); },
  rage:    function(){ noiseSfx(0.4, 0.10, 300); tone({ freq:150, freq2:60, dur:0.5, vol:0.09, type:'sawtooth' }); chord([110, 165], 0.4, 0.05, 'square'); },
  summon:  function(){ tone({ freq:330, freq2:660, dur:0.22, vol:0.05, type:'triangle' }); tone({ freq:494, dur:0.16, vol:0.04, type:'sine', delay:0.10 }); },
  silence: function(){ tone({ freq:880, freq2:180, dur:0.35, vol:0.05, type:'sine' }); noiseSfx(0.2, 0.03, 1600); },
  /* TUTORIAL_PATCH_V1：教学步骤完成的轻快音（不覆盖任何既有音效方法）*/
  tutOk:   function(){ chord([784, 1047, 1319], 0.18, 0.038, 'triangle'); tone({ freq:1568, dur:0.08, vol:0.024, type:'sine', delay:0.1 }); }
};
/* 最简提示音（固定音高与时长）：按钮反馈与提示用 */
function beep(freq, dur, vol, delay){ tone({ freq:freq, dur:dur, vol:vol, delay:delay }); }
/* WebAudio 上下文（AudioContext）：首次用户交互时由 initAudio() 创建，未支持时为 null */
var AC = null;
/* 初始化 WebAudio（首次用户操作时调用）：已存在则只做 resume，未支持则静默降级为无声 */
function initAudio(){
  if (AC) { if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} } return; }
  var Ctor = window.AudioContext || window.webkitAudioContext;
  if (Ctor) { try { AC = new Ctor(); } catch (e) { AC = null; } }
}

