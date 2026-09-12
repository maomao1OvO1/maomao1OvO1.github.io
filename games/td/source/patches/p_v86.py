# -*- coding: utf-8 -*-
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ========== A. 技能按关卡逐个解锁 + 用法说明 ==========
rep("""var skillMode = null;                       /* 正在等待选目标：'mark' | 'overload' | null */""",
"""/* 技能解锁进度：第几关开始有这个技能（毛毛要求「每关增加一个，到后期才全部有」）
   无尽模式视为「后期」→ 4 个技能全开 */
var SKILL_UNLOCK = { freeze:1, mark:3, overload:6, repair:10 };
function skillUnlockLv(key){ return SKILL_UNLOCK[key] || 1; }
function skillUnlockedAt(key, levelIdx){
  if (endless) return true;
  return (levelIdx + 1) >= skillUnlockLv(key);
}
function skillUnlocked(key){ return skillUnlockedAt(key, lvIndex | 0); }
var skillMode = null;                       /* 正在等待选目标：'mark' | 'overload' | null */""", '技能解锁表')

rep("""    if (!sk || sk.t > 0) return;
  if (sk.need !== 'none'){""",
"""    if (!sk || sk.t > 0) return;
  if (!skillUnlocked(key)){ showTip(sk.icon + ' ' + sk.name + ' 还没解锁：第 ' + skillUnlockLv(key) + ' 关开始可用'); return; }
  if (sk.need !== 'none'){""", '未解锁提示', cnt=0)
io.open(p,'w',encoding='utf-8').write(s)
print('阶段 A-1 完成')
