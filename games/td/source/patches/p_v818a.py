# -*- coding: utf-8 -*-
# v8.18 (1) 天气介绍：点 HUD 天气框弹说明面板 + 图鉴新增「天气」页（全部数据驱动）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

rep('<div class="stat" id="wxBox" style="font-size:11px;border:1px solid rgba(255,200,110,.35)">\U0001F324 \u5e73\u7a33</div>',
    '<div class="stat" id="wxBox" style="font-size:11px;border:1px solid rgba(255,200,110,.35);cursor:pointer;">\U0001F324 \u5e73\u7a33</div>',
    'wxBox 可点样式')

WX = u'''
/* ===== v8.18 天气说明面板 =====
   毛毛：「天气也没有介绍啊，而且我都不知道天气有什么用」→ 原来 HUD 只有一个图标 + title。
   现在点 HUD 上的天气框就弹出完整说明：每种天气逐条列出（图标 / 名称 / 效果 / 应对建议），
   当前生效的那一条高亮。**效果文案直接读 WEATHERS[x].desc**，应对建议读 WX_ADVICE ——
   以后往 WEATHERS 里加天气，这里自动多一条，不用改代码。 */
var WX_ADVICE = {
  none:    '没有元素倾向 —— 趁这几波把共鸣阵摆好、把经济铺开',
  heat:    '火塔主场：火塔这波爆发最高，多铺火塔；冰塔减速时长被砍 40%，别指望它控场',
  cold:    '冰塔主场：减速强度 +50%，把敌人按在路上就是胜利；火塔攻速 -20% 会明显变慢，火力换别的塔',
  storm:   '雷塔主场：链弹多 2 跳，打密集队列最爽；狙击射程 -15%，往后站一格再摆',
  miasma:  '毒塔主场：毒伤 +50%，剧毒塔收益翻倍；非毒塔伤害 -10%，这波纯火 / 纯物理会偏软',
  iron:    '物理塔主场：破甲加成翻倍；但全体敌人 +15% 护甲 —— 纯元素塔会明显打不动，该让物理塔上岗了',
  silence: '辅助塔光环失效：把辅助塔的加成当 0 算；换来的回报是所有塔伤害 +30%，卖塔前先算一算'
};
/* 天气切换规则（与 startWave 里的实现同源：第 4 波起、每 3 波一次、固定顺序循环） */
function wxSwitchNote(){
  if (isDaily) return '本局为每日挑战：天气锁定，不会切换';
  if (wave <= 3) return '前 3 波固定「平稳」当新手缓冲，第 4 波开始每 3 波换一次';
  var nxt = wave + 1;
  while ((nxt - 4) % 3 !== 0) nxt++;
  var nx = WEATHERS[nextWeather] || WEATHERS.none;
  return '每 3 波换一次 · 下一波（第 ' + nxt + ' 波）将变为 ' + nx.icon + '「' + nx.name + '」';
}
function showWeatherHelp(brief){
  lastPanel = 'weather';
  running = false; paused = true;
  setSkipBtnVisible(false);          /* 不是选卡状态：禁止「跳过换金币」 */
  if (brief === undefined) brief = UI_BRIEF;
  var cur = weather;
  var el = document.getElementById('buffList');
  var h = '<div style="font-size:13.5px;font-weight:700;color:#ffd76a;text-align:center;margin-bottom:4px;">\U0001F324 元素天气说明</div>'
    + '<div style="font-size:11px;color:#8fb4dc;text-align:center;line-height:1.6;margin-bottom:7px;">'
    + '天气会同时影响<b style="color:#ffd76a;">你的塔</b>与<b style="color:#ffd76a;">敌人</b>：有得有失，'
    + '逼你每 3 波重新想想布局与共鸣搭配<br>'
    + '<span style="color:#9fd0ff;">' + wxSwitchNote() + '</span></div>';
  el.innerHTML = h;
  WEATHER_KEYS.forEach(function(k){
    var w = WEATHERS[k] || {};
    var on = (k === cur);
    var box = document.createElement('div');
    box.style.cssText = 'text-align:left;padding:9px 11px;border-radius:11px;margin-bottom:6px;'
      + 'background:' + (on ? 'rgba(60,48,16,.92)' : 'rgba(22,32,56,.78)') + ';'
      + 'border:1px solid ' + (on ? 'rgba(255,200,110,.75)' : 'rgba(120,180,255,.22)') + ';'
      + (on ? 'box-shadow:0 0 14px rgba(255,180,60,.25);' : '');
    var head = '<b style="font-size:14.5px;color:' + (on ? '#ffd76a' : '#eaf3ff') + ';">'
      + (w.icon || '') + ' ' + (w.name || k) + '</b>'
      + (on ? '<span style="float:right;font-size:10.5px;color:#20180a;background:#ffd76a;border-radius:8px;padding:1px 7px;font-weight:700;">本波生效</span>' : '');
    var body = '<div style="font-size:12px;color:#a8caf0;line-height:1.55;margin-top:3px;">'
      + '效果：' + (w.desc || '—') + '</div>';
    var adv = '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:3px;">'
      + '应对：' + (WX_ADVICE[k] || '按这个倾向调整塔的构成') + '</div>';
    if (brief){
      box.innerHTML = head + '<div style="font-size:11.5px;color:#7cf5c0;line-height:1.45;margin-top:2px;">'
        + (WX_ADVICE[k] || '') + '</div>';
    } else {
      box.innerHTML = head + body + adv;
    }
    el.appendChild(box);
  });
  appendBriefToggle(el);
  var close = document.createElement('button');
  close.className = 'btn';
  close.id = 'wxHelpClose';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '知道了';
  close.addEventListener('click', function(ev){
    ev.stopPropagation();
    closeBuffPanel();
    running = true; paused = false; last = 0;
  });
  el.appendChild(close);
  document.getElementById('buffOv').classList.remove('hidden');
}
'''
rep('/* \u9009\u62e9\u6a21\u5f0f\u4e0b\u70b9\u6218\u573a\uff1a\u627e\u6700\u8fd1\u7684\u654c\u4eba / \u5bf9\u5e94\u7684\u5854 */',
    WX.strip() + '\n/* \u9009\u62e9\u6a21\u5f0f\u4e0b\u70b9\u6218\u573a\uff1a\u627e\u6700\u8fd1\u7684\u654c\u4eba / \u5bf9\u5e94\u7684\u5854 */',
    '插入 showWeatherHelp')

