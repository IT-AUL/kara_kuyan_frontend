import {
  evaluateQuestion,
  extractTopCandidates,
  v4Thresholds,
  type CellCandidate,
  type CellVerdict,
  type DecisionThresholds,
  type TaskOcrStatus,
} from '../ocr/decision';
import type { SheetEvidence } from '../ocr/evidence';
import { parseQrSignature, type OfflineBundle } from './bundle';

export type { CellCandidate };

export type EvaluatedCell = {
  index: number;
  /** Expected character from the bundle; a space where the cell must stay empty. */
  expected: string;
  /** Top-1 character read; a space when the cell was empty. */
  predicted: string;
  /** Probability of the predicted character (1 for an empty cell or teacher-fixed cell). */
  confidence: number;
  verdict: CellVerdict;
  /** Top-3 candidate hypotheses from the v4 model (`98.25%` recall on handwritten Tatar). */
  top3?: readonly CellCandidate[];
  /** True when the teacher explicitly confirmed/replaced this cell in 1 tap. */
  fixedByTeacher?: boolean;
};

export type EvaluatedTask = {
  number: number;
  markerId: number;
  prompt: string;
  topicTag: string;
  expected: string;
  /** Top-1 text per cell; empty cells are spaces, trailing spaces trimmed. */
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

export type RejectionReason = Extract<SheetCheck, { ok: false }>['reason'];

/** Non-blocking notes shown to the teacher next to a result. */
export type SheetWarning =
  /** The QR belongs to another test than the one currently selected; the result is saved under the sheet's own test. */
  | { kind: 'assignment-differs'; sheetAssignmentId: string; currentAssignmentId: string }
  /** The teacher chose to check a sheet the QR did not match; `because` is what was bypassed. */
  | { kind: 'forced'; because: RejectionReason; assignmentId: string; variantId: number };

export type ForceTarget = { bundle: OfflineBundle; variantId: number; because: RejectionReason };

export type SheetOutcome = {
  check: SheetCheck;
  warnings?: readonly SheetWarning[];
  assignmentId: string;
  variant: number;
  qrRecognised: boolean;
  tasks: readonly EvaluatedTask[];
  studentNameText: string;
};

export type Override = 'accept' | 'reject';

/** Map from `${taskNumber}:${cellIndex}` to teacher-selected character (`' '` for blank or uppercase letter). */
export type CellFixes = Readonly<Record<string, string>>;

export function cellFixKey(taskNumber: number, cellIndex: number): string {
  return `${taskNumber}:${cellIndex}`;
}

function rejected(check: Extract<SheetCheck, { ok: false }>, evidence: SheetEvidence, assignmentId = ''): SheetOutcome {
  return { check, assignmentId, variant: 0, qrRecognised: check.reason !== 'qr-unreadable', tasks: [], studentNameText: evidence.studentNameText };
}

/**
 * Compares recognised evidence with the expected answers, task by task.
 * Retains Top-3 candidates per cell from probabilities (zero pixels in JS, ADR 0003).
 */
export function evaluateSheet(
  evidence: SheetEvidence,
  bundles: OfflineBundle | readonly OfflineBundle[],
  thresholds: DecisionThresholds = v4Thresholds,
  force?: ForceTarget,
): SheetOutcome {
  const catalog = Array.isArray(bundles) ? (bundles as readonly OfflineBundle[]) : [bundles as OfflineBundle];
  let bundle: OfflineBundle | undefined;
  let variant: OfflineBundle['variants'][number] | undefined;
  let warnings: SheetWarning[] = [];

  if (force) {
    bundle = force.bundle;
    variant = force.bundle.variants.find((v) => v.variantId === force.variantId);
    if (!variant) return rejected({ ok: false, reason: 'unknown-variant', detail: String(force.variantId) }, evidence, bundle.assignmentId);
    warnings = [{ kind: 'forced', because: force.because, assignmentId: bundle.assignmentId, variantId: variant.variantId }];
  } else {
    const qr = parseQrSignature(evidence.qrPayload);
    if (!qr) {
      return rejected({ ok: false, reason: 'qr-unreadable', detail: 'QR не прочитан' }, evidence);
    }
    bundle = catalog.find((b) => b.assignmentId === qr.assignmentId);
    if (!bundle) {
      return rejected({ ok: false, reason: 'unknown-assignment', detail: qr.assignmentId }, evidence, qr.assignmentId);
    }
    variant = bundle.variants.find((v) => v.variantId === qr.variant);
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
        index, expected: c.char, predicted: ' ', confidence: 1, verdict: 'blank', top3: [],
      }));
      return { ...base, recognized: '', status: 'missing', cells };
    }
    const decision = evaluateQuestion(
      seen,
      q.expectedCells.map((c) => ({ char: c.char })),
      evidence.alphabet,
      thresholds,
    );

    const cellCount = decision.cells.length > 0 ? decision.cells.length : q.expectedCells.length;
    const cells: EvaluatedCell[] = [];
    for (let index = 0; index < cellCount; index += 1) {
      const seenCell = seen.cells[index];
      const expectedChar = q.expectedCells[index]?.char ?? ' ';
      const top3 = seenCell && !seenCell.isEmpty
        ? extractTopCandidates(seenCell.probabilities, evidence.alphabet, 3)
        : [];
      const top1 = top3[0];
      cells.push({
        index,
        expected: expectedChar,
        predicted: !seenCell || seenCell.isEmpty || !top1 ? ' ' : top1.char,
        confidence: !seenCell || seenCell.isEmpty || !top1 ? 1 : top1.confidence,
        verdict: decision.cells[index]?.verdict ?? 'uncertain',
        top3,
      });
    }
    const recognized = cells.map((c) => c.predicted).join('').trimEnd();
    return { ...base, recognized, status: decision.status, cells };
  });

  return {
    check: { ok: true },
    warnings,
    assignmentId: bundle.assignmentId,
    variant: variant.variantId,
    qrRecognised: true,
    tasks,
    studentNameText: evidence.studentNameText,
  };
}

