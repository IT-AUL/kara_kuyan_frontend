import { evaluateCell, evaluateQuestion, proposedThresholds } from './decision';
import type { CellEvidence, QuestionEvidence } from './evidence';

const alphabet = ['А', 'Д', 'Ә', 'Л', 'Н', 'Ө', 'С', 'Т', 'Ң'];

function cell(index: number, probs: Record<string, number>, ink = 0.2): CellEvidence {
  const isEmpty = ink === 0;
  return {
    index,
    isEmpty,
    probabilities: isEmpty ? [] : alphabet.map((char) => probs[char] ?? 0),
  };
}

function question(cells: CellEvidence[]): QuestionEvidence {
  return { questionNumber: 1, markerId: 11, cells };
}

const expectedWord = [...'ӨСТӘЛДӘН'].map((char) => ({ char }));

function sure(char: string, index: number): CellEvidence {
  return cell(index, { [char]: 0.97, А: 0.01 });
}

describe('evaluateCell', () => {
  it('accepts a confident, clearly leading expected character', () => {
    const d = evaluateCell(cell(0, { Д: 0.94, Т: 0.04 }), { char: 'Д' }, alphabet, proposedThresholds);
    expect(d.verdict).toBe('match');
    expect(d.expectedProbability).toBeCloseTo(0.94);
    expect(d.bestAlternative?.char).toBe('Т');
  });

  it('confirms a mismatch when a different letter is confidently recognised', () => {
    const d = evaluateCell(cell(0, { Т: 0.9, Д: 0.06 }), { char: 'Д' }, alphabet, proposedThresholds);
    expect(d.verdict).toBe('mismatch');
  });

  it('routes ambiguous cells to review instead of guessing', () => {
    const d = evaluateCell(cell(0, { Д: 0.5, Т: 0.45 }), { char: 'Д' }, alphabet, proposedThresholds);
    expect(d.verdict).toBe('uncertain');
  });

  it('is stricter for confusable pairs than for other letters', () => {
    const relaxed = { ...proposedThresholds, acceptMinProbability: 0.6, acceptMinMargin: 0.2 };
    const plain = evaluateCell(cell(0, { Д: 0.62, Т: 0.3 }), { char: 'Д' }, alphabet, relaxed);
    const confusable = evaluateCell(cell(0, { Ң: 0.62, Н: 0.3 }), { char: 'Ң' }, alphabet, relaxed);
    expect(plain.verdict).toBe('match');
    expect(confusable.verdict).toBe('uncertain');
  });

  it('reports a blank cell when a letter is expected', () => {
    const d = evaluateCell(cell(0, { Д: 0.9 }, 0), { char: 'Д' }, alphabet, proposedThresholds);
    expect(d.verdict).toBe('blank');
  });

  it('matches a blank cell when emptiness is expected, and flags stray ink', () => {
    expect(evaluateCell(cell(0, {}, 0), { char: ' ' }, alphabet, proposedThresholds).verdict).toBe('match');
    expect(evaluateCell(cell(0, { Д: 0.9 }, 0.3), { char: ' ' }, alphabet, proposedThresholds).verdict).toBe(
      'uncertain',
    );
  });

  it('ignores a small speck where a cell should stay blank but flags real writing', () => {
    const speck: CellEvidence = { index: 0, isEmpty: false, inkPixels: 60, probabilities: alphabet.map(() => 0.1) };
    const writing: CellEvidence = { ...speck, inkPixels: 400 };
    expect(evaluateCell(speck, { char: ' ' }, alphabet, proposedThresholds).verdict).toBe('match');
    expect(evaluateCell(writing, { char: ' ' }, alphabet, proposedThresholds).verdict).toBe('uncertain');
  });

  it('does not judge characters outside the alphabet or malformed evidence', () => {
    expect(evaluateCell(cell(0, { Д: 0.9 }), { char: '7' }, alphabet, proposedThresholds).verdict).toBe(
      'uncertain',
    );
    const short: CellEvidence = { index: 0, isEmpty: false, probabilities: [1] };
    expect(evaluateCell(short, { char: 'Д' }, alphabet, proposedThresholds).verdict).toBe('uncertain');
  });
});

describe('evaluateQuestion', () => {
  const clean = [...'ӨСТӘЛДӘН'].map(sure);

  it('marks a fully matching answer as correct', () => {
    expect(evaluateQuestion(question(clean), expectedWord, alphabet, proposedThresholds).status).toBe(
      'correct',
    );
  });

  it('marks the demo case ӨСТӘЛТӘН vs ӨСТӘЛДӘН as an error', () => {
    const cells = [...clean];
    cells[5] = cell(5, { Т: 0.92, Д: 0.05 });
    expect(evaluateQuestion(question(cells), expectedWord, alphabet, proposedThresholds).status).toBe('error');
  });

  it('sends an answer with only uncertain cells to review', () => {
    const cells = [...clean];
    cells[5] = cell(5, { Д: 0.5, Т: 0.45 });
    expect(evaluateQuestion(question(cells), expectedWord, alphabet, proposedThresholds).status).toBe('review');
  });

  it('keeps a confirmed error even when another cell is uncertain', () => {
    const cells = [...clean];
    cells[2] = cell(2, { Д: 0.5, Т: 0.45 });
    cells[5] = cell(5, { Т: 0.92, Д: 0.05 });
    expect(evaluateQuestion(question(cells), expectedWord, alphabet, proposedThresholds).status).toBe('error');
  });

  it('treats an omitted letter as an error and an entirely empty answer as missing', () => {
    const omitted = [...clean];
    omitted[3] = cell(3, {}, 0);
    expect(evaluateQuestion(question(omitted), expectedWord, alphabet, proposedThresholds).status).toBe('error');

    const empty = expectedWord.map((_, i) => cell(i, {}, 0));
    expect(evaluateQuestion(question(empty), expectedWord, alphabet, proposedThresholds).status).toBe('missing');
  });

  it('accepts an expected trailing empty cell', () => {
    const expected = [...expectedWord, { char: ' ' }];
    const cells = [...clean, cell(8, {}, 0)];
    expect(evaluateQuestion(question(cells), expected, alphabet, proposedThresholds).status).toBe('correct');
  });

  it('refuses to guess when cell counts disagree or nothing is expected', () => {
    const short = evaluateQuestion(question(clean.slice(0, 3)), expectedWord, alphabet, proposedThresholds);
    expect(short).toMatchObject({ status: 'review', reason: 'cell-count-mismatch' });
    const none = evaluateQuestion(question([]), [], alphabet, proposedThresholds);
    expect(none).toMatchObject({ status: 'review', reason: 'no-expected-cells' });
  });
});
