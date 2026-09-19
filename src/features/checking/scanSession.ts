import { useSyncExternalStore } from 'react';

import { newUuid, ocrEngine, syncEngine, syncScheduler } from '@/composition';
import { ensureBundle, knownBundles, loadBundleCatalog, rosterResource } from '@/data/hub';
import { session as appSession } from '@/data/session';
import { gradeForPercent, scorePercent } from '@/domain/assessment/grading';
import type { OfflineBundle } from '@/domain/scan/bundle';
import { parseQrSignature } from '@/domain/scan/bundle';
import type { Override, SheetOutcome } from '@/domain/scan/evaluate';
import { evaluateSheet, scoreOutcome } from '@/domain/scan/evaluate';
import { buildSubmission } from '@/domain/sync/payload';
import { matchStudent } from '@/domain/roster/match';
import type { Student } from '@/domain/assessment/model';
import { SheetPickCancelled, type AlignmentState, type OcrSession } from '@/ports/ocr-engine';
import type { SheetEvidence } from '@/domain/ocr/evidence';

export type ScanPhase = 'idle' | 'processing' | 'ready' | 'error';

type State = {
  phase: ScanPhase;
  error: string | null;
  outcome: SheetOutcome | null;
  student: Student | null;
  studentMatched: boolean;
  overrides: Readonly<Record<number, Override>>;
  captureMs: number | null;
};

const initial: State = {
  phase: 'idle', error: null, outcome: null, student: null, studentMatched: false,
  overrides: {}, captureMs: null,
};

let state: State = initial;
const listeners = new Set<() => void>();
let session: OcrSession | null = null;

