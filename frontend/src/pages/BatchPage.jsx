import { useState } from "react";
import { predictBatch } from "../api.js";

export default function BatchPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setError(null);
    setDownloadUrl(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const blob = await predictBatch(file);
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Batch Prediction</h1>
        <p>Upload a CSV with columns N, P, K, temperature, humidity, ph, rainfall — get a predicted crop for every row.</p>
      </header>

      <main>
        <form className="prediction-form" onSubmit={handleSubmit}>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <p className="hint-text">
            Example header row: <code>N,P,K,temperature,humidity,ph,rainfall</code>
          </p>
          <div className="actions">
            <button type="submit" disabled={loading || !file}>
              {loading ? "Processing…" : "Predict for all rows"}
            </button>
          </div>
        </form>

        {error && <p className="error-text">{error}</p>}

        {downloadUrl && (
          <div className="result-card batch-result">
            <p className="result-label">Done</p>
            <p>Your file has been scored — each row now has a predicted_crop and confidence column.</p>
            <a className="download-link" href={downloadUrl} download="predictions.csv">
              ⬇ Download predictions.csv
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
