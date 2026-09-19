export interface ScoredComponent {
  weightPct: number;
  maxScore: number;
  score: number;
}

export interface FinalGradeResult {
  weightedTotal: number;
  letterGrade: string;
  gpaPoints: number;
}

/**
 * Computes the weighted percentage, letter grade, and GPA points
 * for an array of graded assessment components.
 * Returns null if no components are scored.
 */
export function computeFinalGrade(scored: ScoredComponent[]): FinalGradeResult | null {
  if (!scored || scored.length === 0) {
    return null;
  }

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const item of scored) {
    if (item.maxScore <= 0 || item.weightPct <= 0) continue;
    const ratio = Math.max(0, Math.min(item.score / item.maxScore, 1.5));
    earnedWeight += ratio * item.weightPct;
    totalWeight += item.weightPct;
  }

  if (totalWeight === 0) {
    return null;
  }

  // Normalize to 100% scale if total weight evaluated so far is less than or equals 100
  const percentage = (earnedWeight / totalWeight) * 100;
  const weightedTotal = Math.round(percentage * 100) / 100;

  let letterGrade: string;
  let gpaPoints: number;

  if (weightedTotal >= 90) {
    letterGrade = "A";
    gpaPoints = 4.0;
  } else if (weightedTotal >= 85) {
    letterGrade = "A-";
    gpaPoints = 3.7;
  } else if (weightedTotal >= 80) {
    letterGrade = "B+";
    gpaPoints = 3.3;
  } else if (weightedTotal >= 75) {
    letterGrade = "B";
    gpaPoints = 3.0;
  } else if (weightedTotal >= 70) {
    letterGrade = "B-";
    gpaPoints = 2.7;
  } else if (weightedTotal >= 65) {
    letterGrade = "C+";
    gpaPoints = 2.3;
  } else if (weightedTotal >= 60) {
    letterGrade = "C";
    gpaPoints = 2.0;
  } else if (weightedTotal >= 55) {
    letterGrade = "C-";
    gpaPoints = 1.7;
  } else if (weightedTotal >= 50) {
    letterGrade = "D";
    gpaPoints = 1.0;
  } else {
    letterGrade = "F";
    gpaPoints = 0.0;
  }

  return {
    weightedTotal,
    letterGrade,
    gpaPoints,
  };
}
