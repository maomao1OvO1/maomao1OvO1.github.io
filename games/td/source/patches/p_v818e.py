# -*- coding: utf-8 -*-
# v8.18 收口：信息栏的默认值判定抽成函数 + 兼容测试桩（无 setAttribute 的极简 DOM）
import io
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

rep('''function sideIsDefault(v, def){ return def === 0 ? (v === 0) : (Math.abs(v - 1) < 1e-9); }''',
'''/* 某一行是不是「没吃到加成」的默认值（乘区默认 1、加法区默认 0）—— 用来决定是否置灰/隐藏 */
function sideDefOf(row){ return (row.d === undefined) ? 1 : row.d; }
function sideIsDefault(v, def){ return (def === 0) ? (v === 0) : (Math.abs(v - 1) < 1e-9); }''',
    '默认值判定抽函数')

rep('''    h += sideRow(r.n, sideFmt(v, r.f), sideIsDefault(v, r.d || r.d === 0 ? r.d : 1) ? 'dim' : '');''',
    '''    h += sideRow(r.n, sideFmt(v, r.f), sideIsDefault(v, sideDefOf(r)) ? 'dim' : '');''',
    'SIDE_MAIN 默认值写法')

rep('''    if (v2 === undefined || sideIsDefault(v2, r2.d || r2.d === 0 ? r2.d : 1)) continue;   /* 没吃到就不列，保持干净 */''',
    '''    if (v2 === undefined || sideIsDefault(v2, sideDefOf(r2))) continue;   /* 没吃到就不列，保持干净 */''',
    'SIDE_EXTRA 默认值写法')

# 测试桩兼容：极简 DOM 没有 setAttribute / classList 也未必齐全
rep('''  win.setAttribute('data-open', sideOpen ? '1' : '0');''',
    '''  try { win.dataset.open = sideOpen ? '1' : '0'; } catch (e) {}      /* dataset 在真实 DOM 里会同步 data-open 属性 */''',
    'setAttribute 改 dataset')

rep('''    ch.innerHTML = chipDefs[c].txt + badge;
    ch.classList[chipDefs[c].n > 0 ? 'remove' : 'add']('dim');''',
    '''    ch.innerHTML = chipDefs[c].txt + badge;
    try { ch.classList[chipDefs[c].n > 0 ? 'remove' : 'add']('dim'); } catch (e) {}''',
    'classList 保护')

io.open(p,'w',encoding='utf-8').write(s)
print('v8.18e 收口完成')
