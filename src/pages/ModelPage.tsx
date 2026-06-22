const BASIC_EPOCHS = [
  { epoch: 1, loss: 0.125, valAcc: 0.976, f1: 0.975 },
  { epoch: 2, loss: 0.047, valAcc: 0.988, f1: 0.988 },
  { epoch: 3, loss: 0.029, valAcc: 0.983, f1: 0.982 },
  { epoch: 4, loss: 0.025, valAcc: 0.977, f1: 0.977 },
  { epoch: 5, loss: 0.023, valAcc: 0.992, f1: 0.992 },
];

const ADVANCED_CLASSES = [
  { name: 'Battery',    p: 0.98, r: 0.99, f1: 0.99 },
  { name: 'Biological', p: 0.99, r: 0.98, f1: 0.99 },
  { name: 'Cardboard',  p: 0.98, r: 0.99, f1: 0.99 },
  { name: 'Clothes',    p: 0.99, r: 0.99, f1: 0.99 },
  { name: 'Paper',      p: 0.99, r: 0.96, f1: 0.98 },
  { name: 'Shoes',      p: 0.97, r: 0.99, f1: 0.98 },
  { name: 'Trash',      p: 0.99, r: 0.96, f1: 0.98 },
  { name: 'Metal',      p: 0.97, r: 0.96, f1: 0.97 },
  { name: 'Glass',      p: 0.89, r: 0.99, f1: 0.94 },
  { name: 'Plastic',    p: 0.99, r: 0.91, f1: 0.94 },
];

function barColor(f1: number) {
  if (f1 >= 0.98) return '#0ea05b';
  if (f1 >= 0.96) return '#22a6b3';
  return '#eab308';
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function TrainingCurve() {
  const W = 280, H = 100;
  const pad = { t: 8, r: 8, b: 22, l: 34 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const accMin = 0.97, accRange = 0.03;
  const lossMin = 0, lossRange = 0.13;
  const n = BASIC_EPOCHS.length;

  function ax(i: number) { return pad.l + (i / (n - 1)) * pw; }
  function accY(v: number) { return pad.t + ph - ((v - accMin) / accRange) * ph; }
  function lossY(v: number) { return pad.t + ph - ((v - lossMin) / lossRange) * ph; }

  const accLine = BASIC_EPOCHS.map((e, i) => `${ax(i)},${accY(e.valAcc)}`).join(' ');
  const lossLine = BASIC_EPOCHS.map((e, i) => `${ax(i)},${lossY(e.loss)}`).join(' ');
  const gridYs = [0.97, 0.98, 0.99, 1.00];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="training-svg" aria-label="Training curve">
      {gridYs.map(v => (
        <g key={v}>
          <line x1={pad.l} y1={accY(v)} x2={W - pad.r} y2={accY(v)}
            stroke="rgba(15,23,42,0.07)" strokeWidth="1" />
          <text x={pad.l - 4} y={accY(v)} textAnchor="end" fontSize="7.5"
            fill="#64748b" dominantBaseline="middle">
            {(v * 100).toFixed(0)}
          </text>
        </g>
      ))}

      {BASIC_EPOCHS.map((e, i) => (
        <text key={e.epoch} x={ax(i)} y={H - 5} textAnchor="middle" fontSize="7.5" fill="#64748b">
          E{e.epoch}
        </text>
      ))}

      {/* Loss line (dashed, amber) */}
      <polyline points={lossLine} fill="none" stroke="#eab308"
        strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Val Accuracy line (green) */}
      <polyline points={accLine} fill="none" stroke="#0ea05b"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {BASIC_EPOCHS.map((e, i) => (
        <circle key={i} cx={ax(i)} cy={accY(e.valAcc)} r="3" fill="#0ea05b" />
      ))}

      {/* Legend */}
      <g>
        <line x1={pad.l} y1={H - 14} x2={pad.l + 14} y2={H - 14}
          stroke="#0ea05b" strokeWidth="2" />
        <text x={pad.l + 17} y={H - 14} fontSize="7" fill="#64748b" dominantBaseline="middle">
          Val Acc
        </text>
        <line x1={pad.l + 60} y1={H - 14} x2={pad.l + 74} y2={H - 14}
          stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x={pad.l + 77} y={H - 14} fontSize="7" fill="#64748b" dominantBaseline="middle">
          Loss
        </text>
      </g>
    </svg>
  );
}

