import {
  demoGradeForPercent,
  scorePercent,
  summarizeAssessmentProgress,
} from './grading';

describe('assessment demo grading', () => {
  it('floors sheet percentage for teacher-facing display', () => {
    expect(scorePercent(7, 8)).toBe(87);
    expect(scorePercent(0, 8)).toBe(0);
  });

  it('maps demo percentage to the product example grade', () => {
    expect(demoGradeForPercent(87)).toBe(5);
    expect(demoGradeForPercent(84)).toBe(4);
    expect(demoGradeForPercent(49)).toBe(2);
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
