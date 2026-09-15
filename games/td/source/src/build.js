#!/usr/bin/env node
/* ============================================================================
 * build.js —— 把 src/ 的多文件源码拼回单文件 game.html
 *
 * 用法：  node build.js [输出路径]        （默认覆盖上级目录的 game.html）
 *
 * 为什么还要单文件：
 *   · test/*.js 测试脚本读的就是单文件；安卓 APK 打包也用它；
 *   · 而且「一个文件双击就能玩」本身就是这个项目对外的卖点之一。
 * 所以规矩是：**src/ 是唯一源码，game.html 是构建产物** —— 要改游戏改 src/，
 * 改完跑一次本脚本；不要再直接编辑 game.html。
 * ==========================================================================*/
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = process.argv[2] || path.join(SRC, '..', 'game.html');

/* 文件顺序 = 加载顺序（JS 各文件共享同一作用域，顺序不能乱） */
const CSS = ['01-base.css', '02-responsive.css', '03-home.css', '04-pixel.css'];
const JS = ['01-core.js', '02-map-grid.js', '03-utils.js', '04-towers.js', '05-cards.js',
  '06-upgrades.js', '07-enemies.js', '08-boss.js', '09-fire.js', '10-waves.js', '11-fx.js',
  '12-draw.js', '13-hud.js', '14-input.js', '15-settings.js', '16-loop.js', '17-flow.js',
  '18-stars.js', '19-endless.js', '20-book.js', '21-pixel.js', '22-boot.js'];

/* 去掉拆分时加的文件头注释（截到注释结束符为止），并吃掉紧跟的那一个空行 */
function strip(txt) {
  const i = txt.indexOf('*/');
  const b = i >= 0 ? txt.slice(i + 2) : txt;
  return b.replace(/^\n+/, '');
}

/* VERSION_INJECT：版本号单一来源 = ../version.json，注入到 index.html 的 v__VERSION__ 占位符 */
const VER = (function(){
  try { return JSON.parse(fs.readFileSync(path.join(SRC, '..', '..', 'version.json'), 'utf8')).version; }
  catch (e) { return 'dev'; }
})();

const lines = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').split('\n');
const iHeadEnd = lines.findIndex(l => l.trim() === '</head>');
const iScript = lines.findIndex(l => l.indexOf('<script src=') >= 0);
const iBodyEnd = lines.findIndex(l => l.trim() === '</body>');

/* head 区 = <head> 的全部内容，只剔除那 4 条外部样式表引用（CSS 已内联进下面的 <style>）。
 * ⚠️ 这里原来写的是 `lines.slice(0, iLink)`（切到第一条 stylesheet 为止），会把
 *    「第一条 stylesheet 之后、</head> 之前」的内容**静默丢弃** —— 正是那几行
 *    preconnect / dns-prefetch 性能提示，导致按本脚本重建出来的 game.html 与已发布版
 *    差 4 行、构建不可复现（2026-09-15 定位并修复）。改 head 时请保留此过滤写法。 */
const headTop = lines.slice(0, iHeadEnd).filter(l => l.indexOf('<link rel="stylesheet"') < 0);
const bodyMid = lines.slice(iHeadEnd, iScript);   /* 从 </head> 起，含 </head> */     // <body> ... 界面结构
const tail = lines.slice(iBodyEnd);                     // </body></html>

const cssText = CSS.map(f => strip(fs.readFileSync(path.join(SRC, 'css', f), 'utf8')))
  .join('').replace(/\n$/, '');
const jsText = JS.map(f => strip(fs.readFileSync(path.join(SRC, 'js', f), 'utf8')))
  .join('').replace(/\n$/, '');

let out = [
  ...headTop,
  '<style>' + cssText,
  '</style>',
  ...bodyMid,
  '<script>',
  '(function(){',
  jsText,
  '})();',
  '</script>',
  ...tail,
].join('\n');

out = out.replace(/v__VERSION__/g, 'v' + VER);   /* 注入真实版本号 */
fs.writeFileSync(OUT, out);
console.log('已生成 ' + OUT + '（' + out.length + ' 字节）');
