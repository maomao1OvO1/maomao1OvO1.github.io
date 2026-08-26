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
    const f = isSignup
        ? firebase.auth().createUserWithEmailAndPassword(email, pass)
        : firebase.auth().signInWithEmailAndPassword(email, pass);
    f.then(function(){})
     .catch(function(err){ alert("邮箱登录失败：" + (err.message || err)); });
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
        }else{
            n.classList.remove("gold-name");
            const role = document.getElementById("accRole");
            if(role) role.style.display = "none";
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
    if(show) updateAccountMenu(auth && auth.currentUser);
}

function hideAccountMenu(){
    const m = document.getElementById("accountMenu");
    if(m) m.style.display = "none";
}

function updateAccountMenu(user){
    const menu = document.getElementById("accountMenu");
    if(!menu) return;
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
    }else{
        html += '<div class="acc-row"><button class="acc-small" onclick="showBindEmail()">绑定邮箱</button></div>';
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
    const isSignup = t.getAttribute("data-mode") === "signup";
    t.setAttribute("data-mode", isSignup ? "login" : "signup");
    t.textContent = isSignup ? "没有账号?注册" : "已有账号?登录";
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
