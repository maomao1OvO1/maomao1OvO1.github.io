# -*- coding: utf-8 -*-
# v8.18 (2) 音乐循环改「双声道交叉淡化」，消掉循环接缝
import io, re
p='game.html'; s=io.open(p,encoding='utf-8').read()
def rep(old,new,label,cnt=1):
    global s
    assert s.count(old)==cnt, (label, s.count(old))
    s=s.replace(old,new); print('OK',label)

# ---------- 1. HTML：加第二个播放声道（交叉淡化用）----------
rep('<audio id="bgm" loop preload="auto" src="music/bgm.ogg" style="display:none"></audio>',
    '<audio id="bgm" loop preload="auto" src="music/bgm.ogg" style="display:none"></audio>\n'
    '<!-- v8.18 交叉淡化第二声道：平时 preload=none 不占内存，首次播放成功后再预热 -->\n'
    '<audio id="bgm2" loop preload="none" src="music/bgm.ogg" style="display:none"></audio>',
    '新增第二播放声道')

# ---------- 2. 重写 BGM 播放内核 ----------
old_head = "var bgmEl = null, bgmOK = false, bgmTried = false;"
new_head = '''/* ===== v8.18 音乐循环交叉淡化 =====
   毛毛：「那个音乐循环能不能自然一点」→ 原来 <audio loop> 播到曲尾直接跳回开头，
   接缝处听得出「一顿」。改成**双声道交叉淡化**：
   还剩 BGM_XF 秒时让第二个声道从 0 音量渐入、同时把当前声道渐出，
   淡完再交换主从 —— 循环点被叠在一起，听不出接缝。
   两层保险：①两个 <audio> 都保留 loop，万一交叉淡化没跑起来（例如拿不到 duration），
   浏览器仍会像以前一样原生循环，绝不会静音；②新声道的 play() 失败时直接放弃本次淡化。 */
var bgmOK = false;
var BGM_XF = 1.0;                 /* 交叉淡化时长（秒） */
var bgmDeck = [null, null];       /* 两个播放声道 */
var bgmCur = 0;                   /* 当前主声道下标 */
var bgmVol = 0.42;                /* 目标音量（bgmAdapt / bgmSetVol 写入） */
var bgmRate = 1;                  /* 目标速率（bgmAdapt 写入） */
var bgmFade = 0, bgmFadeDur = BGM_XF;   /* 淡化剩余秒数 / 本次淡化总时长 */
var bgmWarm = false;              /* 第二声道是否已预热 */
function bgmDeckEl(i){
  i = i | 0;
  if (!bgmDeck[i]){
    var el = document.getElementById(i === 0 ? 'bgm' : 'bgm2');
    if (!el) return null;
    bgmDeck[i] = el;
    if (!el.__bgmHooked){
      el.__bgmHooked = true;
      el.addEventListener('playing', function(){
        if (bgmDeckEl(bgmCur) === el){ bgmOK = true; bgmWarmUp(); }
      });
      el.addEventListener('error', function(){ if (bgmDeckEl(bgmCur) === el) bgmOK = false; });
      /* 兜底：真播到曲尾还没轮到淡出（比如拿不到 duration）→ 立刻从头接上，不让音乐停 */
      el.addEventListener('ended', function(){
        if (bgmDeckEl(bgmCur) !== el) return;
        try {
          el.currentTime = 0; el.volume = bgmVol;
          var p0 = el.play(); if (p0 && p0.catch) p0.catch(function(){});
        } catch (e) {}
      });
    }
  }
  return bgmDeck[i];
}
/* 第一声道确认能响之后再预热第二声道（避免「打不开音频」的设备白占内存） */
function bgmWarmUp(){
  if (bgmWarm) return;
  var el = bgmDeckEl(1); if (!el) return;
  bgmWarm = true;
  try { el.preload = 'auto'; if (el.load) el.load(); } catch (e) {}
}
function bgmSetVol(v){
  bgmVol = Math.max(0, Math.min(1, Number(v) || 0));
  if (bgmFade > 0) return;                  /* 淡化中：音量交给淡化曲线，别互相打架 */
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i); if (!e) continue;
    try { e.volume = (i === bgmCur) ? bgmVol : 0; } catch (er) {}
  }
}
function bgmSetRate(r){
  bgmRate = r;
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i); if (!e) continue;
    try { e.playbackRate = r; } catch (er) {}
  }
}
/* 每帧推进交叉淡化：曲尾前 BGM_XF 秒起淡，淡完交换主从 */
function bgmXfadeTick(rawDt){
  var cur = bgmDeckEl(bgmCur), nx = bgmDeckEl(1 - bgmCur);
  if (!cur || !nx) return;
  if (!MUSIC_ON){ if (bgmFade > 0) bgmFade = 0; return; }
  if (bgmFade > 0){
    bgmFade -= rawDt;
    var t = 1 - Math.max(0, bgmFade) / bgmFadeDur;      /* 0 → 1 */
    if (t > 1) t = 1;
    try { cur.volume = bgmVol * (1 - t); nx.volume = bgmVol * t; } catch (e) {}
    if (bgmFade <= 0){
      bgmFade = 0;
      try { cur.pause(); cur.currentTime = 0; cur.volume = 0; } catch (e) {}
      bgmCur = 1 - bgmCur;                              /* 新声道正式接班，音乐没断 */
      bgmOK = true;
      try { nx.volume = bgmVol; } catch (e) {}
    }
    return;
  }
  if (!bgmOK || !running || cur.paused) return;
  var d = 0;
  try { d = cur.duration; } catch (e) {}
  if (!d || !isFinite(d) || d <= 0) return;
  var left = d - (cur.currentTime || 0);
  if (left > 0 && left <= BGM_XF){
    bgmFadeDur = Math.min(BGM_XF, left);
    bgmFade = bgmFadeDur;
    try {
      nx.currentTime = 0; nx.volume = 0; nx.playbackRate = bgmRate;
      var p1 = nx.play(); if (p1 && p1.catch) p1.catch(function(){});   /* 失败就放弃本次淡化，原生 loop 兜底 */
    } catch (e) { bgmFade = 0; }
  }
}'''
rep(old_head, new_head, 'BGM 内核重写（双声道）')

