# Crop Recommendation App

A full-stack machine learning app that recommends the best crop to grow based on soil and climate readings (N, P, K, temperature, humidity, pH, rainfall) — a FastAPI backend serving a scikit-learn model, and a multi-page React frontend for entering values, understanding *why* a crop was recommended, and exploring the data behind the model.

Rebuilt and productionized from an original exploratory Jupyter notebook: the notebook trained several models (Logistic Regression, Naive Bayes, Random Forest, SVM, KNN) and combined the best three into a voting ensemble. This app trains and serves that same ensemble behind a proper API.

## Tech stack

- **Backend**: Python, FastAPI, scikit-learn, pandas, joblib
- **Frontend**: React (Vite), **React Router** (multi-page navigation) — no other UI libraries; charts and range bars are hand-built with CSS/SVG to keep the dependency list small
- No database — history is stored client-side (localStorage), feedback is appended to a CSV file on the backend

If you're setting this up fresh: `pip install -r backend/requirements.txt` and `npm install` in `frontend/` (which pulls in `react-router-dom`) are the only two install steps.

## Project structure

```
crop-recommendation-app/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + all routes
│   │   ├── schemas.py        # request/response models with validation
│   │   └── model_loader.py   # loads the model, builds explanations, batch predictions
│   ├── data/
│   │   ├── CROP_DATA.csv             # original dataset (2200 rows, 22 crops)
│   │   ├── CROP_DATA_augmented.csv   # + synthetic rows (see below)
│   │   └── feedback.csv              # created at runtime from thumbs up/down feedback
│   ├── models/                # trained model + stats artifacts (included, pre-trained)
│   ├── train.py                # trains the model, computes all stats/insights artifacts
│   ├── augment_data.py         # generates the augmented dataset
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # router + layout
│   │   ├── api.js              # all backend calls
│   │   ├── constants.js        # field metadata, fallback ranges, preset crop list
│   │   ├── cropIcons.js        # emoji per crop (used instead of hosted photos)
│   │   ├── hooks/
│   │   │   ├── useTheme.js     # dark/light mode, persisted in localStorage
│   │   │   └── useHistory.js   # prediction history, persisted in localStorage
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── PredictionForm.jsx   # sliders + number inputs + presets
│   │   │   ├── ResultCard.jsx       # prediction + reasoning + warnings + feedback
│   │   │   ├── FeatureRangeBar.jsx  # per-feature "your value vs typical range" bar
│   │   │   └── LoadingSkeleton.jsx
│   │   └── pages/
│   │       ├── PredictPage.jsx
│   │       ├── ComparePage.jsx      # two scenarios side by side
│   │       ├── BatchPage.jsx        # CSV upload → CSV of predictions
│   │       ├── InsightsPage.jsx     # feature importance, crop distribution, correlation
│   │       ├── HistoryPage.jsx      # past predictions (localStorage only)
│   │       └── AboutPage.jsx        # methodology + model card + limitations
│   └── package.json
└── README.md
```

## What's new since the first version

**Trust features**
- Every prediction comes with a **plain-language reasoning** sentence ("Your soil pH, humidity, and phosphorus closely match typical rice conditions"), based on how close each input is to the predicted crop's typical range (z-score against real per-crop stats).
- A **feature comparison bar** for each of the 7 inputs, showing your value against that crop's typical min–max range and mean.
- **Out-of-range warnings** — if an input falls outside what the model was actually trained on, the result says so explicitly instead of silently guessing (or, on the input side, silently rejecting it — see the note on validation below).
- **"What would change the result?"** — a small sensitivity check that nudges each input ±15% and reports if that flips the prediction (e.g. "15% lower rainfall → jute").
- Model accuracy/CV score shown on the Predict page, and a full **model card** (About page) with methodology, metrics, dataset size, last trained date, and stated limitations.
- A 👍/👎 feedback control on every result, logged to `backend/data/feedback.csv`.

