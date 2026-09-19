// Opt-in check against the real backend: `LIVE_API_URL=https://tatar-ocr.duckdns.org pnpm test src/adapters/api/live`.
// Skipped by default. It writes ONE submission row (fixed uuid, so re-runs update it) for the test teacher.
import { HttpGateway } from '@/adapters/sync/http-gateway';
import type { SheetOutcome } from '@/domain/scan/evaluate';
import { buildSubmission } from '@/domain/sync/payload';

import { BackendApi } from './backend';
import { ApiClient } from './client';

const url = process.env.LIVE_API_URL;
const ASSIGNMENT = process.env.LIVE_ASSIGNMENT ?? 'TAT-2026-Q1DAB';
const CLASS = process.env.LIVE_CLASS ?? 'KK-PROBE';
type NodeResponse = { statusCode?: number; setEncoding(e: string): void; on(ev: string, cb: (chunk: string) => void): void };
type NodeRequest = { on(ev: string, cb: (e: Error) => void): void; end(body?: string): void };
const { request } = jest.requireActual<{
  request(url: string, opts: object, cb: (res: NodeResponse) => void): NodeRequest;
}>('node:https');

// jest-expo replaces the global `fetch` with a stub, so the live check talks through node:https and
// exposes the small part of the Response interface that ApiClient uses.
const nodeFetch = ((target: string, init: RequestInit = {}) =>
  new Promise((resolve, reject) => {
    const req = request(target, { method: init.method, headers: init.headers as Record<string, string> }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { text += c; });
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 300, status, text: async () => text, json: async () => JSON.parse(text) });
      });
    });
    req.on('error', reject);
    req.end(init.body as string | undefined);
  })) as unknown as typeof fetch;

const TEACHER = '00000000-0000-4000-8000-00000000c0de';

(url ? describe : describe.skip)('live backend', () => {
  const client = new ApiClient({ baseUrl: url ?? '', teacherUuid: async () => TEACHER, timeoutMs: 20_000, fetchImpl: nodeFetch });
  const api = new BackendApi(client);

  it('serves a parseable offline bundle and roster', async () => {
    const bundle = await api.fetchBundle(ASSIGNMENT);
    expect(bundle).toEqual(expect.objectContaining({ ok: true }));
    if (!bundle.ok) return;
    expect(bundle.value.variants[0].questions.length).toBeGreaterThan(0);
    const roster = await api.classRoster(CLASS);
    expect(roster.ok && roster.value.students.length).toBeGreaterThan(0);
  });

  it('accepts our submission payload and treats a resend as an update', async () => {
    const bundle = await api.fetchBundle(ASSIGNMENT);
    const roster = await api.classRoster(CLASS);
    if (!bundle.ok || !roster.ok) throw new Error('setup failed');
    const variant = bundle.value.variants[0];
    const outcome: SheetOutcome = {
      check: { ok: true }, assignmentId: ASSIGNMENT, variant: variant.variantId, qrRecognised: true, studentNameText: '',
      tasks: variant.questions.map((q) => ({
        number: q.questionNumber, markerId: q.markerId, prompt: q.prompt, topicTag: q.topicTag,
        expected: q.expectedAnswer, recognized: q.expectedAnswer, status: 'correct' as const,
        cells: q.expectedCells.map((c) => ({ index: c.index, expected: c.char, predicted: c.char, confidence: 0.97, verdict: 'match' as const })),
      })),
    };
    const student = roster.value.students[0];
    const submission = buildSubmission({
      uuid: 'kk-live-contract-0001', outcome, overrides: {},
      student: { id: student.studentId, name: student.fullName }, checkedAt: new Date(), grade: 5,
    });
    const gateway = new HttpGateway(client);
    const request = { assignmentId: ASSIGNMENT, classId: CLASS, syncedAt: new Date().toISOString(), submission };
    const first = await gateway.send(request);
    const second = await gateway.send(request);
    expect(first).toMatchObject({ kind: 'ok' });
    expect(first.kind === 'ok' && first.inserted + first.updated).toBe(1);
    expect(second).toEqual({ kind: 'ok', inserted: 0, updated: 1 });
  });

  it('parses every read endpoint the screens use', async () => {
    const [tests, classes, bank, classA, assignA, subs] = await Promise.all([
      api.listTests(), api.listClasses(), api.searchTasks({}), api.classAnalytics(CLASS), api.assignmentAnalytics(ASSIGNMENT),
      api.listSubmissions({ classId: CLASS, assignmentId: ASSIGNMENT }),
    ]);
    for (const r of [tests, classes, bank, classA, assignA, subs]) expect(r).toEqual(expect.objectContaining({ ok: true }));
    expect(tests.ok && tests.value.some((t) => t.testId === ASSIGNMENT)).toBe(true);
    expect(subs.ok && subs.value.length).toBeGreaterThan(0);
    const pdf = await api.blankPdfTarget(ASSIGNMENT, 1);
    expect(pdf.url).toContain('/blank.pdf?variant=1');
  });

  it('rejects a malformed request as final (4xx), not retryable', async () => {
    const gateway = new HttpGateway(client);
    const bad = { assignmentId: ASSIGNMENT, classId: CLASS, syncedAt: 'not-a-date', submission: {} as never };
    expect((await gateway.send(bad)).kind).toBe('rejected');
  });
});
