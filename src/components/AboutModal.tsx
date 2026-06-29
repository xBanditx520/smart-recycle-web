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
      <div className="modal-card about-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="section-label">Capstone Project 1 — Sunway University</p>
            <h2 className="about-modal-title">AI-Powered Waste Classification</h2>
          </div>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="about-modal-intro">
          A browser-based prototype for classifying household waste into recyclable and non-recyclable categories,
          designed to support Malaysia's 40% recycling target. All inference runs locally — no data leaves your device.
        </p>

        <div className="about-info-grid">
          <div className="about-info-card">
            <h3>Model architecture</h3>
            <p>MobileNetV3-Small CNN via transfer learning, exported to ONNX and run with ONNX Runtime Web (WASM).</p>
          </div>
          <div className="about-info-card">
            <h3>Training data</h3>
            <p>Augmented Waste Classification dataset. Techniques: random flip, rotation, colour jitter, and random crop to improve real-world generalisation.</p>
          </div>
          <div className="about-info-card">
            <h3>Model input</h3>
            <p>RGB image, 224×224 px, centre-cropped and normalised with ImageNet mean and standard deviation.</p>
          </div>
          <div className="about-info-card">
            <h3>Evaluation metrics</h3>
            <p>Accuracy, Precision, Recall, and F1 Score measured on a held-out test set under real-world conditions.</p>
          </div>
        </div>

        <div className="about-flow-card">
          <h3>Classification</h3>
          <p>
            10-class output: Battery, Biological, Cardboard, Clothes, Glass, Metal, Paper, Plastic, Shoes, Trash.
            Composite detection automatically flags mixed-material items and provides split disposal guidance.
          </p>
        </div>

        <div className="about-flow-card">
          <h3>Sustainability alignment</h3>
          <p>
            This project supports the <strong>Malaysian Smart City Framework</strong> and the UN Sustainable Development Goals{' '}
            <strong>SDG 11</strong> (Sustainable Cities) and <strong>SDG 12</strong> (Responsible Consumption).
            Stronger separation-at-source practices reduce landfill dependency and help communities reach the national recycling target.
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
