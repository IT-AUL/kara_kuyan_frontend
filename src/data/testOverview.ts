import { useMemo } from 'react';

import type { RosterStudent, SubmissionRow } from '@/adapters/api/backend';
import { averagePercent, gradeCounts, progressOf, studentRows, taskHits, type CheckedWork } from '@/domain/tests/summary';

import { useSyncState } from './syncState';
import { assignmentAnalyticsResource, bundleResource, rosterResource, submissionsResource } from './hub';
import { useResource } from './resource';
import { useSession } from './session';

const toWork = (r: SubmissionRow): CheckedWork => ({
  studentId: r.studentId, studentName: r.studentName, score: r.score, maxScore: r.maxScore, grade: r.grade, checkedAt: r.checkedAt, tasks: r.tasks,
});

/**
 * Everything the test page needs for one test in the active class: bundle (tasks), server analytics, roster,
 * checked works (server rows merged with sheets still waiting in the outbox) and the derived numbers.
 */
export function useTestOverview(testId: string | null) {
  const { activeClassId: classId } = useSession();
  const bundle = useResource(testId ? bundleResource(testId) : null);
  const analytics = useResource(testId ? assignmentAnalyticsResource(testId) : null);
  const roster = useResource(classId ? rosterResource(classId) : null);
  const remote = useResource(classId && testId ? submissionsResource(`${classId}|${testId}`) : null);
  const { rows: localRows } = useSyncState();

  return useMemo(() => {
    const byUuid = new Map<string, CheckedWork>();
    for (const r of remote.data ?? []) byUuid.set(r.uuid, toWork(r));
    for (const { submission } of localRows) {
      if (submission.classId !== classId || submission.assignmentId !== testId) continue;
      const p = submission.payload;
      byUuid.set(p.client_submission_uuid, {
        studentId: p.student_id, studentName: p.student_name, score: p.overall_score, maxScore: p.max_score, grade: p.final_grade,
        checkedAt: p.checked_at, tasks: p.questions_results.map((q) => ({ number: q.question_number, correct: q.is_correct })),
      });
    }
    const works = [...byUuid.values()];
    const students: RosterStudent[] = roster.data?.students ?? [];
    const rows = studentRows(students, works);
    return {
      bundle: bundle.data,
      bundleState: bundle,
      analytics: analytics.data,
      rosterState: roster,
      classId,
      rows,
      works,
      progress: progressOf(rows),
      average: averagePercent(works),
      grades: gradeCounts(works),
      hits: taskHits(works),
      refresh: () => Promise.all([bundle.refresh(), analytics.refresh(), roster.refresh(), remote.refresh()]),
      offline: remote.offline || roster.offline,
    };
  }, [bundle, analytics, roster, remote, localRows, classId, testId]);
}
