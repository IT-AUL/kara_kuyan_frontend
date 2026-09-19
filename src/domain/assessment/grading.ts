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

export function demoGradeForPercent(percent: number): 2 | 3 | 4 | 5 {
  if (percent >= 85) return 5;
  if (percent >= 70) return 4;
  if (percent >= 50) return 3;
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
