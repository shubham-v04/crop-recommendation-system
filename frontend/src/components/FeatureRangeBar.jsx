// Shows one feature's value against the predicted crop's typical min-max
// range, so the user can see *why* the model chose that crop instead of
// just being told to trust a probability number.
export default function FeatureRangeBar({ analysis }) {
  const { label, value, crop_min, crop_max, crop_mean, in_crop_range } = analysis;

  if (crop_min == null || crop_max == null) {
    return (
      <div className="range-bar-row">
        <span className="range-bar-label">{label}</span>
        <span className="range-bar-value">{value}</span>
      </div>
    );
  }

  // Pad the visible track a bit past the crop's own range so the value
  // marker doesn't get clipped when it's slightly outside.
  const pad = (crop_max - crop_min) * 0.25 || 1;
  const trackMin = Math.min(crop_min - pad, value);
  const trackMax = Math.max(crop_max + pad, value);
  const span = trackMax - trackMin || 1;

  const pct = (v) => ((v - trackMin) / span) * 100;

  return (
    <div className="range-bar-row">
      <div className="range-bar-header">
        <span className="range-bar-label">{label}</span>
        <span className={"range-bar-value" + (in_crop_range ? "" : " out")}>
          {value} {in_crop_range ? "" : "⚠️"}
        </span>
      </div>
      <div className="range-bar-track">
        <div
          className="range-bar-typical"
          style={{ left: `${pct(crop_min)}%`, width: `${pct(crop_max) - pct(crop_min)}%` }}
          title={`Typical range: ${crop_min}–${crop_max}`}
        />
        {crop_mean != null && (
          <div className="range-bar-mean" style={{ left: `${pct(crop_mean)}%` }} title={`Mean: ${crop_mean}`} />
        )}
        <div
          className={"range-bar-marker" + (in_crop_range ? "" : " out")}
          style={{ left: `${pct(value)}%` }}
          title={`Your value: ${value}`}
        />
      </div>
    </div>
  );
}
