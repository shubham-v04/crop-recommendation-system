from typing import Optional

from pydantic import BaseModel, Field


class CropFeatures(BaseModel):
    # Bounds here are physical sanity limits, wider than the training data's
    # own range, so a plausible-but-unusual value doesn't get hard-rejected.
    # Whether a value falls outside what the model actually trained on is
    # reported separately in the response (out_of_range_warnings), not as
    # a validation error.
    N: float = Field(..., ge=0, le=300, description="Nitrogen content in soil (kg/ha)")
    P: float = Field(..., ge=0, le=300, description="Phosphorus content in soil (kg/ha)")
    K: float = Field(..., ge=0, le=300, description="Potassium content in soil (kg/ha)")
    temperature: float = Field(..., ge=-10, le=60, description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity in %")
    ph: float = Field(..., ge=0, le=14, description="Soil pH value")
    rainfall: float = Field(..., ge=0, le=1000, description="Rainfall in mm")

    class Config:
        json_schema_extra = {
            "example": {
                "N": 90,
                "P": 42,
                "K": 43,
                "temperature": 20.88,
                "humidity": 82.0,
                "ph": 6.5,
                "rainfall": 202.9,
            }
        }


class TopPrediction(BaseModel):
    crop: str
    probability: float


class FeatureAnalysis(BaseModel):
    feature: str
    label: str
    value: float
    crop_mean: Optional[float] = None
    crop_min: Optional[float] = None
    crop_max: Optional[float] = None
    z_score: float
    in_crop_range: bool


class PredictionResponse(BaseModel):
    predicted_crop: str
    confidence: float
    top_predictions: list[TopPrediction]
    reasoning: str
    contributing_features: list[str]
    feature_analysis: list[FeatureAnalysis]
    out_of_range_warnings: list[str]
    what_if_suggestions: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    classes: list[str]


class MetadataResponse(BaseModel):
    features: list[str]
    n_classes: int
    classes: list[str]
    test_accuracy: float
    test_f1_weighted: float
    cv_accuracy_mean: float
    cv_accuracy_std: float
    feature_importance: dict[str, float]
    feature_ranges: dict[str, dict[str, float]]
    trained_on: str
    n_rows_trained: int
    n_rows_real: int
    trained_at: str


class EdaSummaryResponse(BaseModel):
    crop_counts: dict[str, int]
    feature_importance: dict[str, float]
    feature_ranges: dict[str, dict[str, float]]
    correlation: dict[str, dict[str, float]]
    classes: list[str]


class CropStatsResponse(BaseModel):
    crop: str
    stats: dict[str, dict[str, float]]


class FeedbackRequest(BaseModel):
    predicted_crop: str
    helpful: bool
    comment: Optional[str] = Field(default=None, max_length=500)


class FeedbackResponse(BaseModel):
    status: str
