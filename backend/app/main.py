import csv
import io
import os
from datetime import datetime, timezone

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.model_loader import crop_model
from app.schemas import (
    CropFeatures,
    CropStatsResponse,
    EdaSummaryResponse,
    FeedbackRequest,
    FeedbackResponse,
    HealthResponse,
    MetadataResponse,
    PredictionResponse,
)

app = FastAPI(
    title="Crop Recommendation API",
    description="Predicts the most suitable crop from soil and climate readings, "
    "with an explanation of why, dataset insights, and batch prediction.",
    version="2.0.0",
)

# Allow the React dev server (and any frontend) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FEEDBACK_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "feedback.csv")


def _require_model_loaded():
    if not crop_model.is_loaded:
        raise HTTPException(status_code=503, detail=crop_model.load_error)


@app.get("/", tags=["meta"])
def root():
    return {"message": "Crop Recommendation API. See /docs for the interactive API explorer."}


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health():
    return HealthResponse(
        status="ok" if crop_model.is_loaded else "model_not_loaded",
        model_loaded=crop_model.is_loaded,
        classes=crop_model.classes,
    )


@app.get("/metadata", response_model=MetadataResponse, tags=["meta"])
def metadata():
    _require_model_loaded()
    data = crop_model.get_metadata()
    if not data:
        raise HTTPException(status_code=404, detail="No metadata available. Re-run train.py.")
    return data


@app.post("/predict", response_model=PredictionResponse, tags=["prediction"])
def predict(features: CropFeatures):
    _require_model_loaded()
    result = crop_model.analyze_input(features.model_dump())
    return result


@app.post("/predict/batch", tags=["prediction"])
async def predict_batch(file: UploadFile = File(...)):
    _require_model_loaded()

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {exc}")

    try:
        result_df = crop_model.predict_batch(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    buffer = io.StringIO()
    result_df.to_csv(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions.csv"},
    )


@app.get("/eda/summary", response_model=EdaSummaryResponse, tags=["insights"])
def eda_summary():
    _require_model_loaded()
    return crop_model.get_eda_summary()


@app.get("/crop-stats/{crop}", response_model=CropStatsResponse, tags=["insights"])
def crop_stats(crop: str):
    _require_model_loaded()
    stats = crop_model.get_crop_stats(crop)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"No stats found for crop '{crop}'.")
    return CropStatsResponse(crop=crop, stats=stats)


@app.post("/feedback", response_model=FeedbackResponse, tags=["feedback"])
def submit_feedback(feedback: FeedbackRequest):
    os.makedirs(os.path.dirname(FEEDBACK_PATH), exist_ok=True)
    file_exists = os.path.exists(FEEDBACK_PATH)

    with open(FEEDBACK_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "predicted_crop", "helpful", "comment"])
        writer.writerow([
            datetime.now(timezone.utc).isoformat(timespec="seconds"),
            feedback.predicted_crop,
            feedback.helpful,
            feedback.comment or "",
        ])

    return FeedbackResponse(status="recorded")
