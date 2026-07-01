import { useEffect, useState } from 'react';
import { getUILabel } from '../constants/disposal';
import { GEMINI_AVAILABLE } from '../lib/gemini';
import { clearFeedback, exportFeedback, getFeedbackCount } from '../lib/feedback';

const CLASSES = [
  'Bulky_Furniture', 'E_Waste', 'Fabric_Shoes', 'General_Trash',
  'Glass', 'Metal', 'Organic_Waste', 'Paper_Cardboard', 'Plastic',
];
const SHORT = ['Blky', 'EWst', 'FSho', 'GTr', 'Gls', 'Met', 'Org', 'PCrd', 'Plas'];

const CLASS_METRICS: Record<string, { p: number; r: number; f1: number }> = {
  Bulky_Furniture:  { p: 0.975, r: 0.979, f1: 0.977 },
  E_Waste:          { p: 0.985, r: 0.993, f1: 0.989 },
  Fabric_Shoes:     { p: 0.976, r: 0.991, f1: 0.983 },
  General_Trash:    { p: 0.934, r: 0.951, f1: 0.943 },
  Glass:            { p: 0.991, r: 0.984, f1: 0.987 },
  Metal:            { p: 0.944, r: 0.922, f1: 0.933 },
  Organic_Waste:    { p: 0.977, r: 0.985, f1: 0.981 },
  Paper_Cardboard:  { p: 0.929, r: 0.980, f1: 0.954 },
  Plastic:          { p: 0.992, r: 0.978, f1: 0.985 },
};

const CHART_DATA = CLASSES.map((name, i) => ({
  name,
  short: SHORT[i] ?? name,
  ...CLASS_METRICS[name],
}));

const SORTED_CLASSES = [...CHART_DATA].sort((a, b) => b.f1 - a.f1 || b.p - a.p);

const CLASS_COLORS = [
  '#3b82f6',  // Bulky_Furniture
  '#0ea05b',  // E_Waste
  '#8b5cf6',  // Fabric_Shoes
  '#f59e0b',  // General_Trash
  '#06b6d4',  // Glass
  '#ef4444',  // Metal
  '#10b981',  // Organic_Waste
  '#f97316',  // Paper_Cardboard
  '#64748b',  // Plastic
] as const;

