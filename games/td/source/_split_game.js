#!/usr/bin/env node
/* ============================================================================
 * _split_game.js —— 一次性工具：把单文件 game.html 拆成 src/ 多文件结构
 *
 * 用法：  node _split_game.js
 * 产出：  src/index.html     HTML 骨架（引用外部 css / js）
 *         src/css/*.css      样式（3 个文件）
 *         src/js/*.js        逻辑（21 个文件，按原有分节边界切）
 *         src/build.js       反向脚本：把 src/ 重新拼回单文件 game.html
 *
 * 拆分原则（重要）：
 *   1. 只「切」不「改」—— 每个文件的代码正文与原文逐字符一致，一行不动；
 *   2. 切点全部落在原有分节注释处（都在顶层语句边界，不会切坏函数）；
 *   3. 各 JS 文件按原顺序加载，共享同一个作用域（build 时会统一包回 IIFE）；
 *   4. 拆完立刻做「重建比对」：用拆出的文件拼回去必须与原文件字节级一致。
 * ==========================================================================*/

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IN = path.join(ROOT, 'game.html');
const raw = fs.readFileSync(IN, 'utf8');
const L = raw.split('\n');
const at = (i) => L[i - 1];
const seg = (a, b) => L.slice(a - 1, b);          // 1-based，闭区间
const chk = (i, re, what) => {
  const s = at(i);
  if (!re.test(s)) throw new Error(`防呆失败：第 ${i} 行应为「${what}」，实际是 ${JSON.stringify((s || '').slice(0, 80))}`);
};

/* ---------- 0. 防呆：先确认文件结构没变过 ---------- */
chk(65,   /^<style>/,          '<style> 起始行');
chk(904,  /^<\/style>/,        '</style> 结束行');
chk(1164, /^<script>$/,        '<script> 起始行');
chk(1165, /^\(function\(\)\{$/, '外层 IIFE 开始');
chk(7400, /^\}\)\(\);$/,        '外层 IIFE 结束');
chk(7401, /^<\/script>$/,      '</script> 结束行');

/* ---------- 1. 分节表 ---------- */

// CSS（<style> 内的 65-903 行；904 是 </style>）
const CSS = [
  [65,  494, 'css/01-base.css',       '基础样式：布局骨架 / 主题色 / 顶部 HUD / 战场 / 弹层'],
  [495, 616, 'css/02-responsive.css', '自适应分档：小屏与横屏（@media）'],
  [617, 903, 'css/03-home.css',       '主界面美术：纯 CSS 动效（呼吸光环 / Logo 辉光 / 图标网格）'],
];

// JS（IIFE 内部 1166-7399 行）—— 切点全部取自文件里原有的 `/* ==== 分节 ==== */` 注释
const JS = [
  [1166, 1195, '01-core.js',       '核心启动：严格模式 / 全局错误兜底 / 画布与尺寸（resize、DPR）'],
  [1196, 1204, '02-map-grid.js',   '地图网格：16×10 布局、单格边长与坐标换算（cx / cy）'],
  [1205, 1336, '03-utils.js',      '通用开关与工具：低画质模式、射程预览、发光封装'],
  [1337, 2592, '04-towers.js',     '塔：9 座塔的数据表 ELEMS、全局加成 BUFFS、连杀、技能与套装/成就状态'],
  [2593, 2974, '05-cards.js',      '强化卡：76 张卡池 BUFF_POOL（普通 / 稀有 / 史诗三档）'],
  [2975, 3134, '06-upgrades.js',   '升级体系：每座塔的专属成长与四大体系整体加成'],
  [3135, 3253, '07-enemies.js',    '敌人：ENEMIES 数据表与词缀'],
  [3254, 3581, '08-boss.js',       'BOSS 技能与阶段行为'],
  [3582, 3778, '09-fire.js',       '塔开火：选目标、伤害结算、共鸣触发'],
  [3779, 3876, '10-waves.js',      '波次：出兵调度、天气轮换（每 3 波一换）'],
  [3877, 3897, '11-fx.js',         '特效池：飘字 / 爆炸 / 弹道对象的复用管理'],
  [3898, 4691, '12-draw.js',       '渲染：静态路径层缓存、敌人贴图预渲染、全部绘制逻辑'],
  [4692, 5358, '13-hud.js',        'HUD 与提示：金币 / 波次 / 血条，以及音效与 BGM（纯 Web Audio 合成）'],
  [5359, 5669, '14-input.js',      '触屏交互：点选建塔、升级面板、图鉴与角色标签'],
  [5670, 5791, '15-settings.js',   '设置面板：音效 / 画质 / 清档'],
  [5792, 5968, '16-loop.js',       '主循环：frame() 每帧的推进与调度'],
  [5969, 5980, '17-flow.js',       '开局与结束流程：startLevel / 结算'],
  [5981, 5989, '18-stars.js',      '三星评价：按剩余基地血量结算'],
  [5990, 6129, '19-endless.js',    '无尽模式：中途存档、续玩、最佳记录'],
  [6130, 7229, '20-book.js',       '图鉴与选关：怪物/炮塔/共鸣/强化卡/体系/资料，以及关卡地图'],
  [7230, 7399, '21-boot.js',       '启动绑定：事件接线、设置加载、首页渲染、进入主循环'],
];

