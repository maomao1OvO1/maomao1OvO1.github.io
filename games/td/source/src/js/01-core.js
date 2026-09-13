/* ══════════════════════════════════════════════════════════════════════════
 * 01-core.js —— 核心启动：严格模式 / 全局错误兜底 / 画布与尺寸（resize、DPR）
 *
 * 来源：game.html 第 1166-1195 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

'use strict';
window.onerror = function(msg, src, line, col, err){
  try {
    var d = document.getElementById('__err');
    if (!d){
      d = document.createElement('div'); d.id = '__err';
      d.style.cssText = 'position:fixed;left:6px;top:6px;right:6px;z-index:9999;background:rgba(170,20,20,.95);color:#fff;font:12px/1.5 monospace;padding:9px;border-radius:8px;white-space:pre-wrap;max-height:42%;overflow:auto;';
      document.body.appendChild(d);
    }
    d.textContent = 'JS 错误：' + msg + '\n行 ' + line + ':' + col + (err && err.stack ? '\n' + err.stack.split('\n').slice(0,3).join('\n') : '');
  } catch (e) {}
  return false;
};
/* 主战场画布与 2D 上下文：整个战场（格子/塔/怪/特效）都画在这一张 canvas 上 */
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
/* 画布逻辑尺寸与设备像素比：W/H 由 resize() 按窗口实测写入，DPR 用来把逻辑像素换算成物理像素 */
var W = 0, H = 0, DPR = 1;
/* 画布尺寸初始化：按窗口实际大小与设备像素比重设 canvas 分辨率，并缓存 W/H（窗口尺寸变化 / 旋转屏幕时调用）*/
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  var wrap = document.getElementById('canvasWrap');
  W = wrap.clientWidth; H = wrap.clientHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layout();
  /* v8.23 适配：竖屏时显示提示条（横屏自动隐藏）*/
  var _rh = document.getElementById('rotHint');
  if (_rh) _rh.style.display = (H > W) ? 'block' : 'none';
}
