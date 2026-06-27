import { useEffect, useState } from 'react';
import { GEMINI_AVAILABLE } from '../lib/gemini';
import { clearFeedback, exportFeedback, getFeedbackCount } from '../lib/feedback';

const CM_CLASSES = ['Battery','Biological','Cardboard','Clothes','Glass','Metal','Paper','Plastic','Shoes','Trash'];
const CM_SHORT   = ['Bat',    'Bio',       'Card',     'Clo',   'Gls',  'Met',  'Pap',  'Pla',   'Sho',  'Tra' ];

const CLASS_METRICS: Record<string, { p: number; r: number; f1: number }> = {
  Battery:    { p: 1.00, r: 0.99, f1: 0.99 },
  Biological: { p: 0.99, r: 1.00, f1: 1.00 },
  Cardboard:  { p: 1.00, r: 0.99, f1: 0.99 },
  Clothes:    { p: 0.99, r: 0.98, f1: 0.99 },
  Glass:      { p: 0.98, r: 0.99, f1: 0.98 },
  Metal:      { p: 0.98, r: 0.98, f1: 0.98 },
  Paper:      { p: 0.98, r: 0.99, f1: 0.99 },
  Plastic:    { p: 0.94, r: 0.96, f1: 0.95 },
  Shoes:      { p: 0.99, r: 1.00, f1: 0.99 },
  Trash:      { p: 0.97, r: 0.94, f1: 0.95 },
};

// For line chart — alphabetical order (= CM_CLASSES order)
const CHART_DATA = CM_CLASSES.map((name, i) => ({
  name,
  short: CM_SHORT[i],
  ...CLASS_METRICS[name],
}));

// For F1 bar chart — sorted descending
const SORTED_CLASSES = [...CHART_DATA].sort((a, b) => b.f1 - a.f1 || b.p - a.p);

const LINE_COLORS = { p: '#3b82f6', r: '#06b6d4', f1: '#0ea05b' } as const;
const Y_MIN = 0.82, Y_MAX = 1.01;

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

function PerformanceLineChart() {
  const W = 300, H = 160;
  const pl = 36, pr = 8, pt = 14, pb = 36;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  function xp(i: number) { return pl + (i / (CHART_DATA.length - 1)) * cw; }
  function yp(v: number) { return pt + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * ch; }

  const yTicks = [0.85, 0.90, 0.95, 1.00];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-label="Per-class precision, recall and F1 score line chart"
    >
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={pl} y1={yp(v)} x2={W - pr} y2={yp(v)}
            stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="3,3"
          />
          <text
            x={pl - 3} y={yp(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="7.5" fill="#94a3b8"
          >
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Lines */}
      {(['p', 'r', 'f1'] as const).map(k => {
        const pts = CHART_DATA
          .map((d, i) => `${xp(i).toFixed(1)},${yp(d[k]).toFixed(1)}`)
          .join(' ');
        return (
          <polyline
            key={k}
            points={pts}
            fill="none"
            stroke={LINE_COLORS[k]}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}

      {/* Dots */}
      {(['p', 'r', 'f1'] as const).map(k =>
        CHART_DATA.map((d, i) => (
          <circle
            key={`${k}-${i}`}
            cx={xp(i)} cy={yp(d[k])}
            r="2.5"
            fill={LINE_COLORS[k]}
          />
        ))
      )}

      {/* X-axis labels */}
      {CHART_DATA.map((d, i) => (
        <text
          key={d.short}
          x={xp(i)} y={H - pb + 12}
          textAnchor="middle"
          fontSize="7" fill="#64748b"
        >
          {d.short}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={W / 2} y={H - 2}
        textAnchor="middle" fontSize="6.5" fill="#94a3b8"
      >
        Class
      </text>
      <text
        transform={`translate(9,${pt + ch / 2}) rotate(-90)`}
        textAnchor="middle" fontSize="6.5" fill="#94a3b8"
      >
        Score
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
          <strong>40,000+ images · 10 classes</strong>
        </div>
      </div>

      {/* ── Advanced Model ──────────────────────────── */}
      <div className="model-block">
        <div className="model-block-head">
          <div>
            <p className="section-label">Advanced Mode</p>
            <h3>10-Class Classification</h3>
            <p className="model-block-desc">
              Identifies waste material type for precise disposal guidance.
            </p>
          </div>
          <span className="model-mode-badge advanced">10-class</span>
        </div>

        <div className="metric-grid">
          <MetricCard label="Accuracy"  value="98.1%" />
          <MetricCard label="Precision" value="98.1%" />
          <MetricCard label="Recall"    value="98.0%" />
          <MetricCard label="F1 Score"  value="98.0%" />
        </div>

        {/* Per-class F1 bars */}
        <div className="model-card">
          <h4 className="model-card-title">Per-class F1 Score</h4>
          <div className="class-f1-bars">
            {SORTED_CLASSES.map(cls => (
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

        {/* P / R / F1 line chart */}
        <div className="model-card">
          <h4 className="model-card-title">Precision · Recall · F1 per Class</h4>
          <PerformanceLineChart />
          <div className="cm-legend" style={{ marginTop: 10 }}>
            <span>
              <span className="cm-legend-swatch" style={{ background: LINE_COLORS.p }} />
              Precision
            </span>
            <span>
              <span className="cm-legend-swatch" style={{ background: LINE_COLORS.r }} />
              Recall
            </span>
            <span>
              <span className="cm-legend-swatch" style={{ background: LINE_COLORS.f1 }} />
              F1
            </span>
          </div>
          <p className="cm-abbrev-note" style={{ marginTop: 8 }}>
            Bat=Battery · Bio=Biological · Card=Cardboard · Clo=Clothes · Gls=Glass ·
            Met=Metal · Pap=Paper · Pla=Plastic · Sho=Shoes · Tra=Trash
          </p>
          <p className="confusion-intro" style={{ marginTop: 6 }}>
            Plastic and Trash are the hardest classes (F1 ≈ 95%). All other classes
            achieve F1 ≥ 98%, with Biological reaching near-perfect at 99.5%.
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
          <MetricCard label="Engine"  value="ONNX RT" />
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
