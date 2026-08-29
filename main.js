// ===== 通用脚本：主题 / 彩蛋 / 粒子 / 加载动画 =====
/*
 * =========================== 文件级注释 ===========================
 * 本文件：main.js —— 全站通用脚本（首页及各页共用）
 * 用途：深色/浅色主题切换、头像连点彩蛋、柔光星尘粒子、玩家昵称、
 *       加载进度条动画（真进度+保底时长）、注册 Service Worker 实现离线缓存。
 *
 * 主要函数清单：
 *   - saveNickname()   保存玩家昵称（用 textContent 防 XSS）
 *   - hideLoader()     加载动画：真实资源进度 + 时间曲线保底，双 100% 才淡出
 *   - (主题切换、彩蛋、粒子、随机一句话等为直接执行语句，无独立函数)
 *
 * 被哪些页面引用：index.html / photo.html / games.html 等（所有加载了本脚本的页面）
 * =================================================================
 */

// ===== 深色模式 =====
// 主题切换按钮元素引用；页面内应存在 id 为 "theme-toggle" 的按钮
const themeBtn = document.getElementById("theme-toggle");

// 读取保存主题
// 根据 localStorage 里上次保存的主题，一进页面就套用深色模式（避免闪烁）
if(localStorage.getItem("theme") === "dark"){
    document.body.classList.add("dark-mode");
    if(themeBtn){
        themeBtn.innerHTML = "☀️";
    }
}

// 点击切换
// 功能：点一下按钮切换深色/浅色，并把选择写回 localStorage 供下次读取
// 按钮文案：深色时显示 "☀️"(点击切回浅色)；浅色时显示 "🌙"
if(themeBtn){
    themeBtn.onclick = function(){
        document.body.classList.toggle("dark-mode");
        if(document.body.classList.contains("dark-mode")){
            localStorage.setItem("theme", "dark");
            themeBtn.innerHTML = "☀️";
        }else{
            localStorage.setItem("theme", "light");
            themeBtn.innerHTML = "🌙";
        }
    };
}

// ===== 头像点击彩蛋（连点10次触发） =====
// 计数器：记录用户连续点击头像的次数，满 10 次触发彩蛋动画
let easterClicks = 0;
// 头像元素引用（页面内 id 为 "avatar"）
const avatar = document.getElementById("avatar");
// 功能：连点头像 10 次触发一次彩蛋动画（利用 CSS 动画重放）
// 关键逻辑：用 void egg.offsetWidth 强制 reflow，从而让同一个动画能从头再播；
//           按时间轴依次播放大/小圆环与“shine”闪烁效果。
if(avatar){
    avatar.onclick = function(){
        easterClicks++;
        if(easterClicks < 10) return;
        easterClicks = 0;
        const egg = document.getElementById("easter-egg");
        if(egg){
            egg.classList.remove("shine");
            egg.classList.remove("circle-show");
            egg.classList.remove("small-circle-show");
            egg.style.animation = "none";
            void egg.offsetWidth;
            egg.style.animation = "easterPop 0.8s ease-out forwards";
            setTimeout(function(){
                egg.classList.add("circle-show");
                egg.classList.add("small-circle-show");
            }, 800);
            setTimeout(function(){
                egg.classList.remove("shine");
                void egg.offsetWidth;
                egg.classList.add("shine");
            }, 1000);
            setTimeout(function(){
                egg.style.animation = "easterHide 0.8s ease-out forwards";
            }, 1800);
        }
    };
}

// ===== 柔光星尘 =====
// 创建容器 div，用来承载所有漂浮粒子
const particleBox = document.createElement("div");
particleBox.id = "floating-particles";
// 生成的粒子数量
const particleCount = 12;
// 循环生成粒子：随机位置、随机尺寸、随机动画时长/延迟，让粒子分布与运动错落自然
for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";
    const size = 3 + Math.random() * 5;
    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.animationDuration = (8 + Math.random() * 8) + "s";
    particle.style.animationDelay = (Math.random() * 8) + "s";
    particleBox.appendChild(particle);
}
// 把粒子容器挂到 body 末尾，开始漂浮
document.body.appendChild(particleBox);

// ===== 最后访问时间 =====
// 记录本次访问（进入页面）的时间点
let visitTime = new Date();
// “最后访问时间”展示元素引用
let lastTime = document.getElementById("last-time");
// 功能：把当前访问时间拼接成中文（年月日 时:分:秒）写入页面
if(lastTime){
    lastTime.innerHTML = "你访问于：" +
        visitTime.getFullYear() + "年" +
        (visitTime.getMonth()+1) + "月" +
        visitTime.getDate() + "日 " +
        visitTime.getHours() + ":" +
        visitTime.getMinutes() + ":" +
        visitTime.getSeconds();
}

// ===== 随机一句话 =====
// 候选语录数组：每次刷新随机取一条展示
let quotes = [
    "保持好奇，持续折腾。",
    "代码不是魔法，是一点一点写出来的。",
    "不要害怕失败，先做出来再优化。",
    "简单的东西，也可以认真打磨。",
    "今天的小改动，都是未来的积累。",
    "摄影记录生活。",
    "音乐保存情绪。",
    "喜欢折腾，所以开始创造。"
];
// 取一个随机下标（0 ~ quotes.length-1）
let randomIndex = Math.floor(Math.random() * quotes.length);
// “随机一句话”展示元素引用
let quote = document.getElementById("quote");
// 功能：把随机选中的语录写进页面
if(quote){
    quote.innerHTML = quotes[randomIndex];
}

