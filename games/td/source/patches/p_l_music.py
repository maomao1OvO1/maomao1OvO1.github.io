#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# v6.4 背景音乐（纯合成）+ 倍速下音效节流
import io, sys
P = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.dsharnessmobile.shell/files/home/tmp/td/game.html'
s = io.open(P, encoding='utf-8').read()
def sub(old, new, tag):
    global s
    if s.count(old) != 1:
        print('❌ [%s] 命中 %d 次，未写入' % (tag, s.count(old))); sys.exit(1)
    s = s.replace(old, new); print('  [OK]', tag)

# ① tone() 支持音乐通道（音乐有独立开关，不受「音效」开关影响）
sub("""function tone(o){
  if (!SFX_ON) return;""",
"""function tone(o){
  if (!SFX_ON && !o.music) return;      // 音乐走 music 标志，与「音效」开关互不影响""", 'tone 音乐通道')

# ② 音效总开关 + 音乐开关 + 每帧音效预算（倍速防爆音）
sub("var SFX_ON = true;   // 音效总开关（设置面板可关；持久化到 td_settings）",
"""var SFX_ON = true;    // 音效总开关（设置面板可关；持久化到 td_settings）
var MUSIC_ON = true;  // 背景音乐开关（独立于音效）
var sfxBudget = 10;   // 每帧允许播放的音效数量：倍速越高给得越少，
                      // 否则 100x 时一帧内几十个子步同时开火 → 音效叠在一起爆响""", '音乐/预算变量')

# ③ 背景音乐引擎（插在 enemyDie 之后）
sub("""var SFX = {""",
"""/* ===== v6.4 背景音乐：纯 Web Audio 合成（无素材），4 小节循环 Am-F-C-G + 动态变化 ===== */
var MUSIC = { t: 0, beat: 0, bpm: 92 };
var M_CHORDS = [
  [220.00, 261.63, 329.63],   // Am
  [174.61, 220.00, 261.63],   // F
  [196.00, 246.94, 329.63],   // C
  [196.00, 246.94, 293.66]    // G
];
var M_BASS = [110.00, 87.31, 98.00, 98.00];
function musicTick(rawDt){
  if (!AC || !MUSIC_ON) return;
  if (!running || paused || menuPause) return;      // 暂停 / 开面板时安静（不推进节拍）
  var bpm = 92 + Math.min(22, wave * 1.2);          // 波次越高越急
  if (hp <= 6) bpm += 10;                           // 残血：紧张
  MUSIC.bpm = bpm;
  var spb = 60 / bpm;
  MUSIC.t += rawDt;                                 // 用真实时间 → 倍速下音乐不跟着发疯
  var guard = 0;
  while (MUSIC.t >= spb && guard++ < 8){
    MUSIC.t -= spb;
    var b = MUSIC.beat, inBar = b % 4, bar = Math.floor(b / 4) % 4;
    if (inBar === 0){                               // 小节头：和弦 + 低音 + 底鼓
      var ch = M_CHORDS[bar], i;
      for (i = 0; i < ch.length; i++) tone({ freq: ch[i], dur: 1.4, vol: 0.016, type: 'triangle', delay: i * 0.025, music: true });
      tone({ freq: M_BASS[bar], freq2: M_BASS[bar] * 0.98, dur: 0.7, vol: 0.040, type: 'sine', music: true });
      tone({ freq: 62, freq2: 42, dur: 0.16, vol: 0.030, type: 'sine', music: true });
    } else if (inBar === 2){                        // 第 3 拍：五度低音 + 轻镲
      tone({ freq: M_BASS[bar] * 1.5, dur: 0.35, vol: 0.024, type: 'sine', music: true });
      tone({ freq: 6200, dur: 0.035, vol: 0.005, type: 'triangle', music: true });
    } else {                                        // 其余拍：轻镲
      tone({ freq: 7000, dur: 0.03, vol: 0.004, type: 'triangle', music: true });
    }
    if (wave % 10 === 0 && inBar === 0) tone({ freq: 44, freq2: 30, dur: 0.6, vol: 0.045, type: 'sine', music: true });
    if (hp <= 6 && inBar % 2 === 1) tone({ freq: 1500, dur: 0.04, vol: 0.010, type: 'square', music: true });
    if (comboCount >= 10 && inBar === 3) tone({ freq: 300 + comboCount * 5, dur: 0.06, vol: 0.012, type: 'square', music: true });
    MUSIC.beat = (b + 1) % 16;                      // 4 小节 × 4 拍
  }
}
var SFX = {""", '音乐引擎')

