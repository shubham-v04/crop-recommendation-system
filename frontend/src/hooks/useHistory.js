import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "crop-app-history";
const MAX_ENTRIES = 50;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // best-effort only — history is a convenience feature, not critical state
  }
}

// Predictions are stored client-side only (localStorage). Nothing is sent
// to the backend, so history stays private to this browser.
export function useHistory() {
  const [history, setHistory] = useState(load);

  useEffect(() => {
    save(history);
  }, [history]);

  const addEntry = useCallback((features, result) => {
    setHistory((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        features,
        predicted_crop: result.predicted_crop,
        confidence: result.confidence,
      };
      return [entry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, addEntry, clearHistory };
}
