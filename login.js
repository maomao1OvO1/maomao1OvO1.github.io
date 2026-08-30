// ===== 登录系统（Firebase Auth + 账号菜单 + 绑定多个登录方式） =====
/*
 * =========================== 文件级注释 ===========================
 * 本文件：login.js —— 网站「登录系统」核心逻辑
 * 用途：基于 Firebase Authentication 实现用户登录门、账号菜单、
 *       多登录方式绑定/解绑（谷歌/GitHub/邮箱）、修改密码、游客模式，
 *       以及账号按钮 / 金色昵称等展示逻辑。
 *
 * 主要函数清单：
 *   - isConfigReady()              检测 Firebase 配置是否已填写
 *   - initFirebase()               初始化 Firebase 并监听登录状态变化
 *   - showLoginGate / hideLoginGate  显示/隐藏登录门（游客/已登录时跳过）
 *   - gateLogin / gateBack / gateGuest  登录门步骤切换 + 进入游客模式
 *   - loginProvider()              谷歌/GitHub 弹窗登录
 *   - emailLogin()                 邮箱注册/登录（含邮箱验证拦截）
 *   - clearAuthCache()             清本地登录缓存并回登录门
 *   - updateContactEmail()         按账号展示「持有者邮箱」或锁定提示
 *   - pickAvatar()                 按优先级选择头像（谷歌→GitHub→默认）
 *   - showLoginState / showUserBox 渲染登录态 / 账号按钮
 *   - toggleAccountMenu / hideAccountMenu / updateAccountMenu  账号下拉菜单
 *   - unlinkProvider / bindProvider / showBindEmail / linkEmail  绑定/解绑
 *   - showChangePassword / changePassword                    修改密码
 *   - switchAccount / logout         切换账号/退出登录
 *   - toggleEmailMode / togglePassEye 邮箱表单切换、密码显示/隐藏
 *
 * 被哪些页面引用：index.html（首页登录门 + 账号按钮）
 * =================================================================
 */

// Firebase Auth 实例引用：由 initFirebase() 成功初始化后赋值；未初始化时各处会判定为空
let auth = null;

