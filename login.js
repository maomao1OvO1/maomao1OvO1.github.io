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
        if(user) showLoginState(user, true);
    });
}

// ===================== 登录门 =====================

function showLoginGate(){
    const g = document.getElementById("loginGate");
    if(!g) return;
    if(localStorage.getItem("guestMode")){ g.style.display = "none"; return; }
    if(localStorage.getItem("authUser")){
        g.style.display = "none";
        const u = JSON.parse(localStorage.getItem("authUser"));
        showUserBox(u.name, u.photo);
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
    showUserBox("游客", "");
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

function showLoginState(user, loggedIn){
    if(loggedIn && user){
        const name = user.displayName || user.email;
        const photo = user.photoURL || "";
        localStorage.setItem("authUser", JSON.stringify({name: name, email: user.email, photo: photo}));
        localStorage.removeItem("guestMode");
        showUserBox(name, photo);
    }
    hideLoginGate();
}

// ===================== 账号按钮 + 菜单 =====================

function showUserBox(name, photo){
    const btn = document.getElementById("accountBtn");
    if(!btn) return;
    btn.style.display = "inline-flex";
    const n = document.getElementById("accName");
    if(n) n.textContent = name;
    const img = document.getElementById("accPhoto");
    if(img && photo) img.src = photo;
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
        if(list) list.innerHTML = "游客暂未关联任何登录方式";
        return;
    }
    if(nameEl) nameEl.textContent = user.displayName || user.email || "用户";
    if(emEl) emEl.textContent = user.email || "";
    if(photoEl && user.photoURL) photoEl.src = user.photoURL;

    const linked = {};
    (user.providerData || []).forEach(function(p){ linked[p.providerId] = true; });
    let html = "";
    html += linked["google.com"]
        ? '<span class="acc-badge">Google ✓</span>'
        : '<button class="acc-small" onclick="bindProvider(\'google\')">绑定 Google</button>';
    html += linked["github.com"]
        ? '<span class="acc-badge">GitHub ✓</span>'
        : '<button class="acc-small" onclick="bindProvider(\'github\')">绑定 GitHub</button>';
    html += linked["password"]
        ? '<span class="acc-badge">邮箱 ✓</span>'
        : '<button class="acc-small" onclick="showBindEmail()">绑定邮箱</button>';
    if(list) list.innerHTML = html;
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
    initFirebase();
    if(auth && auth.currentUser){ showLoginState(auth.currentUser, true); }
});
