# -*- coding: utf-8 -*-
# v8.19 修复毛毛报的 bug：点「无尽模式」却先弹「第 1 关」的关卡开幕提示
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ---------- 1. 新增「无尽专属开场」 ----------
INTRO = u'''
/* ===== v8.19 无尽模式的专属开场 =====
   毛毛报的 bug：「点无尽模式进去是有一个第 1 关的提示，点开始游戏才是无尽模式」。
   根因：startEndless() 内部调 startLevel(0)（借用第 1 关的地图），而 startLevel 末尾**无条件**
   调 showLevelIntro(0) → 弹出来的就是「第 1 关 · 直廊」的模板（第 1 关的波数、金币、新敌人）。
   无尽本来就不是「第 1 关」，而且它有一大堆普通关卡没有的机制（契约/商店/维护费/盗金贼/双BOSS/转生），
   原样借用第 1 关的模板等于一句都没告诉玩家。
   修法：按模式分派弹层 —— 普通关卡走 showLevelIntro、无尽走这个 showEndlessIntro。
   注意：下面写的数值全部与代码同源，改动时请同步核对（契约 wave%5、维护费 lvSum*3、
   盗金贼 thief:12、双 BOSS 每 20 波、转生 50 波起每 10 波 1 星核、血上限每 10 波 +5 封顶 50）。 */
function showEndlessIntro(){
  if (typeof NO_INTRO !== 'undefined' && NO_INTRO){ running = true; paused = false; return; }
  document.getElementById('introTitle').textContent = '\u267e \u65e0\u5c3d\u6a21\u5f0f';
  document.getElementById('introSub').textContent = '\u6ce2\u6b21\u65e0\u4e0a\u9650 \u00b7 \u6253\u5f97\u8d8a\u8fdc\u8d8a\u786c \u00b7 \u6ca1\u6709\u7ec8\u70b9';
  var rows = [
    ['\U0001F324', '\u5929\u6c14\u6bcf 3 \u6ce2\u4e00\u6362', '\u7b2c 4 \u6ce2\u8d77\u5207\u6362\uff0c\u63d0\u524d\u4e00\u6ce2\u5728\u9876\u90e8\u9884\u544a\u680f\u63d0\u793a \u2014\u2014 \u70b9 HUD \u5929\u6c14\u6846\u53ef\u770b\u5168\u90e8\u8bf4\u660e'],
    ['\U0001F4DC', '\u65e0\u5c3d\u5951\u7ea6\uff08\u6bcf 5 \u6ce2\u5fc5\u9009\uff09', '\u4ee3\u4ef7\u6362\u6536\u76ca\uff0c\u9009\u5b8c\u7d2f\u79ef\u751f\u6548 \u2014\u2014 \u6bd4\u5982\u300c\u654c\u8840 +25%\uff0f\u6211\u91d1\u5e01 +30%\u300d'],
    ['\U0001F6D2', '\u6ce2\u95f4\u5546\u5e97', '\u5f3a\u5316\u5361\u754c\u9762\u91cc\u53ef\u8fdb\uff1a10 \u79cd\u5546\u54c1\uff0c\u7269\u4ef7\u968f\u6ce2\u6b21\u4e0a\u6da8 \u2014\u2014 \u540e\u671f\u91d1\u5e01\u7ec8\u4e8e\u6709\u5730\u65b9\u82b1'],
    ['\U0001F479', '\u53cc BOSS\uff08\u6bcf 20 \u6ce2\uff09', '\u6bcf 10 \u6ce2\u4e00\u53ea\uff1b\u6bcf 20 \u6ce2\u4e24\u53ea\u540c\u65f6\u767b\u573a'],
    ['\U0001F4B0', '\u76d7\u91d1\u8d3c\uff08\u7b2c 12 \u6ce2\u8d77\uff09', '\u5077\u8d70\u7684\u91d1\u5e01\u53ea\u8981\u51fb\u6740\u5b83\u5c31\u8fde\u672c\u5e26\u5229\u5410\u56de\uff1b\u8dd1\u5230\u5e95\u5c31\u771f\u4e22\u4e86'],
    ['\U0001F527', '\u7ef4\u62a4\u8d39', '\u6bcf\u6ce2\u6309\u300c\u5854\u7b49\u7ea7\u603b\u548c \u00d7 3\u300d\u6263\u91d1\u5e01 \u2014\u2014 \u5230\u540e\u671f\u8981\u5728\u300c\u94fa\u5854\u6d77\u300d\u4e0e\u300c\u5347\u7cbe\u54c1\u300d\u4e4b\u95f4\u53d6\u820d'],
    ['\U0001F31F', '\u8f6c\u751f\uff08\u6491\u5230 50 \u6ce2\uff09', '\u6bcf 10 \u6ce2 = 1 \u661f\u6838 \u2192 \u6362\u6c38\u4e45\u5929\u8d4b\uff0c\u6bcf\u5c40\u5f00\u5c40\u81ea\u52a8\u751f\u6548']
  ];
  var h = '<div style="font-size:12.5px;font-weight:700;color:#ffd76a;margin:2px 0 6px;">\u65e0\u5c3d\u4e13\u5c5e\u673a\u5236\uff08\u666e\u901a\u5173\u5361\u6ca1\u6709\uff09</div>';
  for (var i = 0; i < rows.length; i++){
    h += '<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:10px;'
      + 'background:rgba(22,32,56,.8);border:1px solid rgba(255,200,110,.28);margin-bottom:5px;">'
      + '<span style="flex:0 0 auto;font-size:15px;">' + rows[i][0] + '</span>'
      + '<span style="flex:1;min-width:0;">'
      + '<b style="font-size:13px;color:#ffe6a8;">' + rows[i][1] + '</b>'
      + '<span class="udesc" style="display:block;font-size:11.5px;color:#c8d8ee;line-height:1.45;">' + rows[i][2] + '</span>'
      + '</span></div>';
  }
  h += '<div style="font-size:12.5px;font-weight:700;color:#8ff0ff;margin:9px 0 5px;">\u672c\u5c40\u4fbf\u5229</div>'
    + '<div style="font-size:11.5px;color:#c8d8ee;line-height:1.5;padding:6px 9px;border-radius:10px;'
    + 'background:rgba(20,40,64,.8);border:1px solid rgba(120,200,255,.28);">'
    + '\u26a1 4 \u4e2a\u4e3b\u52a8\u6280\u80fd<b>\u5168\u90e8\u89e3\u9501</b>\uff08\u65e0\u5c3d\u89c6\u4e3a\u540e\u671f\uff09\u3000'
    + '\u23e9 \u500d\u901f\u652f\u6301 1x/2x/5x/10x/100x</div>'
    + '<div class="udesc" style="font-size:11.5px;color:#9fc4f0;line-height:1.5;margin-top:6px;">'
    + '\U0001F4BE \u6bcf\u6ce2\u7ed3\u675f\u81ea\u52a8\u5b58\u6863\uff0c\u6682\u505c\u9762\u677f\u91cc\u300c\u4fdd\u5b58\u5e76\u9000\u51fa\u300d\u53ef\u968f\u65f6\u4e2d\u65ad\uff1b'
    + '\u2764 \u57fa\u5730\u8840\u4e0a\u9650\u6bcf 10 \u6ce2 +5\uff08\u5c01\u9876 50\uff09\uff0c\u6bcf 5 \u6ce2\u56de 2 \u8840\u3002</div>';
  document.getElementById('introBody').innerHTML = h;
  running = false; paused = true;
  document.getElementById('introOv').classList.remove('hidden');
}
'''
rep('''var SHOP_POOL = [''', INTRO.strip() + '\nvar SHOP_POOL = [', '新增 showEndlessIntro')

