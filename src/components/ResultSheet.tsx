import type { PredictionResult } from '../types/recycle';

interface ResultSheetProps {
  result: PredictionResult;
  onClose: () => void;
  onRetake: () => void;
}

export default function ResultSheet({ result, onClose, onRetake }: ResultSheetProps) {
  const isBinary = result.label === 'recyclable' || result.label === 'non-recyclable';
  const isRecyclable = result.label === 'recyclable';
  const topClasses = result.topClasses ?? [];

  return (
    <div
      className={`sheet-backdrop ${isRecyclable ? 'sheet-positive' : 'sheet-negative'}`}
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="sheet-card" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div>
            <p className="section-label">Recognition result</p>
            <h3>{isRecyclable ? 'Recyclable' : 'Non-recyclable'}</h3>
          </div>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Close result">
            ×
          </button>
        </div>
        {isBinary ? (
          <>
            <p className="sheet-summary">
              {isRecyclable
                ? 'Place it in the recyclable bin if it is clean and dry.'
                : 'Dispose as general waste if it is contaminated.'}
            </p>
            <p className="sheet-confidence">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
          </>
        ) : (
          <>
            <p className="sheet-summary">Top predictions</p>
            <ol className="sheet-toplist">
              {topClasses.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{(item.confidence * 100).toFixed(0)}%</strong>
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="sheet-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Done
          </button>
          <button className="primary-button" type="button" onClick={onRetake}>
            Recognize again
          </button>
        </div>
      </div>
    </div>
  );
}
