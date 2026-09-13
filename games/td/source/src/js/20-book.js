/* ══════════════════════════════════════════════════════════════════════════
 * 20-book.js —— 图鉴与选关：怪物/炮塔/共鸣/强化卡/体系/资料，以及关卡地图
 *
 * 来源：game.html 第 6130-7229 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ==== BOOK_PATCH_V1 : 主界面图鉴（怪物 + 炮塔）—— 数据驱动，遍历 ENEMIES / ELEMS 生成 ==== */
/* 共鸣组合表：key 必须与 resonanceOf() 里的 [t.elem,o.elem].sort().join('+') 一致（字母序） */
var BOOK_RESO = [
  { pair:'fire+ice',     name:'热震',   note:'爆炸溅射' },
  { pair:'fire+thunder', name:'等离子', note:'伤害+80% / 攻速+25%' },
  { pair:'ice+thunder',  name:'超导',   note:'减速翻倍并冻结' },
  { pair:'fire+poison',  name:'燃爆',   note:'毒伤立刻结算' },
  { pair:'fire+phys',    name:'熔铁',   note:'打有甲怪伤害×1.4' },
  { pair:'ice+phys',     name:'碎冰',   note:'暴击 +15%' },
  { pair:'phys+thunder', name:'电磁炮', note:'完全无视护甲' },
  { pair:'phys+poison',  name:'腐蚀',   note:'毒伤 ×1.8' },
  /* TOWERS_V6_PATCH：新增塔的 5 组组合（key 与 resonanceOf 完全一致）*/
  { pair:'fire+mortar',    name:'燃烧弹', note:'溅射区附加 8/秒 × 3 秒 燃烧' },
  { pair:'mortar+poison',  name:'毒气弹', note:'溅射区内敌人中毒' },
  { pair:'ice+mortar',     name:'冰爆',   note:'溅射区内敌人减速' },
  { pair:'sniper+thunder', name:'电磁狙击', note:'伤害+60% 且无视护甲' },
  { pair:'phys+sniper',    name:'破甲弹', note:'无视护甲 · 对护甲目标再 +40%' },
  { pair:'support',      name:'增幅场', note:'相邻攻击塔 伤害+20% / 射程+10%' }
];
/* 怪物展示顺序：常见怪在前，BOSS 收尾；表里以后新增的怪会自动追加到末尾 */
var BOOK_MOB_ORDER = ['normal', 'fast', 'armor', 'shield', 'boss'];
var bookTab = 'mob';          /* 当前分页：mob=怪物 / tower=炮塔 */
var bookPausePrev = false;    /* 打开图鉴前的 menuPause（关闭时原样恢复，避免把状态搞乱） */

function bookMobKeys(){
  var out = [], k, i;
  for (i = 0; i < BOOK_MOB_ORDER.length; i++){
    if (ENEMIES[BOOK_MOB_ORDER[i]]) out.push(BOOK_MOB_ORDER[i]);
  }
  for (k in ENEMIES){
    if (ENEMIES.hasOwnProperty(k) && out.indexOf(k) < 0) out.push(k);
  }
  return out;
}
/* 取图鉴里所有炮塔的 key 列表（按 ELEMS 的登记顺序）*/
function bookTowerKeys(){
  var out = [], k;
  for (k in ELEMS){
    if (ELEMS.hasOwnProperty(k)) out.push(k);
  }
  return out;
}
/* 从数据字段推导特性文案（以后加新怪只要写字段，图鉴自动跟上） */
function bookMobTraits(d){
  if (d.fx) return [d.fx];                       // 数据里写了完整特性文案就优先用它
  var t = [];
  if (d.armor) t.push('护甲减伤 ' + Math.round(d.armor * 100) + '%');
  if (d.immuneSlow) t.push('免疫减速');
  if (d.boss) t.push('BOSS · 每 10 波登场');
  if (!t.length) t.push('无特殊能力');
  return t;
}
/* 生成图鉴中某一怪物的「应对建议」文案（按护甲/免疫减速/BOSS 等特性给出克制思路）*/
function bookMobCounter(d){
  if (d.tip) return [d.tip];
  var a = [];
  if (d.armor) a.push('护甲 → 🔨物理塔穿甲 / 熔铁 / 电磁炮');
  if (d.immuneSlow) a.push('免疫减速 → 别只堆冰霜，转火/雷输出');
  if (d.boss) a.push('BOSS → 集火 + 全屏冻结，不能让它走到终点');
  if (!a.length) a.push('无特殊能力 → 任意元素塔都能处理');
  return a;
}
/* 该元素塔参与的全部共鸣组合（含同元素共振 / 辅助塔增幅场） */
function bookResoTags(elem){
  var out = [], i, r, p;
  if (elem === 'support'){
    out.push('增幅场（为相邻攻击塔提供 · 伤害+20% / 射程+10%）');
    out.push('共振（同类相邻 · 辅助塔自身不攻击）');
    return out;
  }
  for (i = 0; i < BOOK_RESO.length; i++){
    r = BOOK_RESO[i];
    if (r.pair === 'support'){ out.push(r.name + '（相邻 📡 辅助塔）'); continue; }
    p = r.pair.split('+');
    if (p[0] === elem || p[1] === elem) out.push(r.name + ' · ' + r.note);
  }
  out.push('共振（同元素相邻 · 伤害+35% / 射程+15%）');
  return out;
}
/* —— 卡片：怪物 —— */
function bookMobCard(k){
  var d = ENEMIES[k];
  var color = d.color || '#bb9cff';
  return '<div style="display:flex;align-items:stretch;gap:10px;width:100%;box-sizing:border-box;'
    + 'padding:10px 12px;border:1px solid rgba(150,130,220,.28);border-radius:10px;background:rgba(18,26,44,.72);">'
    + '<div style="flex:0 0 16px;width:16px;border-radius:4px;background:' + color + ';box-shadow:0 0 8px ' + color + ';"></div>'
    + '<div style="flex:1;text-align:left;line-height:1.55;min-width:0;">'
    + '<div style="font-size:15px;font-weight:bold;color:' + color + ';">' + d.name
    + '<span style="font-size:11px;font-weight:normal;color:#bb9cff;opacity:.75;">  ' + k + '</span></div>'
    + '<div style="font-size:12.5px;color:#bb9cff;">血量 <b style="color:#ffd76a;">' + d.hp
    + '</b> · 速度 <b style="color:#ffd76a;">' + d.speed
    + '</b> · 掉落 <b style="color:#ffd76a;">' + d.gold + '</b> 金币</div>'
    + '<div class="udesc" style="font-size:12.5px;color:#7cf5c0;">特性：' + bookMobTraits(d).join(' · ') + '</div>'
    + '<div class="udesc" style="font-size:12px;color:#bb9cff;opacity:.9;">克制提示：' + bookMobCounter(d).join(' ； ') + '</div>'
    + '</div></div>';
}
/* —— 卡片：炮塔 —— */
function bookTowerCard(k){
  var d = ELEMS[k];
  var color = d.color || '#bb9cff';
  var line2;
  if (d.aura){
    line2 = '自身不攻击 · 相邻塔伤害 +' + Math.round((d.auraDmg || 0) * 100)
      + '% / 攻速 +' + Math.round((d.auraRate || 0) * 100) + '%';
  } else {
    line2 = '伤害 <b style="color:#ffd76a;">' + d.dmg
      + '</b> · 攻速 <b style="color:#ffd76a;">' + (d.rate > 0 ? (1 / d.rate).toFixed(2) : '0.00')
      + '</b> 次/秒 · 射程 <b style="color:#ffd76a;">' + d.range + '</b>';
  }
  return '<div style="display:flex;align-items:stretch;gap:10px;width:100%;box-sizing:border-box;'
    + 'padding:10px 12px;border:1px solid rgba(150,130,220,.28);border-radius:10px;background:rgba(18,26,44,.72);">'
    + '<div style="flex:0 0 30px;font-size:22px;line-height:1.3;text-align:center;">' + d.icon + '</div>'
    + '<div style="flex:1;text-align:left;line-height:1.55;min-width:0;">'
    + '<div style="font-size:15px;font-weight:bold;color:' + color + ';">' + d.name
    + '<span style="font-size:11.5px;font-weight:normal;color:#bb9cff;">  造价 <b style="color:#ffd76a;">'
    + d.cost + '</b></span></div>'
    + '<div style="font-size:12.5px;color:#bb9cff;">' + line2 + '</div>'
    + roleBookLineHTML(k)
    + '<div class="udesc" style="font-size:12.5px;color:#7cf5c0;">特效：' + d.fx + '</div>'
    + '<div class="udesc" style="font-size:12px;color:#bb9cff;opacity:.9;">升级收益：每级 +30% 伤害 / +12% 攻速 / +8% 射程</div>'
    + '<div class="udesc" style="font-size:12px;color:#bb9cff;">共鸣组合：<b style="color:#7cf5c0;">'
    + bookResoTags(k).join('</b> · <b style="color:#7cf5c0;">') + '</b></div>'
    + '</div></div>';
}
/* ===== v7.7 图鉴扩充：共鸣 / 强化卡 / 体系 / 资料 四页 ===== */
var RESO_LIST = [
  ['🔥 + ❄️', '热震', '命中点爆炸溅射，范围内敌人也吃伤害'],
  ['🔥 + ⚡', '等离子', '伤害 +80%、攻速 +25%'],
  ['❄️ + ⚡', '超导', '减速翻 3 倍，并附加冻结'],
  ['☠️ + 🔥', '燃爆', '中毒伤害立刻结算，且 ×2'],
  ['🔨 + ⚡', '电磁炮', '无视目标全部护甲'],
  ['🔨 + 🔥', '熔铁', '对有护甲的目标伤害 ×1.4'],
  ['🔨 + ❄️', '碎冰', '暴击率 +15%'],
  ['🔨 + ☠️', '腐蚀', '中毒伤害 ×1.8'],
  ['💥 + 🔥', '燃烧弹', '溅射区域内附加持续燃烧'],
  ['💥 + ☠️', '毒气弹', '溅射区域内敌人中毒'],
  ['💥 + ❄️', '冰爆', '溅射区域内敌人减速'],
  ['🎯 + ⚡', '电磁狙击', '伤害 +60%，且无视护甲'],
  ['🎯 + 🔨', '破甲弹', '无视护甲，并对护甲目标额外 ×1.4'],
  ['同元素相邻', '共振', '伤害 +35%、射程 +15%'],
  ['攻击塔 + 📡', '增幅场', '相邻辅助塔提供：伤害 +20%、射程 +10%'],
  /* ===== v8.15 补全的两两组合 ===== */
  ['🔥 + 🎯', '燃烧狙击', '伤害 +55%，命中附加持续燃烧'],
  ['❄️ + 🎯', '冻结狙击', '暴击率 +20%，命中附加冻结'],
  ['❄️ + ☠️', '霜毒', '中毒伤害 ×1.6，并附带减速'],
  ['⚡ + ☠️', '电弧腐蚀', '伤害 +35%，中毒伤害 ×1.7'],
  ['⚡ + 💥', '电磁爆炸', '溅射范围 ×1.35，伤害 +30%'],
  ['☠️ + 🎯', '毒狙', '伤害 +45%，中毒伤害 ×2'],
  ['🔨 + 💥', '破片重锤', '溅射范围 ×1.3，对有甲目标 ×1.5'],
  ['🎯 + 💥', '抛射狙击', '射程 +30%，溅射范围 ×1.25'],
  /* ===== v8.15 三元素共鸣（L 形相邻的三座不同元素塔，比两两更强）===== */
  ['🔥+❄️+⚡', '⭐元素风暴', '伤害 +90%、攻速 +30%、减速强度 ×2.5'],
  ['🔥+☠️+💥', '⭐燃烧大地', '溅射范围 ×1.4，区域内持续燃烧 + 中毒'],
  ['🔨+⚡+💥', '⭐电磁风暴', '无视全部护甲，伤害 +50%，溅射范围 ×1.4'],
  ['🔥+❄️+💥', '⭐冰火爆裂', '溅射范围 ×1.6，区域内敌人减速'],
  ['❄️+🔨+🎯', '⭐破冰穿甲', '无视护甲 + 冻结 + 暴击率 +25%'],
  ['🔥+🔨+🎯', '⭐熔金狙击', '对有甲目标 ×1.6，暴击率 +20%'],
  ['☠️+⚡+🎯', '⭐腐蚀雷狙', '无视护甲，中毒伤害 ×2'],
  ['❄️+☠️+💥', '⭐霜毒轰炸', '溅射范围内中毒 + 减速'],
  ['🔥+❄️+🎯', '⭐冰火狙击', '伤害 +60%，冻结 + 暴击率 +15%'],
  ['🔥+☠️+🎯', '⭐毒火狙击', '伤害 +35%，命中燃烧 + 中毒 ×1.8'],
  ['❄️+☠️+⚡', '⭐雷霜毒', '伤害 +40%，减速 ×2 + 中毒 ×1.7'],
  ['🔨+☠️+🎯', '⭐腐蚀穿甲', '无视护甲，中毒伤害 ×1.9'],
  ['任意三元素', '⭐三元素共鸣', '伤害 +45%（未列出的三元素组合保底收益）']
];
/* ===== v8.17 一键检查更新 =====
   开始界面点「🔄 检查更新」→ 拉取网站上的 version.json → 与本地版本号比大小；
   有新版就弹窗问「要下载吗」，点确定用系统浏览器打开 APK 下载链接，点取消什么都不做。 */
