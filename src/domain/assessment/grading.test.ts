import {
  defaultGradeScale,
  gradeForPercent,
  scorePercent,
  summarizeAssessmentProgress,
} from './grading';

describe('assessment demo grading', () => {
  it('floors sheet percentage for teacher-facing display', () => {
    expect(scorePercent(7, 8)).toBe(87);
    expect(scorePercent(0, 8)).toBe(0);
  });

  it('maps demo percentage to the product example grade', () => {
    expect(gradeForPercent(87, defaultGradeScale)).toBe(5);
    expect(gradeForPercent(84, defaultGradeScale)).toBe(4);
    expect(gradeForPercent(49, defaultGradeScale)).toBe(2);
  });

  it('summarizes class checking progress', () => {
    expect(
      summarizeAssessmentProgress({
        studentCount: 25,
        checkedCount: 18,
        reviewCount: 4,
      }),
    ).toEqual({
      studentCount: 25,
      checkedCount: 18,
      reviewCount: 4,
      remainingCount: 7,
      completionPercent: 72,
    });
  });
});

describe('gradeForPercent', () => {
  it('uses the teacher scale, not a fixed one', () => {
    const strict = { grade5MinPct: 90, grade4MinPct: 75, grade3MinPct: 60 };
    expect([100, 90, 89, 75, 74, 60, 59].map((p) => gradeForPercent(p, strict))).toEqual([5, 5, 4, 4, 3, 3, 2]);
  });
});
