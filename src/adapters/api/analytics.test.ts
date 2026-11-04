import { parseAssignmentAnalytics, parseClassAnalytics, parseStudentAnalytics } from './backend';

describe('analytics parsers', () => {
  it('keeps every wrong submission with the written answer', () => {
    const r = parseAssignmentAnalytics({
      assignment_id: 'A1',
      title: 'Килешләр',
      total_submissions: 3,
      average_score_pct: 61.5,
      questions_analytics: [
        {
          question_number: 4,
          marker_id: 4,
          prompt: 'мәктәп',
          expected_answer: 'мәктәпкә',
          accuracy_pct: 33.3,
          wrong_submissions: [
            { student_id: 's1', student_name: 'Гарипов Айдар', written_answer: 'мәктәпка' },
            { student_id: 's2', student_name: 'Закирова Дина' },
          ],
        },
      ],
    });
    expect(r.questions[0].wrongCount).toBe(2);
    expect(r.questions[0].wrongAnswers).toEqual([
      { studentId: 's1', studentName: 'Гарипов Айдар', writtenAnswer: 'мәктәпка' },
      { studentId: 's2', studentName: 'Закирова Дина', writtenAnswer: '' },
    ]);
  });

  it('reads the class performance table and tolerates its absence', () => {
    const base = { class_id: 'c', class_name: '7-А', students_count: 2, average_class_score_pct: 70, grade_distribution: { '5': 1 }, top_class_mistakes: [], difficult_characters_across_class: [] };
    expect(parseClassAnalytics(base)).toMatchObject({ students: [], handwritingAttention: [] });
    const r = parseClassAnalytics({
      ...base,
      students_performance_table: [{ student_id: 's1', full_name: 'Гарипов Айдар', average_score_pct: 50, average_grade: 3, tests_completed: 2, handwriting_quality_pct: 91, handwriting_status: 'GOOD' }],
      students_needing_handwriting_attention: ['s1'],
    });
    expect(r.students[0]).toEqual({ studentId: 's1', fullName: 'Гарипов Айдар', averageScorePct: 50, averageGrade: 3, testsCompleted: 2, handwritingQualityPct: 91 });
    expect(r.handwritingAttention).toEqual(['s1']);
  });

  it('parses student analytics with history, topics and letters', () => {
    const r = parseStudentAnalytics({
      student_id: 's1',
      full_name: 'Гарипов Айдар',
      class_name: '7-А',
      total_tests_completed: 2,
      average_score_pct: 55,
      average_grade: 3,
      grade_distribution: { '3': 2 },
      frequent_weak_topics: [{ topic_code: 'case_dir', topic_name_tt: 'Юнәлеш килеше', total_questions: 10, wrong_count: 6, accuracy_pct: 40 }],
      problematic_letters: [{ letter: 'ә', total_occurrences: 12, misrecognized_or_wrong: 5, accuracy_pct: 58.3, common_confusions: ['а'] }],
      history: [{ submission_id: 'x', assignment_id: 'A1', assignment_title: 'Килешләр', date: null, score: 3, max_score: 6, grade: 3 }],
    });
    expect(r.weakTopics[0]).toMatchObject({ topicName: 'Юнәлеш килеше', accuracyPct: 40 });
    expect(r.problemLetters[0]).toMatchObject({ letter: 'ә', wrong: 5, confusions: ['а'] });
    expect(r.history[0]).toEqual({ assignmentId: 'A1', title: 'Килешләр', date: null, score: 3, maxScore: 6, grade: 3 });
    expect(r.handwritingQualityPct).toBeNull();
  });
});