var BUILD_CODE = 99;                     /* v9.9：新手教学从 5 步扩到 10 步，覆盖全部核心系统；与 version.json 同步 */
/* v8.23：版本号只有「主界面那个占位符」一个来源（打包时 sed 注入），这里解析出来复用，
   避免以后发版忘了同步第二处（v8.18 就踩过 BUILD_CODE 漏改的坑）。 */
function gameVerStr(){
  try {
    var el = document.getElementById('homeVer');
    var m = String((el && el.textContent) || '').match(/v[0-9][0-9.]*/);
    return m ? m[0].slice(1) : String(BUILD_CODE);
  } catch (e) { return String(BUILD_CODE); }
}                     /* 本包版本号：每次发版与 version.json 同步更新 */
var UPDATE_JSON_URL = 'https://maomao1ovo1.github.io/games/td/version.json';
/* 检查更新拿到的新版本信息（下载按钮据此跳转），未检查到新版时为 null */
var pendingUpdate = null;
/* 联网检查更新：拉取远端版本 JSON（带时间戳打穿缓存），有新版就弹更新提示层 */
function checkUpdate(){
  if (typeof fetch !== 'function'){ showTip('当前环境不支持联网检查'); return; }
  showTip('🔍 正在检查更新…');
  var url = UPDATE_JSON_URL + '?t=' + Date.now();          /* 加时间戳打穿缓存 */
  fetch(url, { cache: 'no-store' }).then(function(r){
    if (!r || !r.ok) throw new Error('HTTP ' + (r ? r.status : '?'));
    return r.json();
  }).then(function(j){
    if (!j || !j.versionCode){ showTip('检查失败：版本信息格式不对'); return; }
    if (j.versionCode > BUILD_CODE){
      pendingUpdate = j;
      var tEl = document.getElementById('updTitle'), sEl = document.getElementById('updSub'), bEl = document.getElementById('updBody');
      if (tEl) tEl.textContent = '🆕 发现新版本 v' + j.version;
      if (sEl) sEl.textContent = '要现在下载吗？（当前 v' + (BUILD_CODE / 1) + '，最新 v' + j.version + '）';
      if (bEl) bEl.innerHTML = '📦 版本号：<b style="color:#ffd76a;">' + j.versionCode + '</b>（你的是 ' + BUILD_CODE + '）'
        + (j.date ? '<br>🗓 发布时间：' + j.date : '')
        + (j.size ? '<br>💾 安装包大小：' + j.size : '')
        + (j.note ? '<br>📝 更新内容：' + j.note : '');
      document.getElementById('updOv').classList.remove('hidden');
      SFX.upgrade();
    } else {
      showTip('✅ 已是最新版 v' + j.version);
      addFloat(W / 2, H * 0.42, '已是最新版 v' + j.version, '#7cf5c0');
    }
  }).catch(function(e){
    showTip('检查更新失败（网络不可用或域名被拦）：' + (e && e.message ? e.message : ''));
  });
}
/* 执行更新下载：优先交给 Android 原生桥打开下载页，否则用 window.open 兜底 */
function doUpdateDownload(){
  var j = pendingUpdate;
  document.getElementById('updOv').classList.add('hidden');
  if (!j || !j.url){ showTip('没有可用的下载地址'); return; }
  if (window.Android && Android.openUrl){ Android.openUrl(j.url); showTip('已交给浏览器下载…'); return; }
  try { window.open(j.url, '_blank'); showTip('已尝试在浏览器打开下载链接'); }
  catch (e2){ showTip('请手动打开：' + j.url); }
}
/* ===== v8.16 共鸣组合枚举 =====
   图鉴不再手写列表：两两 / 三元素 / 四元素 的组合**全部程序枚举**（8 座塔里 7 座攻击塔参与），
   具名组合显示名字与效果，未具名的显示保底效果 —— 保证「能组合出来的都在表里」。 */
var RESO_NAMED = {};      /* key = 元素字母序拼接，value = [名称, 效果] */
/* v8.16.1 修复：分组展开状态必须是**全局**变量。原来写在 bookRender 内部（var 局部），
   点击回调读它时是 undefined → 抛 ReferenceError → 图鉴分组点不动、点不开。 */
