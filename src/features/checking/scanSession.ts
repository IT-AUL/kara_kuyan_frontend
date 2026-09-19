import { useSyncExternalStore } from 'react';

import { newUuid, ocrEngine, offlineBundles, syncEngine, syncScheduler } from '@/composition';
import { demoStudents } from '@/demo/demo-data';
import { demoGradeForPercent, scorePercent } from '@/domain/assessment/grading';
import type { Override, SheetOutcome } from '@/domain/scan/evaluate';
import { evaluateSheet, scoreOutcome } from '@/domain/scan/evaluate';
import { buildSubmission } from '@/domain/sync/payload';
import { matchStudent } from '@/domain/roster/match';
import type { Student } from '@/domain/assessment/model';
import type { AlignmentState, OcrSession } from '@/ports/ocr-engine';

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

/** Class id until the roster comes from the backend (slice 3). */
const DEMO_CLASS_ID = 'cls_7a_2026';

let state: State = initial;
const listeners = new Set<() => void>();
let session: OcrSession | null = null;

async function getSession(): Promise<OcrSession> {
  session ??= await ocrEngine.openSession({
    template: {
      format: 'A4',
      cellSizeMm: { width: 10, height: 10 },
      questions: offlineBundles[0].variants[0].questions.map((q) => ({
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
    if (state.phase === 'processing') return;
    set({ phase: 'processing', error: null, outcome: null, overrides: {}, student: null, studentMatched: false });
    const started = Date.now();
    try {
      const active = await getSession();
      const evidence = await active.captureSheet();
      const outcome = evaluateSheet(evidence, offlineBundles);
      if (!outcome.check.ok) {
        console.log(`[scan] rejected: ${outcome.check.reason} (${outcome.check.detail})`);
        set({ phase: 'error', error: rejectionMessage(outcome.check) });
        return;
      }
      const student = matchStudent(outcome.studentNameText, demoStudents);
      const captureMs = Date.now() - started;
      console.log(`[scan] captured+evaluated in ${captureMs} ms; stages ${JSON.stringify(evidence.stageTimingsMs)}; method ${evidence.method}`);
      set({ phase: 'ready', outcome, student, studentMatched: student !== null, captureMs });
    } catch (e) {
      console.log(`[scan] failed: ${String(e)}`);
      set({ phase: 'error', error: friendly(e) });
    }
  },

  async watchAlignment(listener: (state: AlignmentState) => void): Promise<() => void> {
    return (await getSession()).onAlignment(listener);
  },

  selectStudent(id: string) {
    set({ student: demoStudents.find((s) => s.id === id) ?? null, studentMatched: false });
  },

  override(taskNumber: number, verdict: Override) {
    set({ overrides: { ...state.overrides, [taskNumber]: verdict } });
  },

  /** Stores the checked sheet and its outbox row in one transaction, then nudges the sync engine. */
  async save() {
    const { outcome, student, overrides } = state;
    if (!outcome || !student) return;
    const { score, maxScore } = scoreOutcome(outcome, overrides);
    const uuid = newUuid();
    const now = Date.now();
    await syncEngine.enqueue({
      uuid,
      assignmentId: outcome.assignmentId,
      classId: DEMO_CLASS_ID,
      savedAt: now,
      payload: buildSubmission({
        uuid, outcome, overrides, student, checkedAt: new Date(now),
        grade: demoGradeForPercent(scorePercent(score, maxScore)),
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
