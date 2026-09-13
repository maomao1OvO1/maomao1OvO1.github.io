/* ══════════════════════════════════════════════════════════════════════════
 * 14-input.js —— 触屏交互：点选建塔、升级面板、图鉴与角色标签
 *
 * 来源：game.html 第 5359-5669 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 触屏交互 ================= */
var sel = document.getElementById('sel');
/* 关闭建塔/升级面板：同时解除战场冻结、清掉射程预览并播关闭音效 */
function hideSel(){ sel.style.display = 'none'; menuPause = false; pvClear(); SFX.panelClose(); }
/* 摆放建塔/升级面板的位置：自动躲开候选格（候选在左半屏就贴右，反之贴左），竖屏则贴底限高 */
function placeMenu(px, py){
  /* v7.0 面板改为「侧边栏 + 自动躲开候选格」：
     ①横屏：面板固定贴一侧、占满高度（8 座塔全部可见，不再被裁）；
     ②自动换边：候选格在左半屏 → 面板贴右；在右半屏 → 面板贴左 —— 射程圈永远不被挡住；
     ③竖屏：面板贴底、限高 58vh，上半屏战场照样看得见 */
  sel.style.transform = 'none';
  var wide = W > H;
  if (wide){
    sel.style.width = Math.round(W * 0.46) + 'px';
    sel.style.maxHeight = 'none';
    sel.style.top = '6px';
    sel.style.bottom = '6px';
    sel.style.height = 'auto';
    if (px < W * 0.5){                 // 点在左半屏 → 面板靠右
      sel.style.left = 'auto'; sel.style.right = '6px';
    } else {                           // 点在右半屏 → 面板靠左
      sel.style.left = '6px'; sel.style.right = 'auto';
    }
  } else {
    sel.style.width = 'auto';
    sel.style.left = '4px'; sel.style.right = '4px';
    sel.style.top = 'auto'; sel.style.bottom = '6px';
    sel.style.maxHeight = '58vh';
  }
}
/* 生成塔属性的一行文字（伤害/攻速/射程/特殊机制），建塔卡与升级面板共用 */
function statLine(k, lv){
  lv = lv || 1;
  var d = ELEMS[k], parts = [];
  if (d.aura) parts.push('自身不攻击');
  else parts.push('伤害 ' + Math.round(d.dmg * (1 + (lv - 1) * 0.30) * 10) / 10);
  if (d.rate) parts.push('攻速 ' + (1 / (d.rate / (1 + (lv - 1) * 0.12))).toFixed(2) + '/秒');
  parts.push('射程 ' + (d.range * (1 + (lv - 1) * 0.08)).toFixed(1) + ' 格');
  if (d.chain) parts.push('链弹 ' + d.chain + ' 个');
  return parts.join(' · ');
}
/* ==== ROLES_PATCH_V1 : 炮塔角色标签（建塔面板 + 图鉴共用；字段缺失一律兜底为「—」，绝不出现 undefined）==== */
/* 本段只新增只读辅助函数，不触碰 ELEMS 任何条目与数值（role/soloStar/groupStar 由另一路写入） */
var ROLE_DASH = '\u2014';                       /* 字段缺失占位符 */
var ROLE_COLORS = {                             /* 角色 → 徽标取色（未知角色回落 #bb9cff） */
  '单体': '#ffd76a', '溅射': '#ff9a5a', '持续': '#7cf5c0', '链式': '#8fe4ff',
  '控场': '#b98cff', '光环': '#8ff0ff', '点杀': '#ff7a9a', '范围': '#ffc06a'
};
/* 取某座塔的定位标签（对单/对群/控场…），字段缺失时返回占位符 —— 面板与图鉴的徽标用它 */
function roleTagOf(k){
  var d = ELEMS[k];
  var r = d ? d.role : null;
  if (typeof r !== 'string') return ROLE_DASH;
  r = r.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  if (!r) return ROLE_DASH;
  return r.length > 4 ? r.substring(0, 4) : r;  /* 徽标最多 4 字：双列卡片窄，多了会换行 */
}
/* 定位标签对应的徽标颜色（未登记的角色回落成默认蓝）*/
function roleColorOf(k){
  var c = ROLE_COLORS[roleTagOf(k)];
  return c || '#bb9cff';
}
function roleBgOf(k){                           /* 由徽标色生成 16% 半透明底色 */
  var c = roleColorOf(k);
  if (c.charAt(0) === '#' && c.length === 7){
    return 'rgba(' + parseInt(c.substr(1, 2), 16) + ',' + parseInt(c.substr(3, 2), 16)
      + ',' + parseInt(c.substr(5, 2), 16) + ',0.16)';
  }
  return 'rgba(120,160,220,.18)';
}
function starValOf(v){                          /* 仅 1..5 的有限数字有效，其余返回 -1（→ 显示「—」） */
  if (typeof v !== 'number' || !isFinite(v)) return -1;
  v = Math.round(v);
  return (v < 1 || v > 5) ? -1 : v;
}
function starTxtOf(v, onColor){                 /* 5 格星级条：实心 ★ 用 onColor，空星 ☆ 用暗灰蓝 */
  var n = starValOf(v), i, h = '';
  if (n < 0) return '<span style="color:rgba(160,180,210,.35);">' + ROLE_DASH + '</span>';
  for (i = 0; i < 5; i++){
    h += '<span style="color:' + (i < n ? onColor : 'rgba(160,180,210,.35)') + ';">'
      + (i < n ? '\u2605' : '\u2606') + '</span>';
  }
  return h;
}
function roleRowHTML(k){                        /* 面板用：徽标 + 对单/对群星级，强制单行不撑高 */
  var d = ELEMS[k] || {};
  /* class="cr" 只是语义钩子；全部样式内联，不依赖 style 段（卡片网格/字号由主线调整） */
  return '<div class="cr" style="display:flex;align-items:center;gap:4px;margin-top:2px;font-size:10.5px;'
    + 'line-height:1.3;white-space:nowrap;overflow:hidden;">'
    + '<span style="flex:0 0 auto;font-size:10.5px;line-height:1.3;padding:0 5px;border-radius:6px;'
    + 'border:1px solid ' + roleColorOf(k) + ';background:' + roleBgOf(k) + ';color:' + roleColorOf(k) + ';">'
    + roleTagOf(k) + '</span>'
    + '<span style="font-size:10.5px;line-height:1.3;color:#bb9cff;white-space:nowrap;overflow:hidden;">'
    + '对单 ' + starTxtOf(d.soloStar, '#ffd76a') + '\u3000对群 ' + starTxtOf(d.groupStar, '#8fe4ff')
    + '</span></div>';
}
function roleBookLineHTML(k){                   /* 图鉴用：与既有行同字号同配色的「角色」行 */
  var d = ELEMS[k] || {};
  return '<div style="font-size:12.5px;color:#bb9cff;">角色：'
    + '<b style="color:' + roleColorOf(k) + ';">' + roleTagOf(k) + '</b>'
    + ' · 对单 ' + starTxtOf(d.soloStar, '#ffd76a')
    + ' · 对群 ' + starTxtOf(d.groupStar, '#8fe4ff') + '</div>';
}