var resoOpenGroups = { special:false, two:true, three:false, four:false };
/* 把一组元素按字母序拼成唯一 key（共鸣查表用，顺序无关）*/
function resoElemKey(list){ return list.slice().sort().join('+'); }
/* 递归枚举 n 个元素攻击塔的全部组合（元素图鉴的共鸣分页据此列出所有组合）*/
function resoAllCombos(n){
  var atk = ['fire', 'ice', 'thunder', 'poison', 'phys', 'sniper', 'mortar'];
  var out = [];
  (function walk(start, cur){
    if (cur.length === n){ out.push(cur.slice()); return; }
    for (var i = start; i < atk.length; i++){ cur.push(atk[i]); walk(i + 1, cur); cur.pop(); }
  })(0, []);
  return out;
}
/* 元素 key → 图标字符（查 ELEMS，未知则原样返回 key）*/
function resoIconOf(e){ var d = ELEMS[e]; return d ? d.icon : e; }
/* 查共鸣组合的名称与效果文本：有名表就取表，否则按元素个数给通用档位说明 */
function resoNameOf(list){
  var k = resoElemKey(list);
  if (RESO_NAMED[k]) return RESO_NAMED[k];
  return [(list.length === 2 ? '普通共鸣' : list.length === 3 ? '⭐三元素共鸣' : '🌌四元素共鸣'),
          list.length === 2 ? '伤害 +25%' : list.length === 3 ? '伤害 +45%' : '伤害 +75%、攻速 +20%'];
}
/* 把具名组合登记进表（与 resonanceOf 里的实现一一对应，改一处记得同步另一处） */
function buildResoNamed(){
  RESO_NAMED = {};
    /* 内部工具：把一组元素登记成具名共鸣（key 为元素字母序拼接）*/
  var add = function(list, name, fx){ RESO_NAMED[resoElemKey(list)] = [name, fx]; };
  /* 两两（21 种非辅助组合，全部有名字） */
  add(['fire','ice'], '热震', '伤害 +70%，命中点爆炸溅射');
  add(['fire','thunder'], '等离子', '伤害 +80%、攻速 +25%');
  add(['ice','thunder'], '超导', '减速强度 ×3，并附加冻结');
  add(['fire','poison'], '燃爆', '中毒伤害立刻结算，且 ×2');
  add(['phys','thunder'], '电磁炮', '无视目标全部护甲，伤害 +60%');
  add(['fire','phys'], '熔铁', '伤害 +50%，对有甲目标 ×1.4');
  add(['ice','phys'], '碎冰', '伤害 +55%，暴击率 +15%');
  add(['phys','poison'], '腐蚀', '伤害 +50%，中毒伤害 ×1.8');
  add(['fire','mortar'], '燃烧弹', '溅射区域内附加持续燃烧');
  add(['mortar','poison'], '毒气弹', '溅射区域内敌人中毒');
  add(['ice','mortar'], '冰爆', '溅射区域内敌人减速');
  add(['sniper','thunder'], '电磁狙击', '伤害 +60%，且无视护甲');
  add(['phys','sniper'], '破甲弹', '无视护甲，并对护甲目标 ×1.4');
  add(['fire','sniper'], '燃烧狙击', '伤害 +55%，命中附加持续燃烧');
  add(['ice','sniper'], '冻结狙击', '暴击率 +20%，命中附加冻结');
  add(['ice','poison'], '霜毒', '中毒伤害 ×1.6，并附带减速');
  add(['poison','thunder'], '电弧腐蚀', '伤害 +35%，中毒伤害 ×1.7');
  add(['mortar','thunder'], '电磁爆炸', '溅射范围 ×1.35，伤害 +30%');
  add(['poison','sniper'], '毒狙', '伤害 +45%，中毒伤害 ×2');
  add(['mortar','phys'], '破片重锤', '溅射范围 ×1.3，对有甲目标 ×1.5');
  add(['mortar','sniper'], '抛射狙击', '射程 +30%，溅射范围 ×1.25');
  /* 三元素（12 种具名 + 其余走保底） */
  add(['fire','ice','thunder'], '⭐元素风暴', '伤害 +90%、攻速 +30%、减速强度 ×2.5');
  add(['fire','mortar','poison'], '⭐燃烧大地', '溅射范围 ×1.4，区域内燃烧 + 中毒');
  add(['mortar','phys','thunder'], '⭐电磁风暴', '无视全部护甲，伤害 +50%，溅射 ×1.4');
  add(['fire','ice','mortar'], '⭐冰火爆裂', '溅射范围 ×1.6，区域内敌人减速');
  add(['ice','phys','sniper'], '⭐破冰穿甲', '无视护甲 + 冻结 + 暴击率 +25%');
  add(['fire','phys','sniper'], '⭐熔金狙击', '对有甲目标 ×1.6，暴击率 +20%');
  add(['poison','thunder','sniper'], '⭐腐蚀雷狙', '无视护甲，中毒伤害 ×2');
  add(['ice','mortar','poison'], '⭐霜毒轰炸', '溅射范围内中毒 + 减速');
  add(['fire','ice','sniper'], '⭐冰火狙击', '伤害 +60%，冻结 + 暴击率 +15%');
  add(['fire','poison','sniper'], '⭐毒火狙击', '伤害 +35%，燃烧 + 中毒 ×1.8');
  add(['ice','poison','thunder'], '⭐雷霜毒', '伤害 +40%，减速 ×2 + 中毒 ×1.7');
  add(['phys','poison','sniper'], '⭐腐蚀穿甲', '无视护甲，中毒伤害 ×1.9');
  /* 四元素（8 种具名 + 其余走保底） */
  add(['fire','ice','sniper','thunder'], '🌌元素洪流', '伤害 +110%、攻速 +35%、冻结 + 暴击 +20%');
  add(['fire','ice','mortar','poison'], '🌌灾厄领域', '溅射 ×1.7，燃烧 + 中毒 + 减速全附');
  add(['mortar','phys','sniper','thunder'], '🌌战争矩阵', '无视护甲，伤害 +80%，溅射 ×1.5');
  add(['fire','ice','poison','thunder'], '🌌四相漩涡', '伤害 +85%，中毒 ×1.8，减速 ×2');
  add(['fire','ice','phys','sniper'], '🌌绝对猎杀', '无视护甲，暴击 +30%，冻结，伤害 +70%');
  add(['fire','poison','thunder','sniper'], '🌌雷火毒狙', '伤害 +90%，中毒 ×2，攻速 +25%');
  add(['ice','mortar','poison','thunder'], '🌌霜雷毒爆', '溅射 ×1.5，中毒 + 减速，伤害 +50%');
  add(['fire','mortar','phys','sniper'], '🌌重炮矩阵', '溅射 ×1.5，破甲 ×1.7，暴击 +20%');
  RESO_NAMED['fire+ice'] = RESO_NAMED['fire+ice'];   /* 占位：保持结构清晰 */
}
/* v8.16.1：树状分组的点击绑定（抽成独立函数，图鉴打开时与每次渲染后都会确保已绑定） */
function bindResoTreeClicks(){
  var list2 = document.getElementById('bookList');
  if (!list2 || !list2.addEventListener || list2._resoBound) return;
  list2._resoBound = true;
  list2.addEventListener('click', function(ev){
    var b = (ev.target && ev.target.closest) ? ev.target.closest('button') : null;
    if (!b) return;
    ev.stopPropagation();
    if (b.id === 'resoAllBtn'){
      var g = resoOpenGroups || { special:false, two:true, three:false, four:false };
      var all = g.special && g.two && g.three && g.four;
      resoOpenGroups = { special:!all, two:!all, three:!all, four:!all };
      bookRender(); return;
    }
    var key = (b.dataset && b.dataset.resoGroup) ? b.dataset.resoGroup : null;
    if (key){
      if (!resoOpenGroups) resoOpenGroups = { special:false, two:true, three:false, four:false };
      resoOpenGroups[key] = !resoOpenGroups[key];
      bookRender(); return;
    }
  });
}
/* 生成图鉴共鸣分页里一张共鸣卡片的 HTML */
function bookResoCard(row, idx){
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:rgba(28,20,52,.75);border:1px solid rgba(160,140,255,.22);">'
    + '<span style="font-size:17px;flex:0 0 auto;">' + row[0] + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:#8ff0ff;">' + row[1] + '</span>'
    + '<span class="udesc" style="display:block;font-size:11.5px;color:#bb9cff;margin-top:1px;">' + row[2] + '</span>'
    + '</span></div>';
}
/* 生成图鉴成就分页里一张成就卡的 HTML（已达成金色高亮、未达成置灰）*/
function bookAchCard(a){
  /* v8.21：已达成 → 金色高亮；未达成 → 置灰 */
  var got = achUnlocked(a.key);
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:' + (got ? 'rgba(60,48,16,.85)' : 'rgba(28,20,52,.7)') + ';'
    + 'border:1px solid ' + (got ? 'rgba(255,200,110,.6)' : 'rgba(160,140,255,.18)') + ';">'
    + '<span style="font-size:19px;flex:0 0 auto;' + (got ? '' : 'opacity:.3;filter:grayscale(1);') + '">' + a.icon + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:' + (got ? '#ffd76a' : '#bb9cff') + ';">' + a.name + '</span>'
    + '<span class="udesc" style="display:block;font-size:11.5px;color:#bb9cff;">' + a.desc + '</span>'
    + '</span>'
    + '<span style="flex:0 0 auto;font-size:11px;color:' + (got ? '#7cf5c0' : '#8f83b5') + ';">' + (got ? '✅ 已达成' : '未达成') + '</span>'
    + '</div>';
}
/* 生成图鉴天气分页里一张天气卡的 HTML（当前天气高亮，效果与建议读数据表）*/
function bookWeatherCard(k, cur){
  /* v8.18：天气图鉴卡片 —— 效果读 WEATHERS、建议读 WX_ADVICE，全部数据驱动 */
  var w = WEATHERS[k] || {};
  var on = (k === cur);
  return '<div style="padding:9px 11px;border-radius:11px;text-align:left;'
    + 'background:' + (on ? 'rgba(60,48,16,.9)' : 'rgba(28,20,52,.75)') + ';'
    + 'border:1px solid ' + (on ? 'rgba(255,200,110,.7)' : 'rgba(160,140,255,.22)') + ';">'
    + '<div style="font-size:14px;font-weight:700;color:' + (on ? '#ffd76a' : '#eaf3ff') + ';">'
    + (w.icon || '') + ' ' + (w.name || k)
    + (on ? '<span style="float:right;font-size:10px;color:#20180a;background:#ffd76a;border-radius:8px;padding:1px 6px;font-weight:700;">当前</span>' : '')
    + '</div>'
    + '<div style="font-size:11.5px;color:#b4a6e0;line-height:1.5;margin-top:2px;">' + (w.desc || '—') + '</div>'
    + '<div class="udesc" style="font-size:11.5px;color:#7cf5c0;line-height:1.5;margin-top:2px;">🖐 ' + (WX_ADVICE[k] || '') + '</div>'
    + '</div>';
}
/* 生成图鉴强化卡分页里一张卡片的 HTML（标出稀有度与是通用还是某塔专属）*/
function bookBuffCard(c){
  var rar = RARITY[c.rar] || RARITY.common;
  /* v7.8：专属卡直接标出「哪座塔专属」，一眼看出这张卡是给谁的 */
  var kind = c.elKey ? ((ELEMS[c.elKey] ? ELEMS[c.elKey].name + '塔专属' : '专属强化')) : '通用（全塔）';
  return '<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;'
    + 'background:rgba(28,20,52,.75);border:1px solid ' + rar.color + '55;">'
    + '<span style="flex:0 0 auto;font-size:10px;color:' + rar.color + ';border:1px solid ' + rar.color
    + ';border-radius:8px;padding:1px 6px;">' + rar.name + '</span>'
    + '<span style="flex:1;text-align:left;min-width:0;">'
    + '<span style="font-size:13.5px;font-weight:700;color:#eaf3ff;">' + c.name
    + '<span style="font-size:10.5px;font-weight:400;color:#8f83b5;"> · ' + kind + '</span></span>'
    + '<span style="display:block;font-size:11.5px;color:#7cf5c0;margin-top:1px;">' + c.desc + '</span>'
    + '</span></div>';
}
/* 生成图鉴体系分页里一张体系卡的 HTML（成员塔、等级档位加成、该体系影响什么）*/
function bookSysCard(sys){
  var tirs = SYS_TIER[sys] || [], mem = [], i, k;
  for (k in ELEMS){ if (ELEMS[k].sys === sys) mem.push(ELEMS[k].icon + ELEMS[k].name); }
  var lines = tirs.map(function(t){ return '总 Lv ' + t.lv + ' → +' + Math.round(t.bonus * 100) + '%'; }).join(' · ');
  var what = (sys === 'solo') ? '伤害' : (sys === 'group') ? '范围（溅射半径/链弹）' : (sys === 'ctrl') ? '控制（减速时长与强度）' : '光环效果';
  // 各塔专属成长
  var ups = [];
  for (k in ELEMS){ if (ELEMS[k].sys === sys && ELEMS[k].upName) ups.push(ELEMS[k].icon + ELEMS[k].name + '：' + ELEMS[k].upName); }
  return '<div style="padding:9px 11px;border-radius:12px;background:rgba(28,20,52,.8);border:1px solid rgba(160,140,255,.28);text-align:left;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">' + SYS_NAME[sys] + ' <span style="font-size:11px;color:#bb9cff;">' + mem.join('、') + '</span></div>'
    + '<div class="udesc" style="font-size:11.5px;color:#bb9cff;margin-top:3px;">体系内塔的<b style="color:#ffd76a;">等级总和</b>达标 → 全体同体系塔的 <b style="color:#7cf5c0;">' + what + '</b> 提升</div>'
    + '<div style="font-size:12px;color:#ffd76a;margin-top:2px;">' + lines + '</div>'
    + (ups.length ? ('<div class="udesc" style="font-size:11.5px;color:#ffb27a;margin-top:4px;">📈 专属成长（每级）：<br>' + ups.join('<br>') + '</div>') : '')
    + '</div>';
}
/* 生成图鉴关卡分页：逐关列出波数、难度、地图与解锁状态 */
function bookInfoCard(){
  var out = [], i, k;
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(28,20,52,.8);border:1px solid rgba(160,140,255,.28);text-align:left;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">🗺 关卡列表</div>');
  for (i = 0; i < LEVELS.length; i++){
    var L = LEVELS[i];
    out.push('<div style="font-size:12px;color:#bb9cff;margin-top:3px;">' + L.name
      + ' · <b style="color:#ffd76a;">' + L.waves + '</b> 波 · 初始金币 <b style="color:#ffd76a;">' + L.gold + '</b></div>');
  }
  out.push('</div>');
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(28,20,52,.8);border:1px solid rgba(160,140,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">❄️ 主动技能</div>'
    + '<div style="font-size:12px;color:#bb9cff;margin-top:3px;">全屏冻结：所有敌人短暂冻结，冷却 <b style="color:#ffd76a;">26 秒</b>。BOSS 波与漏怪救场用。</div></div>');
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(28,20,52,.8);border:1px solid rgba(160,140,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">⚙️ 核心机制</div>'
    + '<div style="font-size:12px;color:#bb9cff;line-height:1.7;margin-top:3px;">'
    + '· <b style="color:#ffd76a;">索敌</b>：优先打离基地最近的，路程相同打血量最低<br>'
    + '· <b style="color:#ffd76a;">狙击塔例外</b>：优先锁医疗兵 / 精英队长 / BOSS<br>'
    + '· <b style="color:#ffd76a;">出生护盾</b>：敌人出生 3 秒内受伤仅 15%<br>'
    + '· <b style="color:#ffd76a;">动态造价</b>：每多建一座贵 4%（斜率随波次升到 10%）<br>'
    + '· <b style="color:#ffd76a;">单波封顶</b>：每波最多 120 只，超出的转成敌人强度<br>'
    + '· <b style="color:#ffd76a;">悔棋</b>：新建的塔 5 秒内可全额退款'
    + '</div></div>');
  // 战绩
  var best = 0, eBest = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) { best = 0; }
  try { eBest = parseInt(localStorage.getItem('td_endless_best') || '0', 10) || 0; } catch (e) { eBest = 0; }
  var stars = 0;
  if (prog && prog.stars) for (k in prog.stars) stars += (prog.stars[k] || 0);
  out.push('<div style="padding:10px 12px;border-radius:12px;background:rgba(28,20,52,.8);border:1px solid rgba(160,140,255,.28);text-align:left;margin-top:8px;">'
    + '<div style="font-size:14px;font-weight:700;color:#bb9cff;">🏆 我的战绩</div>'
    + '<div style="font-size:12px;color:#bb9cff;line-height:1.8;margin-top:3px;">'
    + '最高波次 <b style="color:#ffd76a;">' + (best || '—') + '</b> · 无尽最高 <b style="color:#ffd76a;">' + (eBest || '—') + '</b> 波<br>'
    + '已解锁 <b style="color:#ffd76a;">' + ((prog && prog.unlocked) || 1) + '/' + LEVELS.length + '</b> 关 · 星数 <b style="color:#ffd76a;">' + stars + '/' + (LEVELS.length * 3) + '</b>'
    + '</div></div>');
  return out.join('');
}
/* 刷新图鉴的顶部分页按钮高亮状态（当前分页高亮）*/
function bookRenderTabs(){
  var ids = { mob:'bookTabMob', tower:'bookTabTower', reso:'bookTabReso', buff:'bookTabBuff', sys:'bookTabSys', info:'bookTabInfo', wx:'bookTabWx', ach:'bookTabAch' };
  for (var key in ids){
    var el = document.getElementById(ids[key]);
    if (!el) continue;
    var on = (bookTab === key);
    el.style.borderColor = on ? '#ffd76a' : 'rgba(150,130,220,.3)';
    el.style.color = on ? '#ffd76a' : '#eaf3ff';
    el.style.background = on ? 'rgba(80,60,20,.9)' : 'rgba(40,60,100,.85)';
  }
}
/* 图鉴主渲染：按当前分页（怪物/炮塔/共鸣/强化卡/体系/关卡/成就/天气）拼出整块内容 */
function bookRender(){
  lastPanel = 'book';
  var list = document.getElementById('bookList');
  var h = '', i, keys;
  if (bookTab === 'reso'){
    /* ===== v8.16 树状分组：点哪个看哪个，也能一键全部展开 ===== */
    if (!RESO_NAMED['fire+ice']) buildResoNamed();
    if (!resoOpenGroups) resoOpenGroups = { special:false, two:true, three:false, four:false };
    var groups = [
      { key:'special', title:'✨ 特殊共鸣（共振 / 增幅场）', items: RESO_LIST.filter(function(r){ return r[1] === '共振' || r[1] === '增幅场'; }) },
      { key:'two',   title:'🔗 两两共鸣',  combos: resoAllCombos(2) },
      { key:'three', title:'⭐ 三元素共鸣', combos: resoAllCombos(3) },
      { key:'four',  title:'🌌 四元素共鸣', combos: resoAllCombos(4) }
    ];
    /* 默认只展开「两两共鸣」，其余收起 —— 不把 100+ 条堆在一屏（状态由全局变量持有） */
    var allOpen = resoOpenGroups.special && resoOpenGroups.two && resoOpenGroups.three && resoOpenGroups.four;
    h += '<button class="btn" id="resoAllBtn" style="padding:8px 12px;font-size:12.5px;width:100%;margin-bottom:6px;'
       + 'border-color:rgba(180,160,255,.5);background:rgba(32,22,60,.9);color:#cfc4ff;">'
       + (allOpen ? '📕 全部收起' : '📖 全部展开（把 100+ 种组合一次看完）') + '</button>';
    groups.forEach(function(g){
      var open = !!resoOpenGroups[g.key];
      var cnt = g.items ? g.items.length : g.combos.length;
      h += '<button class="btn" data-reso-group="' + g.key + '" style="padding:9px 12px;font-size:13px;width:100%;'
        + 'text-align:left;margin-top:5px;border-color:rgba(160,140,255,.35);background:rgba(20,32,54,.85);color:#bb9cff;">'
        + (open ? '▼ ' : '▶ ') + g.title + '<span style="float:right;font-size:11px;color:#8f83b5;">' + cnt + ' 种</span></button>';
      if (!open) return;
      if (g.items){
        for (i = 0; i < g.items.length; i++) h += bookResoCard(g.items[i], i);
      } else {
        for (i = 0; i < g.combos.length; i++){
          var c = g.combos[i];
          var ic = c.map(resoIconOf).join(' + ');
          var nm = resoNameOf(c);
          h += bookResoCard([ic, nm[0], nm[1]], i);
        }
      }
    });
  } else if (bookTab === 'buff'){
    var order = { epic:0, rare:1, common:2 };
        /* 排序器：稀有度从高到低（史诗 → 稀有 → 普通）*/
    var byRar = function(a, b){ return (order[a.rar] || 9) - (order[b.rar] || 9); };
        /* 生成强化卡图鉴里的分组标题行（组名 + 本组卡片数量）*/
    var bTitle = function(t, n){
      return '<div style="font-size:12px;font-weight:700;color:#ffd76a;text-align:left;margin:8px 0 5px;">'
        + t + '<span style="font-size:10.5px;font-weight:400;color:#a894d8;"> · ' + n + ' 张</span></div>';
    };
    h += '<div style="font-size:11.5px;color:#a894d8;text-align:left;margin-bottom:4px;">'
       + '每波三选一 · 越到后期越容易抽到高级卡（稀有 +1.6/波、史诗 +3.2/波 权重）<br>'
       + '🗼 <b>专属强化</b>只强化对应那一座塔，且只会从「你已经建了的塔」里刷出来</div>';
    /* —— v7.8 ① 通用卡 —— */
    var genCards = BUFF_POOL.filter(function(b){ return !b.elKey; }).sort(byRar);
    h += bTitle('🌐 通用强化卡', genCards.length);
    for (i = 0; i < genCards.length; i++) h += bookBuffCard(genCards[i]);
    /* —— v7.8 ② 炮塔专属卡：按塔分组，每塔 4 张 —— */
    var expAll = BUFF_POOL.filter(function(b){ return b.elKey; });
    h += bTitle('🗼 炮塔专属强化卡', expAll.length);
    for (var ek in ELEMS){
      var myCards = expAll.filter(function(b){ return b.elKey === ek; }).sort(byRar);
      if (!myCards.length) continue;
      h += '<div style="font-size:11.5px;color:' + ELEMS[ek].color + ';text-align:left;margin:6px 0 3px;">'
         + ELEMS[ek].icon + ' ' + ELEMS[ek].name + '塔 <span style="color:#8f83b5;">（' + myCards.length + ' 张）</span></div>';
      for (i = 0; i < myCards.length; i++) h += bookBuffCard(myCards[i]);
    }
  } else if (bookTab === 'sys'){
    var sysKeys = ['solo', 'group', 'ctrl', 'support'];
    for (i = 0; i < sysKeys.length; i++) h += bookSysCard(sysKeys[i]);
  } else if (bookTab === 'wx'){
    /* v8.18 天气页：全部由 WEATHERS 生成，当前生效的那一条标出来 */
    var _wcur = (typeof weather === 'string') ? weather : 'none';
    h += '<div style="font-size:11.5px;color:#a894d8;text-align:left;margin-bottom:5px;">'
       + '前 3 波固定「平稳」当新手缓冲，<b style="color:#ffd76a;">第 4 波起每 3 波换一次</b>，'
       + '切换前一波会在顶部预告栏提示<br>'
       + '顺序固定循环：' + WEATHER_KEYS.map(function(k){ return WEATHERS[k].icon + WEATHERS[k].name; }).join(' → ')
       + '<br>天气<b style="color:#7cf5c0;">同时影响你的塔与敌人</b> —— 有得有失，别一套阵容打到底</div>';
    var _wkeys = ['none'].concat(WEATHER_KEYS);
    for (i = 0; i < _wkeys.length; i++) h += bookWeatherCard(_wkeys[i], _wcur);
  } else if (bookTab === 'ach'){
    /* v8.21 成就页：已达成的高亮，未达成的置灰并给出条件 */
    h += '<div style="font-size:11.5px;color:#a894d8;text-align:left;margin-bottom:6px;">'
       + '已达成 <b style="color:#ffd76a;">' + achCount() + ' / ' + ACHIEVEMENTS.length + '</b>'
       + '　·　成就跟着存档走，删档会一起清掉</div>';
    var got = achCount();
    for (i = 0; i < ACHIEVEMENTS.length; i++) h += bookAchCard(ACHIEVEMENTS[i]);
    if (got >= ACHIEVEMENTS.length) h += '<div style="font-size:12px;color:#ffd76a;text-align:center;margin-top:6px;">🏆 全部达成，你就是共鸣之塔的主人</div>';
  } else if (bookTab === 'info'){
    h = bookInfoCard();
  } else {
    keys = (bookTab === 'mob') ? bookMobKeys() : bookTowerKeys();
    for (i = 0; i < keys.length; i++) h += (bookTab === 'mob') ? bookMobCard(keys[i]) : bookTowerCard(keys[i]);
  }
  if (list) list.innerHTML = h;
  var _bt2 = document.getElementById('bookList');        /* v8.14：图鉴顶部也能切详略（文字最多的界面） */
  if (_bt2 && !document.getElementById('bookBriefBtn')){
    var bb = document.createElement('button');
    bb.className = 'btn'; bb.id = 'bookBriefBtn';
    bb.style.cssText = 'padding:7px 12px;font-size:12px;margin-bottom:6px;border-color:rgba(180,160,255,.45);background:rgba(32,22,60,.9);color:#cfc4ff;';
    bb.innerHTML = UI_BRIEF ? '📖 显示完整说明' : '📄 收起说明';
    bb.addEventListener('click', function(ev){ ev.stopPropagation(); toggleUiBrief(); });
    if (_bt2.parentNode && _bt2.parentNode.insertBefore) _bt2.parentNode.insertBefore(bb, _bt2);
  }
  var sub = document.getElementById('bookSub');
  if (sub){
    sub.textContent = (bookTab === 'mob') ? ('共 ' + bookMobKeys().length + ' 种敌人 · 特性决定该用什么塔打')
      : (bookTab === 'tower') ? ('共 ' + bookTowerKeys().length + ' 种塔 · 相邻不同元素触发共鸣')
      : (bookTab === 'reso') ? ('共 ' + (7 * 6 / 2 + 35 + 35) + ' 种组合（2/3/4 元素）· 点分组标题展开')
      : (bookTab === 'buff') ? ('共 ' + BUFF_POOL.length + ' 张强化卡 · 每波三选一')
      : (bookTab === 'wx') ? ('共 ' + (WEATHER_KEYS.length + 1) + ' 种天气 · 每 3 波切换 · 有得有失')
      : (bookTab === 'ach') ? ('共 ' + ACHIEVEMENTS.length + ' 个成就 · 已达成 ' + achCount() + ' 个')
      : (bookTab === 'sys') ? ('四大体系 · 体系内等级总和达标即全队加成')
      : '关卡 / 技能 / 核心机制 / 你的战绩';
  }
  bindResoTreeClicks();
  bookRenderTabs();
}
/* 打开图鉴：记住并冻结战场状态，隐藏首页，渲染当前分页 */
function bookShow(tab){
  bindResoTreeClicks();
  if (tab) bookTab = tab;
  bookPausePrev = menuPause;                  /* 记录打开前的状态 */
  if (running) menuPause = true;              /* 战场在跑 → 冻结（首页打开时 running=false，不动状态） */
  var so = document.getElementById('startOv'); if (so) so.classList.add('hidden');
  tutMarkBook();                                   /* v9.9：教学第 9 步判定「打开过图鉴」*/
  var bv = document.getElementById('bookOv'); if (bv) bv.classList.remove('hidden');
  bookRender();
  SFX.click();
}
/* 关闭图鉴并恢复打开前的战场状态，重新显示首页 */
function bookHide(){
  var bv = document.getElementById('bookOv'); if (bv) bv.classList.add('hidden');
  var so = document.getElementById('startOv'); if (so) so.classList.remove('hidden');
  menuPause = bookPausePrev;                  /* 恢复成打开之前的状态 */
  SFX.click();
}
/* 打开选关页：按已解锁进度渲染蜿蜒排列的关卡节点地图（PVZ 风格节点 + 连线）*/
function showLevels(){
  tutorialExit();      /* TUTORIAL_PATCH_V1：回到选关页 = 教学结束（不在教学中时为空操作）*/
  hideAll();
  var wrap = document.getElementById('lvList'); wrap.innerHTML = '';
  /* ===== v8.4 关卡地图（PVZ 风格）：可左右滑动的一串关卡节点，上下蜿蜒起伏，节点之间用连线串起来 ===== */
  var nodes = [];
  for (var i = 0; i < LEVELS.length; i++){
    (function(i){
      var L = LEVELS[i], locked = i >= prog.unlocked;
      var best = prog.best[i] || 0, st = prog.stars[i] || 0;
      var yOff = Math.round(Math.sin(i * 0.85) * 32);
      var node = document.createElement('div');
      node.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;width:84px;flex:0 0 auto;'
        + 'margin-top:' + (46 + yOff) + 'px;';
      var b = document.createElement('button');
      b.className = 'btn';
      b.style.cssText = 'width:56px;height:56px;border-radius:50%;padding:0;font-size:18px;font-weight:800;'
        + (locked ? 'opacity:.42;background:rgba(48,40,70,.85);border-color:rgba(140,125,175,.4);'
          : (st > 0 ? 'border-color:rgba(255,210,110,.9);background:linear-gradient(180deg,rgba(150,100,20,.96),rgba(88,54,10,.96));color:#ffe6a8;'
                    : 'border-color:rgba(140,240,180,.7);background:linear-gradient(180deg,rgba(22,86,64,.96),rgba(12,52,40,.96));color:#c8ffe4;'));
      b.textContent = locked ? '🔒' : String(i + 1);
      b.title = L.name + ' · ' + L.waves + ' 波 · 初始金币 ' + L.gold + (best ? ' · 最佳 ' + best + ' 波' : '');
      if (!locked) b.addEventListener('click', function(e){ e.stopPropagation(); startLevel(i); });
      node.appendChild(b);
      var sn = document.createElement('div');
      sn.style.cssText = 'font-size:10px;height:13px;color:#ffd76a;letter-spacing:1px;';
      sn.textContent = st > 0 ? starStr(st) : (locked ? '' : '未通关');
      node.appendChild(sn);
      var nm = document.createElement('div');
      nm.style.cssText = 'font-size:10px;color:#bb9cff;white-space:nowrap;';
      nm.textContent = (L.name.split('·')[1] || L.name).trim();
      node.appendChild(nm);
      var wv = document.createElement('div');
      wv.style.cssText = 'font-size:9px;color:#8f83b5;';
      wv.textContent = L.waves + '波';
      node.appendChild(wv);
      nodes.push(node);
    })(i);
  }
  /* 无尽模式作为地图末尾的「终局节点」 */
  (function(){
    var u = endlessUnlocked(), eb = endlessBest(), svNow = loadEndlessSave();
    var node = document.createElement('div');
    node.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;width:92px;flex:0 0 auto;margin-top:52px;';
    var b = document.createElement('button');
    b.className = 'btn'; b.id = 'endlessBtn';
    b.style.cssText = 'width:62px;height:62px;border-radius:50%;padding:0;font-size:22px;font-weight:800;'
      + (u ? 'border-color:rgba(255,200,90,.85);background:linear-gradient(180deg,rgba(160,96,18,.96),rgba(96,54,10,.96));color:#ffe6a8;'
           : 'opacity:.42;background:rgba(48,40,70,.85);border-color:rgba(140,125,175,.4);');
    b.textContent = u ? '♾' : '🔒';
    b.title = '无尽模式：波次无上限' + (eb > 0 ? ' · 最高 ' + eb + ' 波' : '');
    if (u && svNow) b.addEventListener('click', function(e){ e.stopPropagation(); resumeEndless(); });
    else if (u) b.addEventListener('click', function(e){ e.stopPropagation(); startEndless(); });
    node.appendChild(b);
    var sn = document.createElement('div');
    sn.style.cssText = 'font-size:10px;height:13px;color:#ffd76a;';
    sn.textContent = eb > 0 ? ('最高' + eb + '波') : (svNow ? ('存到' + svNow.wave + '波') : '');
    node.appendChild(sn);
    var nm = document.createElement('div');
    nm.style.cssText = 'font-size:10.5px;color:#ffd08a;white-space:nowrap;font-weight:700;';
    nm.textContent = svNow && u ? '继续无尽' : '无尽模式';
    node.appendChild(nm);
    var wv = document.createElement('div');
    wv.style.cssText = 'font-size:9px;color:#8f83b5;';
    wv.textContent = u ? '无上限' : '需先通关第 1 关';
    node.appendChild(wv);
    nodes.push(node);
  })();
  /* v8.9 每日挑战节点（放在无尽之后，金色描边 + 今日种子） */
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
    wv.style.cssText = 'font-size:9px;color:#8f83b5;';
    wv.textContent = '#' + String(ds).slice(4);
    node.appendChild(wv);
    nodes.push(node);
  })();
  /* 节点之间画连线（垂直位置取两侧节点中点，形成蜿蜒路径感） */
  for (var n = 0; n < nodes.length; n++){
    if (n > 0){
      var prevTop = parseFloat(nodes[n - 1].style.marginTop) || 0;
      var curTop = parseFloat(nodes[n].style.marginTop) || 0;
      var link = document.createElement('div');
      link.style.cssText = 'flex:0 0 auto;width:22px;height:3px;border-radius:2px;margin-top:'
        + Math.round((prevTop + curTop) / 2 + 26) + 'px;'
        + 'background:linear-gradient(90deg,rgba(180,160,255,.28),rgba(180,160,255,.62));';
      wrap.appendChild(link);
    }
    wrap.appendChild(nodes[n]);
  }
  /* 打开时自动滚到「当前进度」那一关（不用手动划半天） */
  setTimeout(function(){
    var w = document.getElementById('lvMapWrap');
    if (!w) return;
    var target = Math.min(Math.max(0, prog.unlocked - 1), LEVELS.length - 1);
    if (nodes[target]) w.scrollLeft = Math.max(0, nodes[target].offsetLeft - w.clientWidth / 2 + 40);
  }, 40);
  /* ♾ 无尽模式：至少通关过第 1 关才解锁（prog.unlocked >= 2 或 prog.best[0] 存在） */
  (function(){
    var u = endlessUnlocked(), eb = endlessBest();
    var eb2 = document.createElement('button');
    eb2.className = 'btn';
    eb2.id = 'endlessBtn';
    var svNow = loadEndlessSave();   // 有存档则显示「继续无尽」
    eb2.style.cssText = 'margin-top:8px;padding:13px 18px;font-size:15px;letter-spacing:2px;width:100%;'
      + (u ? 'border-color:rgba(255,200,90,.6);background:linear-gradient(180deg,rgba(150,90,20,.9),rgba(90,50,12,.9));color:#ffe6a8;'
           : 'opacity:.4;background:rgba(48,40,70,.7)');
    if (u && svNow){
      eb2.textContent = '💾 继续无尽 · 第 ' + svNow.wave + ' 波' + (eb > 0 ? '   （最高 ' + eb + ' 波）' : '');
      eb2.style.cssText = 'margin-top:8px;padding:13px 18px;font-size:15px;letter-spacing:2px;width:100%;'
        + 'border-color:rgba(120,255,190,.65);background:linear-gradient(180deg,rgba(20,110,80,.92),rgba(10,60,46,.92));color:#b6ffe0;';
      eb2.addEventListener('click', function(e){ e.stopPropagation(); resumeEndless(); });
    } else {
      eb2.textContent = '♾ 无尽模式' + (eb > 0 ? '   最高' + eb + '波' : (u ? '   波次无上限' : '')) + (u ? '' : '   🔒');
      if (u) eb2.addEventListener('click', function(e){ e.stopPropagation(); startEndless(); });
    }
    wrap.appendChild(eb2);
  })();
  document.getElementById('levelsOv').classList.remove('hidden');
}
/* ==== TUTORIAL_PATCH_V1 : 新手教学关（独立配置 + 5 步分步引导）====
   设计约束：
     · 教学配置独立于 LEVELS 数组（不新增关卡项 → 选关页仍是「5 关 + 无尽」= 6 项）；
     · 教学模式全部走本段新增代码：startLevel 只在「有待发放的教学奖励」时多结算一次金币；
     · startTutorial() 复制 startLevel 的重置骨架（startLevel 既有行为保持不变）；
     · 教学通关不写 prog.unlocked / prog.best / prog.stars（不污染正式进度与选关）；
     · 纯 ES5：只用 var / function，无 let / const / 箭头函数 / 模板字符串。 */
