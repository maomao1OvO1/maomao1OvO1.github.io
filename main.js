// ===== 通用脚本：主题 / 彩蛋 / 粒子 / 加载动画 =====

// ===== 深色模式 =====
const themeBtn = document.getElementById("theme-toggle");

// 读取保存主题
if(localStorage.getItem("theme") === "dark"){
    document.body.classList.add("dark-mode");
    if(themeBtn){
        themeBtn.innerHTML = "☀️";
    }
}

// 点击切换
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
let easterClicks = 0;
const avatar = document.getElementById("avatar");
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
const particleBox = document.createElement("div");
particleBox.id = "floating-particles";
const particleCount = 12;
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
document.body.appendChild(particleBox);

// ===== 最后访问时间 =====
let visitTime = new Date();
let lastTime = document.getElementById("last-time");
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
let randomIndex = Math.floor(Math.random() * quotes.length);
let quote = document.getElementById("quote");
if(quote){
    quote.innerHTML = quotes[randomIndex];
}

// ===== 玩家昵称系统 =====
function saveNickname(){
    let name = document.getElementById("nickname").value.trim();
    if(name){
        localStorage.setItem("playerName", name);
        document.getElementById("nicknameShow").innerHTML = "当前玩家：" + name;
    }
}

// 自动读取昵称
let playerName = localStorage.getItem("playerName");
if(playerName){
    document.getElementById("nicknameShow").innerHTML = "当前玩家：" + playerName;
}

// ===== 加载动画：真进度条(保底2秒) =====
// 进度 = min(真实资源进度, 时间曲线)。资源快 → 按2秒匀步爬满; 资源慢 → 按真实进度爬。
// 两者都到 100% 才淡出进主界面: 设备再好, 进度条也至少展示2秒, 不会闪没。
function hideLoader(){
    let loader = document.getElementById("loader");
    if(!loader) return;
    let bar = document.querySelector(".progress-bar");
    if(!bar){ return; }

    const MIN_SHOW_MS = 1000;      // 保底展示时长(1秒)
    const startTime = Date.now();
    let done = 0, total = 0, finished = false;

    function realPct(){           // 真实资源进度
        return total > 0 ? (done / total * 100) : 100;
    }
    function timePct(){           // 时间进度(2秒内线性)
        return Math.min(100, (Date.now() - startTime) / MIN_SHOW_MS * 100);
    }
    function displayPct(){        // 二者取小: 不超前于真实, 也不快于保底曲线
        return Math.min(realPct(), timePct());
    }
    function render(){
        if(bar && !finished) bar.style.width = Math.max(0, Math.min(100, displayPct())) + "%";
    }
    function maybeFinish(){
        if(finished) return;
        render();
        // 真实全部完成 且 保底时间已到 → 结束
        if(total > 0 && done >= total && (Date.now() - startTime) >= MIN_SHOW_MS){
            finish();
        }
    }
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
    function track(){
        if(finished) return;
        const docs = Array.from(document.querySelectorAll("img[src]"));
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        total = docs.length + links.length + scripts.length;
        done = 0;
        render();

        if(total === 0){
            done = 0;              // 无资源: 走纯时间曲线, 2秒后完成
            return;
        }
        const onOne = function(){ done += 1; maybeFinish(); };
        const all = [...docs, ...links, ...scripts];
        all.forEach(function(el){
            if(el.complete || el.readyState === "complete"){ onOne(); return; }
            el.addEventListener("load", onOne, { once:true });
            el.addEventListener("error", onOne, { once:true });
        });
        // 兜底: 6 秒后仍未完成 → 强制完成(防资源卡死)
        setTimeout(function(){ if(!finished){ done = total; maybeFinish(); } }, 6000);
    }

    track();
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
if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js")
    .catch(function(error){
        console.log("Service Worker 注册失败:", error);
    });
}
