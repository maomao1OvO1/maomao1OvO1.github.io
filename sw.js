self.addEventListener("install", (event) => {
    console.log("Service Worker 已安装");
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker 已激活");
});
