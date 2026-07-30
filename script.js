let songs = [
    "music/暧昧游戏.mp3",
    "music/LLABB、小野道ono - D.W.U.flac",
    "music/所有③分熟的地球煎蛋.mp3"
];

let covers = [
    "images/FLXE-001.jpg",
    "images/kg_1785435965413.jpg",
    "images/xiongzi.jpg"
];

let songNames = [
    "暧昧游戏",
    "LLABB、小野道ono - D.W.U",
    "所有③分熟的地球煎蛋"
];

let index=0;

let audio=new Audio();
let loop=false;


function loadSong(){

audio.src=songs[index];

document.getElementById("songName").innerHTML=songNames[index];

document.querySelector(".music-player img").src = covers[index];

}


function playPause(){

if(audio.paused){

audio.play();

document.getElementById("playBtn").innerHTML="⏸";

}else{

audio.pause();

document.getElementById("playBtn").innerHTML="▶";

}

}


function nextSong(){

index++;

if(index>=songs.length){

index=0;

}

loadSong();

audio.play();

}


function prevSong(){

index--;

if(index<0){

index=songs.length-1;

}

loadSong();

audio.play();

}


loadSong();

audio.onended = function(){

    if(loop){
        audio.currentTime = 0;
        audio.play();
    }else{
        nextSong();
    }

};

function toggleLoop(){

loop=!loop;

if(loop){
    document.getElementById("loopBtn").innerHTML="🔂";
}else{
    document.getElementById("loopBtn").innerHTML="🔁";
}

}
