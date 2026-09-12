# -*- coding: utf-8 -*-
# v8.25 修毛毛报的「图鉴里的成就和天气点不动」
#   根因：v8.18 加了「🌤 天气」页签、v8.21 加了「🏆 成就」页签，但**两次都忘了绑点击事件**
#   （bookRenderTabs() 只负责高亮样式，真正的绑定在初始化那段 on('bookTabXxx', ...) 里）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
old = """  on('bookTabInfo', function(){ bookTab = 'info'; bookRender(); SFX.bookTab(); });"""
new = """  on('bookTabInfo', function(){ bookTab = 'info'; bookRender(); SFX.bookTab(); });
  /* v8.25 补：v8.18 的「🌤 天气」与 v8.21 的「🏆 成就」两个页签当时忘了绑点击 →
     点上去毫无反应（毛毛报的 bug）。以后新增图鉴页签，除了 bookRenderTabs 的 ids 表和
     bookRender 的分支，**必须在这里补一行绑定** —— test/deep45_uiwiring.js 会自动查这件事。 */
  on('bookTabWx', function(){ bookTab = 'wx'; bookRender(); SFX.bookTab(); });
  on('bookTabAch', function(){ bookTab = 'ach'; bookRender(); SFX.bookTab(); });"""
assert s.count(old)==1, s.count(old)
io.open(p,'w',encoding='utf-8').write(s.replace(old,new))
print('OK 两个页签的点击绑定已补上')
