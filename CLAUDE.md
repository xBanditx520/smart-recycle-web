# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration language

Conversations with the user are in **Chinese**. All code, comments, variable names, commit messages, and file content must be written in **English**.

## Commands

```bash
npm run dev        # start dev server (binds to 0.0.0.0)
npm run build      # production build
npm run preview    # preview production build locally
npm run typecheck  # TypeScript type check (no emit)
```

There is no linter and no test suite configured.

## Project context

Capstone project by Leong Khee Yan at Sunway University. A waste classification PWA — MobileNetV3-Small runs entirely in the browser via ONNX Runtime Web (WASM). No backend. Gemini AI is an optional cloud fallback triggered explicitly by the user.

## Architecture

**Stack:** React 18 + TypeScript + Vite. All ML inference runs in the browser via WebAssembly.

### ML inference pipeline

`src/lib/preprocess.ts` → `src/lib/model.ts` → result components

1. **Preprocess** ([src/lib/preprocess.ts](src/lib/preprocess.ts)): Center-crops to square, resizes to 224×224, normalizes with ImageNet mean/std. Supports NCHW and NHWC (auto-detected from model input shape).
2. **Model** ([src/lib/model.ts](src/lib/model.ts)): Wraps `onnxruntime-web`. Session is a module-level singleton reused across calls. WASM binaries loaded from jsDelivr CDN. Softmax applied to raw logits.
3. **Composite detection:** If the second-ranked class scores >20% confidence, label = `'Composite Item'`, `isComposite = true`. UI shows tips for both classes.

### Single classification mode — Advanced only

Basic mode was removed. The app always uses the **Advanced model** (10-class):

| Model file | Classes |
|---|---|
| `public/smart_recycle_v2.onnx` | Bulky_Furniture, E_Waste, Fabric_Shoes, General_Trash, Glass, Metal, Organic_Waste, Paper_Cardboard, Plastic |

Class order is alphabetical (ImageFolder sort) — this is the logit output order the app relies on.

The model is a **single self-contained file** (weights inlined, no external `.data` file). Do NOT export with external data — onnxruntime-web WASM cannot load split ONNX files.

Model URL defaults to `/smart_recycle_v2.onnx`. Override with `VITE_ADVANCED_MODEL_URL` in `.env`.

**Test-set metrics (retrained June 2026, 9-class v2):**
- Accuracy 97.7% · Precision 96.7% · Recall 97.4% · F1 97.0%
- Weakest classes: Metal (F1 93.3%) and General_Trash (F1 94.3%)

### App structure

- **Routes** ([src/App.tsx](src/App.tsx)): `/` → `RecognitionPage`, `/history` → `HistoryPage`, `/model` → `ModelPage`. All wrapped in `AccessGate`. Bottom nav has three tabs: Scan / History / Model.
- **RecognitionPage** ([src/pages/RecognitionPage.tsx](src/pages/RecognitionPage.tsx)): Always uses Advanced model. Camera capture **auto-triggers recognition** immediately (no manual button press needed). Upload flow still requires manual "Recognize" button. After prediction, result is prepended to `localStorage` history (capped at 20).
- **CameraCapture** ([src/components/CameraCapture.tsx](src/components/CameraCapture.tsx)): Upload/Shutter/Flip controls are positioned **inside** the camera shell (floating overlay). Video uses `object-fit: cover`. Mobile: `aspect-ratio: 3/4` (portrait). Desktop: `4/3`.
- **ResultSheet** ([src/components/ResultSheet.tsx](src/components/ResultSheet.tsx)): Full-screen overlay after prediction. Shows label, confidence ring, top-5 class bars, disposal tip, and Gemini AI section.
- **History** ([src/lib/history.ts](src/lib/history.ts)): Read/write over `localStorage`, key `'smart-recycle-history'`.
- **ModelPage** ([src/pages/ModelPage.tsx](src/pages/ModelPage.tsx)): Shows Advanced model metrics, per-class F1 bars, P/R/F1 line chart (SVG, replaces old confusion matrix), Edge Inference stats, Feedback Dataset panel.
- **AccessGate** ([src/components/AccessGate.tsx](src/components/AccessGate.tsx)): Optional password wall via `VITE_ACCESS_CODE`.

### Gemini AI integration

[src/lib/gemini.ts](src/lib/gemini.ts) — direct REST API, **no SDK**.

- Model: `gemini-2.5-flash`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- API key: `VITE_GEMINI_API_KEY` in `.env` (client-side bundle — acceptable for capstone demo only)
- Triggered only when user explicitly clicks "Results not accurate? Ask Gemini AI →" in ResultSheet
- Returns `GeminiAnalysis { category, recyclable, confidence, reason }`
- Uses `generationConfig: { responseMimeType: 'application/json' }` for reliable JSON output

### Feedback / IndexedDB

[src/lib/feedback.ts](src/lib/feedback.ts) — stores flagged images locally in IndexedDB.

- DB: `sr-feedback`, store: `items`
- `saveFeedback()` — converts blob URL to data URL, stores with metadata
- `getFeedbackCount()`, `exportFeedback()`, `clearFeedback()`
- **Privacy design**: Data never leaves the device by default. Gemini call is user-initiated (one image, one-time). This is intentional — local-first architecture preserves user privacy as stated in Capstone 1.

### Disposal / recyclability

[src/constants/disposal.ts](src/constants/disposal.ts)

- `Shoes` → **Non-recyclable** (rubber/leather/adhesive composites, can't be separated by standard machinery). Donate wearable pairs; damaged ones to general waste.
- All other classes have detailed Malaysian-context disposal tips.

### Environment variables

```
VITE_ADVANCED_MODEL_URL    # URL/path to ONNX model (default: /advanced_waste_model.onnx)
VITE_GEMINI_API_KEY        # Gemini REST API key (enables AI second-opinion feature)
VITE_ACCESS_CODE           # If set, gates app behind a code entry screen
```

Copy `.env.example` to `.env` to customize locally. Never commit `.env`.

### Re-training workflow

Training data in `data_classified/` (gitignored). Split: 70% train / 15% valid / 15% test.
40,000+ images across 10 classes. After retraining in Colab:
1. Export ONNX with `save_as_external_data=False` (inline model, single file)
2. Verify with `onnx.load()` + check no `.data` reference
3. Replace `public/advanced_waste_model.onnx`
4. Update `CLASS_METRICS` and overall metrics in `src/pages/ModelPage.tsx`
