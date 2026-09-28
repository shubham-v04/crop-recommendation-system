import { useEffect, useState } from "react";
import { getMetadata } from "../api.js";

export default function AboutPage() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMetadata()
      .then(setMeta)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <header>
        <h1>About this model</h1>
        <p>How the recommendation is made, and its limitations.</p>
      </header>

      <main>
        <section className="about-card">
          <h2>Methodology</h2>
          <p>
            The model is a <strong>soft-voting ensemble</strong> of three classifiers — a Random
            Forest, a Support Vector Machine (RBF kernel), and a K-Nearest Neighbors model — trained
            on seven soil and climate readings: nitrogen (N), phosphorus (P), potassium (K),
            temperature, humidity, soil pH, and rainfall. Each model votes with a probability
            distribution over all crops, and the votes are averaged to produce the final
            recommendation and confidence score.
          </p>
          <p>
            Features are standardized (zero mean, unit variance) before being passed to the SVM and
            KNN models, since both are distance/margin-based and sensitive to feature scale.
          </p>
        </section>

        {error && <p className="error-text">{error}</p>}

        {meta && (
          <section className="about-card">
            <h2>Model card</h2>
            <table className="corr-table">
              <tbody>
                <tr>
                  <th>Test accuracy</th>
                  <td>{(meta.test_accuracy * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <th>Test F1 (weighted)</th>
                  <td>{(meta.test_f1_weighted * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <th>5-fold CV accuracy</th>
                  <td>
                    {(meta.cv_accuracy_mean * 100).toFixed(1)}% ± {(meta.cv_accuracy_std * 100).toFixed(2)}%
                  </td>
                </tr>
                <tr>
                  <th>Number of crops</th>
                  <td>{meta.n_classes}</td>
                </tr>
                <tr>
                  <th>Rows trained on</th>
                  <td>{meta.n_rows_trained} ({meta.n_rows_real} real, {meta.n_rows_trained - meta.n_rows_real} synthetic)</td>
                </tr>
                <tr>
                  <th>Last trained</th>
                  <td>{new Date(meta.trained_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <section className="about-card">
          <h2>Limitations</h2>
          <ul>
            <li>
              This is a <strong>recommendation tool trained on historical data</strong>, not
              agronomic advice — always confirm with a local agricultural expert before making
              planting decisions.
            </li>
            <li>
              The model has only ever seen the 22 crops in its training data. Anything else can't
              be predicted.
            </li>
            <li>
              Inputs far outside the training data's range (see the Insights page) produce
              unreliable predictions — the app flags these explicitly.
            </li>
            <li>
              Soil and climate conditions vary a lot even within a single field; a single reading
              is a simplification of a more complex reality.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
