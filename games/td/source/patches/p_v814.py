# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ① CSS：简易模式下隐藏所有被标记为「说明文字」的元素
rep("  .stat{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;",
"""  /* v8.14 文字详略：所有文本面板共用的「简易模式」——被标记 .udesc 的说明文字在简易模式下隐藏 */
  body.brief .udesc{display:none !important;}
  .stat{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;""", 'CSS 简易模式规则')

# ② 全局开关 + 重渲染当前面板
rep("""var UI_BRIEF = true;""", """var UI_BRIEF = true;""", '占位', 0)
rep("""var skillHelpBrief = true;      /* v8.12：技能说明默认「简短版」，可一键切「完整版」 */""",
"""/* ===== v8.14 全局「文字详略」开关 =====
   毛毛要求：所有文本型界面都要有「简易模式」。
   做法：说明类文字统一打上 class="udesc"，简易模式下用 CSS 隐藏；面板底部与设置里都能一键切换，
   切换后当前面板立即重渲染，状态存进 td_settings。 */
var UI_BRIEF = true;            /* true = 简易（默认）：只显示要点；false = 详细：显示全部说明 */
var lastPanel = null;           /* 最近打开的面板类型，用于切换详略后就地重渲染 */
function applyUiBrief(){
  if (global_doc_body()) { try { global_doc_body().classList[UI_BRIEF ? 'add' : 'remove']('brief'); } catch (e) {} }
}
function global_doc_body(){ return (typeof document !== 'undefined' && document.body) ? document.body : null; }
function toggleUiBrief(){
  UI_BRIEF = !UI_BRIEF;
  applyUiBrief();
  try { saveSettings(); } catch (e) {}
  showTip(UI_BRIEF ? '📄 已切到简易模式（只显示要点）' : '📖 已切到详细模式（显示全部说明）');
  rerenderLastPanel();
}
function rerenderLastPanel(){
  if (lastPanel === 'talent') renderTalents();
  else if (lastPanel === 'shop') renderShop();
  else if (lastPanel === 'pact') showPactChoices();
  else if (lastPanel === 'skill') showSkillHelp(UI_BRIEF);
  else if (lastPanel === 'book') bookRender();
  else if (lastPanel === 'buff') updateBuffHead();
}
/* 每个文本面板底部都可以就地切换（长按无效、只切这一次） */
function appendBriefToggle(container){
  if (!container) return null;
  var b = document.createElement('button');
  b.className = 'btn';
  b.style.cssText = 'padding:9px 14px;font-size:12.5px;width:100%;margin-top:6px;'
    + 'border-color:rgba(140,200,255,.45);background:rgba(24,44,74,.9);color:#9fd0ff;';
  b.innerHTML = UI_BRIEF ? '📖 显示完整说明（切到详细模式）' : '📄 收起说明（切到简易模式）';
  b.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });
  container.appendChild(b);
  return b;
}
var skillHelpBrief = true;      /* v8.12：技能说明默认「简短版」，可一键切「完整版」 */""", '全局详略开关')

# ③ 存读设置带上详略
rep("  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON, art: ENEMY_ART })); } catch (e) {}",
    "  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON, art: ENEMY_ART, brief: UI_BRIEF })); } catch (e) {}", '保存详略设置')
rep("    if (o && typeof o.art === 'string'){",
"""    if (o && typeof o.brief === 'boolean'){ UI_BRIEF = o.brief; applyUiBrief(); }                       /* v8.14 文字详略 */
    if (o && typeof o.art === 'string'){""", '读档恢复详略')

# ④ 给各图鉴卡片的「说明文字」打标记
rep("    + '<div style=\"font-size:12.5px;color:#7cf5c0;\">特性：' + bookMobTraits(d).join(' · ') + '</div>'",
    "    + '<div class=\"udesc\" style=\"font-size:12.5px;color:#7cf5c0;\">特性：' + bookMobTraits(d).join(' · ') + '</div>'", '图鉴怪物-特性')
rep("    + '<div style=\"font-size:12px;color:#9fc4f0;opacity:.9;\">克制提示：' + bookMobCounter(d).join(' ； ') + '</div>'",
    "    + '<div class=\"udesc\" style=\"font-size:12px;color:#9fc4f0;opacity:.9;\">克制提示：' + bookMobCounter(d).join(' ； ') + '</div>'", '图鉴怪物-克制')
