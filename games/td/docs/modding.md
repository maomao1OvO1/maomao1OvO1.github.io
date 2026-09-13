# 《共鸣之塔》改造指南 —— 怎么改、怎么加东西

> **这个游戏是完全开放的。** v8.20 起已移除所有加固：APK 里就是明文 HTML，没有任何加密、没有签名校验。
> 你可以随便改数值、改界面、加塔、加关卡、加敌人、加卡、加机制 —— 改完重新打包就是你的版本，不需要征求任何人同意。
> 配套文档：[完整游戏设计文档](manual.md)（所有数值与机制的权威说明）

---

## 一、先搞清楚你手里的是什么

解包 APK（把 `.apk` 后缀改成 `.zip` 再解开），你会看到：

```
assets/index.html      ← 页面骨架（HTML，引用下面的 css / js）
assets/css/*.css       ← 样式（3 个文件：base / responsive / home）
assets/js/*.js         ← 逻辑（21 个文件，按序号顺序加载）
assets/music/bgm.ogg   ← 背景音乐（CC0，可换）
```

**整个游戏就是一个 HTML 文件。** 没有编译、没有构建、没有依赖。

### ⭐ 关键：不打包 APK 也能改和玩

因为它是纯 HTML5，**你根本不需要 Android 工具链**：

1. 解包拿到 `assets/` 整个文件夹
2. 用**任何文本编辑器**打开 `index.html` 改
3. **直接用浏览器打开 `index.html`** —— 就能玩、就能测

只有当你**想装到手机上变成 APK** 时，才需要下面的打包工具链（见第七节）。

> 💡 在电脑上开发时，推荐用 Chrome 打开，按 F12 开控制台 —— 报错会直接显示，改起来快得多。

---

## 二、数据都在哪（改数值从这里下手）

游戏是**数据驱动**的：几乎所有内容都集中在几个对象字面量里，搜关键字就能定位。

| 想改什么 | 搜索这个 | 位置性质 |
|---|---|---|
| **8 座塔**（造价/伤害/攻速/射程/特性/专属成长） | `var ELEMS = {` | 数据表 |
| **敌人**（血量/速度/金币/特性） | `var ENEMIES = {` | 数据表 |
| **15 个关卡**（波数/初始金币/难度/路径） | `var LEVELS = [` | 数据表 |
| **72 张强化卡** | `var BUFF_POOL = [` | 数据表 |
| **6 种天气** | `var WEATHERS = {` | 数据表 |
| **4 个主动技能** | `var SKILLS = [` | 数据表 |
| **8 个元素套装** | `var ELEM_SETS = {` | 数据表 |
| **6 种敌人词缀** | `var ENEMY_AFFIXES = [` | 数据表 |
| **四大体系加成档位** | `var SYS_TIER = {` | 数据表 |
| **共鸣组合的名字与效果** | `add(['fire','ice'], '热震', ...)` | 组合表（硬编码，见下） |
| **界面配色 / 布局** | `<style>` 段 | CSS |
| **主界面 / 弹窗结构** | `<body>` 里的 `<div class="ov" id="...">` | HTML |

---

## 三、常见改造：照着抄

### 3.1 改数值（最简单）
搜到对应数据表，直接改数字。例如把火焰塔伤害从 15 改成 40：

```js
fire: { name:'火焰', icon:'🔥', cost:76, dmg:15, rate:0.80, ... }
                                  ↑ 改成 40
```
改完刷新浏览器即生效。

### 3.2 加一座新塔 ⭐ 真·只需加数据

在 `var ELEMS = {` 里照着现有的加一条就行：

```js
laser: { name:'激光', icon:'🔫', color:'#ff00aa', cost:130, dmg:40, rate:1.4, range:3.2,
         sys:'solo', role:'穿透', soloStar:4, groupStar:2,
         fx:'贯穿一条直线上的所有敌人' }
```

**建塔面板、图鉴、升级面板都会自动出现新塔** —— 因为它们都是遍历 `ELEMS` 生成的（`Object.keys(ELEMS)`），不用改任何 UI 代码。

