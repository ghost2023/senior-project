"""XGBoost risk-score regressor — the fast, interpretable "default served
model" (vs. bilstm_model.py's sequential-trajectory model). Predicts a
continuous risk_score in [0, 1]; categorical risk_level is bucketed from
that score afterwards using admin-editable thresholds (see app/labels.py).
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import f1_score, mean_absolute_error, precision_score, recall_score
from sklearn.model_selection import GroupShuffleSplit
from sqlalchemy.engine import Engine

from app.labels import DEFAULT_THRESHOLDS, LEADING_FEATURE_COLUMNS, bucket_risk_level, build_labeled_dataset

ARTIFACT_DIR = Path(__file__).resolve().parent.parent.parent / "artifacts" / "xgboost"


@dataclass
class TrainResult:
    version: str
    artifact_path: str
    trained_at: str
    metrics: dict
    n_train: int
    n_test: int


def _bucketed(scores, thresholds: dict[str, float]) -> list[str]:
    return [bucket_risk_level(float(s), thresholds) for s in scores]


def train_xgboost(engine: Engine, thresholds: dict[str, float] = DEFAULT_THRESHOLDS) -> TrainResult:
    data = build_labeled_dataset(engine)
    labeled = data[data["risk_score_label"].notna()].copy()
    if labeled["student_id"].nunique() < 4:
        raise ValueError("not enough labeled students to hold out a test split")

    X = labeled[LEADING_FEATURE_COLUMNS]
    y = labeled["risk_score_label"]
    groups = labeled["student_id"]

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups))

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(X.iloc[train_idx], y.iloc[train_idx])

    y_pred = np.clip(model.predict(X.iloc[test_idx]), 0.0, 1.0)
    y_true = y.iloc[test_idx].to_numpy()
    pred_levels = _bucketed(y_pred, thresholds)
    true_levels = _bucketed(y_true, thresholds)

    metrics = {
        "mean_absolute_error": float(mean_absolute_error(y_true, y_pred)),
        "risk_level_precision_macro": float(
            precision_score(true_levels, pred_levels, average="macro", zero_division=0)
        ),
        "risk_level_recall_macro": float(recall_score(true_levels, pred_levels, average="macro", zero_division=0)),
        "risk_level_f1_macro": float(f1_score(true_levels, pred_levels, average="macro", zero_division=0)),
    }

    version = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    artifact_dir = ARTIFACT_DIR / version
    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_dir / "model.json"
    model.save_model(str(artifact_path))
    (artifact_dir / "features.json").write_text(json.dumps(LEADING_FEATURE_COLUMNS))

    trained_at = datetime.now(timezone.utc).isoformat()
    (artifact_dir / "metrics.json").write_text(
        json.dumps({"trained_at": trained_at, "metrics": metrics, "n_train": len(train_idx), "n_test": len(test_idx)})
    )

    return TrainResult(
        version=version,
        artifact_path=str(artifact_path),
        trained_at=trained_at,
        metrics=metrics,
        n_train=len(train_idx),
        n_test=len(test_idx),
    )


def load_xgboost(artifact_path: str) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor()
    model.load_model(artifact_path)
    return model


def predict_xgboost(model: xgb.XGBRegressor, features: pd.DataFrame) -> np.ndarray:
    return np.clip(model.predict(features[LEADING_FEATURE_COLUMNS]), 0.0, 1.0)
