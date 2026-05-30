import { useEffect, useMemo, useState } from 'react';
import HistoryList from '../components/HistoryList';
import ResultCard from '../components/ResultCard';
import { DEFAULT_MODEL_URL } from '../constants/recycle';
import { loadHistory, saveHistory } from '../lib/history';
import { loadModel, runPrediction } from '../lib/model';
import type { PredictionRecord, PredictionResult } from '../types/recycle';

function createPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export default function RecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>(() => loadHistory());
  const [isPredicting, setIsPredicting] = useState(false);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const hasFile = Boolean(file);

  useEffect(() => {
    let active = true;

    loadModel(DEFAULT_MODEL_URL)
      .then(() => {
        if (active) {
          setModelState('ready');
        }
      })
      .catch(() => {
        if (active) {
          setModelState('error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const statusText = useMemo(() => {
    if (modelState === 'ready') return 'Model loaded';
    if (modelState === 'error') return 'Model not loaded';
    return 'Loading model...';
  }, [modelState]);

  function resetFeedback() {
    setError('');
    setMessage('');
  }

  function handleFile(fileInput: File | null) {
    resetFeedback();

    if (!fileInput) {
      setFile(null);
      setPreviewUrl(null);
      setResult(null);
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
  }

  async function handleRecognize() {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }

    setIsPredicting(true);
    resetFeedback();

    try {
      const prediction = await runPrediction(file, DEFAULT_MODEL_URL);
      setResult(prediction);
      setMessage(`Prediction finished in ${prediction.inferenceMs.toFixed(0)} ms.`);
      const record: PredictionRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        previewUrl: previewUrl ?? createPreviewUrl(file),
        createdAt: new Date().toISOString(),
        ...prediction
      };
      setHistory((current) => [record, ...current].slice(0, 20));
    } catch (predictionError) {
      const text = predictionError instanceof Error ? predictionError.message : 'Inference failed.';
      setError(text.includes('Invalid image') ? 'Invalid image file.' : 'Inference failed.');
    } finally {
      setIsPredicting(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <section className="content-section recognition-grid">
      <div className="upload-card">
        <div className="section-head">
          <div>
            <p className="section-label">Recognize</p>
            <h2>Upload or capture a waste image</h2>
          </div>
          <span className={`status-pill ${modelState}`}>{statusText}</span>
        </div>

        <div
          className={`drop-zone ${hasFile ? 'has-file' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <input
            id="image-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          <label htmlFor="image-input" className="drop-label">
            <span>Drop an image here or click to choose</span>
            <strong>JPEG, PNG, WebP</strong>
          </label>
        </div>

        <div className="control-row">
          <button className="primary-button" type="button" onClick={handleRecognize} disabled={!hasFile || isPredicting}>
            {isPredicting ? 'Recognizing...' : 'Recognize'}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => handleFile(null)}
            disabled={!hasFile || isPredicting}
          >
            Reset
          </button>
        </div>

        {error ? <div className="feedback error">{error}</div> : null}
        {message ? <div className="feedback success">{message}</div> : null}

        {previewUrl ? (
          <figure className="preview-card">
            <img src={previewUrl} alt="Uploaded preview" />
            <figcaption>{file?.name}</figcaption>
          </figure>
        ) : (
          <div className="preview-card preview-empty">
            <p>No image selected yet.</p>
          </div>
        )}
      </div>

      <div className="result-column">
        <ResultCard result={result} />
        <HistoryList records={history} onClear={clearHistory} />
      </div>
    </section>
  );
}
