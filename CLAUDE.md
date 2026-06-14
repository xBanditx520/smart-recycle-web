# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (binds to 0.0.0.0)
npm run build      # production build
npm run preview    # preview production build locally
npm run typecheck  # TypeScript type check (no emit)
```

There is no linter and no test suite configured.

## Architecture

**Stack:** React 18 + TypeScript + Vite. All ML inference runs entirely in the browser — no backend.

### ML inference pipeline

`src/lib/preprocess.ts` → `src/lib/model.ts` → result components

1. **Preprocess** ([src/lib/preprocess.ts](src/lib/preprocess.ts)): Loads the image into an `<img>`, center-crops it to a square, resizes to 224×224 on a canvas, normalizes with ImageNet mean/std (`IMAGE_MEAN`, `IMAGE_STD` in [src/constants/recycle.ts](src/constants/recycle.ts)), and produces a `Float32Array` tensor. Supports both NCHW and NHWC layouts — detected automatically from the model's input shape.

2. **Model** ([src/lib/model.ts](src/lib/model.ts)): Wraps `onnxruntime-web`. The session is held as a module-level singleton (`modelPromise`) and reused across calls unless the URL or execution provider changes. WASM binaries are loaded from jsDelivr CDN. `runPrediction` applies softmax to raw scores and calls `buildRankedScores` to sort classes by confidence.

3. **Composite detection:** In advanced mode, if the second-ranked class scores >20% confidence, the result label is set to `'Composite Item'` and `isComposite = true`. The UI then shows handling tips for both classes.

### Two classification modes

| Mode | Model file | Classes |
|---|---|---|
| Basic | `waste_model.onnx` | 2 — `recyclable` / `non-recyclable` |
| Advanced | `advanced_waste_model.onnx` | 10 — Battery, Biological, Cardboard, Clothes, Glass, Metal, Paper, Plastic, Shoes, Trash |

Model URLs default to `/waste_model.onnx` and `/advanced_waste_model.onnx` (files in `public/`). Override with `VITE_MODEL_URL` and `VITE_ADVANCED_MODEL_URL` in `.env`.

### App structure

- **Routes** ([src/App.tsx](src/App.tsx)): `/` → `HomePage`, `/recognize` → `RecognitionPage`, `/history` → `HistoryPage`. All routes are wrapped in `AccessGate`.
- **RecognitionPage** ([src/pages/RecognitionPage.tsx](src/pages/RecognitionPage.tsx)): Owns all state — file selection, model load status, prediction result. Mode switching has an 800 ms debounce timer. After a successful prediction the record is prepended to `localStorage` history (capped at 20 entries).
- **History** ([src/lib/history.ts](src/lib/history.ts)): Thin read/write helpers over `localStorage` keyed by `STORAGE_KEY = 'smart-recycle-history'`.
- **ResultSheet** ([src/components/ResultSheet.tsx](src/components/ResultSheet.tsx)): Modal overlay shown after a prediction. **ResultCard** ([src/components/ResultCard.tsx](src/components/ResultCard.tsx)) is an older inline variant still present in the codebase.
- **AccessGate** ([src/components/AccessGate.tsx](src/components/AccessGate.tsx)): Optional password wall. Disabled when `VITE_ACCESS_CODE` is not set; grants access via `sessionStorage` when the correct code is entered.

### Environment variables

```
VITE_MODEL_URL             # URL/path to basic ONNX model (default: /waste_model.onnx)
VITE_ADVANCED_MODEL_URL    # URL/path to advanced ONNX model (default: /advanced_waste_model.onnx)
VITE_ACCESS_CODE           # If set, gates the entire app behind a code entry screen
```

Copy `.env.example` to `.env` to customize locally.