function verdictAfterFix(expected: string, chosen: string): CellVerdict {
  const expBlank = expected.trim() === '';
  const chosenBlank = chosen.trim() === '';
  if (expBlank) return chosenBlank ? 'match' : 'mismatch';
  if (chosenBlank) return 'blank';
  return chosen === expected ? 'match' : 'mismatch';
}

function recomputeTaskStatus(cells: readonly EvaluatedCell[]): TaskOcrStatus {
  const answerCells = cells.filter((c) => c.expected.trim() !== '');
  if (answerCells.length > 0 && answerCells.every((c) => c.verdict === 'blank')) {
    return 'missing';
  }
  if (cells.some((c) => c.verdict === 'mismatch' || c.verdict === 'blank')) {
    return 'error';
  }
  if (cells.some((c) => c.verdict === 'uncertain')) {
    return 'review';
  }
  return 'correct';
}

/**
 * Applies 1-tap teacher letter fixes to a task and automatically resolves its status
 * (`correct` / `error` / `missing` / `review`) from the updated cells.
 */
export function resolveTaskWithFixes(task: EvaluatedTask, cellFixes?: CellFixes): EvaluatedTask {
  if (!cellFixes) return task;
  let touched = false;
  const cells = task.cells.map<EvaluatedCell>((c) => {
    const fixed = cellFixes[cellFixKey(task.number, c.index)];
    if (fixed === undefined) return c;
    touched = true;
    const normalized = fixed.trim() === '' ? ' ' : fixed.trim()[0]!;
    return {
      ...c,
      predicted: normalized,
      confidence: 1,
      verdict: verdictAfterFix(c.expected, normalized),
      fixedByTeacher: true,
    };
  });
  if (!touched) return task;
  const recognized = cells.map((c) => c.predicted).join('').trimEnd();
  return {
    ...task,
    cells,
    recognized,
    status: recomputeTaskStatus(cells),
  };
}

/** Counts yellow spot-focus (`uncertain`) cells remaining across un-overridden tasks. */
export function countUncertainCells(
  outcome: SheetOutcome | null,
  overrides: Readonly<Record<number, Override>> = {},
  cellFixes?: CellFixes,
): number {
  if (!outcome) return 0;
  let count = 0;
  for (const rawTask of outcome.tasks) {
    if (overrides[rawTask.number]) continue;
    const task = resolveTaskWithFixes(rawTask, cellFixes);
    if (task.status !== 'review') continue;
    for (const c of task.cells) {
      if (c.verdict === 'uncertain') count += 1;
    }
  }
  return count;
}

/** Status shown to the teacher after 1-tap cell fixes and whole-task overrides. */
export function effectiveStatus(
  task: EvaluatedTask,
  override: Override | undefined,
  cellFixes?: CellFixes,
): TaskOcrStatus {
  if (override === 'accept') return 'correct';
  if (override === 'reject') return 'error';
  return resolveTaskWithFixes(task, cellFixes).status;
}

export function scoreOutcome(
  outcome: SheetOutcome,
  overrides: Readonly<Record<number, Override>>,
  cellFixes?: CellFixes,
): { score: number; maxScore: number; reviewLeft: number; uncertainCells: number } {
  let score = 0;
  let reviewLeft = 0;
  let uncertainCells = 0;
  for (const rawTask of outcome.tasks) {
    const resolved = resolveTaskWithFixes(rawTask, cellFixes);
    const override = overrides[rawTask.number];
    const status = override === 'accept' ? 'correct' : override === 'reject' ? 'error' : resolved.status;
    if (status === 'correct') score += 1;
    if (status === 'review') {
      reviewLeft += 1;
      for (const c of resolved.cells) {
        if (c.verdict === 'uncertain') uncertainCells += 1;
      }
    }
  }
  return { score, maxScore: outcome.tasks.length, reviewLeft, uncertainCells };
}
