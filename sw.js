// ===== sw.js —— Service Worker（网站离线缓存 + 更新策略） =====
// 作用：让「毛毛的个人主页」支持离线打开、加速静态资源加载，并控制更新节奏。
// 工作流程：浏览器先加载本文件注册 SW → install(预缓存核心文件) → activate(清理旧缓存) → fetch(拦截所有请求按策略分发)
// ⚠️ 重要：每次修改了 style.css / main.js 等核心文件，必须把 CACHE_NAME 版本号 +1（如 v25→v26），
//    否则用户浏览器里旧缓存的资源不会被替换（这就是本站「改文件必须 bump 版本号」的由来）。

const CACHE_NAME = "maomao-v51";          // 缓存包版本号：升级核心文件时改这里！(旧缓存会在 activate 阶段自动删除)

const CORE_ASSETS = [                      // 预缓存清单：SW 安装时一次性缓存的核心文件（首次离线可用）
    "/",                                   // 首页（缓存一份，离线回退用）
    "/index.html",                         // 主页
    "/style.css",                          // 全站样式
    "/player.js",                          // 音乐播放器逻辑
    "/main.js",                            // 主页主逻辑
    "/tokens.js",                          // AI 余额查询
    "/manifest.json",                      // PWA 清单
    "/icon.png",                           // 站点图标
    "/device-check.js?v=18",
    "/device-blocked.html",               // 设备限制提示页（门禁拦截跳转目标）
    "/anti-bot.js?v=4",                    // 反爬虫守卫（自动化访问检测）
    "/ab-blocked.html",                     // 访问验证页（反爬拦截跳转目标）
    "/contact.js?v=4",                     // 联系留言箱（经后台 API，前端零 Google 直连）
    "/why-blocked.html",
    "/why-blocked-apple.html",                  // 设备系统检测门禁（安卓/Windows 白名单版）
    "/maomao.jpg"                          // 网站封面/头像
];

// 安装事件：预缓存核心文件（首次安装或 SW 更新时执行）
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)            // 打开「当前版本」的缓存包
        .then(cache => cache.addAll(CORE_ASSETS))  // 把核心文件全部拉进缓存
        .then(() => self.skipWaiting())    // 跳过等待：新 SW 立即成为「活跃 SW」（不等旧页面关闭）
    );
});

// 激活事件：清理旧版本缓存（只保留当前 CACHE_NAME 的包，其余全删）
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()                      // 列出所有缓存包名字（历史版本可能有好几个）
        .then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME)  // 只留当前版本
            .map(key => caches.delete(key))        // 其余全部删除（释放空间）
        ))
        .then(() => self.clients.claim())  // 接管已打开页面（让页面立即受新 SW 控制）
    );
});

// fetch 事件：拦截所有同源 GET 请求，按类型分发缓存策略
self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;      // 只处理 GET（POST 等直接进网络）

    const url = new URL(req.url);
    // 只处理本站资源，第三方 API（天气/计数器）直接走网络
    if (url.origin !== location.origin) return;
    // 音频与分段请求(Range)不进缓存，避免播放/拖动进度出问题
    if (req.headers.has("Range") || /\/music\//.test(url.pathname)) return;

    // 页面（导航请求）：网络优先，离线时才回退缓存（保证更新及时可见）
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).then(res => {                       // 1) 先打网络拿最新页面
                const copy = res.clone();                  // 克隆一份准备写缓存
                caches.open(CACHE_NAME).then(cache => cache.put(req, copy)); // 2) 后台更新缓存
                return res;
            }).catch(() =>                                  // 3) 网络失败(离线) → 回退缓存
                caches.match(req).then(r => r || caches.match("/index.html")) // 兜底给首页
            )
        );
        return;
    }

    // 静态资源：缓存优先，后台静默更新（stale-while-revalidate）
    // 结果：用户秒开后拿到缓存版 → 后台拉新 → 下次就是新版
    event.respondWith(
        caches.match(req).then(cached => {
            const fetched = fetch(req).then(res => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                }
                return res;
            }).catch(() => cached);        // 离线时回退缓存
            return cached || fetched;      // 有缓存先给缓存，同时后台拉新
        })
    );
});
