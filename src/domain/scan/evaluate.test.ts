import type { SheetEvidence } from '../ocr/evidence';
import { matchStudent, normalizeName } from '../roster/match';
import type { OfflineBundle } from './bundle';
import { evaluateSheet, scoreOutcome } from './evaluate';

const alphabet = ['А', 'Ә', 'Д', 'К', 'Т', 'Н'];
const bundle: OfflineBundle = {
  assignmentId: 'T1',
  title: 't',
  variants: [
    {
      variantId: 1,
      questions: [
        {
          questionNumber: 1, markerId: 11, prompt: 'p1', topicTag: 't1', expectedAnswer: 'КАД',
          expectedCells: [{ index: 0, char: 'К' }, { index: 1, char: 'А' }, { index: 2, char: 'Д' }, { index: 3, char: ' ' }],
        },
        {
          questionNumber: 2, markerId: 12, prompt: 'p2', topicTag: 't2', expectedAnswer: 'ТА',
          expectedCells: [{ index: 0, char: 'Т' }, { index: 1, char: 'А' }],
        },
      ],
    },
  ],
};

const sure = (i: number, char: string) => ({
  index: i,
  isEmpty: false,
  probabilities: alphabet.map((c) => (c === char ? 0.97 : 0.005)),
});
const empty = (i: number) => ({ index: i, isEmpty: true, probabilities: [] });

const evidence = (rows: SheetEvidence['questions']): SheetEvidence => ({
  alphabet, modelSha256: 'x', qrPayload: '{"tid":"T1","var":1,"page":1,"tot":1,"n_q":2}',
  studentNameText: 'ГАЛИЕВАМИРР', method: 'aruco-4-point', questions: rows, stageTimingsMs: {},
});

describe('evaluateSheet with a forced target', () => {
  const rows = [
    { questionNumber: 1, markerId: 11, cells: [sure(0, 'К'), sure(1, 'А'), sure(2, 'Д'), empty(3)] },
    { questionNumber: 2, markerId: 12, cells: [sure(0, 'Т'), sure(1, 'А')] },
  ];

  it('grades a sheet whose QR names an unknown test against the chosen test and says so', () => {
    const foreign = { ...evidence(rows), qrPayload: '{"tid":"OTHER","var":1,"page":1,"tot":1,"n_q":2}' };
    expect(evaluateSheet(foreign, [bundle]).check).toMatchObject({ ok: false, reason: 'unknown-assignment' });
    const forced = evaluateSheet(foreign, [bundle], undefined, { bundle, variantId: 1, because: 'unknown-assignment' });
    expect(forced.check).toEqual({ ok: true });
    expect(forced.assignmentId).toBe('T1');
    expect(forced.tasks.map((t) => t.status)).toEqual(['correct', 'correct']);
    expect(forced.warnings).toEqual([{ kind: 'forced', because: 'unknown-assignment', assignmentId: 'T1', variantId: 1 }]);
  });

  it('grades a sheet with an unreadable QR or a missing variant when forced', () => {
    const noQr = { ...evidence(rows), qrPayload: null };
    expect(evaluateSheet(noQr, [bundle]).check).toMatchObject({ reason: 'qr-unreadable' });
    expect(evaluateSheet(noQr, [bundle], undefined, { bundle, variantId: 1, because: 'qr-unreadable' }).check).toEqual({ ok: true });
    const wrongVariant = { ...evidence(rows), qrPayload: '{"tid":"T1","var":9,"page":1,"tot":1,"n_q":2}' };
    expect(evaluateSheet(wrongVariant, [bundle]).check).toMatchObject({ reason: 'unknown-variant' });
    expect(evaluateSheet(wrongVariant, [bundle], undefined, { bundle, variantId: 1, because: 'unknown-variant' }).check).toEqual({ ok: true });
  });

  it('still rejects when the forced variant does not exist', () => {
    expect(evaluateSheet(evidence(rows), [bundle], undefined, { bundle, variantId: 7, because: 'unknown-variant' }).check).toMatchObject({ ok: false });
  });

  it('adds no warnings to a normal, matching sheet', () => {
    expect(evaluateSheet(evidence(rows), [bundle]).warnings).toEqual([]);
  });
});