var TUTORIAL = {
  name: '🎓 新兵训练',
  waves: 8,                                /* v9.9 教学关波数：够走完 10 步完整引导（含技能/天气/图鉴） */
  gold: 720,                               /* v9.9 教学关初始金币：够「建塔+共鸣+升 Lv3 精通+卖塔+补塔」，不卡进度 */
  diff: 0.90,                              /* 与 LEVELS 结构对齐（波次公式与关卡无关，当前不读取）*/
  /* 三段直廊（右行 → 下行 → 左行，共 22 格）：路径够长、转折简单，两侧留出大块空地便于演示共鸣 */
  path: [[0,3],[12,3],[12,7],[0,7]]
};
var tutorial = false;      /* true = 当前处于教学关（教学关之外恒为 false）*/
var tutStep = 1;           /* 当前任务步骤 1..TUT_TOTAL */
var tutBuffCount = 0;      /* 玩家累计点过强化卡 / 跳过按钮的次数 */
var tutStep4Base = 0;      /* 进入「选卡」那一步时的计数快照：只认本步之后的点击 */
var tutSellBase = -1;      /* 进入「出售」那一步时的塔数快照 */
var tutWxOpen = false;     /* 天气面板是否打开过 */
var tutBookOpen = false;   /* 图鉴是否打开过 */
var TUT_TOTAL = 0;         /* v9.9：弱指引改造 —— 任务清单整个撤掉（毛毛：「要弱指引，不要强制，
                              让玩家一种是他自己发现的感觉」），教学关不再派任务 */
