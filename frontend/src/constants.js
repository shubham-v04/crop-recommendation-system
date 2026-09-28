// Fallback feature ranges (used before /metadata loads, or if it fails).
// These mirror the real CROP_DATA.csv range computed in train.py.
export const DEFAULT_FEATURE_RANGES = {
  N: { min: 0, max: 140 },
  P: { min: 5, max: 145 },
  K: { min: 5, max: 205 },
  temperature: { min: 8.8, max: 43.7 },
  humidity: { min: 14.3, max: 100 },
  ph: { min: 3.5, max: 9.9 },
  rainfall: { min: 20, max: 300 },
};

export const FIELD_META = [
  { name: "N", label: "Nitrogen (N)", unit: "kg/ha" },
  { name: "P", label: "Phosphorus (P)", unit: "kg/ha" },
  { name: "K", label: "Potassium (K)", unit: "kg/ha" },
  { name: "temperature", label: "Temperature", unit: "°C" },
  { name: "humidity", label: "Humidity", unit: "%" },
  { name: "ph", label: "Soil pH", unit: "" },
  { name: "rainfall", label: "Rainfall", unit: "mm" },
];

// A few named presets so users can try realistic combinations without
// knowing typical NPK/climate values off the top of their head. Values are
// fetched live from /crop-stats/{crop} (real per-crop means) rather than
// hardcoded here, so they stay accurate to the actual dataset.
export const PRESET_CROPS = ["rice", "maize", "cotton", "coffee", "watermelon", "banana"];
