// ===== 音乐文件列表 =====

let songs = [
    "music/所有③分熟的地球煎蛋.mp3",
    "music/dw.mp3",
    "music/暧昧游戏.mp3"
];


// ===== 音乐封面列表 =====

let covers = [
    "images/xiongzi.jpg",
    "images/kg_1785435965413.jpg",
    "images/FLXE-001.jpg"
];


// ===== 歌曲名称列表 =====

let songNames = [
    "所有③分熟的地球煎蛋",
    "LLABB、小野道ono - D.W.U",
    "暧昧游戏"
];


// 当前歌曲

let index = 0;


// 创建播放器

let audio = new Audio();



// ===== 手机媒体卡片信息 =====

function updateMediaSession(){

    if("mediaSession" in navigator){

        navigator.mediaSession.metadata =
        new MediaMetadata({

            title: songNames[index],

            artist: "毛毛的网站",

            album: "个人音乐播放器",

            artwork:[
                {
                    src:covers[index],
                    sizes:"512x512",
                    type:"image/jpeg"
                }
            ]

        });

    }

}


// ===== 手机媒体卡片控制 =====

if ("mediaSession" in navigator) {

    navigator.mediaSession.setActionHandler(
        "nexttrack",
        function(){

            nextSong(true);

        }
    );


    navigator.mediaSession.setActionHandler(
        "previoustrack",
        function(){

            prevSong();

        }
    );


    navigator.mediaSession.setActionHandler(
        "play",
        function(){

            audio.play();

        }
    );


    navigator.mediaSession.setActionHandler(
        "pause",
        function(){

            audio.pause();

        }
    );

}


// 单曲循环

let singleLoop = false;



// ===== 获取页面元素 =====

let songName =
document.getElementById("songName");


let cover =
document.querySelector(".music-player img");


let playBtn =
document.getElementById("playBtn");


let loopBtn =
document.getElementById("loopBtn");


let progressBar =
document.getElementById("progressBar");


let volumeBar =
document.getElementById("volumeBar");





// ===== 加载歌曲 =====

function loadSong(){

    // 切换歌曲前停止上一首
    audio.pause();

    // 重置播放位置
    audio.currentTime = 0;


    audio.src = songs[index];

    // 重新加载音频，让浏览器获取新的时长
    audio.load();
    audio.volume = volumeBar ? volumeBar.value : 1;


    if(songName){

        songName.innerHTML =
        songNames[index];

    }


    if(cover){

        cover.src =
        covers[index];

    }


    // 重置进度条
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

    updatePlayButton();

}else{

    audio.pause();

    updatePlayButton();

}


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


    let wasPlaying =
    !audio.paused;


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

        if(audio.paused){

            playBtn.innerHTML="▶";

        }else{

            playBtn.innerHTML="⏸";

        }

    }

}


audio.onplay=function(){

    updatePlayButton();

};


audio.onpause=function(){

    updatePlayButton();

};




// ===== 自动播放下一首 =====


audio.onended=function(){


     if(singleLoop){

    audio.currentTime=0;
    audio.play().catch(function(error){

        console.log("播放失败:", error);

    });

}



     else{


        nextSong(true);


    }


};






// ===== 单曲循环按钮 =====


function toggleLoop(){


    singleLoop=!singleLoop;



    if(singleLoop){

        loopBtn.innerHTML="🔂";


    }else{

        loopBtn.innerHTML="🔁";

    }


}



// ===== 进度条 =====

audio.addEventListener("timeupdate", function(){

    if(progressBar && audio.duration){

        progressBar.value =
        (audio.currentTime / audio.duration) * 100;

    }

});




// ===== 音频加载完成 =====

audio.onloadedmetadata=function(){

    if(progressBar){

        progressBar.value = 0;
        progressBar.max = 100;

    }

};



// ===== 拖动进度条 =====

if(progressBar){

    progressBar.addEventListener("input", function(){

        if(audio.duration){

            audio.currentTime =
            progressBar.value / 100 * audio.duration;

        }

    });

}



// ===== 音量控制 =====


if(volumeBar){


    volumeBar.oninput=function(){


        audio.volume =
        volumeBar.value;


    };


}





// 初始化

loadSong();



// ===== 深色模式 =====

const themeBtn = document.getElementById("theme-toggle");


// 读取保存主题

if(localStorage.getItem("theme") === "dark"){

    document.body.classList.add("dark-mode");

    if(themeBtn){

        themeBtn.innerHTML="☀️";

    }

}


// 点击切换

if(themeBtn){

    themeBtn.onclick = function(){

        document.body.classList.toggle("dark-mode");


        if(document.body.classList.contains("dark-mode")){

            localStorage.setItem("theme","dark");

            themeBtn.innerHTML="☀️";

        }else{

            localStorage.setItem("theme","light");

            themeBtn.innerHTML="🌙";

        }

    };

}




// ===== 头像点击彩蛋 =====

let avatarClicks = 0;

const avatar = document.getElementById("avatar");

if(avatar){

    avatar.onclick = function(){

        avatarClicks++;

        if(avatarClicks >= 10){

            alert("彩蛋");

            avatarClicks = 0;

        }

    };

}


// ===== 页面加载完成关闭加载动画 =====

window.onload=function(){

    let loader=document.getElementById("loader");


    if(loader){

        setTimeout(function(){

            loader.style.opacity="0";

        },3000);


        setTimeout(function(){

            loader.style.display="none";


            document.body.classList.remove("loading");

            document.body.classList.add("page-show");


        },3800);

    }

};



// ===== 最后访问时间 =====

let visitTime = new Date();

let lastTime = document.getElementById("last-time");

if(lastTime){
    lastTime.innerHTML =
        "你访问于：" +
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


