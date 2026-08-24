// ===== AI 余额 =====
// 从线上源(Cloudflare Worker)或本地 /api/tokens 读取各厂商余额并显示在主界面

// 线上源地址：Cloudflare Worker 部署后填入，例如 "https://tokens-balance.xxx.workers.dev"
// 留空则使用本地 /api/tokens
let TOKENS_WORKER_URL = "";

function tokensEndpoint() {
    return TOKENS_WORKER_URL || "/api/tokens";
}

let _tokensProviders = [];   // 记住有哪些厂商
let _tokensLoaded = false;

function loadTokens(showMsg) {

    let box = document.getElementById("tokens-list");
    let status = document.getElementById("tokens-status");

    if(!box) return;

    box.innerHTML = "加载中...";
    if(status) status.innerText = "";

    fetch(tokensEndpoint())

    .then(response => response.json())

    .then(data => {

        _tokensProviders = (data.providers || []);
        _tokensLoaded = true;

        if(_tokensProviders.length === 0){
            box.innerHTML = "还没配置任何 AI 余额源<br>请编辑 tokens-config.json";
            return;
        }

        let html = "";
        let okCount = 0;

        _tokensProviders.forEach(p => {

            if(p.ok){
                okCount++;
                html +=
                    '<div class="tokens-item">' +
                    '<strong>' + p.name + '</strong>' +
                    '<span class="tokens-value">' + p.balance + '</span>' +
                    (p.unit ? '<span class="tokens-unit"> ' + p.unit + '</span>' : '') +
                    '</div>';
            }else{
                let hint = p.error === "未填 API Key" ? "未填 Key，点⚙️设置" : (p.error || "获取失败");
                html +=
                    '<div class="tokens-item tokens-error">' +
                    '<strong>' + p.name + '</strong>' +
                    '<span class="tokens-value">' + hint + '</span>' +
                    '</div>';
            }

        });

        box.innerHTML = html;

        if(showMsg && status){
            status.innerText = okCount + "/" + _tokensProviders.length + " 个服务正常";
        }

    })

    .catch(error => {

        console.log("余额获取失败:", error);

        box.innerHTML = "🔒 余额功能需本地服务器运行";

    });

}

// ===== 网页填写面板：不用碰 JSON 文件 =====

function toggleTokensSettings() {

    let panel = document.getElementById("tokens-settings-panel");
    if(!panel) return;

    // 第一次点击时拉取厂商列表生成表单
    if(panel.getAttribute("data-built") !== "1"){

        if(!_tokensLoaded){
            // 没加载过，先拉一次
            fetch(tokensEndpoint())
            .then(r => r.json())
            .then(d => { _tokensProviders = (d.providers || []); buildTokensForm(panel); })
            .catch(() => { panel.innerHTML = "⚠️ 无法读取配置"; });
        }else{
            buildTokensForm(panel);
        }

    }

    panel.style.display = (panel.style.display === "none" ? "block" : "none");

}

function buildTokensForm(panel) {

    panel.setAttribute("data-built", "1");

    let html = '<div style="text-align:left;font-size:13px;">';

    _tokensProviders.forEach(p => {

        html +=
            '<label style="display:block;margin-top:6px;">' + p.name + (p.hasKey ? " <span style='color:#2e7d32'>✓</span>" : "") + '</label>' +
            '<input type="password" placeholder="粘贴 ' + p.name + ' 的 Key" data-name="' + p.name + '" style="width:100%;box-sizing:border-box;padding:6px;border-radius:8px;border:1px solid #ccc;">';

    });

    html +=
        '<button onclick="saveTokensKeys()" style="margin-top:10px;padding:7px 14px;border:none;border-radius:16px;cursor:pointer;background:#e5dcff;color:#6543a5;">💾 保存并刷新</button>' +
        '</div>';

    panel.innerHTML = html;

}

function saveTokensKeys() {

    let panel = document.getElementById("tokens-settings-panel");
    if(!panel) return;

    let inputs = panel.querySelectorAll("input[data-name]");
    let keyMap = {};

    inputs.forEach(inp => {
        let name = inp.getAttribute("data-name");
        let val = inp.value.trim();
        if(val) keyMap[name] = val;
    });

    if(Object.keys(keyMap).length === 0){
        alert("请至少粘贴一个 Key");
        return;
    }

    fetch("/api/tokens/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyMap: keyMap })
    })

    .then(r => r.json())

    .then(data => {

        if(data.ok){
            panel.style.display = "none";
            panel.setAttribute("data-built", "0");
            _tokensLoaded = false;
            loadTokens(true);
        }else{
            alert("保存失败：" + (data.error || "未知错误"));
        }

    })

    .catch(() => alert("保存失败，请重试"));

}

// 页面加载后自动拉取一次
document.addEventListener("DOMContentLoaded", function(){
    loadTokens(false);
});