rep("    + '<div style=\"font-size:12.5px;color:#7cf5c0;\">特效：' + d.fx + '</div>'",
    "    + '<div class=\"udesc\" style=\"font-size:12.5px;color:#7cf5c0;\">特效：' + d.fx + '</div>'", '图鉴炮塔-特效')
rep("    + '<div style=\"font-size:12px;color:#9fc4f0;opacity:.9;\">升级收益：每级 +30% 伤害 / +12% 攻速 / +8% 射程</div>'",
    "    + '<div class=\"udesc\" style=\"font-size:12px;color:#9fc4f0;opacity:.9;\">升级收益：每级 +30% 伤害 / +12% 攻速 / +8% 射程</div>'", '图鉴炮塔-升级收益')
rep("    + '<div style=\"font-size:12px;color:#9fc4f0;\">共鸣组合：<b style=\"color:#7cf5c0;\">'",
    "    + '<div class=\"udesc\" style=\"font-size:12px;color:#9fc4f0;\">共鸣组合：<b style=\"color:#7cf5c0;\">'", '图鉴炮塔-共鸣组合')
rep("    + '<span style=\"display:block;font-size:11.5px;color:#9fc4f0;margin-top:1px;\">' + row[2] + '</span>'",
    "    + '<span class=\"udesc\" style=\"display:block;font-size:11.5px;color:#9fc4f0;margin-top:1px;\">' + row[2] + '</span>'", '图鉴共鸣-效果')
rep("    + '<div style=\"font-size:11.5px;color:#9fc4f0;margin-top:3px;\">体系内塔的<b style=\"color:#ffd76a;\">等级总和</b>达标",
    "    + '<div class=\"udesc\" style=\"font-size:11.5px;color:#9fc4f0;margin-top:3px;\">体系内塔的<b style=\"color:#ffd76a;\">等级总和</b>达标", '图鉴体系-说明')
rep("    + (ups.length ? ('<div style=\"font-size:11.5px;color:#ffb27a;margin-top:4px;\">📈 专属成长（每级）：<br>' + ups.join('<br>') + '</div>') : '')",
    "    + (ups.length ? ('<div class=\"udesc\" style=\"font-size:11.5px;color:#ffb27a;margin-top:4px;\">📈 专属成长（每级）：<br>' + ups.join('<br>') + '</div>') : '')", '图鉴体系-专属成长')

# ⑤ 面板内说明文字打标记 + 记录面板类型 + 底部切换按钮
rep("""    btn.innerHTML = '<b>' + td.name + '</b><span style="float:right;color:#ffd76a;">'""",
    """    btn.innerHTML = '<b>' + td.name + '</b><span style="float:right;color:#ffd76a;">'""", '占位2', 1)
rep("""      + '<br><span style="font-size:12px;color:#9fc4f0">' + td.desc + '</span>';""",
    """      + '<br><span class="udesc" style="font-size:12px;color:#9fc4f0">' + td.desc + '</span>';""", '天赋-说明')
rep("""      + '<br><span style="font-size:12px;color:#9fc4f0">' + item.desc + '</span>';""",
    """      + '<br><span class="udesc" style="font-size:12px;color:#9fc4f0">' + item.desc + '</span>';""", '商店-说明')
rep("""    btn.innerHTML = '<b>' + p.name + '</b><br><span style="font-size:12px;color:#9fc4f0">' + p.desc + '</span>';""",
    """    btn.innerHTML = '<b>' + p.name + '</b><br><span style="font-size:12px;color:#9fc4f0">' + p.desc + '</span>';""", '契约说明（保留：代价与收益是核心信息）')
rep("""        + (e.tip ? '<span style="display:block;font-size:11px;color:#7cf5c0;line-height:1.4;">→ ' + e.tip + '</span>' : '')""",
    """        + (e.tip ? '<span class="udesc" style="display:block;font-size:11px;color:#7cf5c0;line-height:1.4;">→ ' + e.tip + '</span>' : '')""", '开幕提示-应对建议')