**UI**
- Range sliders (backed by the dataset's real min/max, fetched from `/metadata`) alongside free-entry number inputs.
- Preset buttons that fetch a crop's real average conditions from the backend (`/crop-stats/{crop}`) and fill the form — not hardcoded guesses.
- Crop emoji in results/history/presets for quick visual identification.
- Dark mode toggle (persisted, and respects system preference on first visit).
- A loading skeleton instead of a plain "Predicting…" label.

**New pages**
- **Compare** — two independent forms/results side by side.
- **Batch** — upload a CSV of many rows, get back the same CSV with `predicted_crop` and `confidence` columns added.
- **Insights** — feature importance, per-crop row counts, and a feature correlation heatmap, all computed from the real dataset.
- **History** — your last 50 predictions, stored only in your browser (never sent anywhere).
- **About** — methodology and model card, pulled live from `/metadata`.

**Validation change**: earlier, the API hard-rejected (`422`) any input outside a fixed range (this is what caused the `rainfall: 909.9` error from earlier testing). Limits are now physical sanity bounds only (e.g. rainfall 0–1000mm, pH 0–14); anything outside the *training data's* actual range still goes through, but the response flags it as unreliable instead of just rejecting it outright.

## About the dataset

`data/CROP_DATA.csv` is the real dataset you provided — 2,200 rows, 22 crops, 100 samples each, no missing values.

`data/CROP_DATA_augmented.csv` adds **880 synthetic rows** (40 per crop) generated by `augment_data.py`: for each crop, it samples from that crop's own feature distribution and clips values to that crop's real observed min/max. These are flagged with an `is_synthetic` column — not real-world data, just extra training variety. **All stats used for explanations and the Insights page (per-crop ranges, correlation, feature importance) are always computed from the real data only**, even though the model itself trains on the augmented set.

The shipped model reaches **~99% test accuracy** and **99.2% 5-fold CV accuracy** (see `backend/models/metadata.json`, or the About page).

## How to run it

You need Python 3.9+ and Node.js 18+.

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt

# The model is already trained and included in models/. To retrain:
python augment_data.py                              # regenerate the augmented dataset (optional)
python train.py --data data/CROP_DATA_augmented.csv # or data/CROP_DATA.csv for real-data-only

uvicorn app.main:app --reload --port 8000
```

The API is now running at `http://127.0.0.1:8000` — interactive docs at `http://127.0.0.1:8000/docs`.

### 2. Frontend (React)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api/*` requests to the backend on port 8000 (see `vite.config.js`).

### 3. Try it

On the Predict page, click one of the preset chips (e.g. "rice") to auto-fill realistic values, then hit **Predict Crop**. Explore **Insights** for the dataset breakdown, **Compare** to test two scenarios at once, or **Batch** to score a whole CSV.

## API reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Model load status and class list |
| GET | `/metadata` | Accuracy, CV score, feature ranges/importance, training info |
| POST | `/predict` | Full prediction: crop, confidence, reasoning, feature analysis, warnings, what-if suggestions |
| POST | `/predict/batch` | Upload a CSV (multipart `file` field), get back a CSV with predictions appended |
| GET | `/eda/summary` | Crop distribution, feature importance, correlation matrix |
| GET | `/crop-stats/{crop}` | Mean/std/min/max per feature for one crop |
| POST | `/feedback` | Log a 👍/👎 on a prediction to `data/feedback.csv` |

Full interactive docs (with example payloads) at `/docs` once the backend is running.

## Deploying

- **Backend**: any host that runs a Python ASGI app (Render, Railway, Fly.io, a VM with `uvicorn`/`gunicorn`). Ship `backend/models/*` and `backend/data/CROP_DATA.csv` with the deployment (or run `train.py` as a build step).
- **Frontend**: `npm run build` produces a static `dist/` folder deployable to Vercel, Netlify, or any static host. Set `VITE_API_URL` at build time to your deployed backend's URL, since the dev-only `/api` proxy doesn't exist in production.

## Notes on the model

- Features are scaled with `StandardScaler` before SVM/KNN (the original notebook didn't scale, which those two steps quietly relied on).
- The voting classifier uses **soft voting** (averages predicted probabilities), which is what makes confidence scores, top-3 alternatives, and the what-if sensitivity check possible.
- Retrain anytime with `python train.py` — it regenerates the model plus every stats file the frontend depends on (`metadata.json`, `crop_stats.json`, `correlation.json`, `crop_counts.json`).
