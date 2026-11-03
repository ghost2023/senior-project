"""BiLSTM risk-score regressor — captures the sequential trajectory across
terms that xgboost_model.py's flat snapshot can't see directly. Same
regression target (risk_score in [0, 1]) and the same leakage guard as the
XGBoost model (see app/labels.py's module docstring): the sequence input is
built only from the student's PRIOR terms, and the target term's own gpa
never appears as an input.
"""

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import f1_score, mean_absolute_error, precision_score, recall_score
from sklearn.model_selection import GroupShuffleSplit
from sqlalchemy.engine import Engine

from app.features import build_feature_table
from app.labels import DEFAULT_THRESHOLDS, _risk_score_from_gpa, bucket_risk_level

ARTIFACT_DIR = Path(__file__).resolve().parent.parent.parent / "artifacts" / "bilstm"

MAX_SEQUENCE_LEN = 5
PAD_VALUE = -1.0
SEQUENCE_FEATURES = ["gpa_points", "attendance_rate", "completeness"]
SCALAR_FEATURES = ["attendance_rate", "attendance_trend_slope", "peer_attendance_zscore", "completeness"]


@dataclass
class TrainResult:
    version: str
    artifact_path: str
    trained_at: str
    metrics: dict
    n_train: int
    n_test: int


def prepare_examples(table: pd.DataFrame) -> pd.DataFrame:
    """Adds risk_score_label (NaN for the live/current term) and fills the
    scalar feature columns — same labeling rule as app/labels.py, duplicated
    here rather than reusing build_labeled_dataset() since that shifts gpa
    columns back a term for XGBoost's flat feature vector, which this model
    doesn't need (it consumes the raw per-term sequence directly)."""
    table = table.sort_values(["student_id", "term_index"]).reset_index(drop=True).copy()
    is_labelable = (~table["is_current"]) & table["gpa_points"].notna()
    table["risk_score_label"] = np.where(is_labelable, _risk_score_from_gpa(table["gpa_points"]), np.nan)
    table[SCALAR_FEATURES] = table[SCALAR_FEATURES].fillna(0.0)
    return table


def build_sequence_inputs(table: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Returns (sequences, scalars) aligned to `table`'s row order (`table`
    must already be sorted by student_id, term_index — prepare_examples()
    guarantees this). sequences: (n, MAX_SEQUENCE_LEN, 3) of the student's
    PRIOR terms' [gpa_points, attendance_rate, completeness], left-padded
    with PAD_VALUE; scalars: (n, len(SCALAR_FEATURES) + 1), the last column
    being a has_prior_term flag."""
    n = len(table)
    sequences = np.full((n, MAX_SEQUENCE_LEN, len(SEQUENCE_FEATURES)), PAD_VALUE, dtype="float32")
    has_prior = np.zeros(n, dtype="float32")

    by_student: dict[str, list[int]] = {}
    for pos, sid in enumerate(table["student_id"].to_numpy()):
        by_student.setdefault(sid, []).append(pos)

    gpa = table["gpa_points"].to_numpy()
    attendance = table["attendance_rate"].to_numpy()
    completeness = table["completeness"].to_numpy()

    for positions in by_student.values():
        history: list[list[float]] = []
        for pos in positions:
            if history:
                trimmed = history[-MAX_SEQUENCE_LEN:]
                sequences[pos, MAX_SEQUENCE_LEN - len(trimmed) :, :] = np.array(trimmed, dtype="float32")
                has_prior[pos] = 1.0
            history.append(
                [gpa[pos] if not np.isnan(gpa[pos]) else 0.0, attendance[pos], completeness[pos]]
            )

    scalars = np.concatenate([table[SCALAR_FEATURES].to_numpy(dtype="float32"), has_prior[:, None]], axis=1)
    return sequences, scalars


def _build_model(max_len: int, n_seq_features: int, n_scalar_features: int) -> tf.keras.Model:
    seq_input = tf.keras.Input(shape=(max_len, n_seq_features), name="sequence")
    masked = tf.keras.layers.Masking(mask_value=PAD_VALUE)(seq_input)
    lstm_out = tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(16))(masked)

    scalar_input = tf.keras.Input(shape=(n_scalar_features,), name="scalars")
    scalar_dense = tf.keras.layers.Dense(8, activation="relu")(scalar_input)

    merged = tf.keras.layers.Concatenate()([lstm_out, scalar_dense])
    merged = tf.keras.layers.Dropout(0.2)(merged)
    merged = tf.keras.layers.Dense(16, activation="relu")(merged)
    output = tf.keras.layers.Dense(1, activation="sigmoid", name="risk_score")(merged)

    model = tf.keras.Model(inputs=[seq_input, scalar_input], outputs=output)
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss="mse", metrics=["mae"])
    return model


def train_bilstm(engine: Engine, thresholds: dict[str, float] = DEFAULT_THRESHOLDS) -> TrainResult:
    table = prepare_examples(build_feature_table(engine))
    sequences, scalars = build_sequence_inputs(table)

    labeled_mask = table["risk_score_label"].notna().to_numpy()
    groups = table["student_id"].to_numpy()[labeled_mask]
    if len(np.unique(groups)) < 4:
        raise ValueError("not enough labeled students to hold out a test split")

    X_seq = sequences[labeled_mask]
    X_scalar = scalars[labeled_mask]
    y = table["risk_score_label"].to_numpy()[labeled_mask]

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(splitter.split(X_seq, y, groups))

    model = _build_model(MAX_SEQUENCE_LEN, len(SEQUENCE_FEATURES), X_scalar.shape[1])
    model.fit(
        {"sequence": X_seq[train_idx], "scalars": X_scalar[train_idx]},
        y[train_idx],
        validation_split=0.15,
        epochs=150,
        batch_size=16,
        callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True)],
        verbose=0,
    )

    y_pred = np.clip(
        model.predict({"sequence": X_seq[test_idx], "scalars": X_scalar[test_idx]}, verbose=0).flatten(), 0.0, 1.0
    )
    y_true = y[test_idx]
    pred_levels = [bucket_risk_level(float(s), thresholds) for s in y_pred]
    true_levels = [bucket_risk_level(float(s), thresholds) for s in y_true]

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
    artifact_path = artifact_dir / "model.keras"
    model.save(str(artifact_path))

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


def load_bilstm(artifact_path: str) -> tf.keras.Model:
    return tf.keras.models.load_model(artifact_path)


def predict_bilstm(model: tf.keras.Model, sequences: np.ndarray, scalars: np.ndarray) -> np.ndarray:
    return np.clip(model.predict({"sequence": sequences, "scalars": scalars}, verbose=0).flatten(), 0.0, 1.0)
