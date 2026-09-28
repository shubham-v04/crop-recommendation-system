import { useHistory } from "../hooks/useHistory.js";
import { getCropIcon } from "../cropIcons.js";

export default function HistoryPage() {
  const { history, clearHistory } = useHistory();

  return (
    <div className="page">
      <header>
        <h1>Prediction History</h1>
        <p>Stored only in this browser (not sent anywhere) — your last {history.length} prediction(s).</p>
      </header>

      <main>
        {history.length === 0 ? (
          <p className="hint-text">No predictions yet. Head to the Predict page to try one.</p>
        ) : (
          <>
            <div className="actions" style={{ marginBottom: "1rem" }}>
              <button type="button" className="secondary" onClick={clearHistory}>
                Clear history
              </button>
            </div>
            <ul className="history-list">
              {history.map((entry) => (
                <li key={entry.id} className="history-item">
                  <div className="history-main">
                    <span className="history-crop">
                      {getCropIcon(entry.predicted_crop)} {entry.predicted_crop}
                    </span>
                    <span className="history-confidence">{(entry.confidence * 100).toFixed(1)}%</span>
                    <span className="history-time">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="history-features">
                    N:{entry.features.N} P:{entry.features.P} K:{entry.features.K}{" "}
                    Temp:{entry.features.temperature} Humidity:{entry.features.humidity}{" "}
                    pH:{entry.features.ph} Rain:{entry.features.rainfall}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
