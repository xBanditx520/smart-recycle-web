import { useState } from 'react';
import { getDisposalTip, getRecyclability } from '../constants/disposal';
import { saveFeedback } from '../lib/feedback';
import { GEMINI_AVAILABLE, analyzeWithGemini } from '../lib/gemini';
import type { GeminiAnalysis } from '../lib/gemini';
import type { PredictionResult } from '../types/recycle';

const RANK_COLORS = ['#0ea05b', '#22a6b3', '#eab308', '#f97316', '#94a3b8'];

function ConfidenceRing({ value }: { value: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value);
  return (
    <svg className="confidence-ring-svg" width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(15,23,42,0.1)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#0ea05b"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dy="0.35em"
        fontSize="16"
        fontWeight="700"
        fill="#10203a"
        fontFamily="'Space Grotesk', sans-serif"
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

interface ResultSheetProps {
  result: PredictionResult;
  previewUrl?: string | null;
  onClose: () => void;
  onRetake: () => void;
}

type GeminiState = 'idle' | 'loading' | 'done' | 'error';
type ContributeState = 'idle' | 'saved';

export default function ResultSheet({ result, previewUrl, onClose, onRetake }: ResultSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [geminiState, setGeminiState] = useState<GeminiState>('idle');
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysis | null>(null);
  const [contributeState, setContributeState] = useState<ContributeState>('idle');

  const isBinary = result.label === 'recyclable' || result.label === 'non-recyclable';
  const isRecyclable = result.label === 'recyclable';
  const isComposite = Boolean(result.isComposite);
  const topClasses = result.topClasses ?? [];
  const primaryClass = topClasses[0];
  const secondaryClass = topClasses[1];

  const displayLabel = isComposite
    ? 'Composite Item'
    : isBinary
      ? isRecyclable
        ? 'Recyclable'
        : 'Non-recyclable'
      : result.label;

  const primaryRecyclability = !isBinary && !isComposite ? getRecyclability(result.label) : null;

  const disposalTip =
    isComposite && primaryClass && secondaryClass
      ? `Remove the ${secondaryClass.label.toLowerCase()} component first if possible, then handle the ${primaryClass.label.toLowerCase()} part separately. ${getDisposalTip(primaryClass.label)}`
      : getDisposalTip(result.label);

  function close() {
    setIsClosing(true);
    setTimeout(onClose, 260);
  }

  function retake() {
    setIsClosing(true);
    setTimeout(onRetake, 260);
  }

  async function handleAskGemini() {
    if (!previewUrl || geminiState !== 'idle') return;
    setGeminiState('loading');
    try {
      const analysis = await analyzeWithGemini(previewUrl);
      setGeminiResult(analysis);
      setGeminiState('done');
    } catch {
      setGeminiState('error');
    }
  }

  async function handleContribute() {
    if (!previewUrl || contributeState === 'saved') return;
    await saveFeedback({
      imageUrl: previewUrl,
      predictedLabel: result.label,
      confidence: result.confidence,
      geminiLabel: geminiResult?.category,
      mode: 'advanced',
    }).catch(() => {});
    setContributeState('saved');
  }

  const showGeminiButton = GEMINI_AVAILABLE && previewUrl && geminiState === 'idle';

  return (
    <div
      className={`result-overlay${isClosing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Analysis result"
    >
      <header className="overlay-header">
        <button className="overlay-back" type="button" onClick={close} aria-label="Go back">
          ←
        </button>
        <p className="overlay-title">Analysis Result</p>
        <div className="overlay-header-spacer" />
      </header>

      {previewUrl ? (
        <figure className="overlay-preview">
          <img src={previewUrl} alt="Captured image" />
        </figure>
      ) : null}

      <div className="overlay-body">
        <div className="overlay-result-row">
          <div className="overlay-label-group">
            <p className="section-label">
              {isComposite ? 'Mixed Material' : isBinary ? 'Classification' : 'Category'}
            </p>
            <h2 className="overlay-label-text">
              {displayLabel}
              {primaryRecyclability ? <span className="recyclability-tag">({primaryRecyclability})</span> : null}
            </h2>
            {isComposite && primaryClass && secondaryClass ? (
              <p className="overlay-sub">
                {primaryClass.label} + {secondaryClass.label}
              </p>
            ) : null}
          </div>
          <ConfidenceRing value={result.confidence} />
        </div>

        {!isBinary && topClasses.length > 0 ? (
          <div className="overlay-classes">
            {topClasses.slice(0, isComposite ? 2 : 5).map((item, index) => {
              const recyclability = getRecyclability(item.label);
              const color = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1];
              return (
                <div key={item.label} className="overlay-class-row">
                  <span>
                    {item.label}
                    {recyclability ? <span className="recyclability-tag">({recyclability})</span> : null}
                  </span>
                  <div className="overlay-class-bar-track">
                    <div
                      className="overlay-class-bar-fill"
                      style={{ width: `${(item.confidence * 100).toFixed(1)}%`, background: color }}
                    />
                  </div>
                  <strong>{(item.confidence * 100).toFixed(0)}%</strong>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="disposal-card">
          <p className="section-label">Disposal Guidance</p>
          <p className="disposal-tip">{disposalTip}</p>
        </div>

        {/* Gemini AI second opinion */}
        <div className="gemini-section">
          {showGeminiButton ? (
            <button className="gemini-ask-btn" type="button" onClick={handleAskGemini}>
              Results not accurate? Ask Gemini AI →
            </button>
          ) : null}

          {geminiState === 'loading' ? (
            <div className="gemini-loading">
              <span className="gemini-spinner" />
              Analyzing with Gemini AI...
            </div>
          ) : null}

          {geminiState === 'done' && geminiResult ? (
            <div className="gemini-result-card">
              <div className="gemini-result-header">
                <span className="gemini-badge">Gemini AI</span>
                <span className="gemini-result-label">{geminiResult.category}</span>
                <span className="recyclability-tag">
                  ({geminiResult.recyclable ? 'Recyclable' : 'Non-recyclable'})
                </span>
              </div>
              <p className="gemini-result-reason">{geminiResult.reason}</p>
              <span className="gemini-confidence-tag">Confidence: {geminiResult.confidence}</span>
            </div>
          ) : null}

          {geminiState === 'error' ? (
            <p className="gemini-error">
              Gemini unavailable — image saved for offline review.
            </p>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="contribute-section">
            {contributeState === 'idle' ? (
              <button className="contribute-btn" type="button" onClick={handleContribute}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Help improve the model — contribute this image
              </button>
            ) : (
              <p className="contribute-saved">
                ✓ Image saved locally for model improvement. Thank you!
              </p>
            )}
          </div>
        ) : null}

        <div className="overlay-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Done
          </button>
          <button className="primary-button" type="button" onClick={retake}>
            Recognize again
          </button>
        </div>
      </div>
    </div>
  );
}
