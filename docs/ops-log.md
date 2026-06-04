# Operation Log

## 2026-05-31
- Switched dependencies from ONNX Runtime Web to TensorFlow.js + TFLite runtime in package.json.
- Updated default model URL to /model.tflite.
- Replaced ONNX inference pipeline with TFLite-based loader and prediction logic.
- Updated image preprocessing to output TensorFlow.js tensors.
- Updated About page, README, and public model placement notes to match TFLite flow.
- Updated Home page and processing flow copy to reference TFLite runtime.
- Attempted `npm install`, but npm was not found in the current PowerShell session.
- Added Vite alias to use the bundled tfjs-tflite ES2017 build to avoid missing tflite_web_api_client module errors.
- Added a model preflight check and error display to explain why the model is not loaded.
- Configured TFLite wasm path and documented copying wasm assets into public/tflite.
- Pivoted back to ONNX Runtime Web after TFLite initialization errors and restored ONNX pipeline.
- Installed dependencies for ONNX Runtime Web (npm install).
- Added live camera capture component with start/switch/capture/stop controls and styling.
- Added model status card with load timing, provider selection, and retry.
- Added result probability bars and explanation text.
- Added history detail modal, per-record delete, and CSV export.
- Added model metadata loading via public/model-info.json.
- Fixed RecognitionPage JSX by wrapping the modal and main section in a fragment.
- Reworked Recognize page into camera-first layout with simplified upload entry.
- Removed model status card and CSV export; moved history into a dedicated page.
- Added result bottom sheet for mobile-friendly feedback.
- Added optional access gate and deployment documentation.
- Added mobile bottom navigation and hid the top nav on narrow screens.
- Added preview clear button and removed the reset action from recognition controls.
- Persisted history thumbnails as base64 data URLs instead of object URLs.
- Guarded camera `video.play()` to prevent interrupted play errors.
