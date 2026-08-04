# Engine

The engine is a browser-native KataGo-style pipeline built from TypeScript,
TensorFlow.js, and a dedicated Web Worker. It is not a wrapper around the KataGo
binary and does not require a backend server.

## Key Files

| File | Role |
| --- | --- |
| `src/engine/katago/client.ts` | Main-thread worker client and request bookkeeping. |
| `src/engine/katago/worker.ts` | Model loading, backend selection, feature extraction, request queue, and worker responses. |
| `src/engine/katago/loadModelV8.ts` | Parser for KataGo `.bin` model versions 8 through 16. |
| `src/engine/katago/modelV8.ts` | TensorFlow.js model graph construction and forward passes. |
| `src/engine/katago/featuresV7Fast.ts` | Fast feature tensor filling for KataGo v7-style inputs. |
| `src/engine/katago/fastBoard.ts` | Compact board representation, legal move checks, ko, captures, ladders, and board-size setup. |
| `src/engine/katago/analyzeMcts.ts` | PUCT/MCTS search, expansion, rollout evaluation, PVs, and ownership aggregation. |
| `src/engine/katago/evalV8.ts` | Post-processing of network value and score outputs. |
| `src/engine/katago/backendFallback.ts` | TensorFlow.js backend preference and fallback helpers. |

## Model Loading

The default model URL points to `models/katago-small.bin.gz`, resolved through
the app base path. `scripts/fetch-katago-small-model.mjs` downloads the tiny
test network when it is missing.

For stronger local analysis, Settings offers:

`kata1-b18c384nbt-s9996604416-d4316597426.bin.gz`

Developers can also run:

```sh
FETCH_KATRAIN_MODEL=1 npm run fetch:model
```

That copies the b18 model from `../katrain-ref/katrain/models/` when present, or
downloads it into `public/models/`.

At runtime, the worker:

1. Normalizes the requested backend.
2. Fetches the model URL or blob URL.
3. Decompresses gzip weights with `pako` when needed.
4. Parses the KataGo binary model.
5. Builds and warms the TensorFlow.js model.
6. Caches the loaded model until the model URL changes.

Supported model versions are 8 through 16. Models with unsupported meta encoder
versions or unsupported trunk block kinds fail fast with a visible engine error.

Uploaded models are accepted as `.bin`, `.gz`, or `.bin.gz` files and are capped
at 128 MB for browser practicality.

## Backends

The default backend preference is `webgpu`. If WebGPU is unavailable or warmup
fails, the worker can fall back to `wasm`, then `cpu`.

Threaded WASM depends on `SharedArrayBuffer`, which requires cross-origin
isolation headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The app still runs without those headers; it just cannot use threaded WASM.

## Feature Extraction

The worker converts the current `BoardState` plus previous boards, recent moves,
komi, rules, and conservative-pass setting into KataGo v7-style tensors:

- Spatial input: 22 channels over the active board.
- Global input: 19 values.
- Recent history: up to the last five moves.
- Ko and previous-ko features.
- Liberty maps and ladder features.
- Area features for Chinese rules.

This work is optimized with reusable typed-array scratch buffers so repeated
analysis does not allocate heavily.

## MCTS Analysis

`MctsSearch` combines neural network policy/value outputs with PUCT-style tree
search. A normal analysis request can control:

- Visits and maximum time.
- Batch size.
- Maximum child moves.
- Top-K candidate count.
- Principal variation length.
- Region of interest.
- Root noise.
- Random symmetry sampling.
- Tree reuse.
- Ownership mode: `none`, `root`, or `tree`.

The returned payload includes root win rate, root score lead, score self-play,
score standard deviation, visits, policy, ownership, ownership standard
deviation, and candidate moves with visits, priors, point loss, win-rate loss,
score, PV, and optional move ownership.

Root values are stored from Black's perspective.

## Analysis Modes

The store uses the engine in several ways:

- Interactive analysis: current-position search for the board UI.
- Continuous analysis: automatically refreshes as the current node changes.
- Quick game analysis: value-only batch evaluation for a fast whole-line scan.
- Fast game analysis: low-visit MCTS over the current line.
- Full game analysis: requested-visit MCTS over selected nodes or mistakes.
- AI move selection: runs analysis and chooses a move through the configured
  KaTrain-style strategy.
- Self-play to end: repeats AI move selection until the game is complete.

The main-thread `analysisQueue` handles cancellation, staleness, priority, and
cache reuse before requests reach the worker.

## AI Strategies

The strategy list mirrors KaTrain concepts: `default`, `rank`, `scoreloss`,
`policy`, `weighted`, `pick`, `local`, `tenuki`, `territory`, `influence`,
`jigo`, `simple`, and `settle`.

Most strategies choose among candidate moves using visits, policy, score loss,
or shape/territory heuristics. `simple` and `settle` need per-move ownership,
so they request slower analysis with move ownership enabled.
