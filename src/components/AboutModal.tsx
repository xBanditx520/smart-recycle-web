const steps = [
  'User uploads or captures an image.',
  'The browser centre-crops and resizes it to 224×224, then applies ImageNet normalisation.',
  'ONNX Runtime Web executes the MobileNetV3-Small classifier entirely in the browser (no server).',
  'Basic mode outputs recyclable / non-recyclable probabilities. Advanced mode classifies into 10 waste categories.'
] as const;

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card about-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-label">About</p>
            <h2 className="about-modal-title">Smart Recycle Web</h2>
          </div>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="about-modal-intro">
          An AI-powered waste classification prototype built for Malaysian households. Upload or capture a
          photo to find out if an item is recyclable — all processing happens locally in your browser.
        </p>

        <div className="about-info-grid">
          <div className="about-info-card">
            <h3>Model</h3>
            <p>MobileNetV3-Small CNN, exported to ONNX and run via ONNX Runtime Web (WASM).</p>
          </div>
          <div className="about-info-card">
            <h3>Input</h3>
            <p>RGB image, 224×224 px, normalised with ImageNet mean and standard deviation.</p>
          </div>
        </div>

        <div className="about-flow-card">
          <h3>How it works</h3>
          <ol className="flow-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="about-flow-card">
          <h3>Model files</h3>
          <p>
            Place ONNX files in <strong>public/</strong> (<code>waste_model.onnx</code> for Basic,{' '}
            <code>advanced_waste_model.onnx</code> for Advanced), or override the path via{' '}
            <code>VITE_MODEL_URL</code> / <code>VITE_ADVANCED_MODEL_URL</code> in <code>.env</code>.
          </p>
        </div>

        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
