// ===== 登录系统（Firebase Auth：登录门流程 登录/游客 → 登录方式 → 进入主页） =====

let auth = null;

function isConfigReady(){
    return window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

function initFirebase(){
    if(!isConfigReady() || !firebase) return;
    firebase.initializeApp(window.FIREBASE_CONFIG);
    auth = firebase.auth();
    // 实时监听：登录成功后自动放行
    auth.onAuthStateChanged(function(user){
        if(user) showLoginState(user, true);
    });
}

// ===== 登录门 =====

function showLoginGate(){
    const g = document.getElementById("loginGate");
    if(!g) return;
    // 已登录或已选游客 → 直接放行
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

// ===== 登录方式 =====

function loginProvider(providerName){
    if(!auth){ alert("登录需先在 firebase-config.js 填入你的 Firebase 配置"); return; }
    let p = providerName === "google"
        ? new firebase.auth.GoogleAuthProvider()
        : new firebase.auth.GithubAuthProvider();
    firebase.auth().signInWithPopup(p)
    .then(function(){ /* onAuthStateChanged 处理放行 */ })
    .catch(function(err){ alert("登录失败：" + (err.message || err)); });
}

function emailLogin(email, pass, isSignup){
    if(!auth){ alert("登录需先在 firebase-config.js 填入你的 Firebase 配置"); return; }
    const f = isSignup
        ? firebase.auth().createUserWithEmailAndPassword(email, pass)
        : firebase.auth().signInWithEmailAndPassword(email, pass);
    f.then(function(){ /* onAuthStateChanged 处理放行 */ })
     .catch(function(err){ alert("邮箱登录失败：" + (err.message || err)); });
}

// ===== 登录状态 → 显示用户 + 放行 =====

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

function showUserBox(name, photo){
    const box = document.getElementById("userBox");
    if(!box) return;
    box.style.display = "flex";
    const n = document.getElementById("userName");
    if(n) n.textContent = name;
    const img = document.getElementById("userPhoto");
    if(img && photo) img.src = photo;
}

function logout(){
    if(auth) auth.signOut();
    localStorage.removeItem("authUser");
    localStorage.removeItem("guestMode");
    const box = document.getElementById("userBox");
    if(box) box.style.display = "none";
    showLoginGate();
}

function toggleEmailMode(){
    const t = document.getElementById("emailMode");
    if(!t) return;
    const isSignup = t.getAttribute("data-mode") === "signup";
    t.setAttribute("data-mode", isSignup ? "login" : "signup");
    t.textContent = isSignup ? "没有账号?注册" : "已有账号?登录";
}

document.addEventListener("DOMContentLoaded", function(){
    initFirebase();
    // 若已有登录/游客状态,按需显示
    if(auth && auth.currentUser){ showLoginState(auth.currentUser, true); }
});
