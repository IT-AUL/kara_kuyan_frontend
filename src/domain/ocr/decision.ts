import type { CellEvidence, QuestionEvidence } from './evidence';

export type CellVerdict = 'match' | 'mismatch' | 'uncertain' | 'blank';

export type TaskOcrStatus = 'correct' | 'error' | 'review' | 'missing';

export type CellCandidate = {
  char: string;
  /** Probability in [0, 1], rounded to 3 decimal places. */
  confidence: number;
};

export type ExpectedCell = {
  /** Expected character; a blank string means the cell must stay empty. */
  char: string;
};

export type DecisionThresholds = {
  /** Where a cell should stay blank, ink below this many pixels is treated as a speck, not writing. */
  strayInkMaxPixels: number;
  /** Calibrated selective-prediction threshold τ (v4 recommended: 0.85 = 85%, FAR < 5%). */
  acceptMinProbability: number;
  /** Minimum lead of the expected character over the best alternative. */
  acceptMinMargin: number;
  /** Stricter lead when the best alternative is a visually confusable Tatar/Cyrillic letter. */
  confusableMinMargin: number;
  /** Probability of a different top-1 character at which a student mistake is confirmed without flagging review. */
  rejectMinProbability: number;
  confusablePairs: readonly (readonly [string, string])[];
};

/** Calibrated production threshold τ = 85% for `TatarOCRNetV3_MultiScale` (v4). */
export const V4_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Calibrated v4 thresholds (`docs/PIPELINE.md` & `docs/ocr_metrics_specification.md`):
 * τ = 0.85 yields 41.7% Zero-Touch sheets, 1–2 spot-focus yellow cells on remaining sheets,
 * 98.25% Top-3 recall, and < 5% false alarms.
 */
export const v4Thresholds: DecisionThresholds = {
  strayInkMaxPixels: 150,
  acceptMinProbability: V4_CONFIDENCE_THRESHOLD,
  acceptMinMargin: 0.25,
  confusableMinMargin: 0.45,
  rejectMinProbability: V4_CONFIDENCE_THRESHOLD,
  confusablePairs: [
    ['Ә', 'А'],
    ['Ә', 'Э'],
    ['Ң', 'Н'],
    ['Ө', 'О'],
    ['Ү', 'У'],
    ['Җ', 'Ж'],
    ['Һ', 'Х'],
    ['Һ', 'Н'],
  ],
};

/** Alias retained for existing callers; now points to calibrated `v4Thresholds`. */
export const proposedThresholds: DecisionThresholds = v4Thresholds;

export type CellDecision = {
  verdict: CellVerdict;
  /** Probability of the expected character, `null` when it is not in the alphabet or blank is expected. */
  expectedProbability: number | null;
  /** Strongest character other than the expected one, `null` when not evaluated. */
  bestAlternative: { char: string; probability: number } | null;
};

export type QuestionDecision = {
  status: TaskOcrStatus;
  cells: readonly CellDecision[];
  reason?: 'cell-count-mismatch' | 'no-expected-cells';
};

function isBlankExpected(expected: ExpectedCell): boolean {
  return expected.char.trim() === '';
}

function isConfusable(a: string, b: string, pairs: DecisionThresholds['confusablePairs']): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Extracts top-K character hypotheses sorted by descending probability (Zero-Photo safe: numbers & chars only). */
export function extractTopCandidates(
  probabilities: readonly number[],
  alphabet: readonly string[],
  k = 3,
): readonly CellCandidate[] {
  if (probabilities.length === 0 || alphabet.length === 0) return [];
  const limit = Math.min(probabilities.length, alphabet.length);
  const indices: number[] = [];
  for (let i = 0; i < limit; i += 1) indices.push(i);
  indices.sort((a, b) => probabilities[b] - probabilities[a]);
  return indices.slice(0, Math.max(1, k)).map((idx) => ({
    char: alphabet[idx] ?? '?',
    confidence: Math.round((probabilities[idx] ?? 0) * 1000) / 1000,
  }));
}

/**
 * Decides one cell against the expected character under calibrated selective prediction (τ = 0.85):
 * - Confident match (`p_expected >= τ` and sufficient lead) -> `'match'`
 * - Confident different top-1 (`p_alt >= τ` and `p_alt > p_expected`) -> `'mismatch'` (student error, no review noise)
 * - Low-confidence non-empty cell (`< τ`) -> `'uncertain'` (yellow spot-focus cell with Top-3 chips)
 */
