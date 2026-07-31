// ===== 音乐文件列表 =====

let songs = [
    "music/暧昧游戏.mp3",
    "music/LLABB、小野道ono - D.W.U.flac",
    "music/所有③分熟的地球煎蛋.mp3"
];

// ===== 音乐封面列表 =====

let covers = [
    "images/FLXE-001.jpg",
    "images/kg_1785435965413.jpg",
    "images/xiongzi.jpg"
];

// ===== 歌曲名称列表 =====

let songNames = [
    "暧昧游戏",
    "LLABB、小野道ono - D.W.U",
    "所有③分熟的地球煎蛋"
];


// 当前播放歌曲索引
let index=0;


// 创建播放器对象
let audio=new Audio();


// 是否循环播放
let loop=false;



// ===== 加载歌曲 =====

function loadSong(){

audio.src=songs[index];

document.getElementById("songName").innerHTML=songNames[index];

document.querySelector(".music-player img").src = covers[index];

}



// ===== 播放 / 暂停 =====

function playPause(){

if(audio.paused){

audio.play();

document.getElementById("playBtn").innerHTML="⏸";

}else{

audio.pause();

document.getElementById("playBtn").innerHTML="▶";

}

}



// ===== 下一首 =====

function nextSong(){

index++;

if(index>=songs.length){

index=0;

}

loadSong();

audio.play();

}



// ===== 上一首 =====

function prevSong(){

index--;

if(index<0){

index=songs.length-1;

}


loadSong();

audio.play();

}



// 初始化第一首歌

loadSong();



// 播放结束后的处理

audio.onended = function(){

    if(loop){
        audio.currentTime = 0;
        audio.play();
    }else{
        nextSong();
    }

};



// ===== 循环播放开关 =====

function toggleLoop(){

loop=!loop;

if(loop){
    document.getElementById("loopBtn").innerHTML="🔂";
}else{
    document.getElementById("loopBtn").innerHTML="🔁";
}

}



// ===== 深色模式 =====

document.addEventListener("DOMContentLoaded", function(){

    const themeBtn = document.getElementById("theme-toggle");

    themeBtn.onclick = function(){

        document.body.classList.toggle("dark-mode");

        if(document.body.classList.contains("dark-mode")){
            themeBtn.innerHTML = "☀️";
        } else {
            themeBtn.innerHTML = "🌙";
        }

    };

});
