# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ===== BUG 1：无限刷金币 =====
# 「跳过 · 直接拿 150 金币」原来是「buffOv 可见就能点」→ 技能说明/天赋/商店面板复用了同一个弹层，
# 于是在这些面板里点跳过也能拿钱（随时刷）→ 改成必须处于「波次结束选卡」状态才生效，并且这些面板干脆隐藏它。
rep("""  on('skipBuffBtn', function(){
    if (document.getElementById('buffOv').classList.contains('hidden')) return;
    if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 跳过也算完成 */
    goldAdd(150);""",
"""  on('skipBuffBtn', function(){
    if (document.getElementById('buffOv').classList.contains('hidden')) return;
    /* v8.12 修「无限刷金币」：商店 / 技能说明 / 天赋面板都复用同一个弹层，
       原来只要弹层可见就能点跳过拿钱 → 现在必须真的处在「波次结束三选一」状态才算数 */
    if (!buffChoiceOpen){ showTip('只有每波结束选强化卡时才能跳过换金币'); return; }
    buffChoiceOpen = false;
    if (tutorial) tutMark('buff');      /* TUTORIAL_PATCH_V1：教学第 4 步 —— 跳过也算完成 */
    goldAdd(150);""", '跳过按钮加状态校验')

# 标记位 + 各面板统一处理
rep("""var rerollLeft = 3, banLeft = 2, bannedIds = {}, curPicks = [], banMode = false;""",
"""var rerollLeft = 3, banLeft = 2, bannedIds = {}, curPicks = [], banMode = false;
/* v8.12：只有「波次结束的三选一」才允许用跳过换金币；其它复用同一弹层的面板（商店/技能说明/天赋）一律不算 */
var buffChoiceOpen = false;
function setSkipBtnVisible(on, key){
  var b = document.getElementById('skipBuffBtn');
  if (b) b.style.display = on ? '' : 'none';
  buffChoiceOpen = !!on;
}""", '跳过按钮状态标记')

rep("""function showBuffChoices(excludeIds){
  running = false; paused = true;
  var _sb2 = document.getElementById('skipBuffBtn'); if (_sb2) _sb2.style.display = '';   /* 强化卡界面恢复「跳过」 */""",
"""function showBuffChoices(excludeIds){
  running = false; paused = true;
  setSkipBtnVisible(true);            /* v8.12：强化卡界面才显示「跳过」，并且它是唯一可用的场景 */""", '强化卡界面设状态')
rep("""  var _sb = document.getElementById('skipBuffBtn'); if (_sb) _sb.style.display = 'none';""",
    """  setSkipBtnVisible(false);           /* v8.12：契约面板隐藏并且不允许跳过 */""", '契约面板设状态')
rep("""function openShop(){
  running = false; paused = true;""",
"""function openShop(){
  running = false; paused = true;
  setSkipBtnVisible(false);           /* v8.12：商店面板不算选卡状态（防止借此刷金币） */""", '商店面板设状态')
rep("""function openTalents(){
  renderTalents();""",
"""function openTalents(){
  setSkipBtnVisible(false);           /* v8.12：天赋面板不算选卡状态 */
  renderTalents();""", '天赋面板设状态')

# ===== BUG 2：无限刷新（点禁卡→取消 = 重抽一次）=====
rep("""  banBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (banLeft <= 0){ showTip('没有「禁卡」次数了'); return; }
    banMode = !banMode;
    showBuffChoices();
    showTip(banMode ? '点一张卡把它禁掉（本局不再出现）' : '已取消');
  });""",
"""  banBtn.addEventListener('click', function(ev){
    ev.stopPropagation();
    if (banLeft <= 0){ showTip('没有「禁卡」次数了'); return; }
    /* v8.12 修「无限刷新」：原来这里直接调 showBuffChoices() → 每次进出禁卡模式都会重抽 3 张，
       等于无限刷新。现在只切换模式并刷新界面文案，绝不重抽。 */
    banMode = !banMode;
    updateBuffHead();
    showTip(banMode ? '点一张卡把它禁掉（本局不再出现）' : '已取消禁卡');
  });""", '禁卡模式不重抽')

# 把「顶部文案刷新」抽成独立函数（不重抽卡）
rep("""  /* v8.7：顶部告诉玩家「现在凑的是什么流派」+ 还剩下多少可控手段 */
  var _bt = document.getElementById('buffTitle'), _bs = document.getElementById('buffSub');
  var _ar = archetypeNow();
  if (_bt) _bt.textContent = banMode ? '🚫 选一张禁掉（本局不再出现）' : '选择强化';
  if (_bs) _bs.innerHTML = '🎯 当前倾向：<b style="color:#ffd76a">' + _ar.name + '</b>　<span style="font-size:11px;color:#9fc4f0">'
    + _ar.hint + '</span><br><span style="font-size:10.5px;color:#7d8ba3;">🔄 换一批 ' + rerollLeft + ' 次　🚫 禁卡 ' + banLeft + ' 次</span>';""",
"""  updateBuffHead();""", '抽出顶部文案函数')
rep("""function showBuffChoices(excludeIds){""",
"""function updateBuffHead(){
  /* 只刷新顶部文案与按钮高亮，**不重抽卡**（v8.12 修无限刷新 bug 的关键） */
  var _bt = document.getElementById('buffTitle'), _bs = document.getElementById('buffSub');
  var _ar = archetypeNow();
  if (_bt) _bt.textContent = banMode ? '🚫 选一张禁掉（本局不再出现）' : '选择强化';
  if (_bs) _bs.innerHTML = '🎯 当前倾向：<b style="color:#ffd76a">' + _ar.name + '</b>　<span style="font-size:11px;color:#9fc4f0">'
    + _ar.hint + '</span><br><span style="font-size:10.5px;color:#7d8ba3;">🔄 换一批 ' + rerollLeft + ' 次　🚫 禁卡 ' + banLeft + ' 次</span>';
  var _bb = document.getElementById('banBtn');
  if (_bb) _bb.style.outline = banMode ? '2px solid #ffd76a' : 'none';
}
function showBuffChoices(excludeIds){""", '顶部文案函数')

