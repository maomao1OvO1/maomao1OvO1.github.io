// report.js —— 所有小游戏共用的排行榜分数上报
// 游戏结束时调用 reportScore(游戏id, 分数)；玩家名取网站里存的昵称(playerName)
// 上报到线上排行榜服务器(也可改成你本地的地址)

const REPORT_URL = "https://maomao-server.onrender.com/score";

function reportScore(game, score) {

    const name = localStorage.getItem("playerName") || "匿名玩家";

    if (typeof score !== "number" || isNaN(score)) return;

    fetch(REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, game: game, score: Math.round(score) })
    })

    .then(r => r.json())

    .then(d => {
        if (d.ok) console.log("[排行榜] 成绩已上传:", d);
        else console.log("[排行榜] 未上榜:", d.message);
    })

    .catch(e => console.log("[排行榜] 上传失败:", e));

}
