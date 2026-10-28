// Single source of truth for turning raw grade_entries into a weighted
// total / letter grade / GPA points — used by both the seed script and the
// real grade-entry route handler so seeded data and live data are computed
// identically.

export interface ScoredComponent {
  weightPct: number;
  maxScore: number;
  score: number; // most recent (non-superseded) score for this component
}

export interface FinalGradeResult {
  weightedTotal: number; // 0-100
  letterGrade: string;
  gpaPoints: number; // 0.0-4.0
}

const GRADE_SCALE: { min: number; letter: string; points: number }[] = [
  { min: 93, letter: "A", points: 4.0 },
  { min: 90, letter: "A-", points: 3.7 },
  { min: 87, letter: "B+", points: 3.3 },
  { min: 83, letter: "B", points: 3.0 },
  { min: 80, letter: "B-", points: 2.7 },
  { min: 77, letter: "C+", points: 2.3 },
  { min: 73, letter: "C", points: 2.0 },
  { min: 70, letter: "C-", points: 1.7 },
  { min: 67, letter: "D+", points: 1.3 },
  { min: 60, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0.0 },
];

export function scoreToLetterAndPoints(percent: number): { letter: string; points: number } {
  const row = GRADE_SCALE.find((r) => percent >= r.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { letter: row.letter, points: row.points };
}

/**
 * Weighted total is normalized against the sum of weights actually graded
 * so far (not all assessmentComponents for the section) — this lets
 * mid-semester grades be meaningful before every component has a score,
 * matching S-12's "predicted final grade where sufficient data exists".
 */
export function computeFinalGrade(components: ScoredComponent[]): FinalGradeResult | null {
  if (components.length === 0) return null;

  const totalWeight = components.reduce((sum, c) => sum + c.weightPct, 0);
  if (totalWeight === 0) return null;

  const weightedSum = components.reduce((sum, c) => {
    const pct = (c.score / c.maxScore) * 100;
    return sum + pct * c.weightPct;
  }, 0);

  const weightedTotal = weightedSum / totalWeight;
  const { letter, points } = scoreToLetterAndPoints(weightedTotal);

  return {
    weightedTotal: Math.round(weightedTotal * 100) / 100,
    letterGrade: letter,
    gpaPoints: points,
  };
}
