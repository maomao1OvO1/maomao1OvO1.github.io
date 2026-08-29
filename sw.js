const CACHE_NAME = "maomao-v25";

const CORE_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/player.js",
    "/main.js",
    "/tokens.js",
    "/manifest.json",
    "/icon.png",
    "/maomao.jpg"
];

// 安装：预缓存核心文件
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(CORE_ASSETS))
        .then(() => self.skipWaiting())
    );
});

// 激活：清理旧版本缓存
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
        .then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        ))
        .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    // 只处理本站资源，第三方 API（天气/计数器）直接走网络
    if (url.origin !== location.origin) return;
    // 音频与分段请求(Range)不进缓存，避免播放/拖动进度出问题
    if (req.headers.has("Range") || /\/music\//.test(url.pathname)) return;

    // 页面：网络优先，离线时才回退缓存（保证更新及时可见）
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).then(res => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                return res;
            }).catch(() =>
                caches.match(req).then(r => r || caches.match("/index.html"))
            )
        );
        return;
    }

    // 静态资源：缓存优先，后台静默更新（stale-while-revalidate）
    event.respondWith(
        caches.match(req).then(cached => {
            const fetched = fetch(req).then(res => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                }
                return res;
            }).catch(() => cached);
            return cached || fetched;
        })
    );
});