> ⚠️ 只有两处要手动同步：
> ① **共鸣组合**是硬编码的（见 3.6），新塔不会自动和别的塔产生共鸣；
> ② `sys` 字段要选对（`solo`/`group`/`ctrl`/`support`），它决定这座塔吃哪套体系加成。

### 3.3 加一个关卡

在 `var LEVELS = [` 里加一条，`path` 是敌人走的路径点（网格坐标，16×10 网格）：

```js
{ name:'16 · 你的关卡', waves:40, gold:140, diff:1.1,
  path:[[0,1],[15,1],[15,8],[0,8],[0,9]] }
```

选关地图会自动多出一个节点。

> 💡 `path` 是 `[列, 行]` 数组，相邻两点之间必须是**水平或垂直**（不能斜线），且最后一个点要落在基地上。
> 想加**双入口**关卡，再加一个 `path2:` 数组即可（参考第 9 关的写法）。

### 3.4 加一张强化卡

在 `var BUFF_POOL = [` 里加：

```js
{ id:'mycard', rar:'epic', name:'我的强化', desc:'全塔伤害 +50%',
  apply:function(){ BUFFS.dmg += 0.50; } },
```

`rar` 决定稀有度（`common`/`rare`/`epic`，越稀有权重越低、越到后期越容易出）。
`apply` 就是拿到这张卡时执行的代码 —— 改 `BUFFS` 里的字段即可。

### 3.5 加一种天气

```js
// ① 加进 WEATHERS
sandstorm: { name:'沙暴', icon:'🌪', desc:'所有塔射程 -25%　｜　敌人移速 +15%',
             eff:{ range:-0.25, enemySpeed:0.15 } },

// ② 加进 WEATHER_KEYS 数组（决定循环顺序）
var WEATHER_KEYS = ['heat','cold','storm','miasma','iron','silence','sandstorm'];
```

天气说明面板和图鉴天气页会自动收录（它们是遍历 `WEATHERS` 生成的）。

### 3.6 加一个共鸣组合

共鸣组合在代码里是**逐条注册**的（因为效果要写逻辑），搜 `add([` 能找到：

```js
add(['fire','ice'], '热震', '伤害 +70%，命中点爆炸溅射');
```
第一个参数是参与的元素（按字母序），第二个是组合名，第三个是效果描述；复杂效果需要在下方的 `resonanceOf()` 里补结算逻辑。

> 两两组合已有 21 种、三元素 35 种、四元素 35 种，合计 **91 种**；三/四元素是按元素组合自动生成并命名的。

### 3.7 加一个敌人

在 `var ENEMIES = {` 加一条，然后**同步两个表**（这是唯一需要小心的地方）：

```js
// ① ENEMIES 里加数据
slime: { name:'史莱姆', hp:300, speed:0.9, gold:20, color:'#8f8', r:13, fx:'死后留下毒池' },

// ② ENEMY_INTRO_ORDER 数组里加它的 key（决定关卡开幕提示的顺序）
// ③ ENEMY_INTRO_WAVE 里写它第几波开始出现（不写就不会被刷出来）
```

想让它真的出现在战斗里，还要在 `waveComp()` 里按波次把它编进刷怪队列。

### 3.8 改界面 / 换皮
- **配色**：改 `<style>` 段里的颜色值
- **背景**：搜 `home-bg`（主界面动态背景，纯 CSS 渐变，没图片）
- **换 BGM**：直接替换 `assets/music/bgm.ogg`（保持文件名），或改 `<audio id="bgm" src="...">`

---

## 四、改造时容易踩的坑

1. **共鸣不会自动生效**：新加的塔默认和谁都不共鸣，要按 3.6 手动加组合。
2. **敌人要两处同步**：只在 `ENEMIES` 里加，它不会自己出现在关卡里（见 3.7）。
3. **别改 `data-mk` / `id=` 这些属性名**：界面的事件绑定靠它们，改了按钮就点不动了。
4. **存的是 localStorage**：改测试用浏览器开控制台执行 `localStorage.clear()` 就能重置进度。
5. **体积会变大**：`index.html` 是明文单文件，你自己加的东西直接加上去；但注意别把大图片塞进去（原版全靠纯 CSS 和 Canvas 画，没有图片资源）。
6. **想自己发版本**：记得改 `var BUILD_CODE`（当前值 95，发新版本时 +1，位置在 `src/js/20-book.js`）（游戏内「检查更新」靠它和线上 version.json 比大小）——当然，你要是不用那个功能就无所谓。