// 功能：判断 Firebase 配置是否真正填写好（不是模板占位符）
// 参数：无
// 返回：true=可初始化 Firebase；false=还没配置（引导用户先去 firebase-config.js 填）
function isConfigReady(){
    return window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

// 功能：初始化 Firebase Auth，并监听登录状态变化（全站登录中枢）
// 参数：无
// 返回：无
// 关键逻辑：
//   - 未填配置 / SDK 未加载时直接跳过（不报错）
//   - firebase.initializeApp 用全局 window.FIREBASE_CONFIG 配置
//   - auth.onAuthStateChanged 是「登录状态」的唯一可信来源：
//     user 存在 → 显示真实登录态；否则按本地缓存恢复（游客或上次登录信息）
function initFirebase(){
    if(!isConfigReady() || !firebase) return;
    firebase.initializeApp(window.FIREBASE_CONFIG);
    auth = firebase.auth();
    auth.onAuthStateChanged(function(user){
        if(user){
            showLoginState(user, true);
        }else{
            // 未登录/已退出：按本地缓存恢复账号按钮(游客或上次登录信息), 不清掉登录门逻辑
            const guest = localStorage.getItem("guestMode");
            if(guest){
                showUserBox("游客", "", null);
            }else{
                const saved = localStorage.getItem("authUser");
                if(saved){
                    try{
                        const u = JSON.parse(saved);
                        showUserBox(u.name, u.photo, null);
                    }catch(e){
                        localStorage.removeItem("authUser");
                        showLoginGate();
                    }
                }
            }
        }
    });
}

// ===================== 登录门 =====================

// 功能：显示「登录门」（全屏遮罩），或在已登录/游客模式下直接隐藏并恢复账号按钮
// 参数：无
// 返回：无
// 关键逻辑：优先判断：游客模式→直接显示游客按钮；有本地登录缓存→直接恢复账号按钮；
//           都没有→才显示登录门，且默认展示第一步（gateStep1）。
function showLoginGate(){
    const g = document.getElementById("loginGate");
    if(!g) return;
    if(localStorage.getItem("guestMode")){
        g.style.display = "none";
        showUserBox("游客", "", null);   // 游客模式也显示账号按钮(灰色头像+游客)
        return;
    }
    if(localStorage.getItem("authUser")){
        g.style.display = "none";
        const u = JSON.parse(localStorage.getItem("authUser"));
        showUserBox(u.name, u.photo, null);
        return;
    }
    g.style.display = "flex";
    const s1 = document.getElementById("gateStep1");
    const s2 = document.getElementById("gateStep2");
    if(s1) s1.style.display = "block";
    if(s2) s2.style.display = "none";
}

// 功能：隐藏登录门（完整遮罩直接 display:none）
function hideLoginGate(){
    const g = document.getElementById("loginGate");
    if(g) g.style.display = "none";
}

// 功能：登录门第一步 → 第二步（隐藏「开始」步，显示「选择登录方式」步）
function gateLogin(){
    document.getElementById("gateStep1").style.display = "none";
    document.getElementById("gateStep2").style.display = "block";
}

// 功能：登录门第二步 → 返回第一步
function gateBack(){
    document.getElementById("gateStep1").style.display = "block";
    document.getElementById("gateStep2").style.display = "none";
}

// 功能：进入「游客模式」——不登录就能逛
// 关键逻辑：写 guestMode 标记、清掉登录缓存、隐藏登录门、
//           显示游客账号按钮、并把联系方式设为被锁定状态。
function gateGuest(){
    localStorage.setItem("guestMode", "1");
    localStorage.removeItem("authUser");
    hideLoginGate();
    showUserBox("游客", "", null);
    updateContactEmail(null);
}

// ===================== 登录方式(登录门第二步) =====================

// 功能：用第三方 Provider（谷歌/GitHub）的「弹窗」方式登录
// 参数：providerName —— "google" 或 "github"
// 返回：无（Promise 链，成功或失败都只弹提示）
// 关键逻辑：new firebase.auth.XxxAuthProvider() 构造对应登录源，
//           signInWithPopup 拉起浏览器弹窗授权；失败统一弹错误消息。
function loginProvider(providerName){
    if(!auth){ alert("登录需先在 firebase-config.js 填入你的 Firebase 配置"); return; }
    let p = providerName === "google"
        ? new firebase.auth.GoogleAuthProvider()
        : new firebase.auth.GithubAuthProvider();
    firebase.auth().signInWithPopup(p)
    .then(function(){})
    .catch(function(err){ alert("登录失败：" + (err.message || err)); });
}

// 功能：邮箱「注册」或「登录」（登录门邮箱表单提交入口）
// 参数：
//   - email     —— 邮箱字符串
//   - pass      —— 密码字符串
//   - isSignup  —— true=注册；false=登录
// 返回：无（Promise 流程，全部通过弹窗提示结果）
// 关键逻辑：
//   - 注册：校验密码≥6位、两次密码一致 → createUserWithEmailAndPassword
//   - 注册成功：发验证邮件并登出（未验证前不能登录）→ 回登录门
//   - 登录：signInWithEmailAndPassword；若邮箱未验证则拦截登录、重发验证邮件并登出
//   - 错误统一按 Firebase 错误码（auth/xxx）给出友好中文提示
function emailLogin(email, pass, isSignup){
    if(!auth){ alert("登录需先在 firebase-config.js 填入你的 Firebase 配置"); return; }
    email = String(email||"").trim();
    if(!email || !pass){ alert("请填写邮箱和密码"); return; }
    if(isSignup){
        // 注册：两遍输入确认（新网页软件通用样式）
        const pass2 = document.getElementById("lgPass2");
        const p2 = pass2 ? pass2.value : "";
        if(pass.length < 6){ alert("密码太短啦：至少 6 位"); return; }
        if(pass !== p2){ alert("两次输入的密码不一致，请重新确认"); return; }
    }
    const f = isSignup
        ? firebase.auth().createUserWithEmailAndPassword(email, pass)
        : firebase.auth().signInWithEmailAndPassword(email, pass);
    f.then(function(cred){
        const u = cred.user;
        if(isSignup){
            // 注册成功：必须先去邮箱点「确认」链接，验证通过才算真正可用（否则用不了）
            return (u.sendEmailVerification ? u.sendEmailVerification() : Promise.resolve())
                .then(function(){ return auth.signOut(); })
                .then(function(){
                    clearAuthCache();
                    alert("✅ 注册成功！已往 " + email + " 发送验证邮件，请去邮箱点「确认」链接，验证通过后再回来登录。");
                })
                .catch(function(err){
                    clearAuthCache();
                    alert("⚠️ 注册成功，但验证邮件发送失败（" + (err.message||err) + "）。请稍后重新登录再试；邮箱验证前暂时登不进。");
                });
        }
        if(u.emailVerified){
            // 邮箱已验证，正常登录（onAuthStateChanged 会接管后续）
            return;
        }
        // 邮箱还没验证：拦截登录，重发验证邮件并登出，回到登录门
        return (u.sendEmailVerification ? u.sendEmailVerification() : Promise.resolve())
            .then(function(){ return auth.signOut(); })
            .then(function(){
                clearAuthCache();
                alert("⚠️ 该邮箱还没验证，暂时不能登录。已重新发送验证邮件，请到邮箱点「确认」链接后再来登录。");
            })
            .catch(function(err){
                clearAuthCache();
                alert("⚠️ 邮箱还没验证。已重新发验证邮件（" + (err.message||err) + "），请到邮箱点「确认」链接后再来登录。");
            });
    })
    .catch(function(err){
        if(isSignup){
            if(err.code === "auth/email-already-in-use") alert("该邮箱已注册，请直接登录");
            else if(err.code === "auth/weak-password") alert("密码太弱：至少 6 位");
            else alert("邮箱注册失败：" + (err.message || err));
        }else{
            if(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials") alert("邮箱或密码不正确，或该邮箱还没设密码（若是谷歌/GitHub 账号，请用对应方式登录）");
            else if(err.code === "auth/user-not-found") alert("该邮箱还没注册，请先注册");
            else if(err.code === "auth/too-many-requests") alert("尝试次数太多，请稍后再试");
            else if(err.code === "auth/invalid-email") alert("邮箱格式不正确");
            else alert("邮箱登录失败：" + (err.message || err));
        }
    });
}

// 邮箱验证拦截/强制登出时清本地登录缓存并回登录门（配合 onAuthStateChanged）
function clearAuthCache(){
    try{
        localStorage.removeItem("authUser");
        localStorage.removeItem("guestMode");
        hideAccountMenu();
        showLoginGate();
    }catch(e){}
}

// ===================== 登录状态 =====================

// 灰色默认头像（未登录/无头像时显示，通用软件风格：灰底+白色人形剪影）
const DEFAULT_AVATAR = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' +
    '<circle cx="64" cy="64" r="64" fill="#c9c9c9"/>' +
    '<circle cx="64" cy="48" r="22" fill="#ffffff"/>' +
    '<path d="M64 76c-22 0-40 14-40 31v21h80v-21c0-17-18-31-40-31z" fill="#ffffff"/>' +
    '</svg>');

// 联系方式 = 留言箱方案（2026-08-30 站长决定：邮箱不再展示/不再存放于前端，规避风险）
// 前端源码彻底无邮箱（明文/密文/密钥全部下线）；留言见 contact.js（Firestore 直连，国内不可达=天然筛选）

// 功能：更新「持有者邮箱」显示区域
// 参数：user —— 当前登录用户对象（含 email），null 表示未登录/游客
// 返回：无
// 关键逻辑：把邮箱编码（Base64+倒序）解码成明文，仅在「毛毛」账号登录时展示，
//           其他情况显示「🔒 请登录后查看」并加锁定样式（保护隐私）。
function updateContactEmail(user){
    // 邮箱已下线（2026-08-30）：联系方式改为「💬 联系我」留言箱（content contact.js），
    // 此函数仅负责给按钮容器一个登录状态文案（不再含任何邮箱信息）。
    try{
        const el = document.getElementById("contactEmail");
        if(!el) return;
        el.classList.remove("contact-locked");
    }catch(e){}
}

// 头像选择：Google 优先 → GitHub 其次 → 邮箱(无头像) → 灰色默认
function pickAvatar(user){
    try{
        if(!user) return DEFAULT_AVATAR;
        // 1) Google
        const google = (user.providerData || []).find(function(p){ return p.providerId === "google.com"; });
        if(google && google.photoURL) return google.photoURL;
        // 2) GitHub
        const github = (user.providerData || []).find(function(p){ return p.providerId === "github.com"; });
        if(github && github.photoURL) return github.photoURL;
        // 3) 当前 photoURL（邮箱绑定等）
        if(user.photoURL) return user.photoURL;
    }catch(e){}
    return DEFAULT_AVATAR;
}

// 功能：进入真实登录态时刷新整个界面（账号按钮 + 联系方式 + 缓存）
// 参数：
//   - user     —— Firebase 用户对象
//   - loggedIn —— 是否已登录的标记
// 返回：无
// 关键逻辑：取昵称与头像（pickAvatar），把登录信息写入 localStorage(authUser) 供下次恢复，
//           移除游客标记，渲染账号按钮并恢复联系方式；最后强制隐藏登录门。
function showLoginState(user, loggedIn){
    if(loggedIn && user){
        const name = user.displayName || user.email;
        const photo = pickAvatar(user);
        localStorage.setItem("authUser", JSON.stringify({name: name, email: user.email, photo: photo}));
        localStorage.removeItem("guestMode");
        showUserBox(name, photo, user);
        updateContactEmail(user);
    }
    hideLoginGate();
}

// ===================== 账号按钮 + 菜单 =====================

// 功能：渲染账号按钮（昵称 + 头像 + 金色昵称/管理员标记）
// 参数：
//   - name  —— 显示昵称（游客/已登录）
//   - photo —— 头像 URL（可空）
//   - user  —— Firebase 用户对象（可空，游客时 null）
// 返回：无
// 关键逻辑：通过正则判断是否「毛毛」账号（名字/邮箱匹配），命中则加金色昵称、
//           显示角色徽标与管理员入口；否则去掉这些特权，头像回退默认灰头像。
function showUserBox(name, photo, user){
    const btn = document.getElementById("accountBtn");
    if(!btn) return;
    btn.style.display = "inline-flex";
    const n = document.getElementById("accName");
    if(n){
        n.textContent = name;
        // 金色用户名：仅«毛毛»账号生效（名字/邮箱匹配；其他访客名字保持原样）
        const isMaoMao = /毛毛/i.test(String(name || ""))
            || /maomao1ovo1/i.test(String(name || ""));   // 邮箱判定已移除（源码零邮箱）；装饰性特权，真鉴权在 admin-api 服务端
        if(isMaoMao){
            n.classList.add("gold-name");
            const role = document.getElementById("accRole");
            if(role) role.style.display = "inline";
            const ua = document.getElementById("userAdminWrap");
            if(ua) ua.style.display = "block";
            const una = document.getElementById("accUserAdmin");
            if(una) una.style.display = "inline-block";
        }else{
            n.classList.remove("gold-name");
            const role = document.getElementById("accRole");
            if(role) role.style.display = "none";
            const ua = document.getElementById("userAdminWrap");
            if(ua) ua.style.display = "none";
            const una = document.getElementById("accUserAdmin");
            if(una) una.style.display = "none";
        }
    }
    const img = document.getElementById("accPhoto");
    if(img){
        img.classList.remove("avatar-default");
        if(photo){
            img.src = photo;
        }else{
            img.src = DEFAULT_AVATAR;
            img.classList.add("avatar-default");
        }
    }
}

// 功能：打开/关闭账号下拉菜单
// 参数：event —— 触发点击事件（阻止冒泡，避免被“点击菜单外关闭”逻辑误关）
// 返回：无
// 关键逻辑：切 menu 的 display；打开时给账号按钮加“卡片收起”样式，
//           并调用 updateAccountMenu 刷新菜单内容；关闭时恢复正常。
function toggleAccountMenu(event){
    if(event) event.stopPropagation();
    const m = document.getElementById("accountMenu");
    if(!m) return;
    const show = m.style.display !== "block";
    m.style.display = show ? "block" : "none";
    // 菜单打开时收起账号卡片（从大变小+淡出），关闭时恢复（从小变大+淡入）
    const btn = document.getElementById("accountBtn");
    if(btn) btn.classList.toggle("card-hide", show);
    if(show) updateAccountMenu(auth && auth.currentUser);
}

// 功能：关闭账号菜单，并还原界面状态
// 参数：无
// 返回：无
// 关键逻辑：隐藏 menu、去掉账号按钮“收起”样式、收起展开的“改密码/绑定邮箱”表单，
//           避免下次打开时残留。
function hideAccountMenu(){
    const m = document.getElementById("accountMenu");
    if(m) m.style.display = "none";
    // 关闭菜单时恢复账号卡片显示（从小变大+淡入）
    const btn = document.getElementById("accountBtn");
    if(btn) btn.classList.remove("card-hide");
    // 收起展开的表单（更改密码/绑定邮箱），避免下次打开残留
    ["changePassBox","bindEmailBox"].forEach(function(id){
        const box = document.getElementById(id);
        if(box) box.style.display = "none";
    });
}

// 功能：刷新账号菜单内容（昵称/邮箱/绑定列表/特权按钮）
// 参数：user —— 当前登录用户对象；null=游客/未登录
// 返回：无
// 关键逻辑：
//   - 每次打开都先收起展开的表单，防残留
//   - 未登录：显示“游客 / 未登录” + 登录/切换按钮
//   - 已登录：按 providerData 判断已绑定哪些登录方式（google/github/password），
//     没绑定的给「绑定」按钮，已绑定的给「解绑」按钮；
//     密码方式存在时才显示「修改密码」入口。
function updateAccountMenu(user){
    const menu = document.getElementById("accountMenu");
    if(!menu) return;
    // 每次刷新菜单（含重新打开）都先收起展开的表单，防止残留
    ["changePassBox","bindEmailBox"].forEach(function(id){
        const box = document.getElementById(id);
        if(box) box.style.display = "none";
    });
    const nameEl = document.getElementById("menuName");
    const emEl = document.getElementById("menuEmail");
    const photoEl = document.getElementById("menuPhoto");
    const list = document.getElementById("bindList");
    if(!user){
        if(nameEl) nameEl.textContent = "游客";
        if(emEl) emEl.textContent = "未登录";
        if(list) list.innerHTML =
            '<div class="acc-row"><button class="acc-small" onclick="switchAccount()">登录 / 切换账号</button></div>' +
            '<div class="acc-note">游客模式不关联任何登录方式</div>';
        return;
    }
    if(nameEl) nameEl.textContent = user.displayName || user.email || "用户";
    if(emEl) emEl.textContent = user.email || "";
    if(photoEl){
        const p = pickAvatar(user);
        photoEl.classList.remove("avatar-default");
        if(p){
            photoEl.src = p;
        }else{
            photoEl.src = DEFAULT_AVATAR;
            photoEl.classList.add("avatar-default");
        }
    }

    const linked = {};
    (user.providerData || []).forEach(function(p){ linked[p.providerId] = true; });
    // 当前账号绑定的邮箱(展示)
    if(emEl){
        const emails = (user.providerData||[])
            .filter(function(p){ return p.email; })
            .map(function(p){ return p.email; });
        emEl.textContent = (emails.length ? emails.join(" · ") : (user.email || ""));
    }

    let html = "";
    if(linked["google.com"]){
        html += '<div class="acc-row"><span class="acc-badge">Google ✓</span><button class="acc-small danger" onclick="unlinkProvider(\'google.com\')">解绑</button></div>';
    }else{
        html += '<div class="acc-row"><button class="acc-small" onclick="bindProvider(\'google\')">绑定 Google</button></div>';
    }
    if(linked["github.com"]){
        html += '<div class="acc-row"><span class="acc-badge">GitHub ✓</span><button class="acc-small danger" onclick="unlinkProvider(\'github.com\')">解绑</button></div>';
    }else{
        html += '<div class="acc-row"><button class="acc-small" onclick="bindProvider(\'github\')">绑定 GitHub</button></div>';
    }
    if(linked["password"]){
        html += '<div class="acc-row"><span class="acc-badge">邮箱 ✓</span><button class="acc-small danger" onclick="unlinkProvider(\'password\')">解绑</button></div>';
        const cpBtn = document.getElementById("changePassBtn");
        if(cpBtn) cpBtn.style.display = "inline-block";
    }else{
        html += '<div class="acc-row"><button class="acc-small" onclick="showBindEmail()">绑定邮箱</button></div>';
        const cpBtn = document.getElementById("changePassBtn");
        if(cpBtn) cpBtn.style.display = "none";
    }
    if(list) list.innerHTML = html;
}

// ===================== 解绑(取消绑定)登录方式 =====================

// 功能：解绑(取消绑定)某个登录方式
// 参数：providerId —— 如 "google.com" / "github.com" / "password"
// 返回：无
// 关键逻辑：先 confirm 二次确认；auth.currentUser.unlink 解绑；
//           auth/requires-recent-login 错误提示“需近期重新登录”（Firebase 安全限制）。
function unlinkProvider(providerId){
    if(!auth || !auth.currentUser){ alert("请先登录"); return; }
    const label = providerId === "google.com" ? "Google" : providerId === "github.com" ? "GitHub" : "邮箱";
    if(!confirm("确定解除绑定的 " + label + " 吗?")) return;
    auth.currentUser.unlink(providerId)
    .then(function(){
        alert("已解绑 " + label);
        updateAccountMenu(auth.currentUser);
    })
    .catch(function(err){
        if(err.code === "auth/requires-recent-login"){
            alert("安全起见：请先退出登录，重新登录一次，再解绑（解绑需要近期登录）");
        }else{
            alert("解绑失败：" + (err.message || err));
        }
    });
}

// ===================== 绑定其他登录方式(账号关联) =====================

// 功能：绑定一个新的第三方登录方式到当前账号（账号关联）
// 参数：providerName —— "google" 或 "github"
// 返回：无
// 关键逻辑：linkWithPopup 弹出授权；auth/credential-already-in-use 提示该方式已被占用。
function bindProvider(providerName){
    if(!auth || !auth.currentUser){ alert("请先登录"); return; }
    let p = providerName === "google"
        ? new firebase.auth.GoogleAuthProvider()
        : new firebase.auth.GithubAuthProvider();
    auth.currentUser.linkWithPopup(p)
    .then(function(){ alert("已绑定 " + providerName); updateAccountMenu(auth.currentUser); })
    .catch(function(err){
        if(err.code === "auth/credential-already-in-use") alert("该登录方式已绑定到其他账号");
        else alert("绑定失败：" + (err.message || err));
    });
}

// 功能：显示「绑定邮箱」表单
function showBindEmail(){
    const box = document.getElementById("bindEmailBox");
    if(box) box.style.display = "block";
}

// ===================== 更改密码（邮箱密码账号） =====================

// 功能：显示「修改密码」表单
function showChangePassword(){
    const box = document.getElementById("changePassBox");
    if(box) box.style.display = "block";
}

// 功能：修改邮箱密码（需旧密码验证）
// 参数：无（从页面表单读取旧/新密码两遍）
// 返回：无
// 关键逻辑：
//   - 校验旧密码/新密码非空、新密码≥6位、两遍一致、新旧不同
//   - 先 reauthenticateWithCredential 验证当前密码（防他人登录后改密）
//   - 再 updatePassword 更新；成功后清空表单并关闭弹窗
//   - 错误码分别给出“密码不对 / 太弱 / 需近期重新登录”等提示
function changePassword(){
    if(!auth || !auth.currentUser){ alert("请先登录"); return; }
    const oldPass = document.getElementById("changeOldPass") ? document.getElementById("changeOldPass").value : "";
    const newPass = document.getElementById("changeNewPass") ? document.getElementById("changeNewPass").value : "";
    const newPass2 = document.getElementById("changeNewPass2") ? document.getElementById("changeNewPass2").value : "";
    const email = auth.currentUser.email || "";
    if(!email){ alert("当前账号没有绑定邮箱密码，无法修改密码"); return; }
    if(!oldPass || !newPass){ alert("请填写当前密码和新密码"); return; }
    if(newPass.length < 6){ alert("新密码至少 6 位"); return; }
    if(newPass !== newPass2){ alert("两次输入的新密码不一致"); return; }
    if(newPass === oldPass){ alert("新密码不能和当前密码相同"); return; }
    // 先验证当前密码（防他人登录后改密），再更新
    const cred = firebase.auth.EmailAuthProvider.credential(email, oldPass);
    auth.currentUser.reauthenticateWithCredential(cred)
    .then(function(){
        return auth.currentUser.updatePassword(newPass);
    })
    .then(function(){
        alert("🎉 密码修改成功！下次请用新密码登录");
        ["changeOldPass","changeNewPass","changeNewPass2"].forEach(function(id){
            const el = document.getElementById(id);
            if(el){ el.value = ""; el.type = "password"; }
        });
        const box = document.getElementById("changePassBox");
        if(box) box.style.display = "none";
    })
    .catch(function(err){
        if(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"){
            alert("当前密码不正确，请重新输入");
        }else if(err.code === "auth/weak-password"){
            alert("新密码太弱：至少 6 位，别用太简单的");
        }else if(err.code === "auth/requires-recent-login"){
            alert("安全起见：请退出后重新登录一次，再改密码");
        }else{
            alert("修改失败：" + (err.message || err));
        }
    });
}

// 功能：把「邮箱+密码」作为新的登录方式绑定到当前账号
// 参数：无（从页面表单读取邮箱/密码）
// 返回：无
// 关键逻辑：构造 EmailAuthProvider 凭据 → linkWithCredential 绑定；
//           绑定后向该邮箱发验证邮件确认归属；错误码提示该邮箱已被占用。
function linkEmail(){
    if(!auth || !auth.currentUser){ alert("请先登录"); return; }
    const email = document.getElementById("bindEmail").value.trim();
    const pass = document.getElementById("bindPass").value;
    if(!email || !pass){ alert("请填邮箱和密码"); return; }
    const cred = firebase.auth.EmailAuthProvider.credential(email, pass);
    auth.currentUser.linkWithCredential(cred)
    .then(function(){
        // 发一封验证邮件到该邮箱，确认邮箱归属（防止乱绑）
        auth.currentUser.sendEmailVerification()
        .then(function(){
            alert("已绑定该邮箱；已往 " + email + " 发送验证邮件，请到邮箱点链接确认，才算验证通过。");
        })
        .catch(function(){
            alert("已绑定该邮箱，但验证邮件发送失败（可在 Firebase → 认证 → 电子邮件模板 配置发件域名）。");
        });
        updateAccountMenu(auth.currentUser);
    })
    .catch(function(err){
        if(err.code === "auth/credential-already-in-use") alert("该邮箱已绑定到其他账号，无法再次绑定");
        else alert("绑定失败：" + (err.message || err));
    });
}

// ===================== 切换账号 / 退出 =====================

// 功能：退出并回到登录门（供“切换账号”使用）
function switchAccount(){
    if(auth) auth.signOut();
    localStorage.removeItem("authUser");
    localStorage.removeItem("guestMode");
    hideAccountMenu();
    const btn = document.getElementById("accountBtn");
    if(btn) btn.style.display = "none";
    showLoginGate();
}

// 功能：正式退出登录（清缓存、隐藏账号按钮、回登录门）
function logout(){
    if(auth) auth.signOut();
    localStorage.removeItem("authUser");
    localStorage.removeItem("guestMode");
    hideAccountMenu();
    const btn = document.getElementById("accountBtn");
    if(btn) btn.style.display = "none";
    showLoginGate();
}

// ===================== 邮箱表单切换(登录门) =====================

// 功能：在「邮箱登录 / 邮箱注册」之间切换表单 UI
// 参数：无
// 返回：无
// 关键逻辑：读 data-mode 判断当前模式并翻转；注册模式显示“两遍密码”和不同文案，
//           同时把谷歌/GitHub 按钮文案切换为“注册/登录”。
function toggleEmailMode(){
    const t = document.getElementById("emailMode");
    if(!t) return;
    const isSignupNow = t.getAttribute("data-mode") === "signup";
    const newMode = isSignupNow ? "login" : "signup";
    t.setAttribute("data-mode", newMode);
    const signup = newMode === "signup";
    // 链接文案：显示「点它会切到哪个模式」（当前模式决定）
    t.textContent = signup ? "已有账号?登录" : "没有账号?注册";
    // 邮箱表单：注册要填两遍密码，登录只填一次
    const wrap = document.getElementById("lgPass2Wrap");
    const hint = document.getElementById("lgPassHint");
    const submit = document.getElementById("lgSubmit");
    if(wrap) wrap.style.display = signup ? "block" : "none";
    if(hint) hint.style.display = signup ? "block" : "none";
    if(submit) submit.textContent = signup ? "邮箱注册" : "邮箱登录";
    // 谷歌/GitHub 按钮：跟随模式显示 登录/注册
    var gb = document.querySelector(".lg-btn.google");
    var ghb = document.querySelector(".lg-btn.github");
    if(gb) gb.textContent = signup ? "谷歌 注册" : "谷歌 登录";
    if(ghb) ghb.textContent = signup ? "GitHub 注册" : "GitHub 登录";
}

// 密码显示/隐藏（👁 按钮，网上软件通用样式）
function togglePassEye(inputId, btn){
    const el = document.getElementById(inputId);
    if(!el) return;
    el.type = el.type === "password" ? "text" : "password";
    const show = el.type === "text";
    if(btn) btn.classList.toggle("on", show);
}

// 点击菜单外关闭
document.addEventListener("click", function(e){
    const m = document.getElementById("accountMenu");
    const b = document.getElementById("accountBtn");
    if(!m || m.style.display !== "block") return;
    if(!m.contains(e.target) && !(b && b.contains(e.target))){
        hideAccountMenu();
    }
});

document.addEventListener("DOMContentLoaded", function(){
    // 1) 先用本地缓存立即恢复界面(无网/慢网也能看到账号按钮或登录门)
    const guest = localStorage.getItem("guestMode");
    const saved = localStorage.getItem("authUser");
    if(guest){
        showUserBox("游客", "", null);
        updateContactEmail(null);
    }else if(saved){
        try{
            const u = JSON.parse(saved);
            showUserBox(u.name, u.photo, null);
            updateContactEmail(u && u.email ? { email: u.email } : null);
        }catch(e){
            localStorage.removeItem("authUser");
            showLoginGate();
        }
    }else{
        showLoginGate();   // 首次访问/已退出: 显示登录门
    }
    // 2) Firebase 异步初始化, 有用户则刷新为真实登录态
    initFirebase();
    if(auth && auth.currentUser){ showLoginState(auth.currentUser, true); }
});
