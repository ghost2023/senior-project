import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, auditLogs, mlModels, predictionRuns, recommendations, riskAssessments } from "@/lib/db/schema";
import { HttpError, requireRole } from "@/lib/permissions";
import {
  type ContributingFactor,
  type MlPredictionResult,
  type ModelType,
  predictBatch,
  trainBilstm,
  trainXgboost,
} from "@/lib/ml-client";

// Non-directive suggestions (rule #24: "suggestions, not directives") keyed
// by the top increases_risk contributing factor. Falls back to a generic
// nudge for factors that aren't really something a student can act on
// directly (e.g. grade-entry completeness, which reflects teacher grading
// pace, not student behavior).
const FEATURE_RECOMMENDATIONS: Record<string, { text: string; category: string }> = {
  "Attendance rate": {
    text: "Your attendance has dropped below your usual pattern. If something's making it hard to get to class, your instructor or advisor may be able to help.",
    category: "attendance",
  },
  "Attendance trend": {
    text: "Your attendance has been trending down recently. Getting back to a consistent routine now can help stabilize your standing this term.",
    category: "attendance",
  },
  "Attendance vs. peers": {
    text: "Your attendance is running behind most of your peers this term. Consider connecting with your instructor about what you might be missing.",
    category: "attendance",
  },
  "Prior-term GPA": {
    text: "Your GPA heading into this term suggests it may help to build stronger study habits early, before assignments pile up.",
    category: "academic",
  },
  "GPA trend": {
    text: "Your GPA has been trending downward over recent terms. Meeting with an academic advisor could help you find the right support before it's too late.",
    category: "advising",
  },
  "GPA vs. peers": {
    text: "Your GPA is running below your program peers this term. A tutor or study group might help close that gap.",
    category: "academic",
  },
};
const DEFAULT_RECOMMENDATION = {
  text: "Your predicted risk has increased this term. Consider checking in with your academic advisor to review your progress.",
  category: "advising",
};

function buildRecommendation(factors: ContributingFactor[]) {
  const topRisky = factors.find((f) => f.direction === "increases_risk");
  if (topRisky && FEATURE_RECOMMENDATIONS[topRisky.feature]) {
    return FEATURE_RECOMMENDATIONS[topRisky.feature];
  }
  return DEFAULT_RECOMMENDATION;
}

function buildAlertMessage(riskLevel: string, factors: ContributingFactor[]) {
  const topRisky = factors.find((f) => f.direction === "increases_risk");
  const label = riskLevel === "critical" ? "Critical" : riskLevel === "at_risk" ? "At-risk" : "Warning";
  return topRisky
    ? `${label}: predicted risk driven mainly by "${topRisky.feature}".`
    : `${label}: predicted risk level for this student has changed.`;
}

/** Persists one model's batch predictions: registers the trained version in
 * ml_models, then one risk_assessments row per student. Returns the new
 * ml_models id (used by the caller to fire alerts/recommendations for
 * whichever model is the "default served" one). */
async function persistModelRun(
  modelType: ModelType,
  train: { version: string; artifact_path: string; trained_at: string; metrics: Record<string, number> },
  predictions: MlPredictionResult[],
) {
  await db.update(mlModels).set({ isActive: false }).where(eq(mlModels.modelType, modelType));

  const [modelRow] = await db
    .insert(mlModels)
    .values({
      name: `risk-classifier-${modelType}`,
      modelType,
      version: train.version,
      artifactPath: train.artifact_path,
      trainedAt: new Date(train.trained_at),
      metrics: train.metrics,
      isActive: true,
    })
    .returning();

  const insertedAssessmentIds: { studentId: string; riskAssessmentId: string; prediction: MlPredictionResult }[] = [];
  for (const prediction of predictions) {
    const [row] = await db
      .insert(riskAssessments)
      .values({
        studentId: prediction.student_id,
        sectionId: null,
        termId: prediction.term_id,
        modelId: modelRow.id,
        riskScore: String(prediction.risk_score),
        riskLevel: prediction.risk_level,
        confidenceScore: String(prediction.confidence_score),
        predictedFinalGrade: String(prediction.predicted_final_grade),
        contributingFactors: prediction.contributing_factors,
      })
      .returning();
    insertedAssessmentIds.push({ studentId: prediction.student_id, riskAssessmentId: row.id, prediction });
  }

  return { modelRow, assessments: insertedAssessmentIds };
}

export async function POST() {
  let session;
  try {
    session = await requireRole("faculty_admin");
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const [run] = await db
    .insert(predictionRuns)
    .values({ trigger: "manual", startedAt: new Date(), status: "running" })
    .returning();

  try {
    const [xgbTrain, bilstmTrain] = await Promise.all([trainXgboost(), trainBilstm()]);
    const [bilstmPredictions, xgbPredictions] = await Promise.all([
      predictBatch("bilstm"),
      predictBatch("xgboost"),
    ]);

    // BiLSTM persisted first, XGBoost second — XGBoost is the "default
    // served model" (see docs/NEXT_STEPS.md), and student/teacher-facing
    // pages read the single most recent risk_assessments row per student,
    // so it must land last to win that ordering.
    await persistModelRun("bilstm", bilstmTrain, bilstmPredictions);
    const { modelRow: xgbModel, assessments: xgbAssessments } = await persistModelRun(
      "xgboost",
      xgbTrain,
      xgbPredictions,
    );

    // Alerts and recommendations are driven by the default-served model only
    // — otherwise every student would get duplicate alerts, one per model.
    let alertsFired = 0;
    for (const { studentId, riskAssessmentId, prediction } of xgbAssessments) {
      if (prediction.risk_level === "normal") continue;
      await db.insert(alerts).values({
        studentId,
        riskAssessmentId,
        severity: prediction.risk_level,
        message: buildAlertMessage(prediction.risk_level, prediction.contributing_factors),
        isSystemGenerated: true,
      });
      const rec = buildRecommendation(prediction.contributing_factors);
      await db.insert(recommendations).values({
        studentId,
        riskAssessmentId,
        text: rec.text,
        category: rec.category,
        evidenceRefs: prediction.contributing_factors,
      });
      alertsFired += 1;
    }

    await db
      .update(predictionRuns)
      .set({
        modelId: xgbModel.id,
        finishedAt: new Date(),
        recordsProcessed: xgbAssessments.length,
        status: "succeeded",
      })
      .where(eq(predictionRuns.id, run.id));

    await db.insert(auditLogs).values({
      userId: null,
      actorType: "ml_service",
      action: "prediction_run.complete",
      resourceType: "prediction_runs",
      resourceId: run.id,
      metadata: {
        triggeredByUserId: session.user.id,
        studentsProcessed: xgbAssessments.length,
        alertsFired,
        xgboostVersion: xgbTrain.version,
        bilstmVersion: bilstmTrain.version,
      },
    });

    revalidatePath("/admin/models");
    revalidatePath("/admin/risk-review");

    return NextResponse.json({
      predictionRunId: run.id,
      studentsProcessed: xgbAssessments.length,
      alertsFired,
      xgboost: { version: xgbTrain.version, metrics: xgbTrain.metrics },
      bilstm: { version: bilstmTrain.version, metrics: bilstmTrain.metrics },
    });
  } catch (err) {
    await db
      .update(predictionRuns)
      .set({ finishedAt: new Date(), status: "failed", errorDetail: err instanceof Error ? err.message : String(err) })
      .where(eq(predictionRuns.id, run.id));
    return NextResponse.json({ error: err instanceof Error ? err.message : "prediction run failed" }, { status: 500 });
  }
}
