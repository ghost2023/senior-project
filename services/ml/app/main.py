import json
from typing import Literal

import numpy as np
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from app.auth import verify_service_token
from app.db import check_connection, engine
from app.features import build_feature_table, resolve_student_id_by_email
from app.models.bilstm_model import train_bilstm
from app.models.xgboost_model import train_xgboost
from app.predict import ARTIFACT_FILENAME, ARTIFACT_ROOT, fetch_live_thresholds, predict

app = FastAPI(
    title="SATPS ML Service",
    description="Read-only predictive component: risk scoring (XGBoost + BiLSTM) with SHAP explanations.",
    version="0.1.0",
)


class TrainResponse(BaseModel):
    version: str
    artifact_path: str
    trained_at: str
    metrics: dict
    n_train: int
    n_test: int


class PredictionResult(BaseModel):
    student_id: str
    term_id: str
    model_type: str
    artifact_path: str
    risk_score: float
    risk_level: str
    confidence_score: float
    predicted_final_grade: float
    contributing_factors: list[dict]


class PredictRequest(BaseModel):
    model_type: Literal["xgboost", "bilstm"] = "xgboost"


class ModelVersionInfo(BaseModel):
    model_type: str
    version: str
    artifact_path: str
    trained_at: str | None = None
    metrics: dict | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict[str, str]:
    try:
        check_connection()
    except Exception as exc:  # noqa: BLE001 - surface the real DB error to the caller
        raise HTTPException(status_code=503, detail=f"database unreachable: {exc}") from exc
    return {"status": "ok"}


@app.get("/debug/features/{email}")
def debug_features(email: str) -> list[dict]:
    """Dev-only: dump the per-term feature vector for one student, to spot-check
    against the seed script's known trajectory archetypes (e.g. student1@satps.edu
    is seeded 'declining' — its gpa_trend_slope/attendance_trend_slope should go
    negative in later terms). Not part of the planned API surface."""
    student_id = resolve_student_id_by_email(engine, email)
    if student_id is None:
        raise HTTPException(status_code=404, detail=f"no student found for email {email}")
    table = build_feature_table(engine)
    rows = table[table["student_id"] == student_id].sort_values("term_index")
    if rows.empty:
        raise HTTPException(status_code=404, detail=f"no enrollment history for student {email}")
    return rows.replace({np.nan: None}).to_dict(orient="records")


@app.post("/train/xgboost", dependencies=[Depends(verify_service_token)])
def run_train_xgboost() -> TrainResponse:
    try:
        result = train_xgboost(engine)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TrainResponse(**result.__dict__)


@app.post("/train/bilstm", dependencies=[Depends(verify_service_token)])
def run_train_bilstm() -> TrainResponse:
    try:
        result = train_bilstm(engine)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TrainResponse(**result.__dict__)


@app.post("/predict/batch", dependencies=[Depends(verify_service_token)])
def run_predict_batch(body: PredictRequest) -> list[PredictionResult]:
    thresholds = fetch_live_thresholds(engine)
    try:
        return predict(engine, body.model_type, thresholds=thresholds)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/predict/student/{student_id}", dependencies=[Depends(verify_service_token)])
def run_predict_student(student_id: str, body: PredictRequest) -> list[PredictionResult]:
    thresholds = fetch_live_thresholds(engine)
    try:
        results = predict(engine, body.model_type, student_id=student_id, thresholds=thresholds)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not results:
        raise HTTPException(status_code=404, detail=f"no current-term data for student {student_id}")
    return results


@app.get("/models", dependencies=[Depends(verify_service_token)])
def list_models() -> list[ModelVersionInfo]:
    infos = []
    for model_type, root in ARTIFACT_ROOT.items():
        if not root.exists():
            continue
        for version_dir in sorted(root.iterdir()):
            if not version_dir.is_dir():
                continue
            metrics_file = version_dir / "metrics.json"
            payload = json.loads(metrics_file.read_text()) if metrics_file.exists() else {}
            infos.append(
                ModelVersionInfo(
                    model_type=model_type,
                    version=version_dir.name,
                    artifact_path=str(version_dir / ARTIFACT_FILENAME[model_type]),
                    trained_at=payload.get("trained_at"),
                    metrics=payload.get("metrics"),
                )
            )
    return infos
