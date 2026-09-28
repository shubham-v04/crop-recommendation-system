"""
Synthetic data augmentation for the crop recommendation dataset.

The original CROP_DATA.csv has exactly 100 real samples per crop (2200 rows,
22 crops). This script adds extra *synthetic* rows per crop by sampling from
each crop's own feature distribution (mean + covariance-aware Gaussian noise),
clipped to that crop's observed min/max so values stay physically plausible.

This is NOT real-world data — it's a lightweight stand-in for SMOTE-style
oversampling, useful for giving the model more training variety and for
stress-testing the pipeline. The augmented rows are clearly separable via
the `is_synthetic` column so you can drop them at any time.

Usage:
    python augment_data.py                # writes data/CROP_DATA_augmented.csv
    python augment_data.py --per-class 50 # add 50 synthetic rows per crop (default: 40)
"""

import argparse
import numpy as np
import pandas as pd

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]


def augment(df: pd.DataFrame, per_class: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    synthetic_rows = []

    for label, group in df.groupby("label"):
        means = group[FEATURES].mean()
        stds = group[FEATURES].std().replace(0, 1e-6)
        mins = group[FEATURES].min()
        maxs = group[FEATURES].max()

        # Sample around the class mean with a fraction of the class's own
        # spread, then clip to the observed range for that crop.
        noise = rng.normal(loc=0.0, scale=0.5, size=(per_class, len(FEATURES)))
        samples = means.values + noise * stds.values
        samples = np.clip(samples, mins.values, maxs.values)

        chunk = pd.DataFrame(samples, columns=FEATURES)
        chunk["label"] = label
        synthetic_rows.append(chunk)

    synthetic_df = pd.concat(synthetic_rows, ignore_index=True)

    df = df.copy()
    df["is_synthetic"] = False
    synthetic_df["is_synthetic"] = True

    combined = pd.concat([df, synthetic_df], ignore_index=True)
    return combined.sample(frac=1, random_state=seed).reset_index(drop=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/CROP_DATA.csv")
    parser.add_argument("--output", default="data/CROP_DATA_augmented.csv")
    parser.add_argument("--per-class", type=int, default=40,
                         help="Synthetic rows to add per crop (default: 40)")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    combined = augment(df, per_class=args.per_class)
    combined.to_csv(args.output, index=False)

    n_real = (~combined["is_synthetic"]).sum()
    n_synth = combined["is_synthetic"].sum()
    print(f"Wrote {args.output}: {n_real} real rows + {n_synth} synthetic rows "
          f"= {len(combined)} total across {combined['label'].nunique()} crops")


if __name__ == "__main__":
    main()
