# Web KaTrain Docs

This directory documents the browser app, the in-browser KataGo engine, and the
developer workflow.

## Start Here

- [Architecture](architecture.md): how React, Zustand, the move tree, storage,
  and the engine worker fit together.
- [Engine](engine.md): model loading, TensorFlow.js backends, feature
  extraction, search, analysis modes, and AI play strategies.
- [Development](development.md): setup, scripts, project layout, model assets,
  testing, and troubleshooting.
- [Deployment](deployment.md): static hosting, GitHub Pages, base paths,
  COOP/COEP headers, service worker caching, and update behavior.
- [Runtime diagrams](diagram.md): compact diagrams for the main app flow,
  analysis flow, and persistent storage.

## Source Map

| Area | Main files |
| --- | --- |
| App shell | `src/App.tsx`, `src/main.tsx`, `src/components/Layout.tsx` |
| Global state | `src/store/gameStore.ts`, `src/types.ts` |
| Engine client and worker | `src/engine/katago/client.ts`, `src/engine/katago/worker.ts` |
| MCTS and board engine | `src/engine/katago/analyzeMcts.ts`, `src/engine/katago/fastBoard.ts` |
| Model parsing and inference | `src/engine/katago/loadModelV8.ts`, `src/engine/katago/modelV8.ts` |
| SGF, library, persistence | `src/utils/sgf.ts`, `src/utils/library.ts`, `src/utils/autoSave.ts` |
| PWA and deployment helpers | `src/utils/pwa.ts`, `public/sw.js`, `vite.config.ts` |
