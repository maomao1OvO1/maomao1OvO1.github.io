// ============================================================
// 文件：player.js —— 首页音乐播放器脚本（仅在首页加载）
// 用途：让首页展示一个可「播放/暂停、上一首/下一首、单曲循环、拖动进度、
//       调节音量」的个人音乐播放器，并支持手机锁屏/通知栏的媒体卡片(Media Session)。
// 核心逻辑：
//   1) songs / covers / songNames 三个平行数组，下标 index 一一对应（同首歌）。
//   2) 音频用 HTML5 <audio>（代码里通过 new Audio() 创建）实现；
//      进度条/音量条都是 0~100 的自定义 <input type=range>。
//   3) 页面元素都做了存在性判断（if(!xxx)），避免在非首页环境报错。
//   4)「单曲循环 singleLoop」开启时，播完重播当前曲；否则自动切下一首。
// 引用资源：music/ 目录的 mp3、images/ 目录的封面图、首页 index.html 中
//           播放器相关 DOM（songName / playBtn / progressBar 等）。
// ============================================================

// ===== 音乐播放器（仅首页加载） =====

// ===== 曲库定义（songs / covers / songNames 三个数组，下标一一对应） =====
// 说明：数组顺序 = 播放列表顺序；songs[i] 是音频地址，covers[i] 是封面图，
//       songNames[i] 是显示在播放器上的歌名。三者必须同下标对齐，否则错位。
let songs = [
    "music/所有③分熟的地球煎蛋.mp3",
    "music/dw.mp3",
    "music/Halzion.mp3",
    "music/暧昧游戏.mp3"
];

let covers = [
    "images/xiongzi.jpg",
    "images/kg_1785435965413.webp",
    "images/halzion.jpg",
    "images/FLXE-001.jpg"
];

let songNames = [
    "所有③分熟的地球煎蛋",
    "LLABB、小野道ono - D.W.U",
    "Halzion",
    "暧昧游戏"
];

// 当前播放的曲目下标（0 开始）。切歌时通过改 index 再 loadSong() 生效。
let index = 0;

// ===== 生成歌曲列表 =====
// 依据 songs 数组动态创建「歌曲列表」弹窗里的按钮，每个按钮点击后切到对应歌并播放。
// 用 innerHTML="" 清空旧按钮，避免重复刷新时代码累加出两份列表。
function createPlaylist(){
    let playlist = document.getElementById("playlist");
    if(!playlist) return; // 页面没有该容器就退出（兼容性保护）
    playlist.innerHTML = "";
    songs.forEach(function(song, i){
        let button = document.createElement("button");
        button.innerHTML = (i + 1) + ". " + songNames[i];  // 序号 + 歌名
        // 点击某一行：把全局 index 设为 i → 加载这首歌 → 立即播放
        button.onclick = function(){
            index = i;
            loadSong();
            audio.play().catch(function(){}); // play() 返回 Promise，失败静默（如未授权自动播放）
        };
        playlist.appendChild(button);
    });
}

// ===== 打开/关闭歌曲列表弹窗 =====
// 用一个蒙层(mask) + 一个窗口(window)组成弹窗。两者 display 状态同步切换：
// 现在是 block（显示中）就都改成 none（关闭），否则都改成 block（打开）。
function togglePlaylist(){
    let playlistWindow = document.getElementById("playlist-window");
    let mask = document.getElementById("playlist-mask");
    if(!playlistWindow || !mask) return;
    if(playlistWindow.style.display == "block"){
        playlistWindow.style.display = "none";
        mask.style.display = "none";
    }else{
        playlistWindow.style.display = "block";
        mask.style.display = "block";
    }
}

// 创建播放器：一个不在页面上的 <audio> 元素，用来承载所有播放逻辑。
// 通过 audio.src 指定歌曲，各种事件(onplay/onpause/onended/timeupdate)都挂它身上。
let audio = new Audio();

// ===== 手机媒体卡片信息（Media Session） =====
// 把当前歌名/歌手/封面同步给系统，让你的手机「锁屏/通知栏/耳机控制」能显示并操作它。
// 只有浏览器支持 navigator.mediaSession 时才设置（Android 原生浏览器普遍支持）。
function updateMediaSession(){
    if("mediaSession" in navigator){
        navigator.mediaSession.metadata = new MediaMetadata({
            title: songNames[index],
            artist: "毛毛的网站",
            album: "个人音乐播放器",
            artwork:[{
                src: covers[index],
                sizes: "512x512",
                type: "image/jpeg"
            }]
        });
    }
}

// ===== 手机媒体卡片控制（Media Session 动作） =====
// 绑定系统媒体卡片上的「下一曲/上一曲/播放/暂停」按钮到我们自己的逻辑函数，
// 这样用户无需解锁手机也能控制播放。支持性同样用 navigator.mediaSession 判断。
if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("nexttrack", function(){ nextSong(true); });
    navigator.mediaSession.setActionHandler("previoustrack", function(){ prevSong(); });
    navigator.mediaSession.setActionHandler("play", function(){ audio.play().catch(function(){}); });
    navigator.mediaSession.setActionHandler("pause", function(){ audio.pause(); });
}

// 单曲循环开关：true = 一首歌反复播；false = 播完自动切下一首。
let singleLoop = false;

