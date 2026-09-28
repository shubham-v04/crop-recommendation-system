import json
import os

import joblib
import numpy as np
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

FEATURE_LABELS = {
    "N": "nitrogen",
    "P": "phosphorus",
    "K": "potassium",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "soil pH",
    "rainfall": "rainfall",
}

# Perturbation size used for the "what if" sensitivity check.
WHAT_IF_PCT = 0.15


class CropModel:
    """Loads the trained voting classifier, scaler, label encoder, and the
    stats/metadata files train.py produces, and exposes everything the API
    needs: a plain prediction, an explanation of that prediction, dataset
    stats for the Data Insights page, and per-crop stats for the frontend's
    feature-range comparison chart."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.encoder = None
        self.metadata = {}
        self.crop_stats = {}
        self.correlation = {}
        self.crop_counts = {}
        self.load_error = None
        self._load()

    def _load(self):
        paths = {
            "model": os.path.join(MODEL_DIR, "voting_classifier.joblib"),
            "scaler": os.path.join(MODEL_DIR, "scaler.joblib"),
            "encoder": os.path.join(MODEL_DIR, "label_encoder.joblib"),
            "metadata": os.path.join(MODEL_DIR, "metadata.json"),
            "crop_stats": os.path.join(MODEL_DIR, "crop_stats.json"),
            "correlation": os.path.join(MODEL_DIR, "correlation.json"),
            "crop_counts": os.path.join(MODEL_DIR, "crop_counts.json"),
        }

        required = ("model", "scaler", "encoder")
        if not all(os.path.exists(paths[k]) for k in required):
            # Don't crash the app on import — surface this clearly at request time instead.
            self.load_error = (
                "Model artifacts not found. Run `python train.py` from the backend/ "
                "directory before starting the API."
            )
            return

        self.model = joblib.load(paths["model"])
        self.scaler = joblib.load(paths["scaler"])
        self.encoder = joblib.load(paths["encoder"])

        for key in ("metadata", "crop_stats", "correlation", "crop_counts"):
            if os.path.exists(paths[key]):
                with open(paths[key]) as f:
                    setattr(self, key, json.load(f))

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    @property
    def classes(self) -> list[str]:
        return list(self.encoder.classes_) if self.encoder is not None else []

    # ---------------------------------------------------------------- core

    def _predict_probs(self, features: dict) -> np.ndarray:
        row = pd.DataFrame([[features[f] for f in FEATURES]], columns=FEATURES)
        row_scaled = self.scaler.transform(row)
        return self.model.predict_proba(row_scaled)[0]

    def predict(self, features: dict) -> dict:
        probs = self._predict_probs(features)
        top_idx = np.argsort(probs)[::-1][:3]

        predicted_label = self.encoder.inverse_transform([top_idx[0]])[0]
        top_predictions = [
            {"crop": self.encoder.inverse_transform([i])[0], "probability": round(float(probs[i]), 4)}
            for i in top_idx
        ]

        return {
            "predicted_crop": predicted_label,
            "confidence": round(float(probs[top_idx[0]]), 4),
            "top_predictions": top_predictions,
        }

    def _predict_label_only(self, features: dict) -> str:
        probs = self._predict_probs(features)
        return self.encoder.inverse_transform([int(np.argmax(probs))])[0]

    # ---------------------------------------------------------- explaining

    def analyze_input(self, features: dict) -> dict:
        """Builds everything the 'trust the result' UI needs on top of a
        plain prediction: per-feature comparison to the predicted crop's
        typical range, which features most support the prediction, whether
        any input falls outside what the model was trained on, and small
        sensitivity ('what if') suggestions."""
        result = self.predict(features)
        predicted_crop = result["predicted_crop"]
        crop_ref = self.crop_stats.get(predicted_crop, {})
        feature_ranges = self.metadata.get("feature_ranges", {})

        feature_analysis = []
        z_scores = {}
        for feat in FEATURES:
            value = features[feat]
            ref = crop_ref.get(feat, {})
            mean = ref.get("mean")
            std = ref.get("std") or 1e-6
            fmin = ref.get("min")
            fmax = ref.get("max")
            z = (value - mean) / std if mean is not None else 0.0
            z_scores[feat] = z

            feature_analysis.append({
                "feature": feat,
                "label": FEATURE_LABELS[feat],
                "value": value,
                "crop_mean": mean,
                "crop_min": fmin,
                "crop_max": fmax,
                "z_score": round(float(z), 2),
                "in_crop_range": (fmin is not None and fmax is not None and fmin <= value <= fmax),
            })

        # Features closest to this crop's typical mean = strongest support.
        contributing = sorted(FEATURES, key=lambda f: abs(z_scores.get(f, 0)))[:3]
        contributing_labels = [FEATURE_LABELS[f] for f in contributing]
        if len(contributing_labels) >= 3:
            reasoning = (
                f"Your {contributing_labels[0]}, {contributing_labels[1]}, and "
                f"{contributing_labels[2]} closely match typical {predicted_crop} conditions."
            )
        else:
            reasoning = f"Your inputs closely match typical {predicted_crop} conditions."

        out_of_range_warnings = []
        for feat in FEATURES:
            rng = feature_ranges.get(feat)
            if not rng:
                continue
            value = features[feat]
            if value < rng["min"] or value > rng["max"]:
                out_of_range_warnings.append(
                    f"{FEATURE_LABELS[feat].capitalize()} of {value} is outside the "
                    f"{rng['min']}–{rng['max']} range seen in training data — "
                    f"treat this prediction with caution."
                )

        what_if_suggestions = self._what_if(features, predicted_crop)

        return {
            **result,
            "reasoning": reasoning,
            "contributing_features": contributing_labels,
            "feature_analysis": feature_analysis,
            "out_of_range_warnings": out_of_range_warnings,
            "what_if_suggestions": what_if_suggestions,
        }

    def _what_if(self, features: dict, baseline_crop: str) -> list[str]:
        """Perturbs each feature by +/-15% (holding the rest constant) and
        reports the first direction that flips the prediction, so the UI can
        show e.g. 'lowering rainfall by ~15% would predict jute instead'."""
        suggestions = []
        for feat in FEATURES:
            base_value = features[feat]
            for pct, direction in ((WHAT_IF_PCT, "higher"), (-WHAT_IF_PCT, "lower")):
                nudged = dict(features)
                # Avoid a no-op nudge when the base value is 0.
                delta = base_value * pct if base_value != 0 else pct * 10
                nudged[feat] = base_value + delta

                try:
                    new_label = self._predict_label_only(nudged)
                except Exception:
                    continue

                if new_label != baseline_crop:
                    pct_display = int(round(abs(pct) * 100))
                    suggestions.append(
                        f"{pct_display}% {direction} {FEATURE_LABELS[feat]} → {new_label}"
                    )
                    break  # one suggestion per feature is enough
            if len(suggestions) >= 3:
                break
        return suggestions

    # -------------------------------------------------------------- lookups

    def get_metadata(self) -> dict:
        return self.metadata

    def get_crop_stats(self, crop: str) -> dict | None:
        return self.crop_stats.get(crop)

    def get_eda_summary(self) -> dict:
        return {
            "crop_counts": self.crop_counts,
            "feature_importance": self.metadata.get("feature_importance", {}),
            "feature_ranges": self.metadata.get("feature_ranges", {}),
            "correlation": self.correlation,
            "classes": self.classes,
        }

    # ---------------------------------------------------------------- batch

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """Predicts crops for every row of a dataframe that already has the
        7 feature columns. Returns the dataframe with predicted_crop and
        confidence columns appended."""
        missing = [f for f in FEATURES if f not in df.columns]
        if missing:
            raise ValueError(f"Missing required column(s): {', '.join(missing)}")

        X = df[FEATURES].astype(float)
        X_scaled = self.scaler.transform(X)
        probs = self.model.predict_proba(X_scaled)
        pred_idx = np.argmax(probs, axis=1)

        out = df.copy()
        out["predicted_crop"] = self.encoder.inverse_transform(pred_idx)
        out["confidence"] = np.round(probs[np.arange(len(probs)), pred_idx], 4)
        return out


# Loaded once at import time and reused across requests.
crop_model = CropModel()