# ⑥ 记录 lastPanel
rep("function renderTalents(){", "function renderTalents(){\n  lastPanel = 'talent';", '记录天赋面板')
rep("function renderShop(){", "function renderShop(){\n  lastPanel = 'shop';", '记录商店面板')
rep("function showPactChoices(){", "function showPactChoices(){\n  lastPanel = 'pact';", '记录契约面板')
rep("function showSkillHelp(brief){", "function showSkillHelp(brief){\n  lastPanel = 'skill';", '记录技能面板')
rep("""function bookRender(){""", """function bookRender(){
  lastPanel = 'book';""", '记录图鉴面板')

# ⑦ 各面板底部加切换按钮
rep("""  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:8px;';
  close.innerHTML = '✅ 关闭';""",
"""  appendBriefToggle(el);                    /* v8.14：天赋面板底部也能切详略 */
  var close = document.createElement('button');
  close.className = 'btn';
  close.style.cssText = 'padding:10px 14px;font-size:13px;width:100%;margin-top:6px;';
  close.innerHTML = '✅ 关闭';""", '天赋面板加切换')
rep("""  row.appendChild(rf); row.appendChild(lv);
  el.appendChild(row);""",
"""  appendBriefToggle(el);                    /* v8.14：商店面板底部也能切详略 */
  row.appendChild(rf); row.appendChild(lv);
  el.appendChild(row);""", '商店面板加切换')
rep("""  /* 简短 / 完整 一键切换 */
  var sw = document.createElement('button');""",
"""  /* 简短 / 完整 一键切换（v8.14：改为全局「文字详略」开关，所有面板共用一套） */
  var sw = document.createElement('button');""", '技能面板注释更新')
rep("""  sw.addEventListener('click', function(ev){ ev.stopPropagation(); showSkillHelp(!brief); });""",
"""  sw.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });""", '技能面板切全局开关')
rep("""  if (list) list.innerHTML = h;""",
"""  if (list) list.innerHTML = h;
  var _bt2 = document.getElementById('bookList');        /* v8.14：图鉴顶部也能切详略（文字最多的界面） */
  if (_bt2 && !document.getElementById('bookBriefBtn')){
    var bb = document.createElement('button');
    bb.className = 'btn'; bb.id = 'bookBriefBtn';
    bb.style.cssText = 'padding:7px 12px;font-size:12px;margin-bottom:6px;border-color:rgba(140,200,255,.45);background:rgba(24,44,74,.9);color:#9fd0ff;';
    bb.innerHTML = UI_BRIEF ? '📖 显示完整说明' : '📄 收起说明';
    bb.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });
    if (_bt2.parentNode && _bt2.parentNode.insertBefore) _bt2.parentNode.insertBefore(bb, _bt2);
  }""", '图鉴加切换按钮')

# ⑧ 设置面板加全局开关
rep("""  <button class="btn" id="setArtBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(60,40,100,.85)">🎨 敌人美术：发光球</button>""",
"""  <button class="btn" id="setArtBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(60,40,100,.85)">🎨 敌人美术：发光球</button>
  <button class="btn" id="setBriefBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(30,70,90,.85)">📄 文字模式：简易</button>""", '设置加文字模式开关')
rep("""  on('setArtBtn', function(){""",
"""  on('setBriefBtn', function(){               /* v8.14 全局文字详略 */
    toggleUiBrief();
    var _b2 = document.getElementById('setBriefBtn');
    if (_b2) _b2.textContent = '📄 文字模式：' + (UI_BRIEF ? '简易' : '详细');
  });
  on('setArtBtn', function(){""", '文字模式绑定')
rep("""  var _ab3 = document.getElementById('setArtBtn');                                      /* v8.11 同步美术按钮文案 */""",
"""  var _bf = document.getElementById('setBriefBtn');                                    /* v8.14 同步文字模式文案 */
  if (_bf) _bf.textContent = '📄 文字模式：' + (UI_BRIEF ? '简易' : '详细');
  var _ab3 = document.getElementById('setArtBtn');                                      /* v8.11 同步美术按钮文案 */""", '设置面板同步文字模式')
io.open(p,'w',encoding='utf-8').write(s)
print('--- v8.14 全部面板简易模式补丁完成 ---')
