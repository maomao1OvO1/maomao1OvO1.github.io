/* 🎙️ 声库实验室 · 网页版 —— 主线程 UI（模板：games/tts.html，云端部分剔除）
 * 引擎/合成在 tts-worker.js（Web Worker），主线程专注：进度条、预计等待、预计剩余、预计完成时间
 * 音色（pitch）与音量（applyVolume）：与云端 tts.js 相同的采样处理（照搬，保证听感一致）
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var hintEl = $('hint'), textEl = $('text');
  var speedEl = $('speed'), volumeEl = $('volume'), pitchEl = $('pitch');
  var noiseEl = $('noise'), noiseWEl = $('noiseW'), silenceEl = $('silence');
  var goBtn = $('go'), dlBtn = $('dl');
  var progWrap = $('progWrap'), progBar = $('progBar'), progPct = $('progPct'), progTxt = $('progTxt');
  var etaEl = $('eta'), statusEl = $('status'), player = $('player'), fileInfo = $('fileinfo');
  var playerWrap = $('playerWrap');
  var lexTextEl = $('lexText'), lexSaveBtn = $('lexSave'), lexMsgEl = $('lexMsg');

  var worker = null, ready = false;
  var lastWav = null, curObjUrl = null;
  var syncing = false;
  var baseLex = null;   // 原始 lexicon.txt 文本（下载时保留）

  // ================= 模板同款：进度条平滑动画 + 状态显示 =================
  var dispW = 0, progTarget = 0, ANIM = null;
  function startAnim() {
    if (ANIM) clearInterval(ANIM);
    dispW = 0;
    ANIM = setInterval(function () {
      if (!isFinite(progTarget) || progTarget < 0) progTarget = 5;
      if (!isFinite(dispW) || dispW < 0) dispW = 0;
      if (progTarget >= 100) dispW = 100;
      else {
        var step = Math.max((progTarget - dispW) * 0.15, 0.5);
        dispW = Math.min(progTarget, dispW + step);
      }
      setProgW(dispW);
    }, 300);
  }
  function setProgW(v) {
    try {
      v = isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
      progBar.style.width = v + '%';
      progPct.textContent = Math.round(v) + '%';
    } catch (e) {}
  }
  function showProg(pct, txt) {
    progWrap.style.display = 'block';
    progTarget = pct;
    startAnim();
    progTxt.textContent = txt;
  }
  function hideProg() { progWrap.style.display = 'none'; }
  function setStatus(txt, cls) {
    statusEl.textContent = txt || '';
    statusEl.className = 'msg' + (cls ? ' ' + cls : '');
  }

  var WAIT_TMR = null;
  function startWaitTxt(label, note) {
    stopWaitTxt();
    var t0 = Date.now();
    WAIT_TMR = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      setStatus(label + '（已等待 ' + s + ' 秒' + (note ? '，' + note : '') + '）');
    }, 1000);
  }
  function stopWaitTxt() { if (WAIT_TMR) { clearInterval(WAIT_TMR); WAIT_TMR = null; } }

  function fmtSec(s) {
    s = Number(s);
    if (!isFinite(s) || s < 0) return '--';
    s = Math.round(s);
    return s >= 60 ? Math.floor(s / 60) + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒';
  }
  function fmtClock(sec) {
    var t = new Date(Date.now() + Math.max(0, sec) * 1000);
    return ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
  }

  function updateEta() {
    var n = textEl.value.trim().length;
    if (!n) { etaEl.textContent = '预计生成时间：—'; return; }
    var sec = Math.round(n * 0.08 / parseFloat(speedEl.value));
    etaEl.textContent = '预计生成时间：' + fmtSec(sec) + '（' + n + ' 字）';
  }
  textEl.addEventListener('input', updateEta);
  speedEl.addEventListener('input', updateEta);
  updateEta();

  // ================= 滑块显示（模板同款）=================
  function pitchLabel(v) {
    v = parseFloat(v);
    if (Math.abs(v - 1.0) < 0.03) return '原声';
    return v < 1 ? '低沉' + v.toFixed(2) + '×' : '清脆' + v.toFixed(2) + '×';
  }
  function bindRange(el, displayEl, fmt) {
    el.addEventListener('input', function () { displayEl.textContent = fmt(el.value); });
  }
  bindRange(speedEl, $('speedV'), function (v) { return parseFloat(v).toFixed(2) + '×'; });
  bindRange(volumeEl, $('volumeV'), function (v) { return parseFloat(v).toFixed(1) + '×'; });
  bindRange(pitchEl, $('pitchV'), pitchLabel);
  bindRange(noiseEl, $('noiseV'), function (v) { return String(Math.round(v * 100)); });
  bindRange(noiseWEl, $('noiseWV'), function (v) { return String(Math.round(v * 100)); });
  bindRange(silenceEl, $('silenceV'), function (v) { return String(Math.round(v * 100)); });
  $('pLow').addEventListener('click', function () { pitchEl.value = 0.85; pitchEl.dispatchEvent(new Event('input')); });
  $('pNor').addEventListener('click', function () {
    pitchEl.value = 1.0; pitchEl.dispatchEvent(new Event('input'));
    speedEl.value = 1.0; speedEl.dispatchEvent(new Event('input'));
    volumeEl.value = 4; volumeEl.dispatchEvent(new Event('input'));
    noiseEl.value = 0.8; noiseEl.dispatchEvent(new Event('input'));
    noiseWEl.value = 0.95; noiseWEl.dispatchEvent(new Event('input'));
    silenceEl.value = 0.2; silenceEl.dispatchEvent(new Event('input'));
  });
  $('pHigh').addEventListener('click', function () { pitchEl.value = 1.2; pitchEl.dispatchEvent(new Event('input')); });

  // ================= 音效设置自动保存（网页版：localStorage）=================
  var PREFS_KEYS = ['speed', 'volume', 'pitch', 'noise', 'noiseW', 'silence'];
  var prefTimer = null;
  function savePrefs() {
    if (prefTimer) { clearTimeout(prefTimer); }
    prefTimer = setTimeout(function () {
      var p = {};
      PREFS_KEYS.forEach(function (k) { p[k] = parseFloat(document.getElementById(k).value); });
      try { localStorage.setItem('ttsPrefs', JSON.stringify(p)); } catch (e) {}
    }, 800);
  }
  ['speed', 'volume', 'pitch', 'noise', 'noiseW', 'silence'].forEach(function (k) {
    document.getElementById(k).addEventListener('change', savePrefs);
  });
  (function applyPrefs() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem('ttsPrefs') || 'null'); } catch (e) {}
    if (!p) return;
    if (isFinite(p.speed)) speedEl.value = p.speed;
    if (isFinite(p.volume)) volumeEl.value = p.volume;
    if (isFinite(p.pitch)) pitchEl.value = p.pitch;
    if (isFinite(p.noise)) noiseEl.value = p.noise;
    if (isFinite(p.noiseW)) noiseWEl.value = p.noiseW;
    if (isFinite(p.silence)) silenceEl.value = p.silence;
    $('speedV').textContent = parseFloat(speedEl.value).toFixed(2) + '×';
    $('volumeV').textContent = parseFloat(volumeEl.value).toFixed(1) + '×';
    $('pitchV').textContent = pitchLabel(pitchEl.value);
    $('noiseV').textContent = String(Math.round(noiseEl.value * 100));
    $('noiseWV').textContent = String(Math.round(noiseWEl.value * 100));
    $('silenceV').textContent = String(Math.round(silenceEl.value * 100));
  })();

  // ================= Worker 通信 =================
  function workerSend(m, transfer) { if (worker) worker.postMessage(m, transfer || []); }

  var MODEL_BASE = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? './assets/' : './models/';
  var MODEL_FILES = [
    { name: 'model.onnx', parts: ['model.part1', 'model.part2'], size: 170429550 },
    { name: 'lexicon.txt', size: 6838024 },
    { name: 'tokens.txt', size: 655 },
    { name: 'date.fst', size: 59154 },
    { name: 'number.fst', size: 64482 },
    { name: 'phone.fst', size: 88630 },
    { name: 'new_heteronym.fst', size: 21974 }
  ];
  var MODEL_TOTAL = MODEL_FILES.reduce(function (a, f) { return a + f.size; }, 0);

  function downloadModels() {
    var done = 0;
    var seq = Promise.resolve();
    MODEL_FILES.forEach(function (f) {
      seq = seq.then(function () {
        var fileNames = f.parts || [f.name];
        // 分卷/单文件：逐个下载（进度串联），最后拼接成完整模型
        var buffers = [];
        var fileSeq = Promise.resolve();
        fileNames.forEach(function (fn) {
          fileSeq = fileSeq.then(function () {
            return fetch(MODEL_BASE + fn + '?v=3', { cache: 'no-cache' }).then(function (res) {
              if (!res.ok) throw new Error(fn + ' 下载失败 HTTP ' + res.status);
              var totalSize = Number(res.headers.get('Content-Length')) || 0;
              if (!res.body) return res.arrayBuffer();
              var reader = res.body.getReader();
              var chunks = [], received = 0, v0 = 0, tPrev = Date.now(), spd = 0;
              function pump() {
                return reader.read().then(function (r) {
                  if (r.done) return;
                  chunks.push(r.value);
                  received += r.value.length;
                  var now = Date.now();
                  if (now - tPrev >= 1500) {
                    spd = (received - v0) / ((now - tPrev) / 1000);
                    v0 = received; tPrev = now;
                  }
                  var left = Math.max(0, MODEL_TOTAL - (done + received));
                  var estSec = spd > 0 ? left / spd : NaN;
                  var txt = '正在下载 ' + fn + '（' + (received / 1048576).toFixed(1) + '/' + (totalSize / 1048576).toFixed(1) + ' MB'
                    + (spd > 0 ? '，' + (spd / 1048576).toFixed(1) + ' MB/s，预计剩余 ' + fmtSec(estSec) + '，预计完成 ~' + fmtClock(estSec) : '') + '）';
                  showProg((done + received) / MODEL_TOTAL * 100, txt);
                  return pump();
                });
              }
              return pump().then(function () {
                var buf = new Uint8Array(received);
                var off = 0;
                chunks.forEach(function (c) { buf.set(c, off); off += c.length; });
                done += received;
                buffers.push(buf);
                return buf;
              });
            });
          });
        });
        return fileSeq.then(function () {
          if (buffers.length === 0) throw new Error(f.name + ' 下载为空');
          if (fileNames.length === 1) return buffers[0];
          var total = 0;
          buffers.forEach(function (b) { total += b.length; });
          var merged = new Uint8Array(total);
          var off = 0;
          buffers.forEach(function (b) { merged.set(b, off); off += b.length; });
          if (f.name === 'lexicon.txt') {
            try { baseLex = new TextDecoder('utf-8').decode(merged); } catch (e) {}
          }
          return merged;
        });
      }).then(function (buf) {
        workerSend({ type: 'model-data', name: f.name, buffer: buf.buffer }, [buf.buffer]);
      });
    });
    seq.then(function () {
      showProg(100, '模型下载完成，正在初始化引擎（约 10~30 秒）…');
    }).catch(function (e) {
      setStatus('❌ 模型下载失败：' + (e && (e.message || e.toString()) || String(e)), 'err');
    });
  }

  function startWorker() {
    worker = new Worker('tts-worker.js?v=21');
    worker.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.type === 'need-models') { downloadModels(); return; }
      if (m.type === 'stage') {
        progTxt.textContent = '⚙️ ' + m.msg;
        return;
      }
      if (m.type === 'progress' && m.file && m.total) {
        progTxt.textContent = '📥 模型已写入 ' + m.got + '/' + m.total + '（正在初始化引擎…）';
        return;
      }
      if (m.type === 'ready') {
        ready = true;
        goBtn.disabled = false;
        hideProg();
        setStatus('✅ 就绪，输入文字开始合成吧', 'ok');
        hintEl.textContent = '🌐 模型已缓存到本机（下次打开不用重新下载，离线也能用）。✏️ 输入文字，点「合成」——先试听，满意再下载。';
        return;
      }
      if (m.type === 'rebuilding') {
        showProg(100, '🎚️ 正在应用音效设置（模型已在内存，约 10 秒）…');
        return;
      }
      if (m.type === 'lex-ok') {
        hideProg();
        lexMsgEl.textContent = '✅ 已保存 ' + m.count + ' 条读音纠正（引擎重载完成，现在合成生效）';
        lexMsgEl.className = 'msg ok';
        return;
      }
      if (m.type === 'synth-ok') {
        syncing = false;
        stopWaitTxt();
        var samples = new Float32Array(m.samples);
        // 与云端一致：先变调（pitchShift 采样重采样）再音量（applyVolume）——阈值内不做
        samples = applyVolume(pitchShift(samples, parseFloat(pitchEl.value)), parseFloat(volumeEl.value));
        lastWav = toWav(samples, m.sampleRate);
        if (curObjUrl) URL.revokeObjectURL(curObjUrl);
        curObjUrl = URL.createObjectURL(lastWav);
        player.src = curObjUrl;
        playerWrap.style.display = 'block';
        player.load();
        var dur = samples.length / m.sampleRate;
        fileInfo.textContent = '实际生成 ' + fmtSec(m.ms / 1000) + ' · 音频 ' + dur.toFixed(1) + ' 秒 · 44100Hz WAV（短于 1 秒时播放器显示 00:00，点 ▶ 播放即可）';
        hideProg();
        dlBtn.disabled = false;
        goBtn.disabled = false;
        if (!dur) setStatus('⚠️ 生成音频为 0 秒，试试换一段文字', 'err');
        else {
          player.play().catch(function () {
            setStatus('✅ 完成 · 浏览器拦了自动播放，点播放条 ▶ 试听', 'ok');
          });
        }
        return;
      }
      if (m.type === 'synth-err') {
        syncing = false;
        goBtn.disabled = false;
        stopWaitTxt();
        hideProg();
        setStatus('❌ ' + m.message, 'err');
        return;
      }
    };
    worker.onerror = function (e) {
      syncing = false;
      goBtn.disabled = false;
      stopWaitTxt();
      hideProg();
      setStatus('❌ 引擎线程异常：' + (e && e.message || '未知') + '，请刷新页面', 'err');
    };
  }

  // ================= 采样处理（照搬 maomao-admin-api/tts.js：pitchShift + applyVolume）=================
  function pitchShift(samples, pitch) {
    if (Math.abs(pitch - 1.0) < 0.001) return samples;
    var out = new Float32Array(samples.length);
    var step = 1.0 / pitch;
    for (var i = 0; i < samples.length; i++) {
      var pos = i * step;
      var j = Math.floor(pos), f = pos - j;
      var a = samples[j] || 0, b = samples[j + 1] || a;
      out[i] = a + (b - a) * f;
    }
    return out;
  }
  function applyVolume(samples, volume) {
    var v = Math.max(0.25, Math.min(2.0, volume / 4));
    if (Math.abs(v - 1) < 0.01) return samples;
    var out = new Float32Array(samples.length);
    for (var i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i] * v));
    return out;
  }

  function toWav(floatSamples, sampleRate) {
    var samples = new Int16Array(floatSamples.length);
    for (var i = 0; i < samples.length; ++i) {
      var s = floatSamples[i];
      if (s >= 1) s = 1; else if (s <= -1) s = -1;
      samples[i] = s * 32767;
    }
    var buf = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buf);
    view.setUint32(0, 0x46464952, true);
    view.setUint32(4, 36 + samples.length * 2, true);
    view.setUint32(8, 0x45564157, true);
    view.setUint32(12, 0x20746d66, true);
    view.setUint32(16, 16, true);
    view.setUint32(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x61746164, true);
    view.setUint32(40, samples.length * 2, true);
    var offset = 44;
    for (var j = 0; j < samples.length; ++j) {
      view.setInt16(offset, samples[j], true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  goBtn.addEventListener('click', function () {
    var text = textEl.value.trim();
    if (!text) { setStatus('⚠️ 先输入文字', 'err'); return; }
    if (!ready) { setStatus('⚠️ 模型还没准备好，稍等片刻再试', 'err'); return; }
    if (syncing) { setStatus('⚠️ 上一次合成还没结束，稍等', 'err'); return; }
    syncing = true;
    goBtn.disabled = true;
    dlBtn.disabled = true;
    setStatus('');
    var est = Math.max(5, Math.round(text.length * 0.3 / parseFloat(speedEl.value)));
    showProg(30, '⏳ 正在合成，预计剩余 ' + fmtSec(est) + '，预计完成 ~' + fmtClock(est));
    startWaitTxt('🎙️ 正在合成', '预计总共 ' + fmtSec(est) + '');
    workerSend({
      type: 'synth',
      text: text,
      speed: parseFloat(speedEl.value),
      params: {
        noiseScale: parseFloat(noiseEl.value),
        noiseScaleW: parseFloat(noiseWEl.value),
        silenceScale: parseFloat(silenceEl.value)
      }
    });
  });

  dlBtn.addEventListener('click', function () {
    if (!lastWav) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(lastWav);
    a.download = 'maomao_tts_' + new Date().toISOString().slice(0, 17).replace(/[-:T]/g, '') + '.wav';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  });

  // ================= 读音纠正（多音字）：词=带调拼音 → lexicon 热重载 =================
  function parseLexLines(text) {
    var entries = [], errors = [];
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var eq = line.indexOf('=');
      if (eq <= 0) { errors.push('无效行（需要 词=拼音）：' + line.substring(0, 30)); return; }
      var word = line.substring(0, eq).trim();
      var pys = line.substring(eq + 1).trim();
      try {
        var lexLine = pyToLexiconLine(word, pys);
        entries.push({ word: word, line: lexLine });
      } catch (e) {
        errors.push(e.message);
      }
    });
    return { entries: entries, errors: errors };
  }
  function rebuildLex(entries) {
    var map = {};
    entries.forEach(function (e) { map[e.word] = e.line; });
    var lines = baseLex.split('\n');
    var out = new Array(lines.length);
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (!ln) { out[i] = ln; continue; }
      var sp = ln.indexOf(' ');
      var w = sp > 0 ? ln.substring(0, sp) : ln;
      if (map[w]) { out[i] = map[w]; delete map[w]; }
      else out[i] = ln;
    }
    var extra = [];
    for (var k in map) extra.push(map[k]);
    var text = out.join('\n') + (extra.length ? '\n' + extra.join('\n') : '');
    return { text: text, count: entries.length };
  }
  (function loadLex() {
    var saved = null;
    try { saved = localStorage.getItem('ttsLex'); } catch (e) {}
    if (saved) lexTextEl.value = saved;
  })();
  lexSaveBtn.addEventListener('click', function () {
    if (!ready || !baseLex) {
      lexMsgEl.textContent = '⚠️ 模型还没就绪，先等一下再保存';
      lexMsgEl.className = 'msg err';
      return;
    }
    var parsed = parseLexLines(lexTextEl.value);
    if (!parsed.entries.length) {
      lexMsgEl.textContent = '⚠️ 没有可保存的有效词条' + (parsed.errors.length ? '：' + parsed.errors[0] : '');
      lexMsgEl.className = 'msg err';
      return;
    }
    try { localStorage.setItem('ttsLex', lexTextEl.value); } catch (e) {}
    var rebuilt = rebuildLex(parsed.entries);
    lexSaveBtn.disabled = true;
    showProg(100, '🛠 正在重载词典并重建引擎（约 10~15 秒）…');
    workerSend({ type: 'lex-update', text: rebuilt.text });
    if (parsed.errors.length) {
      lexMsgEl.textContent = '⚠️ 有效 ' + parsed.entries.length + ' 条，忽略无效 ' + parsed.errors.length + ' 行：' + parsed.errors[0];
      lexMsgEl.className = 'msg err';
    } else {
      lexMsgEl.textContent = '⏳ 已保存 ' + parsed.entries.length + ' 条，等待引擎重载…';
      lexMsgEl.className = 'msg';
    }
    setTimeout(function () { lexSaveBtn.disabled = false; }, 30000);
  });

  // ================= Service Worker =================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function (e) {
      console.warn('SW register failed', e);
    });
  }

  startWorker();
})();