async function getSession(): Promise<OcrSession> {
  session ??= await ocrEngine.openSession({
    template: {
      format: 'A4',
      cellSizeMm: { width: 10, height: 10 },
      questions: (knownBundles()[0]?.variants[0]?.questions ?? []).map((q) => ({
        questionNumber: q.questionNumber, markerId: q.markerId, cellCount: q.expectedCells.length,
      })),
    },
  });
  return session;
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function friendly(error: unknown): string {
  const text = String(error);
  if (text.includes('NOT_ALIGNED')) return 'Не удалось выровнять лист: закройте камерой все четыре угловых маркера.';
  if (text.includes('CAMERA_NOT_STARTED')) return 'Камера не запущена.';
  if (text.includes('CAPTURE_TIMEOUT')) return 'Камера не ответила вовремя. Попробуйте ещё раз.';
  return 'Не удалось обработать лист. Попробуйте ещё раз.';
}

function rejectionMessage(check: Extract<SheetOutcome['check'], { ok: false }>): string {
  switch (check.reason) {
    case 'qr-unreadable':
      return 'Не удалось прочитать QR-код на листе. Держите лист ровнее и сканируйте заново.';
    case 'unknown-assignment':
      return `Этот лист относится к другой работе (${check.detail}), которой нет в загруженных заданиях.`;
    case 'unknown-variant':
      return `В этой работе нет варианта ${check.detail}.`;
    case 'question-count-mismatch':
      return `Лист не соответствует заданию: заданий на листе ${check.detail}.`;
  }
}

/** Students of the active class as the domain's `Student`; the backend roster has no printed code, so the id stands in. */
export function currentRoster(variant: number): Student[] {
  const classId = appSession.getState().activeClassId;
  const roster = classId ? rosterResource(classId).getState().data : null;
  return (roster?.students ?? []).map((s) => ({ id: s.studentId, name: s.fullName, code: s.studentId, variant }));
}

export type ScanResult = 'done' | 'cancelled';

/** Reads a sheet (camera or picked file), then evaluates it against the cached assignment bundles. */
async function processSheet(read: (session: OcrSession) => Promise<SheetEvidence>, phaseWhileReading: boolean): Promise<ScanResult> {
  if (state.phase === 'processing') return 'done';
  set({ phase: phaseWhileReading ? 'processing' : 'idle', error: null, outcome: null, overrides: {}, student: null, studentMatched: false });
  const started = Date.now();
  try {
    const active = await getSession();
    const evidence = await read(active);
    const readStarted = Date.now();
    set({ phase: 'processing' });
    let catalog: OfflineBundle[] = knownBundles();
    if (catalog.length === 0) catalog = await loadBundleCatalog();
    let outcome = evaluateSheet(evidence, catalog);
    if (!outcome.check.ok && outcome.check.reason === 'unknown-assignment') {
      // a sheet of an assignment this phone has not cached yet: fetch it once and retry
      const tid = parseQrSignature(evidence.qrPayload)?.assignmentId;
      if (tid && (await ensureBundle(tid))) outcome = evaluateSheet(evidence, knownBundles());
    }
    if (!outcome.check.ok) {
      console.log(`[scan] rejected: ${outcome.check.reason} (${outcome.check.detail})`);
      set({ phase: 'error', error: rejectionMessage(outcome.check) });
      return 'done';
    }
    const roster = currentRoster(outcome.variant);
    const student = matchStudent(outcome.studentNameText, roster);
    const captureMs = Date.now() - (phaseWhileReading ? started : readStarted);
    console.log(`[scan] captured+evaluated in ${captureMs} ms; stages ${JSON.stringify(evidence.stageTimingsMs)}; method ${evidence.method}`);
    set({ phase: 'ready', outcome, student, studentMatched: student !== null, captureMs });
    return 'done';
  } catch (e) {
    if (e instanceof SheetPickCancelled) {
      set({ phase: 'idle' });
      return 'cancelled';
    }
    console.log(`[scan] failed: ${String(e)}`);
    set({ phase: 'error', error: friendly(e) });
    return 'done';
  }
}

export const scanSession = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Captures the current frame, reads it on the device and evaluates it against the bundle. */
  async run() {
    await processSheet((active) => active.captureSheet(), true);
  },

  /** Same as `run`, but the sheet is an image the teacher picks from the phone (never copied, ADR 0007). */
  runFromFile(): Promise<ScanResult> {
    return processSheet((active) => active.readSheetFromDevice(), false);
  },

  async watchAlignment(listener: (state: AlignmentState) => void): Promise<() => void> {
    return (await getSession()).onAlignment(listener);
  },

  selectStudent(id: string) {
    set({ student: currentRoster(state.outcome?.variant ?? 1).find((s) => s.id === id) ?? null, studentMatched: false });
  },

  override(taskNumber: number, verdict: Override) {
    set({ overrides: { ...state.overrides, [taskNumber]: verdict } });
  },

  /** Stores the checked sheet and its outbox row in one transaction, then nudges the sync engine. */
  async save() {
    const { outcome, student, overrides } = state;
    if (!outcome || !student) return;
    const { score, maxScore } = scoreOutcome(outcome, overrides);
    const { profile, activeClassId } = appSession.getState();
    if (!profile || !activeClassId) {
      set({ error: 'Выберите класс, прежде чем сохранять результат.' });
      return;
    }
    const classId = activeClassId;
    const uuid = newUuid();
    const now = Date.now();
    await syncEngine.enqueue({
      uuid,
      assignmentId: outcome.assignmentId,
      classId,
      savedAt: now,
      payload: buildSubmission({
        uuid, outcome, overrides, student, checkedAt: new Date(now),
        grade: gradeForPercent(scorePercent(score, maxScore), profile.gradingScale),
      }),
    });
    set({ phase: 'idle', outcome: null, overrides: {}, student: null, studentMatched: false, error: null });
    void syncScheduler.trigger();
  },

  reset() {
    set({ phase: 'idle', outcome: null, overrides: {}, student: null, studentMatched: false, error: null });
  },
};

export function useScanSession(): State {
  return useSyncExternalStore(scanSession.subscribe, scanSession.getState, scanSession.getState);
}
