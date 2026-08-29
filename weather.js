// ============================================================================
// 文件：weather.js
// 用途：网页上的「天气小部件」前端脚本。负责展示当前城市天气，并提供两类交互：
//       1) 自动加载：优先用浏览器 localStorage 里保存的城市；没有则用 ipapi 接口
//          按照当前访问者的公网 IP 反查位置；
//       2) 手动修改："修改城市" 输入框通过 Open-Meteo 的地理编码接口把城市名
//          转成经纬度，保存到 localStorage 后重新获取天气；"用 IP 获取天气"
//          按钮则清空手动保存、回到按 IP 定位。
// 数据来源（均为无需密钥的公开接口）：
//       - 天气数据：Open-Meteo 天气预报 API（api.open-meteo.com）
//       - 位置定位：ipapi 的 IP 定位接口（ipapi.co/json/）
//       - 城市查询：Open-Meteo 地理编码接口（geocoding-api.open-meteo.com/v1/search）
// 被谁引用：由对应的 HTML 页面通过 <script src="weather.js"></script> 引入。
// 注意：本文件调用的是公开免密钥接口，不含任何密钥/令牌值。
// 核心逻辑流程：
//       读缓存 → 有城市吗？有→直接取天气；无→按 IP 反查城市再取天气
//       用户是否点了"修改城市"？→ 城市名→经纬度→保存→取天气
//       用户是否点了"用 IP 获取"？→ 按 IP 反查→取天气→清除手动保存
// ============================================================================

// ===== 读取保存城市 =====
// 页面一打开就从 localStorage 读取用户上次手动保存的城市信息。
// localStorage 的键固定为 "city"(城市名) / "lat"(纬度) / "lon"(经度)。
// 这三个值可能是字符串，也可能因为从未保存而返回 null。

let savedCity = localStorage.getItem("city");   // 读取上次保存的城市名
let savedLat = localStorage.getItem("lat");     // 读取上次保存的纬度
let savedLon = localStorage.getItem("lon");     // 读取上次保存的经度


// ============================================================================
// getWeather(city, lat, lon)：核心函数——根据经纬度拉取当地天气并渲染到页面。
// 参数说明：
//   city  城市名（字符串），只用于顶部标题展示，如 "北京"；
//   lat   纬度，正数北纬、负数南纬，作为 Open-Meteo 查询参数 latitude；
//   lon   经度，正数东经、负数西经，作为 Open-Meteo 查询参数 longitude。
// 调用时机：页面加载完成、用户手动改城市、用户点"用 IP 获取"时都会调用。
// ============================================================================
function getWeather(city, lat, lon){

    // 把传入的城市名显示在页面标题处（📍 前缀是定位图标）
    document.getElementById("weather-location").innerHTML =
        "📍 " + city;

     // -------------------- 第一步：发天气请求 --------------------
     // Open-Meteo 免费天气预报接口，不需要密钥。
     // 参数逐个说明：
     //   latitude / longitude —— 由调用方传入的目标地点经纬度；
     //   current = temperature_2m,weather_code,relative_humidity_2m
     //     表示只取"当前时刻"这几项数据：
     //       temperature_2m      地表 2 米高的温度（℃）；
     //       weather_code        WMO 天气现象代码（整数，下面 switch 会解释）；
     //       relative_humidity_2m 地表 2 米高的相对湿度（%）。
     // 该接口默认返回 JSON。这里用模板字符串把变量嵌入 URL。
     fetch( `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m`
)

    // 第一步完成：把响应体解析成 JS 对象（Promise 链）
    .then(response => response.json())


    // -------------------- 第二步：处理返回的天气数据 --------------------
    .then(data => {

        // 控制台打印完整数据，便于调试（不产生副作用）
        console.log("天气数据:", data);

        // 从返回体 data.current 里取当前时刻的几项数值
        // data 是接口返回的 JSON 对象；.current 是当前天气子对象
        let temp = data.current.temperature_2m;          // 当前温度（℃）
        let code = data.current.weather_code;            // WMO 天气现象代码
        let humidity = data.current.relative_humidity_2m; // 当前相对湿度（%）

        // 先用空字符串占位，下面 switch 会按天气码填入对应的中文文案
        let weatherText = "";

        // -------------------- 第三步：把天气码翻译成中文 --------------------
        // WMO 天气现象代码（World Meteorological Organization 规定的标准码表）。
        // 值不同代表不同的天气现象，这里逐个映射成带 emoji 的中文描述。
        switch(code){

            case 0:                // 0：晴，天空基本没有云
                weatherText = "☀️ 晴天";
                break;

            case 1:                // 1：以晴为主，少量云
                weatherText = "🌤 主要晴朗";
                break;

            case 2:                // 2：局部多云，云量中等
                weatherText = "⛅ 局部多云";
                break;

            case 3:                // 3：阴天，云层几乎盖满天空
                weatherText = "☁️ 阴天";
                break;

            case 45:               // 45：雾
            case 48:               // 48：雾凇雾（带结霜的雾）
                weatherText = "🌫 雾";
                break;

            case 51:               // 51：小毛毛雨
            case 53:               // 53：中等毛毛雨
            case 55:               // 55：大毛毛雨
                weatherText = "🌦 毛毛雨";
                break;

            case 56:               // 56：轻冻毛毛雨
            case 57:               // 57：重冻毛毛雨
                weatherText = "🧊 冻雨";
                break;

            case 61:               // 61：小雨
            case 63:               // 63：中雨
            case 65:               // 65：大雨
                weatherText = "🌧 下雨";
                break;

            case 66:               // 66：轻冻雨
            case 67:               // 67：重冻雨
                weatherText = "🧊 冻雨";
                break;

            case 71:               // 71：小雪
            case 73:               // 73：中雪
            case 75:               // 75：大雪
                weatherText = "❄️ 下雪";
                break;

            case 77:               // 77：雪粒（细小冰晶）
                weatherText = "🌨 雪粒";
                break;

            case 80:               // 80：轻度阵雨
            case 81:               // 81：中度阵雨
            case 82:               // 82：重度阵雨
                weatherText = "🌧 阵雨";
                break;

            case 85:               // 85：轻度阵雪
            case 86:               // 86：重度阵雪
                weatherText = "❄️ 阵雪";
                break;

            case 95:               // 95：雷雨（可能有冰雹）
                weatherText = "⛈ 雷雨";
                break;

            case 96:               // 96：雷雨伴小冰雹
            case 99:               // 99：雷雨伴大冰雹
                weatherText = "⛈⚡ 雷雨伴冰雹";
                break;

            default:               // 未在上面列出的其它代码：给一个兜底文案
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
            "⚠️ 天气获取失败<br>请检查网络或稍后重试";

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
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=zh`
        )


        .then(response => response.json())


        .then(data => {


            if(!data.results){

                alert("⚠️ 没有找到这个城市，请换一个名称");

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




// ===== 使用IP获取天气 =====

let ipWeatherBtn = document.getElementById("use-ip-weather");


if(ipWeatherBtn){

    ipWeatherBtn.onclick = function(){


        document.getElementById("weather-location").innerHTML =
            "📍 正在获取位置...";


        fetch("https://ipapi.co/json/")

        .then(response => response.json())

        .then(location => {


            getWeather(
                location.city,
                location.latitude,
                location.longitude
            );


            // 清除手动保存城市

            localStorage.removeItem("city");
            localStorage.removeItem("lat");
            localStorage.removeItem("lon");


        })


        .catch(error => {

            console.log("IP定位失败:", error);

            document.getElementById("weather-info").innerHTML =
                "定位失败";

        });


    };

}
