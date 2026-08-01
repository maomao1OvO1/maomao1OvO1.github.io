// ===== 音乐文件列表 =====

let songs = [
    "music/暧昧游戏.mp3",
    "music/LLABB、小野道ono - D.W.U.mp3",
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


// 当前歌曲

let index = 0;


// 创建播放器

let audio = new Audio();


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

    audio.src = songs[index];

    // 重新加载音频，让浏览器获取新的时长
    audio.load();


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

    }

}





// ===== 播放暂停 =====

function playPause(){


    if(audio.paused){

        audio.play();


    }else{

        audio.pause();

    }


}





// ===== 下一首 =====

function nextSong(autoPlay=false){


    index++;


    if(index >= songs.length){

        index = 0;

    }


    loadSong();


    if(autoPlay){

        audio.play();

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

        audio.play();

    }


}





// ===== 播放状态同步 =====


audio.onplay=function(){

    if(playBtn){

        playBtn.innerHTML="⏸";

    }

};



audio.onpause=function(){

    if(playBtn){

        playBtn.innerHTML="▶";

    }

};





// ===== 自动播放下一首 =====


audio.onended=function(){


    if(singleLoop){


        audio.currentTime=0;

        audio.play();


    }else{


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


audio.ontimeupdate=function(){


    if(progressBar && audio.duration){


        progressBar.value =
        (audio.currentTime / audio.duration) * 100;


    }


};




// ===== 音频加载完成 =====

audio.onloadedmetadata=function(){

    if(progressBar){

        progressBar.value = 0;

    }

};



// ===== 拖动进度条 =====

if(progressBar){

    progressBar.oninput=function(){

        if(audio.duration){

            audio.currentTime =
            progressBar.value / 100 * audio.duration;

        }

    };

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

// ===== 读取保存城市 =====

let savedCity = localStorage.getItem("city");
let savedLat = localStorage.getItem("lat");
let savedLon = localStorage.getItem("lon");


function getWeather(city, lat, lon){

    document.getElementById("weather-location").innerHTML =
        "📍 " + city;

     fetch( `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m`
)


    .then(response => response.json())


    .then(data => {


        console.log("天气数据:", data);


        let temp = data.current.temperature_2m;

        let code = data.current.weather_code;

        let humidity = data.current.relative_humidity_2m;


        let weatherText = "";


        switch(code){


            case 0:
                weatherText = "☀️ 晴天";
                break;


            case 1:
                weatherText = "🌤 主要晴朗";
                break;


            case 2:
                weatherText = "⛅ 局部多云";
                break;


            case 3:
                weatherText = "☁️ 阴天";
                break;


            case 45:
            case 48:
                weatherText = "🌫 雾";
                break;


            case 51:
            case 53:
            case 55:
                weatherText = "🌦 毛毛雨";
                break;


            case 56:
            case 57:
                weatherText = "🧊 冻雨";
                break;


            case 61:
            case 63:
            case 65:
                weatherText = "🌧 下雨";
                break;


            case 66:
            case 67:
                weatherText = "🧊 冻雨";
                break;


            case 71:
            case 73:
            case 75:
                weatherText = "❄️ 下雪";
                break;


            case 77:
                weatherText = "🌨 雪粒";
                break;


            case 80:
            case 81:
            case 82:
                weatherText = "🌧 阵雨";
                break;


            case 85:
            case 86:
                weatherText = "❄️ 阵雪";
                break;


            case 95:
                weatherText = "⛈ 雷雨";
                break;


            case 96:
            case 99:
                weatherText = "⛈⚡ 雷雨伴冰雹";
                break;


            default:
                weatherText = "🌍 未知天气";

        }



        document.getElementById("weather-info").innerHTML =

    weatherText
    + "<br>"
    + "🌡 温度: "
    + temp
    + "℃"

    + "<br>💧 湿度: "
    + humidity
    + "%";
    })


    .catch(error => {

        console.log("天气获取失败:", error);

        document.getElementById("weather-info").innerHTML =
            "天气获取失败";

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


// 更新天气

getWeather(
    place.name,
    place.latitude,
    place.longitude
);

        });


    };

}
