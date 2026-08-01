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
