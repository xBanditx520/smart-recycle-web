import { useEffect, useMemo, useRef, useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import ResultSheet from '../components/ResultSheet';
import { ADVANCED_MODEL_URL, DEFAULT_MODEL_URL } from '../constants/recycle';
import { loadHistory, saveHistory } from '../lib/history';
import { loadModel, resetModel, runPrediction } from '../lib/model';
import type { PredictionRecord, PredictionResult } from '../types/recycle';

function createPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

async function createHistoryThumbnail(file: File) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const objectUrl = URL.createObjectURL(file);
    element.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };
    element.src = objectUrl;
  });

  const canvas = document.createElement('canvas');
  const size = 224;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported in this browser.');
  }

  context.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export default function RecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [modelError, setModelError] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [modelLoadMs, setModelLoadMs] = useState<number | null>(null);
  const [source, setSource] = useState<'upload' | 'camera' | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modeTimerRef = useRef<number | null>(null);

  const advancedLabels = useMemo(
    () => ['Battery', 'Biological', 'Cardboard', 'Clothes', 'Glass', 'Metal', 'Paper', 'Plastic', 'Shoes', 'Trash'],
    []
  );

  const hasFile = Boolean(file);

  const activeModelUrl = isAdvancedMode ? ADVANCED_MODEL_URL : DEFAULT_MODEL_URL;

  useEffect(() => {
    let active = true;

    const initModel = async () => {
      setModelState('loading');
      setModelError('');
      setModelLoadMs(null);

      try {
        const response = await fetch(activeModelUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Model file not found at ${activeModelUrl}.`);
        }

        const startedAt = performance.now();
        await loadModel(activeModelUrl);
        const loadDuration = performance.now() - startedAt;

        if (active) {
          setModelState('ready');
          setModelError('');
          setModelLoadMs(loadDuration);
        }
      } catch (loadError) {
        if (active) {
          const text = loadError instanceof Error ? loadError.message : 'Model load failed.';
          setModelState('error');
          setModelError(text);
        }
      }
    };

    initModel();

    return () => {
      active = false;
    };
  }, [activeModelUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (modeTimerRef.current) {
        window.clearTimeout(modeTimerRef.current);
      }
    };
  }, []);

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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(fileInput);
    setPreviewUrl(createPreviewUrl(fileInput));
    setResult(null);
    setSource(fileSource);
  }

  function handleModeChange(nextMode: boolean) {
    if (isPredicting || isSwitchingMode || nextMode === isAdvancedMode) {
      return;
    }

    setIsSwitchingMode(true);
    setResult(null);
    if (modeTimerRef.current) {
      window.clearTimeout(modeTimerRef.current);
    }
    modeTimerRef.current = window.setTimeout(() => {
      setIsAdvancedMode(nextMode);
      setIsSwitchingMode(false);
    }, 800);
  }

  function handleCloseResult() {
    setResult(null);
    handleFile(null);
  }

  async function handleRecognize() {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }

    if (modelState !== 'ready') {
      setError('Model is not loaded yet.');
      return;
    }

    setIsPredicting(true);
    resetFeedback();

    try {
      const prediction = await runPrediction(file, activeModelUrl, 'wasm', isAdvancedMode ? advancedLabels : undefined);
      if (isAdvancedMode) {
        const topClasses = prediction.probabilities
          .map((value, index) => ({
            label: advancedLabels[index] ?? `Class ${index + 1}`,
            confidence: value
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);
        prediction.classLabels = advancedLabels;
        prediction.topClasses = topClasses;
      }
      const historyPreview = await createHistoryThumbnail(file);
      setResult(prediction);
      setMessage(`Prediction finished in ${prediction.inferenceMs.toFixed(0)} ms.`);
      const record: PredictionRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        previewUrl: historyPreview,
        createdAt: new Date().toISOString(),
        source: source ?? 'upload',
        ...prediction
      };
      saveHistory([record, ...loadHistory()].slice(0, 20));
    } catch (predictionError) {
      const text = predictionError instanceof Error ? predictionError.message : 'Inference failed.';
      setError(text.includes('Invalid image') ? 'Invalid image file.' : 'Inference failed.');
    } finally {
      setIsPredicting(false);
    }
  }

  function handleRetryModel() {
    resetModel();
    setModelState('loading');
    setModelError('');
    setModelLoadMs(null);
    const startedAt = performance.now();
    loadModel(activeModelUrl)
      .then(() => {
        setModelState('ready');
        setModelLoadMs(performance.now() - startedAt);
      })
      .catch((loadError) => {
        const text = loadError instanceof Error ? loadError.message : 'Model load failed.';
        setModelState('error');
        setModelError(text);
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
            capture="environment"
            className="hidden-input"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null, 'upload')}
          />

          <div className="mode-toggle">
            <div className="mode-toggle-track">
              <span className={`mode-toggle-indicator ${isAdvancedMode ? 'advanced' : 'basic'}`} />
              <button
                className={isAdvancedMode ? 'mode-toggle-button' : 'mode-toggle-button active'}
                type="button"
                onClick={() => handleModeChange(false)}
                disabled={isPredicting || isSwitchingMode}
              >
                Basic
              </button>
              <button
                className={isAdvancedMode ? 'mode-toggle-button active' : 'mode-toggle-button'}
                type="button"
                onClick={() => handleModeChange(true)}
                disabled={isPredicting || isSwitchingMode}
              >
                Advanced
              </button>
            </div>
            <p className="mode-toggle-caption">
              {isAdvancedMode ? 'Deep Analysis' : 'Quick Scan'}
            </p>
          </div>

          {isSwitchingMode ? <div className="mode-toast">Switching model...</div> : null}

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
            <button className="primary-button" type="button" onClick={handleRecognize} disabled={!hasFile || isPredicting}>
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
          onRetake={() => {
            setResult(null);
            handleFile(null);
          }}
        />
      ) : null}
    </>
  );
}