# ===== 需求 3：技能说明「简短 / 完整」切换 =====
rep("""function showSkillHelp(){
  running = false; paused = true;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#9fd0ff;text-align:center;margin-bottom:4px;">⚡ 主动技能说明</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:7px;">'
    + (endless ? '无尽模式：4 个技能全部可用' : '带 🔒 的技能要打到对应关卡才解锁') + '</div>';
  el.innerHTML = h;
  SKILLS.forEach(function(sk){
    var un = skillUnlocked(sk.key);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:9px 11px;border-radius:11px;margin-bottom:6px;'
      + 'background:rgba(22,32,56,.82);border:1px solid ' + (un ? 'rgba(255,200,110,.35)' : 'rgba(120,140,170,.28)') + ';'
      + (un ? '' : 'opacity:.62;');
    box.innerHTML = '<b style="font-size:14px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
      + '<span style="float:right;font-size:11px;color:#8fb4dc;">冷却 ' + sk.cd + ' 秒</span>'
      + '<div style="font-size:11.5px;color:#c8d8ee;line-height:1.5;margin-top:3px;">' + sk.desc + '</div>'
      + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">🖐 用法：' + skHowTo(sk.key) + '</div>'
      + '<div style="font-size:11px;color:' + (un ? '#9fc4f0' : '#ff9a6a') + ';margin-top:2px;">'
      + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    el.appendChild(box);
  });""",
"""var skillHelpBrief = true;      /* v8.12：技能说明默认「简短版」，可一键切「完整版」 */
function showSkillHelp(brief){
  running = false; paused = true;
  setSkipBtnVisible(false);     /* v8.12：技能说明面板不算选卡状态（原来在这里能点跳过刷钱） */
  if (brief === undefined) brief = skillHelpBrief;
  skillHelpBrief = brief;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#9fd0ff;text-align:center;margin-bottom:4px;">⚡ 主动技能说明</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;margin-bottom:7px;">'
    + (endless ? '无尽模式：4 个技能全部可用' : '带 🔒 的技能要打到对应关卡才解锁') + '</div>';
  el.innerHTML = h;
  SKILLS.forEach(function(sk){
    var un = skillUnlocked(sk.key);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:' + (brief ? '7px 10px' : '9px 11px') + ';border-radius:11px;margin-bottom:' + (brief ? '4px' : '6px') + ';'
      + 'background:rgba(22,32,56,.82);border:1px solid ' + (un ? 'rgba(255,200,110,.35)' : 'rgba(120,140,170,.28)') + ';'
      + (un ? '' : 'opacity:.62;');
    if (brief){
      /* 简短版：一行一个技能，只留「怎么用 + 冷却 + 解锁」 */
      box.innerHTML = '<b style="font-size:13px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
        + '<span style="float:right;font-size:10.5px;color:#8fb4dc;">' + sk.cd + ' 秒</span>'
        + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.45;margin-top:1px;">' + skHowTo(sk.key) + '</div>'
        + '<div style="font-size:10.5px;color:' + (un ? '#9fc4f0' : '#ff9a6a') + ';">'
        + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    } else {
      box.innerHTML = '<b style="font-size:14px;color:#ffd08a;">' + sk.icon + ' ' + sk.name + '</b>'
        + '<span style="float:right;font-size:11px;color:#8fb4dc;">冷却 ' + sk.cd + ' 秒</span>'
        + '<div style="font-size:11.5px;color:#c8d8ee;line-height:1.5;margin-top:3px;">' + sk.desc + '</div>'
        + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">🖐 用法：' + skHowTo(sk.key) + '</div>'
        + '<div style="font-size:11px;color:' + (un ? '#9fc4f0' : '#ff9a6a') + ';margin-top:2px;">'
        + (un ? '✅ 已解锁' : '🔒 第 ' + skillUnlockLv(sk.key) + ' 关解锁') + '</div>';
    }
    el.appendChild(box);
  });
  /* 简短 / 完整 一键切换 */
  var sw = document.createElement('button');
  sw.className = 'btn';
  sw.id = 'skillHelpSw';
  sw.style.cssText = 'padding:8px 14px;font-size:12.5px;width:100%;margin-top:6px;'
    + 'border-color:rgba(140,200,255,.5);background:rgba(24,44,74,.9);color:#9fd0ff;';
  sw.innerHTML = brief ? '📖 切换到「完整说明」（带效果与数值）' : '📄 切换到「简短说明」（只留用法）';
  sw.addEventListener('click', function(ev){ ev.stopPropagation(); showSkillHelp(!brief); });
  el.appendChild(sw);""", '技能说明简短/完整切换')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.12 修复补丁完成 ---')