/* ---------- 2. 覆盖完整性校验（防漏行 / 防重行）---------- */
function assertCover(tbl, from, to, label) {
  let cur = from;
  for (const [a, b, f] of tbl) {
    if (a !== cur) throw new Error(`${label} 覆盖不连续：上一段结束于 ${cur - 1}，下一段从 ${a} 开始（${f}）`);
    if (b < a) throw new Error(`${label} 区间反向：${f}`);
    cur = b + 1;
  }
  if (cur !== to + 1) throw new Error(`${label} 未覆盖到 ${to}（止于 ${cur - 1}）`);
}
assertCover(CSS, 65, 903, 'CSS');
assertCover(JS, 1166, 7399, 'JS');

/* ---------- 3. 写文件 ---------- */
const SRC = path.join(ROOT, 'src');
for (const d of ['', 'css', 'js']) fs.mkdirSync(path.join(SRC, d), { recursive: true });

const BANNER = (file, title, a, b, kind) =>
  `/* ${'='.repeat(74)}\n` +
  ` * ${file} —— ${title}\n` +
  ` *\n` +
  ` * 来源：game.html 第 ${a}-${b} 行（${kind}，由 _split_game.js 拆出，代码正文与原文件逐字符一致）\n` +
  ` * 作用域：${kind === 'JS' ? '与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载' : '独立样式表，由 index.html 按序号顺序引入'}\n` +
  ` * ${'='.repeat(74)} */\n\n`;

// CSS
CSS.forEach(([a, b, f, title], i) => {
  let body = seg(a, b).join('\n');
  if (i === 0) body = body.replace(/^<style>\s*/, '');   // 去掉第 65 行的 <style> 标签
  fs.writeFileSync(path.join(SRC, f), BANNER(f, title, a, b, 'CSS') + body + '\n');
});

// JS
JS.forEach(([a, b, f, title]) => {
  fs.writeFileSync(path.join(SRC, 'js', f), BANNER(f, title, a, b, 'JS') + seg(a, b).join('\n') + '\n');
});

/* ---------- 4. index.html ---------- */
const links  = CSS.map(([, , f]) => `  <link rel="stylesheet" href="${f}">`);
const scripts = JS.map(([, , f]) => `<script src="js/${f}"></script>`);
const html = [
  ...seg(1, 64),                       // DOCTYPE + 文件头说明 + <head> 的 meta
  ...links,
  at(905),                             // </head>
  ...seg(906, 1163),                   // <body> ... 界面结构完
  ...scripts,
  ...seg(7402, L.length),              // </body> </html>
].join('\n');
fs.writeFileSync(path.join(SRC, 'index.html'), html);

