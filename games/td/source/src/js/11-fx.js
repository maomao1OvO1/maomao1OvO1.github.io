/* ══════════════════════════════════════════════════════════════════════════
 * 11-fx.js —— 特效池：飘字 / 爆炸 / 弹道对象的复用管理
 *
 * 来源：game.html 第 3877-3897 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 特效池 ================= */
/* TOWERS_V6_PATCH：rings = 溅射/范围命中圈特效池（每发子弹只产生 1 个对象，不每帧新建）*/
var beams = [], floats = [], parts = [], rings = [], banner = '', bannerT = 0, hurtT = 0;
/* 添加一条短暂的光束特效（炮塔射击的视觉反馈）*/
function addBeam(x1, y1, x2, y2, color){ beams.push({ x1:x1, y1:y1, x2:x2, y2:y2, color:color, life:0.13, max:0.13 }); }
/* 添加一条绿色治疗光束（奶妈怪给队友回血时用）*/
function addHealBeam(x1, y1, x2, y2){ beams.push({ x1:x1, y1:y1, x2:x2, y2:y2, color:'rgba(140,255,180,.95)', life:0.45, max:0.45 }); }
/* 添加一个上浮文字（伤害数字/金币/提示语）*/
function addFloat(x, y, txt, color){ floats.push({ x:x, y:y, txt:String(txt), color:color, life:0.9, max:0.9 }); }
/* 在指定位置炸开 n 个粒子（命中、死亡、爆炸都用它做视觉反馈）*/
function burst(x, y, color, n){
  for (var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 130;
    parts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, color:color, life:0.45+Math.random()*0.35, max:0.8, r:1.5+Math.random()*2.5 });
  }
}
/* 屏幕中央显示一条横幅提示（如 BOSS 来袭、套装激活），1.7 秒后自动消失 */
function showBanner(t){ banner = t; bannerT = 1.7; }
/* 触发受击红屏闪烁（漏怪扣血时调用）*/
function flashHurt(){ hurtT = 0.32; }

