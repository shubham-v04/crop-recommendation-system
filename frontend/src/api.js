// In dev, Vite proxies /api -> http://127.0.0.1:8000 (see vite.config.js).
// In production, set VITE_API_URL to your deployed backend URL at build time.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function handleJson(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function predictCrop(features) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(features),
  });
  return handleJson(res);
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleJson(res);
}

export async function getMetadata() {
  const res = await fetch(`${API_BASE}/metadata`);
  return handleJson(res);
}

export async function getEdaSummary() {
  const res = await fetch(`${API_BASE}/eda/summary`);
  return handleJson(res);
}

export async function getCropStats(crop) {
  const res = await fetch(`${API_BASE}/crop-stats/${encodeURIComponent(crop)}`);
  return handleJson(res);
}

export async function sendFeedback({ predicted_crop, helpful, comment }) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ predicted_crop, helpful, comment }),
  });
  return handleJson(res);
}

export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/predict/batch`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }

  return res.blob();
}