var TUT_HINT_TXT = '（建议先过教学）';   /* 仅用于清理可能残留的旧后缀，不再追加（毛毛要求：主按钮就叫「开始防御」）*/
/* ══════════════════════════════════════════════════════════════════════════
 * v9.9 弱指引（毛毛要求：「要弱指引，不要强制，让玩家一种是他自己发现的感觉」）
 *
 * 做法：**没有任务清单、不挡任何操作、不做任何判定**。
 *   只在玩家【第一次做出某个动作之后】，从屏幕顶部飘一行小字，4 秒自己淡掉。
 *   所以顺序永远是「玩家先做，系统后提一句」—— 提示是回响，不是要求。
 *   每类提示一辈子只出现一次（HINT_SEEN 记账），不刷屏、不啰嗦。
 * ══════════════════════════════════════════════════════════════════════════ */
var HINT_SEEN = {};
var hintEl = null, hintTimer = 0;
/* 顶部弱提示：淡入 → 停留 4 秒 → 淡出；pointer-events:none，不挡点击 */
function showHint(text){
  if (!hintEl){
    hintEl = document.createElement('div');
    hintEl.id = 'hintLine';
    (document.getElementById('wrap') || document.body).appendChild(hintEl);
  }
  hintEl.textContent = text;
  hintEl.className = 'on';
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(function(){ if (hintEl) hintEl.className = ''; }, 4200);
}
function hintOnce(key, text){
  if (HINT_SEEN[key]) return;      /* 一辈子只说一次 */
  HINT_SEEN[key] = 1;
  showHint('💡 ' + text);
}
var TUT_STEPS = [];                /* 保留空数组：老代码里的下标访问不会崩 */
/* 刷新教学任务条上的文字（任务 2/5：xxx）*/
function tutBarText(){
  var el = document.getElementById('tutBar');
  if (!el) return;
  el.textContent = '任务 ' + tutStep + '/' + TUT_TOTAL + '：' + TUT_STEPS[tutStep - 1];
}
/* 同步教学任务条的显示/隐藏与内容（非教学关隐藏）*/
function tutBarSync(){
  var el = document.getElementById('tutBar');
  if (!el) return;
  el.style.display = tutorial ? 'block' : 'none';
  if (tutorial) tutBarText();
}
function tutMark(kind){ if (kind === 'buff') tutBuffCount++; }      /* 第 4 步：点过强化卡 / 跳过 */
function tutAnyLv2(){                                              /* 第 3 步：任一塔升到 Lv2 */
  for (var i = 0; i < towers.length; i++){ if (towers[i].lv >= 2) return true; }
  return false;
}
function tutAnySpec(){                                             /* 第 4 步：任一塔选了精通分支 */
  for (var i = 0; i < towers.length; i++){ if (towers[i].spec) return true; }
  return false;
}
function tutSkillFired(){                                          /* 第 7 步：任一主动技能进入冷却 = 放过技能 */
  if (typeof SKILLS === 'undefined') return false;
  for (var i = 0; i < SKILLS.length; i++){ if (SKILLS[i] && SKILLS[i].t > 0) return true; }
  return false;
}
function tutHasAdjDiff(){                                          /* 第 2 步：存在相邻的不同元素塔（共鸣）*/
  var nb = [[1,0],[-1,0],[0,1],[0,-1]];
  for (var i = 0; i < towers.length; i++){
    var t = towers[i];
    for (var k = 0; k < 4; k++){
      var o = towerAt(t.c + nb[k][0], t.r + nb[k][1]);
      if (o && o.elem !== t.elem) return true;
    }
  }
  return false;
}
/* 教学推进到下一步：更新任务条；进入第 4 步时记录基准计数，只认本步之后的点击 */
function tutAdvance(){
  if (!tutorial || tutStep >= TUT_TOTAL) return;
  var done = TUT_STEPS[tutStep - 1];
  tutStep++;
  if (tutStep === 5) tutSellBase = towers.length;      /* 第 5 步（出售）：记塔数快照 */
  if (tutStep === 6) tutStep4Base = tutBuffCount;      /* 第 6 步（选卡）：只认本步之后的点击 */
  tutBarSync();
  addFloat(W / 2, H * 0.42, '✅ 完成：' + done, '#7cf5c0');
  addFloat(W / 2, H * 0.52, '下一任务：' + TUT_STEPS[tutStep - 1], '#ffd76a');
  SFX.tutOk();
}
/* 教学任务检查（每帧调用）：按当前步骤判定是否达成（建塔→建不同系→升 2 级→抽强化卡…），达成则推进 */
function tutTick(){
  if (!tutorial) return;
  if (tutStep === 1){ if (towers.length >= 1) tutAdvance(); }                       /* 建塔 */
  else if (tutStep === 2){ if (tutHasAdjDiff()) tutAdvance(); }                     /* 共鸣 */
  else if (tutStep === 3){ if (tutAnyLv2()) tutAdvance(); }                         /* 升到 Lv2 */
  else if (tutStep === 4){ if (tutAnySpec()) tutAdvance(); }                        /* 选精通分支 */
  else if (tutStep === 5){ if (tutSellBase >= 0 && towers.length < tutSellBase) tutAdvance(); }  /* 出售 */
  else if (tutStep === 6){ if (tutBuffCount > tutStep4Base) tutAdvance(); }         /* 选强化卡/跳过 */
  else if (tutStep === 7){ if (tutSkillFired()) tutAdvance(); }                     /* 放主动技能 */
  else if (tutStep === 8){ if (tutWxOpen) tutAdvance(); }                           /* 看天气说明 */
  else if (tutStep === 9){ if (tutBookOpen) tutAdvance(); }                         /* 看图鉴 */
  /* 第 10 步「守家」：由 tutorialClear() 收尾 */
}
/* 退出教学关（离开教学场景时调用，非教学中为空操作）*/
function tutorialExit(){ tutorial = false; tutBarSync(); }
function tutMarkWx(){ tutWxOpen = true; }        /* 天气面板打开过（第 8 步）*/
function tutMarkBook(){ tutBookOpen = true; }    /* 图鉴打开过（第 9 步）*/
function syncTutLabel(){                       /* 首页主按钮保持「▶ 开始防御」原样，不再追加任何提示后缀 */
  var b = document.getElementById('startBtn');
  if (!b) return;
  var t = String(b.textContent || '');
  while (TUT_HINT_TXT && t.indexOf(TUT_HINT_TXT) >= 0) t = t.replace(TUT_HINT_TXT, '');   /* 清理历史残留 */
  b.textContent = t;
}
/* 教学通关结算：**不写 prog.unlocked / prog.best / prog.stars**，不弹「关卡完成」选关流程 */
function tutorialClear(){
  running = false; paused = false;
  tutorial = false;                                    /* 模式收尾：立刻回到普通流程语义 */
  tutStep = TUT_TOTAL;                                 /* 剩余步骤一并判完成 */
  var first = !prog.tutReward;                         /* 奖励从未发放过 */
  var pending = (prog.tutBonus | 0) > 0;               /* 已有待发放额度（重玩不叠加）*/
  prog.tutorialDone = true;
  if (first && !pending) prog.tutBonus = 50;           /* 首关金币 +50：进第 1 关时发放 */
  saveProg();
  tutBarSync();
  syncTutLabel();                                      /* 首页主按钮文案随之恢复为「▶ 开始防御」*/
  var info = document.getElementById('tutDoneInfo');
  if (info){
    info.textContent = '击杀 ' + kills + ' · 建塔 ' + built + ' · 剩余血量 ' + hp + '/' + MAXHP
      + ((first && !pending) ? ' ｜ 教学奖励：下一关（第 1 关）金币 +50' : ' ｜ 教学奖励此前已发放，不重复给');
  }
  var ov = document.getElementById('tutDoneOv');
  if (ov) ov.classList.remove('hidden');
  showBanner('🎓 教学完成');
  SFX.clear();
  SFX.tutOk();
}
/* 教学关开局：复制 startLevel 的重置骨架，地图 / 波数 / 金币改取 TUTORIAL（不改动 startLevel 本身）*/
function startTutorial(){
  hintOnce('tutOpen', '这张图随便玩、金币给得足 —— 想先搞懂什么就点什么，我不会催你');
  tutorial = true;                 /* 先置位：hideAll() 里的 tutBarSync() 依赖它 */
  endless = false;
  lvIndex = 0;                     /* 教学关不属于任何正式关卡：lvIndex 仅作兜底索引 */
  WAYPOINTS = TUTORIAL.path;
  WAYPOINTS2 = null;                                   /* 教学关单入口 */
  WAVES_TOTAL = TUTORIAL.waves;
  buildPath();
  towers = []; grid = {}; enemies = []; spawnQueue = [];
  beams = []; floats = []; parts = []; rings = [];
  curGroup = null; spawnTimer = 0;                     /* 清掉上一局残留的刷怪队列游标 */
  MAXHP = 20; hp = MAXHP; goldSet(TUTORIAL.gold); wave = 1; kills = 0; built = 0;
  BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,
            costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0, shieldHP:0,
            splashDmg:0, dotAdd:0, elBoost:0,
            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },
            tw:{}, sets:{} };                         /* v7.8 清空专属强化 ｜ v8.6 清空套装 */
  twStamp++; elemCache = {}; pickedIds = {};          /* 强化缓存失效 + 本局「已见过卡」重置 */
  pactReset();                                        /* v8.0：新一局清空无尽契约 */
  wxReset();                                          /* v8.3：新一局天气回到平稳并重掷预告 */
  SET_COUNT = {};                                     /* v8.6：新一局重新累计套装进度 */
  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */
  resetRifts();                                       /* v8.21：新一局清空共鸣裂隙 */
  isDaily = false; dailyWeatherLock = null;            /* v8.9：普通开局清掉每日挑战残留 */
  applyTalents();                                     /* v8.2 永久天赋开局生效（必须在 BUFFS 重置之后，否则加成被覆盖） */
  comboCount = 0; comboT = 0; skillResetAll(); coinFly = []; shakeT = 0;
  waveActive = false; waveBreak = 1.0; bannerT = 0; hurtT = 0;
  running = true; paused = false;
  tutStep = 1; tutBuffCount = 0; tutStep4Base = 0;
  hideAll();
  hideSel();
  speedMul = 1; updateSpeedBtn();                      /* 教学关也回到 1x */
  document.getElementById('lvName').textContent = TUTORIAL.name;
  hintBar(false);                                      /* 教学关不显示底部通用提示：任务栏已经写了同样的话，少一行战场更宽 */
  initAudio(); bgmPlay(); startWave(); updateHud(); updateWaveInfo();
  spawnTimer = 6.0;                                    /* 教学关专属：第 1 只怪 6 秒后才出现，先让玩家把塔建起来 */
  tutBarSync();
  showBanner('🎓 新兵训练');
  showTip('先点战场上的空地，建一座火焰塔');
  addFloat(W / 2, H * 0.45, '任务 1/5：' + TUT_STEPS[0], '#ffd76a');
}
/* 开始指定关卡：重置战场与全部局内状态、套用关卡与每日修正、初始化天赋，然后弹开幕提示。无尽也走它开局 */
function startLevel(i, asEndless, noIntro){
  /* v8.19：asEndless = 以无尽模式开局（无尽借用地形时才不会弹「第 1 关」的开幕提示）；
     noIntro = 不弹开场（无尽续玩用 —— 玩家已经知道自己要接着打第 N 波了）。 */
  endless = !!asEndless;                // 普通关卡：关闭无尽模式标记
  lvIndex = i;
  WAYPOINTS = LEVELS[i].path;
  WAYPOINTS2 = LEVELS[i].path2 || null;                 /* v8.10 双入口关卡 */
  WAVES_TOTAL = LEVELS[i].waves;
  buildPath();
  towers = []; grid = {}; enemies = []; spawnQueue = [];
  beams = []; floats = []; parts = []; rings = [];
  MAXHP = 20; hp = MAXHP; goldSet(LEVELS[i].gold); wave = 1; kills = 0; built = 0;
  /* ==== TUTORIAL_PATCH_V1：普通关卡开局 = 教学模式收尾（不在教学中时这两段都是空操作，行为与原先一致）==== */
  if (tutorial) tutorialExit();
  if (i === 0 && prog.tutBonus > 0 && !prog.tutReward){   /* 教学奖励：只发一次 */
    var tb = prog.tutBonus | 0;
    goldAdd(tb); prog.tutBonus = 0; prog.tutReward = true; saveProg();
    addFloat(W / 2, H * 0.38, '🎓 教学奖励  +' + tb + ' 金币', '#ffd76a');
  }
  BUFFS = { dmg:1, rate:1, range:1, gold:1, crit:0, combo:0, reso:1, splash:1, aura:1,
            costCut:0, interest:0, regen:0, bossDmg:0, pierceAdd:0, slowAdd:0, shieldHP:0,
            splashDmg:0, dotAdd:0, elBoost:0,
            el:{ fire:1, ice:1, thunder:1, poison:1, phys:1 },
            tw:{}, sets:{} };                         /* v7.8 清空专属强化 ｜ v8.6 清空套装 */
  twStamp++; elemCache = {}; pickedIds = {};          /* 强化缓存失效 + 本局「已见过卡」重置 */
  pactReset();                                        /* v8.0：新一局清空无尽契约 */
  wxReset();                                          /* v8.3：新一局天气回到平稳并重掷预告 */
  SET_COUNT = {};                                     /* v8.6：新一局重新累计套装进度 */
  resetDraftTools();                                  /* v8.7：重置「换一批 / 禁卡」次数与本局禁卡表 */
  resetRifts();                                       /* v8.21：新一局清空共鸣裂隙 */
  isDaily = false; dailyWeatherLock = null;            /* v8.9：普通开局清掉每日挑战残留 */
  applyTalents();                                     /* v8.2 永久天赋开局生效（必须在 BUFFS 重置之后，否则加成被覆盖） */
  comboCount = 0; comboT = 0; skillResetAll(); coinFly = []; shakeT = 0;
  waveActive = false; waveBreak = 1.0; bannerT = 0; hurtT = 0;
  running = true; paused = false;
  hideAll();
  hideSel();
  speedMul = 1; updateSpeedBtn();      // 每次开新关卡回到 1x
  document.getElementById('lvName').textContent = LEVELS[i].name;
  bgmPlay();                     // 进入关卡开始放 BGM（首次点击已满足浏览器手势要求）
  hintBar(i === 0);            // 1-1 显示新手提示，2 关起隐藏（重玩 1-1 会再出现）
  initAudio(); startWave(); updateHud(); updateWaveInfo();
  /* v8.19：按模式分流 —— 无尽弹自己的开场，别再借用第 1 关的模板（毛毛报的 bug） */
  if (noIntro){ running = true; paused = false; }
  else if (endless) showEndlessIntro();
  else showLevelIntro(i);                             /* v8.4：关卡开幕提示（点「开始战斗」才真正开打） */
}
/* 无尽模式：地图固定用第 1 关，波次无上限（WAVES_TOTAL=999），难度沿用原公式继续攀升 */
/* ===== v5.9 无尽模式中途存档：每波结束自动存一次，也可手动「保存并退出」 ===== */
var ENDLESS_SAVE_KEY = 'td_endless_save';
/* 把当前无尽战局（波次、塔、金币、强化卡）存进 localStorage，silent=true 时静默失败（切后台/退出时调用）*/
function saveEndless(silent){
  if (!endless || !running) return;
  try {
    var list = [];
    for (var i = 0; i < towers.length; i++){
      var t = towers[i];
      list.push({ c:t.c, r:t.r, e:t.elem, lv:t.lv, paid:t.paid || 0 });
    }
    localStorage.setItem(ENDLESS_SAVE_KEY, JSON.stringify({
      v: 1, wave: wave, gold: goldText(), hp: hp, maxhp: MAXHP, kills: kills, built: built,
      towers: list, buffs: BUFFS, cards: runCards, rifts: rifts, best: 0, t: Date.now()
    }));
    if (!silent) showTip('💾 进度已保存（第 ' + wave + ' 波）');
  } catch (e) {}
}
/* 读取无尽存档并返回对象，无存档或格式不对返回 null */
function loadEndlessSave(){
  try {
    var raw = localStorage.getItem(ENDLESS_SAVE_KEY);
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (!d || !d.wave) return null;
    return d;
  } catch (e) { return null; }
}
/* 删除无尽存档（重开或结算后调用）*/
function clearEndlessSave(){ try { localStorage.removeItem(ENDLESS_SAVE_KEY); } catch (e) {} }
/* 从存档续玩：重建塔、金币、血量、强化 */
function resumeEndless(){
  var sv = loadEndlessSave();
  if (!sv) return false;
  startEndless(true);                  /* v8.19：续玩不弹开场 —— 直接接着打第 N 波 */
  wave = sv.wave || 1;
  goldSet(sv.gold !== undefined ? sv.gold : 0);
  MAXHP = sv.maxhp || 20;
  hp = Math.min(sv.hp || MAXHP, MAXHP);
  kills = sv.kills || 0; built = sv.built || 0;
  if (sv.buffs && sv.buffs.el){ BUFFS = sv.buffs; }
  runCards = (sv.cards && sv.cards.length) ? sv.cards : [];   /* v8.18：续玩时把抽卡记录也接上 */
  rifts = (sv.rifts && sv.rifts.length) ? sv.rifts.slice() : [];   /* v8.21：续玩时恢复共鸣裂隙 */
  recalcResonance();
  towers = []; grid = {};
  var list = sv.towers || [];
  for (var i = 0; i < list.length; i++){
    var d = list[i], def = ELEMS[d.e];
    if (!def || isPath(d.c, d.r) || grid[d.c + ',' + d.r]) continue;
    var t = { c:d.c, r:d.r, elem:d.e, lv:d.lv || 1, exp:0, cd:0, ang:-Math.PI/2, res:null,
              buildT:0, flash:0, fresh:0, paid:d.paid || def.cost };
    towers.push(t); grid[d.c + ',' + d.r] = t;
  }
  recalcResonance();
  enemies = []; spawnQueue = []; curGroup = null; beams = []; floats = []; parts = [];
  waveActive = false; waveBreak = 1.2;
  document.getElementById('wave').textContent = wave;
  updateHud(); updateWaveInfo();
  showBanner('继续无尽 · 第 ' + wave + ' 波');
  startWave();
  return true;
}
/* v8.18 主界面「无尽」入口：有存档就续玩、没有就从第 1 波开始（与选关页 ♾ 节点同一套判定） */
function enterEndless(){
  if (!endlessUnlocked()){
    showTip('♾ 无尽模式要先通关第 1 关');
    try { SFX.click(); } catch (e) {}
    return false;
  }
  if (loadEndlessSave()) resumeEndless(); else startEndless();
  return true;
}
/* 进入无尽模式：借第 1 关地形开局、把波次上限设为 999、倍速复位 */
function startEndless(silent){
  startLevel(0, true, silent);         /* v8.19：以无尽模式开局 → 弹无尽自己的开场（原来弹「第 1 关」） */
  speedMul = 1; updateSpeedBtn();      // 无尽模式从 1x 起步，点按钮可切 2/5/10/100x
  WAVES_TOTAL = 999;
  document.getElementById('lvName').textContent = '♾ 无尽';
  hintBar(false);
  showBanner('♾ 无尽模式');
}
/* 从暂停/面板恢复游戏：收起弹层、解除冻结、恢复 BGM 音量并继续主循环 */
function resumeGame(){
  hideAll(); hintBar(!endless && lvIndex === 0); paused = false; menuPause = false; running = true; last = 0;
  bgmSetVol(0.42); bgmPlay();
}
/* 暂停游戏：冻结战场、压低 BGM、刷新暂停面板上的进度信息 */
function pauseGame(){
  paused = true;
  bgmSetVol(0.18);               // 暂停时把 BGM 压低而不是硬停（回来更顺）
  hintBar(false);
  document.getElementById('pauseInfo').textContent = (endless ? '♾ 无尽模式' : (tutorial ? TUTORIAL.name : LEVELS[lvIndex].name))
    + ' · 第 ' + wave + (endless ? '' : ' / ' + WAVES_TOTAL) + ' 波 · 击杀 ' + kills;
  document.getElementById('pauseOv').classList.remove('hidden');
  var esb = document.getElementById('endSaveBtn');
  if (esb) esb.style.display = endless ? 'block' : 'none';
  hideSel();
}
/* 关卡通关结算：记录最高波次与星数、解锁下一关、给星核/成就，并弹出通关面板 */
function levelClear(){
  running = false; paused = false;
  bgmSetVol(0.30);
  var b0 = prog.best[lvIndex] || 0;
  if (wave > b0) prog.best[lvIndex] = wave;
  if (prog.unlocked < lvIndex + 2) prog.unlocked = Math.min(LEVELS.length, lvIndex + 2);
  /* 三星评价：本次按剩余血量定星，只保留历史最好值 */
  if (hp >= MAXHP) unlockAch('flawless');     /* v8.21：满血通关「毫发无伤」 */
  var st = starsForHp(hp);
  if (!prog.stars) prog.stars = {};
  var s0 = prog.stars[lvIndex] || 0;
  var isNew = st > s0;
  if (isNew) prog.stars[lvIndex] = st;
  saveProg();
  var stEl = document.getElementById('clearStars');
  if (stEl) stEl.textContent = starStr(st);
  var nrEl = document.getElementById('clearNewRec');
  if (nrEl){
    nrEl.style.display = 'block';
    nrEl.textContent = isNew
      ? '🎉 新纪录！剩余血量 ' + hp + ' → ' + st + ' 星'
      : '本次 ' + st + ' 星 · 历史最好 ' + Math.max(st, s0) + ' 星';
  }
  /* v8.9 每日挑战：当天首次通关给星核（剩余血越多给得越多）
     注意：这段必须在星级提示之后就位，并用「追加」而不是覆盖，否则挑战奖励提示会被星级文本盖掉 */
  if (isDaily){
    var dEl2 = document.getElementById('clearNewRec');
    if (!dailyDoneToday()){
      var gain = 2 + Math.floor(hp / 5);
      addStarcore(gain);
      prog.daily = String(todaySeed());
      if (dEl2) dEl2.textContent = String(dEl2.textContent || '') + '　📅 每日挑战 +' + gain + ' 星核（累计 ' + starcore() + '）';
      addFloat(W / 2, H * 0.42, '📅 每日挑战 +' + gain + ' 星核', '#ffd76a');
    } else if (dEl2){
      dEl2.textContent = String(dEl2.textContent || '') + '　📅 今天的每日挑战已领过奖励（#' + todaySeed() + '）';
    }
    isDaily = false;
  }
  document.getElementById('clearInfo').textContent = LEVELS[lvIndex].name + ' 通关！击杀 ' + kills + ' · 建塔 ' + built;
  document.getElementById('clearOv').classList.remove('hidden');
  SFX.clear();
}
/* 首页「开始防御」入口：收起弹层并直接开第 1 关 */
function startGame(){ hideAll(); startLevel(0); }
/* 失败结算：记录最高波次、清无尽存档、弹失败面板并给出重试/回首页入口 */
function gameOver(){
  running = false;
  bgmSetVol(0.22);
  var best = 0;
  try { best = parseInt(localStorage.getItem('td_best') || '0', 10) || 0; } catch (e) { best = 0; }
  if (wave > best){ best = wave; try { localStorage.setItem('td_best', String(best)); } catch (e) {} }
  document.getElementById('ovWave').textContent = wave;
  document.getElementById('ovKills').textContent = kills;
  document.getElementById('ovTowers').textContent = built;
  document.getElementById('ovBest').textContent = best;
  var eb = saveEndlessBest();                  // 无尽模式：取最大值写入 td_endless_best
  /* ===== v8.0 无尽冲波评分：撑得越久越高，基地血量上限 / 击杀数 / 金币效率一并计入 ===== */
  var score = wave * 1000 + MAXHP * 100 + kills * 10 + Math.floor(gold / 100);
  var bestScore = 0;
  try { bestScore = parseInt(localStorage.getItem('td_endless_score') || '0', 10) || 0; } catch (e2) { bestScore = 0; }
  if (endless && score > bestScore){ bestScore = score; try { localStorage.setItem('td_endless_score', String(score)); } catch (e3) {} }
  /* ===== v8.2 转生：无尽撑到 50 波起，每 10 波换 1 星核 =====
     v8.7：不到 50 波也按每 20 波 1 颗给（失败不再白打 —— 肉鸽的长线钩子） */
  var gained = 0;
  if (endless){
    gained = (wave >= 50) ? Math.floor(wave / 10) : Math.floor(wave / 20);
    if (gained > 0) addStarcore(gained);
  }
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
  }
  document.getElementById('overOv').classList.remove('hidden');
  hideSel();
  SFX.gameover();
}
window.addEventListener('resize', function(){ resize(); draw(); });
resize();
