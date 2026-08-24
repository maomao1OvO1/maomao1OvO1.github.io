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

// ===== 加载动画：保留进度条观感，但比原来快很多 =====
function hideLoader(){
    let loader = document.getElementById("loader");
    if(!loader) return;
    // 进度条展示 1.2 秒后淡出，内容同时淡入
    setTimeout(function(){
        loader.style.opacity = "0";
    }, 1200);
    setTimeout(function(){
        loader.style.display = "none";
        document.body.classList.remove("loading");
        document.body.classList.add("page-show");
    }, 1600);
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
