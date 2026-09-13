#!/bin/bash
# 一次性工具：把单文件 game.html 拆成 src/ 多文件结构（只切不改，切完逐段校验）
set -e
cd /storage/emulated/0/dsh/maomao1OvO1.github.io/games/td/source
G=game.html

# ---- 备份 ----
mkdir -p /storage/emulated/0/dsh/_backup
cp "$G" /storage/emulated/0/dsh/_backup/game.html.before-split

mkdir -p src/css src/js

hdr() {  # 文件名 标题 起 止 作用域
  printf '/* %s\n' "══════════════════════════════════════════════════════════════════════════"
  printf ' * %s —— %s\n *\n' "$1" "$2"
  printf ' * 来源：game.html 第 %s-%s 行（由 _split_game.sh 拆出，代码正文逐字符未改）\n' "$3" "$4"
  printf ' * 作用域：%s\n' "$5"
  printf ' * %s */\n\n' "══════════════════════════════════════════════════════════════════════════"
}

# ================= CSS（3 段）=================
{ hdr 01-base.css "基础样式：布局骨架 / 主题色 / 顶部 HUD / 战场 / 各类弹层" 65 494 "独立样式表，由 index.html 按序号引入";
  sed -n '65p' "$G" | sed 's/^<style>//'; sed -n '66,494p' "$G"; } > src/css/01-base.css
{ hdr 02-responsive.css "自适应分档：小屏与横屏（@media）" 495 616 "独立样式表，由 index.html 按序号引入";
  sed -n '495,616p' "$G"; } > src/css/02-responsive.css
{ hdr 03-home.css "主界面美术：纯 CSS 动效（呼吸光环 / Logo 辉光 / 图标网格）" 617 903 "独立样式表，由 index.html 按序号引入";
  sed -n '617,903p' "$G"; } > src/css/03-home.css

# ================= JS（21 段）=================
J() { local f=$1 t=$2 a=$3 b=$4
  { hdr "$f" "$t" "$a" "$b" "与外层 IIFE 内其他 JS 文件共享同一作用域，按序号顺序加载"; sed -n "${a},${b}p" "$G"; } > "src/js/$f"; }

J 01-core.js     "核心启动：严格模式 / 全局错误兜底 / 画布与尺寸（resize、DPR）" 1166 1195
J 02-map-grid.js "地图网格：16×10 布局、单格边长与坐标换算（cx / cy）" 1196 1204
J 03-utils.js    "通用开关与工具：低画质模式、射程预览、发光封装" 1205 1336
J 04-towers.js   "塔：9 座塔数据表 ELEMS、全局加成 BUFFS、连杀状态、技能/套装/成就状态" 1337 2592
J 05-cards.js    "强化卡：76 张卡池 BUFF_POOL（普通 / 稀有 / 史诗三档）" 2593 2974
J 06-upgrades.js "升级体系：每座塔的专属成长与四大体系整体加成" 2975 3134
J 07-enemies.js  "敌人：ENEMIES 数据表与词缀" 3135 3253
J 08-boss.js     "BOSS 技能与阶段行为" 3254 3581
J 09-fire.js     "塔开火：选目标、伤害结算、共鸣触发" 3582 3778
J 10-waves.js    "波次：出兵调度、天气轮换（每 3 波一换）" 3779 3876
J 11-fx.js       "特效池：飘字 / 爆炸 / 弹道对象的复用管理" 3877 3897
J 12-draw.js     "渲染：静态路径层缓存、敌人贴图预渲染、全部绘制逻辑" 3898 4691
J 13-hud.js      "HUD 与提示：金币 / 波次 / 血条，以及音效与 BGM（纯 Web Audio 合成）" 4692 5358
J 14-input.js    "触屏交互：点选建塔、升级面板、图鉴与角色标签" 5359 5669
J 15-settings.js "设置面板：音效 / 画质 / 清档" 5670 5791
J 16-loop.js     "主循环：frame() 每帧的推进与调度" 5792 5968
J 17-flow.js     "开局与结束流程：startLevel / 结算" 5969 5980
J 18-stars.js    "三星评价：按剩余基地血量结算" 5981 5989
J 19-endless.js  "无尽模式：中途存档、续玩、最佳记录" 5990 6129
J 20-book.js     "图鉴与选关：怪物/炮塔/共鸣/强化卡/体系/资料，以及关卡地图" 6130 7229
J 21-boot.js     "启动绑定：事件接线、设置加载、首页渲染、进入主循环" 7230 7399

# ================= index.html =================
{
  sed -n '1,64p' "$G"
  for f in 01-base.css 02-responsive.css 03-home.css; do echo "  <link rel=\"stylesheet\" href=\"css/$f\">"; done
  sed -n '905,1163p' "$G"
  for f in $(ls src/js/*.js | xargs -n1 basename); do echo "<script src=\"js/$f\"></script>"; done
  sed -n '7402,$p' "$G"
} > src/index.html

# ================= 逐段校验（拆出的正文必须与原文件对应行完全一致）=================
echo "=== 逐段校验 ==="
ok=1
vex() { # 文件 起 止 [skipStyle]
  local f=$1 a=$2 b=$3
  local body; body=$(awk 'p{print} /\*\//{p=1}' "$f" | tail -n +2)
  local orig; orig=$(sed -n "${a},${b}p" "$G")
  if [ "$body" = "$orig" ]; then printf '  ✓ %s\n' "$(basename "$f")"; else printf '  ✗ %s 不一致\n' "$(basename "$f")"; ok=0; fi
}
# CSS 第一段的 65 行去掉了 <style>，单独比
body=$(awk 'p{print} /\*\//{p=1}' src/css/01-base.css)
orig="$(sed -n '65p' "$G" | sed 's/^<style>//')
$(sed -n '66,494p' "$G")"
if [ "$body" = "$orig" ]; then echo "  ✓ 01-base.css（含 <style> 去标签处理）"; else echo "  ✗ 01-base.css"; ok=0; fi
vex src/css/02-responsive.css 495 616
vex src/css/03-home.css 617 903
vex src/js/01-core.js 1166 1195
vex src/js/02-map-grid.js 1196 1204
vex src/js/03-utils.js 1205 1336
vex src/js/04-towers.js 1337 2592
vex src/js/05-cards.js 2593 2974
vex src/js/06-upgrades.js 2975 3134
vex src/js/07-enemies.js 3135 3253
vex src/js/08-boss.js 3254 3581
vex src/js/09-fire.js 3582 3778
vex src/js/10-waves.js 3779 3876
vex src/js/11-fx.js 3877 3897
vex src/js/12-draw.js 3898 4691
vex src/js/13-hud.js 4692 5358
vex src/js/14-input.js 5359 5669
vex src/js/15-settings.js 5670 5791
vex src/js/16-loop.js 5792 5968
vex src/js/17-flow.js 5969 5980
vex src/js/18-stars.js 5981 5989
vex src/js/19-endless.js 5990 6129
vex src/js/20-book.js 6130 7229
vex src/js/21-boot.js 7230 7399
echo "校验结果：$([ $ok = 1 ] && echo '全部一致 ✅' || echo '有文件不一致 ❌')"
echo; echo "=== 产出 ==="; find src -type f | sort | while read f; do printf '%8d  %s\n' "$(wc -l < "$f")" "$f"; done
