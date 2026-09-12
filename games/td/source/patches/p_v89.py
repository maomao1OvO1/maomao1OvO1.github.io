# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① 每日挑战系统
rep("""/* ===== v8.8 敌人词缀 =====""",
"""/* ===== v8.9 每日挑战（含种子）=====
   毛毛发的方案里「短局 + 长线、每日挑战、种子分享」那一条。
   每天一个固定种子：固定天气 + 固定的敌人/经济修正 + 指定的关卡；
   通关给星核（当天首次通关才给），同一天所有玩家的挑战完全相同 → 可分享、可比拼。 */
var isDaily = false, dailySeed = 0, dailyMods = null;
function todaySeed(){
  var d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function buildDailyMods(seed){
  var ws = WEATHER_KEYS[seed % WEATHER_KEYS.length];
  var hp = 1 + ((seed % 5) * 0.10);              /* 敌人血量 1.00 ~ 1.40 */
  var gold = 1 + ((Math.floor(seed / 7) % 4) * 0.15);  /* 金币 1.00 ~ 1.45（给点补偿） */
  var cnt = (seed % 3 === 0) ? 1.20 : 1.0;       /* 敌人数量偶尔 +20% */
  return { weather: ws, hp: hp, gold: gold, count: cnt, lv: seed % LEVELS.length };
}
function dailyDesc(m){
  return WEATHERS[m.weather].icon + ' 天气锁定「' + WEATHERS[m.weather].name + '」'
    + '　敌人血量 ×' + m.hp.toFixed(2)
    + '　击杀金币 ×' + m.gold.toFixed(2)
    + (m.count > 1 ? '　敌人数量 ×' + m.count.toFixed(2) : '');
}
function dailyDoneToday(){
  return prog.daily === String(todaySeed());
}
function startDaily(fromNode){
  dailySeed = todaySeed();
  var m = buildDailyMods(dailySeed);
  dailyMods = m;
  isDaily = true;
  startLevel(m.lv);                       /* 先正常开局（会重置天气/契约/套装等） */
  WX_LOCK = m.weather;                    /* 再套上挑战规则：天气锁定 */
  PACT.hp = m.hp;                         /* 敌人血量修正 */
  PACT.gold = m.gold;                     /* 金币修正 */
  PACT.count = m.count;                   /* 数量修正 */
  elemCache = {};
  var tipEl = document.getElementById('lvName');
  if (tipEl) tipEl.textContent = '📅 每日挑战';
  showBanner('📅 每日挑战 #' + dailySeed);
  showTip('今日挑战：' + dailyDesc(m) + (dailyDoneToday() ? '（今天已领过奖励，重打不再给星核）' : '　通关可得星核'));
}
/* ===== v8.8 敌人词缀 =====""", '每日挑战系统')

# ② 通关时结算每日挑战奖励
rep("""function levelClear(){
  running = false; paused = false;
  bgmSetVol(0.30);""",
"""function levelClear(){
  running = false; paused = false;
  bgmSetVol(0.30);
  /* v8.9 每日挑战：当天首次通关给星核（剩余血越多给得越多） */
  if (isDaily){
    var dEl = document.getElementById('clearNewRec');
    if (!dailyDoneToday()){
      var gain = 2 + Math.floor(hp / 5);
      addStarcore(gain);
      prog.daily = String(todaySeed());
      if (dEl) dEl.textContent = '📅 每日挑战完成！获得 ' + gain + ' 星核（累计 ' + starcore() + '）';
      addFloat(W / 2, H * 0.42, '📅 每日挑战 +' + gain + ' 星核', '#ffd76a');
    } else if (dEl){
      dEl.textContent = '📅 今天的每日挑战已领过奖励（' + dailySeed + '）';
    }
    isDaily = false;
  }""", '每日挑战结算')

# ③ 开局清掉挑战标记（普通开局不该继承）
rep("  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */",
    "  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */\n  isDaily = false; if (typeof WX_LOCK !== 'undefined' && !window.__WX_KEEP) WX_LOCK = false;   /* v8.9：普通开局清掉每日挑战残留 */", '开局清挑战标记', cnt=2)

# ④ 选关地图末尾加「每日挑战」节点
rep("""  /* 节点之间画连线（垂直位置取两侧节点中点，形成蜿蜒路径感） */""",
"""  /* v8.9 每日挑战节点（放在无尽之后，金色描边 + 今日种子） */
  (function(){
    var ds = todaySeed(), dm = buildDailyMods(ds), done = dailyDoneToday();
    var node = document.createElement('div');
    node.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;width:96px;flex:0 0 auto;margin-top:46px;';
    var b = document.createElement('button');
    b.className = 'btn'; b.id = 'dailyBtn';
    b.style.cssText = 'width:62px;height:62px;border-radius:50%;padding:0;font-size:20px;font-weight:800;'
      + 'border-color:rgba(255,140,200,.85);background:linear-gradient(180deg,rgba(120,24,86,.96),rgba(70,12,50,.96));color:#ffd0ee;';
    b.textContent = '📅';
    b.title = '每日挑战 #' + ds + '：' + dailyDesc(dm);
    b.addEventListener('click', function(e){ e.stopPropagation(); startDaily(true); });
    node.appendChild(b);
    var sn = document.createElement('div');
    sn.style.cssText = 'font-size:10px;height:13px;color:#ffd0ee;';
    sn.textContent = done ? '已通关' : '今日';
    node.appendChild(sn);
    var nm = document.createElement('div');
    nm.style.cssText = 'font-size:10.5px;color:#ffb0dd;white-space:nowrap;font-weight:700;';
    nm.textContent = '每日挑战';
    node.appendChild(nm);
    var wv = document.createElement('div');
    wv.style.cssText = 'font-size:9px;color:#7d8ba3;';
    wv.textContent = '#' + String(ds).slice(4);
    node.appendChild(wv);
    nodes.push(node);
  })();
  /* 节点之间画连线（垂直位置取两侧节点中点，形成蜿蜒路径感） */""", '每日挑战节点')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.9 每日挑战补丁完成 ---')
