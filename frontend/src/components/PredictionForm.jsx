import { useState } from "react";
import { FIELD_META, DEFAULT_FEATURE_RANGES, PRESET_CROPS } from "../constants.js";
import { getCropStats } from "../api.js";
import { getCropIcon } from "../cropIcons.js";

const EMPTY_FORM = FIELD_META.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {});

export default function PredictionForm({ onSubmit, loading, featureRanges }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [presetLoading, setPresetLoading] = useState(null);

  const ranges = featureRanges || DEFAULT_FEATURE_RANGES;

  function handleNumberChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSliderChange(name, value) {
    setForm({ ...form, [name]: value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const values = {};
    for (const field of FIELD_META) {
      const raw = form[field.name];
      if (raw === "") {
        setError(`Please enter a value for ${field.label}.`);
        return;
      }
      const num = Number(raw);
      if (Number.isNaN(num)) {
        setError(`${field.label} must be a number.`);
        return;
      }
      values[field.name] = num;
    }

    onSubmit(values);
  }

  async function loadPreset(crop) {
    setError(null);
    setPresetLoading(crop);
    try {
      const { stats } = await getCropStats(crop);
      const filled = {};
      for (const field of FIELD_META) {
        const mean = stats[field.name]?.mean;
        filled[field.name] = mean != null ? String(mean) : "";
      }
      setForm(filled);
    } catch {
      setError(`Couldn't load preset values for ${crop}.`);
    } finally {
      setPresetLoading(null);
    }
  }

  return (
    <form className="prediction-form" onSubmit={handleSubmit}>
      <div className="presets-row">
        <span className="presets-label">Try a preset:</span>
        {PRESET_CROPS.map((crop) => (
          <button
            key={crop}
            type="button"
            className="preset-chip"
            onClick={() => loadPreset(crop)}
            disabled={loading || presetLoading === crop}
          >
            {getCropIcon(crop)} {presetLoading === crop ? "…" : crop}
          </button>
        ))}
      </div>

      <div className="grid">
        {FIELD_META.map((field) => {
          const range = ranges[field.name] || DEFAULT_FEATURE_RANGES[field.name];
          const step = field.name === "N" || field.name === "P" || field.name === "K" ? 1 : 0.1;
          return (
            <label key={field.name} className="field">
              <span>
                {field.label} {field.unit && <em>({field.unit})</em>}
              </span>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={step}
                value={form[field.name] === "" ? range.min : form[field.name]}
                onChange={(e) => handleSliderChange(field.name, e.target.value)}
                className="slider"
              />
              <div className="field-input-row">
                <input
                  type="number"
                  step="any"
                  name={field.name}
                  value={form[field.name]}
                  placeholder={`${range.min}–${range.max}`}
                  onChange={handleNumberChange}
                />
                <span className="range-hint">
                  {range.min}–{range.max}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="actions">
        <button type="submit" disabled={loading}>
          {loading ? "Predicting…" : "Predict Crop"}
        </button>
      </div>
    </form>
  );
}
