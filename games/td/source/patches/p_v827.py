# -*- coding: utf-8 -*-
# v8.27 毛毛的两点要求：
#   ① 存档码导入要能识别「带中文前缀的整段文本」（他直接粘贴分享原文会提示失败）
#   ② 分享文本里推广网站 + 感谢游玩（这段中文文案是可以编辑的）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ═══════ ① 导入容错：从整段文本里提取存档码 ═══════
rep('''function saveDecode(code){
  code = String(code || '').replace(/\\s+/g, '');
  var m = code.match(/^MTD1-([A-Za-z0-9_-]+)-([0-9a-f]{4})$/);
  if (!m) return null;''',
'''function saveDecode(code){
  code = String(code || '').replace(/\\s+/g, '');
  /* v8.27 修毛毛报的「直接粘贴分享原文会提示不可以」：
     分享出去的文本是「【共鸣之塔】我的存档码（…）：\\nMTD1-xxx-xxxx」——
     带了中文前后缀。原来这里用 ^...$ 强制整串匹配 → 一带中文就判定格式错误。
     现在改成**从整段文本里把码抠出来**（去掉 ^ 和 $），玩家直接整段复制粘贴也能导入。
     注意仍要求校验和正确：粘贴残缺/被改过的码照样会被拒绝。 */
  var m = code.match(/MTD1-([A-Za-z0-9_-]+)-([0-9a-f]{4})/);
  if (!m) return null;''',
    'saveDecode 支持带前后缀的整段文本')

# 顺便让「格式不对」的提示更明确
rep("""  if (!d || !d.p) return '格式不对：请确认完整复制了整段存档码';""",
    """  if (!d || !d.p) return '没找到有效的存档码：整段复制（含前后文字也行）再试一次';""",
    '导入失败提示更友好')

# ═══════ ② 分享文案：推广网站 + 感谢游玩 ═══════
rep("""    var txt = '【共鸣之塔】我的存档码（在游戏里 设置 → 存档分享 → 粘贴导入）：\\n' + code;""",
"""    /* v8.27 毛毛要求：分享文本里推广自己的网站 + 感谢游玩。
       这段文案就是分享出去的那段中文，改这里即可。 */
    var txt = '🎮 我在玩《共鸣之塔》—— 我做的原创塔防小游戏（元素共鸣机制，15 关 + 无尽 + 每日挑战）\\n'
      + '这是存档码，在游戏里「设置 → 存档分享 → 粘贴导入」就能直接用：\\n'
      + code + '\\n\\n'
      + '🕹 更多自制小游戏 / 我的网站：https://maomao1ovo1.github.io/\\n'
      + '感谢游玩！游戏完全开源（MIT），随便改、随便玩 😄';""",
    '分享文案：加网站推广与感谢')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.27 已写入')