/* 生成建塔面板里一张塔卡的 HTML（图标、造价、定位、简介），金币不够时置灰 */
function buildCard(k){
  var d = ELEMS[k], cost = towerCost(k), dis = gold < cost;
  return '<button class="card' + (dis ? ' dis' : '') + '" data-mk="' + k + '">'
    + '<div class="ch"><span class="ci">' + d.icon + '</span><span>' + d.name + '塔</span>'
    + '<span class="cp">' + cost + ' 金</span></div>'
    + roleRowHTML(k)
    + '<div class="cs">' + statLine(k, 1) + '</div>'
    + '<div class="ce">' + (d.fx || '') + '</div>'
    + '<div class="cu">升级 +30% 伤害 / +12% 攻速 / +8% 射程</div>'
    + '</button>';
}
/* 打开建塔面板：列出现有全部塔卡并暂停战场（点空格子时调用）*/
function openBuild(c, r, px, py){
  var keys = Object.keys(ELEMS), html = '<div class="t">⏸ 已暂停 · 选择塔 · 可上下滑动查看全部</div><div class="cards">';
  for (var i = 0; i < keys.length; i++) html += buildCard(keys[i]);
  html += '</div>';
  sel.innerHTML = html;
  sel._refundShown = false;
  sel.style.display = 'block'; placeMenu(px, py);
  SFX.panelOpen();
}
/* 打开已有塔的面板：显示当前属性与升级后的属性对比、共鸣标签、升级/出售/全额退款按钮 */
function openTower(t, px, py){
  var d = ELEMS[t.elem], uc = upgradeCost(t), sv = sellValue(t);
  var res = (t.res && t.res.tags.length) ? ('<div class="t" style="color:#8ff0ff">共鸣 ' + t.res.tags.join('·') + '</div>') : '';
  var cur = statAt(t, t.lv), nxt = statAt(t, t.lv + 1);
  var au = auraBonus(t);
  var curTxt = d.aura
    ? ('光环：相邻塔伤害 +' + Math.round(d.auraDmg * (1 + (t.lv - 1) * 0.4) * (BUFFS.aura || 1) * 100) + '% · 攻速 +' + Math.round(d.auraRate * (1 + (t.lv - 1) * 0.4) * (BUFFS.aura || 1) * 100) + '%')
    : ('伤害 ' + cur.dmg.toFixed(1) + ' · 攻速 ' + (1 / cur.rate).toFixed(2) + '/秒 · 射程 ' + cur.range.toFixed(1) + ' 格');
  var nxtTxt = (t.lv >= 6)
    ? '已达最高等级 Lv6'
    : (d.aura
        ? ('下一级光环：伤害 +' + Math.round(d.auraDmg * (1 + t.lv * 0.4) * (BUFFS.aura || 1) * 100) + '% · 攻速 +' + Math.round(d.auraRate * (1 + t.lv * 0.4) * (BUFFS.aura || 1) * 100) + '%')
        : ('下一级：伤害 ' + nxt.dmg.toFixed(1) + '（+' + Math.round((nxt.dmg / (cur.dmg || 1) - 1) * 100) + '%）· 攻速 ' + (1 / nxt.rate).toFixed(2) + '/秒（+' + Math.round((cur.rate / nxt.rate - 1) * 100) + '%）· 射程 ' + nxt.range.toFixed(1)));
  var buffTxt = (au.dmg || au.rate) ? ('<div class="ce">辅助光环生效中：伤害 +' + Math.round(au.dmg * 100) + '% · 攻速 +' + Math.round(au.rate * 100) + '%</div>') : '';
  var upLine = d.upName ? ('<div class="ce" style="margin:2px 0 0">📈 专属成长（每级）：' + d.upName + '</div>') : '';
  var sysTxt = '';
  if (d.sys){
    var sl = sysLevel(d.sys), sb = sysBonus(d.sys), nextT = null, tirs = SYS_TIER[d.sys] || [];
    for (var ti2 = 0; ti2 < tirs.length; ti2++) if (sl < tirs[ti2].lv){ nextT = tirs[ti2]; break; }
    sysTxt = '<div class="cs" style="margin:2px 0 0">🏷 ' + SYS_NAME[d.sys] + ' 总 Lv ' + sl +
             '（当前 +' + Math.round(sb * 100) + '%' + (nextT ? ' · 还需 ' + (nextT.lv - sl) + ' 级 → +' + Math.round(nextT.bonus * 100) + '%' : ' · 已满档') + '）</div>';
  }
  /* ===== v7.10（毛毛需求）：点开已放置的塔就能看到「一下打多少」——每发伤害 / 暴击伤害 / 单体 DPS =====
     cur.dmg 取自 statAt（已含等级 / 共鸣 / 光环 / 体系 / 强化卡的全部加成），
     暴击倍率 2.5 与 hitEnemy 里的 (crit ? 2.5 : 1) 保持同源，暴击率也按 hitEnemy 的口径合计 */
  var twB = twOf(t.elem);
  var critRate = (BUFFS.crit || 0) + ((t.res && t.res.critAdd) || 0) + ((twB && twB.crit) || 0);
  if (critRate > 1) critRate = 1;
  var CRIT_X = 2.5;
  var dmgBox = '';
  if (!d.aura){                                   /* 辅助塔不攻击，伤害行换成光环行（已有） */
    var perHit = cur.dmg, critHit = perHit * CRIT_X, dps = perHit / (cur.rate || 1);
    dmgBox = '<div class="ce" style="margin:3px 0 0;padding:4px 7px;border-radius:9px;'
      + 'background:rgba(255,196,94,.10);border:1px solid rgba(255,200,110,.32);line-height:1.6;">'
      + '💥 每发 <b style="color:#ffd76a;font-size:13px">' + perHit.toFixed(1) + '</b>'
      + '\u3000⚡ 暴击 <b style="color:#ff9a6a;font-size:13px">' + critHit.toFixed(1) + '</b>'
      + (critRate > 0 ? '<span style="color:#a894d8">（' + Math.round(critRate * 100) + '% ×' + CRIT_X + '）</span>'
                      : '<span style="color:#7d8ba3">（暂无暴击率）</span>')
      + '<br>📊 <span style="color:#a894d8">单体 DPS</span> <b style="color:#8ff0ff">' + dps.toFixed(1) + '</b>/秒'
      + '</div>';
  }
  /* ===== v8.2 面板新增：随机词条 + 精通分支（互斥，Lv3 解锁）===== */
  var affixHtml = t.affix
    ? ('<div class="ce" style="margin:3px 0 0;padding:3px 7px;border-radius:8px;background:rgba(185,140,255,.12);'
       + 'border:1px solid rgba(185,140,255,.35)">✨ 词条：<b style="color:#c9a4ff">' + t.affix.name + '</b>（' + t.affix.desc + '）</div>')
    : '';
  var specHtml = '';
  if (!d.aura){
    if (t.lv < 3){
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#7d8ba3">🔀 精通分支：升到 Lv3 解锁（伤害 / 攻速 二选一，互斥）</div>';
    } else if (!t.spec){
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#ffd76a">🔀 选择精通分支（<b>互斥</b>，选定不可改）</div>'
        + '<div class="row" style="margin-top:4px">'
        + '<button data-spec="dmg" style="padding:8px">🔥 强化弹头<br><span style="font-size:11px;color:#bb9cff">伤害 +40%</span></button>'
        + '<button data-spec="rate" style="padding:8px">⚡ 超载循环<br><span style="font-size:11px;color:#bb9cff">攻速 +35%</span></button>'
        + '</div>';
    } else {
      specHtml = '<div class="ce" style="margin:3px 0 0;color:#8ff0ff">🔀 精通：' +
        (t.spec === 'dmg' ? '🔥 强化弹头（伤害 +40%）' : '⚡ 超载循环（攻速 +35%）') + '</div>';
    }
  }
  sel._px = px; sel._py = py;
  sel.innerHTML = '<div class="t">⏸ ' + d.icon + ' ' + d.name + ' Lv' + t.lv + '</div>' + res + upLine + sysTxt
    + '<div class="cs" style="margin:2px 0 3px">' + curTxt + '</div>'
    + dmgBox
    + affixHtml
    + specHtml
    + buffTxt
    + '<div class="cu" style="margin-bottom:6px">' + nxtTxt + '</div>'
    + '<div class="row">'
    + '<button data-up="1"' + (gold < uc || t.lv >= 6 ? ' style="opacity:.38"' : '') + '>升级<br><span style="color:#ffd76a">' + uc + '</span></button>'
    + '<button class="sell" data-sell="1">出售<br><span style="color:#ffb0b0">+' + sv + '</span></button>'
    + '</div>'
    + (t.fresh > 0
        ? ('<div class="row" style="margin-top:6px"><button class="refund" id="refundBtn" data-refund="1">↩ 全额退款（' + Math.ceil(t.fresh) + ' 秒）<br><span style="color:#ffe6a6">+' + d.cost + '</span></button></div>')
        : '');
  sel._refundShown = (t.fresh > 0);
  sel.style.display = 'block'; placeMenu(px, py);
}
cv.addEventListener('pointerdown', function(ev){
  if (!running) return;
  var rect = cv.getBoundingClientRect();
  var px = ev.clientX - rect.left, py = ev.clientY - rect.top;
  /* v8.5：技能目标选择模式（点敌人 / 点塔），优先于建塔与查看 */
  if (skillMode === 'mark'){
    var tgt = pickEnemyAt(px, py, 52);
    if (tgt) releaseSkill('mark', tgt);
    else showTip('没点到敌人 —— 再点一次它，或点技能按钮取消');
    return;
  }
  if (skillMode === 'overload'){
    var c0 = Math.floor((px - OX) / CELL), r0 = Math.floor((py - OY) / CELL);
    var t0 = towerAt(c0, r0);
    if (t0) releaseSkill('overload', t0);
    else showTip('没点到塔 —— 点一座已建好的塔，或点技能按钮取消');
    return;
  }
  var c = Math.floor((px - OX) / CELL), r = Math.floor((py - OY) / CELL);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS){ hideSel(); return; }
  if (isPath(c, r)){ showTip('路径上不能建塔'); hideSel(); return; }
  var t = towerAt(c, r);
  if (t) openTower(t, px, py); else openBuild(c, r, px, py);
});
sel.addEventListener('click', function(ev){      /* v7.1：由 pointerdown 改 click —— 手指按下即触发会导致「想滑动列表却直接建塔」，改 click 后滑动不误触 */
  ev.stopPropagation();
  var b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
  if (!b) return;
  if (b.dataset.mk){
    var cm = sel.dataset.c | 0, rm = sel.dataset.r | 0;
    if (!addTower(cm, rm, b.dataset.mk)) showTip('金币不足');
    else { pvLastElem = b.dataset.mk; showTip('已建造 · 相邻不同元素会共鸣'); }
  } else if (b.dataset.up){
    var t2 = sel._tower;
    if (t2){
      var uc = upgradeCost(t2);
      if (gold >= uc && t2.lv < 6){
        goldSub(uc); t2.lv++; SFX.upgrade();
        recalcResonance(); updateHud(); showTip('升级到 Lv' + t2.lv);
      } else showTip('金币不足或已满级');
    }
  } else if (b.dataset.spec){
    /* v8.2：Lv3 起选精通分支（互斥） */
    var t5 = sel._tower;
    if (t5 && t5.lv >= 3 && !t5.spec){
      t5.spec = b.dataset.spec;
      recalcResonance(); updateHud(); SFX.upgrade();
      addFloat(cx(t5.c), cy(t5.r) - CELL * 0.4,
        (t5.spec === 'dmg' ? '精通：伤害 +40%' : '精通：攻速 +35%'), '#ffd76a');
      showTip('精通分支已选定（互斥，不可更改）');
      openTower(t5, sel._px || 30, sel._py || 30);
    }
  } else if (b.dataset.refund){
    // 建塔悔棋：5 秒内全额退款（普通出售只有 60%）
    var t4 = sel._tower;
    if (t4){
      var fIdx = towers.indexOf(t4);
      if (fIdx >= 0) towers.splice(fIdx, 1);
      delete grid[t4.c + ',' + t4.r];
      if (t4.fresh > 0){
        var fBack = t4.paid || ELEMS[t4.elem].cost;
        goldAdd(fBack); SFX.coin();
        addFloat(cx(t4.c), cy(t4.r) - CELL * 0.4, '↩ 全额退款 +' + fBack, '#ffd76a');
        showTip('悔棋成功 · 全额退回 ' + fBack + ' 金币');
      } else {
        var fSv = sellValue(t4);
        goldAdd(fSv); SFX.coin();
        showTip('悔棋时间已过 · 按残值 ' + fSv + ' 金币出售');
      }
      sel._refundShown = false;
      recalcResonance(); updateHud();
    }
  } else if (b.dataset.sell){
    var t3 = sel._tower;
    if (t3){
      goldAdd(sellValue(t3)); SFX.coin();
      towers.splice(towers.indexOf(t3), 1);
      delete grid[t3.c + ',' + t3.r];
      recalcResonance(); updateHud(); showTip('已出售');
    }
  }
  hideSel();
});
(function patchMenus(){
  var ob = openBuild, ot = openTower;
  openBuild = function(c, r, px, py){
    sel.dataset.c = c; sel.dataset.r = r; menuPause = true;
    pvAt(c, r, pvLastElem, null);            // 建塔面板：候选格中心亮射程圈（默认沿用上次建的塔型）
    ob(c, r, px, py); placeMenu(px, py);
  };
  openTower = function(t, px, py){
    sel._tower = t; menuPause = true;
    pvAt(t.c, t.r, t.elem, t);               // 升级面板：该塔位置亮射程圈（按当前等级/共鸣算）
    ot(t, px, py); placeMenu(px, py);
  };
})();
// 面板里划动/悬停卡牌 → 切换预览元素，直观比较 6 种塔的射程差异
function pvFocusFrom(ev){
  var el = ev && ev.target;
  var b = (el && el.closest) ? el.closest('button[data-mk]') : null;
  if (b && b.dataset && b.dataset.mk){ pvElem = b.dataset.mk; pvLastElem = pvElem; }
}
sel.addEventListener('pointerover', pvFocusFrom);
sel.addEventListener('pointermove', pvFocusFrom);

