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

audio.src = songs[index];


let songName = document.getElementById("songName");

let cover = document.querySelector(".music-player img");


if(songName){

    songName.innerHTML = songNames[index];

}


if(cover){

    cover.src = covers[index];

}

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

let wasPlaying = !audio.paused;

index++;

if(index>=songs.length){

    index=0;

}

loadSong();


if(wasPlaying){

    audio.play();

    document.getElementById("playBtn").innerHTML="⏸";

}else{

    audio.pause();

    document.getElementById("playBtn").innerHTML="▶";

}

}



// ===== 上一首 =====

function prevSong(){

let wasPlaying = !audio.paused;

index--;

if(index<0){

    index=songs.length-1;

}

loadSong();


if(wasPlaying){

    audio.play();

    document.getElementById("playBtn").innerHTML="⏸";

}else{

    audio.pause();

    document.getElementById("playBtn").innerHTML="▶";

}

}



// 初始化第一首歌

loadSong();



// ===== 播放状态同步按钮 =====

audio.onplay = function(){

    let playBtn = document.getElementById("playBtn");

    if(playBtn){

        playBtn.innerHTML="⏸";

    }

};


audio.onpause = function(){

    let playBtn = document.getElementById("playBtn");

    if(playBtn){

        playBtn.innerHTML="▶";

    }

};



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

// ===== 读取保存城市 =====

let savedCity = localStorage.getItem("city");
let savedLat = localStorage.getItem("lat");
let savedLon = localStorage.getItem("lon");


function getWeather(city, lat, lon){

    document.getElementById("weather-location").innerHTML =
        "📍 " + city;


    fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`
    )

    .then(response => response.json())

    .then(data => {

        let temp = data.current.temperature_2m;

        document.getElementById("weather-info").innerHTML =
            "🌡 温度: " + temp + "℃";

    });

}



// 有保存城市

if(savedCity && savedLat && savedLon){

    getWeather(
        savedCity,
        savedLat,
        savedLon
    );

}


// 没保存，使用IP

else{

    fetch("https://ipapi.co/json/")

    .then(response => response.json())

    .then(location => {

        getWeather(
            location.city,
            location.latitude,
            location.longitude
        );

    });

}



// ===== 手动修改城市 =====

let changeCityBtn = document.getElementById("change-city");


if(changeCityBtn){

    changeCityBtn.onclick = function(){

        let city = document.getElementById("city-input").value;


        if(city === ""){

            alert("请输入城市");

            return;

        }


        fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
        )


        .then(response => response.json())


        .then(data => {


            if(!data.results){

                alert("没有找到这个城市");

                return;

            }


            let place = data.results[0];


            document.getElementById("weather-location").innerHTML =
                "📍 " + place.name;

// 保存用户选择的城市

localStorage.setItem(
    "city",
    place.name
);

localStorage.setItem(
    "lat",
    place.latitude
);

localStorage.setItem(
    "lon",
    place.longitude
);

            fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m`
            )


            .then(response => response.json())


            .then(weather => {


                let temp = weather.current.temperature_2m;


                document.getElementById("weather-info").innerHTML =
                    "🌡 温度: " + temp + "℃";


            });


        });


    };

}