# ---------- 3. bgmPlay / bgmPause / bgmAdapt 改成走新内核 ----------
rep('''function bgmNode(){
  if (!bgmEl) bgmEl = document.getElementById('bgm');
  return bgmEl;
}
function bgmPlay(){
  if (!MUSIC_ON) return;
  var el = bgmNode();
  if (!el) return;
  if (!bgmTried){
    bgmTried = true;
    el.addEventListener('error', function(){ bgmOK = false; });      // 加载失败 → 回退合成乐
    el.addEventListener('playing', function(){ bgmOK = true; });     // 真的响了才算可用
  }
  try {
    el.volume = 0.42;
    var p = el.play();
    if (p && p.catch) p.catch(function(){ bgmOK = false; });
  } catch (e) { bgmOK = false; }
}
function bgmPause(){
  var el = bgmNode();
  if (el){ try { el.pause(); } catch (e) {} }
}''',
'''function bgmPlay(){
  if (!MUSIC_ON) return;
  var el = bgmDeckEl(bgmCur);
  if (!el) return;
  try {
    el.volume = bgmVol;
    try { el.playbackRate = bgmRate; } catch (er) {}
    var p = el.play();
    if (p && p.catch) p.catch(function(){ bgmOK = false; });
  } catch (e) { bgmOK = false; }
}
function bgmPause(){
  bgmFade = 0;                       /* 停就停干净：别把淡化状态留到下次播放 */
  for (var i = 0; i < 2; i++){
    var e = bgmDeckEl(i);
    if (e){ try { e.pause(); } catch (er) {} }
  }
}''',
    'bgmPlay / bgmPause 走新内核')

rep('''function bgmAdapt(){
  var el = bgmNode();
  if (!el) return;
  var rate = 1 + Math.min(0.10, Math.max(0, wave - 1) * 0.006);
  if (hp <= 6) rate += 0.04;
  if (rate > 1.14) rate = 1.14;
  try { el.playbackRate = rate; } catch (e) {}
  var vol = 0.42;
  if (wave % 10 === 0) vol = 0.50;      // BOSS 波：抬一点，气势更足
  if (hp <= 6) vol = 0.36;              // 残血：压低，留出心跳点缀
  bgmSetVol(vol);
}''',
'''function bgmAdapt(){
  var rate = 1 + Math.min(0.10, Math.max(0, wave - 1) * 0.006);
  if (hp <= 6) rate += 0.04;
  if (rate > 1.14) rate = 1.14;
  bgmSetRate(rate);
  var vol = 0.42;
  if (wave % 10 === 0) vol = 0.50;      // BOSS 波：抬一点，气势更足
  if (hp <= 6) vol = 0.36;              // 残血：压低，留出心跳点缀
  bgmSetVol(vol);
}''',
    'bgmAdapt 走新内核')

# 旧的 bgmSetVol 定义删掉（新版已在上面定义）
rep('''function bgmSetVol(v){
  var el = bgmNode();
  if (el){ try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) {} }
}
''', '', '删除旧的 bgmSetVol')

# ---------- 4. 每帧推进淡化 ----------
rep('''function musicTick(rawDt){
  if (bgmOK){''',
    '''function musicTick(rawDt){
  bgmXfadeTick(rawDt);            /* v8.18：真人 BGM 的循环交叉淡化（每帧推进，与合成乐无关） */
  if (bgmOK){''',
    'musicTick 每帧推进淡化')

assert 'bgmNode' not in s and 'bgmEl' not in s and 'bgmTried' not in s, '还残留旧 BGM 变量'
io.open(p,'w',encoding='utf-8').write(s)
print('v8.18b 音乐交叉淡化补丁完成')
