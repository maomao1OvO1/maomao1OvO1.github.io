# Runtime Diagrams

These diagrams are intentionally compact. See [Architecture](architecture.md)
and [Engine](engine.md) for the detailed narrative.

## App and Engine

```mermaid
flowchart TB
  subgraph Main["Browser main thread"]
    UI["React UI"]
    Store["Zustand game store"]
    Queue["AnalysisQueue"]
    Client["KataGoEngineClient"]
    Storage["localStorage and IndexedDB"]
  end

  subgraph Worker["Dedicated Web Worker"]
    Handler["Message handler"]
    Model["Model loader and TFJS graph"]
    Features["Feature extraction"]
    Search["MCTS search"]
  end

  UI --> Store
  Store --> Queue
  Queue --> Client
  Client <--> Handler
  Handler --> Model
  Handler --> Features
  Features --> Search
  Model --> Search
  Search --> Handler
  Store <--> Storage
  Store --> UI
```

## Analysis Request

```mermaid
sequenceDiagram
  participant UI as React UI
  participant Store as gameStore
  participant Queue as AnalysisQueue
  participant Client as Engine client
  participant Worker as KataGo worker
  participant TFJS as TensorFlow.js

  UI->>Store: Toggle or request analysis
  Store->>Queue: Enqueue job with priority and cache key
  Queue->>Client: analyze(position, settings)
  Client->>Worker: postMessage katago:analyze
  Worker->>Worker: Ensure backend and model
  Worker->>Worker: Fill feature tensors
  Worker->>TFJS: Policy/value/ownership inference
  Worker->>Worker: MCTS search
  Worker-->>Client: Progress update
  Client-->>Store: onProgress analysis
  Worker-->>Client: Final analysis
  Client-->>Queue: Resolve job
  Queue-->>Store: Cache and attach to GameNode
  Store-->>UI: Re-render board, graph, hints, report data
```

## Persistent Data

```mermaid
flowchart LR
  Store["gameStore"] --> Settings["localStorage settings"]
  Store --> AutoSave["localStorage auto-save"]
  Store --> Library["IndexedDB web-katrain-library"]
  Store --> ModelUpload["IndexedDB web-katrain-models"]
  ServiceWorker["sw.js"] --> Cache["Cache Storage"]
  Cache --> Shell["App shell"]
  Cache --> Model["Small model"]
  Cache --> Wasm["TFJS WASM"]
  Cache --> Assets["Board and PWA assets"]
```
