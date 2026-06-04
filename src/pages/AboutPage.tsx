const steps = [
  'User uploads or captures an image.',
  'The browser resizes it to 224x224 and applies ImageNet normalization.',
  'ONNX Runtime Web executes the classifier in the browser.',
  'The app converts two output scores into recyclable / non-recyclable probabilities.'
] as const;

export default function AboutPage() {
  return (
    <section className="content-section">
      <header className="section-hero">
        <p className="eyebrow">About</p>
        <h2>Project background and model flow</h2>
        <p>
          This project is designed as a practical FYP prototype for waste sorting. The browser handles image capture,
          preprocessing, inference, result rendering, and history storage without relying on mock results.
        </p>
      </header>

      <div className="info-grid">
        <article className="info-card">
          <h3>Recommended stack</h3>
          <p>React + Vite + TypeScript + ONNX Runtime Web.</p>
        </article>
        <article className="info-card">
          <h3>Model input</h3>
          <p>RGB image, 224x224, normalized with ImageNet mean and standard deviation.</p>
        </article>
        <article className="info-card">
          <h3>Model output</h3>
          <p>Two probabilities, where index 0 = non-recyclable and index 1 = recyclable.</p>
        </article>
      </div>

      <article className="flow-card">
        <h3>Processing flow</h3>
        <ol className="flow-list">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>

      <article className="flow-card">
        <h3>Model file loading</h3>
        <p>
          Place the ONNX model in <strong>public/waste_model.onnx</strong> for local hosting, or set an absolute URL through
          <strong>VITE_MODEL_URL</strong> for hosted deployment.
        </p>
        <p>The app loads the model directly in the browser using ONNX Runtime Web.</p>
      </article>
    </section>
  );
}
