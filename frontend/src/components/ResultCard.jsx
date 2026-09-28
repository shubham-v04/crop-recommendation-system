import { useState } from "react";
import FeatureRangeBar from "./FeatureRangeBar.jsx";
import { getCropIcon } from "../cropIcons.js";
import { sendFeedback } from "../api.js";

export default function ResultCard({ result }) {
  const [feedbackSent, setFeedbackSent] = useState(null);

  if (!result) return null;

  const {
    predicted_crop,
    confidence,
    top_predictions,
    reasoning,
    feature_analysis,
    out_of_range_warnings,
    what_if_suggestions,
  } = result;

  async function handleFeedback(helpful) {
    setFeedbackSent(helpful ? "up" : "down");
    try {
      await sendFeedback({ predicted_crop, helpful });
    } catch {
      // Feedback is best-effort — don't block the UI on it.
    }
  }

  return (
    <div className="result-card">
      {out_of_range_warnings?.length > 0 && (
        <div className="warning-banner">
          {out_of_range_warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}

      <p className="result-label">Recommended crop</p>
      <h2 className="result-crop">
        {getCropIcon(predicted_crop)} {predicted_crop}
      </h2>
      <p className="result-confidence">{(confidence * 100).toFixed(1)}% confidence</p>

      {reasoning && <p className="result-reasoning">{reasoning}</p>}

      {feature_analysis?.length > 0 && (
        <div className="range-bars">
          <p className="section-label">Your inputs vs. typical {predicted_crop} conditions</p>
          {feature_analysis.map((fa) => (
            <FeatureRangeBar key={fa.feature} analysis={fa} />
          ))}
        </div>
      )}

      {what_if_suggestions?.length > 0 && (
        <div className="what-if">
          <p className="section-label">What would change the result?</p>
          <ul>
            {what_if_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {top_predictions?.length > 1 && (
        <div className="top-predictions">
          <p className="section-label">Other close matches</p>
          <ul>
            {top_predictions.slice(1).map((p) => (
              <li key={p.crop}>
                <span>
                  {getCropIcon(p.crop)} {p.crop}
                </span>
                <span>{(p.probability * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="feedback-row">
        <span>Was this helpful?</span>
        <button
          type="button"
          className={"feedback-btn" + (feedbackSent === "up" ? " active" : "")}
          onClick={() => handleFeedback(true)}
          disabled={feedbackSent !== null}
        >
          👍
        </button>
        <button
          type="button"
          className={"feedback-btn" + (feedbackSent === "down" ? " active" : "")}
          onClick={() => handleFeedback(false)}
          disabled={feedbackSent !== null}
        >
          👎
        </button>
        {feedbackSent && <span className="feedback-thanks">Thanks for the feedback!</span>}
      </div>
    </div>
  );
}