describe('evaluateSheet', () => {
  it('grades tasks against the bundle and keeps the recognised text', () => {
    const outcome = evaluateSheet(
      evidence([
        { questionNumber: 1, markerId: 11, cells: [sure(0, 'К'), sure(1, 'А'), sure(2, 'Т'), empty(3)] },
        { questionNumber: 2, markerId: 12, cells: [sure(0, 'Т'), sure(1, 'А')] },
      ]),
      bundle,
    );
    expect(outcome.check).toEqual({ ok: true });
    expect(outcome.variant).toBe(1);
    expect(outcome.qrRecognised).toBe(true);
    expect(outcome.tasks.map((t) => t.status)).toEqual(['error', 'correct']);
    expect(outcome.tasks[0].recognized).toBe('КАТ');
    expect(scoreOutcome(outcome, {})).toEqual({ score: 1, maxScore: 2, reviewLeft: 0 });
  });

  it('marks tasks that were not found on the sheet as missing and applies overrides', () => {
    const outcome = evaluateSheet(
      evidence([{ questionNumber: 1, markerId: 11, cells: [sure(0, 'К'), sure(1, 'А'), sure(2, 'Д'), empty(3)] }]),
      bundle,
    );
    expect(outcome.tasks.map((t) => t.status)).toEqual(['correct', 'missing']);
    expect(scoreOutcome(outcome, { 2: 'accept' }).score).toBe(2);
  });

  it('rejects a sheet whose QR cannot be read instead of guessing a variant', () => {
    const outcome = evaluateSheet({ ...evidence([]), qrPayload: null }, bundle);
    expect(outcome.check).toMatchObject({ ok: false, reason: 'qr-unreadable' });
    expect(outcome.tasks).toEqual([]);
  });

  it('rejects sheets of an unknown assignment, an unknown variant or a different task count', () => {
    const qr = (o: Record<string, unknown>) => JSON.stringify({ tid: 'T1', var: 1, page: 1, tot: 1, n_q: 2, ...o });
    expect(evaluateSheet({ ...evidence([]), qrPayload: qr({ tid: 'OTHER' }) }, bundle).check).toMatchObject({
      ok: false, reason: 'unknown-assignment', detail: 'OTHER',
    });
    expect(evaluateSheet({ ...evidence([]), qrPayload: qr({ var: 2 }) }, bundle).check).toMatchObject({
      ok: false, reason: 'unknown-variant',
    });
    expect(evaluateSheet({ ...evidence([]), qrPayload: qr({ n_q: 4 }) }, bundle).check).toMatchObject({
      ok: false, reason: 'question-count-mismatch',
    });
  });

  it('picks the assignment by QR from a catalog of bundles', () => {
    const other: OfflineBundle = { ...bundle, assignmentId: 'T2', variants: [{ ...bundle.variants[0], questions: [bundle.variants[0].questions[0]] }] };
    const e = { ...evidence([{ questionNumber: 1, markerId: 11, cells: [sure(0, 'К'), sure(1, 'А'), sure(2, 'Д'), empty(3)] }]), qrPayload: '{"tid":"T2","var":1,"page":1,"tot":1,"n_q":1}' };
    const outcome = evaluateSheet(e, [bundle, other]);
    expect(outcome.check).toEqual({ ok: true });
    expect(outcome.assignmentId).toBe('T2');
    expect(outcome.tasks.map((t) => t.status)).toEqual(['correct']);
  });
});

describe('matchStudent', () => {
  const roster = [
    { id: 'a', name: 'Галиев Амир Р.' },
    { id: 'b', name: 'Закирова Ләйсән И.' },
  ];
  it('matches a printed name to the roster despite punctuation and a misread letter', () => {
    expect(normalizeName('Галиев Амир Р.')).toBe('ГАЛИЕВАМИРР');
    expect(matchStudent('ГАЛИЕВАМИРР', roster)?.id).toBe('a');
    expect(matchStudent('ГАЛИЕВАМИЛР', roster)?.id).toBe('a');
  });
  it('tolerates stray letters read from empty cells', () => {
    expect(matchStudent('ГАЛИЕВААМИРАРССС', roster)?.id).toBe('a');
  });
  it('returns null for empty or unrelated names', () => {
    expect(matchStudent('', roster)).toBeNull();
    expect(matchStudent('ХХХХХХХХ', roster)).toBeNull();
  });
});
