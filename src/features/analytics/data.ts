import { useMemo } from 'react';

import type {
  AssignmentAnalytics,
  ClassAnalytics,
  ClassAssignment,
  QuestionStat,
  StudentPerformance,
  WrongAnswer,
} from '@/adapters/api/backend';
import {
  assignmentAnalyticsResource,
  classAnalyticsResource,
  classAssignmentsResource,
  progressResource,
  testsResource,
} from '@/data/hub';
import { useResource } from '@/data/resource';
import { useTestOverview } from '@/data/testOverview';

export type {
  AssignmentAnalytics,
  ClassAnalytics,
  ClassAssignment,
  QuestionStat,
  StudentPerformance,
  WrongAnswer,
};

export type AnalyticsStatus = 'loading' | 'ready' | 'offline' | 'error';

export function useClassInsights(classId: string | null): {
  analytics: ClassAnalytics | null;
  assignments: ClassAssignment[];
  trend: number[];
  status: AnalyticsStatus;
  refresh: () => Promise<void>;
} {
  const analyticsRes = useResource(classId ? classAnalyticsResource(classId) : null);
  const assignmentsRes = useResource(classId ? classAssignmentsResource(classId) : null);
  const progressRes = useResource(classId ? progressResource(classId) : null);

  return useMemo(() => {
    const assignments = [...(assignmentsRes.data ?? [])].sort((a, b) => {
      if (a.dueDate && b.dueDate) return b.dueDate.localeCompare(a.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    const trend = (progressRes.data ?? []).map((p) =>
      Math.round(p.value > 0 && p.value <= 1 ? p.value * 100 : p.value),
    );

    let status: AnalyticsStatus = 'ready';
    if (analyticsRes.status === 'error') {
      status = 'error';
    } else if (analyticsRes.offline || assignmentsRes.offline || progressRes.offline) {
      status = 'offline';
    } else if (
      classId &&
      (analyticsRes.status === 'loading' || analyticsRes.status === 'idle') &&
      !analyticsRes.data
    ) {
      status = 'loading';
    }

    return {
      analytics: analyticsRes.data,
      assignments,
      trend,
      status,
      refresh: async () => {
        await Promise.all([
          analyticsRes.refresh(),
          assignmentsRes.refresh(),
          progressRes.refresh(),
        ]);
      },
    };
  }, [analyticsRes, assignmentsRes, progressRes, classId]);
}

export function useTestResults(assignmentId: string | null): {
  title: string | null;
  analytics: AssignmentAnalytics | null;
  overview: ReturnType<typeof useTestOverview>;
  status: AnalyticsStatus;
  refresh: () => Promise<void>;
} {
  const analyticsRes = useResource(assignmentId ? assignmentAnalyticsResource(assignmentId) : null);
  const testsRes = useResource(testsResource);
  const overview = useTestOverview(assignmentId);

  return useMemo(() => {
    const title =
      analyticsRes.data?.title ??
      overview.bundle?.title ??
      testsRes.data?.find((t) => t.testId === assignmentId)?.title ??
      null;

    let status: AnalyticsStatus = 'ready';
    if (analyticsRes.status === 'error') {
      status = 'error';
    } else if (analyticsRes.offline || overview.offline) {
      status = 'offline';
    } else if (
      assignmentId &&
      (analyticsRes.status === 'loading' || analyticsRes.status === 'idle') &&
      !analyticsRes.data
    ) {
      status = 'loading';
    }

    return {
      title,
      analytics: analyticsRes.data,
      overview,
      status,
      refresh: async () => {
        await Promise.all([analyticsRes.refresh(), overview.refresh()]);
      },
    };
  }, [analyticsRes, testsRes.data, overview, assignmentId]);
}
