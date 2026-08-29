// ===== 登录系统（Firebase Auth + 账号菜单 + 绑定多个登录方式） =====

let auth = null;

function isConfigReady(){
    return window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

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

function hideLoginGate(){
    const g = document.getElementById("loginGate");
    if(g) g.style.display = "none";
}

function gateLogin(){
    document.getElementById("gateStep1").style.display = "none";
    document.getElementById("gateStep2").style.display = "block";
}

function gateBack(){
    document.getElementById("gateStep1").style.display = "block";
    document.getElementById("gateStep2").style.display = "none";
}

function gateGuest(){
    localStorage.setItem("guestMode", "1");
    localStorage.removeItem("authUser");
    hideLoginGate();
    showUserBox("游客", "", null);
    updateContactEmail(null);
}

// ===================== 登录方式(登录门第二步) =====================

function loginProvider(providerName){
    if(!auth){ alert("登录需先在 firebase-config.js 填入你的 Firebase 配置"); return; }
    let p = providerName === "google"
        ? new firebase.auth.GoogleAuthProvider()
        : new firebase.auth.GithubAuthProvider();
    firebase.auth().signInWithPopup(p)
    .then(function(){})
    .catch(function(err){ alert("登录失败：" + (err.message || err)); });
}

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

// 联系方式解锁：仅«毛毛»账号登录显示真邮箱, 游客/其他人显示"请登录后查看"
// 联系邮箱 · 混淆存储（倒序+Base64 双重编码, 源码/爬虫搜不到明文邮箱）
// 解码函数: 只在毛毛账号登录时才执行
var CONTACT_EMAIL_ENC = "bW9jLmxpYW1nQDFvdm8xb2Ftb2Ft";              // 主人邮箱(编码)
var CONTACT_EMAIL_163_ENC = "bW9jLjM2MUAxb3ZvMW9hbW9hbQ==";          // 备用邮箱(编码)
function decodeContactEmail(s){
    try{ return atob(s).split("").reverse().join(""); }catch(e){ return ""; }
}

function updateContactEmail(user){
    try{
        const el = document.getElementById("contactEmail");
        if(!el) return;
        const MAIL = decodeContactEmail(CONTACT_EMAIL_ENC);
        const MAIL2 = decodeContactEmail(CONTACT_EMAIL_163_ENC);
        let isMaoMao = false;
        if(user && user.email){
            const m = String(user.email).toLowerCase().trim();
            isMaoMao = (m === MAIL || m === MAIL2);
        }
        if(isMaoMao){
            el.textContent = MAIL;
            el.classList.remove("contact-locked");
        }else{
            el.textContent = "🔒 请登录后查看";
            el.classList.add("contact-locked");
        }
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

function showUserBox(name, photo, user){
    const btn = document.getElementById("accountBtn");
    if(!btn) return;
    btn.style.display = "inline-flex";
    const n = document.getElementById("accName");
    if(n){
        n.textContent = name;
        // 金色用户名：仅«毛毛»账号生效（名字/邮箱匹配；其他访客名字保持原样）
        const isMaoMao = /毛毛/i.test(String(name || ""))
            || /maomao1ovo1/i.test(String(name || ""))
            || /maomao1ovo1@(gmail|163)\.com$/i.test(String(this?.user?.email || ""))
            || /maomao1ovo1@(gmail|163)\.com$/i.test(String(localStorage.getItem("authUser") || ""));
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

function toggleAccountMenu(event){
    if(event) event.stopPropagation();
    const m = document.getElementById("accountMenu");
    if(!m) return;
    const show = m.style.display !== "block";
    m.style.display = show ? "block" : "none";
    // 菜单打开时隐藏底部账号卡片，避免互相盖住（菜单自带头像/名字/邮箱）
    const btn = document.getElementById("accountBtn");
    if(btn) btn.style.visibility = show ? "hidden" : "visible";
    if(show) updateAccountMenu(auth && auth.currentUser);
}

function hideAccountMenu(){
    const m = document.getElementById("accountMenu");
    if(m) m.style.display = "none";
    // 关闭菜单时恢复账号卡片显示
    const btn = document.getElementById("accountBtn");
    if(btn) btn.style.visibility = "visible";
    // 收起展开的表单（更改密码/绑定邮箱），避免下次打开残留
    ["changePassBox","bindEmailBox"].forEach(function(id){
        const box = document.getElementById(id);
        if(box) box.style.display = "none";
    });
}

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

function showBindEmail(){
    const box = document.getElementById("bindEmailBox");
    if(box) box.style.display = "block";
}

// ===================== 更改密码（邮箱密码账号） =====================

function showChangePassword(){
    const box = document.getElementById("changePassBox");
    if(box) box.style.display = "block";
}

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

function switchAccount(){
    if(auth) auth.signOut();
    localStorage.removeItem("authUser");
    localStorage.removeItem("guestMode");
    hideAccountMenu();
    const btn = document.getElementById("accountBtn");
    if(btn) btn.style.display = "none";
    showLoginGate();
}

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
        m.style.display = "none";
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
