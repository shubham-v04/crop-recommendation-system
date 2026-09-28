import { useEffect, useState } from "react";
import PredictionForm from "../components/PredictionForm.jsx";
import ResultCard from "../components/ResultCard.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { checkHealth, getMetadata, predictCrop } from "../api.js";
import { useHistory } from "../hooks/useHistory.js";

export default function PredictPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [featureRanges, setFeatureRanges] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const { addEntry } = useHistory();

  useEffect(() => {
    checkHealth()
      .then((data) => setBackendStatus(data.model_loaded ? "ready" : "model-missing"))
      .catch(() => setBackendStatus("offline"));

    getMetadata()
      .then((meta) => {
        setFeatureRanges(meta.feature_ranges);
        setModelStats(meta);
      })
      .catch(() => {
        // Non-fatal — the form falls back to built-in default ranges.
      });
  }, []);

  async function handleSubmit(features) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictCrop(features);
      setResult(data);
      addEntry(features, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>🌾 Crop Recommendation</h1>
        <p>Enter soil and climate readings to get the best-suited crop.</p>
        {modelStats && (
          <p className="model-badge">
            Model accuracy: {(modelStats.test_accuracy * 100).toFixed(1)}% test /{" "}
            {(modelStats.cv_accuracy_mean * 100).toFixed(1)}% 5-fold CV, across{" "}
            {modelStats.n_classes} crops
          </p>
        )}
        {backendStatus === "offline" && (
          <p className="status-banner error">
            Can't reach the backend. Make sure the FastAPI server is running on port 8000.
          </p>
        )}
        {backendStatus === "model-missing" && (
          <p className="status-banner error">
            Backend is running but the model isn't trained yet. Run <code>python train.py</code> in
            the backend folder.
          </p>
        )}
      </header>

      <main>
        <PredictionForm onSubmit={handleSubmit} loading={loading} featureRanges={featureRanges} />
        {error && <p className="error-text">{error}</p>}
        {loading && <LoadingSkeleton />}
        {!loading && <ResultCard result={result} />}
      </main>

      <footer>
        <p>Model: Random Forest + SVM + KNN soft-voting ensemble, trained on the Crop Recommendation dataset.</p>
      </footer>
    </div>
  );
}
