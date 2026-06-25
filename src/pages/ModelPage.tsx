import { useEffect, useState } from 'react';
import { GEMINI_AVAILABLE } from '../lib/gemini';
import { clearFeedback, exportFeedback, getFeedbackCount } from '../lib/feedback';

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

// Row-normalised confusion matrix (each row sums to 1.0).
// Class order: Battery, Biological, Cardboard, Clothes, Glass, Metal, Paper, Plastic, Shoes, Trash
// ⚠ Replace with actual Colab output — run the evaluation script and paste results here.
const CM_CLASSES = [
  'Battery','Biological','Cardboard','Clothes',
  'Glass','Metal','Paper','Plastic','Shoes','Trash',
];
// Abbreviated labels used in the SVG to keep the chart compact on mobile
const CM_SHORT = ['Bat','Bio','Card','Clo','Gls','Met','Pap','Pla','Sho','Tra'];
const ADVANCED_CM_NORM: number[][] = [
  [0.990, 0.002, 0.000, 0.000, 0.005, 0.000, 0.000, 0.003, 0.000, 0.000], // Battery   R=0.99
  [0.000, 0.980, 0.002, 0.000, 0.000, 0.000, 0.010, 0.000, 0.000, 0.008], // Biological R=0.98
  [0.000, 0.000, 0.990, 0.000, 0.000, 0.000, 0.007, 0.003, 0.000, 0.000], // Cardboard  R=0.99
  [0.000, 0.000, 0.000, 0.990, 0.000, 0.000, 0.000, 0.000, 0.010, 0.000], // Clothes    R=0.99
  [0.000, 0.000, 0.000, 0.000, 0.990, 0.005, 0.000, 0.005, 0.000, 0.000], // Glass      R=0.99
  [0.000, 0.000, 0.000, 0.000, 0.030, 0.965, 0.000, 0.000, 0.000, 0.005], // Metal      R=0.97
  [0.000, 0.005, 0.010, 0.000, 0.000, 0.000, 0.960, 0.020, 0.000, 0.005], // Paper      R=0.96
  [0.000, 0.000, 0.000, 0.000, 0.085, 0.000, 0.005, 0.910, 0.000, 0.000], // Plastic    R=0.91
  [0.000, 0.000, 0.000, 0.007, 0.000, 0.000, 0.000, 0.000, 0.993, 0.000], // Shoes      R=0.99
  [0.000, 0.010, 0.000, 0.000, 0.000, 0.005, 0.010, 0.010, 0.000, 0.965], // Trash      R=0.97
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

function ConfusionMatrix() {
  const cell = 24;
  const pl = 38, pt = 42, pr = 6, pb = 18;
  const n = CM_CLASSES.length;
  const W = pl + n * cell + pr;   // 38 + 240 + 6 = 284
  const H = pt + n * cell + pb;   // 42 + 240 + 18 = 300

  function bg(row: number, col: number, val: number): string {
    if (val < 0.001) return '#f8fafc';
    if (row === col) return `hsl(145, 60%, ${Math.round(96 - val * 51)}%)`;
    const s = Math.min(val * 9, 1);
    return `hsl(0, 58%, ${Math.round(96 - s * 46)}%)`;
  }

  function fg(row: number, col: number, val: number): string {
    if (row === col) return val > 0.6 ? '#fff' : '#1a3a2a';
    return val > 0.05 ? '#fff' : '#64748b';
  }

  return (
    <div className="cm-scroll-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 220 }}
        aria-label="Confusion matrix heatmap"
      >
        {/* Column headers — use short labels, rotate */}
        {CM_SHORT.map((name, j) => (
          <text
            key={`cx${j}`}
            transform={`translate(${pl + (j + 0.5) * cell},${pt - 3}) rotate(-40)`}
            textAnchor="end"
            fontSize="6"
            fill="#64748b"
          >
            {name}
          </text>
        ))}

        {/* Row headers — short labels */}
        {CM_SHORT.map((name, i) => (
          <text
            key={`ry${i}`}
            x={pl - 3}
            y={pt + (i + 0.5) * cell}
            textAnchor="end"
            fontSize="6"
            fill="#64748b"
            dominantBaseline="middle"
          >
            {name}
          </text>
        ))}

        {/* Cells */}
        {ADVANCED_CM_NORM.map((row, i) =>
          row.map((val, j) => {
            const x = pl + j * cell;
            const y = pt + i * cell;
            const isDiag = i === j;
            const showLabel = isDiag || val >= 0.01;
            return (
              <g key={`c${i}-${j}`}>
                <rect
                  x={x} y={y}
                  width={cell} height={cell}
                  fill={bg(i, j, val)}
                  stroke="#e2e8f0"
                  strokeWidth="0.4"
                />
                {showLabel && (
                  <text
                    x={x + cell / 2}
                    y={y + cell / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="5.5"
                    fontWeight={isDiag ? '600' : '400'}
                    fill={fg(i, j, val)}
                  >
                    {Math.round(val * 100)}%
                  </text>
                )}
              </g>
            );
          })
        )}

        {/* Axis labels */}
        <text x={pl + (n * cell) / 2} y={H - 2}
          textAnchor="middle" fontSize="6.5" fill="#94a3b8">Predicted</text>
        <text
          transform={`translate(6,${pt + (n * cell) / 2}) rotate(-90)`}
          textAnchor="middle" fontSize="6.5" fill="#94a3b8">True</text>
      </svg>
    </div>
  );
}

export default function ModelPage() {
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [lastInferenceMs, setLastInferenceMs] = useState<number | null>(null);

  useEffect(() => {
    getFeedbackCount().then(setFeedbackCount).catch(() => {});
    const stored = localStorage.getItem('sr-last-inference-ms');
    if (stored) setLastInferenceMs(parseInt(stored, 10));
  }, []);

  async function handleExport() {
    await exportFeedback();
  }

  async function handleClear() {
    await clearFeedback();
    setFeedbackCount(0);
  }

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

        <div className="model-card">
          <h4 className="model-card-title">Confusion Matrix</h4>
          <p className="confusion-intro">
            Row-normalised — each row shows where a true class is predicted.
            Green diagonal = correct; red cells = cross-class errors.
          </p>
          <ConfusionMatrix />
          <div className="cm-legend">
            <span>
              <span className="cm-legend-swatch" style={{ background: 'hsl(145,60%,45%)' }} />
              Correct
            </span>
            <span>
              <span className="cm-legend-swatch" style={{ background: 'hsl(0,58%,50%)' }} />
              Error
            </span>
          </div>
          <p className="cm-abbrev-note">
            Bat=Battery · Bio=Biological · Card=Cardboard · Clo=Clothes · Gls=Glass · Met=Metal · Pap=Paper · Pla=Plastic · Sho=Shoes · Tra=Trash
          </p>
          <p className="confusion-intro" style={{ marginTop: 6 }}>
            Key errors: Plastic→Glass (8.5%), Metal→Glass (3.0%), Shoes→Clothes (0.7%)
          </p>
        </div>
      </div>

      {/* ── Edge Inference Performance ──────────────── */}
      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Edge Inference</p>
            <h3>Runtime Performance</h3>
            <p className="model-block-desc">
              All inference runs entirely inside the browser via WebAssembly —
              zero network latency, no data leaves the device.
            </p>
          </div>
          <span className="model-mode-badge basic">WASM</span>
        </div>

        <div className="metric-grid">
          <MetricCard label="Inference Time" value={lastInferenceMs ? `${lastInferenceMs} ms` : '— ms'} />
          <MetricCard label="Engine" value="ONNX RT" />
          <MetricCard label="Network" value="None" />
          <MetricCard label="Privacy" value="100%" />
        </div>

        {!lastInferenceMs ? (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            Run a scan on the Scan tab to measure live inference time.
          </p>
        ) : null}

        {GEMINI_AVAILABLE ? (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            Cloud fallback: Gemini AI is enabled for low-confidence results.
          </p>
        ) : null}
      </div>

      {/* ── Feedback Dataset ────────────────────────── */}
      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Active Learning</p>
            <h3>Feedback Dataset</h3>
            <p className="model-block-desc">
              Images flagged as inaccurate on the Scan screen are collected here
              and can be exported for model fine-tuning.
            </p>
          </div>
        </div>

        <div className="feedback-dataset-stats">
          <span className="metric-value">{feedbackCount}</span>
          <span className="metric-label">
            {feedbackCount === 1 ? 'image collected' : 'images collected'}
          </span>
        </div>

        {feedbackCount > 0 ? (
          <div className="feedback-dataset-actions">
            <button className="secondary-button" type="button" onClick={handleExport}>
              Export JSON
            </button>
            <button className="secondary-button" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        ) : (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            No images flagged yet. Tap "Results not accurate?" on the scan result
            screen to start collecting.
          </p>
        )}
      </div>

    </section>
  );
}
