import { useEffect, useMemo, useRef, useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import ResultSheet from '../components/ResultSheet';
import { ADVANCED_MODEL_URL } from '../constants/recycle';
import { loadHistory, saveHistory } from '../lib/history';
import { loadModel, resetModel, runPrediction } from '../lib/model';
import type { PredictionRecord, PredictionResult } from '../types/recycle';

// Must match alphabetical folder order from training (ImageFolder sorts A-Z)
const ADVANCED_LABELS = [
  'Bulky_Furniture', 'E_Waste', 'Fabric_Shoes', 'General_Trash',
  'Glass', 'Metal', 'Organic_Waste', 'Paper_Cardboard', 'Plastic',
];

function createPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

async function createHistoryThumbnail(file: File) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const objectUrl = URL.createObjectURL(file);
    element.onload = () => { URL.revokeObjectURL(objectUrl); resolve(element); };
    element.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Invalid image file.')); };
    element.src = objectUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported in this browser.');
  context.drawImage(image, 0, 0, 224, 224);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export default function RecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [modelError, setModelError] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [modelLoadMs, setModelLoadMs] = useState<number | null>(null);
  const [source, setSource] = useState<'upload' | 'camera' | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasFile = Boolean(file);

  useEffect(() => {
    let active = true;
    const initModel = async () => {
      setModelState('loading');
      setModelError('');
      setModelLoadMs(null);
      try {
        const headResp = await fetch(ADVANCED_MODEL_URL, { method: 'HEAD' });
        if (!headResp.ok) throw new Error(`Model file not found at ${ADVANCED_MODEL_URL}.`);
        const startedAt = performance.now();
        await loadModel(ADVANCED_MODEL_URL);
        if (active) {
          setModelState('ready');
          setModelLoadMs(performance.now() - startedAt);
        }
      } catch (loadError) {
        if (active) {
          setModelState('error');
          setModelError(loadError instanceof Error ? loadError.message : 'Model load failed.');
        }
      }
    };
    initModel();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const statusText = useMemo(() => {
    if (modelState === 'ready') return 'Model loaded';
    if (modelState === 'error') return 'Model not loaded';
    return 'Loading model...';
  }, [modelState]);

  function resetFeedback() {
    setError('');
    setMessage('');
    setCameraError('');
  }

  async function recognizeFile(fileToRecognize: File, fileSource: 'upload' | 'camera') {
    if (modelState !== 'ready') {
      setError('Model is not loaded yet.');
      return;
    }
    setIsPredicting(true);
    resetFeedback();
    try {
      const prediction = await runPrediction(fileToRecognize, ADVANCED_MODEL_URL, 'wasm', ADVANCED_LABELS);
      const topClasses = prediction.probabilities
        .map((value, index) => ({
          label: ADVANCED_LABELS[index] ?? `Class ${index + 1}`,
          confidence: value,
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
      prediction.classLabels = ADVANCED_LABELS;
      prediction.topClasses = topClasses;

      const historyPreview = await createHistoryThumbnail(fileToRecognize);
      setResult(prediction);
      localStorage.setItem('sr-last-inference-ms', Math.round(prediction.inferenceMs).toString());
      setMessage(`Prediction finished in ${prediction.inferenceMs.toFixed(0)} ms.`);

      const record: PredictionRecord = {
        id: crypto.randomUUID(),
        fileName: fileToRecognize.name,
        previewUrl: historyPreview,
        createdAt: new Date().toISOString(),
        source: fileSource,
        ...prediction,
      };
      saveHistory([record, ...loadHistory()].slice(0, 20));
    } catch (predictionError) {
      const text = predictionError instanceof Error ? predictionError.message : 'Inference failed.';
      setError(text.includes('Invalid image') ? 'Invalid image file.' : 'Inference failed.');
    } finally {
      setIsPredicting(false);
    }
  }

  function handleFile(fileInput: File | null, fileSource: 'upload' | 'camera' = 'upload') {
    resetFeedback();
    if (!fileInput) {
      setFile(null);
      setPreviewUrl(null);
      setResult(null);
      setSource(null);
      return;
    }
    if (!fileInput.type.startsWith('image/')) {
      setError('Invalid image file.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(fileInput);
    setPreviewUrl(createPreviewUrl(fileInput));
    setResult(null);
    setSource(fileSource);

    // Auto-recognize immediately on camera capture
    if (fileSource === 'camera' && modelState === 'ready') {
      recognizeFile(fileInput, 'camera');
    }
  }

  function handleRecognize() {
    if (!file) { setError('Please upload an image first.'); return; }
    recognizeFile(file, source ?? 'upload');
  }

  function handleCloseResult() {
    setResult(null);
    handleFile(null);
  }

  function handleRetryModel() {
    resetModel();
    setModelState('loading');
    setModelError('');
    setModelLoadMs(null);
    const startedAt = performance.now();
    loadModel(ADVANCED_MODEL_URL)
      .then(() => { setModelState('ready'); setModelLoadMs(performance.now() - startedAt); })
      .catch((loadError) => {
        setModelState('error');
        setModelError(loadError instanceof Error ? loadError.message : 'Model load failed.');
      });
  }

  return (
    <>
      <section className="content-section recognition-stack">
        <div className="upload-card">
          <div className="section-head">
            <div>
              <p className="section-label">Recognize</p>
              <h2>Capture a waste image</h2>
              <p className="model-hint">
                {modelState === 'ready' && modelLoadMs ? `Model ready in ${modelLoadMs.toFixed(0)} ms.` : ''}
              </p>
            </div>
            <div className="status-stack">
              <span className={`status-pill ${modelState}`}>{statusText}</span>
              {modelState === 'error' ? (
                <button className="secondary-button" type="button" onClick={handleRetryModel}>
                  Retry
                </button>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            id="image-input"
            type="file"
            accept="image/*"
            className="hidden-input"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null, 'upload')}
          />

          <CameraCapture
            onCapture={(capturedFile) => handleFile(capturedFile, 'camera')}
            onError={(messageText) => setCameraError(messageText)}
            onUploadClick={() => fileInputRef.current?.click()}
            disabled={isPredicting}
          />

          {error ? <div className="feedback error">{error}</div> : null}
          {cameraError ? <div className="feedback error">{cameraError}</div> : null}
          {modelState === 'error' && modelError ? <div className="feedback error">{modelError}</div> : null}
          {message ? <div className="feedback success">{message}</div> : null}

          {previewUrl ? (
            <div className="preview-wrapper">
              <figure className="preview-card preview-compact">
                <img src={previewUrl} alt="Selected preview" />
                <figcaption>{file?.name}</figcaption>
              </figure>
              <button className="preview-clear" type="button" onClick={() => handleFile(null)} aria-label="Remove image">
                ✕
              </button>
            </div>
          ) : (
            <div className="preview-card preview-empty">
              <p>No image selected yet.</p>
            </div>
          )}

          <div className="recognize-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleRecognize}
              disabled={!hasFile || isPredicting}
            >
              {isPredicting ? 'Recognizing...' : 'Recognize'}
            </button>
          </div>
        </div>
      </section>

      {result ? (
        <ResultSheet
          result={result}
          previewUrl={previewUrl}
          onClose={handleCloseResult}
          onRetake={() => { setResult(null); handleFile(null); }}
        />
      ) : null}
    </>
  );
}