export default function ModelPage() {
  return (
    <section className="content-section model-page">

      <div className="model-intro-card">
        <p className="section-label">Model Performance</p>
        <h2>Evaluation Metrics</h2>
        <p className="model-intro-text">
          All metrics are measured on held-out test sets. The Basic model uses binary
          classification; the Advanced model distinguishes 10 waste categories.
          Architecture: MobileNetV3-Small via transfer learning from ImageNet weights,
          exported to ONNX for in-browser inference.
        </p>
        <div className="model-dataset-row">
          <span>Training dataset</span>
          <strong>38,686 images · 10 classes</strong>
        </div>
      </div>

      {/* ── Basic Model ─────────────────────────────── */}
      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Basic Mode</p>
            <h3>Binary Classification</h3>
            <p className="model-block-desc">Recyclable vs Non-recyclable — optimised for speed.</p>
          </div>
          <span className="model-mode-badge basic">Binary</span>
        </div>

        <div className="metric-grid">
          <MetricCard label="Accuracy"  value="98.9%" />
          <MetricCard label="Precision" value="98.7%" />
          <MetricCard label="Recall"    value="99.2%" />
          <MetricCard label="F1 Score"  value="98.9%" />
        </div>

        <div className="model-card">
          <h4 className="model-card-title">Training Progress <span>(5 epochs)</span></h4>
          <TrainingCurve />
          <div className="epoch-table-wrap">
            <table className="epoch-table">
              <thead>
                <tr><th>Epoch</th><th>Loss</th><th>Val Acc</th><th>F1</th></tr>
              </thead>
              <tbody>
                {BASIC_EPOCHS.map(e => (
                  <tr key={e.epoch}>
                    <td>{e.epoch}</td>
                    <td>{e.loss.toFixed(3)}</td>
                    <td>{(e.valAcc * 100).toFixed(1)}%</td>
                    <td>{(e.f1 * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Advanced Model ──────────────────────────── */}
      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Advanced Mode</p>
            <h3>10-Class Classification</h3>
            <p className="model-block-desc">
              Identifies waste material type for more precise disposal guidance.
            </p>
          </div>
          <span className="model-mode-badge advanced">10-class</span>
        </div>

        <div className="metric-grid">
          <MetricCard label="Accuracy"  value="97.4%" />
          <MetricCard label="Precision" value="97.0%" />
          <MetricCard label="Recall"    value="97.0%" />
          <MetricCard label="F1 Score"  value="97.0%" />
        </div>

        <div className="model-card">
          <h4 className="model-card-title">Per-class F1 Score</h4>
          <div className="class-f1-bars">
            {ADVANCED_CLASSES.map(cls => (
              <div key={cls.name} className="class-f1-row">
                <span className="class-f1-name">{cls.name}</span>
                <div className="class-f1-track">
                  <div
                    className="class-f1-fill"
                    style={{ width: `${cls.f1 * 100}%`, background: barColor(cls.f1) }}
                  />
                </div>
                <strong className="class-f1-value">{(cls.f1 * 100).toFixed(0)}%</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="model-card confusion-card">
          <h4 className="model-card-title">Notable Confusions</h4>
          <p className="confusion-intro">
            Classes with F1 below 97% show the most cross-class errors.
          </p>
          <div className="confusion-rows">
            <div className="confusion-row">
              <div className="confusion-pair">
                <span className="cf-true">Plastic</span>
                <span className="cf-arrow">→</span>
                <span className="cf-pred">Glass</span>
              </div>
              <span className="cf-count">261 samples (8.5%)</span>
              <p className="cf-reason">
                Transparent plastic bottles visually resemble glass containers.
              </p>
            </div>
            <div className="confusion-row">
              <div className="confusion-pair">
                <span className="cf-true">Metal</span>
                <span className="cf-arrow">→</span>
                <span className="cf-pred">Glass</span>
              </div>
              <span className="cf-count">93 samples (3.0%)</span>
              <p className="cf-reason">
                Shiny metal surfaces can reflect light similarly to glass.
              </p>
            </div>
            <div className="confusion-row">
              <div className="confusion-pair">
                <span className="cf-true">Shoes</span>
                <span className="cf-arrow">→</span>
                <span className="cf-pred">Clothes</span>
              </div>
              <span className="cf-count">29 samples (0.7%)</span>
              <p className="cf-reason">
                Textile-heavy footwear shares texture features with clothing.
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
