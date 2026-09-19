import type { ApiResult } from '@/adapters/api/client';
import type {
  AssignmentAnalytics,
  ClassAnalytics,
  ClassRoster,
  ClassSummary,
  ModelManifest,
  SubmissionRow,
  TaskBankEntry,
  TaskType,
  TestSummary,
} from '@/adapters/api/backend';
import { backendApi, kvStore } from '@/composition';
import type { OfflineBundle } from '@/domain/scan/bundle';

import { Resource } from './resource';

const offline = <T,>(): Promise<ApiResult<T>> =>
  Promise.resolve({ ok: false, error: { kind: 'network', message: 'backend disabled (EXPO_PUBLIC_API_URL=fake)' } });

function memo<K extends string, T>(make: (key: K) => Resource<T>) {
  const map = new Map<K, Resource<T>>();
  return (key: K): Resource<T> => {
    let r = map.get(key);
    if (!r) {
      r = make(key);
      map.set(key, r);
    }
    return r;
  };
}

export const classesResource = new Resource<ClassSummary[]>('classes', () => backendApi?.listClasses() ?? offline(), kvStore);
export const testsResource = new Resource<TestSummary[]>('tests', () => backendApi?.listTests() ?? offline(), kvStore);
export const bankResource = new Resource<TaskBankEntry[]>('bank', () => backendApi?.searchTasks({}) ?? offline(), kvStore);

export const taskTypesResource = new Resource<TaskType[]>('task-types', () => backendApi?.taskTypes() ?? offline(), kvStore);
/** The recogniser's alphabet, used to validate teacher-written answers. */
export const manifestResource = new Resource<ModelManifest>('model-manifest', () => backendApi?.modelManifest() ?? offline(), kvStore);

export const rosterResource = memo<string, ClassRoster>(
  (classId) => new Resource(`roster:${classId}`, () => backendApi?.classRoster(classId) ?? offline(), kvStore),
);
export const bundleResource = memo<string, OfflineBundle>(
  (id) => new Resource(`bundle:${id}`, () => backendApi?.fetchBundle(id) ?? offline(), kvStore),
);
export const classAnalyticsResource = memo<string, ClassAnalytics>(
  (classId) => new Resource(`analytics-class:${classId}`, () => backendApi?.classAnalytics(classId) ?? offline(), kvStore),
);
export const assignmentAnalyticsResource = memo<string, AssignmentAnalytics>(
  (id) => new Resource(`analytics-assignment:${id}`, () => backendApi?.assignmentAnalytics(id) ?? offline(), kvStore),
);
/** Key is `classId|assignmentId` (either may be empty). */
export const submissionsResource = memo<string, SubmissionRow[]>((key) => {
  const [classId, assignmentId] = key.split('|');
  return new Resource(
    `submissions:${key}`,
    () => backendApi?.listSubmissions({ classId: classId || undefined, assignmentId: assignmentId || undefined }) ?? offline(),
    kvStore,
  );
});

/**
 * Every assignment bundle the phone knows: the cached copy first, refreshed from the server when a network
 * is there. Scanning uses this as its catalog, so it works offline for anything fetched before.
 */
export async function loadBundleCatalog(): Promise<OfflineBundle[]> {
  await testsResource.refresh();
  const tests = testsResource.getState().data ?? [];
  await Promise.all(tests.map((t) => bundleResource(t.testId).refresh()));
  return knownBundles();
}

export function knownBundles(): OfflineBundle[] {
  return (testsResource.getState().data ?? [])
    .map((t) => bundleResource(t.testId).getState().data)
    .filter((b): b is OfflineBundle => b !== null);
}

/** Fetches one bundle by id (a sheet whose assignment is not cached yet). */
export async function ensureBundle(assignmentId: string): Promise<OfflineBundle | null> {
  const r = bundleResource(assignmentId);
  if (!r.getState().data) await r.refresh();
  return r.getState().data;
}

export type ProgressPoint = { assignmentId: string; label: string; value: number; at: string };

/**
 * Class average per assignment, oldest first. The backend has no time series, so it is derived from the
 * submission lists of every known test (average of score/max per test).
 */
export const progressResource = memo<string, ProgressPoint[]>(
  (classId) =>
    new Resource(
      `progress:${classId}`,
      async (): Promise<ApiResult<ProgressPoint[]>> => {
        if (!backendApi) return offline();
        const tests = testsResource.getState().data ?? [];
        const points: ProgressPoint[] = [];
        for (const t of tests) {
          const r = await backendApi.listSubmissions({ classId, assignmentId: t.testId });
          if (!r.ok) return r;
          if (r.value.length === 0) continue;
          const avg = r.value.reduce((sum, x) => sum + (x.maxScore > 0 ? x.score / x.maxScore : 0), 0) / r.value.length;
          const at = r.value.map((x) => x.checkedAt).sort()[0];
          points.push({ assignmentId: t.testId, label: t.title.slice(0, 8), value: Math.round(avg * 100), at });
        }
        return { ok: true, value: points.sort((a, b) => a.at.localeCompare(b.at)) };
      },
      kvStore,
    ),
);
