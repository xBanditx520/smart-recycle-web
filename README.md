# Smart Recycle Web

A React + Vite FYP project for recyclable waste classification with real browser inference.

## Recommended stack

- React + Vite + TypeScript
- ONNX Runtime Web for browser inference
- LocalStorage for optional prediction history

## Why ONNX Runtime Web

- Stable for browser-side inference and easy to deploy with Vite
- Works well for a binary classifier that outputs two probabilities
- Lets you host the model locally or via a static URL without a backend

## Project structure

```text
smart-recycle-web/
  public/
    models/
      recycle-classifier.onnx
  src/
    components/
    constants/
    lib/
    pages/
    types/
    App.tsx
    main.tsx
    styles.css
```

## Model format and loading

- Supported for this app: `.onnx`
- Local file path: `public/models/recycle-classifier.onnx`
- Hosted file: set `VITE_MODEL_URL=https://your-host/model.onnx`
- Input requirements: RGB, 224x224, ImageNet mean/std normalization
- Output requirements: 2 values where index 0 = non-recyclable and index 1 = recyclable

## If your source model is `.tflite`

A `.tflite` file cannot be used directly in this web app.

Recommended conversion path:

1. Convert the TensorFlow Lite model to TensorFlow SavedModel or TensorFlow Keras format if possible.
2. Export to ONNX with a conversion tool such as `tf2onnx`, or export a TensorFlow model and convert to TensorFlow.js graph model.
3. Place the resulting `.onnx` file in `public/models/` or host it on a static URL.

If your training pipeline only outputs `.tflite`, convert outside the web app first. The browser runtime here expects ONNX for the most stable flow.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Open the app, go to the Recognize page, upload an image, and click Recognize.

## MVP validation checklist

- Home page loads
- Model preload status shows ready or error
- Image upload preview appears
- Recognize button runs real inference
- Result card shows recyclable / non-recyclable with confidence
- Invalid file and model load errors are shown clearly
- Optional history is persisted in LocalStorage

## GitHub connection for future push

If this folder is not yet a git repo, run:

```bash
git init
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git add .
git commit -m "Initial Smart Recycle Web app"
git push -u origin main
```

If the repo already exists locally, only set the remote and push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

For future updates:

```bash
git add .
git commit -m "Describe your change"
git push
```
