import {
  evaluateQuestion,
  proposedThresholds,
  type CellVerdict,
  type DecisionThresholds,
  type TaskOcrStatus,
} from '../ocr/decision';
import type { SheetEvidence } from '../ocr/evidence';
import { parseQrSignature, type OfflineBundle } from './bundle';

export type EvaluatedCell = {
  index: number;
  /** Expected character from the bundle; a space where the cell must stay empty. */
  expected: string;
  /** Top-1 character read; a space when the cell was empty. */
  predicted: string;
  /** Probability of the predicted character (1 for an empty cell). */
  confidence: number;
  verdict: CellVerdict;
};

export type EvaluatedTask = {
  number: number;
  markerId: number;
  prompt: string;
  topicTag: string;
  expected: string;
  /** Top-1 text per cell; empty cells are spaces. */
  recognized: string;
  status: TaskOcrStatus;
  cells: readonly EvaluatedCell[];
};

/** Whether the sheet belongs to a known assignment; the app shows no result for a sheet that fails this. */
export type SheetCheck =
  | { ok: true }
  | {
      ok: false;
      reason: 'qr-unreadable' | 'unknown-assignment' | 'unknown-variant' | 'question-count-mismatch';
      detail: string;
    };

export type SheetOutcome = {
  check: SheetCheck;
  assignmentId: string;
  variant: number;
  qrRecognised: boolean;
  tasks: readonly EvaluatedTask[];
  studentNameText: string;
};

export type Override = 'accept' | 'reject';

function maxProbability(probabilities: readonly number[]): { index: number; probability: number } {
  let best = 0;
  for (let i = 1; i < probabilities.length; i += 1) if (probabilities[i] > probabilities[best]) best = i;
  return { index: best, probability: probabilities[best] ?? 0 };
}

function rejected(check: Extract<SheetCheck, { ok: false }>, evidence: SheetEvidence, assignmentId = ''): SheetOutcome {
  return { check, assignmentId, variant: 0, qrRecognised: check.reason !== 'qr-unreadable', tasks: [], studentNameText: evidence.studentNameText };
}

/**
 * Compares recognised evidence with the expected answers, task by task. The sheet is first matched to a
 * known assignment through its QR (`tid`, `var`, `n_q`): an unreadable QR, an unknown assignment or
 * variant, or a different number of tasks yields a rejected outcome instead of a silent guess.
 */
export function evaluateSheet(
  evidence: SheetEvidence,
  bundles: OfflineBundle | readonly OfflineBundle[],
  thresholds: DecisionThresholds = proposedThresholds,
): SheetOutcome {
  const catalog = Array.isArray(bundles) ? (bundles as readonly OfflineBundle[]) : [bundles as OfflineBundle];
  const qr = parseQrSignature(evidence.qrPayload);
  if (!qr) {
    return rejected({ ok: false, reason: 'qr-unreadable', detail: 'QR не прочитан' }, evidence);
  }
  const bundle = catalog.find((b) => b.assignmentId === qr.assignmentId);
  if (!bundle) {
    return rejected({ ok: false, reason: 'unknown-assignment', detail: qr.assignmentId }, evidence, qr.assignmentId);
  }
  const variant = bundle.variants.find((v) => v.variantId === qr.variant);
  if (!variant) {
    return rejected({ ok: false, reason: 'unknown-variant', detail: String(qr.variant) }, evidence, bundle.assignmentId);
  }
  if (qr.questionCount !== null && qr.questionCount !== variant.questions.length) {
    return rejected(
      { ok: false, reason: 'question-count-mismatch', detail: `${qr.questionCount} вместо ${variant.questions.length}` },
      evidence,
      bundle.assignmentId,
    );
  }

  const tasks = variant.questions.map<EvaluatedTask>((q) => {
    const seen = evidence.questions.find((e) => e.markerId === q.markerId);
    const base = {
      number: q.questionNumber,
      markerId: q.markerId,
      prompt: q.prompt,
      topicTag: q.topicTag,
      expected: q.expectedAnswer,
    };
    if (!seen) {
      const cells = q.expectedCells.map<EvaluatedCell>((c, index) => ({
        index, expected: c.char, predicted: ' ', confidence: 1, verdict: 'blank',
      }));
      return { ...base, recognized: '', status: 'missing', cells };
    }
    const decision = evaluateQuestion(
      seen,
      q.expectedCells.map((c) => ({ char: c.char })),
      evidence.alphabet,
      thresholds,
    );
    const cells = seen.cells.map<EvaluatedCell>((c, index) => {
      const top = c.isEmpty ? null : maxProbability(c.probabilities);
      return {
        index,
        expected: q.expectedCells[index]?.char ?? ' ',
        predicted: top === null ? ' ' : (evidence.alphabet[top.index] ?? '?'),
        confidence: top === null ? 1 : Math.round(top.probability * 1000) / 1000,
        verdict: decision.cells[index]?.verdict ?? 'uncertain',
      };
    });
    const recognized = cells.map((c) => c.predicted).join('').trimEnd();
    return { ...base, recognized, status: decision.status, cells };
  });

  return {
    check: { ok: true },
    assignmentId: bundle.assignmentId,
    variant: variant.variantId,
    qrRecognised: true,
    tasks,
    studentNameText: evidence.studentNameText,
  };
}

/** Status shown to the teacher after their overrides. */
export function effectiveStatus(task: EvaluatedTask, override: Override | undefined): TaskOcrStatus {
  if (override === 'accept') return 'correct';
  if (override === 'reject') return 'error';
  return task.status;
}

export function scoreOutcome(
  outcome: SheetOutcome,
  overrides: Readonly<Record<number, Override>>,
): { score: number; maxScore: number; reviewLeft: number } {
  let score = 0;
  let reviewLeft = 0;
  for (const task of outcome.tasks) {
    const status = effectiveStatus(task, overrides[task.number]);
    if (status === 'correct') score += 1;
    if (status === 'review') reviewLeft += 1;
  }
  return { score, maxScore: outcome.tasks.length, reviewLeft };
}
