"""
Trains the crop recommendation model (Random Forest + SVM + KNN combined in
a soft-voting ensemble) and saves everything the API needs:

- models/voting_classifier.joblib, scaler.joblib, label_encoder.joblib
- models/metadata.json        — accuracy, CV score, classes, feature ranges,
                                 feature importance, when it was trained
- models/crop_stats.json      — per-crop mean/std/min/max for each feature
                                 (used to explain predictions and flag
                                 out-of-range inputs)
- models/correlation.json     — feature correlation matrix (for the
                                 Data Insights page)
- models/crop_counts.json     — row count per crop (for the distribution chart)

Stats/EDA artifacts are always computed from the REAL dataset
(data/CROP_DATA.csv), even if the model itself is trained on the augmented
one, so "typical range for this crop" reflects real data, not synthetic rows.

Usage:
    python train.py                                        # train on data/CROP_DATA.csv
    python train.py --data data/CROP_DATA_augmented.csv     # train on augmented data
"""

import argparse
import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
BACKEND_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BACKEND_DIR, "models")
REAL_DATA_PATH = os.path.join(BACKEND_DIR, "data", "CROP_DATA.csv")


def compute_crop_stats(real_df: pd.DataFrame) -> dict:
    """Per-crop mean/std/min/max for every feature, from real data only."""
    stats = {}
    for crop, group in real_df.groupby("label"):
        stats[crop] = {}
        for feat in FEATURES:
            col = group[feat]
            stats[crop][feat] = {
                "mean": round(float(col.mean()), 3),
                "std": round(float(col.std()) if col.std() > 0 else 1e-6, 3),
                "min": round(float(col.min()), 3),
                "max": round(float(col.max()), 3),
            }
    return stats


def compute_feature_ranges(real_df: pd.DataFrame) -> dict:
    """Dataset-wide min/max per feature — used to flag out-of-range inputs
    and to size the sliders on the frontend."""
    ranges = {}
    for feat in FEATURES:
        ranges[feat] = {
            "min": round(float(real_df[feat].min()), 3),
            "max": round(float(real_df[feat].max()), 3),
        }
    return ranges


def compute_correlation(real_df: pd.DataFrame) -> dict:
    corr = real_df[FEATURES].corr().round(3)
    return {row: corr.loc[row].to_dict() for row in corr.index}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="data/CROP_DATA.csv")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    data_path = args.data if os.path.isabs(args.data) else os.path.join(BACKEND_DIR, args.data)
    df = pd.read_csv(data_path)
    if "is_synthetic" in df.columns:
        df = df.drop(columns=["is_synthetic"])

    X = df[FEATURES]
    y_raw = df["label"]

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.seed, stratify=y
    )

    # SVM and KNN are distance/margin-based, so scale features for them.
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    rf = RandomForestClassifier(n_estimators=200, random_state=args.seed)
    svm = SVC(kernel="rbf", C=1, gamma="scale", probability=True, random_state=args.seed)
    knn = KNeighborsClassifier(n_neighbors=5)

    voting = VotingClassifier(
        estimators=[("rf", rf), ("svm", svm), ("knn", knn)], voting="soft"
    )
    voting.fit(X_train_scaled, y_train)

    y_pred = voting.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")

    print(f"Test accuracy: {acc:.4f}")
    print(f"Test weighted F1: {f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=encoder.classes_))

    cv_scores = cross_val_score(voting, scaler.transform(X), y, cv=5, scoring="accuracy")
    print(f"5-fold CV accuracy: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    feature_importance = dict(
        zip(FEATURES, [round(float(v), 4) for v in voting.named_estimators_["rf"].feature_importances_])
    )
    print("Feature importance (from Random Forest):", feature_importance)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(voting, os.path.join(MODEL_DIR, "voting_classifier.joblib"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.joblib"))
    joblib.dump(encoder, os.path.join(MODEL_DIR, "label_encoder.joblib"))

    # Stats/EDA artifacts always come from the real dataset, regardless of
    # what the model was trained on.
    real_df = pd.read_csv(REAL_DATA_PATH) if os.path.exists(REAL_DATA_PATH) else df
    if "is_synthetic" in real_df.columns:
        real_df = real_df[~real_df["is_synthetic"]].drop(columns=["is_synthetic"])

    crop_stats = compute_crop_stats(real_df)
    feature_ranges = compute_feature_ranges(real_df)
    correlation = compute_correlation(real_df)
    crop_counts = real_df["label"].value_counts().to_dict()

    with open(os.path.join(MODEL_DIR, "crop_stats.json"), "w") as f:
        json.dump(crop_stats, f, indent=2)
    with open(os.path.join(MODEL_DIR, "correlation.json"), "w") as f:
        json.dump(correlation, f, indent=2)
    with open(os.path.join(MODEL_DIR, "crop_counts.json"), "w") as f:
        json.dump(crop_counts, f, indent=2)

    metadata = {
        "features": FEATURES,
        "n_classes": len(encoder.classes_),
        "classes": encoder.classes_.tolist(),
        "test_accuracy": round(float(acc), 4),
        "test_f1_weighted": round(float(f1), 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "feature_importance": feature_importance,
        "feature_ranges": feature_ranges,
        "trained_on": args.data,
        "n_rows_trained": int(len(df)),
        "n_rows_real": int(len(real_df)),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved model, scaler, encoder, and metadata/stats files to {MODEL_DIR}/")


if __name__ == "__main__":
    main()
