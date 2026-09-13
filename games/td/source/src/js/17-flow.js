/* ══════════════════════════════════════════════════════════════════════════
 * 17-flow.js —— 开局与结束流程：startLevel / 结算
 *
 * 来源：game.html 第 5969-5980 行（由 _split_game.sh 拆出，代码正文逐字符未改）
 * 作用域：与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载
 * ══════════════════════════════════════════════════════════════════════════ */

/* ================= 开局 / 结束 ================= */
var prog = { unlocked: 1, best: {}, stars: {} };
try { var pj = JSON.parse(localStorage.getItem('td_prog') || '{}'); if (pj && pj.unlocked) prog = pj; } catch (e) {}
loadTalents();   /* v8.2 读取永久天赋 */
/* 旧存档兼容：td_prog 里可能没有 stars / best 字段，读档后兜底初始化 */
if (!prog.stars) prog.stars = {};
if (!prog.best) prog.best = {};
/* ==== TUTORIAL_PATCH_V1：教学相关存档字段兜底（旧存档没有这几个字段，读取处一律按 undefined 判）==== */
if (!('tutorialDone' in prog)) prog.tutorialDone = false;   /* 教学是否已通关（首页「开始防守」文案用）*/
if (!('tutReward' in prog)) prog.tutReward = false;         /* 教学奖励是否已发放（防重复发放）*/
if (!('tutBonus' in prog)) prog.tutBonus = 0;               /* 待发放的教学奖励金币（进第 1 关时结算）*/
function saveProg(){ try { localStorage.setItem('td_prog', JSON.stringify(prog)); } catch (e) {} }
