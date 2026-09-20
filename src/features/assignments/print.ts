import { downloadAndShare } from '@/adapters/files/downloads';
import { backendApi } from '@/composition';

/** Downloads the blank PDF of one variant and opens the share sheet (print, save, send). */
export async function shareBlank(assignmentId: string, variant: number): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!backendApi) return { ok: false, message: 'Сервер отключён в этой сборке.' };
  const target = await backendApi.blankPdfTarget(assignmentId, variant);
  return downloadAndShare(target, `${assignmentId}-v${variant}.pdf`, 'application/pdf');
}

/** One PDF with a personalised blank for each student of the class. */
export async function shareClassBlanks(classId: string, assignmentId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!backendApi) return { ok: false, message: 'Сервер отключён в этой сборке.' };
  const target = await backendApi.batchBlanksTarget(classId, assignmentId);
  return downloadAndShare(target, `${assignmentId}-${classId}-class.pdf`, 'application/pdf');
}