/* ---------- 5. build.js（反向：src → 单文件）---------- */
const buildSrc = `#!/usr/bin/env node
/* ============================================================================
 * build.js —— 把 src/ 里的多文件源码拼回单文件 game.html
 *
 * 用法：  node build.js [输出路径]      （默认覆盖上级目录的 game.html）
 * 用途：  测试（test/*.js 读的是单文件）、安卓 APK 打包、以及给需要「一个文件」的人下载
 * 说明：  src/ 是唯一源码；game.html 是构建产物，不要直接改它。
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');
const SRC = __dirname;
const OUT = process.argv[2] || path.join(SRC, '..', 'game.html');

const CSS = ${JSON.stringify(CSS.map(c => c[2]))};
const JS  = ${JSON.stringify(JS.map(j => j[2]))};
const r = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

/* 去掉拆分时加的文件头注释，还原成原始代码行 */
const strip = (txt, isCss) => {
  const i = txt.indexOf('*/');
  let body = i >= 0 ? txt.slice(i + 2) : txt;
  return body.replace(/^\\n+/, '').replace(/\\n+$/, isCss ? '\\n' : '');
};

const head = r('index.html');
const mHead = head.split('\\n');
/* index.html 里定位：<link> 之前是 <head> 头，之后到 </head>，再往后是 body */
const iFirstLink = mHead.findIndex(l => l.includes('<link rel="stylesheet"'));
const iHeadEnd   = mHead.findIndex(l => l.trim() === '</head>');
const iFirstJs   = mHead.findIndex(l => l.includes('<script src='));

const headTop = mHead.slice(0, iFirstLink);
const bodyMid = mHead.slice(iHeadEnd + 1, iFirstJs);
const tail    = mHead.slice(mHead.findIndex(l => l.trim() === '</body>'));

const cssText = CSS.map(f => strip(r(f), true)).join('');
const jsText  = JS.map(f => strip(r('js/' + f), false)).join('\\n');

const out = [
  ...headTop,
  '<style> ' + cssText.replace(/^\\s*/, ''),
  '</style>',
  ...bodyMid,
  '<script>',
  '(function(){',
  jsText,
  '})();',
  '</script>',
  ...tail,
].join('\\n');

fs.writeFileSync(OUT, out);
console.log('已生成：' + OUT + '（' + out.length + ' 字节）');
`;
fs.writeFileSync(path.join(SRC, 'build.js'), buildSrc);

/* ---------- 6. 无损自检：重建后必须与原文件字节级一致 ---------- */
function rebuildInMemory() {
  const strip = (txt, isCss) => {
    const i = txt.indexOf('*/');
    let body = i >= 0 ? txt.slice(i + 2) : txt;
    return body.replace(/^\n+/, '').replace(/\n+$/, isCss ? '\n' : '');
  };
  const cssText = CSS.map(([, , f]) => strip(fs.readFileSync(path.join(SRC, f), 'utf8'), true)).join('');
  const jsText = JS.map(([, , f]) => strip(fs.readFileSync(path.join(SRC, 'js', f), 'utf8'), false)).join('\n');
  return [
    ...seg(1, 64),
    '<style> ' + cssText.replace(/^\s*/, ''),
    '</style>',
    ...seg(906, 1163),
    '<script>',
    '(function(){',
    jsText,
    '})();',
    '</script>',
    ...seg(7402, L.length),
  ].join('\n');
}

const rebuilt = rebuildInMemory();
const same = rebuilt === raw;
console.log('CSS 文件：' + CSS.length + ' 个 ｜ JS 文件：' + JS.length + ' 个 ｜ 原始 ' + raw.length + ' 字节');
if (same) {
  console.log('✅ 重建比对：与原 game.html【字节级完全一致】—— 拆分无损，逻辑一行未改');
} else {
  console.log('⚠️ 重建比对：不一致！长度 ' + rebuilt.length + ' vs ' + raw.length);
  for (let i = 0; i < Math.max(rebuilt.length, raw.length); i++) {
    if (rebuilt[i] !== raw[i]) {
      console.log('首个差异在第 ' + i + ' 字节：');
      console.log('  原始: ' + JSON.stringify(raw.slice(Math.max(0, i - 60), i + 60)));
      console.log('  重建: ' + JSON.stringify(rebuilt.slice(Math.max(0, i - 60), i + 60)));
      break;
    }
  }
  process.exitCode = 1;
}
