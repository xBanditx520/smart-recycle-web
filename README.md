# Smart Recycle Web

A React + Vite FYP project for recyclable waste classification with real browser inference.

## Recommended stack

- React + Vite + TypeScript
- ONNX Runtime Web for browser inference
- LocalStorage for optional prediction history

## Why ONNX Runtime Web

- Runs ONNX models directly in the browser with no backend
- Fits the binary classifier output pattern (2 values)
- Simple deployment by hosting the model in `public/` or a static URL

## Project structure

```text
smart-recycle-web/
  public/
    waste_model.onnx
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
- Local file path: `public/waste_model.onnx`
- Hosted file: set `VITE_MODEL_URL=https://your-host/waste_model.onnx`
- Input requirements: RGB, 224x224, ImageNet mean/std normalization
- Output requirements: 2 values where index 0 = non-recyclable and index 1 = recyclable


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

## Deployment

### Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Set build command to `npm run build` and output to `dist`.
4. Add environment variables if needed (see `.env.example`).

### Netlify

1. Push this repo to GitHub.
2. Create a new site in Netlify from the repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables if needed (see `.env.example`).

## Optional access control

Set `VITE_ACCESS_CODE` in your environment to enable a simple client-side access gate.
This is meant for demo protection only and should not be treated as secure authentication.

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