// ===== 获取页面元素（播放器 UI 的 DOM 引用） =====
// 集中获取一次，避免每次函数里重复 document.getElementById 查找。
// 若页面缺少某元素，相关代码会用 if(null) 兜底，不会报错。
let songName = document.getElementById("songName");
let cover = document.querySelector(".music-player img");
let playBtn = document.getElementById("playBtn");
let loopBtn = document.getElementById("loopBtn");
let progressBar = document.getElementById("progressBar");
let volumeBar = document.getElementById("volumeBar");

// ===== 加载歌曲 =====
// 把当前 index 对应的歌切到 audio 上：先停下、归零进度、设 src、重载，
// 然后同步歌名/封面/音量，并把进度条归零，最后更新系统媒体卡片。
function loadSong(){
    audio.pause();
    audio.currentTime = 0;            // 重置播放进度，避免切歌从旧位置续播
    audio.src = songs[index];
    // 重新加载音频，让浏览器获取新的时长
    audio.load();
    audio.volume = volumeBar ? volumeBar.value : 1;  // 沿用当前音量条的值
    if(songName){
        songName.innerHTML = songNames[index];
    }
    if(cover){
        cover.src = covers[index];
    }
    if(progressBar){
        progressBar.value = 0;   // 进度归零
        progressBar.max = 100;   // 进度条范围固定 0~100（百分比）
    }
    updateMediaSession();        // 让系统媒体卡片显示新歌信息
}

// ===== 播放暂停 =====
// 看 audio.paused 判断当前是停还是播：停着就播放（失败打印原因），
// 播着就暂停；最后刷新按钮图标（▶/⏸）。浏览器对自动播放有时限制，故用 .catch 容错。
function playPause(){
    if(audio.paused){
        audio.play().catch(function(error){
            console.log("播放失败:", error);
        });
    }else{
        audio.pause();
    }
    updatePlayButton();
}

// ===== 下一首 =====
// 下标 +1，到末尾就绕回 0（环状列表）。先记住有没有在播（wasPlaying），
// 切歌后若原本在播，等浏览器“能播放”事件(canplay)到了再自动续播，
// 这样网络加载中不会闪断；用一次性监听(removeEventListener)防止重复触发。
function nextSong(autoPlay=false){
    index++;
    if(index >= songs.length){
        index = 0;
    }
    let wasPlaying = !audio.paused || autoPlay;
    loadSong();
    if(wasPlaying){
        audio.addEventListener("canplay", function playNext(){
            audio.play().catch(function(error){
                console.log("播放失败:", error);
            });
            audio.removeEventListener("canplay", playNext);
        });
    }
}

// ===== 上一首 =====
// 与 nextSong 对称：下标 -1，到最开头绕回最后一首；同样记住是否在播，
// 切歌后用一次性 canplay 事件续播；额外在续播成功后刷新一次按钮图标。
function prevSong(){
    let wasPlaying = !audio.paused;
    index--;
    if(index < 0){
        index = songs.length-1;
    }
    loadSong();
    if(wasPlaying){
        audio.addEventListener("canplay", function playNext(){
            audio.play().catch(function(error){
                console.log("播放失败:", error);
            }).then(function(){
                updatePlayButton();
            });
            audio.removeEventListener("canplay", playNext);
        });
    }
}

// ===== 播放状态同步 =====
// 根据 audio.paused 刷新主按钮图标：暂停中显示 ▶（可播放），播放中显示 ⏸（可暂停）。
function updatePlayButton(){
    if(playBtn){
        playBtn.innerHTML = audio.paused ? "▶" : "⏸";
    }
}

// 播放器播放/暂停时自动刷新按钮，作为 playPause 之外的兜底（含媒体卡片控制触发的状态）。
audio.onplay = function(){ updatePlayButton(); };
audio.onpause = function(){ updatePlayButton(); };

// ===== 自动播放下一首 =====
// 一首歌播完（onended）触发：若开了单曲循环，就归零进度重播当前曲；
// 否则自动切到下一首（nextSong(true) 里的 true 表示“主动切歌，强制续播”）。
audio.onended = function(){
    if(singleLoop){
        audio.currentTime = 0;
        audio.play().catch(function(error){
            console.log("播放失败:", error);
        });
    }else{
        nextSong(true);
    }
};

// ===== 单曲循环按钮 =====
// 每次点击反转 singleLoop，并用 🔂（单曲）/🔁（列表）图标提示当前模式。
function toggleLoop(){
    singleLoop = !singleLoop;
    if(loopBtn){
        loopBtn.innerHTML = singleLoop ? "🔂" : "🔁";
    }
}

// ===== 进度条 =====
audio.addEventListener("timeupdate", function(){
    if(progressBar && audio.duration){
        progressBar.value = (audio.currentTime / audio.duration) * 100;
    }
});

// ===== 音频加载完成 =====
audio.onloadedmetadata = function(){
    if(progressBar){
        progressBar.value = 0;
        progressBar.max = 100;
    }
};

// ===== 拖动进度条 =====
if(progressBar){
    progressBar.addEventListener("input", function(){
        if(audio.duration){
            audio.currentTime = progressBar.value / 100 * audio.duration;
        }
    });
}

// ===== 音量控制 =====
if(volumeBar){
    volumeBar.oninput = function(){
        audio.volume = volumeBar.value;
    };
}

// 初始化：只显示歌曲信息，不下载音频
loadSong();
createPlaylist();
