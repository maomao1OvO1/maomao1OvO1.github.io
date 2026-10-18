/* ════════════════════════════════════════════════════════════════════
   文件：v2/parallax.js —— 滚动视差与进场动画（2026-10-18）
   --------------------------------------------------------------------
   做三件事：
     1. 首屏大图随滚动往下缓慢移动（视差），越往下越明显；
     2. 每个分区的横幅图按它在视口中的位置做轻微位移与缩放，
        鼠标停住、画面也停住，不自己动；
     3. 区块第一次进入视口时淡入上移，之后不再重播。
   为什么不用视频：滚动绑定视频进度需要几百 KB 到几 MB 的流量，
   手机上还会掉帧。图片做同样的位移，观感接近，加载几乎为零。
   性能：所有写操作走 requestAnimationFrame，只改 transform 与 opacity，
   不触发重排；系统开「减少动态效果」时整套关掉。
   ═══════════════════════════════════════════════════════════════════ */
(function () {
    "use strict";

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var doc = document.documentElement;
    doc.classList.add("js");   /* 让 CSS 知道 JS 可用，才敢把元素先藏起来 */

    /* ── 1. 进场动画：内容永远可见，只有「滚动进来」的元素才播动画 ──
       之前的写法是把元素先藏起来（opacity 0），靠观察器再放出来。
       问题是观察器的触发时机受图片加载、浏览器恢复滚动位置影响，
       于是每次刷新看到的画面不一样，严重时整块内容一直藏着。
       现在改成：初始就在视口内的元素直接显示、不播动画；
       只有从下面滚动进来的才播放。JS 失败也不会缺内容。 */
    var revealTargets = document.querySelectorAll(".block, .index-row, .hero-inner");
    if ("IntersectionObserver" in window && revealTargets.length) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add("in");
                    io.unobserve(en.target);
                }
            });
        }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

        revealTargets.forEach(function (el) {
            var box = el.getBoundingClientRect();
            if (box.top < window.innerHeight) {
                /* 初始就在视口里：直接显示，不做动画，避免闪一下 */
                el.classList.add("in", "instant");
            } else {
                el.classList.add("reveal");
                io.observe(el);
            }
        });
    }

    if (reduce) return;   /* 系统要求减少动态效果，视差就不做了 */

    /* ── 2. 视差：首屏图 + 各分区横幅图 ── */
    var heroImg = document.querySelector(".hero-bg");
    var banners = Array.prototype.slice.call(document.querySelectorAll(".banner"));
    var ticking = false;

    function update() {
        ticking = false;
        var y = window.pageYOffset || doc.scrollTop;

        /* 首屏：往下滚时图往上走得更慢，产生纵深 */
        if (heroImg) {
            var hero = heroImg.parentElement;
            var maxShift = (hero ? hero.offsetHeight : 600) * 0.05;
            var shift = Math.min(y * 0.28, maxShift);
            heroImg.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0) scale(1.12)";
        }

        /* 横幅图：以视口中心为基准，上下各偏移 16px */
        var vh = window.innerHeight || doc.clientHeight;
        for (var i = 0; i < banners.length; i++) {
            var r = banners[i].getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) continue;   /* 视口外不处理 */
            var progress = (r.top + r.height / 2 - vh / 2) / vh;  /* -1 ~ 1 */
            banners[i].style.transform =
                "translate3d(0," + (progress * -12).toFixed(2) + "px,0) scale(1.04)";
        }
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", update);
    update();
})();
