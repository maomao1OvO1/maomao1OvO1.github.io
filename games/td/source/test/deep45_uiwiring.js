// v8.25 自检：所有静态按钮都必须有绑定（防止「加了按钮忘绑事件」再犯）
//   背景：v8.18 加「🌤 天气」页签、v8.21 加「🏆 成就」页签，两次都忘了绑点击 → 点了没反应。
var fs = require('fs');
var html = fs.readFileSync(process.argv[2], 'utf8');
var js = html.match(/<script>[\s\S]*?<\/script>/g).pop();

/* 这几个按钮是「动态生成 + 走事件委托 / 在生成处绑定」，不适用静态检查 */
var DYNAMIC_OK = {
  refundBtn:   '在 #sel 的点击委托里用 dataset.refund 判定',
  resoAllBtn:  '在 bindResoTreeClicks() 里按 b.id 绑定',
  swWxMore:    '在 updateSideBar() 里生成后 addEventListener'
};
var btns = [];
var re = /<button[^>]*\bid="([A-Za-z0-9_]+)"/g, m;
while ((m = re.exec(html))) btns.push(m[1]);
var onBound = new Set();
var re2 = /on\('([A-Za-z0-9_]+)'/g;
while ((m = re2.exec(js))) onBound.add(m[1]);
var re3 = /getElementById\('([A-Za-z0-9_]+)'\)\.addEventListener/g;
while ((m = re3.exec(js))) onBound.add(m[1]);

var fail = 0;
function ok(c, msg){ if (!c){ console.log('  ❌ ' + msg); fail++; } else console.log('  ✅ ' + msg); }

console.log('=== ① 图鉴 8 个页签全部可点（毛毛报的 bug）===');
var TABS = ['bookTabMob','bookTabTower','bookTabReso','bookTabBuff','bookTabSys','bookTabInfo','bookTabWx','bookTabAch'];
TABS.forEach(function(t){
  ok(html.indexOf('id="' + t + '"') >= 0, '存在页签 #' + t);
  ok(onBound.has(t), '★ 页签 #' + t + ' 已绑定点击');
});

console.log('=== ② 全量：静态按钮不能有「孤儿」（加了却点不动）===');
var orphans = btns.filter(function(b){ return !onBound.has(b) && !DYNAMIC_OK[b]; });
ok(orphans.length === 0, '全部 ' + btns.length + ' 个静态按钮都有绑定' + (orphans.length ? '（缺：' + orphans.join(', ') + '）' : ''));
console.log('  （已知 ' + Object.keys(DYNAMIC_OK).length + ' 个走委托/动态绑定的按钮已排除：' + Object.keys(DYNAMIC_OK).join(' / ') + '）');

console.log('=== ③ 图鉴页签的 id 表与绑定表要一一对应 ===');
var tbl = (js.match(/var ids = \{([^}]*)\}/) || [])[1] || '';
var inTable = [];
var re4 = /'([A-Za-z0-9_]+)'/g;
while ((m = re4.exec(tbl))) inTable.push(m[1]);
ok(inTable.length === TABS.length, 'bookRenderTabs 的 id 表有 ' + inTable.length + ' 项，与 8 个页签一致');
inTable.forEach(function(id){ ok(onBound.has(id), 'id 表里的 #' + id + ' 也有绑定（两边不会漏）'); });

console.log(fail === 0 ? '\n✅✅ v8.25 按钮绑定自检全部通过（0 失败）' : '\n❌❌ 共 ' + fail + ' 项失败');
process.exit(fail ? 1 : 0);

/* 退出码：失败时返回非零，便于批量跑与 CI 感知失败（2026-09-15 加） */
if (fail > 0) process.exit(1);
