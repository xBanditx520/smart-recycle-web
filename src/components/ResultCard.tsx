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

  const isRecyclable = result.label === 'recyclable';
  const confidence = Math.round(result.confidence * 100);
  const recyclablePercent = Math.round(result.probabilities[1] * 100);
  const nonRecyclablePercent = Math.round(result.probabilities[0] * 100);

  return (
    <section className={`result-card ${isRecyclable ? 'result-card-positive' : 'result-card-negative'}`}>
      <p className="section-label">Result</p>
      <div className="result-headline">
        <h3>{isRecyclable ? 'Recyclable' : 'Non-recyclable'}</h3>
        <span className="confidence-pill">{confidence}% confidence</span>
      </div>
      <p className="result-summary">
        Model inference completed in {result.inferenceMs.toFixed(0)} ms.
      </p>
      <div className="probability-grid">
        <div>
          <span>Non-recyclable</span>
          <strong>{nonRecyclablePercent}%</strong>
        </div>
        <div>
          <span>Recyclable</span>
          <strong>{recyclablePercent}%</strong>
        </div>
      </div>
    </section>
  );
}
