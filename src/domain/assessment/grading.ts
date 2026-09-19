export type AssessmentProgress = {
  studentCount: number;
  checkedCount: number;
  reviewCount: number;
};

export type AssessmentProgressSummary = AssessmentProgress & {
  remainingCount: number;
  completionPercent: number;
};

export function scorePercent(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.floor((score / maxScore) * 100);
}

export type GradeScale = { grade5MinPct: number; grade4MinPct: number; grade3MinPct: number };

/** The backend's default scale, used only until the handshake supplies the teacher's own. */
export const defaultGradeScale: GradeScale = { grade5MinPct: 85, grade4MinPct: 70, grade3MinPct: 50 };

/** Grade 2–5 for a percent under the teacher's own scale (from the backend handshake preferences). */
export function gradeForPercent(percent: number, scale: GradeScale): 2 | 3 | 4 | 5 {
  if (percent >= scale.grade5MinPct) return 5;
  if (percent >= scale.grade4MinPct) return 4;
  if (percent >= scale.grade3MinPct) return 3;
  return 2;
}

export function summarizeAssessmentProgress(
  progress: AssessmentProgress,
): AssessmentProgressSummary {
  return {
    ...progress,
    remainingCount: Math.max(progress.studentCount - progress.checkedCount, 0),
    completionPercent: scorePercent(progress.checkedCount, progress.studentCount),
  };
}
