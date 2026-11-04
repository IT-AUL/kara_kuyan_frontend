// Opt-in check against the real backend: `LIVE_API_URL=https://api.kara-kuyan.it-aul.ru pnpm test src/adapters/api/live`.
// Skipped by default. Without `LIVE_WRITE=1` it only reads. With `LIVE_WRITE=1` it walks the whole teacher scenario
// and provisions what it needs itself (the server database can be reset on deploy, so no fixture is assumed):
// a probe class (`LIVE_CLASS`, created through bulk import once), a custom and two generated tasks, one test assigned
// to the probe class, and ONE submission row (fixed uuid, so re-runs update it).
import { HttpGateway } from '@/adapters/sync/http-gateway';
import type { SheetOutcome } from '@/domain/scan/evaluate';
import { buildSubmission } from '@/domain/sync/payload';

import { BackendApi, type RosterStudent } from './backend';
import { ApiClient } from './client';

type OfflineBundle = Extract<Awaited<ReturnType<BackendApi['fetchBundle']>>, { ok: true }>['value'];

const url = process.env.LIVE_API_URL;
const write = Boolean(process.env.LIVE_WRITE);
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

/** GETs a file target (PDF, XLSX, CSV) the way the file adapter does and returns status and the first bytes. */
async function download(target: { url: string; headers: Record<string, string> }): Promise<{ status: number; head: string; size: number }> {
  const res = await nodeFetch(target.url, { headers: target.headers });
  const body = await res.text();
  return { status: res.status, head: body.slice(0, 4), size: body.length };
}

const TEACHER = process.env.LIVE_TEACHER_UUID ?? '00000000-0000-4000-8000-00000000c0de';
const PROBE_STUDENTS = ['Пробов Алмаз Ринатович', 'Тестова Алсу Маратовна', 'Сынауов Булат Ильдарович'];

// Real network: the server renders PDFs at 300 dpi (blank ≈ 1.6 s, class batch ≈ 4.3 s measured 2026-11-03).
jest.setTimeout(60_000);

