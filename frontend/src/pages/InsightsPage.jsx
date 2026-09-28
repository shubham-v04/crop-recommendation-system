import { useEffect, useState } from "react";
import { getEdaSummary } from "../api.js";

function BarRow({ label, value, max, format }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="bar-row">
      <span className="bar-row-label">{label}</span>
      <div className="bar-row-track">
        <div className="bar-row-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-row-value">{format ? format(value) : value}</span>
    </div>
  );
}

function correlationColor(value) {
  // -1 (blue) .. 0 (neutral) .. +1 (red)
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    const intensity = Math.round(clamped * 200);
    return `rgb(${255}, ${255 - intensity}, ${255 - intensity})`;
  }
  const intensity = Math.round(-clamped * 200);
  return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
}

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getEdaSummary()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <p className="hint-text">Loading insights…</p>
      </div>
    );
  }

  const { crop_counts, feature_importance, feature_ranges, correlation, classes } = data;
  const maxCount = Math.max(...Object.values(crop_counts));
  const maxImportance = Math.max(...Object.values(feature_importance));
  const features = Object.keys(feature_ranges);

  return (
    <div className="page page-wide">
      <header>
        <h1>Data Insights</h1>
        <p>What the model actually learned from — dataset composition, which features matter most, and how they relate.</p>
      </header>

      <main>
        <section className="insight-section">
          <h2>Feature importance</h2>
          <p className="hint-text">How much each input contributes to the Random Forest's decisions.</p>
          {Object.entries(feature_importance)
            .sort((a, b) => b[1] - a[1])
            .map(([feat, val]) => (
              <BarRow key={feat} label={feat} value={val} max={maxImportance} format={(v) => v.toFixed(3)} />
            ))}
        </section>

        <section className="insight-section">
          <h2>Crop distribution ({classes.length} crops)</h2>
          <p className="hint-text">Number of real training rows per crop.</p>
          <div className="bar-grid">
            {Object.entries(crop_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([crop, count]) => (
                <BarRow key={crop} label={crop} value={count} max={maxCount} />
              ))}
          </div>
        </section>

        <section className="insight-section">
          <h2>Feature correlation</h2>
          <p className="hint-text">Red = positively correlated, blue = negatively correlated.</p>
          <div className="corr-table-wrap">
            <table className="corr-table">
              <thead>
                <tr>
                  <th></th>
                  {features.map((f) => (
                    <th key={f}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((rowFeat) => (
                  <tr key={rowFeat}>
                    <th>{rowFeat}</th>
                    {features.map((colFeat) => {
                      const value = correlation[rowFeat]?.[colFeat] ?? 0;
                      return (
                        <td key={colFeat} style={{ background: correlationColor(value) }} title={`${value}`}>
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="insight-section">
          <h2>Feature ranges (real training data)</h2>
          <table className="corr-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f}>
                  <th>{f}</th>
                  <td>{feature_ranges[f].min}</td>
                  <td>{feature_ranges[f].max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