# ④ 用音乐替换原来的「环境低音脉冲」
sub("""  // 环境低音脉冲（有节奏感）
  if (running && !paused && AC){
    bgmT = (bgmT || 0) + dt;
    var beat = 0.62 - Math.min(0.24, wave * 0.012);      // 波次越高，鼓点越急
    if (hp <= 6) beat *= 0.82;                            // 残血：心跳加快
    if (bgmT >= beat){
      bgmT = 0;
      var base = 62 + (wave % 5) * 4;
      tone({ freq: base, freq2: base * 0.75, dur: 0.26, vol: 0.035, type:'sine' });
      tone({ freq: base * 2, dur: 0.1, vol: 0.012, type:'triangle' });
      if (wave % 10 === 0) tone({ freq: 44, freq2: 30, dur: 0.5, vol: 0.05, type:'sine' });   // BOSS 波：低沉鼓
      if (hp <= 6) tone({ freq: 1400, dur: 0.05, vol: 0.012, type:'square' });                // 残血：心跳点缀
      if (comboCount >= 10) tone({ freq: 240 + comboCount * 6, dur: 0.07, vol: 0.014, type:'square' });  // 连杀：节奏点
    }
  }""",
"""  musicTick(raw);   // v6.4 背景音乐（真实时间驱动，不随倍速加速）""", '替换旧 BGM')

# ⑤ 每帧重置音效预算（倍速越高越少，防爆音）
sub("""  frameDt = dt;   // 真实帧间隔交给 draw()：120Hz 屏上建造弹出/开炮闪光/出生弹出不再快一倍""",
"""  frameDt = dt;   // 真实帧间隔交给 draw()：120Hz 屏上建造弹出/开炮闪光/出生弹出不再快一倍
  /* 倍速越高，每帧允许的音效越少：100x 时一帧跑 20 子步，不限流会有几十个音效同时爆响 */
  sfxBudget = speedMul >= 20 ? 2 : (speedMul >= 5 ? 4 : 10);""", '每帧音效预算')

# ⑥ 开火音 / 阵亡音走预算
sub("""function towerShot(elem, x){
  var v = TOWER_VOICE[elem];
  if (!v) return;""",
"""function towerShot(elem, x){
  var v = TOWER_VOICE[elem];
  if (!v) return;
  if (sfxBudget <= 0) return;      // 倍速限流：超出本帧预算就静默
  sfxBudget--;""", '开火音限流')
sub("""function enemyDie(type, combo, x){
  var pan = panOf(x);""",
"""function enemyDie(type, combo, x){
  if (sfxBudget <= 0) return;      // 倍速限流
  sfxBudget--;
  var pan = panOf(x);""", '阵亡音限流')

# ⑦ 设置面板：音乐开关
sub("""  <button class="btn" id="setFxBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">✨ 画质：高</button>""",
"""  <button class="btn" id="setMusBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">🎵 音乐：开</button>
  <button class="btn" id="setFxBtn" style="margin-top:6px;padding:13px 30px;font-size:15px;background:rgba(40,60,100,.85)">✨ 画质：高</button>""", '设置面板音乐按钮')
sub("""    if (o && typeof o.fx === 'boolean') LOW_FX = o.fx;""",
"""    if (o && typeof o.fx === 'boolean') LOW_FX = o.fx;
    if (o && typeof o.mus === 'boolean') MUSIC_ON = o.mus;""", '读取音乐设置')
sub("""  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX })); } catch (e) {}""",
"""  try { localStorage.setItem('td_settings', JSON.stringify({ sfx: SFX_ON, fx: LOW_FX, mus: MUSIC_ON })); } catch (e) {}""", '保存音乐设置')
sub("""function toggleFx(){""",
"""function toggleMus(){
  MUSIC_ON = !MUSIC_ON;
  saveSettings();
  syncSetBtns();
  setMsg(MUSIC_ON ? '背景音乐已开启' : '背景音乐已关闭', '#7cf5c0');
  SFX.click();
}
function toggleFx(){""", 'toggleMus')
sub("""  var b = document.getElementById('setFxBtn');
  if (b) b.textContent = LOW_FX ? '🐢 画质：低（关光效）' : '✨ 画质：高（开光效）';""",
"""  var b = document.getElementById('setFxBtn');
  if (b) b.textContent = LOW_FX ? '🐢 画质：低（关光效）' : '✨ 画质：高（开光效）';
  var m = document.getElementById('setMusBtn');
  if (m) m.textContent = MUSIC_ON ? '🎵 音乐：开' : '🔕 音乐：关';""", '同步音乐按钮')
sub("""  on('setSfxBtn', toggleSfx);""",
"""  on('setSfxBtn', toggleSfx);
  on('setMusBtn', toggleMus);""", '绑定音乐按钮')
io.open(P, 'w', encoding='utf-8').write(s)
print('✅ p_l_music 完成')
