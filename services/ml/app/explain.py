"""Contributing-factor explanations for the risk models, in the shape
apps/web/app/student/predictions/page.tsx already expects:
    contributingFactors: [{feature, shapValue, direction}]

XGBoost: exact SHAP values via TreeExplainer (cheap, deterministic, works
directly on LEADING_FEATURE_COLUMNS).

BiLSTM: full SHAP on a masked, multi-input LSTM (DeepExplainer/
GradientExplainer) is fragile and slow for what this system needs — per the
originally scoped plan, contributing factors are instead derived from each
feature's deviation from a "healthy student" baseline, signed by whether
that deviation plausibly increases or decreases risk. Same output shape as
the XGBoost path so the frontend needs no model-specific handling, but
these are NOT true Shapley values — a documented simplification, not a bug.
"""

import numpy as np
import pandas as pd
import shap

from app.labels import LEADING_FEATURE_COLUMNS

FEATURE_LABELS = {
    "attendance_rate": "Attendance rate",
    "attendance_trend_slope": "Attendance trend",
    "peer_attendance_zscore": "Attendance vs. peers",
    "completeness": "Grade entry completeness",
    "prior_gpa_points": "Prior-term GPA",
    "prior_gpa_trend_slope": "GPA trend",
    "prior_peer_gpa_zscore": "GPA vs. peers",
    "has_prior_term": "Enrollment history length",
}

TOP_N = 5


def explain_xgboost(model, features: pd.DataFrame) -> list[list[dict]]:
    """One contributing-factor list per row in `features` (must contain
    LEADING_FEATURE_COLUMNS, e.g. from labels.build_labeled_dataset)."""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(features[LEADING_FEATURE_COLUMNS])
    results = []
    for row_idx in range(shap_values.shape[0]):
        row_values = shap_values[row_idx]
        order = np.argsort(-np.abs(row_values))[:TOP_N]
        results.append(
            [
                {
                    "feature": FEATURE_LABELS.get(LEADING_FEATURE_COLUMNS[i], LEADING_FEATURE_COLUMNS[i]),
                    "shapValue": float(row_values[i]),
                    "direction": "increases_risk" if row_values[i] > 0 else "decreases_risk",
                }
                for i in order
            ]
        )
    return results


# Baseline a "healthy" student is assumed to sit at, and the sign of each
# feature's relationship to risk — deviation from these drives the
# heuristic BiLSTM explanation magnitude. Deliberately excludes
# has_prior_term, which is a data-availability flag, not a risk driver.
_BILSTM_BASELINE = {
    "attendance_rate": 0.9,
    "attendance_trend_slope": 0.0,
    "peer_attendance_zscore": 0.0,
    "completeness": 1.0,
    "prior_gpa_points": 3.0,
    "prior_gpa_trend_slope": 0.0,
    "prior_peer_gpa_zscore": 0.0,
}
_RISK_INCREASES_WITH_LOWER_VALUE = set(_BILSTM_BASELINE)  # every one of these features: lower = riskier


def explain_bilstm(features: pd.DataFrame) -> list[list[dict]]:
    """Heuristic contributing factors for the BiLSTM model. `features` must
    contain the same columns as LEADING_FEATURE_COLUMNS (e.g. from
    labels.build_labeled_dataset — reused here so both models describe risk
    using the same feature vocabulary, even though BiLSTM itself consumes a
    sequence rather than this flat vector)."""
    results = []
    for _, row in features.iterrows():
        scored = []
        for feature, baseline in _BILSTM_BASELINE.items():
            if feature not in row or pd.isna(row[feature]):
                continue
            delta = float(row[feature]) - baseline
            pseudo_shap = -delta if feature in _RISK_INCREASES_WITH_LOWER_VALUE else delta
            scored.append((feature, pseudo_shap))
        scored.sort(key=lambda t: -abs(t[1]))
        results.append(
            [
                {
                    "feature": FEATURE_LABELS.get(feature, feature),
                    "shapValue": value,
                    "direction": "increases_risk" if value > 0 else "decreases_risk",
                }
                for feature, value in scored[:TOP_N]
            ]
        )
    return results
