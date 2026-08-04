// ===== KataGo AI接口 =====

let kataGoLoaded = false;


// 初始化KataGo

async function loadKataGo(){

    if(kataGoLoaded){

        return;

    }


    document.getElementById("status").innerHTML =
"正在加载KataGo...";


    // 等WASM接入后这里加载引擎


    kataGoLoaded=true;


    document.getElementById("status").innerHTML =
"✅ KataGo接口加载完成";



// AI请求落子

async function kataGoMove(board){

    if(!kataGoLoaded){

        await loadKataGo();

    }


    console.log("AI分析棋盘");


    // 等接入真正KataGo后返回坐标

    return null;

}
