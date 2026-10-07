/* ============================================================================
 * 文件：08-turnstile-gate.js —— 登录门「我是真人」验证（Cloudflare Turnstile）
 *
 * 它干什么：
 *   在你登录门的第 2 步（选择登录方式）里，插一个小方框 —— 就是别人网站上那个
 *   「点一下，证明你是真人」的东西。**验证通过前，三个登录按钮点了没反应。**
 *
 * 为什么要有它：
 *   · 挡住"脚本 / 机器人"照着页面乱点登录、批量试密码；
 *   · 页面看上去更正规（跟大站一致）。
 *
 * ⚠️ 用法（两步）：
 *   ① 去 Cloudflare 建一个 Turnstile 组件，拿到 site key（形如 0x4AAAAAAAxxxxxxxx），
 *      填到下面 SITE_KEY；
 *   ② 在 index.html 的脚本区加一行：
 *      <script src="/js/home/08-turnstile-gate.js?v=1" defer></script>
 *   **没填 site key 之前，本文件会自动"隐身"** —— 不显示框、不锁按钮，登录一切照旧。
 *
 * 🛡️ 保险（fail-open，绝不影响真人登录）：
 *   · site key 没填 / 还是占位符 → 整段跳过；
 *   · Turnstile 官方脚本 4 秒内没加载出来（网络、广告拦截器都可能）→ 立刻解锁；
 *   · 验证失败或 token 过期 → 重新锁上，点一下还能再验。
 *   ⇒ 宁可少拦一次，也绝不让真人登不进来。
 *
 * 🧩 将来想"真管用"（防住绕过页面的脚本）：把下面拿到的 token
 *   （window.MM_TURNSTILE_TOKEN）交给一个 Cloudflare Worker 调官方接口校验
 *   （https://challenges.cloudflare.com/turnstile/v0/siteverify）—— 那一步才叫"保安"，
 *   现在这一步叫"门面上的框"。
 *
 * 作者：小鲸（为毛毛写）· 2026-10-07 · v1
 * ========================================================================= */
