"""Serving-time prediction: load a trained artifact, score the live/current
term for one student (or all students), bucket, and explain. Read-only —
never writes to Postgres or to ml_models; Next.js registers trained models
and persists risk_assessments itself (see docs/ARCHITECTURE.md's
"ML integration boundary")."""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.explain import explain_bilstm, explain_xgboost
from app.features import build_feature_table
from app.labels import DEFAULT_THRESHOLDS, build_labeled_dataset, bucket_risk_level
from app.models.bilstm_model import ARTIFACT_DIR as BILSTM_ARTIFACT_DIR
from app.models.bilstm_model import build_sequence_inputs, load_bilstm, prepare_examples, predict_bilstm
from app.models.xgboost_model import ARTIFACT_DIR as XGBOOST_ARTIFACT_DIR
from app.models.xgboost_model import load_xgboost, predict_xgboost

ARTIFACT_FILENAME = {"xgboost": "model.json", "bilstm": "model.keras"}
ARTIFACT_ROOT = {"xgboost": XGBOOST_ARTIFACT_DIR, "bilstm": BILSTM_ARTIFACT_DIR}


def latest_artifact_path(model_type: str) -> str | None:
    root = ARTIFACT_ROOT[model_type]
    if not root.exists():
        return None
    versions = sorted(p for p in root.iterdir() if p.is_dir())
    if not versions:
        return None
    return str(versions[-1] / ARTIFACT_FILENAME[model_type])


def _confidence_from_score(risk_score: float, thresholds: dict[str, float]) -> float:
    """Neither model natively outputs a calibrated probability for a
    regression target — this is a documented heuristic, not a true
    confidence interval: a score sitting deep inside a risk_level bucket
    is treated as more confident than one right at a boundary edge."""
    edges = [0.0, thresholds.get("warning", 0.4), thresholds.get("at_risk", 0.6), thresholds.get("critical", 0.8), 1.0]
    dist = min(abs(risk_score - e) for e in edges)
    return float(min(0.99, max(0.5, 0.5 + dist)))


def _predicted_final_grade(risk_score: float) -> float:
    """Inverse of labels._risk_score_from_gpa — maps risk_score back onto
    the 0-4 GPA scale it was derived from."""
    return round(4.0 * (1.0 - risk_score), 2)


def fetch_live_thresholds(engine: Engine) -> dict[str, float]:
    """Reads the admin-editable alert_thresholds table (scope='global') so a
    threshold change in /admin/alert-config takes effect on the next
    prediction run without retraining a model. Falls back to
    DEFAULT_THRESHOLDS for any level with no row yet."""
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT risk_level, min_score FROM alert_thresholds WHERE scope = 'global'"))
        live = {level: float(score) for level, score in rows}
    return {**DEFAULT_THRESHOLDS, **{k: v for k, v in live.items() if k in DEFAULT_THRESHOLDS}}


def predict(
    engine: Engine,
    model_type: str,
    student_id: str | None = None,
    artifact_path: str | None = None,
    thresholds: dict[str, float] = DEFAULT_THRESHOLDS,
) -> list[dict]:
    """Scores the current/live term for one student, or for every student
    with an active current-term row if student_id is None."""
    if model_type not in ("xgboost", "bilstm"):
        raise ValueError(f"unknown model_type {model_type!r}")

    artifact_path = artifact_path or latest_artifact_path(model_type)
    if artifact_path is None:
        raise ValueError(f"no trained {model_type} artifact found — train one first")

    labeled = build_labeled_dataset(engine)
    rows = labeled[labeled["is_current"]]
    if student_id is not None:
        rows = rows[rows["student_id"] == student_id]
    if rows.empty:
        return []

    if model_type == "xgboost":
        model = load_xgboost(artifact_path)
        scores = predict_xgboost(model, rows)
        factors = explain_xgboost(model, rows)
    else:
        model = load_bilstm(artifact_path)
        full_table = prepare_examples(build_feature_table(engine))
        sequences, scalars = build_sequence_inputs(full_table)
        position_by_key = {
            (sid, tid): pos for pos, (sid, tid) in enumerate(zip(full_table["student_id"], full_table["term_id"]))
        }
        positions = [position_by_key[(sid, tid)] for sid, tid in zip(rows["student_id"], rows["term_id"])]
        scores = predict_bilstm(model, sequences[positions], scalars[positions])
        factors = explain_bilstm(rows)

    results = []
    rows = rows.reset_index(drop=True)
    for i, row in rows.iterrows():
        score = float(scores[i])
        results.append(
            {
                "student_id": row["student_id"],
                "term_id": row["term_id"],
                "model_type": model_type,
                "artifact_path": artifact_path,
                "risk_score": score,
                "risk_level": bucket_risk_level(score, thresholds),
                "confidence_score": _confidence_from_score(score, thresholds),
                "predicted_final_grade": _predicted_final_grade(score),
                "contributing_factors": factors[i],
            }
        )
    return results
