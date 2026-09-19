import type { CellEvidence, QuestionEvidence } from './evidence';

export type CellVerdict = 'match' | 'mismatch' | 'uncertain' | 'blank';

export type TaskOcrStatus = 'correct' | 'error' | 'review' | 'missing';

export type ExpectedCell = {
  /** Expected character; a blank string means the cell must stay empty. */
  char: string;
};

export type DecisionThresholds = {
  /** Where a cell should stay blank, ink below this many pixels is treated as a speck, not writing. */
  strayInkMaxPixels: number;
  /** Minimum probability of the expected character to accept a match. */
  acceptMinProbability: number;
  /** Minimum lead of the expected character over the best alternative. */
  acceptMinMargin: number;
  /** Stricter lead when the best alternative is a visually confusable letter. */
  confusableMinMargin: number;
  /** Probability of a different top-1 character at which a mismatch is confirmed. */
  rejectMinProbability: number;
  confusablePairs: readonly (readonly [string, string])[];
};

/**
 * PROPOSED starting values, not validated on real handwriting and not shipped defaults.
 * Real values come from the calibration report (spec AC8) and the open
 * confidence-threshold question in `docs/contracts/contract-gaps.md`.
 */
export const proposedThresholds: DecisionThresholds = {
  strayInkMaxPixels: 150,
  acceptMinProbability: 0.8,
  acceptMinMargin: 0.3,
  confusableMinMargin: 0.5,
  rejectMinProbability: 0.8,
  confusablePairs: [
    ['Ә', 'А'],
    ['Ң', 'Н'],
    ['Ө', 'О'],
    ['Ү', 'У'],
    ['Җ', 'Ж'],
    ['Һ', 'Х'],
  ],
};

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

/**
 * Decides one cell against the expected character.
 * The decision is "does the expected character hold", not "what is the top-1 letter":
 * confidence describes recognition quality and never stands in for answer correctness.
 */
export function evaluateCell(
  cell: CellEvidence,
  expected: ExpectedCell,
  alphabet: readonly string[],
  thresholds: DecisionThresholds,
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

/**
 * Aggregates cell decisions into a task status:
 * - a confirmed wrong or omitted letter makes the task an error;
 * - otherwise any uncertain cell sends it to teacher review;
 * - an entirely empty answer is missing.
 */
export function evaluateQuestion(
  question: QuestionEvidence,
  expected: readonly ExpectedCell[],
  alphabet: readonly string[],
  thresholds: DecisionThresholds,
): QuestionDecision {
  if (expected.length === 0) {
    return { status: 'review', cells: [], reason: 'no-expected-cells' };
  }
  if (question.cells.length !== expected.length) {
    return { status: 'review', cells: [], reason: 'cell-count-mismatch' };
  }

  const cells = question.cells.map((cell, i) =>
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
