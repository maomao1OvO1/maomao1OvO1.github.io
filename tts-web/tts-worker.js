/* 🎙️ 声库实验室 · 网页版 —— Web Worker：引擎 + 合成（模型由主线程下载后 transfer 过来）
 * 通信（postMessage）：
 *   主线程 → worker：{type:'model-data', name, buffer(transfer)}
 *   主线程 → worker：{type:'synth', text, speed, params:{noiseScale,noiseScaleW,silenceScale}}
 *   worker → 主线程：{type:'need-models', files:[...]} / {type:'preload-done'} / {type:'ready'}
 *   worker → 主线程：{type:'rebuilding'} / {type:'synth-ok', samples(transfer), sampleRate, ms}
 *   worker → 主线程：{type:'synth-err', message}
 */
'use strict';

var MODEL_FILES = [
  { name: 'model.onnx' }, { name: 'lexicon.txt' }, { name: 'tokens.txt' },
  { name: 'date.fst' }, { name: 'number.fst' }, { name: 'phone.fst' }, { name: 'new_heteronym.fst' }
];
var got = {};       // name -> true
var tts = null;
var lastParams = null;
var post = function (m, t) { self.postMessage(m, t || []); };

function needMoreModels() {
  for (var i = 0; i < MODEL_FILES.length; i++) {
    if (!got[MODEL_FILES[i].name]) return true;
  }
  return false;
}
function tryFinishPreload() {
  if (needMoreModels()) return;
  post({ type: 'preload-done' });
}

var Module = {
  print: function (t) { console.log('[wasm]', t); },
  printErr: function (t) { console.error('[wasm]', t); }
};

/* ★ 根治「模型先到、wasm 后到」竞态：模型先暂存内存，等 wasm 就绪（HEAP8 已定义）再写 FS */
var wasmReady = false;
var modelData = {};   // name -> Uint8Array
var built = false;

function allModelsArrived() {
  for (var i = 0; i < MODEL_FILES.length; i++) {
    if (!modelData[MODEL_FILES[i].name]) return false;
  }
  return true;
}
function maybeInit() {
  if (!wasmReady || !allModelsArrived() || built) return;
  for (var i = 0; i < MODEL_FILES.length; i++) {
    var f = MODEL_FILES[i];
    try { Module.FS_unlink('/' + f.name); } catch (e) {}
    Module.FS_createDataFile('/', f.name, modelData[f.name], true, false);
  }
  build(ttsParamsDefault());
  built = true;
  post({ type: 'ready' });
}

Module.onRuntimeInitialized = function () {
  wasmReady = true;
  try {
    maybeInit();
  } catch (e) {
    post({ type: 'synth-err', message: '初始化失败：' + (e && (e.message || e.toString()) || String(e)) });
  }
};

function ttsParamsDefault() {
  return { noiseScale: 0.8, noiseScaleW: 0.95, silenceScale: 0.2 };
}
function ttsParams(p) {
  return {
    offlineTtsModelConfig: {
      offlineTtsVitsModelConfig: {
        model: './model.onnx',
        lexicon: './lexicon.txt',
        tokens: './tokens.txt',
        dataDir: '',
        noiseScale: p.noiseScale,
        noiseScaleW: p.noiseScaleW,
        lengthScale: 1.0
      },
      numThreads: 1,
      debug: false,
      provider: 'cpu'
    },
    ruleFsts: './date.fst,./number.fst,./phone.fst,./new_heteronym.fst',
    ruleFars: '',
    maxNumSentences: 1,
    silenceScale: p.silenceScale
  };
}
function build(p) {
  if (tts) { try { tts.free(); } catch (e) {} }
  tts = createOfflineTts(Module, ttsParams(p));
  lastParams = p;
}
function sameParams(a, b) {
  return a && b && a.noiseScale === b.noiseScale && a.noiseScaleW === b.noiseScaleW && a.silenceScale === b.silenceScale;
}

self.onmessage = function (ev) {
  var msg = ev.data || {};
  if (msg.type === 'model-data') {
    var name = msg.name;
    if (!name || modelData[name]) return;
    try {
      modelData[name] = new Uint8Array(msg.buffer);
      var n = 0;
      MODEL_FILES.forEach(function (x) { if (modelData[x.name]) n++; });
      post({ type: 'progress', got: n, total: MODEL_FILES.length, file: name });
      maybeInit();
    } catch (e) {
      var det = '';
      try { det = JSON.stringify(e, Object.getOwnPropertyNames(e)); } catch (x) { det = String(e); }
      post({ type: 'synth-err', message: '接收模型失败（' + name + '）：' + det });
    }
    return;
  }
  if (msg.type === 'lex-update') {
    // 读音纠正：重写 lexicon.txt → 重建引擎
    try {
      var enc = new TextEncoder().encode(msg.text);
      try { Module.FS_unlink('/lexicon.txt'); } catch (e) {}
      Module.FS_createDataFile('/', 'lexicon.txt', enc, true, false);
      build(lastParams || ttsParamsDefault());
      post({ type: 'lex-ok', count: (msg.count || 0) });
    } catch (e) {
      post({ type: 'synth-err', message: '读音纠正生效失败：' + (e && (e.message || e.toString()) || String(e)) });
    }
    return;
  }
  if (msg.type !== 'synth') return;
  if (!tts) { post({ type: 'synth-err', message: '引擎还没就绪，稍等再试' }); return; }
  var p = msg.params || {};
  if (!sameParams(p, lastParams)) {
    post({ type: 'rebuilding' });
    try {
      build(p);
    } catch (e) {
      post({ type: 'synth-err', message: '应用音效设置失败：' + (e && (e.message || e.toString()) || String(e)) });
      return;
    }
  }
  var t0 = Date.now();
  try {
    var audio = tts.generate({ text: msg.text, sid: 0, speed: msg.speed });
    var ms = Date.now() - t0;
    post({ type: 'synth-ok', samples: audio.samples.buffer, sampleRate: audio.sampleRate, ms: ms }, [audio.samples.buffer]);
  } catch (e) {
    post({ type: 'synth-err', message: '合成出错：' + (e && (e.message || e.toString()) || String(e)) });
  }
};

// 启动 glue（完成后 onRuntimeInitialized 会等 preRun 依赖全部解除）
importScripts('sherpa-onnx-wasm-main-tts.js');
importScripts('sherpa-onnx-tts.js');

// 请求模型清单（主线程开始下载）
post({ type: 'need-models', files: MODEL_FILES.map(function (f) { return f.name; }) });
