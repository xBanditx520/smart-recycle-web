import type { PredictionResult } from '../types/recycle';

interface ResultCardProps {
  result: PredictionResult | null;
}

export default function ResultCard({ result }: ResultCardProps) {
  if (!result) {
    return (
      <section className="result-card result-card-empty">
        <p className="section-label">Result</p>
        <h3>No prediction yet</h3>
        <p>Upload a photo, then press Recognize to run the model.</p>
      </section>
    );
  }

  const isBinary = result.label === 'recyclable' || result.label === 'non-recyclable';
  const isRecyclable = result.label === 'recyclable';
  const isComposite = Boolean(result.isComposite);
  const confidence = Math.round(result.confidence * 100);
  const recyclablePercent = Math.round((result.probabilities[1] ?? 0) * 100);
  const nonRecyclablePercent = Math.round((result.probabilities[0] ?? 0) * 100);
  const topClasses = result.topClasses ?? [];

  return (
    <section className={`result-card ${isRecyclable ? 'result-card-positive' : 'result-card-negative'}`}>
      <p className="section-label">Result</p>
      <div className="result-headline">
        <h3>{isComposite ? 'Composite Item' : isBinary ? (isRecyclable ? 'Recyclable' : 'Non-recyclable') : result.label}</h3>
        <span className="confidence-pill">{confidence}% confidence</span>
      </div>
      <p className="result-summary">Model inference completed in {result.inferenceMs.toFixed(0)} ms.</p>
      {isBinary ? (
        <>
          <p className="result-explanation">
            {isRecyclable
              ? 'High recyclable probability indicates clean material with predictable texture.'
              : 'Non-recyclable probability is higher, suggesting mixed or contaminated material.'}
          </p>
          <div className="probability-grid">
            <div>
              <span>Non-recyclable</span>
              <strong>{nonRecyclablePercent}%</strong>
              <div className="probability-bar">
                <span className="bar-fill" style={{ width: `${nonRecyclablePercent}%` }} />
              </div>
            </div>
            <div>
              <span>Recyclable</span>
              <strong>{recyclablePercent}%</strong>
              <div className="probability-bar">
                <span className="bar-fill" style={{ width: `${recyclablePercent}%` }} />
              </div>
            </div>
          </div>
        </>
      ) : isComposite ? (
        <div className="result-composite">
          <p className="result-explanation">Detected mixed content. Review the top 2 classes below before disposal.</p>
          <ol className="sheet-toplist">
            {topClasses.slice(0, 2).map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{(item.confidence * 100).toFixed(0)}%</strong>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