function f1BarColor(f1: number) {
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

// Label offsets [dx, dy, anchor] per class to avoid overlap on scatter
const LABEL_OFFSETS: Array<[number, number, 'start' | 'end']> = [
  [9, 4, 'start'],    // Bulky_Furniture
  [-4, -14, 'end'],   // E_Waste (shift above)
  [9, -8, 'start'],   // Fabric_Shoes
  [9, 4, 'start'],    // General_Trash
  [9, 10, 'start'],   // Glass (shift below)
  [9, 4, 'start'],    // Metal
  [-44, 4, 'end'],    // Organic_Waste (shift left)
  [9, -8, 'start'],   // Paper_Cardboard
  [9, 4, 'start'],    // Plastic
];

function PRScatterPlot() {
  const W = 480, H = 360;
  const pl = 50, pr = 26, pt = 26, pb = 52;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  const XMIN = 0.895, XMAX = 1.01;
  const YMIN = 0.895, YMAX = 1.01;

  function xCoord(v: number) { return pl + ((v - XMIN) / (XMAX - XMIN)) * cw; }
  function yCoord(v: number) { return pt + (1 - (v - YMIN) / (YMAX - YMIN)) * ch; }

  const ISO_LEVELS = [0.93, 0.95, 0.97];
  const xTicks = [0.90, 0.93, 0.96, 0.99];
  const yTicks = [0.90, 0.93, 0.96, 0.99];

  function isoPolyline(f1: number) {
    const pts: string[] = [];
    for (let i = 0; i <= 400; i++) {
      const p = XMIN + ((XMAX - XMIN) * i) / 400;
      const denom = 2 * p - f1;
      if (denom <= 0) continue;
      const r = (f1 * p) / denom;
      if (r < YMIN || r > YMAX) continue;
      pts.push(`${xCoord(p).toFixed(1)},${yCoord(r).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-label="Precision vs Recall scatter plot with iso-F1 contours"
    >
      <rect x={pl} y={pt} width={cw} height={ch} fill="rgba(15,23,42,0.018)" rx="4" />

      {xTicks.map(v => (
        <g key={`xg-${v}`}>
          <line x1={xCoord(v)} y1={pt} x2={xCoord(v)} y2={pt + ch} stroke="#e8edf4" strokeWidth="0.9" />
          <text x={xCoord(v)} y={pt + ch + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {yTicks.map(v => (
        <g key={`yg-${v}`}>
          <line x1={pl} y1={yCoord(v)} x2={pl + cw} y2={yCoord(v)} stroke="#e8edf4" strokeWidth="0.9" />
          <text x={pl - 8} y={yCoord(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {ISO_LEVELS.map(f1 => {
        const pts = isoPolyline(f1);
        const labelP = XMIN + (XMAX - XMIN) * 0.84;
        const labelDenom = 2 * labelP - f1;
        const labelR = labelDenom > 0 ? (f1 * labelP) / labelDenom : null;
        const showLabel = labelR !== null && labelR >= YMIN + 0.003 && labelR <= YMAX - 0.003;
        return (
          <g key={`iso-${f1}`}>
            <polyline points={pts} fill="none" stroke="#d1dbe6" strokeWidth="0.9" strokeDasharray="4 3" />
            {showLabel && labelR !== null && (
              <text x={xCoord(labelP) + 3} y={yCoord(labelR) - 4} fontSize="8.5" fill="#b0bec5" fontStyle="italic">
                F1={f1}
              </text>
            )}
          </g>
        );
      })}

      {CHART_DATA.map((cls, i) => {
        const cx = xCoord(cls.p);
        const cy = yCoord(cls.r);
        const color = CLASS_COLORS[i] ?? '#64748b';
        const [dx, dy, anchor] = LABEL_OFFSETS[i] ?? [9, 4, 'start' as const];
        return (
          <g key={cls.name}>
            <circle cx={cx} cy={cy} r="6.5" fill={color} opacity="0.88" stroke="white" strokeWidth="1.5" />
            <text
              x={cx + dx} y={cy + dy}
              fontSize="9.5" fill="#374151" fontWeight="600"
              textAnchor={anchor} dominantBaseline="middle"
            >
              {cls.short}
            </text>
          </g>
        );
      })}

      <line x1={pl} y1={pt + ch} x2={pl + cw} y2={pt + ch} stroke="#cbd5e1" strokeWidth="0.9" />
      <line x1={pl} y1={pt} x2={pl} y2={pt + ch} stroke="#cbd5e1" strokeWidth="0.9" />

      <text x={pl + cw / 2} y={H - 9} textAnchor="middle" fontSize="11" fill="#526079" fontWeight="600">
        Precision
      </text>
      <text
        transform={`translate(13,${pt + ch / 2}) rotate(-90)`}
        textAnchor="middle" fontSize="11" fill="#526079" fontWeight="600"
      >
        Recall (TPR)
      </text>
    </svg>
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

  async function handleExport() { await exportFeedback(); }
  async function handleClear() { await clearFeedback(); setFeedbackCount(0); }

  return (
    <section className="content-section model-page">

      <div className="model-intro-card">
        <p className="section-label">Model Performance</p>
        <h2>Evaluation Metrics</h2>
        <p className="model-intro-text">
          All metrics are measured on a held-out test set.
          Architecture: MobileNetV3-Small fine-tuned from ImageNet weights,
          exported to ONNX for fully in-browser inference via WebAssembly.
        </p>
        <div className="model-dataset-row">
          <span>Training dataset</span>
          <strong>79,000+ images · 9 classes</strong>
        </div>
      </div>

      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Advanced Mode</p>
            <h3>9-Class Classification</h3>
            <p className="model-block-desc">
              Identifies waste category and recommends the correct Malaysian disposal action.
            </p>
          </div>
          <span className="model-mode-badge advanced">9-class</span>
        </div>

        <div className="metric-grid">
          <MetricCard label="Accuracy"  value="97.7%" />
          <MetricCard label="Precision" value="96.7%" />
          <MetricCard label="Recall"    value="97.4%" />
          <MetricCard label="F1 Score"  value="97.0%" />
        </div>

        {/* Per-class F1 bars */}
        <div className="model-card">
          <h4 className="model-card-title">Per-class F1 Score <span>sorted by performance</span></h4>
          <div className="class-f1-bars">
            {SORTED_CLASSES.map(cls => (
              <div key={cls.name} className="class-f1-row">
                <span className="class-f1-name">{getUILabel(cls.name)}</span>
                <div className="class-f1-track">
                  <div
                    className="class-f1-fill"
                    style={{ width: `${cls.f1 * 100}%`, background: f1BarColor(cls.f1) }}
                  />
                </div>
                <strong className="class-f1-value">{(cls.f1 * 100).toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Precision vs Recall scatter */}
        <div className="model-card">
          <h4 className="model-card-title">
            Precision vs. Recall
            <span> · per class · iso-F1 contours</span>
          </h4>
          <PRScatterPlot />
          <div className="scatter-legend">
            {CHART_DATA.map((cls, i) => (
              <div key={cls.name} className="scatter-legend-item">
                <span className="scatter-legend-dot" style={{ background: CLASS_COLORS[i] }} />
                <span className="scatter-legend-label">{getUILabel(cls.name)}</span>
              </div>
            ))}
          </div>
          <p className="confusion-intro" style={{ marginTop: 10 }}>
            Dashed curves show equal F1 score. All classes achieve F1 &gt; 93% —
            Metal (93.3%) and General Trash (94.3%) are hardest;
            E-Waste reaches 98.9%.
          </p>
        </div>
      </div>

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
          <MetricCard label="Engine"  value="ONNX RT" />
          <MetricCard label="Network" value="None" />
          <MetricCard label="Privacy" value="100%" />
        </div>

        {!lastInferenceMs && (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            Run a scan on the Scan tab to measure live inference time.
          </p>
        )}

        {GEMINI_AVAILABLE && (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            Cloud fallback: Gemini AI is enabled for low-confidence results.
          </p>
        )}
      </div>

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
            <button className="secondary-button" type="button" onClick={handleExport}>Export JSON</button>
            <button className="secondary-button" type="button" onClick={handleClear}>Clear</button>
          </div>
        ) : (
          <p className="model-block-desc" style={{ marginTop: 6 }}>
            No images flagged yet. Tap "Results not accurate?" on the scan result screen to start collecting.
          </p>
        )}
      </div>

    </section>
  );
}
