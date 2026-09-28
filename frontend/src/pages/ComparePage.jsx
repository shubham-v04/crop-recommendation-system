import { useEffect, useState } from "react";
import PredictionForm from "../components/PredictionForm.jsx";
import ResultCard from "../components/ResultCard.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { getMetadata, predictCrop } from "../api.js";

function ComparisonSlot({ label, featureRanges }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(features) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictCrop(features);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="compare-slot">
      <h3>{label}</h3>
      <PredictionForm onSubmit={handleSubmit} loading={loading} featureRanges={featureRanges} />
      {error && <p className="error-text">{error}</p>}
      {loading && <LoadingSkeleton />}
      {!loading && <ResultCard result={result} />}
    </div>
  );
}

export default function ComparePage() {
  const [featureRanges, setFeatureRanges] = useState(null);

  useEffect(() => {
    getMetadata()
      .then((meta) => setFeatureRanges(meta.feature_ranges))
      .catch(() => {});
  }, []);

  return (
    <div className="page page-wide">
      <header>
        <h1>Compare Conditions</h1>
        <p>Fill in two sets of soil/climate readings side by side and see how the recommendation differs.</p>
      </header>

      <div className="compare-grid">
        <ComparisonSlot label="Scenario A" featureRanges={featureRanges} />
        <ComparisonSlot label="Scenario B" featureRanges={featureRanges} />
      </div>
    </div>
  );
}
