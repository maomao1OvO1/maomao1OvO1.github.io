# -*- coding: utf-8 -*-
# v8.18 收口2：把「新手教学」放回图标网格（保持在 #bookBtn 之前）+ 顺手修 deep39 那条写错的断言
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

rep('''      <button class="btn pink" id="homeDailyBtn"><span class="ti">\U0001F4C5</span><span>\u6bcf\u65e5\u6311\u6218</span></button>
      <button class="btn" id="bookBtn" style="background:rgba(40,60,100,.85)"><span class="ti">\U0001F4D6</span><span>\u56fe\u9274</span></button>
      <button class="btn" id="setBtn1" style="background:rgba(40,60,100,.85)"><span class="ti">\u2699</span><span>\u8bbe\u7f6e</span></button>
      <button class="btn" id="helpBtn" style="background:rgba(40,60,100,.85)"><span class="ti">\u2753</span><span>\u73a9\u6cd5</span></button>
    </div>
    <!-- TUTORIAL_PATCH_V1\uff1a\u65b0\u624b\u6559\u5b66\u5165\u53e3\uff08\u4ec5\u9996\u9875\uff0c\u4e0d\u8fdb\u9009\u5173\u9875 \u2192 \u9009\u5173\u5217\u8868\u4ecd\u4e3a 15 \u5173 + \u65e0\u5c3d + \u6bcf\u65e5\uff09-->
    <div class="home-menu2">
      <button class="btn" id="tutBtn" style="background:rgba(40,60,100,.85)">\U0001F393 \u65b0\u624b\u6559\u5b66</button>''',
'''      <button class="btn pink" id="homeDailyBtn"><span class="ti">\U0001F4C5</span><span>\u6bcf\u65e5\u6311\u6218</span></button>
      <!-- TUTORIAL_PATCH_V1\uff1a\u65b0\u624b\u6559\u5b66\u5165\u53e3\uff08\u4ec5\u9996\u9875\uff0c\u4e0d\u8fdb\u9009\u5173\u9875 \u2192 \u9009\u5173\u5217\u8868\u4ecd\u4e3a 15 \u5173 + \u65e0\u5c3d + \u6bcf\u65e5\uff09-->
      <button class="btn" id="tutBtn" style="background:rgba(40,60,100,.85)"><span class="ti">\U0001F393</span><span>\u6559\u5b66</span></button>
      <button class="btn" id="bookBtn" style="background:rgba(40,60,100,.85)"><span class="ti">\U0001F4D6</span><span>\u56fe\u9274</span></button>
      <button class="btn" id="setBtn1" style="background:rgba(40,60,100,.85)"><span class="ti">\u2699</span><span>\u8bbe\u7f6e</span></button>
    </div>
    <div class="home-menu2">
      <button class="btn" id="helpBtn" style="background:rgba(40,60,100,.85)">\u2753 \u73a9\u6cd5</button>''',
    '网格内调整教学入口位置')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.18f 首页入口顺序完成')

q='test/deep39_reso.js'; t=io.open(q,encoding='utf-8').read()
old = """ok(code.indexOf('data-reso-group="' + "'two'" + '"') >= 0 && code.indexOf("'three'") >= 0 && code.indexOf("'four'") >= 0,
   '\u56fe\u9274\u6709 4 \u4e2a\u53ef\u6298\u53e0\u5206\u7ec4\uff08\u7279\u6b8a / \u4e24\u4e24 / \u4e09\u5143\u7d20 / \u56db\u5143\u7d20\uff09');"""
new = """/* v8.18 \u4fee\uff1a\u539f\u65ad\u8a00\u5199\u9519\u4e86\uff08\u7528\u4e86\u522b\u7684\u811a\u672c\u91cc\u7684\u53d8\u91cf code\uff0c\u5e76\u4e14\u628a\u5f15\u53f7\u62fc\u8fdb\u4e86\u641c\u7d22\u4e32 \u2192
   \u5b9e\u9645\u5728\u627e data-reso-group="'two'" \u8fd9\u79cd\u4e0d\u5b58\u5728\u7684\u6587\u672c\uff09\u3002\u6539\u6210\u76f4\u63a5\u67e5**\u6e32\u67d3\u51fa\u6765\u7684\u56fe\u9274 DOM**\uff0c
   \u6bd4\u67e5\u6e90\u7801\u66f4\u8d34\u8fd1\u771f\u5b9e\u884c\u4e3a\u3002 */
var _grp = String(R.el('bookList')._html || '');
var _grpAll = ['special', 'two', 'three', 'four'].every(function(g){
  return _grp.indexOf('data-reso-group="' + g + '"') >= 0;
});
ok(_grpAll, '\u56fe\u9274\u6709 4 \u4e2a\u53ef\u6298\u53e0\u5206\u7ec4\uff08\u7279\u6b8a / \u4e24\u4e24 / \u4e09\u5143\u7d20 / \u56db\u5143\u7d20\uff09');"""
assert t.count(old)==1, t.count(old)
t = t.replace(old,new)
io.open(q,'w',encoding='utf-8').write(t)
print('OK deep39 断言修正')
