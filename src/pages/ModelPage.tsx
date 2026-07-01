import { useEffect, useState } from 'react';
import { getUILabel } from '../constants/disposal';
import { GEMINI_AVAILABLE } from '../lib/gemini';
import { clearFeedback, exportFeedback, getFeedbackCount } from '../lib/feedback';

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

const SORTED_CLASSES = Object.entries(CLASS_METRICS)
  .map(([name, m]) => ({ name, ...m }))
  .sort((a, b) => b.f1 - a.f1 || b.p - a.p);

const METRIC_COLORS = { p: '#3b82f6', r: '#06b6d4', f1: '#0ea05b' } as const;

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function PerformanceGroupedChart() {
  const W = 380;
  const pl = 118; // left padding for class labels
  const pr = 38;  // right padding for value text
  const trackW = W - pl - pr;
  const barH = 5;
  const barGap = 2;
  const groupH = 3 * barH + 2 * barGap; // 19px per class group
  const classPad = 9;
  const pt = 20; // top padding for tick labels
  const pb = 8;
  const totalH = pt + SORTED_CLASSES.length * (groupH + classPad) - classPad + pb;

  const X_MIN = 0.88;
  const X_MAX = 1.005;

  function xp(v: number) {
    return pl + ((v - X_MIN) / (X_MAX - X_MIN)) * trackW;
  }

  const ticks = [0.88, 0.92, 0.96, 1.00];
  const metrics: Array<{ key: keyof typeof METRIC_COLORS; color: string }> = [
    { key: 'p',  color: METRIC_COLORS.p },
    { key: 'r',  color: METRIC_COLORS.r },
    { key: 'f1', color: METRIC_COLORS.f1 },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      width="100%"
      aria-label="Per-class precision, recall and F1 grouped bar chart"
    >
      {/* Vertical grid lines + tick labels */}
      {ticks.map(v => (
        <g key={v}>
          <line
            x1={xp(v)} y1={pt - 5}
            x2={xp(v)} y2={totalH - pb}
            stroke="#e2e8f0" strokeWidth="0.6"
          />
          <text x={xp(v)} y={pt - 7} textAnchor="middle" fontSize="7" fill="#94a3b8">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Baseline */}
      <line x1={pl} y1={pt - 5} x2={pl} y2={totalH - pb} stroke="#cbd5e1" strokeWidth="0.7" />

      {/* Class groups */}
      {SORTED_CLASSES.map((cls, i) => {
        const y0 = pt + i * (groupH + classPad);
        return (
          <g key={cls.name}>
            <text
              x={pl - 6} y={y0 + groupH / 2}
              textAnchor="end" dominantBaseline="middle"
              fontSize="8" fill="#374151" fontWeight="500"
            >
              {getUILabel(cls.name)}
            </text>

            {metrics.map((m, j) => {
              const barY = y0 + j * (barH + barGap);
              const fillW = Math.max(0, xp(cls[m.key]) - pl);
              const valText = (cls[m.key] * 100).toFixed(1);
              return (
                <g key={m.key}>
                  <rect x={pl} y={barY} width={trackW} height={barH} fill="#f1f5f9" rx="2" />
                  <rect x={pl} y={barY} width={fillW} height={barH} fill={m.color} rx="2" opacity="0.88" />
                  <text
                    x={pl + fillW + 3} y={barY + barH / 2}
                    dominantBaseline="middle" fontSize="6.5" fill="#64748b"
                  >
                    {valText}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
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

      {/* ── Advanced Model ──────────────────────────── */}
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

        {/* Per-class P / R / F1 grouped horizontal bar chart */}
        <div className="model-card">
          <h4 className="model-card-title">Per-class Performance (sorted by F1)</h4>
          <PerformanceGroupedChart />
          <div className="cm-legend" style={{ marginTop: 12 }}>
            <span>
              <span className="cm-legend-swatch" style={{ background: METRIC_COLORS.p }} />
              Precision
            </span>
            <span>
              <span className="cm-legend-swatch" style={{ background: METRIC_COLORS.r }} />
              Recall
            </span>
            <span>
              <span className="cm-legend-swatch" style={{ background: METRIC_COLORS.f1 }} />
              F1
            </span>
          </div>
          <p className="confusion-intro" style={{ marginTop: 8 }}>
            Metal (F1 93.3%) and General Trash (F1 94.3%) are the hardest classes.
            E-Waste reaches the highest F1 at 98.9%.
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
