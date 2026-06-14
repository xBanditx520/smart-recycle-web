import type { PredictionResult } from '../types/recycle';

interface ResultSheetProps {
  result: PredictionResult;
  previewUrl?: string | null;
  onClose: () => void;
  onRetake: () => void;
}

function getTrashTip(label: string) {
  if (label === 'Trash') {
    return 'If this is styrofoam or a foam lunch box, clear food residue first and dispose it as trash; it is usually not recycled locally.';
  }
  return '';
}

export default function ResultSheet({ result, previewUrl, onClose, onRetake }: ResultSheetProps) {
  const isBinary = result.label === 'recyclable' || result.label === 'non-recyclable';
  const isRecyclable = result.label === 'recyclable';
  const isComposite = Boolean(result.isComposite);
  const topClasses = result.topClasses ?? [];
  const primaryClass = topClasses[0];
  const secondaryClass = topClasses[1];
  const secondaryHighEnough = Boolean(secondaryClass && secondaryClass.confidence > 0.2);
  const compositeHint =
    isComposite && primaryClass && secondaryClass
      ? `Detected mixed content. Suggested handling: 1. Remove the ${secondaryClass.label.toLowerCase()} part first if possible. 2. Treat the ${primaryClass.label.toLowerCase()} part according to its own disposal rule.`
      : '';

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
            <h3>{isComposite ? 'Composite Item' : isRecyclable ? 'Recyclable' : isBinary ? 'Non-recyclable' : result.label}</h3>
          </div>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Close result">
            ×
          </button>
        </div>
        {previewUrl ? (
          <figure className="sheet-preview">
            <img src={previewUrl} alt="Captured preview" />
          </figure>
        ) : null}
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
            <p className="sheet-summary">{isComposite ? compositeHint : 'Top predictions'}</p>
            <ol className="sheet-toplist">
              {topClasses.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{(item.confidence * 100).toFixed(0)}%</strong>
                </li>
              ))}
            </ol>
            {!isComposite && primaryClass ? (
              <p className="sheet-confidence">Primary confidence: {(primaryClass.confidence * 100).toFixed(0)}%</p>
            ) : null}
            {secondaryHighEnough && primaryClass && secondaryClass ? (
              <p className="sheet-confidence">Secondary confidence: {(secondaryClass.confidence * 100).toFixed(0)}%</p>
            ) : null}
            {isComposite && secondaryClass ? (
              <p className="sheet-summary">{getTrashTip(secondaryClass.label) || getTrashTip(primaryClass?.label ?? '')}</p>
            ) : null}
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
