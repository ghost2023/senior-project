/** Typed fetch wrapper around services/ml (see docs/ARCHITECTURE.md's "ML
 * integration boundary"). That service never writes to Postgres — every
 * response here is meant to be persisted by the caller. */

export type ModelType = "xgboost" | "bilstm";

export interface ContributingFactor {
  feature: string;
  shapValue: number;
  direction: "increases_risk" | "decreases_risk";
}

export interface MlPredictionResult {
  student_id: string;
  term_id: string;
  model_type: ModelType;
  artifact_path: string;
  risk_score: number;
  risk_level: "normal" | "warning" | "at_risk" | "critical";
  confidence_score: number;
  predicted_final_grade: number;
  contributing_factors: ContributingFactor[];
}

export interface MlTrainResult {
  version: string;
  artifact_path: string;
  trained_at: string;
  metrics: Record<string, number>;
  n_train: number;
  n_test: number;
}

export interface MlModelVersionInfo {
  model_type: ModelType;
  version: string;
  artifact_path: string;
  trained_at: string | null;
  metrics: Record<string, number> | null;
}

async function mlFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.ML_SERVICE_URL;
  const token = process.env.ML_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("ML_SERVICE_URL / ML_SERVICE_TOKEN not configured");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ML service ${path} failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function trainXgboost() {
  return mlFetch<MlTrainResult>("/train/xgboost", { method: "POST" });
}

export function trainBilstm() {
  return mlFetch<MlTrainResult>("/train/bilstm", { method: "POST" });
}

export function predictBatch(modelType: ModelType) {
  return mlFetch<MlPredictionResult[]>("/predict/batch", {
    method: "POST",
    body: JSON.stringify({ model_type: modelType }),
  });
}

export function predictStudent(studentId: string, modelType: ModelType) {
  return mlFetch<MlPredictionResult[]>(`/predict/student/${studentId}`, {
    method: "POST",
    body: JSON.stringify({ model_type: modelType }),
  });
}

export function listMlModels() {
  return mlFetch<MlModelVersionInfo[]>("/models");
}
