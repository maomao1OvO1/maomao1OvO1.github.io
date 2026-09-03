/* 🎙️ 声库实验室 · 网页版 —— 主线程版（与线下验证过架构一致；本地 assets/ 或线上 models/ 分卷）
 * 流程：下载模型（暂存内存）→ 引擎(wasm)就绪 → 写入 FS → createOfflineTts → 就绪 → generate
 * 状态机：模型与引擎谁先到都等对方（修复「内存未就绪写入」崩溃）
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

  // ================= 引擎动态加载（预取 wasm 字节→注入→顺序执行 glue/binding）=================
  var ENGINE_BASE = 'https://maomao1ovo1.github.io/tts-web/';
  function fetchBytes(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }
  function insertScript(src) {
    return new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = src;
      sc.onload = res;
      sc.onerror = function () { rej(new Error('脚本加载失败：' + src)); };
      document.head.appendChild(sc);
    });
  }
  function loadEngine() {
    return fetchBytes(ENGINE_BASE + 'sherpa-onnx-wasm-main-tts.wasm')
      .then(function (buf) {
        Module.wasmBinary = buf;   // 引擎直接用内置字节，跳过自身 wasm 下载
        return insertScript('sherpa-onnx-wasm-main-tts.js?v=13');
      })
      .then(function () { return insertScript('sherpa-onnx-tts.js?v=13'); })
      .then(function () { progTxt.textContent = '⚙️ 引擎已加载，等待初始化…'; });
  }

  var IS_LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var MODEL_BASE = IS_LOCAL ? './assets/' : './models/';
  var MODEL_FILES = IS_LOCAL ? [
    { name: 'model.onnx', size: 170429550 },
    { name: 'lexicon.txt', size: 6838024 },
    { name: 'tokens.txt', size: 655 },
    { name: 'date.fst', size: 59154 },
    { name: 'number.fst', size: 64482 },
    { name: 'phone.fst', size: 88630 },
    { name: 'new_heteronym.fst', size: 21974 }
  ] : [
    { name: 'model.onnx', parts: ['model.part1', 'model.part2'], size: 170429550 },
    { name: 'lexicon.txt', size: 6838024 },
    { name: 'tokens.txt', size: 655 },
    { name: 'date.fst', size: 59154 },
    { name: 'number.fst', size: 64482 },
    { name: 'phone.fst', size: 88630 },
    { name: 'new_heteronym.fst', size: 21974 }
  ];
  var MODEL_TOTAL = MODEL_FILES.reduce(function (a, f) { return a + f.size; }, 0);

  var ready = false, tts = null, built = false;
  var wasmReady = false;
  var pendingModels = {};
  var baseLex = null, lastWav = null, curObjUrl = null, syncing = false;

  // ================= 进度条/状态 =================
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
    progTarget = pct; startAnim();
    progTxt.textContent = txt;
  }
  function hideProg() { progWrap.style.display = 'none'; }
  function setStatus(txt, cls) {
    statusEl.textContent = txt || '';
    statusEl.className = 'msg' + (cls ? ' ' + cls : '');
  }
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

  // ================= 引擎就绪回调（由 index.html 加载的 glue script 触发）=================
  Module.setStatus = function (s) {
    if (s) { try { progTxt.textContent = '⚙️ ' + s; } catch (e) {} }
  };
  Module.onRuntimeInitialized = function () {
    wasmReady = true;
    maybeInit();
  };

  function allModelsArrived() {
    for (var i = 0; i < MODEL_FILES.length; i++) {
      if (!pendingModels[MODEL_FILES[i].name]) return false;
    }
    return true;
  }
  function maybeInit() {
    if (!wasmReady || !allModelsArrived() || built) return;
    try {
      for (var i = 0; i < MODEL_FILES.length; i++) {
        var f = MODEL_FILES[i];
        try { Module.FS_unlink('/' + f.name); } catch (e) {}
        Module.FS_createDataFile('/', f.name, pendingModels[f.name], true, false);
      }
      tts = createOfflineTts(Module, {
        offlineTtsModelConfig: {
          offlineTtsVitsModelConfig: {
            model: './model.onnx', lexicon: './lexicon.txt', tokens: './tokens.txt',
            dataDir: '', noiseScale: parseFloat(noiseEl.value),
            noiseScaleW: parseFloat(noiseWEl.value), lengthScale: 1.0
          },
          numThreads: 1, debug: false, provider: 'cpu'
        },
        ruleFsts: './date.fst,./number.fst,./phone.fst,./new_heteronym.fst',
        ruleFars: '', maxNumSentences: 1, silenceScale: parseFloat(silenceEl.value)
      });
      built = true;
      ready = true;
      goBtn.disabled = false;
      hideProg();
      setStatus('✅ 就绪，输入文字开始合成吧', 'ok');
      hintEl.textContent = '🌐 模型已缓存到本机（下次打开不用重新下载，离线也能用）。✏️ 输入文字，点「合成」——先试听，满意再下载。';
    } catch (e) {
      setStatus('❌ 初始化失败：' + String(e && (e.message || e.toString()) || e), 'err');
    }
  }

  // ================= 模型下载（进度/速度/预计剩余；分卷拼接；暂存）=================
  function downloadModels() {
    var done = 0;
    var seq = Promise.resolve();
    MODEL_FILES.forEach(function (f) {
      seq = seq.then(function () {
        var fileNames = f.parts || [f.name];
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
                  if (Date.now() - tPrev >= 1500) {
                    spd = (received - v0) / ((Date.now() - tPrev) / 1000);
                    v0 = received; tPrev = Date.now();
                  }
                  var left = Math.max(0, MODEL_TOTAL - (done + received));
                  var estSec = spd > 0 ? left / spd : NaN;
                  showProg((done + received) / MODEL_TOTAL * 100,
                    '正在下载 ' + fn + '（' + (received / 1048576).toFixed(1) + '/' + (totalSize / 1048576).toFixed(1) + ' MB'
                    + (spd > 0 ? '，' + (spd / 1048576).toFixed(1) + ' MB/s，预计剩余 ' + fmtSec(estSec) + '，预计完成 ~' + fmtClock(estSec) : '') + '）');
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
          if (!buffers.length) throw new Error(f.name + ' 下载为空');
          var data = buffers.length === 1 ? buffers[0] : (function () {
            var total = 0;
            buffers.forEach(function (b) { total += b.length; });
            var m = new Uint8Array(total);
            var o = 0;
            buffers.forEach(function (b) { m.set(b, o); o += b.length; });
            return m;
          })();
          if (f.name === 'lexicon.txt') {
            try { baseLex = new TextDecoder('utf-8').decode(data); } catch (e) {}
          }
          pendingModels[f.name] = data;
          var n = 0;
          MODEL_FILES.forEach(function (x) { if (pendingModels[x.name]) n++; });
          progTxt.textContent = '📥 模型已就绪 ' + n + '/' + MODEL_FILES.length + '（等待引擎初始化）…';
          maybeInit();
        });
      });
    });
    seq.then(function () {
      if (!built) showProg(100, '模型全部就绪，等待引擎初始化（约 10~40 秒）…');
    }).catch(function (e) {
      setStatus('❌ 模型下载失败：' + String(e && (e.message || e.toString()) || e), 'err');
    });
  }

  // ================= 滑块/音效设置 =================
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
  $('pHigh').addEventListener('click', function () { pitchEl.value = 1.2; pitchEl.dispatchEvent(new Event('input')); });
  $('pNor').addEventListener('click', function () {
    pitchEl.value = 1.0; speedEl.value = 1.0; volumeEl.value = 4; noiseEl.value = 0.8;
    noiseWEl.value = 0.95; silenceEl.value = 0.2;
    ['speedV', 'volumeV', 'pitchV', 'noiseV', 'noiseWV', 'silenceV'].forEach(function (id) {
      var el = document.getElementById(id);
      var m = { speedV: '1', volumeV: '1', pitchV: '2', noiseV: '3', noiseWV: '3', silenceV: '3' }[id];
      if (m === '1') el.textContent = '1.00×';
      else if (m === '2') el.textContent = '原声';
      else el.textContent = String(Math.round(parseFloat(document.getElementById(id.replace('V', '')).value) * 100));
    });
  });
  var PREFS_KEYS = ['speed', 'volume', 'pitch', 'noise', 'noiseW', 'silence'];
  var prefTimer = null;
  function savePrefs() {
    if (prefTimer) clearTimeout(prefTimer);
    prefTimer = setTimeout(function () {
      var p = {};
      PREFS_KEYS.forEach(function (k) { p[k] = parseFloat(document.getElementById(k).value); });
      try { localStorage.setItem('ttsPrefs', JSON.stringify(p)); } catch (e) {}
    }, 800);
  }
  PREFS_KEYS.forEach(function (k) { document.getElementById(k).addEventListener('change', savePrefs); });
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

  // ================= 预计生成时间 =================
  function updateEta() {
    var n = textEl.value.trim().length;
    if (!n) { etaEl.textContent = '预计生成时间：—'; return; }
    var sec = Math.round(n * 0.08 / parseFloat(speedEl.value));
    etaEl.textContent = '预计生成时间：' + fmtSec(sec) + '（' + n + ' 字）';
  }
  textEl.addEventListener('input', updateEta);
  speedEl.addEventListener('input', updateEta);
  updateEta();

  // ================= 合成（同步；变调/音量采样处理同云端）=================
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
    showProg(50, '🎙️ 正在合成，预计剩余 ' + fmtSec(est) + '，预计完成 ~' + fmtClock(est) + '（期间页面可能短暂卡顿）');
    setTimeout(function () {
      try {
        var t0 = Date.now();
        var audio = tts.generate({ text: text, sid: 0, speed: parseFloat(speedEl.value) });
        var samples = applyVolume(pitchShift(audio.samples, parseFloat(pitchEl.value)), parseFloat(volumeEl.value));
        lastWav = toWav(samples, audio.sampleRate);
        if (curObjUrl) URL.revokeObjectURL(curObjUrl);
        curObjUrl = URL.createObjectURL(lastWav);
        player.src = curObjUrl;
        playerWrap.style.display = 'block';
        player.load();
        var dur = samples.length / audio.sampleRate;
        fileInfo.textContent = '实际生成 ' + fmtSec((Date.now() - t0) / 1000) + ' · 音频 ' + dur.toFixed(1) + ' 秒 · 44100Hz WAV（短于 1 秒时播放器显示 00:00，点 ▶ 播放即可）';
        hideProg();
        dlBtn.disabled = false;
        goBtn.disabled = false;
        syncing = false;
        player.play().catch(function () {
          setStatus('✅ 完成 · 浏览器拦了自动播放，点播放条 ▶ 试听', 'ok');
        });
        if (!dur) setStatus('⚠️ 生成音频为 0 秒，试试换一段文字', 'err');
      } catch (e) {
        goBtn.disabled = false;
        syncing = false;
        hideProg();
        setStatus('❌ 合成出错：' + String(e && (e.message || e.toString()) || e), 'err');
      }
    }, 80);
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

  // ================= 读音纠正（多音字）=================
  function parseLexLines(text) {
    var entries = [], errors = [];
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var eq = line.indexOf('=');
      if (eq <= 0) { errors.push('无效行（需要 词=拼音）：' + line.substring(0, 30)); return; }
      var word = line.substring(0, eq).trim();
      var pys = line.substring(eq + 1).trim();
      try { entries.push({ word: word, line: pyToLexiconLine(word, pys) }); }
      catch (e) { errors.push(e.message); }
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
    return out.join('\n') + (extra.length ? '\n' + extra.join('\n') : '');
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
    try {
      var enc = new TextEncoder().encode(rebuildLex(parsed.entries));
      try { Module.FS_unlink('/lexicon.txt'); } catch (e2) {}
      Module.FS_createDataFile('/', 'lexicon.txt', enc, true, false);
      tts = createOfflineTts(Module, {
        offlineTtsModelConfig: {
          offlineTtsVitsModelConfig: {
            model: './model.onnx', lexicon: './lexicon.txt', tokens: './tokens.txt',
            dataDir: '', noiseScale: parseFloat(noiseEl.value),
            noiseScaleW: parseFloat(noiseWEl.value), lengthScale: 1.0
          },
          numThreads: 1, debug: false, provider: 'cpu'
        },
        ruleFsts: './date.fst,./number.fst,./phone.fst,./new_heteronym.fst',
        ruleFars: '', maxNumSentences: 1, silenceScale: parseFloat(silenceEl.value)
      });
      lexMsgEl.textContent = '✅ 已保存 ' + parsed.entries.length + ' 条读音纠正（引擎已重载，新合成生效）' +
        (parsed.errors.length ? ' ⚠️ 忽略 ' + parsed.errors.length + ' 行：' + parsed.errors[0] : '');
      lexMsgEl.className = 'msg ok';
    } catch (e) {
      lexMsgEl.textContent = '❌ 保存失败：' + String(e && (e.message || e.toString()) || e);
      lexMsgEl.className = 'msg err';
    }
  });

  // ================= Service Worker =================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function (e) {
      console.warn('SW register failed', e);
    });
  }

  // ================= 启动：模型下载与引擎加载【并行】，状态机等双方就绪 =================
  downloadModels();
  (function loadEngineRetry(tries) {
    loadEngine().catch(function (e) {
      var msg = String(e && (e.message || e.toString()) || e);
      if (tries < 3) {
        setStatus('⚠️ 引擎加载失败（' + msg + '），' + (tries + 1) + ' 秒后自动重试…', 'err');
        setTimeout(function () { loadEngineRetry((tries || 0) + 1); }, (tries + 1) * 1000);
      } else {
        setStatus('❌ 引擎加载失败：' + msg + '（请下拉刷新页面重试）', 'err');
      }
    });
  })(0);
})();