rep("  else if (lastPanel === 'skill') showSkillHelp(UI_BRIEF);",
    "  else if (lastPanel === 'skill') showSkillHelp(UI_BRIEF);\n  else if (lastPanel === 'weather') showWeatherHelp(UI_BRIEF);",
    'rerenderLastPanel 支持天气面板')

rep('<button class="btn" id="bookTabInfo" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">\U0001F4DC \u8d44\u6599</button>',
    '<button class="btn" id="bookTabInfo" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">\U0001F4DC \u8d44\u6599</button>\n'
    '    <button class="btn" id="bookTabWx" style="flex:1;min-width:30%;padding:9px 0;font-size:13px;letter-spacing:0;background:rgba(40,60,100,.85)">\U0001F324 \u5929\u6c14</button>',
    '图鉴页签加天气')

rep("  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo' };",
    "  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo', wx:'bookTabWx' };",
    '图鉴页签 id 表加天气')

rep('''  } else if (bookTab === 'info'){
    h = bookInfoCard();''',
    '''  } else if (bookTab === 'wx'){
    /* v8.18 天气页：全部由 WEATHERS 生成，当前生效的那一条标出来 */
    var _wcur = (typeof weather === 'string') ? weather : 'none';
    h += '<div style="font-size:11.5px;color:#8fb4dc;text-align:left;margin-bottom:5px;">'
       + '\u524d 3 \u6ce2\u56fa\u5b9a\u300c\u5e73\u7a33\u300d\u5f53\u65b0\u624b\u7f13\u51b2\uff0c<b style="color:#ffd76a;">\u7b2c 4 \u6ce2\u8d77\u6bcf 3 \u6ce2\u6362\u4e00\u6b21</b>\uff0c'
       + '\u5207\u6362\u524d\u4e00\u6ce2\u4f1a\u5728\u9876\u90e8\u9884\u544a\u680f\u63d0\u793a<br>'
       + '\u987a\u5e8f\u56fa\u5b9a\u5faa\u73af\uff1a' + WEATHER_KEYS.map(function(k){ return WEATHERS[k].icon + WEATHERS[k].name; }).join(' \u2192 ')
       + '<br>\u5929\u6c14<b style="color:#7cf5c0;">\u540c\u65f6\u5f71\u54cd\u4f60\u7684\u5854\u4e0e\u654c\u4eba</b> \u2014\u2014 \u6709\u5f97\u6709\u5931\uff0c\u522b\u4e00\u5957\u9635\u5bb9\u6253\u5230\u5e95</div>';
    var _wkeys = ['none'].concat(WEATHER_KEYS);
    for (i = 0; i < _wkeys.length; i++) h += bookWeatherCard(_wkeys[i], _wcur);
  } else if (bookTab === 'info'){
    h = bookInfoCard();''',
    '图鉴天气页渲染')

rep("      : (bookTab === 'sys') ? ('四大体系 \u00b7 体系内等级总和达标即全队加成')",
    "      : (bookTab === 'wx') ? ('共 ' + (WEATHER_KEYS.length + 1) + ' 种天气 \u00b7 每 3 波切换 \u00b7 有得有失')\n      : (bookTab === 'sys') ? ('四大体系 \u00b7 体系内等级总和达标即全队加成')",
    '图鉴副标题加天气')

rep('function bookBuffCard(c){',
    '''function bookWeatherCard(k, cur){
  /* v8.18：天气图鉴卡片 —— 效果读 WEATHERS、建议读 WX_ADVICE，全部数据驱动 */
  var w = WEATHERS[k] || {};
  var on = (k === cur);
  return '<div style="padding:9px 11px;border-radius:11px;text-align:left;'
    + 'background:' + (on ? 'rgba(60,48,16,.9)' : 'rgba(22,32,56,.75)') + ';'
    + 'border:1px solid ' + (on ? 'rgba(255,200,110,.7)' : 'rgba(120,180,255,.22)') + ';">'
    + '<div style="font-size:14px;font-weight:700;color:' + (on ? '#ffd76a' : '#eaf3ff') + ';">'
    + (w.icon || '') + ' ' + (w.name || k)
    + (on ? '<span style="float:right;font-size:10px;color:#20180a;background:#ffd76a;border-radius:8px;padding:1px 6px;font-weight:700;">\u5f53\u524d</span>' : '')
    + '</div>'
    + '<div style="font-size:11.5px;color:#a8caf0;line-height:1.5;margin-top:2px;">' + (w.desc || '\u2014') + '</div>'
    + '<div class="udesc" style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">\U0001F590 ' + (WX_ADVICE[k] || '') + '</div>'
    + '</div>';
}
function bookBuffCard(c){''',
    'bookWeatherCard 渲染器')

rep("  on('pauseBtn', function(){ if (running && !paused) pauseGame(); });",
    "  on('pauseBtn', function(){ if (running && !paused) pauseGame(); });\n  on('wxBox', function(){ showWeatherHelp(); });      /* v8.18：点 HUD 天气框看完整说明 */",
    '绑定 wxBox 点击')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.18a 天气介绍补丁完成')