---

## 五、这游戏的"骨架"长什么样（想大改先看这个）

> 仓库里的源码已经**按模块拆开**在 `src/`（HTML 骨架 + 3 个 CSS + 21 个 JS，每个文件开头都写清了职责），
> 下面是**打包成单文件 / APK 之后**的样子 —— 两者内容完全等价，`node src/build.js` 可以把 `src/` 拼回单文件。
> 想按模块改就看 `src/`，想直接改一个文件就按下面来。

```
单文件 index.html
├── <style>            全部 CSS（含横屏/小屏自适应、纯 CSS 动效）
├── <body>             所有界面层级：#top HUD / #canvasWrap 战场 / 各种 .ov 全屏弹层
└── <script>           全部逻辑，大致顺序：
    ├── 数据表          ELEMS / ENEMIES / LEVELS / BUFF_POOL / WEATHERS / SKILLS ...
    ├── 共鸣与套装       resonanceOf() / ELEM_SETS / checkElemSets()
    ├── 天气与技能       pickWeather() / SKILLS / skillTick()
    ├── 战斗核心         stepSim() / hitEnemy() / statAt()
    ├── 渲染             draw() / 静态路径层缓存 / 敌人贴图缓存
    ├── 界面             主界面 / 图鉴 / 商店 / 左侧信息栏 / 各种弹层
    └── frame()          主循环（requestAnimationFrame）
```

性能上有几个刻意的优化，大改时注意别破坏：**静态路径层缓存**（key 含路径指纹）、**敌人贴图预渲染**、**去 shadowBlur**、**塔数 >40 自动降级**。

---

## 六、测试（推荐但非必须）

原版带了 55 套自动化测试，跑一遍能挡住大部分改坏的情况：

```bash
node test/deep4.js game.html        # 单跑一套
for t in test/*.js; do node "$t" game.html | tail -1; done   # 跑全套（55 套）
```

其中 `audit_fuzz.js` 会做**静态体检 + 4000 次随机操作 fuzz**，很适合改完之后自检。

> 测试脚本用 Node 跑（不需要浏览器）：它把游戏代码抠出来、塞进一个假 DOM 里模拟运行。

---

## 七、想打包成自己的 APK（进阶）

需要 Android SDK 工具：`aapt2`、`javac`、`d8`、`apksigner` + `android.jar`。

```bash
mkdir -p apk/assets && cp index.html apk/assets/ && cp -r music apk/assets/
aapt2 compile --dir res -o res.zip
aapt2 link -o base.apk -I android.jar --manifest AndroidManifest.xml --java gen res.zip \
  -A assets --min-sdk-version 21 --target-sdk-version 33 --version-code 1 --version-name 1.0
javac -encoding UTF-8 -source 8 -target 8 -classpath android.jar -d classes $(find src gen -name "*.java")
d8 --output . $(find classes -name "*.class")     # 生成 classes.dex
cd build && zip -q -j unsigned.apk classes.dex
keytool -genkeypair -keystore my.jks -alias me -keyalg RSA -keysize 2048 -validity 10000   # 你自己的签名
apksigner sign --ks my.jks --out 我的共鸣之塔.apk unsigned.apk
```

> ⚠️ **签名不同的包不能覆盖安装**：如果你手机上装的是官方版，要先卸载才能装你改的版本。
> （v8.20 已移除签名校验，所以**改完重签一定能启动** —— 不需要和任何内置指纹一致。）

---

## 八、改完想分享？

完全欢迎。这份文档和游戏源码都以「可自由修改」的方式给出。
如果做了有意思的版本，欢迎告诉作者 —— 但**没有这个义务**，你想怎么改就怎么改。

*本指南对应 v8.20 / versionCode 67。数值权威说明见 [manual.md](manual.md)。*
