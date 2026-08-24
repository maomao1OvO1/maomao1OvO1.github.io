// ===== 音乐播放器（仅首页加载） =====

let songs = [
    "music/所有③分熟的地球煎蛋.mp3",
    "music/dw.mp3",
    "music/暧昧游戏.mp3"
];

let covers = [
    "images/xiongzi.jpg",
    "images/kg_1785435965413.webp",
    "images/FLXE-001.jpg"
];

let songNames = [
    "所有③分熟的地球煎蛋",
    "LLABB、小野道ono - D.W.U",
    "暧昧游戏"
];

// 当前歌曲
let index = 0;

// ===== 生成歌曲列表 =====
function createPlaylist(){
    let playlist = document.getElementById("playlist");
    if(!playlist) return;
    playlist.innerHTML = "";
    songs.forEach(function(song, i){
        let button = document.createElement("button");
        button.innerHTML = (i + 1) + ". " + songNames[i];
        button.onclick = function(){
            index = i;
            loadSong();
            audio.play().catch(function(){});
        };
        playlist.appendChild(button);
    });
}

// ===== 打开/关闭歌曲列表弹窗 =====
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

// 创建播放器
let audio = new Audio();

// ===== 手机媒体卡片信息 =====
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

// ===== 手机媒体卡片控制 =====
if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("nexttrack", function(){ nextSong(true); });
    navigator.mediaSession.setActionHandler("previoustrack", function(){ prevSong(); });
    navigator.mediaSession.setActionHandler("play", function(){ audio.play().catch(function(){}); });
    navigator.mediaSession.setActionHandler("pause", function(){ audio.pause(); });
}

// 单曲循环
let singleLoop = false;

// ===== 获取页面元素 =====
let songName = document.getElementById("songName");
let cover = document.querySelector(".music-player img");
let playBtn = document.getElementById("playBtn");
let loopBtn = document.getElementById("loopBtn");
let progressBar = document.getElementById("progressBar");
let volumeBar = document.getElementById("volumeBar");

// ===== 加载歌曲 =====
function loadSong(){
    audio.pause();
    audio.currentTime = 0;
    audio.src = songs[index];
    // 重新加载音频，让浏览器获取新的时长
    audio.load();
    audio.volume = volumeBar ? volumeBar.value : 1;
    if(songName){
        songName.innerHTML = songNames[index];
    }
    if(cover){
        cover.src = covers[index];
    }
    if(progressBar){
        progressBar.value = 0;
        progressBar.max = 100;
    }
    updateMediaSession();
}

// ===== 播放暂停 =====
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
function updatePlayButton(){
    if(playBtn){
        playBtn.innerHTML = audio.paused ? "▶" : "⏸";
    }
}

audio.onplay = function(){ updatePlayButton(); };
audio.onpause = function(){ updatePlayButton(); };

// ===== 自动播放下一首 =====
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