(url ? describe : describe.skip)('live backend', () => {
  const client = new ApiClient({ baseUrl: url ?? '', teacherUuid: async () => TEACHER, timeoutMs: 30_000, fetchImpl: nodeFetch });
  const api = new BackendApi(client);
  const gateway = new HttpGateway(client);

  it('parses every read endpoint the screens use', async () => {
    const session = await api.handshake('KK live probe', 'KK probe school');
    expect(session).toEqual(expect.objectContaining({ ok: true }));
    const [tests, classes, bank, types, manifest] = await Promise.all([
      api.listTests(), api.listClasses(), api.searchTasks({}), api.taskTypes(), api.modelManifest(),
    ]);
    for (const r of [tests, classes, bank, types, manifest]) expect(r).toEqual(expect.objectContaining({ ok: true }));
    expect(types.ok && types.value.length).toBeGreaterThan(0);
    expect(manifest.ok && manifest.value.alphabet.length).toBe(39);
    // Any listed test must serve a parseable offline bundle and its read-side analytics.
    const first = tests.ok ? tests.value[0] : undefined;
    expect(first).toBeDefined();
    if (!first) return;
    const [bundle, assignA, subs] = await Promise.all([
      api.fetchBundle(first.testId), api.assignmentAnalytics(first.testId), api.listSubmissions({ assignmentId: first.testId }),
    ]);
    for (const r of [bundle, assignA, subs]) expect(r).toEqual(expect.objectContaining({ ok: true }));
    expect(bundle.ok && bundle.value.variants[0].questions.length).toBeGreaterThan(0);
  });

  it('rejects a malformed request as final (4xx), not retryable', async () => {
    const bad = { assignmentId: 'KK-NOPE', classId: CLASS, syncedAt: 'not-a-date', submission: {} as never };
    expect((await gateway.send(bad)).kind).toBe('rejected');
  });

  (write ? describe : describe.skip)('teacher scenario (writes, LIVE_WRITE=1)', () => {
    let students: RosterStudent[] = [];
    let test: OfflineBundle | undefined;

    it('creates the probe class once and shows it only to its teacher', async () => {
      const existing = await api.classRoster(CLASS);
      if (!existing.ok || existing.value.students.length === 0) {
        const imported = await api.importStudents(CLASS, PROBE_STUDENTS);
        expect(imported).toEqual(expect.objectContaining({ ok: true }));
      }
      const roster = await api.classRoster(CLASS);
      expect(roster.ok && roster.value.students.length).toBeGreaterThan(0);
      if (roster.ok) students = roster.value.students;
      const mine = await api.listClasses();
      expect(mine.ok && mine.value.some((c) => c.classId === CLASS)).toBe(true);
      // Isolation by teacher: another teacher's class list must not contain the probe class.
      const strangerApi = new BackendApi(new ApiClient({ baseUrl: url ?? '', teacherUuid: async () => '00000000-0000-4000-8000-00000000beef', fetchImpl: nodeFetch }));
      const theirs = await strangerApi.listClasses();
      expect(theirs.ok && theirs.value.some((c) => c.classId === CLASS)).toBe(false);
    });

    it('refuses a custom answer outside the alphabet as final 422, not a retryable 500', async () => {
      const bad = await api.createTask({ prompt: 'KK probe: bad answer', answer: 'BOOK123!', cellCount: 8, gradeLevel: 7, topicTag: 'custom', topicName: 'Своё задание' });
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.error).toEqual(expect.objectContaining({ kind: 'http', status: 422, retryable: false }));
    });

    it('creates a custom task, generates tasks and assembles a test from them', async () => {
      const custom = await api.createTask({ prompt: 'KK probe: напишите слово китап', answer: 'КИТАП', cellCount: 6, gradeLevel: 7, topicTag: 'custom', topicName: 'Своё задание' });
      expect(custom).toEqual(expect.objectContaining({ ok: true }));
      const generated = await api.generateTasks({ taskType: 'plural_affixes', count: 2, gradeLevel: 7 });
      expect(generated).toEqual(expect.objectContaining({ ok: true }));
      if (!custom.ok || !generated.ok) return;
      const ids = [custom.value.taskId, ...generated.value.map((t) => t.taskId)];
      const assembled = await api.assembleTest({ title: 'KK constructor probe', gradeLevel: 7, variants: 1, taskIds: ids });
      expect(assembled).toEqual(expect.objectContaining({ ok: true }));
      if (!assembled.ok) return;
      test = assembled.value;
      expect(test.variants[0].questions.length).toBe(ids.length);
      expect(test.variants[0].questions.map((q) => q.expectedAnswer)).toContain('КИТАП');
      const listed = await api.listTests();
      expect(listed.ok && listed.value.some((t) => t.testId === test?.assignmentId)).toBe(true);
    });

    it('assigns the test to the class and serves its bundle', async () => {
      if (!test) throw new Error('no test from the previous step');
      const assigned = await api.assignToClass(CLASS, test.assignmentId);
      expect(assigned).toEqual(expect.objectContaining({ ok: true }));
      const list = await api.listClassAssignments(CLASS);
      expect(list.ok && list.value.some((a) => a.assignmentId === test?.assignmentId)).toBe(true);
      const tests = await api.listTests();
      expect(tests.ok && tests.value.find((t) => t.testId === test?.assignmentId)?.assignedClasses).toContain(CLASS);
      const bundle = await api.fetchBundle(test.assignmentId);
      expect(bundle.ok && bundle.value.variants[0].questions.length).toBe(test.variants[0].questions.length);
    });

    it('prints a blank and the class batch of blanks as PDF', async () => {
      if (!test) throw new Error('no test from the previous step');
      const blank = await download(await api.blankPdfTarget(test.assignmentId, 1));
      expect(blank).toEqual(expect.objectContaining({ status: 200, head: '%PDF' }));
      const batch = await download(await api.batchBlanksTarget(CLASS, test.assignmentId));
      expect(batch).toEqual(expect.objectContaining({ status: 200, head: '%PDF' }));
    });

    it('accepts our submission payload and treats a resend as an update', async () => {
      if (!test || students.length === 0) throw new Error('no test or roster from the previous steps');
      const variant = test.variants[0];
      const outcome: SheetOutcome = {
        check: { ok: true }, assignmentId: test.assignmentId, variant: variant.variantId, qrRecognised: true, studentNameText: '',
        tasks: variant.questions.map((q, idx) => {
          const wrong = idx === variant.questions.length - 1;
          const written = wrong ? 'ХАТА' : q.expectedAnswer;
          return {
            number: q.questionNumber, markerId: q.markerId, prompt: q.prompt, topicTag: q.topicTag,
            expected: q.expectedAnswer, recognized: written, status: wrong ? ('error' as const) : ('correct' as const),
            cells: q.expectedCells.map((c, ci) => ({
              index: c.index, expected: c.char, predicted: wrong ? (written[ci] ?? '') : c.char,
              confidence: 0.97, verdict: wrong ? ('mismatch' as const) : ('match' as const),
            })),
          };
        }),
      };
      const submission = buildSubmission({
        uuid: `kk-live-${test.assignmentId}`, outcome, overrides: {},
        student: { id: students[0].studentId, name: students[0].fullName }, checkedAt: new Date(), grade: 4,
      });
      const req = { assignmentId: test.assignmentId, classId: CLASS, syncedAt: new Date().toISOString(), submission };
      const first = await gateway.send(req);
      const second = await gateway.send(req);
      expect(first).toEqual({ kind: 'ok', inserted: 1, updated: 0 });
      expect(second).toEqual({ kind: 'ok', inserted: 0, updated: 1 });
      const subs = await api.listSubmissions({ classId: CLASS, assignmentId: test.assignmentId });
      expect(subs.ok && subs.value.length).toBe(1);
    });

    it('shows the saved work in progress, v4 analytics (class, assignment wrong answers, student profile) and gradebook export', async () => {
      if (!test || students.length === 0) throw new Error('no test or roster from the previous step');
      const [list, classA, assignA, studentA] = await Promise.all([
        api.listClassAssignments(CLASS),
        api.classAnalytics(CLASS),
        api.assignmentAnalytics(test.assignmentId),
        api.studentAnalytics(students[0].studentId),
      ]);
      for (const r of [list, classA, assignA, studentA]) expect(r).toEqual(expect.objectContaining({ ok: true }));
      const progress = list.ok ? list.value.find((a) => a.assignmentId === test?.assignmentId) : undefined;
      expect(progress?.checked).toBe(1);
      expect(assignA.ok && assignA.value.totalSubmissions).toBe(1);
      if (assignA.ok) {
        const lastQ = assignA.value.questions[assignA.value.questions.length - 1];
        expect(lastQ?.wrongAnswers).toEqual(
          expect.arrayContaining([expect.objectContaining({ studentId: students[0].studentId, writtenAnswer: 'ХАТА' })]),
        );
      }
      if (classA.ok) {
        expect(classA.value.students.some((s) => s.studentId === students[0].studentId)).toBe(true);
      }
      if (studentA.ok) {
        expect(studentA.value.studentId).toBe(students[0].studentId);
        expect(studentA.value.history.some((h) => h.assignmentId === test?.assignmentId)).toBe(true);
      }
      const xlsx = await download(await api.gradebookTarget(test.assignmentId, CLASS, 'xlsx'));
      expect(xlsx).toEqual(expect.objectContaining({ status: 200, head: 'PK\u0003\u0004' }));
      const csv = await download(await api.gradebookTarget(test.assignmentId, CLASS, 'csv'));
      expect(csv.status).toBe(200);
      expect(csv.size).toBeGreaterThan(0);
    });
  });
});