export function evaluateCell(
  cell: CellEvidence,
  expected: ExpectedCell,
  alphabet: readonly string[],
  thresholds: DecisionThresholds = v4Thresholds,
): CellDecision {
  const isBlank = cell.isEmpty;

  if (isBlankExpected(expected)) {
    const speck = !isBlank && cell.inkPixels !== undefined && cell.inkPixels < thresholds.strayInkMaxPixels;
    return {
      verdict: isBlank || speck ? 'match' : 'uncertain',
      expectedProbability: null,
      bestAlternative: null,
    };
  }

  if (isBlank) {
    return { verdict: 'blank', expectedProbability: null, bestAlternative: null };
  }

  const expectedIndex = alphabet.indexOf(expected.char);
  if (expectedIndex < 0 || cell.probabilities.length !== alphabet.length) {
    return { verdict: 'uncertain', expectedProbability: null, bestAlternative: null };
  }

  let altIndex = -1;
  for (let i = 0; i < cell.probabilities.length; i += 1) {
    if (i !== expectedIndex && (altIndex < 0 || cell.probabilities[i] > cell.probabilities[altIndex])) {
      altIndex = i;
    }
  }

  const expectedProbability = cell.probabilities[expectedIndex];
  const altProbability = altIndex < 0 ? 0 : cell.probabilities[altIndex];
  const altChar = altIndex < 0 ? '' : alphabet[altIndex];
  const bestAlternative = altIndex < 0 ? null : { char: altChar, probability: altProbability };
  const requiredMargin = isConfusable(expected.char, altChar, thresholds.confusablePairs)
    ? thresholds.confusableMinMargin
    : thresholds.acceptMinMargin;

  if (
    expectedProbability >= thresholds.acceptMinProbability &&
    expectedProbability - altProbability >= requiredMargin
  ) {
    return { verdict: 'match', expectedProbability, bestAlternative };
  }

  if (altProbability > expectedProbability && altProbability >= thresholds.rejectMinProbability) {
    return { verdict: 'mismatch', expectedProbability, bestAlternative };
  }

  return { verdict: 'uncertain', expectedProbability, bestAlternative };
}

function isEffectivelyEmpty(cell: CellEvidence, thresholds: DecisionThresholds): boolean {
  return cell.isEmpty || (cell.inkPixels !== undefined && cell.inkPixels < thresholds.strayInkMaxPixels);
}

/**
 * Aggregates cell decisions into a task status:
 * - Tolerates extra trailing blank grid boxes detected by dynamic 8..12 cell snapping when unwritten;
 * - A confirmed wrong or omitted letter makes the task an error;
 * - Otherwise any uncertain cell (`conf < 85%`) sends it to spot-focus teacher review;
 * - An entirely empty answer is missing.
 */
export function evaluateQuestion(
  question: QuestionEvidence,
  expected: readonly ExpectedCell[],
  alphabet: readonly string[],
  thresholds: DecisionThresholds = v4Thresholds,
): QuestionDecision {
  if (expected.length === 0) {
    return { status: 'review', cells: [], reason: 'no-expected-cells' };
  }

  let seenCells = question.cells;
  if (seenCells.length > expected.length) {
    const trailing = seenCells.slice(expected.length);
    if (trailing.every((c) => isEffectivelyEmpty(c, thresholds))) {
      seenCells = seenCells.slice(0, expected.length);
    }
  } else if (seenCells.length < expected.length) {
    const missingExpected = expected.slice(seenCells.length);
    if (missingExpected.every(isBlankExpected)) {
      const padded: CellEvidence[] = [...seenCells];
      for (let i = seenCells.length; i < expected.length; i += 1) {
        padded.push({ index: i, isEmpty: true, probabilities: [] });
      }
      seenCells = padded;
    }
  }

  if (seenCells.length !== expected.length) {
    return { status: 'review', cells: [], reason: 'cell-count-mismatch' };
  }

  const cells = seenCells.map((cell, i) =>
    evaluateCell(cell, expected[i], alphabet, thresholds),
  );

  const answerCells = cells.filter((_, i) => !isBlankExpected(expected[i]));
  if (answerCells.length > 0 && answerCells.every((c) => c.verdict === 'blank')) {
    return { status: 'missing', cells };
  }
  if (cells.some((c) => c.verdict === 'mismatch' || c.verdict === 'blank')) {
    return { status: 'error', cells };
  }
  if (cells.some((c) => c.verdict === 'uncertain')) {
    return { status: 'review', cells };
  }
  return { status: 'correct', cells };
}
