// firebase-config.js —— 你的 Firebase Web 配置
// 作用：把 Firebase 的 Web 配置挂到全局 window.FIREBASE_CONFIG，
//       供 login.js (Firebase Auth 登录) 等页面初始化时读取。
// ⚠️ 安全说明：这些是 Firebase Web 端的公开配置（网页直连 Firebase 必须内嵌），
//    不算密钥；真正的安全靠 Firebase 控制台的「安全规则」(Security Rules) 控制。
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCa7M7dFqDlilAtniesykU97PWb--S_EX8",        // Web API Key：识别项目用（公开值，无需保密）
    authDomain: "maomao-3c9ef.firebaseapp.com",               // 认证域名：登录重定向/邮箱验证邮件显示用
    projectId: "maomao-3c9ef",                                // Firebase 项目 ID（数据路径、规则都挂它下面）
    storageBucket: "maomao-3c9ef.firebasestorage.app",        // 云存储桶：存头像/图片等（本站在用可改）
    messagingSenderId: "596625948370",                        // 消息发送者 ID（FCM 推送用）
    appId: "1:596625948370:web:d0ee0538dfd67b99a2b70b",       // Web 应用实例 ID：Firebase 初始化必填项
    measurementId: "G-5VKVDR13E3"                             // Google Analytics 测量 ID（埋点统计用）
};