# ---------- 2. startLevel 支持「以无尽模式开局」并分流弹层 ----------
rep('''function startLevel(i){
  endless = false;                 // 普通关卡：关闭无尽模式标记''',
'''function startLevel(i, asEndless, noIntro){
  /* v8.19：asEndless = 以无尽模式开局（无尽借用地形时才不会弹「第 1 关」的开幕提示）；
     noIntro = 不弹开场（无尽续玩用 —— 玩家已经知道自己要接着打第 N 波了）。 */
  endless = !!asEndless;                // 普通关卡：关闭无尽模式标记''',
    'startLevel 支持无尽模式开局')

rep('''  showLevelIntro(i);                                  /* v8.4：关卡开幕提示（点「开始战斗」才真正开打） */''',
'''  /* v8.19：按模式分流 —— 无尽弹自己的开场，别再借用第 1 关的模板（毛毛报的 bug） */
  if (noIntro){ running = true; paused = false; }
  else if (endless) showEndlessIntro();
  else showLevelIntro(i);                             /* v8.4：关卡开幕提示（点「开始战斗」才真正开打） */''',
    'startLevel 分流开幕提示')

# ---------- 3. startEndless / resumeEndless 走新通道 ----------
rep('''function startEndless(){
  startLevel(0);
  endless = true;
  speedMul = 1; updateSpeedBtn();      // 无尽模式从 1x 起步，点按钮可切 2/5/10/100x''',
'''function startEndless(silent){
  startLevel(0, true, silent);         /* v8.19：以无尽模式开局 → 弹无尽自己的开场（原来弹「第 1 关」） */
  speedMul = 1; updateSpeedBtn();      // 无尽模式从 1x 起步，点按钮可切 2/5/10/100x''',
    'startEndless 走新通道')

rep('''  var sv = loadEndlessSave();
  if (!sv) return false;
  startEndless();''',
'''  var sv = loadEndlessSave();
  if (!sv) return false;
  startEndless(true);                  /* v8.19：续玩不弹开场 —— 直接接着打第 N 波 */''',
    'resumeEndless 不弹开场')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.19 无尽开场修复补丁完成')
