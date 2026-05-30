import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Real inference',
    description: 'Runs an ONNX model directly in the browser. No mock score, no fake demo output.'
  },
  {
    title: 'Camera-ready',
    description: 'Works with upload and mobile camera capture so the flow feels native on web.'
  },
  {
    title: 'Transparent output',
    description: 'Shows both class probabilities and the final decision so the result is easy to explain.'
  }
] as const;

export default function HomePage() {
  return (
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Final Year Project</p>
        <h2>Smart Recycle Web App</h2>
        <p className="hero-text">
          Upload a waste image or take a photo, then classify it into recyclable or non-recyclable with real model
          inference inside the browser.
        </p>

        <div className="hero-actions">
          <Link to="/recognize" className="primary-button">
            Start Recognizing
          </Link>
          <Link to="/about" className="secondary-button">
            View Model Flow
          </Link>
        </div>

        <div className="hero-metrics">
          <div>
            <strong>2-class</strong>
            <span>Binary output</span>
          </div>
          <div>
            <strong>224x224</strong>
            <span>Model input size</span>
          </div>
          <div>
            <strong>ImageNet</strong>
            <span>Normalization pipeline</span>
          </div>
        </div>
      </div>

      <div className="hero-panel">
        <div className="floating-card primary">
          <span className="card-kicker">Live pipeline</span>
          <strong>Image → Preprocess → ONNX → Result</strong>
          <p>All steps run locally in the browser once the model is loaded.</p>
        </div>

        <div className="highlight-stack">
          {highlights.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
