import { useEffect, useMemo } from 'react';

import type { RosterStudent, SubmissionRow } from '@/adapters/api/backend';
import { useSyncState } from '@/data/syncState';

import { assignmentAnalyticsResource, bundleResource, classesResource, rosterResource, submissionsResource, testsResource } from './hub';
import { useResource } from './resource';
import { session, useSession } from './session';

export type Progress = { studentCount: number; checkedCount: number; remainingCount: number; percent: number };

/**
 * The teacher's working context: active class + active assignment, with roster, submissions (server rows
 * merged with sheets still waiting in the local outbox) and progress. One place, so every screen agrees.
 */
export function useActiveContext() {
  const s = useSession();
  const classes = useResource(classesResource);
  const tests = useResource(testsResource);

  useEffect(() => {
    session.ensureSelection();
  }, [classes.data]);

  useEffect(() => {
    const list = tests.data ?? [];
    if (list.length === 0) return;
    if (s.activeAssignmentId && list.some((t) => t.testId === s.activeAssignmentId)) return;
    const withBundle = list.find((t) => bundleResource(t.testId).getState().data !== null);
    session.selectAssignment((withBundle ?? list[0]).testId);
  }, [tests.data, s.activeAssignmentId]);

  const classId = s.activeClassId;
  const assignmentId = s.activeAssignmentId;
  const roster = useResource(classId ? rosterResource(classId) : null);
  const remote = useResource(classId && assignmentId ? submissionsResource(`${classId}|${assignmentId}`) : null);
  const analytics = useResource(assignmentId ? assignmentAnalyticsResource(assignmentId) : null);
  const { rows: localRows } = useSyncState();

  const submissions = useMemo<SubmissionRow[]>(() => {
    const byUuid = new Map<string, SubmissionRow>();
    for (const r of remote.data ?? []) byUuid.set(r.uuid, r);
    for (const { submission } of localRows) {
      if (submission.classId !== classId || submission.assignmentId !== assignmentId) continue;
      const p = submission.payload;
      byUuid.set(p.client_submission_uuid, {
        uuid: p.client_submission_uuid, studentId: p.student_id, studentName: p.student_name, variant: p.variant,
        checkedAt: p.checked_at, score: p.overall_score, maxScore: p.max_score, grade: p.final_grade, reviewedFlags: p.teacher_reviewed_flags,
        tasks: p.questions_results.map((q) => ({ number: q.question_number, correct: q.is_correct })),
      });
    }
    return [...byUuid.values()].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }, [remote.data, localRows, classId, assignmentId]);

  const students: RosterStudent[] = roster.data?.students ?? [];
  const checkedIds = new Set(submissions.map((x) => x.studentId));
  const studentCount = students.length;
  const progress: Progress = {
    studentCount,
    checkedCount: checkedIds.size,
    remainingCount: Math.max(studentCount - checkedIds.size, 0),
    percent: studentCount === 0 ? 0 : Math.floor((checkedIds.size / studentCount) * 100),
  };

  return {
    profile: s.profile,
    classes: classes.data ?? [],
    classesState: classes,
    classId,
    className: classes.data?.find((c) => c.classId === classId)?.name ?? roster.data?.className ?? null,
    tests: tests.data ?? [],
    testsState: tests,
    assignmentId,
    assignmentTitle: tests.data?.find((t) => t.testId === assignmentId)?.title ?? null,
    students,
    rosterState: roster,
    submissions,
    submissionsState: remote,
    analytics: analytics.data,
    progress,
    refreshAll: async () => {
      await Promise.all([classes.refresh(), tests.refresh(), roster.refresh(), remote.refresh(), analytics.refresh()]);
    },
  };
}
