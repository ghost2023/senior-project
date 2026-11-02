"""Ground-truth label construction for the risk models.

The regression target is a continuous risk_score in [0, 1], derived
deterministically from a completed term's realized outcome (its mean final
GPA that term) — NOT from a fixed category boundary baked into training.
Categorical risk_level buckets are applied afterwards, using the
admin-editable `alert_thresholds` table (see apps/web/app/admin/alert-config),
so tuning thresholds never requires retraining a model.

Leakage guard: gpa_points, gpa_trend_slope, and peer_gpa_zscore for the
*target* term all derive from that term's own final grades — using them as
features would let the model see its own answer. They are shifted back one
term (the "prior_*" columns) before being used as inputs. Attendance and
completeness ARE observable in real time during a term (recorded
incrementally as the term progresses), so they're used as-is for the target
term. This is what makes the model a genuine early-warning system: it
predicts a term's outcome from in-progress attendance/completeness plus the
student's trajectory *before* this term — not from the term's own final
grade.
"""

import numpy as np
import pandas as pd
from sqlalchemy.engine import Engine

from app.features import build_feature_table

LEADING_FEATURE_COLUMNS = [
    "attendance_rate",
    "attendance_trend_slope",
    "peer_attendance_zscore",
    "completeness",
    "prior_gpa_points",
    "prior_gpa_trend_slope",
    "prior_peer_gpa_zscore",
    "has_prior_term",
]

DEFAULT_THRESHOLDS = {"warning": 0.4, "at_risk": 0.6, "critical": 0.8}


def _risk_score_from_gpa(gpa_points: pd.Series) -> pd.Series:
    return ((4.0 - gpa_points) / 4.0).clip(lower=0.0, upper=1.0)


def bucket_risk_level(risk_score: float, thresholds: dict[str, float] = DEFAULT_THRESHOLDS) -> str:
    """thresholds: {"warning": .., "at_risk": .., "critical": ..} minScores, as
    stored in alert_thresholds. Falls through to "normal" below all of them."""
    if risk_score >= thresholds.get("critical", 0.8):
        return "critical"
    if risk_score >= thresholds.get("at_risk", 0.6):
        return "at_risk"
    if risk_score >= thresholds.get("warning", 0.4):
        return "warning"
    return "normal"


def build_labeled_dataset(engine: Engine) -> pd.DataFrame:
    """One row per (student_id, term_id) with leakage-safe LEADING_FEATURE_COLUMNS
    plus `risk_score_label` — populated only for completed terms with a known
    outcome; NaN for the live/current term, which is what actually gets
    predicted at serving time."""
    table = build_feature_table(engine).sort_values(["student_id", "term_index"]).reset_index(drop=True)

    grouped = table.groupby("student_id", sort=False)
    table["prior_gpa_points"] = grouped["gpa_points"].shift(1)
    table["prior_gpa_trend_slope"] = grouped["gpa_trend_slope"].shift(1)
    table["prior_peer_gpa_zscore"] = grouped["peer_gpa_zscore"].shift(1)
    table["has_prior_term"] = table["prior_gpa_points"].notna().astype(float)

    fill_zero = [
        "prior_gpa_points",
        "prior_gpa_trend_slope",
        "prior_peer_gpa_zscore",
        "attendance_rate",
        "attendance_trend_slope",
        "peer_attendance_zscore",
        "completeness",
    ]
    table[fill_zero] = table[fill_zero].fillna(0.0)

    is_labelable = (~table["is_current"]) & table["gpa_points"].notna()
    table["risk_score_label"] = np.where(is_labelable, _risk_score_from_gpa(table["gpa_points"]), np.nan)

    return table
