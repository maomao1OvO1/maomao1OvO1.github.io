/* 🎙️ 声库网页版 Service Worker：静态资源 + 模型缓存（下载一次，之后离线可用） */
const VERSION = 'tts-web-v11';
const MODELS_CACHE = 'tts-web-models-v7';
const CORE = [
  './',
  './index.html',
  './app.js',
  './tts-worker.js',
  './sherpa-onnx-wasm-main-tts.js',
  './sherpa-onnx-wasm-main-tts.wasm',
  './sherpa-onnx-tts.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== MODELS_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isModel =
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/models/') ||
    url.pathname.match(/\.(onnx|fst)$/i) ||
    /releases\.githubusercontent|objects\.githubusercontent|github\.com\/.+releases\/download/i.test(url.href);

  if (isModel) {
    // 模型：缓存优先，没缓存走网络并写入模型缓存
    e.respondWith(
      caches.open(MODELS_CACHE).then((cache) =>
        cache.match(e.request).then((hit) => {
          if (hit) return hit;
          return fetch(e.request).then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(e.request, res.clone());
            }
            return res;
          });
        })
      )
    );
    return;
  }

  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // 静态资源：缓存优先 + 后台更新（页面资源改动靠 bump VERSION 失效）
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const refresh = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
