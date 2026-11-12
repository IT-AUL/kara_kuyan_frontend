import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { notificationsPort } from '@/composition';
import { useActiveContext } from '@/data/context';
import { classAnalyticsResource } from '@/data/hub';
import { useResource } from '@/data/resource';
import { useSyncState } from '@/data/syncState';

import { notificationCenter } from './notificationCenter';

/**
 * Root-mounted observer (active when teacher profile exists):
 * 1. Registers Android notification channels & action buttons on startup (without cold-start permission popup).
 * 2. Routes notification / action-button taps directly into Expo Router.
 * 3. Feeds live checking, sync, and class-analytics signals into `notificationCenter`.
 */
export function NotificationObserver() {
  const router = useRouter();
  const ctx = useActiveContext();
  const { counts } = useSyncState();
  const analytics = useResource(ctx.classId ? classAnalyticsResource(ctx.classId) : null);

  useEffect(() => {
    void notificationCenter.init();
    const offResponse = notificationsPort.onResponse((tap) => {
      router.push(tap.targetRoute as Href);
    });
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void notificationCenter.refreshPermission();
      }
    });
    return () => {
      offResponse();
      appSub.remove();
    };
  }, [router]);

  const topMistake = (() => {
    const list = (analytics.data?.topMistakes ?? []).filter((m) => m.affectedStudents > 0);
    const sorted = [...list].sort((a, b) => b.failureRatePct - a.failureRatePct);
    const first = sorted[0];
    if (!first) return null;
    return {
      topicCode: first.topicCode,
      topicName: first.topicName,
      affectedStudents: first.affectedStudents,
      failureRatePct: first.failureRatePct,
    };
  })();

  useEffect(() => {
    void notificationCenter.syncLiveState({
      classId: ctx.classId,
      className: ctx.className,
      assignmentId: ctx.assignmentId,
      assignmentTitle: ctx.assignmentTitle,
      checkedCount: ctx.progress.checkedCount,
      studentCount: ctx.progress.studentCount,
      outboxCounts: counts,
      topMistake,
    });
  }, [
    ctx.classId,
    ctx.className,
    ctx.assignmentId,
    ctx.assignmentTitle,
    ctx.progress.checkedCount,
    ctx.progress.studentCount,
    counts,
    topMistake,
  ]);

  return null;
}
