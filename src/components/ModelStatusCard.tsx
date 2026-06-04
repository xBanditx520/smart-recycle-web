import { DEFAULT_MODEL_URL } from '../constants/recycle';
import { getExecutionProvider, getLoadedModelInfo, isModelLoaded } from '../lib/model';

export default function ModelStatusCard() {
  const modelInfo = getLoadedModelInfo();
  const provider = getExecutionProvider();
  const loaded = isModelLoaded();
  const inputShape = modelInfo?.inputShape?.length ? modelInfo.inputShape.join(' x ') : 'Unknown';

  return (
    <section className="model-card">
      <div>
        <p className="section-label">Model status</p>
        <h3>Runtime details</h3>
      </div>

      <div className="model-grid">
        <div>
          <span>Loaded</span>
          <strong>{loaded ? 'Yes' : 'Not yet'}</strong>
        </div>
        <div>
          <span>Provider</span>
          <strong>{provider ?? 'wasm'}</strong>
        </div>
        <div>
          <span>Input shape</span>
          <strong>{inputShape}</strong>
        </div>
      </div>

      <div className="model-meta">
        <div>
          <span>Model URL</span>
          <strong>{DEFAULT_MODEL_URL}</strong>
        </div>
        <div>
          <span>Layout</span>
          <strong>{modelInfo?.layout ?? 'Unknown'}</strong>
        </div>
      </div>
    </section>
  );
}
