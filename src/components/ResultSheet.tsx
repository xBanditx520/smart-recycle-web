import { useState } from 'react';
import type { PredictionResult } from '../types/recycle';

const DISPOSAL_TIPS: Record<string, string> = {
  Battery:
    'Drop at an e-waste collection point (Giant, AEON, or your local council scheduled collection). Never throw in a regular bin — batteries contain toxic heavy metals.',
  Biological:
    'Compost vegetable and food scraps if possible. Otherwise, seal in a bag and dispose as general waste. Never mix with recyclables.',
  Cardboard:
    'Flatten before placing in the blue recycling bin (tong kitar semula). Remove tape and plastic windows. Wet or heavily soiled cardboard goes to general waste.',
  Clothes:
    'Donate wearable items to Salvation Army, Junk Trunk, or charity bins. H&M and Uniqlo stores also accept worn clothing for recycling.',
  Glass:
    'Rinse clean. Glass bottles and jars are accepted at most Malaysian recycling centres. Wrap any broken glass in newspaper before disposal for safety.',
  Metal:
    'Rinse and crush cans before recycling. Accepted at scrap dealers and most public recycling bins. Aluminium cans have high value — always recycle.',
  Paper:
    'Keep dry. Remove plastic windows from envelopes. Widely accepted at blue recycling bins and scheduled kitar semula collections.',
  Plastic:
    'Check the resin code on the bottom. Codes 1 (PET) and 2 (HDPE) are most widely accepted in Malaysia. Rinse clean and remove caps if possible.',
  Shoes:
    'Donate wearable pairs to charity. Adidas and Nike stores accept worn shoes for recycling in-store. Otherwise, dispose as bulky waste.',
  Trash:
    'Dispose as general waste. Before discarding, check if any metal or clean plastic parts can be separated for recycling.',
  recyclable:
    'Place in the blue recycling bin (tong kitar semula). Ensure the item is clean and dry — contaminated recyclables end up in landfill.',
  'non-recyclable':
    'Dispose in the general waste bin. If unsure about an item, contact your local council (pihak berkuasa tempatan) for guidance.'
};

function getDisposalTip(label: string): string {
  return DISPOSAL_TIPS[label] ?? 'Check with your nearest recycling centre for the correct disposal method.';
}

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

export default function ResultSheet({ result, previewUrl, onClose, onRetake }: ResultSheetProps) {
  const [isClosing, setIsClosing] = useState(false);

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
            <h2 className="overlay-label-text">{displayLabel}</h2>
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
            {topClasses.slice(0, isComposite ? 2 : 3).map((item) => (
              <div key={item.label} className="overlay-class-row">
                <span>{item.label}</span>
                <div className="overlay-class-bar-track">
                  <div
                    className="overlay-class-bar-fill"
                    style={{ width: `${(item.confidence * 100).toFixed(1)}%` }}
                  />
                </div>
                <strong>{(item.confidence * 100).toFixed(0)}%</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="disposal-card">
          <p className="section-label">Disposal Guidance</p>
          <p className="disposal-tip">{disposalTip}</p>
        </div>

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