// ===== 玩家昵称系统 =====
// 功能：读取昵称输入框、去空格，非空则存到 localStorage 并回显
// 参数：无
// 返回：无
// 关键逻辑：用 textContent 而非 innerHTML 写入昵称，防止 XSS（昵称含 <img onerror> 不执行）
function saveNickname(){
    let name = document.getElementById("nickname").value.trim();
    if(name){
        localStorage.setItem("playerName", name);
        // 用 textContent 防 XSS(昵称含 <img onerror> 等不会执行)
        document.getElementById("nicknameShow").textContent = "当前玩家：" + name;
    }
}

// 自动读取昵称
// 页面加载时读取之前保存的昵称并直接显示（无需点击保存）
let playerName = localStorage.getItem("playerName");
if(playerName){
    document.getElementById("nicknameShow").textContent = "当前玩家：" + playerName;
}

// 功能：页面加载动画（真进度条，保底一段时间才放行）
// 参数：无
// 返回：无
// 关键逻辑：
//   - 进度 = min(真实资源加载进度, 时间曲线进度)。资源快→按时间曲线匀步爬满；
//     资源慢→按真实进度爬。两者都到 100% 且保底时间到，才淡出进入主界面。
//   - 对页面内所有 <img>/<link css>/<script src> 监听 load/error，
//     任何资源完成即加一；6 秒兜底强制完成，防资源卡死。
function hideLoader(){
    let loader = document.getElementById("loader");
    if(!loader) return;
    let bar = document.querySelector(".progress-bar");
    if(!bar){ return; }

    const MIN_SHOW_MS = 1000;      // 保底展示时长(1秒)
    const startTime = Date.now();  // 记录开始时刻，用于计算时间进度
    let done = 0, total = 0, finished = false;   // 已完成资源数 / 资源总数 / 是否已结束

    // 真实资源进度：已完成的资源占全部资源的百分比；无资源时视为 100%
    function realPct(){           // 真实资源进度
        return total > 0 ? (done / total * 100) : 100;
    }
    // 时间进度：按保底时长线性推进（0 → 100%）
    function timePct(){           // 时间进度(2秒内线性)
        return Math.min(100, (Date.now() - startTime) / MIN_SHOW_MS * 100);
    }
    // 展示进度：取「真实进度」与「时间进度」二者较小，避免超前于真实加载，也不快于保底曲线
    function displayPct(){        // 二者取小: 不超前于真实, 也不快于保底曲线
        return Math.min(realPct(), timePct());
    }
    // 把当前展示进度写到进度条宽度（限制在 0~100%，且结束后不再更新）
    function render(){
        if(bar && !finished) bar.style.width = Math.max(0, Math.min(100, displayPct())) + "%";
    }
    // 检查是否满足结束条件：真实资源全部完成 且 保底时间已到
    function maybeFinish(){
        if(finished) return;
        render();
        // 真实全部完成 且 保底时间已到 → 结束
        if(total > 0 && done >= total && (Date.now() - startTime) >= MIN_SHOW_MS){
            finish();
        }
    }
    // 播放完成：进度条拉满、淡出加载层、进入主界面，并触发登录门逻辑
    function finish(){
        if(finished) return;
        finished = true;
        bar.style.width = "100%";
        loader.style.opacity = "0";
        setTimeout(function(){
            loader.style.display = "none";
            document.body.classList.remove("loading");
            document.body.classList.add("page-show");
            if(window.showLoginGate) window.showLoginGate();
        }, 300);
    }

    // 每 50ms 刷新一次(时间曲线推进, 让进度平滑)
    const tick = setInterval(function(){
        render();
        maybeFinish();
        if(finished) clearInterval(tick);
    }, 50);

    // ---- 实测: 页面加载了多少真实资源 ----
    // 统计页面内影响观感的资源：图片、样式表、外部脚本
    function track(){
        if(finished) return;
        const docs = Array.from(document.querySelectorAll("img[src]"));            // 图片
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')); // 样式表
        const scripts = Array.from(document.querySelectorAll('script[src]'));      // 外部脚本
        total = docs.length + links.length + scripts.length;   // 资源总数
        done = 0;                                              // 已完成数清零
        render();

        // 没有任何资源：走纯时间曲线，保底时长结束后由 maybeFinish 完成
        if(total === 0){
            done = 0;              // 无资源: 走纯时间曲线, 2秒后完成
            return;
        }
        const onOne = function(){ done += 1; maybeFinish(); };  // 任一资源完成回调
        const all = [...docs, ...links, ...scripts];
        all.forEach(function(el){
            if(el.complete || el.readyState === "complete"){ onOne(); return; }    // 已加载完直接计数
            el.addEventListener("load", onOne, { once:true });                     // 加载完成
            el.addEventListener("error", onOne, { once:true });                    // 加载失败也计数
        });
        // 兜底: 6 秒后仍未完成 → 强制完成(防资源卡死)
        setTimeout(function(){ if(!finished){ done = total; maybeFinish(); } }, 6000);
    }

    track();
    // 兜底：页面 load 事件（全部资源就绪）到达时，强制把真实进度视为完成
    window.addEventListener("load", function(){
        if(!finished){ done = total; maybeFinish(); }
    }, { once:true });
}

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", hideLoader);
}else{
    hideLoader();
}

// ===== 注册 Service Worker（离线缓存，加速二次访问） =====
// 功能：若浏览器支持，注册 /sw.js 作为 Service Worker，实现离线缓存与二次访问加速
if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js")
    .catch(function(error){
        console.log("Service Worker 注册失败:", error);
    });
}