(function () {
  'use strict';

  /* ══════════ 配置：Cloudflare Turnstile site key（2026-10-07 毛毛在 CF 建的组件）══════════ */
  var SITE_KEY = '0x4AAAAAAFQVuWKOu15YEyui'; // 组件：「毛毛的网站 · 登录门」· Managed（点一下我是真人）
  var TIMEOUT_MS = 4000; // 官方脚本加载超时 → 自动解锁（fail-open）

  var TAG = '[真人验证]';
  var BOX_ID = 'mm-turnstile-box';

  function log() {
    try {
      console.log.apply(console, [TAG].concat(Array.prototype.slice.call(arguments)));
    } catch (e) {}
  }

  /* ────────── ① 插入样式（跟登录门风格保持一致，浅色圆角小卡片） ────────── */
  function injectStyle() {
    if (document.getElementById('mm-turnstile-style')) return;
    var st = document.createElement('style');
    st.id = 'mm-turnstile-style';
    st.textContent = [
      '#' + BOX_ID + '{margin:2px 0 14px;padding:10px 12px;border-radius:12px;',
      'background:rgba(125,135,160,.10);border:1px dashed rgba(125,135,160,.35);',
      'display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}',
      '#' + BOX_ID + ' .mm-ts-tip{font-size:12px;line-height:1.5;opacity:.75;margin:0}',
      '#' + BOX_ID + ' .mm-ts-ok{font-size:12px;opacity:.85;margin:0}',
      '#gateStep2 .lg-btn[data-mm-locked="1"]{opacity:.45;cursor:not-allowed;filter:grayscale(.35)}',
    ].join('');
    document.head.appendChild(st);
  }

  /* ────────── ② 在「选择登录方式」标题下插入验证框 ────────── */
  function ensureBox(step2) {
    var old = document.getElementById(BOX_ID);
    if (old) return old;

    var box = document.createElement('div');
    box.id = BOX_ID;
    box.innerHTML =
      '<p class="mm-ts-tip">🤖 先证明一下你是真人，再登录 👇</p>' +
      '<div id="mm-turnstile-widget"></div>';

    var h3 = step2.querySelector('h3');
    if (h3 && h3.parentNode === step2) h3.insertAdjacentElement('afterend', box);
    else step2.insertBefore(box, step2.firstChild);
    return box;
  }

  /* ────────── ③ 锁 / 解锁三个登录按钮（.lg-btn：谷歌 / GitHub / 邮箱） ────────── */
  function targets() {
    return Array.prototype.slice.call(document.querySelectorAll('#gateStep2 .lg-btn'));
  }

  function setLocked(locked) {
    targets().forEach(function (btn) {
      if (locked) {
        btn.setAttribute('data-mm-locked', '1');
        btn.setAttribute('aria-disabled', 'true');
        if (!btn.dataset.mmTitle) btn.dataset.mmTitle = btn.title || '';
        btn.title = '请先完成上面的「我是真人」验证';
      } else {
        btn.removeAttribute('data-mm-locked');
        btn.removeAttribute('aria-disabled');
        btn.title = btn.dataset.mmTitle || '';
      }
    });
    var tip = document.querySelector('#' + BOX_ID + ' .mm-ts-tip');
    if (tip) tip.style.display = locked ? '' : 'none';
  }

  /* 用捕获阶段的点击拦截：比 disabled 属性更稳（不影响原有 onclick 绑定） */
  document.addEventListener(
    'click',
    function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('#gateStep2 .lg-btn') : null;
      if (btn && btn.getAttribute('data-mm-locked') === '1') {
        ev.preventDefault();
        ev.stopPropagation();
        var tip = document.querySelector('#' + BOX_ID + ' .mm-ts-tip');
        if (tip) {
          tip.textContent = '👉 请先完成上面的验证（点一下方框）';
          tip.style.color = '#d9534f';
        }
      }
    },
    true
  );

  /* ────────── ④ 加载官方脚本并渲染 ────────── */
  function loadScript(onload) {
    if (window.turnstile) return onload();
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = onload;
    s.onerror = function () {
      log('官方脚本加载失败（网络或拦截器？）→ 解锁，放人进');
      setLocked(false);
    };
    document.head.appendChild(s);
  }

  function render() {
    var host = document.getElementById('mm-turnstile-widget');
    if (!host || !window.turnstile) {
      log('未就绪 → 解锁');
      setLocked(false);
      return;
    }
    try {
      window.turnstile.render(host, {
        sitekey: SITE_KEY,
        theme: 'auto',
        callback: function (token) {
          window.MM_TURNSTILE_TOKEN = token; // 将来交给 Worker 校验用
          log('验证通过 ✅');
          setLocked(false);
        },
        'expired-callback': function () {
          window.MM_TURNSTILE_TOKEN = '';
          log('验证过期，重新锁上');
          setLocked(true);
        },
        'error-callback': function () {
          window.MM_TURNSTILE_TOKEN = '';
          log('验证出错 → 解锁，放人进（fail-open）');
          setLocked(false);
        },
      });
      log('已渲染，等待真人点击');
    } catch (e) {
      log('渲染异常 → 解锁', e && e.message);
      setLocked(false);
    }
  }

  /* ────────── ⑤ 入口 ────────── */
  function boot() {
    if (!SITE_KEY || SITE_KEY.indexOf('PLACEHOLDER') >= 0) {
      log('site key 还是占位符 → 本功能隐身，登录照旧');
      return;
    }
    var step2 = document.getElementById('gateStep2');
    if (!step2) {
      log('没找到 gateStep2（登录门结构变了？）→ 跳过');
      return;
    }
    injectStyle();
    ensureBox(step2);
    setLocked(true); // 先锁上，验证通过再开

    var done = false;
    var timer = setTimeout(function () {
      if (!done) {
        log('超时未就绪 → 解锁（fail-open）');
        setLocked(false);
      }
    }, TIMEOUT_MS);

    loadScript(function () {
      done = true;
      clearTimeout(timer);
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
